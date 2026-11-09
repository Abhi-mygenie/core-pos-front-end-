# BUG-646 — Inclusive Tax Items Inflate Grand Total (Double-Counted)

**Registered:** 2026-11-05  
**Classification:** BUG  
**Severity:** P0 — CRITICAL (money loss: customer charged more than the inclusive price)  
**Risk:** CRITICAL (order flow, billing, tax, settlement, printing — R5+R6)  
**Process required:** Full gate flow + regression. FAST LANE eligible? **NO**  
**Sprint:** TBD  

---

## Description

When a food item is configured with `Tax Calc: Inclusive` (i.e. the menu price already contains GST), the Collect Payment Grand Total — and the backend payload `order_amount` — adds the tax **on top** of the item price, effectively double-counting it.

**Example:**  
- Item "food incl" configured: Price ₹100, Tax %: 5, Tax Calc: **Inclusive**  
- Expected Grand Total: **₹100** (tax is already in the price)  
- Actual Grand Total: **₹105** (₹100 + CGST 2.38 + SGST 2.38, rounded up)

The same break-point exists in **4 separate files** that each independently compute a "grand total":

| # | File | Line | Formula | Bug |
|---|------|------|---------|-----|
| 1 | `CollectPaymentPanel.jsx` | L808 | `rawFinalTotal = subtotal + sgst + cgst + vat` | subtotal already includes inclusive tax |
| 2 | `orderTransform.js` (calcOrderTotals) | L910 | `rawTotal = postDiscount + SC + tip + delivery + totalTax` | postDiscount already includes inclusive tax |
| 3 | `OrderEntry.jsx` | L924 | `rawLocalTotal = localSubtotal + localSC + localScGst + localTax` | localTax includes inclusive taxAmt |
| 4 | `CartPanel.jsx` (QSR) | L451 | `rawFinalTotal = subtotal + sgst + cgst + vatAmount` | subtotal already includes inclusive tax |

---

## Evidence

- **Screenshot:** Owner-submitted PDF `05_11_2026 12_55 bugs-frontend.pdf` — Page 1 shows "food incl" ₹100 with Grand Total ₹105; Page 3 shows Quick Edit with Tax Calc: Inclusive, Tax %: 5
- **Steps to reproduce:**
  1. Configure a food item with Tax Calc = Inclusive, GST % = 5, Price = ₹100
  2. Add item to a new order
  3. Open Collect Payment
  4. Grand Total shows ₹105 instead of ₹100
- **Source:** OWNER-REPORTED (PDF) + AGENT-DISCOVERED (code trace in investigation)
- **Confidence:** CONFIRMED (code-traced, formula-verified — see investigation report)
- **Investigation report:** `/app/memory/evidence/BUG-TAX-INCL-GST-OFF/INVESTIGATION_REPORT_2026_11_05.md`

---

## Duplicate Check

**DISTINCT.**

- BUG-431 (CheckInPage GST re-apply): similar double-count pattern but in PMS check-in flow (different component, different data path). RELATED but not duplicate.
- BUG-305 (discountRatio subtotal): GST proration bug, not about inclusive tax. DISTINCT.
- BUG-336 (GST when disabled): about gstStatus display gating, not inclusive calculation. DISTINCT.
- BUG-359 (Settings tax cleanup): removed Inclusive from ProductForm UI dropdown, but did not fix the Grand Total formula. DISTINCT.

---

## Blast Radius

- `rawFinalTotal` referenced in **7 lines** across 2 files (CollectPaymentPanel + CartPanel)
- `isInclusive` referenced in **29 lines** across ~10 files
- `calcOrderTotals` called from **4 transform functions** (placeOrder, updateOrder, placeOrderWithPayment, internal)
- Hotspot files touched: **YES** — CollectPaymentPanel.jsx (R5), orderTransform.js (R5), OrderEntry.jsx (R5), CartPanel.jsx
- Estimated scope: **LARGE (4+ files, ~50 lines)**

---

## Open Questions

- **OD-646-01:** For mixed orders (some items inclusive, some exclusive), should the TAXES section label say "(incl.)" next to the inclusive portion? Or just show the tax breakdown as-is (informational for inclusive, additive for exclusive)?
- **OD-646-02:** Should `order_sub_total_without_tax` in the payload subtract inclusive tax from the item total (to make the field name accurate), or keep it as-is (item total including inclusive tax)?
