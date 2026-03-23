import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { BottomNav, type MobileTab } from "@/components/BottomNav";

describe("BottomNav", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all four tabs", () => {
    render(<BottomNav activeTab="agents" onTabChange={() => {}} />);
    expect(screen.getByTestId("bottom-nav-agents")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-nav-prs")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-nav-activity")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-nav-health")).toBeInTheDocument();
  });

  it("marks active tab with aria-current", () => {
    render(<BottomNav activeTab="prs" onTabChange={() => {}} />);
    expect(screen.getByTestId("bottom-nav-prs")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("bottom-nav-agents")).not.toHaveAttribute("aria-current");
  });

  it("calls onTabChange when a tab is clicked", () => {
    const onChange = vi.fn();
    render(<BottomNav activeTab="agents" onTabChange={onChange} />);
    fireEvent.click(screen.getByTestId("bottom-nav-activity"));
    expect(onChange).toHaveBeenCalledWith("activity");
  });

  it("has touch-friendly minimum sizes (44px+)", () => {
    render(<BottomNav activeTab="agents" onTabChange={() => {}} />);
    const tabs: MobileTab[] = ["agents", "prs", "activity", "health"];
    for (const tab of tabs) {
      const el = screen.getByTestId(`bottom-nav-${tab}`);
      // Check that min-h and min-w classes are applied
      expect(el.className).toContain("min-h-[56px]");
      expect(el.className).toContain("min-w-[56px]");
    }
  });

  it("has navigation landmark", () => {
    render(<BottomNav activeTab="agents" onTabChange={() => {}} />);
    expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeInTheDocument();
  });
});
