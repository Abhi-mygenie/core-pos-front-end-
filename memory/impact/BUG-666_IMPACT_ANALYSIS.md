# BUG-666 — Impact Analysis (Gate 2)

**ID:** BUG-666
**Date:** 2026-11-10
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** PARTIAL — both paths in running code; BUG-665 partial fix present; BUG-666 marker absent
**Risk:** CRITICAL (financial, R5 hotspot)
**OD-666-01:** LOCKED — Option A (CPP internal fix — read whole-item GST total; no backend `gst_amount` mapping needed)
**OD-666-02:** LOCKED — ALL types (prepaid, postpaid, QSR)
**IA:** `impact/BUG-666_IMPACT_ANALYSIS.md`

---

## 1. Code Reality Check

```
CPP taxTotals (L296-301) — per item:         taxAmt = linePrice * (rate/100)  → 5.7145...
                                              sgst += taxAmt/2; cgst += taxAmt/2  → 2.8572...
  At return:                                  sgst: Math.round(2.8572...*100)/100 = 2.86
                                              taxTotals.sgst + cgst = 5.72  ← BUG

orderTransform calcOrderTotals (L846) — per item: itemGst = parseFloat("5.71") = 5.71
                                                   gstTax += 5.71 → totalTax = 6.28

BUG-666 marker: ABSENT
BUG-665 marker: PRESENT (splitGst at L857 — will benefit from this fix)
```

---

## 2. Conflict Pre-Check

| Item | File | Status | Conflict? |
|---|---|---|---|
| BUG-665 | CPP L852-860 (`finalSplitBase`) | GATE_5A | PARALLEL-SAFE — BUG-666 fixes `totalGst` (via `itemGstPostDiscount`); BUG-665 reads `totalGst` for `splitGst`. They work together: after BUG-666, `totalGst = 6.2815` → BUG-665 `splitGst = 6.28` → `rawSplitBase = 132.0` ✓ |
| BUG-660 | CPP credit/TAB block | GATE_5A | PARALLEL-SAFE — different section |
| BUG-304 | CPP taxTotals + discount | GATE_5B | Add-only: new `gstTotal/dGstTotal` fields; existing `dSgst/dCgst/sgst/cgst` unchanged — BUG-304 logic preserved |

---

## 3. Data Flow Trace

```
billableItems.forEach(item)
  taxAmt = linePrice * (rate/100)      ← BREAK POINT: 5.7145... (not 5.71)
  sgst += taxAmt/2                     ← 2.8572... accumulates
  cgst += taxAmt/2
return: sgst=Math.round(2.857...*100)/100 = 2.86, cgst=2.86

itemGstPostDiscount = taxTotals.sgst + taxTotals.cgst = 5.72  ← 1p wrong
totalGst = 5.72 + 0.5715 = 6.2915
splitGst (BUG-665) = Math.round(6.2915*100)/100 = 6.29       ← 1p over
rawSplitBase = 132.01   finalSplitBase = 132.01 (totalRound=false)
splitCap = 132.01   upi = 32.01   sum = 132.01 ≠ 132 → ERROR
(without BUG-665: sgst=3.15, cgst=3.15, rawFinalTotal=132.02 → splitCap=132.02 → upi=32.02 → ERROR)
```

---

## 4. Exact Fix — Option A (CPP only, no backend mapping needed)

### Why `item.gst_amount` is NOT available in CPP
`fromAPI.orderItem` (orderTransform L108-154) does **not** map `gst_amount` from the API response. CPP's `billableItems` have `tax.percentage` and `price`, but no pre-rounded GST field.

### Fix: accumulate whole-item GST, round the total, derive `itemGstPostDiscount` from it

**E1 — `taxTotals` useMemo (L279-339) — add `gstAcc` + `dGstAcc` accumulation + 2 new return fields**

Add alongside existing `sgst/cgst` accumulators:
```js
let gstAcc = 0, dGstAcc = 0; // BUG-666: whole-item GST totals (not halved per item)
```

Add alongside existing `sgst += taxAmt/2`:
```js
gstAcc  += taxAmt;                       // BUG-666: accumulate full item GST
if (isDiscountable) dGstAcc += taxAmt;   // BUG-666: discountable bucket
```

Add to return:
```js
gstTotal:  Math.round(gstAcc  * 100) / 100, // BUG-666: 5.71 (matches orderTransform)
dGstTotal: Math.round(dGstAcc * 100) / 100, // BUG-666: discountable portion
```

Result: `gstTotal = Math.round(5.7145 × 100)/100 = 5.71` ✓

**E2 — `itemGstPostDiscount` formula (~L782-784)**

Current:
```js
const itemGstPostDiscount =
  (taxTotals.dSgst + taxTotals.dCgst) * (1 - discountableRatio)
  + (taxTotals.sgst - taxTotals.dSgst) + (taxTotals.cgst - taxTotals.dCgst);
```

New:
```js
// BUG-666: use whole-item rounded GST (matches orderTransform parseFloat(gst_amount))
const itemGstPostDiscount =
  taxTotals.dGstTotal * (1 - discountableRatio)        // BUG-666
  + (taxTotals.gstTotal - taxTotals.dGstTotal);        // BUG-666
```

Result: `itemGstPostDiscount = 5.71` → `totalGst = 5.71 + 0.5715 = 6.2815` → `splitGst = 6.28` = matches orderTransform ✓

**NOT changed:** `taxTotals.sgst`, `taxTotals.cgst`, `taxTotals.dSgst`, `taxTotals.dCgst` (kept for backward compatibility and all display surfaces that read them directly).

---

## 5. Full Math Verification

| Step | Before fix | After fix | orderTransform |
|---|---|---|---|
| Item GST | 5.7145... | 5.71 (gstTotal) | 5.71 ✓ |
| totalGst | 6.2915 | 6.2815 | 6.2815 ✓ |
| splitGst (BUG-665) | 6.29 | **6.28** | 6.28 ✓ |
| rawSplitBase | 132.01 | **132.00** | 132 ✓ |
| Payments sum | 132.01 ≠ 132 → ERROR | **132 = 132 ✓** | — |
| rawFinalTotal | 132.02 | **132.00** | — |
| sgst displayed | 3.15 | **3.14** (correct) | — |

**Bonus:** also fixes the displayed SGST/CGST on the bill (3.14 + 3.14 = 6.28, was incorrectly 3.15 + 3.15 = 6.30).

---

## 6. Edge Cases

| Scenario | Impact | Safe? |
|---|---|---|
| Round item prices (₹149, ₹420) | No half-paisa intermediate; `gstTotal = taxTotals.sgst + taxTotals.cgst` → no change | ✓ |
| Discount orders (BUG-304) | `dGstTotal` accumulates discountable portion identically to `dSgst+dCgst` logic; discount ratio applied same way | ✓ |
| VAT items | VAT accumulates separately (`vat` bucket); `gstAcc` only receives GST items — no change to VAT path | ✓ |
| Inclusive tax | Formula path: `taxAmt = linePrice - linePrice/(1+rate/100)`; accumulated into `gstAcc` same way → no issue | ✓ |
| SC = 0 (no service charge) | `scGst = 0`; gap only from item GST; fix resolves | ✓ |
| totalRound = true | `rawFinalTotal = 132.00` → applyGrandTotalRoundOff(132.00) = 132 → no change | ✓ |
| totalRound = false | `rawFinalTotal = 132.00` → no rounding → 132.00 → split cap = 132.00 = order_amount ✓ | ✓ |
| BUG-665 finalSplitBase | `totalGst` now = 6.2815 → `splitGst = 6.28` → `rawSplitBase = 132.00` ✓ | ✓ |

---

## 7. Scope Lock

**WILL change:**
- `src/components/order-entry/CollectPaymentPanel.jsx` — E1 taxTotals (+4 lines), E2 itemGstPostDiscount (~2 lines)

**WILL NOT touch:**
- `src/api/transforms/orderTransform.js` (Option A — untouched)
- `taxTotals.sgst`, `taxTotals.cgst`, `taxTotals.dSgst`, `taxTotals.dCgst` (kept unchanged)
- BUG-665 `finalSplitBase` block (stays — works correctly with the fix)
- Any print, report, settlement, receipt code
- `onChange` handler (BUG-113 parity)

**Files: 1 · Edits: 2 · R5 hotspot: YES · Fast Lane: NOT eligible**

---

## 8. Owner Decisions

| OD | Decision | Status |
|---|---|---|
| OD-666-01 | Option A — CPP internal fix (accumulate whole-item GST, no backend mapping needed) | **LOCKED** |
| OD-666-02 | ALL payment types (prepaid, postpaid, QSR) | **LOCKED** |

No new ODs. Ready for Gate 3.
