import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import AgentStatusCards from "@/components/AgentStatusCards";
import type { TmuxSession } from "@/types/sessions";
import type { FleetDataContextValue } from "@/providers/FleetDataProvider";

vi.mock("@/providers/FleetDataProvider", () => ({
  useFleetData: vi.fn(),
}));

import { useFleetData } from "@/providers/FleetDataProvider";

const mockSessions: TmuxSession[] = [
  { name: "agent-1", status: "working", branch: "feat/login", uptime: "2h 15m", taskName: "add login page" },
  { name: "agent-2", status: "idle", branch: "main", uptime: "45m", taskName: "unknown" },
  { name: "agent-3", status: "stuck", branch: "fix/crash", uptime: "1d 3h", taskName: "fix crash on startup" },
];

const defaultContext: FleetDataContextValue = {
  dashboardData: null, dashboardLoading: false, dashboardError: null,
  fleetState: null, fleetStateLoading: false, fleetStateError: null,
  dispatcherStatus: null, dispatcherLoading: false, dispatcherError: null,
  servicesData: null, servicesLoading: false, servicesError: null,
  prs: [], prsLoading: false, prsError: null,
  sessions: [], sessionsLoading: false, sessionsError: null,
  issueProgress: null, issueProgressLoading: false, issueProgressError: null,
};

describe("AgentStatusCards", () => {
  beforeEach(() => {
    vi.mocked(useFleetData).mockReturnValue({ ...defaultContext });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading skeletons initially", () => {
    vi.mocked(useFleetData).mockReturnValue({ ...defaultContext, sessionsLoading: true });
    render(<AgentStatusCards />);
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(3);
  });

  it("renders session cards after data loads", async () => {
    vi.mocked(useFleetData).mockReturnValue({ ...defaultContext, sessions: mockSessions });
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getAllByTestId("session-card")).toHaveLength(3);
    });

    expect(screen.getByText("agent-1")).toBeInTheDocument();
    expect(screen.getByText("agent-2")).toBeInTheDocument();
    expect(screen.getByText("agent-3")).toBeInTheDocument();
  });

  it("renders correct status badges", async () => {
    vi.mocked(useFleetData).mockReturnValue({ ...defaultContext, sessions: mockSessions });
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
    vi.mocked(useFleetData).mockReturnValue({ ...defaultContext, sessions: mockSessions });
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByText("feat/login")).toBeInTheDocument();
    });
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("fix/crash")).toBeInTheDocument();
  });

  it("renders uptime values", async () => {
    vi.mocked(useFleetData).mockReturnValue({ ...defaultContext, sessions: mockSessions });
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByText("2h 15m")).toBeInTheDocument();
    });
    expect(screen.getByText("45m")).toBeInTheDocument();
    expect(screen.getByText("1d 3h")).toBeInTheDocument();
  });

  it("renders task names when available", async () => {
    vi.mocked(useFleetData).mockReturnValue({ ...defaultContext, sessions: mockSessions });
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByText("add login page")).toBeInTheDocument();
    });
    expect(screen.getByText("fix crash on startup")).toBeInTheDocument();
    // "unknown" task names should not be rendered
    const taskNames = screen.getAllByTestId("session-task-name");
    expect(taskNames).toHaveLength(2);
  });

  it("shows error state when context has error", async () => {
    vi.mocked(useFleetData).mockReturnValue({
      ...defaultContext,
      sessions: [],
      sessionsError: "Network error",
    });
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByTestId("sessions-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows empty state when no sessions", async () => {
    vi.mocked(useFleetData).mockReturnValue({ ...defaultContext, sessions: [] });
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByTestId("sessions-empty")).toBeInTheDocument();
    });
    expect(screen.getByText("No active agents")).toBeInTheDocument();
    expect(screen.getByText(/agent-local/)).toBeInTheDocument();
  });

  it("shows API error with empty sessions", async () => {
    vi.mocked(useFleetData).mockReturnValue({
      ...defaultContext,
      sessions: [],
      sessionsError: "tmux is not running",
    });
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByTestId("sessions-error")).toBeInTheDocument();
    });
    expect(screen.getByText("tmux is not running")).toBeInTheDocument();
  });

  it("shows warning banner when error exists but sessions are present", async () => {
    vi.mocked(useFleetData).mockReturnValue({
      ...defaultContext,
      sessions: [
        { name: "agent-1", status: "working", branch: "main", uptime: "1h", taskName: "unknown" },
      ],
      sessionsError: "partial error",
    });
    render(<AgentStatusCards />);

    await waitFor(() => {
      expect(screen.getByTestId("session-card")).toBeInTheDocument();
    });
    expect(screen.getByTestId("sessions-warning")).toBeInTheDocument();
    expect(screen.getByText("partial error")).toBeInTheDocument();
  });
});
