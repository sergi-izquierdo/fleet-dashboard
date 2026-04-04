export interface RepoHealthData {
  repo: string;
  openIssues: number;
  prsMerged7d: number;
  failedAgents7d: number;
  avgMergeTimeMinutes: number | null;
  healthScore: number;
}

export interface RepoHealthScoreInput {
  openIssues: number;
  prsMerged7d: number;
  failedAgents7d: number;
  avgMergeTimeMinutes: number | null;
}

/**
 * Calculate a 0-100 health score for a repo.
 *
 * Weights:
 *  - Merged PRs (last 7d): +10 per merge, up to +40
 *  - Failed agents (last 7d): -15 per failure, up to -40
 *  - Open issues backlog: -5 per 5 issues, up to -20
 *  - Avg merge time > 2h: -5 per extra hour, up to -10
 */
export function calculateHealthScore(input: RepoHealthScoreInput): number {
  const { openIssues, prsMerged7d, failedAgents7d, avgMergeTimeMinutes } = input;

  const mergedBonus = Math.min(prsMerged7d * 10, 40);
  const failedPenalty = Math.min(failedAgents7d * 15, 40);
  const openIssuesPenalty = Math.min(Math.floor(openIssues / 5) * 5, 20);
  const mergePenalty =
    avgMergeTimeMinutes !== null && avgMergeTimeMinutes > 120
      ? Math.min(Math.floor((avgMergeTimeMinutes - 120) / 60) * 5, 10)
      : 0;

  const raw = 50 + mergedBonus - failedPenalty - openIssuesPenalty - mergePenalty;
  return Math.max(0, Math.min(100, raw));
}

export function getHealthColor(score: number): "green" | "yellow" | "red" {
  if (score >= 80) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

export function healthColorClasses(score: number): {
  badge: string;
  text: string;
  dot: string;
} {
  const color = getHealthColor(score);
  switch (color) {
    case "green":
      return {
        badge: "bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-500/20",
        text: "text-green-700 dark:text-green-400",
        dot: "bg-green-500",
      };
    case "yellow":
      return {
        badge: "bg-yellow-100 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20",
        text: "text-yellow-700 dark:text-yellow-400",
        dot: "bg-yellow-500",
      };
    case "red":
      return {
        badge: "bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
        text: "text-red-700 dark:text-red-400",
        dot: "bg-red-500",
      };
  }
}
