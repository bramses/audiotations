import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openai, EMBEDDING_MODEL } from "@/lib/openai";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookId = req.nextUrl.searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json(
      { error: "bookId is required" },
      { status: 400 }
    );
  }

  // Verify user owns the book
  const book = await prisma.book.findFirst({
    where: { id: bookId, userId: session.user.id },
  });

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const annotations = await prisma.annotation.findMany({
    where: { bookId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(annotations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const bookId = body?.bookId as string | undefined;
    const transcript = body?.transcript as string | undefined;
    const pageNumber = (body?.pageNumber as string | undefined) ?? null;
    const location = (body?.location as string | undefined) ?? null;

    if (!bookId || !transcript?.trim()) {
      return NextResponse.json(
        { error: "bookId and transcript are required" },
        { status: 400 }
      );
    }

    const book = await prisma.book.findFirst({
      where: { id: bookId, userId: session.user.id },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: transcript,
    });

    const embedding = embeddingResponse.data[0]?.embedding ?? null;
    const embeddingStr = embedding ? `[${embedding.join(",")}]` : null;

    const annotation = await prisma.$queryRaw<{ id: string; createdAt: Date }[]>`
      INSERT INTO "Annotation" (id, transcript, embedding, "audioUrl", "imageUrl", "pageNumber", location, footnotes, "bookId", "createdAt")
      VALUES (
        ${crypto.randomUUID()},
        ${transcript.trim()},
        ${embeddingStr}::vector,
        ${null},
        ${null},
        ${pageNumber},
        ${location},
        ${null},
        ${bookId},
        NOW()
      )
      RETURNING id, "createdAt"
    `;

    return NextResponse.json({
      id: annotation[0].id,
      transcript: transcript.trim(),
      audioUrl: null,
      imageUrl: null,
      pageNumber,
      location,
      createdAt: annotation[0].createdAt,
    });
  } catch (error) {
    console.error("Create annotation error:", error);
    return NextResponse.json(
      { error: "Failed to create annotation" },
      { status: 500 }
    );
  }
}
