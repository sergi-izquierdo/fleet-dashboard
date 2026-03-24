import { describe, it, expect } from "vitest";
import { extractRepoFromUrl, shortRepoName } from "@/lib/repoUtils";

describe("extractRepoFromUrl", () => {
  it("extracts owner/repo from GitHub issue URL", () => {
    expect(
      extractRepoFromUrl("https://github.com/sergi-izquierdo/fleet-dashboard/issues/86")
    ).toBe("sergi-izquierdo/fleet-dashboard");
  });

  it("extracts owner/repo from GitHub PR URL", () => {
    expect(
      extractRepoFromUrl("https://github.com/sergi-izquierdo/synapse-notes/pull/42")
    ).toBe("sergi-izquierdo/synapse-notes");
  });

  it("extracts owner/repo from bare repo URL", () => {
    expect(
      extractRepoFromUrl("https://github.com/owner/repo")
    ).toBe("owner/repo");
  });

  it("returns null for non-GitHub URL", () => {
    expect(extractRepoFromUrl("https://example.com/foo/bar")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractRepoFromUrl("")).toBeNull();
  });
});

describe("shortRepoName", () => {
  it("extracts short name from owner/repo", () => {
    expect(shortRepoName("sergi-izquierdo/fleet-dashboard")).toBe("fleet-dashboard");
  });

  it("returns as-is when no slash", () => {
    expect(shortRepoName("fleet-dashboard")).toBe("fleet-dashboard");
  });
});
