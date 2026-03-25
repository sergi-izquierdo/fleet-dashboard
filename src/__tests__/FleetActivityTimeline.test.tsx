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

function minutesAgo(m: number): string {
  return new Date(FIXED_NOW.getTime() - m * 60 * 1000).toISOString();
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

const recentEvents: ActivityEvent[] = [
  {
    id: "r1",
    timestamp: minutesAgo(0.5),
    agentName: "Agent Alpha",
    eventType: "commit",
    description: "Pushed 3 commits",
  },
  {
    id: "r2",
    timestamp: minutesAgo(0.7),
    agentName: "Agent Beta",
    eventType: "ci_failed",
    description: "CI failed on feature/auth",
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

  it("renders the heading and time range selector", () => {
    render(<FleetActivityTimeline activityLog={[]} prs={[]} />);
    expect(screen.getByText("Fleet Activity")).toBeInTheDocument();
    expect(screen.getByTestId("time-range-selector")).toBeInTheDocument();
  });

  it("renders all time range buttons", () => {
    render(<FleetActivityTimeline activityLog={[]} prs={[]} />);
    for (const label of ["1m", "3m", "5m", "10m", "30m", "1h", "6h", "12h", "24h"]) {
      expect(screen.getByTestId(`range-btn-${label}`)).toBeInTheDocument();
    }
  });

  it("defaults to 1m range selected", () => {
    render(<FleetActivityTimeline activityLog={[]} prs={[]} />);
    const btn = screen.getByTestId("range-btn-1m");
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("shows empty state when no events", () => {
    render(<FleetActivityTimeline activityLog={[]} prs={[]} />);
    expect(screen.getByTestId("timeline-empty")).toBeInTheDocument();
    expect(
      screen.getByText("No fleet activity in the last 1m."),
    ).toBeInTheDocument();
  });

  it("updates empty state message when range changes", () => {
    render(<FleetActivityTimeline activityLog={[]} prs={[]} />);
    fireEvent.click(screen.getByTestId("range-btn-24h"));
    expect(
      screen.getByText("No fleet activity in the last 24h."),
    ).toBeInTheDocument();
  });

  it("renders all four legend items", () => {
    render(<FleetActivityTimeline activityLog={[]} prs={[]} />);
    expect(screen.getByTestId("legend-merged")).toBeInTheDocument();
    expect(screen.getByTestId("legend-agent_spawn")).toBeInTheDocument();
    expect(screen.getByTestId("legend-error")).toBeInTheDocument();
    expect(screen.getByTestId("legend-stale_recovery")).toBeInTheDocument();
  });

  it("renders dots for activity events within 24h when 24h range selected", () => {
    render(
      <FleetActivityTimeline activityLog={sampleEvents} prs={samplePRs} />,
    );
    fireEvent.click(screen.getByTestId("range-btn-24h"));

    // commit -> agent_spawn, ci_failed -> error, deploy -> merged, error -> error
    const agentDots = screen.getAllByTestId("timeline-dot-agent_spawn");
    expect(agentDots.length).toBe(1);

    const errorDots = screen.getAllByTestId("timeline-dot-error");
    expect(errorDots.length).toBe(2);

    // merged: 1 from deploy event + 1 from merged PR
    const mergedDots = screen.getAllByTestId("timeline-dot-merged");
    expect(mergedDots.length).toBe(2);
  });

  it("filters out events outside the selected range", () => {
    // sampleEvents are 2h-10h ago; with 1m range (default) none should show
    render(
      <FleetActivityTimeline activityLog={sampleEvents} prs={[]} />,
    );
    expect(
      screen.queryByTestId("timeline-dot-agent_spawn"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("timeline-empty")).toBeInTheDocument();
  });

  it("does not render dots for events older than selected range", () => {
    render(<FleetActivityTimeline activityLog={sampleEvents} prs={[]} />);
    fireEvent.click(screen.getByTestId("range-btn-24h"));
    // events are 2-10h ago, well within 24h — they should show
    expect(screen.getAllByTestId("timeline-dot-error").length).toBeGreaterThan(0);

    // now switch to 1m — they should disappear
    fireEvent.click(screen.getByTestId("range-btn-1m"));
    expect(
      screen.queryByTestId("timeline-dot-error"),
    ).not.toBeInTheDocument();
  });

  it("shows dots for recent events within 1m range", () => {
    render(
      <FleetActivityTimeline activityLog={recentEvents} prs={[]} />,
    );
    // commit -> agent_spawn, ci_failed -> error
    expect(screen.getByTestId("timeline-dot-agent_spawn")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-dot-error")).toBeInTheDocument();
  });

  it("shows tooltip on hover", () => {
    render(
      <FleetActivityTimeline activityLog={recentEvents} prs={[]} />,
    );
    const dot = screen.getByTestId("timeline-dot-agent_spawn");
    fireEvent.mouseEnter(dot);
    expect(screen.getByTestId("timeline-tooltip")).toBeInTheDocument();
    expect(screen.getByText("Agent Alpha")).toBeInTheDocument();
    expect(screen.getByText("Pushed 3 commits")).toBeInTheDocument();
  });

  it("hides tooltip on mouse leave", () => {
    render(
      <FleetActivityTimeline activityLog={recentEvents} prs={[]} />,
    );
    const dot = screen.getByTestId("timeline-dot-agent_spawn");
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
    fireEvent.click(screen.getByTestId("range-btn-24h"));
    // 2 errors (ci_failed + error), 2 merged (deploy + PR)
    expect(screen.getAllByText("(2)").length).toBe(2);
    // 1 agent_spawn (commit)
    expect(screen.getAllByText("(1)").length).toBe(1);
  });

  it("only includes merged PRs as green dots, not open ones", () => {
    render(<FleetActivityTimeline activityLog={[]} prs={samplePRs} />);
    const mergedDots = screen.getAllByTestId("timeline-dot-merged");
    expect(mergedDots.length).toBe(1);
  });

  it("dots have accessible aria-labels", () => {
    render(
      <FleetActivityTimeline activityLog={recentEvents} prs={[]} />,
    );
    const dot = screen.getByTestId("timeline-dot-agent_spawn");
    expect(dot).toHaveAttribute("aria-label");
    expect(dot.getAttribute("aria-label")).toContain("Agent Spawn");
  });

  it("updates active button style when range changes", () => {
    render(<FleetActivityTimeline activityLog={[]} prs={[]} />);
    const btn24h = screen.getByTestId("range-btn-24h");
    const btn1m = screen.getByTestId("range-btn-1m");

    expect(btn1m).toHaveAttribute("aria-pressed", "true");
    expect(btn24h).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(btn24h);
    expect(btn24h).toHaveAttribute("aria-pressed", "true");
    expect(btn1m).toHaveAttribute("aria-pressed", "false");
  });
});
