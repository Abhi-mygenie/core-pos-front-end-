## BUG-005 — Print Bill Button Missing on Prepaid Orders in Collect Bill Screen

**Module:** Billing / Print Bill / Collect Payment
**Status:** Closed — not a business requirement
**Severity:** Low (closed)
**Priority:** n/a

### Expected Behavior (as originally reported)
Cashiers should be able to print the bill for a prepaid order directly from the Collect Payment screen, same as postpaid orders.

### Actual Behavior
On the Collect Payment screen for a prepaid (Place+Pay, Scenario 2) order, no Print Bill button is visible. The control is gated behind `hasPlacedItems && onPrintBill`, and prepaid pre-place orders have `placed: false` across all cart items.

### Resolution
**Closed on 2026-04-20 per user decision**: "not a business requirement and against architecture decisions."

- No code change.
- AD-303 reference remains in `app/memory/ARCHITECTURE_DECISIONS_FINAL.md` but is not pursued in this iteration.
- Any future reconsideration would require (a) a product decision on pre-place bill printing and (b) backend contract for a pre-place print payload (no `order_id`).

### Root Cause (still valid for future reference)
1. UI gate: `{hasPlacedItems && onPrintBill && (...)}` in `CollectPaymentPanel.jsx` hides the button when no items are placed.
2. Handler precondition: `onPrintBill` in `OrderEntry.jsx` early-returns when `effectiveTable?.orderId || placedOrderId` is null.
3. Payload precondition: `buildBillPrintPayload` in `orderTransform.js` assumes `order.rawOrderDetails` (socket-hydrated placed-order data) is present.

### Files Reviewed (during QA pass)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 355–431)
- `frontend/src/components/order-entry/OrderEntry.jsx` (lines 481–525, 955–1002)
- `frontend/src/api/transforms/orderTransform.js` (lines 867–1004)
- `frontend/src/api/services/orderService.js` (lines 132–151)

### Reference Docs
- `app/memory/ARCHITECTURE_DECISIONS_FINAL.md` (AD-303 — noted as gap)
- `app/memory/BUG_TEMPLATE.md` (BUG-005 entry)

### Owner Agent
E1 Senior QA Documentation Agent (QA evidence) / E1 Implementation Agent (closure)

### Last Updated
2026-04-20 — E1 Implementation Agent
