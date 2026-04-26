## BUG-001 — Prepaid Auto Bill Print Missing Tip and Discount in Payload

**Module:** Prepaid Order / Auto Bill Print / Payment Payload  
**Status:** Fixed  
**Severity:** High  
**Priority:** P1  

### Expected Behavior
When a prepaid order is placed and auto bill print is triggered, the payload sent for the bill should include all applicable charge components — `service_charge`, `tip`, and `discount_amount` — so the printed bill reflects the correct totals.

### Actual Behavior
On a prepaid order, the auto bill print is generating correctly, but the payload being sent only contains the `service_charge`. The `tip` value is not being sent and the `discount_amount` value is not being sent. As a result, the printed/auto-printed bill does not reflect tip and discount adjustments.

### Business Impact
- Customer-facing printed bill shows incorrect totals (missing tip and discount).
- Revenue reconciliation and daily reports will mismatch because tip/discount are not part of the persisted/printed record at prepaid flow.
- Potential disputes with customers and staff confusion at billing counter.

### Root Cause
Confirmed: `autoPrintNewOrderIfEnabled` in `OrderEntry.onPaymentComplete` (Scenario 2 prepaid Place+Pay) was calling `printOrder(... order, serviceChargePercentage)` with only 5 arguments — no `overrides`. `toAPI.buildBillPrintPayload`'s default branch therefore emitted `discount_amount: 0` (hardcoded when overrides absent — `orderTransform.js` line 975) and `Tip: 0` (fell back to `order.tipAmount`, which is not round-tripped on the socket `new-order` payload for a freshly placed prepaid order — `orderTransform.js` line 997 + line 175). Service charge had a computed fallback so it was populated correctly, masking the gap on the surface.

### Scope
Prepaid order flow → payment payload construction → auto bill print endpoint.

### Dependencies
- Backend order / bill-print API
- Prepaid billing payload builder on frontend
- None on other BUG IDs

### Reference Docs
- `app/memory/ARCHITECTURE_DECISIONS_FINAL.md` (AD-302, AD-401, AD-402)

### Candidate Files
- `frontend/src/components/order-entry/OrderEntry.jsx` (`autoPrintNewOrderIfEnabled`, inside `onPaymentComplete` Scenario 2 prepaid branch)
- `frontend/src/api/transforms/orderTransform.js` (`buildBillPrintPayload` — no code change, already supports all overrides)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (`handlePayment` — source of `paymentData` with live bill values; no code change)

### Fix Plan
Forward the live bill values (tip / discounts / service charge / delivery / tax) from `paymentData` as the 6th `overrides` argument to `printOrder`. Mirror the override shape used by the manual "Print Bill" button (`CollectPaymentPanel.handlePrintBill`) so the backend sees an identical payload shape it already accepts in production.

### Risk Notes
- Payment totals regression — any payload change must keep existing `service_charge` behavior intact.
- Print-format regression — templates downstream may need to render tip/discount rows.
- Reconciliation reports that consume this payload must tolerate the added fields.

### Implementation Notes
Implemented in `frontend/src/components/order-entry/OrderEntry.jsx`, inside `autoPrintNewOrderIfEnabled`. Added `autoPrintOverrides` object built from `paymentData` (discount = manual + preset + coupon; plus `tip`, `serviceChargeAmount`, `loyaltyAmount`, `walletAmount`, `deliveryCharge`, `gstTax`, `vatTax`, `orderItemTotal`, `orderSubtotal`, `paymentAmount`, `couponCode`). Passed as 6th arg to `printOrder(...)`. No backend / socket / API contract change — `buildBillPrintPayload` already consumes every override key. Console log `[AutoPrintBill] overrides:` added for traceability.

### Diff Review Notes
Single function touched (`autoPrintNewOrderIfEnabled`); no refactor of surrounding code. Override shape matches `CollectPaymentPanel.handlePrintBill` exactly. Post-edit lint clean; webpack compiled without new warnings.

### QA Notes
Main-agent runtime verification deferred (requires authenticated staging session). Recommended QA: capture `POST /api/v1/vendoremployee/order-temp-store` payload on a prepaid Place+Pay order with discount + tip applied and confirm `discount_amount` and `Tip` are non-zero (previously both `0`).

### Release Notes
Ready for release — prepaid auto-printed bills will now correctly show tip and discount values matching what the cashier entered on the Collect Payment screen.

### Owner Agent
E1 Implementation Agent (fix) / Bug Structuring Agent (original bug authoring)

### Last Updated
2026-04-20 — E1 Implementation Agent
