DESIGN.md
Design Specification: Native Web Component Architecture

## 1. Overview
This project is a strict, zero-dependency web application built on native Web Standards (Web Components, Web Workers, WebGPU, WASM). The architecture follows a Microsoft-inspired "External Template Pattern" to maximize IDE tooling, accessibility auditing, and separation of concerns.

#### Core Principles
- No Runtime Libraries: All UI logic is native Custom Elements.
- Test-Driven Development (TDD): Code is not committed unless tests pass (pre-commit).
- Native Performance: Leveraging WebAssembly for logic and WebGPU for graphics, offloaded to Web Workers.
- Modern Tooling: TypeScript, Vite, and Playwright for build and validation.

## 2. Technology Stack
Category	Technology	Purpose
Language	TypeScript	Type safety and enhanced tooling.
Build	Vite	Fast dev server, optimized production builds, HTML/CSS imports.
Runtime	Native Web Components	Shadow DOM, Custom Elements v1.
Styling	Constructable Stylesheets	Performance and Scoped CSS.
Logic	WebAssembly (WASM)	High-performance computation.
Parallelism	Web Workers	Non-blocking main thread execution.
Graphics	WebGPU	High-performance rendering (if applicable).
Testing	@playwright/test	E2E and Component testing (UI Mode).
Linting	ESLint + Prettier	Code consistency.

## 3. Component Architecture (The "Microsoft" Pattern)
To ensure full IDE support (IntelliSense, Emmet, ARIA checking) while maintaining a clean TypeScript contract, we strictly separate the Definition (TS), Template (HTML), and Styles (CSS).

### 3.1 File Structure
Every component resides in its own directory containing three files:

```
src/components/
└── my-component/
├── my-component.ts # Class Definition & Logic
├── my-component.html # Template Structure
└── my-component.css # Constructable
```

### 3.2 The Component Contract (TS)
The TypeScript file defines the API (Properties, Attributes, Events) and imports the static assets.

```typescript
// my-component.ts
import templateHtml from './my-component.html?raw'; // Vite import
import stylesheet from './my-component.css?inline'; // Vite import

export class MyComponent extends HTMLElement {
  // 1. Reactive Properties
  public value: string = 'default';

  // 2. Observed Attributes (mapping props to HTML attributes)
  public static get observedAttributes(): string[] {
    return ['value'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.attachEvents();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      this.render(); // Re-render on attribute change
    }
  }

  private render() {
    // Inject HTML
    this.shadowRoot!.innerHTML = templateHtml;
    
    // Inject CSS as Constructable Stylesheet
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(stylesheet);
    this.shadowRoot!.adoptedStyleSheets = [sheet];
    
    // Post-render logic (binding data to DOM)
    const slot = this.shadowRoot!.querySelector('#output');
    if (slot) slot.textContent = this.value;
  }

  private attachEvents() {
    // Event delegation logic here
  }
}
```

### 3.3 The Template (HTML)
Kept separate for maximum IDE tooling support.

```html
<!-- my-component.html -->
<div class="container">
  <h1 class="title">Component Title</h1>
  <p id="output"></p>
  <button type="button">Action</button>
</div>
```

### 3.4 The Styles (CSS)

Scoped to the Shadow DOM.

```css
/* my-component.css */
:host {
  display: block;
  container-type: inline-size;
}

.container {
  padding: 1rem;
  border: 1px solid #ccc;
}

.title {
  color: var(--primary-color, blue);
}
```

## 4. Theming Strategy (Light & Dark Mode)
We use CSS Variables defined on the :root and [data-theme="dark"] selectors. Components use these variables for colors, ensuring instant theme switching without JavaScript overhead in the render loop.

Global Styles (src/styles/theme.css):

```css
:root {
  --bg-color: #ffffff;
  --text-color: #333333;
  --accent-color: #0078d4;
}

[data-theme="dark"] {
  --bg-color: #1e1e1e;
  --text-color: #f0f0f0;
  --accent-color: #4cc2ff;
}
```

## 5. Asynchronous Architecture (Agents & Workers)
The application utilizes a "Main Thread + Background Agents" model.

UI Agent (Main Thread): Hosts Web Components. Handles DOM manipulation, input events, and painting.
Compute Agent (Web Worker): Loads WASM modules. Handles heavy calculations, data transformation, and business logic.
GPU Agent (WebGPU): If rendering graphics, a dedicated context manages the command buffers.
Communication:

Strict usage of postMessage with structured cloning algorithms.
SharedArrayBuffer used for high-frequency data sharing between WASM and the GPU (if cross-origin isolated).

## 6. TDD Workflow & Quality Gates
We use Playwright as the single source of truth for testing.

### 6.1 Pre-commit Hook
Using husky and lint-staged, the following pipeline runs before every commit:

Lint: eslint .
Format Check: prettier --check .
Test: npm run test (Runs Playwright tests)
Type Check: tsc --noEmit
If any step fails, the commit is rejected.

### 6.2 Testing Strategy
Component Testing: Using Playwright's Component Testing (via @playwright/experimental-ct-vite) to mount Shadow DOM components and verify rendering and accessibility.
E2E Testing: Validating full user flows.
Example Test (my-component.spec.ts):

```ts
import { test, expect } from '@playwright/experimental-ct-vite';
import { MyComponent } from './my-component';

test('should render value correctly', async ({ mount }) => {
  const component = await mount(MyComponent, { value: 'Hello World' });
  await expect(component.getByText('Hello World')).toBeVisible();
});
```

## 7. Build Configuration (Vite)
vite.config.ts must be configured to handle raw asset imports for the External Template Pattern

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.html', '**/*.wasm'],
  test: {
    globals: true,
    setupFiles: './tests/setup.ts',
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  }
});
```
