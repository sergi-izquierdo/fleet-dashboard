import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import TrendIndicator, { TrendIndicatorBlock } from "@/components/TrendIndicator";

afterEach(cleanup);

describe("TrendIndicator", () => {
  it("shows 'same as last week' when delta is zero", () => {
    render(<TrendIndicator current={5} previous={5} />);
    expect(screen.getByText(/same as last week/i)).toBeInTheDocument();
  });

  it("shows positive delta with up arrow", () => {
    render(<TrendIndicator current={7} previous={5} />);
    expect(screen.getByText(/\+2 vs last week/i)).toBeInTheDocument();
  });

  it("shows negative delta with down arrow", () => {
    render(<TrendIndicator current={3} previous={5} />);
    expect(screen.getByText(/-2 vs last week/i)).toBeInTheDocument();
  });

  it("uses green color for positive delta (normal mode)", () => {
    const { container } = render(<TrendIndicator current={7} previous={5} />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("text-green-600");
  });

  it("uses red color for negative delta (normal mode)", () => {
    const { container } = render(<TrendIndicator current={3} previous={5} />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("text-red-600");
  });

  it("inverts colors: decrease is green when invertColor=true", () => {
    const { container } = render(
      <TrendIndicator current={3} previous={5} invertColor />,
    );
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("text-green-600");
  });

  it("inverts colors: increase is red when invertColor=true", () => {
    const { container } = render(
      <TrendIndicator current={7} previous={5} invertColor />,
    );
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("text-red-600");
  });

  it("uses custom period label", () => {
    render(<TrendIndicator current={5} previous={5} periodLabel="last day" />);
    expect(screen.getByText(/same as last day/i)).toBeInTheDocument();
  });

  it("uses custom period label with delta", () => {
    render(
      <TrendIndicator current={7} previous={5} periodLabel="last day" />,
    );
    expect(screen.getByText(/\+2 vs last day/i)).toBeInTheDocument();
  });

  it("handles zero previous with positive current", () => {
    render(<TrendIndicator current={5} previous={0} />);
    expect(screen.getByText(/\+5 vs last week/i)).toBeInTheDocument();
  });

  it("renders gray dash when delta is zero", () => {
    const { container } = render(<TrendIndicator current={5} previous={5} />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("text-gray-500");
  });
});

describe("TrendIndicatorBlock", () => {
  it("renders label and current value", () => {
    render(
      <TrendIndicatorBlock
        label="Merged"
        current={5}
        previous={3}
      />,
    );
    expect(screen.getByText("Merged:")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders trend indicator inside block", () => {
    render(
      <TrendIndicatorBlock
        label="Merged"
        current={5}
        previous={3}
      />,
    );
    expect(screen.getByText(/\+2 vs last week/i)).toBeInTheDocument();
  });
});
