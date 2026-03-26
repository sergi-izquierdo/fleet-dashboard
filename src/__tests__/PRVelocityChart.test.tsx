import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import PRVelocityChart from "@/components/PRVelocityChart";
import type { PRTrendDay } from "@/app/api/pr-trends/route";

// Mock recharts to avoid canvas/SVG issues in JSDOM
vi.mock("recharts", () => ({
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-composed-chart">{children}</div>
  ),
  Bar: () => <div />,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CartesianGrid: () => <div />,
  Legend: () => <div />,
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

describe("PRVelocityChart", () => {
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
    render(<PRVelocityChart />);
    expect(screen.getByTestId("pr-velocity-loading")).toBeInTheDocument();
  });

  it("renders the chart after data loads", async () => {
    const trends = makeTrends([{ count: 3 }, { count: 1 }]);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => trends,
    });

    render(<PRVelocityChart />);

    await waitFor(() => {
      expect(screen.getByTestId("pr-velocity-chart-container")).toBeInTheDocument();
    });
    expect(screen.getByTestId("mock-composed-chart")).toBeInTheDocument();
  });

  it("shows total merge count", async () => {
    const trends = makeTrends([{ count: 3 }, { count: 2 }]);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => trends,
    });

    render(<PRVelocityChart />);

    await waitFor(() => {
      expect(screen.getByTestId("pr-velocity-total")).toBeInTheDocument();
    });
    expect(screen.getByTestId("pr-velocity-total").textContent).toBe("5");
  });

  it("shows avg/day metric", async () => {
    // 14 days, 7 total merges → avg = 0.5
    const trends = makeTrends(
      Array.from({ length: 7 }, () => ({ count: 1 }))
    );
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => trends,
    });

    render(<PRVelocityChart />);

    await waitFor(() => {
      expect(screen.getByTestId("pr-velocity-avg")).toBeInTheDocument();
    });
    expect(screen.getByTestId("pr-velocity-avg").textContent).toBe("0.5");
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<PRVelocityChart />);

    await waitFor(() => {
      expect(screen.getByTestId("pr-velocity-error")).toBeInTheDocument();
    });
  });

  it("handles empty trends array", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<PRVelocityChart />);

    await waitFor(() => {
      expect(screen.getByTestId("pr-velocity-chart-container")).toBeInTheDocument();
    });
  });

  it("shows subtitle text", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => makeTrends(),
    });

    render(<PRVelocityChart />);

    await waitFor(() => {
      expect(
        screen.getByText("PRs merged per day — last 14 days")
      ).toBeInTheDocument();
    });
  });
});
