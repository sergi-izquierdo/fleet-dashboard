import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { FleetDataProvider, useFleetData } from "@/providers/FleetDataProvider";

function TestConsumer() {
  const data = useFleetData();
  return (
    <div>
      <span data-testid="prs-count">{data.prs.length}</span>
      <span data-testid="prs-loading">{String(data.prsLoading)}</span>
      <span data-testid="prs-error">{data.prsError ?? "none"}</span>
      <span data-testid="sessions-count">{data.sessions.length}</span>
      <span data-testid="sessions-loading">{String(data.sessionsLoading)}</span>
      <span data-testid="services-loading">{String(data.servicesLoading)}</span>
      <span data-testid="dispatcher-loading">{String(data.dispatcherLoading)}</span>
    </div>
  );
}

function buildFetchMock(overrides: Record<string, unknown> = {}) {
  return vi.fn().mockImplementation((url: string) => {
    if (overrides[url]) {
      return Promise.resolve({ ok: true, json: async () => overrides[url] });
    }
    const defaults: Record<string, unknown> = {
      "/api/prs": [],
      "/api/services": { services: [], timestamp: new Date().toISOString() },
      "/api/dispatcher-status": { offline: true },
      "/api/sessions": { sessions: [] },
      "/api/issues": { repos: [], overall: { total: 0, open: 0, closed: 0, percentComplete: 0, labels: { queued: 0, inProgress: 0, cloud: 0, done: 0 } } },
      "/api/dashboard": { agents: [], prs: [], activityLog: [] },
      "/api/fleet-state": { active: {}, completed: [], stats: { totalCompleted: 0, byStatus: {}, byProject: {} }, dispatcherOnline: false },
    };
    for (const [pattern, data] of Object.entries(defaults)) {
      if (url.includes(pattern)) {
        return Promise.resolve({ ok: true, json: async () => data });
      }
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

describe("FleetDataProvider", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("throws when useFleetData is called outside provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useFleetData must be used within a FleetDataProvider"
    );
    consoleError.mockRestore();
  });

  it("provides initial loading state for all endpoints", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(
      <FleetDataProvider>
        <TestConsumer />
      </FleetDataProvider>
    );
    expect(screen.getByTestId("prs-loading")).toHaveTextContent("true");
    expect(screen.getByTestId("sessions-loading")).toHaveTextContent("true");
    expect(screen.getByTestId("services-loading")).toHaveTextContent("true");
    expect(screen.getByTestId("dispatcher-loading")).toHaveTextContent("true");
  });

  it("provides prs data after fetch", async () => {
    const mockPRs = [
      {
        title: "feat: test",
        repo: "org/repo",
        status: "open",
        ciStatus: "passing",
        createdAt: "2026-03-23T09:00:00Z",
        url: "https://github.com/org/repo/pull/1",
        number: 1,
        author: "agent",
        hasConflicts: false,
      },
    ];
    global.fetch = buildFetchMock({ "/api/prs": mockPRs });

    render(
      <FleetDataProvider>
        <TestConsumer />
      </FleetDataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("prs-loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("prs-count")).toHaveTextContent("1");
    expect(screen.getByTestId("prs-error")).toHaveTextContent("none");
  });

  it("provides sessions data after fetch", async () => {
    const mockSessions = [
      { name: "agent-1", status: "working", branch: "feat/x", uptime: "1h", taskName: "task" },
    ];
    global.fetch = buildFetchMock({ "/api/sessions": { sessions: mockSessions } });

    render(
      <FleetDataProvider>
        <TestConsumer />
      </FleetDataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("sessions-loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("sessions-count")).toHaveTextContent("1");
  });

  it("sets error when prs fetch fails", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/prs")) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <FleetDataProvider>
        <TestConsumer />
      </FleetDataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("prs-loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("prs-error")).toHaveTextContent("Network error");
  });

  it("polls prs endpoint at 30s intervals", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = buildFetchMock();
    global.fetch = fetchMock;

    render(
      <FleetDataProvider>
        <TestConsumer />
      </FleetDataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("prs-loading")).toHaveTextContent("false");
    });

    const initialPrsCalls = (fetchMock as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([url]: [string]) => url.includes("/api/prs")
    ).length;

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await waitFor(() => {
      const prsCalls = (fetchMock as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([url]: [string]) => url.includes("/api/prs")
      ).length;
      expect(prsCalls).toBeGreaterThan(initialPrsCalls);
    });

    vi.useRealTimers();
  });

  it("handles non-ok response for prs", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/prs")) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <FleetDataProvider>
        <TestConsumer />
      </FleetDataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("prs-loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("prs-error")).toHaveTextContent("HTTP 500");
  });

  beforeEach(() => {
    // Reset any fetch mock between tests
  });
});
