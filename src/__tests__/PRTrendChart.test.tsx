import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import PRTrendChart from "@/components/PRTrendChart";
import type { PRTrendDay } from "@/app/api/pr-trends/route";

// Mock recharts to avoid canvas/SVG issues in JSDOM
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-bar-chart">{children}</div>
  ),
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CartesianGrid: () => <div />,
}));

function makeTrends(overrides: Partial<PRTrendDay>[] = []): PRTrendDay[] {
  const days: PRTrendDay[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date("2026-03-25");
    d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  for (let i = 0; i < overrides.length && i < days.length; i++) {
    Object.assign(days[i], overrides[i]);
  }
  return days;
}

describe("PRTrendChart", () => {
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
    render(<PRTrendChart />);
    expect(screen.getByTestId("pr-trend-loading")).toBeInTheDocument();
  });

  it("renders the chart after data loads", async () => {
    const trends = makeTrends([{ count: 3 }, { count: 1 }]);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => trends,
    });

    render(<PRTrendChart />);

    await waitFor(() => {
      expect(screen.getByTestId("pr-trend-chart-container")).toBeInTheDocument();
    });
    expect(screen.getByTestId("mock-bar-chart")).toBeInTheDocument();
  });

  it("shows total merge count", async () => {
    const trends = makeTrends([{ count: 3 }, { count: 2 }]);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => trends,
    });

    render(<PRTrendChart />);

    await waitFor(() => {
      expect(screen.getByTestId("pr-trend-total")).toBeInTheDocument();
    });
    expect(screen.getByTestId("pr-trend-total").textContent).toBe("5");
  });

  it("shows peak day count when data has merges", async () => {
    const trends = makeTrends([{ count: 4 }, { count: 2 }, { count: 1 }]);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => trends,
    });

    render(<PRTrendChart />);

    await waitFor(() => {
      expect(screen.getByTestId("pr-trend-peak")).toBeInTheDocument();
    });
    expect(screen.getByTestId("pr-trend-peak").textContent).toBe("4");
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<PRTrendChart />);

    await waitFor(() => {
      expect(screen.getByTestId("pr-trend-error")).toBeInTheDocument();
    });
  });

  it("handles empty trends array", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<PRTrendChart />);

    await waitFor(() => {
      expect(screen.getByTestId("pr-trend-chart-container")).toBeInTheDocument();
    });
  });

  it("renders the heading text", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => makeTrends(),
    });

    render(<PRTrendChart />);

    await waitFor(() => {
      expect(screen.getByText("PR Merge Trends")).toBeInTheDocument();
    });
  });
});
