import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import SystemHealthCard from "@/components/SystemHealthCard";
import type { SystemHealthResponse } from "@/app/api/system-health/route";

const mockHealthData: SystemHealthResponse = {
  disk: { label: "Disk", usedLabel: "42 GB / 100 GB", percent: 42 },
  memory: { label: "Memory", usedLabel: "6.2 GB / 16.0 GB", percent: 75 },
  cpu: { label: "CPU", usedLabel: "92% load", percent: 92 },
  timestamp: new Date().toISOString(),
};

describe("SystemHealthCard", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealthData,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading skeletons initially", () => {
    render(<SystemHealthCard />);
    expect(screen.getByTestId("system-health-loading")).toBeInTheDocument();
  });

  it("renders all 3 metrics after loading", async () => {
    render(<SystemHealthCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-health")).toBeInTheDocument();
    });
    expect(screen.getByTestId("metric-disk")).toBeInTheDocument();
    expect(screen.getByTestId("metric-memory")).toBeInTheDocument();
    expect(screen.getByTestId("metric-cpu")).toBeInTheDocument();
  });

  it("shows correct percentages for each metric", async () => {
    render(<SystemHealthCard />);
    await waitFor(() => {
      expect(screen.getByTestId("metric-disk-percent")).toHaveTextContent("42%");
    });
    expect(screen.getByTestId("metric-memory-percent")).toHaveTextContent("75%");
    expect(screen.getByTestId("metric-cpu-percent")).toHaveTextContent("92%");
  });

  it("shows green color for disk at 42% (below 70%)", async () => {
    render(<SystemHealthCard />);
    await waitFor(() => {
      expect(screen.getByTestId("metric-disk-bar")).toBeInTheDocument();
    });
    expect(screen.getByTestId("metric-disk-bar")).toHaveClass("bg-green-500");
  });

  it("shows yellow color for memory at 75% (70-90%)", async () => {
    render(<SystemHealthCard />);
    await waitFor(() => {
      expect(screen.getByTestId("metric-memory-bar")).toBeInTheDocument();
    });
    expect(screen.getByTestId("metric-memory-bar")).toHaveClass("bg-yellow-500");
  });

  it("shows red color for cpu at 92% (above 90%)", async () => {
    render(<SystemHealthCard />);
    await waitFor(() => {
      expect(screen.getByTestId("metric-cpu-bar")).toBeInTheDocument();
    });
    expect(screen.getByTestId("metric-cpu-bar")).toHaveClass("bg-red-500");
  });

  it("shows the actual value label under each bar", async () => {
    render(<SystemHealthCard />);
    await waitFor(() => {
      expect(screen.getByText("42 GB / 100 GB")).toBeInTheDocument();
    });
    expect(screen.getByText("6.2 GB / 16.0 GB")).toBeInTheDocument();
    expect(screen.getByText("92% load")).toBeInTheDocument();
  });

  it("handles null disk metric gracefully", async () => {
    const dataWithNullDisk: SystemHealthResponse = {
      ...mockHealthData,
      disk: null,
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => dataWithNullDisk,
    });
    render(<SystemHealthCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-health")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("metric-disk")).not.toBeInTheDocument();
    expect(screen.getByTestId("metric-memory")).toBeInTheDocument();
    expect(screen.getByTestId("metric-cpu")).toBeInTheDocument();
  });

  it("handles all null metrics gracefully", async () => {
    const allNullData: SystemHealthResponse = {
      disk: null,
      memory: null,
      cpu: null,
      timestamp: new Date().toISOString(),
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => allNullData,
    });
    render(<SystemHealthCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-health-unavailable")).toBeInTheDocument();
    });
  });

  it("shows error state on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<SystemHealthCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-health-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows error state on non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    render(<SystemHealthCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-health-error")).toBeInTheDocument();
    });
  });
});
