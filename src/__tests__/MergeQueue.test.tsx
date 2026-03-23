import {
  render,
  screen,
  cleanup,
  waitFor,
  act,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import MergeQueue from "@/components/MergeQueue";
import type { RecentPR } from "@/types/prs";

const mockPRs: RecentPR[] = [
  {
    title: "feat: add CSV export",
    repo: "sergi-izquierdo/fleet-dashboard",
    status: "open",
    ciStatus: "passing",
    createdAt: "2026-03-23T09:00:00Z",
    url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/19",
    number: 19,
    author: "agent-delta",
    hasConflicts: false,
  },
  {
    title: "chore: upgrade deps",
    repo: "sergi-izquierdo/fleet-dashboard",
    status: "open",
    ciStatus: "failing",
    createdAt: "2026-03-23T08:00:00Z",
    url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/22",
    number: 22,
    author: "agent-gamma",
    hasConflicts: true,
  },
  {
    title: "feat: user analytics",
    repo: "sergi-izquierdo/fleet-api",
    status: "open",
    ciStatus: "pending",
    createdAt: "2026-03-23T08:30:00Z",
    url: "https://github.com/sergi-izquierdo/fleet-api/pull/42",
    number: 42,
    author: "agent-beta",
    hasConflicts: false,
  },
  {
    title: "fix: pagination",
    repo: "sergi-izquierdo/fleet-dashboard",
    status: "merged",
    ciStatus: "passing",
    createdAt: "2026-03-23T07:00:00Z",
    url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/23",
    number: 23,
    author: "agent-gamma",
    hasConflicts: false,
  },
];

function mockFetchSuccess(data: RecentPR[] = mockPRs) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

describe("MergeQueue", () => {
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
    render(<MergeQueue />);
    expect(screen.getByTestId("merge-queue-loading")).toBeInTheDocument();
  });

  it("renders the heading", async () => {
    mockFetchSuccess();
    render(<MergeQueue />);
    await waitFor(() => {
      expect(screen.getByText("PR Merge Queue")).toBeInTheDocument();
    });
  });

  it("groups PRs by repository", async () => {
    mockFetchSuccess();
    render(<MergeQueue />);
    await waitFor(() => {
      const groups = screen.getAllByTestId("repo-group");
      expect(groups).toHaveLength(2);
    });
    const groupNames = screen.getAllByTestId("repo-group-name");
    expect(groupNames.map((el) => el.textContent)).toEqual(
      expect.arrayContaining(["fleet-api", "fleet-dashboard"])
    );
  });

  it("shows CI status badges on each PR", async () => {
    mockFetchSuccess();
    render(<MergeQueue />);
    await waitFor(() => {
      expect(screen.getAllByTestId("queue-ci-badge")).toHaveLength(4);
    });
    const ciBadges = screen.getAllByTestId("queue-ci-badge");
    const labels = ciBadges.map((b) => b.textContent);
    expect(labels).toContain("CI Passing");
    expect(labels).toContain("CI Failing");
    expect(labels).toContain("CI Pending");
  });

  it("shows conflict warning badges on conflicting PRs", async () => {
    mockFetchSuccess();
    render(<MergeQueue />);
    await waitFor(() => {
      const conflictBadges = screen.getAllByTestId("conflict-badge");
      expect(conflictBadges).toHaveLength(1);
    });
    expect(screen.getByText("Conflicts")).toBeInTheDocument();
  });

  it("shows total conflict count in header", async () => {
    mockFetchSuccess();
    render(<MergeQueue />);
    await waitFor(() => {
      expect(screen.getByTestId("conflict-count")).toHaveTextContent(
        "1 conflict"
      );
    });
  });

  it("highlights conflicting PR rows with orange border", async () => {
    mockFetchSuccess();
    render(<MergeQueue />);
    await waitFor(() => {
      const items = screen.getAllByTestId("merge-queue-item");
      const conflictingItem = items.find((item) =>
        within(item).queryByTestId("conflict-badge")
      );
      expect(conflictingItem?.className).toContain("border-orange-500/40");
    });
  });

  it("renders filter dropdowns", async () => {
    mockFetchSuccess();
    render(<MergeQueue />);
    await waitFor(() => {
      expect(screen.getByTestId("filter-repo")).toBeInTheDocument();
    });
    expect(screen.getByTestId("filter-status")).toBeInTheDocument();
    expect(screen.getByTestId("filter-author")).toBeInTheDocument();
  });

  it("filters by repository", async () => {
    mockFetchSuccess();
    const user = userEvent.setup();
    render(<MergeQueue />);

    await waitFor(() => {
      expect(screen.getAllByTestId("merge-queue-item")).toHaveLength(4);
    });

    await user.selectOptions(
      screen.getByTestId("filter-repo"),
      "sergi-izquierdo/fleet-api"
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("merge-queue-item")).toHaveLength(1);
    });
    expect(screen.getByText(/feat: user analytics/)).toBeInTheDocument();
  });

  it("filters by status", async () => {
    mockFetchSuccess();
    const user = userEvent.setup();
    render(<MergeQueue />);

    await waitFor(() => {
      expect(screen.getAllByTestId("merge-queue-item")).toHaveLength(4);
    });

    await user.selectOptions(screen.getByTestId("filter-status"), "open");

    await waitFor(() => {
      expect(screen.getAllByTestId("merge-queue-item")).toHaveLength(3);
    });
  });

  it("filters by author", async () => {
    mockFetchSuccess();
    const user = userEvent.setup();
    render(<MergeQueue />);

    await waitFor(() => {
      expect(screen.getAllByTestId("merge-queue-item")).toHaveLength(4);
    });

    await user.selectOptions(
      screen.getByTestId("filter-author"),
      "agent-gamma"
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("merge-queue-item")).toHaveLength(2);
    });
  });

  it("shows empty state when filters match nothing", async () => {
    mockFetchSuccess([
      {
        title: "feat: something",
        repo: "sergi-izquierdo/fleet-dashboard",
        status: "open",
        ciStatus: "passing",
        createdAt: "2026-03-23T09:00:00Z",
        url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/99",
        number: 99,
        author: "agent-alpha",
        hasConflicts: false,
      },
    ]);
    const user = userEvent.setup();
    render(<MergeQueue />);

    await waitFor(() => {
      expect(screen.getAllByTestId("merge-queue-item")).toHaveLength(1);
    });

    await user.selectOptions(screen.getByTestId("filter-status"), "closed");

    expect(screen.getByTestId("merge-queue-empty")).toHaveTextContent(
      "No PRs match the current filters."
    );
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );
    render(<MergeQueue />);
    await waitFor(() => {
      expect(screen.getByTestId("merge-queue-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders PR links with correct URLs", async () => {
    mockFetchSuccess();
    render(<MergeQueue />);
    await waitFor(() => {
      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThanOrEqual(4);
    });
    const link = screen.getByText(/feat: add CSV export/).closest("a");
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/sergi-izquierdo/fleet-dashboard/pull/19"
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows open count per repo group", async () => {
    mockFetchSuccess();
    render(<MergeQueue />);
    await waitFor(() => {
      const groups = screen.getAllByTestId("repo-group");
      expect(groups).toHaveLength(2);
    });
    // fleet-dashboard has 2 open PRs, fleet-api has 1
    expect(screen.getByText("2 open")).toBeInTheDocument();
    expect(screen.getByText("1 open")).toBeInTheDocument();
  });

  it("auto-refreshes every 30 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPRs,
    });
    global.fetch = fetchMock;

    render(<MergeQueue />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  it("shows CI status dots with correct colors", async () => {
    mockFetchSuccess();
    render(<MergeQueue />);
    await waitFor(() => {
      const dots = screen.getAllByTestId("ci-dot");
      expect(dots).toHaveLength(4);
    });
    const dots = screen.getAllByTestId("ci-dot");
    const allClasses = dots.map((d) => d.className).join(" ");
    expect(allClasses).toContain("bg-green-400");
    expect(allClasses).toContain("bg-red-400");
    expect(allClasses).toContain("bg-yellow-400");
  });

  it("shows author for each PR", async () => {
    mockFetchSuccess();
    render(<MergeQueue />);
    await waitFor(() => {
      expect(screen.getByText("by agent-delta")).toBeInTheDocument();
    });
    expect(screen.getAllByText("by agent-gamma")).toHaveLength(2);
    expect(screen.getByText("by agent-beta")).toBeInTheDocument();
  });

  it("does not show conflict count when there are no conflicts", async () => {
    mockFetchSuccess([
      {
        title: "feat: something",
        repo: "sergi-izquierdo/fleet-dashboard",
        status: "open",
        ciStatus: "passing",
        createdAt: "2026-03-23T09:00:00Z",
        url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/99",
        number: 99,
        author: "agent-alpha",
        hasConflicts: false,
      },
    ]);
    render(<MergeQueue />);
    await waitFor(() => {
      expect(screen.getAllByTestId("merge-queue-item")).toHaveLength(1);
    });
    expect(screen.queryByTestId("conflict-count")).not.toBeInTheDocument();
  });
});
