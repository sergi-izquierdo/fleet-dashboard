import { describe, it, expect, vi, afterEach } from "vitest";
import { getRelativeTime } from "@/lib/relativeTime";

describe("getRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for timestamps less than 60 seconds ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:00:30Z"));
    expect(getRelativeTime("2026-03-24T12:00:00Z")).toBe("just now");
  });

  it('returns "just now" for timestamps exactly 0 seconds ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:00:00Z"));
    expect(getRelativeTime("2026-03-24T12:00:00Z")).toBe("just now");
  });

  it('returns "just now" for future timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:00:00Z"));
    expect(getRelativeTime("2026-03-24T12:05:00Z")).toBe("just now");
  });

  it('returns "1m ago" for 60 seconds ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:01:00Z"));
    expect(getRelativeTime("2026-03-24T12:00:00Z")).toBe("1m ago");
  });

  it('returns "5m ago" for 5 minutes ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:05:00Z"));
    expect(getRelativeTime("2026-03-24T12:00:00Z")).toBe("5m ago");
  });

  it('returns "59m ago" for 59 minutes ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:59:00Z"));
    expect(getRelativeTime("2026-03-24T12:00:00Z")).toBe("59m ago");
  });

  it('returns "1h ago" for 60 minutes ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T13:00:00Z"));
    expect(getRelativeTime("2026-03-24T12:00:00Z")).toBe("1h ago");
  });

  it('returns "23h ago" for 23 hours ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T11:00:00Z"));
    expect(getRelativeTime("2026-03-24T12:00:00Z")).toBe("23h ago");
  });

  it('returns "1d ago" for 24 hours ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T12:00:00Z"));
    expect(getRelativeTime("2026-03-24T12:00:00Z")).toBe("1d ago");
  });

  it('returns "7d ago" for 7 days ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T12:00:00Z"));
    expect(getRelativeTime("2026-03-24T12:00:00Z")).toBe("7d ago");
  });
});
