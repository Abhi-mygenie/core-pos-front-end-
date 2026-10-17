# BUG-477 — Incorrect System Time Causes Outlet to Appear Closed — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P1 — HIGH** — outlet closed = orders cannot be placed |
| Risk | HIGH — affects order taking |
| Area | Operating Hours / Environment / FE or Backend |
| Duplicate check | DISTINCT |
| Code reality | POSSIBLE FE — if operating hours check uses device clock |
| Fast Lane | NO |

---

## Description

When the **device/system clock is incorrect**, the outlet appears as **closed** in the POS even though it is within operating hours. This prevents order placement.

---

## Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED |
| Screenshot | Not provided |
| Steps to reproduce | OWNER WILL PROVIDE LATER |
| Confidence | REPORTED |

---

## Blast Radius

- FE: MEDIUM — if operating hours comparison uses `new Date()` (device clock)
- Backend: MEDIUM — if server validates operating hours and clock skew exists
- Scope: SMALL (environment-specific)

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-477-01: Does the issue resolve when device clock is corrected?
- OD-477-02: Is the “closed” message shown on the POS frontend or on customer-facing side?
- OD-477-03: How far off was the system time (minutes or hours)?

---

## Next Step

Check FE code: does `StatusConfigPage` or `LoadingPage` compare operating hours against `new Date()` (device time) or against a server-provided timestamp? If device clock — FE should use server time instead.
