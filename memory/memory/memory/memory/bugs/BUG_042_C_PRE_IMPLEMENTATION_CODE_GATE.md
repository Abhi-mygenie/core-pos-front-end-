# BUG-042-C — Pre-Implementation Code Gate

> **Sprint:** pos_final_1.0
> **Task type:** Pre-Implementation Code Gate
> **Scope:** BUG-042-C only.
> **Locked decision:** `f_order_status === 9` (PayLater / Hold) must be cleared from running OrderContext / running dashboard, the same way statuses 3 (cancelled) and 6 (paid) are cleared today.
> **Status:** Documentation-only — no code changes performed.

---

## 1. Docs Read

### `/app/memory/final/` (baseline rules)
- `IMPLEMENTATION_AGENT_RULES.md` — High-risk areas: `socketHandlers.js` is on the list (line 154). Mandates explicit file-level plan + regression checklist.
- `ARCHITECTURE_DECISIONS_FINAL.md` — Rule API-02 (preserve transform-mediated payload shaping) — N/A for this gate (no payload change). Section "Realtime / socket" rules — no rule forbidding extension of the terminal-status set.
- `MODULE_DECISIONS_FINAL.md` — Order/socket modules guidance. Line 320: "routing event payloads into OrderContext/TableContext" is socket-handler responsibility.
- `CHANGE_REQUEST_PLAYBOOK.md` — Process scaffold (read).
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — No open question on status-9 clearing.
- `FINAL_DOCS_APPROVAL_STATUS.md`, `FINAL_DOCS_SUMMARY.md` — Status snapshots only.

### Audit + bug docs
- `/app/memory/bugs/BUG_042_OWNER_DECISION_AND_PAYLOAD_AUDIT.md` (v3) — Source of truth, Section 5 (BUG-042-C).
- `/app/memory/bugs/BUG_042_B_SMOKE_SIGNOFF.md` — BUG-042-B closed. Confirms no payment-payload change is in scope for BUG-042-C.

### Adjacent docs reviewed for conflict screening
- `BUG_044_STATUS_PULL_AND_NEXT_STEP.md` + `BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md` — BUG-044 is about backend NOT emitting a terminal payload (merge / room checkout). BUG-042-C is about FE NOT clearing status-9 even when backend DOES emit it. Independent; no overlap.
- `QUICK_DEBUG_HANDOVER_prepaid_served_order_persists_on_dashboard.md` — Adjacent surface; related but historical (POS2-005 closure landed in code).
- POS2-005 references inside `constants.js:177-179` + `socketHandlers.js:181-187, 448-458` — confirms current Status-8 Hold/Audit rule that must remain unchanged.

**No baseline conflict found.** No constraint forbids extending the terminal-status set.

---

## 2. Baseline Conflict Check

| Rule | Source | Compatibility with BUG-042-C |
|---|---|---|
| High-risk file — `socketHandlers.js` | `IMPLEMENTATION_AGENT_RULES.md:154` | ⚠️ Requires explicit file-level plan + regression checklist (provided in §4 + §10). |
| API-02 (preserve transform-mediated payload shaping) | `ARCHITECTURE_DECISIONS_FINAL.md:113` | ✅ COMPATIBLE — no payload shape change. |
| Module 4 future-change rules (impact identification) | `MODULE_DECISIONS_FINAL.md:205` | ✅ COMPATIBLE — change identified to socket / OrderContext only. |
| POS2-005 Status-8 rule (line 177–179, `constants.js`) | `STATUS_COLUMNS` | ✅ Status-8 behaviour explicitly preserved. |
| Owner directive — do not change Status-7 (Yet-to-Confirm) | Gate task | ✅ Honoured — predicate adds Status-9 only. |
| Owner directive — do not force-clear by table id | Gate task | ✅ Honoured — clear is triggered only by genuine backend payload with `f_order_status === 9`. |
| Owner directive — do not change initial-load API filtering | Gate task | ✅ Honoured — `orderService.getRunningOrders` / `fromAPI.orderList` untouched (backend never returns Status-9 on running endpoint). |
| Owner directive — no payment-payload changes | Gate task | ✅ Honoured — BUG-042-B is closed; BUG-042-C touches socket handlers only. |
| Owner directive — Hold rail UI is separate | Gate task | ✅ Honoured — BUG-042-A is out of scope. |
| Owner directive — Room / To Room | Gate task | See §3.5 (Room is on a separate builder/endpoint; status-9 path is not used by Room). |

**Verdict:** No baseline conflict. No change to `/app/memory/final/`. No change to `BUG_TEMPLATE.md`.

---

## 3. Current Status-Removal Logic

### 3.1 Status-key derivation chain
- `frontend/src/api/transforms/orderTransform.js:188` — `status: mapOrderStatus(api.f_order_status)`.
- `frontend/src/api/constants.js:133` — `F_ORDER_STATUS` map:
  ```
  1: 'preparing'        → non-terminal
  2: 'ready'            → non-terminal
  3: 'cancelled'        → TERMINAL (current)
  5: 'served'           → non-terminal
  6: 'paid'             → TERMINAL (current)
  7: 'pending'          → non-terminal (Yet-to-Confirm — MUST STAY non-terminal)
  8: 'running'          → non-terminal; defensively SKIPPED on insertion (POS2-005)
  9: 'pendingPayment'   → non-terminal CURRENT → must become TERMINAL (NEW)
  10: 'reserved'        → non-terminal
  ```

### 3.2 Exact socket-handler sites that remove on status 3 / 6

Two inline predicates govern terminal removal across all order-data events. **There is NO shared constant**; each predicate is hard-coded at its call site.

| File | Line | Predicate (current) | Handler | Events serviced |
|---|---|---|---|---|
| `frontend/src/api/socket/socketHandlers.js` | **278** | `const isTerminal = (order.status === 'cancelled' \|\| order.status === 'paid');` | `handleOrderDataEvent` | `update-order`, `update-order-target`, `update-order-source`, `update-order-paid`, `update-item-status` (per handler registry L656–659) |
| `frontend/src/api/socket/socketHandlers.js` | **409** | `if (order.status === 'cancelled' \|\| order.status === 'paid') { ... removeOrder(orderId); }` | `handleUpdateOrderStatus` | `update-order-status` (L661) |

Both branches call:
- `removeOrder(orderId)` (from `OrderContext`, defined at `OrderContext.jsx:139`).
- `syncTableStatus(order, updateTableStatus, 'available')` (override → table becomes `'available'`).

### 3.3 Defensive-insertion sites for Status-8 (must remain unchanged; pattern to mirror for Status-9)

| File | Line | Current guard | Handler |
|---|---|---|---|
| `socketHandlers.js` | **184–187** | `if (transformedOrder.fOrderStatus === 8) { log(...); continue; }` | `handleNewOrder` |
| `socketHandlers.js` | **455–458** | `if (order.fOrderStatus === 8) { log(...); return; }` | `handleScanNewOrder` |

### 3.4 Initial-load surface (owner-confirmed: DO NOT TOUCH)
`orderService.getRunningOrders` (`orderService.js:13–18`) → `fromAPI.orderList`. Owner directive: backend `/get-running-order` does **not** return `f_order_status === 9`. **No FE filter needed.** ✅ Untouched by this gate.

### 3.5 Room / To Room — confirmed unaffected
- `transferToRoom` (in `orderTransform.js:1293`) hits `/order-shifted-room` (separate endpoint).
- Source-order terminal transition after Transfer-to-Room emits **`f_order_status === 6`** (paid) — already in the current terminal set. No status-9 path involvement.
- BUG-044 (room checkout / merge) is a separate concern (backend payload omission) — independent of BUG-042-C.
- **Conclusion:** Room flow does not use the status-9 path. No code change required for Room under BUG-042-C.

### 3.6 Table auto-free side effect (clarification baked into proposal)
Today: every removal path calls `syncTableStatus(order, updateTableStatus, 'available')` → table flipped to `'available'`.

For status-9 specifically, `ORDER_TO_TABLE_STATUS` map (`constants.js:188`) sets `pendingPayment: 'occupied'` — i.e. the table convention is that a PayLater/Hold order's table is **occupied**, not free. Owner directive: **do not force-clear by table id.**

→ **For the status-9 branch, DO NOT pass the `'available'` override.** Let `syncTableStatus(order, updateTableStatus)` derive the table status from the order's own `tableStatus` field (which will resolve to `'occupied'` via the `ORDER_TO_TABLE_STATUS` map). This decouples context-removal from table-availability, matching owner's "no force-clear by table id" directive.

---

## 4. Where Status 9 Should Be Added

### 4.1 Primary removal predicates (extend)

| File:Line | Action | Result |
|---|---|---|
| `socketHandlers.js:278` | Extend predicate `isTerminal` to include `\|\| order.fOrderStatus === 9` (or string equivalent `\|\| order.status === 'pendingPayment'`). Inside the `shouldRemove` branch, special-case the `syncTableStatus` call so status-9 does NOT pass `'available'` override (let it derive from `order.tableStatus`). | Status-9 payload via `update-order` / `update-order-target` / `update-order-source` / `update-order-paid` / `update-item-status` triggers `removeOrder`; table state stays `'occupied'`. |
| `socketHandlers.js:409` | Same extension on `handleUpdateOrderStatus`. Same `syncTableStatus` special-case. | Status-9 payload via `update-order-status` triggers `removeOrder`; table state stays `'occupied'`. |

### 4.2 Defensive-insertion guards (mirror existing Status-8 skip)

| File:Line | Action | Result |
|---|---|---|
| `socketHandlers.js:184–187` (`handleNewOrder`) | Extend the existing Status-8 skip to also skip `fOrderStatus === 9`. | A freshly-arrived `new-order` socket carrying `f_order_status=9` is never inserted into running OrderContext. |
| `socketHandlers.js:455–458` (`handleScanNewOrder`) | Extend the existing Status-8 skip to also skip `fOrderStatus === 9`. | Same skip behaviour for QR `scan-new-order` channel. |

### 4.3 File-Level Change Plan (per IMPLEMENTATION_AGENT_RULES.md §65)

- **File:** `/app/frontend/src/api/socket/socketHandlers.js`
- **Why this file is affected:** Sole owner of socket-event-to-OrderContext routing. Contains the two inline terminal predicates (L278, L409) plus the two insertion guards (L184–187, L455–458) that govern dashboard-running visibility.
- **Intended change:** Four small in-place edits — extend each existing comparison/predicate to include status-9 alongside existing checks. Special-case `syncTableStatus` for the status-9 removal branch (omit `'available'` override).
- **Risk level for this file:** Low-to-Medium (high-risk file by classification; change is additive — adds one condition to existing predicates without altering existing behaviour for any other status).
- **Downstream files to verify after change:**
  - `frontend/src/contexts/OrderContext.jsx` (`removeOrder` consumer) — no change; just consumer.
  - `frontend/src/contexts/TableContext.jsx` (`updateTableStatus`) — no change; consumer.
  - `frontend/src/pages/DashboardPage.jsx` (dashboard rendering) — observed effect: status-9 orders disappear from running grid.
  - `frontend/src/components/reports/*` (Audit Report Hold tab) — must continue to show status-9 orders via independent `/paid-paylater-order-list` data source (no shared state with OrderContext).

---

## 5. Pseudo-Diff (only)

### 5.1 `socketHandlers.js:184–187` — `handleNewOrder` insertion guard

```diff
   for (const apiOrder of orders) {
     try {
       const transformedOrder = orderFromAPI.order(apiOrder);
-      // POS2-005: skip status-8 orders (defensive, same rationale as
-      // handleScanNewOrder). Status-8 belongs on the Audit Hold tab, not
-      // the running dashboard.
-      if (transformedOrder.fOrderStatus === 8) {
-        log('INFO', `new-order: skipping order ${transformedOrder.orderId} (f_order_status=8 → Hold)`);
+      // POS2-005 / BUG-042-C: skip status-8 (running/Hold-classified) and
+      // status-9 (PayLater/Hold) orders defensively. Both belong on the
+      // Audit Hold tab only, not the running dashboard. Same rationale as
+      // handleScanNewOrder.
+      if (transformedOrder.fOrderStatus === 8 || transformedOrder.fOrderStatus === 9) {
+        log('INFO', `new-order: skipping order ${transformedOrder.orderId} (f_order_status=${transformedOrder.fOrderStatus} → Hold)`);
         continue;
       }
       addOrder(transformedOrder);
```

### 5.2 `socketHandlers.js:268–289` — `handleOrderDataEvent` terminal predicate + table-status special-case

```diff
   // Decide: remove or update
-  // BUG-PREPAID-SETTLE (Apr-2026): order.status is the truth — if the order
-  // is in a terminal state (paid / cancelled), drop it from the dashboard
-  // regardless of which update-order* variant carried the news. (...comment continues)
-  const isTerminal   = (order.status === 'cancelled' || order.status === 'paid');
-  const shouldRemove = isTerminal;
+  // BUG-PREPAID-SETTLE (Apr-2026): order.status is the truth — if the order
+  // is in a terminal state (paid / cancelled), drop it from the dashboard
+  // regardless of which update-order* variant carried the news.
+  // BUG-042-C (Feb-2026): also drop status-9 (PayLater/Hold) — surfaces in
+  // Audit Hold tab only, never on running dashboard. Table stays 'occupied'
+  // for status-9 (no force-clear by table id) — see syncTableStatus call
+  // below.
+  const isTerminal   = (order.status === 'cancelled' || order.status === 'paid');
+  const isHoldClear  = (order.fOrderStatus === 9);
+  const shouldRemove = isTerminal || isHoldClear;
 
   if (shouldRemove) {
-    syncTableStatus(order, updateTableStatus, 'available');
+    // Status-3/6 free the table; status-9 keeps the table as the order
+    // reports (ORDER_TO_TABLE_STATUS maps pendingPayment → 'occupied').
+    if (isHoldClear) {
+      syncTableStatus(order, updateTableStatus);
+    } else {
+      syncTableStatus(order, updateTableStatus, 'available');
+    }
     removeOrder(orderId);
-    log('INFO', `${eventName}: Order ${orderId} is ${order.status}, removed`);
+    log('INFO', `${eventName}: Order ${orderId} is ${order.status} (fOrderStatus=${order.fOrderStatus}), removed`);
   } else {
```

### 5.3 `socketHandlers.js:408–417` — `handleUpdateOrderStatus` terminal predicate + table-status special-case

```diff
   // Decide: remove or update
-  if (order.status === 'cancelled' || order.status === 'paid') {
-    log('INFO', `update-order-status: Order ${orderId} is ${order.status}, removing`);
-    syncTableStatus(order, updateTableStatus, 'available');
+  const isTerminalStatus = (order.status === 'cancelled' || order.status === 'paid');
+  const isHoldClear      = (order.fOrderStatus === 9);
+  if (isTerminalStatus || isHoldClear) {
+    log('INFO', `update-order-status: Order ${orderId} is ${order.status} (fOrderStatus=${order.fOrderStatus}), removing`);
+    // Status-3/6 free the table; status-9 keeps it 'occupied' (see ORDER_TO_TABLE_STATUS).
+    if (isHoldClear) {
+      syncTableStatus(order, updateTableStatus);
+    } else {
+      syncTableStatus(order, updateTableStatus, 'available');
+    }
     removeOrder(orderId);
   } else {
     updateOrder(order.orderId, order);
     syncTableStatus(order, updateTableStatus);
     log('INFO', `update-order-status: Updated order ${orderId} (status: ${order.status})`);
   }
```

### 5.4 `socketHandlers.js:455–458` — `handleScanNewOrder` insertion guard

```diff
   const order = await fetchOrderWithRetry(orderId);
   if (order) {
-    // POS2-005: status-8 orders belong on the Audit Hold tab, not the running
-    // dashboard. Skip insertion (...)
-    if (order.fOrderStatus === 8) {
-      log('INFO', `scan-new-order: skipping order ${orderId} (f_order_status=8 → Hold)`);
+    // POS2-005 / BUG-042-C: status-8 (running/Hold-classified) and status-9
+    // (PayLater/Hold) orders belong on the Audit Hold tab only. Skip
+    // insertion into running OrderContext. (See handleNewOrder for the
+    // mirror guard.)
+    if (order.fOrderStatus === 8 || order.fOrderStatus === 9) {
+      log('INFO', `scan-new-order: skipping order ${orderId} (f_order_status=${order.fOrderStatus} → Hold)`);
       return;
     }
```

### 5.5 Optional micro-refactor (RAISED, NOT REQUIRED)

The two terminal predicates at L278 and L409 are duplicated string comparisons. A `const TERMINAL_ORDER_STATUSES = ['cancelled', 'paid']` (and a parallel `HOLD_REMOVAL_STATUSES = [9]`) constant in `constants.js`, consumed by both handlers, would prevent future drift. **Raised for code-review consideration only.** Not in this gate's locked scope — owner can approve or defer at code-review time.

---

## 6. Current vs Proposed Behaviour (table)

| Backend emits | Current FE | Proposed FE | Table state after |
|---|---|---|---|
| `f_order_status = 3` (cancelled) via any update-order* | Remove + free table | **Unchanged** — Remove + free table | `'available'` |
| `f_order_status = 6` (paid) via any update-order* | Remove + free table | **Unchanged** — Remove + free table | `'available'` |
| `f_order_status = 7` (Yet-to-Confirm) via update-order* | Update in place | **Unchanged** — Update in place | derived (typically `'yetToConfirm'`) |
| `f_order_status = 8` (running/Hold-class.) via `new-order`/`scan-new-order` | Skip insertion (POS2-005) | **Unchanged** — Skip insertion | (no FE entry) |
| `f_order_status = 8` via update-order* (existing order transitions to 8) | Update in place | **Unchanged** — Update in place | derived |
| `f_order_status = 9` (PayLater/Hold) via update-order* | Update in place (BUG) | **Remove + keep table `'occupied'`** | `'occupied'` |
| `f_order_status = 9` via `new-order`/`scan-new-order` | Insert into running context (BUG) | **Skip insertion** | (no FE entry) |
| `f_order_status = 10` (reserved) | Update in place | **Unchanged** — Update in place | derived (`'reserved'`) |

---

## 7. What Will NOT Change

### 7.1 Inside `socketHandlers.js`
- ✋ `handleNewOrder` flow other than the insertion-guard predicate.
- ✋ `handleScanNewOrder` flow other than the insertion-guard predicate.
- ✋ `handleOrderDataEvent` flow other than the `shouldRemove` predicate + table-status conditional.
- ✋ `handleUpdateOrderStatus` flow other than the terminal predicate + table-status conditional.
- ✋ `handleUpdateFoodStatus`, `handleDeliveryAssignOrder`, `handleSplitOrder`, `handleOrderEngage`, `handleUpdateTable` — all UNCHANGED.
- ✋ Handler registry at L652–670 — UNCHANGED.
- ✋ `syncTableStatus` helper (L123–132) — UNCHANGED.

### 7.2 Outside `socketHandlers.js`
- ✋ `OrderContext.jsx` (`removeOrder`, `updateOrder`, `addOrder`, etc.) — UNCHANGED.
- ✋ `TableContext.jsx` (`updateTableStatus`) — UNCHANGED.
- ✋ `orderTransform.js` — UNCHANGED. No payload changes (BUG-042-B already closed; BUG-042-A separate gate).
- ✋ `constants.js` — `F_ORDER_STATUS`, `STATUS_COLUMNS`, `ORDER_TO_TABLE_STATUS` UNCHANGED. (Optional shared constants in §5.5 deferred.)
- ✋ `orderService.getRunningOrders` / `fromAPI.orderList` — UNCHANGED (owner-confirmed backend never returns status-9 from running endpoint).
- ✋ Audit Report Hold tab (`reportService.getHoldOrders` → `reportTransform.holdOrder`) — UNCHANGED. Independent data source; status-9 orders continue to appear in Audit Hold tab after running-context removal.
- ✋ `transferToRoom` builder, `/order-shifted-room` endpoint, Room flow — UNCHANGED.
- ✋ Print payloads (`buildBillPrintPayload`, `/order-temp-store`) — UNCHANGED.
- ✋ LocalStorage keys, bootstrap flow (`LoadingPage.jsx`), permission gates — UNCHANGED.

### 7.3 Other BUG-042 sub-buckets
- ✋ BUG-042-A (Hold rail cleanup + row-level Collect disable) — out of scope for this gate.
- ✋ BUG-042-B (`grant_amount` payload rename) — already closed.

### 7.4 Documentation
- ✋ `/app/memory/final/` — read-only.
- ✋ `/app/memory/BUG_TEMPLATE.md` — read-only.

---

## 8. Tests Needed

### 8.1 Unit / handler-level tests (add to `__tests__/api/socket/`)

| # | Test | Expected behaviour |
|---|---|---|
| U-1 | `handleUpdateOrderStatus` receives v2 payload with `f_order_status === 9` | `removeOrder(orderId)` called once. `syncTableStatus(order, updateTableStatus)` called WITHOUT the `'available'` override (i.e. table state derived from `order.tableStatus`, not forced). |
| U-2 | `handleUpdateOrderStatus` receives `f_order_status === 3` | **REGRESSION:** `removeOrder` called; `syncTableStatus` called WITH `'available'` override. |
| U-3 | `handleUpdateOrderStatus` receives `f_order_status === 6` | **REGRESSION:** Same as U-2. |
| U-4 | `handleUpdateOrderStatus` receives `f_order_status === 7` (Yet-to-Confirm) | **CRITICAL GUARD:** `updateOrder` called (NOT `removeOrder`). Order stays in OrderContext. |
| U-5 | `handleUpdateOrderStatus` receives `f_order_status === 5` (served) | **REGRESSION:** `updateOrder` called (NOT `removeOrder`). |
| U-6 | `handleOrderDataEvent` with `update-order-paid` event + `f_order_status === 9` | `removeOrder` called; table NOT forced to `'available'`. |
| U-7 | `handleOrderDataEvent` with `update-order` event + `f_order_status === 9` | Same as U-6. |
| U-8 | `handleOrderDataEvent` with `update-order-source` event + `f_order_status === 9` | Same as U-6. |
| U-9 | `handleOrderDataEvent` with `update-order-target` event + `f_order_status === 9` (table change) | `removeOrder` called; old table freed (`'available'`) per existing switch-table logic; new table NOT forced (status-9 special-case applies to syncTableStatus on the new order). |
| U-10 | `handleNewOrder` receives `f_order_status === 9` | `addOrder` NOT called; log entry recorded. |
| U-11 | `handleNewOrder` receives `f_order_status === 8` | **REGRESSION:** `addOrder` NOT called (POS2-005 preserved). |
| U-12 | `handleNewOrder` receives `f_order_status === 1` (preparing) | **REGRESSION:** `addOrder` called normally. |
| U-13 | `handleScanNewOrder` receives `f_order_status === 9` | `addOrder` NOT called. |
| U-14 | `handleScanNewOrder` receives `f_order_status === 8` | **REGRESSION:** `addOrder` NOT called. |
| U-15 | `handleScanNewOrder` receives `f_order_status === 1` | **REGRESSION:** `addOrder` called normally (with web-origin enrichment intact). |

Existing test scaffolding at `/app/frontend/src/__tests__/api/socket/updateOrderStatus.test.js` provides the v2 message-shape helper (`createV2Message`) — extend in place.

### 8.2 Initial-load test (assertion that nothing changed)

| # | Test | Expected |
|---|---|---|
| L-1 | `getRunningOrders` returns API rows verbatim (no client-side filter for status-9) | **REGRESSION:** `fromAPI.orderList` passes through all returned rows; agent does NOT introduce a filter. Verify by inspecting `orderService.js` diff. |

(Owner-confirmed backend never returns status-9 here, so this is a "do-no-harm" assertion, not a functional test.)

### 8.3 Manual / preprod functional tests

| # | Scenario | Expected |
|---|---|---|
| F-1 | Backend emits `update-order-status` with `f_order_status === 9` on a running dine-in order | Dashboard tile/card for that order disappears within 1 frame. Table tile remains `'occupied'`. Audit → Hold tab still shows the order. |
| F-2 | Backend emits `update-order-status` with `f_order_status === 7` (Yet-to-Confirm) | Dashboard tile **stays**. **CRITICAL GUARD.** |
| F-3 | Backend emits `update-order-status` with `f_order_status === 8` | Behaviour unchanged from POS2-005. |
| F-4 | Backend emits `update-order-status` with `f_order_status === 3` (cancelled) | Dashboard tile disappears; table flips to `'available'`. **REGRESSION ANCHOR.** |
| F-5 | Backend emits `update-order-status` with `f_order_status === 6` (paid) | Dashboard tile disappears; table flips to `'available'`. **REGRESSION ANCHOR.** |
| F-6 | `new-order` socket arrives with `f_order_status === 9` (fresh PayLater order from web/QR) | Order does NOT appear on dashboard. Audit → Hold tab does show it (independent path). |
| F-7 | `scan-new-order` socket arrives with `f_order_status === 9` | Same as F-6. |
| F-8 | Status-9 order later flipped to status 6 (paid) via backend | Either: (a) `update-order-paid` socket arrives — since order is not in running context, FE log-only no-op (no crash, no warning). OR (b) Backend re-emits `new-order` for the now-paid order — current FE behaviour would re-add it; but since status 6 is terminal, it would be removed on the next status update. Both acceptable per owner directive. |
| F-9 | Refresh dashboard while a status-9 order exists in backend | Owner-confirmed: `/get-running-order` does NOT return status-9. Dashboard renders without it. No FE filtering exercised. |
| F-10 | Transfer-to-Room flow on a running order | Source order transitions to status-6 (paid) → existing terminal-clear fires. **REGRESSION ANCHOR (Room unaffected).** |
| F-11 | Auto-print bill after Collect Bill | Unchanged. **REGRESSION ANCHOR.** |

### 8.4 Static / lint assertions

- `yarn lint` clean on `socketHandlers.js`.
- `grep "fOrderStatus === 9" socketHandlers.js` returns **exactly 4 lines** post-change (one per touched site).
- `grep "fOrderStatus === 8" socketHandlers.js` still returns **exactly 2 lines** (insertion guards). No accidental edit of existing Status-8 logic.

### 8.5 Test surface inventory
- **Existing test scaffolding to extend:** `/app/frontend/src/__tests__/api/socket/updateOrderStatus.test.js` (210 lines; uses `createV2Message`).
- **New test scaffolding to add (recommended):** A parallel test file (or extension) for `handleOrderDataEvent` and the two insertion guards (`handleNewOrder`, `handleScanNewOrder`) covering status-9 cases.

---

## 9. Risk Analysis

### 9.1 Regression risk on existing terminal-status paths (3 / 6)

| Risk dimension | Assessment |
|---|---|
| **Probability** | Very Low |
| **Reason** | Predicates are **additive** — `isTerminal` keeps its current OR-list intact; `isHoldClear` is a new disjoint condition. Existing paths cannot deviate unless status-9 string somehow leaks through; defensive `fOrderStatus === 9` (numeric) is precise. |
| **Mitigation** | U-2 / U-3 / U-5 unit tests + F-4 / F-5 preprod regression. |

### 9.2 Regression risk on Status-7 (Yet-to-Confirm)

| Risk dimension | Assessment |
|---|---|
| **Probability** | Very Low |
| **Reason** | No predicate touches Status-7. The new condition is `=== 9` only. |
| **Mitigation** | U-4 unit test + F-2 preprod regression (CRITICAL GUARD). |

### 9.3 Regression risk on Status-8 (POS2-005)

| Risk dimension | Assessment |
|---|---|
| **Probability** | Very Low |
| **Reason** | Insertion guards EXTEND the existing Status-8 check; the Status-8 branch is preserved verbatim and OR-extended. No update-order* handler currently special-cases Status-8 → unchanged. |
| **Mitigation** | U-11 / U-14 unit tests + F-3 preprod regression. |

### 9.4 Risk on table-status semantics

| Risk dimension | Assessment |
|---|---|
| **Probability** | Low |
| **Reason** | Special-case `syncTableStatus` for status-9 is the explicit owner-aligned design (no force-clear by table id). Derives from `order.tableStatus`, which is computed from `mapTableStatus(fOrderStatus)` (`orderTransform.js:57–60`) → `ORDER_TO_TABLE_STATUS[mapOrderStatus(9)]` → `ORDER_TO_TABLE_STATUS['pendingPayment']` → `'occupied'`. Stable, well-tested chain. |
| **Mitigation** | F-1 preprod confirms table stays `'occupied'` after status-9 removal. |

### 9.5 Risk on Audit Report Hold tab

| Risk dimension | Assessment |
|---|---|
| **Probability** | ZERO |
| **Reason** | Audit Hold tab uses `reportService.getHoldOrders` → `REPORT_HOLD_ORDERS` endpoint → `reportTransform.holdOrder`. Independent data source; no shared state with `OrderContext`. Confirmed by file inspection at audit v3 §5.5. |
| **Mitigation** | F-1 / F-6 / F-7 verify status-9 orders continue to appear on Audit Hold tab. |

### 9.6 Risk on Room / To Room / Print / LocalStorage / Bootstrap

| Risk dimension | Assessment |
|---|---|
| **Probability** | ZERO |
| **Reason** | None of these surfaces use the status-9 path. Room transitions through status 6. Print payload, LocalStorage keys, and bootstrap are entirely orthogonal. |
| **Mitigation** | F-10 / F-11 preprod regression. |

### 9.7 Overall regression risk
**LOW.** Additive predicate extension on a well-defined high-risk file. Comprehensive unit test coverage plus preprod functional matrix. Single rollback site per touched location.

---

## 10. Rollback Procedure

Per touched location, revert the OR-extension to its pre-change form (4 sites total). No DB / config / cache / supervisor dependency. Hot reload picks up the revert immediately.

Optionally also revert the corresponding test file additions if they were committed alongside.

---

## 11. Owner Approval Gate

### Approval Gate (per IMPLEMENTATION_AGENT_RULES.md §46)
- **Request Summary:** Add `f_order_status === 9` (PayLater / Hold) to the running-OrderContext terminal-removal logic, alongside existing statuses 3 (cancelled) and 6 (paid). Mirror the existing Status-8 insertion-guard pattern so freshly-arrived status-9 orders never land on the running dashboard. Keep the table marked `'occupied'` on status-9 removal (do not force-clear by table id).
- **Change Type:** Additive predicate extension on socket-handler routing logic. No payload change. No API/endpoint change. No constants change.
- **Affected Module(s):** Socket / OrderContext routing (Module 4 socket-routing surface per `MODULE_DECISIONS_FINAL.md:320`).
- **Primary Files to Change:** `/app/frontend/src/api/socket/socketHandlers.js` (4 in-place edits across L184–187, L268–289, L408–417, L455–458). Optional test extension at `/app/frontend/src/__tests__/api/socket/updateOrderStatus.test.js` + new test file for `handleOrderDataEvent` + insertion guards.
- **Related APIs:** None changed. Socket events: `update-order`, `update-order-target`, `update-order-source`, `update-order-paid`, `update-item-status`, `update-order-status`, `new-order`, `scan-new-order`. All event names and payload contracts UNCHANGED.
- **State Impact:** `OrderContext.orders` will exclude `fOrderStatus === 9` rows. `TableContext` retains current behaviour for status-9 (table stays `'occupied'`).
- **UI Impact:** Status-9 orders no longer render on running dashboard. They continue to render on Audit → Hold tab via independent data source.
- **Regression Risks:** LOW. Additive predicate change. Critical guard for Status-7 covered by unit + functional tests.
- **Open Decision Dependencies:** None. All owner clarifications captured in audit v3 §1.2 + this gate.
- **Safe to Implement Without Owner Clarification?** YES — pending this gate's approval signal.

### Confirmation: gate produces no code changes
- ❌ No code modified.
- ❌ No files created outside this gate doc.
- ❌ `/app/memory/final/` untouched.
- ❌ `BUG_TEMPLATE.md` untouched.
- ✅ This gate doc created at `/app/memory/bugs/BUG_042_C_PRE_IMPLEMENTATION_CODE_GATE.md`.

---

## Final Verdict

**`ready_for_owner_code_gate_review`** ✅

All preconditions met:
- All four socket-handler sites identified with file + line precision.
- Pseudo-diff drafted; risk analysis covers Status-3 / 6 / 7 / 8 / 9 / 10 / Room / Print / Audit Hold tab.
- Baseline rules (high-risk-file protocol, Module 4, POS2-005 Status-8 preservation) honoured.
- Owner directives honoured: no payment payload changes, no Hold rail UI, no Room/ToRoom changes, no initial-load FE filter, no force-clear by table id.
- Comprehensive 15-case unit-test matrix + 11-case preprod functional matrix specified.
- Rollback procedure trivial.

Awaiting owner approval to proceed to implementation.

---

*End of BUG-042-C Pre-Implementation Code Gate.*
