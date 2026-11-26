# BUG-684 — Implementation Plan (Gate 3)

**Date:** 2026-11-18
**Agent role:** PLANNING
**Stage:** Implementation Plan (Gate 3)
**Impact Analysis:** `memory/impact/BUG-684_IMPACT_ANALYSIS.md`
**Intake:** `change_requests/BUG-684_CART_COLLECT_BILL_BUTTON_ROUNDOFF_MISMATCH_INTAKE.md`

**Owner Decisions Resolved:**
- OD-684-01 = Full gate flow (owner confirmed)
- OD-684-02 = YES — round-off OFF shows 2-decimal total (owner confirmed)

---

## Scope Lock

**Files WILL change:** `src/components/order-entry/OrderEntry.jsx` (1 file)
**Files WILL NOT touch:** `roundOffUtils.js` · `orderTransform.js` · `CollectPaymentPanel.jsx` · `CartPanel.jsx` · any context · any service · any test file · any `.env` · any config

**Payload change:** NONE
**Backend change:** NONE

---

## Execution Sequence (5 edits, top-to-bottom)

### Edit 1 — Import shared round-off helper

**File:** `OrderEntry.jsx`
**Location:** After line 16 (alongside other transform imports)
**Action:** INSERT one line

```
CURRENT (line 16):
import { toAPI as orderToAPI, customItemFromAPI, fromAPI as orderFromAPI, calculateSelectedVariantsPrice } from "../../api/transforms/orderTransform";

INSERT AFTER line 16:
import { applyGrandTotalRoundOff } from '../../utils/roundOffUtils'; // BUG-684
```

**Verify:** `grep -n "applyGrandTotalRoundOff" OrderEntry.jsx` → shows the new import line.

---

### Edit 2 — Round per-item tax in `localTax` reducer

**File:** `OrderEntry.jsx`
**Location:** Lines 1153-1154
**Action:** REPLACE 2 lines → 3 lines

```
CURRENT (lines 1153-1154):
    const isInclusive = item.tax?.calculation === 'Inclusive';
    return sum + (isInclusive ? linePrice - (linePrice / (1 + taxPct / 100)) : linePrice * (taxPct / 100));

NEW:
    const isInclusive = item.tax?.calculation === 'Inclusive';
    const itemTax = isInclusive ? linePrice - (linePrice / (1 + taxPct / 100)) : linePrice * (taxPct / 100);
    return sum + Math.round(itemTax * 100) / 100; // BUG-684: round per item (parity with buildCartItem toFixed(2))
```

**Why:** `orderTransform.js` `buildCartItem` rounds each item's tax to 2dp (`toFixed(2)`) before summing. Without this, the cart button accumulates raw floats and drifts by fractions of a paise, which can tip the round-off result by ₹1 near the 10-paise boundary.

**Verify:** Node quick-check:
```
item1 tax = 123.81 * 0.05 = 6.1905 → round → 6.19
item2 tax = 114.29 * 0.05 = 5.7145 → round → 5.71
sum = 11.90 (matches orderTransform, was 11.905 before fix)
```

---

### Edit 3 — Round per-item tax in `unplacedTax` reducer

**File:** `OrderEntry.jsx`
**Location:** Lines 1168-1169
**Action:** REPLACE 2 lines → 3 lines (identical pattern to Edit 2)

```
CURRENT (lines 1168-1169):
    const isInclusive = item.tax?.calculation === 'Inclusive';
    return sum + (isInclusive ? linePrice - (linePrice / (1 + taxPct / 100)) : linePrice * (taxPct / 100));

NEW:
    const isInclusive = item.tax?.calculation === 'Inclusive';
    const itemTax = isInclusive ? linePrice - (linePrice / (1 + taxPct / 100)) : linePrice * (taxPct / 100);
    return sum + Math.round(itemTax * 100) / 100; // BUG-684: round per item (parity with buildCartItem toFixed(2))
```

**Why:** Same paise-drift issue as Edit 2, but for the unplaced-items-only reducer used in the add-to-placed-order scenario.

**Verify:** Same node check as Edit 2.

---

### Edit 4 — Replace local `applyRoundOff` with `roundOffEnabled` const

**File:** `OrderEntry.jsx`
**Location:** Lines 1192-1196 (the entire local helper function)
**Action:** REPLACE 5 lines → 2 lines

```
CURRENT (lines 1192-1196):
  const applyRoundOff = (raw) => {
    const ceil = Math.ceil(raw);
    const diff = Math.round((ceil - raw) * 100) / 100;
    return diff >= 0.10 ? ceil : Math.floor(raw);
  };

NEW:
  // BUG-684: replaced inverted local round-off with shared CR-170 helper (imported above)
  const roundOffEnabled = restaurant?.totalRound !== false; // BUG-684 (parity with L1338, L1400, L1735)
```

**Why:** The local helper was testing `(ceil - raw) >= 0.10` which is the complement of paise, producing inverted results for paise 1-9 and 91-99. The shared `applyGrandTotalRoundOff` uses integer-paise comparison and is drift-safe. The `roundOffEnabled` const follows the identical pattern already used at 4 other locations in this file (L1338, L1400, L1735, L2514).

**Verify:** `grep -n "applyRoundOff" OrderEntry.jsx` → must return 0 hits (old local function gone).

---

### Edit 5 — Update call sites to use shared helper

**File:** `OrderEntry.jsx`
**Location:** Lines 1223-1227 (the `total` computation)
**Action:** REPLACE 5 lines → 5 lines

```
CURRENT (lines 1223-1227):
  const total = hasPlacedItems
    ? (orderFinancials.amount || 0)
      + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0)
      + placedDeliveryDelta
    : applyRoundOff(rawLocalTotal) + deliveryAddOn;

NEW:
  const total = hasPlacedItems
    ? (orderFinancials.amount || 0)
      + (unplacedSubtotal > 0 ? applyGrandTotalRoundOff(rawUnplacedTotal, roundOffEnabled) : 0) // BUG-684
      + placedDeliveryDelta
    : applyGrandTotalRoundOff(rawLocalTotal, roundOffEnabled) + deliveryAddOn; // BUG-684
```

**Why:** Wires the two call sites (pre-place total and unplaced-items portion) to the shared helper with the restaurant toggle gate.

**Verify:** `grep -n "applyGrandTotalRoundOff" OrderEntry.jsx` → shows import + 2 call sites (3 hits total).

---

## Verification Matrix

| # | Test Case | Input | Expected Button | Expected Payload | How to Verify | Automated? |
|---|-----------|-------|-----------------|------------------|---------------|:---:|
| V1 | Reported case (paise < 10) | 123.81 + 114.29 @ GST 5% excl | **₹250** | 250 | Browser: pre-place cart | NO |
| V2 | Paise ≥ 10 boundary | Items summing to raw ~250.50 | **₹251** | 251 | Browser: pre-place cart | NO |
| V3 | Paise 90-99 (was wrongly floored) | Items summing to raw ~250.95 | **₹251** | 251 | Browser: pre-place cart | NO |
| V4 | Round-off OFF restaurant | Any items | **2-decimal** (e.g. ₹250.01) | same 2-decimal | Browser: restaurant with totalRound=false | NO |
| V5 | Add items to placed order | Place 1 item → add 1 more | Button = placed amount + correctly rounded new portion | matches update payload | Browser: placed + unplaced | NO |
| V6 | Exact rupee total (paise = 0) | Items summing to exactly ₹250.00 | **₹250** | 250 | Browser: confirm no change | NO |
| V7 | Existing unit tests still pass | — | 0 failures | — | `npx craco test --watchAll=false --testPathPattern=round001` | YES |
| V8 | Webpack compiles clean | — | 0 new warnings | — | `tail frontend.out.log` → "compiled" | YES |

---

## Post-Code Registry Checklist

The Implementation agent MUST execute these after coding:

```
- [ ] registry.json: BUG-684 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add OrderEntry.jsx with BUG-684 + date
- [ ] Code markers: // BUG-684 comment in every modified line/block
```

---

## Risk Register

| # | Risk | Likelihood | Mitigation |
|---|------|------------|------------|
| R1 | Incorrect rounding near paise=10 boundary | VERY LOW | Shared helper already battle-tested + unit tests in round001 |
| R2 | Regression on placed-branch total | VERY LOW | Edit 5 doesn't touch placed branch (L1224). Placed total still uses `orderFinancials.amount` |
| R3 | Per-item tax rounding changes sum by 1 paise in some edge | LOW | Parity fix — matches what backend already computes |
| R4 | Import adds bundle weight | NEGLIGIBLE | `roundOffUtils.js` is 30 lines, likely already in bundle via orderTransform |
| R5 | Interaction with CR-412/CR-413/BUG-281 | NONE | Different code zones (600+ lines away), no data dependency |

---

Planning complete: BUG-684
Stage: Implementation Plan (Gate 3)
Code reality: NONE
Risk: HIGH
Files WILL change: `OrderEntry.jsx` (1 file, 5 edits, ~12 lines net)
Files WILL NOT touch: `roundOffUtils.js` · `orderTransform.js` · `CollectPaymentPanel.jsx` · `CartPanel.jsx`
Owner decisions: OD-684-01 = Full gate (confirmed), OD-684-02 = YES (confirmed)
Docs: `memory/plans/BUG-684_IMPLEMENTATION_PLAN.md`
Next: Gate 4 GO → Implementation
