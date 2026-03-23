import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  it("returns 401 for invalid credentials", async () => {
    const req = createRequest({ email: "wrong@test.com", password: "wrong" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Invalid credentials");
  });

  it("returns 200 and sets cookie for valid credentials", async () => {
    const req = createRequest({
      email: "admin@fleet.dev",
      password: "fleet-admin-2024",
    });
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
    const req = createRequest({ password: "test" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Email and password are required");
  });

  it("returns 400 when password is missing", async () => {
    const req = createRequest({ email: "test@test.com" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Email and password are required");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });
});
