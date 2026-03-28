"use client";

import { useDispatcherStatus } from "@/hooks/useDispatcherStatus";
import type { DispatcherPhase } from "@/types/dispatcherStatus";

const PHASE_ORDER = [
  "rateLimit",
  "planner",
  "spawn",
  "checkAgents",
  "recoverStale",
  "autoLabel",
  "autoRebase",
  "fixCI",
  "cleanupReviewFix",
  "autoMerge",
  "cleanup",
  "writeStatus",
] as const;

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${parseFloat((ms / 1000).toFixed(1))}s`;
}

function PhaseBar({
  name,
  phase,
  widthPercent,
}: {
  name: string;
  phase: DispatcherPhase;
  widthPercent: number;
}) {
  const barColor =
    phase.status === "completed"
      ? "bg-green-500 dark:bg-green-500"
      : phase.status === "error"
        ? "bg-red-500 dark:bg-red-500"
        : "bg-gray-400 dark:bg-gray-500";

  const minWidth = widthPercent < 2 && widthPercent > 0 ? 2 : widthPercent;

  return (
    <div className="flex items-center gap-2">
      <span className="w-20 sm:w-32 shrink-0 truncate text-right text-xs text-gray-500 dark:text-gray-400">
        {name}
      </span>
      <div className="flex flex-1 items-center gap-1">
        <div className="relative h-4 flex-1 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-full rounded ${barColor}`}
            style={{ width: `${minWidth}%` }}
            aria-label={`${name} ${phase.status}`}
          />
        </div>
        <span className="w-14 shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
          {phase.durationMs != null ? formatDuration(phase.durationMs) : "—"}
        </span>
      </div>
    </div>
  );
}

export default function DispatcherPipelinePanel() {
  const { data, isLoading, error } = useDispatcherStatus();

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

  const phases = data.phases ?? {};
  const phaseEntries = PHASE_ORDER.filter((name) => name in phases).map(
    (name) => ({ name, phase: phases[name] })
  );

  // Include any phases not in the known order
  const unknownPhases = Object.keys(phases)
    .filter((k) => !PHASE_ORDER.includes(k as (typeof PHASE_ORDER)[number]))
    .map((name) => ({ name, phase: phases[name] }));

  const allPhaseEntries = [...phaseEntries, ...unknownPhases];

  const maxDuration = Math.max(
    ...allPhaseEntries.map((e) => e.phase.durationMs ?? 0),
    1
  );

  return (
    <div className="space-y-4 text-sm">
      {/* Cycle total time */}
      {data.cycle.durationMs != null && (
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Cycle Duration</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {formatDuration(data.cycle.durationMs)}
          </span>
        </div>
      )}

      {/* Rate Limit */}
      <div className="flex items-center justify-between">
        <span className="text-gray-600 dark:text-gray-400">GitHub Rate Limit</span>
        <span className={rateLevelColor[data.rateLimit.level] ?? "text-gray-500"}>
          {data.rateLimit.remaining} / {data.rateLimit.limit}
        </span>
      </div>

      {/* Cycle Phase Timeline */}
      {allPhaseEntries.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-medium text-gray-700 dark:text-gray-300">
              Cycle Phase Timeline
            </p>
          </div>
          <div className="space-y-1.5">
            {allPhaseEntries.map(({ name, phase }) => (
              <PhaseBar
                key={name}
                name={name}
                phase={phase}
                widthPercent={
                  phase.durationMs != null
                    ? (phase.durationMs / maxDuration) * 100
                    : 0
                }
              />
            ))}
          </div>
        </div>
      )}

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
