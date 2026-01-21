import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openai, EMBEDDING_MODEL } from "@/lib/openai";

type SearchResult = {
  id: string;
  transcript: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  createdAt: Date;
  rank?: number;
  distance?: number;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q");
  const mode = req.nextUrl.searchParams.get("mode") || "fts";
  const threshold = parseFloat(req.nextUrl.searchParams.get("threshold") || "0.3");

  if (!query?.trim()) {
    return NextResponse.json([]);
  }

  const userId = session.user.id;

  if (mode === "fts") {
    // Full-text search only
    const results = await prisma.$queryRaw<SearchResult[]>`
      SELECT
        a.id,
        a.transcript,
        a."bookId",
        b.title as "bookTitle",
        b.author as "bookAuthor",
        a."createdAt",
        ts_rank(to_tsvector('english', a.transcript), plainto_tsquery('english', ${query})) as rank
      FROM "Annotation" a
      JOIN "Book" b ON a."bookId" = b.id
      WHERE b."userId" = ${userId}
        AND to_tsvector('english', a.transcript) @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT 20
    `;

    return NextResponse.json(results);
  }

  if (mode === "hybrid") {
    // Generate embedding for semantic search
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;
    // Format embedding as PostgreSQL vector literal
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Hybrid search using Reciprocal Rank Fusion (RRF)
    const results = await prisma.$queryRaw<SearchResult[]>`
      WITH fts_results AS (
        SELECT
          a.id,
          ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', a.transcript), plainto_tsquery('english', ${query})) DESC) as fts_rank
        FROM "Annotation" a
        JOIN "Book" b ON a."bookId" = b.id
        WHERE b."userId" = ${userId}
          AND to_tsvector('english', a.transcript) @@ plainto_tsquery('english', ${query})
        LIMIT 50
      ),
      vector_results AS (
        SELECT
          a.id,
          a.embedding <=> ${embeddingStr}::vector as distance,
          ROW_NUMBER() OVER (ORDER BY a.embedding <=> ${embeddingStr}::vector) as vec_rank
        FROM "Annotation" a
        JOIN "Book" b ON a."bookId" = b.id
        WHERE b."userId" = ${userId}
          AND a.embedding IS NOT NULL
          AND a.embedding <=> ${embeddingStr}::vector <= ${threshold}
        LIMIT 50
      ),
      combined AS (
        SELECT
          COALESCE(f.id, v.id) as id,
          COALESCE(1.0 / (60 + f.fts_rank), 0) + COALESCE(1.0 / (60 + v.vec_rank), 0) as rrf_score
        FROM fts_results f
        FULL OUTER JOIN vector_results v ON f.id = v.id
      )
      SELECT
        a.id,
        a.transcript,
        a."bookId",
        b.title as "bookTitle",
        b.author as "bookAuthor",
        a."createdAt"
      FROM combined c
      JOIN "Annotation" a ON c.id = a.id
      JOIN "Book" b ON a."bookId" = b.id
      ORDER BY c.rrf_score DESC
      LIMIT 20
    `;

    return NextResponse.json(results);
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}
