import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

// ---- AgentCard edge cases ----
import { AgentCard } from "@/components/AgentCard";

describe("AgentCard edge cases", () => {
  afterEach(cleanup);

  it("truncates long issue titles via CSS class", () => {
    render(
      <AgentCard
        agentName="agent-1"
        status="working"
        issueTitle="This is a very long issue title that should be truncated by CSS"
        branchName="main"
        timeElapsed="5m"
      />
    );
    const el = screen.getByText(
      "This is a very long issue title that should be truncated by CSS"
    );
    expect(el.className).toContain("truncate");
  });

  it("sets title attribute on issue title for tooltip", () => {
    render(
      <AgentCard
        agentName="agent-1"
        status="working"
        issueTitle="Long title"
        branchName="main"
        timeElapsed="5m"
      />
    );
    const el = screen.getByText("Long title");
    expect(el).toHaveAttribute("title", "Long title");
  });

  it("opens PR link in new tab with security attributes", () => {
    render(
      <AgentCard
        agentName="agent-1"
        status="working"
        issueTitle="Issue"
        branchName="main"
        timeElapsed="5m"
        prUrl="https://github.com/org/repo/pull/1"
      />
    );
    const link = screen.getByRole("link", { name: "View PR" });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

// ---- LoadingSkeleton edge cases ----
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

describe("LoadingSkeleton edge cases", () => {
  afterEach(cleanup);

  it("renders stats bar skeleton with 6 pulse elements", () => {
    const { container } = render(<LoadingSkeleton />);
    // The stats grid should have 6 skeleton items
    const statsGrid = container.querySelector(
      ".grid.grid-cols-2"
    );
    expect(statsGrid).not.toBeNull();
    const pulses = statsGrid!.querySelectorAll(".animate-pulse");
    expect(pulses).toHaveLength(6);
  });

  it("renders agent cards skeleton with 3 pulse elements", () => {
    const { container } = render(<LoadingSkeleton />);
    const agentGrid = container.querySelector(
      ".grid.grid-cols-1"
    );
    expect(agentGrid).not.toBeNull();
    const pulses = agentGrid!.querySelectorAll(".animate-pulse");
    expect(pulses).toHaveLength(3);
  });

  it("has border and background styles on pulse elements", () => {
    const { container } = render(<LoadingSkeleton />);
    const pulse = container.querySelector(".animate-pulse");
    expect(pulse).not.toBeNull();
    expect(pulse!.className).toContain("border");
    expect(pulse!.className).toContain("bg-white/5");
  });
});

// ---- ConnectionIndicator edge cases ----
import { ConnectionIndicator } from "@/components/ConnectionIndicator";

describe("ConnectionIndicator edge cases", () => {
  afterEach(cleanup);

  it("has aria-hidden on the dot element", () => {
    render(<ConnectionIndicator status="connected" />);
    const dot = screen.getByTestId("connection-dot");
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("renders data-testid on the container", () => {
    render(<ConnectionIndicator status="error" />);
    expect(screen.getByTestId("connection-indicator")).toBeInTheDocument();
  });
});

// ---- LiveActivityLog edge cases ----
import LiveActivityLog from "@/components/LiveActivityLog";

const mockFetch = vi.fn();

describe("LiveActivityLog edge cases", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders event type badges for different event types", async () => {
    const events = [
      {
        id: "1",
        timestamp: "2026-03-23T10:00:00Z",
        agentName: "Agent A",
        eventType: "commit",
        description: "Committed code",
      },
      {
        id: "2",
        timestamp: "2026-03-23T09:00:00Z",
        agentName: "Agent B",
        eventType: "deploy",
        description: "Deployed app",
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => events,
    });

    await act(async () => {
      render(<LiveActivityLog />);
    });

    await waitFor(() => {
      expect(screen.getByText("Committed code")).toBeInTheDocument();
    });
    expect(screen.getByText("Deployed app")).toBeInTheDocument();
  });

  it("keeps showing existing events when refresh fails", async () => {
    const events = [
      {
        id: "1",
        timestamp: "2026-03-23T10:00:00Z",
        agentName: "Agent A",
        eventType: "commit",
        description: "Initial commit",
      },
    ];

    // First fetch succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => events,
    });

    await act(async () => {
      render(<LiveActivityLog />);
    });

    await waitFor(() => {
      expect(screen.getByText("Initial commit")).toBeInTheDocument();
    });

    // Next fetch fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    // Original events should still be visible
    expect(screen.getByText("Initial commit")).toBeInTheDocument();
  });

  it("cleans up interval on unmount", async () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    let unmount: () => void;
    await act(async () => {
      const result = render(<LiveActivityLog />);
      unmount = result.unmount;
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    act(() => {
      unmount();
    });

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});

// ---- ThemeToggle edge cases ----
import { ThemeToggle } from "@/components/ThemeToggle";

const mockSetTheme = vi.fn();
let mockTheme = "system";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

describe("ThemeToggle edge cases", () => {
  beforeEach(() => {
    mockTheme = "system";
    mockSetTheme.mockReset();
  });

  afterEach(cleanup);

  it("handles unknown theme gracefully by cycling to light", async () => {
    // If theme is something unexpected, it should still work
    mockTheme = "unknown-theme";
    render(<ThemeToggle />);

    await vi.waitFor(() => {
      expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    });

    // Should still be clickable without crashing
    const button = screen.getByTestId("theme-toggle");
    button.click();
    // Cycles based on array index, "unknown-theme" won't be found -> defaults to light
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });
});
