export interface AgentCostEntry {
  timestamp: string;
  agent_name?: string;
  agent?: string;
}

export interface CompletedStateEntry {
  completedAt?: string;
  pr?: string;
  status?: string;
}

export interface HeatmapDay {
  date: string;
  count: number;
  prs: number;
  agents: number;
}

export function parseJSONLCostEntries(content: string): AgentCostEntry[] {
  return content
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as AgentCostEntry];
      } catch {
        return [];
      }
    });
}

export function toDateString(timestamp: string): string | null {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

export function buildHeatmapDays(
  costEntries: AgentCostEntry[],
  completedEntries: CompletedStateEntry[],
  days = 90,
  now = new Date()
): HeatmapDay[] {
  // Build a map of date -> counts
  const agentCounts = new Map<string, number>();
  const prCounts = new Map<string, number>();

  for (const entry of costEntries) {
    const date = toDateString(entry.timestamp);
    if (date) {
      agentCounts.set(date, (agentCounts.get(date) ?? 0) + 1);
    }
  }

  for (const entry of completedEntries) {
    if (!entry.completedAt) continue;
    const date = toDateString(entry.completedAt);
    if (date && entry.pr) {
      prCounts.set(date, (prCounts.get(date) ?? 0) + 1);
    }
  }

  // Generate the last `days` dates using UTC to avoid timezone issues
  const result: HeatmapDay[] = [];
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const agents = agentCounts.get(dateStr) ?? 0;
    const prs = prCounts.get(dateStr) ?? 0;
    result.push({ date: dateStr, count: agents + prs, prs, agents });
  }

  return result;
}
