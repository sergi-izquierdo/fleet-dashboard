import { describe, it, expect } from "vitest";
import { fuzzyMatch } from "@/lib/fuzzyMatch";

describe("fuzzyMatch", () => {
  it("matches empty query to anything", () => {
    expect(fuzzyMatch("", "anything")).toEqual({ score: 0 });
  });

  it("matches exact substring", () => {
    const result = fuzzyMatch("refresh", "Refresh dashboard");
    expect(result).not.toBeNull();
  });

  it("matches fuzzy characters in order", () => {
    const result = fuzzyMatch("rd", "Refresh dashboard");
    expect(result).not.toBeNull();
  });

  it("returns null when characters are not in order", () => {
    expect(fuzzyMatch("zyx", "Refresh dashboard")).toBeNull();
  });

  it("is case insensitive", () => {
    const result = fuzzyMatch("REFRESH", "refresh dashboard");
    expect(result).not.toBeNull();
  });

  it("scores consecutive matches better than spread matches", () => {
    const consecutive = fuzzyMatch("ref", "refresh");
    const spread = fuzzyMatch("ref", "r_e_f_resh");
    expect(consecutive).not.toBeNull();
    expect(spread).not.toBeNull();
    expect(consecutive!.score).toBeLessThan(spread!.score);
  });
});
