# Quick Debugging Handover — Prepaid Served Order Persists On Dashboard After Settle

**Status:** ✅ Fixed (Apr-2026)
**Type:** Bug
**Severity:** Medium — visual/data inconsistency on Dashboard after prepaid settle
**Scope:** Frontend only (single-file patch)

---

## 1. User Report
- **Raw user issue:** "Table number 3, it's a prepaid order which was served, why it still shows on table"
- **Clarified requirement:** When a prepaid order is settled via the **Settle** button on the Order Card (`paid-prepaid-order` endpoint), the order card should disappear from the Dashboard; the table should return to the empty/Available state with no ghost order on top.
- **Current behavior (pre-fix):** After Settle, the table card simultaneously shows the paid order card (with PAID badge) AND an "Available" footer pill. The order disappears only on a manual refresh / re-login.
- **Expected behavior:** Order disappears from Dashboard immediately on Settle success; table cleanly returns to Available.

---

## 2. Scope
- **Included:** All `paid-prepaid-order` settle flows (Order Card and Table Card; dine-in / walk-in / takeaway / delivery / room — anywhere a prepaid order can be settled).
- **Excluded:** Backend changes. No backend coordination required.
- **Affected order types/channels:** All order types when `paymentType === 'prepaid'` and user clicks **Settle** at fOrderStatus 5 (served).
- **Affected screens/modules:** Dashboard (`/`) — Order View, Table View. Not affecting Reports / Audit.

---

## 3. Documents Reviewed
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
- (Architecture / Module decisions docs scoped to socket layer only)
- User screenshots: console output + Network tab `paid-prepaid-order` request/response

---

## 4. Code Areas Reviewed

| File | Why | Relevant function/component | Finding |
|---|---|---|---|
| `frontend/src/components/cards/OrderCard.jsx` | Settle button handler | `handleSettlePrepaid` (L139–155) | Calls `completePrepaidOrder()`. Comment at L137-138 expects backend to emit `update-order-paid`. |
| `frontend/src/components/cards/TableCard.jsx` | Mirror Settle button | `handleSettlePrepaid` (L160 onwards, BUG-274) | Same `completePrepaidOrder` call — fix covers both call sites for free. |
| `frontend/src/api/services/orderService.js` | Endpoint caller | `completePrepaidOrder` (L88–97) | POST to `API_ENDPOINTS.PREPAID_ORDER` = `/api/v2/vendoremployee/order/paid-prepaid-order`. |
| `frontend/src/api/constants.js` | Endpoint + status maps | `PREPAID_ORDER` (L42), `F_ORDER_STATUS` (L133–144), `ORDER_TO_TABLE_STATUS` (L174–184) | `f_order_status:6 → 'paid' → tableStatus 'available'`. |
| `frontend/src/api/transforms/orderTransform.js` | Status derivation | `mapOrderStatus`, `fromAPI.order` (L165–167, L190) | `order.status` is derived ONLY from `f_order_status`, not from `payment_status`. |
| `frontend/src/api/socket/useSocketEvents.js` | Channel routing | `handleOrderChannelEvent` switch (L62-79) | Routes `update-order` and `update-order-paid` both to `handleOrderDataEvent` with different `eventName` strings. |
| `frontend/src/api/socket/socketHandlers.js` ⭐ | Decisive logic | `handleOrderDataEvent` (L221–298) | **Bug location.** `shouldRemove` predicate at L262–263 was event-name-based instead of status-based. |
| `frontend/src/contexts/OrderContext.jsx` | State store | `updateOrder`, `removeOrder` (L87–154) | Console.log inside `setState((prev)=>{...})` updater is dev-mode logged twice by React.StrictMode (cosmetic). No actual duplicate state mutation. |
| `frontend/src/contexts/TableContext.jsx` | State store | `updateTableStatus` (L94–135) | Same StrictMode log-doubling as OrderContext. |
| `frontend/src/index.js` | StrictMode setup | `<React.StrictMode>` at L8 | Confirmed enabled — explains the "double log" symptom users observed. Not a functional bug. |

---

## 5. Flow Trace (Prepaid Settle)

1. **User action:** Clicks **Settle** on the order card at fOrderStatus 5 (served), `paymentType='prepaid'`.
2. **Component handler:** `OrderCard.handleSettlePrepaid` (or `TableCard.handleSettlePrepaid`).
3. **API call:** `POST /api/v2/vendoremployee/order/paid-prepaid-order`
   ```json
   { "order_id": "731989", "payment_status": "paid", "service_tax": 128.9, "tip_amount": 0 }
   ```
   Response: `{ "message": "Bill cleared via prepaid" }`.
4. **Socket event:** Backend emits `update-order` (NOT `update-order-paid` — that channel is reserved for unpaid → bill-collected flow per user's note).
   - Payload includes `f_order_status: 6` and `payment_status: "paid"`.
5. **Channel routing:** `useSocketEvents.js:69` — `handleOrderDataEvent(args, ctx, 'update-order')`.
6. **State update (post-fix):**
   - `orderTransform` maps `f_order_status:6 → status:'paid'`.
   - `isTerminal = true` (status is 'paid').
   - `shouldRemove = true` (Path C: status-based).
   - `removeOrder(731989)` — order leaves OrderContext.
   - `syncTableStatus(order, updateTableStatus, 'available')` — table → Available.
7. **UI/output:** Dashboard re-renders without the paid order; table cleanly shows Available.

---

## 6. Root Cause Analysis

- **Confirmed root cause (from code):** `socketHandlers.js:263` `shouldRemove` predicate was scoped too narrowly to the event name. It only triggered remove on `update-order-source` and `update-order-paid`, not on a generic `update-order` even when the order's status had reached a terminal state (`paid` / `cancelled`).
- **Why backend behavior is correct:** `update-order-paid` is reserved for the **post-paid bill-collection** flow (cashier collects on a previously unpaid order). The prepaid Settle flow is a different lifecycle terminator — backend emits a generic `update-order` carrying `f_order_status:6`. Forcing backend to reuse `update-order-paid` would conflate two semantically distinct events.
- **Why the "double-log" complaint is unrelated:** React.StrictMode (enabled in `index.js:8`) intentionally invokes `setState` updater functions twice in development to detect impure updaters. Logs placed inside `setOrdersState((prev) => { console.log(...); return next })` and `setTablesData((prev) => { console.log(...); return next })` therefore appear twice — only the log duplicates, the actual state mutation happens once. Disappears in production builds. **Cosmetic only.**

---

## 7. Recommended Fix Approach (Path C — Status-based remove)

1. In `frontend/src/api/socket/socketHandlers.js`, replace the event-name-based `shouldRemove` predicate with a pure status-based one.
2. Remove the dependency of "keep-vs-remove" decision on event name. Event name still drives table-change side-effects (the `update-order-target` block at L249-258 is untouched).
3. Mirror the rule already used by the sister handler `handleUpdateOrderStatus` (L393).

---

## 8. Files Modified

| Path | Change | Risk |
|---|---|---|
| `/app/frontend/src/api/socket/socketHandlers.js` (L261–272) | Replaced 2-line predicate with `const shouldRemove = isTerminal;` plus an explanatory 8-line comment block. | Low |

### Diff
```diff
   // Decide: remove or update
-  const isTerminal = (order.status === 'cancelled' || order.status === 'paid');
-  const shouldRemove = isTerminal && (eventName === 'update-order-source' || eventName === 'update-order-paid');
+  // BUG-PREPAID-SETTLE (Apr-2026): order.status is the truth — if the order
+  // is in a terminal state (paid / cancelled), drop it from the dashboard
+  // regardless of which update-order* variant carried the news. Backend
+  // emits a generic `update-order` (with f_order_status=6) on the prepaid
+  // Settle flow (`paid-prepaid-order` endpoint) because `update-order-paid`
+  // is reserved for the unpaid → bill-collected flow. Status-based removal
+  // also future-proofs against any new lifecycle terminator events backend
+  // may add later. Mirrors the rule already used by handleUpdateOrderStatus
+  // at line 393.
+  const isTerminal   = (order.status === 'cancelled' || order.status === 'paid');
+  const shouldRemove = isTerminal;
```

---

## 9. What NOT To Change
- ❌ `OrderContext.jsx` / `TableContext.jsx` — no logic change needed.
- ❌ `useSocketEvents.js` — channel routing untouched.
- ❌ `orderTransform.js` — `f_order_status` → `status` mapping untouched.
- ❌ `OrderCard.jsx` / `TableCard.jsx` Settle handlers.
- ❌ `orderService.js` `completePrepaidOrder`.
- ❌ Backend payload contract.
- ❌ React.StrictMode (`index.js`).

---

## 10. Edge Cases Preserved

- `update-order` (active updates: items added, ready, served) — non-terminal status → falls to `else` branch → `updateOrder()`. Unchanged.
- `update-order-target` (Switch Table → new table) — target side is always active (non-terminal); table-change detection at L249–258 runs first; engage release at L283-286 unaffected.
- `update-order-source` (Switch Table → old table) — was removed before, still removed (now via simplified predicate).
- `update-order-paid` (post-paid bill collection) — was removed before, still removed.
- `update-item-status` (mapped to same handler at registry L627) — never carries terminal `f_order_status`; `isTerminal=false` → updates as before.
- Engage release block (L284-297) — untouched, runs after either branch.
- `syncTableStatus` (L123-132) — untouched; same overrideStatus='available' on remove path; same default `order.tableStatus` on update path.
- `handleUpdateOrderStatus` (L375-421) — already uses status-based removal; this fix makes `handleOrderDataEvent` consistent with it.

---

## 11. QA Checklist

### Before-fix reproduction
1. Place a prepaid order on a dine-in table (Order Entry → Place + Pay).
2. Mark items Ready → Served. Order card shows PAID badge + **Settle** button.
3. Click **Settle**. Network: `POST /paid-prepaid-order` 200 OK.
4. **BUG**: Dashboard still shows the order card with PAID badge on Table 3 alongside an "Available" footer pill.

### After-fix expected result
1. Place a prepaid order on a dine-in table.
2. Mark items Ready → Served. Order card shows PAID badge + **Settle** button.
3. Click **Settle**. Network: 200 OK, toast "Order settled".
4. **Order card disappears from Dashboard immediately**; Table 3 cleanly returns to Available with no ghost.

### Regression checks (must all still pass)
1. **Postpaid Collect Bill** (cash/card/upi) → order removes (relies on `update-order-paid`). ✅
2. **Cancel Order** (any cancellation reason) → order removes. ✅
3. **Switch Table** → source row goes, target row stays. ✅
4. **Add item to existing order** → order stays, items refresh. ✅
5. **Mark Ready / Mark Served** → order stays, status updates. ✅
6. **Aggregator orders (Swiggy/Zomato)** → no impact (status-based remove fires correctly when order ends).
7. **Walk-in / Takeaway / Delivery prepaid Settle** → order disappears (covered by same predicate; tableId=0 short-circuits in `syncTableStatus` so no table-side effect).
8. **Room order prepaid Settle** → order disappears (covered).

---

## 12. Open Questions / Dependencies
- **None.** No backend change needed. No additional product decision needed.
- (Optional follow-up, not part of this fix) The dev-mode-only "double-log" complaint can be quelled by moving `console.log` calls outside the `setState((prev) => {...})` updaters in `OrderContext.jsx:127` and `TableContext.jsx:113`. Cosmetic only — defer until someone requests it.

---

## 13. Implementation Agent Instruction
Already applied in this session. The single-line change at `socketHandlers.js:262-272` is in place and lint-clean. Frontend recompiled with no new warnings. Manual QA per Section 11 is the only remaining step.
