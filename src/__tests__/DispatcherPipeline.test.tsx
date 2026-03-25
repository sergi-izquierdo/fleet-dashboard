import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import DispatcherPipeline from "@/components/DispatcherPipeline";
import type { DispatcherStatusResponse } from "@/app/api/dispatcher-status/route";

const mockData: DispatcherStatusResponse = {
  cycle: {
    startedAt: "2026-03-25T11:23:21.000Z",
    finishedAt: "2026-03-25T11:23:41.000Z",
    durationMs: 19559,
    nextRunAt: "2026-03-25T11:24:41.000Z",
    consecutiveErrors: 0,
    errors: 0,
  },
  rateLimit: {
    remaining: 3951,
    limit: 5000,
    level: "ok",
    resetAt: "2026-03-25T12:01:57.000Z",
  },
  phases: {
    planner: { status: "completed", durationMs: 3300 },
    spawn: { status: "completed", durationMs: 3370 },
    checkAgents: { status: "completed", durationMs: 8 },
    recoverStale: { status: "completed", durationMs: 3768 },
    autoLabel: { status: "completed", durationMs: 4278 },
    autoRebase: { status: "completed", durationMs: 1484 },
    fixCI: { status: "completed", durationMs: 1527 },
    autoMerge: { status: "completed", durationMs: 1539 },
    cleanup: { status: "completed", durationMs: 4 },
  },
  prPipeline: [
    {
      repo: "sergi-izquierdo/fleet-dashboard",
      pr: 140,
      stage: "fixing",
      fixAttempt: 0,
      maxAttempts: 2,
      fixAgent: "cifix-fle-139",
    },
    {
      repo: "sergi-izquierdo/fleet-dashboard",
      pr: 141,
      stage: "eligible",
    },
  ],
  activeAgents: 2,
  completedAgents: 1,
  isStale: false,
  timestamp: "2026-03-25T11:23:50.000Z",
};

describe("DispatcherPipeline", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading skeleton initially", () => {
    render(<DispatcherPipeline />);
    expect(screen.getByTestId("dispatcher-pipeline-loading")).toBeInTheDocument();
  });

  it("renders main sections after loading", async () => {
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("dispatcher-pipeline")).toBeInTheDocument();
    });
    expect(screen.getByTestId("cycle-status-bar")).toBeInTheDocument();
    expect(screen.getByTestId("phase-summary")).toBeInTheDocument();
    expect(screen.getByTestId("pr-pipeline")).toBeInTheDocument();
  });

  it("shows rate limit gauge", async () => {
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("rate-limit-gauge")).toBeInTheDocument();
    });
    expect(screen.getByText("3951/5000")).toBeInTheDocument();
  });

  it("renders all 9 phase rows", async () => {
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("phase-row-planner")).toBeInTheDocument();
    });
    const phaseNames = [
      "planner", "spawn", "checkAgents", "recoverStale", "autoLabel",
      "autoRebase", "fixCI", "autoMerge", "cleanup",
    ];
    for (const name of phaseNames) {
      expect(screen.getByTestId(`phase-row-${name}`)).toBeInTheDocument();
    }
  });

  it("shows green dot for completed phases", async () => {
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("phase-dot-planner")).toBeInTheDocument();
    });
    const dot = screen.getByTestId("phase-dot-planner");
    expect(dot.className).toContain("bg-green-500");
  });

  it("shows phase duration", async () => {
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("phase-row-planner")).toBeInTheDocument();
    });
    // 3300ms → 3.3s
    expect(screen.getByText("3.3s")).toBeInTheDocument();
    // 8ms stays in ms
    expect(screen.getByText("8ms")).toBeInTheDocument();
  });

  it("shows PR stage badges with counts", async () => {
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("stage-badge-fixing")).toBeInTheDocument();
    });
    expect(screen.getByTestId("stage-badge-eligible")).toBeInTheDocument();
  });

  it("expands PR stage to show individual PRs", async () => {
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("stage-badge-fixing")).toBeInTheDocument();
    });
    const badge = screen.getByTestId("stage-badge-fixing");
    fireEvent.click(badge);
    await waitFor(() => {
      expect(screen.getByTestId("stage-list-fixing")).toBeInTheDocument();
    });
    expect(screen.getByTestId("pr-entry-140")).toBeInTheDocument();
  });

  it("shows fixAgent in expanded PR view", async () => {
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("stage-badge-fixing")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("stage-badge-fixing"));
    await waitFor(() => {
      expect(screen.getByText("cifix-fle-139")).toBeInTheDocument();
    });
  });

  it("shows empty message when no PRs in pipeline", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockData, prPipeline: [] }),
    });
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("pr-pipeline-empty")).toBeInTheDocument();
    });
  });

  it("shows stale warning when isStale is true", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockData, isStale: true }),
    });
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("dispatcher-stale-warning")).toBeInTheDocument();
    });
  });

  it("does not show stale warning when isStale is false", async () => {
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("dispatcher-pipeline")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("dispatcher-stale-warning")).not.toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("dispatcher-pipeline-error")).toBeInTheDocument();
    });
  });

  it("shows error when fetch returns non-ok response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("dispatcher-pipeline-error")).toBeInTheDocument();
    });
  });

  it("shows consecutive errors count when > 0", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockData,
        cycle: { ...mockData.cycle, consecutiveErrors: 3 },
      }),
    });
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("consecutive-errors")).toBeInTheDocument();
    });
    expect(screen.getByText(/3 consecutive errors/i)).toBeInTheDocument();
  });

  it("shows skipped phase as dimmed", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockData,
        phases: {
          ...mockData.phases,
          planner: { status: "skipped", skipReason: "disabled" },
        },
      }),
    });
    render(<DispatcherPipeline />);
    await waitFor(() => {
      expect(screen.getByTestId("phase-row-planner")).toBeInTheDocument();
    });
    const row = screen.getByTestId("phase-row-planner");
    expect(row.className).toContain("opacity-50");
    expect(screen.getByText("disabled")).toBeInTheDocument();
  });
});
