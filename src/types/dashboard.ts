export type HealthStatus = "working" | "idle" | "error";

export interface HealthTimelineEntry {
  timestamp: string;
  status: HealthStatus;
}

export interface AgentLifecycleTimestamps {
  spawned?: string;
  working?: string;
  committed?: string;
  prCreated?: string;
  ciStarted?: string;
  ciPassed?: string;
  ciFailed?: string;
  reviewStarted?: string;
  reviewApproved?: string;
  reviewChangesRequested?: string;
  merged?: string;
  error?: string;
  ciFixAttempts?: Array<{ startedAt: string; completedAt?: string }>;
  reviewFixAttempts?: Array<{ startedAt: string; completedAt?: string }>;
}

export interface Agent {
  name: string;
  sessionId: string;
  status:
    | "working"
    | "pr_open"
    | "review_pending"
    | "approved"
    | "merged"
    | "error";
  issue: {
    title: string;
    number: number;
    url: string;
  };
  branch: string;
  timeElapsed: string;
  pr?: {
    url: string;
    number: number;
  };
  healthTimeline?: HealthTimelineEntry[];
  lifecycleTimestamps?: AgentLifecycleTimestamps;
}

export interface PR {
  number: number;
  url: string;
  title: string;
  ciStatus: "passing" | "failing" | "pending";
  reviewStatus: "approved" | "changes_requested" | "pending";
  mergeState: "merged" | "open" | "closed";
  author: string;
  branch: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  agentName: string;
  eventType:
    | "commit"
    | "pr_created"
    | "ci_failed"
    | "ci_passed"
    | "review"
    | "deploy"
    | "error"
    | "tool_use"
    | "agent_start"
    | "agent_stop";
  description: string;
  project?: string;
}

export interface DashboardData {
  agents: Agent[];
  prs: PR[];
  activityLog: ActivityEvent[];
}
