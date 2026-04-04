import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function fireKey(
    key: string,
    opts: Partial<KeyboardEventInit> = {},
    target?: HTMLElement,
  ) {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...opts,
    });
    (target ?? document).dispatchEvent(event);
  }

  function makeHandlers() {
    return {
      onCreateIssue: vi.fn(),
      onShowHelp: vi.fn(),
      onCloseModal: vi.fn(),
      onToggleDispatcher: vi.fn(),
    };
  }

  it("calls onCreateIssue when pressing n", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("n");
    expect(handlers.onCreateIssue).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("calls onShowHelp when pressing ?", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("?");
    expect(handlers.onShowHelp).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("calls onCloseModal when pressing Escape", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("Escape");
    expect(handlers.onCloseModal).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("calls onCloseModal on Escape even when focused on input", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireKey("Escape", {}, input);
    expect(handlers.onCloseModal).toHaveBeenCalledTimes(1);
    document.body.removeChild(input);
    unmount();
  });

  it("navigates to overview with g then o", async () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("g");
    fireKey("o");
    expect(mockPush).toHaveBeenCalledWith("/");
    unmount();
  });

  it("navigates to agents with g then a", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("g");
    fireKey("a");
    expect(mockPush).toHaveBeenCalledWith("/agents");
    unmount();
  });

  it("navigates to PRs with g then p", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("g");
    fireKey("p");
    expect(mockPush).toHaveBeenCalledWith("/prs");
    unmount();
  });

  it("navigates to queue with g then q", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("g");
    fireKey("q");
    expect(mockPush).toHaveBeenCalledWith("/queue");
    unmount();
  });

  it("navigates to costs with g then c", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("g");
    fireKey("c");
    expect(mockPush).toHaveBeenCalledWith("/costs");
    unmount();
  });

  it("navigates to settings with g then s", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("g");
    fireKey("s");
    expect(mockPush).toHaveBeenCalledWith("/settings");
    unmount();
  });

  it("does not navigate for unknown g+key sequence", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("g");
    fireKey("z");
    expect(mockPush).not.toHaveBeenCalled();
    unmount();
  });

  it("does not fire single-key shortcuts when focused on input", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireKey("n", {}, input);
    fireKey("?", {}, input);
    expect(handlers.onCreateIssue).not.toHaveBeenCalled();
    expect(handlers.onShowHelp).not.toHaveBeenCalled();
    document.body.removeChild(input);
    unmount();
  });

  it("does not fire single-key shortcuts when focused on textarea", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    fireKey("n", {}, textarea);
    expect(handlers.onCreateIssue).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
    unmount();
  });

  it("does not fire single-key shortcuts when focused on select", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    const select = document.createElement("select");
    document.body.appendChild(select);
    fireKey("n", {}, select);
    expect(handlers.onCreateIssue).not.toHaveBeenCalled();
    document.body.removeChild(select);
    unmount();
  });

  it("calls onToggleDispatcher when pressing Ctrl+Shift+P", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("P", { ctrlKey: true, shiftKey: true });
    expect(handlers.onToggleDispatcher).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("calls onToggleDispatcher on Ctrl+Shift+P even when focused on input", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireKey("P", { ctrlKey: true, shiftKey: true }, input);
    expect(handlers.onToggleDispatcher).toHaveBeenCalledTimes(1);
    document.body.removeChild(input);
    unmount();
  });

  it("does not call onToggleDispatcher for Shift+P without Ctrl", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("P", { shiftKey: true });
    expect(handlers.onToggleDispatcher).not.toHaveBeenCalled();
    unmount();
  });

  it("removes event listener on unmount", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    unmount();
    fireKey("n");
    expect(handlers.onCreateIssue).not.toHaveBeenCalled();
  });
});
