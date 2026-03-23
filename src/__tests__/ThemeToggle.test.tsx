import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { ThemeToggle } from "@/components/ThemeToggle";

// Mock next-themes
const mockSetTheme = vi.fn();
let mockTheme = "system";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    mockTheme = "system";
    mockSetTheme.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the toggle button", () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId("theme-toggle");
    expect(button).toBeInTheDocument();
  });

  it("displays the current theme label after mount", async () => {
    render(<ThemeToggle />);
    // After mount, useEffect sets mounted=true, so we should see the label
    // Need to wait for the effect
    await vi.waitFor(() => {
      expect(screen.getByTestId("theme-label")).toHaveTextContent("System");
    });
  });

  it("cycles from system to light on click", async () => {
    mockTheme = "system";
    render(<ThemeToggle />);

    await vi.waitFor(() => {
      expect(screen.getByTestId("theme-label")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("theme-toggle"));
    // system (index 2) -> next is light (index 0)
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("cycles from light to dark on click", async () => {
    mockTheme = "light";
    render(<ThemeToggle />);

    await vi.waitFor(() => {
      expect(screen.getByTestId("theme-label")).toHaveTextContent("Light");
    });

    fireEvent.click(screen.getByTestId("theme-toggle"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("cycles from dark to system on click", async () => {
    mockTheme = "dark";
    render(<ThemeToggle />);

    await vi.waitFor(() => {
      expect(screen.getByTestId("theme-label")).toHaveTextContent("Dark");
    });

    fireEvent.click(screen.getByTestId("theme-toggle"));
    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });

  it("has correct aria-label", () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId("theme-toggle");
    expect(button).toHaveAttribute("aria-label", "Toggle theme");
  });
});
