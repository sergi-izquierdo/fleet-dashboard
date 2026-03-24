import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/repos/route";

describe("GET /api/repos", () => {
  it("returns a list of repos", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.repos).toBeDefined();
    expect(Array.isArray(data.repos)).toBe(true);
    expect(data.repos.length).toBeGreaterThan(0);
  });

  it("repos are non-empty strings", async () => {
    const response = await GET();
    const data = await response.json();

    for (const repo of data.repos) {
      expect(typeof repo).toBe("string");
      expect(repo.length).toBeGreaterThan(0);
      expect(repo).toContain("/");
    }
  });
});
