import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import ProgressTracker from "@/components/ProgressTracker";
import type { FleetIssueProgress } from "@/types/issues";
import type { FleetDataContextValue } from "@/providers/FleetDataProvider";

vi.mock("@/providers/FleetDataProvider", () => ({
  useFleetData: vi.fn(),
}));

import { useFleetData } from "@/providers/FleetDataProvider";

const mockProgress: FleetIssueProgress = {
  repos: [
    {
      repo: "sergi-izquierdo/fleet-dashboard",
      total: 20,
      open: 8,
      closed: 12,
      percentComplete: 60,
      labels: { queued: 3, inProgress: 3, cloud: 2, done: 12 },
    },
    {
      repo: "sergi-izquierdo/pavello-larapita-app",
      total: 15,
      open: 5,
      closed: 10,
      percentComplete: 67,
      labels: { queued: 2, inProgress: 2, cloud: 1, done: 10 },
    },
    {
      repo: "sergi-izquierdo/synapse-notes",
      total: 10,
      open: 3,
      closed: 7,
      percentComplete: 70,
      labels: { queued: 1, inProgress: 1, cloud: 1, done: 7 },
    },
    {
      repo: "sergi-izquierdo/autotask-engine",
      total: 8,
      open: 2,
      closed: 6,
      percentComplete: 75,
      labels: { queued: 1, inProgress: 1, cloud: 0, done: 6 },
    },
  ],
  overall: {
    total: 53,
    open: 18,
    closed: 35,
    percentComplete: 66,
    labels: { queued: 7, inProgress: 7, cloud: 4, done: 35 },
  },
};

const defaultContext: FleetDataContextValue = {
  dashboardData: null, dashboardLoading: false, dashboardError: null,
  fleetState: null, fleetStateLoading: false, fleetStateError: null,
  dispatcherStatus: null, dispatcherLoading: false, dispatcherError: null,
  servicesData: null, servicesLoading: false, servicesError: null,
  prs: [], prsLoading: false, prsError: null,
  sessions: [], sessionsLoading: false, sessionsError: null,
  issueProgress: null, issueProgressLoading: false, issueProgressError: null,
};

describe("ProgressTracker", () => {
  beforeEach(() => {
    vi.mocked(useFleetData).mockReturnValue({
      ...defaultContext,
      issueProgress: mockProgress,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    vi.mocked(useFleetData).mockReturnValue({ ...defaultContext, issueProgressLoading: true });
    render(<ProgressTracker />);
    expect(screen.getByTestId("progress-loading")).toBeInTheDocument();
  });

  it("renders the heading", async () => {
    render(<ProgressTracker />);
    await waitFor(() => {
      expect(screen.getByText("Issue Progress")).toBeInTheDocument();
    });
  });

  it("renders overall progress after data loads", async () => {
    render(<ProgressTracker />);
    await waitFor(() => {
      expect(screen.getByTestId("overall-progress")).toBeInTheDocument();
    });
    expect(screen.getByText("66%")).toBeInTheDocument();
    expect(screen.getByText("Overall Fleet Progress")).toBeInTheDocument();
    expect(screen.getByText("35/53 issues closed")).toBeInTheDocument();
  });

  it("renders per-repo progress cards", async () => {
    render(<ProgressTracker />);
    await waitFor(() => {
      expect(screen.getAllByTestId("repo-progress")).toHaveLength(4);
    });
    expect(screen.getByText("fleet-dashboard")).toBeInTheDocument();
    expect(screen.getByText("pavello-larapita-app")).toBeInTheDocument();
    expect(screen.getByText("synapse-notes")).toBeInTheDocument();
    expect(screen.getByText("autotask-engine")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("renders label legend with correct counts", async () => {
    render(<ProgressTracker />);
    await waitFor(() => {
      expect(screen.getByTestId("overall-progress")).toBeInTheDocument();
    });
    // Overall legend values
    expect(screen.getByText("Done: 35")).toBeTruthy();
    expect(screen.getByText("In Progress: 7")).toBeTruthy();
    expect(screen.getByText("Cloud: 4")).toBeTruthy();
    expect(screen.getByText("Queued: 7")).toBeTruthy();
  });

  it("shows error state when context has error", async () => {
    vi.mocked(useFleetData).mockReturnValue({
      ...defaultContext,
      issueProgress: null,
      issueProgressError: "Failed to fetch issues: 500",
    });
    render(<ProgressTracker />);
    await waitFor(() => {
      expect(screen.getByTestId("progress-error")).toBeInTheDocument();
    });
  });

  it("renders progress bar segments", async () => {
    render(<ProgressTracker />);
    await waitFor(() => {
      expect(screen.getByTestId("overall-progress")).toBeInTheDocument();
    });
    // Check that progress bar segments exist
    const doneSegments = screen.getAllByTestId("bar-done");
    expect(doneSegments.length).toBeGreaterThan(0);
    const inProgressSegments = screen.getAllByTestId("bar-in-progress");
    expect(inProgressSegments.length).toBeGreaterThan(0);
  });
});
