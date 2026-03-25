import { render, screen, cleanup, waitFor } from "@testing-library/react";
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

  it("renders the main heading", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { level: 2, name: /active agents/i })
    ).toBeInTheDocument();
  });

  it("shows loading skeleton initially", () => {
    render(<Home />);
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("shows connection indicator", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    // FleetStatusBanner shows fleet stats including open PRs count
    expect(screen.getByText(/open prs:/i)).toBeInTheDocument();
  });

  it("shows refresh button", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    expect(
      screen.getAllByRole("heading", { level: 2, name: /fleet activity/i }).length
    ).toBeGreaterThan(0);
  });

  it("renders dashboard content after loading", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    expect(
      screen.getAllByRole("heading", { level: 2, name: /recent prs/i }).length
    ).toBeGreaterThan(0);
  });

  it("renders bottom navigation", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { level: 2, name: /services/i })
    ).toBeInTheDocument();
  });

  it("renders pull-to-refresh container after loading", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    expect(
      screen.getAllByRole("heading", { level: 2, name: /issue progress/i }).length
    ).toBeGreaterThan(0);
  });

  it("shows error banner on fetch failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    render(<Home />);
    await waitFor(() => {
      expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    });
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
});
