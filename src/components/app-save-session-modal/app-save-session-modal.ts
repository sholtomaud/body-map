import templateHtml from "./app-save-session-modal.html?raw";
import stylesheet from "./app-save-session-modal.css?inline";
import "../app-modal/app-modal";

export class AppSaveSessionModal extends HTMLElement {
  private _eventsAttached = false;

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

  public show() {
    const shadow = this.shadowRoot!;
    (shadow.getElementById("modal") as any).show();
    this.resetForm();
  }

  public hide() {
    const shadow = this.shadowRoot!;
    (shadow.getElementById("modal") as any).hide();
  }

  private render() {
    if (!this.shadowRoot!.innerHTML) {
      this.shadowRoot!.innerHTML = templateHtml;
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(stylesheet);
      this.shadowRoot!.adoptedStyleSheets = [sheet];
    }
  }

  private resetForm() {
    const shadow = this.shadowRoot!;
    ["soap-s", "soap-o", "soap-a", "soap-p"].forEach((id) => {
      (shadow.getElementById(id) as HTMLTextAreaElement).value = "";
    });
  }

  private attachEvents() {
    const shadow = this.shadowRoot!;
    shadow
      .getElementById("btn-cancel")
      ?.addEventListener("click", () => this.hide());
    shadow.getElementById("btn-save")?.addEventListener("click", () => {
      const soap = {
        s: (
          shadow.getElementById("soap-s") as HTMLTextAreaElement
        ).value.trim(),
        o: (
          shadow.getElementById("soap-o") as HTMLTextAreaElement
        ).value.trim(),
        a: (
          shadow.getElementById("soap-a") as HTMLTextAreaElement
        ).value.trim(),
        p: (
          shadow.getElementById("soap-p") as HTMLTextAreaElement
        ).value.trim(),
      };

      this.dispatchEvent(
        new CustomEvent("confirm-session-save", {
          detail: { soap },
          bubbles: true,
          composed: true,
        }),
      );
      this.hide();
    });
  }
}

customElements.define("app-save-session-modal", AppSaveSessionModal);
