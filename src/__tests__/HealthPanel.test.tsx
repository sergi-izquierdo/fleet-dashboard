import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import HealthPanel from "@/components/HealthPanel";

const mockHealthData = {
  status: "degraded" as const,
  services: {
    dashboard: { status: "up" as const, message: "Fleet Dashboard is reachable", port: 3001 },
    observabilityServer: { status: "up" as const, message: "Observability Server is reachable", port: 4100 },
    observabilityClient: { status: "down" as const, message: "Observability Client unreachable", port: 5174 },
    langfuse: { status: "up" as const, message: "Langfuse is reachable", port: 3050 },
    dispatcher: { status: "up" as const, message: "Dispatcher is running" },
    telegramBot: { status: "up" as const, message: "Telegram Bot is running" },
    supervisor: { status: "down" as const, message: "Supervisor session not found" },
  },
  timestamp: new Date().toISOString(),
};

describe("HealthPanel", () => {
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
    render(<HealthPanel />);
    expect(screen.getByText("System Health")).toBeInTheDocument();
  });

  it("renders health services after loading", async () => {
    render(<HealthPanel />);
    await waitFor(() => {
      expect(screen.getByTestId("health-overall-badge")).toBeInTheDocument();
    });
    expect(screen.getByText("Degraded")).toBeInTheDocument();
    expect(screen.getByTestId("health-service-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("health-service-observabilityServer")).toBeInTheDocument();
    expect(screen.getByTestId("health-service-observabilityClient")).toBeInTheDocument();
    expect(screen.getByTestId("health-service-langfuse")).toBeInTheDocument();
    expect(screen.getByTestId("health-service-dispatcher")).toBeInTheDocument();
    expect(screen.getByTestId("health-service-telegramBot")).toBeInTheDocument();
    expect(screen.getByTestId("health-service-supervisor")).toBeInTheDocument();
  });

  it("shows service labels correctly", async () => {
    render(<HealthPanel />);
    await waitFor(() => {
      expect(screen.getByText("Fleet Dashboard")).toBeInTheDocument();
    });
    expect(screen.getByText("Observability Server")).toBeInTheDocument();
    expect(screen.getByText("Observability Client")).toBeInTheDocument();
    expect(screen.getByText("Langfuse")).toBeInTheDocument();
    expect(screen.getByText("Dispatcher")).toBeInTheDocument();
    expect(screen.getByText("Telegram Bot")).toBeInTheDocument();
    expect(screen.getByText("Supervisor")).toBeInTheDocument();
  });

  it("shows port badges for services with ports", async () => {
    render(<HealthPanel />);
    await waitFor(() => {
      expect(screen.getByText(":3001")).toBeInTheDocument();
    });
    expect(screen.getByText(":4100")).toBeInTheDocument();
    expect(screen.getByText(":5174")).toBeInTheDocument();
    expect(screen.getByText(":3050")).toBeInTheDocument();
  });

  it("collapses and expands when toggle is clicked", async () => {
    render(<HealthPanel />);
    await waitFor(() => {
      expect(screen.getByTestId("health-services")).toBeInTheDocument();
    });

    const toggle = screen.getByTestId("health-toggle");
    fireEvent.click(toggle);
    expect(screen.queryByTestId("health-services")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByTestId("health-services")).toBeInTheDocument();
  });

  it("shows error when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    render(<HealthPanel />);
    await waitFor(() => {
      expect(screen.getByTestId("health-error")).toBeInTheDocument();
    });
  });

  it("shows green indicator for up services and red for down", async () => {
    render(<HealthPanel />);
    await waitFor(() => {
      expect(screen.getByTestId("health-service-dashboard")).toBeInTheDocument();
    });

    const dashboardRow = screen.getByTestId("health-service-dashboard");
    const dashboardIndicator = dashboardRow.querySelector("[aria-label='Service up']");
    expect(dashboardIndicator).toBeInTheDocument();

    const clientRow = screen.getByTestId("health-service-observabilityClient");
    const clientIndicator = clientRow.querySelector("[aria-label='Service down']");
    expect(clientIndicator).toBeInTheDocument();
  });
});
