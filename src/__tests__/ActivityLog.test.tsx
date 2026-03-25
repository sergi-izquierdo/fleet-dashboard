import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import ActivityLog, { type AgentEvent } from "@/components/ActivityLog";

const sampleEvents: AgentEvent[] = [
  {
    id: "1",
    timestamp: "2026-03-20T10:00:00Z",
    agentName: "Agent Alpha",
    eventType: "commit",
    description: "Pushed 3 commits to main",
  },
  {
    id: "2",
    timestamp: "2026-03-21T14:30:00Z",
    agentName: "Agent Beta",
    eventType: "pr_created",
    description: "Opened PR #42: Add login page",
  },
  {
    id: "3",
    timestamp: "2026-03-22T09:15:00Z",
    agentName: "Agent Gamma",
    eventType: "ci_failed",
    description: "CI pipeline failed on branch feature/auth",
  },
  {
    id: "4",
    timestamp: "2026-03-19T16:45:00Z",
    agentName: "Agent Delta",
    eventType: "review",
    description: "Reviewed PR #38: Database migration",
  },
  {
    id: "5",
    timestamp: "2026-03-23T08:00:00Z",
    agentName: "Agent Alpha",
    eventType: "deploy",
    description: "Deployed v1.2.0 to production",
  },
];

// Default fetch mock: returns empty array and succeeds
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => [] }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("ActivityLog", () => {
  it("renders the heading", async () => {
    await act(async () => {
      render(<ActivityLog events={[]} />);
    });
    expect(screen.getByText("Activity Log")).toBeInTheDocument();
  });

  it("shows empty state when no events", async () => {
    await act(async () => {
      render(<ActivityLog events={[]} />);
    });
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
    expect(
      screen.getByText("Events from your agents will appear here as they work."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders all events", () => {
    render(<ActivityLog events={sampleEvents} />);
    expect(screen.getAllByText("Agent Alpha")).toHaveLength(2);
    expect(screen.getByText("Agent Beta")).toBeInTheDocument();
    expect(screen.getByText("Agent Gamma")).toBeInTheDocument();
    expect(screen.getByText("Agent Delta")).toBeInTheDocument();
    expect(screen.getByText("Pushed 3 commits to main")).toBeInTheDocument();
    expect(screen.getByText("Opened PR #42: Add login page")).toBeInTheDocument();
  });

  it("sorts events most recent first", () => {
    render(<ActivityLog events={sampleEvents} />);
    const items = screen.getAllByRole("listitem");
    // Most recent (2026-03-23) should be first, oldest (2026-03-19) should be last
    expect(items[0]).toHaveTextContent("Deployed v1.2.0 to production");
    expect(items[1]).toHaveTextContent("CI pipeline failed on branch feature/auth");
    expect(items[2]).toHaveTextContent("Opened PR #42: Add login page");
    expect(items[3]).toHaveTextContent("Pushed 3 commits to main");
    expect(items[4]).toHaveTextContent("Reviewed PR #38: Database migration");
  });

  it("displays correct event type badges", () => {
    render(<ActivityLog events={sampleEvents} />);
    expect(screen.getByText("Commit")).toBeInTheDocument();
    expect(screen.getByText("PR Created")).toBeInTheDocument();
    expect(screen.getByText("CI Failed")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Deploy")).toBeInTheDocument();
  });

  it("applies correct color classes for commit events (blue)", () => {
    render(<ActivityLog events={[sampleEvents[0]]} />);
    const badge = screen.getByTestId("badge-commit");
    expect(badge.className).toContain("text-blue-400");
    const dot = screen.getByTestId("dot-commit");
    expect(dot.className).toContain("bg-blue-500");
  });

  it("applies correct color classes for pr_created events (green)", () => {
    render(<ActivityLog events={[sampleEvents[1]]} />);
    const badge = screen.getByTestId("badge-pr_created");
    expect(badge.className).toContain("text-green-400");
    const dot = screen.getByTestId("dot-pr_created");
    expect(dot.className).toContain("bg-green-500");
  });

  it("applies correct color classes for ci_failed events (red)", () => {
    render(<ActivityLog events={[sampleEvents[2]]} />);
    const badge = screen.getByTestId("badge-ci_failed");
    expect(badge.className).toContain("text-red-400");
    const dot = screen.getByTestId("dot-ci_failed");
    expect(dot.className).toContain("bg-red-500");
  });

  it("applies correct color classes for review events (purple)", () => {
    render(<ActivityLog events={[sampleEvents[3]]} />);
    const badge = screen.getByTestId("badge-review");
    expect(badge.className).toContain("text-purple-400");
    const dot = screen.getByTestId("dot-review");
    expect(dot.className).toContain("bg-purple-500");
  });

  it("applies correct color classes for deploy events (orange)", () => {
    render(<ActivityLog events={[sampleEvents[4]]} />);
    const badge = screen.getByTestId("badge-deploy");
    expect(badge.className).toContain("text-orange-400");
    const dot = screen.getByTestId("dot-deploy");
    expect(dot.className).toContain("bg-orange-500");
  });

  it("has a scrollable container", () => {
    render(<ActivityLog events={sampleEvents} />);
    const scrollContainer = screen.getByTestId("activity-log-scroll");
    expect(scrollContainer.className).toContain("overflow-y-auto");
    expect(scrollContainer.className).toContain("max-h-96");
  });

  it("accepts custom maxHeight", () => {
    render(<ActivityLog events={sampleEvents} maxHeight="max-h-64" />);
    const scrollContainer = screen.getByTestId("activity-log-scroll");
    expect(scrollContainer.className).toContain("max-h-64");
  });

  it("renders timestamps as time elements with datetime attribute", () => {
    render(<ActivityLog events={[sampleEvents[0]]} />);
    const timeEl = document.querySelector("time");
    expect(timeEl).toBeInTheDocument();
    expect(timeEl?.getAttribute("dateTime")).toBe("2026-03-20T10:00:00Z");
  });

  it("does not mutate the original events array", () => {
    const original = [...sampleEvents];
    render(<ActivityLog events={sampleEvents} />);
    expect(sampleEvents).toEqual(original);
  });

  it("renders skeleton rows while initial fetch is pending", () => {
    // fetch mock never resolves during synchronous render
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    render(<ActivityLog events={[]} />);
    const list = screen.getByRole("list", { name: "Loading activity" });
    expect(list).toBeInTheDocument();
    expect(list.querySelectorAll("li")).toHaveLength(5);
  });

  it("renders skeleton rows when isLoading is true and events is empty", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    render(<ActivityLog events={[]} isLoading={true} />);
    expect(screen.queryByText("No recent activity")).not.toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Loading activity" });
    expect(list).toBeInTheDocument();
    expect(list.querySelectorAll("li")).toHaveLength(5);
  });

  it("does not render skeleton when isLoading is true but events are present", () => {
    render(<ActivityLog events={sampleEvents} isLoading={true} />);
    expect(screen.queryByRole("list", { name: "Loading activity" })).not.toBeInTheDocument();
    expect(screen.getByText("Pushed 3 commits to main")).toBeInTheDocument();
  });

  it("shows empty state when isLoading is false and events is empty", async () => {
    await act(async () => {
      render(<ActivityLog events={[]} isLoading={false} />);
    });
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Loading activity" })).not.toBeInTheDocument();
  });

  it("displays fetched events when props are empty", async () => {
    const fetched: AgentEvent[] = [
      {
        id: "f1",
        timestamp: "2026-03-24T10:00:00Z",
        agentName: "Fetched Agent",
        eventType: "pr_created",
        description: "PR created from API",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => fetched }),
    );
    await act(async () => {
      render(<ActivityLog events={[]} />);
    });
    expect(screen.getByText("Fetched Agent")).toBeInTheDocument();
    expect(screen.getByText("PR created from API")).toBeInTheDocument();
  });

  it("falls back to prop events when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    await act(async () => {
      render(<ActivityLog events={sampleEvents} />);
    });
    expect(screen.getByText("Pushed 3 commits to main")).toBeInTheDocument();
  });

  it("merges fetched events with prop events, deduplicating by id", async () => {
    const fetched: AgentEvent[] = [
      // Duplicate of sampleEvents[0] — should not appear twice
      {
        id: "1",
        timestamp: "2026-03-20T10:00:00Z",
        agentName: "Agent Alpha",
        eventType: "commit",
        description: "Pushed 3 commits to main",
      },
      // New event not in props
      {
        id: "new1",
        timestamp: "2026-03-24T12:00:00Z",
        agentName: "New Agent",
        eventType: "ci_passed",
        description: "CI passed on new branch",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => fetched }),
    );
    await act(async () => {
      render(<ActivityLog events={[sampleEvents[0]]} />);
    });
    // Original event present once
    expect(screen.getAllByText("Pushed 3 commits to main")).toHaveLength(1);
    // New fetched event present
    expect(screen.getByText("CI passed on new branch")).toBeInTheDocument();
  });

  it("polls /api/fleet-events every 15 seconds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(<ActivityLog events={[]} />);
    });
    const callsAfterMount = fetchMock.mock.calls.length;
    expect(callsAfterMount).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });
    expect(fetchMock.mock.calls.length).toBe(2);

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });
    expect(fetchMock.mock.calls.length).toBe(3);

    vi.useRealTimers();
  });

  it("fetches from /api/fleet-events endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(<ActivityLog events={[]} />);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/fleet-events");
  });
});
