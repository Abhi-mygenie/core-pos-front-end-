# POS3.0 Requirement Source For Intake — 2026-05-18

## 1. Purpose

This document summarizes candidate POS3.0 requirements from carry-forward and POS3.0 source docs.

- This is requirement source preparation only.
- This is not intake.
- This is not impact analysis.
- This is not implementation planning.
- This is not QA.
- No code was changed.
- No baseline docs were updated.
- This document is input for a later POS3.0 Bug/CR Intake Agent.

---

## 2. Source Documents Read

| # | Document | Path |
|---|---|---|
| 1 | POS3.0 Carry-Forward | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CARRY_FORWARD_2026_05_18.md` |
| 2 | Eliminate get-single-order-new from Socket Handlers | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md` |
| 3 | Room Transfer v2 Migration | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_ROOM_TRANSFER_V2_MIGRATION.md` |

Optional context doc (not read — not needed for this pass):
- `POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md`

---

## 3. Raw Requirements Found

| Raw ID | Source Doc | Source Bug/Item | Title | Summary | Expected Change | Owner |
|---|---|---|---|---|---|---|
| RAW-01 | Carry-Forward §2 | BUG-058 | PayLater PAID badge + prepaid hold settle | PayLater orders placed via prepaid path show "PAID" badge on dashboard. Badge check is `paymentType === 'prepaid'`. PayLater orders should not show as PAID since payment is deferred. | Backend clarifies `payment_type` contract for PayLater; FE traces `paymentMethod` propagation through socket → context → dashboard; FE verifies exclusion logic end-to-end. | Joint |
| RAW-02 | Carry-Forward §3 | BUG-064 | Room transfer notification shows as "New Order" | When an order is transferred to a room, the dashboard notification says "New Order" with new-order sound instead of indicating "Room Transfer." | Backend adds transfer marker (e.g. `notification_type: 'room_transfer'`) to FCM payload after `order-shifted-room`; FE reads marker and shows different message/sound. | Joint |
| RAW-03 | Carry-Forward §3 | BUG-069 | Sound plays before order appears on dashboard | FCM notification sound arrives before socket delivers order data. User hears sound but order card isn't visible yet. | Backend either delays FCM until socket confirms, or bundles order data in FCM payload; FE renders from notification data or queues sound until order appears in context. | Joint |
| RAW-04 | Carry-Forward §3 | BUG-084 | Per-component CGST/SGST payload keys | Backend doesn't need per-component CGST/SGST keys this sprint. FE UI already shows correct split. | Backend confirms when per-component keys are needed; FE adds individual CGST/SGST keys to payload builders when ready. | Joint |
| RAW-05 | Carry-Forward §3 | BUG-085 | Print template GST display slot | Does the print template have a slot for `delivery_charge_gst_amount`? If yes, no further work. If no, needs template update. | Backend answers Q-085-2; FE coordinates template update if needed. | Backend |
| RAW-06 | Carry-Forward §4 #1 | BUG-060 follow-up | Emit correct socket event after room transfer | Backend emits `update-food-status` (no payload) after `order-shifted-room`. Should emit `update-order-paid` with full payload. FE has temp fix (optimistic clearing). | Backend emits v2 socket event with full order payload after room transfer. | Backend |
| RAW-07 | Carry-Forward §4 #2 | BUG-065 follow-up | Store CRM customer_id on room orders | FE uses `isCustomerSelected` workaround based on name+phone presence. Backend should store CRM `customer_id` on room orders during check-in. | Backend stores `customer_id` from CRM on room order during check-in API. | Backend |
| RAW-08 | Carry-Forward §4 #3 | BUG-065 follow-up | CRM search API duplicate entries | CRM search API returns duplicate entries for the same phone number. | CRM backend deduplicates search results. | Backend |
| RAW-09 | Carry-Forward §4 #4 | BUG-065 follow-up | Phone format contract for room check-in | Should check-in send `+91` prefix or raw 10 digits? | Backend clarifies phone format contract. FE adjusts if needed. | Backend |
| RAW-10 | Carry-Forward §4 #5 | BUG-058 follow-up | Clarify PayLater payment_type contract | Backend must clarify whether PayLater `payment_type` should be `'prepaid'` or `'postpaid'` for dashboard display and hold-settle. | Backend defines and documents the PayLater `payment_type` contract. | Backend |
| RAW-11 | Carry-Forward §4 #6 | BUG-061 follow-up | Include room_info.checkin_date in get-single-order-new | FE uses `createdAt` fallback for room check-in time. Backend could include `room_info.checkin_date` in the API response for in-house rooms. | Backend adds `room_info.checkin_date` to `get-single-order-new` response. (Optional.) | Backend |
| RAW-12 | Socket Elimination doc, Action 1 | New (QA investigation) | Stop redundant API call on update-food-status | Every item status change fires two socket events: `update-item-status` (v2, with payload) and `update-food-status` (legacy, no payload). The legacy handler calls `get-single-order-new` API unnecessarily because the data already arrived via the v2 event. | FE removes or guts `handleUpdateFoodStatus` handler. Stops listening to `update-food-status` for item actions. Pure FE change, no backend dependency. | Frontend |
| RAW-13 | Socket Elimination doc, Action 2 | BUG-060 related | Migrate room transfer to stop emitting update-food-status | Room transfer is the only action that emits `update-food-status` but not `update-item-status`. Once backend migrates, `handleUpdateFoodStatus` can be deleted entirely. | Backend emits v2 socket event after room transfer instead of `update-food-status`. | Backend |
| RAW-14 | Socket Elimination doc, Action 3 | New (QA investigation) | Migrate delivery-assign-order socket event | Backend sends `delivery-assign-order` with no order payload. FE calls API to fetch order. Backend should include full payload. | Backend adds full order payload to `delivery-assign-order` event; FE uses data directly. | Joint |
| RAW-15 | Room Transfer V2 doc | BUG-060 related | Migrate room transfer endpoint from v1 to v2 | FE calls v1 endpoint `POST /api/v1/vendoremployee/order-shifted-room`. Should migrate to v2 `POST /api/v2/vendoremployee/order/order-shifted-room`. | FE updates endpoint constant; backend confirms v2 is live + payload shape; FE adjusts payload builder if needed. | Joint |
| RAW-16 | Room Transfer V2 doc | BUG-060 related | Backend emits v2 socket event after room transfer | After room transfer, backend should emit `update-order-paid` or `update-order` with full order payload (same shape as other v2 events). | Backend change — emit v2 event with full payload. | Backend |
| RAW-17 | Room Transfer V2 doc | BUG-060 related | Remove optimistic FE clearing after v2 socket confirmed | FE currently does optimistic clearing (remove order + free table + release engage lock) because backend sends no data via socket. Once v2 socket works, the existing `handleOrderDataEvent` handler will do this authoritatively. | FE removes optimistic clearing block in `OrderEntry.jsx` L1469-1483 after backend migration is confirmed. | Frontend |
| RAW-18 | Room Transfer V2 + Socket Elimination | BUG-060 related | Remove handleUpdateFoodStatus + fetchSingleOrderForSocket cleanup | After room transfer migration (RAW-15/16) and update-food-status elimination (RAW-12), `handleUpdateFoodStatus` has no consumers. Delete handler, remove event listener, delete `fetchSingleOrderForSocket`. | FE cleanup — delete dead code after all migrations complete. | Frontend |

| RAW-19 | Owner addition | New | Realtime FE updates for menu and hold/unpaid orders | Backend already emits socket events for menu item add/update and hold/unpaid order changes. FE does not consume these events yet. Dashboard and menu UI should update in realtime without manual refresh. | FE subscribes to menu-update and hold/unpaid order socket events; updates context/UI in realtime. | Frontend |
| RAW-20 | Owner addition | New | Delivery dispatch + assign delivery boy API integration | Backend APIs are ready for delivery order dispatch and assigning a delivery boy. FE needs UI and API integration for both actions. | FE builds dispatch and assign-delivery-boy UI; calls backend APIs; updates order/dashboard state after action. | Frontend |
| RAW-21 | Owner addition | New | Use restaurant profile CRM key instead of FE env keys | CRM API keys are currently stored in FE environment variables with a hardcoded restaurant-key mapping. After login, the CRM key should come from the restaurant profile instead. | FE reads CRM key from restaurant profile after login; uses profile key for all CRM API calls instead of env-based mapping. Backend/profile must expose the key. | Joint |
| RAW-22 | Owner addition | New | QSR / Cafe quick billing UX optimization | For QSR/cafe outlets, billing is too slow — staff must place order, open Collect Bill, then scroll to complete payment. Two parts: (1) one-step quick billing from Place Order for prepaid/QSR, (2) compact Collect Payment screen with tighter spacing so payment fits in single scroll. | FE analyzes one-step place+pay for prepaid QSR; FE redesigns Collect Payment for compactness; existing full flow stays safe for dine-in/room/complex payments. | Frontend (backend only if one-step flow needs API support) |
| RAW-23 | Owner addition | New | Remove duplicate local toast notifications when socket/FCM already covers the event | Some actions generate duplicate notifications — a local FE toast AND a socket/FCM notification for the same event. Two parts: (1) remove/suppress local toasts where socket/FCM already exists, (2) identify actions where socket notification is missing and local toast must remain temporarily. | FE creates notification map; removes duplicate local toasts; documents missing socket coverage for backend to add later. | Frontend (backend later for missing socket events) |

**Total raw items: 23**

---

## 4. Consolidated POS3.0 Requirement List

| Requirement ID | Title | Source Items | Owner | Priority | Intake Readiness |
|---|---|---|---|---|---|
| POS3-REQ-001 | PayLater PAID badge + hold settle fix | RAW-01, RAW-10 | Joint (backend clarification + FE fix) | P0 critical | ready_for_intake |
| POS3-REQ-002 | Room transfer v2 endpoint + socket migration | RAW-06, RAW-13, RAW-15, RAW-16, RAW-17 | Joint (backend migration + FE update) | P1 high | ready_for_intake |
| POS3-REQ-003 | Eliminate redundant API calls on update-food-status | RAW-12 | Frontend | P1 high | ready_for_intake |
| POS3-REQ-004 | Room transfer notification differentiation | RAW-02 | Joint (backend marker + FE handler) | P2 normal | ready_for_intake |
| POS3-REQ-005 | Notification sound timing vs order appearance | RAW-03 | Joint (backend sequencing + FE queue) | P2 normal | ready_for_intake |
| POS3-REQ-006 | CRM customer_id storage on room orders | RAW-07 | Backend | P2 normal | ready_for_intake |
| POS3-REQ-007 | CRM search API duplicate dedup | RAW-08 | Backend | P2 normal | ready_for_intake |
| POS3-REQ-008 | Phone format contract for room check-in | RAW-09 | Backend | P2 normal | ready_for_intake |
| POS3-REQ-009 | Room check-in date in API response | RAW-11 | Backend | P3 future/optional | ready_for_intake |
| POS3-REQ-010 | Per-component CGST/SGST payload keys | RAW-04 | Joint | P3 future/optional | ready_for_intake |
| POS3-REQ-011 | Print template GST display slot | RAW-05 | Backend | P3 future/optional | ready_for_intake |
| POS3-REQ-012 | Delivery-assign-order socket migration | RAW-14 | Joint | P3 future/optional | ready_for_intake |
| POS3-REQ-013 | Socket handler + dead code cleanup | RAW-18 | Frontend | P2 normal | ready_for_intake (after REQ-002 + REQ-003) |
| POS3-REQ-014 | Realtime FE updates for menu and hold/unpaid orders | RAW-19 | Frontend | P1 high | ready_for_intake |
| POS3-REQ-015 | Delivery dispatch + assign delivery boy API integration | RAW-20 | Frontend | P1 high | ready_for_intake |
| POS3-REQ-016 | Use restaurant profile CRM key instead of FE env keys | RAW-21 | Joint (profile must expose key) | P1 high | ready_for_intake |
| POS3-REQ-017 | QSR / Cafe quick billing UX optimization | RAW-22 | Frontend (backend if one-step flow needs API) | P1 high | ready_for_intake |
| POS3-REQ-019 | Remove duplicate local toast notifications when socket/FCM covers event | RAW-23 | Frontend (backend later for missing socket events) | P1 high | ready_for_intake |

**Total consolidated requirements: 18**

---

## 5. Requirement Details

### POS3-REQ-001 — PayLater PAID Badge + Hold Settle Fix

#### Source
- Carry-Forward §2: BUG-058
- Carry-Forward §4 #5: PayLater `payment_type` contract clarification

#### Plain-English Requirement
When a customer places a PayLater (pay later / tab / credit) order through the prepaid flow, the dashboard order card currently shows a "PAID" badge. This is incorrect because the customer has not actually paid yet — payment is deferred. The badge needs to correctly distinguish between truly prepaid orders and PayLater orders.

#### Why It Is Coming To POS3.0
POS2.0 implemented partial fixes (PayLater excluded from prepaid badge logic in code), but the PAID badge still shows at runtime. The `paymentMethod` field is not propagating correctly from socket events through to the dashboard card rendering. Additionally, the backend `payment_type` contract for PayLater orders is ambiguous — it's unclear whether PayLater should send `'prepaid'` or `'postpaid'`.

#### Expected Correction / Change
1. Backend clarifies the `payment_type` value for PayLater orders
2. FE traces `paymentMethod` field through the full chain: socket event → OrderContext → DashboardPage → TableCard
3. FE verifies the exclusion logic works end-to-end with the correct `payment_type`

#### Ownership
Joint — backend must clarify contract first; FE implements fix after.

#### Open Questions
- Should PayLater `payment_type` be `'prepaid'` or `'postpaid'`?
- Does the socket event include `payment_type` or `payment_method` in the order payload?

#### Priority
P0 critical

#### Intake Readiness
ready_for_intake (backend open questions noted above)

---

### POS3-REQ-002 — Room Transfer v2 Endpoint + Socket Migration

#### Source
- Carry-Forward §4 #1: BUG-060 backend follow-up (emit correct event)
- Socket Elimination doc: Action 2 (migrate room transfer)
- Room Transfer V2 doc: full migration plan

#### Plain-English Requirement
The room transfer flow currently uses a legacy v1 API endpoint and the backend emits a legacy socket event (`update-food-status`) with no data payload after the transfer. This forces the FE to use an optimistic workaround (guess the correct state) and triggers a wasted API call. The entire room transfer path should be migrated to the v2 endpoint and the backend should emit a modern socket event with the full order payload, matching how all other order status changes already work.

#### Why It Is Coming To POS3.0
POS2.0 added a temporary FE fix (BUG-060 Wave 7: optimistic clearing) to work around the incorrect socket event. The underlying backend issue was not fixed in POS2.0 because it requires backend changes.

#### Expected Correction / Change
1. Backend makes v2 endpoint live and confirms payload shape
2. FE updates endpoint constant from v1 to v2
3. FE adjusts payload builder if v2 shape differs
4. Backend emits a v2 socket event (e.g. `update-order-paid`) with full order payload after room transfer
5. FE removes the optimistic clearing workaround after v2 socket is confirmed working
6. (Final) FE removes `handleUpdateFoodStatus` handler once no consumers remain

#### Ownership
Joint — backend migration first, FE update after.

#### Open Questions
- Is the v2 endpoint `POST /api/v2/vendoremployee/order/order-shifted-room` live?
- Does v2 accept the same payload keys as v1, or a different structure?
- Which v2 socket event will backend emit after room transfer?

#### Priority
P1 high

#### Intake Readiness
ready_for_intake (backend open questions noted above)

---

### POS3-REQ-003 — Eliminate Redundant API Calls on update-food-status

#### Source
- Socket Elimination doc: Action 1

#### Plain-English Requirement
Every time a kitchen marks an item as ready, served, or cancelled, two socket events fire. The newer event (`update-item-status`) carries the full order data and the FE uses it directly. The legacy event (`update-food-status`) carries no data, so the FE makes an API call to fetch the same data that already arrived. This API call is completely redundant and adds ~200-500ms latency plus a double-render on every item status change.

#### Why It Is Coming To POS3.0
This is a newly discovered optimization identified during POS2.0 QA regression testing. It was not part of the original POS2.0 bug list.

#### Expected Correction / Change
FE stops calling the API on `update-food-status` events. Either remove the handler entirely or convert it to a no-op log. This is a pure FE change with zero backend dependency — it can ship independently.

#### Ownership
Frontend

#### Open Questions
None — this is fully understood and ready.

#### Priority
P1 high

#### Intake Readiness
ready_for_intake

---

### POS3-REQ-004 — Room Transfer Notification Differentiation

#### Source
- Carry-Forward §3: BUG-064

#### Plain-English Requirement
When an order is transferred to a room, the dashboard notification says "New Order" and plays the new-order sound. It should indicate "Room Transfer" with a different message and optionally a different sound, so the cashier knows it's not a genuinely new order.

#### Why It Is Coming To POS3.0
Blocked on backend in POS2.0. The backend FCM payload currently has no transfer marker to distinguish a room-transfer push from a new-order push.

#### Expected Correction / Change
1. Backend adds a marker (e.g. `notification_type: 'room_transfer'`) to the FCM payload after `order-shifted-room`
2. FE reads the marker in `NotificationContext.processNotification` and shows a different message/sound

#### Ownership
Joint — backend adds marker; FE reads it.

#### Open Questions
- What field name and value should the marker use?

#### Priority
P2 normal

#### Intake Readiness
ready_for_intake (backend open questions noted above)

---

### POS3-REQ-005 — Notification Sound Timing vs Order Appearance

#### Source
- Carry-Forward §3: BUG-069

#### Plain-English Requirement
The notification sound for a new order arrives before the order card appears on the dashboard. This happens because FCM (Google push) is faster than the WebSocket. The user hears the ding but doesn't see the order yet, which is confusing.

#### Why It Is Coming To POS3.0
Architecture issue identified in POS2.0. The fix requires backend-side sequencing or payload changes and was not actionable in POS2.0.

#### Expected Correction / Change
Option A: Backend delays FCM push until socket confirms delivery.
Option B: Backend bundles order data in the FCM payload so FE can render immediately from the notification.
Option C: FE queues the sound and plays it only when the order appears in context.

#### Ownership
Joint — backend sequencing or payload change + FE handling.

#### Open Questions
- Which option does backend prefer?
- Is it feasible to bundle order data in the FCM payload?

#### Priority
P2 normal

#### Intake Readiness
ready_for_intake (backend open questions noted above)

---

### POS3-REQ-006 — CRM customer_id Storage on Room Orders

#### Source
- Carry-Forward §4 #2: BUG-065 follow-up

#### Plain-English Requirement
When a customer is selected from CRM during room check-in, the backend should store the CRM `customer_id` on the room order. Currently, FE uses a workaround based on name+phone presence to determine if a customer was selected.

#### Why It Is Coming To POS3.0
Discovered during POS2.0 BUG-065 implementation. Not part of the original POS2.0 scope.

#### Expected Correction / Change
Backend stores `customer_id` from the CRM selection on the room order during the check-in API call.

#### Ownership
Backend

#### Open Questions
- Does the check-in API already accept `customer_id`? If not, what field name?

#### Priority
P2 normal

#### Intake Readiness
ready_for_intake (backend open questions noted above)

---

### POS3-REQ-007 — CRM Search API Duplicate Dedup

#### Source
- Carry-Forward §4 #3: BUG-065 follow-up

#### Plain-English Requirement
The CRM search API returns duplicate entries for the same phone number. When a cashier types a phone number during room check-in or order entry, the dropdown shows the same customer multiple times.

#### Why It Is Coming To POS3.0
Discovered during POS2.0 BUG-065 implementation. CRM backend issue.

#### Expected Correction / Change
CRM backend deduplicates search results before returning them.

#### Ownership
Backend (CRM)

#### Open Questions
None.

#### Priority
P2 normal

#### Intake Readiness
ready_for_intake (backend open questions noted above)

---

### POS3-REQ-008 — Phone Format Contract for Room Check-In

#### Source
- Carry-Forward §4 #4: BUG-065 follow-up

#### Plain-English Requirement
It's unclear whether the room check-in should send the phone number with a `+91` country code prefix or as raw 10 digits. FE currently strips the prefix for display but the storage/search contract is undefined.

#### Why It Is Coming To POS3.0
Discovered during POS2.0 BUG-065 implementation. Contract ambiguity.

#### Expected Correction / Change
Backend clarifies phone format contract. FE adjusts formatting/sending if needed.

#### Ownership
Backend

#### Open Questions
- `+91` prefix or raw 10 digits?

#### Priority
P2 normal

#### Intake Readiness
ready_for_intake (backend open questions noted above)

---

### POS3-REQ-009 — Room Check-In Date in API Response

#### Source
- Carry-Forward §4 #6: BUG-061 follow-up

#### Plain-English Requirement
For in-house (currently checked-in) rooms, the `get-single-order-new` API response does not include `room_info.checkin_date`. FE currently falls back to `createdAt` as a workaround. Backend could include the actual check-in date.

#### Why It Is Coming To POS3.0
Discovered during POS2.0 BUG-061 implementation. FE workaround is functional but not ideal.

#### Expected Correction / Change
Backend adds `room_info.checkin_date` to the `get-single-order-new` response for in-house rooms.

#### Ownership
Backend (optional improvement)

#### Open Questions
None — this is a nice-to-have.

#### Priority
P3 future/optional

#### Intake Readiness
ready_for_intake (backend open questions noted above)

---

### POS3-REQ-010 — Per-Component CGST/SGST Payload Keys

#### Source
- Carry-Forward §3: BUG-084

#### Plain-English Requirement
The order payload currently sends a single composite GST amount. Backend may eventually need separate CGST and SGST amounts per component (items, service charge, tip, delivery). FE UI already shows the correct split visually.

#### Why It Is Coming To POS3.0
Deferred from POS2.0 because backend confirmed they don't need per-component keys this sprint.

#### Expected Correction / Change
Backend confirms when per-component keys are needed. FE adds individual keys to payload builders.

#### Ownership
Joint

#### Open Questions
- When does backend need per-component keys?
- What are the exact key names?

#### Priority
P3 future/optional

#### Intake Readiness
ready_for_intake (backend open questions noted above)

---

### POS3-REQ-011 — Print Template GST Display Slot

#### Source
- Carry-Forward §3: BUG-085

#### Plain-English Requirement
POS2.0 added `delivery_charge_gst_amount` to the order payload (BUG-083). The open question is whether the print template has a display slot for this value. If yes, no further work. If no, the template needs updating.

#### Why It Is Coming To POS3.0
Question Q-085-2 was parked for backend team during POS2.0 planning.

#### Expected Correction / Change
Backend answers whether the print template supports `delivery_charge_gst_amount`. If not, coordinate template update.

#### Ownership
Backend

#### Open Questions
- Does the print template have a slot for `delivery_charge_gst_amount`?

#### Priority
P3 future/optional

#### Intake Readiness
ready_for_intake (backend open questions noted above)

---

### POS3-REQ-012 — Delivery-Assign-Order Socket Migration

#### Source
- Socket Elimination doc: Action 3

#### Plain-English Requirement
When a rider is assigned to a delivery order, the backend sends a `delivery-assign-order` socket event with no order payload. FE calls the API to fetch the full order. Backend should include the full order payload in the event, matching the v2 pattern used by other events.

#### Why It Is Coming To POS3.0
Newly discovered optimization during POS2.0 QA. Low frequency event (only fires when a rider is assigned).

#### Expected Correction / Change
Backend includes full order payload in `delivery-assign-order` event. FE switches to using data directly from the event.

#### Ownership
Joint

#### Open Questions
- Does backend support adding payload to `delivery-assign-order`?

#### Priority
P3 future/optional

#### Intake Readiness
ready_for_intake (backend open questions noted above)

---

### POS3-REQ-013 — Socket Handler + Dead Code Cleanup

#### Source
- Socket Elimination doc: final step
- Room Transfer V2 doc: step 4

#### Plain-English Requirement
After POS3-REQ-002 (room transfer v2 migration) and POS3-REQ-003 (eliminate redundant API calls) are both complete, the `handleUpdateFoodStatus` handler in `socketHandlers.js` will have no remaining consumers. It should be deleted along with `fetchSingleOrderForSocket` in `orderService.js`, and the `UPDATE_FOOD_STATUS` event should be removed from listeners.

#### Why It Is Coming To POS3.0
This is the final cleanup step that depends on REQ-002 and REQ-003 landing first.

#### Expected Correction / Change
1. Delete `handleUpdateFoodStatus` from `socketHandlers.js`
2. Remove `UPDATE_FOOD_STATUS` from event listeners in `useSocketEvents.js` and `socketEvents.js`
3. Delete `fetchSingleOrderForSocket` from `orderService.js` (if no other consumers)
4. Update comment in `useStationSocketRefresh.js`

#### Ownership
Frontend

#### Open Questions
None — depends on REQ-002 + REQ-003 completion only.

#### Priority
P2 normal (but sequentially last)

#### Intake Readiness
ready_for_intake (after REQ-002 + REQ-003)

---

### POS3-REQ-014 — Realtime FE Updates for Menu and Hold/Unpaid Orders

#### Source
- Owner addition (2026-05-18)

#### Plain-English Requirement
Backend already emits socket events when a menu item is added or updated and when a hold/unpaid order changes. The frontend does not currently consume these events. Two things need to happen:

1. When a menu item is added or updated (from any source — frontend, backend, or admin), the POS menu UI should update in realtime without the cashier needing to refresh.
2. When an order is on hold and unpaid, it should appear or update on the dashboard in realtime through socket events.

#### Why It Is Coming To POS3.0
New requirement from owner. Backend socket events are already in place; FE needs to subscribe and handle them.

#### Expected Correction / Change
1. FE identifies the socket event names for menu updates and hold/unpaid order updates
2. FE subscribes to these events in the appropriate context (MenuContext for menu; OrderContext for hold/unpaid orders)
3. FE updates the UI state in realtime when events are received
4. Dashboard and menu panels stay live without manual refresh

#### Ownership
Frontend

#### Open Questions
- What are the exact socket event names for menu updates?
- What is the payload shape for menu update events?
- Are hold/unpaid orders already partially handled by existing order socket events, or is there a separate event?

#### Priority
P1 high

#### Intake Readiness
ready_for_intake

---

### POS3-REQ-015 — Delivery Dispatch + Assign Delivery Boy API Integration

#### Source
- Owner addition (2026-05-18)

#### Plain-English Requirement
Backend APIs are ready for two delivery-order actions:

1. Dispatch a delivery order directly.
2. Assign a delivery boy to the order.

The frontend needs to build the UI for both actions and integrate with the backend APIs. After either action, the order/dashboard state should update correctly.

#### Why It Is Coming To POS3.0
New requirement from owner. Backend APIs are already available; FE integration is missing.

#### Expected Correction / Change
1. FE builds dispatch UI (button/action on delivery order cards or order entry)
2. FE builds assign-delivery-boy UI (selection of delivery boy + confirmation)
3. FE calls the backend dispatch and assign APIs
4. FE updates order/dashboard state after successful action (via API response or socket event)

#### Ownership
Frontend

#### Open Questions
- What are the exact API endpoints for dispatch and assign?
- What payload do the APIs expect?
- What response/socket event confirms success?
- Where in the UI should these actions appear (dashboard card, order entry, or both)?

#### Priority
P1 high

#### Intake Readiness
ready_for_intake

---

### POS3-REQ-016 — Use Restaurant Profile CRM Key Instead of FE Env Keys

#### Source
- Owner addition (2026-05-18)

#### Plain-English Requirement
Currently, CRM API keys are stored in frontend environment variables with a hardcoded restaurant-key mapping (in `crmAxios.js`). This should move to a restaurant-profile based setup:

1. After the user logs into POS and the restaurant profile is loaded, the CRM key for that restaurant should come from the profile.
2. The main POS should use this profile-provided CRM key for all CRM lookup/actions instead of the hardcoded/env-based restaurant key mapping.

#### Why It Is Coming To POS3.0
New requirement from owner. Current env-based approach is fragile and doesn't scale across restaurants.

#### Expected Correction / Change
1. Backend/profile exposes the CRM key in the restaurant profile API response
2. FE reads the CRM key from the loaded profile (via `RestaurantContext` or `profileTransform`)
3. FE configures `crmAxios` to use the profile-provided key instead of the env-variable-based mapping
4. FE removes or deprecates the hardcoded env-variable CRM key mapping

#### Ownership
Joint — backend must expose the key in the profile; FE must consume it.

#### Open Questions
- Does the restaurant profile API already include a CRM key field? If not, what field name?
- Should the env-variable mapping be kept as a fallback, or removed entirely?

#### Priority
P1 high

#### Intake Readiness
ready_for_intake (backend open questions noted above)

---

### POS3-REQ-017 — QSR / Cafe Quick Billing UX Optimization

#### Source
- Owner addition (2026-05-18), with screenshot reference

#### Plain-English Requirement
For QSR and cafe-style outlets, the current billing flow is too slow — staff must place the order, then open Collect Bill, then scroll through the payment screen to complete payment. This is unacceptable for prepaid/quick-service counters where speed is critical.

Two parts need to be analyzed and implemented:

**Part 1 — One-step quick billing from Place Order:**
For prepaid QSR/cafe use cases, check if minimum billing/payment information can be shown directly during Place Order, so staff can place and collect/payment-complete faster without opening a separate full Collect Payment flow.

**Part 2 — Compact Collect Payment screen:**
The current Collect Payment screen takes too much vertical space. Analyze whether fonts, spacing, bill summary rows, adjustment controls, and payment method layout can be made more compact so payment methods and key actions fit in a single scroll or near single screen.

The existing full Collect Payment behavior must remain safe and unchanged for dine-in, room, and complex payment flows (split, partial, tab, etc.).

#### Why It Is Coming To POS3.0
New owner CR. QSR/cafe speed optimization — reducing clicks and scrolling for the most common prepaid billing path.

#### Expected Correction / Change
1. FE analyzes the current Place Order → Collect Bill → Pay flow for prepaid/QSR orders
2. FE designs a one-step quick billing option that combines place + pay for simple prepaid orders
3. FE redesigns the Collect Payment panel for compactness: tighter fonts, reduced spacing, condensed bill summary, payment method layout that fits without scrolling
4. Existing full Collect Payment flow for dine-in/room/complex payments remains untouched
5. Backend API/payment-flow support only if the one-step flow requires a different API call pattern

#### Ownership
Frontend primarily. Backend dependency only if one-step Place Order + payment requires API/payment-flow support (e.g. a combined place+pay endpoint).

#### Open Questions
- Does the one-step flow need a new combined API endpoint, or can it use existing `placeOrderWithPayment`?
- Should the one-step flow be a restaurant-profile toggle (QSR mode vs full mode), or automatic based on order type (prepaid)?
- Which Collect Payment sections can be collapsed/hidden for QSR vs which must always be visible?

#### Priority
P1 high (QSR/cafe speed)

#### Intake Readiness
ready_for_intake

---

### POS3-REQ-019 — Remove Duplicate Local Toast Notifications When Socket/FCM Covers Event

#### Source
- Owner addition (2026-05-18)

#### Plain-English Requirement
Some actions currently generate more than one notification — a local frontend toast AND a socket/FCM-based notification for the same event. This is confusing for staff and makes the UI noisy. The notification behavior needs cleanup so users see only one clear notification per event.

Two parts:

**Part 1 — Remove duplicate local toasts where socket/FCM already exists:**
If the system already receives a socket or FCM notification for an event (e.g. new order, item status change), the frontend local toast for the same event should be removed or suppressed to avoid duplicate alerts.

**Part 2 — Identify actions where socket notification is missing:**
For actions where no socket/FCM notification currently exists (e.g. possibly Collect Bill, Print/KOT, or other flows), local toast notifications may still be needed temporarily. These cases should be clearly listed and highlighted so backend can add socket support in a later phase.

#### Why It Is Coming To POS3.0
New owner CR. Duplicate notifications confuse staff and make realtime behavior noisy. Cleanup needed after POS2.0 added more socket-driven flows.

#### Expected Correction / Change
1. FE creates a notification map of all current toast/notification sources per action
2. For each action: identify whether socket/FCM notification exists
3. Where socket/FCM covers the event → remove or suppress the local toast
4. Where socket/FCM does NOT cover the event → keep local toast temporarily and document it
5. Missing socket coverage → documented clearly for backend to add socket support later

#### Ownership
Frontend for notification cleanup and mapping. Backend later for adding missing socket events where needed.

#### Open Questions
- Which specific actions currently fire both local toast and socket/FCM notifications?
- Are there actions where the local toast carries information not present in the socket/FCM notification (and therefore can't simply be removed)?
- Should suppression be based on a dedup mechanism (e.g. event ID matching) or a blanket removal of known duplicate toasts?

#### Priority
P1 high

#### Intake Readiness
ready_for_intake

---

## 6. Overlaps / Related Items

| Item A | Item B | Relationship | Grouped Under |
|---|---|---|---|
| RAW-01 (BUG-058 carry-forward) | RAW-10 (PayLater payment_type clarification) | Same bug — RAW-10 is the backend prerequisite for RAW-01 | POS3-REQ-001 |
| RAW-06 (BUG-060 emit correct event) | RAW-13 (Action 2: room transfer socket migration) | Same work — both describe backend emitting v2 event after room transfer | POS3-REQ-002 |
| RAW-06 (BUG-060 emit correct event) | RAW-15 (v1 to v2 endpoint migration) | Same migration scope — endpoint + socket event are one coordinated change | POS3-REQ-002 |
| RAW-06 (BUG-060 emit correct event) | RAW-16 (v2 socket event after transfer) | Same work — RAW-16 is the detailed version of RAW-06 | POS3-REQ-002 |
| RAW-13 (Action 2: room transfer socket migration) | RAW-16 (v2 socket event after transfer) | Same work from different source docs | POS3-REQ-002 |
| RAW-15 (v1 to v2 endpoint) | RAW-17 (remove optimistic clearing) | Sequential — RAW-17 happens after RAW-15 is confirmed working | POS3-REQ-002 |
| RAW-12 (Action 1: stop API on update-food-status) | RAW-18 (cleanup: remove handler) | Sequential — RAW-18 is the final cleanup after RAW-12 + RAW-13 complete | POS3-REQ-013 depends on REQ-002 + REQ-003 |

**Summary:** 5 raw items (RAW-06, RAW-13, RAW-15, RAW-16, RAW-17) all converge into POS3-REQ-002 (room transfer v2 migration). RAW-01 + RAW-10 converge into POS3-REQ-001 (PayLater fix). No items were removed — all are accounted for in consolidated requirements.

---

## 7. Owner Additions Section

Owner can add more POS3.0 items here before sending to the intake agent:

| Added Item | Description | Priority | Notes |
|---|---|---|---|
| POS3-REQ-014 | Realtime FE updates for menu and hold/unpaid orders | P1 high | Backend socket events already exist; FE needs to consume |
| POS3-REQ-015 | Delivery dispatch + assign delivery boy API integration | P1 high | Backend APIs ready; FE UI + integration needed |
| POS3-REQ-016 | Use restaurant profile CRM key instead of FE env keys | P1 high | Profile must expose key; FE consumes from profile |
| POS3-REQ-017 | QSR / Cafe quick billing UX optimization | P1 high | Two parts: one-step quick billing + compact Collect Payment screen |
| POS3-REQ-019 | Remove duplicate local toast notifications | P1 high | Cleanup duplicates; map missing socket coverage for backend |

---

## 8. Recommended Next Step

This document should now be reviewed by the owner. After the owner accepts, adds, removes, or reorders items, it can be given to the POS3.0 Bug/CR Intake Agent.

---

## 9. Final Status

**pos3_requirement_source_updated_with_owner_additions**

| Metric | Value |
|---|---|
| Raw requirements found | 23 |
| Consolidated requirements | 18 |
| P0 critical items | 1 (POS3-REQ-001) |
| P1 high items | 7 (POS3-REQ-002, POS3-REQ-003, POS3-REQ-014, POS3-REQ-015, POS3-REQ-016, POS3-REQ-017, POS3-REQ-019) |
| P2 normal items | 6 (POS3-REQ-004 through POS3-REQ-008, POS3-REQ-013) |
| P3 future/optional items | 4 (POS3-REQ-009 through POS3-REQ-012) |
| Items ready for intake | 18 (all consolidated requirements) |
| Items with backend open questions | 11 (questions noted within each item; does not block intake) |
| Items needing owner clarification | 0 |
| Overlaps grouped | 7 raw items → 2 consolidated groups |
| Owner additions | 5 (POS3-REQ-014, POS3-REQ-015, POS3-REQ-016, POS3-REQ-017, POS3-REQ-019) |
| Code changed | NO |
| `/app/memory/final/` updated | NO |

---

*— POS3.0 Requirement Source For Intake — 2026-05-18 —*
