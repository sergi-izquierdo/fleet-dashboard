import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import AgentStatusCards from "@/components/AgentStatusCards";
import type { SessionsResponse } from "@/types/sessions";
import * as apiCache from "@/lib/apiCache";

const mockSessions: SessionsResponse = {
  sessions: [
    { name: "agent-1", status: "working", branch: "feat/login", uptime: "2h 15m", taskName: "add login page" },
    { name: "agent-2", status: "idle", branch: "main", uptime: "45m", taskName: "unknown" },
    { name: "agent-3", status: "stuck", branch: "fix/crash", uptime: "1d 3h", taskName: "fix crash on startup" },
  ],
};

function mockFetchSuccess(data: SessionsResponse) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(message = "Network error") {
  global.fetch = vi.fn().mockRejectedValue(new Error(message));
}

describe("AgentStatusCards", () => {
  beforeEach(() => {
    apiCache.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading skeletons initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AgentStatusCards />);
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(3);
  });

  it("renders session cards after successful fetch", async () => {
    mockFetchSuccess(mockSessions);
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getAllByTestId("session-card")).toHaveLength(3);
    });

    expect(screen.getByText("agent-1")).toBeInTheDocument();
    expect(screen.getByText("agent-2")).toBeInTheDocument();
    expect(screen.getByText("agent-3")).toBeInTheDocument();
  });

  it("renders correct status badges", async () => {
    mockFetchSuccess(mockSessions);
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getAllByTestId("session-status-badge")).toHaveLength(3);
    });

    const badges = screen.getAllByTestId("session-status-badge");
    expect(badges[0]).toHaveTextContent("Working");
    expect(badges[1]).toHaveTextContent("Idle");
    expect(badges[2]).toHaveTextContent("Stuck");
  });

  it("renders branch names", async () => {
    mockFetchSuccess(mockSessions);
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByText("feat/login")).toBeInTheDocument();
    });
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("fix/crash")).toBeInTheDocument();
  });

  it("renders uptime values", async () => {
    mockFetchSuccess(mockSessions);
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByText("2h 15m")).toBeInTheDocument();
    });
    expect(screen.getByText("45m")).toBeInTheDocument();
    expect(screen.getByText("1d 3h")).toBeInTheDocument();
  });

  it("renders task names when available", async () => {
    mockFetchSuccess(mockSessions);
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByText("add login page")).toBeInTheDocument();
    });
    expect(screen.getByText("fix crash on startup")).toBeInTheDocument();
    // "unknown" task names should not be rendered
    const taskNames = screen.getAllByTestId("session-task-name");
    expect(taskNames).toHaveLength(2);
  });

  it("shows error state when fetch fails", async () => {
    mockFetchError("Network error");
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByTestId("sessions-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows retry button in error state", async () => {
    mockFetchError("Network error");
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByTestId("sessions-retry")).toBeInTheDocument();
    });
  });

  it("shows empty state when no sessions", async () => {
    mockFetchSuccess({ sessions: [] });
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByTestId("sessions-empty")).toBeInTheDocument();
    });
    expect(
      screen.getByText("No active agents")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/agent-local/)
    ).toBeInTheDocument();
  });

  it("shows API error with empty sessions", async () => {
    mockFetchSuccess({ sessions: [], error: "tmux is not running" });
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByTestId("sessions-error")).toBeInTheDocument();
    });
    expect(screen.getByText("tmux is not running")).toBeInTheDocument();
  });

  it("sets up auto-refresh interval", () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval");
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AgentStatusCards />);

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
  });

  it("shows warning banner when error exists but sessions are present", async () => {
    mockFetchSuccess({
      sessions: [
        { name: "agent-1", status: "working", branch: "main", uptime: "1h", taskName: "unknown" },
      ],
      error: "partial error",
    });
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByTestId("session-card")).toBeInTheDocument();
    });
    expect(screen.getByTestId("sessions-warning")).toBeInTheDocument();
    expect(screen.getByText("partial error")).toBeInTheDocument();
  });

  it("handles non-ok HTTP responses", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByTestId("sessions-error")).toBeInTheDocument();
    });
    expect(screen.getByText("HTTP 500")).toBeInTheDocument();
  });
});
