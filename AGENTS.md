# AGENTS.md
# System Agents & Workflow Automation

This document defines the agents within this architecture: the autonomous runtime agents
(Workers/WASM) and the rules that automated tooling agents (Jules, Copilot Workspace, Devin,
etc.) must follow to maintain codebase quality.

---

## 1. Computational Agents (Runtime)

These are the background processes of the application that run outside the main UI thread to
ensure 60fps performance.

### 1.1 The Logic Agent (Web Worker + WASM)

- **Responsibility:** Pure business logic, state management, and data processing.
- **Technology:** Rust/Go compiled to WASM, running inside a Web Worker.
- **Capabilities:**
  - Receives raw input data from UI Components.
  - Processes data via WASM linear memory.
  - Returns processed results via `postMessage` or `SharedArrayBuffer`.
- **Constraint:** ZERO DOM access. It cannot touch `window` or `document`.

### 1.2 The Render Agent (WebGPU)

- **Responsibility:** High-performance parallel rendering (if applicable).
- **Technology:** Native WebGPU API.
- **Workflow:**
  - Receives compute buffers from the Logic Agent.
  - Encodes render commands.
  - Submits to GPU queue.
- **Constraint:** Stateless regarding business logic. It only knows how to draw the data it receives.

### 1.3 The UI Agent (Main Thread)

- **Responsibility:** Rendering Web Components and handling user interaction.
- **Technology:** Native Custom Elements.
- **Workflow:**
  - Listens for DOM events (`click`, `input`).
  - Delegates tasks to Logic Agent.
  - Updates Shadow DOM based on Logic Agent responses.

---

## 2. Agent Communication Protocol

### 2.1 UI to Logic (Request)

```typescript
worker.postMessage({
  type: 'PROCESS_DATA',
  payload: new Float32Array([1, 2, 3, 4])
});
```

### 2.2 Logic to UI (Response)

```typescript
self.postMessage({
  type: 'DATA_PROCESSED',
  payload: resultBuffer,
  transferable: [resultBuffer.buffer] // Zero-copy transfer
});
```

---

## 3. Development Workflow (TDD Loop)

1. **Red:** Write a failing test for the component or behaviour.
2. **Green:** Create the `.ts`, `.html`, and `.css` files. Implement the minimum code to pass the test.
3. **Refactor:** Optimise the WASM logic or CSS variables without breaking tests.
4. **Pass:** All checks pass. Commit.

---

## 4. LLM Agent Rules

These rules apply to Jules, Copilot Workspace, Devin, and any other automated agent working
on this repository.

### 4.1 Pre-Commit Checklist

There are no git hooks. Before every commit, the agent must run these steps in order:

```sh
npm run lint
npm run format
npm run test:agent
```

If any step exits non-zero, fix the cause before committing. Do not use `git commit --no-verify`
except in the bootstrap case described below.

### 4.2 Bootstrap Exception (First Commit Only)

When `package.json` does not yet exist, the pre-commit checklist cannot run because the
toolchain has not been installed. For the **first commit only**:

1. Create all scaffold files (`package.json`, `vite.config.ts`, etc.).
2. Run `npm install` to install dependencies.
3. Commit with `git commit --no-verify -m "chore: bootstrap scaffold"`.
4. All subsequent commits must pass the pre-commit checklist normally.

### 4.3 Test Command

Always use `npm run test:agent`, never bare `npm test`. The `test:agent` script runs with
`--reporter=json` and `--retry=0` so that each failure is a clean, unambiguous signal.

```json
"scripts": {
  "test:agent": "vitest run --reporter=json --retry=0"
}
```

### 4.4 Readiness Assertion

Every test must `waitFor('[data-ready="true"]')` before making any assertions on component
internals. This is the only synchronisation primitive agents should rely on.

### 4.5 Shadow DOM Traversal

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

### 4.6 Loop Escape Hatch

If the agent cannot make forward progress after three attempts on the same failure:

1. Verify `npm run test:agent` is being used (not bare `test`).
2. Verify `[data-ready="true"]` is awaited before all assertions.
3. Verify Shadow DOM is being pierced with `pierce/` in locators.

If all three are correct and tests still fail, the failure is a genuine regression. Stop
retrying and report the failure for human review.

---

## 5. Quick-Reference Checklist

Use this before opening a PR. Agents may use it as a structured pass/fail gate.

- [ ] Each component has exactly three files: `.ts`, `.html`, `.css`
- [ ] `render()` is guarded by `if (!this.shadowRoot!.innerHTML)` — never re-renders the full DOM
- [ ] `attachEvents()` is guarded by `this._eventsAttached` boolean
- [ ] `disconnectedCallback()` resets `this._eventsAttached = false`
- [ ] `this.dataset.ready = 'true'` is set as the final step of initialisation
- [ ] All tests `waitFor('[data-ready="true"]')` before asserting
- [ ] `test-results/` and `dist/` and `node_modules/` are in `.gitignore`
- [ ] CI/agent runs invoke `npm run test:agent`, not `npm test`
