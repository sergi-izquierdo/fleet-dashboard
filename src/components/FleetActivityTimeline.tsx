"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityEvent, PR } from "@/types/dashboard";

type TimelineDotType = "merged" | "agent_spawn" | "tool_use" | "error" | "stale_recovery" | "agent_stop";

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
  tool_use: {
    color: "bg-purple-500",
    bgColor: "bg-purple-500/20",
    legendLabel: "Tool Use",
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
  agent_stop: {
    color: "bg-gray-400",
    bgColor: "bg-gray-400/20",
    legendLabel: "Agent Stop",
  },
};

const TIME_RANGE_OPTIONS = [
  { label: "1m", ms: 60 * 1000 },
  { label: "3m", ms: 3 * 60 * 1000 },
  { label: "5m", ms: 5 * 60 * 1000 },
  { label: "10m", ms: 10 * 60 * 1000 },
  { label: "30m", ms: 30 * 60 * 1000 },
  { label: "1h", ms: 60 * 60 * 1000 },
  { label: "6h", ms: 6 * 60 * 60 * 1000 },
  { label: "12h", ms: 12 * 60 * 60 * 1000 },
  { label: "24h", ms: 24 * 60 * 60 * 1000 },
] as const;

type TimeRangeLabel = (typeof TIME_RANGE_OPTIONS)[number]["label"];

function classifyEvent(event: ActivityEvent): TimelineDotType {
  switch (event.eventType) {
    case "ci_failed":
    case "error":
      return "error";
    case "deploy":
      return "merged";
    case "tool_use":
      return "tool_use";
    case "agent_start":
      return "agent_spawn";
    case "agent_stop":
      return "agent_stop";
    case "review":
      return "stale_recovery";
    case "commit":
    case "pr_created":
    case "ci_passed":
      return "agent_spawn";
    default:
      return "agent_spawn";
  }
}

function buildTimelineDots(
  activityLog: ActivityEvent[],
  prs: PR[],
  now: Date,
  rangeMs: number,
): TimelineDot[] {
  const dots: TimelineDot[] = [];
  const rangeStart = new Date(now.getTime() - rangeMs);

  for (const event of activityLog) {
    const ts = new Date(event.timestamp);
    if (ts >= rangeStart && ts <= now) {
      dots.push({
        id: event.id,
        timestamp: ts,
        type: classifyEvent(event),
        label: event.agentName,
        description: event.description,
      });
    }
  }

  for (const pr of prs) {
    if (pr.mergeState === "merged") {
      dots.push({
        id: `pr-${pr.number}`,
        timestamp: now,
        type: "merged",
        label: `PR #${pr.number}`,
        description: pr.title,
      });
    }
  }

  return dots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function getMarkerConfig(rangeMs: number): {
  stepMs: number;
  formatFn: (d: Date) => string;
} {
  if (rangeMs <= 2 * 60 * 1000) {
    // ≤2m: 30s steps, show HH:MM:SS
    return {
      stepMs: 30 * 1000,
      formatFn: (d) =>
        d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
    };
  } else if (rangeMs <= 10 * 60 * 1000) {
    // ≤10m: 1m steps, show HH:MM:SS
    return {
      stepMs: 60 * 1000,
      formatFn: (d) =>
        d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
    };
  } else if (rangeMs <= 60 * 60 * 1000) {
    // ≤1h: 5m steps, show HH:MM
    return {
      stepMs: 5 * 60 * 1000,
      formatFn: (d) =>
        d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
    };
  } else if (rangeMs <= 6 * 60 * 60 * 1000) {
    // ≤6h: 1h steps, show HH:MM
    return {
      stepMs: 60 * 60 * 1000,
      formatFn: (d) =>
        d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
    };
  } else {
    // >6h: 4h steps, show HH:MM
    return {
      stepMs: 4 * 60 * 60 * 1000,
      formatFn: (d) =>
        d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
    };
  }
}

function generateMarkers(
  start: Date,
  end: Date,
  rangeMs: number,
): { label: string; position: number }[] {
  const { stepMs, formatFn } = getMarkerConfig(rangeMs);
  const markers: { label: string; position: number }[] = [];
  const startMs = start.getTime();
  const endMs = end.getTime();
  const duration = endMs - startMs;

  // Snap to next step boundary after start
  let current = Math.ceil(startMs / stepMs) * stepMs;

  while (current <= endMs) {
    const position = ((current - startMs) / duration) * 100;
    markers.push({ label: formatFn(new Date(current)), position });
    current += stepMs;
  }

  return markers;
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
  const [selectedRange, setSelectedRange] = useState<TimeRangeLabel>("1m");

  const selectedRangeMs =
    TIME_RANGE_OPTIONS.find((o) => o.label === selectedRange)!.ms;

  // Local events state, initialized from props and kept in sync
  const [localEvents, setLocalEvents] = useState<ActivityEvent[]>(activityLog);
  useEffect(() => {
    setLocalEvents(activityLog);
  }, [activityLog]);

  // Poll /api/fleet-events every 5s for fresh data (includes live obs events)
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/fleet-events");
        if (res.ok && mounted) {
          const events: ActivityEvent[] = await res.json();
          setLocalEvents(events); // Full replace — API returns sorted, deduplicated events
        }
      } catch {}
    };
    // Fetch immediately on mount
    poll();
    const id = setInterval(poll, 5_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // Tick `now` every 5s so the timeline window stays current
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 5_000);
    return () => clearInterval(id);
  }, []);

  const timelineStart = useMemo(
    () => new Date(now.getTime() - selectedRangeMs),
    [now, selectedRangeMs],
  );

  const dots = useMemo(
    () => buildTimelineDots(localEvents, prs, now, selectedRangeMs),
    [localEvents, prs, now, selectedRangeMs],
  );

  const markers = useMemo(
    () => generateMarkers(timelineStart, now, selectedRangeMs),
    [timelineStart, now, selectedRangeMs],
  );

  const typeCounts = useMemo(() => {
    const counts: Record<TimelineDotType, number> = {
      merged: 0,
      agent_spawn: 0,
      tool_use: 0,
      error: 0,
      stale_recovery: 0,
      agent_stop: 0,
    };
    for (const dot of dots) {
      counts[dot.type]++;
    }
    return counts;
  }, [dots]);

  return (
    <div
      className="animate-fade-in"
      data-testid="fleet-activity-timeline"
    >
      {/* Time range selector */}
      <div className="flex items-center justify-end mb-3">
        <div
          className="flex flex-wrap items-center rounded-lg border border-gray-200 dark:border-white/10 p-0.5 gap-0.5"
          data-testid="time-range-selector"
        >
          {TIME_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setSelectedRange(opt.label)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                selectedRange === opt.label
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
              data-testid={`range-btn-${opt.label}`}
              aria-pressed={selectedRange === opt.label}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
          {/* Markers */}
          {markers.map((marker) => (
            <div
              key={marker.position}
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
                selectedRangeMs) *
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
                    className="dashboard-modal-panel absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg p-2 shadow-lg z-50 pointer-events-none"
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

        {/* Marker labels below the track */}
        <div className="relative h-5 mt-1">
          {markers.map((marker) => (
            <span
              key={marker.position}
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
          No fleet activity in the last {selectedRange}.
        </p>
      )}
    </div>
  );
}
