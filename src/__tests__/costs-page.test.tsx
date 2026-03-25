import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import CostsPage from "@/app/costs/page";
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
      date: "2026-03-20",
      inputTokens: 500000,
      outputTokens: 150000,
      totalTokens: 650000,
      cost: 3.75,
    },
  ],
  byProject: [
    {
      name: "fleet-dashboard",
      inputTokens: 800000,
      outputTokens: 200000,
      totalTokens: 1000000,
      cost: 6.0,
    },
    {
      name: "cardmarket-wizard",
      inputTokens: 200000,
      outputTokens: 50000,
      totalTokens: 250000,
      cost: 1.5,
    },
  ],
  totalCost: 7.5,
  totalTokens: 1250000,
  source: "observability",
};

describe("CostsPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the page heading h1", async () => {
    await act(async () => {
      render(<CostsPage />);
    });

    const headings = screen.getAllByText("Cost & Token Usage");
    const h1 = headings.find((el) => el.tagName === "H1");
    expect(h1).toBeDefined();
  });

  it("renders KPI summary cards", async () => {
    await act(async () => {
      render(<CostsPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("costs-kpi-cards")).toBeDefined();
      expect(screen.getByTestId("kpi-total-tokens")).toBeDefined();
      expect(screen.getByTestId("kpi-estimated-cost")).toBeDefined();
      expect(screen.getByTestId("kpi-input-tokens")).toBeDefined();
      expect(screen.getByTestId("kpi-output-tokens")).toBeDefined();
    });
  });

  it("displays correct KPI values from token usage data", async () => {
    await act(async () => {
      render(<CostsPage />);
    });

    await waitFor(() => {
      // totalTokens = 1,250,000 → "1.3M"
      expect(screen.getByTestId("kpi-total-tokens").textContent).toContain("1.3M");
      // totalCost = 7.5 → "$7.50"
      expect(screen.getByTestId("kpi-estimated-cost").textContent).toContain("$7.50");
      // inputTokens = 800000 + 200000 = 1,000,000 → "1.0M"
      expect(screen.getByTestId("kpi-input-tokens").textContent).toContain("1.0M");
      // outputTokens = 200000 + 50000 = 250,000 → "250.0K"
      expect(screen.getByTestId("kpi-output-tokens").textContent).toContain("250.0K");
    });
  });

  it("renders the TokenUsageDashboard charts section", async () => {
    await act(async () => {
      render(<CostsPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("token-usage-dashboard")).toBeDefined();
    });
  });

  it("does not show duplicate stats inside TokenUsageDashboard when showStats=false", async () => {
    await act(async () => {
      render(<CostsPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("costs-kpi-cards")).toBeDefined();
    });

    // TokenUsageDashboard is rendered with showStats=false so no internal stats block
    expect(screen.queryByTestId("token-usage-stats")).toBeNull();
  });

  it("renders cost-per-project breakdown table via TokenUsageDashboard", async () => {
    await act(async () => {
      render(<CostsPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("cost-table")).toBeDefined();
      const rows = screen.getAllByTestId("cost-row");
      expect(rows).toHaveLength(2);
    });
  });

  it("shows project names and costs in the breakdown table", async () => {
    await act(async () => {
      render(<CostsPage />);
    });

    await waitFor(() => {
      // project names appear in cost-table (from TokenUsageDashboard)
      const projectCells = screen.getAllByText("fleet-dashboard");
      expect(projectCells.length).toBeGreaterThan(0);
      const projectCells2 = screen.getAllByText("cardmarket-wizard");
      expect(projectCells2.length).toBeGreaterThan(0);
    });
  });

  it("shows loading skeletons before data loads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Promise(() => {})) // never resolves
    );

    await act(async () => {
      render(<CostsPage />);
    });

    expect(screen.getByTestId("costs-kpi-cards")).toBeDefined();
    // KPI cards are not rendered yet (skeletons shown instead)
    expect(screen.queryByTestId("kpi-total-tokens")).toBeNull();
  });
});
