import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { RepoDetailModal } from "@/components/RepoDetailModal";
import type { RepoDetailData } from "@/types/issues";

const mockDetailData: RepoDetailData = {
  repo: "sergi-izquierdo/fleet-dashboard",
  openIssues: [
    {
      number: 10,
      title: "Add dark mode support",
      labels: ["enhancement", "agent-working"],
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/issues/10",
    },
    {
      number: 11,
      title: "Fix login redirect",
      labels: ["bug"],
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/issues/11",
    },
  ],
  openPRs: [
    {
      number: 20,
      title: "feat: dark mode toggle",
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/20",
      author: "agent-1",
      ciStatus: "passing",
      createdAt: "2026-03-20T10:00:00Z",
    },
    {
      number: 21,
      title: "fix: login redirect loop",
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/21",
      author: "agent-2",
      ciStatus: "failing",
      createdAt: "2026-03-21T12:00:00Z",
    },
  ],
  recentMergedPRs: [
    {
      number: 15,
      title: "feat: add health timeline",
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/15",
      author: "agent-1",
      ciStatus: "passing",
      createdAt: "2026-03-18T08:00:00Z",
    },
    {
      number: 14,
      title: "fix: progress bar width",
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/14",
      author: "agent-3",
      ciStatus: "passing",
      createdAt: "2026-03-17T09:00:00Z",
    },
  ],
};

describe("RepoDetailModal", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    render(
      <RepoDetailModal
        repo="sergi-izquierdo/fleet-dashboard"
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("detail-loading")).toBeInTheDocument();
  });

  it("renders repo name in header", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetailData,
    });
    render(
      <RepoDetailModal
        repo="sergi-izquierdo/fleet-dashboard"
        onClose={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("fleet-dashboard")).toBeInTheDocument();
    });
  });

  it("renders open issues with labels", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetailData,
    });
    render(
      <RepoDetailModal
        repo="sergi-izquierdo/fleet-dashboard"
        onClose={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId("open-issues-list")).toBeInTheDocument();
    });
    expect(screen.getByText("Open Issues (2)")).toBeInTheDocument();
    expect(
      screen.getByText("#10 Add dark mode support")
    ).toBeInTheDocument();
    expect(screen.getByText("#11 Fix login redirect")).toBeInTheDocument();
    expect(screen.getByText("enhancement")).toBeInTheDocument();
    expect(screen.getByText("agent-working")).toBeInTheDocument();
    expect(screen.getByText("bug")).toBeInTheDocument();
  });

  it("renders open PRs with CI status", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetailData,
    });
    render(
      <RepoDetailModal
        repo="sergi-izquierdo/fleet-dashboard"
        onClose={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId("open-prs-list")).toBeInTheDocument();
    });
    expect(screen.getByText("Open PRs (2)")).toBeInTheDocument();
    expect(
      screen.getByText("#20 feat: dark mode toggle")
    ).toBeInTheDocument();
    expect(
      screen.getByText("#21 fix: login redirect loop")
    ).toBeInTheDocument();
    expect(screen.getByText("Passing")).toBeInTheDocument();
    expect(screen.getByText("Failing")).toBeInTheDocument();
  });

  it("renders recent merged PRs", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetailData,
    });
    render(
      <RepoDetailModal
        repo="sergi-izquierdo/fleet-dashboard"
        onClose={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(
        screen.getByTestId("recent-merged-prs-list")
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Recent Activity (2 merged)")).toBeInTheDocument();
    expect(
      screen.getByText("#15 feat: add health timeline")
    ).toBeInTheDocument();
    expect(
      screen.getByText("#14 fix: progress bar width")
    ).toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    render(
      <RepoDetailModal
        repo="sergi-izquierdo/fleet-dashboard"
        onClose={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId("detail-error")).toBeInTheDocument();
    });
  });

  it("calls onClose when backdrop is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetailData,
    });
    const onClose = vi.fn();
    render(
      <RepoDetailModal
        repo="sergi-izquierdo/fleet-dashboard"
        onClose={onClose}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId("repo-detail-modal")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("repo-detail-modal"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetailData,
    });
    const onClose = vi.fn();
    render(
      <RepoDetailModal
        repo="sergi-izquierdo/fleet-dashboard"
        onClose={onClose}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId("close-detail-modal")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("close-detail-modal"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetailData,
    });
    const onClose = vi.fn();
    render(
      <RepoDetailModal
        repo="sergi-izquierdo/fleet-dashboard"
        onClose={onClose}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId("repo-detail-modal")).toBeInTheDocument();
    });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when no issues or PRs", async () => {
    const emptyData: RepoDetailData = {
      repo: "sergi-izquierdo/fleet-dashboard",
      openIssues: [],
      openPRs: [],
      recentMergedPRs: [],
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => emptyData,
    });
    render(
      <RepoDetailModal
        repo="sergi-izquierdo/fleet-dashboard"
        onClose={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("No open issues")).toBeInTheDocument();
    });
    expect(screen.getByText("No open PRs")).toBeInTheDocument();
    expect(screen.getByText("No recently merged PRs")).toBeInTheDocument();
  });

  it("fetches data for the correct repo", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetailData,
    });
    global.fetch = fetchMock;
    render(
      <RepoDetailModal
        repo="sergi-izquierdo/fleet-dashboard"
        onClose={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/repo-details?repo=sergi-izquierdo%2Ffleet-dashboard"
      );
    });
  });
});
