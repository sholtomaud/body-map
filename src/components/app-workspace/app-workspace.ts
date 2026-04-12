import templateHtml from "./app-workspace.html?raw";
import stylesheet from "./app-workspace.css?inline";

export class AppWorkspace extends HTMLElement {
  private _eventsAttached = false;
  private _client: any = null;
  private _activeTab = "bodymap";

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
    const header = shadow.getElementById("workspace-header");
    const empty = shadow.getElementById("empty-state");
    const nameEl = shadow.getElementById("ws-client-name");
    const idEl = shadow.getElementById("ws-client-id");

    if (this._client) {
      header!.style.display = "flex";
      empty!.style.display = "none";
      nameEl!.textContent = `${this._client.firstName} ${this._client.lastName}`;
      idEl!.textContent = `ID: ${this._client.uuid.substring(0, 8).toUpperCase()}`;
    } else {
      header!.style.display = "none";
      empty!.style.display = "flex";
    }

    shadow.querySelectorAll(".session-tab").forEach((tab) => {
      tab.classList.toggle(
        "active",
        tab.getAttribute("data-tab") === this._activeTab,
      );
    });
  }

  private attachEvents() {
    const shadow = this.shadowRoot!;
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
