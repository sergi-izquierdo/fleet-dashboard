import { describe, it, expect } from "vitest";
import { calculateHealthScore, getHealthColor, healthColorClasses } from "@/lib/repoHealth";

describe("calculateHealthScore", () => {
  it("returns 50 as baseline with zero activity", () => {
    const score = calculateHealthScore({
      openIssues: 0,
      prsMerged7d: 0,
      failedAgents7d: 0,
      avgMergeTimeMinutes: null,
    });
    expect(score).toBe(50);
  });

  it("adds merged bonus: 10 per merged PR, capped at 40", () => {
    expect(
      calculateHealthScore({ openIssues: 0, prsMerged7d: 3, failedAgents7d: 0, avgMergeTimeMinutes: null })
    ).toBe(80); // 50 + 30
    expect(
      calculateHealthScore({ openIssues: 0, prsMerged7d: 10, failedAgents7d: 0, avgMergeTimeMinutes: null })
    ).toBe(90); // 50 + 40 (cap)
  });

  it("subtracts failed penalty: 15 per failure, capped at 40", () => {
    expect(
      calculateHealthScore({ openIssues: 0, prsMerged7d: 0, failedAgents7d: 2, avgMergeTimeMinutes: null })
    ).toBe(20); // 50 - 30
    expect(
      calculateHealthScore({ openIssues: 0, prsMerged7d: 0, failedAgents7d: 5, avgMergeTimeMinutes: null })
    ).toBe(10); // 50 - 40 (cap)
  });

  it("subtracts open issues penalty: 5 per 5 issues, capped at 20", () => {
    expect(
      calculateHealthScore({ openIssues: 10, prsMerged7d: 0, failedAgents7d: 0, avgMergeTimeMinutes: null })
    ).toBe(40); // 50 - 10
    expect(
      calculateHealthScore({ openIssues: 25, prsMerged7d: 0, failedAgents7d: 0, avgMergeTimeMinutes: null })
    ).toBe(30); // 50 - 20 (cap)
  });

  it("subtracts merge time penalty when avg > 120 min", () => {
    // 120 min = no penalty
    expect(
      calculateHealthScore({ openIssues: 0, prsMerged7d: 0, failedAgents7d: 0, avgMergeTimeMinutes: 120 })
    ).toBe(50);
    // 180 min = 1 extra hour → -5
    expect(
      calculateHealthScore({ openIssues: 0, prsMerged7d: 0, failedAgents7d: 0, avgMergeTimeMinutes: 180 })
    ).toBe(45);
    // 480 min = 6 extra hours → capped at -10
    expect(
      calculateHealthScore({ openIssues: 0, prsMerged7d: 0, failedAgents7d: 0, avgMergeTimeMinutes: 480 })
    ).toBe(40);
  });

  it("does not apply merge time penalty when avgMergeTimeMinutes is null", () => {
    expect(
      calculateHealthScore({ openIssues: 0, prsMerged7d: 0, failedAgents7d: 0, avgMergeTimeMinutes: null })
    ).toBe(50);
  });

  it("clamps score to 0 minimum", () => {
    const score = calculateHealthScore({
      openIssues: 100,
      prsMerged7d: 0,
      failedAgents7d: 10,
      avgMergeTimeMinutes: 600,
    });
    expect(score).toBe(0);
  });

  it("clamps score to 100 maximum", () => {
    // Base 50 + mergedBonus cap 40 = 90 max from merged alone.
    // Score is always <= 100.
    const score = calculateHealthScore({
      openIssues: 0,
      prsMerged7d: 100,
      failedAgents7d: 0,
      avgMergeTimeMinutes: null,
    });
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBe(90); // 50 + min(100*10, 40) = 90
  });

  it("combines bonuses and penalties correctly", () => {
    // 50 + 20 (2 merged) - 15 (1 failed) - 10 (10 open issues) = 45
    const score = calculateHealthScore({
      openIssues: 10,
      prsMerged7d: 2,
      failedAgents7d: 1,
      avgMergeTimeMinutes: null,
    });
    expect(score).toBe(45);
  });
});

describe("getHealthColor", () => {
  it("returns green for score >= 80", () => {
    expect(getHealthColor(80)).toBe("green");
    expect(getHealthColor(100)).toBe("green");
    expect(getHealthColor(90)).toBe("green");
  });

  it("returns yellow for score 50-79", () => {
    expect(getHealthColor(50)).toBe("yellow");
    expect(getHealthColor(79)).toBe("yellow");
    expect(getHealthColor(65)).toBe("yellow");
  });

  it("returns red for score < 50", () => {
    expect(getHealthColor(0)).toBe("red");
    expect(getHealthColor(49)).toBe("red");
    expect(getHealthColor(25)).toBe("red");
  });
});

describe("healthColorClasses", () => {
  it("returns green classes for high score", () => {
    const classes = healthColorClasses(90);
    expect(classes.text).toContain("green");
    expect(classes.dot).toContain("green");
    expect(classes.badge).toContain("green");
  });

  it("returns yellow classes for medium score", () => {
    const classes = healthColorClasses(60);
    expect(classes.text).toContain("yellow");
    expect(classes.dot).toContain("yellow");
  });

  it("returns red classes for low score", () => {
    const classes = healthColorClasses(20);
    expect(classes.text).toContain("red");
    expect(classes.dot).toContain("red");
  });
});
