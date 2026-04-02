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

export interface AgentCostEntry {
  timestamp: string;
  agent_name?: string;
  cwd?: string;
}

/**
 * Parses agent-costs.jsonl content into CompletedAgentRaw entries.
 * Used as a fallback when state.json completed entries are empty.
 */
export function parseAgentCostsAsCompleted(
  content: string,
): Record<string, CompletedAgentRaw> {
  const completed: Record<string, CompletedAgentRaw> = {};

  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as AgentCostEntry;
      if (!entry.timestamp || !entry.agent_name) continue;

      const agentName = entry.agent_name;

      // Extract issue number from agent_name suffix (e.g. "agent-fle-255" → 255)
      const issueMatch = agentName.match(/(\d+)$/);
      const issue = issueMatch ? parseInt(issueMatch[1], 10) : 0;

      // Extract project name from cwd (e.g. ".../projects/fleet-dashboard/.worktrees/issue-255" → "fleet-dashboard")
      let project = "unknown";
      if (entry.cwd) {
        const cwdParts = entry.cwd.split("/");
        const worktreeIdx = cwdParts.indexOf(".worktrees");
        if (worktreeIdx > 0) {
          project = cwdParts[worktreeIdx - 1];
        }
      }

      completed[agentName] = {
        repo: `sergi/${project}`,
        issue,
        status: "success",
        completedAt: entry.timestamp,
        startedAt: entry.timestamp,
      };
    } catch {
      // Skip invalid lines
    }
  }

  return completed;
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

export function buildTimelineResponse(
  state: TimelineStateJson,
  costCompleted: Record<string, CompletedAgentRaw> = {},
): TimelineResponse {
  const now = new Date().toISOString();

  // Merge: cost entries provide a fallback; state.json entries take precedence (dedup by name)
  const merged: Record<string, CompletedAgentRaw> = { ...costCompleted, ...state.completed };

  const agents: TimelineAgent[] = Object.entries(merged)
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
