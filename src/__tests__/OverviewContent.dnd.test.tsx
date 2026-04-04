/**
 * Tests for DnD layout order preservation during SSE real-time updates (issue #309).
 *
 * Verifies:
 * 1. SSE-triggered refresh is debounced (300ms), not immediate
 * 2. Rapid SSE events collapse into a single refresh
 * 3. Layout order (from useDashboardLayout) is never mutated by data refreshes
 */
import { render, screen, cleanup, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

// ── Hoisted mocks (must be defined before vi.mock factories run) ───────────
const { mockRefresh, mockRefreshPRs, mockReorder, capturedHandler } = vi.hoisted(() => {
  const mockRefresh = vi.fn();
  const mockRefreshPRs = vi.fn();
  const mockReorder = vi.fn();
  const capturedHandler = { current: (_event: { type: string; data: unknown; id: string }) => undefined as void };
  return { mockRefresh, mockRefreshPRs, mockReorder, capturedHandler };
});

// ── Module mocks ──────────────────────────────────────────────────────────

vi.mock("@/hooks/useDashboardData", () => ({
  useDashboardData: () => ({
    data: { agents: [], activityLog: [], prs: [] },
    isLoading: false,
    error: null,
    refresh: mockRefresh,
  }),
}));

vi.mock("@/hooks/usePRsData", () => ({
  usePRsData: () => ({ prs: [], refresh: mockRefreshPRs }),
}));

vi.mock("@/hooks/useFleetState", () => ({ useFleetState: () => undefined }));

vi.mock("@/hooks/useFleetEvents", () => ({
  useFleetEvents: (handler: (event: { type: string; data: unknown; id: string }) => void) => {
    capturedHandler.current = handler;
  },
}));

vi.mock("@/hooks/useDashboardLayout", () => ({
  useDashboardLayout: () => ({
    order: ["agents", "metrics", "timeline", "heatmap", "prs", "trends", "activity"],
    reorder: mockReorder,
    resetLayout: vi.fn(),
  }),
  DEFAULT_ORDER: ["agents", "metrics", "timeline", "heatmap", "prs", "trends", "activity"],
}));

// Mock all child components to keep renders fast
vi.mock("@/components/AgentStatusCards", () => ({ default: () => <div>AgentStatusCards</div> }));
vi.mock("@/components/ActivityLog", () => ({ default: () => <div>ActivityLog</div> }));
vi.mock("@/components/FleetActivityTimeline", () => ({ default: () => <div>FleetActivityTimeline</div> }));
vi.mock("@/components/FleetActivityHeatmap", () => ({ default: () => <div>FleetActivityHeatmap</div> }));
vi.mock("@/components/MergeQueue", () => ({ default: () => <div>MergeQueue</div> }));
vi.mock("@/components/RecentPRs", () => ({ default: () => <div>RecentPRs</div> }));
vi.mock("@/components/PRTrendChart", () => ({ default: () => <div>PRTrendChart</div> }));
vi.mock("@/components/PRVelocityChart", () => ({ default: () => <div>PRVelocityChart</div> }));
vi.mock("@/components/TokenUsageDashboard", () => ({ default: () => <div>TokenUsageDashboard</div> }));
vi.mock("@/components/ServiceHealth", () => ({ default: () => <div>ServiceHealth</div> }));
vi.mock("@/components/SystemHealthCard", () => ({ default: () => <div>SystemHealthCard</div> }));
vi.mock("@/components/DispatcherPipelinePanel", () => ({ default: () => <div>DispatcherPipelinePanel</div> }));
vi.mock("@/components/ProgressTracker", () => ({ default: () => <div>ProgressTracker</div> }));
vi.mock("@/components/FleetStatusBanner", () => ({ default: () => <div>FleetStatusBanner</div> }));
vi.mock("@/components/MetricsCard", () => ({ default: () => <div>MetricsCard</div> }));
vi.mock("@/components/AutoRefreshIndicator", () => ({ default: () => <div>AutoRefreshIndicator</div> }));
vi.mock("@/components/SectionErrorBoundary", () => ({
  SectionErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/LoadingSkeleton", () => ({ LoadingSkeleton: () => <div>Loading...</div> }));
vi.mock("@/components/Toast", () => ({ ToastContainer: () => <div />, showToast: vi.fn() }));
vi.mock("@/components/BottomNav", () => ({ BottomNav: () => <div>BottomNav</div> }));

import OverviewContent from "@/app/OverviewContent";

const ORDER_LENGTH = 7; // agents, metrics, timeline, heatmap, prs, trends, activity

// ── Tests ─────────────────────────────────────────────────────────────────

describe("OverviewContent DnD + SSE integration (#309)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders one drag handle per section in layout order", () => {
    render(<OverviewContent />);
    expect(screen.getAllByTestId("drag-handle")).toHaveLength(ORDER_LENGTH);
  });

  it("SSE refresh is debounced: refresh not called immediately", () => {
    render(<OverviewContent />);

    act(() => {
      capturedHandler.current({ type: "cycle", data: null, id: "1" });
    });

    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockRefreshPRs).not.toHaveBeenCalled();
  });

  it("SSE refresh fires after 300ms debounce window", () => {
    render(<OverviewContent />);

    act(() => {
      capturedHandler.current({ type: "cycle", data: null, id: "1" });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockRefreshPRs).toHaveBeenCalledTimes(1);
  });

  it("rapid SSE events collapse into a single refresh call", () => {
    render(<OverviewContent />);

    act(() => {
      capturedHandler.current({ type: "cycle", data: null, id: "1" });
      capturedHandler.current({ type: "agent-started", data: null, id: "2" });
      capturedHandler.current({ type: "pr-created", data: null, id: "3" });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockRefreshPRs).toHaveBeenCalledTimes(1);
  });

  it("data refreshes never mutate the section order", () => {
    render(<OverviewContent />);

    // Simulate two SSE-triggered refreshes
    act(() => { capturedHandler.current({ type: "cycle", data: null, id: "1" }); });
    act(() => { vi.advanceTimersByTime(300); });
    act(() => { capturedHandler.current({ type: "agent-completed", data: null, id: "2" }); });
    act(() => { vi.advanceTimersByTime(300); });

    // reorder() must never be called by a data refresh
    expect(mockReorder).not.toHaveBeenCalled();
    // Sections still rendered
    expect(screen.getAllByTestId("drag-handle")).toHaveLength(ORDER_LENGTH);
  });
});
