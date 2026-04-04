import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import CostTimeline from "@/components/CostTimeline";
import type { CostsTimelineResponse } from "@/types/costsTimeline";

// Mock recharts
vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-line-chart">{children}</div>
  ),
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

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

const mockData: CostsTimelineResponse = {
  dates: ["2026-04-01", "2026-04-02", "2026-04-03"],
  series: [
    { project: "fleet", data: [2, 3, 1] },
    { project: "cardmarket", data: [0, 1, 2] },
  ],
  days: 7,
  breakdown: [],
};

const emptyData: CostsTimelineResponse = {
  dates: [],
  series: [],
  days: 7,
  breakdown: [],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  global.fetch = vi.fn();
});

describe("CostTimeline", () => {
  it("renders the date range selector buttons", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostTimeline />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("range-7")).toBeInTheDocument();
      expect(screen.getByTestId("range-14")).toBeInTheDocument();
      expect(screen.getByTestId("range-30")).toBeInTheDocument();
      expect(screen.getByTestId("range-0")).toBeInTheDocument();
    });

    expect(screen.getByTestId("range-7")).toHaveTextContent("7 days");
    expect(screen.getByTestId("range-14")).toHaveTextContent("14 days");
    expect(screen.getByTestId("range-30")).toHaveTextContent("30 days");
    expect(screen.getByTestId("range-0")).toHaveTextContent("All time");
  });

  it("defaults to 7-day fetch on mount", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostTimeline />);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("days=7")
      );
    });
  });

  it("shows loading skeleton while fetching", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(<CostTimeline />);
    expect(screen.getByTestId("timeline-skeleton")).toBeInTheDocument();
  });

  it("shows empty state when no series data", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostTimeline />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("timeline-empty")).toBeInTheDocument();
    });
  });

  it("renders chart when data is available", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    await act(async () => {
      render(<CostTimeline />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("timeline-chart")).toBeInTheDocument();
      expect(screen.getByTestId("mock-line-chart")).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    await act(async () => {
      render(<CostTimeline />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("timeline-error")).toBeInTheDocument();
    });
  });

  it("refetches with new days param when range button clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostTimeline />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("range-30")).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByTestId("range-30").click();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("days=30")
      );
    });
  });

  it("renders section heading", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyData,
    });

    await act(async () => {
      render(<CostTimeline />);
    });

    expect(screen.getByText("Session Timeline")).toBeInTheDocument();
  });
});
