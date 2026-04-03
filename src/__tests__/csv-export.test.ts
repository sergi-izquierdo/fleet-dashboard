import { describe, it, expect } from "vitest";
import { buildCsvString, todayDateString } from "@/lib/csvExport";

describe("buildCsvString", () => {
  it("produces header row followed by data rows", () => {
    const headers = ["Name", "Value"];
    const rows = [["Alice", "42"], ["Bob", "7"]];
    const csv = buildCsvString(headers, rows);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Value");
    expect(lines[1]).toBe("Alice,42");
    expect(lines[2]).toBe("Bob,7");
  });

  it("wraps fields containing commas in double quotes", () => {
    const headers = ["Project", "Notes"];
    const rows = [["fleet,dashboard", "normal"]];
    const csv = buildCsvString(headers, rows);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('"fleet,dashboard",normal');
  });

  it("escapes double quotes inside fields", () => {
    const headers = ["Title"];
    const rows = [['Say "hello"']];
    const csv = buildCsvString(headers, rows);
    expect(csv).toContain('"Say ""hello"""');
  });

  it("wraps fields containing newlines in double quotes", () => {
    const headers = ["Notes"];
    const rows = [["line1\nline2"]];
    const csv = buildCsvString(headers, rows);
    expect(csv).toContain('"line1\nline2"');
  });

  it("returns only header row when rows is empty", () => {
    const csv = buildCsvString(["A", "B"], []);
    expect(csv).toBe("A,B");
  });

  it("handles empty field values", () => {
    const headers = ["A", "B"];
    const rows = [["", "value"]];
    const csv = buildCsvString(headers, rows);
    expect(csv.split("\n")[1]).toBe(",value");
  });
});

describe("todayDateString", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    const result = todayDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
