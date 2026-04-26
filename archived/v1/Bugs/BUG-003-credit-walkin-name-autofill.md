## BUG-003 — Credit Payment Method Auto-Fills "Walk-in" in Name Field for Walk-in Postpaid Orders

**Module:** Postpaid Order / Collect Bill / Credit Payment Method  
**Status:** Fixed  
**Severity:** Medium  
**Priority:** P2  

### Expected Behavior
When a postpaid order is a walk-in order and the user selects `Credit` as the payment method during bill collection, the `Name` field should be empty (or left for manual entry) so staff can capture the actual credit customer's name. It should not be auto-filled with "Walk-in".

### Actual Behavior
When the payment method is set to `Credit` on a walk-in postpaid order, the `Name` field is automatically pre-filled with "Walk-in" by default. This is incorrect — credit accounts must be tied to a real named customer, not to a generic walk-in label.

### Business Impact
- Credit entries get booked against "Walk-in", making it impossible to track who owes money.
- Creates reconciliation and collection issues for outstanding credit.
- Staff may miss overriding the field and commit bad data.

### Root Cause
Confirmed. `orderTransform.order()` emits `customer` as a display-label field (`'Walk-In'` / `'TA'` / `'Del'` synthetic placeholders when no real customer name was captured) and separately exposes `customerName` as the actual user-entered name (empty when none). `OrderEntry.jsx` hydration effect used the wrong field with an ineffective guard: `name: orderData.customer !== 'WC' ? (orderData.customer || '') : ''` — the guard checked against `'WC'` (which the transform never emits), so the synthetic label leaked into local `customer.name`. `CollectPaymentPanel` then seeded `tabName` (Credit Name field) from `customer.name`, so the Credit Name input pre-filled with `"Walk-In"` (or `"TA"`/`"Del"` for takeaway/delivery). User confirmed the same behavior on both prepaid and postpaid — both paths go through the same hydration effect.

### Scope
Prepaid + Postpaid bill collection flow → Credit payment method → Name field initialization (walk-in / takeaway / delivery unnamed orders).

### Dependencies
- Frontend collect-bill form state
- Payment method selection logic
- None on other BUG IDs

### Reference Docs
- `app/memory/ARCHITECTURE_DECISIONS_FINAL.md`

### Candidate Files
- `frontend/src/components/order-entry/OrderEntry.jsx` (two `setCustomer({name, phone})` spots inside the hydration effect)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (`tabName` initial value, unchanged — naturally corrects once upstream is fixed)
- `frontend/src/api/transforms/orderTransform.js` (`order()` — no code change; transform already exposes the correct `customerName` field)

### Fix Plan
At both hydration sites in `OrderEntry.jsx`, replace the faulty guard with `name: orderData.customerName || ''` so the local `customer.name` is sourced from the real user-entered name (empty when not provided). Same field the printed bill's `custName` already consumes (`buildBillPrintPayload` line 982), unifying the source of truth across OrderEntry, CollectPaymentPanel, CustomerModal, and the printed bill.

### Risk Notes
- Must not regress non-walk-in orders where the customer name is legitimately pre-filled.
- Validation should still block empty credit submissions to avoid blank credit records.

### Implementation Notes
Implemented in `frontend/src/components/order-entry/OrderEntry.jsx` — two single-line logic changes in the same hydration effect block (savedCart branch and orderData branch). Both now use `name: orderData.customerName || ''`. Added BUG-003 annotation comments at both sites. No other files touched. `CollectPaymentPanel` `tabName` seeding is unchanged and now naturally reads the corrected value. Tracks both prepaid and postpaid paths (same effect block hydrates both) and additionally fixes the same synthetic-label leak for TakeAway (`'TA'`) and Delivery (`'Del'`) unnamed orders.

### Diff Review Notes
Transform layer untouched — the real field already existed. Downstream consumers (`CustomerModal` `initialData`, `tabContact.name` submit payload) naturally behave correctly: the Credit submit now sends empty string when the cashier didn't type a name (was previously sending literal `"Walk-In"`/`"TA"`/`"Del"`). Post-edit lint clean; webpack compiled without new warnings.

### QA Notes
Main-agent runtime verification deferred. Recommended QA scenarios: (1) walk-in prepaid & postpaid + Credit → Name field empty; (2) walk-in with real name captured + Credit → Name field pre-fills with real name; (3) TakeAway / Delivery unnamed + Credit → Name field empty; (4) Dashboard/table-card display labels (`'Walk-In'`) and printed bill `custName` unchanged (regression check).

### Release Notes
Ready for release — Credit Name field no longer auto-fills with the synthetic label for walk-in / takeaway / delivery unnamed orders, enabling correct credit customer capture.

### Owner Agent
E1 Implementation Agent (fix) / Bug Structuring Agent (original bug authoring)

### Last Updated
2026-04-20 — E1 Implementation Agent
