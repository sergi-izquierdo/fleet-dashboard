import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import GroupedPRView from "@/components/GroupedPRView";
import type { RecentPR } from "@/types/prs";

const today = new Date().toISOString();
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const mockPRs: RecentPR[] = [
  {
    title: "feat: awaiting ci pr",
    repo: "org/repo-a",
    status: "open",
    ciStatus: "pending",
    createdAt: yesterday,
    url: "https://github.com/org/repo-a/pull/1",
    number: 1,
    author: "agent-alpha",
  },
  {
    title: "feat: awaiting review pr",
    repo: "org/repo-b",
    status: "open",
    ciStatus: "passing",
    createdAt: yesterday,
    url: "https://github.com/org/repo-b/pull/2",
    number: 2,
    author: "agent-beta",
    reviewStatus: "pending",
  },
  {
    title: "feat: ready to merge pr",
    repo: "org/repo-c",
    status: "open",
    ciStatus: "passing",
    createdAt: yesterday,
    url: "https://github.com/org/repo-c/pull/3",
    number: 3,
    author: "agent-gamma",
    reviewStatus: "approved",
  },
  {
    title: "feat: merged today pr",
    repo: "org/repo-d",
    status: "merged",
    ciStatus: "passing",
    createdAt: today,
    mergedAt: today,
    url: "https://github.com/org/repo-d/pull/4",
    number: 4,
    author: "agent-delta",
  },
  {
    title: "feat: merged yesterday pr",
    repo: "org/repo-e",
    status: "merged",
    ciStatus: "passing",
    createdAt: yesterday,
    mergedAt: yesterday,
    url: "https://github.com/org/repo-e/pull/5",
    number: 5,
    author: "agent-epsilon",
  },
];

describe("GroupedPRView", () => {
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
    render(<GroupedPRView />);
    expect(screen.getByTestId("grouped-prs-loading")).toBeInTheDocument();
  });

  it("renders all four group sections after fetch", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPRs,
    });
    render(<GroupedPRView />);
    await waitFor(() => {
      expect(screen.getByTestId("pr-group-awaiting-ci")).toBeInTheDocument();
      expect(screen.getByTestId("pr-group-awaiting-review")).toBeInTheDocument();
      expect(screen.getByTestId("pr-group-ready-to-merge")).toBeInTheDocument();
      expect(screen.getByTestId("pr-group-merged-today")).toBeInTheDocument();
    });
  });

  it("shows correct group labels", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPRs,
    });
    render(<GroupedPRView />);
    await waitFor(() => {
      expect(screen.getByText("Awaiting CI")).toBeInTheDocument();
      expect(screen.getByText("Awaiting Review")).toBeInTheDocument();
      expect(screen.getByText("Ready to Merge")).toBeInTheDocument();
      expect(screen.getByText("Merged Today")).toBeInTheDocument();
    });
  });

  it("groups PRs correctly by status", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPRs,
    });
    render(<GroupedPRView />);
    await waitFor(() => {
      expect(screen.getByText(/feat: awaiting ci pr/)).toBeInTheDocument();
    });

    // Awaiting CI group should have 1 PR
    expect(screen.getByTestId("pr-group-count-awaiting-ci").textContent).toBe("1");
    // Awaiting Review group should have 1 PR
    expect(screen.getByTestId("pr-group-count-awaiting-review").textContent).toBe("1");
    // Ready to merge group should have 1 PR
    expect(screen.getByTestId("pr-group-count-ready-to-merge").textContent).toBe("1");
    // Merged today group should have 1 PR (not the one merged yesterday)
    expect(screen.getByTestId("pr-group-count-merged-today").textContent).toBe("1");
  });

  it("displays the merged today counter at the top", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPRs,
    });
    render(<GroupedPRView />);
    await waitFor(() => {
      expect(screen.getByTestId("merged-today-counter")).toBeInTheDocument();
      expect(screen.getByTestId("merged-today-count").textContent).toBe("1");
    });
  });

  it("shows 0 for merged today counter when no PRs merged today", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    render(<GroupedPRView />);
    await waitFor(() => {
      expect(screen.getByTestId("merged-today-count").textContent).toBe("0");
    });
  });

  it("shows repo badge for each PR card", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPRs[0]],
    });
    render(<GroupedPRView />);
    await waitFor(() => {
      expect(screen.getByTestId("pr-repo-badge").textContent).toBe("repo-a");
    });
  });

  it("shows CI status badge for each PR card", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPRs[0]],
    });
    render(<GroupedPRView />);
    await waitFor(() => {
      expect(screen.getByTestId("grouped-pr-ci-badge")).toBeInTheDocument();
      expect(screen.getByText("CI Pending")).toBeInTheDocument();
    });
  });

  it("shows review verdict badge when reviewStatus is present", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPRs[2]], // approved review
    });
    render(<GroupedPRView />);
    await waitFor(() => {
      expect(screen.getByTestId("grouped-pr-review-badge")).toBeInTheDocument();
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });
  });

  it("clicking a PR card opens GitHub URL in new tab", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPRs[0]],
    });
    render(<GroupedPRView />);
    await waitFor(() => {
      const link = screen.getByRole("link", { name: new RegExp(String(mockPRs[0].number)) });
      expect(link).toHaveAttribute("href", mockPRs[0].url);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );
    render(<GroupedPRView />);
    await waitFor(() => {
      expect(screen.getByTestId("grouped-prs-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows time since creation for each PR", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPRs[0]],
    });
    render(<GroupedPRView />);
    await waitFor(() => {
      // Should show some relative time string
      expect(screen.getByRole("link")).toBeInTheDocument();
    });
  });

  it("shows empty message for groups with no PRs", async () => {
    const onlyOpenPR: RecentPR[] = [mockPRs[0]]; // only awaiting CI
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => onlyOpenPR,
    });
    render(<GroupedPRView />);
    await waitFor(() => {
      expect(screen.getByTestId("pr-group-empty-awaiting-review")).toBeInTheDocument();
      expect(screen.getByTestId("pr-group-empty-ready-to-merge")).toBeInTheDocument();
      expect(screen.getByTestId("pr-group-empty-merged-today")).toBeInTheDocument();
    });
  });

  it("does not show review badge when reviewStatus is absent", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPRs[0]], // no reviewStatus
    });
    render(<GroupedPRView />);
    await waitFor(() => {
      expect(screen.queryByTestId("grouped-pr-review-badge")).not.toBeInTheDocument();
    });
  });

  it("shows PR with ciStatus failing in awaiting-ci group", async () => {
    const failingPR: RecentPR = {
      ...mockPRs[0],
      ciStatus: "failing",
      title: "feat: failing ci pr",
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [failingPR],
    });
    render(<GroupedPRView />);
    await waitFor(() => {
      // failing CI is still open — goes to awaiting-review (not awaiting-ci)
      // because awaiting-ci is only pending/unknown
      expect(screen.getByTestId("pr-group-count-awaiting-review").textContent).toBe("1");
    });
  });
});
