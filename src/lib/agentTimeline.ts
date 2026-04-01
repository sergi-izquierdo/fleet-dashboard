export interface CompletedAgentRaw {
  repo: string;
  issue: number;
  title?: string;
  pr?: string;
  status: string;
  completedAt: string;
  startedAt?: string;
}

export interface TimelineStateJson {
  active: Record<string, Record<string, unknown>>;
  completed: Record<string, CompletedAgentRaw>;
}

export interface TimelineAgent {
  name: string;
  project: string;
  issue: number;
  startedAt: string;
  completedAt: string;
  status: string;
  prUrl: string;
  durationMinutes: number;
}

export interface TimelineResponse {
  agents: TimelineAgent[];
}

export function buildTimelineResponse(state: TimelineStateJson): TimelineResponse {
  const now = new Date().toISOString();

  const agents: TimelineAgent[] = Object.entries(state.completed)
    .filter(([, agent]) => agent.startedAt !== undefined)
    .map(([name, agent]) => {
      const startedAt = agent.startedAt!;
      const completedAt = agent.completedAt ?? now;
      const durationMinutes = Math.round(
        (new Date(completedAt).getTime() - new Date(startedAt).getTime()) /
          60_000,
      );
      const project = agent.repo?.split("/")[1] ?? "unknown";
      const normalizedStatus =
        agent.status === "pr_merged" || agent.status === "success"
          ? "success"
          : agent.status === "timeout"
            ? "timeout"
            : "failed";

      return {
        name,
        project,
        issue: agent.issue,
        startedAt,
        completedAt,
        status: normalizedStatus,
        prUrl: agent.pr ?? "",
        durationMinutes: Math.max(0, durationMinutes),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )
    .slice(0, 50);

  return { agents };
}
