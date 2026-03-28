import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import AutoRefreshIndicator from "@/components/AutoRefreshIndicator";

// Mock localStorage with a resetable store
let store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("AutoRefreshIndicator", () => {
  beforeEach(() => {
    store = {};
    vi.clearAllMocks();
    // Restore real implementations after clearAllMocks
    localStorageMock.getItem.mockImplementation((key: string) => store[key] ?? null);
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      store[key] = value;
    });
    localStorageMock.removeItem.mockImplementation((key: string) => {
      delete store[key];
    });
    localStorageMock.clear.mockImplementation(() => {
      store = {};
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the indicator container", () => {
    render(<AutoRefreshIndicator onRefresh={vi.fn()} />);
    expect(screen.getByTestId("auto-refresh-indicator")).toBeInTheDocument();
  });

  it("shows countdown circle and pause button when not paused", () => {
    render(<AutoRefreshIndicator onRefresh={vi.fn()} />);
    expect(screen.getByTestId("countdown-button")).toBeInTheDocument();
    expect(screen.getByTestId("pause-resume-button")).toBeInTheDocument();
    expect(screen.queryByTestId("paused-label")).not.toBeInTheDocument();
  });

  it("shows countdown starting at 30", () => {
    render(<AutoRefreshIndicator onRefresh={vi.fn()} />);
    expect(screen.getByTestId("countdown-text").textContent).toBe("30");
  });

  it("decrements countdown each second", () => {
    render(<AutoRefreshIndicator onRefresh={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("countdown-text").textContent).toBe("25");
  });

  it("calls onRefresh and resets countdown at 30 seconds", () => {
    const onRefresh = vi.fn();
    render(<AutoRefreshIndicator onRefresh={onRefresh} />);
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("countdown-text").textContent).toBe("30");
  });

  it("calls onRefresh immediately when countdown circle is clicked", () => {
    const onRefresh = vi.fn();
    render(<AutoRefreshIndicator onRefresh={onRefresh} />);
    fireEvent.click(screen.getByTestId("countdown-button"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("resets countdown to 30 when circle is clicked", () => {
    const onRefresh = vi.fn();
    render(<AutoRefreshIndicator onRefresh={onRefresh} />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId("countdown-text").textContent).toBe("20");
    act(() => {
      fireEvent.click(screen.getByTestId("countdown-button"));
    });
    expect(screen.getByTestId("countdown-text").textContent).toBe("30");
  });

  it("shows Paused label and play button when paused", () => {
    render(<AutoRefreshIndicator onRefresh={vi.fn()} />);
    fireEvent.click(screen.getByTestId("pause-resume-button"));
    expect(screen.getByTestId("paused-label")).toBeInTheDocument();
    expect(screen.queryByTestId("countdown-button")).not.toBeInTheDocument();
  });

  it("stops countdown when paused", () => {
    render(<AutoRefreshIndicator onRefresh={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    fireEvent.click(screen.getByTestId("pause-resume-button"));
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    // Countdown circle is gone; paused label shown
    expect(screen.queryByTestId("countdown-text")).not.toBeInTheDocument();
    expect(screen.getByTestId("paused-label")).toBeInTheDocument();
  });

  it("does not call onRefresh when paused", () => {
    const onRefresh = vi.fn();
    render(<AutoRefreshIndicator onRefresh={onRefresh} />);
    fireEvent.click(screen.getByTestId("pause-resume-button"));
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("stores pause state in localStorage when paused", () => {
    render(<AutoRefreshIndicator onRefresh={vi.fn()} />);
    fireEvent.click(screen.getByTestId("pause-resume-button"));
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "autoRefreshPaused",
      "true"
    );
  });

  it("stores resume state in localStorage when resumed", () => {
    render(<AutoRefreshIndicator onRefresh={vi.fn()} />);
    fireEvent.click(screen.getByTestId("pause-resume-button")); // pause
    fireEvent.click(screen.getByTestId("pause-resume-button")); // resume
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
      "autoRefreshPaused",
      "false"
    );
  });

  it("starts in paused state when localStorage has autoRefreshPaused=true", () => {
    store["autoRefreshPaused"] = "true";
    render(<AutoRefreshIndicator onRefresh={vi.fn()} />);
    expect(screen.getByTestId("paused-label")).toBeInTheDocument();
    expect(screen.queryByTestId("countdown-button")).not.toBeInTheDocument();
  });

  it("resumes from paused state and shows countdown", () => {
    render(<AutoRefreshIndicator onRefresh={vi.fn()} />);
    fireEvent.click(screen.getByTestId("pause-resume-button")); // pause
    expect(screen.getByTestId("paused-label")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("pause-resume-button")); // resume
    expect(screen.getByTestId("countdown-button")).toBeInTheDocument();
    expect(screen.queryByTestId("paused-label")).not.toBeInTheDocument();
  });

  it("shows play icon label when paused and pause icon label when active", () => {
    render(<AutoRefreshIndicator onRefresh={vi.fn()} />);
    const btn = screen.getByTestId("pause-resume-button");
    expect(btn).toHaveAttribute("aria-label", "Pause auto-refresh");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-label", "Resume auto-refresh");
  });

  it("countdown button has accessible aria-label with seconds", () => {
    render(<AutoRefreshIndicator onRefresh={vi.fn()} />);
    const btn = screen.getByTestId("countdown-button");
    expect(btn.getAttribute("aria-label")).toContain("30 seconds");
  });
});
