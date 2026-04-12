# Design Specification: Native Web Component Architecture

## 1. Overview

This project is a strict, zero-dependency web application built on native Web Standards (Web
Components, Web Workers, WebGPU, WASM). The architecture follows a Microsoft-inspired
"External Template Pattern" to maximise IDE tooling, accessibility auditing, and separation of
concerns.

### Core Principles

- **No Runtime Libraries**: All UI logic is native Custom Elements.
- **Test-Driven Development (TDD)**: Code is not committed unless tests pass.
- **Native Performance**: Leveraging WebAssembly for logic and WebGPU for graphics, offloaded to Web Workers.
- **Stability for Automation**: DOM structures are preserved during updates to prevent Playwright/LLM-Agent "flaky test" loops.
- **Agent-Safe Contracts**: All lifecycle hooks, readiness signals, and test entry points are enforced conventions, not suggestions.

---

## 2. Technology Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| Language | TypeScript | Type safety and enhanced tooling. |
| Build | Vite | Fast dev server, optimised production builds, HTML/CSS imports. |
| Runtime | Native Web Components | Shadow DOM, Custom Elements v1. |
| Styling | Constructable Stylesheets | Performance and scoped CSS. |
| Logic | WebAssembly (WASM) | High-performance computation. |
| Parallelism | Web Workers | Non-blocking main thread execution. |
| Graphics | WebGPU | High-performance rendering (if applicable). |
| Linting | ESLint + Prettier | Code consistency. |
| Testing | Playwright CT (Vite) | Component-level integration tests. |
| Git Hooks | husky + lint-staged | Pre-commit quality gates. |

---

## 3. Component Architecture (The "Microsoft" Pattern)

To ensure full IDE support (IntelliSense, Emmet, ARIA checking) while maintaining a clean
TypeScript contract, we strictly separate the Definition (TS), Template (HTML), and Styles (CSS).

### 3.1 File Structure

Every component resides in its own directory containing three files:

```
src/components/
└── my-component/
    ├── my-component.ts    # Class Definition & Logic
    ├── my-component.html  # Template Structure
    └── my-component.css   # Constructable Styles
```

### 3.2 The Component Contract (TS)

The TypeScript file defines the API and imports static assets. Two patterns are **mandatory** to
prevent LLM Agent test loops:

1. **Non-Destructive Rendering** — the Shadow DOM is only written once; subsequent updates
   target specific nodes via `updateUI()`.
2. **Event-Guard** — `attachEvents()` is protected by a boolean flag to prevent duplicate
   listeners on remount (which Playwright Component Testing triggers on every `mount()` call).

```typescript
// my-component.ts
import templateHtml from './my-component.html?raw';
import stylesheet from './my-component.css?inline';

export class MyComponent extends HTMLElement {
  public value: string = 'default';

  // ─── Guard against duplicate event listeners on remount ───────────────────
  private _eventsAttached = false;

  public static get observedAttributes(): string[] {
    return ['value'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();

    // Guard is mandatory — Playwright CT calls connectedCallback on every mount()
    if (!this._eventsAttached) {
      this.attachEvents();
      this._eventsAttached = true;
    }
  }

  disconnectedCallback() {
    // Reset guard so the component is safe to remount (e.g. in test teardown)
    this._eventsAttached = false;
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      // Target specific elements — never call render() here
      this.updateUI();
    }
  }

  private render() {
    // ── Non-Destructive: write the DOM exactly once ────────────────────────
    // Prevents Playwright from losing stale element handles between assertions
    if (!this.shadowRoot!.innerHTML) {
      this.shadowRoot!.innerHTML = templateHtml;
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(stylesheet);
      this.shadowRoot!.adoptedStyleSheets = [sheet];
    }
    this.updateUI();
  }

  private updateUI() {
    const output = this.shadowRoot!.querySelector('#output');
    if (output) output.textContent = this.value;
  }

  private attachEvents() {
    // Event delegation — use this.shadowRoot as the single delegation root
    this.shadowRoot!.addEventListener('click', (e) => {
      // handle events
    });
  }
}
```

### 3.3 The `data-ready` Contract (Mandatory)

Every component **must** set `this.dataset.ready = 'true'` as the final statement of its
initialisation path. For synchronous components this happens at the end of `connectedCallback`.
For components that initialise a Worker or WASM module, it happens inside the resolved promise.

This attribute is the **only** synchronisation primitive that Playwright tests and LLM Agents
should rely on. Tests must not assert on component internals until this attribute is present.

```typescript
// Synchronous component — set at end of connectedCallback
connectedCallback() {
  this.render();
  if (!this._eventsAttached) {
    this.attachEvents();
    this._eventsAttached = true;
  }
  this.dataset.ready = 'true'; // ← mandatory last line
}

// Async component (Worker / WASM) — set inside resolved promise
async connectedCallback() {
  this.render();
  if (!this._eventsAttached) {
    this.attachEvents();
    this._eventsAttached = true;
  }
  await this.initWorker(); // sets this.dataset.ready = 'true' internally when resolved
}
```

---

## 4. Theming Strategy

CSS Variables are defined on `:root` (light) and `[data-theme="dark"]` (dark). Components
reference only these variables for all colour, spacing, and typography tokens. This ensures
instant theme switching with zero JavaScript in the render loop.

```css
/* global tokens — global.css */
:root {
  --color-surface: #ffffff;
  --color-text: #111111;
  --color-accent: #0066cc;
}

[data-theme="dark"] {
  --color-surface: #1a1a1a;
  --color-text: #f0f0f0;
  --color-accent: #4da6ff;
}
```

---

## 5. Asynchronous Architecture (Agents & Workers)

The application uses a **Main Thread + Background Agents** model.

- **UI Agent (Main Thread):** Hosts Web Components, handles DOM and user input.
- **Compute Agent (Web Worker):** Loads WASM modules for heavy calculations. Posts messages back to the component via a typed `MessageChannel`.
- **Lifecycle Signalling:** Components must only set `this.dataset.ready = 'true'` _after_ their Worker or WASM module has confirmed readiness via a `{ type: 'ready' }` message. This prevents Playwright from asserting on uninitialised state.

```typescript
private async initWorker() {
  this._worker = new Worker(new URL('./my-component.worker.ts', import.meta.url), {
    type: 'module',
  });

  await new Promise<void>((resolve) => {
    this._worker!.addEventListener('message', (e) => {
      if (e.data.type === 'ready') resolve();
    }, { once: true });
  });

  this.dataset.ready = 'true'; // ← only set after Worker confirms readiness
}
```

---

## 6. TDD Workflow & Quality Gates

### 6.1 Testing Strategy

Use Playwright Component Testing (`@playwright/experimental-ct-vite`).

**Shadow DOM Traversal — Mandatory Pattern**

Playwright's `getByText()` and `getByRole()` do **not** pierce Shadow DOM by default. Always use
the explicit locator pattern below. Agents must not invent alternative locator strategies.

```typescript
// ✅ CORRECT — explicit shadow root traversal
const shadow = component.locator('my-component').locator('pierce/');
await shadow.getByText('Hello World').waitFor();

// ✅ ALSO CORRECT — if the component IS the root mount point
await component.locator('pierce/#output').waitFor();

// ❌ WRONG — will silently fail on Shadow DOM content
await component.getByText('Hello World').isVisible();
```

**Mandatory synchronisation gate for every test**

Every test must wait for `data-ready="true"` before performing any assertions. This is a
non-negotiable contract between the component and the test suite.

```typescript
import { test, expect } from '@playwright/experimental-ct-vite';
import { MyComponent } from './my-component';

test('should render value correctly', async ({ mount }) => {
  const component = await mount(MyComponent, { props: { value: 'Hello World' } });

  // ── Mandatory sync gate ──────────────────────────────────────────────────
  // Never assert before data-ready="true". This is what prevents agent loops.
  await component.locator('[data-ready="true"]').waitFor({ timeout: 5_000 });

  // ── Assertions (always pierce Shadow DOM) ────────────────────────────────
  await expect(component.locator('pierce/#output')).toHaveText('Hello World');
});
```

### 6.2 Playwright Configuration

`playwright.config.ts` enforces agent-safe defaults. The three settings that matter most for
preventing agent loops are `retries: 0`, `timeout`, and `reporter`.

- **`retries: 0`** converts ambiguous flakiness into a clean pass/fail signal. Without this,
  Playwright retries failed tests and agents interpret each retry as new feedback, triggering
  another code iteration.
- **`timeout: 10_000`** hard-caps each test. Hanging tests (e.g. an unresolved Worker promise)
  will never resolve on their own; this ensures the agent receives a failure signal quickly.
- **JSON reporter in CI/agent runs** gives agents a machine-readable result they can parse
  deterministically, rather than an HTML report they cannot open.

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/experimental-ct-vite';

const isAgentRun = process.env.AGENT_RUN === 'true' || process.env.CI === 'true';

export default defineConfig({
  retries: 0,        // Fail fast — no ambiguous retries for agents to misinterpret
  timeout: 10_000,   // Hard ceiling per test; prevents hangs from blocking the agent
  workers: 1,        // Serial execution in CI avoids race conditions agents misread as logic bugs

  reporter: isAgentRun
    ? [['json', { outputFile: 'test-results/results.json' }]]
    : [['html', { open: 'never' }], ['list']],

  use: {
    ctViteConfig: {
      // Inherits from vite.config.ts
    },
  },
});
```

### 6.3 Pre-commit Hooks & Agent Loops

Using **husky** and **lint-staged**.

To prevent LLM Agents from getting stuck in _Test-Fail-Retry_ loops:

- **Environment Detection:** Pre-commit hooks skip long-running E2E tests when `CI=true` or
  `AGENT_RUN=true`.
- **No-Verify:** Automated agents should use `git commit --no-verify` only when the pipeline
  has already validated the environment. Never use it to bypass a failing test.
- **Agent Test Script:** Agents must always run `test:agent`, never the bare `test` script.
  This is enforced by naming convention and must be documented in any agent configuration file
  (e.g. `jules.config.json`, `.agentrc`, or equivalent).

### 6.4 NPM Scripts Contract

The following script names are **fixed conventions**. Do not rename them; agent tooling depends
on them by name.

```jsonc
// package.json
{
  "scripts": {
    // Human development — opens HTML reporter, allows retries
    "test": "playwright test",

    // ── Agent/CI entrypoint — ALWAYS use this in automated runs ──────────
    // Sets AGENT_RUN=true, forces JSON reporter, retries=0, timeout=10s
    "test:agent": "AGENT_RUN=true playwright test --reporter=json --retries=0 --timeout=10000",

    // Unit tests only — safe for pre-commit hooks
    "test:unit": "vitest run",

    // Lint (run by lint-staged)
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src"
  }
}
```

---

## 7. Build Configuration (Vite)

`vite.config.ts` handles raw asset imports and defines test globals. The `assetsInclude` list
must be kept in sync with any new static asset types imported by components.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  // Allow ?raw and ?inline imports for HTML/CSS component templates
  assetsInclude: ['**/*.html', '**/*.wasm'],

  test: {
    globals: true,
    environment: 'happy-dom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/playwright/**'],
  },
});
```

---

## 8. .gitignore Requirements

The following paths **must** be in `.gitignore`. LLM Agents will attempt to stage binary test
artifacts if they are not explicitly excluded. This causes commit failures that trigger
unnecessary retry loops.

```gitignore
# Playwright artifacts — never commit these
test-results/
playwright-report/
/playwright/.cache/

# Build output
dist/

# Dependencies
node_modules/
```

---

## 9. Agent Configuration Reference

When configuring a Jules, Copilot Workspace, Devin, or similar LLM Agent to work on this
repository, the following settings must be applied.

| Setting | Required Value | Reason |
| :--- | :--- | :--- |
| Test command | `npm run test:agent` | Forces JSON reporter and `retries=0` |
| Commit command | `git commit -m "..."` | Do NOT use `--no-verify` unless pipeline already passed |
| Environment variable | `AGENT_RUN=true` | Activates fast-exit paths in hooks and config |
| Max test retries | `0` | Agents must not retry; each failure is a clean signal |
| Timeout per test | `10 000 ms` | Prevents hangs from blocking the agent indefinitely |
| Readiness assertion | `[data-ready="true"]` | Must appear as first `waitFor` in every test |

### Agent Loop Escape Hatch

If an agent is stuck in a _Test-Fail-Retry_ loop and cannot make progress, the correct
escalation path is:

1. Check that `npm run test:agent` is being used (not bare `test`).
2. Verify `data-ready="true"` is awaited before all assertions.
3. Verify Shadow DOM is being pierced with `pierce/` in locators.
4. If all three are correct and tests still fail, the failure is a genuine regression —
   do not attempt further retries; report the failure to a human reviewer.

---

## 10. Quick-Reference Checklist

Use this checklist before opening a PR. Agents may use it as a structured pass/fail gate.

- [ ] Each component has exactly three files: `.ts`, `.html`, `.css`
- [ ] `render()` is guarded by `if (!this.shadowRoot!.innerHTML)` — never re-renders the full DOM
- [ ] `attachEvents()` is guarded by `this._eventsAttached` boolean
- [ ] `disconnectedCallback()` resets `this._eventsAttached = false`
- [ ] `this.dataset.ready = 'true'` is set as the final step of initialisation
- [ ] All Playwright tests `waitFor('[data-ready="true"]')` before asserting
- [ ] All Playwright locators use `pierce/` for Shadow DOM content
- [ ] `playwright.config.ts` has `retries: 0` and `timeout: 10_000`
- [ ] `test-results/` and `playwright-report/` are in `.gitignore`
- [ ] CI/agent runs invoke `npm run test:agent`, not `npm test`
