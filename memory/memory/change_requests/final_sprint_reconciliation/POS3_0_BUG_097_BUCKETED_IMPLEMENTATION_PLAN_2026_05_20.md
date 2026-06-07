# POS3.0 BUG-097 Bucketed Implementation Plan — 2026-05-20

## 1. Purpose

This document splits BUG-097 (Delivery Dispatch + Assign Rider) into runtime-safe implementation buckets, each with scope, validation gates, and stop conditions.

This is planning only. No code was changed. No QA run. No `/app/memory/final/` updated. No baseline docs updated.

---

## 2. Inputs Read

### Primary BUG-097 Docs
1. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_097_IMPLEMENTATION_PLANNING_2026_05_20.md` (socket review + full planning)
2. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_097_104_QUESTION_CLEARANCE_2026_05_20.md` (owner + backend answers incl. addendum)
3. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_097_ANALYSIS_2026_05_19.md` (original analysis)

### Baseline Docs (referenced from prior socket review)
4. `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` — Rules MC-02, FA-03, API-01, SM-05, SM-07
5. `/app/memory/final/MODULE_DECISIONS_FINAL.md` — Module 7 (Socket)
6. `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` — Impact analysis + approval gate format
7. `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` — PAY-008

### Code Files (inspected in prior session — not re-inspected)
8. `socketEvents.js`, `useSocketEvents.js`, `socketHandlers.js`, `DeliveryCard.jsx`, `orderTransform.js`, `statusHelpers.js`, `constants.js`, `DashboardPage.jsx`

---

## 3. Current Clearance Summary

| Question | Status | Evidence |
|---|---|---|
| BQ-097-1 (employee-list response) | **ANSWERED** | JSON array: `id`, `f_name`, `l_name`, `phone`, `email`, `status`, `is_production` |
| BQ-097-2 (rider accept socket) | **Pending** | Owner: "we can validate and provide" |
| BQ-097-3 (rider reject socket) | **Pending** | Owner: same as BQ-097-2 |
| BQ-097-4 ("Delivered" action) | **ANSWERED** | "Delivered" = existing Collect Bill API / settlement flow. NOT `order-status-update`. |
| BQ-097-5 (assign response) | **Curl received** | Needs live delivery order to test |
| BQ-097-6 (dispatch response) | **Curl received** | Needs live delivery order to test |
| Button logic (`source`) | **ANSWERED** | `source === "own"` → Dispatch, else → Assign |
| Transform rider fields | **Gap confirmed** | `orderTransform.fromAPI.order()` does not map rider fields |
| Socket: dispatch follow-up | **Covered** | Existing `handleUpdateOrderStatus` / `handleOrderDataEvent` should process it |
| Socket: assign follow-up | **Covered** | Existing `handleDeliveryAssignOrder` at L593 handles it |
| Socket: rider accept/reject | **backend_socket_contract_required** | Event names unknown |

---

## 4. Runtime Validation Matrix

| Validation ID | Bucket | What To Test | Required Test Data | Expected Evidence | Blocks |
|---|---|---|---|---|---|
| RV-01 | 0 | Dispatch API response shape | Live delivery order with status `ready`, `source === "own"` | JSON response from `order-status-update` with dispatch payload | Bucket 2 dispatch response handling |
| RV-02 | 0 | Assign API response shape | Live delivery order with status `ready`, `source !== "own"` | JSON response from `delivery-order-assign` | Bucket 4 post-assign UI update |
| RV-03 | 0 | What `f_order_status` does backend set after dispatch? | Same as RV-01 | f_order_status value in order after dispatch (5? other?) | Bucket 1 status mapping |
| RV-04 | 0 | Does socket fire after dispatch? Which event? | Same as RV-01 + observe socket logs | Socket event name + payload in browser console | Bucket 2 socket verification |
| RV-05 | 0 | Do rider fields exist in order API response? | Any delivery order with assigned rider | Presence of `rider_name`, `rider_phone_number`, `rider_status`, `delivery_man_id`, `order_dispatch_status` in `get-single-order-new` response | Bucket 1 transform prerequisite |
| RV-06 | 1 | Transform maps rider fields correctly | After P-1 + live order with rider data | DeliveryCard shows rider name instead of "Awaiting Runner" | Bucket 2, 4 |
| RV-07 | 2 | Dispatch button works end-to-end | Live `ready` delivery order, `source === "own"` | Click Dispatch → API succeeds → card status updates → socket confirms | Bucket 3 |
| RV-08 | 3 | "Delivered" opens Collect Bill | Dispatched delivery order | Clicking "Delivered" opens existing CollectPaymentPanel or triggers settlement | Bucket 3 |
| RV-09 | 4 | Rider list loads in modal | Any restaurant | Employee list API returns data, modal renders names | Bucket 4 |
| RV-10 | 4 | Assign rider works | Live `ready` delivery order, `source !== "own"` | Select rider → API succeeds → card shows rider → socket updates | Bucket 5 |

---

## 5. Bucketed Implementation Plan

---

### Bucket 0 — Runtime/API Verification Prep

#### Goal
Capture live API response shapes and verify backend field availability before writing implementation code.

#### Scope
- Call dispatch API (`order-status-update`) against a live delivery order → capture response JSON
- Call assign API (`delivery-order-assign`) against a live delivery order → capture response JSON
- Call `get-single-order-new` for a delivery order with an assigned rider → check for rider fields
- Observe socket events after dispatch via browser console logs
- Verify `f_order_status` value after dispatch

#### Files Likely Touched
None. This is API testing via curl / browser console only.

#### API / Socket Dependency
- Requires a **live delivery order in `ready` status** on the preprod environment
- Login credentials: `owner@18march.com` / `Qplazm@10`
- Bearer token must be fresh (generated via login API)

#### Implementation Approach
1. Login → get fresh token
2. Find or create a delivery order in `ready` status
3. Call dispatch curl → capture response → document shape
4. Call assign curl → capture response → document shape
5. Call `get-single-order-new` for a delivery order → check for rider fields in response
6. Open POS in browser → observe socket console logs after dispatch call

#### Runtime Validation Needed
- RV-01, RV-02, RV-03, RV-04, RV-05

#### Stop Condition
- All response shapes documented
- Rider field presence confirmed or absence confirmed
- `f_order_status` after dispatch known
- Socket event name after dispatch observed

#### Can Move To Implementation?
**yes_with_runtime_gate** — Bucket 0 must produce evidence before Buckets 1-4 begin.

#### Owner Approval Needed
No — this is observation/testing, not code change.

---

### Bucket 1 — Transform + Delivery State Foundation

#### Goal
Ensure the frontend data layer can display rider/dispatch fields when the backend provides them.

#### Scope
- Extend `orderTransform.fromAPI.order()` with rider/dispatch field mappings
- Verify/add `f_order_status` → frontend status mapping for dispatched state
- Add delivery endpoint constants to `constants.js`
- Create delivery service functions
- Fix button logic in DeliveryCard (`source === "own"` → Dispatch, else → Assign)
- Add rider status config entries if needed

#### Files Likely Touched
| File | Change |
|---|---|
| `api/transforms/orderTransform.js` | Add ~5 field mappings in `fromAPI.order()`: `rider`, `riderPhone`, `riderStatus`, `orderDispatchStatus`, `deliveryManId` |
| `api/constants.js` | Add endpoint constants: `DELIVERY_EMPLOYEE_LIST`, `DELIVERY_ORDER_ASSIGN`, `DELIVERY_ORDER_CANCEL` |
| `api/services/deliveryService.js` (new) | Create: `dispatchOrder()`, `listDeliveryPersons()`, `assignRider()` |
| `components/cards/DeliveryCard.jsx` L194 | Fix button label logic: swap Dispatch/Assign based on `source` |
| `utils/statusHelpers.js` | Add rider status entries if needed based on Bucket 0 findings |
| `api/transforms/orderTransform.js` L26-47 | Add/verify `dispatched` mapping in `mapOrderStatus` if `f_order_status` uses a new value |

#### API / Socket Dependency
- Depends on Bucket 0 findings for:
  - Exact backend field names for rider data (RV-05)
  - `f_order_status` value for dispatched (RV-03)

#### Implementation Approach
1. Add field mappings to `fromAPI.order()` — use field names confirmed by RV-05
2. Add/verify `mapOrderStatus` entry for dispatched status — use value from RV-03
3. Add endpoint constants (paths are known)
4. Create `deliveryService.js` with 3 functions using the new constants
5. Fix DeliveryCard button label swap
6. Add status config entries

#### Runtime Validation Needed
- RV-06: After implementation, load a delivery order with rider data → verify DeliveryCard shows rider name + status pill instead of "Awaiting Runner"

#### Stop Condition
- All field mappings added and verified against live data
- Service functions created
- Button logic correct
- DeliveryCard renders rider data when present

#### Can Move To Implementation?
**yes_with_runtime_gate** — requires Bucket 0 evidence (field names, status values) before implementation starts.

#### Owner Approval Needed
No — foundational data layer work, no user-facing behavior change beyond button label fix.

---

### Bucket 2 — Dispatch Action Only

#### Goal
Wire the Dispatch button to call the dispatch API and verify the full dispatch flow.

#### Scope
- Replace `console.log` on Dispatch button with `dispatchOrder()` API call
- Handle success: show feedback, allow socket to update card state
- Handle error: show toast
- Verify existing socket handler picks up post-dispatch state change
- Do NOT implement "Delivered" button here (separate bucket)

#### Files Likely Touched
| File | Change |
|---|---|
| `components/cards/DeliveryCard.jsx` L190-198 | Replace `console.log` with `dispatchOrder()` call for `source === "own"` |

#### API / Socket Dependency
- API #3: `POST /api/v2/vendoremployee/order/order-status-update` — payload: `{order_id, order_status: "serve", order_dispatch_status: "Yes", role_name}`
- Socket: existing `handleUpdateOrderStatus` / `handleOrderDataEvent` expected to fire (verified conceptually in socket review; runtime verification in Bucket 0 via RV-04)

#### Implementation Approach
1. On Dispatch click: call `dispatchOrder(orderId, roleName)` from `deliveryService.js`
2. Show loading state on button during API call
3. On success: show success toast. Do NOT manually update order state — let socket handle it (per Rule MC-02). If RV-04 confirmed no socket fires, add fallback refetch.
4. On error: show error toast, reset button state
5. `role_name` comes from auth context (logged-in user's role)

#### Runtime Validation Needed
- RV-07: Click Dispatch on a live `ready` delivery order → API succeeds → card status changes to dispatched → socket event observed in console

#### Stop Condition
- Dispatch button calls API successfully
- Card reflects dispatched state (via socket or API response)
- No duplicate state updates
- No regression on other order card types

#### Can Move To Implementation?
**yes_with_runtime_gate** — requires Bucket 0 (RV-04 socket verification) and Bucket 1 (transform + service functions) to be complete.

#### Owner Approval Needed
**Yes** — approval gate after Bucket 2 before proceeding to Bucket 3.

---

### Bucket 3 — Delivered via Existing Collect Bill Flow

#### Goal
Wire the "Delivered" button to trigger the existing Collect Bill / settlement flow.

#### Scope
- Per BQ-097-4 answer: "Delivered" = existing Collect Bill API
- Wire "Delivered" button to open `CollectPaymentPanel` or trigger the existing settlement path
- Do NOT create a new delivery-specific payment endpoint
- Do NOT duplicate existing payment logic
- Respect all existing payment rules (PAY-001 through PAY-008)

#### Files Likely Touched
| File | Change |
|---|---|
| `components/cards/DeliveryCard.jsx` L200-208 | Replace `console.log` on "Delivered" with action that opens Collect Bill |
| Potentially `pages/DashboardPage.jsx` | May need to trigger order entry → collect bill flow for delivery orders |

#### API / Socket Dependency
- Uses existing Collect Bill / settlement API — no new endpoint
- Existing socket events for payment completion (`update-order-paid`) already handled

#### Implementation Approach
1. Investigate how other order types trigger Collect Bill (e.g., dashboard card click → order entry → collect bill)
2. "Delivered" button should follow the same path — open order in OrderEntry → navigate to Collect Bill
3. If a shortcut path exists (direct settle without full OrderEntry), use that
4. Verify payment status/order status updates correctly after settlement
5. Verify print behavior remains consistent

#### Runtime Validation Needed
- RV-08: Click "Delivered" on a dispatched delivery order → Collect Bill opens → complete payment → order moves to paid/done → removed from dashboard

#### Stop Condition
- "Delivered" triggers Collect Bill successfully
- Payment completes via existing flow
- Order removed from dashboard after payment
- Print/bill behavior matches existing settlement flow

#### Can Move To Implementation?
**yes_with_runtime_gate** — requires Bucket 2 (dispatch working) to produce dispatched orders to test against. Also requires runtime verification that existing Collect Bill path works for delivery orders.

If existing Collect Bill reuse is unclear at implementation time: **blocked_runtime_validation_required**.

#### Owner Approval Needed
**Yes** — approval gate after Bucket 3 before proceeding to Bucket 4.

---

### Bucket 4 — Assign Rider Modal / API

#### Goal
Build the rider assignment flow for non-own delivery orders.

#### Scope
- Create `AssignRiderModal` component with rider list from `delivery-employee-list`
- Wire Assign button on DeliveryCard for `source !== "own"` orders
- Call `delivery-order-assign` API on rider selection
- Verify existing `handleDeliveryAssignOrder` socket handler updates card after assignment

#### Files Likely Touched
| File | Change |
|---|---|
| `components/modals/AssignRiderModal.jsx` (new) | Rider picker modal: list, select, confirm |
| `components/cards/DeliveryCard.jsx` L190-198 | Wire Assign button to open modal for `source !== "own"` |

#### API / Socket Dependency
- API #1: `POST /api/v1/vendoremployee/delivery-employee-list` — response shape: **KNOWN** (BQ-097-1)
- API #2: `POST /api/v1/vendoremployee/delivery-order-assign` — response shape: **curl received, needs live test** (BQ-097-5)
- Socket: existing `handleDeliveryAssignOrder` at L593 handles post-assign event

#### Implementation Approach
1. Create `AssignRiderModal`:
   - On open: call `listDeliveryPersons()`
   - Render list with: `f_name` + `l_name` (name), `phone` (secondary), `status` (filter active only)
   - On select + confirm: call `assignRider(orderId, selectedRiderId)`
   - On success: close modal, show toast
   - On error: show error in modal
2. Wire Assign button in DeliveryCard to open modal
3. After assign: existing socket handler should fire `delivery-assign-order` → fetch order → update context → card shows rider name
4. If socket doesn't fire, add fallback refetch

**Data mapping for rider picker:**

| API Field | Display |
|---|---|
| `f_name` + `l_name` | Rider name |
| `phone` | Phone (secondary) |
| `id` | `delivery_man_id` for assign API |
| `status` | Filter: show only `status === true` |

#### Runtime Validation Needed
- RV-09: Open Assign modal → employee list loads → names display correctly
- RV-10: Select rider → confirm → API succeeds → card shows rider name + "Assigned" pill → socket fires and updates

#### Stop Condition
- Rider list loads and displays
- Assignment API succeeds
- Card reflects assigned rider
- Socket handler updates other POS terminals

#### Can Move To Implementation?
**ready_for_ui_planning_but_api_response_validation_pending** — BQ-097-1 is answered (rider list shape known). BQ-097-5 (assign response) curl received but needs live order test. Can build UI now, wire API after response shape verified.

#### Owner Approval Needed
**Yes** — approval gate after Bucket 4 before proceeding to Bucket 5.

---

### Bucket 5 — Rider Accept / Reject Socket Handling

#### Goal
Handle realtime updates when rider accepts or rejects from the rider app.

#### Status: **backend_socket_contract_required**

Do NOT implement until:
- BQ-097-2: rider accept socket event name is confirmed
- BQ-097-3: rider reject socket event name is confirmed
- Payload shape for both events is known
- State mapping (which `riderStatus` value corresponds to accept/reject) is confirmed

#### What Can Be Pre-Planned
- "Reassign" button UI state: show when `riderStatus === 'rejected'` (or equivalent field value)
- Reassign flow reuses Bucket 4 (open AssignRiderModal again)
- If rider accept/reject uses existing `update-order-status` or `delivery-assign-order` events → zero new socket code
- If new event name → new constant in `socketEvents.js` + routing in `useSocketEvents.js` + minimal handler

#### Files Likely Touched (conditional)
| File | Change | Condition |
|---|---|---|
| `components/cards/DeliveryCard.jsx` | "Reassign" button state | Always needed |
| `api/socket/socketEvents.js` | New event constant | Only if new event name |
| `api/socket/useSocketEvents.js` | New event routing | Only if new event name |
| `api/socket/socketHandlers.js` | New or modified handler | Only if existing handlers don't cover it |

#### Can Move To Implementation?
**no_backend_blocked** — waiting for BQ-097-2 and BQ-097-3.

#### Owner Approval Needed
Yes — after Bucket 5 implementation, full BUG-097 QA cycle needed.

---

## 6. Recommended First Implementation Scope

**Start with Bucket 0 + Bucket 1.**

**Why:**
- Bucket 0 (runtime verification) produces evidence that all subsequent buckets depend on: response shapes, field names, `f_order_status` values, socket event observation
- Bucket 1 (transform + foundation) is prerequisite for all other buckets. Without rider field mapping, no bucket can show correct delivery state.
- Both are low-risk: Bucket 0 is observation-only, Bucket 1 is additive data-layer work with no user-facing behavior change (except button label fix)
- After Bucket 0 + 1, Bucket 2 (Dispatch) can proceed with confidence

**Sequence:**
```
Bucket 0 (runtime verification) → evidence captured
  ↓
Bucket 1 (transform + foundation) → data layer ready
  ↓
Bucket 2 (Dispatch action) → [owner approval gate]
  ↓
Bucket 3 (Delivered via Collect Bill) → [owner approval gate]
  ↓
Bucket 4 (Assign Rider modal) → [owner approval gate]
  ↓
Bucket 5 (Socket reflection) → [blocked until BQ-097-2/3 answered]
```

---

## 7. Items Not To Implement Yet

| Item | Reason |
|---|---|
| Rider accept socket handling | BQ-097-2 pending — event name unknown |
| Rider reject socket handling | BQ-097-3 pending — event name unknown |
| Any new socket handler or event constant | Must not assume event names |
| BUG-104 (Credit/Tab Management) | `blocked_pending_api_catalog` — separate scope |
| BUG-099, BUG-095, BUG-096, BUG-106, or any other POS3.0 item | Out of scope |
| `/app/memory/final/` updates | Planning only — no baseline changes |
| Aggregator order dispatch (Swiggy/Zomato) | Out of scope per BUG-097 analysis |

---

## 8. Owner Decision Gate

How would you like to proceed?

**A.** Start Bucket 0 (runtime/API verification) first — capture response shapes and socket behavior before any code
**B.** Start Bucket 1 (transform foundation) first — assume standard field names, verify at integration time
**C.** Start Bucket 0 + Bucket 1 together — runtime verification in parallel with foundation code
**D.** Start Bucket 1 + Bucket 2 together — foundation + dispatch, keep Assign/Delivered separate
**E.** Wait for BQ-097-2/3 (socket answers) before any implementation

**Recommendation: Option A** — Start Bucket 0 first. The runtime evidence (especially RV-03 and RV-05) determines whether Bucket 1's field mappings and status mappings are correct. 15-30 minutes of API testing prevents rework.

---

## 9. Final Status

**bug_097_bucketed_plan_created_pending_owner_decision**

| Metric | Value |
|---|---|
| Total buckets | 6 (Bucket 0-5) |
| Buckets that can start now | Bucket 0 (runtime verification) |
| Buckets ready after Bucket 0 | Bucket 1 (transform + foundation) |
| Buckets ready after Bucket 1 | Bucket 2 (Dispatch) |
| Buckets ready after Bucket 2 | Bucket 3 (Delivered via Collect Bill) |
| Buckets with API data available | Bucket 4 (Assign — BQ-097-1 answered, BQ-097-5 curl received) |
| Buckets blocked | Bucket 5 (rider accept/reject — BQ-097-2/3 pending) |
| Runtime validations needed | 10 (RV-01 through RV-10) |
| Owner approval gates | After Bucket 2, 3, 4, 5 |
| Code changed | **NO** |
| `/app/memory/final/` updated | **NO** |
| Baseline docs updated | **NO** |

---

*— POS3.0 BUG-097 Bucketed Implementation Plan — 2026-05-20 —*
