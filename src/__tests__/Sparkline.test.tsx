import { render, screen } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { Sparkline } from "@/components/ui/Sparkline";

afterEach(() => {
  cleanup();
});

describe("Sparkline", () => {
  it("renders an SVG element", () => {
    render(<Sparkline data={[1, 2, 3]} />);
    const svg = screen.getByTestId("sparkline");
    expect(svg.tagName.toLowerCase()).toBe("svg");
  });

  it("renders with default dimensions (80x24)", () => {
    render(<Sparkline data={[1, 2, 3]} />);
    const svg = screen.getByTestId("sparkline");
    expect(svg).toHaveAttribute("width", "80");
    expect(svg).toHaveAttribute("height", "24");
  });

  it("renders with custom dimensions", () => {
    render(<Sparkline data={[1, 2, 3]} width={120} height={40} />);
    const svg = screen.getByTestId("sparkline");
    expect(svg).toHaveAttribute("width", "120");
    expect(svg).toHaveAttribute("height", "40");
  });

  it("renders a flat line for empty data", () => {
    render(<Sparkline data={[]} />);
    const svg = screen.getByTestId("sparkline");
    expect(svg).toBeInTheDocument();
    // Should render a line element (not a polyline)
    const line = svg.querySelector("line");
    expect(line).not.toBeNull();
    const polyline = svg.querySelector("polyline");
    expect(polyline).toBeNull();
  });

  it("renders a polyline for non-empty data", () => {
    render(<Sparkline data={[1, 3, 2, 5, 4]} />);
    const svg = screen.getByTestId("sparkline");
    const polyline = svg.querySelector("polyline");
    expect(polyline).not.toBeNull();
  });

  it("renders a gradient fill for non-empty data", () => {
    render(<Sparkline data={[1, 2, 3]} />);
    const svg = screen.getByTestId("sparkline");
    const gradient = svg.querySelector("linearGradient");
    expect(gradient).not.toBeNull();
    const fillPath = svg.querySelector("path");
    expect(fillPath).not.toBeNull();
  });

  it("handles single data point without crashing", () => {
    render(<Sparkline data={[42]} />);
    const svg = screen.getByTestId("sparkline");
    expect(svg).toBeInTheDocument();
  });

  it("handles all-equal data without crashing", () => {
    render(<Sparkline data={[5, 5, 5, 5]} />);
    const svg = screen.getByTestId("sparkline");
    expect(svg).toBeInTheDocument();
    const polyline = svg.querySelector("polyline");
    expect(polyline).not.toBeNull();
  });

  it("applies custom color to polyline", () => {
    render(<Sparkline data={[1, 2, 3]} color="#ff0000" />);
    const svg = screen.getByTestId("sparkline");
    const polyline = svg.querySelector("polyline");
    expect(polyline).toHaveAttribute("stroke", "#ff0000");
  });

  it("is aria-hidden for screen readers", () => {
    render(<Sparkline data={[1, 2, 3]} />);
    const svg = screen.getByTestId("sparkline");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
