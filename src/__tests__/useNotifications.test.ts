import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useNotifications } from "@/hooks/useNotifications";

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

describe("useNotifications", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("starts with empty notifications", () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it("adds a notification", () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        title: "Test notification",
        description: "Test description",
        eventType: "ci_failed",
        agentName: "agent-1",
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].title).toBe("Test notification");
    expect(result.current.notifications[0].severity).toBe("error");
    expect(result.current.notifications[0].read).toBe(false);
    expect(result.current.unreadCount).toBe(1);
  });

  it("marks a notification as read", () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        title: "Test",
        description: "Desc",
        eventType: "pr_merged",
      });
    });

    const id = result.current.notifications[0].id;

    act(() => {
      result.current.markAsRead(id);
    });

    expect(result.current.notifications[0].read).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it("marks all as read", () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        title: "Test 1",
        description: "Desc",
        eventType: "ci_failed",
      });
      result.current.addNotification({
        title: "Test 2",
        description: "Desc",
        eventType: "pr_merged",
      });
    });

    act(() => {
      result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });

  it("dismisses a notification", () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        title: "Test",
        description: "Desc",
        eventType: "deploy",
      });
    });

    const id = result.current.notifications[0].id;

    act(() => {
      result.current.dismiss(id);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it("clears all notifications", () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        title: "Test 1",
        description: "Desc",
        eventType: "ci_failed",
      });
      result.current.addNotification({
        title: "Test 2",
        description: "Desc",
        eventType: "pr_merged",
      });
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it("maps event types to correct severity", () => {
    const { result } = renderHook(() => useNotifications());

    const testCases = [
      { eventType: "pr_merged" as const, expectedSeverity: "success" },
      { eventType: "ci_failed" as const, expectedSeverity: "error" },
      { eventType: "agent_stuck" as const, expectedSeverity: "warning" },
      { eventType: "deploy" as const, expectedSeverity: "info" },
    ];

    for (const { eventType, expectedSeverity } of testCases) {
      act(() => {
        result.current.addNotification({
          title: `Test ${eventType}`,
          description: "Desc",
          eventType,
        });
      });

      expect(result.current.notifications[0].severity).toBe(expectedSeverity);

      act(() => {
        result.current.clearAll();
      });
    }
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        title: "Persisted",
        description: "Should be saved",
        eventType: "ci_passed",
      });
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "fleet-dashboard-notifications",
      expect.any(String),
    );
  });

  it("limits notifications to MAX_NOTIFICATIONS", () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      for (let i = 0; i < 55; i++) {
        result.current.addNotification({
          title: `Notification ${i}`,
          description: "Desc",
          eventType: "commit" as never,
        });
      }
    });

    expect(result.current.notifications.length).toBeLessThanOrEqual(50);
  });
});
