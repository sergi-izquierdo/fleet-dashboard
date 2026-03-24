import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCollapsedSections } from "@/hooks/useCollapsedSections";

describe("useCollapsedSections", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns stats as expanded by default", () => {
    const { result } = renderHook(() => useCollapsedSections());
    expect(result.current.isExpanded("stats")).toBe(true);
  });

  it("returns agent-sessions as expanded by default", () => {
    const { result } = renderHook(() => useCollapsedSections());
    expect(result.current.isExpanded("agent-sessions")).toBe(true);
  });

  it("returns other sections as collapsed by default", () => {
    const { result } = renderHook(() => useCollapsedSections());
    expect(result.current.isExpanded("prs")).toBe(false);
    expect(result.current.isExpanded("activity")).toBe(false);
    expect(result.current.isExpanded("token-usage")).toBe(false);
    expect(result.current.isExpanded("issue-progress")).toBe(false);
  });

  it("toggles a section from collapsed to expanded", () => {
    const { result } = renderHook(() => useCollapsedSections());
    expect(result.current.isExpanded("prs")).toBe(false);

    act(() => {
      result.current.toggle("prs");
    });

    expect(result.current.isExpanded("prs")).toBe(true);
  });

  it("toggles a section from expanded to collapsed", () => {
    const { result } = renderHook(() => useCollapsedSections());
    expect(result.current.isExpanded("stats")).toBe(true);

    act(() => {
      result.current.toggle("stats");
    });

    expect(result.current.isExpanded("stats")).toBe(false);
  });

  it("persists state to localStorage", () => {
    const { result } = renderHook(() => useCollapsedSections());

    act(() => {
      result.current.toggle("prs");
    });

    const stored = JSON.parse(localStorage.getItem("fleet-dashboard-collapsed-sections") ?? "{}");
    expect(stored.prs).toBe(true);
  });

  it("restores state from localStorage", () => {
    localStorage.setItem(
      "fleet-dashboard-collapsed-sections",
      JSON.stringify({ stats: false, prs: true }),
    );

    const { result } = renderHook(() => useCollapsedSections());
    expect(result.current.isExpanded("stats")).toBe(false);
    expect(result.current.isExpanded("prs")).toBe(true);
  });

  it("handles invalid localStorage data gracefully", () => {
    localStorage.setItem("fleet-dashboard-collapsed-sections", "not-json");

    const { result } = renderHook(() => useCollapsedSections());
    // Falls back to defaults
    expect(result.current.isExpanded("stats")).toBe(true);
    expect(result.current.isExpanded("prs")).toBe(false);
  });

  it("handles array localStorage data gracefully", () => {
    localStorage.setItem("fleet-dashboard-collapsed-sections", "[1,2,3]");

    const { result } = renderHook(() => useCollapsedSections());
    // Falls back to defaults since it's not an object
    expect(result.current.isExpanded("stats")).toBe(true);
  });
});
