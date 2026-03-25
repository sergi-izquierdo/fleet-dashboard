import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { NotificationCenter } from "@/components/NotificationCenter";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("NotificationCenter", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the bell icon button", () => {
    render(<NotificationCenter />);
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });

  it("shows unread badge when there are unread notifications", async () => {
    render(<NotificationCenter />);
    // Advance timers to let demo notifications be seeded
    vi.advanceTimersByTime(100);

    await vi.waitFor(() => {
      expect(screen.getByTestId("notification-badge")).toBeInTheDocument();
    });
  });

  it("opens dropdown when bell is clicked", async () => {
    render(<NotificationCenter />);
    vi.advanceTimersByTime(100);

    const bell = screen.getByTestId("notification-bell");
    fireEvent.click(bell);

    await vi.waitFor(() => {
      expect(screen.getByTestId("notification-dropdown")).toBeInTheDocument();
    });
  });

  it("closes dropdown when bell is clicked again", async () => {
    render(<NotificationCenter />);
    vi.advanceTimersByTime(100);

    const bell = screen.getByTestId("notification-bell");
    fireEvent.click(bell);

    await vi.waitFor(() => {
      expect(screen.getByTestId("notification-dropdown")).toBeInTheDocument();
    });

    fireEvent.click(bell);
    expect(screen.queryByTestId("notification-dropdown")).not.toBeInTheDocument();
  });

  it("closes dropdown on Escape key", async () => {
    render(<NotificationCenter />);
    vi.advanceTimersByTime(100);

    fireEvent.click(screen.getByTestId("notification-bell"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("notification-dropdown")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("notification-dropdown")).not.toBeInTheDocument();
  });

  it("shows notification list in dropdown", async () => {
    render(<NotificationCenter />);
    vi.advanceTimersByTime(100);

    fireEvent.click(screen.getByTestId("notification-bell"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("notification-list")).toBeInTheDocument();
    });
  });

  it("has mark all read button when there are unread notifications", async () => {
    render(<NotificationCenter />);
    vi.advanceTimersByTime(100);

    fireEvent.click(screen.getByTestId("notification-bell"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("mark-all-read")).toBeInTheDocument();
    });
  });

  it("marks all as read when clicking mark all read", async () => {
    render(<NotificationCenter />);
    vi.advanceTimersByTime(100);

    fireEvent.click(screen.getByTestId("notification-bell"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("mark-all-read")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("mark-all-read"));

    await vi.waitFor(() => {
      expect(screen.queryByTestId("mark-all-read")).not.toBeInTheDocument();
    });
  });

  it("clears all notifications when clicking clear all", async () => {
    render(<NotificationCenter />);
    vi.advanceTimersByTime(100);

    fireEvent.click(screen.getByTestId("notification-bell"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("clear-all")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("clear-all"));

    await vi.waitFor(() => {
      expect(screen.queryByTestId("clear-all")).not.toBeInTheDocument();
      expect(screen.getByText("No notifications")).toBeInTheDocument();
    });
  });

  it("has correct aria-label with unread count", async () => {
    render(<NotificationCenter />);
    vi.advanceTimersByTime(100);

    await vi.waitFor(() => {
      const bell = screen.getByTestId("notification-bell");
      expect(bell.getAttribute("aria-label")).toMatch(/unread/);
    });
  });

  it("persists notifications to localStorage", async () => {
    render(<NotificationCenter />);
    vi.advanceTimersByTime(100);

    await vi.waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "fleet-dashboard-notifications",
        expect.any(String),
      );
    });
  });

  it("shows Alerts and History tabs in dropdown", async () => {
    render(<NotificationCenter />);
    vi.advanceTimersByTime(100);

    fireEvent.click(screen.getByTestId("notification-bell"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("tab-notifications")).toBeInTheDocument();
      expect(screen.getByTestId("tab-history")).toBeInTheDocument();
    });
  });

  it("shows history panel when History tab is clicked", async () => {
    const activityLog = [
      {
        id: "evt-1",
        timestamp: new Date().toISOString(),
        agentName: "agent-alpha",
        eventType: "commit" as const,
        description: "feat: test commit",
      },
    ];
    render(<NotificationCenter activityLog={activityLog} />);
    vi.advanceTimersByTime(100);

    fireEvent.click(screen.getByTestId("notification-bell"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("tab-history")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tab-history"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("history-event-list")).toBeInTheDocument();
    });
  });

  it("shows notification list when Alerts tab is active", async () => {
    render(<NotificationCenter />);
    vi.advanceTimersByTime(100);

    fireEvent.click(screen.getByTestId("notification-bell"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("notification-list")).toBeInTheDocument();
    });

    // Switch to history and back
    fireEvent.click(screen.getByTestId("tab-history"));
    fireEvent.click(screen.getByTestId("tab-notifications"));

    await vi.waitFor(() => {
      expect(screen.getByTestId("notification-list")).toBeInTheDocument();
    });
  });
});
