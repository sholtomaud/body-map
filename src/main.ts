import "./style.css";
import { logicClient } from "./services/logic-client";
import { generateUUID } from "./services/uuid";

// Register components
import "./components/app-auth/app-auth";
import "./components/app-topbar/app-topbar";
import "./components/app-sidebar/app-sidebar";
import "./components/app-workspace/app-workspace";
import "./components/app-bodymap/app-bodymap";
import "./components/app-ai-assistant/app-ai-assistant";
import "./components/app-sessions/app-sessions";
import "./components/app-profile/app-profile";
import "./components/app-client-modal/app-client-modal";
import "./components/app-annotation-modal/app-annotation-modal";

class App {
  private authEl!: any;
  private topbarEl!: any;
  private sidebarEl!: any;
  private workspaceEl!: any;
  private bodymapEl!: any;
  private aiEl!: any;
  private sessionsEl!: any;
  private profileEl!: any;
  private clientModalEl!: any;
  private annotationModalEl!: any;

  private currentClient: any = null;
  private currentAnnotations: any[] = [];
  private clients: any[] = [];

  constructor() {
    this.init();
  }

  async init() {
    await logicClient.whenReady();
    this.cacheElements();
    this.attachEvents();
    this.loadInitialState();
  }

  cacheElements() {
    this.authEl = document.querySelector("app-auth");
    this.topbarEl = document.querySelector("app-topbar");
    this.sidebarEl = document.querySelector("app-sidebar");
    this.workspaceEl = document.querySelector("app-workspace");
    this.bodymapEl = document.querySelector("app-bodymap");
    this.aiEl = document.querySelector("app-ai-assistant");
    this.sessionsEl = document.querySelector("app-sessions");
    this.profileEl = document.querySelector("app-profile");
    this.clientModalEl = document.querySelector("app-client-modal");
    this.annotationModalEl = document.querySelector("app-annotation-modal");
  }

  attachEvents() {
    window.addEventListener("auth-success", (e: any) => {
      this.onLogin(e.detail);
    });

    window.addEventListener("logout", () => {
      logicClient.postMessage("LOGOUT");
    });

    window.addEventListener("client-selected", (e: any) => {
      this.handleClientSelection(e.detail.id, this.clients);
    });

    window.addEventListener("mode-changed", (e: any) => {
      this.bodymapEl.mode = e.detail.mode;
    });

    window.addEventListener("new-client", () => {
      this.clientModalEl.show();
    });

    window.addEventListener("save-client", (e: any) => {
      const newClient = {
        ...e.detail,
        uuid: generateUUID(),
        createdAt: new Date().toISOString(),
        sessions: [],
      };
      logicClient.postMessage("ADD_CLIENT", newClient);
    });

    window.addEventListener("tab-changed", (e: any) => {
      this.switchTab(e.detail.tab);
    });

    window.addEventListener("body-click", (e: any) => {
      this.annotationModalEl.show(e.detail);
    });

    window.addEventListener("confirm-annotation", (e: any) => {
      const ann = {
        ...e.detail,
        id: generateUUID(),
        mode: this.bodymapEl.mode,
      };
      this.currentAnnotations.push(ann);
      this.bodymapEl.annotations = [...this.currentAnnotations];
      this.sendToAi(ann);
    });

    window.addEventListener("save-session", () => {
      this.saveSession();
    });

    window.addEventListener("clear-annotations", () => {
      if (confirm("Clear all annotations?")) {
        this.currentAnnotations = [];
        this.bodymapEl.annotations = [];
      }
    });

    window.addEventListener("session-selected", (e: any) => {
      this.loadSessionOntoMap(e.detail.id);
    });

    window.addEventListener("send-message", (e: any) => {
      this.handleAiMessage(e.detail.text);
    });

    logicClient.subscribe((msg) => {
      if (msg.type === "CLIENTS_UPDATED") {
        this.clients = msg.payload;
        this.sidebarEl.clients = msg.payload;
        localStorage.setItem(
          `clients_${localStorage.getItem("currentTherapist")}`,
          JSON.stringify(msg.payload),
        );
        if (this.currentClient) {
          this.currentClient = msg.payload.find(
            (c: any) => c.uuid === this.currentClient.uuid,
          );
          this.updateWorkspace();
        }
      } else if (msg.type === "LOGOUT_SUCCESS") {
        this.onLogout();
      } else if (
        msg.type === "LOGIN_SUCCESS" ||
        msg.type === "REGISTER_SUCCESS"
      ) {
        localStorage.setItem("currentTherapist", msg.payload.key);
        this.onLogin(msg.payload);
      }
    });
  }

  onLogin(payload: any) {
    this.authEl.hidden = true;
    document.getElementById("app-main")!.hidden = false;
    this.topbarEl.setAttribute("therapist-name", payload.name);

    const clients = JSON.parse(
      localStorage.getItem(`clients_${payload.key}`) || "[]",
    );
    logicClient.postMessage("SET_CLIENTS", clients);
  }

  onLogout() {
    this.authEl.hidden = false;
    document.getElementById("app-main")!.hidden = true;
    this.currentClient = null;
    this.sidebarEl.selectedClientId = null;
    this.workspaceEl.client = null;
    localStorage.removeItem("currentTherapist");
  }


  // Re-implemented selectClient to avoid multiple subscriptions
  handleClientSelection(id: string, clients: any[]) {
    this.currentClient = clients.find((c: any) => c.uuid === id);
    this.sidebarEl.selectedClientId = id;
    this.workspaceEl.client = this.currentClient;
    this.currentAnnotations = [];
    this.bodymapEl.annotations = [];
    this.aiEl.messages = [];
    this.aiEl.addMessage(
      "assistant",
      `Client profile loaded. Click on any body region to annotate findings.`,
    );
    this.switchTab("bodymap");
  }

  updateWorkspace() {
    if (this.currentClient) {
      this.workspaceEl.client = this.currentClient;
      this.sessionsEl.sessions = this.currentClient.sessions || [];
      this.profileEl.client = this.currentClient;
    }
  }

  switchTab(tab: string) {
    this.bodymapEl.hidden = tab !== "bodymap";
    this.aiEl.hidden = tab !== "bodymap";
    this.sessionsEl.hidden = tab !== "sessions";
    this.profileEl.hidden = tab !== "profile";

    if (tab === "sessions")
      this.sessionsEl.sessions = this.currentClient.sessions || [];
    if (tab === "profile") this.profileEl.client = this.currentClient;
  }

  saveSession() {
    if (!this.currentClient || this.currentAnnotations.length === 0)
      return alert("No annotations to save.");

    const session = {
      id: generateUUID(),
      date: new Date().toISOString(),
      mode: this.workspaceEl.mode,
      annotations: [...this.currentAnnotations],
      therapistNotes: "",
    };

    const updatedClient = { ...this.currentClient };
    updatedClient.sessions = [session, ...(updatedClient.sessions || [])];
    logicClient.postMessage("UPDATE_CLIENT", updatedClient);

    this.currentAnnotations = [];
    this.bodymapEl.annotations = [];
    alert("Session saved.");
  }

  loadSessionOntoMap(sessionId: string) {
    const session = this.currentClient.sessions.find(
      (s: any) => s.id === sessionId,
    );
    if (!session) return;

    this.currentAnnotations = [...session.annotations];
    this.bodymapEl.annotations = this.currentAnnotations;
    this.workspaceEl.mode = session.mode;
    this.switchTab("bodymap");
    this.aiEl.addMessage(
      "assistant",
      `Loaded historical session from ${new Date(session.date).toLocaleDateString()}.`,
    );
  }

  async sendToAi(ann: any) {
    this.aiEl.addMessage(
      "user",
      `[Annotation] ${ann.region} — ${ann.type || "unspecified"}, ${ann.severity}/10`,
    );
    this.aiEl.isTyping = true;
    // Mocking AI response for now as I don't have the API key
    setTimeout(() => {
      this.aiEl.isTyping = false;
      this.aiEl.addMessage(
        "assistant",
        `Acknowledged finding at ${ann.region}. Consider ${ann.type === "Tightness" ? "myofascial release" : "gentle effleurage"}.`,
      );
    }, 1000);
  }

  handleAiMessage(text: string) {
    this.aiEl.addMessage("user", text);
    this.aiEl.isTyping = true;
    setTimeout(() => {
      this.aiEl.isTyping = false;
      this.aiEl.addMessage(
        "assistant",
        `I'm a mock AI for this refactor. You asked: "${text}"`,
      );
    }, 1000);
  }

  loadInitialState() {
    const therapistKey = localStorage.getItem("currentTherapist");
    if (therapistKey) {
      const therapists = JSON.parse(localStorage.getItem("therapists") || "{}");
      const t = therapists[therapistKey];
      if (t) {
        this.onLogin({ name: t.displayName, key: therapistKey });
      }
    }
  }
}

new App();
