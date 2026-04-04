import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import ServicesPageContent from "@/components/ServicesPageContent";
import type { ServicesResponse } from "@/app/api/services/route";
import type { DispatcherStatus } from "@/types/dispatcherStatus";
import type { SystemHealthResponse } from "@/app/api/system-health/route";
import * as apiCache from "@/lib/apiCache";

const mockServicesData: ServicesResponse = {
  services: [
    { name: "fleet-orchestrator", status: "active", statusText: "active", uptime: "2h 15m", restartCount: 0 },
    { name: "fleet-telegram", status: "inactive", statusText: "inactive", uptime: null, restartCount: null },
    { name: "fleet-dashboard", status: "active", statusText: "active", uptime: "5h 3m", restartCount: 1 },
    { name: "fleet-obs-server", status: "failed", statusText: "failed", uptime: null, restartCount: 3 },
    { name: "fleet-obs-client", status: "active", statusText: "active", uptime: "1h 42m", restartCount: 0 },
    { name: "fleet-auto-accept", status: "unknown", statusText: "unknown", uptime: null, restartCount: null },
  ],
  timestamp: new Date().toISOString(),
};

const mockSystemHealthData: SystemHealthResponse = {
  disk: { label: "Disk", usedLabel: "42 GB / 100 GB", percent: 42 },
  memory: { label: "Memory", usedLabel: "6.2 GB / 16 GB", percent: 50 },
  cpu: { label: "CPU", usedLabel: "30% load", percent: 30 },
  timestamp: new Date().toISOString(),
};

const mockDispatcherData: DispatcherStatus = {
  offline: false,
  cycle: {
    startedAt: new Date(Date.now() - 10000).toISOString(),
    finishedAt: new Date(Date.now() - 5000).toISOString(),
    durationMs: 5000,
    nextRunAt: new Date(Date.now() + 25000).toISOString(),
    consecutiveErrors: 0,
    errors: [],
  },
  rateLimit: {
    remaining: 45,
    limit: 60,
    level: "ok",
    resetAt: new Date(Date.now() + 3600000).toISOString(),
  },
  phases: {
    "check-agents": { status: "completed", durationMs: 120 },
    "dispatch-issues": { status: "completed", durationMs: 800 },
    "merge-prs": { status: "skipped", reason: "no PRs ready" },
  },
  prPipeline: [],
  activeAgents: [],
  completedAgents: [],
};

function makeFetchMock() {
  return vi.fn().mockImplementation((url: string) => {
    if (url === "/api/services") {
      return Promise.resolve({ ok: true, json: async () => mockServicesData });
    }
    if (url === "/api/system-health") {
      return Promise.resolve({ ok: true, json: async () => mockSystemHealthData });
    }
    if (url === "/api/dispatcher-status") {
      return Promise.resolve({ ok: true, json: async () => mockDispatcherData });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

describe("ServicesPageContent", () => {
  beforeEach(() => {
    apiCache.clear();
    global.fetch = makeFetchMock();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the top-level container", () => {
    render(<ServicesPageContent />);
    expect(screen.getByTestId("services-page-content")).toBeInTheDocument();
  });

  it("shows loading skeletons for service cards initially", () => {
    render(<ServicesPageContent />);
    expect(screen.getByTestId("service-cards-loading")).toBeInTheDocument();
  });

  it("renders a card for each fleet service after loading", async () => {
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("service-cards")).toBeInTheDocument();
    });
    for (const service of mockServicesData.services) {
      expect(screen.getByTestId(`service-card-${service.name}`)).toBeInTheDocument();
    }
  });

  it("displays service name in each card", async () => {
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("service-name-fleet-orchestrator")).toBeInTheDocument();
    });
    expect(screen.getByTestId("service-name-fleet-telegram")).toBeInTheDocument();
    expect(screen.getByTestId("service-name-fleet-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("service-name-fleet-obs-server")).toBeInTheDocument();
    expect(screen.getByTestId("service-name-fleet-obs-client")).toBeInTheDocument();
    expect(screen.getByTestId("service-name-fleet-auto-accept")).toBeInTheDocument();
  });

  it("displays status badge for each service", async () => {
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("service-status-fleet-orchestrator")).toBeInTheDocument();
    });
    expect(screen.getByTestId("service-status-fleet-orchestrator").textContent).toContain("active");
    expect(screen.getByTestId("service-status-fleet-telegram").textContent).toContain("inactive");
    expect(screen.getByTestId("service-status-fleet-obs-server").textContent).toContain("failed");
    expect(screen.getByTestId("service-status-fleet-auto-accept").textContent).toContain("unknown");
  });

  it("displays uptime when available", async () => {
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("service-uptime-fleet-orchestrator")).toBeInTheDocument();
    });
    expect(screen.getByTestId("service-uptime-fleet-orchestrator").textContent).toContain("2h 15m");
    expect(screen.getByTestId("service-uptime-fleet-dashboard").textContent).toContain("5h 3m");
  });

  it("shows dash when uptime is not available", async () => {
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("service-uptime-fleet-telegram")).toBeInTheDocument();
    });
    expect(screen.getByTestId("service-uptime-fleet-telegram").textContent).toContain("—");
  });

  it("displays restart count when available", async () => {
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("service-restarts-fleet-dashboard")).toBeInTheDocument();
    });
    expect(screen.getByTestId("service-restarts-fleet-dashboard").textContent).toContain("1");
    expect(screen.getByTestId("service-restarts-fleet-obs-server").textContent).toContain("3");
  });

  it("shows dash when restart count is not available", async () => {
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("service-restarts-fleet-telegram")).toBeInTheDocument();
    });
    expect(screen.getByTestId("service-restarts-fleet-telegram").textContent).toContain("—");
  });

  it("shows active count summary", async () => {
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByText(/3\/6 active/)).toBeInTheDocument();
    });
  });

  it("shows error when services fetch fails", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/services") {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("service-cards-error")).toBeInTheDocument();
    });
  });

  it("shows dispatcher loading state initially", () => {
    render(<ServicesPageContent />);
    expect(screen.getByTestId("dispatcher-loading")).toBeInTheDocument();
  });

  it("shows dispatcher cycle info after loading", async () => {
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("dispatcher-cycle")).toBeInTheDocument();
    });
    expect(screen.getByTestId("dispatcher-last-cycle")).toBeInTheDocument();
    expect(screen.getByTestId("dispatcher-duration")).toBeInTheDocument();
    expect(screen.getByTestId("dispatcher-phases")).toBeInTheDocument();
    expect(screen.getByTestId("dispatcher-rate-limit")).toBeInTheDocument();
  });

  it("shows correct dispatcher duration", async () => {
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("dispatcher-duration")).toBeInTheDocument();
    });
    expect(screen.getByTestId("dispatcher-duration").textContent).toContain("5.0s");
  });

  it("shows phases completed count", async () => {
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("dispatcher-phases")).toBeInTheDocument();
    });
    // 2 completed out of 3 total phases
    expect(screen.getByTestId("dispatcher-phases").textContent).toContain("2/3");
  });

  it("shows rate limit remaining", async () => {
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("dispatcher-rate-limit")).toBeInTheDocument();
    });
    expect(screen.getByTestId("dispatcher-rate-limit").textContent).toContain("45");
  });

  it("shows offline state when dispatcher is offline", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/dispatcher-status") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ offline: true } as Partial<DispatcherStatus>),
        });
      }
      if (url === "/api/services") {
        return Promise.resolve({ ok: true, json: async () => mockServicesData });
      }
      return Promise.resolve({ ok: true, json: async () => mockSystemHealthData });
    });
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("dispatcher-offline")).toBeInTheDocument();
    });
  });

  it("shows error when dispatcher fetch fails", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/dispatcher-status") {
        return Promise.reject(new Error("Network error"));
      }
      if (url === "/api/services") {
        return Promise.resolve({ ok: true, json: async () => mockServicesData });
      }
      return Promise.resolve({ ok: true, json: async () => mockSystemHealthData });
    });
    render(<ServicesPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId("dispatcher-error")).toBeInTheDocument();
    });
  });
});
