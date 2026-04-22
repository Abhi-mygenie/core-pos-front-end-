## BUG-007 — Place Order Payload for Delivery Orders Missing Full `delivery_address` Object

**Module:** Delivery Orders / Place Order / Place+Pay / Payload Integrity
**Status:** Fixed (frontend side); backend persistence pending
**Severity:** High
**Priority:** P1

### Expected Behavior
For delivery orders, the place-order payload must include a structured `delivery_address` object (contact person name/number, address type, address string, pincode, floor/road/house, nested lat/lng) alongside the existing CRM `address_id`. Backend needs the full object to process and route the delivery.

### Actual Behavior (pre-fix)
`toAPI.placeOrder`, `toAPI.placeOrderWithPayment`, and `toAPI.updateOrder` only emitted `address_id: <id>`. No structured address object was sent. This applied to delivery and non-delivery order types uniformly (the transforms did not differentiate).

### Business Impact
- Delivery routing, customer contact, and pincode-based dispatch could not be completed on the backend without this data.
- Backend team had to repeatedly request "full delivery info" payload compliance.

### Root Cause
Payload builders accept only `addressId` in `options`; no support for the full address object. Even though `AddressFormModal`/`AddressPickerModal` produce a complete `selectedAddress` object in `OrderEntry.jsx`, only its `.id` field was passed down to the transforms.

### Scope (confirmed with user on 2026-04-20)
- Apply to `placeOrder` (postpaid new order) + `placeOrderWithPayment` (prepaid Place+Pay) only.
- `updateOrder` explicitly NOT modified — delivery orders are not editable per user.
- `address_id` always a real CRM id (never null, never local string) — if address is new, it's pushed to CRM first to obtain an id.
- Payload shape frozen with user (snake_case keys, nested `location`, nullable `floor`/`road`/`house`).

### Reference Docs
- `app/memory/ARCHITECTURE_DECISIONS_FINAL.md` (AD-203 / AD-203A / AD-203B — CRM address sourcing; no explicit AD for this wire shape yet)
- `app/memory/AD_UPDATES_PENDING.md` (Entry #6 — backend persistence gap handoff)

### Candidate Files
- `frontend/src/api/transforms/orderTransform.js`
- `frontend/src/components/order-entry/OrderEntry.jsx`

### Fix Plan (shipped)
1. New module-level helper `buildDeliveryAddress(addr)` (before `export const toAPI`) — maps `selectedAddress` UI state to the wire shape:
   ```json
   {
     "contact_person_name":   "<contactPersonName>",
     "contact_person_number": "<contactPersonNumber>",
     "address_type":          "<addressType>",
     "address":               "<address>",
     "pincode":               "<pincode>",
     "floor":                 <addr.floor || null>,
     "road":                  <addr.road  || null>,
     "house":                 <addr.house || null>,
     "location": { "latitude": <num|null>, "longitude": <num|null> }
   }
   ```
2. `placeOrder`: accepts `deliveryAddress` in options; emits `delivery_address` in payload when `orderType === 'delivery'` AND a delivery address is provided. `address_id` emission unchanged.
3. `placeOrderWithPayment`: same treatment.
4. `OrderEntry.jsx`: 2 call-sites now pass `deliveryAddress: selectedAddress || null` in options (postpaid `handlePlaceOrder` + prepaid Place+Pay branch).

### Backend Gap Identified (handoff — Apr-2026)
- Verified via preprod cURL on 2026-04-20: `POST /api/v2/vendoremployee/order/place-order` returned HTTP 200 with new payload (order 731449 created).
- Re-fetched via `POST /api/v2/vendoremployee/get-single-order-new` → `orders[0].delivery_address = None`. Backend silently drops the field at the storage layer.
- Column exists in response schema; the insert path does not populate it.
- Frontend ships the correct payload regardless; when backend adds persistence, no further client change is needed.
- Handoff captured in `app/memory/AD_UPDATES_PENDING.md` Entry #6 — payload shape + cURL evidence + required backend actions documented.

### Risk Notes
- Additive field only → non-delivery flows untouched.
- Backend currently ignores unknown keys → no breakage today.
- If backend comes back with a different key shape, only `buildDeliveryAddress` (single function) needs adjustment.
- `updateOrder` deliberately left unchanged per user scope.

### Edge Cases Handled
- Non-delivery order types → `delivery_address` key omitted entirely.
- `selectedAddress` missing on a delivery order → `delivery_address` omitted; `address_id` behavior unchanged.
- Manual-typed address (no Places autocomplete) → `location.latitude`/`longitude` = `null`.
- Defensive defaults: empty strings for "expected" fields, `null` for "optional" fields per user's sample.

### Verification
- cURL with new payload shape → HTTP 200 (accepted).
- Webpack compiled clean, lint passes.
- Non-delivery flows unchanged (verified via code review of conditional emission).

### Release Notes
Ready for release on frontend side. Backend team to land persistence for `delivery_address` JSON column on place-order endpoint; see AD_UPDATES_PENDING.md Entry #6 for exact payload shape and required actions.

### Owner Agent
E1 Senior QA Documentation Agent (QA evidence + curl validation) / E1 Implementation Agent (fix)

### Last Updated
2026-04-20 — E1 Implementation Agent
