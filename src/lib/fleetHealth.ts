export interface RepeatFailure {
  key: string;
  issue: number;
  title: string;
  repo: string;
  recycleCount: number;
}

export interface FleetHealthResponse {
  total: number;
  merged: number;
  failed: number;
  timeout: number;
  recycled: number;
  successRate: number | null;
  repeatFailures: RepeatFailure[];
}

export interface CompletedAgent {
  repo: string;
  issue: number;
  title: string;
  pr: string;
  status: string;
  completedAt: string;
  startedAt?: string;
}

export interface StateJson {
  active: Record<string, Record<string, unknown>>;
  completed: Record<string, CompletedAgent>;
  recycle_counts?: Record<string, number>;
}

export function buildHealthResponse(state: StateJson): FleetHealthResponse {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  let total = 0;
  let merged = 0;
  let failed = 0;
  let timeout = 0;
  let recycled = 0;

  for (const agent of Object.values(state.completed)) {
    if (!agent.completedAt) continue;
    const completedAt = new Date(agent.completedAt);
    if (completedAt < cutoff) continue;

    total++;
    switch (agent.status) {
      case "pr_merged":
        merged++;
        break;
      case "failed":
        failed++;
        break;
      case "timeout":
        timeout++;
        break;
      case "recycled":
        recycled++;
        break;
    }
  }

  const successRate = total > 0 ? Math.round((merged / total) * 100) : null;

  // Build repeat failures list from recycle_counts (issues recycled 2+ times)
  const repeatFailures: RepeatFailure[] = [];
  const recycleCounts = state.recycle_counts ?? {};

  for (const [key, count] of Object.entries(recycleCounts)) {
    if (count < 2) continue;

    const matchEntry = Object.entries(state.completed).find(([k]) => k === key);

    if (matchEntry) {
      const [, agent] = matchEntry;
      repeatFailures.push({
        key,
        issue: agent.issue,
        title: agent.title,
        repo: agent.repo,
        recycleCount: count,
      });
    } else {
      // Parse key format (e.g. "owner/repo/123" or "repo/123")
      const parts = key.split("/");
      const issueNum = parseInt(parts[parts.length - 1], 10);
      repeatFailures.push({
        key,
        issue: isNaN(issueNum) ? 0 : issueNum,
        title: key,
        repo: parts.slice(0, -1).join("/"),
        recycleCount: count,
      });
    }
  }

  repeatFailures.sort((a, b) => b.recycleCount - a.recycleCount);

  return { total, merged, failed, timeout, recycled, successRate, repeatFailures };
}
