## BUG-013 — Service Charge Applied to Takeaway and Delivery (Should Be Dine-In and Room Only)

**Module:** Billing / Service Charge / Order Type Logic  
**Status:** Fixed  
**Severity:** High  
**Priority:** P1  

### Expected Behavior
Service charge should apply ONLY to dine-in, walk-in, and room orders. Takeaway and delivery orders should NOT have service charge.

### Actual Behavior
Service charge was applied to ALL order types when the restaurant had `serviceCharge` feature enabled. The `orderType` prop was available in `CollectPaymentPanel` but was never used to gate the SC calculation or toggle visibility.

### Business Impact
- Takeaway and delivery customers were being overcharged with service charge.
- Incorrect totals on bills for non-dine-in orders.
- API payloads included `service_tax` for orders that shouldn't have it.

### Root Cause
Confirmed: No `orderType` check existed in the service charge calculation (`CollectPaymentPanel.jsx` line 219) or the SC toggle render (line 588). `serviceCharge` was computed purely from `serviceChargeEnabled && serviceChargePercentage > 0` without any order-type filtering. Similarly, `OrderEntry.jsx` passed `restaurant.serviceChargePercentage` to all transform call-sites regardless of order type.

### Scope
- `CollectPaymentPanel.jsx`: SC calculation, SC toggle UI (default + room branch), SC read-only display row.
- `OrderEntry.jsx`: 3 transform call-sites (`updateOrder`, `placeOrder`, `placeOrderWithPayment`).

### Dependencies
- Backend must align — if backend also applies SC to takeaway/delivery, there would be a frontend-backend mismatch. Verify backend behavior.
- AD_UPDATES_PENDING Entry #8 created for documentation agent to add new AD.

### Reference Docs
- `app/memory/AD_UPDATES_PENDING.md` (Entry #8 — new AD for SC order-type gating)

### Candidate Files
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (SC calculation, SC toggle, SC display row)
- `frontend/src/components/order-entry/OrderEntry.jsx` (3 `serviceChargePercentage` pass-throughs to transforms)
- `frontend/src/api/transforms/orderTransform.js` (`calcOrderTotals` — no change needed, receives 0 from caller)

### Fix Applied
**CollectPaymentPanel.jsx**:
- Added: `const scApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom;`
- SC calculation gated: `scApplicable && serviceChargeEnabled && serviceChargePercentage > 0`
- SC toggle UI gated: `scApplicable && serviceChargePercentage > 0`
- SC read-only display row gated: `scApplicable && serviceChargePercentage > 0 && serviceChargeEnabled`

**OrderEntry.jsx** — 3 call-sites now pass `serviceChargePercentage: 0` for non-applicable types:
- `serviceChargePercentage: (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom) ? (restaurant?.serviceChargePercentage || 0) : 0`

### Verification
- Create takeaway order → SC toggle hidden, SC = 0 in total.
- Create delivery order → SC toggle hidden, SC = 0 in total.
- Create dine-in order → SC toggle visible, SC calculated normally.
- Create room order → SC toggle visible, SC calculated normally.

### Regression Risk
- Takeaway/delivery totals will be lower (no SC). Backend must be verified for consistency.
