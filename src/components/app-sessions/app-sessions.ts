import templateHtml from "./app-sessions.html?raw";
import stylesheet from "./app-sessions.css?inline";

const SEVERITY_COLORS: Record<number, string> = {
  1: "#a8d8a8",
  2: "#b8d890",
  3: "#d4d060",
  4: "#e8b840",
  5: "#e89030",
  6: "#e07028",
  7: "#d05020",
  8: "#c03030",
  9: "#a02020",
  10: "#8b0000",
};

export class AppSessions extends HTMLElement {
  private _eventsAttached = false;
  private _sessions: any[] = [];

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

  set sessions(value: any[]) {
    this._sessions = value;
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
    const listEl = shadow.getElementById("sessions-list");
    if (!listEl) return;

    if (this._sessions.length === 0) {
      listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-title">No sessions yet</div>
                    <div class="empty-sub">Annotate the body map and save a session to see history here.</div>
                </div>
            `;
      return;
    }

    listEl.innerHTML = this._sessions
      .map(
        (s) => `
            <div class="session-card" data-id="${s.id}">
                <div class="session-card-header">
                    <div class="session-date">${new Date(s.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div>
                    <div style="display:flex;align-items:center;gap:8px">
                        <div class="session-mode-badge ${s.mode === "pre" ? "badge-pre" : "badge-post"}">${s.mode === "pre" ? "Pre-treatment" : "Post-treatment"}</div>
                        <div style="font-size:11px;color:var(--text3)">View on map →</div>
                    </div>
                </div>
                <div class="session-annotations">
                    ${s.annotations
                      .map(
                        (a: any) => `
                        <div class="ann-chip">
                            <div class="ann-chip-dot" style="background:${SEVERITY_COLORS[a.severity]}"></div>
                            ${a.region} (${a.severity}/10)
                        </div>
                    `,
                      )
                      .join("")}
                </div>
                ${
                  s.soap
                    ? `
                    <div class="session-soap">
                        ${s.soap.s ? `<div class="soap-entry"><span class="soap-label">S:</span> ${s.soap.s}</div>` : ""}
                        ${s.soap.o ? `<div class="soap-entry"><span class="soap-label">O:</span> ${s.soap.o}</div>` : ""}
                        ${s.soap.a ? `<div class="soap-entry"><span class="soap-label">A:</span> ${s.soap.a}</div>` : ""}
                        ${s.soap.p ? `<div class="soap-entry"><span class="soap-label">P:</span> ${s.soap.p}</div>` : ""}
                    </div>
                `
                    : ""
                }
            </div>
        `,
      )
      .join("");

    listEl.querySelectorAll(".session-card").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-id");
        this.dispatchEvent(
          new CustomEvent("session-selected", {
            detail: { id },
            bubbles: true,
            composed: true,
          }),
        );
      });
    });
  }

  private attachEvents() {}
}

customElements.define("app-sessions", AppSessions);
