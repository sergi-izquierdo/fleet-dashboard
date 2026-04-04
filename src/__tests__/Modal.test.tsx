import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("renders nothing when open=false", () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()}>
        <div>content</div>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders dialog with role and aria-modal when open", () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <div>content</div>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("renders children inside the modal", () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <div>modal content</div>
      </Modal>
    );
    expect(screen.getByText("modal content")).toBeInTheDocument();
  });

  it("passes aria-label to dialog", () => {
    render(
      <Modal open={true} onClose={vi.fn()} aria-label="Test dialog">
        <div>content</div>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Test dialog");
  });

  it("passes aria-labelledby to dialog", () => {
    render(
      <Modal open={true} onClose={vi.fn()} aria-labelledby="my-title">
        <div id="my-title">Title</div>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby", "my-title");
  });

  it("passes data-testid to dialog container", () => {
    render(
      <Modal open={true} onClose={vi.fn()} data-testid="my-modal">
        <div>content</div>
      </Modal>
    );
    expect(screen.getByTestId("my-modal")).toBeInTheDocument();
  });

  it("calls onClose when the backdrop area is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <div>content</div>
      </Modal>
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <div>content</div>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when non-Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <div>content</div>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("sets body overflow to hidden when open", () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <div>content</div>
      </Modal>
    );
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body overflow when closed", () => {
    document.body.style.overflow = "auto";
    const { rerender } = render(
      <Modal open={true} onClose={vi.fn()}>
        <div>content</div>
      </Modal>
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <Modal open={false} onClose={vi.fn()}>
        <div>content</div>
      </Modal>
    );
    expect(document.body.style.overflow).toBe("auto");
  });

  it("traps focus: Tab at last focusable element wraps to first", () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <div onClick={(e) => e.stopPropagation()}>
          <button>First</button>
          <button>Last</button>
        </div>
      </Modal>
    );
    const buttons = screen.getAllByRole("button");
    const lastButton = buttons[buttons.length - 1];
    lastButton.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: false });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("traps focus: Shift+Tab at first focusable element wraps to last", () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <div onClick={(e) => e.stopPropagation()}>
          <button>First</button>
          <button>Last</button>
        </div>
      </Modal>
    );
    const buttons = screen.getAllByRole("button");
    buttons[0].focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  describe("when not open", () => {
    it("does not call onClose on Escape when closed", () => {
      const onClose = vi.fn();
      render(
        <Modal open={false} onClose={onClose}>
          <div>content</div>
        </Modal>
      );
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
