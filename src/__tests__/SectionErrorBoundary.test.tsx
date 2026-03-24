import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

afterEach(cleanup);

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test render error");
  }
  return <div data-testid="child-content">Content loaded</div>;
}

describe("SectionErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <SectionErrorBoundary sectionName="Test Section">
        <ProblemChild shouldThrow={false} />
      </SectionErrorBoundary>,
    );
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("shows error UI when a child throws", () => {
    // Suppress React error boundary console.error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SectionErrorBoundary sectionName="Agents">
        <ProblemChild shouldThrow={true} />
      </SectionErrorBoundary>,
    );

    expect(screen.getByTestId("error-boundary-Agents")).toBeInTheDocument();
    expect(screen.getByText("Agents unavailable")).toBeInTheDocument();
    expect(screen.getByText("Test render error")).toBeInTheDocument();
    expect(screen.getByText("Tap to retry")).toBeInTheDocument();
    expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();

    spy.mockRestore();
  });

  it("has correct aria role for accessibility", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SectionErrorBoundary sectionName="PRs">
        <ProblemChild shouldThrow={true} />
      </SectionErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("recovers when retry button is clicked and child no longer throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    let shouldThrow = true;
    function ToggleChild() {
      if (shouldThrow) {
        throw new Error("Temporary error");
      }
      return <div data-testid="recovered-content">Recovered</div>;
    }

    const { rerender } = render(
      <SectionErrorBoundary sectionName="Timeline">
        <ToggleChild />
      </SectionErrorBoundary>,
    );

    // Verify error state
    expect(screen.getByText("Timeline unavailable")).toBeInTheDocument();

    // Fix the error and click retry
    shouldThrow = false;
    fireEvent.click(screen.getByTestId("retry-Timeline"));

    // Force rerender after state change
    rerender(
      <SectionErrorBoundary sectionName="Timeline">
        <ToggleChild />
      </SectionErrorBoundary>,
    );

    expect(screen.getByTestId("recovered-content")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("does not affect sibling sections when one fails", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <div>
        <SectionErrorBoundary sectionName="Working">
          <ProblemChild shouldThrow={false} />
        </SectionErrorBoundary>
        <SectionErrorBoundary sectionName="Broken">
          <ProblemChild shouldThrow={true} />
        </SectionErrorBoundary>
      </div>,
    );

    // Working section should still render
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    // Broken section should show error
    expect(screen.getByText("Broken unavailable")).toBeInTheDocument();

    spy.mockRestore();
  });
});
