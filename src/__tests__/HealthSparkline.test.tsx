import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { HealthSparkline } from "@/components/HealthSparkline";
import type { HealthTimelineEntry } from "@/types/dashboard";

const mockTimeline: HealthTimelineEntry[] = [
  { timestamp: "2026-03-23T08:00:00Z", status: "working" },
  { timestamp: "2026-03-23T08:30:00Z", status: "idle" },
  { timestamp: "2026-03-23T09:00:00Z", status: "error" },
  { timestamp: "2026-03-23T09:30:00Z", status: "working" },
];

describe("HealthSparkline", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders sparkline with bars", () => {
    render(<HealthSparkline timeline={mockTimeline} />);
    const sparkline = screen.getByTestId("health-sparkline");
    expect(sparkline).toBeInTheDocument();
    const svg = sparkline.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const rects = svg!.querySelectorAll("rect");
    expect(rects).toHaveLength(4);
  });

  it("uses correct colors for each status", () => {
    render(<HealthSparkline timeline={mockTimeline} />);
    const svg = screen.getByTestId("health-sparkline").querySelector("svg")!;
    const rects = svg.querySelectorAll("rect");
    expect(rects[0]).toHaveAttribute("fill", "#22c55e"); // working = green
    expect(rects[1]).toHaveAttribute("fill", "#eab308"); // idle = yellow
    expect(rects[2]).toHaveAttribute("fill", "#ef4444"); // error = red
    expect(rects[3]).toHaveAttribute("fill", "#22c55e"); // working = green
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<HealthSparkline timeline={mockTimeline} onClick={handleClick} />);
    fireEvent.click(screen.getByTestId("health-sparkline"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("returns null for empty timeline", () => {
    const { container } = render(<HealthSparkline timeline={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
