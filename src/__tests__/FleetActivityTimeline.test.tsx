import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import FleetActivityTimeline from "@/components/FleetActivityTimeline";
import type { ActivityEvent, PR } from "@/types/dashboard";

// Fix "now" so timeline math is deterministic
const FIXED_NOW = new Date("2026-03-24T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function hoursAgo(h: number): string {
  return new Date(FIXED_NOW.getTime() - h * 60 * 60 * 1000).toISOString();
}

const sampleEvents: ActivityEvent[] = [
  {
    id: "1",
    timestamp: hoursAgo(2),
    agentName: "Agent Alpha",
    eventType: "commit",
    description: "Pushed 3 commits",
  },
  {
    id: "2",
    timestamp: hoursAgo(5),
    agentName: "Agent Beta",
    eventType: "ci_failed",
    description: "CI failed on feature/auth",
  },
  {
    id: "3",
    timestamp: hoursAgo(8),
    agentName: "Agent Gamma",
    eventType: "deploy",
    description: "Deployed v1.2.0",
  },
  {
    id: "4",
    timestamp: hoursAgo(10),
    agentName: "Agent Delta",
    eventType: "error",
    description: "Runtime error in worker",
  },
];

const samplePRs: PR[] = [
  {
    number: 42,
    url: "https://github.com/test/repo/pull/42",
    title: "Add login page",
    ciStatus: "passing",
    reviewStatus: "approved",
    mergeState: "merged",
    author: "agent-alpha",
    branch: "feat/login",
  },
  {
    number: 43,
    url: "https://github.com/test/repo/pull/43",
    title: "Fix bug",
    ciStatus: "passing",
    reviewStatus: "pending",
    mergeState: "open",
    author: "agent-beta",
    branch: "fix/bug",
  },
];

describe("FleetActivityTimeline", () => {
  it("renders the timeline container", () => {
    render(<FleetActivityTimeline activityLog={[]} prs={[]} />);
    expect(screen.getByTestId("fleet-activity-timeline")).toBeInTheDocument();
  });

  it("renders the heading and time range", () => {
    render(<FleetActivityTimeline activityLog={[]} prs={[]} />);
    expect(screen.getByText("Fleet Activity")).toBeInTheDocument();
    expect(screen.getByText("Last 24 hours")).toBeInTheDocument();
  });

  it("shows empty state when no events", () => {
    render(<FleetActivityTimeline activityLog={[]} prs={[]} />);
    expect(screen.getByTestId("timeline-empty")).toBeInTheDocument();
    expect(
      screen.getByText("No fleet activity in the last 24 hours."),
    ).toBeInTheDocument();
  });

  it("renders all four legend items", () => {
    render(<FleetActivityTimeline activityLog={[]} prs={[]} />);
    expect(screen.getByTestId("legend-merged")).toBeInTheDocument();
    expect(screen.getByTestId("legend-agent_spawn")).toBeInTheDocument();
    expect(screen.getByTestId("legend-error")).toBeInTheDocument();
    expect(screen.getByTestId("legend-stale_recovery")).toBeInTheDocument();
  });

  it("renders dots for activity events within 24h", () => {
    render(
      <FleetActivityTimeline activityLog={sampleEvents} prs={samplePRs} />,
    );
    // commit -> agent_spawn, ci_failed -> error, deploy -> stale_recovery, error -> error
    const agentDots = screen.getAllByTestId("timeline-dot-agent_spawn");
    expect(agentDots.length).toBe(1);

    const errorDots = screen.getAllByTestId("timeline-dot-error");
    expect(errorDots.length).toBe(2);

    const staleDots = screen.getAllByTestId("timeline-dot-stale_recovery");
    expect(staleDots.length).toBe(1);

    // merged PRs
    const mergedDots = screen.getAllByTestId("timeline-dot-merged");
    expect(mergedDots.length).toBe(1);
  });

  it("does not render dots for events older than 24h", () => {
    const oldEvent: ActivityEvent = {
      id: "old",
      timestamp: hoursAgo(30),
      agentName: "Old Agent",
      eventType: "commit",
      description: "Very old commit",
    };
    render(<FleetActivityTimeline activityLog={[oldEvent]} prs={[]} />);
    expect(
      screen.queryByTestId("timeline-dot-agent_spawn"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("timeline-empty")).toBeInTheDocument();
  });

  it("shows tooltip on hover", () => {
    render(
      <FleetActivityTimeline activityLog={sampleEvents} prs={[]} />,
    );
    const dot = screen.getAllByTestId("timeline-dot-agent_spawn")[0];
    fireEvent.mouseEnter(dot);
    expect(screen.getByTestId("timeline-tooltip")).toBeInTheDocument();
    expect(screen.getByText("Agent Alpha")).toBeInTheDocument();
    expect(screen.getByText("Pushed 3 commits")).toBeInTheDocument();
  });

  it("hides tooltip on mouse leave", () => {
    render(
      <FleetActivityTimeline activityLog={sampleEvents} prs={[]} />,
    );
    const dot = screen.getAllByTestId("timeline-dot-agent_spawn")[0];
    fireEvent.mouseEnter(dot);
    expect(screen.getByTestId("timeline-tooltip")).toBeInTheDocument();
    fireEvent.mouseLeave(dot);
    expect(screen.queryByTestId("timeline-tooltip")).not.toBeInTheDocument();
  });

  it("renders the timeline track", () => {
    render(
      <FleetActivityTimeline activityLog={sampleEvents} prs={samplePRs} />,
    );
    expect(screen.getByTestId("timeline-track")).toBeInTheDocument();
  });

  it("shows legend counts when events exist", () => {
    render(
      <FleetActivityTimeline activityLog={sampleEvents} prs={samplePRs} />,
    );
    // 2 errors (ci_failed + error)
    expect(screen.getByText("(2)")).toBeInTheDocument();
    // 1 merged PR, 1 agent_spawn, 1 stale_recovery each show (1)
    expect(screen.getAllByText("(1)").length).toBe(3);
  });

  it("only includes merged PRs as green dots, not open ones", () => {
    render(<FleetActivityTimeline activityLog={[]} prs={samplePRs} />);
    const mergedDots = screen.getAllByTestId("timeline-dot-merged");
    expect(mergedDots.length).toBe(1);
  });

  it("dots have accessible aria-labels", () => {
    render(
      <FleetActivityTimeline activityLog={sampleEvents} prs={[]} />,
    );
    const dot = screen.getAllByTestId("timeline-dot-agent_spawn")[0];
    expect(dot).toHaveAttribute("aria-label");
    expect(dot.getAttribute("aria-label")).toContain("Agent Spawn");
  });
});
