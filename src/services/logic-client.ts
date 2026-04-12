// src/services/logic-client.ts

export class LogicClient {
  private static instance: LogicClient;
  private worker: Worker;
  private listeners: Set<(message: any) => void> = new Set();
  private readyPromise: Promise<void>;

  private constructor() {
    this.worker = new Worker(
      new URL("../workers/logic.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    this.worker.onmessage = (e) => {
      this.listeners.forEach((l) => l(e.data));
    };

    this.readyPromise = new Promise((resolve) => {
      const handler = (e: MessageEvent) => {
        if (e.data.type === "READY") {
          this.worker.removeEventListener("message", handler);
          resolve();
        }
      };
      this.worker.addEventListener("message", handler);
    });

    // Load initial data from localStorage
    const therapists = JSON.parse(localStorage.getItem("therapists") || "{}");
    this.worker.postMessage({ type: "INIT", payload: { therapists } });
  }

  public static getInstance(): LogicClient {
    if (!LogicClient.instance) {
      LogicClient.instance = new LogicClient();
    }
    return LogicClient.instance;
  }

  public async whenReady(): Promise<void> {
    return this.readyPromise;
  }

  public subscribe(listener: (message: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public postMessage(type: string, payload?: any) {
    this.worker.postMessage({ type, payload });
  }
}

export const logicClient = LogicClient.getInstance();
