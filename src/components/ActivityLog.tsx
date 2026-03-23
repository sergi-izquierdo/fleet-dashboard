export type EventType = "commit" | "pr_created" | "ci_failed" | "ci_passed" | "review" | "deploy" | "error";

export interface AgentEvent {
  id: string;
  timestamp: string;
  agentName: string;
  eventType: EventType;
  description: string;
}

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

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

interface ActivityLogProps {
  events: AgentEvent[];
  maxHeight?: string;
}

export default function ActivityLog({ events, maxHeight = "max-h-96" }: ActivityLogProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 animate-fade-in">
      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">Activity Log</h2>
      <div className={`${maxHeight} overflow-y-auto pr-1`} data-testid="activity-log-scroll">
        {sorted.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No events to display.</p>
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
                      <time
                        className="ml-auto text-xs text-gray-400 dark:text-gray-500"
                        dateTime={event.timestamp}
                      >
                        {formatTimestamp(event.timestamp)}
                      </time>
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
