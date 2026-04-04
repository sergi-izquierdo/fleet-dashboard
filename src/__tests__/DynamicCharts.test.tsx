import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";

// Mock all recharts components to avoid canvas issues in JSDOM
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-bar-chart">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-line-chart">{children}</div>
  ),
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-composed-chart">{children}</div>
  ),
  Bar: () => <div />,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CartesianGrid: () => <div />,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

// Mock all chart components to verify dynamic imports resolve them
vi.mock("@/components/CostTimeline", () => ({
  default: () => <div data-testid="cost-timeline" />,
}));
vi.mock("@/components/CostByProject", () => ({
  default: () => <div data-testid="cost-by-project" />,
}));
vi.mock("@/components/CostAnalytics", () => ({
  default: () => <div data-testid="cost-analytics" />,
}));
vi.mock("@/components/PRTrendChart", () => ({
  default: () => <div data-testid="pr-trend-chart" />,
}));
vi.mock("@/components/PRVelocityChart", () => ({
  default: () => <div data-testid="pr-velocity-chart" />,
}));
vi.mock("@/components/TokenUsageDashboard", () => ({
  default: () => <div data-testid="token-usage-dashboard" />,
}));

describe("DynamicCharts", () => {
  afterEach(() => {
    cleanup();
  });

  it("DynamicCostTimeline renders the underlying component", async () => {
    const { DynamicCostTimeline } = await import("@/components/DynamicCharts");
    render(<DynamicCostTimeline />);
    await waitFor(() => {
      expect(screen.getByTestId("cost-timeline")).toBeInTheDocument();
    });
  });

  it("DynamicCostByProject renders the underlying component", async () => {
    const { DynamicCostByProject } = await import("@/components/DynamicCharts");
    render(<DynamicCostByProject />);
    await waitFor(() => {
      expect(screen.getByTestId("cost-by-project")).toBeInTheDocument();
    });
  });

  it("DynamicCostAnalytics renders the underlying component", async () => {
    const { DynamicCostAnalytics } = await import("@/components/DynamicCharts");
    render(<DynamicCostAnalytics />);
    await waitFor(() => {
      expect(screen.getByTestId("cost-analytics")).toBeInTheDocument();
    });
  });

  it("DynamicPRTrendChart renders the underlying component", async () => {
    const { DynamicPRTrendChart } = await import("@/components/DynamicCharts");
    render(<DynamicPRTrendChart />);
    await waitFor(() => {
      expect(screen.getByTestId("pr-trend-chart")).toBeInTheDocument();
    });
  });

  it("DynamicPRVelocityChart renders the underlying component", async () => {
    const { DynamicPRVelocityChart } = await import("@/components/DynamicCharts");
    render(<DynamicPRVelocityChart />);
    await waitFor(() => {
      expect(screen.getByTestId("pr-velocity-chart")).toBeInTheDocument();
    });
  });

  it("DynamicTokenUsageDashboard renders the underlying component", async () => {
    const { DynamicTokenUsageDashboard } = await import("@/components/DynamicCharts");
    render(<DynamicTokenUsageDashboard />);
    await waitFor(() => {
      expect(screen.getByTestId("token-usage-dashboard")).toBeInTheDocument();
    });
  });
});
