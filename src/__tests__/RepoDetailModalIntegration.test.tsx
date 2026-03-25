import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import ProgressTracker from "@/components/ProgressTracker";
import type { FleetIssueProgress } from "@/types/issues";
import type { RepoDetailData } from "@/types/issues";
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
  ],
  overall: {
    total: 20,
    open: 8,
    closed: 12,
    percentComplete: 60,
    labels: { queued: 3, inProgress: 3, cloud: 2, done: 12 },
  },
};

const mockDetailData: RepoDetailData = {
  repo: "sergi-izquierdo/fleet-dashboard",
  openIssues: [
    {
      number: 10,
      title: "Test issue",
      labels: ["bug"],
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/issues/10",
    },
  ],
  openPRs: [],
  recentMergedPRs: [],
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

describe("ProgressTracker repo detail integration", () => {
  beforeEach(() => {
    vi.mocked(useFleetData).mockReturnValue({
      ...defaultContext,
      issueProgress: mockProgress,
    });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens RepoDetailModal when a repo card is clicked", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetailData,
      });
    global.fetch = fetchMock;

    render(<ProgressTracker />);

    await waitFor(() => {
      expect(screen.getByTestId("repo-progress")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("repo-progress"));

    await waitFor(() => {
      expect(screen.getByTestId("repo-detail-modal")).toBeInTheDocument();
    });
  });

  it("closes RepoDetailModal when close button is clicked", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetailData,
      });
    global.fetch = fetchMock;

    render(<ProgressTracker />);

    await waitFor(() => {
      expect(screen.getByTestId("repo-progress")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("repo-progress"));

    await waitFor(() => {
      expect(screen.getByTestId("repo-detail-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("close-detail-modal"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("repo-detail-modal")
      ).not.toBeInTheDocument();
    });
  });

  it("repo cards have aria-label for accessibility", async () => {

    render(<ProgressTracker />);

    await waitFor(() => {
      expect(screen.getByTestId("repo-progress")).toBeInTheDocument();
    });

    expect(
      screen.getByLabelText("View details for fleet-dashboard")
    ).toBeInTheDocument();
  });
});
