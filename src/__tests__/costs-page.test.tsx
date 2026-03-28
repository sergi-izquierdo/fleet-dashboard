import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import CostAnalytics from "@/components/CostAnalytics";
import type { TokenUsageResponse } from "@/types/tokenUsage";

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

const mockData: TokenUsageResponse = {
  timeSeries: [
    {
      date: "2026-03-21",
      inputTokens: 200000,
      outputTokens: 50000,
      totalTokens: 250000,
      cost: 1.35,
    },
  ],
  byProject: [
    {
      name: "claude-sonnet-4-5",
      inputTokens: 500000,
      outputTokens: 150000,
      totalTokens: 650000,
      cost: 3.75,
    },
    {
      name: "claude-haiku-4-5",
      inputTokens: 100000,
      outputTokens: 30000,
      totalTokens: 130000,
      cost: 0.75,
    },
  ],
  totalCost: 4.5,
  totalTokens: 780000,
  source: "observability",
};

const emptyData: TokenUsageResponse = {
  timeSeries: [],
  byProject: [],
  totalCost: 0,
  totalTokens: 0,
  source: "empty",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  global.fetch = vi.fn();
});

describe("CostAnalytics", () => {
  it("renders the component container", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostAnalytics />);
    });

    expect(screen.getByTestId("cost-analytics")).toBeInTheDocument();
  });

  it("shows time range selector with Last 24h, Last 7d, Last 30d options", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostAnalytics />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("range-24h")).toBeInTheDocument();
      expect(screen.getByTestId("range-7d")).toBeInTheDocument();
      expect(screen.getByTestId("range-30d")).toBeInTheDocument();
    });

    expect(screen.getByTestId("range-24h")).toHaveTextContent("Last 24h");
    expect(screen.getByTestId("range-7d")).toHaveTextContent("Last 7d");
    expect(screen.getByTestId("range-30d")).toHaveTextContent("Last 30d");
  });

  it("defaults to 7d time range", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostAnalytics />);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("range=7d")
      );
    });
  });

  it("shows empty state when no data available", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostAnalytics />);
    });

    await waitFor(() => {
      expect(screen.getByText("No cost data available")).toBeInTheDocument();
    });
  });

  it("shows total spend card with cost data", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    await act(async () => {
      render(<CostAnalytics />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("total-spend-card")).toBeInTheDocument();
    });

    expect(screen.getAllByText("$4.50").length).toBeGreaterThan(0);
    expect(screen.getByText("Total Spend")).toBeInTheDocument();
    expect(screen.getAllByText("Total Tokens").length).toBeGreaterThan(0);
  });

  it("renders cost by project chart", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    await act(async () => {
      render(<CostAnalytics />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("cost-by-project-chart")).toBeInTheDocument();
    });

    expect(screen.getByText("Cost by Project")).toBeInTheDocument();
  });

  it("renders cost per agent table with agent rows", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    await act(async () => {
      render(<CostAnalytics />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("cost-per-agent-table")).toBeInTheDocument();
    });

    expect(screen.getByText("Cost per Agent")).toBeInTheDocument();
    const rows = screen.getAllByTestId("agent-cost-row");
    expect(rows).toHaveLength(2);
  });

  it("displays agent names, tokens, and costs in table", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    await act(async () => {
      render(<CostAnalytics />);
    });

    await waitFor(() => {
      expect(screen.getByText("claude-sonnet-4-5")).toBeInTheDocument();
      expect(screen.getByText("claude-haiku-4-5")).toBeInTheDocument();
    });
  });

  it("shows table column headers", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    await act(async () => {
      render(<CostAnalytics />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("cost-per-agent-table")).toBeInTheDocument();
    });
    const table = screen.getByTestId("cost-per-agent-table");
    expect(table.textContent).toContain("Agent / Model");
    expect(table.textContent).toContain("Input Tokens");
    expect(table.textContent).toContain("Output Tokens");
    expect(table.textContent).toContain("Est. Cost");
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    await act(async () => {
      render(<CostAnalytics />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("cost-analytics-error")).toBeInTheDocument();
    });
  });

  it("fetches new data when time range changes", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostAnalytics />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("range-24h")).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByTestId("range-24h").click();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("range=24h")
      );
    });
  });
});
