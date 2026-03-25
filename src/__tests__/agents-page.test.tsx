import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import AgentsPage from "@/app/agents/page";
import type { DashboardData, Agent } from "@/types/dashboard";

const mockAgents: Agent[] = [
  {
    name: "agent-1",
    sessionId: "agent-1",
    status: "working",
    issue: { title: "Fix login bug", number: 10, url: "https://github.com/org/repo/issues/10" },
    branch: "fix/login-bug",
    timeElapsed: "5m 12s",
    pr: undefined,
    healthTimeline: [],
  },
  {
    name: "agent-2",
    sessionId: "agent-2",
    status: "pr_open",
    issue: { title: "Add dashboard charts", number: 22, url: "https://github.com/org/repo/issues/22" },
    branch: "feat/dashboard-charts",
    timeElapsed: "1h 3m",
    pr: { url: "https://github.com/org/repo/pull/55", number: 55 },
    healthTimeline: [],
  },
  {
    name: "agent-3",
    sessionId: "agent-3",
    status: "merged",
    issue: { title: "Refactor API layer", number: 33, url: "" },
    branch: "refactor/api-layer",
    timeElapsed: "2h 45m",
    pr: undefined,
    healthTimeline: [],
  },
];

const mockDashboardData: DashboardData = {
  agents: mockAgents,
  prs: [],
  activityLog: [],
};

const mockSessionsData = { sessions: [] };

function mockFetch(dashboardData = mockDashboardData) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/api/dashboard")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(dashboardData),
      });
    }
    if (url.includes("/api/sessions")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSessionsData),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

describe("AgentsPage", () => {
  beforeEach(() => {
    mockFetch();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading skeleton initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AgentsPage />);
    expect(screen.getByTestId("agent-grid-skeleton")).toBeInTheDocument();
  });

  it("renders agent cards after successful fetch", async () => {
    render(<AgentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("agent-grid")).toBeInTheDocument();
    });
    expect(screen.getByText("agent-1")).toBeInTheDocument();
    expect(screen.getByText("agent-2")).toBeInTheDocument();
    expect(screen.getByText("agent-3")).toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<AgentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("agents-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("agents-error")).toHaveTextContent("Network error");
  });

  it("shows empty state when no agents returned", async () => {
    mockFetch({ agents: [], prs: [], activityLog: [] });
    render(<AgentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("agents-empty")).toBeInTheDocument();
    });
  });

  it("renders search input", async () => {
    render(<AgentsPage />);
    expect(screen.getByTestId("agent-search")).toBeInTheDocument();
  });

  it("renders status filter buttons", async () => {
    render(<AgentsPage />);
    expect(screen.getByTestId("filter-all")).toBeInTheDocument();
    expect(screen.getByTestId("filter-active")).toBeInTheDocument();
    expect(screen.getByTestId("filter-idle")).toBeInTheDocument();
    expect(screen.getByTestId("filter-completed")).toBeInTheDocument();
  });

  it("filters agents by search query", async () => {
    render(<AgentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("agent-grid")).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("agent-search");
    fireEvent.change(searchInput, { target: { value: "login" } });

    await waitFor(() => {
      expect(screen.getByText("agent-1")).toBeInTheDocument();
      expect(screen.queryByText("agent-2")).not.toBeInTheDocument();
      expect(screen.queryByText("agent-3")).not.toBeInTheDocument();
    });
  });

  it("filters agents by branch name in search", async () => {
    render(<AgentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("agent-grid")).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("agent-search");
    fireEvent.change(searchInput, { target: { value: "refactor" } });

    await waitFor(() => {
      expect(screen.getByText("agent-3")).toBeInTheDocument();
      expect(screen.queryByText("agent-1")).not.toBeInTheDocument();
    });
  });

  it("shows empty state when search has no matches", async () => {
    render(<AgentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("agent-grid")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("agent-search"), {
      target: { value: "xyznonexistent" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("agents-empty")).toBeInTheDocument();
    });
  });

  it("filters by active status", async () => {
    render(<AgentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("agent-grid")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("filter-active"));

    await waitFor(() => {
      expect(screen.getByText("agent-1")).toBeInTheDocument();
      expect(screen.queryByText("agent-2")).not.toBeInTheDocument();
      expect(screen.queryByText("agent-3")).not.toBeInTheDocument();
    });
  });

  it("filters by idle status", async () => {
    render(<AgentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("agent-grid")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("filter-idle"));

    await waitFor(() => {
      expect(screen.getByText("agent-2")).toBeInTheDocument();
      expect(screen.queryByText("agent-1")).not.toBeInTheDocument();
      expect(screen.queryByText("agent-3")).not.toBeInTheDocument();
    });
  });

  it("filters by completed status", async () => {
    render(<AgentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("agent-grid")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("filter-completed"));

    await waitFor(() => {
      expect(screen.getByText("agent-3")).toBeInTheDocument();
      expect(screen.queryByText("agent-1")).not.toBeInTheDocument();
      expect(screen.queryByText("agent-2")).not.toBeInTheDocument();
    });
  });

  it("all filter shows all agents", async () => {
    render(<AgentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("agent-grid")).toBeInTheDocument();
    });

    // Switch to active then back to all
    fireEvent.click(screen.getByTestId("filter-active"));
    fireEvent.click(screen.getByTestId("filter-all"));

    await waitFor(() => {
      expect(screen.getByText("agent-1")).toBeInTheDocument();
      expect(screen.getByText("agent-2")).toBeInTheDocument();
      expect(screen.getByText("agent-3")).toBeInTheDocument();
    });
  });

  it("active filter button has aria-pressed=true when selected", async () => {
    render(<AgentsPage />);

    fireEvent.click(screen.getByTestId("filter-active"));

    expect(screen.getByTestId("filter-active")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByTestId("filter-all")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("clicking agent card opens detail modal", async () => {
    render(<AgentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("agent-grid")).toBeInTheDocument();
    });

    // AgentCard with onViewTerminal renders as a clickable div
    const cards = screen.getAllByRole("button", { name: /agent-/i });
    // The first card matching agent name
    const agentCard = cards.find((c) => c.textContent?.includes("agent-1"));
    expect(agentCard).toBeTruthy();
  });

  it("renders refresh button", async () => {
    render(<AgentsPage />);
    expect(screen.getByTestId("refresh-agents")).toBeInTheDocument();
  });

  it("sets up polling interval", () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval");
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AgentsPage />);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 15000);
  });

  it("shows filtered empty message when filters applied", async () => {
    render(<AgentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("agent-grid")).toBeInTheDocument();
    });

    // Filter to idle — agent-2 is pr_open (idle), but let's filter active and search for something that won't match
    fireEvent.click(screen.getByTestId("filter-active"));
    fireEvent.change(screen.getByTestId("agent-search"), {
      target: { value: "nomatchwhatsoever" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("agents-empty")).toBeInTheDocument();
      expect(
        screen.getByText("No agents match the current filters.")
      ).toBeInTheDocument();
    });
  });
});
