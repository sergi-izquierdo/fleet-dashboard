import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import ServiceHealth from "@/components/ServiceHealth";
import type { ServicesResponse } from "@/app/api/services/route";
import type { FleetDataContextValue } from "@/providers/FleetDataProvider";

vi.mock("@/providers/FleetDataProvider", () => ({
  useFleetData: vi.fn(),
}));

import { useFleetData } from "@/providers/FleetDataProvider";

const mockServicesData: ServicesResponse = {
  services: [
    { name: "fleet-orchestrator", status: "active", statusText: "active" },
    { name: "fleet-telegram", status: "inactive", statusText: "inactive" },
    { name: "fleet-dashboard", status: "active", statusText: "active" },
    { name: "fleet-obs-server", status: "failed", statusText: "failed" },
    { name: "fleet-obs-client", status: "active", statusText: "active" },
    { name: "fleet-auto-accept", status: "unknown", statusText: "unknown" },
  ],
  timestamp: new Date().toISOString(),
};

const defaultContext: FleetDataContextValue = {
  dashboardData: null, dashboardLoading: false, dashboardError: null,
  fleetState: null, fleetStateLoading: false, fleetStateError: null,
  dispatcherStatus: null, dispatcherLoading: false, dispatcherError: null,
  servicesData: null, servicesLoading: false, servicesError: null,
  prs: [], prsLoading: false, prsError: null,
  sessions: [], sessionsLoading: false, sessionsError: null,
  issueProgress: null, issueProgressLoading: false, issueProgressError: null,
};

describe("ServiceHealth", () => {
  beforeEach(() => {
    vi.mocked(useFleetData).mockReturnValue({
      ...defaultContext,
      servicesData: mockServicesData,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading skeletons initially", () => {
    vi.mocked(useFleetData).mockReturnValue({ ...defaultContext, servicesLoading: true });
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

  it("shows error when context has error", async () => {
    vi.mocked(useFleetData).mockReturnValue({
      ...defaultContext,
      servicesData: null,
      servicesError: "Network error",
    });
    render(<ServiceHealth />);
    await waitFor(() => {
      expect(screen.getByTestId("service-health-error")).toBeInTheDocument();
    });
  });
});
