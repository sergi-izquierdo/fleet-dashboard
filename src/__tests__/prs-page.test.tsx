import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import PRsPage from "@/app/prs/page";
import type { RecentPR } from "@/types/prs";

const mockPRs: RecentPR[] = [
  {
    title: "feat: add CSV export",
    repo: "org/repo-a",
    status: "merged",
    ciStatus: "passing",
    createdAt: "2026-03-23T09:00:00Z",
    url: "https://github.com/org/repo-a/pull/1",
    number: 1,
    author: "agent-alpha",
  },
  {
    title: "feat: dark mode toggle",
    repo: "org/repo-b",
    status: "open",
    ciStatus: "pending",
    createdAt: "2026-03-23T08:30:00Z",
    url: "https://github.com/org/repo-b/pull/2",
    number: 2,
    author: "agent-beta",
    hasConflicts: false,
  },
  {
    title: "fix: resolve memory leak",
    repo: "org/repo-a",
    status: "closed",
    ciStatus: "failing",
    createdAt: "2026-03-23T07:00:00Z",
    url: "https://github.com/org/repo-a/pull/3",
    number: 3,
    author: "agent-gamma",
  },
];

const mockRepos = { repos: ["org/repo-a", "org/repo-b"] };

function setupFetchMock(prs: RecentPR[] = mockPRs) {
  (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string) => {
      if (url === "/api/repos") {
        return Promise.resolve({ ok: true, json: async () => mockRepos });
      }
      if (url === "/api/prs") {
        return Promise.resolve({ ok: true, json: async () => prs });
      }
      if (url === "/api/pr-trends") {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }
  );
}

describe("PRsPage", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    // ResizeObserver not available in jsdom
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the page title", async () => {
    setupFetchMock();
    render(<PRsPage />);
    expect(screen.getByText("Pull Requests")).toBeInTheDocument();
  });

  it("renders filter controls", async () => {
    setupFetchMock();
    render(<PRsPage />);
    expect(screen.getByTestId("prs-page-filters")).toBeInTheDocument();
    expect(screen.getByTestId("page-filter-repo")).toBeInTheDocument();
    expect(screen.getByTestId("page-filter-status")).toBeInTheDocument();
  });

  it("populates repo filter from /api/repos", async () => {
    setupFetchMock();
    render(<PRsPage />);
    await waitFor(() => {
      const select = screen.getByTestId("page-filter-repo") as HTMLSelectElement;
      const options = Array.from(select.options).map((o) => o.value);
      expect(options).toContain("org/repo-a");
      expect(options).toContain("org/repo-b");
    });
  });

  it("status filter has all expected options", async () => {
    setupFetchMock();
    render(<PRsPage />);
    const select = screen.getByTestId("page-filter-status") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(["all", "open", "merged", "closed"]);
  });

  it("defaults to all repos and all statuses", async () => {
    setupFetchMock();
    render(<PRsPage />);
    const repoSelect = screen.getByTestId("page-filter-repo") as HTMLSelectElement;
    const statusSelect = screen.getByTestId("page-filter-status") as HTMLSelectElement;
    expect(repoSelect.value).toBe("all");
    expect(statusSelect.value).toBe("all");
  });

  it("filters RecentPRs by status when status filter is changed", async () => {
    setupFetchMock();
    render(<PRsPage />);

    // Wait for PR items to load in RecentPRs
    await waitFor(() => {
      expect(screen.getAllByTestId("pr-item")).toHaveLength(3);
    });

    // Filter to open only
    const statusSelect = screen.getByTestId("page-filter-status");
    fireEvent.change(statusSelect, { target: { value: "open" } });

    await waitFor(() => {
      // RecentPRs should show only 1 open PR
      expect(screen.getAllByTestId("pr-item")).toHaveLength(1);
    });
  });

  it("filters RecentPRs by repo when repo filter is changed", async () => {
    setupFetchMock();
    render(<PRsPage />);

    await waitFor(() => {
      expect(screen.getAllByTestId("pr-item")).toHaveLength(3);
    });

    // Populate repos first
    await waitFor(() => {
      const select = screen.getByTestId("page-filter-repo") as HTMLSelectElement;
      expect(Array.from(select.options).length).toBeGreaterThan(1);
    });

    // Filter to repo-b (only 1 PR there)
    const repoSelect = screen.getByTestId("page-filter-repo");
    fireEvent.change(repoSelect, { target: { value: "org/repo-b" } });

    await waitFor(() => {
      expect(screen.getAllByTestId("pr-item")).toHaveLength(1);
    });
  });

  it("shows MergeQueue section", async () => {
    setupFetchMock();
    render(<PRsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("merge-queue")).toBeInTheDocument();
    });
  });

  it("shows RecentPRs section", async () => {
    setupFetchMock();
    render(<PRsPage />);
    await waitFor(() => {
      expect(screen.getByText("Recent PRs")).toBeInTheDocument();
    });
  });
});
