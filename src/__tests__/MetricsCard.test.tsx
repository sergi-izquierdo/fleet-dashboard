import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import MetricsCard from "@/components/MetricsCard";
import { computeFleetMetrics } from "@/lib/metricsComputation";
import type { ActivityEvent } from "@/types/dashboard";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(
  overrides: Partial<ActivityEvent> = {},
): ActivityEvent {
  return {
    id: "evt-1",
    timestamp: "2024-01-01T00:00:00Z",
    agentName: "agent-1",
    eventType: "deploy",
    description: "PR merged: add feature",
    project: "my-repo",
    ...overrides,
  };
}

// ── computeFleetMetrics ───────────────────────────────────────────────────────

describe("computeFleetMetrics", () => {
  it("returns zeroed state for empty log", () => {
    const result = computeFleetMetrics([]);
    expect(result.totalAgentsRun).toBe(0);
    expect(result.successRate).toBeNull();
    expect(result.mostActiveProject).toBeNull();
    expect(result.successCount).toBe(0);
    expect(result.errorCount).toBe(0);
  });

  it("counts total agents run", () => {
    const log = [
      makeEvent({ id: "1", eventType: "deploy" }),
      makeEvent({ id: "2", eventType: "pr_created" }),
      makeEvent({ id: "3", eventType: "error" }),
    ];
    const result = computeFleetMetrics(log);
    expect(result.totalAgentsRun).toBe(3);
  });

  it("computes success rate as percentage of deploy events", () => {
    const log = [
      makeEvent({ id: "1", eventType: "deploy" }),
      makeEvent({ id: "2", eventType: "deploy" }),
      makeEvent({ id: "3", eventType: "pr_created" }),
      makeEvent({ id: "4", eventType: "error" }),
    ];
    const result = computeFleetMetrics(log);
    // 2 deploy / 4 total = 50%
    expect(result.successRate).toBe(50);
    expect(result.successCount).toBe(2);
    expect(result.errorCount).toBe(1);
  });

  it("rounds success rate to nearest integer", () => {
    const log = [
      makeEvent({ id: "1", eventType: "deploy" }),
      makeEvent({ id: "2", eventType: "pr_created" }),
      makeEvent({ id: "3", eventType: "pr_created" }),
    ];
    const result = computeFleetMetrics(log);
    // 1/3 ≈ 33.33 → rounds to 33
    expect(result.successRate).toBe(33);
  });

  it("returns 100% success rate when all events are deploy", () => {
    const log = [
      makeEvent({ id: "1", eventType: "deploy" }),
      makeEvent({ id: "2", eventType: "deploy" }),
    ];
    const result = computeFleetMetrics(log);
    expect(result.successRate).toBe(100);
  });

  it("identifies most active project by event count", () => {
    const log = [
      makeEvent({ id: "1", project: "repo-a" }),
      makeEvent({ id: "2", project: "repo-b" }),
      makeEvent({ id: "3", project: "repo-a" }),
      makeEvent({ id: "4", project: "repo-a" }),
    ];
    const result = computeFleetMetrics(log);
    expect(result.mostActiveProject).toBe("repo-a");
  });

  it("returns null mostActiveProject when no events have a project", () => {
    const log = [
      makeEvent({ id: "1", project: undefined }),
      makeEvent({ id: "2", project: undefined }),
    ];
    const result = computeFleetMetrics(log);
    expect(result.mostActiveProject).toBeNull();
  });

  it("ignores events without project in the project count", () => {
    const log = [
      makeEvent({ id: "1", project: "repo-a" }),
      makeEvent({ id: "2", project: undefined }),
      makeEvent({ id: "3", project: undefined }),
    ];
    const result = computeFleetMetrics(log);
    expect(result.mostActiveProject).toBe("repo-a");
  });
});

// ── MetricsCard component ─────────────────────────────────────────────────────

describe("MetricsCard", () => {
  afterEach(() => cleanup());
  it("renders empty state when activityLog is empty", () => {
    render(<MetricsCard activityLog={[]} />);
    expect(screen.getByTestId("metrics-card-empty")).toBeInTheDocument();
    expect(screen.getByText("No completed agents yet")).toBeInTheDocument();
  });

  it("renders metrics card when there is data", () => {
    const log = [
      makeEvent({ id: "1", eventType: "deploy", project: "my-repo" }),
      makeEvent({ id: "2", eventType: "error", project: "my-repo" }),
    ];
    render(<MetricsCard activityLog={log} />);
    expect(screen.getByTestId("metrics-card")).toBeInTheDocument();
  });

  it("displays total agents run count", () => {
    const log = [
      makeEvent({ id: "1" }),
      makeEvent({ id: "2" }),
      makeEvent({ id: "3" }),
    ];
    render(<MetricsCard activityLog={log} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Total Agents Run")).toBeInTheDocument();
  });

  it("displays success rate percentage", () => {
    const log = [
      makeEvent({ id: "1", eventType: "deploy" }),
      makeEvent({ id: "2", eventType: "deploy" }),
      makeEvent({ id: "3", eventType: "error" }),
      makeEvent({ id: "4", eventType: "error" }),
    ];
    render(<MetricsCard activityLog={log} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Success Rate")).toBeInTheDocument();
  });

  it("displays most active project", () => {
    const log = [
      makeEvent({ id: "1", project: "active-repo" }),
      makeEvent({ id: "2", project: "active-repo" }),
      makeEvent({ id: "3", project: "other-repo" }),
    ];
    render(<MetricsCard activityLog={log} />);
    expect(screen.getByText("active-repo")).toBeInTheDocument();
    expect(screen.getByText("Most Active Project")).toBeInTheDocument();
  });

  it("shows dash for most active project when no project data exists", () => {
    const log = [makeEvent({ id: "1", project: undefined })];
    render(<MetricsCard activityLog={log} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows success/error counts in subtitle", () => {
    const log = [
      makeEvent({ id: "1", eventType: "deploy" }),
      makeEvent({ id: "2", eventType: "error" }),
    ];
    render(<MetricsCard activityLog={log} />);
    expect(screen.getByText("1 merged · 1 failed")).toBeInTheDocument();
  });
});
