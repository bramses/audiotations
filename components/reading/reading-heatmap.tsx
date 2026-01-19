"use client";

import { useState, useEffect, useCallback } from "react";

type HeatmapData = {
  sessions: Record<string, number>;
  total: number;
};

const today = new Date().toISOString().split("T")[0];

function getColorClass(count: number): string {
  if (count === 0) return "bg-gray-100 dark:bg-gray-800";
  if (count === 1) return "bg-green-200 dark:bg-green-900";
  if (count === 2) return "bg-green-400 dark:bg-green-700";
  if (count >= 3) return "bg-green-600 dark:bg-green-500";
  return "bg-gray-100 dark:bg-gray-800";
}

function generateYearDates(): { date: Date; dateStr: string }[] {
  const dates: { date: Date; dateStr: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from 52 weeks ago, aligned to Sunday
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  // Align to Sunday
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - dayOfWeek);

  // Generate all dates up to today
  const current = new Date(start);
  while (current <= today) {
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
    if (d.date.getDay() === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(d);
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

function getMonthLabels(
  weeks: { date: Date; dateStr: string }[][]
): { month: string; index: number }[] {
  const labels: { month: string; index: number }[] = [];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  let lastMonth = -1;

  weeks.forEach((week, index) => {
    // Use the first day of each week to determine month
    const firstDay = week[0];
    const month = firstDay.date.getMonth();
    if (month !== lastMonth) {
      labels.push({ month: months[month], index });
      lastMonth = month;
    }
  });

  return labels;
}

export function ReadingHeatmap() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);

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

  const logReading = async () => {
    setLogging(true);
    try {
      const res = await fetch("/api/reading-sessions", { method: "POST" });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setLogging(false);
    }
  };

  const todayCount = data?.sessions[today] || 0;

  const dates = generateYearDates();
  const weeks = groupByWeeks(dates);
  const monthLabels = getMonthLabels(weeks);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="animate-pulse h-32 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    );
  }

  const sessions = data?.sessions || {};

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {data?.total || 0} reading sessions in the last year
        </h2>
        <button
          onClick={logReading}
          disabled={logging}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {logging ? "Logging..." : todayCount > 0 ? `Log Reading (${todayCount} today)` : "Log Reading"}
        </button>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex text-xs text-gray-500 dark:text-gray-400 mb-1 ml-8">
            {monthLabels.map((label, i) => (
              <div
                key={i}
                className="absolute"
                style={{ marginLeft: `${label.index * 14 + 32}px` }}
              >
                {label.month}
              </div>
            ))}
          </div>

          <div className="flex mt-5">
            {/* Day labels */}
            <div className="flex flex-col text-xs text-gray-500 dark:text-gray-400 mr-2 gap-[3px]">
              <span className="h-[10px]"></span>
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
                  {/* Pad incomplete first week */}
                  {weekIndex === 0 &&
                    Array(7 - week.length)
                      .fill(null)
                      .map((_, i) => (
                        <div
                          key={`pad-${i}`}
                          className="w-[10px] h-[10px] rounded-sm bg-transparent"
                        />
                      ))}
                  {week.map((day) => {
                    const count = sessions[day.dateStr] || 0;
                    return (
                      <div
                        key={day.dateStr}
                        className={`w-[10px] h-[10px] rounded-sm ${getColorClass(count)}`}
                        title={`${day.dateStr}: ${count} session${count !== 1 ? "s" : ""}`}
                      />
                    );
                  })}
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
