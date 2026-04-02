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
    process.env.FLEET_ADMIN_PASSWORD = "test-admin-password";
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FLEET_ADMIN_PASSWORD;
    } else {
      process.env.FLEET_ADMIN_PASSWORD = originalEnv;
    }
    vi.restoreAllMocks();
  });

  it("returns 500 when FLEET_ADMIN_PASSWORD env var is not set", async () => {
    delete process.env.FLEET_ADMIN_PASSWORD;
    const req = makeRequest({
      currentPassword: "test-admin-password",
      newPassword: "mynewpassword",
      confirmPassword: "mynewpassword",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Server configuration error");
  });

  it("returns 400 when body is missing fields", async () => {
    const req = makeRequest({ currentPassword: "test-admin-password" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("All fields are required");
  });

  it("returns 400 when new password is too short", async () => {
    const req = makeRequest({
      currentPassword: "test-admin-password",
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
      currentPassword: "test-admin-password",
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

  it("returns 200 on success with message but no envLine in response", async () => {
    const req = makeRequest({
      currentPassword: "test-admin-password",
      newPassword: "mynewpassword",
      confirmPassword: "mynewpassword",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.envLine).toBeUndefined();
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
