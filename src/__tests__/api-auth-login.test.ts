import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function importPOST() {
  const mod = await import("@/app/api/auth/login/route");
  return mod.POST;
}

describe("POST /api/auth/login", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns 401 for invalid credentials", async () => {
    const POST = await importPOST();
    const req = createRequest({ email: "wrong@test.com", password: "wrong" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Invalid credentials");
  });

  it("returns 200 and sets cookie for valid credentials", async () => {
    const POST = await importPOST();
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
    const POST = await importPOST();
    const req = createRequest({ password: "test" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Email and password are required");
  });

  it("returns 400 when password is missing", async () => {
    const POST = await importPOST();
    const req = createRequest({ email: "test@test.com" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Email and password are required");
  });

  it("returns 400 for invalid JSON body", async () => {
    const POST = await importPOST();
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

  it("accepts custom credentials from environment variables", async () => {
    vi.stubEnv("FLEET_ADMIN_EMAIL", "custom@example.com");
    vi.stubEnv("FLEET_ADMIN_PASSWORD", "custom-pass");
    vi.stubEnv("FLEET_AUTH_SECRET", "custom-secret");

    const POST = await importPOST();

    const reqDefault = createRequest({
      email: "admin@fleet.dev",
      password: "fleet-admin-2024",
    });
    const resDefault = await POST(reqDefault);
    expect(resDefault.status).toBe(401);

    const reqCustom = createRequest({
      email: "custom@example.com",
      password: "custom-pass",
    });
    const resCustom = await POST(reqCustom);
    const data = await resCustom.json();
    expect(resCustom.status).toBe(200);
    expect(data.success).toBe(true);

    const setCookie = resCustom.headers.get("set-cookie");
    expect(setCookie).toContain("fleet-auth=custom-secret");
  });
});
