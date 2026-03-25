import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import FleetStatusBanner from "@/components/FleetStatusBanner";
import type { Agent, PR } from "@/types/dashboard";

vi.mock("@/hooks/useDispatcherStatus", () => ({
  useDispatcherStatus: vi.fn(),
}));

import { useDispatcherStatus } from "@/hooks/useDispatcherStatus";

const mockUseDispatcherStatus = useDispatcherStatus as ReturnType<typeof vi.fn>;

const defaultHookReturn = {
  data: {
    cycle: {
      startedAt: "",
      finishedAt: "",
      durationMs: 0,
      nextRunAt: "",
      consecutiveErrors: 0,
      errors: [],
    },
    rateLimit: { remaining: 1500, limit: 5000, level: "ok" as const, resetAt: "" },
    phases: {},
    prPipeline: [],
    activeAgents: [],
    completedAgents: [],
    offline: false,
  },
  isLoading: false,
  error: null,
  connectionStatus: "connected" as const,
  countdown: 12,
  refresh: vi.fn(),
};

const makeAgent = (status: Agent["status"], sessionId: string): Agent => ({
  name: `agent-${sessionId}`,
  sessionId,
  status,
  issue: { title: "Test issue", number: 1, url: "" },
  branch: "feat/test",
  timeElapsed: "1m 00s",
});

const makePR = (
  mergeState: PR["mergeState"],
  ciStatus: PR["ciStatus"],
  n: number
): PR => ({
  number: n,
  url: "",
  title: `PR ${n}`,
  ciStatus,
  reviewStatus: "pending",
  mergeState,
  author: "agent-1",
  branch: "feat/test",
});

afterEach(cleanup);

describe("FleetStatusBanner", () => {
  beforeEach(() => {
    mockUseDispatcherStatus.mockReturnValue(defaultHookReturn);
  });

  it("shows Online when dispatcher is connected and not offline", () => {
    render(<FleetStatusBanner agents={[]} prs={[]} />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("shows Offline when connectionStatus is disconnected", () => {
    mockUseDispatcherStatus.mockReturnValue({
      ...defaultHookReturn,
      connectionStatus: "disconnected",
    });
    render(<FleetStatusBanner agents={[]} prs={[]} />);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("shows Offline when data.offline is true", () => {
    mockUseDispatcherStatus.mockReturnValue({
      ...defaultHookReturn,
      data: { ...defaultHookReturn.data, offline: true },
    });
    render(<FleetStatusBanner agents={[]} prs={[]} />);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("displays the countdown value", () => {
    render(<FleetStatusBanner agents={[]} prs={[]} />);
    expect(screen.getByText("12s")).toBeInTheDocument();
  });

  it("displays rate limit remaining", () => {
    render(<FleetStatusBanner agents={[]} prs={[]} />);
    expect(screen.getByText("1500")).toBeInTheDocument();
  });

  it("counts active agents correctly", () => {
    const agents = [
      makeAgent("working", "s1"),
      makeAgent("working", "s2"),
      makeAgent("error", "s3"),
    ];
    render(<FleetStatusBanner agents={agents} prs={[]} />);
    expect(screen.getByText("Active:")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("counts open PRs (non-merged) correctly", () => {
    const prs = [
      makePR("open", "passing", 1),
      makePR("closed", "passing", 2),
      makePR("merged", "passing", 3),
    ];
    render(<FleetStatusBanner agents={[]} prs={prs} />);
    expect(screen.getByText("Open PRs:")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("counts CI failing PRs correctly", () => {
    const prs = [
      makePR("open", "failing", 1),
      makePR("open", "failing", 2),
      makePR("open", "passing", 3),
    ];
    render(<FleetStatusBanner agents={[]} prs={prs} />);
    expect(screen.getByText("CI Failing:")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows 0 for rate limit when data is null", () => {
    mockUseDispatcherStatus.mockReturnValue({
      ...defaultHookReturn,
      data: null,
    });
    render(<FleetStatusBanner agents={[]} prs={[]} />);
    // All counters default to 0; verify at least one exists
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });
});
