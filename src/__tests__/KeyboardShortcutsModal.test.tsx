import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";

describe("KeyboardShortcutsModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <KeyboardShortcutsModal open={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the modal when open", () => {
    render(<KeyboardShortcutsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText("Keyboard Shortcuts"),
    ).toBeInTheDocument();
  });

  it("lists navigation shortcuts", () => {
    render(<KeyboardShortcutsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Go to Overview")).toBeInTheDocument();
    expect(screen.getByText("Go to Agents")).toBeInTheDocument();
    expect(screen.getByText("Go to Pull Requests")).toBeInTheDocument();
    expect(screen.getByText("Go to Queue")).toBeInTheDocument();
    expect(screen.getByText("Go to Costs")).toBeInTheDocument();
    expect(screen.getByText("Go to Settings")).toBeInTheDocument();
  });

  it("lists action shortcuts", () => {
    render(<KeyboardShortcutsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("New Issue")).toBeInTheDocument();
    expect(screen.getByText("Show keyboard shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Close modal / dialog")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when inner content is clicked", () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("Navigation"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
