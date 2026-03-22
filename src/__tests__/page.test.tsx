import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import Home from "@/app/page";
import { mockDashboardData } from "@/data/mockData";

describe("Home page", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDashboardData,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the main heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: /fleet dashboard/i })
    ).toBeInTheDocument();
  });

  it("shows loading skeleton initially", () => {
    render(<Home />);
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("shows connection indicator", () => {
    render(<Home />);
    expect(screen.getByTestId("connection-indicator")).toBeInTheDocument();
  });

  it("shows refresh button", () => {
    render(<Home />);
    expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
  });

  it("renders agent cards after loading", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
    // agent-alpha appears in both AgentCard and ActivityLog, use getAllByText
    const elements = screen.getAllByText("agent-alpha");
    expect(elements.length).toBeGreaterThan(0);
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
