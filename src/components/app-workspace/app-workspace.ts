import templateHtml from "./app-workspace.html?raw";
import stylesheet from "./app-workspace.css?inline";

export class AppWorkspace extends HTMLElement {
  private _eventsAttached = false;
  private _client: any = null;
  private _activeTab = "bodymap";
  private _mode: "pre" | "post" = "pre";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    if (!this._eventsAttached) {
      this.attachEvents();
      this._eventsAttached = true;
    }
    this.dataset.ready = "true";
  }

  set client(value: any) {
    this._client = value;
    this.updateUI();
  }

  get mode() {
    return this._mode;
  }

  set mode(value: "pre" | "post") {
    this._mode = value;
    this.updateUI();
    this.dispatchEvent(
      new CustomEvent("mode-changed", {
        detail: { mode: value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private render() {
    if (!this.shadowRoot!.innerHTML) {
      this.shadowRoot!.innerHTML = templateHtml;
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(stylesheet);
      this.shadowRoot!.adoptedStyleSheets = [sheet];
    }
    this.updateUI();
  }

  private updateUI() {
    const shadow = this.shadowRoot!;
    const clientInfo = shadow.getElementById("header-client-info");
    const message = shadow.getElementById("header-message");
    const empty = shadow.getElementById("empty-state");
    const tabContent = shadow.getElementById("tab-content");
    const nameEl = shadow.getElementById("ws-client-name");
    const idEl = shadow.getElementById("ws-client-id");

    if (this._client) {
      clientInfo!.style.display = "flex";
      message!.style.display = "none";
      empty!.style.display = "none";
      tabContent!.style.display = "contents";
      nameEl!.textContent = `${this._client.firstName} ${this._client.lastName}`;
      idEl!.textContent = `ID: ${this._client.uuid.substring(0, 8).toUpperCase()}`;
    } else {
      clientInfo!.style.display = "none";
      message!.style.display = "block";
      empty!.style.display = "flex";
      tabContent!.style.display = "none";
    }

    shadow
      .getElementById("mode-pre")
      ?.classList.toggle("active", this._mode === "pre");
    shadow
      .getElementById("mode-post")
      ?.classList.toggle("active", this._mode === "post");

    shadow.querySelectorAll(".session-tab").forEach((tab) => {
      tab.classList.toggle(
        "active",
        tab.getAttribute("data-tab") === this._activeTab,
      );
    });
  }

  private attachEvents() {
    const shadow = this.shadowRoot!;

    shadow.getElementById("mode-pre")?.addEventListener("click", () => {
      this.mode = "pre";
    });

    shadow.getElementById("mode-post")?.addEventListener("click", () => {
      this.mode = "post";
    });

    shadow.getElementById("btn-save")?.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("save-session", { bubbles: true, composed: true }),
      );
    });

    shadow.getElementById("btn-clear")?.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("clear-annotations", {
          bubbles: true,
          composed: true,
        }),
      );
    });

    shadow.querySelectorAll(".session-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const newTab = tab.getAttribute("data-tab")!;
        if (newTab !== this._activeTab) {
          this._activeTab = newTab;
          this.updateUI();
          this.dispatchEvent(
            new CustomEvent("tab-changed", {
              detail: { tab: newTab },
              bubbles: true,
              composed: true,
            }),
          );
        }
      });
    });
  }
}

customElements.define("app-workspace", AppWorkspace);
