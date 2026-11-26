# CR-439 — Default Screen Selection for User

**Registered:** 2026-10-18
**Type:** CR
**Priority:** P2
**Risk:** LOW
**Area:** Auth / Settings / Navigation
**Sprint:** backlog
**Status:** GATE_1_INTAKE

---

## Description

Each user (employee) should be able to select their default/home screen — the screen they land on after login and when they press the home button. Different roles have different primary screens (e.g. cashier → Dashboard, manager → Reports, kitchen staff → KDS).

---

## Duplicate Check

**DISTINCT** — no prior CR for per-user default screen selection.

---

## Open Decisions

- **OD-439-01:** Is the default screen preference stored per-employee on the backend (persists across devices) or FE-only (localStorage per device)?
- **OD-439-02:** Which screens are eligible as default options? (Dashboard, Reports, Order Entry, KDS, PMS, etc.)
- **OD-439-03:** Where is the preference set — in User Profile settings, or in a first-time setup wizard?
- **OD-439-04:** Does the backend already return a `default_screen` field on the employee profile?

---

## Blast Radius (estimate)

- `src/api/transforms/authTransform.js` — map `default_screen` field
- `src/pages/LoadingPage.jsx` (R5) — redirect to default screen after boot
- Settings/Profile page — UI to set preference
- Estimated scope: MEDIUM (2–3 files, 1 R5)

---

## Gate Status

- Gate 1: COMPLETE (this document)
- Gate 2: Blocked on OD-439-01 + OD-439-04 (backend field availability)
