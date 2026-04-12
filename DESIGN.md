# DESIGN.md
# Design Specification: Native Web Component Architecture

## 1. Overview

This project is a strict, zero-dependency web application built on native web standards:
Web Components, Web Workers, WebGPU, and WASM. The architecture follows an
"External Template Pattern" to maximise IDE tooling, accessibility auditing, and separation
of concerns.

### Core Principles

- **No Runtime Libraries:** All UI logic is native Custom Elements.
- **Test-Driven Development (TDD):** Code is not committed unless tests pass.
- **Native Performance:** WebAssembly for logic and WebGPU for graphics, offloaded to Web Workers.
- **Stability for Automation:** DOM structures are preserved during updates to prevent LLM agent flaky-test loops.
- **Agent-Safe Contracts:** All lifecycle hooks, readiness signals, and test entry points are enforced conventions, not suggestions.

---

## 2. Technology Stack

| Category    | Technology                   | Purpose                                              |
| :---------- | :--------------------------- | :--------------------------------------------------- |
| Language    | TypeScript                   | Type safety and enhanced tooling.                    |
| Build       | Vite                         | Fast dev server, optimised production builds.        |
| Runtime     | Native Web Components        | Shadow DOM, Custom Elements v1.                      |
| Styling     | Constructable Stylesheets    | Performance and scoped CSS.                          |
| Logic       | WebAssembly (WASM)           | High-performance computation.                        |
| Parallelism | Web Workers                  | Non-blocking main thread execution.                  |
| Graphics    | WebGPU                       | High-performance rendering (if applicable).          |
| Linting     | ESLint + Prettier            | Code consistency.                                    |
| Testing     | Vitest                       | Component-level integration tests.                   |

---

## 3. Component Architecture

Every component strictly separates its definition (TS), template (HTML), and styles (CSS)
to ensure full IDE support (IntelliSense, Emmet, ARIA checking) alongside a clean TypeScript
contract.

### 3.1 File Structure

Every component resides in its own directory containing exactly three files:

```
src/components/
└── my-component/
    ├── my-component.ts    # Class definition & logic
    ├── my-component.html  # Template structure
    └── my-component.css   # Constructable styles
```

### 3.2 The Component Contract

Two patterns are **mandatory** to prevent LLM agent test loops:

1. **Non-Destructive Rendering** — the Shadow DOM is written exactly once; subsequent updates
   target specific nodes via `updateUI()`.
2. **Event Guard** — `attachEvents()` is protected by a boolean flag to prevent duplicate
   listeners on remount.

```typescript
// my-component.ts
import templateHtml from './my-component.html?raw';
import stylesheet from './my-component.css?inline';

export class MyComponent extends HTMLElement {
  public value: string = 'default';

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
    if (!this._eventsAttached) {
      this.attachEvents();
      this._eventsAttached = true;
    }
    this.dataset.ready = 'true'; // ← mandatory last line
  }

  disconnectedCallback() {
    this._eventsAttached = false; // Reset so the component is safe to remount
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      this.updateUI(); // Never call render() here
    }
  }

  private render() {
    if (!this.shadowRoot!.innerHTML) { // Write the DOM exactly once
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
    this.shadowRoot!.addEventListener('click', (e) => {
      // handle events
    });
  }
}
```

### 3.3 The `data-ready` Contract

Every component **must** set `this.dataset.ready = 'true'` as the final statement of its
initialisation path. This attribute is the only synchronisation primitive that agents and
tests should rely on.

- **Synchronous components:** set at the end of `connectedCallback`.
- **Async components (Worker / WASM):** set inside the resolved promise, after the worker
  confirms readiness.

```typescript
// Async component — data-ready is set only after the worker is ready
async connectedCallback() {
  this.render();
  if (!this._eventsAttached) {
    this.attachEvents();
    this._eventsAttached = true;
  }
  await this.initWorker(); // sets this.dataset.ready = 'true' internally when resolved
}

private async initWorker() {
  this._worker = new Worker(new URL('./my-component.worker.ts', import.meta.url), {
    type: 'module',
  });

  await new Promise<void>((resolve) => {
    this._worker!.addEventListener('message', (e) => {
      if (e.data.type === 'ready') resolve();
    }, { once: true });
  });

  this.dataset.ready = 'true'; // ← only set after worker confirms readiness
}
```

---

## 4. Theming Strategy

CSS variables are defined on `:root` (light) and `[data-theme="dark"]` (dark). Components
reference only these variables for all colour, spacing, and typography tokens, ensuring
instant theme switching with zero JavaScript in the render loop.

```css
/* global.css */
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

## 5. Asynchronous Architecture

The application uses a **Main Thread + Background Agents** model.

- **UI Agent (Main Thread):** Hosts Web Components, handles DOM and user input.
- **Compute Agent (Web Worker):** Loads WASM modules for heavy calculations. Posts messages
  back to the component via a typed `MessageChannel`.
- **Lifecycle Signalling:** Components must only set `this.dataset.ready = 'true'` after
  their worker or WASM module has confirmed readiness via a `{ type: 'ready' }` message.

Worker communication uses a typed message protocol:

```typescript
// UI → Worker
worker.postMessage({
  type: 'PROCESS_DATA',
  payload: new Float32Array([1, 2, 3, 4])
});

// Worker → UI
self.postMessage({
  type: 'DATA_PROCESSED',
  payload: resultBuffer,
  transferable: [resultBuffer.buffer] // Zero-copy transfer
});
```

---

## 6. Testing Strategy

### 6.1 Readiness Gate

Every test must wait for `[data-ready="true"]` before making any assertions on component
internals. This is the only permitted synchronisation primitive.

### 6.2 Shadow DOM Traversal

Always use the explicit pierce pattern. Do not invent alternative locator strategies.

```typescript
// ✅ Correct
const shadow = component.locator('my-component').locator('pierce/');
await shadow.getByText('Hello World').waitFor();

// ✅ Also correct — if the component IS the root mount point
await component.locator('pierce/#output').waitFor();

// ❌ Wrong — silently fails on Shadow DOM content
await component.getByText('Hello World').isVisible();
```

### 6.3 Test Script

Agents must always run `npm run test:agent`, not bare `npm test`.

```json
"scripts": {
  "test:agent": "vitest run --reporter=json --retry=0"
}
```

`--reporter=json` produces machine-readable output. `--retry=0` ensures each failure is a
clean, unambiguous signal rather than a masked flake.

---

## 7. Build Configuration

`vite.config.ts` handles raw asset imports and defines test globals. The `assetsInclude`
list must be kept in sync with any new static asset types imported by components.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.html', '**/*.wasm'],

  test: {
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
```

---

## 8. .gitignore Requirements

The following paths must be present in `.gitignore`. Without them, agents will attempt to
stage binary artifacts and trigger unnecessary commit failures.

```gitignore
# Build output
dist/

# Dependencies
node_modules/

# Test artifacts
test-results/
```
