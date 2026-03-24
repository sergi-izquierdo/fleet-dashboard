import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RateLimiter } from "@/lib/rateLimiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter(3, 1000); // 3 attempts per 1 second for testing
  });

  afterEach(() => {
    limiter.dispose();
    vi.useRealTimers();
  });

  it("allows requests below the limit", () => {
    limiter.recordFailedAttempt("ip1");
    limiter.recordFailedAttempt("ip1");
    expect(limiter.isRateLimited("ip1")).toBe(false);
  });

  it("blocks requests at the limit", () => {
    limiter.recordFailedAttempt("ip1");
    limiter.recordFailedAttempt("ip1");
    limiter.recordFailedAttempt("ip1");
    expect(limiter.isRateLimited("ip1")).toBe(true);
  });

  it("tracks IPs independently", () => {
    for (let i = 0; i < 3; i++) limiter.recordFailedAttempt("ip1");
    expect(limiter.isRateLimited("ip1")).toBe(true);
    expect(limiter.isRateLimited("ip2")).toBe(false);
  });

  it("resets count for a specific key", () => {
    for (let i = 0; i < 3; i++) limiter.recordFailedAttempt("ip1");
    expect(limiter.isRateLimited("ip1")).toBe(true);

    limiter.reset("ip1");
    expect(limiter.isRateLimited("ip1")).toBe(false);
  });

  it("expires entries after the window", () => {
    for (let i = 0; i < 3; i++) limiter.recordFailedAttempt("ip1");
    expect(limiter.isRateLimited("ip1")).toBe(true);

    vi.advanceTimersByTime(1001);
    expect(limiter.isRateLimited("ip1")).toBe(false);
  });

  it("returns correct retry-after seconds", () => {
    limiter.recordFailedAttempt("ip1");
    const retryAfter = limiter.getRetryAfterSeconds("ip1");
    expect(retryAfter).toBe(1); // 1 second window

    vi.advanceTimersByTime(500);
    const retryAfterHalf = limiter.getRetryAfterSeconds("ip1");
    expect(retryAfterHalf).toBe(1); // ceil(500/1000) = 1
  });

  it("returns 0 retry-after for unknown keys", () => {
    expect(limiter.getRetryAfterSeconds("unknown")).toBe(0);
  });

  it("starts a new window after expiry", () => {
    for (let i = 0; i < 3; i++) limiter.recordFailedAttempt("ip1");
    vi.advanceTimersByTime(1001);

    // Should start fresh
    limiter.recordFailedAttempt("ip1");
    expect(limiter.isRateLimited("ip1")).toBe(false);
  });
});
