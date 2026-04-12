class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  private listeners: Record<string, Set<any>> = {};

  constructor() {
    setTimeout(() => {
      this.dispatchEvent(
        new MessageEvent("message", { data: { type: "READY" } }),
      );
    }, 0);
  }

  addEventListener(type: string, listener: any) {
    if (!this.listeners[type]) this.listeners[type] = new Set();
    this.listeners[type].add(listener);
  }

  removeEventListener(type: string, listener: any) {
    this.listeners[type]?.delete(listener);
  }

  postMessage(data: any) {
    // Mock response for INIT
    if (data.type === "INIT") {
      // already sent READY in constructor
    }
  }

  terminate() {}

  private dispatchEvent(event: any) {
    if (event.type === "message") {
      if (this.onmessage) this.onmessage(event);
      this.listeners["message"]?.forEach((l) => l(event));
    }
  }
}

global.Worker = MockWorker as any;

// CSSStyleSheet is not fully supported in jsdom
if (typeof global.CSSStyleSheet === "undefined") {
  (global as any).CSSStyleSheet = class {
    replaceSync() {}
  };
}
