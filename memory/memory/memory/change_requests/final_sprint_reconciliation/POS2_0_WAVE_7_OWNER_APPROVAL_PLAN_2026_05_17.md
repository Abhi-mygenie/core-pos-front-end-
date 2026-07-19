# POS2.0 Wave 7 Owner Approval Plan — 2026-05-17

## 1. Purpose

This document is created **before implementation** and requires **owner approval** before any code changes. It describes the code inspection findings and proposed approach for each Wave 7 bug.

---

## 2. Repo / Commit

| Field | Value |
|---|---|
| Repo URL | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| Branch | `17-may` |
| Commit hash | `577564d` |
| Working tree | clean |

---

## 3. Inputs Read

| Document | Path |
|---|---|
| Master Plan | `POS2_0_MASTER_IMPLEMENTATION_PLAN_2026_05_17.md` |
| Audit & Correction | `POS2_0_MASTER_PLAN_AUDIT_AND_CORRECTION_2026_05_17.md` |
| Phase 4 Remaining Blocked | `POS2_0_REMAINING_BLOCKED_BUG_PLANNING_2026_05_17.md` |
| Phase 4 Backend Q Capture | `POS2_0_PHASE_4_BACKEND_QUESTION_CAPTURE_2026_05_17.md` |
| Phase 4 Owner Decision Capture | `POS2_0_PHASE_4_OWNER_DECISION_CAPTURE_2026_05_17.md` |
| Phase 4 QA Repro & Closure | `POS2_0_PHASE_4_QA_REPRO_AND_CLOSURE_2026_05_17.md` |
| Bug Impact Analysis | `/app/memory/bugs/POS2_0_BUG_IMPACT_ANALYSIS.md` |
| Wave 4 Closure Report | `POS2_0_WAVE_4_CLOSURE_REPORT_2026_05_17.md` |
| Wave 5 Closure Report | `POS2_0_WAVE_5_CLOSURE_REPORT_2026_05_17.md` |
| Wave 6 Closure Report | `POS2_0_WAVE_6_CLOSURE_REPORT_2026_05_17.md` |
| Business Rules Baseline | `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` |
| Business Rules Pending Freeze | `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` |
| Reconciliation Report | `BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md` |

---

## 4. Bugs Proposed For Implementation

| Bug | Plain English Issue | Proposed Fix | Files To Modify | Risk | Approval Status |
|---|---|---|---|---|---|
| BUG-058 | Prepaid-hold orders fail when settling from Audit Hold tab | Runtime payload investigation + potential endpoint/payload adjustment | `CollectBillPanelDrawer.jsx`, `orderTransform.js` | Medium | pending_owner_approval |
| BUG-060 | Source table stays occupied after transferring order to room | Add optimistic FE context clearing in the transfer-to-room success path | `OrderEntry.jsx` | Low-Medium | pending_owner_approval |
| BUG-061 | Room check-in time not showing in Rooms Report for in-house rooms | Investigate data binding gap; potentially enrich `/get-room-list` seed or confirm backend returns `checkin_date` | `RoomRowCard.jsx`, `roomListTransform.js`, `reportService.js` | Low | pending_owner_approval |

---

## 5. Per-Bug Approval Details

### BUG-058 — Prepaid Hold Collect-Bill Settlement

#### What is wrong in plain English

When a **prepaid order** is moved to "pending payment" (Hold), trying to collect the bill from the Audit Report → Hold tab gives an error. Postpaid collect-bill works fine. Both paths use the same `order-bill-payment` endpoint and the same `collectBillExisting` payload builder — so there may be a payload field mismatch that the backend rejects for prepaid-hold orders specifically.

#### Code Inspection Findings

1. **CollectBillPanelDrawer.jsx** (L92-303): Opens a `CollectPaymentPanel` inside a drawer. On payment complete, builds payload via `orderToAPI.collectBillExisting(...)` and POSTs to `API_ENDPOINTS.BILL_PAYMENT` (`/api/v2/vendoremployee/order/order-bill-payment`).

2. **orderTransform.js** `collectBillExisting` (L1162-1334):
   - The `payment_status` field at L1266: PayLater → `'sucess'`, Tab → `'success'`, Cash/Card/UPI → `'paid'`.
   - No branching for prepaid orders. The function receives generic `paymentData` from `CollectPaymentPanel` and doesn't know if the original order was prepaid.
   - The `payment_type` field (which would be `'prepaid'` for prepaid orders) is **not included** in the `collectBillExisting` payload at all.

3. **Potential root cause candidates (investigation needed):**
   - Backend may expect `payment_type: 'prepaid'` in the payload for prepaid-hold settle
   - Backend may expect a different `payment_status` value for prepaid-hold
   - Backend may require the original prepaid transaction ID or reference
   - The `order-bill-payment` endpoint may not handle the prepaid→hold→settle lifecycle at all (may need a different endpoint like `paid-prepaid-order`)

4. **Runtime investigation needed:** This cannot be resolved from code inspection alone. Need to:
   - Capture the exact error response from the backend when settling a prepaid-hold order
   - Compare the payload sent for a successful postpaid-hold settle vs the failing prepaid-hold settle
   - Determine what field(s) the backend requires differently

#### What I will change (after runtime evidence)

**Phase A — Investigation (code inspection complete; runtime capture pending):**
- No code changes yet
- Need a live preprod environment to create a prepaid order → hold it → attempt collect from Audit → capture the error response and request payload
- Compare with a working postpaid-hold settle

**Phase B — Implementation (after runtime evidence):**
- Add the missing field(s) to `collectBillExisting` payload (e.g., `payment_type`, or route to a different endpoint)
- The order's `paymentType` is available in the transformed order (`detail.paymentType` in CollectBillPanelDrawer) — it can be passed through to the payload builder

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `orderTransform.js` (collectBillExisting) | Add prepaid-specific payload fields | Payload builder for bill settlement |
| `CollectBillPanelDrawer.jsx` | Possibly pass `paymentType` or additional order context to the payment handler | Entry point for hold-tab settle flow |

#### Code area / function / component
- `collectBillExisting()` at `orderTransform.js:1162`
- `handlePaymentComplete()` at `CollectBillPanelDrawer.jsx:160`

#### What I will NOT touch
- `CollectPaymentPanel.jsx` — the shared panel component stays unchanged
- Dashboard collect-bill flow — only the hold-tab flow is affected
- Any other payment endpoints
- Financial calculation logic (totals, tax, discounts)

#### Business rule protected
- PAY-004 (postpaid settle) — unchanged
- PAY-001-008 (payment payload contracts) — only additive fields for the prepaid-hold case

#### Risk
**Medium** — Payload change for a specific settlement path. Risk is contained because:
- Only affects prepaid-hold orders settling from Audit Hold tab
- Postpaid-hold settlement path remains untouched
- Cannot fully resolve without runtime evidence

#### QA check after implementation
1. Create a postpaid order → hold → settle from Audit Hold tab → **still works** (regression)
2. Create a prepaid order → hold → settle from Audit Hold tab → **now works** (fix)
3. Dashboard collect-bill flow → **unchanged** (regression)
4. PayLater hold settle → **unchanged** (regression)

#### Approval needed

Owner approval required before implementation.

Options:
- A. Approve this bug for runtime investigation + code-diff preview after evidence captured
- B. Do not implement this bug
- C. Modify the approach
- D. Need clarification first (e.g., can you reproduce the error and share the backend response?)

---

### BUG-060 — Source Table Not Clearing After Room Transfer

#### What is wrong in plain English

When a cashier transfers an order from a **table** to a **room** (via Pay → To Room), the cart clears and the navigation happens, but the **source table still shows as "occupied"** on the dashboard. Manual refresh is needed to see the correct table status. For paid and cancelled orders, the table correctly becomes available.

#### Code Inspection Findings

1. **OrderEntry.jsx** Scenario 3 (L1456-1475):
   ```
   if (paymentData.isTransferToRoom && paymentData.roomId) {
     const payload = orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId);
     const res = await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload);
     toast({ title: "Transferred to Room", ... });
     navigateAfterOrderAction();
   }
   ```
   - After the HTTP POST succeeds, it shows a toast and navigates away.
   - **Does NOT call** `removeOrder(orderId)` from OrderContext.
   - **Does NOT call** `updateTableStatus(sourceTableId, 'available')` from TableContext.
   - Relies **entirely** on backend socket event emission to clear the source table.

2. **socketHandlers.js** — No dedicated handler for `order-shifted-room`:
   - `handleOrderDataEvent` handles: `update-order`, `update-order-target`, `update-order-source`, `update-order-paid`
   - For `update-order-target` (L257-267): Detects table change and frees old table → **This handler COULD clear the source table IF the backend emits `update-order-target` after room transfer.**
   - For terminal states (paid/cancelled) (L289-304): Removes order and frees table → **This is what works for paid/cancel flows.**

3. **Owner confirmed (BQ-P4-03):** "Events ARE already firing. The issue is that the frontend context is not clearing the source table."
   - This means the backend IS emitting socket events after room transfer.
   - The FE handler either isn't catching them, or the events don't carry the right data to trigger source table clearing.

4. **Root cause analysis:**
   - The backend likely emits `update-order` or `update-order-source` (not `update-order-target`) after room transfer.
   - The `handleOrderDataEvent` for `update-order-source` at L226: "if cancelled/paid → removeOrder(), else updateOrder()".
   - After room transfer, the source order's status might become `'shifted'` or some non-terminal status, which would cause the handler to `updateOrder()` instead of `removeOrder()` + free table.
   - **The FE doesn't treat "shifted-to-room" as a terminal state** — this is the gap.

#### What I will change

**Recommended fix (optimistic FE update):**

After the successful `api.post(ORDER_SHIFTED_ROOM)` response in `OrderEntry.jsx`, add:
1. `removeOrder(effectiveTable.orderId)` — remove the source order from OrderContext
2. `updateTableStatus(effectiveTable.tableId, 'available')` — free the source table in TableContext

This is the same pattern used by paid/cancel flows. The optimistic update ensures the dashboard reflects the change immediately, regardless of socket timing.

**Alternative (socket handler fix):**

Add handling in `handleOrderDataEvent` for the shifted-to-room case:
- Detect when an `update-order-source` event carries a shifted/transferred status
- Treat it as terminal (removeOrder + free table)

**Recommendation:** Apply BOTH fixes — optimistic for immediate UX, socket handler for consistency when other clients are watching the same dashboard.

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `OrderEntry.jsx` L1459-1475 | Add `removeOrder()` + `updateTableStatus()` after successful room transfer POST | Source of the transfer action |
| `socketHandlers.js` (handleOrderDataEvent) | Detect room-transfer status in `update-order-source` and treat as terminal | Socket handler for cross-client consistency |

#### Code area / function / component
- `OrderEntry.jsx`: Scenario 3 block at L1456-1475 (inside `handlePaymentComplete` callback)
- `socketHandlers.js`: `handleOrderDataEvent()` at L229, specifically the `shouldRemove` logic at L289-292

#### What I will NOT touch
- Transfer-to-room payload (`orderToAPI.transferToRoom`) — unchanged
- Room billing / checkout logic — unchanged
- TableContext / OrderContext core logic — unchanged (only calling existing functions)
- Other socket handlers (new-order, update-food-status, scan-new-order)

#### Business rule protected
- ROOM-001 (room report totals) — unchanged
- DASH-001/002/003 (dashboard display) — improved (table correctly freed)
- POLL-001/004 (polling) — unchanged

#### Risk
**Low-Medium** — Adding optimistic context updates is a well-established pattern in this codebase (paid/cancel already do it). The risk is:
- If the backend POST fails after optimistic update: mitigated because we only update AFTER `await api.post()` succeeds
- If the socket handler fix incorrectly treats non-transfer events as terminal: mitigated by checking the specific status value

#### QA check after implementation
1. Table order → Pay → To Room → confirm → **source table immediately shows "Available"** (fix)
2. Table order → Pay → Cash → **table correctly freed** (regression)
3. Table order → Cancel → **table correctly freed** (regression)
4. Room transfer → refresh dashboard → **table status persists as "Available"** (verify socket handler also works)
5. Walk-in → To Room → **no table status change** (tableId=0, skip logic applies)

#### Approval needed

Owner approval required before implementation.

Options:
- A. Approve this bug for code-diff preview
- B. Do not implement this bug
- C. Modify the approach (e.g., optimistic only, no socket handler change)
- D. Need clarification first

---

### BUG-061 — Room Check-In Time Not Showing in Rooms Report

#### What is wrong in plain English

On the Rooms Report page, the **check-in time column** shows "—" for currently checked-in rooms. It correctly shows the time for checked-out rooms. The owner confirmed: "Column is already there, data not showing. It already shows when room is checked out — same format needs to be used."

#### Code Inspection Findings

1. **RoomRowCard.jsx** (L430-431, L486):
   ```js
   const displayCheckInIso = detail?.roomInfo?.checkInDate || row.checkInDateTime;
   // renders in collapsed view:
   {formatCheckInDateTime(displayCheckInIso)}
   ```
   - For **checked-out rooms** (logs source): `row.checkInDateTime = o.createdAt` (order creation date) → shows a date immediately, even before detail fetch.
   - For **checked-in rooms** (live source): `row.checkInDateTime = null` (from roomListTransform L48) → shows "—" until detail fetch resolves.

2. **roomListTransform.js** (L32-58):
   - `/get-room-list` endpoint returns: `{ table, order_id, user }` — **no check-in date field**.
   - Transform sets `checkInDateTime: null`.
   - Comment at L24: "checkInDateTime left null on this seed; the per-row detail fetch (getSingleOrderRoom) populates them via RoomRowCard.numbers."

3. **RoomRowCard detail fetch** (L311-350):
   - Fires `getSingleOrderRoom(row.parentOrderId)` on mount.
   - After resolution: `detail.roomInfo.checkInDate` is populated from `room_info.checkin_date` via `orderTransform.fromAPI.order`.
   - The check-in time SHOULD appear after the detail fetch resolves.

4. **orderTransform.js** (L362): `checkInDate: api.room_info.checkin_date || null`
   - This correctly maps the backend's `checkin_date` field.

5. **Gap analysis:**
   - For checked-out rooms: `row.checkInDateTime = o.createdAt` provides an **immediate** value (visible before detail fetch). After detail fetch, `detail.roomInfo.checkInDate` provides the accurate value.
   - For checked-in rooms: `row.checkInDateTime = null` means **no value until detail fetch resolves**. This is a timing/UX issue — the "—" shows during loading.
   - **The core question:** Does the backend return `room_info.checkin_date` in the `SINGLE_ORDER_NEW` response for in-house (not yet checked-out) rooms? If yes, the check-in time should appear after loading. If no, the data is not available.

6. **Runtime investigation needed:**
   - Verify that `getSingleOrderRoom` returns `room_info.checkin_date` for in-house rooms
   - If it does → the check-in time shows after loading; maybe the owner is seeing the "—" during the loading state
   - If it doesn't → backend gap; `checkin_date` only populated after checkout

#### What I will change (investigation-first approach)

**Phase A — Confirm backend data availability:**
- No code changes yet
- Need to verify: does `/api/v2/vendoremployee/get-single-order-new` return `room_info.checkin_date` for an in-house room?
- If YES → the column should auto-populate after detail fetch. May be a perceived gap due to loading delay.
- If NO → backend doesn't provide checkin_date for in-house rooms → backend gap

**Phase B — If backend provides the data:**
- The fix may be cosmetic: ensure the loading state for the check-in column shows a shimmer/placeholder instead of "—" so the owner doesn't perceive it as "not showing"
- OR: try to extract checkin_date from the `/get-room-list` response if the backend includes it in a nested field

**Phase C — If backend does NOT provide the data:**
- This becomes a backend ask: include `checkin_date` in the SINGLE_ORDER_NEW response for in-house rooms
- No frontend code change possible without the data

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `roomListTransform.js` | Potentially extract checkin_date from nested fields if available | Seed data for live rooms |
| `RoomRowCard.jsx` | Potentially improve loading UX for check-in column | Display component |
| `reportService.js` | Potentially adjust data mapping for check-in time | Data service layer |

#### Code area / function / component
- `roomListTransform.transformRoomListToRows()` at `roomListTransform.js:32`
- `RoomRowCard` collapsed row check-in time display at `RoomRowCard.jsx:484-486`
- `orderTransform.fromAPI.order` roomInfo mapping at `orderTransform.js:341-362`

#### What I will NOT touch
- `formatCheckInDateTime` helper — unchanged (format is already correct per owner: "same format needs to be used")
- Room checkout flow — unchanged
- Room billing calculations — unchanged
- Audit Report (AllOrdersReportPage) — not in scope for this bug

#### Business rule protected
- ROOM-001 (room report totals) — unchanged

#### Risk
**Low** — Display-only change. No financial calculation, no payload modification, no socket logic affected.

#### QA check after implementation
1. Rooms Report → Unpaid filter → in-house room → **check-in time column shows date/time** (fix)
2. Rooms Report → Paid filter → checked-out room → **check-in time still shows** (regression)
3. Rooms Report → All filter → both types → **check-in time shows for both** (regression + fix)
4. Check-in time format → matches checkout time format (DD-Mon HH:MM)

#### Approval needed

Owner approval required before implementation.

Options:
- A. Approve this bug for runtime investigation + code-diff preview
- B. Do not implement this bug
- C. Modify the approach
- D. Need clarification first (e.g., can you confirm which report page you're referring to — Rooms Report or Audit Report?)

---

## 6. Recommended Implementation Order

1. **BUG-060** (room transfer source table clearing) — most actionable from code inspection alone; clear root cause identified
2. **BUG-061** (room check-in time) — partially actionable; may resolve with simple investigation
3. **BUG-058** (prepaid-hold settle) — needs runtime evidence; most constrained

---

## 7. Approval Summary

| Bug | Approval Needed | Owner Decision |
|---|---|---|
| BUG-058 | Approve runtime investigation + implementation approach | pending |
| BUG-060 | Approve optimistic FE clearing + socket handler fix | pending |
| BUG-061 | Approve runtime investigation + potential display fix | pending |

---

## 8. Final Status

`owner_approval_plan_created_pending_approval`

---

*— End of POS2.0 Wave 7 Owner Approval Plan — 2026-05-17 —*
