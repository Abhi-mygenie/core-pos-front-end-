# BUG-668 — UPI ID Update Not Reflecting Until Printer Agent Refresh

**Registered:** 2026-11-12
**Type:** BUG
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

When the UPI ID is updated in the POS settings, the change is not reflected in the printer agent (and presumably on printed bills) until the printer agent is manually refreshed/restarted.

**Current behaviour:** UPI ID change is saved in settings, but the printer agent continues using the old UPI ID until it is manually refreshed. This causes incorrect UPI IDs on printed bills.

**Expected behaviour:** UPI ID change should propagate to the printer agent immediately (or the printer agent should fetch the latest settings on each print job) without requiring a manual refresh.

---

## 2. Classification

- **Type:** BUG
- **Severity:** P1 — High (wrong UPI ID on bills causes payment failures; requires manual intervention)
- **Risk:** HIGH — printer agent communication, settings propagation, affects billing
- **Area:** Printing / Printer Agent
- **Fast Lane:** NOT eligible (printer agent integration, settings propagation)

---

## 3. Duplicate Check

- **Result: DISTINCT** — no prior registration for UPI ID propagation to printer agent

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

## 5. Root Cause (preliminary)

Likely one of:
- Printer agent caches restaurant settings on startup, doesn't re-fetch on setting change
- POS doesn't push a "settings updated" notification to the printer agent
- Settings change API doesn't trigger printer agent profile refresh

---

## 6. Blast Radius

- Settings update flow — may need to notify printer agent after UPI ID change
- Printer Agent integration (separate service — may be a Printer Agent bug not FE)
- **Estimated scope:** SMALL-MEDIUM (1–2 files, possibly Printer Agent team responsibility)

---

## 7. Code Reality

- **Status:** NONE — no settings-change notification to printer agent

---

## 8. Open Questions

- OQ-668-01: Is this a FE issue (not pushing update), a Printer Agent issue (not fetching on change), or backend (not broadcasting)?
- Investigation needed before planning

---

## 9. Related

- CR-500 (iPhone WiFi Printing — GATE_1_INTAKE, Printer Agent team)
- CR-501 (Running Order KOT on Update — GATE_1_INTAKE, Printer Agent team)
