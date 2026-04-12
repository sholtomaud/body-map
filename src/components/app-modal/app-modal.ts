import templateHtml from "./app-modal.html?raw";
import stylesheet from "./app-modal.css?inline";

export class AppModal extends HTMLElement {
  private _eventsAttached = false;
  private _title = "";

  static get observedAttributes() {
    return ["title", "visible"];
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

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === "title") {
      this._title = newValue;
      this.updateUI();
    } else if (name === "visible") {
      this.updateUI();
    }
  }

  public show() {
    this.setAttribute("visible", "true");
  }

  public hide() {
    this.removeAttribute("visible");
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
    const overlay = shadow.getElementById("overlay");
    const titleEl = shadow.getElementById("title");

    if (overlay) {
      overlay.classList.toggle("visible", this.hasAttribute("visible"));
    }
    if (titleEl) {
      titleEl.textContent = this._title;
    }
  }

  private attachEvents() {
    const shadow = this.shadowRoot!;
    shadow.getElementById("btn-close")?.addEventListener("click", () => {
      this.hide();
      this.dispatchEvent(
        new CustomEvent("close", { bubbles: true, composed: true }),
      );
    });
    shadow.getElementById("overlay")?.addEventListener("click", (e) => {
      if (e.target === shadow.getElementById("overlay")) {
        this.hide();
        this.dispatchEvent(
          new CustomEvent("close", { bubbles: true, composed: true }),
        );
      }
    });
  }
}

customElements.define("app-modal", AppModal);
