## BUG-012 — Delivery Order Address Not Showing in UI and Not Printing on Bill

**Module:** Delivery Orders / Order Editing / Bill Print  
**Status:** Fixed (print path) — backend persistence still pending  
**Severity:** High  
**Priority:** P1  

### Expected Behavior
- When editing a delivery order, the previously saved delivery address should display in the UI.
- The printed bill (auto and manual) should include the full delivery address (name, address, type, pincode, phone).

### Actual Behavior
- On order re-edit: address strip shows "Tap to select delivery address *" instead of the saved address.
- On printed bill: `deliveryCustAddress`, `deliveryAddressType`, `deliveryCustPincode` are all empty.
- `deliveryCustName` uses the order display label (e.g., "Del") instead of the contact person from the address.

### Business Impact
- Delivery staff cannot see the address on the printed bill.
- Cashier editing a delivery order has to re-select the address manually.
- Customer-facing bill is incomplete.

### Root Cause
Two-part issue:
1. **Backend drops `delivery_address`** at storage layer (confirmed in BUG-007 / AD_UPDATES_PENDING Entry #6). Frontend sends it correctly in `placeOrder` payload, backend returns HTTP 200, but `delivery_address` is `null` when fetched back via socket or GET single-order.
2. **Print payload didn't use `selectedAddress`**: `buildBillPrintPayload` read delivery fields from `order.deliveryAddress` (null from backend) and had `deliveryAddressType`/`deliveryCustPincode` hardcoded to empty. The `selectedAddress` available in `OrderEntry` state was never threaded into overrides.

### Scope
- Print payload: Fixed (all 3 print paths — manual, auto-print prepaid, auto-print collect-bill).
- UI address on re-edit: Depends on backend persistence fix (not in frontend scope).

### Dependencies
- **Backend persistence required** for UI re-edit fix: Backend must persist and return `delivery_address` in order responses.
- Print fix is self-contained — uses `selectedAddress` from `OrderEntry` state.

### Reference Docs
- `app/memory/AD_UPDATES_PENDING.md` (Entry #6 — BUG-007 backend persistence gap)
- `app/memory/BUG_TEMPLATE.md` (BUG-012 full QA section)

### Candidate Files
- `frontend/src/components/order-entry/OrderEntry.jsx` (`onPrintBill` handler, `autoPrintOverrides`, `collectBillOverrides` — 3 print paths)
- `frontend/src/api/transforms/orderTransform.js` (`buildBillPrintPayload` — delivery fields, lines ~1061-1065)

### Fix Applied (Print Path)
**OrderEntry.jsx** — 3 print paths inject `deliveryAddress: selectedAddress` into overrides:
1. Manual print (`onPrintBill` handler): `{ ...overrides, deliveryAddress: selectedAddress }` when orderType is delivery.
2. Auto-print prepaid (`autoPrintOverrides`): spread `deliveryAddress: selectedAddress`.
3. Auto-print collect-bill (`collectBillOverrides`): spread `deliveryAddress: selectedAddress`.

**orderTransform.js** — `buildBillPrintPayload` reads `overrides.deliveryAddress` first, falls back to `order.deliveryAddress`:
- `deliveryCustName`: `overrides.deliveryAddress?.contactPersonName || order.deliveryAddress?.contact_person_name || order.customer`
- `deliveryAddressType`: `overrides.deliveryAddress?.addressType || order.deliveryAddress?.address_type`
- `deliveryCustAddress`: `overrides.deliveryAddress?.address || order.deliveryAddress?.formatted || order.deliveryAddress?.address`
- `deliveryCustPincode`: `overrides.deliveryAddress?.pincode || order.deliveryAddress?.pincode`
- `deliveryCustPhone`: `overrides.deliveryAddress?.contactPersonNumber || order.deliveryAddress?.contact_person_number || order.phone`

### Verification
- Place delivery order with address → print bill → all 5 delivery fields populated.
- Auto-print on prepaid delivery → address on printed bill.
- Auto-print on collect-bill delivery → address on printed bill.

### Remaining Work (Backend)
- Backend must persist `delivery_address` for UI re-edit to work.
- See AD_UPDATES_PENDING Entry #6 for full handoff details.

### Regression Risk
None — overrides take priority; when `overrides.deliveryAddress` is undefined, falls back to previous behavior (`order.deliveryAddress`).
