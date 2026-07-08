# BUG-044 — Runtime Scenario Investigation Report

| Field | Value |
| --- | --- |
| Sprint | `pos_final_1.0` |
| Bug | **BUG-044** — Free table tile shows old order items until refresh |
| Task Type | Runtime scenario investigation / bug narrowing (no implementation) |
| Investigation Date / Time (UTC) | 2026-05-11 (post BUG-045 sign-off) |
| Repo / Branch | `core-pos-front-end-` / `12-may-bugs` (HEAD `3944a0a`) |
| Code Changed In This Task | **NONE** |
| `/app/memory/final/` Updated | **NO** |
| `BUG_TEMPLATE.md` Updated | **NO** |
| Other Bugs Touched | **NONE** (BUG-045 sealed; BUG-046 only referenced for non-overlap) |

---

## 1. Docs Read (in mandatory reading order)

### Baseline (`/app/memory/final/`)
- `FINAL_DOCS_APPROVAL_STATUS.md` — reading order, conflict register.
- `ARCHITECTURE_DECISIONS_FINAL.md` — socket-driven realtime contract.
- `MODULE_DECISIONS_FINAL.md` — Dashboard / Realtime Socket boundaries.
- `CHANGE_REQUEST_PLAYBOOK.md` — Steps 4–6 (code truth, API review, state impact).
- `IMPLEMENTATION_AGENT_RULES.md` — hotspot register (socketHandlers, OrderContext).
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — OD-01 / OD-02 / OQ-12 checked.

### Accepted Overlay Docs (`/app/memory/change_requests/`)
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`

### Bug-Specific Docs
- `/app/memory/BUG_TEMPLATE.md` — BUG-044 intake @ L3643–3704.
- `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md` — BUG-044 analysis @ L741–833.
- `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md` — BUG-044 plan @ L428–476, owner-friendly @ L787–838.
- `/app/memory/bugs/BUG_044_STATUS_PULL_AND_NEXT_STEP.md` — previous status pull report.
- `/app/memory/bugs/BUG_045_IMPLEMENTATION_SUMMARY.md` — confirmed BUG-044 surfaces untouched.
- `/app/memory/bugs/BUG_045_QA_REPORT.md`
- `/app/memory/bugs/BUG_045_SMOKE_SIGNOFF.md`

### Code Inspected (truth-check, no edits)
- `frontend/src/api/socket/socketHandlers.js` (full file, 693 lines).
- `frontend/src/contexts/OrderContext.jsx` (full file, 393 lines).
- `frontend/src/api/socket/useSocketEvents.js` (full file, 195 lines).
- `frontend/src/api/transforms/orderTransform.js` — `mapOrderStatus`, `mapTableStatus`, transform L188–191.
- `frontend/src/api/constants.js` — `F_ORDER_STATUS`, `ORDER_TO_TABLE_STATUS`, `RUNNING_ORDERS` endpoint.
- `frontend/src/api/services/orderService.js` — `getRunningOrders`, `fetchSingleOrderForSocket`.
- `frontend/src/pages/DashboardPage.jsx` — `tables` memo @ L498–537.

---

## 2. Baseline Conflict Check

**No baseline conflict with `/app/memory/final/`.**

**One major code-vs-doc-comment inconsistency surfaced during inspection (call-out only — not a baseline conflict; it changes the BUG-044 hypothesis materially):**

> The header comments in `socketHandlers.js` (L4–6) and `useSocketEvents.js` (L4–6) both state:
> _"BUG-203 (April 5, 2026): Removed update-table channel subscription. Table status is now derived from order data inside order event handlers."_
>
> **BUT the code still subscribes to the table channel** (`useSocketEvents.js` L146 + L153). `update-table` events still flow into `handleUpdateTable`, where:
> - `socketStatus === 'engage'` → calls `setTableEngaged(tableId, true)` only.
> - `socketStatus === 'free'` → **explicitly ignored** (L533–536: _"v2: No flow sends update-table free. Ignore it."_).
> - Any other value (e.g., `'available'`) → `updateTableStatus(tableId, mapped)` only; **does NOT touch OrderContext**.
>
> Per playbook §"How to handle code vs document conflict": **trust code first**. Recorded as a finding, not a blocker.

---

## 3. Current BUG-044 Hypothesis (as inherited from Impact Analysis + Bucket-1 Plan)

> When a table becomes free, the old order's items may remain visible on the dashboard until manual refresh, because `handleUpdateTable` does not remove residual orders. Add a frontend `removeOrdersByTableId(tableId)` safety-net hook inside `handleUpdateTable`.

**Verdict after code-truth investigation: the hypothesis is anchored on an outdated mental model.** See §5–10.

---

## 4. Per-Scenario Evidence (A–G)

For each scenario below, "code-proven" means I traced the exact event sequence in the codebase end-to-end; "code-unprovable / needs runtime" means I cannot confirm without observing the actual backend socket emission for that flow.

### A. Normal dine-in bill collection (Collect Bill → paid)

**Backend endpoint involved:** `BILL_PAYMENT = '/api/v2/vendoremployee/order/order-bill-payment'`.

**Code-proven socket path:**
1. Backend processes payment → emits `update-order-paid` on the order channel (and historically may also emit `update-table` with `'free'` — which is now explicitly ignored).
2. `useSocketEvents.handleOrderChannelEvent` (L77–79) routes `update-order-paid` → `handleOrderDataEvent(args, ctx, 'update-order-paid')`.
3. Inside `handleOrderDataEvent` (L228–305):
   - Payload `orders[0]` is transformed via `orderFromAPI.order(...)` → `order.status = mapOrderStatus(f_order_status)`.
   - `F_ORDER_STATUS[6] = 'paid'` (constants.js L139). So if backend sets `f_order_status = 6`, `order.status === 'paid'` → `isTerminal = true`.
   - **Atomic cleanup** at L281–284:
     ```
     syncTableStatus(order, updateTableStatus, 'available');  // table → 'available'
     removeOrder(orderId);                                     // order dropped from OrderContext
     ```
4. `DashboardPage.tables` memo (L498–537) auto-rederives:
   - `getOrdersByTableId(t.tableId)` returns `[]` (order is gone).
   - `tableOrders.length === 0` branch fires (L507) → tile renders single available entry.

**Stale-order risk for this flow: ZERO** — provided backend emits any of the 4 terminal-capable events (`update-order`, `update-order-source`, `update-order-paid`, `update-order-status`) with `f_order_status === 6` (or anything mapping to `'paid'`/`'cancelled'`).

**This scenario does NOT reproduce BUG-044.**

### B. `update-order-paid` socket flow (and BUG-PREPAID-SETTLE generic `update-order`)

**Code-proven:** Identical to scenario A. The handler decides by `order.status === 'paid' || 'cancelled'`, not by event name (L278–284). The April-2026 BUG-PREPAID-SETTLE comment at L269–277 explicitly documents that backend's prepaid Settle flow uses generic `update-order` (not `update-order-paid`), and the FE still cleans up correctly because the decision is status-based.

**Stale-order risk: ZERO** — as long as `f_order_status` arrives as 3 or 6.

### C. `update-table` only (no terminal order frame)

**Code-proven:** This is exactly the scenario the previous plan targeted, but the current code path proves it **CANNOT produce stale orders**:

1. `handleUpdateTable` (L512–543) — three branches:
   - `'engage'` → `setTableEngaged(tableId, true)` only. **Order list unaffected.**
   - `'free'` → **explicitly ignored** (L533–536). No state mutation. The comment _"v2: Table status is derived from order data in order event handlers"_ is the truth — code never wires `'free'` to anything.
   - any other value (e.g., `'available'`) → `updateTableStatus(tableId, mapped)` only. **Order list unaffected.**

2. `DashboardPage.tables` memo (L505–522) — the tile's rendered content is keyed off `getOrdersByTableId(t.tableId)`, **not** off `t.isOccupied`:
   ```
   const tableOrders = getOrdersByTableId(t.tableId);
   if (tableOrders.length === 0) {
     return [{ ..., status: t.isOccupied ? 'occupied' : 'available' }];
   }
   return tableOrders.map((order, idx) => ({ ..., status: order.tableStatus, amount, time, items, ... }));
   ```
   - `t.isOccupied` only affects the tile's `status` label when no orders are present. It does **NOT** suppress order rendering. So a "freed" `update-table` cannot empty the tile if the order is still in `OrderContext`.

**Implication: even if backend sends a perfectly-formed `update-table free/available` frame, the FE will continue to render the old order's items until the order is removed from `OrderContext`.** The `update-table` channel is effectively a no-op for stale-cleanup purposes.

**This scenario CONFIRMS the failing case can ONLY originate from a missing/malformed order-channel terminal frame, not from anything `handleUpdateTable` does or doesn't do.**

### D. Room / shifted / associated order cases

**Code-proven:**
- Room orders share `tableId` channel but have `isRoom = true`. `getOrdersByTableId` filters by `!o.isWalkIn` (L290) — does not filter by `isRoom`.
- Room cleanup flows through the same `update-order-status` / `update-order-paid` paths as dine-in.
- OQ-12 (room billing / print ownership) is **deferred** per `OPEN_QUESTIONS_FINAL_RESOLUTION.md`. Any FE-side rule that wipes orders by `tableId` would also wipe in-progress room orders, which is exactly the deferred-decision territory.

**Stale-order risk: same as dine-in (depends entirely on backend emitting terminal frame).** Room-specific stale behavior is NOT distinguishable from the generic dine-in case in current code.

### E. Walk-in / tableId = 0 / takeaway / delivery

**Code-proven:**
- `OrderContext.getOrdersByTableId` (L290) filters by `!o.isWalkIn` — walk-ins are returned by `walkInOrders` memo, not by table lookups.
- `OrderContext.orderItemsByTableId` (L298–299) skips entries where `order.isWalkIn` or `!order.tableId`.
- `DashboardPage.tables` memo never renders walk-in/takeaway/delivery orders into the table grid (separate `walkInOrders` flow).
- `syncTableStatus` (L125) and `handleUpdateTable` (L524–527) skip `tableId === 0`.

**Stale-order risk for tableId = 0: NOT APPLICABLE** — these orders never appear in the table grid in the first place. They appear in walk-in / takeaway / delivery sections, which use their own derived state.

**No stale-order issue documented in any of the bug docs for these order types.**

### F. Merge / transfer / table-switch cases

**Code-proven (transfer / table-switch — `update-order-target`):**
- Path: `update-order-target` → `handleOrderDataEvent(..., 'update-order-target')`.
- At L256–266: detects `oldTableId !== newTableId`. If old table was non-zero, sets `updateTableStatus(oldTableId, 'available')` + `setTableEngaged(oldTableId, false)`. Order itself is `updateOrder`'d to the new tableId (not removed), so `getOrdersByTableId(oldTableId)` returns `[]` and `getOrdersByTableId(newTableId)` returns the order. **Clean.**

**Code-proven (merge — `MERGE_ORDER` endpoint `/api/v2/vendoremployee/order/transfer-order`):**
- HTTP-only endpoint; FE awaits HTTP response and then waits on socket for `update-order-source` (source order cancelled/removed) + `update-order-target` (target order updated with merged items).
- `update-order-source` → `handleOrderDataEvent(..., 'update-order-source')`. If `order.status === 'cancelled'` (i.e., merged source was cancelled with f_order_status=3) → `removeOrder` + `syncTableStatus → 'available'`. **Clean — if backend emits this frame.**

**Code-unprovable without runtime:** whether backend reliably emits `update-order-source` with `f_order_status=3` for the merged source order in **every** merge variant (same-section vs cross-section, dine-in vs room). If any merge variant skips the source's terminal frame, the source table would carry stale items.

**This is a high-suspicion candidate for the failing case.** Needs runtime reproduction.

### G. Manual refresh / bootstrap comparison

**Code-proven:**
- `getRunningOrders` (orderService.js L13–18) → calls `RUNNING_ORDERS = '/api/v1/vendoremployee/pos/employee-orders-list'`.
- Endpoint is named "running orders" — backend filters out paid/cancelled orders from this response (per endpoint contract documented in `current-state/API_USAGE_MAP.md` lineage; behavior also implicit from name).
- On refresh, `OrderContext.setOrders(fresh)` REPLACES the entire orders array → any stale order not in the response is dropped.

**Conclusion:** Refresh works because the backend bootstrap API correctly excludes paid/cancelled orders. The socket pipeline is the asymmetric one: it correctly handles the inclusion side (new orders / updates) but is dependent on backend emitting terminal-status frames to handle the exclusion side.

**This proves the bug is NOT in OrderContext bootstrap logic. The asymmetry is socket-side only.**

---

## 5. Exact Failing Scenario — Status

### Confirmed failing scenarios (proven by code path)
**NONE proven from FE code alone.** In all 7 scenarios A–G, when backend emits any of the 4 terminal-capable order events (`update-order`, `update-order-source`, `update-order-paid`, `update-order-status`) with `f_order_status ∈ {3, 6}`, the FE atomically cleans up both the order and the table status. **The FE has no observable failure path in current v2 code.**

### Suspected failing scenarios (need runtime evidence)
The only way BUG-044 can manifest in current v2 code is if one of the following backend-side conditions holds for at least one closure path:

1. **Backend silently marks an order paid/cancelled in DB but emits no terminal-capable socket frame for that closure path.** (No order-channel event with the matching orderId arrives within the dashboard session.)
2. **Backend emits a frame but with a non-terminal `f_order_status`** (e.g., `5 = served` or `9 = pendingPayment`) for a payment that has actually settled the DB.
3. **Backend emits the frame on the table channel** (`update-table` with `'free'` or `'available'`) **instead of** the order channel — which the FE then ignores per BUG-203.

**Highest-suspicion candidates by flow type** (from §4 unprovable parts):
- **Merge source order** (cross-section merges, room-to-table merges). Needs verification that `update-order-source` with `f_order_status=3` reliably emits.
- **Prepaid Settle on Hold tab** (the BUG-PREPAID-SETTLE comment at L269–277 acknowledges this was historically broken; it's documented as fixed, but the failing path could still be active for the *Hold tab* variant where Collect Bill is invoked).
- **Room order checkout** (deferred by OQ-12; cleanup semantics not finalized).

### Non-failing scenarios (proven safe)
- Normal dine-in Collect Bill on a placed order (Scenario A) — emits `update-order-paid` with `f_order_status=6`; cleanly removed.
- Cancel order from dashboard (Scenario B variant) — emits `update-order-status` with `f_order_status=3`; cleanly removed.
- Table transfer (Scenario F sub-case `update-order-target`) — cleanly handled.
- Walk-in / takeaway / delivery (Scenario E) — never enter the table-grid render path.
- `update-table free` (Scenario C) — already a no-op in v2 code; cannot cause stale orders by itself.

---

## 6. Socket / Event Sequence Map (for owner reproduction)

For the next owner reproduction, capture the following per closure path:

| Closure Path | Expected Event(s) | Required Field | FE Behavior If Present | FE Behavior If Absent |
| --- | --- | --- | --- | --- |
| Collect Bill (normal dine-in) | `update-order-paid` | `payload.orders[0].f_order_status = 6` | `removeOrder` + table → available | **stale order remains** |
| Cancel order (any path) | `update-order-status` or `update-order-source` | `f_order_status = 3` | `removeOrder` + table → available | **stale order remains** |
| Prepaid Settle (Hold tab) | `update-order` (per BUG-PREPAID-SETTLE) | `f_order_status = 6` | `removeOrder` + table → available | **stale order remains** |
| Merge source | `update-order-source` | `f_order_status = 3` | `removeOrder` (source) + table → available | **stale order remains on source table** |
| Merge target | `update-order-target` | merged-items payload | `updateOrder` (target) | new items missing on target |
| Switch table | `update-order-target` | `tableId = newTableId` | old table freed + order moved | **stale order on old table** |
| Room checkout | (not in current FE doc set) | OQ-12 deferred | OQ-12 deferred | OQ-12 deferred |

---

## 7. OrderContext State Analysis

**OrderContext mutations summary (verified):**
- `addOrder` (L87) — inserts a new order; never removes.
- `updateOrder` (L114) — upserts; never removes (adds back if not found — L121–124).
- `removeOrder` (L139) — single-id removal; called only by terminal-status handlers in socket layer.
- `setOrders` (L21) — full replace, called by bootstrap / refresh.
- **No batch-by-tableId removal exists.** (This is what the Bucket-1 plan proposed adding.)

**Conclusion:** OrderContext is fundamentally an additive store maintained by socket events. Its only removal pathway is per-orderId, triggered exclusively by the 3 terminal-status branches in `handleOrderDataEvent` and `handleUpdateOrderStatus`. There is no defensive cleanup; the contract is that backend MUST emit a terminal frame for every closure path.

---

## 8. Refresh / Bootstrap Comparison (Scenario G evidence)

| Aspect | Live socket state | After manual refresh |
| --- | --- | --- |
| Orders array source | accumulated via socket events from session start | replaced via `getRunningOrders()` → `setOrders(fresh)` |
| Paid/cancelled orders | retained unless `removeOrder(orderId)` was called | excluded (backend filters in `RUNNING_ORDERS` endpoint) |
| Table status | derived from latest socket event per order (or `update-table` engage) | derived from API table list (`apiTables`) |
| Net behavior | depends on backend emitting terminal frames | always self-correcting |

**This asymmetry is the root cause of why "browser refresh fixes it" while live state stays stale.** It's not a FE state-management bug; it's a backend-signaling-completeness issue manifesting as a FE UI symptom.

---

## 9. Risk Analysis — Option-by-Option

### Option A — Remove orders by tableId on `update-table` → `'available'`
- **Where it would fire:** `handleUpdateTable` `else` branch (L537–541). The `'free'` branch is ignored, so we'd need to land here.
- **Net effect:** would clean residual orders if backend emits `update-table` with mapped status `'available'`.
- **Risk:** **HIGH.** Backend may emit `update-table` *before* the matching `update-order-paid` arrives, or before the user-initiated Collect Bill HTTP completes. We could wipe an order that's mid-transaction. Walk-ins are guarded but any active dine-in/room order would be vulnerable.
- **Verdict:** ❌ Not safe without backend ordering guarantees.

### Option B — Remove by tableId on `'available'` AND order is terminal
- **Net effect:** identical to today (terminal-status handlers already do this). Adds nothing.
- **Risk:** **NEUTRAL but pointless** — wouldn't fix the failing case (which is, by definition, the absence of a terminal frame).
- **Verdict:** ❌ Doesn't solve the bug.

### Option C — Remove by tableId on `'available'` AND not walk-in/takeaway/delivery/room
- **Net effect:** similar to A but with room-orders carve-out.
- **Risk:** **MEDIUM-HIGH.** Same race-condition risk as A on dine-in orders; "room" carve-out only kicks the can to OQ-12.
- **Verdict:** ❌ Still treats backend signaling gap with a FE eraser. Risk of wiping active orders remains.

### Option D — Investigate and fix the missing terminal-order socket emission (backend)
- **Net effect:** root-cause fix.
- **Risk:** **LOW.** Backend is the source of truth. If the failing path is identified (merge source / prepaid Settle Hold variant / room checkout), backend can be patched to emit the right frame consistently.
- **Verdict:** ✅ Correct direction — requires backend confirmation per Implementation Agent Rules.

### Option E — No FE fix; rely on backend
- **Net effect:** identical to D, just framed as a non-change.
- **Risk:** stale UI persists in production until backend ships the fix.
- **Verdict:** ⚠ Acceptable short-term; needs an explicit owner / SLA decision on how long FE can wait.

### Option F (new — emerged during this investigation) — Narrow FE safety-net keyed on **order-channel events**, not table-channel
- **Where it would fire:** add a derived rule: if **any** order-channel event arrives where the in-payload order has `payment_status === 'paid'` (or `f_order_status === 6` / `3`) but a previous closure path failed to emit, the FE removes it. This is essentially "be more liberal in interpreting terminal events".
- **Net effect:** tightens the existing terminal predicate (currently `order.status === 'paid' || 'cancelled'` derived from `f_order_status` map). Adds defense-in-depth without inventing a parallel table-channel cleanup.
- **Risk:** **LOW** — additive guard on the same code surface that already does removals.
- **Verdict:** ✅ **Best FE-only candidate IF** runtime reproduction shows backend is emitting an order-channel event but with a non-terminal `f_order_status` (e.g., `5 = served` or `9 = pendingPayment`) for a settled order.

---

## 10. Recommended Narrow Fix — Conditional, Pending Reproduction

**Do NOT implement the previously-planned Option A/C broad cleanup hook in `handleUpdateTable`.** Code-truth investigation shows it would mask a backend signaling gap and introduce a real risk of wiping mid-transaction orders.

**Recommended next investigation pathway** (in priority order):

1. **Runtime reproduction with DevTools console open** for the 4 highest-suspicion closure paths:
   - Cross-section / room merge → source table cleanup.
   - Prepaid Settle from Hold tab.
   - Room checkout.
   - Any path the owner has personally reproduced.
2. **Capture the exact socket frames emitted** (event name, channel, full `payload.orders[0]` object, especially `f_order_status` + `payment_status` + `order_status`).
3. **Match against the F_ORDER_STATUS map** (3=cancelled, 6=paid) and verify whether the FE removal predicate fires:
   - If a terminal frame arrives → backend OK; investigate why FE didn't act (transform bug?).
   - If no terminal frame arrives → backend bug; recommend Option D.
   - If a frame arrives with `payment_status='paid'` but `f_order_status≠6` → Option F (narrow FE predicate widening).

### Guard conditions for ANY future FE fix
- Must NOT key on `update-table` channel (decommissioned per BUG-203 architectural intent; the existing subscription is residual code).
- Must NOT remove orders by `tableId` alone (race-condition risk; cannot distinguish "table just freed" from "another agent is editing the order").
- Must preserve walk-in / takeaway / delivery (`tableId = 0`) untouched (already enforced by syncTableStatus + getOrdersByTableId).
- Must NOT modify room-order behavior beyond what's already documented (OQ-12 deferred).
- Must preserve the existing terminal predicate (`order.status === 'paid' || 'cancelled'`) as the primary path.

---

## 11. Whether Pre-Implementation Code Gate Can Proceed

**NO — not yet.** The pre-implementation gate I recommended in the prior status pull report was predicated on the existing Bucket-1 plan being structurally correct. This investigation **invalidates that premise**: the Bucket-1 plan hooks the safety-net into a code surface (`handleUpdateTable`) that **demonstrably does not produce the bug in current v2 code**, and would create a new race-condition risk if implemented.

Proceeding to a pre-impl gate now would lock in a fix design that's solving a non-existent FE pathway.

---

## 12. Specific Questions Answered

1. **In which exact flow does BUG-044 happen?** Unknown without runtime reproduction. Suspect: merge-source, prepaid-Settle-on-Hold, or room-checkout. NOT the `update-table` channel.
2. **Does it happen after Collect Bill?** Code-proven NO for the normal dine-in path (Scenario A). Suspect YES for the Hold-tab-Collect-Bill variant (per BUG-PREPAID-SETTLE comment).
3. **Does it happen after payment status update?** Only if the payment status update fails to also carry a terminal `f_order_status`. Needs backend confirmation.
4. **Does it happen only when `update-table` sends `available`?** **No** — that pathway cannot cause it. `handleUpdateTable`'s `'available'` branch does NOT touch OrderContext.
5. **Does it happen when `update-table` sends `free`?** **No** — that pathway is explicitly ignored (L533–536) and has been since BUG-203 (April 2026).
6. **Does it happen only when terminal order socket is missing?** **YES — this is the only code-supported failure mode.** Either the frame is missing entirely, or it arrives with a non-terminal `f_order_status`.
7. **Does it affect only dine-in/table orders?** Yes — walk-in/takeaway/delivery never enter the affected render path (Scenario E).
8. **Does it affect walk-in/takeaway/delivery?** **No.**
9. **Does refresh clear it because bootstrap API excludes the order?** **Yes** — confirmed (Scenario G).
10. **Is the earlier proposed `removeOrdersByTableId(tableId)` still safe and necessary?** **Neither.** Not necessary because the targeted code path doesn't cause the bug. Not safe because it introduces race-condition risk on active orders.
11. **If yes, what exact guard conditions must it have?** N/A — not recommended.
12. **If no, what is the narrower fix?** Option D (backend fix for missing terminal emission) OR Option F (widen FE terminal predicate to include `payment_status === 'paid'` defensive read) — but ONLY after runtime evidence pinpoints which closure path is failing and how.

---

## 13. Final Verdict

### `needs_runtime_reproduction` + `needs_backend_confirmation`

Both apply simultaneously:
- **Runtime reproduction needed** to identify which closure path emits a deficient socket sequence.
- **Backend confirmation needed** to determine whether the failing path is "no terminal frame emitted" (backend fix) or "frame emitted but FE predicate too narrow" (FE fix).

**Explicitly NOT** `failing_scenario_confirmed_ready_for_code_gate` — the previously-planned fix design is invalidated by code-truth.

**Explicitly NOT** `no_fe_bug_found` — owner has observed real stale-UI behavior; the issue is real but lives in the backend signaling completeness (or possibly in `f_order_status` value choices for edge-case closures), not in the FE state-management layer.

---

## 14. Recommended Next Step (Concrete)

1. **Owner / QA runtime reproduction** with DevTools console (capture `[useSocketEvents]`, `[SocketHandler]`, `[OrderContext]` log lines + raw socket frames) on a reproducible failing closure path. Highest-priority candidates:
   - Cross-section merge (source side).
   - Prepaid Settle on Hold tab.
   - Room checkout (subject to OQ-12 owner decision).
2. **Feed the captured frames** back as evidence into a follow-up investigation that decides between Option D (backend) and Option F (narrow FE predicate widening).
3. **Park the existing Bucket-1 BUG-044 plan** with an addendum noting it is **superseded by this investigation**; do not implement it as written.
4. **Do not create a pre-implementation code gate** for BUG-044 until the failing closure path is identified.

---

## End Of Report

- **No code was changed in this task.**
- **`/app/memory/final/` was not modified.**
- **`/app/memory/BUG_TEMPLATE.md` was not modified.**
- **`/app/memory/bugs/POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md` was not modified** (BUG-044 section therein is now stale; that's flagged here, not edited there).
- This report lives at `/app/memory/bugs/BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md`.
- BUG-045 was not touched.
- BUG-046 was referenced only for non-overlap and was not touched.
