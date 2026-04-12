import { describe, it, expect, beforeEach } from "vitest";
import "./app-auth";

describe("app-auth", () => {
  beforeEach(() => {
    document.body.innerHTML = "<app-auth></app-auth>";
  });

  it("should render the login form by default", async () => {
    const auth = document.querySelector("app-auth") as HTMLElement;
    await new Promise((r) => {
      const check = () => {
        if (auth.dataset.ready === "true") r(null);
        else setTimeout(check, 10);
      };
      check();
    });

    const shadow = auth.shadowRoot!;
    expect(shadow.getElementById("login-form")).not.toBeNull();
    expect(shadow.getElementById("login-form")!.style.display).not.toBe("none");
  });

  it("should switch to register form when tab is clicked", async () => {
    const auth = document.querySelector("app-auth") as HTMLElement;
    await new Promise((r) => {
      const check = () => {
        if (auth.dataset.ready === "true") r(null);
        else setTimeout(check, 10);
      };
      check();
    });

    const shadow = auth.shadowRoot!;
    const tabRegister = shadow.getElementById("tab-register");
    tabRegister!.click();

    expect(shadow.getElementById("register-form")!.style.display).toBe("block");
    expect(shadow.getElementById("login-form")!.style.display).toBe("none");
  });
});
