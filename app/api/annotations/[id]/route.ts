import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, AUDIO_BUCKET, IMAGES_BUCKET } from "@/lib/supabase";
import { openai, EMBEDDING_MODEL } from "@/lib/openai";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { transcript } = await req.json();

  if (!transcript?.trim()) {
    return NextResponse.json(
      { error: "transcript is required" },
      { status: 400 }
    );
  }

  // Find the annotation and verify ownership
  const annotation = await prisma.annotation.findFirst({
    where: { id },
    include: { book: true },
  });

  if (!annotation || annotation.book.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Annotation not found" },
      { status: 404 }
    );
  }

  // Generate new embedding for the updated transcript
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: transcript.trim(),
  });

  const embedding = embeddingResponse.data[0].embedding;
  const embeddingStr = `[${embedding.join(",")}]`;

  // Update annotation with raw SQL for vector type
  await prisma.$queryRaw`
    UPDATE "Annotation"
    SET transcript = ${transcript.trim()}, embedding = ${embeddingStr}::vector
    WHERE id = ${id}
  `;

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Find the annotation and verify ownership
  const annotation = await prisma.annotation.findFirst({
    where: { id },
    include: { book: true },
  });

  if (!annotation || annotation.book.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Annotation not found" },
      { status: 404 }
    );
  }

  // Delete audio file from storage if exists
  if (annotation.audioUrl) {
    try {
      // Extract the full path from URL
      const url = new URL(annotation.audioUrl);
      const pathParts = url.pathname.split(`/${AUDIO_BUCKET}/`);
      if (pathParts[1]) {
        await supabaseAdmin.storage.from(AUDIO_BUCKET).remove([pathParts[1]]);
      }
    } catch (err) {
      console.error("Error deleting audio file:", err);
    }
  }

  // Delete image file from storage if exists
  if (annotation.imageUrl) {
    try {
      const url = new URL(annotation.imageUrl);
      const pathParts = url.pathname.split(`/${IMAGES_BUCKET}/`);
      if (pathParts[1]) {
        await supabaseAdmin.storage.from(IMAGES_BUCKET).remove([pathParts[1]]);
      }
    } catch (err) {
      console.error("Error deleting image file:", err);
    }
  }

  // Delete annotation
  await prisma.annotation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
