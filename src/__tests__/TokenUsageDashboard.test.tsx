import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import TokenUsageDashboard from "@/components/TokenUsageDashboard";
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
      inputTokens: 100000,
      outputTokens: 30000,
      totalTokens: 130000,
      cost: 0.75,
    },
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
      name: "agent-1",
      inputTokens: 500000,
      outputTokens: 150000,
      totalTokens: 650000,
      cost: 3.75,
    },
    {
      name: "agent-2",
      inputTokens: 300000,
      outputTokens: 100000,
      totalTokens: 400000,
      cost: 2.4,
    },
  ],
  totalCost: 6.15,
  totalTokens: 1050000,
  source: "langfuse",
};

describe("TokenUsageDashboard", () => {
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

  it("renders the dashboard title", async () => {
    await act(async () => {
      render(<TokenUsageDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText("Cost & Token Usage")).toBeDefined();
    });
  });

  it("renders time range buttons", async () => {
    await act(async () => {
      render(<TokenUsageDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("range-daily")).toBeDefined();
      expect(screen.getByTestId("range-weekly")).toBeDefined();
      expect(screen.getByTestId("range-monthly")).toBeDefined();
    });
  });

  it("shows loading skeleton before data loads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () => new Promise(() => {}) // never resolves
      )
    );

    await act(async () => {
      render(<TokenUsageDashboard />);
    });

    expect(screen.getByTestId("token-usage-skeleton")).toBeDefined();
  });

  it("renders summary stats after data loads", async () => {
    await act(async () => {
      render(<TokenUsageDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("token-usage-stats")).toBeDefined();
      expect(screen.getByText("Total Tokens")).toBeDefined();
      expect(screen.getByText("Estimated Cost")).toBeDefined();
    });
  });

  it("renders cost table with project rows", async () => {
    await act(async () => {
      render(<TokenUsageDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("cost-table")).toBeDefined();
      const rows = screen.getAllByTestId("cost-row");
      expect(rows).toHaveLength(2);
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
      render(<TokenUsageDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("token-usage-error")).toBeDefined();
    });
  });

  it("shows Langfuse offline banner when source is mock", async () => {
    const mockDataOffline: TokenUsageResponse = { ...mockData, source: "mock" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockDataOffline,
      })
    );

    await act(async () => {
      render(<TokenUsageDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("langfuse-offline")).toBeDefined();
      expect(screen.getByText(/Langfuse offline/)).toBeDefined();
    });
  });

  it("does not show offline banner when source is langfuse", async () => {
    await act(async () => {
      render(<TokenUsageDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("token-usage-stats")).toBeDefined();
    });

    expect(screen.queryByTestId("langfuse-offline")).toBeNull();
  });

  it("changes range when buttons are clicked", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(<TokenUsageDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("range-weekly")).toBeDefined();
    });

    await act(async () => {
      screen.getByTestId("range-weekly").click();
    });

    await waitFor(() => {
      const calls = fetchMock.mock.calls;
      const weeklyCall = calls.find(
        (c: string[]) => typeof c[0] === "string" && c[0].includes("range=weekly")
      );
      expect(weeklyCall).toBeDefined();
    });
  });
});
