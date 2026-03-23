"use client";

import { useMemo } from "react";
import type { HealthTimelineEntry, HealthStatus } from "@/types/dashboard";

const STATUS_COLORS: Record<HealthStatus, string> = {
  working: "#22c55e",
  idle: "#eab308",
  error: "#ef4444",
};

interface HealthSparklineProps {
  timeline: HealthTimelineEntry[];
  width?: number;
  height?: number;
  onClick?: () => void;
}

export function HealthSparkline({
  timeline,
  width = 160,
  height = 24,
  onClick,
}: HealthSparklineProps) {
  const bars = useMemo(() => {
    if (timeline.length === 0) return [];
    const barWidth = width / timeline.length;
    return timeline.map((entry, i) => ({
      x: i * barWidth,
      width: Math.max(barWidth - 0.5, 1),
      color: STATUS_COLORS[entry.status],
      status: entry.status,
      timestamp: entry.timestamp,
    }));
  }, [timeline, width]);

  if (timeline.length === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full cursor-pointer rounded transition-opacity hover:opacity-80"
      aria-label="View health timeline details"
      data-testid="health-sparkline"
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Agent health over last 24 hours"
      >
        {bars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x}
            y={0}
            width={bar.width}
            height={height}
            fill={bar.color}
            rx={1}
            opacity={0.8}
          />
        ))}
      </svg>
    </button>
  );
}
