import templateHtml from "./app-profile.html?raw";
import stylesheet from "./app-profile.css?inline";

export class AppProfile extends HTMLElement {
  private _eventsAttached = false;
  private _client: any = null;

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
    const contentEl = shadow.getElementById("profile-content");
    if (!contentEl || !this._client) return;

    const c = this._client;
    const age = c.dob
      ? Math.floor((Date.now() - new Date(c.dob).getTime()) / 31557600000)
      : "—";
    const initials = (
      (c.firstName || "?")[0] + (c.lastName || "?")[0]
    ).toUpperCase();

    contentEl.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <div class="avatar-large">${initials}</div>
                    <div>
                        <div style="font-size:16px;font-weight:600">${c.firstName} ${c.lastName}</div>
                        <div style="font-size:12px;color:var(--text3)">Anonymous ID: ${c.uuid.substring(0, 8).toUpperCase()}</div>
                    </div>
                </div>
                <div class="profile-info-grid">
                    <div><span class="label">Age: </span>${age}</div>
                    <div><span class="label">Sessions: </span>${(c.sessions || []).length}</div>
                    <div><span class="label">Phone: </span>${c.phone || "—"}</div>
                    <div><span class="label">Email: </span><span style="word-break:break-all">${c.email || "—"}</span></div>
                </div>
                ${
                  c.contraindications?.length
                    ? `
                    <div class="section-title">Contraindications</div>
                    <div class="contraindications">
                        ${c.contraindications.map((cc: string) => `<span class="contra-badge">${cc}</span>`).join("")}
                    </div>
                `
                    : ""
                }
                ${
                  c.medicalNotes
                    ? `
                    <div class="section-title">Medical Notes</div>
                    <div class="medical-notes">${c.medicalNotes}</div>
                `
                    : ""
                }
            </div>
        `;
  }

  private attachEvents() {}
}

customElements.define("app-profile", AppProfile);
