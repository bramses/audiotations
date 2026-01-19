import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get annotation counts per day for current calendar year
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get start and end of current year
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

  // Get all annotations for the current year
  const annotations = await prisma.annotation.findMany({
    where: {
      book: { userId: session.user.id },
      createdAt: {
        gte: yearStart,
        lte: yearEnd,
      },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by date and count annotations per day
  const countsByDate: Record<string, number> = {};
  for (const a of annotations) {
    const dateStr = a.createdAt.toISOString().split("T")[0];
    countsByDate[dateStr] = (countsByDate[dateStr] || 0) + 1;
  }

  return NextResponse.json({
    counts: countsByDate,
    total: annotations.length,
    year: now.getFullYear(),
  });
}
