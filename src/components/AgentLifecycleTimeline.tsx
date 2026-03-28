"use client";

import type { Agent, AgentLifecycleTimestamps } from "@/types/dashboard";

type StepStatus = "completed" | "current" | "pending" | "failed";

interface LifecycleStep {
  id: string;
  label: string;
  status: StepStatus;
  timestamp?: string;
  duration?: string;
  errorInfo?: string;
  subSteps?: LifecycleStep[];
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function durationBetween(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return "";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

// Map agent status to the ordered list of completed steps (without timestamps).
const STATUS_TO_COMPLETED_STEPS: Record<Agent["status"], string[]> = {
  working: ["spawned"],
  pr_open: ["spawned", "working", "committed", "prCreated"],
  review_pending: ["spawned", "working", "committed", "prCreated", "ciPassed"],
  approved: [
    "spawned",
    "working",
    "committed",
    "prCreated",
    "ciPassed",
    "review",
  ],
  merged: [
    "spawned",
    "working",
    "committed",
    "prCreated",
    "ciPassed",
    "review",
    "merged",
  ],
  error: [],
};

const STEP_ORDER = [
  "spawned",
  "working",
  "committed",
  "prCreated",
  "ciRunning",
  "ciResult",
  "review",
  "merged",
] as const;

type StepId = (typeof STEP_ORDER)[number];

const STEP_LABELS: Record<StepId, string> = {
  spawned: "Spawned",
  working: "Working",
  committed: "Committed",
  prCreated: "PR Created",
  ciRunning: "CI Running",
  ciResult: "CI Result",
  review: "Review",
  merged: "Merged",
};

function resolveStepStatus(
  stepId: StepId,
  agentStatus: Agent["status"],
  ts: AgentLifecycleTimestamps,
): StepStatus {
  // Error state: find the last completed step, mark the next as failed
  if (agentStatus === "error") {
    const idx = STEP_ORDER.indexOf(stepId);

    if (ts.reviewStarted) {
      if (stepId === "review") return "failed";
      return idx < STEP_ORDER.indexOf("review") ? "completed" : "pending";
    }
    if (ts.ciStarted || ts.ciFailed) {
      if (stepId === "ciRunning" || stepId === "ciResult") return "failed";
      return idx < STEP_ORDER.indexOf("ciRunning") ? "completed" : "pending";
    }
    if (ts.prCreated) {
      if (stepId === "ciRunning") return "failed";
      return idx < STEP_ORDER.indexOf("ciRunning") ? "completed" : "pending";
    }
    if (ts.committed) {
      if (stepId === "prCreated") return "failed";
      return idx < STEP_ORDER.indexOf("prCreated") ? "completed" : "pending";
    }
    if (ts.working) {
      if (stepId === "committed") return "failed";
      return idx < STEP_ORDER.indexOf("committed") ? "completed" : "pending";
    }
    if (ts.spawned) {
      if (stepId === "working") return "failed";
      return stepId === "spawned" ? "completed" : "pending";
    }
    // No timestamps — mark spawned as failed
    return stepId === "spawned" ? "failed" : "pending";
  }

  const completedSteps = STATUS_TO_COMPLETED_STEPS[agentStatus];

  // Map step IDs to the logical completed-steps list
  const stepToCompletedKey: Partial<Record<StepId, string>> = {
    spawned: "spawned",
    working: "working",
    committed: "committed",
    prCreated: "prCreated",
    ciRunning: "prCreated", // CI running means PR was created
    ciResult: "ciPassed",
    review: "review",
    merged: "merged",
  };

  // Determine current step from agent status
  const currentStepByStatus: Partial<Record<Agent["status"], StepId>> = {
    working: "working",
    pr_open: "ciRunning",
    review_pending: "review",
    approved: "merged",
    merged: "merged",
  };

  const currentStep = currentStepByStatus[agentStatus];

  // For CI result step, check if passed or failed
  if (stepId === "ciResult") {
    if (ts.ciPassed || completedSteps.includes("ciPassed")) return "completed";
    if (ts.ciFailed) return "failed";
    if (agentStatus === "pr_open") return "current";
    return "pending";
  }

  // For CI running
  if (stepId === "ciRunning") {
    if (agentStatus === "pr_open" && !ts.ciPassed && !ts.ciFailed)
      return "current";
    if (completedSteps.includes("ciPassed") || ts.ciPassed) return "completed";
    if (ts.ciStarted) return "current";
    if (completedSteps.includes("prCreated") || ts.prCreated)
      return "completed";
    return "pending";
  }

  const key = stepToCompletedKey[stepId];
  if (key && completedSteps.includes(key)) return "completed";
  if (stepId === currentStep) return "current";
  return "pending";
}

function resolveTimestamp(
  stepId: StepId,
  ts: AgentLifecycleTimestamps,
): string | undefined {
  const map: Partial<Record<StepId, string | undefined>> = {
    spawned: ts.spawned,
    working: ts.working,
    committed: ts.committed,
    prCreated: ts.prCreated,
    ciRunning: ts.ciStarted,
    ciResult: ts.ciPassed ?? ts.ciFailed,
    review: ts.reviewStarted,
    merged: ts.merged,
  };
  return map[stepId];
}

function buildSteps(agent: Agent): LifecycleStep[] {
  const ts = agent.lifecycleTimestamps ?? {};
  const steps: LifecycleStep[] = [];
  let prevTimestamp: string | undefined;

  for (const stepId of STEP_ORDER) {
    const stepStatus = resolveStepStatus(stepId, agent.status, ts);
    const timestamp = resolveTimestamp(stepId, ts);
    const duration =
      timestamp && prevTimestamp
        ? durationBetween(prevTimestamp, timestamp)
        : undefined;

    const step: LifecycleStep = {
      id: stepId,
      label:
        stepId === "ciResult"
          ? ts.ciFailed || (agent.status === "error" && ts.ciStarted)
            ? "CI Failed"
            : "CI Passed"
          : STEP_LABELS[stepId],
      status: stepStatus,
      timestamp,
      duration,
    };

    // Sub-steps: CI fix attempts
    if (stepId === "ciResult" && ts.ciFixAttempts && ts.ciFixAttempts.length > 0) {
      step.subSteps = ts.ciFixAttempts.map((attempt, i) => ({
        id: `ci-fix-${i}`,
        label: `CI Fix attempt ${i + 1}`,
        status: attempt.completedAt ? "completed" : "current",
        timestamp: attempt.startedAt,
        duration:
          attempt.completedAt
            ? durationBetween(attempt.startedAt, attempt.completedAt)
            : undefined,
      }));
    }

    // Sub-steps: Review fix attempts
    if (
      stepId === "review" &&
      ts.reviewFixAttempts &&
      ts.reviewFixAttempts.length > 0
    ) {
      step.subSteps = ts.reviewFixAttempts.map((attempt, i) => ({
        id: `review-fix-${i}`,
        label: `Review fix attempt ${i + 1}`,
        status: attempt.completedAt ? "completed" : "current",
        timestamp: attempt.startedAt,
        duration:
          attempt.completedAt
            ? durationBetween(attempt.startedAt, attempt.completedAt)
            : undefined,
      }));
    }

    // Error info on failed steps
    if (stepStatus === "failed" && ts.error) {
      step.errorInfo = ts.error;
    }

    if (timestamp) prevTimestamp = timestamp;
    steps.push(step);
  }

  return steps;
}

function StepDot({ status }: { status: StepStatus }) {
  const base = "h-3 w-3 rounded-full border-2 shrink-0 mt-0.5";
  if (status === "completed")
    return (
      <span
        className={`${base} bg-green-500 border-green-500`}
        aria-label="completed"
      />
    );
  if (status === "current")
    return (
      <span
        className={`${base} bg-blue-500 border-blue-500 animate-pulse`}
        aria-label="in progress"
      />
    );
  if (status === "failed")
    return (
      <span
        className={`${base} bg-red-500 border-red-500`}
        aria-label="failed"
      />
    );
  return (
    <span
      className={`${base} bg-transparent border-gray-300 dark:border-gray-600`}
      aria-label="pending"
    />
  );
}

interface AgentLifecycleTimelineProps {
  agent: Agent;
}

export function AgentLifecycleTimeline({ agent }: AgentLifecycleTimelineProps) {
  const steps = buildSteps(agent);

  return (
    <div
      data-testid="agent-lifecycle-timeline"
      className="space-y-1"
      aria-label="Agent lifecycle timeline"
    >
      {steps.map((step, index) => (
        <div key={step.id}>
          {/* Step row */}
          <div
            className="flex items-start gap-3"
            data-testid={`timeline-step-${step.id}`}
          >
            {/* Connector line + dot */}
            <div className="flex flex-col items-center">
              <StepDot status={step.status} />
              {index < steps.length - 1 && (
                <div className="w-px flex-1 min-h-[20px] bg-gray-200 dark:bg-gray-700 mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="pb-3 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm font-medium ${
                    step.status === "failed"
                      ? "text-red-600 dark:text-red-400"
                      : step.status === "completed"
                        ? "text-gray-900 dark:text-white"
                        : step.status === "current"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-400 dark:text-gray-500"
                  }`}
                  data-testid={`step-label-${step.id}`}
                >
                  {step.label}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {step.duration && (
                    <span
                      className="text-xs text-gray-400 dark:text-gray-500"
                      data-testid={`step-duration-${step.id}`}
                    >
                      +{step.duration}
                    </span>
                  )}
                  {step.timestamp && (
                    <span
                      className="text-xs text-gray-400 dark:text-gray-500 font-mono"
                      data-testid={`step-timestamp-${step.id}`}
                    >
                      {formatTimestamp(step.timestamp)}
                    </span>
                  )}
                </div>
              </div>

              {/* Error info */}
              {step.errorInfo && (
                <p
                  className="mt-1 text-xs text-red-500 dark:text-red-400"
                  data-testid={`step-error-${step.id}`}
                >
                  {step.errorInfo}
                </p>
              )}

              {/* Sub-steps */}
              {step.subSteps && step.subSteps.length > 0 && (
                <div className="mt-1 ml-2 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-3">
                  {step.subSteps.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between gap-2"
                      data-testid={`timeline-substep-${sub.id}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <StepDot status={sub.status} />
                        <span
                          className={`text-xs ${
                            sub.status === "completed"
                              ? "text-gray-600 dark:text-gray-300"
                              : sub.status === "current"
                                ? "text-blue-500 dark:text-blue-400"
                                : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {sub.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {sub.duration && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            +{sub.duration}
                          </span>
                        )}
                        {sub.timestamp && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            {formatTimestamp(sub.timestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
