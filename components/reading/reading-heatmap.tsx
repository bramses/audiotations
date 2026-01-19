"use client";

import { useState, useEffect, useCallback } from "react";

type HeatmapData = {
  counts: Record<string, number>;
  total: number;
  year: number;
};

function getColorClass(count: number): string {
  if (count === 0) return "bg-gray-100 dark:bg-gray-800";
  if (count === 1) return "bg-green-200 dark:bg-green-900";
  if (count === 2) return "bg-green-400 dark:bg-green-700";
  if (count >= 3) return "bg-green-600 dark:bg-green-500";
  return "bg-gray-100 dark:bg-gray-800";
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
    // Find first day that's in a new month
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
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="animate-pulse h-32 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    );
  }

  const counts = data?.counts || {};

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {data?.total || 0} annotations in {year}
        </h2>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-fit">
          {/* Month labels */}
          <div className="flex text-xs text-gray-500 dark:text-gray-400 mb-1 ml-8 relative h-4">
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
            <div className="flex flex-col text-xs text-gray-500 dark:text-gray-400 mr-2 gap-[3px]">
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
                          className="w-[10px] h-[10px] rounded-sm bg-transparent"
                        />
                      ))}
                  {week.map((day) => {
                    const count = counts[day.dateStr] || 0;
                    const isToday = day.dateStr === new Date().toISOString().split("T")[0];
                    return (
                      <div
                        key={day.dateStr}
                        className={`w-[10px] h-[10px] rounded-sm ${getColorClass(count)} ${
                          isToday ? "ring-1 ring-blue-500" : ""
                        }`}
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
                          className="w-[10px] h-[10px] rounded-sm bg-transparent"
                        />
                      ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Less</span>
            <div className="w-[10px] h-[10px] rounded-sm bg-gray-100 dark:bg-gray-800" />
            <div className="w-[10px] h-[10px] rounded-sm bg-green-200 dark:bg-green-900" />
            <div className="w-[10px] h-[10px] rounded-sm bg-green-400 dark:bg-green-700" />
            <div className="w-[10px] h-[10px] rounded-sm bg-green-600 dark:bg-green-500" />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
