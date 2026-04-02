import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST } from "@/app/api/auth/change-password/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/change-password", () => {
  const originalEnv = process.env.FLEET_ADMIN_PASSWORD;

  beforeEach(() => {
    process.env.FLEET_ADMIN_PASSWORD = "fleet-admin-2024";
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FLEET_ADMIN_PASSWORD;
    } else {
      process.env.FLEET_ADMIN_PASSWORD = originalEnv;
    }
    vi.restoreAllMocks();
  });

  it("returns 400 when body is missing fields", async () => {
    const req = makeRequest({ currentPassword: "fleet-admin-2024" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("All fields are required");
  });

  it("returns 400 when new password is too short", async () => {
    const req = makeRequest({
      currentPassword: "fleet-admin-2024",
      newPassword: "short",
      confirmPassword: "short",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("New password must be at least 8 characters");
  });

  it("returns 400 when passwords do not match", async () => {
    const req = makeRequest({
      currentPassword: "fleet-admin-2024",
      newPassword: "newpassword1",
      confirmPassword: "newpassword2",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("New passwords do not match");
  });

  it("returns 401 when current password is incorrect", async () => {
    const req = makeRequest({
      currentPassword: "wrongpassword",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Current password is incorrect");
  });

  it("returns 200 with env line when all inputs are valid", async () => {
    const req = makeRequest({
      currentPassword: "fleet-admin-2024",
      newPassword: "mynewpassword",
      confirmPassword: "mynewpassword",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.envLine).toBe("FLEET_ADMIN_PASSWORD=mynewpassword");
    expect(data.message).toContain("FLEET_ADMIN_PASSWORD=mynewpassword");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request body");
  });
});
