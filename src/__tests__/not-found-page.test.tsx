import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import NotFoundPage from "@/app/not-found";

afterEach(cleanup);

describe("NotFoundPage", () => {
  it("renders the 404 heading", () => {
    render(<NotFoundPage />);
    expect(
      screen.getByRole("heading", { name: /page not found/i }),
    ).toBeInTheDocument();
  });

  it("renders a link to Overview (/)", () => {
    render(<NotFoundPage />);
    expect(screen.getByTestId("link-overview")).toHaveAttribute("href", "/");
  });

  it("renders a link to Agents (/agents)", () => {
    render(<NotFoundPage />);
    expect(screen.getByTestId("link-agents")).toHaveAttribute(
      "href",
      "/agents",
    );
  });

  it("renders a link to PRs (/prs)", () => {
    render(<NotFoundPage />);
    expect(screen.getByTestId("link-prs")).toHaveAttribute("href", "/prs");
  });

  it("has accessible navigation landmark", () => {
    render(<NotFoundPage />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
