import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type FeedItem = {
  id: string;
  transcript: string;
  audioUrl: string | null;
  imageUrl: string | null;
  pageNumber: string | null;
  location: string | null;
  createdAt: Date;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
  const seed = req.nextUrl.searchParams.get("seed") || Date.now().toString();

  const userId = session.user.id;

  // Use a seeded random order so pagination is consistent within a session
  // but different between sessions
  const results = await prisma.$queryRaw<FeedItem[]>`
    SELECT
      a.id,
      a.transcript,
      a."audioUrl",
      a."imageUrl",
      a."pageNumber",
      a.location,
      a."createdAt",
      a."bookId",
      b.title as "bookTitle",
      b.author as "bookAuthor"
    FROM "Annotation" a
    JOIN "Book" b ON a."bookId" = b.id
    WHERE b."userId" = ${userId}
    ORDER BY md5(a.id || ${seed})
    OFFSET ${offset}
    LIMIT ${limit + 1}
  `;

  // Check if there are more results
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;

  return NextResponse.json({
    items,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
    seed,
  });
}
