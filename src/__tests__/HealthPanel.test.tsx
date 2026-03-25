import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import HealthPanel from "@/components/HealthPanel";

const mockHealthData = {
  status: "degraded" as const,
  services: {
    tmux: { status: "up" as const, message: "tmux sessions active: 3" },
    observability: { status: "down" as const, message: "Observability server unreachable" },
    langfuse: { status: "up" as const, message: "Langfuse is reachable" },
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
    expect(screen.getByText("Service Health")).toBeInTheDocument();
  });

  it("renders health services after loading", async () => {
    render(<HealthPanel />);
    await waitFor(() => {
      expect(screen.getByTestId("health-overall-badge")).toBeInTheDocument();
    });
    expect(screen.getByText("Degraded")).toBeInTheDocument();
    expect(screen.getByTestId("health-service-tmux")).toBeInTheDocument();
    expect(screen.getByTestId("health-service-observability")).toBeInTheDocument();
    expect(screen.getByTestId("health-service-langfuse")).toBeInTheDocument();
  });

  it("shows service labels correctly", async () => {
    render(<HealthPanel />);
    await waitFor(() => {
      expect(screen.getByText("tmux Sessions")).toBeInTheDocument();
    });
    expect(screen.getByText("Observability")).toBeInTheDocument();
    expect(screen.getByText("Langfuse")).toBeInTheDocument();
  });

  it("shows error when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    render(<HealthPanel />);
    await waitFor(() => {
      expect(screen.getByTestId("health-error")).toBeInTheDocument();
    });
  });
});
