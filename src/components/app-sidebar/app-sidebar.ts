import templateHtml from "./app-sidebar.html?raw";
import stylesheet from "./app-sidebar.css?inline";

export class AppSidebar extends HTMLElement {
  private _eventsAttached = false;
  private _clients: any[] = [];
  private _selectedClientId: string | null = null;
  private _searchQuery = "";

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

  disconnectedCallback() {
    this._eventsAttached = false;
  }

  set clients(value: any[]) {
    this._clients = value;
    this.updateUI();
  }

  set selectedClientId(value: string | null) {
    this._selectedClientId = value;
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
    const listEl = this.shadowRoot!.getElementById("client-list");
    if (!listEl) return;

    const filtered = this._clients.filter((c) =>
      (c.firstName + " " + c.lastName)
        .toLowerCase()
        .includes(this._searchQuery.toLowerCase()),
    );

    if (filtered.length === 0) {
      listEl.innerHTML =
        '<div style="padding:20px 10px;text-align:center;color:var(--text3);font-size:12px;">No clients found.</div>';
      return;
    }

    listEl.innerHTML = filtered
      .map(
        (c) => `
            <div class="client-item ${this._selectedClientId === c.uuid ? "active" : ""}" data-id="${c.uuid}">
                <div class="client-avatar">${this.getInitials(c.firstName, c.lastName)}</div>
                <div class="client-info">
                    <div class="client-name">${c.firstName} ${c.lastName}</div>
                    <div class="client-meta">${c.sessions ? c.sessions.length : 0} session${c.sessions?.length === 1 ? "" : "s"}</div>
                </div>
            </div>
        `,
      )
      .join("");

    listEl.querySelectorAll(".client-item").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-id");
        this.dispatchEvent(
          new CustomEvent("client-selected", {
            detail: { id },
            bubbles: true,
            composed: true,
          }),
        );
      });
    });
  }

  private getInitials(first: string, last: string) {
    return ((first || "?")[0] + (last || "?")[0]).toUpperCase();
  }

  private attachEvents() {
    const shadow = this.shadowRoot!;
    shadow.getElementById("client-search")?.addEventListener("input", (e) => {
      this._searchQuery = (e.target as HTMLInputElement).value;
      this.updateUI();
    });
    shadow.getElementById("btn-add-client")?.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("new-client", { bubbles: true, composed: true }),
      );
    });
  }
}

customElements.define("app-sidebar", AppSidebar);
