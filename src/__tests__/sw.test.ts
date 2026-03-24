import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Service Worker environment mock ---

type FetchHandler = (event: MockFetchEvent) => void;

interface MockFetchEvent {
  request: { method: string; url: string; mode: string };
  respondWith: ReturnType<typeof vi.fn>;
}

let fetchHandler: FetchHandler;

const selfMock = {
  addEventListener: vi.fn((event: string, handler: FetchHandler) => {
    if (event === "fetch") fetchHandler = handler;
  }),
  skipWaiting: vi.fn(),
  clients: { claim: vi.fn() },
};

// Expose as globals before importing the SW script
Object.assign(globalThis, {
  self: selfMock,
  caches: {
    open: vi.fn().mockResolvedValue({
      addAll: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    }),
    keys: vi.fn().mockResolvedValue([]),
    match: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
  },
  fetch: vi.fn().mockResolvedValue(new Response("ok")),
});

// Import the service worker (executes top-level addEventListener calls)
await import("../../public/sw.js");

function createFetchEvent(
  url: string,
  method = "GET",
  mode = "no-cors",
): MockFetchEvent {
  return {
    request: { method, url, mode },
    respondWith: vi.fn(),
  };
}

describe("Service Worker fetch handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores POST requests", () => {
    const event = createFetchEvent("https://example.com/api/data", "POST");
    fetchHandler(event);
    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("ignores PUT requests", () => {
    const event = createFetchEvent("https://example.com/api/data", "PUT");
    fetchHandler(event);
    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("ignores chrome-extension:// URLs", () => {
    const event = createFetchEvent("chrome-extension://abc123/script.js");
    fetchHandler(event);
    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("ignores other non-http schemes", () => {
    const event = createFetchEvent("data:text/plain;base64,SGVsbG8=");
    fetchHandler(event);
    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("ignores API requests", () => {
    const event = createFetchEvent("https://example.com/api/health");
    fetchHandler(event);
    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("handles navigation requests with respondWith", () => {
    const event = createFetchEvent("https://example.com/dashboard", "GET", "navigate");
    fetchHandler(event);
    expect(event.respondWith).toHaveBeenCalledTimes(1);
  });

  it("handles static asset GET requests with respondWith", () => {
    const event = createFetchEvent("https://example.com/static/app.js");
    fetchHandler(event);
    expect(event.respondWith).toHaveBeenCalledTimes(1);
  });
});
