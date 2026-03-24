import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { CollapsibleCard } from "@/components/CollapsibleCard";

afterEach(cleanup);

describe("CollapsibleCard", () => {
  it("renders title and children when expanded by default", () => {
    render(
      <CollapsibleCard title="Test Section" defaultExpanded>
        <p data-testid="child">Hello</p>
      </CollapsibleCard>,
    );
    expect(screen.getByText("Test Section")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Test Section/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("renders children hidden when defaultExpanded is false", () => {
    render(
      <CollapsibleCard title="Collapsed" defaultExpanded={false}>
        <p data-testid="child">Hidden</p>
      </CollapsibleCard>,
    );
    const button = screen.getByRole("button", { name: /Collapsed/i });
    expect(button).toHaveAttribute("aria-expanded", "false");
    // Content wrapper should have maxHeight 0px
    const wrapper = screen.getByTestId("child").parentElement?.parentElement;
    expect(wrapper).toHaveStyle({ maxHeight: "0px" });
  });

  it("toggles expanded state on click", () => {
    render(
      <CollapsibleCard title="Toggle Me" defaultExpanded>
        <p>Content</p>
      </CollapsibleCard>,
    );
    const button = screen.getByRole("button", { name: /Toggle Me/i });
    expect(button).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("applies id and ariaLabel props", () => {
    render(
      <CollapsibleCard title="Section" id="my-section" ariaLabel="My section">
        <p>Content</p>
      </CollapsibleCard>,
    );
    const section = document.getElementById("my-section");
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute("aria-label", "My section");
  });

  it("renders chevron icon that rotates when expanded", () => {
    render(
      <CollapsibleCard title="Chevron Test" defaultExpanded>
        <p>Content</p>
      </CollapsibleCard>,
    );
    const svg = screen.getByRole("button", { name: /Chevron Test/i }).querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.contains("rotate-180")).toBe(true);
  });

  it("chevron does not rotate when collapsed", () => {
    render(
      <CollapsibleCard title="Chevron Test" defaultExpanded={false}>
        <p>Content</p>
      </CollapsibleCard>,
    );
    const svg = screen.getByRole("button", { name: /Chevron Test/i }).querySelector("svg");
    expect(svg?.classList.contains("rotate-180")).toBe(false);
  });
});
