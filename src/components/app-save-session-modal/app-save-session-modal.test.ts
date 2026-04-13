import { describe, it, expect, beforeEach, vi } from "vitest";
import "./app-save-session-modal";

describe("app-save-session-modal", () => {
  beforeEach(() => {
    document.body.innerHTML =
      "<app-save-session-modal></app-save-session-modal>";
  });

  const waitForReady = async (el: HTMLElement) => {
    await new Promise((r) => {
      const check = () => {
        if (el.dataset.ready === "true") r(null);
        else setTimeout(check, 10);
      };
      check();
    });
  };

  it("should render soap fields", async () => {
    const modal = document.querySelector(
      "app-save-session-modal",
    ) as HTMLElement;
    await waitForReady(modal);

    const shadow = modal.shadowRoot!;
    expect(shadow.getElementById("soap-s")).not.toBeNull();
    expect(shadow.getElementById("soap-o")).not.toBeNull();
    expect(shadow.getElementById("soap-a")).not.toBeNull();
    expect(shadow.getElementById("soap-p")).not.toBeNull();
  });

  it("should emit confirm-session-save event with SOAP data", async () => {
    const modal = document.querySelector("app-save-session-modal") as any;
    await waitForReady(modal);

    const shadow = modal.shadowRoot!;
    const sInput = shadow.getElementById("soap-s") as HTMLTextAreaElement;
    const oInput = shadow.getElementById("soap-o") as HTMLTextAreaElement;
    const aInput = shadow.getElementById("soap-a") as HTMLTextAreaElement;
    const pInput = shadow.getElementById("soap-p") as HTMLTextAreaElement;
    const saveBtn = shadow.getElementById("btn-save");

    sInput.value = "Subjective notes";
    oInput.value = "Objective notes";
    aInput.value = "Assessment notes";
    pInput.value = "Plan notes";

    const handler = vi.fn();
    modal.addEventListener("confirm-session-save", handler);

    saveBtn!.click();

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail.soap).toEqual({
      s: "Subjective notes",
      o: "Objective notes",
      a: "Assessment notes",
      p: "Plan notes",
    });
  });

  it("should clear fields when show() is called", async () => {
    const modal = document.querySelector("app-save-session-modal") as any;
    await waitForReady(modal);

    const shadow = modal.shadowRoot!;
    const sInput = shadow.getElementById("soap-s") as HTMLTextAreaElement;
    sInput.value = "Some value";

    modal.show();

    expect(sInput.value).toBe("");
  });
});
