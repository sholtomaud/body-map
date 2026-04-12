import templateHtml from "./app-ai-assistant.html?raw";
import stylesheet from "./app-ai-assistant.css?inline";

export class AppAiAssistant extends HTMLElement {
  private _eventsAttached = false;
  private _messages: any[] = [];
  private _isTyping = false;

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

  set messages(value: any[]) {
    this._messages = value;
    this.updateUI();
  }

  set isTyping(value: boolean) {
    this._isTyping = value;
    this.updateUI();
  }

  public addMessage(role: "user" | "assistant", content: string) {
    const now = new Date().toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    });
    this._messages.push({ role, content, time: now });
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
    const listEl = shadow.getElementById("ai-messages");
    if (!listEl) return;

    listEl.innerHTML = this._messages
      .map(
        (m) => `
            <div class="ai-msg ${m.role}">
                <div class="ai-bubble">${m.content}</div>
                <div class="ai-msg-time">${m.time}</div>
            </div>
        `,
      )
      .join("");

    if (this._isTyping) {
      const typing = document.createElement("div");
      typing.className = "ai-typing";
      typing.innerHTML =
        '<div class="ai-typing-dot"></div><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div>';
      listEl.appendChild(typing);
    }

    listEl.scrollTop = listEl.scrollHeight;
  }

  private attachEvents() {
    const shadow = this.shadowRoot!;
    const input = shadow.getElementById("ai-input") as HTMLTextAreaElement;
    const btnSend = shadow.getElementById("btn-send");

    const sendMessage = () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      this.dispatchEvent(
        new CustomEvent("send-message", {
          detail: { text },
          bubbles: true,
          composed: true,
        }),
      );
    };

    btnSend?.addEventListener("click", sendMessage);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
}

customElements.define("app-ai-assistant", AppAiAssistant);
