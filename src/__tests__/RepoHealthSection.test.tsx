import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import RepoHealthSection from "@/components/RepoHealthSection";
import type { RepoHealthData } from "@/lib/repoHealth";

vi.mock("@/components/CreateIssueDialog", () => ({
  CreateIssueDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-issue-dialog" /> : null,
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeHealthData(overrides: Partial<RepoHealthData> = {}): RepoHealthData {
  return {
    repo: "owner/repo",
    openIssues: 5,
    prsMerged7d: 2,
    failedAgents7d: 0,
    avgMergeTimeMinutes: 60,
    healthScore: 70,
    ...overrides,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.clearAllTimers();
});

afterEach(() => {
  cleanup();
});

describe("RepoHealthSection", () => {
  it("renders loading skeleton initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<RepoHealthSection />);
    expect(screen.getByTestId("repo-health-loading")).toBeInTheDocument();
  });

  it("renders repo health list after data loads", async () => {
    const data = [
      makeHealthData({ repo: "owner/repo-a", healthScore: 80, prsMerged7d: 3 }),
      makeHealthData({ repo: "owner/repo-b", healthScore: 40, prsMerged7d: 1, failedAgents7d: 2 }),
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });

    render(<RepoHealthSection />);

    await waitFor(() => {
      expect(screen.getByTestId("repo-health-section")).toBeInTheDocument();
    });

    // Should show scorecard section with both repos
    expect(screen.getByTestId("repo-health-list")).toBeInTheDocument();
    const allRows = screen.getAllByTestId("repo-health-row");
    expect(allRows.length).toBeGreaterThanOrEqual(2);
  });

  it("shows all-healthy state when all repos score >= 50 and have activity", async () => {
    const data = [
      makeHealthData({ repo: "owner/repo-a", healthScore: 80, prsMerged7d: 3 }),
      makeHealthData({ repo: "owner/repo-b", healthScore: 75, prsMerged7d: 1 }),
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });

    render(<RepoHealthSection />);

    await waitFor(() => {
      expect(screen.getByTestId("all-healthy")).toBeInTheDocument();
    });
  });

  it("shows needs-attention list when repos have low score", async () => {
    const data = [
      makeHealthData({ repo: "owner/low-score", healthScore: 30, prsMerged7d: 1, failedAgents7d: 2 }),
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });

    render(<RepoHealthSection />);

    await waitFor(() => {
      expect(screen.getByTestId("needs-attention-list")).toBeInTheDocument();
    });
  });

  it("shows needs-attention for repos with no activity (0 merged, 0 failed)", async () => {
    const data = [
      makeHealthData({ repo: "owner/inactive", healthScore: 50, prsMerged7d: 0, failedAgents7d: 0 }),
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });

    render(<RepoHealthSection />);

    await waitFor(() => {
      expect(screen.getByTestId("needs-attention-list")).toBeInTheDocument();
    });

    const noActivityLabels = screen.getAllByText("no activity");
    expect(noActivityLabels.length).toBeGreaterThan(0);
  });

  it("renders health badges with correct score", async () => {
    const data = [makeHealthData({ healthScore: 75, prsMerged7d: 2 })];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });

    render(<RepoHealthSection />);

    await waitFor(() => {
      const badges = screen.getAllByTestId("health-badge");
      expect(badges.length).toBeGreaterThan(0);
      // At least one badge should show the score value
      const badgeTexts = badges.map((b) => b.textContent ?? "");
      expect(badgeTexts.some((t) => t.includes("75"))).toBe(true);
    });
  });

  it("renders silently (returns null) on fetch error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { container } = render(<RepoHealthSection />);

    await waitFor(() => {
      // Loading skeleton disappears and nothing renders
      expect(container.innerHTML).toBe("");
    });
  });
});
