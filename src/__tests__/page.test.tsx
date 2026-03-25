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
      if (url.includes("/api/fleet-events")) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      if (url.includes("/api/dashboard")) {
        return Promise.resolve({
          ok: true,
          json: async () => testDashboardData,
        });
      }
      // All other component-specific endpoints fail gracefully (no crash)
      return Promise.resolve({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => ({}),
      });
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
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
    // Use fake timers so we can advance past the 30s re-fetch interval
    vi.useFakeTimers();

    // First load succeeds so data is populated
    await act(async () => {
      render(<Home />);
    });

    expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();

    // Simulate subsequent fetch failure for main data only (sessions and fleet-events still work)
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if ((url as string).includes("/api/sessions")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ sessions: [] }),
        });
      }
      if ((url as string).includes("/api/fleet-events")) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      if ((url as string).includes("/api/dashboard")) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => ({}),
      });
    });

    // Advance past the 30s re-fetch interval to trigger a dashboard re-fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31000);
    });

    // The error alert is rendered alongside existing data
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
});
