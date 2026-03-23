import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { PullToRefresh } from "@/components/PullToRefresh";

describe("PullToRefresh", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children", () => {
    render(
      <PullToRefresh onRefresh={() => {}}>
        <div data-testid="child">Content</div>
      </PullToRefresh>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders the pull-to-refresh container", () => {
    render(
      <PullToRefresh onRefresh={() => {}}>
        <div>Content</div>
      </PullToRefresh>
    );
    expect(screen.getByTestId("pull-to-refresh")).toBeInTheDocument();
  });
});
