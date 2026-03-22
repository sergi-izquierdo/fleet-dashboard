import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the main heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: /fleet dashboard/i })
    ).toBeInTheDocument();
  });

  it("renders the description text", () => {
    render(<Home />);
    expect(screen.getByText(/real-time fleet monitoring/i)).toBeInTheDocument();
  });
});
