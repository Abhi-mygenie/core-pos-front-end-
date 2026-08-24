# INVESTIGATION REPORT — BUG-171

**ID:** BUG-171
**Date:** 2026-08-20
**Role:** INVESTIGATION
**Trigger:** Owner request — "check if already done in codebase"
**Steps used:** 8 / 10

---

## 1. Summary

**Root cause:** BUG-171 is NOT a standalone bug. It is 100% the downstream symptom of **BUG-170** (variation upcharge missing from `buildBillPrintPayload` lineTotal computation). No separate FE fix is needed.

**Classification:** NOT_A_BUG — subsumed by BUG-170
**Confidence:** HIGH — mathematically proven against live order data (order #000334)
**Code Reality:** NONE — no fix required (auto-resolves when BUG-170 is fixed)

---

## 2. Mathematical Proof (order #000334, Hogwarts rid=618)

### Items
| Item | Base | Addon | Variation | Line Total | Tax |
|---|---|---|---|---|---|
| Organic Espresso ×2 | ₹240 | +₹20 (Brown Sugar) | none | ₹260 | VAT 22% |
| Samosa Chaat ×2 | ₹100 | none | +₹8 (Extra Tikhi ₹4×2) | ₹108 | GST 18% |

### Buggy computation (BUG-170 present — variation missing)
| Field | Value |
|---|---|
| Item total | ₹360 (260+100 — missing ₹8 variation) |
| CGST (9% on ₹100) | ₹9.00 |
| SGST (9% on ₹100) | ₹9.00 |
| VAT (22% on ₹260) | ₹57.20 |
| **Breakdown total** | **₹435.20** |
| Backend grand total | ₹445.00 |
| **GAP** | **₹9.80 ← EXACTLY the reported symptom** |

### Correct computation (BUG-170 fixed — variation included)
| Field | Value |
|---|---|
| Item total | ₹368 (260+108) ← matches `order_sub_total_amount: 368` ✅ |
| CGST (9% on ₹108) | ₹9.72 |
| SGST (9% on ₹108) | ₹9.72 |
| VAT (22% on ₹260) | ₹57.20 |
| **Breakdown total** | **₹444.64** |
| Backend grand total | ₹445.00 |
| **GAP after fix** | **₹0.36 (normal rounding only)** |

**Conclusion:** The entire ₹9.80 gap = variation upcharge (₹8) + GST on variation (₹1.44) + rounding. Fixing BUG-170 collapses the gap to ₹0.36 (rounding).

---

## 3. Code Reality Check

```bash
grep -n "variationPerUnit\|variation_amount" src/api/transforms/orderTransform.js
# → variationPerUnit: NOT FOUND anywhere in file
# → variation_amount: only in toAPI outbound paths — never read in buildBillPrintPayload
```

**Result:** No fix code exists. BUG-171 will auto-resolve when BUG-170 is implemented.

---

## 4. Additional Finding: BUG-170 Fix Must Use Option A

While investigating this bug, a critical issue with the BUG-170 investigation's Option B recommendation was found:

**`variation_amount` is `None` on order #000334 (and likely all orders placed before BUG-VQTY fix, July 2026).**

```
variation_amount: None  ← confirmed from order_940284.json
```

- **Option B** (use `item.variation_amount`): `parseFloat(null || 0) = 0` → silently wrong for old orders
- **Option A** (recompute from `item.variation[].values[].optionPrice`): reads the variation array echoed on the detail row — works regardless of when order was placed

**BUG-170 MUST use Option A.** Previous BUG-170 investigation report recommendation for Option B is hereby overridden.

---

## 5. Recommendations

1. **CLOSE BUG-171 as SUBSUMED by BUG-170** — update registry status accordingly
2. **No separate Gate 2/3/4 cycle needed for BUG-171** — it has no independent fix
3. **BUG-170 fix must use Option A** (recompute from `item.variation[].values[].optionPrice`)
4. When BUG-170 QA is written, add a regression test verifying receipt breakdown total ≈ backend `order_amount` (gap ≤ ₹1 for rounding)

---

## 6. Retroactive Candidates
None.
