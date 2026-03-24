import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";
import { loginRateLimiter } from "@/lib/rateLimiter";

function createRequest(body: unknown, ip?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ip) headers["x-forwarded-for"] = ip;
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    // Reset rate limiter state between tests
    loginRateLimiter.reset("127.0.0.1");
    loginRateLimiter.reset("10.0.0.1");
    loginRateLimiter.reset("10.0.0.2");
    loginRateLimiter.reset("unknown");
  });

  it("returns 401 for invalid credentials", async () => {
    const req = createRequest({ email: "wrong@test.com", password: "wrong" }, "127.0.0.1");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Invalid credentials");
  });

  it("returns 200 and sets cookie for valid credentials", async () => {
    const req = createRequest({
      email: "admin@fleet.dev",
      password: "fleet-admin-2024",
    }, "127.0.0.1");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("fleet-auth=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Path=/");
  });

  it("returns 400 when email is missing", async () => {
    const req = createRequest({ password: "test" }, "127.0.0.1");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Email and password are required");
  });

  it("returns 400 when password is missing", async () => {
    const req = createRequest({ email: "test@test.com" }, "127.0.0.1");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Email and password are required");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: "not-json",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  describe("rate limiting", () => {
    it("returns 429 after 5 failed login attempts from the same IP", async () => {
      const ip = "10.0.0.1";

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        const req = createRequest({ email: "wrong@test.com", password: "wrong" }, ip);
        const res = await POST(req);
        expect(res.status).toBe(401);
      }

      // 6th attempt should be rate limited
      const req = createRequest({ email: "wrong@test.com", password: "wrong" }, ip);
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain("Too many login attempts");
      expect(res.headers.get("Retry-After")).toBeTruthy();
    });

    it("does not rate limit different IPs independently", async () => {
      // Exhaust rate limit for ip1
      for (let i = 0; i < 5; i++) {
        const req = createRequest({ email: "wrong@test.com", password: "wrong" }, "10.0.0.1");
        await POST(req);
      }

      // ip2 should still work
      const req = createRequest({ email: "wrong@test.com", password: "wrong" }, "10.0.0.2");
      const res = await POST(req);
      expect(res.status).toBe(401); // Not 429
    });

    it("resets rate limit on successful login", async () => {
      const ip = "10.0.0.1";

      // Make 4 failed attempts (just below limit)
      for (let i = 0; i < 4; i++) {
        const req = createRequest({ email: "wrong@test.com", password: "wrong" }, ip);
        await POST(req);
      }

      // Successful login resets the counter
      const successReq = createRequest({
        email: "admin@fleet.dev",
        password: "fleet-admin-2024",
      }, ip);
      const successRes = await POST(successReq);
      expect(successRes.status).toBe(200);

      // Should be able to fail again without hitting limit
      const req = createRequest({ email: "wrong@test.com", password: "wrong" }, ip);
      const res = await POST(req);
      expect(res.status).toBe(401); // Not 429
    });

    it("includes Retry-After header in 429 response", async () => {
      const ip = "10.0.0.1";

      for (let i = 0; i < 5; i++) {
        const req = createRequest({ email: "wrong@test.com", password: "wrong" }, ip);
        await POST(req);
      }

      const req = createRequest({ email: "wrong@test.com", password: "wrong" }, ip);
      const res = await POST(req);

      expect(res.status).toBe(429);
      const retryAfter = Number(res.headers.get("Retry-After"));
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(900); // Max 15 minutes
    });

    it("blocks even valid credentials when rate limited", async () => {
      const ip = "10.0.0.1";

      for (let i = 0; i < 5; i++) {
        const req = createRequest({ email: "wrong@test.com", password: "wrong" }, ip);
        await POST(req);
      }

      // Valid credentials should still be blocked
      const req = createRequest({
        email: "admin@fleet.dev",
        password: "fleet-admin-2024",
      }, ip);
      const res = await POST(req);
      expect(res.status).toBe(429);
    });
  });
});
