import { describe, it, expect } from "vitest";
import { computePRSummaryStats, formatMergeTime } from "@/lib/prSummaryStats";
import type { RecentPR } from "@/types/prs";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const basePR: Omit<RecentPR, "status" | "ciStatus"> = {
  title: "test pr",
  repo: "org/repo",
  createdAt: daysAgo(2),
  url: "https://github.com/org/repo/pull/1",
  number: 1,
  author: "agent-alpha",
};

describe("computePRSummaryStats", () => {
  it("returns zeros for empty array", () => {
    const stats = computePRSummaryStats([]);
    expect(stats.openCount).toBe(0);
    expect(stats.ciPassingCount).toBe(0);
    expect(stats.ciFailingCount).toBe(0);
    expect(stats.merged7dCount).toBe(0);
    expect(stats.avgMergeTimeMs).toBeNull();
  });

  it("counts open PRs correctly", () => {
    const prs: RecentPR[] = [
      { ...basePR, status: "open", ciStatus: "pending", number: 1 },
      { ...basePR, status: "open", ciStatus: "passing", number: 2 },
      { ...basePR, status: "merged", ciStatus: "passing", number: 3, mergedAt: daysAgo(1) },
    ];
    const stats = computePRSummaryStats(prs);
    expect(stats.openCount).toBe(2);
  });

  it("counts CI passing among open PRs only", () => {
    const prs: RecentPR[] = [
      { ...basePR, status: "open", ciStatus: "passing", number: 1 },
      { ...basePR, status: "open", ciStatus: "passing", number: 2 },
      { ...basePR, status: "merged", ciStatus: "passing", number: 3, mergedAt: daysAgo(1) },
    ];
    const stats = computePRSummaryStats(prs);
    expect(stats.ciPassingCount).toBe(2);
  });

  it("counts CI failing among open PRs only", () => {
    const prs: RecentPR[] = [
      { ...basePR, status: "open", ciStatus: "failing", number: 1 },
      { ...basePR, status: "merged", ciStatus: "failing", number: 2, mergedAt: daysAgo(1) },
    ];
    const stats = computePRSummaryStats(prs);
    expect(stats.ciFailingCount).toBe(1);
  });

  it("counts PRs merged within last 7 days", () => {
    const prs: RecentPR[] = [
      { ...basePR, status: "merged", ciStatus: "passing", number: 1, mergedAt: daysAgo(3) },
      { ...basePR, status: "merged", ciStatus: "passing", number: 2, mergedAt: daysAgo(6) },
      { ...basePR, status: "merged", ciStatus: "passing", number: 3, mergedAt: daysAgo(8) }, // outside 7d
    ];
    const stats = computePRSummaryStats(prs);
    expect(stats.merged7dCount).toBe(2);
  });

  it("excludes merged PRs without mergedAt from 7d count", () => {
    const prs: RecentPR[] = [
      { ...basePR, status: "merged", ciStatus: "passing", number: 1 }, // no mergedAt
    ];
    const stats = computePRSummaryStats(prs);
    expect(stats.merged7dCount).toBe(0);
  });

  it("calculates average merge time for PRs merged in last 30 days", () => {
    // PR merged 1 day ago, created 3 days ago → elapsed = 2 days
    const createdAt = daysAgo(3);
    const mergedAt = daysAgo(1);
    const expected = new Date(mergedAt).getTime() - new Date(createdAt).getTime();

    const prs: RecentPR[] = [
      { ...basePR, status: "merged", ciStatus: "passing", number: 1, createdAt, mergedAt },
    ];
    const stats = computePRSummaryStats(prs);
    expect(stats.avgMergeTimeMs).toBeCloseTo(expected, -3); // within 1s
  });

  it("ignores PRs merged >30 days ago for avg merge time", () => {
    const prs: RecentPR[] = [
      {
        ...basePR,
        status: "merged",
        ciStatus: "passing",
        number: 1,
        createdAt: daysAgo(35),
        mergedAt: daysAgo(31),
      },
    ];
    const stats = computePRSummaryStats(prs);
    expect(stats.avgMergeTimeMs).toBeNull();
  });

  it("averages merge times across multiple PRs", () => {
    const pr1Created = daysAgo(5);
    const pr1Merged = daysAgo(3); // 2d elapsed
    const pr2Created = daysAgo(4);
    const pr2Merged = daysAgo(2); // 2d elapsed

    const prs: RecentPR[] = [
      { ...basePR, status: "merged", ciStatus: "passing", number: 1, createdAt: pr1Created, mergedAt: pr1Merged },
      { ...basePR, status: "merged", ciStatus: "passing", number: 2, createdAt: pr2Created, mergedAt: pr2Merged },
    ];
    const stats = computePRSummaryStats(prs);
    const expectedAvg =
      ((new Date(pr1Merged).getTime() - new Date(pr1Created).getTime()) +
       (new Date(pr2Merged).getTime() - new Date(pr2Created).getTime())) / 2;
    expect(stats.avgMergeTimeMs).toBeCloseTo(expectedAvg, -3);
  });

  it("skips negative elapsed times (bad data)", () => {
    // mergedAt before createdAt — should be ignored
    const prs: RecentPR[] = [
      {
        ...basePR,
        status: "merged",
        ciStatus: "passing",
        number: 1,
        createdAt: daysAgo(1),
        mergedAt: daysAgo(3), // merged before created — invalid
      },
    ];
    const stats = computePRSummaryStats(prs);
    expect(stats.avgMergeTimeMs).toBeNull();
  });
});

describe("formatMergeTime", () => {
  it("formats sub-hour durations as minutes only", () => {
    expect(formatMergeTime(45 * 60_000)).toBe("45m");
  });

  it("formats hours and minutes", () => {
    expect(formatMergeTime(90 * 60_000)).toBe("1h 30m");
  });

  it("formats exact hours with 0 minutes", () => {
    expect(formatMergeTime(2 * 60 * 60_000)).toBe("2h 0m");
  });

  it("formats 0ms as 0m", () => {
    expect(formatMergeTime(0)).toBe("0m");
  });
});
