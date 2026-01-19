import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get reading sessions for the past year (for heatmap)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get sessions from the past year
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setHours(0, 0, 0, 0);

  const readingSessions = await prisma.readingSession.findMany({
    where: {
      userId: session.user.id,
      date: { gte: oneYearAgo },
    },
    orderBy: { date: "asc" },
  });

  // Group by date and count sessions per day
  const sessionsByDate: Record<string, number> = {};
  for (const rs of readingSessions) {
    const dateStr = rs.date.toISOString().split("T")[0];
    sessionsByDate[dateStr] = (sessionsByDate[dateStr] || 0) + 1;
  }

  // Also return total count
  const totalSessions = readingSessions.length;

  return NextResponse.json({ sessions: sessionsByDate, total: totalSessions });
}

// Log a reading session for today
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get today's date (date only, no time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Create new reading session
  await prisma.readingSession.create({
    data: {
      userId: session.user.id,
      date: today,
    },
  });

  // Get today's count
  const todayCount = await prisma.readingSession.count({
    where: {
      userId: session.user.id,
      date: today,
    },
  });

  return NextResponse.json({ success: true, todayCount });
}
