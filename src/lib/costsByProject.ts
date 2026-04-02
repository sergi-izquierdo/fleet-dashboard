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
      sessionCount: number;
      transcriptLines: number;
      lastActive: string;
    }
  >();

  for (const entry of filtered) {
    if (!entry.agent_name) continue;
    const project = extractProjectName(entry.agent_name);
    const existing = groups.get(project) ?? {
      sessionCount: 0,
      transcriptLines: 0,
      lastActive: entry.timestamp,
    };
    existing.sessionCount += 1;
    existing.transcriptLines += entry.transcript_lines ?? 0;
    if (entry.timestamp > existing.lastActive) {
      existing.lastActive = entry.timestamp;
    }
    groups.set(project, existing);
  }

  return Array.from(groups.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.sessionCount - a.sessionCount);
}
