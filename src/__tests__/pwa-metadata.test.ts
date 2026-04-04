import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("PWA manifest", () => {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "public/manifest.json"), "utf-8")
  );

  it("has correct name", () => {
    expect(manifest.name).toBe("Fleet Dashboard");
  });

  it("has correct short_name", () => {
    expect(manifest.short_name).toBe("Fleet");
  });

  it("has correct description", () => {
    expect(manifest.description).toBe("AI agent fleet monitoring dashboard");
  });

  it("has standalone display mode", () => {
    expect(manifest.display).toBe("standalone");
  });

  it("has correct start_url", () => {
    expect(manifest.start_url).toBe("/");
  });

  it("includes icons", () => {
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});

describe("Fleet favicon SVG", () => {
  const iconSvg = readFileSync(
    join(process.cwd(), "src/app/icon.svg"),
    "utf-8"
  );

  it("is valid SVG", () => {
    expect(iconSvg).toContain("<svg");
    expect(iconSvg).toContain("</svg>");
  });

  it("contains fleet-themed blue color", () => {
    expect(iconSvg).toContain("#3b82f6");
  });

  it("contains 2x2 grid of rect elements", () => {
    const rectMatches = iconSvg.match(/<rect/g);
    // background rect + 4 grid squares = 5
    expect(rectMatches).not.toBeNull();
    expect(rectMatches!.length).toBeGreaterThanOrEqual(5);
  });
});

describe("Apple icon SVG", () => {
  const appleIconSvg = readFileSync(
    join(process.cwd(), "src/app/apple-icon.svg"),
    "utf-8"
  );

  it("is valid SVG", () => {
    expect(appleIconSvg).toContain("<svg");
    expect(appleIconSvg).toContain("</svg>");
  });

  it("has 180x180 dimensions", () => {
    expect(appleIconSvg).toContain('width="180"');
    expect(appleIconSvg).toContain('height="180"');
  });

  it("contains fleet-themed blue color", () => {
    expect(appleIconSvg).toContain("#3b82f6");
  });
});
