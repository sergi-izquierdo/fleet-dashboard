import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { FleetNotifications } from "@/components/FleetNotifications";

const { mockUseFleetNotifications } = vi.hoisted(() => ({
  mockUseFleetNotifications: vi.fn(),
}));

vi.mock("@/hooks/useFleetNotifications", () => ({
  useFleetNotifications: mockUseFleetNotifications,
}));

describe("FleetNotifications", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders without throwing", () => {
    expect(() => render(<FleetNotifications />)).not.toThrow();
  });

  it("renders null — no visible DOM output", () => {
    const { container } = render(<FleetNotifications />);
    expect(container.firstChild).toBeNull();
  });

  it("calls useFleetNotifications hook on mount", () => {
    render(<FleetNotifications />);
    expect(mockUseFleetNotifications).toHaveBeenCalledOnce();
  });
});
