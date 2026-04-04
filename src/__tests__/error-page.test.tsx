import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import ErrorPage from "@/app/error";

afterEach(cleanup);

describe("ErrorPage", () => {
  const mockError = new Error("Something exploded") as Error & {
    digest?: string;
  };
  const mockReset = vi.fn();

  it("renders the error heading", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
  });

  it("renders Try Again button that calls reset", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    const btn = screen.getByTestId("try-again-button");
    fireEvent.click(btn);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("renders Go Home link pointing to /", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    const link = screen.getByTestId("go-home-link");
    expect(link).toHaveAttribute("href", "/");
  });

  it("hides error details by default", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.queryByTestId("error-details")).not.toBeInTheDocument();
  });

  it("shows error details when toggle is clicked", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    fireEvent.click(screen.getByTestId("toggle-details-button"));
    expect(screen.getByTestId("error-details")).toBeInTheDocument();
    expect(screen.getByText("Something exploded")).toBeInTheDocument();
  });

  it("hides error details again when toggle is clicked twice", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    const toggle = screen.getByTestId("toggle-details-button");
    fireEvent.click(toggle);
    expect(screen.getByTestId("error-details")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByTestId("error-details")).not.toBeInTheDocument();
  });

  it("shows digest when present", () => {
    const errorWithDigest = Object.assign(new Error("crash"), {
      digest: "abc123",
    });
    render(<ErrorPage error={errorWithDigest} reset={mockReset} />);
    fireEvent.click(screen.getByTestId("toggle-details-button"));
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
  });
});
