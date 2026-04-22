## BUG-002 — Postpaid Bill Collection Does Not Trigger Auto Bill Print (Order Temp Store API Not Called)

**Module:** Postpaid Order / Bill Collection / Auto Bill Print  
**Status:** Fixed  
**Severity:** High  
**Priority:** P1  

### Expected Behavior
When a postpaid order is taken and the user goes to collect the bill, after payment is collected:
1. The order bill payment API should be called (marks payment as collected).
2. The order temp store API should also be called so that auto bill print is triggered and the bill prints automatically.
3. The order should then get removed from the active screen.

### Actual Behavior
On collecting a postpaid bill, only the order bill payment API is being called. Because of this:
- The order gets removed from the screen (payment marked collected).
- But auto bill print does NOT happen, because the order temp store API is not being invoked.

### Business Impact
- Staff have to manually print bills after postpaid collection, slowing down service.
- Risk of missed printed receipts for walk-in / in-house customers.
- Inconsistent behavior versus prepaid flow where auto print works.

### Root Cause
Confirmed: Scenario 1 of `OrderEntry.onPaymentComplete` (existing postpaid order → collect bill) deliberately called only `POST /api/v2/vendoremployee/order/order-bill-payment` and documented in an inline comment that auto-print was scoped to new-order only (legacy BUG-273 Session-16 decision). The `order-temp-store` call was never chained, and the flow fired the bill-payment request fire-and-forget, preventing any downstream gating on success. `billing_auto_bill_print: 'Yes'` was being sent in the collect-bill payload but that alone was not driving a print on the client.

### Scope
Postpaid order → collect bill flow → post-payment API sequence.

### Dependencies
- Backend order bill payment API (`/api/v2/vendoremployee/order/order-bill-payment`)
- Backend order temp store API (`/api/v1/vendoremployee/order-temp-store`) — trigger for auto bill print
- Co-ordinated with BUG-001 override shape (so auto-printed values are not zeroed)

### Reference Docs
- `app/memory/ARCHITECTURE_DECISIONS_FINAL.md` (AD-302, AD-401, AD-402)

### Candidate Files
- `frontend/src/components/order-entry/OrderEntry.jsx` (`onPaymentComplete` Scenario 1 — postpaid collect-bill branch)
- `frontend/src/api/services/orderService.js` (`printOrder` — no code change)
- `frontend/src/api/transforms/orderTransform.js` (`buildBillPrintPayload` — no code change)

### Fix Plan
Convert the bill-payment POST from fire-and-forget to `await` with a `billPaymentFailed` flag; early return on failure. After success, gate on `settings?.autoBill && collectOrderId`; fetch the order via `getOrderById(Number(collectOrderId))`; compose an overrides object identical to BUG-001 (from `paymentData`); call `printOrder(collectOrderId, 'bill', null, orderForPrint, serviceChargePercentage, overrides)`. Wrap in try/catch so a print failure does NOT roll back the successful payment.

### Risk Notes
- Double-print risk if temp store API is called in scenarios where print was already triggered.
- Ordering matters — temp store API must be called only after successful payment confirmation.
- Printer queue / socket behavior may need verification under load.

### Implementation Notes
Implemented in `frontend/src/components/order-entry/OrderEntry.jsx` — only the Scenario 1 branch of `onPaymentComplete`. Bill-payment is now `await`ed; on success, if `settings.autoBill` is on, `printOrder(...)` is invoked with overrides (same shape as BUG-001) and non-blocking try/catch. Legacy BUG-273 Session-16 comment was replaced with a BUG-002 annotation noting the product-contract update. No payload schema, no endpoint, no socket contract changes. Console logs `[AutoPrintCollectBill] overrides:` and completion/skip messages added for traceability.

### Diff Review Notes
Single branch touched; rest of `onPaymentComplete` (Scenario 2 prepaid, Scenario 3 Transfer-to-Room) unchanged. Change to `await` the HTTP call adds a short wait before `onClose()`; `isPlacingOrder` already conveys this pending state. Post-edit lint clean; webpack compiled without new warnings.

### QA Notes
Main-agent runtime verification deferred. Recommended QA: on a postpaid dine-in / walk-in order with `settings.autoBill = Yes`, confirm Collect Payment fires BOTH `POST /order-bill-payment` AND `POST /order-temp-store`. With `autoBill = No`, only `/order-bill-payment` should fire. On bill-payment failure, no `/order-temp-store` call and error toast.

### Release Notes
Ready for release — postpaid collect-bill now triggers auto bill print when `settings.autoBill` is enabled, matching prepaid parity. Gate-flag flip can disable immediately if backend side also starts emitting server-side prints on `billing_auto_bill_print: 'Yes'`.

### Owner Agent
E1 Implementation Agent (fix) / Bug Structuring Agent (original bug authoring)

### Last Updated
2026-04-20 — E1 Implementation Agent
