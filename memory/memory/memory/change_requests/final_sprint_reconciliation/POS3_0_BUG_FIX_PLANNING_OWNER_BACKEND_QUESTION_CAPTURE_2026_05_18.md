# POS3.0 Bug-Fix — Owner / Backend Question Capture (Live) — 2026-05-18

**Companion to:**
- `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_FIX_MASTER_IMPLEMENTATION_PLAN_2026_05_18.md`
- `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_FIX_PLANNING_CLOSURE_ADDENDUM_2026_05_18.md`

**Purpose:** Live capture of the Owner Review Gate pass. For every backend-blocked or sequential bug in the POS3.0 Bug-Fix Sprint, the owner is given the chance to answer / decide before the question is escalated to backend.

**Constraint:** Planning only. No code changed. No baseline updated.

**Scope (9 bugs):** BUG-087, BUG-088, BUG-090, BUG-091, BUG-092, BUG-093, BUG-094, BUG-095 (dependency clarification), BUG-101.

---

## Status Legend

| Classification | Meaning |
|---|---|
| `ready_for_implementation_planning` | Fully unblocked; can enter implementation |
| `ready_with_constraints` | Can implement with documented assumption/constraint |
| `backend_blocked` | Owner cannot answer; must escalate to backend |
| `sequential_dependency` | Blocked only by other in-sprint bugs landing first |
| `defer_from_pos3_0` | Owner chose to defer; out of this sprint |

---

## Per-Bug Capture Log

_(Each bug below is filled in as the owner answers the corresponding question.)_

---

### BUG-087 — PayLater "PAID" badge shows incorrectly

**Option chosen:** A — Owner answered now.

**Q-087-1 answer — `payment_type` value for PayLater orders:**
> "Depends — it is `payment_type: 'prepaid'` for the prepaid-PayLater path, and the postpaid-PayLater path uses a different (postpaid collect-bill) endpoint that sends `payment_mode: 'PayLater'` with no `payment_type` field."

**Q-087-2 answer — `payment_method` value in payload:**
> `payment_method: "PayLater"` (mixed case) in the prepaid-PayLater request payload.

**Owner-shared payloads (verbatim):**

Postpaid → PayLater collect-bill payload:
```
{"order_id":"868621","payment_mode":"PayLater","payment_amount":137,
 "payment_status":"sucess","transaction_id":"",
 "billing_auto_bill_print":"Yes","food_detail":[...],...}
```
Key fields: `payment_mode: "PayLater"`, `payment_status: "sucess"` (matches frozen PAY-007 misspelling), NO `payment_type`, NO `payment_method`.

Prepaid path with PayLater chosen at place-order:
```
{"user_id":"","restaurant_id":478,"table_id":"6181","order_type":"dinein",
 ...,"payment_method":"PayLater","payment_status":"paid",
 "payment_type":"prepaid",...,
 "partial_payments":[{"payment_mode":"cash",...},
                     {"payment_mode":"card",...},
                     {"payment_mode":"upi",...}],...}
```
Key fields: `payment_method: "PayLater"`, `payment_status: "paid"`, `payment_type: "prepaid"`.

**Owner additional scope clarifications:**
1. "Prepaid order when served it still remains in context" — i.e., after Mark Served, the prepaid-PayLater order should be removed from dashboard context (parity with regular prepaid orders that disappear after served). Currently it persists.
2. "Only for this special case (prepaid path + PayLater method) the PAID label should not come on the card" — i.e., the existing exclusion logic must reliably catch this exact combination.
3. Screenshot reference attached (small dashboard card showing `🍴 2` table chip + `NA`, illustrating the empty/no-label expected state).

**Important caveat captured for QA:**
- The payloads owner shared are FE → backend **request** payloads.
- The current FE bug occurs when reading `paymentMethod` from the **socket response** that backend echoes back. The case-insensitive check (`order.paymentMethod?.toLowerCase() !== 'paylater'`) already in `OrderCard.jsx` / `TableCard.jsx` will work *if and only if* backend echoes `payment_method: "PayLater"` (or any case variant) in the socket order payload.
- If backend's socket-side payload omits `payment_method`, FE will need a derived rule: `paymentType === 'prepaid' && partial_payments all-zero AND grand_total > 0` (PayLater signature) — but this should not be needed if backend echoes the field.

**Final classification:** `ready_with_constraints`

**Constraints to carry into implementation:**
- C1: Add/verify case-insensitive check for `paymentMethod === 'paylater'` (existing check is already case-insensitive; just confirm it executes).
- C2: Verify in QA that the socket order-data payload echoes back `payment_method: "PayLater"`. If it does not, fall back to a derived rule and raise a follow-up backend ask.
- C3: Extend the fix to also remove a prepaid-PayLater order from dashboard context after Mark Served (parity with normal prepaid orders). Investigate the served-removal path in `socketHandlers.handleOrderDataEvent` and `DashboardPage`.
- C4: Postpaid-PayLater flow (`payment_mode: "PayLater"`, no `payment_type`) is a separate path and is NOT in scope for the PAID-badge fix — it goes through Collect Bill and should already behave correctly.

**No FE-blocking backend question remains** for BUG-087. (The socket-payload echo verification is a QA-time check, not a planning blocker.)

---

### BUG-088 — Room transfer v1 → v2 endpoint + socket migration

**Option chosen:** A — Owner answered now.

**Q-088-1 answer — Is `POST /api/v2/vendoremployee/order/order-shifted-room` live?**
> a1. **Yes, live.** Owner: "We need to change. Backend is live."

**Q-088-2 answer — v2 payload shape vs v1?**
> b1. **Same keys as v1.** Owner: "Yes, payload is same as for other sockets, so we need to reuse code and handler. For this module, before we were calling API; now all that info will come on the socket if this endpoint is used."

**Q-088-3 answer — v2 socket event after room transfer?**
> c2. **`update-order` with full payload.** Owner: "We will check runtime once after flipping endpoint." (i.e., confirm with a live runtime test as part of QA after the endpoint switch.)

**Final classification:** `ready_with_constraints`

**Constraints to carry into implementation:**
- C1: Flip `ORDER_SHIFTED_ROOM` in `api/constants.js` L50 from `/api/v1/vendoremployee/order-shifted-room` to `/api/v2/vendoremployee/order/order-shifted-room`.
- C2: Keep `toAPI.transferToRoom` payload builder as-is (same keys as v1).
- C3: Reuse existing `handleOrderDataEvent` for the incoming `update-order` socket event with full payload — no new socket handler needed.
- C4: Remove optimistic clearing block at `OrderEntry.jsx` L1469-1483 **only after** runtime QA confirms the `update-order` socket event arrives with the full payload after a real room transfer. This stays a follow-up commit inside BUG-088 — not deferred.
- C5: Do NOT delete `handleUpdateFoodStatus` here — that is BUG-095 (Bucket D).

**No FE-blocking backend question remains** for BUG-088. The runtime socket-event-name verification is a QA step inside this bug, not a planning blocker.

---

### BUG-090 — Store CRM customer_id on room orders

**Option chosen:** A — Owner answered now, **with a scope split**.

**Q-090-1 answer — Owner directive:**
> "This user needs to be created in CRM at the time of check-in if user is not there, and id needs to be passed. If backend is not accepting customer_id, then also during check-in user should be created in CRM, so relevant API to be called. So this bug is dependent on backend to start. They need to add customer if it's not there in payload. But one part we can take: to add customer in CRM. So split this bug."

**Scope split applied (owner directive):**

#### BUG-090-A — Auto-create CRM customer at room check-in (FE-only)
- **Scope:** When a room check-in happens and the entered customer is NOT already in CRM (no CRM record matches name+phone), FE calls the existing CRM "create customer" API in `customerService.js` to create the record. Capture the returned `customer_id` in local component state. Removes the silent gap where check-in customers never enter CRM.
- **No backend dependency.** Uses existing CRM endpoints already in FE.
- **Classification:** `ready_for_implementation_planning`

#### BUG-090-B — Pass `customer_id` to room check-in API (Joint)
- **Scope:** Once backend accepts `customer_id` in `POST /api/v1/vendoremployee/pos/user-group-check-in` payload, FE sends the captured CRM `customer_id` (either from existing CRM record lookup OR from BUG-090-A auto-create) in the check-in request. Replace the `isCustomerSelected` workaround.
- **Backend dependency:** Backend must add `customer_id` field acceptance. Owner: "They need to add customer_id in payload."
- **Classification:** `backend_blocked`
- **Backend question remaining:** What field name does backend want? (`customer_id` is the FE preference.) Add a confirmation Q-090-B to the backend packet.

**Final classification for parent BUG-090:** split into BUG-090-A (`ready_for_implementation_planning`) and BUG-090-B (`backend_blocked`).

**Note for main planning doc:** Will require a classification correction — BUG-090 line in §3 of the master plan should be split into 090-A and 090-B.

---

### BUG-091 — CRM search API duplicate dedup

**Option chosen:** A — Owner answered now.

**Q-091-1 answer:**
> "a1 is already done in last sprint." — FE client-side dedup is already in place (defense-in-depth shipped during POS2.0). CRM backend should still fix at source.

**Final classification:** `backend_blocked` (CRM backend team — no FE work)

**FE status:** **closeable for this sprint** from FE perspective — no FE action needed. Owner only needs to push CRM backend team to deduplicate at source.

**Backend question packet update:** Keep the CRM-backend ask in the packet as a notify-when-shipped item. No FE-blocker remains.

---

### BUG-092 — Phone format contract for room check-in

**Option chosen:** D — Needs more investigation.

**Q-092-1 answer:**
> a6. **Needs more investigation — FE to capture a few real CRM search + check-in samples to compare.**

**Final classification:** `defer_from_pos3_0` (with **investigation task** queued)

**Investigation task definition (NOT implementation):**
- Capture: (1) actual check-in payload phone format sent today, (2) actual CRM search query parameter format, (3) CRM record phone format returned. Owner has already shared check-in sample showing `+91XXXXXXXXXX` — need CRM search + CRM record samples to compare.
- After investigation, re-open BUG-092 with concrete contract evidence and either close as "current behavior is correct" or escalate to backend as `backend_blocked`.

**Investigation owner:** First implementation agent picks this up as a side observation while working on Bucket A; does not block Bucket A.

**Backend question:** Q-092-1 **dropped** from the immediate backend packet (pending investigation findings). May be re-added after evidence is captured.

---

### BUG-093 — Room check-in date missing in API response

**Option chosen:** A — Owner answered now, with **runtime validation**.

**Owner answer:**
> "I can see check-in date. Guess it's mapped to `createdAt`, which is actually check-in date only even if `get-single-order-new` doesn't give check-in date." (Screenshot attached showing CHECK-IN column rendering "18-May 10:42" correctly for Room r2 / Guest Abhi.)

**Validation finding:**
- FE transform code already reads `api.room_info.checkin_date` when present (`orderTransform.js` L362).
- When backend response omits `room_info.checkin_date`, FE falls back to the order's `createdAt`.
- For walk-in / immediate check-in, `createdAt ≈ check-in moment`, so the fallback is visually correct in practice.
- Only edge case (advance bookings created before actual check-in) would diverge — owner accepts current behavior as good enough for POS3.0.

**Final classification:** `defer_from_pos3_0` (close as **acceptable current behavior**)

**Rationale:** No FE work required. No backend push required. The existing `createdAt` fallback yields the correct display value in the dominant walk-in scenario.

**Future re-open trigger:** If/when advance-room-booking flow ships (where a room order can be created hours/days before actual check-in), revisit so `room_info.checkin_date` is mandatory in the response.

**Backend question removal:** Q-093 dropped from the backend packet — close as acceptable.

---

### BUG-094 — delivery-assign-order socket missing payload

**Option chosen:** Owner directive — **merge into BUG-097 CR**.

**Owner answer:**
> "Include this bug with that CR." (Referring to BUG-097 — Delivery Dispatch + Assign Delivery Boy.)

**Rationale (owner-driven):** Both items live in the same delivery-assign code path. The socket-payload cleanup makes sense to land alongside the new dispatch/assign UI integration, not as a separate bug-fix item.

**Final classification:** `defer_from_pos3_0` (from the Bug-Fix Sprint perspective) → **re-scoped under BUG-097** in the separate POS3.0 CR sprint.

**Sprint impact:**
- BUG-094 is **removed** from the POS3.0 Bug-Fix Sprint scope.
- BUG-094 acceptance criteria will be carried into BUG-097's planning when the CR sprint kicks off.
- Q-094-1 is **dropped** from the backend question packet for this sprint. It becomes a CR-sprint question.
- Bug-Fix Sprint total drops from 13 → 12 bugs.

---

### BUG-095 — Socket handler + dead-code cleanup (dependency clarification)

**Option chosen:** A — Owner answered now.

**Q-095-1 answer:**
> a1. **Keep BUG-095 as a separate cleanup commit AFTER BUG-088 + BUG-089 are QA-green.**

**Final classification:** `sequential_dependency`

**Pre-conditions confirmed (unchanged from master plan):**
- BUG-088 (room transfer v2) implemented AND QA-green (live `update-order` socket payload verified).
- BUG-089 (eliminate API on `update-food-status`) implemented AND QA-green.
- Grep verification that `fetchSingleOrderForSocket` has no live consumer outside the socket handler chain.

**No backend question. No FE-blocker.**

---

### BUG-101 — Print template GST display slot

**Option chosen:** A — Owner answered now, after FE validation of the print response.

**Validation finding (recorded above the answer):**
Owner shared a sample print response. `delivery_charge_gst_amount` is absent from both the top-level `data` object and the inner `raw_payload` JSON. Print template/backend store procedure does not appear to consume the field. Sample is a non-delivery order so technically inconclusive, but the schema does not reserve even a zero placeholder.

**Q-101-1 answer:**
> a5. **Send to backend / print template owner for further confirmation with a real delivery order.**

**Owner follow-up confirmation (post-validation):**
> "Not there." — Confirmed: the print template does NOT render `delivery_charge_gst_amount`. The field is sent by FE but discarded by the print backend.

**Final classification:** `backend_blocked` (**confirmed** — no further verification needed)

**Backend ask:** Print template owner / backend team must add `delivery_charge_gst_amount` to:
1. The print payload echo (top-level + `raw_payload`) returned by the print endpoint
2. The bill print template rendering (display the value as a separate GST line under the delivery charge, or as part of an itemized tax breakdown)

**No FE work** — FE already sends the field via POS2.0 BUG-083.

**Backend question packet update:** Q-101-1 stays open, now reclassified from "verify" to "implement — confirmed missing".

---

## Final Roll-Up

| Metric | Value |
|---|---|
| Bugs reviewed | **9 of 9** |
| Newly unblocked — ready_for_implementation_planning | **1** (BUG-090-A — new sub-bug from split) |
| Ready with constraints | **2** (BUG-087, BUG-088) |
| Still backend-blocked | **3** (BUG-090-B, BUG-091, BUG-101) |
| Sequential-only dependency | **1** (BUG-095 — confirmed unchanged) |
| Deferred from POS3.0 / re-scoped | **3** (BUG-092 investigation-only, BUG-093 close-as-acceptable, BUG-094 merged into BUG-097 CR) |
| Bug-Fix Sprint total (revised) | **12** items (was 13; BUG-094 left for CR sprint; BUG-090 split into 090-A + 090-B keeps count of 13 if 090-A is treated as new) — effective fillable count for §3 in master plan = **13 (with split)** |

---

### Bugs by Final Classification

#### ready_for_implementation_planning (now / no dependency)
- **BUG-089** — (already, no change) Pure FE socket optimization.
- **BUG-100** — (already, no change) Notification cleanup audit.
- **BUG-102** — (already, no change) Mark Ready/Served socket-driven reset.
- **BUG-103** — (already, no change) Hide native number-input spinners.
- **BUG-090-A** — **NEW** (FE auto-create CRM customer at room check-in if not present).

#### ready_with_constraints (newly unblocked by owner answers — no FE-blocking backend question)
- **BUG-087** — Owner confirmed payment_method case and clarified the served-removal scope. Constraint list captured in BUG-087 section.
- **BUG-088** — Owner confirmed v2 endpoint live, same payload, expects `update-order` socket event. Constraint: runtime QA verification of socket event name before removing optimistic clearing.

#### backend_blocked (still needs backend response)
- **BUG-090-B** — Pass `customer_id` to check-in API once backend accepts the field.
- **BUG-091** — CRM team to dedupe at source. FE side already done in last sprint. No FE work.
- **BUG-101** — Print template owner to confirm `delivery_charge_gst_amount` slot with a real delivery order.

#### sequential_dependency (in scope, runs last)
- **BUG-095** — Cleanup commit after BUG-088 + BUG-089 are QA-green. (a1 confirmed.)

#### defer_from_pos3_0 (out of bug-fix sprint)
- **BUG-092** — Phone format contract: investigation-only. No backend ask yet.
- **BUG-093** — Close as acceptable current behavior (createdAt fallback equals check-in time for walk-ins). Owner-verified.
- **BUG-094** — Merged into BUG-097 (Delivery Dispatch + Assign Delivery Boy) CR. Out of bug-fix sprint.

---

### Updated Recommended Implementation Waves

#### Wave 1 — Bucket A FE Quick Wins (no dependency)
Same order as the original master plan, **plus** BUG-090-A which now qualifies:
1. **BUG-102 (P0)** — Mark Ready/Served socket-driven reset
2. **BUG-089 (P1)** — Eliminate redundant API call on `update-food-status`
3. **BUG-103 (P2)** — Hide native number-input spinners
4. **BUG-100 (P1)** — Remove duplicate local toasts (audit + cleanup)
5. **BUG-090-A (P2)** — NEW: FE auto-create CRM customer at room check-in if not present

#### Wave 2 — Bucket B Ready-with-Constraints (newly unblocked)
6. **BUG-087 (P0)** — PayLater PAID badge: case-insensitive check + served-removal parity
7. **BUG-088 (P1)** — Room transfer v1 → v2; reuse `handleOrderDataEvent`; remove optimistic clearing after QA

#### Wave 3 — Bucket C Backend-Blocked (when backend ships)
8. **BUG-090-B** — Send `customer_id` to check-in API (FE consumes when backend accepts)
9. **BUG-091** — Notify-when-fixed only (CRM backend at source)
10. **BUG-101** — Notify-when-fixed only (print template owner)

#### Wave 4 — Bucket D Sequential Cleanup
11. **BUG-095** — Delete `handleUpdateFoodStatus`, event wiring, `fetchSingleOrderForSocket`. Only after BUG-088 + BUG-089 QA-green.

#### Out of bug-fix sprint (no wave)
- **BUG-092** — Investigation task (owned by Wave 1 agent as a side observation; non-blocking).
- **BUG-093** — Closed as acceptable.
- **BUG-094** — Re-scoped under BUG-097 CR.

---

### Remaining Backend Questions (Final Packet — reduced)

| Q-ID | Bug | Question | Status |
|---|---|---|---|
| Q-090-B-1 | BUG-090-B | Will backend accept a `customer_id` field in `POST /api/v1/vendoremployee/pos/user-group-check-in`? Confirm field name (FE preference: `customer_id`). | Open |
| Q-091-FYI | BUG-091 | (FYI) CRM team to dedupe `GET /pos/customers?search=<phone>` at source. FE already deduplicates client-side. | Notify-when-shipped |
| Q-101-1 | BUG-101 | **Confirmed missing** by owner — `delivery_charge_gst_amount` is not rendered by the print template. Backend / print-template owner to add the slot to the print payload echo (top-level + `raw_payload`) AND the bill print template rendering. | Open (implement) |

**Dropped from previous packet (resolved or re-scoped):**
- Q-087-1, Q-087-2 — Owner provided payloads in this pass.
- Q-088-1, Q-088-2, Q-088-3 — Owner confirmed live status + payload + event name.
- Q-090-1 — Resolved via scope split: 090-A (FE only) + 090-B (renamed Q-090-B-1).
- Q-092-1 — Pending FE investigation; not asked of backend yet.
- Q-093 — Closed as acceptable.
- Q-094-1 — Moved to BUG-097 CR sprint.

**Backend questions remaining for this sprint:** **2 open** (Q-090-B-1, Q-101-1) + 1 FYI (Q-091).
**Down from 9 to 2 actual blockers.**

---

### Main Planning Doc Corrections Needed (to reflect this pass)

The master plan `POS3_0_BUG_FIX_MASTER_IMPLEMENTATION_PLAN_2026_05_18.md` should be updated for the following classification corrections (planning addendum will document the deltas; the main doc itself is updated only where it contains a clear mistake now):

1. §3 Inventory: split BUG-090 row into BUG-090-A (FE-only, Bucket A) and BUG-090-B (Bucket C). Drop BUG-094 row (re-scoped to CR sprint). Mark BUG-093 as "closed_as_acceptable". Mark BUG-092 as "deferred — investigation only".
2. §5 Bucket A: add BUG-090-A.
3. §5 Bucket B: change status from "blocked_backend" to "ready_with_constraints" for BUG-087 and BUG-088; add constraint notes.
4. §5 Bucket C: drop BUG-093 and BUG-094; keep BUG-090-B, BUG-091 (notify-only), BUG-101.
5. §8 Backend Questions: reduce to 2 open (Q-090-B-1, Q-101-1) + 1 FYI.

These corrections will be applied as a minimal-footprint patch to the master doc in a follow-up step, per the owner's instruction "do not change the main planning document unless needed for correcting clear mistakes." The classification deltas above qualify as classification corrections — owner-approved.

---

## Confirmations

- ✅ **No code was written or modified during this owner review pass.**
- ✅ **`/app/memory/final/` was not updated.**
- ✅ **`/app/memory/BUG_TEMPLATE.md` was not modified.**
- ✅ Main planning doc `POS3_0_BUG_FIX_MASTER_IMPLEMENTATION_PLAN_2026_05_18.md` will receive only **classification corrections** (no scope/structure rewrite).
- ✅ This capture document is the **planning-closure freeze** for the POS3.0 Bug-Fix Sprint.

---

*— POS3.0 Bug-Fix — Owner / Backend Question Capture — complete 2026-05-18 —*
