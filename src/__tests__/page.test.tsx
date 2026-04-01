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

const testServicesData = {
  services: [
    { name: "fleet-orchestrator", status: "active", statusText: "active" },
    { name: "fleet-dashboard", status: "active", statusText: "active" },
  ],
  timestamp: new Date().toISOString(),
};

const testIssuesData = {
  repos: [
    {
      repo: "sergi-izquierdo/fleet-dashboard",
      total: 10,
      open: 4,
      closed: 6,
      percentComplete: 60,
      labels: { queued: 1, inProgress: 1, cloud: 1, done: 6 },
    },
  ],
  overall: {
    total: 10,
    open: 4,
    closed: 6,
    percentComplete: 60,
    labels: { queued: 1, inProgress: 1, cloud: 1, done: 6 },
  },
};

const testDispatcherData = {
  offline: true,
};

const testTokenUsageData = {
  timeSeries: [],
  byProject: [],
  totalCost: 0,
  totalTokens: 0,
  source: "mock" as const,
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
          json: async () => testServicesData,
        });
      }
      if (url.includes("/api/issues")) {
        return Promise.resolve({
          ok: true,
          json: async () => testIssuesData,
        });
      }
      if (url.includes("/api/dispatcher-status")) {
        return Promise.resolve({
          ok: true,
          json: async () => testDispatcherData,
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
          json: async () => testTokenUsageData,
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
    expect(screen.getByRole("heading", { name: /active agents/i })).toBeInTheDocument();
  });

  it("renders open PRs info after loading", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/prs:/i)).toBeInTheDocument();
  });

  it("renders CI failing info after loading", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/ci fail:/i)).toBeInTheDocument();
  });

  it("shows error banner when fetch fails initially", async () => {
    // Change mock to reject before rendering so initial fetch fails
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    render(<Home />);

    // The error banner appears when initial fetch fails with no prior data
    await waitFor(() => {
      expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    });
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
});
