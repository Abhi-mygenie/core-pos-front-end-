# POS3.0 BUG-097 Status Reconciliation — 2026-05-21

> **Read-only status review.** No code changed. `/app/memory/final/` not touched. Baseline docs not modified.
> Scope: BUG-097 only (Delivery Dispatch + Assign Rider / Delivery order lifecycle).
> Out of scope: PROD-BUG-001/002/003, BUG-099, BUG-104, all other POS3.0 items.

---

## 1. Purpose

Reconcile the latest planning, owner-decision, implementation, QA, delivery-button-label, and implementation-agent-handover docs against the **current code in `/app/frontend/src/`** so the next agent knows exactly:

- what was originally planned,
- what owner decisions changed the plan,
- what is implemented (with evidence),
- what is only documented / approved but not yet in code,
- what is partially done / needs verification,
- what is pending,
- what is backend-blocked,
- what the next clean gate should be.

This is **status reconciliation only**. No buckets are advanced, no code is touched, and the 2-item handover is not implemented in this pass.

---

## 2. Inputs Read

### 2A. Baseline `/app/memory/final/` (presence verified, all available)
- `ARCHITECTURE_DECISIONS_FINAL.md`
- `MODULE_DECISIONS_FINAL.md`
- `CHANGE_REQUEST_PLAYBOOK.md`
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `IMPLEMENTATION_AGENT_RULES.md`
- `BUSINESS_RULES_BASELINE_FINAL.md`
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `FINAL_DOCS_SUMMARY.md`

### 2B. Accepted sprint / overlay docs (presence verified)
- `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md`
- `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`

### 2C. BUG-097 docs read in detail (latest truth set)
- `POS3_0_BUG_097_IMPLEMENTATION_AGENT_HANDOVER_2026_05_20.md` ← latest handover, primary source of truth
- `POS3_0_BUG_097_DELIVERY_BUTTON_LABELS_2026_05_20.md` ← 2026-05-21 revised label matrix
- `POS3_0_BUG_097_BUCKET_4_5_IMPLEMENTATION_REPORT_2026_05_20.md` (v2)
- `POS3_0_BUG_097_OWNER_SMOKE_QA_REPORT_2026_05_20.md` (v5)
- `POS3_0_BUG_097_BUCKET_5_PLANNING_NOTES_2026_05_20.md`
- `POS3_0_BUG_097_SESSION_SUMMARY_2026_05_20.md`

### 2D. BUG-097 docs present but only cross-referenced
- `POS3_0_BUG_097_ANALYSIS_2026_05_19.md`
- `POS3_0_BUG_097_BUCKETED_IMPLEMENTATION_PLAN_2026_05_20.md`
- `POS3_0_BUG_097_BUCKET_0_EVIDENCE_2026_05_20.md`
- `POS3_0_BUG_097_BUCKET_1_REPORT_2026_05_20.md`
- `POS3_0_BUG_097_BUCKET_1_ADDENDUM_2026_05_20.md`
- `POS3_0_BUG_097_BUCKET_1_ORDERCARD_TABLECARD_CORRECTIVE_APPROVAL_PLAN_2026_05_20.md`
- `POS3_0_BUG_097_BUCKET_2_REPORT_2026_05_20.md`
- `POS3_0_BUG_097_BUCKET_4_OWNER_APPROVAL_PLAN_2026_05_20.md`
- `POS3_0_BUG_097_BUCKET_4_DIFF_PREVIEW_2026_05_20.md`
- `POS3_0_BUG_097_BUCKET_4_REPORT_2026_05_20.md`
- `POS3_0_BUG_097_IMPLEMENTATION_PLANNING_2026_05_20.md`
- `POS3_0_BUG_097_104_QUESTION_CLEARANCE_2026_05_20.md`
- `POS3_0_BUG_097_104_CONTINUATION_PLANNING_2026_05_20.md`
- `POS3_0_BUG_097_OWNER_SMOKE_QA_CHECKLIST_2026_05_20.md`
- `POS3_0_BUG_097_WAITING_FOR_RIDER_CORRECTIVE_PLAN_2026_05_20.md`
- `POS3_0_BUG_097_WAITING_FOR_RIDER_PATCH_2026_05_20.md`
- `POS3_0_BUG_097_GAP_123_APPROVAL_PLAN_2026_05_20.md`
- `POS3_0_BUG_097_FOCUSED_CORRECTIVE_APPROVAL_PLAN_2026_05_20.md`
- `POS3_0_BUG_097_FOCUSED_CONTINUATION_STATUS_2026_05_20.md`

### 2E. BUG-097 docs listed in the task but NOT present (recorded as NOT_FOUND)
- `POS3_0_BUG_097_2_ITEM_IMPLEMENTATION_REPORT_2026_05_20.md` → NOT_FOUND
- `POS3_0_BUG_097_2_ITEM_QA_HANDOFF_2026_05_20.md` → NOT_FOUND
- `POS3_0_BUG_097_EXPECTED_BEHAVIOR_OWNER_CORRECTION_2026_05_20.md` → NOT_FOUND

The absence of an implementation report or QA handoff for the 2-item handover (CartPanel label + riderStatus branching) is itself evidence that those two items have not yet been built.

### 2F. Code files inspected (read-only) to resolve doc vs code
- `src/api/constants.js` (L25–40, delivery endpoints)
- `src/api/transforms/orderTransform.js` (L285–315, riderStatus computation)
- `src/api/transforms/profileTransform.js` (L120–135, `deliveryAssign`)
- `src/api/socket/socketEvents.js` (L60–120, `DELIVERY_ASSIGN_ORDER` in `EVENTS_WITH_PAYLOAD`)
- `src/api/socket/socketHandlers.js` (presence of `handleDeliveryAssignOrder`)
- `src/api/services/deliveryService.js` (78 lines, dispatch + assign + list)
- `src/components/cards/OrderCard.jsx` (L83 `hasRiderAssigned`, L756–800 rider pill, L880–1010 fOS2/fOS5 buttons, L992 modal mount)
- `src/components/cards/TableCard.jsx` (L73 `hasRiderAssigned`, L451–500 fOS2 buttons, L520–545 fOS5 button, L591–615 modal mount)
- `src/components/order-entry/CartPanel.jsx` (L1260–1275 Collect Bill button label)
- `src/components/modals/AssignRiderModal.jsx` (232 lines, mounted)
- `src/components/cards/DeliveryCard.jsx` (legacy — not modified, not deleted)
- `src/utils/statusHelpers.js`

---

## 3. Plain-English Summary

BUG-097 is the delivery order lifecycle for the cashier app:

- A delivery order is **Ready** (fOrderStatus 2). What happens next depends on a single restaurant-profile flag, `delivery_assign`:
  - `delivery_assign = No` → cashier presses **Dispatch** (one-shot PUT, no rider).
  - `delivery_assign = Yes` → cashier opens **Assign Rider** modal, picks one rider, POST to assign.
- Once a rider is assigned, the card must NOT show **Serve** any more (that was the original wrong behavior). It must show rider-state aware controls (Waiting / Reassign / future "On The Way").
- When the rider eventually completes delivery and the order reaches fOrderStatus 5, the cashier closes the order. The label here was briefly "Handover" for delivery and "Bill" for everything else, but the owner reverted it on 2026-05-21 → **"Bill" for all order types including delivery**.
- The Order Entry cart bottom button used to say **"Delivered"** for delivery orders. Owner approved on 2026-05-20 to change it to **"Collect Bill"** for all non-room orders, including delivery — that change is **approved but not yet in code**.
- The rider section (chip area, OrderCard only) shows the rider name + a status pill: **Assigned** (pending accept) or **Reached** (accepted). Owner correction 2026-05-21: pill text should read **"Order Accepted"** instead of "Reached" — **not yet applied**.
- The deeper part (rider accept / reject sockets, marking rejected riders, "Rider On The Way") is **Bucket 5** and is parked because the backend has not yet given event names or payload shapes.
- `DeliveryCard.jsx` is legacy/unused; owner directive is to neither switch to it nor delete it.

---

## 4. Bucket / Area Status Map

| # | Area / Bucket | Planned Behavior | Owner Decision / Change | Implemented? | Evidence (code or doc) | Pending / Blocked |
|---|---|---|---|---|---|---|
| 1 | Dispatch vs Assign — source of truth | `source` / `isOwn` / `order_in` were initial guesses | **`delivery_assign` from profile is the only source of truth** (Owner 2026-05-20) | YES | `profileTransform.js` L127 `deliveryAssign: toBoolean(api.delivery_assign)`; consumed in `OrderCard.jsx` L896 + `TableCard.jsx` L451 | — |
| 2 | `delivery_assign` profile mapping | Map `restaurant.features.deliveryAssign` from backend | Owner-confirmed | YES | `profileTransform.js` L127 | — |
| 3 | Dispatch button + API | New button + dispatchOrder() PUT call | Method corrected POST→PUT live | YES | `deliveryService.js` (78L), `OrderCard.jsx` L915 `dispatch-btn`, `TableCard.jsx` L463 `dispatch-btn`; Owner Smoke QA v5 "C-SOCKET pass" | Dispatch flow smoke (`delivery_assign=No` tenant) — `not_tested` per QA v5 |
| 4 | Assign Rider modal + API | New modal `AssignRiderModal` with POST `delivery-employee-list` (POST!) and POST `delivery-order-assign` | URL v1→v2 corrective; method GET→POST corrective | YES | `AssignRiderModal.jsx` (232L); `constants.js` L31–33 v2 URLs; `OrderCard.jsx` L988 modal mount; `TableCard.jsx` L594 modal mount; QA v5 "C pass" | — |
| 5 | Waiting for Rider state | After assign, show passive "Waiting for Rider" (OrderCard) / "Waiting.." (TableCard) | Owner-confirmed corrective (no Serve, no Reassign at this stage) | YES — but flat, no `riderStatus` branching | `OrderCard.jsx` L924 `waiting-rider-btn`, disabled; `TableCard.jsx` L481, disabled | Sub-branching by `riderStatus` is **Item 4B** — approved, **NOT implemented** |
| 6 | Reassign / Assign Another Rider | When rider has accepted (`riderStatus === 'riderReached'`), button should become clickable "Reassign" | Owner approved 2026-05-20 | NO | Code currently shows "Waiting" for **any** `hasRiderAssigned`, regardless of `riderStatus`. See `OrderCard.jsx` L920–932 and `TableCard.jsx` L478–488. No branching on `order.riderStatus`. | **Item 4B in handover — pending implementation** |
| 7 | Rider accepted / "Rider On The Way" | Status pill flips on `delivery_man_status === 'Yes'`; card shows "Order Accepted" | Owner correction 2026-05-21: pill must say **"Order Accepted"** not "Reached" | PARTIAL — backend-driven pill flip wired; **label text not updated** | `OrderCard.jsx` L788–795 still renders the literal string `Reached` | Label text "Reached" → "Order Accepted" — **NOT applied**. Full "Rider On The Way" card-level state — Bucket 5, backend-blocked. |
| 8 | Rider rejected / grey-out rejected rider | When rider rejects, show Reassign and mark rejected rider in modal list | Owner approved; needs backend `rejected_delivery_man_ids` | NO | No `rejectedRiderIds` prop in `AssignRiderModal.jsx`; no socket handler for rider-reject | **Backend-blocked** — BQ-097-3 / BQ-097-4 |
| 9 | `delivery-assign-order` socket payload handling | Use payload directly (no redundant GET) | Owner-confirmed corrective | YES | `socketEvents.js` L114 `DELIVERY_ASSIGN_ORDER` is in `EVENTS_WITH_PAYLOAD`; `socketHandlers.js` `handleDeliveryAssignOrder` uses `payload.orders[0]`, GET fallback only | — |
| 10 | Optimistic update after assign API success | Merge `{deliveryManId, rider, riderPhone, deliveryManStatus, riderStatus}` into order immediately | Owner-approved Gap 2 corrective | YES | `OrderCard.jsx` L993–1003 `onAssigned`; `TableCard.jsx` L601–614 `onAssigned` | — |
| 11 | Delivered/Handover/Collect Bill label and flow | Card fOS=5 label and cart bottom button | Owner 2026-05-21: cards revert to **"Bill"** for all; CartPanel should be **"Collect Bill"** for all non-room | Cards: YES (reverted). CartPanel: **NO** — still says "Delivered" for delivery. | Card fOS=5 → `OrderCard.jsx` L968 prints `'Bill'`; `TableCard.jsx` L542 prints `(table.isRoom ? 'C/Out' : 'Bill')`. CartPanel L1266 still: `{isRoom ? 'Checkout' : orderType === 'delivery' ? 'Delivered' : 'Collect Bill'}` | **Item 4A in handover — pending implementation** |
| 12 | KOT hidden for delivery action states | Hide KOT print at delivery fOS=2 and fOS=5 | Owner directive | YES | `TableCard.jsx` L437–448 (`!isDelivery && <IconButton …>` at fOS=2), L501–512 (same at fOS=5) | — |
| 13 | OrderCard vs TableCard implementation | Both card surfaces must mirror the same logic | Owner directive (DeliveryCard not in scope) | YES — parity maintained | OrderCard L80–82 (`isDelivery`, `hasRiderAssigned`, `deliveryAssign`) and TableCard L70–73 (same shape) | Branching parity for **Item 4B** still pending in both |
| 14 | DeliveryCard legacy / dead-code decision | Decide delete vs keep | Owner: **do not delete, do not switch to it** | YES (kept untouched) | `DeliveryCard.jsx` present, unmodified, not imported by dashboard delivery rendering | — |
| 15 | Open QA / smoke items | Owner re-smoke after each corrective | Owner Smoke QA Report v5 closed Bucket 4.5 with `waiting_for_rider_corrective_patch_owner_confirmed` | Bucket 4.5: YES. 2-item handover: **not retested** (not implemented). | QA Report v5 §4–§5; QA Checklist v5 | Smoke retest after Items 4A + 4B applied; Dispatch flow (`delivery_assign=No`) smoke; new "Order Accepted" pill smoke |
| 16 | Backend-blocked socket items | Rider accept socket, rider reject socket, rejected-rider grey-out, "Rider On The Way" final behavior | Owner: park until backend supplies event name + payload | NO (parked) | Bucket 5 Planning Notes §2B–§2C; QA v5 §6 | **Backend-blocked** — BQ-097-2, BQ-097-3, BQ-097-4, BQ-097-5 |
| 17a | Handover **Item 4A** — CartPanel "Delivered" → "Collect Bill" | Single-label fix at `CartPanel.jsx` L1266 | Owner-approved 2026-05-20; revised matrix 2026-05-21 confirms PENDING | **NO** | Code at `CartPanel.jsx` L1266 still has `orderType === 'delivery' ? 'Delivered' : 'Collect Bill'` | Frontend-only, approved, ready-to-implement |
| 17b | Handover **Item 4B** — OrderCard + TableCard Reassign branching by `riderStatus` | `riderStatus === 'riderAssigned'` → disabled Waiting; any other → clickable Reassign | Owner-approved 2026-05-20 | **NO** | OrderCard L924 and TableCard L481 unconditionally render Waiting whenever `hasRiderAssigned`; no `order.riderStatus` discrimination | Frontend-only, approved, ready-to-implement |
| 17c | Rider status pill "Reached" → "Order Accepted" | Single-string fix in OrderCard rider chip | Owner correction 2026-05-21 (per revised label matrix and handover §7) | **NO** | `OrderCard.jsx` L794 still renders literal `Reached` | Frontend-only, approved, **not yet captured as a formal 3rd handover item** — newest correction |

---

## 5. Owner Decision Log

| # | Decision | Final Owner Decision | Impact |
|---|---|---|---|
| 1 | What decides Dispatch vs Assign at fOS=2? | `delivery_assign` from restaurant profile | Implemented in `profileTransform.js` L127 and consumed in both cards |
| 2 | Can `source` / `isOwn` / `order_in` decide? | **No.** Never use these | Confirms current code path is correct |
| 3 | Use `DeliveryCard.jsx` instead? | **No, do not switch and do not delete** | DeliveryCard stays legacy |
| 4 | Should TableCard expose a "Change rider" link inside the chip? | **No.** Chip stays Order-View-only | TableCard does not render the chip block, only the modal mount |
| 5 | Post-assign action button (pending accept) | **"Waiting for Rider" / "Waiting..", disabled** | Implemented Bucket 4.5 |
| 6 | Post-accept action button (riderReached) | **Clickable "Reassign"** | Approved but **not implemented** (Item 4B) |
| 7 | CartPanel button label | **"Collect Bill"** for all non-room (incl. delivery) | Approved but **not implemented** (Item 4A) |
| 8 | Card fOS=5 label for delivery | **"Bill"** (reverted from earlier "Handover") | Implemented 2026-05-21 on both OrderCard L968 and TableCard L542 |
| 9 | Rider status pill text after accept | **"Order Accepted"** (was "Reached") | **Not yet implemented** |
| 10 | Rider accept / reject socket wiring (Bucket 5) | **Park** until backend supplies BQ-097-2 + BQ-097-3 event names/payloads | Backend-blocked |
| 11 | Rejected rider grey-out in modal | **Park** until backend supplies `rejected_delivery_man_ids` (BQ-097-4) | Backend-blocked |
| 12 | Rider name disappears after time | **Park** — needs live console debug | Tech debt / observability |
| 13 | This app's scope | **Cashier-only.** Rider acceptance/tracking is a separate app | Confirms Bucket 5 is minimal on this side |
| 14 | Endpoint version | `delivery-order-assign` and `delivery-order-cancel` use **v2** | Implemented in `constants.js` L32–33 |
| 15 | Method-strictness | GET→POST for `delivery-employee-list`, POST→PUT for `order-status-update` | Implemented in `deliveryService.js` |
| 16 | Update `/app/memory/final/`? | **No** | Owner directive in handover §7 and QA v5 §7 |

---

## 6. Latest Handover Verification

The last agent's session (per `POS3_0_BUG_097_IMPLEMENTATION_AGENT_HANDOVER_2026_05_20.md`, last revised content visible 2026-05-21) and `POS3_0_BUG_097_DELIVERY_BUTTON_LABELS_2026_05_20.md` (revised 2026-05-21) together do the following:

**What the last agent added to the handover (§4 of the handover):**

- **Item 4A — CartPanel.jsx L1266** label correction "Delivered" → "Collect Bill". Owner approved. Marked *Safe Without Clarification: YES* but explicitly listed under §4 "What Remains To Implement". No implementation report exists for it.
- **Item 4B — OrderCard.jsx L917–926 + TableCard.jsx L470–482** Reassign branching keyed on `order.riderStatus`. Owner approved. Listed under §4 "What Remains To Implement". No implementation report exists for it.

**What decision changed in this last revision (handover §7):**

- The earlier "Handover" label on cards at fOS=5 (Bucket 2.5 / 3) was **reverted to "Bill" for all order types** on 2026-05-21. This is a behavior reversal recorded inside the handover (the row is struck-through in the markdown).
- A new correction was captured: rider chip pill **"Reached" → "Order Accepted"** (handover §7 row "‘Reached’ rider status pill"). This was added after the 2-item §4 list was written, so it is a *third* implicit pending item; it is **not yet packaged as an approval-gated handover item** but the matrix in `POS3_0_BUG_097_DELIVERY_BUTTON_LABELS_2026_05_20.md` §"Rider Status Labels" already lists it as `NOT YET APPLIED`.

**Were the approved items implemented or only documented?**

| Approved Item | Documented? | Implemented in code? |
|---|---|---|
| 4A — CartPanel "Delivered" → "Collect Bill" | YES (handover §4A, label doc §"Implementation Status") | **NO** — `CartPanel.jsx` L1266 still emits `'Delivered'` for `orderType === 'delivery'` |
| 4B — OrderCard/TableCard Reassign branching on `riderStatus` | YES (handover §4B, label doc §"Implementation Status") | **NO** — both cards unconditionally render Waiting/Waiting.. when `hasRiderAssigned`, no `riderStatus` test |
| Card fOS=5 "Handover" → "Bill" revert | YES (handover §7, label doc change log 2026-05-21) | **YES** — `OrderCard.jsx` L968 emits `'Bill'`; `TableCard.jsx` L542 emits `'Bill'` |
| Rider pill "Reached" → "Order Accepted" | YES (handover §7 row, label doc §"Rider Status Labels") | **NO** — `OrderCard.jsx` L794 still renders `Reached` |

**Are any approved items still pending?**

Yes — three frontend-only, owner-approved label/branching items remain pending in code:
1. Item 4A — CartPanel label.
2. Item 4B — OrderCard + TableCard Reassign branching by `riderStatus`.
3. Rider pill text "Reached" → "Order Accepted" (newest, not yet packaged as a formal handover item).

---

## 7. Implemented Items (with evidence)

- **Transform / foundation** — `orderTransform.js` L289–309 maps `deliveryMan`, `deliveryManId`, `deliveryManStatus`, `orderDispatchStatus`, `rider`, `riderPhone`, and computes `riderStatus` (`riderReached` / `riderAssigned` / `dispatched` / `null`).
- **Profile flag** — `profileTransform.js` L127 sets `deliveryAssign: toBoolean(api.delivery_assign)`.
- **Endpoints (v2 + method-corrected)** — `constants.js` L31–33: `DELIVERY_EMPLOYEE_LIST`, `DELIVERY_ORDER_ASSIGN` (v2), `DELIVERY_ORDER_CANCEL` (v2). `deliveryService.js` (78 lines) wires `dispatchOrder` (PUT), `getDeliveryEmployees` (POST), `assignDeliveryRider` (POST).
- **Dispatch button** — `OrderCard.jsx` L912–921 and `TableCard.jsx` L457–471 render `dispatch-btn-*` under `isDelivery && !hasRiderAssigned && !deliveryAssign`.
- **Assign Rider button + modal** — `OrderCard.jsx` L900–910 and `TableCard.jsx` L457–471 render `assign-rider-btn-*` / `assign-btn` under `isDelivery && !hasRiderAssigned && deliveryAssign`. Modal mounted at `OrderCard.jsx` L988 and `TableCard.jsx` L594. `AssignRiderModal.jsx` is 232 lines (radio single-select, name + phone, Cancel/Assign).
- **Waiting for Rider state (flat)** — `OrderCard.jsx` L922–932 and `TableCard.jsx` L478–490 render disabled "Waiting for Rider" / "Waiting..".
- **Socket payload handling (Gap 1)** — `socketEvents.js` L114 includes `DELIVERY_ASSIGN_ORDER` in `EVENTS_WITH_PAYLOAD`. Handler uses `payload.orders[0]` first, GET fallback only.
- **Optimistic update (Gap 2)** — `OrderCard.jsx` L993–1003 and `TableCard.jsx` L601–614: `onAssigned` merges `{deliveryManId, rider, riderPhone, deliveryManStatus: 'No', riderStatus: 'riderAssigned'}` immediately on API success.
- **Serve fall-through fix (Gap 3)** — At fOS=2, delivery + `hasRiderAssigned` no longer reaches the Serve branch (`OrderCard.jsx` L893–947, `TableCard.jsx` L451–498).
- **KOT hidden for delivery at fOS=2 and fOS=5** — `TableCard.jsx` L437–448 and L501–512. OrderCard does not render KOT in those branches either.
- **Card fOS=5 label reverted to "Bill"** — `OrderCard.jsx` L968 outputs `'Bill'`; `TableCard.jsx` L542 outputs `(table.isRoom ? 'C/Out' : 'Bill')`.
- **Endpoint URLs v1→v2** — `constants.js` L32–33.
- **TableCard height fix** — Owner-confirmed (label trimmed to "Waiting..").
- **Owner smoke** — `OWNER_SMOKE_QA_REPORT_2026_05_20.md` v5 records `waiting_for_rider_corrective_patch_owner_confirmed`.

---

## 8. Pending Items

### 8A. Frontend approved but not implemented
1. **CartPanel.jsx L1266** — change ` orderType === 'delivery' ? 'Delivered' : 'Collect Bill'` to `'Collect Bill'` (Item 4A).
2. **OrderCard.jsx L917–926** — split the `hasRiderAssigned` branch by `order.riderStatus`:
   - `riderStatus === 'riderAssigned'` → keep disabled "Waiting for Rider"
   - any other (`riderReached`, etc.) → clickable "Reassign" opening `AssignRiderModal` (Item 4B).
3. **TableCard.jsx L470–482** — same branching pattern (Item 4B).
4. **OrderCard.jsx L788–795** — replace the rider-status pill text `Reached` with `Order Accepted` (owner correction 2026-05-21).

### 8B. Owner smoke QA pending
- Smoke retest after Items 4A + 4B + pill rename are applied.
- Dispatch flow smoke for a tenant with `delivery_assign = No` (QA v5 marked `not_tested`).
- Verify CartPanel button still says "Checkout" for room and "Collect Bill" for dine-in/takeaway (label-only fix should not regress those).

### 8C. Backend-blocked (Bucket 5)
- Rider accept socket event name + payload → **BQ-097-2**.
- Rider reject socket event name + payload → **BQ-097-3**.
- `rejected_delivery_man_ids` in socket payload for grey-out → **BQ-097-4**.
- Confirmation of whether `delivery_man` is cleared / preserved on reject → **BQ-097-5**.
- Final on-card behavior for "Rider On The Way" once accept lands.

### 8D. Technical debt / observability
- Rider name disappearing after time on the card (parked; needs live console debug to find the overwrite source).
- `DeliveryCard.jsx` left as dead code (owner directive: no delete yet).
- Endpoint method-strictness register should be kept fresh per session summary §2 lesson.

---

## 9. Conflicts / Ambiguities Found

1. **Owner Smoke QA Report v5** (file `POS3_0_BUG_097_OWNER_SMOKE_QA_REPORT_2026_05_20.md`) states `D. Delivered / Handover — observation: Label correct on dashboard cards.` This was written when the card label was "Handover". On 2026-05-21 the label was reverted to **"Bill"**. The QA report has not been re-versioned. Not a code conflict (code is now "Bill"), but the QA wording is stale.
2. **Handover §3 (Bucket 3 row)** uses strike-through markdown to record the "Handover" → "Bill" revert. A reader skimming may miss the strikethrough. Code is the truth — both cards emit "Bill".
3. **Handover §7** lists `"Reached" rider status pill → "Order Accepted"` as a new owner correction but it is NOT packaged in §4 (the only items §4 lists as "What Remains To Implement" are 4A and 4B). The label-reference doc also tags it `NOT YET APPLIED`. → Treat the pill rename as an implicit third pending item; ideally the next gate should add it formally so it is not lost.
4. **Bucket 4.5 Report v2** says "Status: IMPLEMENTED — pending owner review". Owner Smoke QA v5 then confirmed it. Both are consistent, but the report header was not bumped to "owner-confirmed". Low risk.
5. **Session Summary §3 Item 2** still describes the card fOS=5 button as "Handover" for delivery; this is **superseded** by the 2026-05-21 revert. The session summary doc has not been updated.

No code-level conflict was found. All conflicts are documentation-versioning issues.

---

## 10. Current Classification

**`bug_097_partially_implemented_owner_smoke_pending`**

Justification: Buckets 0, 1, 2, 2.5 (partial revert), 3 (now label "Bill"), 4, 4.5 are implemented and owner-smoke confirmed. Two frontend-only owner-approved items (4A, 4B) plus one late owner correction ("Reached" → "Order Accepted") remain unimplemented. Bucket 5 is separately backend-blocked but that is not what makes the current state "partial" — the partial state is driven entirely by the 2-item handover + pill rename still being in code.

(Not `bug_097_implemented_owner_smoke_passed_bucket_5_blocked` because the 2-item handover is approved-and-pending, not yet smoke-confirmed.)
(Not `bug_097_status_unclear_conflicts_need_owner_review` because the conflicts found are documentation-version drift, not contradictory owner decisions.)

---

## 11. Recommended Next Gate

**Option B — Implement the remaining approved 2-item handover (with the implicit third pill-rename added).**

Reasoning:
- Both items are explicitly owner-approved (handover §4A and §4B), explicitly marked *Safe Without Clarification: YES*, frontend-only, no API surface change, no state-machine change, no backend dependency.
- The pill rename "Reached" → "Order Accepted" is a one-string change in the same file (`OrderCard.jsx` L794) and was captured by the owner in the same 2026-05-21 correction window; bundling it avoids a follow-up gate.
- After this single small implementation pass, the next sensible gate is Option A (consolidated owner smoke) — that should be opened **after** the patch lands, not before. Until then there is nothing new for owner to smoke.
- Option D (wait for backend) is unrelated to these three pending items and applies only to Bucket 5.
- Option E is not warranted — no conflicting owner decision was found, only doc-version drift.

Suggested order of execution by the implementation agent:
1. CartPanel.jsx L1266 label-only fix (Item 4A).
2. OrderCard.jsx L917–926 `riderStatus` sub-branch (Item 4B, OrderCard side).
3. TableCard.jsx L470–482 `riderStatus` sub-branch (Item 4B, TableCard side).
4. OrderCard.jsx L794 pill text "Reached" → "Order Accepted".
5. `yarn build` → expect 0 errors.
6. Then open Option A owner smoke gate.

This reconciliation **does not** perform any of the above; this section is recommendation only.

---

## 12. Do-Not-Start List

- **Bucket 5** in any form (rider accept socket, rider reject socket, grey-out rejected rider, "Rider On The Way" pill, dashboard auto-removal on handover) — blocked until backend supplies BQ-097-2/3/4/5 event names + payloads.
- **`DeliveryCard.jsx` deletion or migration** — owner explicit "do not delete".
- **Unrelated hotfixes / refactors** in `OrderCard.jsx`, `TableCard.jsx`, `CartPanel.jsx`, `socketHandlers.js` — keep the patch label-only and branch-only.
- **Unrelated POS3.0 bugs** — PROD-BUG-001 / 002 / 003, BUG-099, BUG-104, anything not BUG-097.
- **Updating `/app/memory/final/`** — owner directive (handover §7).
- **Updating baseline docs** under `/app/memory/final/`.
- **Re-versioning** old QA reports / session summaries just to remove stale "Handover" wording — defer cosmetic doc edits to a doc sweep gate.

---

## 13. Final Status

**`bug_097_reconciliation_complete_implementation_gap_found`**

- Reconciliation work itself is complete (this document).
- Implementation gap found and clearly bounded: 3 small frontend-only items (Items 4A, 4B, and the pill rename).
- No backend dependency for the gap.
- No conflicting owner decisions found (only stale doc wording).
- Bucket 5 is separately and correctly classified as backend-blocked and is **not** part of this gap.

---

### Output document

`/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_097_STATUS_RECONCILIATION_2026_05_21.md`

### Confirmations

- No code was changed in this pass.
- `/app/memory/final/` was not updated.
- Baseline docs were not updated.
- No QA was run, no agent was invoked.

*— POS3.0 BUG-097 Status Reconciliation — 2026-05-21 —*
