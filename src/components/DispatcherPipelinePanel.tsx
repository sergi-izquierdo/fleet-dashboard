"use client";

import { useDispatcherStatus } from "@/hooks/useDispatcherStatus";
import type { DispatcherPhase, DispatcherPRPipelineEntry } from "@/types/dispatcherStatus";

const PHASE_ORDER = [
  "planner",
  "spawn",
  "checkAgents",
  "recoverStale",
  "autoLabel",
  "autoRebase",
  "fixCI",
  "autoMerge",
  "cleanup",
] as const;

const PHASE_LABELS: Record<string, string> = {
  planner: "Planner",
  spawn: "Spawn",
  checkAgents: "Check Agents",
  recoverStale: "Recover Stale",
  autoLabel: "Auto Label",
  autoRebase: "Auto Rebase",
  fixCI: "Fix CI",
  autoMerge: "Auto Merge",
  cleanup: "Cleanup",
};

const STAGE_STYLES: Record<string, string> = {
  conflicting: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
  rebasing: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  ci_failing: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30",
  fixing: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  eligible: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
  blocked: "bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (diffMs < 0) return "just now";
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function formatCountdown(isoString: string): string {
  const diffMs = new Date(isoString).getTime() - Date.now();
  if (diffMs <= 0) return "now";
  const secs = Math.ceil(diffMs / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function repoShortName(repo: string): string {
  const parts = repo.split("/");
  return parts[parts.length - 1] ?? repo;
}

function PhaseRow({ name, phase }: { name: string; phase: DispatcherPhase | undefined }) {
  const isSkipped = !phase || phase.status === "skipped";
  const isError = phase?.status === "error";
  const isOk = phase?.status === "completed";

  return (
    <div
      className={`flex items-center justify-between gap-2 ${isSkipped ? "opacity-40" : ""}`}
      data-testid={`phase-row-${name}`}
    >
      <span className="min-w-0 flex-1 truncate text-xs text-gray-700 dark:text-gray-300">
        {PHASE_LABELS[name] ?? name}
      </span>
      <div className="flex items-center gap-1.5">
        {phase?.durationMs !== undefined && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDuration(phase.durationMs)}
          </span>
        )}
        {isOk && (
          <svg
            className="h-3.5 w-3.5 flex-shrink-0 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-label="completed"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {isError && (
          <svg
            className="h-3.5 w-3.5 flex-shrink-0 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-label="error"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {isSkipped && (
          <svg
            className="h-3.5 w-3.5 flex-shrink-0 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-label="skipped"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        )}
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const style = STAGE_STYLES[stage] ?? STAGE_STYLES["blocked"];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-medium ${style}`}
      data-testid={`stage-badge-${stage}`}
    >
      {stage.replace("_", " ")}
    </span>
  );
}

function PRPipelineRow({ entry }: { entry: DispatcherPRPipelineEntry }) {
  const short = repoShortName(entry.repo);
  const hasRebaseAttempts = (entry.rebaseAttempts ?? 0) > 0;
  const hasFixAttempt = (entry.fixAttempt ?? 0) > 0;

  return (
    <div
      className="flex items-center justify-between gap-2"
      data-testid={`pr-pipeline-row-${entry.pr}`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-xs text-gray-500 dark:text-gray-400">{short}</span>
        <a
          href={`https://github.com/${entry.repo}/pull/${entry.pr}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          data-testid={`pr-link-${entry.pr}`}
        >
          #{entry.pr}
        </a>
        {hasRebaseAttempts && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            r{entry.rebaseAttempts}
          </span>
        )}
        {hasFixAttempt && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            f{entry.fixAttempt}
          </span>
        )}
      </div>
      <StageBadge stage={entry.stage} />
    </div>
  );
}

export default function DispatcherPipelinePanel() {
  const { data, isLoading } = useDispatcherStatus();

  if (isLoading && !data) {
    return (
      <div
        className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
        data-testid="dispatcher-pipeline-loading"
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Dispatcher Pipeline
        </h2>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { cycle, phases, prPipeline } = data;

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
      data-testid="dispatcher-pipeline-panel"
    >
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
        Dispatcher Pipeline
      </h2>

      {/* Section A — Cycle Info */}
      <div className="space-y-1" data-testid="cycle-info">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">Last cycle</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {formatRelativeTime(cycle.finishedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">Duration</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {formatDuration(cycle.durationMs)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">Next in</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {formatCountdown(cycle.nextRunAt)}
          </span>
        </div>
        {cycle.consecutiveErrors > 0 && (
          <div className="flex items-center justify-between" data-testid="consecutive-errors">
            <span className="text-xs text-gray-500 dark:text-gray-400">Errors</span>
            <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/20 px-1.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
              {cycle.consecutiveErrors}
            </span>
          </div>
        )}
      </div>

      <div className="my-3 border-t border-gray-200 dark:border-white/10" />

      {/* Section B — Phase Summary Grid */}
      <div className="space-y-1.5" data-testid="phase-summary">
        {PHASE_ORDER.map((name) => (
          <PhaseRow key={name} name={name} phase={phases[name]} />
        ))}
      </div>

      <div className="my-3 border-t border-gray-200 dark:border-white/10" />

      {/* Section C — PR Pipeline */}
      <div data-testid="pr-pipeline">
        {prPipeline.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">No PRs in pipeline</p>
        ) : (
          <div className="space-y-1.5">
            {prPipeline.map((entry) => (
              <PRPipelineRow key={`${entry.repo}-${entry.pr}`} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
