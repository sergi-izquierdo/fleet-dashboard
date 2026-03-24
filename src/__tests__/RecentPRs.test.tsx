import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import RecentPRs, { timeAgo } from "@/components/RecentPRs";
import type { RecentPR } from "@/types/prs";

const mockPRs: RecentPR[] = [
  {
    title: "feat: add CSV export",
    repo: "sergi-izquierdo/fleet-dashboard",
    status: "merged",
    ciStatus: "passing",
    createdAt: "2026-03-23T09:00:00Z",
    url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/19",
    number: 19,
    author: "agent-delta",
  },
  {
    title: "feat: dark mode toggle",
    repo: "sergi-izquierdo/fleet-dashboard",
    status: "open",
    ciStatus: "pending",
    createdAt: "2026-03-23T08:30:00Z",
    url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/21",
    number: 21,
    author: "agent-beta",
  },
  {
    title: "fix: resolve memory leak",
    repo: "other-org/other-repo",
    status: "closed",
    ciStatus: "failing",
    createdAt: "2026-03-23T07:00:00Z",
    url: "https://github.com/other-org/other-repo/pull/5",
    number: 5,
    author: "agent-alpha",
  },
];

describe("RecentPRs", () => {
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
    render(<RecentPRs />);
    expect(screen.getByTestId("prs-loading")).toBeInTheDocument();
  });

  it("renders the heading", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPRs,
    });
    render(<RecentPRs />);
    await waitFor(() => {
      expect(screen.getByText("Recent PRs")).toBeInTheDocument();
    });
  });

  it("renders PR items after fetch", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPRs,
    });
    render(<RecentPRs />);
    await waitFor(() => {
      expect(screen.getAllByTestId("pr-item")).toHaveLength(3);
    });
    expect(screen.getByText(/feat: add CSV export/)).toBeInTheDocument();
    expect(screen.getByText(/feat: dark mode toggle/)).toBeInTheDocument();
    expect(screen.getByText(/fix: resolve memory leak/)).toBeInTheDocument();
  });

  it("displays status badges with correct labels", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPRs,
    });
    render(<RecentPRs />);
    await waitFor(() => {
      expect(screen.getByText("Merged")).toBeInTheDocument();
    });
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("displays CI status badges", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPRs,
    });
    render(<RecentPRs />);
    await waitFor(() => {
      expect(screen.getByText("CI Passing")).toBeInTheDocument();
    });
    expect(screen.getByText("CI Pending")).toBeInTheDocument();
    expect(screen.getByText("CI Failing")).toBeInTheDocument();
  });

  it("shows repo name for each PR", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPRs,
    });
    render(<RecentPRs />);
    await waitFor(() => {
      const repos = screen.getAllByTestId("pr-repo");
      expect(repos).toHaveLength(3);
    });
    expect(screen.getAllByText("fleet-dashboard")).toHaveLength(2);
    expect(screen.getByText("other-repo")).toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );
    render(<RecentPRs />);
    await waitFor(() => {
      expect(screen.getByTestId("prs-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows empty state when no PRs returned", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    render(<RecentPRs />);
    await waitFor(() => {
      expect(screen.getByTestId("prs-empty")).toBeInTheDocument();
    });
    expect(screen.getByText("All clear")).toBeInTheDocument();
  });

  it("auto-refreshes every 30 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPRs,
    });
    global.fetch = fetchMock;

    render(<RecentPRs />);

    // Wait for initial fetch
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // Advance 30s
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    // Advance another 30s
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    vi.useRealTimers();
  });

  it("renders PR links with correct URLs", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPRs[0]],
    });
    render(<RecentPRs />);
    await waitFor(() => {
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "https://github.com/sergi-izquierdo/fleet-dashboard/pull/19"
      );
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  it("applies correct color for merged status badge (purple)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPRs[0]],
    });
    render(<RecentPRs />);
    await waitFor(() => {
      const badge = screen.getByTestId("pr-status-badge");
      expect(badge.className).toContain("text-purple-400");
    });
  });

  it("applies correct color for open status badge (green)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPRs[1]],
    });
    render(<RecentPRs />);
    await waitFor(() => {
      const badge = screen.getByTestId("pr-status-badge");
      expect(badge.className).toContain("text-green-400");
    });
  });

  it("applies correct color for closed status badge (red)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPRs[2]],
    });
    render(<RecentPRs />);
    await waitFor(() => {
      const badge = screen.getByTestId("pr-status-badge");
      expect(badge.className).toContain("text-red-400");
    });
  });

  it("shows author for each PR", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPRs[0]],
    });
    render(<RecentPRs />);
    await waitFor(() => {
      expect(screen.getByText("by agent-delta")).toBeInTheDocument();
    });
  });
});

describe("timeAgo", () => {
  it("returns seconds for < 1 minute", () => {
    const date = new Date(Date.now() - 30 * 1000).toISOString();
    expect(timeAgo(date)).toBe("30s ago");
  });

  it("returns minutes for < 1 hour", () => {
    const date = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("15m ago");
  });

  it("returns hours for < 1 day", () => {
    const date = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("5h ago");
  });

  it("returns days for >= 1 day", () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("3d ago");
  });
});
