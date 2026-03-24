import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import EmptyState from "@/components/EmptyState";

describe("EmptyState", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders title and description", () => {
    render(<EmptyState title="No data" description="Nothing to show here." />);
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.getByText("Nothing to show here.")).toBeInTheDocument();
  });

  it("renders with data-testid", () => {
    render(<EmptyState title="Empty" description="Desc" />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders default icon when none provided", () => {
    render(<EmptyState title="Empty" description="Desc" />);
    const svg = screen.getByTestId("empty-state").querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders custom icon when provided", () => {
    render(
      <EmptyState
        icon={<span data-testid="custom-icon">Custom</span>}
        title="Empty"
        description="Desc"
      />
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders ReactNode description", () => {
    render(
      <EmptyState
        title="Empty"
        description={<span data-testid="rich-desc">Rich description</span>}
      />
    );
    expect(screen.getByTestId("rich-desc")).toBeInTheDocument();
  });

  it("uses theme-aware classes", () => {
    render(<EmptyState title="Empty" description="Desc" />);
    const container = screen.getByTestId("empty-state");
    expect(container.className).toContain("dark:border-white/10");
    expect(container.className).toContain("dark:bg-white/5");
  });
});
