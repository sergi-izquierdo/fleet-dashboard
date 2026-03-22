import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

describe("LoadingSkeleton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the skeleton container", () => {
    render(<LoadingSkeleton />);
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders multiple pulse placeholders", () => {
    const { container } = render(<LoadingSkeleton />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(6);
  });
});
