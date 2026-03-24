interface AttemptRecord {
  count: number;
  firstAttempt: number;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export class RateLimiter {
  private attempts: Map<string, AttemptRecord> = new Map();
  private maxAttempts: number;
  private windowMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxAttempts = DEFAULT_MAX_ATTEMPTS, windowMs = DEFAULT_WINDOW_MS) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.startCleanup();
  }

  isRateLimited(key: string): boolean {
    const record = this.attempts.get(key);
    if (!record) return false;

    if (Date.now() - record.firstAttempt >= this.windowMs) {
      this.attempts.delete(key);
      return false;
    }

    return record.count >= this.maxAttempts;
  }

  recordFailedAttempt(key: string): void {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now - record.firstAttempt >= this.windowMs) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return;
    }

    record.count++;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  getRetryAfterSeconds(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return 0;

    const elapsed = Date.now() - record.firstAttempt;
    return Math.max(0, Math.ceil((this.windowMs - elapsed) / 1000));
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.attempts) {
        if (now - record.firstAttempt >= this.windowMs) {
          this.attempts.delete(key);
        }
      }
    }, this.windowMs);

    // Allow the process to exit even if the timer is still running
    if (this.cleanupTimer && typeof this.cleanupTimer === "object" && "unref" in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export const loginRateLimiter = new RateLimiter();
