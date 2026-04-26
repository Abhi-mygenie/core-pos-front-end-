## BUG-006 — Service Charge Calculated Before Discount (Should Be After Discount, Then Taxes)

**Module:** Billing / Collect Payment / Bill Print / Place+Pay
**Status:** Fixed
**Severity:** High
**Priority:** P0

### Expected Behavior
Billing ordering per AD-101: `items → discount → service charge → tax → tip`. Service charge is computed on the post-discount subtotal; GST applies to items (post-discount), service charge, tip, and delivery charge using the weighted-average item GST rate.

### Actual Behavior (pre-fix)
- `CollectPaymentPanel.jsx` computed SC on pre-discount `itemTotal`.
- Item tax was on pre-discount gross line prices.
- SC GST was coded but silently absent from rendered SGST/CGST in some data shapes.
- Tip and delivery charge had no GST applied.
- `calcOrderTotals` in `orderTransform.js` (used by place-order / place-order-with-payment / update-order payloads) computed SC on pre-discount subtotal.
- `buildBillPrintPayload` default branch same.
- A separate `printTaxTotals` memo existed to apply discount-proration for print-only (AD-105 drift).

### Business Impact
- Customers overcharged when discount + SC combined (SC base too high → SC too high → final total too high).
- UI values and API payloads disagreed with AD-101.
- UI values and print values could drift due to separate print-only tax path.

### Root Cause
- SC base was hard-coded to `itemTotal` instead of `subtotalAfterDiscount` in UI and transforms.
- Item GST not prorated by discount ratio.
- Tip / delivery not included in tax base.
- Two separate tax calculation paths (UI vs print) created AD-105 drift.

### Scope
Collect Payment UI math + bill print payload + collect-bill payload + prepaid Place+Pay payload. Update-order untouched (hardcoded `self_discount: 0` → math identity).

### Reference Docs
- `app/memory/ARCHITECTURE_DECISIONS_FINAL.md` (AD-101 / AD-105 / AD-302 / AD-501 / AD-502)
- `app/memory/AD_UPDATES_PENDING.md` (Entries #1, #2, #3, #5)

### Candidate Files
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- `frontend/src/api/transforms/orderTransform.js` (`calcOrderTotals`, `placeOrderWithPayment`, `buildBillPrintPayload`)

### Fix Plan (shipped)
1. **Math (AD-101 + Apr-2026 business decision that GST applies to SC/tip/delivery)**:
   - `CollectPaymentPanel.jsx` lines 216–239 rewritten: SC on `subtotalAfterDiscount`; item GST prorated by `(1 − discountRatio)`; new `scGst`, `tipGst`, `deliveryGst` via `avgGstRate`; `totalGst` split 50/50 into SGST/CGST.
   - Removed separate `printTaxTotals` memo — UI is single source of truth (AD-105 alignment).
   - `handlePrintBill` overrides now use UI `sgst + cgst` directly.
   - `paymentData.printGstTax`/`printVatTax` mirror UI values (no drift).
2. **Transforms (`orderTransform.js`)**:
   - `calcOrderTotals` signature extended to accept `{ discountAmount, tipAmount, deliveryCharge }`.
   - `placeOrderWithPayment` threads `paymentData.discounts.total`, `tip`, `deliveryCharge` into `calcOrderTotals`. Also fixes `tip_amount` field (was hardcoded `'0'`).
   - `buildBillPrintPayload` default branch honors `overrides.discountAmount`, `overrides.tip`, `overrides.deliveryCharge` in SC base and GST markup.
3. **AD updates**: NOT applied by implementation agent per scope rule. Handoff captured in `AD_UPDATES_PENDING.md` for documentation agent — AD-101 tag flip, AD-105 re-assessment, AD-302 re-assessment, with explicit Apr-2026 addendum on GST-on-SC/tip/delivery.

### UX Follow-up (Apr-2026, same file scope)
Two passes after math was validated, strictly in `CollectPaymentPanel.jsx` (no math / prop / API / socket change):

- **v1 — "put discount down and it shows up"**:
  - Discount / Coupon / Loyalty / Wallet cards relocated from AFTER Bill Summary to BEFORE it under a new "🎛 Adjustments" header.
  - Bill Summary labeled "📋 Bill Summary — computed, read-only."
  - New "↳ Post-discount" row added for AD-101 transparency.
  - SC row gained inline base hint ("on ₹X") when discount active.

- **v2 — "SC and tips should also be part of adjustment"**:
  - SC toggle / Tip input / Delivery Charge input moved from inside Bill Summary → into Adjustments as compact one-line cards.
  - Bill Summary now fully read-only: SC / Delivery / Tip appear as computed display rows (rendered only when applicable).
  - Inline rate hint in SC display row (`Service Charge @ 10% on ₹X`).
  - `data-testid` semantic shift (documented in BUG_TEMPLATE.md).

Room-with-associated-orders branch intentionally untouched in both passes.

### Verification
**Math sanity (programmatic, Node replica)** — matches user screenshot scenarios:
- SS1 (no discount, no tip, 10% SC, 5.5% GST, ₹1,162 items) → Final ₹1,349 (was ₹1,343; +₹6 because SC GST is now correctly included).
- SS2 (₹232 discount, no tip) → Final ₹1,080 (was ₹1,111; −₹31 AD-101 correction).
- SS3 (₹20 discount, ₹700 tip) → Final ₹2,064 (was ₹2,023; +₹41 for tip GST).

**Regression**: zero-discount / zero-tip / zero-delivery / SC-off orders — final total unchanged (math identity).

### Risk Notes
- Every restaurant using SC + discount sees corrected (lower) totals effective immediately. Intended per AD-101.
- Zero-discount orders with SC > 0 may see a small +₹ bump because SC GST is now correctly included in displayed tax (pre-fix render silently dropped it).
- Tip-bearing orders now taxed — small +₹ bump per business decision.
- Backend payload keys unchanged; only values shift.
- Update-order path unchanged (math identity).

### Owner Agent
E1 Senior QA Documentation Agent (QA evidence) / E1 Implementation Agent (fix + UX v1 + UX v2)

### Last Updated
2026-04-20 — E1 Implementation Agent
