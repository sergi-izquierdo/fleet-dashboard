import { render, screen, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useRelativeTime, useRelativeTick } from "@/hooks/useRelativeTime";

function TestComponent({ timestamp }: { timestamp: string }) {
  const relative = useRelativeTime(timestamp);
  return <span data-testid="relative">{relative}</span>;
}

function TickComponent() {
  const tick = useRelativeTick();
  return <span data-testid="tick">{tick}</span>;
}

describe("useRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:05:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("returns initial relative time", () => {
    render(<TestComponent timestamp="2026-03-24T12:00:00Z" />);
    expect(screen.getByTestId("relative").textContent).toBe("5m ago");
  });

  it("updates after 30 seconds", () => {
    vi.setSystemTime(new Date("2026-03-24T12:00:30Z"));
    render(<TestComponent timestamp="2026-03-24T12:00:00Z" />);
    expect(screen.getByTestId("relative").textContent).toBe("just now");

    // Advance 30 seconds — now 60s have passed since the timestamp
    act(() => {
      vi.setSystemTime(new Date("2026-03-24T12:01:00Z"));
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByTestId("relative").textContent).toBe("1m ago");
  });

  it("cleans up interval on unmount", () => {
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = render(<TestComponent timestamp="2026-03-24T12:00:00Z" />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

describe("useRelativeTick", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("starts at 0", () => {
    render(<TickComponent />);
    expect(screen.getByTestId("tick").textContent).toBe("0");
  });

  it("increments after 30 seconds", () => {
    render(<TickComponent />);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByTestId("tick").textContent).toBe("1");
  });

  it("increments again after another 30 seconds", () => {
    render(<TickComponent />);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByTestId("tick").textContent).toBe("2");
  });
});
