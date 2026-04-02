export type NotificationSeverity = "info" | "warning" | "error" | "success";

export type NotificationEventType =
  | "pr_merged"
  | "pr_created"
  | "ci_failed"
  | "ci_passed"
  | "agent_started"
  | "agent_completed"
  | "agent_stuck"
  | "review_requested"
  | "deploy"
  | "error";

export interface Notification {
  id: string;
  title: string;
  description: string;
  eventType: NotificationEventType;
  severity: NotificationSeverity;
  timestamp: string;
  read: boolean;
  agentName?: string;
}

export const severityConfig: Record<
  NotificationSeverity,
  { color: string; dot: string; badge: string }
> = {
  info: {
    color: "text-blue-400",
    dot: "bg-blue-500",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  },
  success: {
    color: "text-green-400",
    dot: "bg-green-500",
    badge: "bg-green-500/20 text-green-400 border-green-500/40",
  },
  warning: {
    color: "text-yellow-400",
    dot: "bg-yellow-500",
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  },
  error: {
    color: "text-red-400",
    dot: "bg-red-500",
    badge: "bg-red-500/20 text-red-400 border-red-500/40",
  },
};

export const eventTypeToSeverity: Record<NotificationEventType, NotificationSeverity> = {
  pr_merged: "success",
  pr_created: "info",
  ci_passed: "success",
  deploy: "info",
  review_requested: "info",
  ci_failed: "error",
  agent_started: "info",
  agent_completed: "success",
  agent_stuck: "warning",
  error: "error",
};

export const eventTypeLabels: Record<NotificationEventType, string> = {
  pr_merged: "PR Merged",
  pr_created: "PR Created",
  ci_failed: "CI Failed",
  ci_passed: "CI Passed",
  agent_started: "Agent Started",
  agent_completed: "Agent Done",
  agent_stuck: "Agent Stuck",
  review_requested: "Review Requested",
  deploy: "Deploy",
  error: "Error",
};
