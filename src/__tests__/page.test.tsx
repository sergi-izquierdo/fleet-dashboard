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

const mockServicesData = {
  services: [
    { name: "fleet-orchestrator", status: "active", statusText: "active" },
    { name: "fleet-dashboard", status: "active", statusText: "active" },
  ],
  timestamp: new Date().toISOString(),
};

const mockIssuesData = {
  repos: [
    {
      repo: "sergi-izquierdo/fleet-dashboard",
      total: 10,
      open: 4,
      closed: 6,
      percentComplete: 60,
      labels: { queued: 1, inProgress: 2, cloud: 1, done: 6 },
    },
  ],
  overall: {
    total: 10,
    open: 4,
    closed: 6,
    percentComplete: 60,
    labels: { queued: 1, inProgress: 2, cloud: 1, done: 6 },
  },
};

const mockDispatcherData = {
  offline: true,
  cycle: { startedAt: "", finishedAt: "", durationMs: 0, nextRunAt: "", consecutiveErrors: 0, errors: [] },
  rateLimit: { remaining: 5000, limit: 5000, level: "ok", resetAt: "" },
  phases: {},
  prPipeline: [],
  activeAgents: [],
  completedAgents: [],
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
          json: async () => mockServicesData,
        });
      }
      if (url.includes("/api/issues")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockIssuesData,
        });
      }
      if (url.includes("/api/dispatcher-status")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDispatcherData,
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
            source: "mock",
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
    expect(screen.getByText(/active agents/i)).toBeInTheDocument();
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

      // Advance past the 30s refresh interval to trigger the next fetch
      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });

      // The error alert is rendered alongside existing data
      await waitFor(() => {
        expect(screen.getByTestId("error-banner")).toBeInTheDocument();
      });
      expect(screen.getByTestId("error-banner").textContent).toMatch(/network error/i);
    } finally {
      vi.useRealTimers();
    }
  });
});
