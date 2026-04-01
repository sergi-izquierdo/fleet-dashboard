import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import AgentTimeline from "@/components/AgentTimeline";
import type { TimelineAgent } from "@/lib/agentTimeline";

// Mock recharts to avoid canvas/SVG issues in JSDOM
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-bar-chart">{children}</div>
  ),
  Bar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Cell: () => <div />,
}));

function makeAgent(overrides: Partial<TimelineAgent> = {}): TimelineAgent {
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago
  return {
    name: "feat-issue-42",
    project: "my-repo",
    issue: 42,
    startedAt: start.toISOString(),
    completedAt: now.toISOString(),
    status: "success",
    prUrl: "https://github.com/org/repo/pull/1",
    durationMinutes: 60,
    ...overrides,
  };
}

describe("AgentTimeline", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}),
    );
    render(<AgentTimeline />);
    expect(screen.getByTestId("timeline-loading")).toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );
    render(<AgentTimeline />);
    await waitFor(() => {
      expect(screen.getByTestId("timeline-error")).toBeInTheDocument();
    });
  });

  it("shows empty state when no agents in range", async () => {
    // Agent from 10 days ago — will be filtered out by 6h/24h but shown in 7d
    const oldStart = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const oldEnd = new Date(oldStart.getTime() + 30 * 60 * 1000);
    const oldAgent = makeAgent({
      startedAt: oldStart.toISOString(),
      completedAt: oldEnd.toISOString(),
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ agents: [oldAgent] }),
    });

    render(<AgentTimeline />);
    await waitFor(() => {
      expect(screen.getByTestId("timeline-empty")).toBeInTheDocument();
    });
  });

  it("renders chart when agents are present in range", async () => {
    const agent = makeAgent();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ agents: [agent] }),
    });

    render(<AgentTimeline />);
    await waitFor(() => {
      expect(screen.getByTestId("timeline-chart-container")).toBeInTheDocument();
    });
  });

  it("renders range selector buttons", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ agents: [] }),
    });

    render(<AgentTimeline />);
    await waitFor(() => {
      expect(screen.getByTestId("range-6h")).toBeInTheDocument();
      expect(screen.getByTestId("range-24h")).toBeInTheDocument();
      expect(screen.getByTestId("range-7d")).toBeInTheDocument();
    });
  });

  it("switches range on button click", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ agents: [] }),
    });

    render(<AgentTimeline />);
    await waitFor(() => screen.getByTestId("range-7d"));

    const btn7d = screen.getByTestId("range-7d");
    fireEvent.click(btn7d);
    expect(btn7d.className).toMatch(/bg-purple-600/);
  });

  it("displays the agent timeline heading", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ agents: [] }),
    });

    render(<AgentTimeline />);
    await waitFor(() => {
      expect(screen.getByText("Agent Timeline")).toBeInTheDocument();
    });
  });

  it("shows agents within the selected time range", async () => {
    const recentAgent = makeAgent({ name: "recent-agent" });
    const oldStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldEnd = new Date(oldStart.getTime() + 30 * 60 * 1000);
    const oldAgent = makeAgent({
      name: "old-agent",
      startedAt: oldStart.toISOString(),
      completedAt: oldEnd.toISOString(),
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ agents: [recentAgent, oldAgent] }),
    });

    render(<AgentTimeline />);
    // Default range is 24h — recent agent should be in chart, old one filtered
    await waitFor(() => {
      expect(screen.getByTestId("timeline-chart-container")).toBeInTheDocument();
    });
    // The chart container is present (not empty state), confirming recent agent is included
    expect(screen.queryByTestId("timeline-empty")).not.toBeInTheDocument();
  });
});
