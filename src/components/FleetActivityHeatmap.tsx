"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

interface HeatmapDay {
  date: string;
  count: number;
  prs: number;
  agents: number;
}

interface Tooltip {
  x: number;
  y: number;
  day: HeatmapDay;
}

const CELL_SIZE = 11;
const CELL_GAP = 2;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const ROW_COUNT = 7; // days of week (0=Sun ... 6=Sat)
const MONTH_LABEL_HEIGHT = 18;
const DOW_LABEL_WIDTH = 24;

function getColor(count: number, dark = false): string {
  if (count === 0) return dark ? "#2d3748" : "#e2e8f0";
  if (count <= 2) return "#86efac"; // light green
  if (count <= 5) return "#22c55e"; // medium green
  return "#15803d"; // dark green
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function groupIntoWeeks(days: HeatmapDay[]): HeatmapDay[][] {
  if (days.length === 0) return [];
  const weeks: HeatmapDay[][] = [];
  // First day of week = Sunday (0)
  // Find what day of week the first day falls on
  const firstDate = new Date(days[0].date + "T00:00:00Z");
  const firstDow = firstDate.getUTCDay(); // 0=Sun

  let week: HeatmapDay[] = [];
  // Pad first week with nullish slots
  for (let i = 0; i < firstDow; i++) {
    week.push({ date: "", count: -1, prs: 0, agents: 0 });
  }

  for (const day of days) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    // Pad last week
    while (week.length < 7) {
      week.push({ date: "", count: -1, prs: 0, agents: 0 });
    }
    weeks.push(week);
  }

  return weeks;
}

function getMonthLabels(
  weeks: HeatmapDay[][]
): { label: string; col: number }[] {
  const labels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    for (const day of week) {
      if (day.date) {
        const month = new Date(day.date + "T00:00:00Z").getUTCMonth();
        if (month !== lastMonth) {
          lastMonth = month;
          labels.push({
            label: new Date(day.date + "T00:00:00Z").toLocaleDateString(
              "en-US",
              { month: "short" }
            ),
            col,
          });
        }
        break;
      }
    }
  });
  return labels;
}

export default function FleetActivityHeatmap() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [days, setDays] = useState<HeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  useEffect(() => {
    fetch("/api/activity/heatmap")
      .then((r) => r.json())
      .then((data: { days: HeatmapDay[] }) => {
        setDays(data.days ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const weeks = groupIntoWeeks(days);
  const monthLabels = getMonthLabels(weeks);

  const svgWidth =
    DOW_LABEL_WIDTH + weeks.length * CELL_STEP + CELL_GAP;
  const svgHeight =
    MONTH_LABEL_HEIGHT + ROW_COUNT * CELL_STEP + CELL_GAP;

  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) {
    return (
      <div
        data-testid="heatmap-loading"
        className="animate-pulse h-32 rounded bg-white/[0.04]"
      />
    );
  }

  if (days.length === 0) {
    return (
      <div
        data-testid="heatmap-empty"
        className="flex items-center justify-center h-24 text-sm text-white/30"
      >
        No activity data yet
      </div>
    );
  }

  return (
    <div className="relative" data-testid="fleet-activity-heatmap">
      <svg
        width={svgWidth}
        height={svgHeight}
        aria-label="Fleet activity heatmap"
      >
        {/* Month labels */}
        {monthLabels.map(({ label, col }) => (
          <text
            key={`month-${col}`}
            x={DOW_LABEL_WIDTH + col * CELL_STEP}
            y={MONTH_LABEL_HEIGHT - 4}
            fontSize={9}
            fill={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)"}
          >
            {label}
          </text>
        ))}

        {/* Day-of-week labels (Mon, Wed, Fri only to save space) */}
        {[1, 3, 5].map((dow) => (
          <text
            key={`dow-${dow}`}
            x={0}
            y={MONTH_LABEL_HEIGHT + dow * CELL_STEP + CELL_SIZE - 1}
            fontSize={8}
            fill={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)"}
          >
            {DOW_LABELS[dow]}
          </text>
        ))}

        {/* Grid cells */}
        {weeks.map((week, col) =>
          week.map((day, row) => {
            if (day.count === -1 || !day.date) {
              // padding cell - render transparent
              return (
                <rect
                  key={`${col}-${row}`}
                  x={DOW_LABEL_WIDTH + col * CELL_STEP}
                  y={MONTH_LABEL_HEIGHT + row * CELL_STEP}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={2}
                  fill="transparent"
                />
              );
            }
            return (
              <rect
                key={`${col}-${row}`}
                x={DOW_LABEL_WIDTH + col * CELL_STEP}
                y={MONTH_LABEL_HEIGHT + row * CELL_STEP}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                fill={getColor(day.count, isDark)}
                className="cursor-pointer"
                data-testid={`heatmap-cell-${day.date}`}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const container =
                    e.currentTarget.closest("[data-testid='fleet-activity-heatmap']");
                  const containerRect = container?.getBoundingClientRect();
                  setTooltip({
                    x: rect.left - (containerRect?.left ?? 0) + CELL_SIZE / 2,
                    y: rect.top - (containerRect?.top ?? 0),
                    day,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          role="tooltip"
          className="absolute z-10 rounded border border-white/10 bg-gray-900 px-2 py-1.5 text-xs text-white shadow-lg pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 60,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-medium">{formatDate(tooltip.day.date)}</div>
          <div className="text-white/60 mt-0.5">
            {tooltip.day.count} event{tooltip.day.count !== 1 ? "s" : ""}
            {tooltip.day.prs > 0 && ` · ${tooltip.day.prs} PR${tooltip.day.prs !== 1 ? "s" : ""}`}
            {tooltip.day.agents > 0 &&
              ` · ${tooltip.day.agents} agent session${tooltip.day.agents !== 1 ? "s" : ""}`}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
        <span>Less</span>
        {[0, 1, 3, 6].map((n) => (
          <svg key={n} width={CELL_SIZE} height={CELL_SIZE}>
            <rect
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={2}
              fill={getColor(n, isDark)}
            />
          </svg>
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
