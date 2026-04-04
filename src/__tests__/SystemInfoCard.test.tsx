import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import SystemInfoCard from "@/components/SystemInfoCard";
import type { SystemInfoResponse } from "@/app/api/system-info/route";

const mockSystemInfo: SystemInfoResponse = {
  nodeVersion: "v20.11.0",
  stateFileSizeBytes: 204800, // 200 KB
  archivedCount: 42,
  dispatcherStartedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
};

describe("SystemInfoCard", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSystemInfo,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    render(<SystemInfoCard />);
    expect(screen.getByTestId("system-info-loading")).toBeInTheDocument();
  });

  it("renders system info after loading", async () => {
    render(<SystemInfoCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-info-card")).toBeInTheDocument();
    });
  });

  it("displays Node.js version", async () => {
    render(<SystemInfoCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-info-node")).toBeInTheDocument();
    });
    expect(screen.getByText("v20.11.0")).toBeInTheDocument();
    expect(screen.getByText("Node.js Version")).toBeInTheDocument();
  });

  it("displays archived entry count", async () => {
    render(<SystemInfoCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-info-archived")).toBeInTheDocument();
    });
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Archived Entries")).toBeInTheDocument();
  });

  it("displays state file size in human-readable format", async () => {
    render(<SystemInfoCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-info-state-size")).toBeInTheDocument();
    });
    // 204800 bytes = 200.0 KB
    expect(screen.getByText("200.0 KB")).toBeInTheDocument();
  });

  it("displays dispatcher uptime label", async () => {
    render(<SystemInfoCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-info-uptime")).toBeInTheDocument();
    });
    expect(screen.getByText("Dispatcher Uptime")).toBeInTheDocument();
  });

  it("shows uptime duration based on dispatcherStartedAt", async () => {
    render(<SystemInfoCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-info-uptime")).toBeInTheDocument();
    });
    // Started 3 hours ago, expect something like "3h Xm"
    const uptimeRow = screen.getByTestId("system-info-uptime");
    expect(uptimeRow.textContent).toMatch(/3h/);
  });

  it("shows dash when stateFileSizeBytes is null", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockSystemInfo, stateFileSizeBytes: null }),
    });
    render(<SystemInfoCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-info-state-size")).toBeInTheDocument();
    });
    const stateSizeRow = screen.getByTestId("system-info-state-size");
    expect(stateSizeRow.textContent).toContain("—");
  });

  it("shows dash when archivedCount is null", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockSystemInfo, archivedCount: null }),
    });
    render(<SystemInfoCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-info-archived")).toBeInTheDocument();
    });
    const archivedRow = screen.getByTestId("system-info-archived");
    expect(archivedRow.textContent).toContain("—");
  });

  it("shows dash when dispatcherStartedAt is null", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockSystemInfo, dispatcherStartedAt: null }),
    });
    render(<SystemInfoCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-info-uptime")).toBeInTheDocument();
    });
    const uptimeRow = screen.getByTestId("system-info-uptime");
    expect(uptimeRow.textContent).toContain("—");
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );
    render(<SystemInfoCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-info-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Failed to load system info")).toBeInTheDocument();
  });

  it("shows error when response is not ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Not found" }),
    });
    render(<SystemInfoCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-info-error")).toBeInTheDocument();
    });
  });

  it("formats bytes under 1KB correctly", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockSystemInfo, stateFileSizeBytes: 512 }),
    });
    render(<SystemInfoCard />);
    await waitFor(() => {
      expect(screen.getByTestId("system-info-state-size")).toBeInTheDocument();
    });
    expect(screen.getByText("512 B")).toBeInTheDocument();
  });
});
