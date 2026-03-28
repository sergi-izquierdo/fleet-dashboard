import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import DispatcherPipelinePanel from "@/components/DispatcherPipelinePanel";
import type { DispatcherStatus } from "@/types/dispatcherStatus";

const mockUseDispatcherStatus = vi.fn();

vi.mock("@/hooks/useDispatcherStatus", () => ({
  useDispatcherStatus: () => mockUseDispatcherStatus(),
}));

const now = new Date().toISOString();

const makeStatus = (
  phases: Record<string, { status: "completed" | "error" | "skipped"; durationMs?: number; error?: string; reason?: string }>,
  cycleDurationMs = 5000
): DispatcherStatus => ({
  cycle: {
    startedAt: now,
    finishedAt: now,
    durationMs: cycleDurationMs,
    nextRunAt: now,
    consecutiveErrors: 0,
    errors: [],
  },
  rateLimit: { remaining: 4500, limit: 5000, level: "ok", resetAt: now },
  phases,
  prPipeline: [],
  activeAgents: [],
  completedAgents: [],
  offline: false,
});

describe("DispatcherPipelinePanel — cycle phase timeline", () => {
  beforeEach(() => {
    mockUseDispatcherStatus.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading skeleton when loading and no data", () => {
    mockUseDispatcherStatus.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });
    render(<DispatcherPipelinePanel />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows error message on error", () => {
    mockUseDispatcherStatus.mockReturnValue({
      data: null,
      isLoading: false,
      error: "Network failure",
    });
    render(<DispatcherPipelinePanel />);
    expect(screen.getByText(/Failed to load dispatcher status/)).toBeInTheDocument();
    expect(screen.getByText(/Network failure/)).toBeInTheDocument();
  });

  it("shows offline message when dispatcher is offline", () => {
    mockUseDispatcherStatus.mockReturnValue({
      data: { offline: true },
      isLoading: false,
      error: null,
    });
    render(<DispatcherPipelinePanel />);
    expect(screen.getByText(/Dispatcher is offline/)).toBeInTheDocument();
  });

  it("shows total cycle time at the top", () => {
    mockUseDispatcherStatus.mockReturnValue({
      data: makeStatus({}, 3200),
      isLoading: false,
      error: null,
    });
    render(<DispatcherPipelinePanel />);
    expect(screen.getByText(/3\.2s/i)).toBeInTheDocument();
  });

  it("renders phase bars for each phase present in data", () => {
    mockUseDispatcherStatus.mockReturnValue({
      data: makeStatus({
        rateLimit: { status: "completed", durationMs: 120 },
        planner: { status: "completed", durationMs: 500 },
        spawn: { status: "skipped", reason: "no agents needed" },
      }),
      isLoading: false,
      error: null,
    });
    render(<DispatcherPipelinePanel />);
    expect(screen.getByText("rateLimit")).toBeInTheDocument();
    expect(screen.getByText("planner")).toBeInTheDocument();
    expect(screen.getByText("spawn")).toBeInTheDocument();
  });

  it("shows duration label on completed phase bars", () => {
    mockUseDispatcherStatus.mockReturnValue({
      data: makeStatus({
        rateLimit: { status: "completed", durationMs: 120 },
        planner: { status: "completed", durationMs: 2300 },
      }),
      isLoading: false,
      error: null,
    });
    render(<DispatcherPipelinePanel />);
    expect(screen.getByText("120ms")).toBeInTheDocument();
    expect(screen.getByText("2.3s")).toBeInTheDocument();
  });

  it("shows all 12 known phases when all are present", () => {
    const allPhases: Record<string, { status: "completed"; durationMs: number }> = {
      rateLimit: { status: "completed", durationMs: 100 },
      planner: { status: "completed", durationMs: 200 },
      spawn: { status: "completed", durationMs: 300 },
      checkAgents: { status: "completed", durationMs: 400 },
      recoverStale: { status: "completed", durationMs: 500 },
      autoLabel: { status: "completed", durationMs: 600 },
      autoRebase: { status: "completed", durationMs: 700 },
      fixCI: { status: "completed", durationMs: 800 },
      cleanupReviewFix: { status: "completed", durationMs: 900 },
      autoMerge: { status: "completed", durationMs: 1000 },
      cleanup: { status: "completed", durationMs: 1100 },
      writeStatus: { status: "completed", durationMs: 1200 },
    };
    mockUseDispatcherStatus.mockReturnValue({
      data: makeStatus(allPhases, 8800),
      isLoading: false,
      error: null,
    });
    render(<DispatcherPipelinePanel />);
    const phaseNames = [
      "rateLimit", "planner", "spawn", "checkAgents", "recoverStale",
      "autoLabel", "autoRebase", "fixCI", "cleanupReviewFix", "autoMerge",
      "cleanup", "writeStatus",
    ];
    phaseNames.forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it("applies green color class for completed phases", () => {
    mockUseDispatcherStatus.mockReturnValue({
      data: makeStatus({
        planner: { status: "completed", durationMs: 400 },
      }),
      isLoading: false,
      error: null,
    });
    const { container } = render(<DispatcherPipelinePanel />);
    const greenBar = container.querySelector(".bg-green-500");
    expect(greenBar).toBeInTheDocument();
  });

  it("applies red color class for error phases", () => {
    mockUseDispatcherStatus.mockReturnValue({
      data: makeStatus({
        autoMerge: { status: "error", durationMs: 50, error: "merge conflict" },
      }),
      isLoading: false,
      error: null,
    });
    const { container } = render(<DispatcherPipelinePanel />);
    const redBar = container.querySelector(".bg-red-500");
    expect(redBar).toBeInTheDocument();
  });

  it("applies gray color class for skipped phases", () => {
    mockUseDispatcherStatus.mockReturnValue({
      data: makeStatus({
        spawn: { status: "skipped" },
      }),
      isLoading: false,
      error: null,
    });
    const { container } = render(<DispatcherPipelinePanel />);
    const grayBar = container.querySelector(".bg-gray-400");
    expect(grayBar).toBeInTheDocument();
  });

  it("renders phase timeline section heading", () => {
    mockUseDispatcherStatus.mockReturnValue({
      data: makeStatus({
        planner: { status: "completed", durationMs: 200 },
      }),
      isLoading: false,
      error: null,
    });
    render(<DispatcherPipelinePanel />);
    expect(screen.getByText(/Cycle Phase Timeline/i)).toBeInTheDocument();
  });

  it("renders no timeline section when phases is empty", () => {
    mockUseDispatcherStatus.mockReturnValue({
      data: makeStatus({}),
      isLoading: false,
      error: null,
    });
    render(<DispatcherPipelinePanel />);
    expect(screen.queryByText(/Cycle Phase Timeline/i)).not.toBeInTheDocument();
  });
});
