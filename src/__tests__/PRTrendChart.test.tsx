import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import PRTrendChart from "@/components/PRTrendChart";
import type { PRTrendResponse } from "@/app/api/pr-trend/route";

// Mock recharts to avoid canvas/SVG issues in JSDOM
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-bar-chart">{children}</div>
  ),
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CartesianGrid: () => <div />,
}));

const today = new Date().toISOString().slice(0, 10);

function buildMockData(overrides?: Partial<PRTrendResponse>): PRTrendResponse {
  const dates: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return {
    repos: ["fleet-dashboard", "synapse-notes"],
    data: dates.map((date) => ({
      date,
      "fleet-dashboard": date === today ? 2 : 0,
      "synapse-notes": date === today ? 1 : 0,
    })),
    ...overrides,
  };
}

describe("PRTrendChart", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => buildMockData(),
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the chart container", async () => {
    await act(async () => {
      render(<PRTrendChart />);
    });

    expect(screen.getByTestId("pr-trend-chart")).toBeDefined();
  });

  it("renders the chart title", async () => {
    await act(async () => {
      render(<PRTrendChart />);
    });

    await waitFor(() => {
      expect(screen.getByText("PR Merges per Day")).toBeDefined();
    });
  });

  it("shows loading skeleton before data loads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Promise(() => {})) // never resolves
    );

    await act(async () => {
      render(<PRTrendChart />);
    });

    expect(screen.getByTestId("pr-trend-skeleton")).toBeDefined();
  });

  it("renders bar chart after data loads", async () => {
    await act(async () => {
      render(<PRTrendChart />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("pr-trend-bar-chart")).toBeDefined();
    });
  });

  it("shows error message on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })
    );

    await act(async () => {
      render(<PRTrendChart />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("pr-trend-error")).toBeDefined();
    });
  });

  it("shows empty state when no data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], repos: [] } satisfies PRTrendResponse),
      })
    );

    await act(async () => {
      render(<PRTrendChart />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("pr-trend-empty")).toBeDefined();
    });
  });
});
