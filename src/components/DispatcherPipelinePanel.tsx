"use client";

import { useFleetData } from "@/providers/FleetDataProvider";

export default function DispatcherPipelinePanel() {
  const { dispatcherStatus: data, dispatcherLoading: isLoading, dispatcherError: error } = useFleetData();

  if (isLoading && !data) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-500 dark:text-red-400">
        Failed to load dispatcher status: {error}
      </p>
    );
  }

  if (!data || data.offline) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Dispatcher is offline or unavailable.
      </p>
    );
  }

  const rateLevelColor: Record<string, string> = {
    ok: "text-green-600 dark:text-green-400",
    low: "text-yellow-600 dark:text-yellow-400",
    critical: "text-red-600 dark:text-red-400",
    unknown: "text-gray-500 dark:text-gray-400",
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Rate Limit */}
      <div className="flex items-center justify-between">
        <span className="text-gray-600 dark:text-gray-400">GitHub Rate Limit</span>
        <span className={rateLevelColor[data.rateLimit.level] ?? "text-gray-500"}>
          {data.rateLimit.remaining} / {data.rateLimit.limit}
        </span>
      </div>

      {/* Active agents */}
      <div>
        <p className="mb-1 text-gray-600 dark:text-gray-400">
          Active Agents ({data.activeAgents.length})
        </p>
        {data.activeAgents.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500">None</p>
        ) : (
          <ul className="space-y-1">
            {data.activeAgents.map((agent) => (
              <li
                key={agent}
                className="rounded bg-blue-50 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {agent}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* PR Pipeline */}
      {data.prPipeline.length > 0 && (
        <div>
          <p className="mb-1 text-gray-600 dark:text-gray-400">
            PR Pipeline ({data.prPipeline.length})
          </p>
          <ul className="space-y-1">
            {data.prPipeline.map((entry) => (
              <li
                key={`${entry.repo}-${entry.pr}`}
                className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 dark:bg-gray-800"
              >
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {entry.repo}#{entry.pr}
                </span>
                <span className="text-gray-500 dark:text-gray-400">{entry.stage}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cycle errors */}
      {data.cycle.consecutiveErrors > 0 && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 dark:border-red-700 dark:bg-red-900/20">
          <p className="font-medium text-red-700 dark:text-red-400">
            {data.cycle.consecutiveErrors} consecutive error(s)
          </p>
          {data.cycle.errors.slice(0, 3).map((err, i) => (
            <p key={i} className="mt-0.5 text-xs text-red-600 dark:text-red-400">
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
