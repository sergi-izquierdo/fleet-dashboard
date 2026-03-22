import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";

describe("ConnectionIndicator", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows connected state with green dot", () => {
    render(<ConnectionIndicator status="connected" />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
    const dot = screen.getByTestId("connection-dot");
    expect(dot.className).toContain("bg-green-500");
  });

  it("shows disconnected state with yellow dot", () => {
    render(<ConnectionIndicator status="disconnected" />);
    expect(screen.getByText("Connecting...")).toBeInTheDocument();
    const dot = screen.getByTestId("connection-dot");
    expect(dot.className).toContain("bg-yellow-500");
  });

  it("shows error state with red dot", () => {
    render(<ConnectionIndicator status="error" />);
    expect(screen.getByText("Connection error")).toBeInTheDocument();
    const dot = screen.getByTestId("connection-dot");
    expect(dot.className).toContain("bg-red-500");
  });
});
