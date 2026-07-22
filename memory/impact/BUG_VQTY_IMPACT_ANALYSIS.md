# BUG-VQTY — Gate 2: Impact Analysis

**ID:** BUG-VQTY
**Gate:** 2 — Impact Analysis
**Date:** 2026-07-07
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7)
**Investigation report:** `/app/memory/evidence/BUG-VQTY/INVESTIGATION_REPORT_BUG_VQTY.md`
**Risk:** MEDIUM — financial billing field in hotspot file
**Priority:** P0
**Fast Lane:** NO

---

## Step 0 — Code Reality Check

```bash
grep -n "variation_amount.*variationAmount" /app/frontend/src/api/transforms/orderTransform.js
```

**Result — 2 bug sites confirmed:**

| Site | Function | Line | Current value | Correct value |
|---|---|---|---|---|
| 1 | `buildCartItem()` | **L703** | `variationAmount` | `variationAmount * (item.qty \|\| 1)` |
| 2 | `collectBillExisting` food_detail builder | **L1492** | `variationAmount` | `variationAmount * qty` |

**Code Reality: EXISTING BUG — 2 lines in 1 file. No new code needed.**

---

## Step 1 — Conflict Pre-Check

**File:** `api/transforms/orderTransform.js`

| Check | Result |
|---|---|
| FILE_OWNERSHIP.md | HOTSPOT — last modified CR-025 + BUG-138. 6+ CRs have touched this file. |
| Open CRs in registry touching this file | NONE currently open |
| Proximity of changes | L703 (buildCartItem) and L1492 (collectBillExisting) — ~789 lines apart, no proximity conflict |
| Other bugs scheduled in this file | BUG-ROOM-PAIDROOM (L1632) — same file, different line, can be done in same session |

**Conflict Pre-Check: CLEAN — no open CR conflict. Hotspot flag noted for Risk Register.**

---

## Step 2 — Data Flow & Impact

### What the bug breaks

For any order with **item qty > 1 AND a variance selected** (e.g. 3× Masala Dosa + Cheese ₹20):

| Payload field | Current (WRONG) | Correct |
|---|---|---|
| `variation_amount` | ₹20 (1× price) | ₹60 (3× price) |
| `food_amount` | ₹300 ✅ (correct) | ₹300 ✅ |
| `order_amount` grand total | ₹360 ✅ (correct — via `_fullUnitPrice × qty`) | ₹360 ✅ |

**Result:** Backend receives `variation_amount: 20` → bill line item shows **3 Masala + 1 Cheese** instead of **3 Masala + 3 Cheese**. Grand total `order_amount` may be correct at ₹360, but line-level breakdown and charge is ₹320.

### Affected flows (all 5)

| Path | Mode | Entry point | Transform site |
|---|---|---|---|
| A | QSR fresh order | `handleQsrCollectBill` L1291 | L703 |
| B | QSR placed-edge | `handleQsrCollectBill` L1439 | L1492 |
| C | Non-QSR postpaid fresh | `handlePlaceOrder` L1022 | L703 |
| D | Non-QSR prepaid fresh | Prepaid button L2000 | L703 |
| E | Non-QSR collect bill | Collect Bill L2112 | L1492 |

### What is NOT affected

- `order_amount` (grand total) — computed via `_fullUnitPrice × qty` in `calcOrderTotals` — correct and unchanged by this fix
- Items with qty = 1 — `variationAmount * 1 = variationAmount` — no change
- Items with NO variance — `variationAmount = 0` — no change
- Addons — handled separately via `add_on_qtys` array — unaffected

---

## Downstream Consumer Check

`orderTransform.js` → `OrderEntry.jsx` (caller) — no change to calling code needed.

`collectBillExisting` → `OrderEntry.jsx` L1444, L2112 — receives result, no change needed.

`calcOrderTotals` → unchanged. `order_amount` field remains correct.

---

## Risk Classification

**Risk: MEDIUM**

| Trigger | Detail |
|---|---|
| Hotspot file | YES — `orderTransform.js` is R5 hotspot. Extra care required. |
| Financial field change | YES — `variation_amount` is a billing field sent to backend |
| Change is additive? | NO — changes existing formula |
| Regression surface | Items with variance + qty > 1 only |
| Items with qty = 1 | Unaffected (multiply by 1 = same value) |
| Items with no variance | Unaffected (`variationAmount = 0`, `0 * qty = 0`) |
| `order_amount` grand total | Unaffected — different calculation path |

**Mitigation:** Fix is mathematically deterministic. `food_amount = basePrice * qty` already uses this exact pattern — the fix mirrors an identical line 2 fields above it.

---

```
Gate 2 complete: BUG-VQTY
Code Reality: EXISTING BUG in 2 lines, 1 file
Conflict Pre-Check: CLEAN (hotspot noted)
Risk: MEDIUM — financial field, hotspot file, small targeted change
Files to change: 1 (orderTransform.js)
Lines to change: 2 (L703 + L1492)
Next: Gate 3 Implementation Plan
```
