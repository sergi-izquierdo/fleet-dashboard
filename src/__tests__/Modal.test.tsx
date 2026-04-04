import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("renders children", () => {
    render(
      <Modal onClose={vi.fn()}>
        <div data-testid="modal-content">content</div>
      </Modal>
    );
    expect(screen.getByTestId("modal-content")).toBeInTheDocument();
  });

  it("renders with role=dialog and aria-modal=true by default", () => {
    render(<Modal onClose={vi.fn()}><div>content</div></Modal>);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <div data-testid="panel" onClick={(e) => e.stopPropagation()}>panel</div>
      </Modal>
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when children stopPropagation", () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <div data-testid="panel" onClick={(e) => e.stopPropagation()}>panel</div>
      </Modal>
    );
    fireEvent.click(screen.getByTestId("panel"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose}><button>btn</button></Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("adds overflow:hidden to body on mount", () => {
    render(<Modal onClose={vi.fn()}><div>content</div></Modal>);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("removes overflow:hidden from body on unmount", () => {
    const { unmount } = render(<Modal onClose={vi.fn()}><div>content</div></Modal>);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("accepts custom className for backdrop", () => {
    render(
      <Modal onClose={vi.fn()} className="custom-backdrop">
        <div>content</div>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("custom-backdrop");
  });

  it("passes data-testid to backdrop", () => {
    render(
      <Modal onClose={vi.fn()} data-testid="my-modal">
        <div>content</div>
      </Modal>
    );
    expect(screen.getByTestId("my-modal")).toBeInTheDocument();
  });

  it("passes aria-label to backdrop", () => {
    render(
      <Modal onClose={vi.fn()} aria-label="My modal">
        <div>content</div>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "My modal");
  });

  describe("focus trap", () => {
    it("wraps Tab from last to first focusable element", () => {
      render(
        <Modal onClose={vi.fn()}>
          <div onClick={(e) => e.stopPropagation()}>
            <button data-testid="btn1">First</button>
            <button data-testid="btn2">Last</button>
          </div>
        </Modal>
      );
      const last = screen.getByTestId("btn2");
      last.focus();
      expect(document.activeElement).toBe(last);
      fireEvent.keyDown(document, { key: "Tab", shiftKey: false });
      expect(document.activeElement).toBe(screen.getByTestId("btn1"));
    });

    it("wraps Shift+Tab from first to last focusable element", () => {
      render(
        <Modal onClose={vi.fn()}>
          <div onClick={(e) => e.stopPropagation()}>
            <button data-testid="btn1">First</button>
            <button data-testid="btn2">Last</button>
          </div>
        </Modal>
      );
      const first = screen.getByTestId("btn1");
      first.focus();
      expect(document.activeElement).toBe(first);
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(screen.getByTestId("btn2"));
    });
  });

  describe("focus restoration", () => {
    beforeEach(() => {
      document.body.innerHTML = '<button id="trigger">Open</button>';
    });

    it("restores focus to previously focused element on unmount", () => {
      const trigger = document.getElementById("trigger") as HTMLButtonElement;
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      const { unmount } = render(
        <Modal onClose={vi.fn()}>
          <button>Close</button>
        </Modal>
      );
      unmount();
      expect(document.activeElement).toBe(trigger);
    });
  });
});
