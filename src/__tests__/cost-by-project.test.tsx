import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import CostByProject from "@/components/CostByProject";
import type { CostsByProjectResponse } from "@/types/costsByProject";

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

const mockData: CostsByProjectResponse = {
  projects: [
    {
      name: "fleet-dashboard",
      sessionCount: 5,
      transcriptLines: 500,
      lastActive: "2026-04-01T10:00:00Z",
    },
    {
      name: "cardmarket",
      sessionCount: 2,
      transcriptLines: 150,
      lastActive: "2026-03-30T08:00:00Z",
    },
  ],
  period: "7d",
};

const emptyData: CostsByProjectResponse = {
  projects: [],
  period: "7d",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  global.fetch = vi.fn();
});

describe("CostByProject", () => {
  it("renders the component container", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostByProject />);
    });

    expect(screen.getByTestId("cost-by-project")).toBeInTheDocument();
  });

  it("shows period toggle with Last 7 days and All time options", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostByProject />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("period-7d")).toBeInTheDocument();
      expect(screen.getByTestId("period-all")).toBeInTheDocument();
    });

    expect(screen.getByTestId("period-7d")).toHaveTextContent("Last 7 days");
    expect(screen.getByTestId("period-all")).toHaveTextContent("All time");
  });

  it("shows empty state when no projects available", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostByProject />);
    });

    await waitFor(() => {
      expect(
        screen.getByText("No project activity data available")
      ).toBeInTheDocument();
    });
  });

  it("renders chart and table when data is available", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    await act(async () => {
      render(<CostByProject />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("cost-by-project-chart")).toBeInTheDocument();
      expect(screen.getByTestId("cost-by-project-table")).toBeInTheDocument();
    });
  });

  it("renders project rows in the table", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    await act(async () => {
      render(<CostByProject />);
    });

    await waitFor(() => {
      const rows = screen.getAllByTestId("project-cost-row");
      expect(rows).toHaveLength(2);
    });

    expect(screen.getByText("fleet-dashboard")).toBeInTheDocument();
    expect(screen.getByText("cardmarket")).toBeInTheDocument();
  });

  it("shows table column headers", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    await act(async () => {
      render(<CostByProject />);
    });

    await waitFor(() => {
      const table = screen.getByTestId("cost-by-project-table");
      expect(table.textContent).toContain("Project");
      expect(table.textContent).toContain("Sessions");
      expect(table.textContent).toContain("Transcript Lines");
      expect(table.textContent).toContain("Last Active");
    });
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    await act(async () => {
      render(<CostByProject />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("cost-by-project-error")).toBeInTheDocument();
    });
  });

  it("fetches new data when period changes", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostByProject />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("period-all")).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByTestId("period-all").click();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("period=all")
      );
    });
  });

  it("defaults to 7d period on initial load", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostByProject />);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("period=7d")
      );
    });
  });
});
