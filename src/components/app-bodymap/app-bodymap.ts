import templateHtml from "./app-bodymap.html?raw";
import stylesheet from "./app-bodymap.css?inline";

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

export class AppBodymap extends HTMLElement {
  private _eventsAttached = false;
  private _annotations: any[] = [];
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

  set annotations(value: any[]) {
    this._annotations = value;
    this.updateUI();
  }

  get annotations() {
    return this._annotations;
  }

  set mode(value: "pre" | "post") {
    this._mode = value;
    this.updateUI();
  }

  get mode() {
    return this._mode;
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
    shadow
      .getElementById("mode-pre")
      ?.classList.toggle("active", this._mode === "pre");
    shadow
      .getElementById("mode-post")
      ?.classList.toggle("active", this._mode === "post");

    ["front", "back"].forEach((side) => {
      const wrap = shadow.getElementById(side + "-wrap");
      if (wrap) {
        wrap.querySelectorAll(".annotation-dot").forEach((d) => d.remove());
        this._annotations
          .filter((a) => a.side === side)
          .forEach((a) => {
            const dot = document.createElement("div");
            dot.className = "annotation-dot";
            dot.style.left = a.x + "%";
            dot.style.top = a.y + "%";
            dot.style.background = SEVERITY_COLORS[a.severity] || "#e07820";
            dot.title = `${a.region} — ${a.type || "unspecified"} (${a.severity}/10)`;
            dot.addEventListener("click", (e) => {
              e.stopPropagation();
              this.dispatchEvent(
                new CustomEvent("annotation-click", {
                  detail: a,
                  bubbles: true,
                  composed: true,
                }),
              );
            });
            wrap.appendChild(dot);
          });
      }
    });
  }

  private attachEvents() {
    const shadow = this.shadowRoot!;

    shadow.getElementById("mode-pre")?.addEventListener("click", () => {
      this._mode = "pre";
      this.updateUI();
    });

    shadow.getElementById("mode-post")?.addEventListener("click", () => {
      this._mode = "post";
      this.updateUI();
    });

    shadow.getElementById("btn-save")?.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("save-session", { bubbles: true, composed: true }),
      );
    });

    shadow.getElementById("btn-clear")?.addEventListener("click", () => {
      if (confirm("Clear all annotations?")) {
        this._annotations = [];
        this.updateUI();
      }
    });

    ["front", "back"].forEach((side) => {
      const wrap = shadow.getElementById(side + "-wrap");
      wrap?.addEventListener("click", (e) => {
        const region = (e.target as HTMLElement).closest(
          "[data-region]",
        ) as HTMLElement;
        if (!region) return;

        const rect = wrap.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        this.dispatchEvent(
          new CustomEvent("body-click", {
            detail: {
              side,
              region: region.dataset.region,
              x,
              y,
              clientX: e.clientX,
              clientY: e.clientY,
            },
            bubbles: true,
            composed: true,
          }),
        );
      });

      wrap?.addEventListener("mousemove", (e) => {
        const region = (e.target as HTMLElement).closest(
          "[data-region]",
        ) as HTMLElement;
        const tt = shadow.getElementById("region-tooltip")!;
        if (region) {
          tt.style.display = "block";
          tt.textContent = region.dataset.region!;
          tt.style.left = e.clientX + 12 + "px";
          tt.style.top = e.clientY - 24 + "px";
        } else {
          tt.style.display = "none";
        }
      });

      wrap?.addEventListener("mouseleave", () => {
        shadow.getElementById("region-tooltip")!.style.display = "none";
      });
    });
  }
}

customElements.define("app-bodymap", AppBodymap);
