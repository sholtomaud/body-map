# AGENTS.md
# System Agents & Workflow Automation

This document defines the "Agents" within this architecture: the autonomous background processes (Workers/WASM) and the automated tooling agents (CI/CD, Linters) that maintain the codebase quality.

---

## 1. Computational Agents (Runtime)

These are the background "brains" of the application that run outside the main UI thread to ensure 60fps performance.

### 1.1 The Logic Agent (Web Worker + WASM)
*   **Responsibility:** Pure business logic, state management, and data processing.
*   **Technology:** Rust/Go compiled to WASM, running inside a Web Worker.
*   **Capabilities:**
    *   Receives raw input data from UI Components.
    *   Processes data via WASM linear memory.
    *   Returns processed results via `postMessage` or `SharedArrayBuffer`.
*   **Constraint:** ZERO DOM access. It cannot touch `window` or `document`.

### 1.2 The Render Agent (WebGPU)
*   **Responsibility:** High-performance parallel rendering (if applicable).
*   **Technology:** Native WebGPU API.
*   **Workflow:**
    *   Receives compute buffers from the Logic Agent.
    *   Encodes render commands.
    *   Submits to GPU queue.
*   **Constraint:** Stateless regarding business logic. It only knows how to draw the data it receives.

### 1.3 The UI Agent (Main Thread)
*   **Responsibility:** Rendering Web Components and handling User Interaction.
*   **Technology:** Native Custom Elements.
*   **Workflow:**
    *   Listens for DOM events (click, input).
    *   Delegates tasks to Logic Agent.
    *   Updates Shadow DOM based on Logic Agent responses.

---

## 2. Automation Agents (DevOps & Tooling)

These agents enforce the "Microsoft-style" strict workflow and TDD requirements.

### 2.1 The Pre-Commit Agent (Husky + lint-staged)
*   **Trigger:** `git commit`.
*   **Role:** Gatekeeper.
*   **Workflow:**
    1.  Intercept commit.
    2.  Scan staged files (`*.ts`, `*.html`, `*.css`).
    3.  Run **The Linter Agent**.
    4.  Run **The Formatter Agent**.
    5.  Run **The Test Agent**.
    6.  **Result:** If exit code !== 0, abort commit.

### 2.3 The Build Agent (Vite)
*   **Trigger:** `npm run build`.
*   **Role:** Optimizer and Bundler.
*   **Tasks:**
    *   Inlines HTML/CSS imports into Component classes.
    *   Minifies WASM.
    *   Generates asset hashes for caching.
    *   Polfills Constructable Stylesheets for legacy browsers (if required).

---

## 3. Agent Communication Protocol

### 3.1 UI to Logic (Request)
```typescript
// UI Agent sends data
worker.postMessage({
  type: 'PROCESS_DATA',
  payload: new Float32Array([1, 2, 3, 4])
});
```

### 3.2 Logic to UI (Response)
```ts
// Logic Agent responds
self.postMessage({
  type: 'DATA_PROCESSED',
  payload: resultBuffer,
  transferable: [resultBuffer.buffer] // Zero-copy transfer
});
```

## 4. Development Workflow (TDD Loop)

2. Commit Blocked: The Pre-Commit Agent blocks the commit.
3. Green: Create the .ts, .html, and .css files. Implement the minimum code to pass the test.
4. Refactor: Optimize the WASM logic or CSS variables without breaking tests.
5. Pass: The Test Agent passes. The Pre-Commit Agent allows the commit.
