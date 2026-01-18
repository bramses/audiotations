import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, AUDIO_BUCKET } from "@/lib/supabase";

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
      const path = new URL(annotation.audioUrl).pathname.split("/").pop();
      if (path) {
        await supabaseAdmin.storage.from(AUDIO_BUCKET).remove([path]);
      }
    } catch (err) {
      console.error("Error deleting audio file:", err);
    }
  }

  // Delete annotation
  await prisma.annotation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
