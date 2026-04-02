import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getEnabledEventTypes,
  setEnabledEventTypes,
  ACTIONABLE_EVENT_TYPES,
} from "@/hooks/useFleetNotifications";

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

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useFleetNotifications - getEnabledEventTypes", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns all actionable event types by default", () => {
    const types = getEnabledEventTypes();
    expect(types).toEqual(ACTIONABLE_EVENT_TYPES);
  });

  it("returns stored preferences when available", () => {
    localStorageMock.setItem(
      "fleet-notification-enabled-types",
      JSON.stringify(["agent-started", "pr-merged"]),
    );
    const types = getEnabledEventTypes();
    expect(types).toEqual(["agent-started", "pr-merged"]);
  });

  it("filters out invalid event types from stored preferences", () => {
    localStorageMock.setItem(
      "fleet-notification-enabled-types",
      JSON.stringify(["agent-started", "invalid-type", "pr-merged"]),
    );
    const types = getEnabledEventTypes();
    expect(types).toEqual(["agent-started", "pr-merged"]);
  });

  it("falls back to all types when stored JSON is invalid", () => {
    localStorageMock.setItem("fleet-notification-enabled-types", "not-json");
    const types = getEnabledEventTypes();
    expect(types).toEqual(ACTIONABLE_EVENT_TYPES);
  });

  it("falls back to all types when stored preferences are empty after filtering", () => {
    localStorageMock.setItem(
      "fleet-notification-enabled-types",
      JSON.stringify(["invalid-type"]),
    );
    const types = getEnabledEventTypes();
    expect(types).toEqual(ACTIONABLE_EVENT_TYPES);
  });
});

describe("useFleetNotifications - setEnabledEventTypes", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("saves enabled types to localStorage", () => {
    setEnabledEventTypes(["agent-started", "pr-merged"]);
    const stored = localStorage.getItem("fleet-notification-enabled-types");
    expect(stored).toBe(JSON.stringify(["agent-started", "pr-merged"]));
  });

  it("persists empty array to localStorage", () => {
    setEnabledEventTypes([]);
    const stored = localStorage.getItem("fleet-notification-enabled-types");
    expect(stored).toBe("[]");
  });
});

describe("ACTIONABLE_EVENT_TYPES", () => {
  it("includes the four expected fleet event types", () => {
    expect(ACTIONABLE_EVENT_TYPES).toContain("agent-started");
    expect(ACTIONABLE_EVENT_TYPES).toContain("agent-completed");
    expect(ACTIONABLE_EVENT_TYPES).toContain("pr-created");
    expect(ACTIONABLE_EVENT_TYPES).toContain("pr-merged");
  });

  it("does not include non-actionable types", () => {
    expect(ACTIONABLE_EVENT_TYPES).not.toContain("connected");
    expect(ACTIONABLE_EVENT_TYPES).not.toContain("cycle");
  });
});
