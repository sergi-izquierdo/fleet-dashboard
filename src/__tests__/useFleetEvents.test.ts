import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { FleetEvent } from "@/hooks/useFleetEvents";

// ── EventSource mock ───────────────────────────────────────────────────────────

interface MockESInstance {
  url: string;
  onopen: ((e: Event) => void) | null;
  onerror: ((e: Event) => void) | null;
  close: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  _listeners: Map<string, ((e: MessageEvent) => void)[]>;
  dispatchOpen(): void;
  dispatchError(): void;
  dispatchMsg(type: string, data: unknown): void;
}

let instances: MockESInstance[] = [];
const constructorSpy = vi.fn();

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
    constructorSpy(url);
    instances.push(this as unknown as MockESInstance);
  }

  dispatchOpen() {
    this.onopen?.(new Event("open"));
  }

  dispatchError() {
    this.onerror?.(new Event("error"));
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

describe("useFleetEvents", () => {
  beforeEach(() => {
    instances = [];
    constructorSpy.mockClear();
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", MockEventSource);
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("opens an EventSource connection on mount", async () => {
    const { useFleetEvents } = await import("@/hooks/useFleetEvents");
    const onEvent = vi.fn();

    renderHook(() => useFleetEvents(onEvent));

    expect(constructorSpy).toHaveBeenCalledOnce();
    expect(constructorSpy).toHaveBeenCalledWith("/api/events/stream");
  });

  it("uses a custom URL when provided", async () => {
    const { useFleetEvents } = await import("@/hooks/useFleetEvents");
    const onEvent = vi.fn();

    renderHook(() => useFleetEvents(onEvent, { url: "/api/custom/stream" }));

    expect(constructorSpy).toHaveBeenCalledWith("/api/custom/stream");
  });

  it("calls onEvent when an event is dispatched", async () => {
    const { useFleetEvents } = await import("@/hooks/useFleetEvents");
    const onEvent = vi.fn();

    renderHook(() => useFleetEvents(onEvent));

    act(() => {
      (instances[0] as unknown as { dispatchMsg: (t: string, d: unknown) => void }).dispatchMsg(
        "cycle",
        { finishedAt: "2024-01-01T00:00:00Z" },
      );
    });

    expect(onEvent).toHaveBeenCalledOnce();
    const call = onEvent.mock.calls[0][0] as FleetEvent;
    expect(call.type).toBe("cycle");
    expect(call.data).toEqual({ finishedAt: "2024-01-01T00:00:00Z" });
  });

  it("filters events when eventTypes is provided", async () => {
    const { useFleetEvents } = await import("@/hooks/useFleetEvents");
    const onEvent = vi.fn();

    renderHook(() => useFleetEvents(onEvent, { eventTypes: ["cycle"] }));

    const inst = instances[0] as unknown as { dispatchMsg: (t: string, d: unknown) => void };
    act(() => {
      inst.dispatchMsg("agent-started", { key: "agent-1" });
      inst.dispatchMsg("cycle", { finishedAt: "2024-01-01" });
    });

    // Only cycle event passes through
    expect(onEvent).toHaveBeenCalledOnce();
    const call = onEvent.mock.calls[0][0] as FleetEvent;
    expect(call.type).toBe("cycle");
  });

  it("calls onConnect when connection opens", async () => {
    const { useFleetEvents } = await import("@/hooks/useFleetEvents");
    const onEvent = vi.fn();
    const onConnect = vi.fn();

    renderHook(() => useFleetEvents(onEvent, { onConnect }));

    act(() => {
      (instances[0] as unknown as { dispatchOpen: () => void }).dispatchOpen();
    });

    expect(onConnect).toHaveBeenCalledOnce();
  });

  it("calls onDisconnect when connection errors", async () => {
    const { useFleetEvents } = await import("@/hooks/useFleetEvents");
    const onEvent = vi.fn();
    const onDisconnect = vi.fn();

    renderHook(() => useFleetEvents(onEvent, { onDisconnect }));

    act(() => {
      (instances[0] as unknown as { dispatchError: () => void }).dispatchError();
    });

    expect(onDisconnect).toHaveBeenCalledOnce();
  });

  it("reconnects after an error with backoff delay", async () => {
    const { useFleetEvents } = await import("@/hooks/useFleetEvents");
    const onEvent = vi.fn();

    renderHook(() => useFleetEvents(onEvent));

    expect(constructorSpy).toHaveBeenCalledTimes(1);

    act(() => {
      (instances[0] as unknown as { dispatchError: () => void }).dispatchError();
    });

    expect(constructorSpy).toHaveBeenCalledTimes(1); // not reconnected yet

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(constructorSpy).toHaveBeenCalledTimes(2);
  });

  it("doubles the backoff on consecutive errors", async () => {
    const { useFleetEvents } = await import("@/hooks/useFleetEvents");
    const onEvent = vi.fn();

    renderHook(() => useFleetEvents(onEvent));

    // First error → reconnect after 1000ms
    act(() => { (instances[0] as unknown as { dispatchError: () => void }).dispatchError(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(constructorSpy).toHaveBeenCalledTimes(2);

    // Second error → reconnect after 2000ms
    act(() => { (instances[1] as unknown as { dispatchError: () => void }).dispatchError(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_999); });
    expect(constructorSpy).toHaveBeenCalledTimes(2); // not yet
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(constructorSpy).toHaveBeenCalledTimes(3);
  });

  it("resets backoff to initial value after successful connection", async () => {
    const { useFleetEvents } = await import("@/hooks/useFleetEvents");
    const onEvent = vi.fn();

    renderHook(() => useFleetEvents(onEvent));

    // Error → reconnect after 1000ms
    act(() => { (instances[0] as unknown as { dispatchError: () => void }).dispatchError(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });

    // Error again → backoff is 2000ms
    act(() => { (instances[1] as unknown as { dispatchError: () => void }).dispatchError(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(constructorSpy).toHaveBeenCalledTimes(3);

    // Successful open → resets backoff
    act(() => { (instances[2] as unknown as { dispatchOpen: () => void }).dispatchOpen(); });

    // Another error → should reconnect after 1000ms (reset), not 4000ms
    act(() => { (instances[2] as unknown as { dispatchError: () => void }).dispatchError(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(999); });
    expect(constructorSpy).toHaveBeenCalledTimes(3); // not yet
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(constructorSpy).toHaveBeenCalledTimes(4);
  });

  it("caps backoff at MAX_BACKOFF_MS (30s)", async () => {
    const { useFleetEvents } = await import("@/hooks/useFleetEvents");
    const onEvent = vi.fn();

    renderHook(() => useFleetEvents(onEvent));

    // Fire enough errors to push backoff to max: 1s → 2s → 4s → 8s → 16s → 30s (capped)
    const delays = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];
    for (const delay of delays) {
      const last = instances[instances.length - 1] as unknown as { dispatchError: () => void };
      act(() => { last.dispatchError(); });
      await act(async () => { await vi.advanceTimersByTimeAsync(delay); });
    }

    // At this point backoff is capped at 30s; next reconnect should take 30s not 60s
    const last = instances[instances.length - 1] as unknown as { dispatchError: () => void };
    act(() => { last.dispatchError(); });
    const countBefore = constructorSpy.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(29_999); });
    expect(constructorSpy.mock.calls.length).toBe(countBefore); // not yet
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(constructorSpy.mock.calls.length).toBe(countBefore + 1);
  });

  it("closes EventSource and cancels reconnect on unmount", async () => {
    const { useFleetEvents } = await import("@/hooks/useFleetEvents");
    const onEvent = vi.fn();

    const { unmount } = renderHook(() => useFleetEvents(onEvent));

    const inst = instances[0] as unknown as {
      dispatchError: () => void;
      close: ReturnType<typeof vi.fn>;
    };
    act(() => { inst.dispatchError(); }); // schedules reconnect

    unmount();

    // After unmount, the reconnect timer should NOT fire a new connection
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(constructorSpy).toHaveBeenCalledTimes(1); // no reconnect

    expect(inst.close).toHaveBeenCalled();
  });

  it("does not call onEvent after unmount", async () => {
    const { useFleetEvents } = await import("@/hooks/useFleetEvents");
    const onEvent = vi.fn();

    const { unmount } = renderHook(() => useFleetEvents(onEvent));

    const inst = instances[0] as unknown as { dispatchMsg: (t: string, d: unknown) => void };
    unmount();

    act(() => { inst.dispatchMsg("cycle", { finishedAt: "2024-01-01" }); });

    expect(onEvent).not.toHaveBeenCalled();
  });

  it("subscribes to all event types by default", async () => {
    const { useFleetEvents } = await import("@/hooks/useFleetEvents");
    const onEvent = vi.fn();

    renderHook(() => useFleetEvents(onEvent));

    const inst = instances[0] as unknown as { addEventListener: ReturnType<typeof vi.fn> };
    const subscribedTypes = inst.addEventListener.mock.calls.map(
      (c: unknown[]) => c[0],
    );

    expect(subscribedTypes).toContain("connected");
    expect(subscribedTypes).toContain("cycle");
    expect(subscribedTypes).toContain("agent-started");
    expect(subscribedTypes).toContain("agent-completed");
    expect(subscribedTypes).toContain("pr-created");
    expect(subscribedTypes).toContain("pr-merged");
  });
});
