# BUG-594 — Kitchen View Enable/Disable Toggle Not Showing in Settings

**Registered:** 2026-10-18
**Type:** BUG
**Priority:** P2
**Risk:** LOW
**Area:** Dashboard / Settings / localStorage
**Sprint:** backlog
**Status:** GATE_1_INTAKE

---

## Description

When navigating to settings to enable or disable the Kitchen View (KDS view on the dashboard), the toggle option is not visible. The setting exists in localStorage but the UI does not surface the toggle correctly. Suspected cause: a localStorage key conflict or a conditional rendering gate that hides the toggle based on a stale/incorrect cached value.

---

## Duplicate Check

**DISTINCT** — no prior BUG for kitchen view toggle visibility.

---

## Evidence

- Source: OWNER-REPORTED
- Confidence: REPORTED — exact screen where toggle should appear TBC

---

## Suspected Root Cause

- A localStorage read for the kitchen view key may be returning a value that hides the toggle UI
- Or the toggle is conditional on a restaurant settings flag that is false

---

## Open Decisions

- **OD-594-01:** Which page/screen should the kitchen view toggle appear on? (StatusConfigPage / Settings drawer / Dashboard header)
- **OD-594-02:** What is the localStorage key name for the kitchen view setting?

---

## Blast Radius

- `src/pages/StatusConfigPage.jsx` — most likely location for the toggle
- `src/pages/DashboardPage.jsx` (R5) — possible read site
- Estimated scope: SMALL (1–2 files)

---

## Gate Status

- Gate 1: COMPLETE (this document)
- Gate 2: Needs code trace of kitchen view localStorage key and toggle render condition
