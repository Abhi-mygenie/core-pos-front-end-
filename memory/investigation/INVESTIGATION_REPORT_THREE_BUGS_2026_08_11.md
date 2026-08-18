# Investigation Report — 3 Bugs (2026-08-11)
**Role:** INVESTIGATION (Role 6)
**Account used:** cafe103 (`owner@cafe103.com`)
**Steps used:** 8/10
**Date:** 2026-08-11

---

## Bug 1 — BUG-296 "not fixed yet, difference in reports"

### Hypothesis tested
- H1: Fix code missing from repo → **ELIMINATED** — code confirmed deployed with BUG-296 markers
- H2: Fix is present but wrong restaurant — cafe103 is not a food court → **CONFIRMED**
- H3: The "difference" is a new/different comparison (not Food Court vs Item Sales) → **OPEN**

### Finding
The BUG-296 fix (`sort_by: 'collect_bill'` + `filter foodStatus !== 3`) is **in the code and deployed**.

However, **BUG-296 was validated against Shimla QoH Food Court (rid=598)**. café103 is a regular restaurant with 435 orders in July — it does **not** use the Food Court report.

The user reporting "still not fixed" suggests they are seeing a **different revenue discrepancy** — likely between:
- All Orders Report vs Settlement Report totals, OR
- Item Sales vs a different aggregation

### Root Cause
**UNDETERMINED** — need the user to specify:
1. **Which two reports** are showing different numbers
2. **Which restaurant** (cafe103 or Shimla QoH Food Court)
3. **Which date range** and **what the delta is**

### Confidence: LOW (cannot reproduce without specifics)
### Classification: NEEDS_OWNER_CLARIFICATION
### Evidence: BUG-296 code markers confirmed in `foodCourtService.js` lines 105, 108, 129

---

## Bug 2 — P&L Report "showing junk values" (cafe103)

### Hypotheses tested
- H1: Field name mismatch in summary object → **CONFIRMED**
- H2: API returning wrong date / ignoring date params → **CONFIRMED**
- H3: cafe103 has no expense data → **PARTIAL** (true, but not the root cause of junk display)

### Finding 1 — CONFIRMED: `paid_revenue` field name mismatch

| Location | Expected by frontend | Actual API response |
|---|---|---|
| `PLReportPage.jsx` summary parsing | `s.paid_revenue` | `s.total_paid_revenue` |

```javascript
// PLReportPage.jsx ~line 89
paidRevenue: parseFloat(s.paid_revenue) || 0,  // ← s.paid_revenue is UNDEFINED
                                                  //   API returns total_paid_revenue
```

**Impact:** "Paid Revenue" KPI card always shows ₹0.00 regardless of actual API value.

### Finding 2 — CONFIRMED: API returns only today's date row (single row, all zeros) regardless of range

API probe with `date_from: "01/07/2026"`, `date_to: "31/07/2026"`:
- Response: 1 row, `"date": "11/08/2026"` (TODAY), all values `"0.00"`
- Same result for range `01/01/2026 → 11/08/2026` → same single zero row

This means either:
- a) The backend ignores the date params for this endpoint (backend bug)
- b) cafe103 has no expense or purchase data → P&L is genuinely zero (but date should still show the range)

**The "junk values" the user sees** is the report showing today's date in every row with zeros, OR the Paid Revenue always being ₹0 due to field name mismatch.

### Root Cause Summary
| # | Classification | Root cause | Fix owner |
|---|---|---|---|
| RC1 | FE_BUG (CODE_ERROR) | `s.paid_revenue` should be `s.total_paid_revenue` in `PLReportPage.jsx:89` | Frontend — 1 line |
| RC2 | BACKEND_BUG or DATA_ISSUE | API returns single row for today regardless of date range | Backend to confirm — may be data gap for cafe103 |

### Data Flow Trace (RC1)
```
API response → getProfitLossReport() → setData(res) → 
  summary = data.summary → 
  s.paid_revenue = UNDEFINED (API has total_paid_revenue) →
  paidRevenue = 0 → Paid Revenue KPI shows ₹0.00 always
```

### Fix (RC1 — Frontend, 1 line)
**File:** `src/pages/reports-module/PLReportPage.jsx`
**Line:** ~89
```javascript
// BEFORE
paidRevenue: parseFloat(s.paid_revenue) || 0,
// AFTER
paidRevenue: parseFloat(s.total_paid_revenue ?? s.paid_revenue) || 0,
```

### Evidence
- `/app/memory/evidence/PLN_API_response.json` — raw API response showing `total_paid_revenue` key
- API summary keys: `total_sales`, `total_paid_revenue`, `total_expenses`, `total_purchase`, `total_expenses_combined`, `total_profit_loss`

### Confidence: HIGH (RC1) / MEDIUM (RC2 — backend data question)
### Classification: FE_BUG (RC1) + BACKEND_BUG (RC2)
### Planning skip eligible (RC1): YES — 1 line, 1 file, non-financial display field

---

## Bug 3 — Item Level Discount: GST/VAT still applied incorrectly

### Hypotheses tested
- H1: `taxTotals` includes ALL items (discountable + non-discountable) and discount ratio uses wrong denominator → **CONFIRMED**
- H2: Discount distribution already handles giveDiscount correctly → CONFIRMED (discount is correct, GST adjustment is wrong)

### Finding — CONFIRMED: Incorrect `discountRatio` denominator

**`taxTotals` computation (lines 247-270):**
```javascript
billableItems.forEach(item => { // ALL billable items — includes giveDiscount=false items
  ...
  sgst += taxAmt / 2;
  cgst += taxAmt / 2;
  vat += taxAmt;
});
```
`taxTotals` includes GST/VAT for ALL items — both discountable and non-discountable.

**GST post-discount adjustment (line ~609):**
```javascript
const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;
//                                     ^^^^^^^^^ USES FULL itemTotal (ALL items)
const itemGstPostDiscount = (taxTotals.sgst + taxTotals.cgst) * (1 - discountRatio);
//                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ALL items' GST reduced
const vat = taxTotals.vat * (1 - discountRatio);
//           ^^^^^^^^^^^^ ALL items' VAT reduced
```

**What should happen:**
- `discountRatio` should use `discountableTotal` (not `itemTotal`)
- Only the discountable items' GST should be reduced, non-discountable items' GST unchanged

### Numerical Example
| | Current (BUG) | Correct |
|---|---|---|
| Item A (giveDiscount=true): ₹100, 18% GST | GST ₹18 | GST ₹18 |
| Item B (giveDiscount=false): ₹50, 12% GST | GST ₹6 | GST ₹6 |
| Discount applied (20% of discountable): ₹20 | — | — |
| discountRatio | 20/150 = 13.33% | 20/100 = 20% |
| Post-discount GST (current) | (18+6)×(1-0.133) = **₹20.80** | — |
| Post-discount GST (correct) | — | 18×(1-0.2) + 6 = **₹20.4** |
| **Difference** | **₹0.40 over-charge** | — |

### Data Flow Trace
```
giveDiscount=false item → taxTotals includes its GST ✓ (correct) →
discountRatio = totalDiscount / itemTotal (WRONG: should be / discountableTotal) →
itemGstPostDiscount = totalGst * (1-discountRatio) 
  → non-discountable items' GST incorrectly REDUCED
  → discountable items' GST UNDER-reduced
→ GST displayed to user and sent to backend is WRONG when giveDiscount=false items present
```

### Root Cause
**Classification: CODE_ERROR** — CR-028 implemented discount distribution on `discountableTotal` correctly, but the GST post-discount adjustment was NOT updated to match. The `discountRatio` still uses `itemTotal` (pre-CR-028 logic).

### Fix
**File:** `src/components/order-entry/CollectPaymentPanel.jsx`

**Fix 1 — discountRatio denominator (line ~605):**
```javascript
// BEFORE
const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;
// AFTER  
const discountRatio = discountableTotal > 0 ? totalDiscount / discountableTotal : 0;
```

**Fix 2 — apply discount ratio only to discountable items' GST:**
This requires splitting `taxTotals` into discountable vs non-discountable buckets.
```javascript
// Compute separate GST buckets
const discountableGst = discountableItems GST sum
const nonDiscountableGst = non-discountable items GST sum

// Apply discount ratio only to discountable portion
const itemGstPostDiscount = discountableGst * (1 - discountRatio) + nonDiscountableGst;
```

### Risk Classification: HIGH (CollectPaymentPanel is a hotspot R5 file — financial logic R6)
### Planning skip eligible: NO — requires full Gate 2-3 (hotspot file, financial logic)
### Evidence: `/app/memory/evidence/taxTotals_code.txt`

---

## Summary Table

| Bug | Classification | Confidence | Files | Planning Skip |
|---|---|---|---|---|
| BUG-296 — report diff | NEEDS_OWNER_CLARIFICATION | LOW | none | N/A — clarify first |
| P&L paid_revenue field | FE_BUG (CODE_ERROR) | HIGH | `PLReportPage.jsx` (1 line) | YES (non-financial display) |
| P&L date range (single row) | BACKEND_BUG | MEDIUM | backend only | N/A — backend ask |
| GST/VAT with item discount | FE_BUG (CODE_ERROR) | HIGH | `CollectPaymentPanel.jsx` | NO — Gate 2-3 required |

---

## Recommended Next Steps

### Immediate
1. **BUG-296:** Owner to clarify — which 2 reports, which restaurant, what delta?
2. **P&L RC1:** DIRECT_BUG_FIX eligible (1 line, non-financial) — pending owner approval
3. **P&L RC2:** Backend brief needed — why does API return single row for today regardless of range?
4. **Item discount GST:** Full Gate 2 → Gate 3 → Gate 4 GO → Implementation (HIGH risk, hotspot file)

### Owner Questions
- BUG-296: "Can you show me which two reports are showing different numbers and for which restaurant?"
- P&L: "Can you confirm — is the 'Paid Revenue' card always showing ₹0 even when other values are non-zero?"
- Item discount: "Which order type and discount type triggers this? (manual %, manual flat, preset?)"
