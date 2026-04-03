import { render, screen, cleanup, waitFor, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import AgentListTable from "@/components/AgentListTable";

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/agents",
}));

const mockFleetState = {
  active: {
    "agent-fleet/issue-10": {
      repo: "org/fleet-dashboard",
      issue: 10,
      status: "working",
      startedAt: new Date(Date.now() - 3600_000).toISOString(),
    },
  },
  completed: [
    {
      key: "agent-fleet/issue-5",
      repo: "org/fleet-dashboard",
      issue: 5,
      title: "Add dark mode",
      pr: "https://github.com/org/fleet-dashboard/pull/42",
      status: "pr_merged",
      completedAt: "2024-03-01T12:00:00Z",
      project: "fleet-dashboard",
    },
    {
      key: "agent-other/issue-3",
      repo: "org/other-project",
      issue: 3,
      title: "Fix bug",
      pr: "",
      status: "error",
      completedAt: "2024-03-02T10:00:00Z",
      project: "other-project",
    },
  ],
  stats: {
    totalCompleted: 2,
    byStatus: { pr_merged: 1, error: 1 },
    byProject: { "fleet-dashboard": 1, "other-project": 1 },
    successRate: 50,
    avgTimeToMerge: 60,
  },
  dispatcherOnline: true,
};

function mockFetchSuccess(data: unknown = mockFleetState) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(message = "Network error") {
  global.fetch = vi.fn().mockRejectedValue(new Error(message));
}

describe("AgentListTable", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("shows loading state initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AgentListTable />);
    expect(screen.getByTestId("agent-list-loading")).toBeInTheDocument();
  });

  it("renders agent rows after successful fetch", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getByTestId("agent-list-table")).toBeInTheDocument();
    });

    const rows = screen.getAllByTestId("agent-list-row");
    // 1 active + 2 completed = 3
    expect(rows).toHaveLength(3);
  });

  it("renders agent names in rows", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getByTestId("agent-list-table")).toBeInTheDocument();
    });

    expect(screen.getByText("agent-fleet/issue-10")).toBeInTheDocument();
    expect(screen.getByText("agent-fleet/issue-5")).toBeInTheDocument();
    expect(screen.getByText("agent-other/issue-3")).toBeInTheDocument();
  });

  it("renders status badges", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getAllByTestId("agent-list-status-badge").length).toBeGreaterThan(0);
    });

    const badges = screen.getAllByTestId("agent-list-status-badge");
    const texts = badges.map((b) => b.textContent);
    expect(texts).toContain("Working");
    expect(texts).toContain("Merged");
    expect(texts).toContain("Error");
  });

  it("renders PR links for agents with PRs", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getByTestId("agent-list-table")).toBeInTheDocument();
    });

    const prLink = screen.getByTestId("agent-list-pr-link");
    expect(prLink).toHaveAttribute(
      "href",
      "https://github.com/org/fleet-dashboard/pull/42"
    );
    expect(prLink).toHaveTextContent("PR #42");
  });

  it("shows error state on fetch failure", async () => {
    mockFetchError("Connection refused");
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getByTestId("agent-list-error")).toBeInTheDocument();
    });

    expect(screen.getByTestId("agent-list-error")).toHaveTextContent(
      "Connection refused"
    );
  });

  it("renders filter controls and search bar", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getByTestId("agent-list-filters")).toBeInTheDocument();
    });

    expect(screen.getByTestId("filter-bar-search")).toBeInTheDocument();
    expect(screen.getByTestId("project-filter")).toBeInTheDocument();
    expect(screen.getByTestId("status-filter")).toBeInTheDocument();
  });

  it("filters by status: active shows only working agents", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getAllByTestId("agent-list-row")).toHaveLength(3);
    });

    fireEvent.change(screen.getByTestId("status-filter"), {
      target: { value: "active" },
    });

    const rows = screen.getAllByTestId("agent-list-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("agent-fleet/issue-10");
  });

  it("filters by status: completed shows merged agents", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getAllByTestId("agent-list-row")).toHaveLength(3);
    });

    fireEvent.change(screen.getByTestId("status-filter"), {
      target: { value: "completed" },
    });

    const rows = screen.getAllByTestId("agent-list-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("agent-fleet/issue-5");
  });

  it("filters by status: error shows error agents", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getAllByTestId("agent-list-row")).toHaveLength(3);
    });

    fireEvent.change(screen.getByTestId("status-filter"), {
      target: { value: "error" },
    });

    const rows = screen.getAllByTestId("agent-list-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("agent-other/issue-3");
  });

  it("filters by project", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getAllByTestId("agent-list-row")).toHaveLength(3);
    });

    fireEvent.change(screen.getByTestId("project-filter"), {
      target: { value: "other-project" },
    });

    const rows = screen.getAllByTestId("agent-list-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("agent-other/issue-3");
  });

  it("shows empty message when no agents match filters", async () => {
    const emptyState = {
      active: {} as Record<string, Record<string, unknown>>,
      completed: [],
      stats: mockFleetState.stats,
      dispatcherOnline: false,
    };
    mockFetchSuccess(emptyState);
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getByTestId("agent-list-empty")).toBeInTheDocument();
    });
  });

  it("filters by search query matching agent name", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getAllByTestId("agent-list-row")).toHaveLength(3);
    });

    fireEvent.change(screen.getByTestId("filter-bar-search"), {
      target: { value: "other" },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const rows = screen.getAllByTestId("agent-list-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("agent-other/issue-3");
  });

  it("filters by search query matching issue title", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getAllByTestId("agent-list-row")).toHaveLength(3);
    });

    fireEvent.change(screen.getByTestId("filter-bar-search"), {
      target: { value: "dark mode" },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const rows = screen.getAllByTestId("agent-list-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("agent-fleet/issue-5");
  });

  it("shows result count", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getByTestId("filter-bar-result-count")).toBeInTheDocument();
    });

    expect(screen.getByTestId("filter-bar-result-count")).toHaveTextContent(
      "Showing 3 of 3"
    );
  });

  it("updates result count after filtering", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getAllByTestId("agent-list-row")).toHaveLength(3);
    });

    fireEvent.change(screen.getByTestId("status-filter"), {
      target: { value: "active" },
    });

    expect(screen.getByTestId("filter-bar-result-count")).toHaveTextContent(
      "Showing 1 of 3"
    );
  });

  it("combines search and status filters", async () => {
    mockFetchSuccess();
    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getAllByTestId("agent-list-row")).toHaveLength(3);
    });

    // Filter to fleet-dashboard project and error status — should yield 0 results
    fireEvent.change(screen.getByTestId("project-filter"), {
      target: { value: "fleet-dashboard" },
    });
    fireEvent.change(screen.getByTestId("status-filter"), {
      target: { value: "error" },
    });

    expect(screen.getByTestId("agent-list-empty")).toBeInTheDocument();
  });

  it("opens AgentDetailModal on row click", async () => {
    // Mock the dashboard fetch for AgentDetailModal
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFleetState),
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ agents: [] }),
      });

    render(<AgentListTable />);

    await waitFor(() => {
      expect(screen.getAllByTestId("agent-list-row")).toHaveLength(3);
    });

    fireEvent.click(screen.getAllByTestId("agent-list-row")[0]);

    await waitFor(() => {
      expect(screen.getByTestId("agent-detail-modal")).toBeInTheDocument();
    });
  });
});
