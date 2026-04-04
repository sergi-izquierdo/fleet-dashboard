import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Card from "@/components/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Hello Card</Card>);
    expect(screen.getByText("Hello Card")).toBeDefined();
  });

  it("applies unified border and background classes", () => {
    const { container } = render(<Card>content</Card>);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("border-gray-200");
    expect(div.className).toContain("bg-white");
    expect(div.className).toContain("dark:border-white/[0.06]");
    expect(div.className).toContain("dark:bg-white/[0.02]");
    expect(div.className).toContain("rounded-xl");
  });

  it("forwards id prop", () => {
    const { container } = render(<Card id="my-card">content</Card>);
    expect((container.firstElementChild as HTMLElement).id).toBe("my-card");
  });

  it("merges extra className", () => {
    const { container } = render(<Card className="custom-class">content</Card>);
    expect((container.firstElementChild as HTMLElement).className).toContain("custom-class");
  });
});
