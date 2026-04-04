import { render, screen, cleanup, act } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { SkipLink } from "@/components/SkipLink";
import { ToastContainer, showToast } from "@/components/Toast";

describe("SkipLink", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a link with 'Skip to main content' text", () => {
    render(<SkipLink />);
    const link = screen.getByTestId("skip-link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent("Skip to main content");
  });

  it("points to #main-content", () => {
    render(<SkipLink />);
    const link = screen.getByTestId("skip-link");
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("is visually hidden by default via sr-only class", () => {
    render(<SkipLink />);
    const link = screen.getByTestId("skip-link");
    expect(link.className).toContain("sr-only");
  });

  it("becomes visible on focus via focus:not-sr-only", () => {
    render(<SkipLink />);
    const link = screen.getByTestId("skip-link");
    // The focus:not-sr-only Tailwind class should be present
    expect(link.className).toContain("focus:not-sr-only");
  });
});

describe("ToastContainer accessibility", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders error toasts with role=alert for assertive announcement", async () => {
    render(<ToastContainer />);
    act(() => {
      showToast({ type: "error", title: "Something failed" });
    });
    const toasts = await screen.findAllByTestId("toast");
    const errorToast = toasts.find((t) => t.getAttribute("role") === "alert");
    expect(errorToast).toBeDefined();
    expect(errorToast).toHaveAttribute("aria-live", "assertive");
  });

  it("renders success toasts with role=status for polite announcement", async () => {
    render(<ToastContainer />);
    act(() => {
      showToast({ type: "success", title: "Saved successfully" });
    });
    const toasts = await screen.findAllByTestId("toast");
    const successToast = toasts.find((t) => t.getAttribute("role") === "status");
    expect(successToast).toBeDefined();
    expect(successToast).toHaveAttribute("aria-live", "polite");
  });

  it("dismiss button has aria-label", async () => {
    render(<ToastContainer />);
    act(() => {
      showToast({ type: "info", title: "Hello" });
    });
    const dismissBtn = await screen.findByRole("button", { name: "Dismiss notification" });
    expect(dismissBtn).toBeInTheDocument();
  });
});

describe("ARIA landmarks", () => {
  afterEach(() => {
    cleanup();
  });

  it("SkipLink links to #main-content anchor", () => {
    render(
      <div>
        <SkipLink />
        <main id="main-content" role="main">
          <p>Content</p>
        </main>
      </div>
    );
    const link = screen.getByTestId("skip-link");
    expect(link).toHaveAttribute("href", "#main-content");
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
  });
});
