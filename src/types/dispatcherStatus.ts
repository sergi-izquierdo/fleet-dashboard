export interface DispatcherCycle {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  nextRunAt: string;
  consecutiveErrors: number;
  errors: string[];
}

export interface DispatcherRateLimit {
  remaining: number;
  limit: number;
  level: "ok" | "low" | "critical" | "unknown";
  resetAt: string;
}

export interface DispatcherPhase {
  status: "completed" | "error" | "skipped";
  durationMs?: number;
  error?: string;
  reason?: string;
}

export interface DispatcherPRPipelineEntry {
  repo: string;
  pr: number;
  stage: string;
  rebaseAttempts?: number;
  fixAttempt?: number;
  maxAttempts?: number;
  fixAgent?: string;
}

export interface DispatcherStatus {
  cycle: DispatcherCycle;
  rateLimit: DispatcherRateLimit;
  phases: Record<string, DispatcherPhase>;
  prPipeline: DispatcherPRPipelineEntry[];
  activeAgents: string[];
  completedAgents: string[];
  offline?: boolean;
}
