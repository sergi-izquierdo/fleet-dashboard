"use client";

import { useState } from "react";
import { useDispatcherStatus } from "@/hooks/useDispatcherStatus";
import type { PRPipelineEntry } from "@/app/api/dispatcher-status/route";

// ─── Phase config ──────────────────────────────────────────────────────────────

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

type PhaseName = (typeof PHASE_ORDER)[number];

const PHASE_LABELS: Record<PhaseName, string> = {
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

// ─── PR Pipeline stage config ──────────────────────────────────────────────────

type PRStage = PRPipelineEntry["stage"];

const STAGE_LABELS: Record<PRStage, string> = {
  conflicting: "Conflicting",
  fixing: "Fixing",
  ci_failing: "CI Failing",
  eligible: "Eligible",
  blocked: "Blocked",
};

const STAGE_STYLES: Record<PRStage, string> = {
  conflicting: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  fixing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  ci_failing: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  eligible: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  blocked: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function RateLimitGauge({
  remaining,
  limit,
}: {
  remaining: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min(100, (remaining / limit) * 100) : 0;
  const color =
    remaining > 500
      ? "bg-green-500"
      : remaining >= 100
        ? "bg-yellow-500"
        : "bg-red-500";
  const textColor =
    remaining > 500
      ? "text-green-600 dark:text-green-400"
      : remaining >= 100
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="flex items-center gap-2 min-w-0" data-testid="rate-limit-gauge">
      <span className="text-xs text-gray-500 dark:text-white/50 shrink-0">Rate limit</span>
      <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden min-w-[60px]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
          aria-label={`Rate limit: ${remaining} of ${limit} remaining`}
        />
      </div>
      <span className={`text-xs font-medium shrink-0 ${textColor}`}>
        {remaining}/{limit}
      </span>
    </div>
  );
}

function PhaseRow({
  name,
  phase,
}: {
  name: PhaseName;
  phase: { status: string; durationMs?: number; skipReason?: string; summary?: string } | undefined;
}) {
  const status = phase?.status ?? "unknown";
  const isSkipped = status === "skipped";

  const dotColor =
    status === "completed"
      ? "bg-green-500"
      : status === "failed"
        ? "bg-red-500"
        : status === "running"
          ? "bg-blue-500 animate-pulse"
          : "bg-gray-400 dark:bg-gray-600";

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
        isSkipped
          ? "border-gray-100 bg-gray-50 opacity-50 dark:border-white/5 dark:bg-white/2"
          : "border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
      }`}
      data-testid={`phase-row-${name}`}
    >
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`}
        aria-label={`${PHASE_LABELS[name]} status: ${status}`}
        data-testid={`phase-dot-${name}`}
      />
      <span className="min-w-0 flex-1 text-xs font-medium text-gray-700 dark:text-gray-300">
        {PHASE_LABELS[name]}
      </span>
      {phase?.durationMs !== undefined && (
        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
          {phase.durationMs < 1000
            ? `${phase.durationMs}ms`
            : `${(phase.durationMs / 1000).toFixed(1)}s`}
        </span>
      )}
      {isSkipped && phase?.skipReason && (
        <span className="shrink-0 text-xs italic text-gray-400 dark:text-gray-500">
          {phase.skipReason}
        </span>
      )}
    </div>
  );
}

function PRStageGroup({
  stage,
  prs,
}: {
  stage: PRStage;
  prs: PRPipelineEntry[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 ${STAGE_STYLES[stage]}`}
        aria-expanded={expanded}
        data-testid={`stage-badge-${stage}`}
      >
        {STAGE_LABELS[stage]}
        <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[10px] font-bold opacity-80">
          {prs.length}
        </span>
      </button>

      {expanded && (
        <div className="ml-2 space-y-1" data-testid={`stage-list-${stage}`}>
          {prs.map((pr) => (
            <div
              key={`${pr.repo}-${pr.pr}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-white/10 dark:bg-white/5"
              data-testid={`pr-entry-${pr.pr}`}
            >
              <span className="font-medium text-gray-800 dark:text-gray-200">
                #{pr.pr}
              </span>
              <span className="text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                {pr.title ?? pr.repo.split("/")[1]}
              </span>
              {pr.fixAttempt !== undefined && pr.maxAttempts !== undefined && (
                <span className="text-gray-400 dark:text-gray-500">
                  attempt {pr.fixAttempt}/{pr.maxAttempts}
                </span>
              )}
              {pr.fixAgent && (
                <span className="text-blue-500 dark:text-blue-400">
                  {pr.fixAgent}
                </span>
              )}
              {pr.blockReason && (
                <span className="text-gray-400 dark:text-gray-500 italic">
                  {pr.blockReason}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function DispatcherPipeline() {
  const { data, isLoading, error, countdown } = useDispatcherStatus();

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="dispatcher-pipeline-loading">
        <div className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        data-testid="dispatcher-pipeline-error"
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
      >
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { cycle, rateLimit, phases, prPipeline, isStale } = data;

  // Group PRs by stage
  const byStage = prPipeline.reduce<Record<PRStage, PRPipelineEntry[]>>(
    (acc, pr) => {
      const s = pr.stage as PRStage;
      acc[s] = [...(acc[s] ?? []), pr];
      return acc;
    },
    {} as Record<PRStage, PRPipelineEntry[]>,
  );

  const stagesWithPRs = (Object.keys(STAGE_LABELS) as PRStage[]).filter(
    (s) => (byStage[s]?.length ?? 0) > 0,
  );

  return (
    <div className="space-y-5" data-testid="dispatcher-pipeline">
      {/* Stale warning */}
      {isStale && (
        <div
          className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400"
          role="alert"
          data-testid="dispatcher-stale-warning"
        >
          <span className="h-2 w-2 rounded-full bg-yellow-500 shrink-0" aria-hidden="true" />
          Dispatcher offline or not reporting — data may be stale
        </div>
      )}

      {/* A) Cycle Status Bar */}
      <section aria-label="Cycle status" data-testid="cycle-status-bar">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/50">
          Cycle Status
        </h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
          {cycle ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-white/50">Last run</span>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                  {new Date(cycle.finishedAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-white/50">Duration</span>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                  {cycle.durationMs < 1000
                    ? `${cycle.durationMs}ms`
                    : `${(cycle.durationMs / 1000).toFixed(1)}s`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-white/50">Next in</span>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200" data-testid="next-run-countdown">
                  {countdown}s
                </span>
              </div>
              {cycle.consecutiveErrors > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600 dark:text-red-400" data-testid="consecutive-errors">
                    {cycle.consecutiveErrors} consecutive error{cycle.consecutiveErrors > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-500 dark:text-white/50">No cycle data</span>
          )}
          {rateLimit && (
            <div className="ml-auto flex-1 min-w-[160px]">
              <RateLimitGauge remaining={rateLimit.remaining} limit={rateLimit.limit} />
            </div>
          )}
        </div>
      </section>

      {/* B) Phase Summary */}
      <section aria-label="Phase summary" data-testid="phase-summary">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/50">
          Phase Summary
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PHASE_ORDER.map((name) => (
            <PhaseRow key={name} name={name} phase={phases[name]} />
          ))}
        </div>
      </section>

      {/* C) PR Pipeline */}
      <section aria-label="PR pipeline" data-testid="pr-pipeline">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/50">
          PR Pipeline
          {prPipeline.length > 0 && (
            <span className="ml-2 font-normal normal-case text-gray-400 dark:text-gray-500">
              ({prPipeline.length} PR{prPipeline.length !== 1 ? "s" : ""})
            </span>
          )}
        </h3>
        {stagesWithPRs.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500" data-testid="pr-pipeline-empty">
            No PRs in pipeline
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stagesWithPRs.map((stage) => (
              <PRStageGroup key={stage} stage={stage} prs={byStage[stage] ?? []} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
