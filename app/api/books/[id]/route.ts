import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const updates = await req.json();

  // Only allow updating certain fields
  const allowedUpdates: Record<string, unknown> = {};
  if (typeof updates.title === "string") allowedUpdates.title = updates.title;
  if (typeof updates.author === "string")
    allowedUpdates.author = updates.author;
  if (typeof updates.coverUrl === "string")
    allowedUpdates.coverUrl = updates.coverUrl;
  if (typeof updates.archived === "boolean")
    allowedUpdates.archived = updates.archived;

  const book = await prisma.book.updateMany({
    where: { id, userId: session.user.id },
    data: allowedUpdates,
  });

  if (book.count === 0) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const updated = await prisma.book.findUnique({ where: { id } });
  return NextResponse.json(updated);
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

  const book = await prisma.book.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (book.count === 0) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
