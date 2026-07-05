# WMS High-Fidelity Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a professional, responsive WMS prototype demonstrating outbound fulfillment and a linked digital-twin warehouse canvas.

**Architecture:** A dependency-free static application separates demo data, pure state transitions, UI rendering, and visual styles. Node's built-in test runner verifies business state changes; browser verification covers rendered behavior and accessibility.

**Tech Stack:** Semantic HTML5, CSS custom properties/SVG, ES modules, Node `node:test`, Python static server.

---

### Task 1: Define deterministic business state

**Files:**
- Create: `prototype/data.js`
- Create: `prototype/state.js`
- Test: `prototype/tests/state.test.mjs`

- [ ] Write tests asserting allocation requires selection, wave release creates tasks, short-pick resolution requires a reason, and shipment confirmation is idempotent.
- [ ] Run `node --test prototype/tests/state.test.mjs`; expect failure because modules do not exist.
- [ ] Implement `createInitialState`, `allocateOrders`, `releaseWave`, `resolveShortPick`, and `confirmShipment` as pure or deterministic transitions.
- [ ] Run the same test command; expect all tests to pass.

### Task 2: Build the application shell and dashboard

**Files:**
- Create: `prototype/index.html`
- Create: `prototype/styles.css`
- Create: `prototype/app.js`

- [ ] Add a static integrity test that requires the skip link, semantic navigation, main landmark, live region, dialog, viewport metadata, and all seven view identifiers.
- [ ] Run `node --test prototype/tests`; expect the integrity test to fail before the markup exists.
- [ ] Implement the sidebar, context bar, dashboard KPIs, SVG trend chart, workload panel, exception list, interface health, toast region, and detail drawer.
- [ ] Add responsive rules for 1440px, 1024px, and below 760px, plus reduced-motion behavior.
- [ ] Run tests and `node --check prototype/app.js`; expect success.

### Task 3: Implement outbound workflow interactions

**Files:**
- Modify: `prototype/app.js`
- Modify: `prototype/styles.css`
- Test: `prototype/tests/state.test.mjs`

- [ ] Add interaction assertions for the state changes used by allocation, wave release, short-pick recovery, weight validation, and shipment idempotency.
- [ ] Run tests and verify new assertions fail before implementations are extended.
- [ ] Render searchable/selectable orders, wave candidates, picking tasks, short-pick form, package verification, and shipment status from shared state.
- [ ] Implement event delegation, loading feedback, field errors, confirmation dialog, Escape close, focus return, and range announcements.
- [ ] Run tests and syntax checks; expect success.

### Task 4: Implement the linked digital twin

**Files:**
- Modify: `prototype/app.js`
- Modify: `prototype/styles.css`
- Test: `prototype/tests/state.test.mjs`

- [ ] Add state assertions proving short-pick recovery and wave release alter twin alert/task summaries.
- [ ] Run tests and verify the assertions fail first.
- [ ] Render zones, heat levels, workers, forklifts, AGVs, animated task routes, legend, layer filters, and zone detail drawer.
- [ ] Link the twin to workflow state and implement “locate exception”.
- [ ] Run all tests and syntax checks; expect success.

### Task 5: Verify and hand off

**Files:**
- Create: `prototype/VERIFICATION.md`

- [ ] Start `python -m http.server 4173 --directory prototype`.
- [ ] Open the prototype in the in-app browser and exercise allocation, wave release, short-pick recovery, shipment, twin filters, drawer close, and unsupported navigation.
- [ ] Verify desktop and narrow viewports, keyboard focus, live feedback, and no console errors.
- [ ] Run `node --test prototype/tests`, `node --check prototype/app.js`, and `git diff --check`; record exact results in `prototype/VERIFICATION.md`.
