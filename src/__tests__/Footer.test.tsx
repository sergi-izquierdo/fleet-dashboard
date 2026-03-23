import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { Footer } from "@/components/Footer";
import packageJson from "../../package.json";

describe("Footer", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a footer element", () => {
    render(<Footer />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
  });

  it("displays the app version from package.json", () => {
    render(<Footer />);
    expect(
      screen.getByText(`Fleet Dashboard v${packageJson.version}`)
    ).toBeInTheDocument();
  });

  it("displays the current year", () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year}`)).toBeInTheDocument();
  });

  it("has theme-aware styling classes", () => {
    render(<Footer />);
    const footer = screen.getByRole("contentinfo");
    expect(footer.className).toContain("dark:text-gray-400");
    expect(footer.className).toContain("dark:bg-gray-900/50");
    expect(footer.className).toContain("dark:border-gray-800");
  });
});
