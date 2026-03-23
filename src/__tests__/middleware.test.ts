import { describe, it, expect } from "vitest";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

function createRequest(path: string, cookie?: string): NextRequest {
  const url = `http://localhost:3000${path}`;
  const req = new NextRequest(url);
  if (cookie) {
    req.cookies.set("fleet-auth", cookie);
  }
  return req;
}

describe("Auth middleware", () => {
  it("redirects unauthenticated users to /login", () => {
    const req = createRequest("/");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("allows authenticated users through", () => {
    const req = createRequest("/", "fleet-session-token-v1");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("allows /login without auth", () => {
    const req = createRequest("/login");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("allows /api/auth routes without auth", () => {
    const req = createRequest("/api/auth/login");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("allows /offline without auth", () => {
    const req = createRequest("/offline");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("allows /_next static assets without auth", () => {
    const req = createRequest("/_next/static/chunk.js");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("allows /icons without auth", () => {
    const req = createRequest("/icons/icon-192x192.svg");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("allows /manifest.json without auth", () => {
    const req = createRequest("/manifest.json");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("allows /sw.js without auth", () => {
    const req = createRequest("/sw.js");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("rejects invalid token", () => {
    const req = createRequest("/", "wrong-token");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("protects API routes", () => {
    const req = createRequest("/api/dashboard");
    const res = middleware(req);
    expect(res.status).toBe(307);
  });
});
