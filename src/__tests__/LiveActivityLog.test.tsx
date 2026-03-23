import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import LiveActivityLog from "@/components/LiveActivityLog";

const mockEvents = [
  {
    id: "1",
    timestamp: "2026-03-23T10:00:00Z",
    agentName: "Agent Alpha",
    eventType: "commit",
    description: "Pushed 3 commits",
  },
  {
    id: "2",
    timestamp: "2026-03-23T09:00:00Z",
    agentName: "Agent Beta",
    eventType: "pr_created",
    description: "Opened PR #42",
  },
];

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("LiveActivityLog", () => {
  it("shows loading state initially", async () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    await act(async () => {
      render(<LiveActivityLog />);
    });
    expect(screen.getByTestId("live-activity-loading")).toBeInTheDocument();
    expect(screen.getByText("Loading events...")).toBeInTheDocument();
  });

  it("renders events after successful fetch", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockEvents,
    });

    await act(async () => {
      render(<LiveActivityLog />);
    });

    await waitFor(() => {
      expect(screen.getByText("Agent Alpha")).toBeInTheDocument();
    });

    expect(screen.getByText("Agent Beta")).toBeInTheDocument();
    expect(screen.getByText("Pushed 3 commits")).toBeInTheDocument();
    expect(screen.getByText("Opened PR #42")).toBeInTheDocument();
  });

  it("shows error state when fetch fails and no events loaded", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await act(async () => {
      render(<LiveActivityLog />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("live-activity-error")).toBeInTheDocument();
    });

    expect(screen.getByText(/Failed to load events/)).toBeInTheDocument();
  });

  it("auto-refreshes every 10 seconds", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockEvents,
    });

    await act(async () => {
      render(<LiveActivityLog />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  it("fetches from /api/events endpoint", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await act(async () => {
      render(<LiveActivityLog />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/events");
    });
  });

  it("shows empty state when no events returned", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await act(async () => {
      render(<LiveActivityLog />);
    });

    await waitFor(() => {
      expect(screen.getByText("No events to display.")).toBeInTheDocument();
    });
  });
});
