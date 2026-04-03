import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useDashboardLayout,
  DEFAULT_ORDER,
  type SectionId,
} from "@/hooks/useDashboardLayout";

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
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("useDashboardLayout", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns default order when no saved layout", () => {
    const { result } = renderHook(() => useDashboardLayout());
    expect(result.current.order).toEqual(DEFAULT_ORDER);
  });

  it("loads saved order from localStorage", () => {
    const customOrder: SectionId[] = [
      "activity",
      "agents",
      "metrics",
      "timeline",
      "heatmap",
      "prs",
      "trends",
    ];
    localStorageMock.setItem(
      "fleet-dashboard-layout",
      JSON.stringify(customOrder),
    );

    const { result } = renderHook(() => useDashboardLayout());
    expect(result.current.order).toEqual(customOrder);
  });

  it("falls back to default order when localStorage has invalid data", () => {
    localStorageMock.setItem("fleet-dashboard-layout", "not-valid-json{{{");
    const { result } = renderHook(() => useDashboardLayout());
    expect(result.current.order).toEqual(DEFAULT_ORDER);
  });

  it("falls back to default order when stored array has wrong items", () => {
    localStorageMock.setItem(
      "fleet-dashboard-layout",
      JSON.stringify(["foo", "bar"]),
    );
    const { result } = renderHook(() => useDashboardLayout());
    expect(result.current.order).toEqual(DEFAULT_ORDER);
  });

  it("reorder updates state and persists to localStorage", () => {
    const { result } = renderHook(() => useDashboardLayout());

    const newOrder: SectionId[] = [
      "activity",
      "agents",
      "metrics",
      "timeline",
      "heatmap",
      "prs",
      "trends",
    ];

    act(() => {
      result.current.reorder(newOrder);
    });

    expect(result.current.order).toEqual(newOrder);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "fleet-dashboard-layout",
      JSON.stringify(newOrder),
    );
  });

  it("resetLayout restores default order and removes from localStorage", () => {
    const customOrder: SectionId[] = [
      "activity",
      "agents",
      "metrics",
      "timeline",
      "heatmap",
      "prs",
      "trends",
    ];
    localStorageMock.setItem(
      "fleet-dashboard-layout",
      JSON.stringify(customOrder),
    );
    const { result } = renderHook(() => useDashboardLayout());

    act(() => {
      result.current.resetLayout();
    });

    expect(result.current.order).toEqual(DEFAULT_ORDER);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "fleet-dashboard-layout",
    );
  });
});
