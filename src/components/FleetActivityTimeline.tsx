"use client";

import { useMemo, useState } from "react";
import type { ActivityEvent, PR } from "@/types/dashboard";

type TimelineDotType = "merged" | "agent_spawn" | "error" | "stale_recovery";

interface TimelineDot {
  id: string;
  timestamp: Date;
  type: TimelineDotType;
  label: string;
  description: string;
}

const dotConfig: Record<
  TimelineDotType,
  { color: string; bgColor: string; legendLabel: string }
> = {
  merged: {
    color: "bg-green-500",
    bgColor: "bg-green-500/20",
    legendLabel: "Merged PR",
  },
  agent_spawn: {
    color: "bg-blue-500",
    bgColor: "bg-blue-500/20",
    legendLabel: "Agent Spawn",
  },
  error: {
    color: "bg-red-500",
    bgColor: "bg-red-500/20",
    legendLabel: "Error",
  },
  stale_recovery: {
    color: "bg-yellow-500",
    bgColor: "bg-yellow-500/20",
    legendLabel: "Stale Recovery",
  },
};

function classifyEvent(event: ActivityEvent): TimelineDotType {
  switch (event.eventType) {
    case "ci_failed":
    case "error":
      return "error";
    case "deploy":
      return "stale_recovery";
    case "commit":
    case "pr_created":
    case "ci_passed":
    case "review":
      return "agent_spawn";
    default:
      return "agent_spawn";
  }
}

function buildTimelineDots(
  activityLog: ActivityEvent[],
  prs: PR[],
): TimelineDot[] {
  const dots: TimelineDot[] = [];
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Add dots from activity log
  for (const event of activityLog) {
    const ts = new Date(event.timestamp);
    if (ts >= twentyFourHoursAgo && ts <= now) {
      dots.push({
        id: event.id,
        timestamp: ts,
        type: classifyEvent(event),
        label: event.agentName,
        description: event.description,
      });
    }
  }

  // Add dots for merged PRs (use a synthetic timestamp based on current time spread)
  for (const pr of prs) {
    if (pr.mergeState === "merged") {
      dots.push({
        id: `pr-${pr.number}`,
        timestamp: now, // PRs don't have a timestamp in the type, place at current time
        type: "merged",
        label: `PR #${pr.number}`,
        description: pr.title,
      });
    }
  }

  return dots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function formatHour(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface FleetActivityTimelineProps {
  activityLog: ActivityEvent[];
  prs: PR[];
}

export default function FleetActivityTimeline({
  activityLog,
  prs,
}: FleetActivityTimelineProps) {
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const timelineStart = useMemo(
    () => new Date(now.getTime() - 24 * 60 * 60 * 1000),
    [now],
  );
  const timeRange = 24 * 60 * 60 * 1000;

  const dots = useMemo(
    () => buildTimelineDots(activityLog, prs),
    [activityLog, prs],
  );

  // Generate hour markers (every 4 hours)
  const hourMarkers = useMemo(() => {
    const markers: { label: string; position: number }[] = [];
    const startHour = new Date(timelineStart);
    startHour.setMinutes(0, 0, 0);
    // Move to next full hour
    startHour.setHours(startHour.getHours() + 1);

    while (startHour <= now) {
      const position =
        ((startHour.getTime() - timelineStart.getTime()) / timeRange) * 100;
      if (startHour.getHours() % 4 === 0) {
        markers.push({
          label: formatHour(startHour),
          position,
        });
      }
      startHour.setHours(startHour.getHours() + 1);
    }
    return markers;
  }, [timelineStart, now, timeRange]);

  const typeCounts = useMemo(() => {
    const counts: Record<TimelineDotType, number> = {
      merged: 0,
      agent_spawn: 0,
      error: 0,
      stale_recovery: 0,
    };
    for (const dot of dots) {
      counts[dot.type]++;
    }
    return counts;
  }, [dots]);

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 p-4 animate-fade-in"
      data-testid="fleet-activity-timeline"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Fleet Activity
        </h2>
        <span className="text-xs text-gray-500 dark:text-white/50">
          Last 24 hours
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3">
        {(
          Object.entries(dotConfig) as [
            TimelineDotType,
            (typeof dotConfig)[TimelineDotType],
          ][]
        ).map(([type, config]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${config.color}`}
              data-testid={`legend-${type}`}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {config.legendLabel}
              {typeCounts[type] > 0 && (
                <span className="ml-1 text-gray-400 dark:text-gray-500">
                  ({typeCounts[type]})
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Timeline track */}
      <div className="relative" data-testid="timeline-track">
        {/* Background track */}
        <div className="h-10 rounded-lg bg-gray-100 dark:bg-white/5 relative overflow-visible">
          {/* Hour markers */}
          {hourMarkers.map((marker) => (
            <div
              key={marker.label}
              className="absolute top-0 h-full flex flex-col items-center"
              style={{ left: `${marker.position}%` }}
            >
              <div className="h-full w-px bg-gray-200 dark:bg-white/10" />
            </div>
          ))}

          {/* Dots */}
          {dots.map((dot) => {
            const position =
              ((dot.timestamp.getTime() - timelineStart.getTime()) /
                timeRange) *
              100;
            const clampedPosition = Math.max(1, Math.min(99, position));
            const config = dotConfig[dot.type];
            const isHovered = hoveredDot === dot.id;

            return (
              <div
                key={dot.id}
                className="absolute top-1/2 -translate-y-1/2 z-10"
                style={{ left: `${clampedPosition}%` }}
              >
                <button
                  type="button"
                  className={`h-4 w-4 -ml-2 rounded-full ${config.color} border-2 border-white dark:border-gray-900 shadow-sm transition-transform duration-150 hover:scale-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`}
                  onMouseEnter={() => setHoveredDot(dot.id)}
                  onMouseLeave={() => setHoveredDot(null)}
                  onFocus={() => setHoveredDot(dot.id)}
                  onBlur={() => setHoveredDot(null)}
                  aria-label={`${config.legendLabel}: ${dot.label} - ${dot.description}`}
                  data-testid={`timeline-dot-${dot.type}`}
                />

                {/* Tooltip */}
                {isHovered && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 p-2 shadow-lg z-50 pointer-events-none"
                    data-testid="timeline-tooltip"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`h-2 w-2 rounded-full ${config.color}`}
                      />
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        {dot.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {dot.description}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      {formatHour(dot.timestamp)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hour labels below the track */}
        <div className="relative h-5 mt-1">
          {hourMarkers.map((marker) => (
            <span
              key={marker.label}
              className="absolute text-[10px] text-gray-400 dark:text-gray-500 -translate-x-1/2"
              style={{ left: `${marker.position}%` }}
            >
              {marker.label}
            </span>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {dots.length === 0 && (
        <p
          className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2"
          data-testid="timeline-empty"
        >
          No fleet activity in the last 24 hours.
        </p>
      )}
    </div>
  );
}
