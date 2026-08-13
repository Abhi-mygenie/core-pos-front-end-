# BUG-049 — Impact Analysis: PayLater Settlement Leaves "NA" On Available Table Card

> **Sprint:** pos_final_1.0
> **Task type:** Bug Impact Analysis (read-only — no code changes)
> **Bug ID:** BUG-049
> **Title:** PayLater payment leaves "NA" on available table card
> **Date:** 2026-05-12 (current session)
> **Verdict:** `frontend_fix_ready_for_planning`
> **Source:** `/app/memory/bugs/BUG_049_INTAKE.md`

---

## 1. Docs Read

### `/app/memory/final/`
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `ARCHITECTURE_DECISIONS_FINAL.md` — Module 6 (Dashboard / Tables), Module 7 (Sockets) — both relevant.
- `MODULE_DECISIONS_FINAL.md` — §6 (Dashboard table card) + §7 (Socket lifecycle).
- `CHANGE_REQUEST_PLAYBOOK.md`
- `IMPLEMENTATION_AGENT_RULES.md` — §"Areas that must not be changed casually" calls out `socketHandlers.handleOrderDataEvent` as high-risk.
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md`

### Overlay docs
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`

### Related bug docs
- `bugs/BUG_049_INTAKE.md` (this bug).
- `bugs/BUG_042_C_IMPLEMENTATION_SUMMARY.md`, `BUG_042_C_QA_REPORT.md`, `BUG_042_C_SMOKE_SIGNOFF.md` — fully read. BUG-042-C added the `fOrderStatus===9` removal path that this bug now needs to refine. **Closed and not to be reverted.**
- `bugs/BUG_042_B_*` — `grant_amount` payload; **closed, unrelated**.
- `bugs/BUG_044_STATUS_PULL_AND_NEXT_STEP.md`, `BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md` — **parked**. Cross-reference resolved in §3.

### Code (verified this session)
- `frontend/src/components/cards/TableCard.jsx` — full file viewed.
- `frontend/src/api/socket/socketHandlers.js` — relevant blocks: `syncTableStatus` (L116–132), `handleOrderDataEvent` (L229–317), `handleUpdateOrderStatus` (L394–445), `handleNewOrder` (L185), `handleUpdateTable` (L538–567).
- `frontend/src/utils/statusHelpers.js` — `TABLE_ACTIVE_STATES`, `isTableActive`, `getTableStatusConfig`.
- `frontend/src/contexts/TableContext.jsx` — `updateTableStatus` reducer (L94–113).

---

## 2. Baseline Conflict Check

| Rule | Source | Compatibility |
|---|---|---|
| Module 6 — TableCard owns the active vs. available branch; reads from TableContext only | `MODULE_DECISIONS_FINAL.md` | ✅ Fix lives one layer up (TableContext write side, in socketHandlers); display layer untouched. |
| Module 7 — socket handler is the single writer of table status from server events | `MODULE_DECISIONS_FINAL.md` | ✅ Fix tightens the predicate inside that single writer; does not add a new writer. |
| `handleOrderDataEvent` high-risk for shape changes | `IMPLEMENTATION_AGENT_RULES.md` | ✅ No shape change. One conditional refined. |
| BUG-042-C: status-9 orders removed from running dashboard; table stays `occupied` per Hold semantics | `BUG_042_C_SMOKE_SIGNOFF.md` | ⚠️ **Refinement needed.** BUG-042-C conflated two distinct status-9 scenarios (Hold action vs. PayLater bill-collection). This bug splits them by **event name**. Existing BUG-042-C contract for the Hold path is preserved 1:1. |
| `TABLE_ACTIVE_STATES` includes `pendingPayment` | `statusHelpers.js:97` | ✅ Untouched. The fix avoids leaving a table in `pendingPayment`-mapped-to-`occupied` state after a PayLater **settle**; Hold path continues to land there as before. |
| No `/app/memory/final/` edits | task directive | ✅ Honoured. |
| No `BUG_TEMPLATE.md` edits | task directive | ✅ Honoured. |

**Verdict:** Refinement of a BUG-042-C-introduced predicate inside one socket handler. No baseline conflict; no doc sweep required.

---

## 3. Relationship to BUG-042-B, BUG-042-C, BUG-044

| Bug | Status | Relationship | Verdict |
|---|---|---|---|
| **BUG-042-B** | Closed | `grant_amount` payload field in `order-bill-payment`. Pure transform fix. No overlap with table-status or render path. | **Unrelated.** |
| **BUG-042-C** | Closed | Added the `isHoldClear = (order.fOrderStatus === 9)` branch in `handleOrderDataEvent` (L284) and `handleUpdateOrderStatus` (L425). Removed status-9 orders from running dashboard. Kept table at `occupied` to model the Hold/Park semantics. | **Antecedent — and the site this bug must refine.** BUG-042-C's choice was correct for the Hold/Park use case it documented; it was incomplete for the PayLater **bill-collect** use case which also emits `fOrderStatus===9`. This bug **refines BUG-042-C**, not reverts it. |
| **BUG-044** | Parked | "Free / Available Table Still Shows Old Order Items Until Page Refresh". Per `BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md`, the surface is the **modal / order-entry view** still showing stale items when the underlying order has been freed. Different surface (modal vs. dashboard card label), different artefact (stale items vs. stale `NA`), and the runtime investigation never observed a stuck `pendingPayment` table-status. | **Distinct.** BUG-049 may have the same *flavour* (post-event UI cleanup gap) but a different code path. Fixing BUG-049 should not be assumed to fix BUG-044; cross-reference the two as siblings in a future Hardening sprint. |

**Net classification:** BUG-049 is a **focused refinement of BUG-042-C**, distinct from BUG-042-B and BUG-044.

---

## 4. Current UI Rendering Path for "NA"

**Component:** `TableCard.jsx` (`/app/frontend/src/components/cards/TableCard.jsx`).

**The exact source of "NA"** — `TableCard.jsx:296–300`:

```jsx
<span className="font-semibold">
  {table.isRoom
    ? (table.customer || 'NA')   // Room cards: customer name fallback
    : (table.waiter   || 'NA')}  // Dine-In/TakeAway/Delivery: waiter name fallback
</span>
```

Rendered inside `{isActive && (…)}` block at **L288**. `isActive = isTableActive(table.status)` (L57) is `true` iff `table.status ∈ ["yetToConfirm","billReady","ready","occupied","reserved","running","pendingPayment"]` (`statusHelpers.js:97`).

The `!isActive` branch (L272–285) renders the **Available** chip with the `+` icon. That is the branch that should fire for the abh / Dine-In "1" card after PayLater settlement — but does NOT.

**Why "NA" renders for the bug case:**
1. `table.status` stays at `occupied` (the active-state value `syncTableStatus` writes — see §5/§6 below).
2. `isActive` evaluates `true` → enters the active-content branch.
3. The order has been removed from `OrderContext` (so any downstream merge that injected `table.waiter` is now stale or absent).
4. `table.waiter` resolves to `undefined`/`''` → falls through `||` to `'NA'`.

**Result:** A "freed but flagged occupied" table card shows `🍴 1 | NA` instead of `🍴 1 | Available`.

The fallback string itself (`'NA'`) is harmless in isolation — it is correct when a genuinely-occupied table has no waiter assigned. The defect is upstream: the card should never reach the active branch with no order.

---

## 5. Current State / Context Path

| Layer | File / Function | Role on this flow |
|---|---|---|
| Socket transport | `useSocketEvents.js` | Receives `update-order-paid` from server, routes to `handleOrderDataEvent` with `eventName='update-order-paid'`. |
| Event dispatcher | `socketHandlers.handleOrderDataEvent` (L229–317) | Parses the event, transforms the order, runs the **terminal-detection block** (L283–301). |
| Table-status writer | `syncTableStatus` (L123–132) | Calls `updateTableStatus(order.tableId, overrideStatus ?? order.tableStatus)`. |
| Order remover | `removeOrder` (passed from `OrderContext`) | Drops the order from `OrderContext.orders`. |
| Table-state store | `TableContext.updateTableStatus` (L94–113) | Reducer: writes the new status into `tables` map; emits the `[TableContext] updateTableStatus:` log seen in the screenshot. |
| Renderer | `TableCard.jsx` L57, L272–308 | Reads `table.status` from `TableContext`; `table.waiter`/`table.customer` from the merged table-with-order projection. |

**Final state read by `TableCard` after the bug fires:**
- `table.status === 'occupied'` (set by `syncTableStatus`, **no override** — see §6).
- `table.waiter === undefined` / `''` (the order was removed; no upstream selector to feed the waiter name).
- `isActive === true` → enters L288 active block → falls through to `'NA'`.

---

## 6. Current Socket / Event Sequence (Verified)

`handleOrderDataEvent` at **L283–296** — the exact block that produces the bug:

```js
const isTerminal   = (order.status === 'cancelled' || order.status === 'paid');
const isHoldClear  = (order.fOrderStatus === 9);
const shouldRemove = isTerminal || isHoldClear;

if (shouldRemove) {
  if (isHoldClear) {
    syncTableStatus(order, updateTableStatus);            // ← keeps table 'occupied' (per BUG-042-C Hold path)
  } else {
    syncTableStatus(order, updateTableStatus, 'available');
  }
  removeOrder(orderId);
  log('INFO', `${eventName}: Order ${orderId} is ${order.status} (fOrderStatus=${order.fOrderStatus}), removed`);
}
```

**For a PayLater bill-collect event:**

| Step | Code | Effect on the bug-case order 825899 / table 3237 |
|---|---|---|
| 1 | Socket receives `update-order-paid` | `eventName = 'update-order-paid'` |
| 2 | `orderFromAPI.order(...)` transforms payload | `order.fOrderStatus = 9` (`pendingPayment`), `order.status = 'pendingPayment'` (NOT `'paid'` per the orderTransform; `'paid'` is reserved for `fOrderStatus===6`) |
| 3 | `isTerminal` | `false` (status is `'pendingPayment'`, not `'paid'`) |
| 4 | `isHoldClear` | **`true`** (`fOrderStatus===9`) |
| 5 | `shouldRemove` | `true` |
| 6 | `syncTableStatus(order, updateTableStatus)` — no `'available'` override | Writes `table 3237 → 'occupied'` (per `order.tableStatus` derived from `pendingPayment`, mapped to `'occupied'` in `ORDER_TO_TABLE_STATUS`) — **THE BUG.** Log: `[TableContext] updateTableStatus: 3237 → occupied` |
| 7 | `removeOrder(825899)` | Drops order. Log: `[OrderContext] removeOrder: Removing order 825899` |
| 8 | Card re-renders | `table.status='occupied'`, no order → `isActive=true`, `table.waiter=undefined` → renders **`NA`** |

**Why the screenshot shows the sequence twice:**

The console captures TWO copies of the entire (4-8) sequence:

```
[Socket][19:44:16][DEBUG] Event received: new_order_478  (5) ['update-order-paid', 825899, 478, 9, {…}]
[useSocketEvents] Order channel event: update-order-paid (5) ['update-order-paid', 825899, 478, 9, {…}]
```

The Socket-level DEBUG and the `useSocketEvents` Order-channel-event are both passing the same payload through. The dispatcher then runs `handleOrderDataEvent` once, but the trace shows **two `[TableContext] updateTableStatus: 3237 → occupied`** lines, with the `[OrderContext] removeOrder` interleaved. This suggests `handleOrderDataEvent` is **invoked twice** for the same payload — likely because both the generic `update-order` listener and the specific `update-order-paid` listener fire on the same channel, or because of React 18 StrictMode double-invocation of effects in development.

The double-invoke is a **secondary symptom**, not the root cause. Even a single run of the buggy block produces the stuck-`occupied` table. The duplicate-invocation question is worth tracking as a hygiene follow-up (it represents wasted work) but does not change the fix.

---

## 7. Root Cause Classification

**Primary root cause:** **Frontend stale TableContext write** at `socketHandlers.js:287–291`.

For a PayLater bill-collect event, `handleOrderDataEvent` enters the `isHoldClear` branch (because `fOrderStatus===9`) and writes the table back to its `pendingPayment`-derived `'occupied'` status — under the assumption (correct for Hold/Park, wrong for PayLater bill-collect) that the table conceptually still hosts the diners.

`fOrderStatus===9` is overloaded by the backend:
- **Hold/Park** (cashier puts the order on hold to be settled later) → table should stay occupied; bill not yet collected.
- **PayLater bill-collect** (cashier collects bill as PayLater; cash will be reconciled later) → bill IS collected; table should become available.

The frontend currently cannot distinguish these two without an additional signal. **The cleanest signal is the event name itself**: `update-order-paid` is emitted by the bill-collect flow; a Hold/Park action emits via a different event variant (`update-order` or `update-order-target`). Branching on `eventName === 'update-order-paid'` cleanly separates the two.

**Secondary symptom (not root cause):** Duplicate invocation of the same socket handler for one payload. Worth a hygiene follow-up; does NOT block the fix.

**Tertiary candidate (ruled out):** The TableCard `|| 'NA'` fallback itself. It is correct in isolation; only the upstream stuck-`occupied` state surfaces it pathologically.

**Backend involvement:** None. Backend is correctly emitting `update-order-paid` with `fOrderStatus===9` for PayLater bill-collect, which is its established contract. The FE is misinterpreting that contract.

---

## 8. Frontend vs Backend Classification

**Frontend-only.** Single-file fix.

| Item | Owner |
|---|---|
| Stale `'occupied'` write for PayLater bill-collect | **Frontend** (`socketHandlers.js`) |
| Duplicate handler invocation | **Frontend** (likely event-routing or StrictMode; hygiene follow-up) |
| Backend `update-order-paid` semantics | **Already correct** — no change needed |
| TableCard "NA" fallback | **Already correct** — no change needed |

---

## 9. Exact Files / Functions Likely Affected

| Path | Function / Block | Planned change | Risk |
|---|---|---|---|
| `frontend/src/api/socket/socketHandlers.js` | `handleOrderDataEvent` — terminal-detection block **L283–296** | Refine: when `isHoldClear && eventName === 'update-order-paid'`, override table to `'available'` (PayLater bill-collect path). When `isHoldClear && eventName !== 'update-order-paid'`, keep the current Hold semantics (table stays `'occupied'`). | **LOW–MEDIUM** — one predicate added; preserves BUG-042-C's Hold contract. |
| `frontend/src/api/socket/socketHandlers.js` | `handleUpdateOrderStatus` — mirror block **L425–432** | Mirror the same predicate so both order-data and order-status events handle PayLater bill-collect consistently. | **LOW** — identical change in a parallel block. |
| `frontend/src/__tests__/api/socket/BUG_042_C_handlers.test.js` | Existing BUG-042-C tests | Extend, do not modify the existing assertions. Add scenarios for: (a) `update-order-paid` + status 9 → table `available`; (b) `update-order` + status 9 (Hold) → table `occupied` (preserves BUG-042-C). | LOW — additive. |

### Files explicitly NOT touched
- `frontend/src/components/cards/TableCard.jsx` — `|| 'NA'` fallback is correct in isolation; once the upstream `'occupied'` is corrected to `'available'`, the card renders the `!isActive` branch (Available chip).
- `frontend/src/contexts/TableContext.jsx` — reducer is correct; just receives the right value once the fix lands.
- `frontend/src/contexts/OrderContext.jsx` — `removeOrder` is correct.
- `frontend/src/api/socket/useSocketEvents.js` — dispatcher routing is correct.
- `frontend/src/utils/statusHelpers.js` — `TABLE_ACTIVE_STATES`, `ORDER_TO_TABLE_STATUS` mapping correct as-is.
- `frontend/src/api/transforms/orderTransform.js` — order transform correct.
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` PayLater branch — write path correct (it triggers the backend bill-payment which then emits `update-order-paid`; nothing to change client-side).
- Backend / any API.
- `/app/memory/final/*`, `BUG_TEMPLATE.md`.

---

## 10. Required Runtime / Backend Evidence

| # | Evidence | Status | Blocking? |
|---|---|---|---|
| 1 | Owner-supplied screenshot console trace | ✅ Already on record (intake §7.2) | n/a |
| 2 | Confirm event name on a PayLater bill-collect is `update-order-paid` (not `update-order` or `update-order-source`) | ✅ Screenshot explicitly logs `Event received: new_order_478 (5) ['update-order-paid', ...]` and `Order channel event: update-order-paid` | No — already confirmed |
| 3 | Confirm that a true Hold/Park action emits a different event (NOT `update-order-paid`) | ⚠️ **Recommended check** before implementation. A short reproduction on the same console showing a Hold action's event name and `fOrderStatus` would lock the fix's predicate. | No — fix is safe under both outcomes: if Hold also uses `update-order-paid`, the predicate would over-free Hold tables. If owner confirms Hold uses a different event (most likely), the predicate works cleanly. |
| 4 | Confirm Cash/Card/UPI settle (`fOrderStatus===6`) behaves correctly after fix | ✅ `isTerminal` (status === 'paid') path is untouched; still writes `'available'`. No regression. | No |
| 5 | Confirm the duplicate-invocation in the trace is not creating a race with a third writer | ⚠️ Optional — hygiene investigation. Not blocking BUG-049 fix. | No |

**Recommended pre-implementation:** Owner runs a short check — perform a **Hold** action on a running table (do NOT collect bill; just put on hold) and capture the resulting event name from the same DevTools console. If it is anything other than `update-order-paid`, the fix predicate (§11 Option A) is unambiguous.

---

## 11. Recommended Fix Options

### Option A — Branch on event name (RECOMMENDED)
- **Scope:** `socketHandlers.js:283–296` + parallel block at `L425–432`. Refine `isHoldClear` to additionally check `eventName === 'update-order-paid'` for the "settle to available" path; preserve current Hold behaviour for any other event variant that emits `fOrderStatus===9`.
- **Pseudo-diff (no code change here):**
  ```js
  const isPayLaterSettle = (order.fOrderStatus === 9) && (eventName === 'update-order-paid');
  const isHoldClear      = (order.fOrderStatus === 9) && !isPayLaterSettle;
  const shouldRemove     = isTerminal || isHoldClear || isPayLaterSettle;

  if (shouldRemove) {
    if (isHoldClear) {
      syncTableStatus(order, updateTableStatus);            // Hold: keep occupied (BUG-042-C path)
    } else {
      syncTableStatus(order, updateTableStatus, 'available'); // Paid or PayLater-settle: free the table
    }
    removeOrder(orderId);
    log('INFO', `${eventName}: Order ${orderId} is ${order.status} (fOrderStatus=${order.fOrderStatus}), removed`);
  }
  ```
- **Mirror** at `handleUpdateOrderStatus:425` accepts the `eventName` already in scope (or treats `handleUpdateOrderStatus` events as "non-PayLater-settle" by default).
- **Pros:** Single, principled refinement. Preserves BUG-042-C's Hold contract 1:1. No new state, no new context, no backend dependency.
- **Cons:** Depends on backend emitting `update-order-paid` only for the bill-collect flow. Confirmed in the bug screenshot; owner cross-check in §10.3 recommended.
- **Effort:** ~3 lines + 1-line mirror + 2 additive unit tests.

### Option B — Branch on `paymentType` / `paymentMethod` on the transformed order
- **Scope:** Same blocks; predicate uses `order.paymentMethod === 'paylater'` (or `order.paymentType === 'postpaid'`) instead of event name.
- **Pros:** Independent of socket event naming; relies on data already on the transformed order.
- **Cons:** Requires confirming exactly which field carries the PayLater signal on the v2 payload; risk of false-negative if a Hold action also flips that field. **Less robust than Option A** given the v2 contract evidence in §6.
- **Recommendation:** Fallback only if Option A's evidence (§10.3) reveals a Hold action also emitting `update-order-paid`.

### Option C — TableCard render-side guard
- **Scope:** In `TableCard.jsx`, when `isActive && !table.waiter && !table.customer`, render the Available chip instead of the active branch.
- **Pros:** Trivially small change; no socket-handler refactor.
- **Cons:** **Masks the state inconsistency** instead of fixing it. Other code paths consuming `table.status` (modals, selectors, exports) would continue to see `'occupied'` for a freed table. **Not recommended.**

### Option D — Duplicate-invocation hygiene fix
- Independent of BUG-049 root cause but adjacent. Defer to a follow-up ticket; do NOT bundle.

---

## 12. What NOT to Change

| Surface | Reason |
|---|---|
| `TableCard.jsx` `\|\| 'NA'` fallback | Correct in isolation; fix upstream. |
| `TableContext.updateTableStatus` reducer | Correct; just receives the right value after fix. |
| `OrderContext.removeOrder` | Correct. |
| `useSocketEvents` dispatcher routing | Not in defect path. |
| `statusHelpers.js` (`TABLE_ACTIVE_STATES`, `ORDER_TO_TABLE_STATUS`) | Don't tamper; the Hold path depends on `pendingPayment → occupied` mapping. |
| `orderTransform.fromAPI.order` | Already produces the right `fOrderStatus`, `tableStatus`, etc. No payload-shape change. |
| `BUG_042_C_handlers.test.js` existing assertions | Extend, never modify. The Hold contract must stay green. |
| `CollectPaymentPanel.jsx` PayLater branch | Write side is correct. |
| Backend / `order-bill-payment` / `update-order-paid` socket emission | Out of scope. |
| Any non-Dine-In rendering path (Rooms, TakeAway, Delivery) | The Room branch uses `table.customer || 'NA'` (L298) — identical pattern. Fix lands one layer up and benefits all branches identically. |
| `/app/memory/final/*` and `BUG_TEMPLATE.md` | Task directive. |
| BUG-044 surface (modal / order-entry residue) | Distinct defect; sibling fix at most. |

---

## 13. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Hold/Park tables incorrectly freed | **MEDIUM** in theory; **LOW** in practice | Predicate keys off `eventName === 'update-order-paid'`. If owner's §10.3 cross-check confirms Hold uses a different event (very likely), zero risk. If both events overlap on the Hold path, Option B fallback covers it. |
| Cash/UPI/Card settle regression | **NONE** | `isTerminal` path (`status === 'paid'` for `fOrderStatus===6`) is untouched. |
| `update-order-source` / `update-order-target` for PayLater | **LOW** | Those events are switch-table / source-merge flows, not bill-collect. Predicate scoped to `update-order-paid` exactly. |
| `handleUpdateOrderStatus` mirror | **LOW** | Mirror change is line-for-line; either passes `eventName='update-order-status'` (non-paid) or maintains current behaviour. Worth verifying call sites pass `eventName`. |
| Test breakage on BUG-042-C suite | **LOW** | Hold cases use a non-`update-order-paid` event; existing assertions stay green. New PayLater-paid assertions are additive. |
| Reversibility | **HIGH** (single-commit revert) | n/a |

---

## 14. Recommended Next Step

1. **Owner mini-check (§10.3)** — 30-second console capture during a Hold/Park action to confirm its event name is NOT `update-order-paid`. Lock Option A.
2. **Pre-implementation code gate** — write the predicate change + mirror + two additive unit tests; gate review.
3. **Implementation** — single-commit on the gated change.
4. **QA + owner smoke** — verify (a) PayLater settle → table Available + no "NA"; (b) Hold action → table still Occupied (BUG-042-C green); (c) Cash/UPI/Card settle → table Available (regression check).
5. **Close BUG-049.** File a hygiene follow-up ticket for the duplicate-invocation observation (Option D / §6 last paragraph). File BUG-044 as a separate sibling to be picked up when un-parked.

---

## 15. Final Verdict

**`frontend_fix_ready_for_planning`** ✅

- Defect is a single-predicate refinement of BUG-042-C's `isHoldClear` branch.
- One file, one function (+ one mirror), additive tests.
- No backend dependency. No `/app/memory/final/` sweep. No `BUG_TEMPLATE.md` update.
- Risk LOW–MEDIUM with a clean fallback (Option B) if owner's cross-check reveals an event-name overlap.
- Distinct from BUG-042-B (closed, unrelated), BUG-042-C (closed antecedent — preserved 1:1), and BUG-044 (parked sibling, distinct surface).

### Confirmation
- ❌ No code modified.
- ❌ No `/app/memory/final/` updates.
- ❌ No `BUG_TEMPLATE.md` updates.
- ❌ No backend changes.
- ❌ No implementation plan yet (per task directive — stop after impact analysis).
- ✅ Impact-analysis doc created at `/app/memory/bugs/BUG_049_PAYLATER_NA_TABLE_CARD_IMPACT_ANALYSIS.md`.

---

*End of BUG-049 Impact Analysis. Awaiting owner go-ahead for the 30-second Hold-action event-name cross-check (§10.3) before proceeding to implementation planning.*
