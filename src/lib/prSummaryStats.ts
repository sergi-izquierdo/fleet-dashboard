import type { RecentPR } from "@/types/prs";

export interface PRSummaryStats {
  openCount: number;
  ciPassingCount: number;
  ciFailingCount: number;
  merged7dCount: number;
  avgMergeTimeMs: number | null;
}

function daysBefore(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function computePRSummaryStats(prs: RecentPR[]): PRSummaryStats {
  const cutoff7d = daysBefore(7);
  const cutoff30d = daysBefore(30);

  let openCount = 0;
  let ciPassingCount = 0;
  let ciFailingCount = 0;
  let merged7dCount = 0;

  const mergeTimes: number[] = [];

  for (const pr of prs) {
    if (pr.status === "open") {
      openCount++;
      if (pr.ciStatus === "passing") ciPassingCount++;
      if (pr.ciStatus === "failing") ciFailingCount++;
    }

    if (pr.status === "merged" && pr.mergedAt) {
      const mergedDate = new Date(pr.mergedAt);
      if (mergedDate >= cutoff7d) {
        merged7dCount++;
      }
      if (mergedDate >= cutoff30d) {
        const created = new Date(pr.createdAt);
        const elapsed = mergedDate.getTime() - created.getTime();
        if (elapsed >= 0) {
          mergeTimes.push(elapsed);
        }
      }
    }
  }

  const avgMergeTimeMs =
    mergeTimes.length > 0
      ? mergeTimes.reduce((sum, t) => sum + t, 0) / mergeTimes.length
      : null;

  return { openCount, ciPassingCount, ciFailingCount, merged7dCount, avgMergeTimeMs };
}

export function formatMergeTime(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
