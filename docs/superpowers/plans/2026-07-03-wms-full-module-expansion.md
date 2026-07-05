# WMS Full-Module Prototype Expansion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the existing prototype so every PRD requirement group FR-001 through FR-028 has a discoverable, meaningful, interactive screen.

**Architecture:** Keep the existing workflow-specific canvases and add configuration-driven enterprise workspaces for cross-cutting modules. Shared state functions model the high-risk transitions that need deterministic validation; low-risk prototype actions use drawers, forms, confirmations, filters, and live feedback.

**Tech Stack:** Semantic HTML, responsive CSS, native ES modules, Node `node:test`, in-app browser verification.

---

### Task 1: Coverage and state transitions

- [ ] Add failing tests for count variance approval, return disposition, rule conflict detection, integration retry, and PDA offline recovery.
- [ ] Implement deterministic state transitions and rerun tests.

### Task 2: Navigation and business modules

- [ ] Add navigation entries for master data, replenishment, count, returns, rules, and task center.
- [ ] Implement tables, status filters, detail drawers, forms, and primary actions for each module.

### Task 3: Platform modules

- [ ] Add permissions/approval/audit, integration operations, print center, and PDA simulator.
- [ ] Model access scope, immutable audit details, retry state, reprint reason, and offline-safe scan recovery.

### Task 4: Verification

- [ ] Verify every FR identifier appears in the coverage matrix.
- [ ] Run state, integrity, syntax, and whitespace checks.
- [ ] Exercise one critical interaction in every added module and confirm zero browser console errors.
