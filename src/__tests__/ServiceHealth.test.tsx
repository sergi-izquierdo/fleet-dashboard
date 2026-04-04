import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import ServiceHealth from "@/components/ServiceHealth";
import type { ServicesResponse } from "@/app/api/services/route";
import * as apiCache from "@/lib/apiCache";

const mockServicesData: ServicesResponse = {
  services: [
    { name: "fleet-orchestrator", status: "active", statusText: "active", uptime: "1h", restartCount: 0 },
    { name: "fleet-telegram", status: "inactive", statusText: "inactive", uptime: null, restartCount: null },
    { name: "fleet-dashboard", status: "active", statusText: "active", uptime: "2h", restartCount: 0 },
    { name: "fleet-obs-server", status: "failed", statusText: "failed", uptime: null, restartCount: 2 },
    { name: "fleet-obs-client", status: "active", statusText: "active", uptime: "30m", restartCount: 0 },
    { name: "fleet-auto-accept", status: "unknown", statusText: "unknown", uptime: null, restartCount: null },
  ],
  timestamp: new Date().toISOString(),
};

describe("ServiceHealth", () => {
  beforeEach(() => {
    apiCache.clear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockServicesData,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading skeletons initially", () => {
    render(<ServiceHealth />);
    expect(screen.getByTestId("service-health-loading")).toBeInTheDocument();
  });

  it("renders all services after loading", async () => {
    render(<ServiceHealth />);
    await waitFor(() => {
      expect(screen.getByTestId("service-health-list")).toBeInTheDocument();
    });
    for (const service of mockServicesData.services) {
      expect(screen.getByTestId(`service-row-${service.name}`)).toBeInTheDocument();
    }
  });

  it("shows service names", async () => {
    render(<ServiceHealth />);
    await waitFor(() => {
      expect(screen.getByText("fleet-orchestrator")).toBeInTheDocument();
    });
    expect(screen.getByText("fleet-telegram")).toBeInTheDocument();
    expect(screen.getByText("fleet-dashboard")).toBeInTheDocument();
    expect(screen.getByText("fleet-obs-server")).toBeInTheDocument();
    expect(screen.getByText("fleet-obs-client")).toBeInTheDocument();
    expect(screen.getByText("fleet-auto-accept")).toBeInTheDocument();
  });

  it("shows active count summary", async () => {
    render(<ServiceHealth />);
    await waitFor(() => {
      expect(screen.getByText(/3\/6 services active/i)).toBeInTheDocument();
    });
  });

  it("renders green indicator for active service", async () => {
    render(<ServiceHealth />);
    await waitFor(() => {
      expect(screen.getByTestId("service-indicator-fleet-orchestrator")).toBeInTheDocument();
    });
    const indicator = screen.getByTestId("service-indicator-fleet-orchestrator");
    expect(indicator.className).toContain("bg-green-500");
  });

  it("renders red indicator for failed service", async () => {
    render(<ServiceHealth />);
    await waitFor(() => {
      expect(screen.getByTestId("service-indicator-fleet-obs-server")).toBeInTheDocument();
    });
    const indicator = screen.getByTestId("service-indicator-fleet-obs-server");
    expect(indicator.className).toContain("bg-red-500");
  });

  it("shows error when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    render(<ServiceHealth />);
    await waitFor(() => {
      expect(screen.getByTestId("service-health-error")).toBeInTheDocument();
    });
  });

  it("shows error when fetch returns non-ok response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });
    render(<ServiceHealth />);
    await waitFor(() => {
      expect(screen.getByTestId("service-health-error")).toBeInTheDocument();
    });
  });
});
