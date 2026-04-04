import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import FleetActivityHeatmap from "@/components/FleetActivityHeatmap";

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

type MockFetch = ReturnType<typeof vi.fn>;

function makeDays(count = 90) {
  const days = [];
  const now = new Date("2026-04-01T00:00:00Z");
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    days.push({
      date: d.toISOString().slice(0, 10),
      count: 0,
      prs: 0,
      agents: 0,
    });
  }
  return days;
}

describe("FleetActivityHeatmap", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading skeleton initially", () => {
    (global.fetch as MockFetch).mockReturnValue(new Promise(() => {})); // never resolves
    render(<FleetActivityHeatmap />);
    expect(screen.getByTestId("heatmap-loading")).toBeInTheDocument();
  });

  it("shows empty state when no data", async () => {
    (global.fetch as MockFetch).mockResolvedValueOnce({
      json: async () => ({ days: [] }),
    });
    render(<FleetActivityHeatmap />);
    await waitFor(() => {
      expect(screen.getByTestId("heatmap-empty")).toBeInTheDocument();
    });
  });

  it("renders heatmap grid when data is available", async () => {
    const days = makeDays(90);
    (global.fetch as MockFetch).mockResolvedValueOnce({
      json: async () => ({ days }),
    });
    render(<FleetActivityHeatmap />);
    await waitFor(() => {
      expect(screen.getByTestId("fleet-activity-heatmap")).toBeInTheDocument();
    });
  });

  it("renders a cell for a specific date", async () => {
    const days = makeDays(90);
    // Set a known count on a specific date
    const targetIdx = days.findIndex((d) => d.date === "2026-04-01");
    if (targetIdx >= 0) {
      days[targetIdx] = { date: "2026-04-01", count: 7, prs: 2, agents: 5 };
    }
    (global.fetch as MockFetch).mockResolvedValueOnce({
      json: async () => ({ days }),
    });
    render(<FleetActivityHeatmap />);
    await waitFor(() => {
      expect(screen.getByTestId("heatmap-cell-2026-04-01")).toBeInTheDocument();
    });
  });

  it("handles fetch error gracefully by showing error state", async () => {
    (global.fetch as MockFetch).mockResolvedValueOnce({
      json: async () => {
        throw new Error("parse error");
      },
    });
    render(<FleetActivityHeatmap />);
    await waitFor(() => {
      expect(screen.getByTestId("heatmap-error")).toBeInTheDocument();
    });
  });

  it("shows retry button on error", async () => {
    (global.fetch as MockFetch)
      .mockResolvedValueOnce({
        json: async () => {
          throw new Error("network error");
        },
      })
      .mockResolvedValueOnce({
        json: async () => ({ days: [] }),
      });
    render(<FleetActivityHeatmap />);
    await waitFor(() => {
      expect(screen.getByTestId("heatmap-retry")).toBeInTheDocument();
    });
  });
});
