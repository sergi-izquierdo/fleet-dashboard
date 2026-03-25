import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import DispatcherPipelinePanel from "@/components/DispatcherPipelinePanel";

const now = new Date();
const finishedAt = new Date(now.getTime() - 12_000).toISOString(); // 12s ago
const nextRunAt = new Date(now.getTime() + 30_000).toISOString(); // 30s from now

const mockDispatcherStatus = {
  cycle: {
    startedAt: new Date(now.getTime() - 15_000).toISOString(),
    finishedAt,
    durationMs: 3200,
    nextRunAt,
    consecutiveErrors: 0,
    errors: [],
  },
  rateLimit: {
    remaining: 4800,
    limit: 5000,
    level: "ok" as const,
    resetAt: new Date(now.getTime() + 3600_000).toISOString(),
  },
  phases: {
    planner: { status: "completed" as const, durationMs: 210 },
    spawn: { status: "completed" as const, durationMs: 450 },
    checkAgents: { status: "completed" as const, durationMs: 80 },
    recoverStale: { status: "skipped" as const, reason: "no stale agents" },
    autoLabel: { status: "completed" as const, durationMs: 120 },
    autoRebase: { status: "completed" as const, durationMs: 300 },
    fixCI: { status: "skipped" as const },
    autoMerge: { status: "completed" as const, durationMs: 500 },
    cleanup: { status: "completed" as const, durationMs: 60 },
  },
  prPipeline: [
    { repo: "org/my-repo", pr: 42, stage: "eligible" },
    { repo: "org/other-repo", pr: 99, stage: "rebasing", rebaseAttempts: 2 },
    { repo: "org/ci-repo", pr: 7, stage: "ci_failing", fixAttempt: 1 },
  ],
  activeAgents: [],
  completedAgents: [],
};

describe("DispatcherPipelinePanel", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDispatcherStatus,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading skeleton initially", () => {
    render(<DispatcherPipelinePanel />);
    expect(screen.getByTestId("dispatcher-pipeline-loading")).toBeInTheDocument();
    expect(screen.getByText("Dispatcher Pipeline")).toBeInTheDocument();
  });

  it("renders the panel after data loads", async () => {
    render(<DispatcherPipelinePanel />);
    await waitFor(() => {
      expect(screen.getByTestId("dispatcher-pipeline-panel")).toBeInTheDocument();
    });
  });

  it("renders cycle info section", async () => {
    render(<DispatcherPipelinePanel />);
    await waitFor(() => {
      expect(screen.getByTestId("cycle-info")).toBeInTheDocument();
    });
    expect(screen.getByText("Last cycle")).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("Next in")).toBeInTheDocument();
    // 3200ms => "3.2s"
    expect(screen.getByText("3.2s")).toBeInTheDocument();
  });

  it("does not show consecutive errors badge when errors = 0", async () => {
    render(<DispatcherPipelinePanel />);
    await waitFor(() => {
      expect(screen.getByTestId("dispatcher-pipeline-panel")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("consecutive-errors")).not.toBeInTheDocument();
  });

  it("shows consecutive errors badge when errors > 0", async () => {
    const statusWithErrors = {
      ...mockDispatcherStatus,
      cycle: { ...mockDispatcherStatus.cycle, consecutiveErrors: 3 },
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => statusWithErrors,
    });
    render(<DispatcherPipelinePanel />);
    await waitFor(() => {
      expect(screen.getByTestId("consecutive-errors")).toBeInTheDocument();
    });
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders all phase rows", async () => {
    render(<DispatcherPipelinePanel />);
    await waitFor(() => {
      expect(screen.getByTestId("phase-summary")).toBeInTheDocument();
    });
    expect(screen.getByTestId("phase-row-planner")).toBeInTheDocument();
    expect(screen.getByTestId("phase-row-spawn")).toBeInTheDocument();
    expect(screen.getByTestId("phase-row-checkAgents")).toBeInTheDocument();
    expect(screen.getByTestId("phase-row-recoverStale")).toBeInTheDocument();
    expect(screen.getByTestId("phase-row-autoLabel")).toBeInTheDocument();
    expect(screen.getByTestId("phase-row-autoRebase")).toBeInTheDocument();
    expect(screen.getByTestId("phase-row-fixCI")).toBeInTheDocument();
    expect(screen.getByTestId("phase-row-autoMerge")).toBeInTheDocument();
    expect(screen.getByTestId("phase-row-cleanup")).toBeInTheDocument();
  });

  it("renders PR pipeline entries", async () => {
    render(<DispatcherPipelinePanel />);
    await waitFor(() => {
      expect(screen.getByTestId("pr-pipeline")).toBeInTheDocument();
    });
    expect(screen.getByTestId("pr-pipeline-row-42")).toBeInTheDocument();
    expect(screen.getByTestId("pr-pipeline-row-99")).toBeInTheDocument();
    expect(screen.getByTestId("pr-pipeline-row-7")).toBeInTheDocument();
  });

  it("renders stage badges with correct labels", async () => {
    render(<DispatcherPipelinePanel />);
    await waitFor(() => {
      expect(screen.getByTestId("stage-badge-eligible")).toBeInTheDocument();
    });
    expect(screen.getByTestId("stage-badge-rebasing")).toBeInTheDocument();
    expect(screen.getByTestId("stage-badge-ci_failing")).toBeInTheDocument();
  });

  it("shows repo short names and PR links", async () => {
    render(<DispatcherPipelinePanel />);
    await waitFor(() => {
      expect(screen.getByTestId("pr-link-42")).toBeInTheDocument();
    });
    expect(screen.getByText("my-repo")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("#99")).toBeInTheDocument();
  });

  it("shows rebase and fix attempt counts", async () => {
    render(<DispatcherPipelinePanel />);
    await waitFor(() => {
      expect(screen.getByTestId("pr-pipeline-row-99")).toBeInTheDocument();
    });
    // rebaseAttempts: 2 -> "r2"
    expect(screen.getByText("r2")).toBeInTheDocument();
    // fixAttempt: 1 -> "f1"
    expect(screen.getByText("f1")).toBeInTheDocument();
  });

  it("shows empty state when no PRs in pipeline", async () => {
    const statusEmpty = { ...mockDispatcherStatus, prPipeline: [] };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => statusEmpty,
    });
    render(<DispatcherPipelinePanel />);
    await waitFor(() => {
      expect(screen.getByText("No PRs in pipeline")).toBeInTheDocument();
    });
  });

  it("renders nothing when fetch fails and no data", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    const { container } = render(<DispatcherPipelinePanel />);
    // Initial loading state shown, then after error with no data -> null
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
