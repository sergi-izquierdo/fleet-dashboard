import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

// Mock useFleetNotifications so the component doesn't try to open an SSE connection
vi.mock("@/hooks/useFleetNotifications", () => ({
  useFleetNotifications: vi.fn().mockReturnValue({
    enabledTypes: ["agent-started", "agent-completed", "pr-created", "pr-merged"],
    toggleType: vi.fn(),
  }),
}));

// Mock useNotifications to avoid localStorage dependency in this test
vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: vi.fn().mockReturnValue({
    notifications: [],
    unreadCount: 0,
    isLoaded: true,
    addNotification: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    dismiss: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

describe("FleetNotifications", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing (returns null)", async () => {
    const { FleetNotifications } = await import("@/components/FleetNotifications");
    const { container } = render(<FleetNotifications />);
    expect(container.firstChild).toBeNull();
  });

  it("wires addNotification from useNotifications into useFleetNotifications", async () => {
    const { useNotifications } = await import("@/hooks/useNotifications");
    const { useFleetNotifications } = await import("@/hooks/useFleetNotifications");
    const addNotificationMock = vi.fn();
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoaded: true,
      addNotification: addNotificationMock,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      dismiss: vi.fn(),
      clearAll: vi.fn(),
    });

    const { FleetNotifications } = await import("@/components/FleetNotifications");
    render(<FleetNotifications />);

    expect(useFleetNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ onNotification: addNotificationMock }),
    );
  });
});
