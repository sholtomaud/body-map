import templateHtml from "./app-annotation-modal.html?raw";
import stylesheet from "./app-annotation-modal.css?inline";
import "../app-modal/app-modal";

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

export class AppAnnotationModal extends HTMLElement {
  private _eventsAttached = false;
  private _pendingAnnotation: any = null;

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

  public show(ann: any) {
    this._pendingAnnotation = { ...ann, severity: 5, type: null, status: null };
    this.render();
    (this.shadowRoot!.getElementById("modal") as any).show();
    this.updateUI();
  }

  public hide() {
    (this.shadowRoot!.getElementById("modal") as any).hide();
  }

  private render() {
    if (!this.shadowRoot!.innerHTML) {
      this.shadowRoot!.innerHTML = templateHtml;
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(stylesheet);
      this.shadowRoot!.adoptedStyleSheets = [sheet];

      const bar = this.shadowRoot!.getElementById("severity-bar")!;
      bar.innerHTML = [2, 4, 6, 8, 10]
        .map(
          (v) => `
                <div class="severity-btn" style="background:${SEVERITY_COLORS[v]}" data-value="${v}">${v}</div>
            `,
        )
        .join("");

      bar.querySelectorAll(".severity-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this._pendingAnnotation.severity = parseInt(
            btn.getAttribute("data-value")!,
          );
          this.updateUI();
        });
      });

      this.shadowRoot!.querySelectorAll(".type-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const type = btn.getAttribute("data-type");
          const status = btn.getAttribute("data-status");
          if (type) this._pendingAnnotation.type = type;
          if (status) this._pendingAnnotation.status = status;
          this.updateUI();
        });
      });
    }
  }

  private updateUI() {
    if (!this._pendingAnnotation) return;
    const shadow = this.shadowRoot!;
    shadow.getElementById("popup-region-name")!.textContent =
      this._pendingAnnotation.region;

    shadow.querySelectorAll(".severity-btn").forEach((btn) => {
      btn.classList.toggle(
        "selected",
        parseInt(btn.getAttribute("data-value")!) ===
          this._pendingAnnotation.severity,
      );
    });

    shadow.querySelectorAll(".type-btn").forEach((btn) => {
      const type = btn.getAttribute("data-type");
      const status = btn.getAttribute("data-status");
      if (type)
        btn.classList.toggle("selected", type === this._pendingAnnotation.type);
      if (status)
        btn.classList.toggle(
          "selected",
          status === this._pendingAnnotation.status,
        );
    });
  }

  private attachEvents() {
    const shadow = this.shadowRoot!;
    shadow
      .getElementById("btn-cancel")
      ?.addEventListener("click", () => this.hide());
    shadow.getElementById("btn-confirm")?.addEventListener("click", () => {
      this._pendingAnnotation.notes = (
        shadow.getElementById("popup-notes") as HTMLTextAreaElement
      ).value.trim();
      this.dispatchEvent(
        new CustomEvent("confirm-annotation", {
          detail: this._pendingAnnotation,
          bubbles: true,
          composed: true,
        }),
      );
      this.hide();
    });
  }
}

customElements.define("app-annotation-modal", AppAnnotationModal);
