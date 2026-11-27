# QA Handover — BUG-707 (Cancellation Report — order date/time format inconsistent)

**Date:** 2026-11-25 · **Risk:** LOW · **Sprint:** nov_cr_batch
**File:** `src/pages/reports-module/CancellationsMockup.jsx`

---

## 1. Verification Matrix

| Edit | File | Change | Self-Test |
|---|---|---|---|
| E1 | CancellationsMockup.jsx:760 | Order Date cell: `toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })` — BUG-707 | ✅ confirmed L760 |
| E2 | CancellationsMockup.jsx:987 | Same formatter applied to Detail screen Order Date — BUG-707 | ✅ confirmed L987 |

Both edits include a NaN guard: if the parsed date is invalid, falls back to the raw string (no crash).
Compile: webpack clean.

---

## 2. Browser Test Cases

**Requires:** Cancellation data in the selected date range. Use 7D or MTD on Palmhouse.

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Order Date column format (All Cancellations) | Cancellations → 7D → Apply → check Order Date column | Format: `"25 Nov, 01:30 pm"` NOT `"2026-11-25 13:30"` |
| T2 | Order Date matches Punch Time style | Same row → compare Order Date vs Punch Time columns | Both use same `DD MMM, HH:MM am/pm` style (consistent) |
| T3 | Detail screen Order Date | Click into a cancellation → Detail view | Same `DD MMM, HH:MM am/pm` format |
| T4 | Invalid date graceful fallback | (If raw string is ever malformed) | Displays raw string rather than crashing |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | Cancellations screen still loads | Display-only change, no data fetch touched |
| R2 | Sorting by Order Date still works (if implemented) | Format change is display only, underlying value unchanged |

---

## 4. Registry Sync Confirmation

Registry: BUG-707 → GATE_5A_IMPLEMENTED · Sprint: nov_cr_batch ✅

---

## 5. Credentials + Environment

| Account | Password | Use |
|---|---|---|
| owner@palmhouse.com | Qplazm@10 | Use 7D or MTD range to get cancellation data |
