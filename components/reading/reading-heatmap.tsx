"use client";

import { useState, useEffect, useCallback } from "react";

type HeatmapData = {
  counts: Record<string, number>;
  total: number;
  year: number;
};

function getColorStyle(count: number): React.CSSProperties {
  if (count === 0) return { background: "var(--brown-200)" };
  if (count === 1) return { background: "#D4A574" }; // Light amber
  if (count === 2) return { background: "#B8860B" }; // Gold
  if (count >= 3) return { background: "#8B6914" }; // Dark gold
  return { background: "var(--brown-200)" };
}

function generateYearDates(year: number): { date: Date; dateStr: string }[] {
  const dates: { date: Date; dateStr: string }[] = [];
  const start = new Date(year, 0, 1); // Jan 1
  const end = new Date(year, 11, 31); // Dec 31

  const current = new Date(start);
  while (current <= end) {
    dates.push({
      date: new Date(current),
      dateStr: current.toISOString().split("T")[0],
    });
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function groupByWeeks(
  dates: { date: Date; dateStr: string }[]
): { date: Date; dateStr: string }[][] {
  const weeks: { date: Date; dateStr: string }[][] = [];
  let currentWeek: { date: Date; dateStr: string }[] = [];

  for (const d of dates) {
    currentWeek.push(d);
    // End week on Saturday (day 6)
    if (d.date.getDay() === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  // Push remaining days
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

function getMonthLabels(
  weeks: { date: Date; dateStr: string }[][],
  year: number
): { month: string; index: number }[] {
  const labels: { month: string; index: number }[] = [];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  let lastMonth = -1;

  weeks.forEach((week, index) => {
    for (const day of week) {
      const month = day.date.getMonth();
      if (month !== lastMonth) {
        labels.push({ month: months[month], index });
        lastMonth = month;
        break;
      }
    }
  });

  return labels;
}

export function ReadingHeatmap() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reading-sessions");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const year = data?.year || new Date().getFullYear();
  const dates = generateYearDates(year);
  const weeks = groupByWeeks(dates);
  const monthLabels = getMonthLabels(weeks, year);

  if (loading) {
    return (
      <div
        className="rounded-lg p-4"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
        }}
      >
        <div
          className="animate-pulse h-32 rounded"
          style={{ background: "var(--brown-200)" }}
        />
      </div>
    );
  }

  const counts = data?.counts || {};

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-sm font-medium"
          style={{ color: "var(--foreground-muted)" }}
        >
          {data?.total || 0} annotations in {year}
        </h2>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-fit">
          {/* Month labels */}
          <div
            className="flex text-xs mb-1 ml-8 relative h-4"
            style={{ color: "var(--foreground-muted)" }}
          >
            {monthLabels.map((label, i) => (
              <span
                key={i}
                className="absolute"
                style={{ left: `${label.index * 13}px` }}
              >
                {label.month}
              </span>
            ))}
          </div>

          <div className="flex">
            {/* Day labels */}
            <div
              className="flex flex-col text-xs mr-2 gap-[3px]"
              style={{ color: "var(--foreground-muted)" }}
            >
              <span className="h-[10px] leading-[10px]">Sun</span>
              <span className="h-[10px] leading-[10px]">Mon</span>
              <span className="h-[10px]"></span>
              <span className="h-[10px] leading-[10px]">Wed</span>
              <span className="h-[10px]"></span>
              <span className="h-[10px] leading-[10px]">Fri</span>
              <span className="h-[10px]"></span>
            </div>

            {/* Grid */}
            <div className="flex gap-[3px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {/* Pad first week if it doesn't start on Sunday */}
                  {weekIndex === 0 &&
                    Array(week[0].date.getDay())
                      .fill(null)
                      .map((_, i) => (
                        <div
                          key={`pad-start-${i}`}
                          className="w-[10px] h-[10px] rounded-sm"
                          style={{ background: "transparent" }}
                        />
                      ))}
                  {week.map((day) => {
                    const count = counts[day.dateStr] || 0;
                    const isToday = day.dateStr === new Date().toISOString().split("T")[0];
                    return (
                      <div
                        key={day.dateStr}
                        className="w-[10px] h-[10px] rounded-sm"
                        style={{
                          ...getColorStyle(count),
                          boxShadow: isToday ? "0 0 0 1px var(--accent-gold)" : undefined,
                        }}
                        title={`${day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${count} annotation${count !== 1 ? "s" : ""}`}
                      />
                    );
                  })}
                  {/* Pad last week if it doesn't end on Saturday */}
                  {weekIndex === weeks.length - 1 &&
                    Array(6 - week[week.length - 1].date.getDay())
                      .fill(null)
                      .map((_, i) => (
                        <div
                          key={`pad-end-${i}`}
                          className="w-[10px] h-[10px] rounded-sm"
                          style={{ background: "transparent" }}
                        />
                      ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div
            className="flex items-center justify-end gap-1 mt-2 text-xs"
            style={{ color: "var(--foreground-muted)" }}
          >
            <span>Less</span>
            <div className="w-[10px] h-[10px] rounded-sm" style={{ background: "var(--brown-200)" }} />
            <div className="w-[10px] h-[10px] rounded-sm" style={{ background: "#D4A574" }} />
            <div className="w-[10px] h-[10px] rounded-sm" style={{ background: "#B8860B" }} />
            <div className="w-[10px] h-[10px] rounded-sm" style={{ background: "#8B6914" }} />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
