/**
 * Integration tests for OverviewContent (#363)
 *
 * Verifies:
 * - Loading state renders skeleton
 * - Error state (no data) renders error banner
 * - Error + data renders inline error banner
 * - All sections render without crashing
 * - FleetStatusBanner is present
 * - Health/metrics row is present
 * - Reset-layout button is present
 * - BottomNav renders for mobile
 * - 6 drag handles (one per section)
 * - Empty agents/PRs handled gracefully
 * - Null data renders nothing
 */
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────
const { mockRefresh, mockRefreshPRs, mockReorder, mockResetLayout } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockRefreshPRs: vi.fn(),
  mockReorder: vi.fn(),
  mockResetLayout: vi.fn(),
}));

// ── Hook mocks ─────────────────────────────────────────────────────────────
vi.mock("@/hooks/useDashboardData", () => ({
  useDashboardData: vi.fn(),
}));

vi.mock("@/hooks/usePRsData", () => ({
  usePRsData: vi.fn(),
}));

vi.mock("@/hooks/useFleetState", () => ({ useFleetState: () => undefined }));

vi.mock("@/hooks/useFleetEvents", () => ({
  useFleetEvents: (_handler: unknown) => undefined,
}));

vi.mock("@/hooks/useDashboardLayout", () => ({
  useDashboardLayout: vi.fn(),
  DEFAULT_ORDER: ["agents", "prs", "timeline", "activity", "trends", "heatmap"],
}));

// ── Component mocks ────────────────────────────────────────────────────────
vi.mock("@/components/AgentStatusCards", () => ({
  default: () => <div data-testid="agent-status-cards">AgentStatusCards</div>,
}));
vi.mock("@/components/ActivityLog", () => ({
  default: ({ events }: { events: unknown[] }) => (
    <div data-testid="activity-log">ActivityLog({events.length})</div>
  ),
}));
vi.mock("@/components/FleetActivityTimeline", () => ({
  default: () => <div data-testid="fleet-activity-timeline">FleetActivityTimeline</div>,
}));
vi.mock("@/components/FleetActivityHeatmap", () => ({
  default: () => <div data-testid="fleet-activity-heatmap">FleetActivityHeatmap</div>,
}));
vi.mock("@/components/MergeQueue", () => ({
  default: () => <div data-testid="merge-queue">MergeQueue</div>,
}));
vi.mock("@/components/RecentPRs", () => ({
  default: () => <div data-testid="recent-prs">RecentPRs</div>,
}));
vi.mock("@/components/PRTrendChart", () => ({
  default: () => <div data-testid="pr-trend-chart">PRTrendChart</div>,
}));
vi.mock("@/components/PRVelocityChart", () => ({
  default: () => <div data-testid="pr-velocity-chart">PRVelocityChart</div>,
}));
vi.mock("@/components/TokenUsageDashboard", () => ({
  default: () => <div data-testid="token-usage">TokenUsageDashboard</div>,
}));
vi.mock("@/components/ServiceHealth", () => ({
  default: () => <div data-testid="service-health">ServiceHealth</div>,
}));
vi.mock("@/components/SystemHealthCard", () => ({
  default: () => <div data-testid="system-health">SystemHealthCard</div>,
}));
vi.mock("@/components/DispatcherPipelinePanel", () => ({
  default: () => <div data-testid="dispatcher-pipeline">DispatcherPipelinePanel</div>,
}));
vi.mock("@/components/ProgressTracker", () => ({
  default: () => <div data-testid="progress-tracker">ProgressTracker</div>,
}));
vi.mock("@/components/FleetStatusBanner", () => ({
  default: ({ agents, prs }: { agents: unknown[]; prs: unknown[] }) => (
    <div data-testid="fleet-status-banner">
      FleetStatusBanner agents={agents.length} prs={prs.length}
    </div>
  ),
}));
vi.mock("@/components/FleetHealthCard", () => ({
  default: () => <div data-testid="fleet-health-card">FleetHealthCard</div>,
}));
vi.mock("@/components/MetricsCard", () => ({
  default: () => <div data-testid="metrics-card">MetricsCard</div>,
}));
vi.mock("@/components/RepoHealthSection", () => ({
  default: () => <div data-testid="repo-health-section">RepoHealthSection</div>,
}));
vi.mock("@/components/AutoRefreshIndicator", () => ({
  default: () => <div data-testid="auto-refresh-indicator">AutoRefreshIndicator</div>,
}));
vi.mock("@/components/SectionErrorBoundary", () => ({
  SectionErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/LoadingSkeleton", () => ({
  LoadingSkeleton: () => <div data-testid="loading-skeleton">Loading...</div>,
  Skeleton: () => <div data-testid="skeleton" />,
}));
vi.mock("@/components/Toast", () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
  showToast: vi.fn(),
}));
vi.mock("@/components/BottomNav", () => ({
  BottomNav: ({
    activeTab,
    onTabChange,
  }: {
    activeTab: string;
    onTabChange: (tab: string) => void;
  }) => (
    <nav data-testid="bottom-nav" data-active-tab={activeTab}>
      <button onClick={() => onTabChange("prs")}>PRs</button>
    </nav>
  ),
}));

import { useDashboardData } from "@/hooks/useDashboardData";
import { usePRsData } from "@/hooks/usePRsData";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import OverviewContent from "@/app/OverviewContent";

const mockUseDashboardData = useDashboardData as ReturnType<typeof vi.fn>;
const mockUsePRsData = usePRsData as ReturnType<typeof vi.fn>;
const mockUseDashboardLayout = useDashboardLayout as ReturnType<typeof vi.fn>;

const DEFAULT_LAYOUT = {
  order: ["agents", "prs", "timeline", "activity", "trends", "heatmap"],
  reorder: mockReorder,
  resetLayout: mockResetLayout,
};

const EMPTY_DATA = {
  agents: [],
  activityLog: [],
  prs: [],
};

function setupHooks(overrides: {
  isLoading?: boolean;
  error?: string | null;
  data?: typeof EMPTY_DATA | null;
  prs?: unknown[];
} = {}) {
  mockUseDashboardData.mockReturnValue({
    data: overrides.data !== undefined ? overrides.data : EMPTY_DATA,
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
    refresh: mockRefresh,
  });
  mockUsePRsData.mockReturnValue({
    prs: overrides.prs ?? [],
    refresh: mockRefreshPRs,
  });
  mockUseDashboardLayout.mockReturnValue(DEFAULT_LAYOUT);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("OverviewContent integration", () => {
  it("renders loading skeleton when isLoading=true and no data", () => {
    setupHooks({ isLoading: true, data: null });
    render(<OverviewContent />);
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("fleet-status-banner")).not.toBeInTheDocument();
  });

  it("renders error banner and no sections when error and no data", () => {
    setupHooks({ error: "Connection refused", data: null });
    render(<OverviewContent />);
    const banner = screen.getByTestId("error-banner");
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toContain("Connection refused");
    expect(screen.queryByTestId("fleet-status-banner")).not.toBeInTheDocument();
  });

  it("renders nothing when data is null and no error and not loading", () => {
    setupHooks({ data: null });
    const { container } = render(<OverviewContent />);
    expect(container.firstChild).toBeNull();
  });

  it("renders FleetStatusBanner when data is present", () => {
    setupHooks();
    render(<OverviewContent />);
    expect(screen.getByTestId("fleet-status-banner")).toBeInTheDocument();
  });

  it("passes agents count to FleetStatusBanner", () => {
    const agents = [
      { name: "agent-1", sessionId: "s1", status: "working", issue: { title: "t", number: 1, url: "" }, branch: "b", timeElapsed: "1m" },
      { name: "agent-2", sessionId: "s2", status: "working", issue: { title: "t", number: 2, url: "" }, branch: "b", timeElapsed: "2m" },
    ];
    setupHooks({ data: { agents, activityLog: [], prs: [] } });
    render(<OverviewContent />);
    const banner = screen.getByTestId("fleet-status-banner");
    expect(banner.textContent).toContain("agents=2");
  });

  it("renders FleetHealthCard in health row", () => {
    setupHooks();
    render(<OverviewContent />);
    expect(screen.getByTestId("fleet-health-card")).toBeInTheDocument();
  });

  it("renders MetricsCard in health row", () => {
    setupHooks();
    render(<OverviewContent />);
    expect(screen.getByTestId("metrics-card")).toBeInTheDocument();
  });

  it("renders reset-layout button", () => {
    setupHooks();
    render(<OverviewContent />);
    expect(screen.getByTestId("reset-layout-button")).toBeInTheDocument();
  });

  it("calls resetLayout when reset-layout button is clicked", () => {
    setupHooks();
    render(<OverviewContent />);
    fireEvent.click(screen.getByTestId("reset-layout-button"));
    expect(mockResetLayout).toHaveBeenCalledTimes(1);
  });

  it("renders AutoRefreshIndicator", () => {
    setupHooks();
    render(<OverviewContent />);
    expect(screen.getByTestId("auto-refresh-indicator")).toBeInTheDocument();
  });

  it("renders BottomNav for mobile", () => {
    setupHooks();
    render(<OverviewContent />);
    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
  });

  it("renders 6 drag handles (one per layout section)", () => {
    setupHooks();
    render(<OverviewContent />);
    expect(screen.getAllByTestId("drag-handle")).toHaveLength(6);
  });

  it("renders inline error banner when error exists but data is also present", () => {
    setupHooks({ error: "Stale data", data: EMPTY_DATA });
    render(<OverviewContent />);
    // Both error banner and main content should be visible
    expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    expect(screen.getByTestId("fleet-status-banner")).toBeInTheDocument();
  });

  it("renders with empty agents without crashing", () => {
    setupHooks({ data: { agents: [], activityLog: [], prs: [] } });
    render(<OverviewContent />);
    const banner = screen.getByTestId("fleet-status-banner");
    expect(banner.textContent).toContain("agents=0");
  });

  it("updates active tab state when BottomNav fires onTabChange", () => {
    // jsdom does not implement scrollIntoView — stub it to prevent unhandled error
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    setupHooks();
    render(<OverviewContent />);
    const nav = screen.getByTestId("bottom-nav");
    expect(nav).toHaveAttribute("data-active-tab", "agents");

    act(() => {
      fireEvent.click(screen.getByText("PRs"));
    });

    expect(screen.getByTestId("bottom-nav")).toHaveAttribute("data-active-tab", "prs");
  });
});
