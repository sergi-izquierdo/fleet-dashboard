import "@testing-library/jest-dom/vitest";

// jsdom does not include EventSource — provide a minimal stub so components
// that use useFleetEvents do not throw "EventSource is not defined" in tests.
if (typeof globalThis.EventSource === "undefined") {
  class EventSourceStub {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSED = 2;
    readyState = 1;
    withCredentials = false;
    onopen: ((ev: Event) => unknown) | null = null;
    onerror: ((ev: Event) => unknown) | null = null;
    onmessage: ((ev: MessageEvent) => unknown) | null = null;
    constructor(_url: string) {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
  }
  globalThis.EventSource = EventSourceStub as unknown as typeof EventSource;
}
