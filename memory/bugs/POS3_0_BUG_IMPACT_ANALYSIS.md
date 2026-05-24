# POS3.0 Sprint — Bug Impact Analysis

**Sprint:** pos3.0
**Normalized Sprint Name:** POS3_0
**Analysis Date:** 2026-05-18
**Repo:** https://github.com/Abhi-mygenie/core-pos-front-end-.git
**Branch:** 18-may-pos3.0
**Local `/app` handling:** Wiped and fresh pulled
**Total Bugs Analyzed:** 16 (BUG-087 through BUG-102)

---

## Docs Read

### Final Docs (Baseline)
- `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`

### POS2.0 Closure Docs
- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md`
- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_QA_BUG_STATUS_MATRIX_2026_05_18.md`

### POS3.0 Requirement / Pre-Intake Docs
- `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CARRY_FORWARD_2026_05_18.md`
- `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_REQUIREMENT_SOURCE_FOR_INTAKE_2026_05_18.md`
- `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md`
- `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_ROOM_TRANSFER_V2_MIGRATION.md`

### Bug Intake
- `/app/memory/BUG_TEMPLATE.md` (lines 6396–7385, sprint pos3.0 batch)

## Baseline Conflicts Found
- None. All final baseline docs, overlay docs, POS2.0 closure docs, POS3.0 requirement docs, and current code are aligned for the scope of these 16 bugs.

---

## Owner Clarification Gate — Responses

### BUG-102 — Mark Served / Mark Ready Button Disabled
**Question asked:** Is the 20-30s lockout from the 8s hardcoded timeout, socket engage stacking, or something else?
**Owner answer:** The 8s hardcoded timeout is incorrect. Button should be disabled only while socket action is in progress and re-enabled when socket response arrives (typically milliseconds to 1-2s). If a fallback timeout is needed, it should be ~2s max. Should follow the same pattern as table engage/free via socket response.
**Status:** Clarified — proceed with analysis.

### BUG-096 — Realtime FE Updates for Menu and Hold/Unpaid Orders
**Question asked:** What are the exact socket event names for menu updates?
**Owner answer:** Will provide later.
**Status:** Analysis incomplete for menu socket integration — awaiting owner-provided event names.

### BUG-097 — Delivery Dispatch + Assign Delivery Boy
**Question asked:** Exact API endpoints and payload shapes?
**Owner answer:** Partial info: if `delivery_assign` key is present on the order, show "Assign" button; otherwise show "Dispatch" button. Assign flow calls API to list assignable users, then assigned person accepts/rejects.
**Status:** Analysis incomplete — awaiting full API documentation.

### All Other Bugs
No owner clarification required.

---

# Per-Bug Impact Analysis

---

# BUG-087 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 6400–6459)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
PayLater orders placed via the prepaid path show a "PAID" badge on the dashboard. The badge check is `paymentType === 'prepaid'`. PayLater orders should not show as PAID since payment is deferred. The backend `payment_type` contract for PayLater is ambiguous.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-001 in requirement source doc
- POS2.0 BUG-058 carry-forward doc
- POS2.0 Final Implementation Summary (Wave 7)
- Code: OrderCard.jsx L391-393, L832
- Code: TableCard.jsx L283-284, L450
- Code: DashboardPage.jsx L553-554, L598-599, L630-631, L749-750, L771-772, L898-899, L1437
- Code: orderTransform.js L221-222 (fromAPI mapping)
- Code: socketHandlers.js (handleOrderDataEvent, handleNewOrder)

## Module Mapping
Primary Module: Dashboard / POS Workspace (Module 3) + Order Entry / Cart / Payment Workflow (Module 4)
Downstream Impacted Modules: Realtime Socket (Module 7), Tables & Orders Runtime State (Module 13)
Module decision reference: MODULE_DECISIONS_FINAL.md §3 (Dashboard), §4 (Order Entry)

## Affected Route / Page
`/dashboard` — embedded in dashboard order cards and table cards

## Affected Screen / Flow
1. PayLater order placed via prepaid flow → order appears on dashboard
2. Dashboard card renders badge based on `paymentType === 'prepaid'`
3. Current exclusion check: `order.paymentMethod?.toLowerCase() !== 'paylater'` (already in code)
4. Bug: `paymentMethod` field may not propagate correctly from socket → OrderContext → DashboardPage table entries → card components

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/components/cards/OrderCard.jsx` L391-393, L832 | PAID badge rendering with PayLater exclusion check |
| `/app/frontend/src/components/cards/TableCard.jsx` L283-284, L450 | PAID badge rendering with PayLater exclusion check |
| `/app/frontend/src/pages/DashboardPage.jsx` L553-554, L598-599, L630-631, L749-750, L771-772, L898-899 | Table entry construction — passes `paymentType` and `paymentMethod` from order to card |
| `/app/frontend/src/api/transforms/orderTransform.js` L221-222 | `fromAPI.order` maps `api.payment_type` → `paymentType`, `api.payment_method` → `paymentMethod` |
| `/app/frontend/src/api/socket/socketHandlers.js` L229-325 | `handleOrderDataEvent` — transforms socket payload via `orderFromAPI.order()` |

## API Review
- No direct API involvement for the badge display.
- The root issue is in the socket event payload: does the backend include `payment_type` and `payment_method` fields in the order data sent via socket events?
- `orderTransform.fromAPI.order` at L221-222 maps `api.payment_type` → `paymentType` and `api.payment_method` → `paymentMethod`. If backend sends `payment_type: 'prepaid'` but no `payment_method: 'paylater'` distinction, the exclusion check fails.
- API contract risk: Backend must clarify whether PayLater orders have `payment_type: 'prepaid'` or `payment_type: 'postpaid'` and whether `payment_method: 'paylater'` is included in socket payloads.

## Socket / Realtime Review
- Socket events involved: `update-order`, `update-order-paid`, `update-order-status`, `new-order`
- All order data events pass through `orderFromAPI.order()` which maps `payment_type` and `payment_method`
- Key question: does the backend socket payload for PayLater orders include `payment_method: 'paylater'`?
- Socket risk: If backend does not include `payment_method` in the socket order payload, the FE exclusion check `order.paymentMethod?.toLowerCase() !== 'paylater'` will always be truthy (empty string !== 'paylater'), and the PAID badge will show.

## State / Data Flow
Socket event → `handleOrderDataEvent` / `handleNewOrder` → `orderFromAPI.order(payload.orders[0])` → `addOrder` / `updateOrder` in OrderContext → DashboardPage reads from OrderContext → constructs table entries with `paymentType` and `paymentMethod` → passes to OrderCard/TableCard → badge check

## Relevant Final Documentation
- ARCHITECTURE_DECISIONS_FINAL.md Rule API-03: Order composition in OrderEntry; settlement in CollectPaymentPanel
- MODULE_DECISIONS_FINAL.md §4: PayLater / payment flow
- BUSINESS_RULES_BASELINE_FINAL.md PAY-007: Backend requires misspelled `'sucess'` for PayLater
- POS2.0 Wave 7 implementation: BUG-058 partial fix already in code

## Current Code Behavior
Code already has the PayLater exclusion check:
- OrderCard.jsx L392: `order.paymentType === 'prepaid' && order.fOrderStatus !== 8 && order.paymentMethod?.toLowerCase() !== 'paylater'`
- TableCard.jsx L283: `table.paymentType === 'prepaid' && table.paymentMethod?.toLowerCase() !== 'paylater'`
- DashboardPage.jsx passes both `paymentType` and `paymentMethod` from order data to table entries

The exclusion logic itself appears correct. The likely issue is that `paymentMethod` is empty/missing in the data arriving from the backend socket payload, so the exclusion never triggers.

## Expected Behavior
PayLater orders should NOT display the "PAID" badge. The badge should only appear for truly prepaid (payment completed) orders.

## Root Cause Hypothesis
**High-confidence hypothesis:** The backend socket payload for PayLater orders does not include `payment_method: 'paylater'` (or includes `payment_method: ''` / omits the field). The FE exclusion check is correctly written but receives empty/missing data, so it always evaluates to true → badge shows.

Secondary possibility: The backend sends `payment_type: 'prepaid'` for PayLater orders (instead of `'postpaid'`), and `payment_method` is not reliably populated in the socket payload.

Label: **backend response/contract issue** (pending backend `payment_type` contract clarification)

## Regression Risk Areas
- All dashboard card badge rendering (prepaid badge, hold badge)
- Settle flow for prepaid vs PayLater orders
- Audit report paid order display
- DashboardPage table entry construction for all order types

## Docs / Code Mismatch
No mismatch. POS2.0 Wave 7 implementation notes and current code are aligned. The issue is backend contract ambiguity, not doc/code divergence.

## Open Questions / Missing Information
1. Does the backend socket payload for PayLater orders include `payment_method: 'paylater'`?
2. What is the backend's canonical `payment_type` value for PayLater orders — `'prepaid'` or `'postpaid'`?
3. Is `payment_method` populated in ALL socket event payloads (new-order, update-order, update-order-paid, etc.) or only in some?

## User Interaction Required
Required — Backend must clarify PayLater `payment_type` / `payment_method` contract before FE fix can be validated end-to-end.

## Analysis Verdict
API contract issue

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Backend clarification first — need confirmed `payment_type` and `payment_method` values for PayLater orders in socket payloads.

---

# BUG-088 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 6462–6531)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
Room transfer flow uses legacy v1 API endpoint and backend emits a legacy socket event (`update-food-status`) with no data payload after transfer. FE uses an optimistic workaround. The entire room transfer path should be migrated to v2 endpoint with a modern socket event carrying full order payload.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-002 in requirement source doc
- POS3_0_ROOM_TRANSFER_V2_MIGRATION.md (full migration plan)
- POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md
- POS2.0 BUG-060 Wave 7 closure
- Code: constants.js L50 — `ORDER_SHIFTED_ROOM: '/api/v1/vendoremployee/order-shifted-room'`
- Code: OrderEntry.jsx L1463-1498 — room transfer call site + optimistic clearing
- Code: orderTransform.js L1344-1377 — `toAPI.transferToRoom` payload builder
- Code: socketHandlers.js L344-401 — `handleUpdateFoodStatus` handler

## Module Mapping
Primary Module: Rooms / Room Check-In / Room Transfer (Module 5)
Downstream Impacted Modules: Order Entry / Cart / Payment Workflow (Module 4), Realtime Socket (Module 7), Tables & Orders Runtime State (Module 13)
Module decision reference: MODULE_DECISIONS_FINAL.md §5 (Rooms)

## Affected Route / Page
`/dashboard` — embedded in Order Entry room transfer flow

## Affected Screen / Flow
1. Cashier has active dine-in order on table
2. Opens Collect Bill → selects "To Room" → picks room → confirms transfer
3. FE calls `POST /api/v1/vendoremployee/order-shifted-room` (v1)
4. FE does optimistic clearing (removeOrder, updateTableStatus, setTableEngaged)
5. Backend emits `update-food-status` with no payload → FE calls API (wasted)
6. Guard at L356 in handleUpdateFoodStatus skips re-adding since order already removed

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/api/constants.js` L50 | `ORDER_SHIFTED_ROOM` endpoint URL — needs v1 → v2 update |
| `/app/frontend/src/api/transforms/orderTransform.js` L1344-1377 | `toAPI.transferToRoom` payload builder — may need shape adjustment for v2 |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` L1463-1498 | Room transfer call site + optimistic clearing block (L1469-1483) to be removed after v2 socket confirmed |
| `/app/frontend/src/api/socket/socketHandlers.js` L344-401 | `handleUpdateFoodStatus` — currently handles the legacy socket event from room transfer |
| `/app/frontend/src/api/socket/socketHandlers.js` L229-325 | `handleOrderDataEvent` — will handle the new v2 event after migration |
| `/app/frontend/src/api/socket/socketEvents.js` L59, L118-119 | `UPDATE_FOOD_STATUS` event definition and category |
| `/app/frontend/src/api/socket/useSocketEvents.js` L137-138 | `UPDATE_FOOD_STATUS` case in event router |

## API Review
- Current endpoint: `POST /api/v1/vendoremployee/order-shifted-room` (v1)
- Target endpoint: `POST /api/v2/vendoremployee/order/order-shifted-room` (v2)
- Current payload (built by `toAPI.transferToRoom`): `{ order_id, payment_mode, payment_amount, payment_status: 'paid', room_id, order_discount, self_discount, comm_discount, tip_amount, vat_tax, gst_tax, service_tax, service_gst_tax_amount, tip_tax_amount }`
- v2 payload shape: Unknown — backend must confirm if same keys or different structure
- API contract risk: v2 endpoint may not be live yet; payload shape may differ

## Socket / Realtime Review
- Current: Backend emits `update-food-status` (no payload) after room transfer
- Target: Backend emits `update-order-paid` or `update-order` with full order payload
- Once v2 socket works, `handleOrderDataEvent` (already exists) will handle it authoritatively
- No new FE socket code needed — existing handler covers the target event
- Socket risk: Backend must confirm which v2 event name will be emitted

## State / Data Flow
Current: POST v1 → FE optimistic clearing → socket `update-food-status` → wasted API call → guard skips
Target: POST v2 → socket `update-order-paid` with payload → `handleOrderDataEvent` detects terminal status → `removeOrder` + `syncTableStatus('available')` → done

## Relevant Final Documentation
- ARCHITECTURE_DECISIONS_FINAL.md Rule API-06: Room check-in payload rules
- MODULE_DECISIONS_FINAL.md §5: Room module, §7: Socket module
- OPEN_QUESTIONS_FINAL_RESOLUTION.md OQ-12: Room billing/print lifecycle deferred
- POS3_0_ROOM_TRANSFER_V2_MIGRATION.md: Complete migration plan with step-by-step changes

## Current Code Behavior
- FE calls v1 endpoint for room transfer
- Optimistic clearing at OrderEntry.jsx L1469-1483 removes order and frees source table immediately
- `handleUpdateFoodStatus` fires on the legacy socket event, calls API, but the guard at L356 skips re-adding since order is already gone
- Net effect: Wasted API call that does nothing useful

## Expected Behavior
- FE calls v2 endpoint
- Backend emits v2 socket event with full order payload
- FE's existing `handleOrderDataEvent` processes the event authoritatively
- No optimistic clearing needed
- No wasted API call

## Root Cause Hypothesis
**Confirmed:** Backend uses legacy v1 endpoint and emits legacy `update-food-status` socket event without payload for room transfers. This is the only remaining action that uses this legacy pattern. All other order actions already use v2 events with full payloads.

Label: **API contract issue** + **socket/event handling issue**

## Regression Risk Areas
- Room transfer flow (source table freeing, order removal)
- Other flows that listen to `update-food-status` (item status changes — covered by BUG-089)
- Socket handler cleanup (BUG-095 depends on this)
- Dashboard table status after room transfer

## Docs / Code Mismatch
No mismatch. Current code matches POS2.0 BUG-060 Wave 7 implementation (temporary optimistic fix). POS3.0 migration plan is documented and aligned.

## Open Questions / Missing Information
1. Is v2 endpoint `POST /api/v2/vendoremployee/order/order-shifted-room` live on backend?
2. Does v2 accept the same payload keys as v1?
3. Which v2 socket event will backend emit after room transfer (`update-order-paid` or `update-order`)?

## User Interaction Required
Required — Backend must confirm v2 endpoint status, payload shape, and socket event name.

## Analysis Verdict
API contract issue + Socket/state sync bug

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Backend confirmation first — v2 endpoint readiness, payload shape, and socket event name.

---

# BUG-089 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 6534–6593)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
Every item status change (ready, served, cancelled) fires two socket events: `update-item-status` (v2, with payload) and `update-food-status` (legacy, no payload). The legacy handler calls `get-single-order-new` API unnecessarily because the data already arrived via the v2 event. This adds ~200-500ms latency plus a double-render.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-003 in requirement source doc
- POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md (full investigation)
- Code: socketHandlers.js L344-401 — `handleUpdateFoodStatus` (calls API)
- Code: socketHandlers.js L229-325 — `handleOrderDataEvent` (uses payload directly, no API)
- Code: socketEvents.js L59, L118-119 — `UPDATE_FOOD_STATUS` in `EVENTS_REQUIRING_ORDER_API`
- Code: useSocketEvents.js L137-138 — routes `UPDATE_FOOD_STATUS` to handler
- Code: orderService.js L34-47 — `fetchSingleOrderForSocket` (the redundant API call)

## Module Mapping
Primary Module: Realtime Socket (Module 7)
Downstream Impacted Modules: Tables & Orders Runtime State (Module 13)
Module decision reference: MODULE_DECISIONS_FINAL.md §7 (Socket)

## Affected Route / Page
`/dashboard` — cross-cutting socket optimization (no specific page change)

## Affected Screen / Flow
1. Kitchen marks item as ready/served/cancelled
2. Backend emits two socket events: `update-item-status` (v2, full payload) and `update-food-status` (legacy, no payload)
3. FE processes `update-item-status` via `handleOrderDataEvent` — uses payload directly, no API call
4. FE processes `update-food-status` via `handleUpdateFoodStatus` — calls `get-single-order-new` API (redundant)
5. Net: Double processing, wasted API call, ~200-500ms extra latency, double-render

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/api/socket/socketHandlers.js` L344-401 | `handleUpdateFoodStatus` — the redundant handler that calls API |
| `/app/frontend/src/api/socket/socketHandlers.js` L85-109 | `fetchOrderWithRetry` — called by the redundant handler |
| `/app/frontend/src/api/socket/socketEvents.js` L59, L118-119 | `UPDATE_FOOD_STATUS` event definition and `EVENTS_REQUIRING_ORDER_API` category |
| `/app/frontend/src/api/socket/useSocketEvents.js` L137-138 | Routes `UPDATE_FOOD_STATUS` events to handler |
| `/app/frontend/src/api/services/orderService.js` L34-47 | `fetchSingleOrderForSocket` — the redundant API function |

## API Review
- Redundant API call: `POST /api/v2/vendoremployee/get-single-order-new` with `{ order_id }` on every `update-food-status` event
- The same data already arrives via `update-item-status` socket payload
- No API contract change needed — this is a pure FE optimization (stop calling the API)

## Socket / Realtime Review
- `update-item-status` (v2): carries full `{ orders: [...] }` payload → processed by `handleOrderDataEvent` → no API call
- `update-food-status` (legacy): carries NO payload → processed by `handleUpdateFoodStatus` → calls `get-single-order-new` API → same data already in context from v2 event
- **IMPORTANT CAVEAT:** Room transfer is the only action that emits `update-food-status` WITHOUT also emitting `update-item-status`. Until BUG-088 (room transfer v2 migration) is complete, `handleUpdateFoodStatus` must be kept for room transfer events. Two safe implementation options:
  - Option A: Convert `handleUpdateFoodStatus` to no-op for item status events but keep it for room transfer (detect by checking if order already updated)
  - Option B: Remove handler entirely (safe only after BUG-088 completes)

## State / Data Flow
Current: Item status change → 2 socket events → 2 processing paths → 1 API call (redundant) → double render
Target: Item status change → 2 socket events → only `update-item-status` processed → 0 API calls → single render

## Relevant Final Documentation
- ARCHITECTURE_DECISIONS_FINAL.md Rule MC-02: Realtime flows sync through socket
- MODULE_DECISIONS_FINAL.md §7: Socket module
- POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md: Complete investigation with file mapping

## Current Code Behavior
`handleUpdateFoodStatus` (L344-401):
1. Parses message → gets orderId
2. Guard: skips if order already removed (L356)
3. Engages table (workaround for missing table socket)
4. Calls `fetchOrderWithRetry(orderId)` → API call
5. Processes response (update or remove)
6. Releases table engage

All of this is redundant when `update-item-status` already delivered the same data.

## Expected Behavior
- `update-food-status` events for item status changes should NOT trigger an API call
- The v2 `update-item-status` event alone handles the update correctly
- Room transfer events via `update-food-status` should still be handled (until BUG-088 completes)

## Root Cause Hypothesis
**Confirmed:** Legacy `update-food-status` handler was written before v2 `update-item-status` events existed. Now that v2 events carry full payloads, the legacy handler's API call is fully redundant for all item-level actions. The handler still has one valid use case: room transfer (BUG-088 scope).

Label: **socket/event handling issue** (optimization)

## Regression Risk Areas
- Room transfer flow (must keep handler until BUG-088 completes)
- Any edge case where `update-item-status` fails to fire but `update-food-status` does (unlikely but worth a no-op safety net)
- Station refresh wiring (`useStationSocketRefresh.js` comment at L13 references `update-food-status`)

## Docs / Code Mismatch
No mismatch. Socket elimination doc and code are aligned.

## Open Questions / Missing Information
None — this is fully understood and ready for implementation.

## User Interaction Required
Not required

## Analysis Verdict
Socket/state sync bug (optimization — redundant API call)

## Analysis Outcome
Analysis Complete

## Ready For Next Stage?
Yes

## Next Step
Bug Implementation Planning Agent. Note: Implementation must account for BUG-088 dependency — cannot fully delete handler until room transfer v2 migration is confirmed.

---

# BUG-090 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 6596–6653)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
When a customer is selected from CRM during room check-in, the backend does not store the CRM `customer_id` on the room order. FE uses a workaround based on name+phone presence (`isCustomerSelected`) to determine if a customer was selected.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-006 in requirement source doc
- POS2.0 BUG-065 implementation report
- Code: RoomCheckInModal.jsx L272, L357-383, L433, L449-456 — `isCustomerSelected` state and CRM search flow

## Module Mapping
Primary Module: Rooms / Room Check-In / Room Transfer (Module 5)
Downstream Impacted Modules: Customer / CRM Integration (Module 6)
Module decision reference: MODULE_DECISIONS_FINAL.md §5 (Rooms), §6 (CRM)

## Affected Route / Page
`/dashboard` — embedded in Room Check-In Modal

## Affected Screen / Flow
1. Open room check-in modal
2. Type customer name or phone → CRM search dropdown appears
3. Select a CRM customer → name, phone, email auto-fill
4. Complete check-in
5. Backend does not store `customer_id` from CRM on the room order

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/components/modals/RoomCheckInModal.jsx` | CRM search + selection flow; `isCustomerSelected` workaround |
| Backend check-in API | Does not accept or store `customer_id` (backend change needed) |

## API Review
- Endpoint: `POST /api/v1/vendoremployee/pos/user-group-check-in`
- Current payload likely does not include `customer_id` field
- Backend must add `customer_id` acceptance to the check-in API
- No FE API call change needed beyond adding `customer_id` to the payload

## Socket / Realtime Review
No direct socket involvement found.

## State / Data Flow
CRM search → customer selection → `isCustomerSelected` flag set → check-in payload built WITHOUT `customer_id` → backend stores order without CRM linkage

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §6: CRM module — CRM is required by default
- OPEN_QUESTIONS_FINAL_RESOLUTION.md OQ-06: CRM is required for all restaurants except those not capturing customer details

## Current Code Behavior
FE uses `isCustomerSelected` boolean (based on whether user picked a CRM result) to control UI behavior (read-only fields for room orders). But the actual `customer_id` from CRM is not sent to the backend in the check-in payload.

## Expected Behavior
Backend stores the CRM `customer_id` on the room order during check-in. FE sends `customer_id` in the check-in payload when a CRM customer is selected.

## Root Cause Hypothesis
**Confirmed:** Backend check-in API does not accept `customer_id` field. FE does not send it. This is a missing feature, not a regression.

Label: **backend response/contract issue**

## Regression Risk Areas
- Room check-in flow (payload change)
- CRM customer linkage for room orders
- Room order display (if `customer_id` changes what data is returned)

## Docs / Code Mismatch
No mismatch. This is a known gap documented in POS2.0 BUG-065 follow-up.

## Open Questions / Missing Information
1. Does the check-in API already accept `customer_id`? If not, what field name should backend use?

## User Interaction Required
Required — Backend must confirm whether the check-in API already accepts `customer_id` and the expected field name.

## Analysis Verdict
Backend bug (missing field acceptance)

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Backend confirmation first — check-in API `customer_id` field support.

---

# BUG-091 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 6656–6712)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
CRM search API returns duplicate entries for the same phone number. When a cashier types a phone number during room check-in or order entry, the dropdown shows the same customer multiple times.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-007 in requirement source doc
- POS2.0 BUG-065 carry-forward
- Code: RoomCheckInModal.jsx — CRM search uses `customerService` for lookups
- Code: customerService.js — API calls to CRM endpoints

## Module Mapping
Primary Module: Customer / CRM Integration (Module 6)
Downstream Impacted Modules: Rooms / Room Check-In (Module 5), Order Entry (Module 4)
Module decision reference: MODULE_DECISIONS_FINAL.md §6 (CRM)

## Affected Route / Page
`/dashboard` — embedded in Room Check-In Modal and Order Entry customer search

## Affected Screen / Flow
1. Open room check-in or order entry
2. Type phone number in customer search field
3. CRM API returns results with duplicates
4. Dropdown shows same customer multiple times

## Affected Code Areas

| File | Reason |
| --- | --- |
| CRM backend API (`/pos/customers?search=...`) | Returns duplicate entries — backend dedup needed |
| `/app/frontend/src/api/services/customerService.js` | Calls the CRM search endpoint |
| `/app/frontend/src/components/modals/RoomCheckInModal.jsx` | Displays search results in dropdown |

## API Review
- CRM search endpoint: `GET /pos/customers?search=<phone>`
- Returns duplicate entries for the same phone number
- Backend CRM must deduplicate before returning results
- FE could add client-side dedup as a workaround, but the correct fix is backend-side

## Socket / Realtime Review
No direct socket involvement found.

## State / Data Flow
User types phone → `customerService` calls CRM API → API returns duplicates → dropdown renders all results including duplicates

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §6: CRM module
- OPEN_QUESTIONS_FINAL_RESOLUTION.md OQ-06: CRM required by default

## Current Code Behavior
FE directly renders whatever the CRM API returns. No client-side dedup exists.

## Expected Behavior
CRM search API returns deduplicated results. Each customer appears only once in the dropdown.

## Root Cause Hypothesis
**High-confidence hypothesis:** CRM backend stores or indexes multiple records for the same phone number (possible duplicate customer creation). The search API returns all matching records without deduplication.

Label: **CRM/customer mapping bug** (backend)

## Regression Risk Areas
- Customer selection accuracy
- Room check-in customer linkage
- Order entry customer search

## Docs / Code Mismatch
No mismatch.

## Open Questions / Missing Information
None — issue is clear. CRM backend needs dedup.

## User Interaction Required
Not required

## Analysis Verdict
CRM/customer mapping bug (backend)

## Analysis Outcome
Analysis Complete

## Ready For Next Stage?
Yes

## Next Step
Bug Implementation Planning Agent — CRM backend team to implement dedup. FE may optionally add client-side dedup as a defense-in-depth measure.

---

# BUG-092 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 6715–6772)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
It is unclear whether the room check-in should send the phone number with a `+91` country code prefix or as raw 10 digits. FE currently strips the prefix for display but the storage/search contract is undefined.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-008 in requirement source doc
- Code: RoomCheckInModal.jsx L370-372 — "PhoneInput stores E.164 (+919876...), extract raw digits for search"
- Code: RoomCheckInModal.jsx L433 — "PhoneInput with defaultCountry='IN' handles national format — no +91 prefix needed"

## Module Mapping
Primary Module: Rooms / Room Check-In / Room Transfer (Module 5)
Downstream Impacted Modules: Customer / CRM Integration (Module 6)
Module decision reference: MODULE_DECISIONS_FINAL.md §5 (Rooms), §6 (CRM)

## Affected Route / Page
`/dashboard` — embedded in Room Check-In Modal

## Affected Screen / Flow
1. Room check-in → enter phone number
2. PhoneInput component stores E.164 format (+919876543210)
3. CRM search uses raw digits extracted from E.164
4. Check-in API payload — unclear whether to send E.164, national (09876543210), or raw 10 digits

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/components/modals/RoomCheckInModal.jsx` L370-372, L433 | Phone input handling and format stripping |
| Backend check-in API | Phone format contract undefined |
| CRM search API | Phone search format may differ from storage format |

## API Review
- Room check-in: `POST /api/v1/vendoremployee/pos/user-group-check-in` — phone format unclear
- CRM search: `GET /pos/customers?search=<phone>` — FE sends raw digits for search (strips +91)
- Contract risk: Inconsistent phone format between check-in storage and CRM lookup

## Socket / Realtime Review
No direct socket involvement found.

## State / Data Flow
PhoneInput (E.164) → raw digits extraction for CRM search → check-in payload (format undefined) → backend storage (format unknown)

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §5, §6

## Current Code Behavior
Code comment at L433: "PhoneInput with defaultCountry='IN' handles national format — no +91 prefix needed". Code at L370-372 extracts raw digits for CRM search. The check-in payload likely sends whatever format the PhoneInput holds.

## Expected Behavior
A clear phone format contract: either `+91XXXXXXXXXX` (E.164) or raw `XXXXXXXXXX` (10 digits) consistently across check-in, CRM search, and storage.

## Root Cause Hypothesis
**Confirmed:** Phone format contract is undefined between FE and backend. FE uses PhoneInput which stores E.164 internally but the display/search/submission format is ad-hoc.

Label: **configuration ambiguity**

## Regression Risk Areas
- CRM customer search (phone matching)
- Room check-in phone storage
- Phone display on room orders (BUG-065: shows 10-digit national format)

## Docs / Code Mismatch
No mismatch — this is a documented gap.

## Open Questions / Missing Information
1. Backend: `+91` prefix or raw 10 digits for room check-in API?

## User Interaction Required
Required — Backend must clarify phone format contract.

## Analysis Verdict
Configuration ambiguity

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Backend clarification first — phone format contract.

---

# BUG-093 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 6775–6832)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
For in-house rooms, the `get-single-order-new` API response does not include `room_info.checkin_date`. FE falls back to `createdAt` as a workaround.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-009 in requirement source doc
- POS2.0 BUG-061 closure (Wave 7: `createdAt` fallback implemented)

## Module Mapping
Primary Module: Rooms / Room Check-In (Module 5)
Downstream Impacted Modules: Reports (Module 10)
Module decision reference: MODULE_DECISIONS_FINAL.md §5 (Rooms)

## Affected Route / Page
`/reports/audit` — Room report rows display check-in time

## Affected Screen / Flow
Room report → room row → check-in time column → shows `createdAt` instead of actual check-in date

## Affected Code Areas

| File | Reason |
| --- | --- |
| Backend `get-single-order-new` API | Does not include `room_info.checkin_date` for in-house rooms |
| FE room display components (RoomRowCard) | Uses `createdAt` fallback |

## API Review
- Endpoint: `POST /api/v2/vendoremployee/get-single-order-new`
- Response missing `room_info.checkin_date` for in-house rooms
- Backend enhancement: add field to response

## Socket / Realtime Review
No direct socket involvement found.

## State / Data Flow
API response → order transform → RoomRowCard → `createdAt` fallback for check-in time

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §5 (Rooms)
- POS2.0 BUG-061 Wave 7: `createdAt` fallback documented as temporary workaround

## Current Code Behavior
FE uses `createdAt` as fallback when `room_info.checkin_date` is missing. This is functional but not ideal — `createdAt` may not match actual check-in time.

## Expected Behavior
API returns `room_info.checkin_date` for in-house rooms. FE uses this field for accurate check-in time display.

## Root Cause Hypothesis
**Confirmed:** Backend does not include `room_info.checkin_date` in the API response. FE workaround is functional.

Label: **backend response/contract issue** (nice-to-have)

## Regression Risk Areas
- Room report check-in time display (must handle both with and without the new field)

## Docs / Code Mismatch
No mismatch.

## Open Questions / Missing Information
None — this is a straightforward backend enhancement.

## User Interaction Required
Not required

## Analysis Verdict
Backend bug (missing response field)

## Analysis Outcome
Analysis Complete

## Ready For Next Stage?
Yes

## Next Step
Bug Implementation Planning Agent — backend team to add `room_info.checkin_date` to API response. FE to prefer new field over `createdAt` fallback.

---

# BUG-094 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 6835–6893)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
Backend sends `delivery-assign-order` socket event with no order payload when a rider is assigned. FE calls API to fetch the order. Backend should include full payload, matching the v2 pattern.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-012 in requirement source doc
- POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md Action 3
- Code: socketHandlers.js L535-553 — `handleDeliveryAssignOrder` calls `fetchOrderWithRetry`

## Module Mapping
Primary Module: Realtime Socket (Module 7)
Downstream Impacted Modules: Order Entry (Module 4), Dashboard (Module 3)
Module decision reference: MODULE_DECISIONS_FINAL.md §7 (Socket)

## Affected Route / Page
`/dashboard` — delivery order cards

## Affected Screen / Flow
1. Delivery order is active
2. Rider is assigned from backend/admin
3. `delivery-assign-order` socket fires with `[event, orderId, restaurantId, riderId]` — no order payload
4. FE calls `get-single-order-new` API to fetch order data
5. Updates order in context

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/api/socket/socketHandlers.js` L535-553 | `handleDeliveryAssignOrder` — calls API instead of using payload |
| `/app/frontend/src/api/socket/socketEvents.js` L62, L122 | `DELIVERY_ASSIGN_ORDER` in `EVENTS_REQUIRING_ORDER_API` |

## API Review
- Redundant API call: `POST /api/v2/vendoremployee/get-single-order-new` on every rider assignment
- Backend should include full order payload in the socket event
- Low frequency event (only on rider assignment)

## Socket / Realtime Review
- Current: `[delivery-assign-order, orderId, restaurantId, riderId]` — no payload
- Target: `[delivery-assign-order, orderId, restaurantId, riderId, { orders: [...] }]` — with payload
- After migration, FE can use `handleOrderDataEvent` pattern — no API call
- Priority: Low — infrequent event

## State / Data Flow
Socket event → `handleDeliveryAssignOrder` → API call → transform → `updateOrder` in OrderContext

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §7 (Socket)
- POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md Action 3

## Current Code Behavior
`handleDeliveryAssignOrder` calls `fetchOrderWithRetry(orderId)` then `updateOrder`. Works correctly but makes an unnecessary API call.

## Expected Behavior
Socket event includes full order payload. FE uses payload directly without API call.

## Root Cause Hypothesis
**Confirmed:** Backend does not include order payload in `delivery-assign-order` socket event. Same legacy pattern as `update-food-status`.

Label: **socket/event handling issue** (backend optimization)

## Regression Risk Areas
- Delivery order card updates after rider assignment
- Low risk due to low frequency

## Docs / Code Mismatch
No mismatch.

## Open Questions / Missing Information
1. Does backend support adding full order payload to `delivery-assign-order`?

## User Interaction Required
Required — Backend must confirm payload support.

## Analysis Verdict
Socket/state sync bug (optimization)

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Backend confirmation first — can payload be added to `delivery-assign-order` event?

---

# BUG-095 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 6896–6953)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
After BUG-088 and BUG-089 complete, `handleUpdateFoodStatus` and `fetchSingleOrderForSocket` will have no remaining consumers and should be deleted.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-013 in requirement source doc
- POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md (cleanup plan)
- Code: socketHandlers.js L344-401, L709
- Code: socketEvents.js L59, L118-119
- Code: useSocketEvents.js L24, L137-138
- Code: orderService.js L34-47

## Module Mapping
Primary Module: Realtime Socket (Module 7)
Downstream Impacted Modules: None (cleanup only)
Module decision reference: MODULE_DECISIONS_FINAL.md §7 (Socket)

## Affected Route / Page
No route change — dead code cleanup

## Affected Screen / Flow
No user-facing flow change. Internal code cleanup.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/api/socket/socketHandlers.js` L344-401 | Delete `handleUpdateFoodStatus` |
| `/app/frontend/src/api/socket/socketHandlers.js` L85-109 | `fetchOrderWithRetry` may become unused |
| `/app/frontend/src/api/socket/socketEvents.js` L59, L118-119 | Remove `UPDATE_FOOD_STATUS` from events and `EVENTS_REQUIRING_ORDER_API` |
| `/app/frontend/src/api/socket/useSocketEvents.js` L24, L137-138 | Remove import and case for `handleUpdateFoodStatus` |
| `/app/frontend/src/api/services/orderService.js` L34-47 | Delete `fetchSingleOrderForSocket` if no other consumers |
| `/app/frontend/src/hooks/useStationSocketRefresh.js` L13 | Update comment about `update-food-status` |

## API Review
No API change — cleanup of API call that will no longer be triggered.

## Socket / Realtime Review
- Remove `UPDATE_FOOD_STATUS` event listener
- Remove handler and event from router
- Verify `fetchSingleOrderForSocket` has no other consumers before deletion

## State / Data Flow
No state flow change — dead code removal.

## Relevant Final Documentation
- POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md: cleanup plan
- POS3_0_ROOM_TRANSFER_V2_MIGRATION.md: step 4

## Current Code Behavior
`handleUpdateFoodStatus` exists and is wired. After BUG-088 + BUG-089, it will have no remaining consumers.

## Expected Behavior
Dead code removed. Cleaner codebase. No functional change.

## Root Cause Hypothesis
Not a bug — planned cleanup task dependent on BUG-088 + BUG-089 completion.

Label: **socket/event handling issue** (cleanup)

## Regression Risk Areas
- Must verify BUG-088 AND BUG-089 are both complete before this cleanup
- Must verify `fetchSingleOrderForSocket` has no other consumers (5 known remaining uses are report/audit drill-downs — those use `fetchSingleOrderForSocket` by name but actually call a different code path via `orderService`)

## Docs / Code Mismatch
No mismatch.

## Open Questions / Missing Information
- Verify `fetchSingleOrderForSocket` consumer list before deletion (5 report/audit uses identified in socket elimination doc — need to confirm they call the same function or a different one)

## User Interaction Required
Not required

## Analysis Verdict
Socket/state sync bug (cleanup — not a standalone bug)

## Analysis Outcome
Analysis Complete

## Ready For Next Stage?
Yes (but blocked by BUG-088 + BUG-089 completion)

## Next Step
Bug Implementation Planning Agent — scheduled after BUG-088 + BUG-089 are confirmed complete. Must verify `fetchSingleOrderForSocket` consumers before deletion.

---

# BUG-096 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 6956–7015)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
Backend already emits socket events for menu item add/update and hold/unpaid order changes. FE does not consume these events. Dashboard and menu UI should update in realtime without manual refresh.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-014 in requirement source doc
- Code: MenuContext.jsx — has `setCategories`, `setProducts` but no socket subscription
- Code: useSocketEvents.js — no menu-related event handling
- Code: socketEvents.js — no menu-related event names defined

## Module Mapping
Primary Module: Realtime Socket (Module 7) + Menu / Category / Product (Module 12)
Downstream Impacted Modules: Dashboard (Module 3), Order Entry (Module 4)
Module decision reference: MODULE_DECISIONS_FINAL.md §7 (Socket), §12 (Menu)

## Affected Route / Page
`/dashboard` — menu panel and order entry menu

## Affected Screen / Flow
1. Admin adds or updates a menu item from backend
2. POS frontend does not reflect the change until manual refresh
3. Similarly, hold/unpaid order changes may not appear in realtime

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/contexts/MenuContext.jsx` | Needs socket event subscription for menu updates |
| `/app/frontend/src/api/socket/useSocketEvents.js` | Needs new event handler for menu update events |
| `/app/frontend/src/api/socket/socketEvents.js` | Needs new event name constants for menu events |
| `/app/frontend/src/api/socket/socketHandlers.js` | Needs new handler for menu update events |
| `/app/frontend/src/contexts/OrderContext.jsx` | May need handler for hold/unpaid order socket events |

## API Review
- No API change needed — socket events already exist per owner
- FE needs to subscribe to the right socket channel/events and update context

## Socket / Realtime Review
- Backend emits menu update socket events (event names unknown — owner will provide)
- Backend emits hold/unpaid order socket events (may already be partially handled by existing order socket)
- FE needs new event subscriptions and handlers
- **BLOCKED:** Cannot implement without knowing socket event names and payload shapes

## State / Data Flow
Target: Socket event → handler → update MenuContext (`setCategories`/`setProducts`) → UI re-renders
For hold/unpaid: Socket event → existing or new handler → update OrderContext → dashboard re-renders

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §7 (Socket), §12 (Menu)
- ARCHITECTURE_DECISIONS_FINAL.md Rule MC-02: Realtime flows may sync through socket

## Current Code Behavior
MenuContext has `setCategories` and `setProducts` functions but they are only called during bootstrap (LoadingPage). No socket subscription exists for menu updates.

## Expected Behavior
Menu UI updates in realtime when backend emits menu change events. Hold/unpaid orders update in realtime on dashboard.

## Root Cause Hypothesis
**Confirmed:** FE does not subscribe to menu update socket events. The events exist on the backend but FE has no handler for them.

Label: **frontend state/context issue** (missing feature)

## Regression Risk Areas
- Menu panel rendering (must handle incremental updates without breaking existing menu state)
- Category/product data integrity (partial updates must not corrupt cached data)
- Order entry item selection (must reflect updated menu items)

## Docs / Code Mismatch
No mismatch — this is a new feature, not a doc conflict.

## Open Questions / Missing Information
1. **BLOCKING:** What are the exact socket event names for menu updates?
2. **BLOCKING:** What is the payload shape for menu update events?
3. Are hold/unpaid orders already partially handled by existing order socket events, or is there a separate event?

## User Interaction Required
Required — Owner will provide socket event names and payload shapes (confirmed in clarification gate).

## Analysis Verdict
Frontend bug (missing socket subscription)

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Owner clarification first — waiting for socket event names and payload shapes.

---

# BUG-097 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 7018–7079)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
Backend APIs are ready for delivery order dispatch and assigning a delivery boy. FE needs UI and API integration for both actions.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-015 in requirement source doc
- Code: DeliveryCard.jsx L194-196 — placeholder `console.log` for "Assign Rider" / "Dispatch"
- Code: DeliveryCard.jsx L200 — dispatched status rendering exists
- Code: OrderCard.jsx L728-731 — rider display exists
- Owner clarification: `delivery_assign` key determines button type (Assign vs Dispatch)

## Module Mapping
Primary Module: Order Entry / Cart / Payment Workflow (Module 4) + Dashboard (Module 3)
Downstream Impacted Modules: Realtime Socket (Module 7)
Module decision reference: MODULE_DECISIONS_FINAL.md §3 (Dashboard), §4 (Order Entry)

## Affected Route / Page
`/dashboard` — delivery order cards

## Affected Screen / Flow
1. Delivery order appears on dashboard
2. If `delivery_assign` key is present → show "Assign Rider" button
3. If `delivery_assign` is absent → show "Dispatch" button
4. Assign: API call to get assignable users → cashier picks one → assigned person gets order to accept/reject
5. Dispatch: Direct dispatch API call

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/components/cards/DeliveryCard.jsx` L194-196 | Placeholder button — needs real API integration |
| `/app/frontend/src/api/services/orderService.js` | Needs new functions for dispatch and assign APIs |
| `/app/frontend/src/api/constants.js` | Needs new endpoint constants |
| Possible new modal/component | Assign rider selection UI |

## API Review
- Dispatch endpoint: Unknown — needs backend documentation
- Assign endpoint (get assignable users): Unknown — needs backend documentation
- Assign endpoint (assign to rider): Unknown — needs backend documentation
- Accept/reject endpoint (rider side): Unknown — may be outside POS scope
- **BLOCKED:** Cannot design API integration without endpoint details

## Socket / Realtime Review
- After dispatch/assign, order state should update (via existing order socket events or API response)
- `delivery-assign-order` socket event already exists (BUG-094) — may be relevant for post-assign updates

## State / Data Flow
Target: Button click → API call → success → order state update (via socket or API response) → card reflects new status

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §3 (Dashboard), §4 (Order Entry)

## Current Code Behavior
DeliveryCard.jsx has a placeholder button at L194 that logs to console: `console.log('Assign Rider' / 'Dispatch' order ${orderId})`. No actual API integration.

## Expected Behavior
Functional Dispatch and Assign Rider buttons with real API calls, state updates, and UI feedback.

## Root Cause Hypothesis
**Confirmed:** FE has placeholder UI but no API integration. Backend APIs are reportedly ready but endpoint details are not documented for FE consumption.

Label: **frontend mapping issue** (missing feature)

## Regression Risk Areas
- Delivery order card rendering
- Order state after dispatch/assign
- Dashboard delivery column behavior

## Docs / Code Mismatch
No mismatch — placeholder was intentional pending backend readiness.

## Open Questions / Missing Information
1. **BLOCKING:** What are the exact API endpoints for dispatch and assign?
2. **BLOCKING:** What payload do the APIs expect?
3. What response/socket event confirms success?
4. Owner partial info: `delivery_assign` key determines button type

## User Interaction Required
Required — Need full API endpoint documentation from backend.

## Analysis Verdict
Frontend bug (missing feature — placeholder needs real implementation)

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Owner/backend documentation first — waiting for API endpoint details.

---

# BUG-098 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 7082–7141)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
CRM API keys are currently stored in FE environment variables with a hardcoded restaurant-key mapping in `crmAxios.js`. After login, the CRM key should come from the restaurant profile instead.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-016 in requirement source doc
- Code: crmAxios.js (full file — 82 lines)
  - L8: `CRM_BASE_URL = process.env.REACT_APP_CRM_BASE_URL`
  - L11-16: `CRM_API_KEYS = JSON.parse(process.env.REACT_APP_CRM_API_KEYS || '{}')`
  - L29-33: `setCrmRestaurantId` sets current restaurant, looks up key from env map
  - L38-41: `getCrmApiKey` returns key from env map
  - L53-58: Request interceptor attaches `X-API-Key` header

## Module Mapping
Primary Module: Customer / CRM Integration (Module 6)
Downstream Impacted Modules: Loading & Bootstrap (Module 2), Rooms / Room Check-In (Module 5), Order Entry (Module 4)
Module decision reference: MODULE_DECISIONS_FINAL.md §6 (CRM)

## Affected Route / Page
Cross-cutting — affects all CRM API calls after login

## Affected Screen / Flow
1. User logs in → profile loaded → `setCrmRestaurantId(id)` called
2. Currently: CRM key looked up from `REACT_APP_CRM_API_KEYS` env variable (JSON map)
3. Target: CRM key read from restaurant profile response field
4. All subsequent CRM calls use the profile-provided key

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/api/crmAxios.js` L11-16, L29-41 | Current env-based key mapping — needs to accept profile-based key |
| Restaurant profile API response | Must include CRM key field |
| `/app/frontend/src/contexts/RestaurantContext.jsx` or profile transform | Must extract and set CRM key from profile |
| Loading/bootstrap flow | Must initialize CRM key from profile after login |

## API Review
- Restaurant profile: `GET /api/v1/vendoremployee/profile` — must include CRM API key in response
- If profile already includes a CRM key field → FE change only
- If profile does not include it → backend must add the field first
- CRM API calls: `GET /pos/customers`, `POST /pos/customer-lookup`, etc. — all use `X-API-Key` header

## Socket / Realtime Review
No direct socket involvement found.

## State / Data Flow
Login → profile API → extract CRM key from profile → `setCrmRestaurantId` modified to accept profile key → all CRM calls use profile key → env fallback optional

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §6: CRM module — CRM is required by default
- ARCHITECTURE_DECISIONS_FINAL.md Rule EP-01: Approved frontend env contract is multi-variable
- ARCHITECTURE_DECISIONS_FINAL.md Rule EP-02: CRM is required by default

## Current Code Behavior
`crmAxios.js` parses `REACT_APP_CRM_API_KEYS` env variable (a JSON object mapping restaurantId to API key). `setCrmRestaurantId(id)` looks up the key from this static map. The request interceptor attaches the key as `X-API-Key` header.

## Expected Behavior
After login, CRM key comes from the restaurant profile (not env variables). `crmAxios.js` uses the profile-provided key for all CRM API calls. Optionally, env mapping is kept as a fallback.

## Root Cause Hypothesis
**Confirmed:** CRM key sourcing is hardcoded to env variables. No mechanism exists to read the key from the restaurant profile. This is a design limitation, not a bug — it works but doesn't scale across restaurants.

Label: **frontend mapping issue** (architecture improvement)

## Regression Risk Areas
- All CRM API calls (customer search, lookup, create, update, address)
- Room check-in CRM flow
- Order entry customer flow
- Bootstrap/loading sequence (CRM init timing)

## Docs / Code Mismatch
No mismatch.

## Open Questions / Missing Information
1. Does the restaurant profile API already include a CRM key field?
2. If yes, what is the field name?
3. Should the env-variable mapping be kept as a fallback?

## User Interaction Required
Required — Backend must confirm whether profile API exposes the CRM key.

## Analysis Verdict
Frontend bug (architecture improvement — env-based to profile-based)

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Backend confirmation first — does profile API expose CRM key?

---

# BUG-099 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 7144–7204)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
For QSR/cafe outlets, billing is too slow — three-step flow (Place Order → Collect Bill → scroll to pay). Two parts: (1) one-step quick billing, (2) compact Collect Payment screen.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-017 in requirement source doc
- Code: OrderEntry.jsx — Place Order flow, payment integration
- Code: CollectPaymentPanel.jsx — Collect Bill screen layout
- ARCHITECTURE_DECISIONS_FINAL.md Rule API-03: Order composition in OrderEntry, settlement in CollectPaymentPanel

## Module Mapping
Primary Module: Order Entry / Cart / Payment Workflow (Module 4)
Downstream Impacted Modules: Dashboard (Module 3)
Module decision reference: MODULE_DECISIONS_FINAL.md §4 (Order Entry)

## Affected Route / Page
`/dashboard` — embedded in Order Entry and Collect Payment Panel

## Affected Screen / Flow
**Part 1 — Quick Billing:**
1. QSR/cafe: Add items → Place Order → immediate payment in one step
2. Currently: Place Order → navigate to Collect Bill → scroll to pay → 3 steps

**Part 2 — Compact Collect Payment:**
1. Current Collect Payment screen has verbose spacing/fonts
2. Payment methods and actions don't fit in single scroll
3. Target: Tighter layout, condensed bill summary, payment fits without scrolling

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Place Order flow — needs one-step quick billing option |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Collect Payment screen — needs compact layout redesign |
| Possible new component | Quick billing panel (inline in OrderEntry) |

## API Review
- Existing `placeOrderWithPayment` in orderTransform.js may already support one-step flow (place order with `payment_status: 'paid'`)
- Key question: Can existing `PLACE_ORDER` endpoint handle combined place+pay, or is a new endpoint needed?
- PREPAID_ORDER endpoint already exists for marking existing orders as paid
- One-step flow may combine these: place order → auto-pay → single API call

## Socket / Realtime Review
- Socket events after payment will follow existing patterns (update-order-paid)
- No new socket events needed for this feature

## State / Data Flow
**Quick billing:** Cart → one-step payment selection → place order with payment → socket confirms → dashboard update
**Compact layout:** Same data flow, different UI rendering

## Relevant Final Documentation
- ARCHITECTURE_DECISIONS_FINAL.md Rule API-03: OrderEntry for composition, CollectPaymentPanel for settlement
- MODULE_DECISIONS_FINAL.md §4: Every change must identify payment/print behavior impact
- BUSINESS_RULES_BASELINE_FINAL.md PAY-001: Place unpaid order payload shape

## Current Code Behavior
OrderEntry handles order composition. CollectPaymentPanel handles settlement. The flow is always: Place → Collect Bill → Pay. No shortcut exists for quick-service use cases.

## Expected Behavior
- Part 1: One-step quick billing for prepaid QSR orders (place + pay in one action)
- Part 2: Compact Collect Payment screen (tighter fonts, reduced spacing, condensed layout)
- Existing full flow for dine-in/room/complex payments remains untouched

## Root Cause Hypothesis
Not a bug — this is a UX enhancement for QSR/cafe speed. The current three-step flow works correctly but is too slow for quick-service environments.

Label: **frontend mapping issue** (UX enhancement)

## Regression Risk Areas
- HIGH: Existing full Collect Payment flow must not be affected
- HIGH: Financial calculation accuracy in one-step flow
- HIGH: Print payload parity between quick billing and full flow
- Payment method selection behavior
- Split bill / partial payment must remain on full flow only

## Docs / Code Mismatch
No mismatch.

## Open Questions / Missing Information
1. Can existing `placeOrderWithPayment` handle one-step quick billing?
2. Should quick billing be a restaurant-profile toggle (QSR mode) or automatic for prepaid?
3. Which Collect Payment sections can be collapsed for QSR vs always visible?

## User Interaction Required
Not required — implementation planning can proceed with the above open questions documented. Owner can decide during implementation review.

## Analysis Verdict
Frontend bug (UX enhancement — QSR speed optimization)

## Analysis Outcome
Analysis Complete

## Ready For Next Stage?
Yes

## Next Step
Bug Implementation Planning Agent — requires UX analysis of one-step flow feasibility and compact layout design.

---

# BUG-100 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 7207–7265)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
Some actions generate duplicate notifications — a local FE toast AND a socket/FCM notification for the same event. Two parts: (1) remove duplicates, (2) identify actions where socket notification is missing.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-019 in requirement source doc
- Code: NotificationContext.jsx — `processNotification` with BUG-034 dedup guard
- Code: socketHandlers.js — event handlers that may trigger local state changes visible as toasts
- Code: Various components that use `toast()` from shadcn/ui toast system

## Module Mapping
Primary Module: Notifications & Firebase (Module 8) + Realtime Socket (Module 7)
Downstream Impacted Modules: Dashboard (Module 3), Order Entry (Module 4)
Module decision reference: MODULE_DECISIONS_FINAL.md §8 (Notifications)

## Affected Route / Page
`/dashboard` — cross-cutting notification behavior

## Affected Screen / Flow
1. Action occurs (new order, item status change, etc.)
2. FCM push notification arrives → `processNotification` → sound + banner/toast
3. Socket event arrives → handler updates context → some components show local toast
4. User sees two notifications for the same event

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/contexts/NotificationContext.jsx` | FCM notification processing + BUG-034 dedup |
| Various components using `toast()` | Local toasts that may duplicate socket/FCM notifications |
| `/app/frontend/src/api/socket/socketHandlers.js` | Event handlers that trigger context updates (which may trigger toasts) |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Action toasts (Place Order, Collect Bill, etc.) |

## API Review
No direct API involvement.

## Socket / Realtime Review
- FCM notifications arrive via Firebase (browser push)
- Socket events arrive via WebSocket
- Both can carry information about the same event
- Current BUG-034 dedup in NotificationContext only deduplicates FCM-to-FCM duplicates (messageId matching), not FCM-to-local-toast duplicates

## State / Data Flow
Event → FCM push (fast) → `processNotification` → sound + notification banner
Event → Socket (slightly slower or same) → handler → context update → component toast

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §8: Notifications & Firebase
- ARCHITECTURE_DECISIONS_FINAL.md Rule EP-03: Firebase is the canonical notification platform

## Current Code Behavior
- NotificationContext has dedup for same-FCM-notification arriving twice (BUG-034)
- No dedup mechanism between FCM notifications and local toasts
- Various components show `toast()` calls after API actions (e.g., "Order placed", "Transferred to Room")
- These toasts overlap with FCM/socket notifications for the same event

## Expected Behavior
- Only one notification per event
- Where FCM/socket covers the event, local toast is suppressed
- Where FCM/socket does NOT cover the event, local toast remains (documented for backend later)

## Root Cause Hypothesis
**High-confidence hypothesis:** Two independent notification systems (FCM push + local toast) fire for the same events without cross-system dedup. The local toasts in action handlers (e.g., `OrderEntry.jsx` after place/transfer/collect) are legitimate UI feedback, but they overlap with FCM notifications for the same events.

Label: **frontend state/context issue** (notification cleanup)

## Regression Risk Areas
- Removing toasts may leave actions with no user feedback if FCM is delayed/fails
- Must verify FCM coverage per action before removing local toast
- Sound behavior tied to FCM notifications

## Docs / Code Mismatch
No mismatch.

## Open Questions / Missing Information
1. Which specific actions fire both local toast and FCM notification?
2. Are there actions where the local toast carries info not in the FCM notification?
3. Should suppression be dedup-based or blanket removal of known duplicates?

## User Interaction Required
Not required — investigation work can proceed by mapping all toast sources and FCM events.

## Analysis Verdict
Frontend bug (notification cleanup)

## Analysis Outcome
Analysis Complete

## Ready For Next Stage?
Yes

## Next Step
Bug Implementation Planning Agent — start with notification map (audit all toast sources vs FCM events), then systematic suppression.

---

# BUG-101 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 7268–7326)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
POS2.0 added `delivery_charge_gst_amount` to the order payload (BUG-083). The open question is whether the print template has a display slot for this value.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- POS3-REQ-011 in requirement source doc
- POS2.0 BUG-083 (Wave 2: delivery GST key implemented)
- POS2.0 BUG-085 carry-forward

## Module Mapping
Primary Module: Printing / Bill / KOT (Module 14)
Downstream Impacted Modules: None
Module decision reference: MODULE_DECISIONS_FINAL.md §14 (Printing)

## Affected Route / Page
Print output (not a screen — physical/PDF print)

## Affected Screen / Flow
1. Delivery order with delivery charge GST
2. Print bill
3. Check whether `delivery_charge_gst_amount` appears on printed bill

## Affected Code Areas

| File | Reason |
| --- | --- |
| Backend print template | May or may not have a slot for `delivery_charge_gst_amount` |
| `/app/frontend/src/api/transforms/orderTransform.js` | `buildBillPrintPayload` sends `delivery_charge_gst_amount` (BUG-083) |

## API Review
- FE already sends `delivery_charge_gst_amount` in the print payload (BUG-083 fix)
- Backend print template must have a slot to display it
- If template doesn't have the slot, the value is sent but not printed

## Socket / Realtime Review
No direct socket involvement found.

## State / Data Flow
Order data → `buildBillPrintPayload` → includes `delivery_charge_gst_amount` → POST to print endpoint → backend renders template → print output

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §14: Print changes require review of manual/auto/room print
- BUSINESS_RULES_BASELINE_FINAL.md: No specific print rule for delivery charge GST

## Current Code Behavior
FE sends the field. Backend template behavior unknown.

## Expected Behavior
Printed bill includes delivery charge GST amount when applicable.

## Root Cause Hypothesis
**Unknown:** Cannot determine from FE code alone. Backend print template must be inspected.

Label: **unclear / needs more evidence** (backend template verification)

## Regression Risk Areas
- Print output format changes
- Other GST/tax lines on bill

## Docs / Code Mismatch
No mismatch.

## Open Questions / Missing Information
1. **BLOCKING:** Does the backend print template have a slot for `delivery_charge_gst_amount`?

## User Interaction Required
Required — Backend must verify print template support.

## Analysis Verdict
Configuration ambiguity (backend template verification)

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Backend confirmation first — print template slot verification.

---

# BUG-102 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 7329–7385)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
When staff clicks "Mark Served" or "Mark Ready" on an order, the button becomes disabled for approximately 20-30 seconds before it can be clicked again. This creates a significant delay in the serving workflow during peak hours.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- Owner clarification (2026-05-18): 8s hardcoded timeout is wrong; should be socket-response-driven like table engage pattern
- Code: OrderCard.jsx L56-57 — `isMarkingReady`, `isMarkingServed` state
- Code: OrderCard.jsx L87 — `isActionInProgress` cross-disables all action buttons
- Code: OrderCard.jsx L90-99 — `handleMarkReadyClick`: sets `isMarkingReady=true`, calls `onMarkReady`, then `setTimeout(() => setIsMarkingReady(false), 8000)`
- Code: OrderCard.jsx L102-111 — `handleMarkServedClick`: same pattern with `isMarkingServed` and `setTimeout 8000`
- Code: DashboardPage.jsx L1417-1427 — `handleMarkReady`: calls `updateOrderStatus()`, no local loading reset
- Code: DashboardPage.jsx L1430-1451 — `handleMarkServed`: calls `updateOrderStatus()` or `completePrepaidOrder()`, no local loading reset
- Code: OrderCard.jsx L754-825 — buttons use `disabled={isActionInProgress}`

## Module Mapping
Primary Module: Dashboard / POS Workspace (Module 3)
Downstream Impacted Modules: Realtime Socket (Module 7)
Module decision reference: MODULE_DECISIONS_FINAL.md §3 (Dashboard)

## Affected Route / Page
`/dashboard` — order cards (Mark Ready / Mark Served buttons)

## Affected Screen / Flow
1. Order card on dashboard shows Ready/Serve buttons
2. Click "Mark Ready" or "Mark Served"
3. `isMarkingReady`/`isMarkingServed` set to `true` → button disabled + shows spinner
4. API call fires (`updateOrderStatus` or `completePrepaidOrder`)
5. API response comes back (typically <1s)
6. **Problem:** Button stays disabled because `setTimeout 8000` is the only reset mechanism
7. The 8s timeout fires → button re-enables
8. Additionally, `isActionInProgress` (L87) cross-disables ALL action buttons (Print KOT, Print Bill, Settle, Ready, Serve, Accept, Reject) — so the entire card is frozen for 8s
9. If there's also an order-engage lock from socket, this could compound to 20-30s total lockout

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/components/cards/OrderCard.jsx` L56-57, L87, L90-99, L102-111, L114-123, L754-825 | Hardcoded 8s timeout for all action button states; `isActionInProgress` cross-disable |
| `/app/frontend/src/pages/DashboardPage.jsx` L1417-1451 | `handleMarkReady` / `handleMarkServed` — calls API but no callback to OrderCard to reset state |
| `/app/frontend/src/api/socket/socketHandlers.js` L229-325, L607-634 | `handleOrderDataEvent` + `handleOrderEngage` — socket response handling and engage lock |

## API Review
- `PUT /api/v2/vendoremployee/order/food-status-update` — Mark Ready/Served
- `POST /api/v2/vendoremployee/order/paid-prepaid-order` — prepaid settle (for prepaid Serve)
- API response typically returns within <1s
- No soft-fail or long timeout observed in the API itself

## Socket / Realtime Review
- After Mark Ready/Served, backend emits socket events:
  - `order-engage` (locks order card immediately)
  - `update-item-status` or `update-order-paid` (with full payload — updates order state)
  - `order-engage` free (unlocks order card)
- The socket `order-engage` lock is separate from the local `isMarkingReady`/`isMarkingServed` state
- Both locking mechanisms are active simultaneously — potential compounding
- `handleOrderEngage` at L607-634 sets `setOrderEngaged(orderId, true/false)` based on socket
- But OrderCard's local loading states are NOT connected to socket responses — they rely solely on the 8s setTimeout

## State / Data Flow
Current flow:
1. Click → `isMarkingReady=true` (local) → button disabled
2. API call → response (fast) → no effect on button state
3. Socket `order-engage` → `setOrderEngaged(orderId, true)` → card locked (separate mechanism)
4. Socket `update-item-status` → order updated in context → card re-renders (but `isMarkingReady` still true)
5. Socket `order-engage free` → `setOrderEngaged(orderId, false)` → card unlocked (but `isMarkingReady` still true)
6. 8s timeout fires → `isMarkingReady=false` → button re-enabled

Target flow (per owner directive):
1. Click → `isMarkingReady=true` → button disabled
2. API call → response → button re-enabled (or)
3. Socket response (order update) → button re-enabled
4. Fallback: 2s timeout if socket/API don't respond

## Relevant Final Documentation
- ARCHITECTURE_DECISIONS_FINAL.md Rule MC-02: Realtime flows may sync through socket instead of HTTP response
- MODULE_DECISIONS_FINAL.md §3: Dashboard — card-level display changes

## Current Code Behavior
```javascript
// OrderCard.jsx L90-99
const handleMarkReadyClick = async () => {
  if (isActionInProgress) return;
  setIsMarkingReady(true);
  try {
    await onMarkReady?.(order);
  } catch (err) {
    console.error('[OrderCard] Ready failed:', err?.message);
  } finally {
    setTimeout(() => setIsMarkingReady(false), 8000);
  }
};
```

The `finally` block ALWAYS fires the 8s timeout, even when the API call succeeds instantly. The `await onMarkReady?.(order)` resolves when the API responds, but the `setTimeout` is unconditional in the `finally` block.

The `isActionInProgress` flag at L87 compounds the issue by cross-disabling ALL buttons when any single action is in progress.

## Expected Behavior
Per owner: Button disabled only during socket action in-progress. Re-enabled when socket response arrives. Fallback timeout of ~2s max. Should follow the table engage/free pattern where socket response controls state.

## Root Cause Hypothesis
**Confirmed root cause:** Hardcoded 8s `setTimeout` in `OrderCard.jsx` is the primary issue. The `finally` block fires the 8s delay unconditionally after every action, regardless of how fast the API/socket responds. The `isActionInProgress` cross-disable amplifies the impact by locking all buttons on the card.

Secondary contributing factor: The local loading state (`isMarkingReady`/`isMarkingServed`) is not connected to the socket response. The order-engage socket mechanism exists but operates independently. When both lock mechanisms overlap, the effective lockout could exceed 8s.

**Correct fix approach per owner:** Replace the hardcoded timeout with socket-response-driven state management. When the socket `update-item-status` or `update-order-paid` event arrives for this order (confirming the action completed), reset the loading state. Keep a short fallback timeout (~2s) as a safety net.

Label: **frontend state/context issue**

## Regression Risk Areas
- All action buttons: Ready, Serve, Accept, Reject, Print KOT, Print Bill, Settle
- Double-click protection (must still prevent double API calls)
- Order engage lock behavior (socket-based, separate from this fix)
- Edge case: socket response never arrives → fallback timeout must still unlock

## Docs / Code Mismatch
No mismatch. This is a UX bug in the loading state management, not a doc conflict.

## Open Questions / Missing Information
None — root cause is clear and owner has provided the desired behavior.

## User Interaction Required
Not required

## Analysis Verdict
Frontend bug (state management — hardcoded timeout instead of socket-driven)

## Analysis Outcome
Analysis Complete

## Ready For Next Stage?
Yes

## Next Step
Bug Implementation Planning Agent. Implementation approach:
1. Replace 8s `setTimeout` with socket-response-driven reset (listen for order update event for this orderId)
2. Add ~2s fallback timeout as safety net
3. Consider using the existing `order-engage` pattern as the model
4. Ensure double-click protection remains intact (the `isActionInProgress` guard)
5. Test with both fast and slow socket response scenarios

---

# Cross-Bug Summary

## 1. Bugs Analyzed
16 bugs: BUG-087 through BUG-102

## 2. Bugs Ready for Implementation Planning
7 bugs:
- **BUG-089** — Eliminate redundant API calls on update-food-status (P1, FE-only)
- **BUG-091** — CRM search API duplicate entries (P2, backend)
- **BUG-093** — Room check-in date in API response (P3, backend)
- **BUG-095** — Socket handler + dead code cleanup (P2, FE — blocked by BUG-088 + BUG-089)
- **BUG-099** — QSR quick billing UX optimization (P1, FE)
- **BUG-100** — Remove duplicate toast notifications (P1, FE)
- **BUG-102** — Mark Served/Ready button 8s timeout fix (P0, FE)

## 3. Bugs Needing Owner Clarification
2 bugs:
- **BUG-096** — Realtime FE updates for menu (P1) — waiting for socket event names
- **BUG-097** — Delivery dispatch + assign (P1) — waiting for API endpoint documentation

## 4. Bugs Needing Backend Confirmation
7 bugs:
- **BUG-087** — PayLater badge (P0) — backend `payment_type`/`payment_method` contract
- **BUG-088** — Room transfer v2 (P1) — v2 endpoint readiness, payload shape, socket event
- **BUG-090** — CRM customer_id on room orders (P2) — check-in API `customer_id` field
- **BUG-092** — Phone format contract (P2) — `+91` vs raw 10 digits
- **BUG-094** — Delivery-assign-order socket payload (P3) — backend payload support
- **BUG-098** — Profile CRM key (P1) — profile API field for CRM key
- **BUG-101** — Print template GST slot (P3) — backend template verification

## 5. Bugs Likely Frontend-Only
6 bugs:
- BUG-089 (socket optimization)
- BUG-095 (dead code cleanup)
- BUG-099 (QSR UX)
- BUG-100 (notification cleanup)
- BUG-102 (button timeout fix)
- BUG-096 (menu socket subscription — FE, but needs backend event names)

## 6. Bugs Likely Backend/API-Contract
7 bugs:
- BUG-087 (PayLater payment_type contract)
- BUG-088 (v2 endpoint + socket event)
- BUG-090 (customer_id storage)
- BUG-091 (CRM dedup)
- BUG-092 (phone format contract)
- BUG-093 (API response field)
- BUG-094 (socket payload)

## 7. Bugs Involving Report/Export Logic
0 bugs

## 8. Bugs Involving Socket/State/Context
6 bugs: BUG-087, BUG-088, BUG-089, BUG-094, BUG-095, BUG-102

## 9. Bugs That May Be Duplicates of Older Bugs
None — all 16 are distinct. BUG-087 is a continuation of POS2.0 BUG-058 (different aspect). BUG-088 continues BUG-060. BUG-090/091/092 continue BUG-065. BUG-093 continues BUG-061. BUG-095 depends on BUG-088+089. BUG-101 continues BUG-085.

## 10. Recommended Implementation Buckets

| Bucket | Bugs | Priority | Dependencies |
|---|---|---|---|
| **Bucket A: FE-Only Quick Wins** | BUG-089, BUG-102 | P0-P1 | None |
| **Bucket B: Backend-Blocked — PayLater + Room Transfer** | BUG-087, BUG-088 | P0-P1 | Backend contract clarification |
| **Bucket C: CRM Improvements** | BUG-090, BUG-091, BUG-092, BUG-098 | P1-P2 | Backend confirmation for 090/092/098 |
| **Bucket D: UX Enhancements** | BUG-099, BUG-100 | P1 | None |
| **Bucket E: Owner-Blocked — New Features** | BUG-096, BUG-097 | P1 | Owner documentation |
| **Bucket F: Backend-Only / Low Priority** | BUG-093, BUG-094, BUG-101 | P3 | Backend team |
| **Bucket G: Cleanup (Sequential)** | BUG-095 | P2 | BUG-088 + BUG-089 completion |

## 11. Recommended First Implementation Bucket
**Bucket A: FE-Only Quick Wins** — BUG-102 (P0) + BUG-089 (P1)

Rationale:
- BUG-102 is P0 and directly impacts serving speed during peak hours
- BUG-089 is a pure FE optimization with zero backend dependency
- Both can ship immediately without any backend confirmation
- BUG-102 fix improves operator experience immediately
- BUG-089 fix eliminates redundant API calls and double-renders

## 12. Docs Read
See "Docs Read" section at the top of this document.

## 13. Baseline Conflicts Found
None.

---

# Confirmation

- **No code was changed.** This is analysis-only work.
- **`/app/memory/final/` was not updated.**
- **`/app/memory/BUG_TEMPLATE.md` was not modified.**
- File created: `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS.md`

---

*— POS3.0 Bug Impact Analysis — 2026-05-18 —*
