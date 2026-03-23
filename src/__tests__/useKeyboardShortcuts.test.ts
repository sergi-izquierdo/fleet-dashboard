import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

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

  it("opens command palette on Ctrl+K", () => {
    const handlers = {
      onToggleCommandPalette: vi.fn(),
      onRefresh: vi.fn(),
      onToggleTheme: vi.fn(),
    };
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("k", { ctrlKey: true });
    expect(handlers.onToggleCommandPalette).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("opens command palette on Meta+K", () => {
    const handlers = {
      onToggleCommandPalette: vi.fn(),
      onRefresh: vi.fn(),
      onToggleTheme: vi.fn(),
    };
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("k", { metaKey: true });
    expect(handlers.onToggleCommandPalette).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("refreshes on R key", () => {
    const handlers = {
      onToggleCommandPalette: vi.fn(),
      onRefresh: vi.fn(),
      onToggleTheme: vi.fn(),
    };
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("r");
    expect(handlers.onRefresh).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("toggles theme on T key", () => {
    const handlers = {
      onToggleCommandPalette: vi.fn(),
      onRefresh: vi.fn(),
      onToggleTheme: vi.fn(),
    };
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
    fireKey("t");
    expect(handlers.onToggleTheme).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("does not fire single-key shortcuts when typing in an input", () => {
    const handlers = {
      onToggleCommandPalette: vi.fn(),
      onRefresh: vi.fn(),
      onToggleTheme: vi.fn(),
    };
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));

    const input = document.createElement("input");
    document.body.appendChild(input);

    fireKey("r", {}, input);
    fireKey("t", {}, input);

    expect(handlers.onRefresh).not.toHaveBeenCalled();
    expect(handlers.onToggleTheme).not.toHaveBeenCalled();

    document.body.removeChild(input);
    unmount();
  });

  it("still opens palette with Ctrl+K even when focused on input", () => {
    const handlers = {
      onToggleCommandPalette: vi.fn(),
      onRefresh: vi.fn(),
      onToggleTheme: vi.fn(),
    };
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));

    const input = document.createElement("input");
    document.body.appendChild(input);

    fireKey("k", { ctrlKey: true }, input);
    expect(handlers.onToggleCommandPalette).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
    unmount();
  });
});
