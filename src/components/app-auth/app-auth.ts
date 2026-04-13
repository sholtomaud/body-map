import templateHtml from "./app-auth.html?raw";
import stylesheet from "./app-auth.css?inline";
import { logicClient } from "../../services/logic-client";

export class AppAuth extends HTMLElement {
  private _eventsAttached = false;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  async connectedCallback() {
    this.render();
    if (!this._eventsAttached) {
      this.attachEvents();
      this._eventsAttached = true;
    }
    await logicClient.whenReady();
    this.dataset.ready = "true";
  }

  disconnectedCallback() {
    this._eventsAttached = false;
  }

  private render() {
    if (!this.shadowRoot!.innerHTML) {
      this.shadowRoot!.innerHTML = templateHtml;
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(stylesheet);
      this.shadowRoot!.adoptedStyleSheets = [sheet];
    }
  }

  private attachEvents() {
    const shadow = this.shadowRoot!;
    const tabLogin = shadow.getElementById("tab-login");
    const tabRegister = shadow.getElementById("tab-register");
    const loginForm = shadow.getElementById("login-form");
    const registerForm = shadow.getElementById("register-form");
    const errorEl = shadow.getElementById("auth-error") as HTMLElement;

    tabLogin?.addEventListener("click", () => {
      tabLogin.classList.add("active");
      tabRegister?.classList.remove("active");
      loginForm!.style.display = "block";
      registerForm!.style.display = "none";
      errorEl.style.display = "none";
    });

    tabRegister?.addEventListener("click", () => {
      tabRegister.classList.add("active");
      tabLogin?.classList.remove("active");
      loginForm!.style.display = "none";
      registerForm!.style.display = "block";
      errorEl.style.display = "none";
    });

    loginForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (
        shadow.getElementById("login-name") as HTMLInputElement
      ).value.trim();
      const pass = (shadow.getElementById("login-pass") as HTMLInputElement)
        .value;
      if (!name || !pass)
        return this.showError("Please enter your name and passphrase.");
      logicClient.postMessage("LOGIN", { name, hash: this.hashPass(pass) });
    });

    registerForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (
        shadow.getElementById("reg-name") as HTMLInputElement
      ).value.trim();
      const pass = (shadow.getElementById("reg-pass") as HTMLInputElement)
        .value;
      const pass2 = (shadow.getElementById("reg-pass2") as HTMLInputElement)
        .value;
      if (!name || !pass) return this.showError("Please fill in all fields.");
      if (pass.length < 6)
        return this.showError("Passphrase must be at least 6 characters.");
      if (pass !== pass2) return this.showError("Passphrases do not match.");
      logicClient.postMessage("REGISTER", { name, hash: this.hashPass(pass) });
    });

    logicClient.subscribe((msg) => {
      if (msg.type === "LOGIN_FAILURE") {
        this.showError(msg.payload);
      } else if (
        msg.type === "LOGIN_SUCCESS" ||
        msg.type === "REGISTER_SUCCESS"
      ) {
        if (msg.type === "REGISTER_SUCCESS") {
          localStorage.setItem(
            "therapists",
            JSON.stringify(msg.payload.therapists),
          );
        }
        this.dispatchEvent(
          new CustomEvent("auth-success", {
            detail: msg.payload,
            bubbles: true,
            composed: true,
          }),
        );
      }
    });
  }

  private showError(msg: string) {
    const el = this.shadowRoot!.getElementById("auth-error") as HTMLElement;
    el.textContent = msg;
    el.style.display = "block";
  }

  private hashPass(p: string) {
    let h = 0;
    for (let i = 0; i < p.length; i++) {
      h = (h << 5) - h + p.charCodeAt(i);
      h |= 0;
    }
    return h.toString(16);
  }
}

customElements.define("app-auth", AppAuth);
