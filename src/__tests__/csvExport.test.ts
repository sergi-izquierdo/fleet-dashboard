import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildCSV, downloadCSV, todayDateString } from "@/lib/csvExport";

describe("buildCSV", () => {
  it("builds a simple CSV with headers and rows", () => {
    const csv = buildCSV(["Name", "Age"], [["Alice", 30], ["Bob", 25]]);
    expect(csv).toBe("Name,Age\nAlice,30\nBob,25");
  });

  it("escapes values containing commas", () => {
    const csv = buildCSV(["Col"], [["hello, world"]]);
    expect(csv).toBe('Col\n"hello, world"');
  });

  it("escapes values containing double quotes", () => {
    const csv = buildCSV(["Col"], [['say "hi"']]);
    expect(csv).toBe('Col\n"say ""hi"""');
  });

  it("handles null and undefined values as empty strings", () => {
    const csv = buildCSV(["A", "B"], [[null, undefined]]);
    expect(csv).toBe("A,B\n,");
  });

  it("produces header-only CSV for empty rows", () => {
    const csv = buildCSV(["X", "Y"], []);
    expect(csv).toBe("X,Y");
  });
});

describe("todayDateString", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    const result = todayDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("downloadCSV", () => {
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let createElementSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    const fakeLink = {
      setAttribute: vi.fn(),
      click: clickSpy,
    };
    createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(fakeLink as unknown as HTMLElement);
    appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockReturnValue(fakeLink as unknown as Node);
    removeChildSpy = vi
      .spyOn(document.body, "removeChild")
      .mockReturnValue(fakeLink as unknown as Node);
    createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mock");
    revokeObjectURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a link element and clicks it", () => {
    downloadCSV("test.csv", "a,b\n1,2");
    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("sets the download attribute to the filename", () => {
    const fakeLink = { setAttribute: vi.fn(), click: clickSpy };
    createElementSpy.mockReturnValue(fakeLink as unknown as HTMLElement);
    appendChildSpy.mockReturnValue(fakeLink as unknown as Node);
    removeChildSpy.mockReturnValue(fakeLink as unknown as Node);

    downloadCSV("my-file.csv", "data");
    expect(fakeLink.setAttribute).toHaveBeenCalledWith("download", "my-file.csv");
  });

  it("revokes the object URL after download", () => {
    downloadCSV("test.csv", "data");
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock");
  });
});
