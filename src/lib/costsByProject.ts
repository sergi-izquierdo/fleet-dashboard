import type { AgentCostEntry, ProjectCost } from "@/types/costsByProject";

export function extractProjectName(agentName: string): string {
  const match = agentName.match(/^agent-(.+)-\d+$/);
  return match ? match[1] : agentName;
}

export function parseJSONLEntries(content: string): AgentCostEntry[] {
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

export function groupByProject(
  entries: AgentCostEntry[],
  since?: Date
): ProjectCost[] {
  const filtered = since
    ? entries.filter((e) => new Date(e.timestamp) >= since)
    : entries;

  const groups = new Map<
    string,
    {
      totalCost: number;
      totalTokens: number;
      sessionCount: number;
      lastActive: string;
    }
  >();

  for (const entry of filtered) {
    const project = extractProjectName(entry.agent);
    const existing = groups.get(project) ?? {
      totalCost: 0,
      totalTokens: 0,
      sessionCount: 0,
      lastActive: entry.timestamp,
    };
    existing.totalCost += entry.cost;
    existing.totalTokens += entry.tokens;
    existing.sessionCount += 1;
    if (entry.timestamp > existing.lastActive) {
      existing.lastActive = entry.timestamp;
    }
    groups.set(project, existing);
  }

  return Array.from(groups.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.totalCost - a.totalCost);
}
