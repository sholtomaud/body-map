import templateHtml from "./app-topbar.html?raw";
import stylesheet from "./app-topbar.css?inline";

export class AppTopbar extends HTMLElement {
  private _eventsAttached = false;
  private _therapistName = "";

  static get observedAttributes() {
    return ["therapist-name"];
  }

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

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === "therapist-name") {
      this._therapistName = newValue;
      this.updateUI();
    }
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
    const el = this.shadowRoot!.getElementById("therapist-name");
    if (el) el.textContent = this._therapistName;
  }

  private attachEvents() {
    const shadow = this.shadowRoot!;
    shadow.getElementById("btn-new-client")?.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("new-client", { bubbles: true, composed: true }),
      );
    });
    shadow.getElementById("btn-logout")?.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("logout", { bubbles: true, composed: true }),
      );
    });
  }
}

customElements.define("app-topbar", AppTopbar);
