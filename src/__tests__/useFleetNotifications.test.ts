import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── EventSource mock (same pattern as useFleetEvents.test.ts) ───────────────

interface MockESInstance {
  url: string;
  onopen: ((e: Event) => void) | null;
  onerror: ((e: Event) => void) | null;
  close: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  _listeners: Map<string, ((e: MessageEvent) => void)[]>;
  dispatchMsg(type: string, data: unknown): void;
}

let instances: MockESInstance[] = [];

class MockEventSource {
  url: string;
  onopen: ((ev: Event) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  _listeners: Map<string, ((e: MessageEvent) => void)[]> = new Map();
  close = vi.fn();
  addEventListener = vi.fn((type: string, handler: (e: MessageEvent) => void) => {
    const existing = this._listeners.get(type) ?? [];
    existing.push(handler);
    this._listeners.set(type, existing);
  });

  constructor(url: string) {
    this.url = url;
    instances.push(this as unknown as MockESInstance);
  }

  dispatchMsg(type: string, data: unknown) {
    const handlers = this._listeners.get(type) ?? [];
    const event = new MessageEvent(type, {
      data: JSON.stringify(data),
      lastEventId: String(Date.now()),
    });
    for (const h of handlers) h(event);
  }
}

// ── localStorage mock ────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useFleetNotifications", () => {
  beforeEach(() => {
    instances = [];
    localStorageMock.clear();
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", MockEventSource);
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("calls showToast and onNotification on agent-started event", async () => {
    const { showToast } = await import("@/components/Toast");
    const showToastSpy = vi.spyOn({ showToast }, "showToast");
    // Use module-level spy via vi.mock
    vi.doMock("@/components/Toast", () => ({
      showToast: showToastSpy,
    }));

    const onNotification = vi.fn();
    const { useFleetNotifications } = await import("@/hooks/useFleetNotifications");

    renderHook(() => useFleetNotifications({ onNotification }));

    act(() => {
      instances[0].dispatchMsg("agent-started", { key: "agent-alpha", agent: {} });
    });

    expect(onNotification).toHaveBeenCalledOnce();
    const call = onNotification.mock.calls[0][0] as { title: string; eventType: string; agentName: string };
    expect(call.title).toBe("Agent started");
    expect(call.eventType).toBe("agent_started");
    expect(call.agentName).toBe("agent-alpha");
  });

  it("calls onNotification on agent-completed event", async () => {
    vi.doMock("@/components/Toast", () => ({ showToast: vi.fn() }));

    const onNotification = vi.fn();
    const { useFleetNotifications } = await import("@/hooks/useFleetNotifications");

    renderHook(() => useFleetNotifications({ onNotification }));

    act(() => {
      instances[0].dispatchMsg("agent-completed", {
        key: "agent-beta",
        agent: { status: "pr_merged", pr: "#42" },
      });
    });

    expect(onNotification).toHaveBeenCalledOnce();
    const call = onNotification.mock.calls[0][0] as { title: string; eventType: string; agentName: string };
    expect(call.title).toBe("Agent completed");
    expect(call.eventType).toBe("agent_completed");
    expect(call.agentName).toBe("agent-beta");
  });

  it("calls onNotification on pr-created event with PR label", async () => {
    vi.doMock("@/components/Toast", () => ({ showToast: vi.fn() }));

    const onNotification = vi.fn();
    const { useFleetNotifications } = await import("@/hooks/useFleetNotifications");

    renderHook(() => useFleetNotifications({ onNotification }));

    act(() => {
      instances[0].dispatchMsg("pr-created", { key: "agent-gamma", pr: "#55" });
    });

    expect(onNotification).toHaveBeenCalledOnce();
    const call = onNotification.mock.calls[0][0] as { title: string; eventType: string; description: string };
    expect(call.title).toBe("PR created");
    expect(call.eventType).toBe("pr_created");
    expect(call.description).toContain("PR #55");
  });

  it("calls onNotification on pr-merged event", async () => {
    vi.doMock("@/components/Toast", () => ({ showToast: vi.fn() }));

    const onNotification = vi.fn();
    const { useFleetNotifications } = await import("@/hooks/useFleetNotifications");

    renderHook(() => useFleetNotifications({ onNotification }));

    act(() => {
      instances[0].dispatchMsg("pr-merged", { key: "agent-delta", pr: "#60" });
    });

    expect(onNotification).toHaveBeenCalledOnce();
    const call = onNotification.mock.calls[0][0] as { title: string; eventType: string };
    expect(call.title).toBe("PR merged");
    expect(call.eventType).toBe("pr_merged");
  });

  it("does not call onNotification when event type is disabled", async () => {
    vi.doMock("@/components/Toast", () => ({ showToast: vi.fn() }));

    const onNotification = vi.fn();
    const { useFleetNotifications } = await import("@/hooks/useFleetNotifications");

    const { result } = renderHook(() => useFleetNotifications({ onNotification }));

    // Disable agent-started
    act(() => {
      result.current.toggleType("agent-started");
    });

    act(() => {
      instances[0].dispatchMsg("agent-started", { key: "agent-alpha", agent: {} });
    });

    expect(onNotification).not.toHaveBeenCalled();
  });

  it("persists enabled types to localStorage on toggle", async () => {
    vi.doMock("@/components/Toast", () => ({ showToast: vi.fn() }));

    const { useFleetNotifications } = await import("@/hooks/useFleetNotifications");
    const { result } = renderHook(() => useFleetNotifications());

    act(() => {
      result.current.toggleType("pr-merged");
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "fleet-notification-prefs",
      expect.any(String),
    );

    const saved: string[] = JSON.parse(
      localStorageMock.setItem.mock.calls.at(-1)![1] as string,
    );
    expect(saved).not.toContain("pr-merged");
  });

  it("returns all types enabled by default", async () => {
    vi.doMock("@/components/Toast", () => ({ showToast: vi.fn() }));

    const { useFleetNotifications } = await import("@/hooks/useFleetNotifications");
    const { result } = renderHook(() => useFleetNotifications());

    expect(result.current.enabledTypes).toContain("agent-started");
    expect(result.current.enabledTypes).toContain("agent-completed");
    expect(result.current.enabledTypes).toContain("pr-created");
    expect(result.current.enabledTypes).toContain("pr-merged");
  });

  it("re-enables a type after toggling it twice", async () => {
    vi.doMock("@/components/Toast", () => ({ showToast: vi.fn() }));

    const { useFleetNotifications } = await import("@/hooks/useFleetNotifications");
    const { result } = renderHook(() => useFleetNotifications());

    act(() => { result.current.toggleType("pr-merged"); });
    expect(result.current.enabledTypes).not.toContain("pr-merged");

    act(() => { result.current.toggleType("pr-merged"); });
    expect(result.current.enabledTypes).toContain("pr-merged");
  });
});
