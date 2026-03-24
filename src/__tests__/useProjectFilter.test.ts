import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectFilter } from "@/hooks/useProjectFilter";

describe("useProjectFilter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to 'all' when no localStorage value", () => {
    const { result } = renderHook(() => useProjectFilter());
    expect(result.current.selectedProject).toBe("all");
  });

  it("reads initial value from localStorage", () => {
    localStorage.setItem("fleet-project-filter", "sergi-izquierdo/fleet-dashboard");
    const { result } = renderHook(() => useProjectFilter());
    expect(result.current.selectedProject).toBe("sergi-izquierdo/fleet-dashboard");
  });

  it("persists selection to localStorage", () => {
    const { result } = renderHook(() => useProjectFilter());
    act(() => {
      result.current.setProject("sergi-izquierdo/synapse-notes");
    });
    expect(result.current.selectedProject).toBe("sergi-izquierdo/synapse-notes");
    expect(localStorage.getItem("fleet-project-filter")).toBe(
      "sergi-izquierdo/synapse-notes"
    );
  });

  it("can reset to all", () => {
    const { result } = renderHook(() => useProjectFilter());
    act(() => {
      result.current.setProject("sergi-izquierdo/fleet-dashboard");
    });
    act(() => {
      result.current.setProject("all");
    });
    expect(result.current.selectedProject).toBe("all");
    expect(localStorage.getItem("fleet-project-filter")).toBe("all");
  });
});
