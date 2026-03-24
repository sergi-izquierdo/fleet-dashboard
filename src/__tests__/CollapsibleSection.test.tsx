import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { CollapsibleSection } from "@/components/CollapsibleSection";

describe("CollapsibleSection", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the title in the header button", () => {
    render(
      <CollapsibleSection id="test" title="Test Section" expanded={true} onToggle={() => {}}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByTestId("collapsible-header-test")).toHaveTextContent("Test Section");
  });

  it("renders children when expanded", () => {
    render(
      <CollapsibleSection id="test" title="Test" expanded={true} onToggle={() => {}}>
        <p>Visible content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText("Visible content")).toBeInTheDocument();
  });

  it("renders children when collapsed (for animation purposes)", () => {
    render(
      <CollapsibleSection id="test" title="Test" expanded={false} onToggle={() => {}}>
        <p>Hidden content</p>
      </CollapsibleSection>,
    );
    // Content is in DOM but hidden via height: 0
    expect(screen.getByText("Hidden content")).toBeInTheDocument();
  });

  it("calls onToggle when header is clicked", () => {
    const onToggle = vi.fn();
    render(
      <CollapsibleSection id="test" title="Test" expanded={true} onToggle={onToggle}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    fireEvent.click(screen.getByTestId("collapsible-header-test"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("sets aria-expanded based on expanded prop", () => {
    const { rerender } = render(
      <CollapsibleSection id="test" title="Test" expanded={true} onToggle={() => {}}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByTestId("collapsible-header-test")).toHaveAttribute("aria-expanded", "true");

    rerender(
      <CollapsibleSection id="test" title="Test" expanded={false} onToggle={() => {}}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByTestId("collapsible-header-test")).toHaveAttribute("aria-expanded", "false");
  });

  it("sets correct aria-controls on header", () => {
    render(
      <CollapsibleSection id="my-section" title="Test" expanded={true} onToggle={() => {}}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByTestId("collapsible-header-my-section")).toHaveAttribute(
      "aria-controls",
      "collapsible-content-my-section",
    );
  });

  it("has section-id as the section element id", () => {
    render(
      <CollapsibleSection id="stats" title="Stats" expanded={true} onToggle={() => {}}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByTestId("collapsible-stats")).toBeInTheDocument();
  });

  it("rotates chevron icon when expanded", () => {
    render(
      <CollapsibleSection id="test" title="Test" expanded={true} onToggle={() => {}}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    const svg = screen.getByTestId("collapsible-header-test").querySelector("svg");
    expect(svg?.className.baseVal || svg?.getAttribute("class")).toContain("rotate-180");
  });

  it("does not rotate chevron icon when collapsed", () => {
    render(
      <CollapsibleSection id="test" title="Test" expanded={false} onToggle={() => {}}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    const svg = screen.getByTestId("collapsible-header-test").querySelector("svg");
    expect(svg?.className.baseVal || svg?.getAttribute("class")).not.toContain("rotate-180");
  });
});
