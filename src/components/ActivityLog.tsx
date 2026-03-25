"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import type { ActivityEvent } from "@/types/dashboard";

export type EventType = "commit" | "pr_created" | "ci_failed" | "ci_passed" | "review" | "deploy" | "error";

// AgentEvent is an alias of ActivityEvent — kept for backward compatibility
export type AgentEvent = ActivityEvent;

const eventTypeConfig: Record<EventType, { label: string; color: string; dot: string }> = {
  commit: {
    label: "Commit",
    color: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40",
    dot: "bg-blue-500",
  },
  pr_created: {
    label: "PR Created",
    color: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/40",
    dot: "bg-green-500",
  },
  ci_failed: {
    label: "CI Failed",
    color: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40",
    dot: "bg-red-500",
  },
  review: {
    label: "Review",
    color: "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40",
    dot: "bg-purple-500",
  },
  deploy: {
    label: "Deploy",
    color: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/40",
    dot: "bg-orange-500",
  },
  ci_passed: {
    label: "CI Passed",
    color: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/40",
    dot: "bg-green-500",
  },
  error: {
    label: "Error",
    color: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40",
    dot: "bg-red-500",
  },
};

function RelativeTimestamp({ timestamp }: { timestamp: string }) {
  const relative = useRelativeTime(timestamp);
  return (
    <time
      className="ml-auto text-xs text-gray-400 dark:text-gray-500"
      dateTime={timestamp}
      title={new Date(timestamp).toLocaleString()}
    >
      {relative}
    </time>
  );
}

interface ActivityLogProps {
  events: AgentEvent[];
  maxHeight?: string;
  isLoading?: boolean;
}

export default function ActivityLog({ events, maxHeight = "max-h-96", isLoading = false }: ActivityLogProps) {
  const [localEvents, setLocalEvents] = useState<AgentEvent[]>(events);
  const [isFetching, setIsFetching] = useState(true);

  // Keep local state in sync when parent updates (but don't override fetched data if we have it)
  useEffect(() => {
    setLocalEvents((prev) => {
      if (prev.length === 0) return events;
      return prev;
    });
  }, [events]);

  // Fetch from /api/fleet-events on mount and poll every 15s
  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/fleet-events");
        if (res.ok) {
          const fetched: AgentEvent[] = await res.json();
          setLocalEvents((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const newEvents = fetched.filter((e) => !existingIds.has(e.id));
            if (fetched.length > 0 && prev.length === 0) return fetched;
            return newEvents.length > 0 ? [...prev, ...newEvents] : prev;
          });
        }
      } catch {
        // Silently fall back to prop events on failure
      } finally {
        setIsFetching(false);
      }
    }

    fetchEvents();
    const id = setInterval(fetchEvents, 15_000);
    return () => clearInterval(id);
  }, []);

  const sorted = [...localEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const showLoading = (isLoading || isFetching) && sorted.length === 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 animate-fade-in">
      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">Activity Log</h2>
      <div className={`${maxHeight} overflow-y-auto pr-1`} data-testid="activity-log-scroll">
        {showLoading ? (
          <ul className="space-y-2" role="list" aria-label="Loading activity">
            {Array.from({ length: 5 }).map((_, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3 h-16 animate-pulse"
              >
                <div className="flex flex-col items-center pt-1">
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="ml-auto h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </li>
            ))}
          </ul>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-6 w-6 text-gray-400 dark:text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="No recent activity"
            description="Events from your agents will appear here as they work."
          />
        ) : (
          <ul className="space-y-2" role="list">
            {sorted.map((event, index) => {
              const config = eventTypeConfig[event.eventType];
              return (
                <li
                  key={event.id}
                  className="relative flex gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/80 animate-slide-up"
                  style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                >
                  <div className="flex flex-col items-center pt-1">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${config.dot}`}
                      data-testid={`dot-${event.eventType}`}
                    />
                    <span className="mt-1 h-full w-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {event.agentName}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.color}`}
                        data-testid={`badge-${event.eventType}`}
                      >
                        {config.label}
                      </span>
                      <RelativeTimestamp timestamp={event.timestamp} />
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{event.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
