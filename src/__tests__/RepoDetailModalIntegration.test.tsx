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

describe("ProgressTracker repo detail integration", () => {
  beforeEach(() => {
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
        json: async () => mockProgress,
      })
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
        json: async () => mockProgress,
      })
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
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProgress,
    });

    render(<ProgressTracker />);

    await waitFor(() => {
      expect(screen.getByTestId("repo-progress")).toBeInTheDocument();
    });

    expect(
      screen.getByLabelText("View details for fleet-dashboard")
    ).toBeInTheDocument();
  });
});
