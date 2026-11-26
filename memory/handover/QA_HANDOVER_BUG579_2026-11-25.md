# QA Handover — BUG-579 (Cancellation summary ₹ values not displaying)

**Date:** 2026-11-25 · **Risk:** MEDIUM · **Sprint:** nov_cr_batch
**File:** `src/pages/reports-module/CancellationsMockup.jsx`

---

## 1. Verification Matrix

| Edit | File | Change | Self-Test |
|---|---|---|---|
| E1 | CancellationsMockup.jsx:326 | `order_cancel_count \|\| order_cancels \|\| 0` — dual-key fallback for daily chart | ✅ code grep confirmed |
| E2 | CancellationsMockup.jsx:327 | `item_cancel_count \|\| item_cancels \|\| 0` — dual-key fallback | ✅ code grep confirmed |
| E3 | CancellationsMockup.jsx:333 | `st.name === 'Before Cooking' \|\| st.name === 'Before Serving'` — both stage name variants matched | ✅ code grep confirmed |

Compile: webpack clean (1 pre-existing warning, unrelated).

---

## 2. Browser Test Cases

**Requires:** A date range with cancellation data on Palmhouse. Use 7D or MTD preset.

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Daily trend chart bars show | Cancellations → 7D → Apply | Bars visible in the daily trend chart for days with cancellations (not all zero/blank) |
| T2 | Stage summary ₹ values | Same view → scroll to Stage breakdown | "Before Cooking" or "Before Serving" stage rows show ₹ order_loss + item_loss values (not "₹0" or "—") |
| T3 | Before Serving stage matched | Restaurant that uses "Before Serving" stage name | Stage row appears correctly (not missing) |
| T4 | Summary totals non-zero | Day with cancellations → check overall summary | Total ₹ loss shown in summary cards |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | Cancellation count totals still correct | Dual-key fallback must not double-count |
| R2 | Daily trend chart doesn't crash on 0-cancel days | `\|\| 0` guard handles missing keys |

---

## 4. Registry Sync Confirmation

Registry: BUG-579 → GATE_5A_IMPLEMENTED · Sprint: nov_cr_batch ✅
EXIT GATE: Code markers confirmed at L326/327/333.

---

## 5. Credentials + Environment

| Account | Password | Use |
|---|---|---|
| owner@palmhouse.com | Qplazm@10 | Cancellations with 7D/MTD range |

**Note:** Palmhouse today (11/25) has no cancellations. Use 7D or MTD range to get data.
Backend gap (known): cancel_type=Order may overwrite item stage for 39+18 items — this is a backend limitation, not a FE bug. FE fix only addresses the key mismatch.
