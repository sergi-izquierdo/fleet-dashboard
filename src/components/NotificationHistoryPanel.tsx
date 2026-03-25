"use client";

import { useState } from "react";
import type { ActivityEvent } from "@/types/dashboard";
import { useRelativeTime } from "@/hooks/useRelativeTime";

const eventTypeConfig: Record<
  ActivityEvent["eventType"],
  { emoji: string; label: string; badgeColor: string }
> = {
  commit: {
    emoji: "📝",
    label: "Commit",
    badgeColor:
      "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40",
  },
  pr_created: {
    emoji: "🔀",
    label: "PR Created",
    badgeColor:
      "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/40",
  },
  ci_failed: {
    emoji: "❌",
    label: "CI Failed",
    badgeColor:
      "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40",
  },
  ci_passed: {
    emoji: "✅",
    label: "CI Passed",
    badgeColor:
      "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/40",
  },
  review: {
    emoji: "👀",
    label: "Review",
    badgeColor:
      "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40",
  },
  deploy: {
    emoji: "🚀",
    label: "Deploy",
    badgeColor:
      "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/40",
  },
  error: {
    emoji: "🔥",
    label: "Error",
    badgeColor:
      "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40",
  },
  tool_use: {
    emoji: "🔧",
    label: "Tool Use",
    badgeColor:
      "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40",
  },
  agent_start: {
    emoji: "🚀",
    label: "Agent Start",
    badgeColor:
      "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40",
  },
  agent_stop: {
    emoji: "🏁",
    label: "Agent Stop",
    badgeColor:
      "bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/40",
  },
};

function HistoryEventItem({
  event,
  isRead,
  onMarkAsRead,
}: {
  event: ActivityEvent;
  isRead: boolean;
  onMarkAsRead: (id: string) => void;
}) {
  const relative = useRelativeTime(event.timestamp);
  const config = eventTypeConfig[event.eventType];

  return (
    <div
      className={`group flex gap-3 p-3 transition-colors ${
        isRead ? "opacity-60" : "bg-gray-50 dark:bg-white/5"
      }`}
      data-testid={`history-event-${event.id}`}
    >
      <div
        className="flex-shrink-0 pt-0.5 text-base leading-none"
        aria-hidden="true"
      >
        {config.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {event.agentName}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${config.badgeColor}`}
              >
                {config.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
              {event.description}
            </p>
            <time
              className="mt-1 block text-[10px] text-gray-400 dark:text-gray-500"
              dateTime={event.timestamp}
              title={new Date(event.timestamp).toLocaleString()}
            >
              {relative}
            </time>
          </div>
          {!isRead && (
            <button
              onClick={() => onMarkAsRead(event.id)}
              className="flex-shrink-0 rounded p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
              aria-label="Mark as read"
              title="Mark as read"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface NotificationHistoryPanelProps {
  activityLog: ActivityEvent[];
}

export function NotificationHistoryPanel({
  activityLog,
}: NotificationHistoryPanelProps) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const sorted = [...activityLog]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 20);

  const unreadCount = sorted.filter((e) => !readIds.has(e.id)).length;

  function markAsRead(id: string) {
    setReadIds((prev) => new Set([...prev, id]));
  }

  function markAllAsRead() {
    setReadIds(new Set(sorted.map((e) => e.id)));
  }

  return (
    <>
      {unreadCount > 0 && (
        <div className="flex justify-end px-4 py-1.5 border-b border-gray-100 dark:border-white/5">
          <button
            onClick={markAllAsRead}
            className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
            data-testid="history-mark-all-read"
          >
            Mark all read
          </button>
        </div>
      )}
      <div
        className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5"
        data-testid="history-event-list"
      >
        {sorted.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No recent activity
            </p>
          </div>
        ) : (
          sorted.map((event) => (
            <HistoryEventItem
              key={event.id}
              event={event}
              isRead={readIds.has(event.id)}
              onMarkAsRead={markAsRead}
            />
          ))
        )}
      </div>
    </>
  );
}
