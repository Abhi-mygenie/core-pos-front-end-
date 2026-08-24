# POS3.0 BUG-097 Final Planning Completion — 2026-05-21

> **Read-only planning document.** No code changed. `/app/memory/final/` not touched. Baseline docs not modified. Backend-blocked items not advanced.
> **Scope:** BUG-097 only — finalises the planning state after mixed owner-decision + partial-implementation work.
> **Primary source of truth:** `POS3_0_BUG_097_STATUS_RECONCILIATION_2026_05_21.md`.

---

## 1. Purpose

BUG-097 has gone through several rounds of owner decisions, corrective patches, and label revisions while implementation was already in flight. The reconciliation pass on 2026-05-21 confirmed that:

- the main lifecycle (Dispatch / Assign Rider / Waiting / Bill / Socket / Optimistic update) is **implemented and owner-smoke confirmed**,
- a small, well-bounded set of **3 frontend-only owner-approved items** remains unimplemented,
- a separate set of items remains **backend-blocked** under Bucket 5.

This document closes the planning loop by:
1. Locking in the final owner decisions.
2. Listing exactly what is already in code.
3. Listing the 3-item residual frontend scope for the next implementation agent.
4. Quarantining the backend-blocked items so they are not picked up by mistake.
5. Defining the owner smoke checklist that should run **after** the 3-item patch lands.

No new buckets are opened. No new corrective patches are designed. This is the final planning state.

---

## 2. Inputs Read

### 2A. Baseline `/app/memory/final/` (presence verified)
- `ARCHITECTURE_DECISIONS_FINAL.md`
- `MODULE_DECISIONS_FINAL.md`
- `CHANGE_REQUEST_PLAYBOOK.md`
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `IMPLEMENTATION_AGENT_RULES.md`
- `BUSINESS_RULES_BASELINE_FINAL.md`
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `FINAL_DOCS_SUMMARY.md`

### 2B. Accepted sprint / overlay docs (presence verified)
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`

### 2C. Latest BUG-097 docs (primary inputs)
- `POS3_0_BUG_097_STATUS_RECONCILIATION_2026_05_21.md` — **primary source of truth**
- `POS3_0_BUG_097_IMPLEMENTATION_AGENT_HANDOVER_2026_05_20.md`
- `POS3_0_BUG_097_DELIVERY_BUTTON_LABELS_2026_05_20.md` (2026-05-21 revised)
- `POS3_0_BUG_097_OWNER_SMOKE_QA_REPORT_2026_05_20.md` (v5)
- `POS3_0_BUG_097_BUCKET_5_PLANNING_NOTES_2026_05_20.md`
- `POS3_0_BUG_097_BUCKET_4_5_IMPLEMENTATION_REPORT_2026_05_20.md` (v2)
- `POS3_0_BUG_097_SESSION_SUMMARY_2026_05_20.md`

### 2D. Code files (already inspected in the reconciliation pass — re-inspection not required)
- `src/api/constants.js` L25–40
- `src/api/transforms/orderTransform.js` L285–315
- `src/api/transforms/profileTransform.js` L120–135
- `src/api/socket/socketEvents.js` L60–120
- `src/api/socket/socketHandlers.js`
- `src/api/services/deliveryService.js`
- `src/components/cards/OrderCard.jsx` L80–82, L756–800, L880–1010
- `src/components/cards/TableCard.jsx` L70–73, L433–545, L591–615
- `src/components/order-entry/CartPanel.jsx` L1255–1275
- `src/components/modals/AssignRiderModal.jsx`
- `src/components/cards/DeliveryCard.jsx`

No code was re-read in this pass; conclusions are carried forward from the reconciliation doc.

---

## 3. Current Plain-English Status

BUG-097 (delivery order lifecycle for the cashier) is **mostly built and owner-confirmed live on preprod**. The cashier can already:

- Dispatch a delivery order when the restaurant profile says `delivery_assign = No`.
- Open the Assign Rider modal and pick a rider when `delivery_assign = Yes`.
- See the card flip immediately after assignment (optimistic update) and stay correct after the socket arrives.
- See a passive "Waiting for Rider" state while the rider is pending acceptance.
- Print the bill at fOrderStatus 5 using the standard "Bill" button (the earlier short-lived "Handover" label was reverted).
- Keep KOT hidden during delivery action states.

Three small UI tweaks remain pending — all owner-approved, all frontend-only, no API changes. The deeper rider accept/reject behavior (Bucket 5) is parked until the backend supplies the socket event names and payload shapes.

Current classification (from reconciliation):
**`bug_097_partially_implemented_owner_smoke_pending`**

---

## 4. What Was Planned Originally

The original plan organised BUG-097 into sequential buckets:

| Bucket | Goal |
|---|---|
| 0 | Verify backend payload shape on preprod (read-only). |
| 1 | Foundation — transform delivery + rider fields, add `deliveryAssign` profile flag, set up button switching logic in cards. |
| 2 | Wire the Dispatch action (PUT `order-status-update` with `order_dispatch_status = "Yes"`). |
| 2.5 | Label correction — delivery-specific copy on fOrderStatus 5 card and on CartPanel bottom button. |
| 3 | Delivered / Handover end-to-end flow (later partly reverted by owner). |
| 4 | Assign Rider modal — list employees, POST assign, mount in both cards. |
| 4.5 | Corrective patches — socket payload handling (Gap 1), optimistic context update (Gap 2), Serve fall-through removal (Gap 3), Waiting label, TableCard height. |
| 5 | Rider accept socket + rider reject socket + rejected-rider grey-out + "Rider On The Way" state + dashboard removal on handover. |

The decision branch at fOrderStatus 2 was originally guessed to come from `order_in` / `source` / `isOwn` — that guess was later overruled by the owner.

---

## 5. Owner Decisions That Changed the Plan

Locked-in owner decisions (final):

1. **`delivery_assign` from restaurant profile is the only source of truth** for Dispatch vs Assign at fOrderStatus 2. Never branch on `source` / `isOwn` / `order_in`.
2. **`OrderCard.jsx` and `TableCard.jsx` are the active card surfaces** for delivery. `DeliveryCard.jsx` is legacy and unused.
3. **`DeliveryCard.jsx` must not be deleted yet** and must not be switched to. It stays untouched.
4. After rider assigned (pending accept) the action button shows **"Waiting for Rider" / "Waiting.."** (disabled). The Serve button is hidden in this branch.
5. After rider accepted (`riderStatus === 'riderReached'`) the action button becomes a **clickable "Reassign"** that opens the Assign Rider modal.
6. **CartPanel bottom button must say "Collect Bill"** for all non-room orders, including delivery. The earlier "Delivered" wording is rejected.
7. The fOrderStatus 5 card button is **"Bill"** for all order types, including delivery. The earlier "Handover" wording was rolled out and then reverted on 2026-05-21.
8. The rider chip status pill, after the rider accepts, must read **"Order Accepted"**. The current literal **"Reached"** is wrong.
9. **Bucket 5 is parked** until the backend confirms socket event names + payload shapes for rider accept, rider reject, and rejected-rider tracking (BQ-097-2 / 3 / 4 / 5).
10. **TableCard does not get a "Change rider" link** inside a chip — the rider chip block is Order-View-only.
11. **`/app/memory/final/` must not be updated** for BUG-097 work.

---

## 6. What Is Already Implemented (with evidence)

All evidence cross-referenced from the 2026-05-21 reconciliation; code is the truth.

- **Profile mapping** — `profileTransform.js` L127: `deliveryAssign: toBoolean(api.delivery_assign)`.
- **Order transform — rider fields + `riderStatus`** — `orderTransform.js` L289–309. `riderStatus` is computed as:
  - `delivery_man_id` + `delivery_man_status === 'Yes'` → `'riderReached'`
  - `delivery_man_id` + `delivery_man_status === 'No'` → `'riderAssigned'`
  - no `delivery_man_id` + `order_dispatch_status === 'Yes'` → `'dispatched'`
  - otherwise → `null`
- **Endpoint constants (v2, method-correct)** — `constants.js` L31–33: `DELIVERY_EMPLOYEE_LIST` (POST), `DELIVERY_ORDER_ASSIGN` v2 (POST), `DELIVERY_ORDER_CANCEL` v2 (POST).
- **Delivery service** — `deliveryService.js` (78 lines) wires `dispatchOrder` (PUT `order-status-update`), `getDeliveryEmployees`, `assignDeliveryRider`.
- **Dispatch button** — `OrderCard.jsx` L912–921 (`dispatch-btn-${orderId}`) and `TableCard.jsx` L457–471 (`dispatch-btn-${table.id}`) under `isDelivery && !hasRiderAssigned && !deliveryAssign`.
- **Assign Rider button + modal** — `OrderCard.jsx` L900–910 (`assign-rider-btn-${orderId}`) and `TableCard.jsx` L457–471 (`assign-rider-btn-${table.id}` / "Assign") under `isDelivery && !hasRiderAssigned && deliveryAssign`. Modal mounted at `OrderCard.jsx` L988 and `TableCard.jsx` L594. `AssignRiderModal.jsx` is 232 lines, radio single-select, name + phone, Cancel/Assign.
- **`delivery-assign-order` socket payload handling (Gap 1)** — `socketEvents.js` L114 lists `DELIVERY_ASSIGN_ORDER` in `EVENTS_WITH_PAYLOAD`. Handler `handleDeliveryAssignOrder` in `socketHandlers.js` uses `payload.orders[0]` directly with a GET fallback only when payload is missing.
- **Optimistic update after assign (Gap 2)** — `OrderCard.jsx` L993–1003 and `TableCard.jsx` L601–614 wire `onAssigned(picked)` to merge `{deliveryManId, rider, riderPhone, deliveryManStatus: 'No', riderStatus: 'riderAssigned'}` into the order context the moment the assign API succeeds.
- **Serve fall-through fixed (Gap 3)** — `OrderCard.jsx` L893–947 and `TableCard.jsx` L451–498: when `isDelivery && hasRiderAssigned`, control no longer reaches the non-delivery Serve branch.
- **Waiting for Rider state** — `OrderCard.jsx` L922–932 renders disabled `waiting-rider-btn-${orderId}` "Waiting for Rider". `TableCard.jsx` L478–490 renders disabled `waiting-rider-btn-${table.id}` "Waiting..".
- **KOT hidden for delivery action states** — `TableCard.jsx` L437–448 (fOS=2) and L501–512 (fOS=5) wrap the `<IconButton>` in `!isDelivery`. OrderCard does not render KOT in those branches either.
- **Card fOrderStatus 5 label reverted to "Bill"** — `OrderCard.jsx` L968 outputs `'Bill'`; `TableCard.jsx` L542 outputs `(table.isRoom ? 'C/Out' : 'Bill')`. The 2026-05-21 owner revert is live in code.
- **TableCard height fix** — Waiting label shortened to "Waiting..", confirmed by owner.
- **Owner Smoke QA Report v5** — recorded `waiting_for_rider_corrective_patch_owner_confirmed` covering Bucket 4.5 Gap 1+2+3, Waiting label, and TableCard height.

Implementation contract summary:

| Surface | State (`delivery_assign`, `hasRiderAssigned`, `fOrderStatus`) | Implemented Output |
|---|---|---|
| OrderCard | `(_, _, 1)` | `Ready` button |
| OrderCard | `(false, false, 2)` and isDelivery | `Dispatch` button |
| OrderCard | `(true,  false, 2)` and isDelivery | `Assign Rider` button (opens modal) |
| OrderCard | `(_, true,  2)`  and isDelivery | `Waiting for Rider` (disabled) — **flat, no riderStatus branching yet** |
| OrderCard | `(_, _, 2)` and not delivery | `Serve` button |
| OrderCard | `(_, _, 5)` | `Bill` button (or `Settle` for prepaid non-paylater + auto-settle conditions) |
| TableCard | mirrors OrderCard with `Assign` / `Waiting..` short labels |  |
| CartPanel | bottom button | `Checkout` (room), **`Delivered` (delivery — incorrect, pending fix)**, `Collect Bill` (others) |
| OrderCard rider chip | `riderStatus === 'riderAssigned'` | `Assigned` pill |
| OrderCard rider chip | `riderStatus === 'riderReached'` | **`Reached` pill (text needs to become `Order Accepted`)** |

---

## 7. Remaining Frontend Approved Items

Three items remain. All are frontend-only, all are label/branching, none touch APIs, sockets, or state machines.

### Item 1 — CartPanel label correction

- **File:** `src/components/order-entry/CartPanel.jsx`
- **Area:** ~L1266 (bottom button text inside the Collect Bill block)
- **Current code:** `{isRoom ? 'Checkout' : orderType === 'delivery' ? 'Delivered' : 'Collect Bill'}`
- **Required code intent:** `{isRoom ? 'Checkout' : 'Collect Bill'}` — i.e. delivery orders fall into the "Collect Bill" branch instead of "Delivered".
- **Status:** PENDING (verified by reconciliation; code still emits "Delivered" for delivery).
- **Risk:** LOW — label-only, no logic change, no state impact, no downstream consumer.
- **Implementation note:** Single ternary edit. No new imports. `yarn build` expected 0 errors. Regression check: room orders must still say `Checkout`; dine-in / takeaway must still say `Collect Bill`.

### Item 2 — `riderStatus` branching for Waiting vs Reassign

- **Files:** `src/components/cards/OrderCard.jsx` (~L917–926), `src/components/cards/TableCard.jsx` (~L470–482)
- **Current behavior:** When `isDelivery && hasRiderAssigned`, both cards render a flat disabled "Waiting for Rider" / "Waiting..", regardless of whether the rider has accepted.
- **Required behavior:**
  - If `order.riderStatus === 'riderAssigned'` (pending accept) → keep current disabled "Waiting for Rider" / "Waiting..".
  - Otherwise (e.g. `'riderReached'`, or any other accepted/post-accept state if such a value lands) → render a **clickable "Reassign"** that opens `AssignRiderModal` (the modal is already mounted on both cards).
- **Status:** PENDING (verified by reconciliation; no `order.riderStatus` test exists in the branch today).
- **Risk:** LOW — branching is local to the existing delivery-only path. No new prop, no new state. The `setShowAssignRider` setter and `AssignRiderModal` mount already exist.
- **Implementation note:** Use the same `data-testid` convention (`reassign-rider-btn-${orderId}` / `reassign-btn-${table.id}` recommended). Read `riderStatus` off `order.riderStatus` (OrderCard) and `table.order?.riderStatus` (TableCard). No change to the rider chip block.

### Item 3 — Rider pill rename

- **File:** `src/components/cards/OrderCard.jsx`
- **Area:** L788–795 (rider chip block — branch `order.riderStatus === 'riderReached'`)
- **Current literal:** `Reached`
- **Required literal:** `Order Accepted`
- **Status:** PENDING (verified by reconciliation; pill literal still `Reached`).
- **Risk:** LOW — single string. TableCard does not render this chip block (owner directive), so no parity change needed there.
- **Implementation note:** Replace only the visible label. Keep all colour / class styling intact. Do not rename the riderStatus value itself — `'riderReached'` remains the data value; only the displayed pill text changes.

---

## 8. Backend-Blocked Items (DO NOT IMPLEMENT)

All items below are dependent on backend confirmations. They must NOT be picked up by the next implementation agent until the corresponding backend question is answered and the answer is captured in a refreshed handover doc.

| Item | Blocker / Backend Question |
|---|---|
| Rider accept socket → status change | BQ-097-2 — backend must confirm event name, payload, and whether `f_order_status` advances on accept |
| Rider reject socket → cashier flow | BQ-097-3 — backend must confirm event name and payload; clarify whether `delivery_man` is preserved on reject |
| Rejected rider grey-out in modal | BQ-097-4 — backend must include `rejected_delivery_man_ids` (or equivalent) in socket payload or order response |
| `delivery_man` retention semantics | BQ-097-5 — backend must state whether the field is cleared on reject and how prior rejections are surfaced |
| Final "Rider On The Way" card behavior | Depends on BQ-097-2 result (status pill text + button disabled/hidden) |
| Bucket 5 full socket wiring | Depends on all of the above |
| Rider name disappears after time on card | Parked observation — needs live console debug to identify overwrite source; no fix planned yet |

**Rule:** if the backend ships any of these, do NOT bundle the work into the 3-item patch. Open a separate Bucket 5 planning gate first.

---

## 9. Technical Debt

- **`DeliveryCard.jsx`** — legacy / unused. Owner directive: do not delete. Keep imports out of the dashboard delivery render path (already the case). Future cleanup will need a separate owner decision.
- **Rider-name-disappears observation** — anecdotal report; no reproducer captured. Requires live console debug session (not part of any current bucket).
- **Documentation version drift** — older docs (Owner Smoke QA Report v5 §4 "D. Delivered / Handover", Session Summary §3 Item 2) still reference the "Handover" label that was reverted on 2026-05-21. This is cosmetic only; the code is correct. A future doc-sweep gate can refresh those, but it is not in scope for the 3-item patch.
- **`DELIVERY_ORDER_CANCEL` v2 constant present but unused** — wired for future use, not blocking.

---

## 10. Recommended Next Implementation Scope

The next implementation agent should treat the following as one atomic mini-patch.

**Implement (exactly these, in this order):**

1. **`CartPanel.jsx` L1266** — change `orderType === 'delivery' ? 'Delivered' : 'Collect Bill'` → `'Collect Bill'`. Keep the `isRoom ? 'Checkout' : ...` outer ternary intact.
2. **`OrderCard.jsx` L917–926** — inside the existing `isDelivery && hasRiderAssigned` branch, add a sub-branch on `order.riderStatus`:
   - `'riderAssigned'` → existing disabled "Waiting for Rider".
   - otherwise → clickable "Reassign" button that calls `setShowAssignRider(true)`.
3. **`TableCard.jsx` L470–482** — mirror the same sub-branch using `table.order?.riderStatus`. Short label "Reassign". The `AssignRiderModal` is already mounted (L594).
4. **`OrderCard.jsx` L788–795** — replace the literal string `Reached` inside the rider pill (`order.riderStatus === 'riderReached'` branch) with `Order Accepted`. Do not touch any class names, colours, or surrounding markup.
5. Run `yarn build` and confirm 0 errors.
6. Create a brief implementation report at `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_097_3_ITEM_IMPLEMENTATION_REPORT_2026_05_21.md` summarising the 4 line-level changes and the build result.

**Do NOT touch (explicit exclusion list):**

- `DeliveryCard.jsx` — owner directive, legacy.
- `socketHandlers.js`, `socketEvents.js` — no new sockets, no new events.
- `deliveryService.js`, `constants.js` — no API changes.
- `orderTransform.js`, `profileTransform.js` — no transform changes.
- `AssignRiderModal.jsx` — no rejected-rider prop, no grey-out, no new behavior.
- Any code paths for rider accept / reject sockets.
- Any code path for "Rider On The Way".
- CartPanel logic other than the single label ternary (no validation changes, no `disabled` rule changes, no totals changes).
- Non-delivery card behaviors (Serve, Bill on dine-in/takeaway/room).
- `/app/memory/final/` and baseline docs.
- Any unrelated POS3.0 items (PROD-BUG-001/2/3, BUG-099, BUG-104, hotfixes).

**Apply guardrails from `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`:**

- Pre-implementation approval gate is satisfied by this planning doc + the prior handover §4A/§4B; no further owner sign-off needed for these 3 items.
- After implementation, raise an Owner Smoke QA gate per §11 below.

---

## 11. Owner Smoke QA After Patch

Owner smoke checklist for the 3-item patch (to be run on preprod after the patch lands; checklist v6 to be created at that time).

| # | Test | Expected |
|---|---|---|
| 1 | `yarn build` | 0 errors |
| 2 | Delivery order, no rider, `delivery_assign = Yes`, fOS=2 | **"Assign Rider"** button (regression check) |
| 3 | Delivery order, rider assigned, `riderStatus === 'riderAssigned'`, fOS=2 | **"Waiting for Rider"** / **"Waiting.."** (disabled) — unchanged |
| 4 | Delivery order, rider accepted, `riderStatus === 'riderReached'`, fOS=2 | **"Reassign"** button (clickable). Opens `AssignRiderModal`. |
| 5 | Rider chip when `riderStatus === 'riderReached'` | Pill reads **"Order Accepted"** (not "Reached") |
| 6 | Rider chip when `riderStatus === 'riderAssigned'` | Pill reads **"Assigned"** — unchanged |
| 7 | CartPanel — delivery order | Bottom button reads **"Collect Bill ₹XX"** (not "Delivered") |
| 8 | CartPanel — dine-in order | Bottom button reads **"Collect Bill"** — unchanged |
| 9 | CartPanel — takeaway order | Bottom button reads **"Collect Bill"** — unchanged |
| 10 | CartPanel — room order | Bottom button reads **"Checkout"** — unchanged |
| 11 | Card fOS=5 (delivery and non-delivery) | Button reads **"Bill"** (or **"C/Out"** for room) — unchanged |
| 12 | Non-delivery cards (dine-in, takeaway, room) at fOS=1, 2, 5 | Ready / Serve / Bill — unchanged |
| 13 | OrderCard ↔ TableCard parity | Both surfaces behave the same for the delivery branching |
| 14 | Console after assign | No regression — payload-first handler still works, no extra GET |
| 15 | Dispatch flow (`delivery_assign = No` tenant) | Still labeled "Dispatch", action still PUT — first time this scenario is being smoked, owner-recorded as `not_tested` in QA v5 |

After all 15 rows pass, BUG-097 reaches final status `bug_097_implemented_owner_smoke_passed_bucket_5_blocked`.

---

## 12. Final Planning Status

**`bug_097_final_planning_complete_ready_for_3_item_implementation`**

The planning loop is closed. The next agent has a single, atomic, frontend-only mini-scope to execute, followed by a single owner smoke gate. All other BUG-097 work is correctly quarantined under Bucket 5 / backend-blocked.

---

## BUG-097 in plain English

### What this bug/CR was about
BUG-097 covers the **delivery order lifecycle inside the cashier app** — what the cashier sees and clicks on a delivery order from the moment food is ready to the moment payment is collected, including how the screen reacts when a rider is assigned, accepts, or rejects.

### What is already done
- Delivery orders correctly route to either **Dispatch** (one-click) or **Assign Rider** (modal), based on the restaurant's `delivery_assign` profile setting.
- The Assign Rider modal lists all riders, sends the assign API, and the card updates **instantly** thanks to an optimistic context update.
- The socket event `delivery-assign-order` now uses its own payload instead of making a redundant API round-trip.
- After a rider is picked, the card no longer wrongly shows "Serve"; it now shows a passive **"Waiting for Rider"** state.
- KOT print is hidden during delivery action states.
- At fOrderStatus 5 the card button reads **"Bill"** (the earlier "Handover" wording was reverted on owner's instruction).
- Both `OrderCard` and `TableCard` mirror the same logic. `DeliveryCard.jsx` is left untouched as legacy.
- All of the above was owner-smoke confirmed live on preprod (QA Report v5).

### What changed during owner review
- The decision branch at "Ready" was originally driven off `source` / `isOwn` / `order_in`. Owner overruled this — the only source of truth is **`delivery_assign` on the restaurant profile**.
- An early version of the cashier closeout button on cards read **"Handover"** for delivery. Owner reverted this on 2026-05-21 — it must say **"Bill"** for all order types.
- The CartPanel bottom button currently reads **"Delivered"** for delivery orders. Owner approved this should be **"Collect Bill"** instead. (Approved, not yet in code.)
- After a rider accepts, the disabled "Waiting" button should turn into a **clickable "Reassign"**. (Approved, not yet in code.)
- The rider status pill currently shows **"Reached"** — owner wants it to read **"Order Accepted"**. (Approved, not yet in code.)
- Bucket 5 (rider accept/reject sockets, rejected-rider grey-out, "Rider On The Way") is **parked** because the backend has not yet supplied event names or payloads.
- `DeliveryCard.jsx` is **not to be deleted** even though it's unused.
- `/app/memory/final/` is **not to be updated** for BUG-097.

### What is still pending now

**1. Small frontend items ready now (no backend dependency):**
- `CartPanel.jsx` — change the delivery branch label from **"Delivered"** to **"Collect Bill"**.
- `OrderCard.jsx` + `TableCard.jsx` — when `riderStatus !== 'riderAssigned'` (i.e. rider has accepted or progressed beyond), show a clickable **"Reassign"** button instead of the disabled Waiting state.
- `OrderCard.jsx` rider chip — replace the literal **"Reached"** with **"Order Accepted"**.

**2. Backend-blocked items (do not touch):**
- Rider accept socket and the post-accept card state.
- Rider reject socket and the rejected-rider notification.
- Rejected-rider grey-out inside the Assign Rider modal.
- Whether `delivery_man` is preserved or cleared on rejection.
- Final "Rider On The Way" status pill and any related dashboard auto-removal on handover.
- All of these stay parked until the backend supplies socket event names, payload shapes, and the `rejected_delivery_man_ids` field.

### What next implementation agent should do
Implement exactly these three small frontend items in one atomic patch:

1. **`CartPanel.jsx` (~L1266)** — change `orderType === 'delivery' ? 'Delivered' : 'Collect Bill'` to `'Collect Bill'`. Keep the room `Checkout` branch intact.
2. **`OrderCard.jsx` (~L917–926)** and **`TableCard.jsx` (~L470–482)** — inside the existing `isDelivery && hasRiderAssigned` branch, sub-branch on `order.riderStatus`:
   - `'riderAssigned'` → keep current disabled "Waiting for Rider" / "Waiting..".
   - anything else → clickable **"Reassign"** that opens the (already-mounted) `AssignRiderModal`.
3. **`OrderCard.jsx` (~L788–795)** — change the rider pill literal from **"Reached"** to **"Order Accepted"**.

Then run `yarn build` and create a brief 3-item implementation report at `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_097_3_ITEM_IMPLEMENTATION_REPORT_2026_05_21.md`.

### What next implementation agent must not do
- Do **not** touch `DeliveryCard.jsx` (legacy; do not delete; do not switch dashboard to use it).
- Do **not** add or change anything in `socketHandlers.js`, `socketEvents.js`, `deliveryService.js`, `constants.js`, `orderTransform.js`, `profileTransform.js`, `AssignRiderModal.jsx`.
- Do **not** implement Bucket 5 work: rider accept socket, rider reject socket, rejected-rider grey-out, "Rider On The Way" pill, dashboard auto-removal on handover.
- Do **not** change non-delivery behavior (Serve, Bill, room Checkout).
- Do **not** update `/app/memory/final/` or any baseline doc.
- Do **not** pull in PROD-BUG-001/002/003, BUG-099, BUG-104, or any unrelated hotfix.
- Do **not** rename the `riderStatus` data value `'riderReached'` — only the displayed pill text changes.

---

*— POS3.0 BUG-097 Final Planning Completion — 2026-05-21 —*
