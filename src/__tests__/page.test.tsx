import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import Home from "@/app/page";
import type { DashboardData } from "@/types/dashboard";

vi.mock("@/providers/FleetDataProvider", () => ({
  useFleetData: vi.fn().mockReturnValue({
    dashboardData: null, dashboardLoading: false, dashboardError: null,
    fleetState: null, fleetStateLoading: false, fleetStateError: null,
    dispatcherStatus: null, dispatcherLoading: false, dispatcherError: null,
    servicesData: null, servicesLoading: false, servicesError: null,
    prs: [], prsLoading: false, prsError: null,
    sessions: [], sessionsLoading: false, sessionsError: null,
    issueProgress: null, issueProgressLoading: false, issueProgressError: null,
  }),
  FleetDataProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockRefresh = vi.fn();
const mockUseDashboardData = vi.fn();
vi.mock("@/hooks/useDashboardData", () => ({
  useDashboardData: () => mockUseDashboardData(),
}));

vi.mock("@/hooks/useFleetState", () => ({
  useFleetState: () => ({ data: null }),
}));

const testDashboardData: DashboardData = {
  agents: [
    {
      name: "issue-42",
      sessionId: "sess-001",
      status: "working",
      issue: { title: "Add login flow", number: 42, url: "" },
      branch: "feat/issue-42-login",
      timeElapsed: "10m 05s",
    },
  ],
  prs: [
    {
      number: 1,
      url: "",
      title: "feat: add login flow",
      ciStatus: "passing",
      reviewStatus: "pending",
      mergeState: "open",
      author: "issue-42",
      branch: "feat/issue-42-login",
    },
  ],
  activityLog: [],
};

const loadedState = {
  data: testDashboardData,
  isLoading: false,
  error: null,
  connectionStatus: "connected" as const,
  countdown: 30,
  refresh: mockRefresh,
};

describe("Home page", () => {
  beforeEach(() => {
    mockUseDashboardData.mockReturnValue(loadedState);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the main heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 2, name: /active agents/i })
    ).toBeInTheDocument();
  });

  it("shows loading skeleton initially", () => {
    mockUseDashboardData.mockReturnValue({
      ...loadedState,
      data: null,
      isLoading: true,
      connectionStatus: "disconnected" as const,
    });
    render(<Home />);
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("shows connection indicator", () => {
    render(<Home />);
    expect(screen.getByText("Active Agents")).toBeInTheDocument();
  });

  it("shows refresh button", () => {
    render(<Home />);
    expect(screen.getByText("Services")).toBeInTheDocument();
  });

  it("renders dashboard content after loading", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Active Agents")).toBeInTheDocument();
  });

  it("renders bottom navigation", () => {
    render(<Home />);
    expect(screen.getByText("Services")).toBeInTheDocument();
  });

  it("renders pull-to-refresh container after loading", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Active Agents")).toBeInTheDocument();
  });

  it("shows error banner on fetch failure", async () => {
    mockUseDashboardData.mockReturnValue({
      ...loadedState,
      data: null,
      isLoading: false,
      error: "Network error",
      connectionStatus: "error" as const,
    });

    render(<Home />);
    await waitFor(() => {
      expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    });
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
});
