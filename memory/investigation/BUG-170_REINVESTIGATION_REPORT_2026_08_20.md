# INVESTIGATION REPORT — BUG-170 (Reinvestigation)

**ID:** BUG-170
**Date:** 2026-08-20
**Agent Role:** INVESTIGATION
**Triggered by:** Owner request — "reinvestigate BUG-170"
**Prior state:** Gate 2 Impact Analysis complete (BATCH-04_IMPACT_ANALYSIS.md) — proposed fix awaiting Gate 4 GO
**Steps used:** 9 / 10

---

## 1. Summary

**Root cause:** CONFIRMED (HIGH confidence, code-traced + data-shape verified).
`buildBillPrintPayload` has two internal loops that compute `lineTotal = (price × qty) + (addonPerUnit × qty)`. Neither loop adds the variation upcharge. `unit_price` from the backend is base price only — variation is stored separately in `variation_amount`. Both the COLLECT BILL PATH (L1862) and MANUAL PRINT PATH (L1940) are affected.

**Classification:** FE_BUG
**Confidence:** HIGH — code traced end-to-end; `unit_price` semantics confirmed from `toAPI` code and pav_orders evidence; `variation_amount` field confirmed on raw API detail rows.
**Planning skip eligible:** NO — `orderTransform.js` is a listed R5 hotspot.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test method | Steps | Result |
|---|---|---|---|---|
| H1 | `unit_price` from backend already includes variation → adding `variationPerUnit` would double-count | Read `toAPI.placeOrder` (L1494, L1538) + pav_orders evidence structure | 3 | **ELIMINATED** — L1538: `unit_price: unitPrice` = base only; variation is in separate `variation_amount` field |
| H2 | `unit_price` is base-only → both paths understate `lineTotal` → variation IS missing | Read both path loops (L1869 and L1955); grep for `variationPerUnit` in file | 4 | **CONFIRMED** — `variationPerUnit` appears NOWHERE in file. Both loops end at `(price × qty) + (addonPerUnit × qty)` |
| H3 (new) | Backend provides `variation_amount` field (authoritative total) — better fix anchor than re-parsing `item.variation[].values[]` | Inspect pav_orders.json detail row keys; trace BUG-VQTY fix history | 2 | **CONFIRMED** — `variation_amount` and `total_variation_price` exist on every raw detail row; BUG-VQTY fix (L726, L1541) confirmed semantics = `variationPerUnit × qty` |

---

## 3. Data Flow Trace

```
Staff clicks "Bill Print" on OrderCard (manual reprint)
  → buildBillPrintPayload(order) — L1770
  → hasFinancialOverrides = false (no CollectBill context)
  → MANUAL PRINT PATH fires (L1940)
    → billFoodList.forEach(item =>
        qty          = item.quantity
        unitPrice    = item.unit_price          ← BASE PRICE ONLY (no variation)
        price        = unitPrice
        addonPerUnit = item.add_ons[].reduce()  ← addons counted ✅
        lineTotal    = (price × qty) + (addonPerUnit × qty)
                       ↑ MISSING: variationPerUnit — item.variation_amount exists but never read
        taxAmt       = lineTotal × taxPct / 100  ← UNDERSTATED because lineTotal < actual
      )
  → gst_tax / vat_tax WRONG (understated by variation upcharge × qty × taxRate per item)
  → receipt printed with wrong GST/VAT split
  BREAK POINT: L1959 — lineTotal does not include variation_amount

Staff clicks "Collect Bill" on CollectPaymentPanel (live settlement)
  → buildBillPrintPayload(order, scPct, overrides)
  → hasFinancialOverrides = true
  → COLLECT BILL PATH fires (L1862)
    → billFoodList.forEach(item =>
        lineTotal    = (price × qty) + (addonPerUnit × qty)
                       ↑ MISSING: variation_amount
        computedSubtotal += lineTotal  ← UNDERSTATED
      )
  → serviceChargeAmount wrong (computed on understated subtotal)
  → gst_tax / vat_tax wrong
  BREAK POINT: L1873 — same omission
```

**Backend key:** `unit_price` on raw `rawOrderDetails` row = base price only (confirmed: `toAPI` L1538 sends `unit_price: unitPrice` where `unitPrice = item.unitPrice || item.price`, NOT `fullUnitPrice`). Variation goes into separate `variation_amount` field (BUG-VQTY fix: = `variationPerUnit × qty`).

---

## 4. New Finding vs Prior Impact Analysis (BATCH-04)

The BATCH-04 Impact Analysis (§BUG-170) said:

> *"In COLLECT BILL PATH (~L1864): Same addition. Collect Bill PATH `unit_price` may include variation in some code paths but not all. Adding `variationPerUnit` as a guard is safe… RECOMMEND MANUAL PATH fix only at Gate 4 unless testing confirms Collect Bill PATH also needs it."*

**This investigation overturns that caveat:**
- `unit_price` NEVER includes variation. Confirmed by `toAPI.placeOrder` L1538.
- The "may include in some code paths" concern is eliminated.
- **BOTH paths need the fix.** This is a scope expansion vs the prior plan.

---

## 5. Better Fix Approach (new finding)

The Impact Analysis proposed computing variation from `item.variation[].values[].optionPrice`:
```js
// OPTION A (Impact Analysis approach)
const variationPerUnit = (item.variation || []).reduce(
  (sum, v) => sum + (v.values || []).reduce((s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0), 0
);
const lineTotal = (price * qty) + (addonPerUnit * qty) + (variationPerUnit * qty);
```

This investigation found a **safer alternative**:
```js
// OPTION B (new — uses backend authoritative field)
// item.variation_amount = variationPerUnit × qty already (BUG-VQTY fix confirmed)
const lineTotal = (price * qty) + (addonPerUnit * qty) + parseFloat(item.variation_amount || 0);
```

**Comparison:**

| | Option A | Option B |
|---|---|---|
| Source | `item.variation[].values[].optionPrice` | `item.variation_amount` |
| Semantics risk | Assumes `values[]` = selected-only (not all catalog options) | Uses backend-computed authoritative total |
| Qty multiplication | Needs `× qty` | Already `× qty` (BUG-VQTY confirmed) |
| Consistency | Mirrors addon pattern (recompute from raw) | Different from addon pattern |
| Edge case risk | If backend echoes ALL variation options (not just selected), overcounts | No edge case — backend value is what was charged |
| Recommendation | Acceptable | **Preferred** |

**Recommendation: Option B** — `item.variation_amount` is the backend's authoritative charge for this line. It's the same value that determined the actual billing. Using it for the tax/subtotal loop is consistent with how `order.subtotalAmount` and `order.serviceTax` are used in the MANUAL PATH.

**However**: If owner prefers consistency with the addon pattern (Option A), that's also acceptable. Risk is LOW because `item.variation` on order detail rows appears to contain selected-only values (observed from BUG-168 evidence).

---

## 6. Scope Clarification (MANUAL PATH only vs both)

| Path | Prior plan said | Investigation says |
|---|---|---|
| MANUAL PRINT PATH (L1940) | Fix needed ✅ | Fix needed ✅ |
| COLLECT BILL PATH (L1862) | "Check if needed" ⚠ | **Fix needed ✅ — same gap confirmed** |

This is a **scope expansion** requiring owner decision at Gate 4:
- Option X: Fix MANUAL PATH only (conservative, matches prior plan)
- Option Y: Fix both paths (complete fix — recommended)

---

## 7. Evidence Artifacts

| File | Description |
|---|---|
| `/app/memory/evidence/BUG-168/order_940284.json` | Order with `variation: [{values: [{optionPrice: '0'}]}]` — shows selected-only variation shape |
| `/app/memory/evidence/BUG-168-reinvestigation/api_list_940285.json` | Detail row shape: `unit_price`, `variation_amount`, `total_variation_price` keys confirmed |
| `/app/memory/evidence/settlement_investigation/pav_orders.json` | Orders with `variation_amount=0.00, total_variation_price=0.00` — fields exist on all detail rows |
| `/app/memory/impact/BUG_VQTY_IMPACT_ANALYSIS.md` | BUG-VQTY fix confirmed `variation_amount` = `variationPerUnit × qty` |
| `orderTransform.js:1538` | `unit_price: unitPrice` (base only, variation NOT included) |
| `orderTransform.js:1869-1873` | COLLECT BILL PATH loop — no variationPerUnit |
| `orderTransform.js:1955-1959` | MANUAL PATH loop — no variationPerUnit |

---

## 8. Recommendations

**Classification:** FE_FIX — 1 file (`orderTransform.js`), 2 loop sites

**Full gate cycle required** (R5 hotspot — planning skip NOT eligible):
- Gate 3 Implementation Plan → Gate 4 GO → Implementation → QA

**Gate 3 plan should address:**

1. **Which fix option**: Option A (recompute from `variation[]`) or Option B (use `variation_amount`) — **owner decision**
2. **Which paths to fix**: Both COLLECT BILL + MANUAL (recommended) or MANUAL only — **owner decision**
3. **Line verification**: Confirm current line numbers (L1869-1873 COLLECT BILL, L1955-1959 MANUAL) match file before coding

**Revised implementation (Option B, both paths):**

*MANUAL PATH — L1955-1960 (add 1 line):*
```js
const addonPerUnit = (item.add_ons || []).reduce(
  (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)), 0
);
// BUG-170: variation_amount from backend = variationPerUnit × qty (BUG-VQTY semantics)
const lineTotal = (price * qty) + (addonPerUnit * qty) + parseFloat(item.variation_amount || 0);
```

*COLLECT BILL PATH — L1869-1874 (add 1 line):*
```js
const addonPerUnit = (item.add_ons || []).reduce(
  (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)), 0
);
// BUG-170: same fix — variation_amount already includes qty factor
const lineTotal = (price * qty) + (addonPerUnit * qty) + parseFloat(item.variation_amount || 0);
```

**Total: 2 lines added, 1 file, 2 locations.**
Risk remains MEDIUM (print/display only — no live transaction affected).

---

## 9. Retroactive Candidates
None.

---

*Investigation complete. Report saved to `/app/memory/investigation/BUG-170_REINVESTIGATION_REPORT_2026_08_20.md`*
*Evidence path: `/app/memory/evidence/BUG-170/` (no new curl probes needed — existing evidence files sufficient)*
