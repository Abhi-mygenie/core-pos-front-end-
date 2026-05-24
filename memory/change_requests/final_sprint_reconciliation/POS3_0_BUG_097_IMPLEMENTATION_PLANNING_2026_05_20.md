# POS3.0 BUG-097 — Dispatch Implementation Planning (with Socket Architecture Review) — 2026-05-20

## 1. Purpose

This document is the implementation planning for BUG-097, including the **mandatory socket architecture review** required before any delivery flow work can begin.

This is planning only. No code was changed. No QA run. No `/app/memory/final/` updated.

---

## 2. Scope

**In scope:** BUG-097 — Delivery Dispatch + Assign Rider (all 3 approved buckets)

**Out of scope:** All other POS3.0 items.

---

## 3. Inputs Read

### Baseline Docs
1. `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
2. `/app/memory/final/MODULE_DECISIONS_FINAL.md`
3. `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`

### Analysis + Planning Docs
4. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_097_ANALYSIS_2026_05_19.md`
5. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_097_104_CONTINUATION_PLANNING_2026_05_20.md`
6. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_097_104_QUESTION_CLEARANCE_2026_05_20.md`
7. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_REQUIREMENT_SOURCE_FOR_INTAKE_2026_05_18.md` (RAW-14, RAW-20, POS3-REQ-012, POS3-REQ-015)

### Code Files Inspected
8. `/app/frontend/src/api/socket/socketEvents.js` (156 lines) — full file
9. `/app/frontend/src/api/socket/useSocketEvents.js` (249 lines) — full file
10. `/app/frontend/src/api/socket/socketHandlers.js` (800 lines) — full file
11. `/app/frontend/src/components/cards/DeliveryCard.jsx` (225 lines) — full file
12. `/app/frontend/src/api/transforms/orderTransform.js` — grep for rider/dispatch/source/delivery fields
13. `/app/frontend/src/utils/statusHelpers.js` — grep for rider status config
14. `/app/frontend/src/api/constants.js` — grep for delivery endpoints
15. `/app/frontend/src/pages/DashboardPage.jsx` — grep for delivery card rendering

---

## 4. Architecture Rules Governing This Work

| Rule | Source | Relevance to BUG-097 |
|---|---|---|
| **MC-02** | ARCHITECTURE_DECISIONS_FINAL | "Realtime flows may sync through socket instead of HTTP response." — Dispatch and assignment state updates may arrive via socket, NOT via API response body. |
| **FA-03** | ARCHITECTURE_DECISIONS_FINAL | "Do not expand hotspot files casually." — `socketHandlers.js` is a listed hotspot. New delivery handlers must be minimal. |
| **FA-06 (implicit)** | ARCHITECTURE_DECISIONS_FINAL §Refactor guardrails | "Preserve socket event names/channels unless backend contract is verified." — Must not assume socket event names. |
| **Module 7** | MODULE_DECISIONS_FINAL §7 | "Socket changes require channel/event inventory and downstream state review." — Full inventory included below. |
| **SM-05** | ARCHITECTURE_DECISIONS_FINAL | "Orders are live runtime sources." — OrderContext is the single source of order state. |
| **SM-07** | ARCHITECTURE_DECISIONS_FINAL | "Table status is derived from order-socket `f_order_status`." — Delivery orders have `tableId = 0`, so table status sync is irrelevant. |
| **API-01** | ARCHITECTURE_DECISIONS_FINAL | "Prefer service-layer entry points for new work." — New delivery APIs must go through service layer. |

---

## 5. Socket / Realtime Architecture Review for BUG-097

### 5.1 Current Socket Handler Inventory (Delivery-Relevant)

| # | Handler | File:Line | Event Name | Category | How It Works |
|---|---|---|---|---|---|
| 1 | `handleDeliveryAssignOrder` | socketHandlers.js L593-612 | `delivery-assign-order` | `EVENTS_REQUIRING_ORDER_API` | Receives `[event, orderId, restaurantId, riderId]`. Calls `fetchOrderWithRetry(orderId)` → API `get-single-order-new` → transforms → `updateOrder()`. **No payload in socket — fetches from API.** |
| 2 | `handleOrderDataEvent` | socketHandlers.js L237-351 | `update-order`, `update-order-target`, `update-order-source`, `update-order-paid`, `update-item-status` | `EVENTS_WITH_PAYLOAD` | Receives full `{orders:[...]}` payload at index 4. Transforms via `orderFromAPI.order()`. Decides update/remove based on terminal status. **No API call — uses payload directly.** |
| 3 | `handleUpdateOrderStatus` | socketHandlers.js L449-516 | `update-order-status` | `EVENTS_REQUIRING_ORDER_API` | Receives full `{orders:[...]}` payload (v2 migrated). Transforms via `orderFromAPI.order()`. Decides update/remove. |
| 4 | `handleNewOrder` | socketHandlers.js L154-214 | `new-order` | `EVENTS_WITH_PAYLOAD` | Full payload. Transforms and adds order. |

### 5.2 Existing Events Relevant to Delivery Dispatch / Assignment / Delivered Status

| Event Name | Defined In | Handler | Payload? | Relevance to BUG-097 |
|---|---|---|---|---|
| `delivery-assign-order` | socketEvents.js L62 | `handleDeliveryAssignOrder` L593 | **NO** (calls API) | Fires when rider is assigned. Existing handler fetches order + updates context. **Already partially handles assignment state.** |
| `update-order-status` | socketEvents.js L60 | `handleUpdateOrderStatus` L449 | **YES** (v2 migrated) | Generic order status change. **May fire after dispatch/delivered API calls.** |
| `update-order` | socketEvents.js L58 | `handleOrderDataEvent` L237 | **YES** | Generic order data update. **May fire after dispatch/delivered API calls.** |
| `update-order-paid` | socketEvents.js L67 | `handleOrderDataEvent` L237 | **YES** | Order payment completion. **Unlikely to fire for dispatch but possible for delivered.** |

### 5.3 Socket Channel / Event Flow

All delivery-related events arrive on the **order channel**: `new_order_${restaurantId}`.

```
Order channel (new_order_${restaurantId})
  ├── delivery-assign-order     → handleDeliveryAssignOrder (fetches API)
  ├── update-order-status       → handleUpdateOrderStatus (uses payload)
  ├── update-order              → handleOrderDataEvent (uses payload)
  ├── update-order-paid         → handleOrderDataEvent (uses payload)
  └── [unknown events for rider accept/reject?]
```

### 5.4 Critical Finding: `orderTransform.fromAPI.order()` Does NOT Map Rider Fields

Inspected `orderTransform.js` — the `fromAPI.order()` function at L150-300 maps 50+ fields from the API order object, but **does NOT map any rider-related fields**:

| Field | Mapped? | Notes |
|---|---|---|
| `api.order_in` → `source` | **Yes** (L257) | Used for Dispatch vs Assign button logic |
| `api.order_in` → `orderIn` | **Yes** (L187) | Raw value preserved |
| `api.rider_name` → `rider` | **No** | DeliveryCard L112 accesses `order.rider` but it's never set |
| `api.rider_phone_number` → `riderPhone` | **No** | DeliveryCard L116 accesses `order.riderPhone` but it's never set |
| `api.rider_status` → `riderStatus` | **No** | DeliveryCard L126 uses `getRiderStatusConfig(order.riderStatus)` but it's never set |
| `api.order_dispatch_status` → ? | **No** | Not mapped. May be needed for dispatch state. |
| `api.delivery_man_id` → ? | **No** | Not mapped. May be needed for assignment tracking. |

**Impact:** Even after dispatch/assign API calls, the rider section on DeliveryCard will show "Awaiting Runner" because the transform doesn't map rider data from the backend response. **The transform must be extended to include rider fields.**

This is a **prerequisite for all 3 buckets** — without rider field mapping, the UI cannot reflect assignment or dispatch state correctly.

### 5.5 Whether Dispatch API Response Can Update UI Immediately

**Analysis of Dispatch flow (API #3: `order-status-update`):**

1. POS calls `POST /api/v2/vendoremployee/order/order-status-update` with `{order_id, order_status: "serve", order_dispatch_status: "Yes", role_name}`
2. Backend processes the dispatch
3. **Two possible outcomes:**
   - **(a) Backend emits a socket event** (likely `update-order-status` or `update-order`) with full order payload → existing `handleUpdateOrderStatus` or `handleOrderDataEvent` processes it → `updateOrder()` updates OrderContext → UI re-renders
   - **(b) Backend returns updated order data in API response body** → FE can update UI from response directly

**Assessment:**
- Per **Rule MC-02**, "Realtime flows may sync through socket instead of HTTP response." The API response may be a simple success indicator, with the actual state update arriving via socket.
- The existing `handleUpdateOrderStatus` handler (L449-516) already processes `update-order-status` events with payload and calls `updateOrder()`. If dispatch triggers this event, the UI will update automatically.
- **Safe implementation approach:** Call the API. If response includes updated order data, update UI from response. Always let socket events also update the UI (idempotent — `updateOrder` with same data is harmless).

**Conclusion: FE can implement Dispatch with a hybrid approach — optimistic UI update from API response, with socket as the authoritative follow-up. This is safe and consistent with existing architecture patterns.**

### 5.6 Whether Socket Is Expected After Dispatch

**High confidence: YES.**

Evidence:
- All other `order-status-update` API calls (confirm, serve, cancel) trigger socket events
- The `update-order-status` event is the standard follow-up for order status changes
- `handleUpdateOrderStatus` L449 already processes these events

**Expected socket flow after Dispatch:**
```
POS calls API #3 (order-status-update with dispatch payload)
  → Backend updates order status
  → Backend emits update-order-status socket event [or update-order]
  → POS receives on order channel
  → handleUpdateOrderStatus (or handleOrderDataEvent) processes it
  → updateOrder() in OrderContext
  → DeliveryCard re-renders with new status
```

**Risk:** If the backend emits a **different** event for dispatch (not `update-order-status`), the existing handler won't catch it. But this is unlikely given the pattern.

**Classification: socket_expected_after_dispatch — existing handlers should process it. No new socket handler needed for Dispatch.**

### 5.7 Whether Assignment Accept/Reject Needs New Backend Socket Events

**Analysis:**

**For assignment (Bucket 2):**
- POS calls API #2 (`delivery-order-assign`)
- Backend likely emits `delivery-assign-order` socket event → **existing handler at L593 processes it**
- The existing handler calls `fetchOrderWithRetry(orderId)` → API fetch → `updateOrder()`
- This will work as-is for reflecting assignment state on OTHER POS terminals
- The assigning terminal can update UI optimistically from the API #2 response

**For rider accept (Bucket 3):**
- Rider accepts from rider app (API #4)
- Backend needs to emit a socket event to notify POS
- **Event name: UNKNOWN** — could be `update-order-status`, `delivery-assign-order`, or a new event
- If it's `update-order-status` with full payload → existing handler processes it
- If it's `delivery-assign-order` → existing handler fetches and updates
- If it's a new event → FE needs a new handler

**For rider reject (Bucket 3):**
- Rider rejects from rider app (API #5)
- Backend needs to emit a socket event to notify POS
- **Event name: UNKNOWN** — same uncertainty as accept
- POS needs to show "Reassign" button after rejection

**Classification: backend_socket_contract_required for Bucket 3.**

Buckets 1 and 2 can proceed because:
- Dispatch: existing `update-order-status` handler likely covers it
- Assign: existing `delivery-assign-order` handler covers it (with API fetch)

Bucket 3 CANNOT proceed because rider accept/reject event names are unknown.

### 5.8 What Frontend Can Implement Now Safely

| Item | Safe to Implement? | Reason |
|---|---|---|
| **Extend `orderTransform.fromAPI.order()` with rider fields** | **Yes** | Prerequisite for all buckets. Additive mapping — no existing behavior changes. |
| **Add endpoint constants to `constants.js`** | **Yes** | Additive — no existing behavior changes. |
| **Create service functions (dispatch, listRiders, assignRider)** | **Yes** | New functions in service layer per Rule API-01. |
| **Dispatch button (Bucket 1) — API call + optimistic UI** | **Yes** | API #3 is fully documented. Response-based UI update is safe. Socket follow-up will also work via existing handlers. |
| **"Delivered" button (Bucket 1) — API call** | **Yes (with caveat)** | Same API #3 with different status values. Owner confirmed. Exact payload values for "Delivered" are pending (BQ-097-4) but implementable once confirmed. |
| **Rider picker modal (Bucket 2) — API #1 call** | **Partially** | Can build the modal. API #1 endpoint is known. Response shape (BQ-097-1) needed for data mapping. |
| **Assign rider (Bucket 2) — API #2 call** | **Partially** | API #2 endpoint and payload are known. Response shape (BQ-097-5) needed for post-assign update. |
| **Fix button logic (`source === "own"` → Dispatch)** | **Yes** | Owner confirmed. Pure FE logic change. |
| **Add `RIDER_STATUS_CONFIG` entries for rejected/dispatched** | **Yes** | Additive to `statusHelpers.js`. |

### 5.9 What Must Wait for Backend Event-Name and Payload Confirmation

| Item | Why It Must Wait | Backend Question |
|---|---|---|
| **Rider accept socket reflection (Bucket 3)** | Unknown which socket event backend emits when rider accepts | BQ-097-2 |
| **Rider reject socket reflection (Bucket 3)** | Unknown which socket event backend emits when rider rejects | BQ-097-3 |
| **New socket handler (if needed)** | Only needed if rider accept/reject uses a new event name not already handled | BQ-097-2, BQ-097-3 |
| **Rider picker modal data mapping** | Response shape of `delivery-employee-list` unknown | BQ-097-1 |
| **Exact "Delivered" payload** | Owner confirmed same API but exact status values not documented | BQ-097-4 |

### 5.10 Socket Architecture Classification Summary

| Area | Classification | Detail |
|---|---|---|
| **Dispatch → socket update** | **socket_covered_by_existing_handlers** | `update-order-status` or `update-order` events already handled. No new handler needed. |
| **Assign → socket update** | **socket_covered_by_existing_handlers** | `delivery-assign-order` event and handler already exist at L593. |
| **Rider accept → socket update** | **backend_socket_contract_required** | Event name unknown. May use existing event or need new handler. |
| **Rider reject → socket update** | **backend_socket_contract_required** | Event name unknown. May use existing event or need new handler. |
| **orderTransform rider field mapping** | **implementation_required_prerequisite** | Must extend `fromAPI.order()` to map rider fields before any bucket. |

---

## 6. Implementation Plan — Bucket 1 (Dispatch)

### 6.1 Prerequisites (Shared Across All Buckets)

**These MUST be done before Bucket 1:**

| # | Task | File | Change |
|---|---|---|---|
| P-1 | Extend `fromAPI.order()` with rider/dispatch fields | `orderTransform.js` L150-300 | Add mappings: `rider: api.rider_name \|\| null`, `riderPhone: api.rider_phone_number \|\| null`, `riderStatus: api.rider_status \|\| null`, `orderDispatchStatus: api.order_dispatch_status \|\| null`, `deliveryManId: api.delivery_man_id \|\| null` |
| P-2 | Add delivery endpoint constants | `constants.js` | Add: `DELIVERY_EMPLOYEE_LIST`, `DELIVERY_ORDER_ASSIGN`, `DELIVERY_ORDER_CANCEL` (API #3 `order-status-update` already exists) |
| P-3 | Create delivery service functions | New: `deliveryService.js` or extend `orderService.js` | Functions: `dispatchOrder(orderId, roleName)`, `listDeliveryPersons()`, `assignRider(orderId, deliveryManId)` |
| P-4 | Fix button logic in DeliveryCard | `DeliveryCard.jsx` L194 | Change: `source === "own"` → **Dispatch** (currently shows "Assign Rider" for own). Swap labels. |

### 6.2 Bucket 1 Implementation Steps

| # | Task | File | Change | Socket Dependency |
|---|---|---|---|---|
| B1-1 | Wire Dispatch button to API #3 | `DeliveryCard.jsx` L190-198 | Replace `console.log` with `dispatchOrder()` call. Show loading state. Handle success/error. | None — API call only |
| B1-2 | Handle Dispatch API response | `DeliveryCard.jsx` or parent | On success: update local state or let socket handle it. On error: show toast. | Socket expected to update OrderContext via existing `handleUpdateOrderStatus` or `handleOrderDataEvent` |
| B1-3 | Wire "Delivered" button to API #3 (different payload) | `DeliveryCard.jsx` L200-208 | Replace `console.log` with `markDelivered()` call. Exact payload pending BQ-097-4. | Same as Dispatch — socket follow-up expected |
| B1-4 | Add dispatched/delivered states to rider status config | `statusHelpers.js` | Add entries: `dispatched`, `delivered` to `RIDER_STATUS_CONFIG` if needed | None |
| B1-5 | Verify existing socket handler picks up dispatch state change | Testing | Call Dispatch API → verify `update-order-status` or `update-order` socket fires → verify `handleUpdateOrderStatus` or `handleOrderDataEvent` processes it → verify OrderContext updated → verify DeliveryCard re-renders | Verification only — no new socket code |

### 6.3 Bucket 1 Socket Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Dispatch API triggers no socket event | Low | FE updates UI from API response body (optimistic). Add fallback: if no socket within 3s, refetch order. |
| Socket event uses unknown event name | Very Low | All known `order-status-update` events go through existing handler. Unlikely dispatch uses a different event. |
| `orderTransform` doesn't map new status values correctly | Medium | Must verify that `mapOrderStatus(f_order_status)` at L26-47 includes dispatched/delivered status codes. If not, add them. |
| Rider fields missing from transformed order | **Certain without P-1** | P-1 (extend transform) is a prerequisite. Must be done first. |

---

## 7. Implementation Plan — Bucket 2 (Assign Rider)

### 7.1 Bucket 2 Implementation Steps

| # | Task | File | Change | Socket Dependency |
|---|---|---|---|---|
| B2-1 | Create `AssignRiderModal` component | New: `components/modals/AssignRiderModal.jsx` | Modal with rider list from API #1. Select rider → confirm. | None |
| B2-2 | Wire Assign button to open modal | `DeliveryCard.jsx` L190-198 | For `source !== "own"`: onClick opens AssignRiderModal with orderId | None |
| B2-3 | Call API #1 (list riders) on modal open | `AssignRiderModal.jsx` | Fetch `listDeliveryPersons()` → render list. **Data mapping depends on BQ-097-1 response shape.** | None |
| B2-4 | Call API #2 (assign) on rider selection | `AssignRiderModal.jsx` | Call `assignRider(orderId, deliveryManId)` → close modal → show success. | Existing `handleDeliveryAssignOrder` at L593 will fire via socket → fetches order → updates context |
| B2-5 | Verify socket handler updates card | Testing | After assign → `delivery-assign-order` event fires → handler fetches order → `updateOrder()` → DeliveryCard shows rider name | Existing handler covers this |

### 7.2 Bucket 2 Socket Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| `delivery-assign-order` handler's API fetch returns stale data | Low | Handler uses `fetchOrderWithRetry` with 1 retry. Slight delay (1s) gives backend time to persist. |
| Rider data not in fetched order response | Medium | Depends on P-1 (transform extension). If backend doesn't include rider fields in order response, FE cannot display them. |
| BUG-094 overlap (delivery-assign-order payload migration) | Low impact | BUG-094 proposes adding payload to this socket event. If BUG-094 lands later, handler can switch from API fetch to payload. Current fetch-based handler works regardless. |

---

## 8. Implementation Plan — Bucket 3 (Socket Reflection + Reassign)

### 8.1 Classification: **backend_socket_contract_required**

Bucket 3 **cannot be fully planned** until BQ-097-2 (rider accept event) and BQ-097-3 (rider reject event) are answered.

### 8.2 What Can Be Planned Now

| # | Task | Dependency |
|---|---|---|
| B3-1 | Add "Reassign" button state to DeliveryCard | None — pure UI. Show "Reassign" when `riderStatus === 'rejected'` or equivalent. |
| B3-2 | Reassign flow = same as Assign flow (Bucket 2) | Bucket 2 must be complete |
| B3-3 | Handle rider accept socket event | **BQ-097-2** — event name and payload needed |
| B3-4 | Handle rider reject socket event | **BQ-097-3** — event name and payload needed |

### 8.3 Socket Scenarios (Speculative — DO NOT IMPLEMENT)

**These are NOT assumptions. These are possible scenarios to be confirmed by backend.**

| Scenario | If Backend Uses... | FE Impact |
|---|---|---|
| A: Rider accept uses `update-order-status` | Existing handler processes it. Order status changes. DeliveryCard re-renders. | **Zero new socket code needed.** |
| B: Rider accept uses `delivery-assign-order` | Existing handler fetches order via API. Updates context. | **Zero new socket code needed.** |
| C: Rider accept uses a NEW event name | New event constant + new handler or routing needed in `useSocketEvents.js`. | **New socket code required.** |
| D: Rider reject uses `update-order-status` | Existing handler processes it. `riderStatus` should reflect rejection. | **Zero new socket code needed (if rider fields are mapped in transform).** |
| E: Rider reject uses `delivery-assign-order` | Same as B. | **Zero new socket code needed.** |
| F: Rider reject uses a NEW event name | Same as C. | **New socket code required.** |

**Most likely scenario: A+D (both use `update-order-status`)** — this is consistent with how all other order status changes work in the POS.

**We do not assume any scenario. Bucket 3 implementation waits for confirmed event names.**

---

## 9. `f_order_status` Mapping Verification

The `mapOrderStatus` function at `orderTransform.js` L26-47 maps `f_order_status` numbers to frontend status strings. Need to verify which status code corresponds to "dispatched" and "delivered":

| f_order_status | Current Mapping | BUG-097 Relevance |
|---|---|---|
| 1 | `yetToConfirm` | — |
| 2 | `cooking` | — |
| 3 | `cancelled` | — |
| 4 | `ready` | Dispatch/Assign buttons shown at this state |
| 5 | `served` / `dispatched` | **Needs verification** — is this "dispatched" for delivery? |
| 6 | `paid` | Terminal — order removed from dashboard |
| 7 | `pending` | Web/scan orders |
| 8 | `hold` | Hold tab only |
| 9 | `pendingPayment` | PayLater/Hold |
| 10 | `ready` (confirmed-ready) | — |

**Open question:** What `f_order_status` value does the backend assign after dispatch? If it's status 5 (`served`), does `mapOrderStatus` return `'served'` or `'dispatched'`? The current DeliveryCard checks `order.status === "dispatched"` at L200 — this must match the mapped value.

**Action item:** Verify or add `dispatched` and `delivered` status mappings if they don't exist.

---

## 10. Complete Dependency Matrix

| Dependency | Bucket 1 | Bucket 2 | Bucket 3 | Status |
|---|---|---|---|---|
| P-1: orderTransform rider field mapping | **Required** | **Required** | **Required** | Ready to implement |
| P-2: Endpoint constants | **Required** | **Required** | — | Ready to implement |
| P-3: Service functions | **Required** | **Required** | — | Ready to implement |
| P-4: Button logic fix | **Required** | **Required** | — | Ready to implement |
| BQ-097-1: employee-list response shape | — | **Required** | — | Pending backend |
| BQ-097-2: Rider accept socket event | — | — | **Required** | Pending backend |
| BQ-097-3: Rider reject socket event | — | — | **Required** | Pending backend |
| BQ-097-4: "Delivered" exact payload | **Required** | — | — | Pending backend (but owner said "already shared" — may be in API #3 format) |
| BQ-097-5: assign response shape | — | **Helpful** | — | Pending backend |
| BQ-097-6: dispatch response shape | **Helpful** | — | — | Pending backend |

---

## 11. Recommended Implementation Sequence

### Session 0 (Prerequisites — All Buckets)
1. P-1: Extend `orderTransform.fromAPI.order()` with rider fields
2. P-2: Add endpoint constants
3. P-3: Create service functions
4. P-4: Fix DeliveryCard button logic
5. Verify `mapOrderStatus` for dispatched/delivered status codes

### Session 1 (Bucket 1 — Dispatch)
1. B1-1: Wire Dispatch button
2. B1-2: Handle API response
3. B1-3: Wire "Delivered" button (pending BQ-097-4 payload confirmation)
4. B1-4: Status config additions
5. B1-5: Verify socket handler picks up dispatch change
6. **Approval gate before Bucket 2**

### Session 2 (Bucket 2 — Assign Rider)
1. B2-1: Create AssignRiderModal (pending BQ-097-1 for data mapping)
2. B2-2: Wire Assign button
3. B2-3: Load rider list in modal
4. B2-4: Wire assign action
5. B2-5: Verify socket handler updates card
6. **Approval gate before Bucket 3**

### Session 3 (Bucket 3 — Socket Reflection + Reassign)
1. B3-1: Add "Reassign" button state
2. B3-2: Wire Reassign flow (reuse Bucket 2)
3. B3-3: Handle rider accept socket event (pending BQ-097-2)
4. B3-4: Handle rider reject socket event (pending BQ-097-3)

---

## 12. Files Changed (Planned)

| # | File | Change Type | Bucket |
|---|---|---|---|
| 1 | `api/transforms/orderTransform.js` L150-300 | **Edit** — add rider field mappings | Prerequisites |
| 2 | `api/constants.js` | **Edit** — add 3 endpoint constants | Prerequisites |
| 3 | `api/services/deliveryService.js` (new) | **Create** — dispatch, listRiders, assignRider functions | Prerequisites |
| 4 | `components/cards/DeliveryCard.jsx` | **Edit** — fix button logic, wire real API calls | Buckets 1-2 |
| 5 | `utils/statusHelpers.js` L56-60 | **Edit** — add rider status entries | Bucket 1 |
| 6 | `components/modals/AssignRiderModal.jsx` (new) | **Create** — rider picker modal | Bucket 2 |
| 7 | `api/socket/socketHandlers.js` L593-612 | **Possible edit** — only if Bucket 3 requires new handler | Bucket 3 (conditional) |
| 8 | `api/socket/socketEvents.js` | **Possible edit** — only if new event name for rider accept/reject | Bucket 3 (conditional) |
| 9 | `api/socket/useSocketEvents.js` | **Possible edit** — only if new event routing needed | Bucket 3 (conditional) |

**Hotspot impact:**
- `socketHandlers.js` — **conditional edit only if Bucket 3 requires new handler.** Existing handler may suffice.
- `orderTransform.js` — **small additive edit** (5 new field mappings). Low risk.
- `DeliveryCard.jsx` — **primary edit target** (224 lines, not a hotspot). Manageable.

---

## 13. What This Document Does NOT Do

- Does not assume socket event names for rider accept/reject
- Does not implement code
- Does not run QA
- Does not update `/app/memory/final/`
- Does not update baseline docs
- Does not mark BUG-097 as fixed

---

## 14. Final Status

**bug_097_partially_ready_dispatch_only_with_socket_review_complete**

BUG-097 is **NOT fully ready**. Only Dispatch-only can proceed. The remaining delivery lifecycle is backend-blocked.

| Metric | Value |
|---|---|
| Socket handlers inventoried | 4 relevant handlers inspected |
| Existing delivery socket handler | `handleDeliveryAssignOrder` at L593 — functional, uses API fetch |
| Transform gap identified | rider fields not mapped — P-1 prerequisite |
| Dispatch socket coverage | **Covered by existing handlers** (update-order-status / update-order) |
| Assignment socket coverage | **Covered by existing handler** (delivery-assign-order) — but Bucket 2 is **blocked** pending BQ-097-1, BQ-097-5 |
| Rider accept/reject socket | **backend_socket_contract_required** — Bucket 3 is **blocked** pending BQ-097-2, BQ-097-3 |
| BUG-097 overall status | **partially_ready_with_backend_questions** |
| Dispatch-only can proceed? | **Yes** — API #3 documented, button logic fix ready, prerequisite transform extension needed |
| Assign Rider can proceed? | **No** — blocked on BQ-097-1 (employee-list response shape), BQ-097-5 (assign response shape) |
| Delivered action can proceed? | **No** — blocked on BQ-097-4 (exact payload values for "Delivered") |
| Rider accept/reject can proceed? | **No** — blocked on BQ-097-2, BQ-097-3 (socket event names + payloads) |
| Full delivery lifecycle ready? | **No** — 6 backend/API questions remain unanswered |
| Code changed | **NO** |
| `/app/memory/final/` updated | **NO** |

### Blocked Items Summary

| Item | Blocked By | Backend Question(s) |
|---|---|---|
| Assign Rider (Bucket 2) | Response shapes unknown | BQ-097-1, BQ-097-5 |
| Rider accept socket (Bucket 3) | Event name unknown | BQ-097-2 |
| Rider reject socket (Bucket 3) | Event name unknown | BQ-097-3 |
| "Delivered" action (Bucket 1 terminal) | Exact payload unknown | BQ-097-4 |
| Dispatch response handling | Response shape unknown | BQ-097-6 |

---

*— POS3.0 BUG-097 Implementation Planning with Socket Architecture Review — 2026-05-20 —*
