import templateHtml from "./app-client-modal.html?raw";
import stylesheet from "./app-client-modal.css?inline";
import "../app-modal/app-modal";

const CONTRAINDICATIONS = [
  "Pregnancy",
  "Deep Vein Thrombosis",
  "Blood Clotting Disorder",
  "Recent Surgery",
  "Cancer / Oncology",
  "Skin Conditions",
  "Osteoporosis",
  "High Blood Pressure",
  "Diabetes",
  "Epilepsy",
  "Open Wounds",
  "Fever / Infection",
];

export class AppClientModal extends HTMLElement {
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

  public show() {
    (this.shadowRoot!.getElementById("modal") as any).show();
    this.resetForm();
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

      const grid = this.shadowRoot!.getElementById("contra-grid");
      if (grid) {
        grid.innerHTML = CONTRAINDICATIONS.map(
          (c) => `
                    <div class="contra-item">
                        <div class="contra-check"></div>
                        <span>${c}</span>
                    </div>
                `,
        ).join("");

        grid.querySelectorAll(".contra-item").forEach((item) => {
          item.addEventListener("click", () => {
            item.classList.toggle("checked");
            const check = item.querySelector(".contra-check")!;
            check.innerHTML = item.classList.contains("checked")
              ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="white"><path d="M2 5l2.5 2.5L8 3"/></svg>'
              : "";
          });
        });
      }
    }
  }

  private resetForm() {
    const shadow = this.shadowRoot!;
    ["nc-first", "nc-last", "nc-email", "nc-phone", "nc-notes"].forEach(
      (id) => {
        (shadow.getElementById(id) as HTMLInputElement).value = "";
      },
    );
    (shadow.getElementById("nc-dob") as HTMLInputElement).value = "";
    shadow.querySelectorAll(".contra-item").forEach((item) => {
      item.classList.remove("checked");
      item.querySelector(".contra-check")!.innerHTML = "";
    });
  }

  private attachEvents() {
    const shadow = this.shadowRoot!;
    shadow
      .getElementById("btn-cancel")
      ?.addEventListener("click", () => this.hide());
    shadow.getElementById("btn-save")?.addEventListener("click", () => {
      const first = (
        shadow.getElementById("nc-first") as HTMLInputElement
      ).value.trim();
      const last = (
        shadow.getElementById("nc-last") as HTMLInputElement
      ).value.trim();
      if (!first || !last) return alert("Please enter first and last name.");

      const contras = [...shadow.querySelectorAll(".contra-item.checked")].map(
        (el) => el.querySelector("span")!.textContent!,
      );

      this.dispatchEvent(
        new CustomEvent("save-client", {
          detail: {
            firstName: first,
            lastName: last,
            dob: (shadow.getElementById("nc-dob") as HTMLInputElement).value,
            phone: (
              shadow.getElementById("nc-phone") as HTMLInputElement
            ).value.trim(),
            email: (
              shadow.getElementById("nc-email") as HTMLInputElement
            ).value.trim(),
            contraindications: contras,
            medicalNotes: (
              shadow.getElementById("nc-notes") as HTMLInputElement
            ).value.trim(),
          },
          bubbles: true,
          composed: true,
        }),
      );
      this.hide();
    });
  }
}

customElements.define("app-client-modal", AppClientModal);
