import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── fs/promises mock setup ───────────────────────────────────────────────────
const { mockAccess, mockWriteFile, mockMkdir, mockUnlink } = vi.hoisted(() => ({
  mockAccess: vi.fn(),
  mockWriteFile: vi.fn(),
  mockMkdir: vi.fn(),
  mockUnlink: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  default: {
    access: mockAccess,
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
    unlink: mockUnlink,
  },
  access: mockAccess,
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
  unlink: mockUnlink,
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────
import { GET } from "@/app/api/dispatcher/status/route";
import { POST as pausePOST } from "@/app/api/dispatcher/pause/route";
import { POST as resumePOST } from "@/app/api/dispatcher/resume/route";

function makeRequest(url: string) {
  return new NextRequest(url);
}

// ─── GET /api/dispatcher/status ───────────────────────────────────────────────
describe("GET /api/dispatcher/status", () => {
  beforeEach(() => {
    mockAccess.mockReset();
  });

  it("returns { paused: false } when flag file does not exist", async () => {
    mockAccess.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ paused: false });
  });

  it("returns { paused: true } when flag file exists", async () => {
    mockAccess.mockResolvedValue(undefined);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ paused: true });
  });
});

// ─── POST /api/dispatcher/pause ───────────────────────────────────────────────
describe("POST /api/dispatcher/pause", () => {
  beforeEach(() => {
    mockMkdir.mockReset();
    mockWriteFile.mockReset();
  });

  it("creates the flag file and returns { success: true, paused: true }", async () => {
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    const response = await pausePOST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, paused: true });
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(".dispatcher-paused"),
      "",
      { flag: "w" },
    );
  });

  it("returns 500 when file write fails", async () => {
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockRejectedValue(new Error("Permission denied"));

    const response = await pausePOST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toContain("Permission denied");
  });
});

// ─── POST /api/dispatcher/resume ─────────────────────────────────────────────
describe("POST /api/dispatcher/resume", () => {
  beforeEach(() => {
    mockUnlink.mockReset();
  });

  it("removes the flag file and returns { success: true, paused: false }", async () => {
    mockUnlink.mockResolvedValue(undefined);

    const response = await resumePOST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, paused: false });
    expect(mockUnlink).toHaveBeenCalledWith(
      expect.stringContaining(".dispatcher-paused"),
    );
  });

  it("returns success when flag file does not exist (idempotent)", async () => {
    const err = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    mockUnlink.mockRejectedValue(err);

    const response = await resumePOST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, paused: false });
  });

  it("returns 500 when unlink fails for a non-ENOENT reason", async () => {
    mockUnlink.mockRejectedValue(new Error("Permission denied"));

    const response = await resumePOST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toContain("Permission denied");
  });
});
