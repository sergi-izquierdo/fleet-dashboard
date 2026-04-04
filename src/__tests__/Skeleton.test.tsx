import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { Skeleton } from "@/components/LoadingSkeleton";

describe("Skeleton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a skeleton placeholder", () => {
    render(<Skeleton />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("applies animate-pulse class", () => {
    render(<Skeleton />);
    expect(screen.getByTestId("skeleton")).toHaveClass("animate-pulse");
  });

  it("applies numeric height as px style", () => {
    render(<Skeleton height={200} />);
    const el = screen.getByTestId("skeleton");
    expect(el).toHaveStyle({ height: "200px" });
  });

  it("applies numeric width as px style", () => {
    render(<Skeleton width={400} />);
    const el = screen.getByTestId("skeleton");
    expect(el).toHaveStyle({ width: "400px" });
  });

  it("applies string dimensions as-is", () => {
    render(<Skeleton width="50%" height="10rem" />);
    const el = screen.getByTestId("skeleton");
    expect(el).toHaveStyle({ width: "50%", height: "10rem" });
  });

  it("merges additional className", () => {
    render(<Skeleton className="my-custom-class" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("my-custom-class");
  });

  it("renders without width or height props", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe("");
    expect(el.style.height).toBe("");
  });
});
