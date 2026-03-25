import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import Home from "@/app/page";
import type { DashboardData } from "@/types/dashboard";

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

describe("Home page", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/sessions")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ sessions: [] }),
        });
      }
      if (url.includes("/api/services")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ services: [], timestamp: new Date().toISOString() }),
        });
      }
      if (url.includes("/api/issues")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            repos: [],
            overall: { total: 0, open: 0, closed: 0, percentComplete: 0, labels: { queued: 0, inProgress: 0, cloud: 0, done: 0 } },
          }),
        });
      }
      if (url.includes("/api/dispatcher-status")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ offline: true }),
        });
      }
      if (url.includes("/api/fleet-events")) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      if (url.includes("/api/token-usage")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            timeSeries: [],
            byProject: [],
            totalCost: 0,
            totalTokens: 0,
            source: "mock" as const,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => testDashboardData,
      });
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading skeleton initially", () => {
    render(<Home />);
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders dashboard content after loading", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    // Page renders fleet status banner with agent/PR counts
    expect(screen.getByText(/active:/i)).toBeInTheDocument();
  });

  it("renders fleet status section headers after loading", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Active Agents" })).toBeInTheDocument();
  });

  it("renders open PRs info after loading", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/open prs:/i)).toBeInTheDocument();
  });

  it("renders CI failing info after loading", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/ci failing:/i)).toBeInTheDocument();
  });

  it("shows error alert when fetch fails but prior data exists", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    try {
      // First load succeeds so data is populated
      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
      });

      // Simulate subsequent fetch failure with data already loaded
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      // Advance past the 30-second auto-refresh timer in useDashboardData
      await act(async () => {
        vi.advanceTimersByTime(31000);
        // Flush pending promises from the fetch → catch → setError chain
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // The error banner is rendered alongside existing data
      expect(screen.getByTestId("error-banner")).toBeInTheDocument();
      expect(screen.getByTestId("error-banner").textContent).toMatch(/network error/i);
    } finally {
      vi.useRealTimers();
    }
  });
});
