# OPEN QUESTIONS FROM CODE

> Generated: July 2025 | Source: `main` branch, static code analysis
> Questions are derived from contradictions, unclear patterns, and missing context in the code

---

## Business Logic Questions

### OQ-001: What is the rounding rule for order totals?

- **Context**: `orderTransform.js` `calcOrderTotals` (lines 374-403) uses a specific rounding logic:
  - If `(Math.ceil(rawTotal) - rawTotal) >= 0.10` → round UP to ceiling
  - Otherwise → round DOWN with `Math.floor`
- **v3 update**: `rawTotal` now includes service charge: `rawTotal = subtotal + serviceCharge + totalTax`
- **Question**: Is the 0.10 threshold a business decision? Why not standard rounding? Does the backend use the same threshold?
- **Impact**: Financial discrepancy if frontend and backend disagree
- **Confidence in understanding**: MEDIUM
- **Evidence**: `orderTransform.js` lines 388-403

### OQ-002: When should orders be removed vs updated?

- **Context**: Socket handlers have complex logic for deciding whether to `removeOrder` (take off running list) or `updateOrder`:
  - `update-order-source` + cancelled/paid → remove
  - `update-order-paid` + cancelled/paid → remove  
  - `update-order-status` + cancelled/paid → remove
  - `split-order` → **always update** (reduces original order's items, never removes)
  - Other events with cancelled/paid → update (not remove)
- **Question**: Why does `update-order` (handleOrderDataEvent with 'update-order' event name) NOT remove cancelled/paid orders? Is this intentional?
- **Impact**: Cancelled/paid orders might persist on dashboard in certain event sequences
- **Evidence**: `socketHandlers.js` lines 262-263 — `shouldRemove` only for source/paid events; `handleSplitOrder` always calls `updateOrder`

### OQ-003: What determines a "Walk-In" order?

- **Context**: An order is marked `isWalkIn` when `!api.table_id || api.table_id === 0`. Walk-ins appear in the dineIn channel but are filtered separately.
- **Question**: Can a walk-in order have a table assigned later (e.g., walk-in to table conversion)? What happens to `isWalkIn` flag in that case?
- **Evidence**: `orderTransform.js` line 122

### OQ-004: What is the difference between "Room" and "Table" flows?

- **Context**: Tables and rooms are stored in the SAME context (`TableContext`) with an `isRoom` boolean. Orders have `isRoom` too. Rooms have check-in flows via `roomService.checkIn` and transfer via `orderTransform.toAPI.transferToRoom`.
- **Questions**:
  - Can a room have multiple concurrent orders (unlike tables)?
  - What triggers a room status change (check-in → available)?
  - Why are `associated_order_list` only for rooms?
- **Evidence**: `TableContext.jsx` (unified), `orderTransform.js` line 121, `roomService.js`

### OQ-005: What is `order_in` field and its possible values?

- **Context**: The code checks `api.order_in` for values like `'RM'` (room), `'SRM'` (shifted room). This field is used in report transforms to determine location type.
- **Question**: What are ALL possible values of `order_in`? Is it different from `order_type`? The two seem to track different dimensions (location vs channel).
- **Evidence**: `orderTransform.js` line 121, `reportService.js` lines 411-426

### OQ-006: What is the `def_ord_status` business rule?

- **Context**: Restaurant profile has `def_ord_status` which maps to `F_ORDER_STATUS_API` values. The `confirmOrder` function uses `defaultOrderStatus` (which could be 'paid', 'running', etc.).
- **Question**: Does this mean some restaurants auto-settle orders on confirmation? What is the expected behavior when `defaultOrderStatus = 'paid'`?
- **Evidence**: `profileTransform.js` line 119, `orderService.js` line 74

---

## Technical Questions

### OQ-007: Is `paymentService.js` dead code?

- **Context**: `paymentService.collectPayment()` references `API_ENDPOINTS.CLEAR_BILL` which doesn't exist in `constants.js`. The service is exported in `services/index.js` but may never be called.
- **Question**: Is this service actually used anywhere? Or has the collect payment flow been moved entirely to `orderTransform.toAPI.collectBillExisting` + direct calls?
- **Impact**: If dead, it should be removed. If called, it's a CRITICAL bug.
- **Evidence**: `paymentService.js` line 13, `constants.js` (no CLEAR_BILL)

### OQ-008: Why does `stationService` hardcode its API endpoint?

- **Context**: All other services use `API_ENDPOINTS.XXX` from constants, but `stationService.fetchStationData` uses a hardcoded string: `'/api/v1/vendoremployee/station-order-list'`
- **Question**: Was this intentional? Was this added in a rush or is there a reason it's not in constants?
- **Evidence**: `stationService.js` line 131

### OQ-009: What is the purpose of `backend/server.py`?

- **Context**: There's a FastAPI stub with only health-check endpoints (`/api/` and `/api/status`). All real API calls go to `preprod.mygenie.online`.
- **Questions**:
  - Is this stub used in production? Or only for deployment scaffolding?
  - Does it serve any proxy or middleware role?
  - It connects to MongoDB — what data does it store?
- **Evidence**: `backend/server.py`

### OQ-010: Why is `main` not the default branch?

- **Context**: The repository's HEAD points to `7th-april-v1-` (confirmed by `git branch -a`). The user specifically asked to analyze `main`, suggesting it may be the intended production branch.
- **Question**: Which branch is deployed to production? Are there meaningful differences between `main` and `7th-april-v1-`?
- **Evidence**: `git branch -a` output

### OQ-011: What triggers the `update-table` socket with `free` status?

- **Context**: The code explicitly says: "v2: No flow sends update-table free. Ignore it." But the handler still exists with an `else` branch that maps status using `TABLE_STATUS_MAP`.
- **Question**: If `free` is never sent, why keep the handler? And what statuses other than `engage` and `free` can come through?
- **Evidence**: `socketHandlers.js` lines 492-501

### OQ-012: What is `REACT_APP_GOOGLE_MAPS_KEY` used for?

- **Context**: The env var is configured but no code in `src/` references it. No Google Maps API or Places autocomplete imports found.
- **Question**: Is it used by a service worker, public HTML, or a component I missed? Or is it leftover from a removed feature?
- **Evidence**: Grep of entire `src/` directory yields no matches

---

## Integration Questions

### OQ-013: How does CRM per-restaurant key resolution work in multi-restaurant scenarios?

- **Context**: `REACT_APP_CRM_API_KEYS` contains 15 restaurant IDs with different API keys. `setCrmRestaurantId()` is called once after profile load.
- **Question**: Can a single user session switch between restaurants? If so, when is `setCrmRestaurantId` called again?
- **Evidence**: `crmAxios.js` lines 29-33

### OQ-014: What is the expected behavior of `aggregator_order` channel?

- **Context**: `socketEvents.js` defines `getAggregatorChannel` and `AGGREGATOR_EVENTS`, but `useSocketEvents.js` does NOT subscribe to this channel.
- **Question**: Are aggregator socket events intentionally unsubscribed? Is this a TODO or was it removed for a reason?
- **Evidence**: `socketEvents.js` lines 43, 80-84; `useSocketEvents.js` — no aggregator subscription

### OQ-015: How does the bill print physically work?

- **Context**: `orderService.printOrder` sends print data to `/api/v1/vendoremployee/order-temp-store`. This is a server-side print job.
- **Questions**:
  - Does the backend push to a physical printer?
  - Is there a printer client software running on-premises?
  - What happens if the print fails?
  - The endpoint name "order-temp-store" suggests temporary storage — is the print job queued?
- **Evidence**: `orderService.js` lines 108-127

### OQ-016: Firebase Service Worker Uses Older Firebase SDK Version

- **Context**: The service worker (`public/firebase-messaging-sw.js`) imports Firebase 10.14.1 compat libraries via CDN, while the main app uses Firebase 12.12.0 from npm. Background messages are forwarded via `postMessage` to the main thread.
- **Question**: Could the version mismatch between service worker SDK (10.14.1) and main app SDK (12.12.0) cause compatibility issues or missed messages?
- **Evidence**: `public/firebase-messaging-sw.js` line 7-8 (v10.14.1), `package.json` line 46 (v12.12.0)

---

## Data Model Questions

### OQ-017: What is the canonical order state machine?

- **Context**: `F_ORDER_STATUS` maps numbers to states: 1=preparing, 2=ready, 3=cancelled, 5=served, 6=paid, 7=pending, 8=running, 9=pendingPayment, 10=reserved. Note: 4 is skipped ("reserved for future development").
- **Question**: What are the valid state transitions? Can an order go from `ready` back to `preparing`? What triggers `running` vs `preparing`?
- **Evidence**: `constants.js` lines 124-135

### OQ-018: What is `f_order_status` vs `order_status`?

- **Context**: Orders have TWO status fields:
  - `f_order_status` (numeric: 1-10) → detailed order lifecycle
  - `order_status` (string: 'queue', 'delivered') → high-level lifecycle
- **Question**: What is the relationship? When does `order_status` change from 'queue' to 'delivered'?
- **Evidence**: `orderTransform.js` line 155 (`lifecycle: api.order_status`), `constants.js` lines 186-191

### OQ-019: What are all valid `payment_method` values?

- **Context**: `paymentMethods.js` defines: cash, card, upi, partial (split), TAB (credit), ROOM, OTHER. Report service also checks for 'Cancel', 'Merge'.
- **Question**: Is `payment_method` used as both a payment type AND an order disposition indicator (Cancel, Merge)?
- **Evidence**: `paymentMethods.js`, `reportService.js` lines 435-447

### OQ-020: What is `associated_order_list`?

- **Context**: Orders can have an `associated_order_list` — other orders that were transferred to this room order.
- **Question**: Is this always for room orders only? Can a table order have associated orders?
- **Evidence**: `orderTransform.js` lines 219-233

---

## Summary

| Category | Count | Priority Questions |
|---|---|---|
| Business Logic | 6 | OQ-001 (rounding, updated v3), OQ-002 (remove vs update), OQ-006 (default status) |
| Technical | 6 | OQ-007 (dead code), OQ-010 (branch), OQ-012 (Google Maps) |
| Integration | 4 | OQ-014 (aggregator channel), OQ-015 (print flow), OQ-016 (service worker) |
| Data Model | 4 | OQ-017 (state machine), OQ-018 (dual status), OQ-019 (payment methods) |
| **New (July 2025 v2)** | **4** | **OQ-021 (prepaid lifecycle), OQ-022 (split socket), OQ-023 (delta items), OQ-024 (split bill validation)** |
| **New (July 2025 v3)** | **3** | **OQ-025 (autoServiceCharge unused), OQ-026 (avg GST legality), OQ-027 (bill recomputes subtotal)** |
| **New (July 2025 v4)** | **2** | **OQ-028 (collectBillExisting duplicates buildCartItem), OQ-029 (TAB payment_status 'success')** |

---

## New Questions (July 2025 Update)

### OQ-021: What is the full prepaid order lifecycle?

- **Context**: Orders with `payment_type === 'prepaid'` are now detected in `OrderEntry.jsx`. When such an order is marked "Served", `completePrepaidOrder()` is called (POST to `/api/v2/vendoremployee/order/paid-prepaid-order`) instead of the normal `updateOrderStatus()`.
- **Questions**:
  - When exactly does an order get `payment_type: 'prepaid'`? Only through `placeOrderWithPayment`?
  - Can a prepaid order be cancelled? The code blocks item edits but doesn't explicitly block order cancellation.
  - What socket event does the backend emit after `paid-prepaid-order`? Is it `update-order-paid` (which would remove it)?
  - What happens if the served mark fails? The order stays on dashboard in "served" state?
- **Evidence**: `OrderEntry.jsx` `isPrepaid` logic, `DashboardPage.jsx` `handleMarkServed`, `orderService.js` `completePrepaidOrder`

### OQ-022: How do other devices learn about new split orders?

- **Context**: The `split-order` socket event only sends the **original order** (with reduced items after split). The **new split order** is added to OrderContext only on the initiating device (via `addOrder(newOrder)` in `OrderEntry.jsx` after API response). Code comment states: "Other devices get the new order on next `refreshOrders()`."
- **Questions**:
  - Is there a separate `new-order` socket event for the split result? Or do other devices truly only see it on refresh?
  - If there's no socket, this creates a **temporary inconsistency** where different POS terminals show different orders.
  - How long can this inconsistency last? What triggers `refreshOrders()` on other devices?
- **Evidence**: `socketHandlers.js` `handleSplitOrder` (only updates original), `OrderEntry.jsx` split bill response handler (line ~1376: `addOrder(newOrder)`)

### OQ-023: What happens to delta items when socket updates the placed item?

- **Context**: BUG-237 introduces delta items (`_deltaForId`) for placed item qty increases. When a socket update arrives, the cart sync logic filters out delta items: `prev.filter(i => !i.placed && !i._deltaForId)`.
- **Questions**:
  - If the user increases qty (creates delta) then a socket update arrives before "Update Order" is clicked, the delta is **silently discarded**. Is this the intended behavior?
  - What if two users both increase qty on the same item simultaneously?
  - The `_originalQty` is set once at cart init — if the server qty changes via another device's update, `_originalQty` may be stale.
- **Evidence**: `OrderEntry.jsx` cart sync: `prev.filter(i => !i.placed && !i._deltaForId)`, `updateQuantity` callback

### OQ-024: Why is split bill restricted to dine-in/walk-in?

- **Context**: The split bill button is now hidden for `takeAway` and `delivery` order types: `orderType !== 'takeAway' && orderType !== 'delivery'`
- **Question**: Is this a business rule (takeaway/delivery can't be split) or a technical limitation? What if a delivery order needs to be split among roommates?
- **Evidence**: `OrderEntry.jsx` — split bill button conditional

### OQ-025: How does `autoServiceCharge` interact with `serviceChargePercentage`? (July 2025 v3)

- **Context**: `profileTransform.js` extracts both `serviceChargePercentage` (number) and `autoServiceCharge` (boolean) from the restaurant profile. However, **only `serviceChargePercentage` is used** in the codebase. The service charge is always applied when `serviceChargePercentage > 0`, regardless of `autoServiceCharge`.
- **Question**: Should `autoServiceCharge === false` disable the service charge even when the percentage is set? Is `autoServiceCharge` a toggle for making it mandatory vs optional? Or is it for a different purpose entirely (e.g., auto-adding to bill vs manual)?
- **Evidence**: `profileTransform.js` lines 78-81 (extracted), no consumer found in `src/` for `autoServiceCharge`

### OQ-026: Is average GST rate for service charge legally compliant? (July 2025 v3)

- **Context**: GST on service charge is computed as `serviceCharge × (gstTax / subtotal)` — an average rate across all items. For a restaurant with both 5% GST items (beverages) and 18% GST items (food), this produces a blended rate that is neither 5% nor 18%.
- **Questions**:
  - Is this legally acceptable under Indian GST rules?
  - Does the backend compute service charge GST the same way?
  - Should service charge GST use the restaurant's standard GST slab instead?
- **Evidence**: `orderTransform.js` `calcOrderTotals` lines 378-381, `CollectPaymentPanel.jsx` lines 206-209

### OQ-027: Why does `buildBillPrintPayload` recompute subtotal independently? (July 2025 v3 — BUG-246)

- **Context**: The bill print payload builder now recomputes `computedSubtotal` from `rawOrderDetails` using `unit_price × qty` per item, because `item.price` was actually the line total (not unit price). It also recomputes tax from `food_details` if pre-computed tax is 0.
- **Questions**:
  - Why does the bill print need to recompute everything from raw data instead of using the order's stored financial fields (`subtotalBeforeTax`, etc.)?
  - Does this mean the order's stored financials are unreliable?
  - The fallback chain `unit_price → food_details.price → price` — when would `unit_price` be missing?
- **Evidence**: `orderTransform.js` `buildBillPrintPayload` lines 780-830

### OQ-028: Why does `collectBillExisting` rebuild food_detail instead of reusing `buildCartItem`? (July 2025 v4 — BUG-252)

- **Context**: The BUG-252 rewrite of `collectBillExisting` builds a `food_detail` array with per-item financial computation (variation_amount, addon_amount, gst/vat). This logic is **nearly identical** to the shared `buildCartItem()` helper (lines 263-351) but is written independently inline.
- **Questions**:
  - Why wasn't `buildCartItem` reused? Is the output shape different enough to warrant duplication?
  - The `food_detail` builder uses `item.unitPrice || item.price` while `buildCartItem` uses `item.price` — could these diverge?
  - If a tax calculation bug is found, will developers know to fix both locations?
- **Evidence**: `orderTransform.js` lines 680-730 (food_detail) vs lines 263-351 (buildCartItem)

### OQ-029: Why is TAB `payment_status` set to `'success'` instead of `'paid'`? (July 2025 v4 — BUG-252)

- **Context**: When collecting payment via TAB/Credit method, `collectBillExisting` sets `payment_status: 'success'`. All other payment methods use `'paid'`. No code comment explains the reason.
- **Questions**:
  - Is this a backend requirement for TAB orders? Does the backend treat 'success' differently from 'paid'?
  - Do report endpoints filter by `payment_status`? If so, TAB orders may be excluded from 'paid' queries.
  - Does the socket send back `payment_status: 'success'` too? How does the frontend handle it on receipt?
- **Evidence**: `orderTransform.js` line 741 — `isTab ? 'success' : 'paid'`
