# POS2-005 — CR Impact Analysis & Planning: f_order_status = 8 Hold/Audit Reroute

> **Sprint:** pos2.0
> **CR ID:** POS2-005
> **Type:** CR Impact Analysis + Implementation Planning Readiness (read-only — no code changed, no `/app/memory/final/*` edited)
> **Date:** 2026-05-08
> **Branch:** `9-may` (cloned to `/app` 2026-05-08)
> **Predecessor:** POS2-004 investigation + addendum, verdict `new_CR_required_ready_for_planning`
> **Final verdict:** **`needs_backend_confirmation`** (one BE-ask remains; FE plan is complete and safe to implement after BE answer + owner sign-off on the OQ list in §16.)

---

## 1. Executive summary

POS2-005 implements the locked owner rule: `f_order_status = 8` orders must (a) be excluded from the running dashboard, (b) routed to the Hold/Audit area with a HOLD label, and (c) suppress the green PAID badge even when `paymentType === 'prepaid'`. The change is contained, FE-only for the dashboard/PAID/HOLD-label parts, and **does not require any new backend endpoints** for the Audit-side Hold inclusion (the existing `/order-logs-report` payload already carries status-8 rows; only the client-side TAB_FILTERS predicate plus the priority-chain mapping need to change).

**Two surfaces require precise scoping decisions before code edits:**

1. **Defence-in-depth for socket entry:** The confirmed entry path is `scan-new-order` → `handleScanNewOrder` → `addOrder(...)` (unconditional). Defensively, `handleNewOrder` (which also calls `addOrder` on embedded payload) must receive the same guard. `handleOrderDataEvent` (covers `update-order`, `update-order-target`, `update-order-source`, `update-order-paid`) does **not** introduce status-8 from a fresh state; only patches existing entries — so the guard belongs at `addOrder` call sites of insertion handlers (scan-new-order + new-order), not on update events.

2. **CR-003 OQ-C2 mark-unpaid round-trip:** CR-003 documents that flipping a paid order via Mark-Unpaid causes it to **re-surface as a running order on the dashboard** (backend emits a socket event, FE relies on it). If backend currently uses `f_order_status = 8` for the post-flip state, POS2-005 directly affects this round-trip — the order will land in Hold instead of Running. **This must be confirmed with BE** (single OQ — see §12 + §16) before the implementation freeze.

**FE plan is complete and ready.** Once BE confirms (a) the post-flip status code emitted by Mark-Unpaid (`make-order-unpaid`) and (b) the intentionality of `scan-new-order` carrying status-8 (defensive question — answer affects backlog only), the CR can move to requirement-freeze.

**Verdict:** `needs_backend_confirmation` (with the smaller fallback `ready_for_requirement_freeze` if BE answers immediately or the team accepts the documented assumption that status-8 continues to mean "Active/Unpaid Running" semantically and Mark-Unpaid uses a different status code).

---

## 2. Docs read

### 2.1 `/app/memory/final/`
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `ARCHITECTURE_DECISIONS_FINAL.md`
- `MODULE_DECISIONS_FINAL.md` (Modules 4 status machinery, 10 Reports/Audit/Summary, dashboard module)
- `CHANGE_REQUEST_PLAYBOOK.md`
- `IMPLEMENTATION_AGENT_RULES.md`
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `FINAL_DOCS_SUMMARY.md`

Greps run on `/app/memory/final/`:
```
grep -niE "f_order_status|fOrderStatus|status.*8|Hold|paylater|prepaid|paid tag|paid label|scan-new-order|update-order-paid"
```
Result: no rule placing status-8 in Hold/Audit; no card-level HOLD label; no scan-new-order branch. Final docs are silent on the new POS2-005 contract — they will need a future revision (governed by `CHANGE_REQUEST_PLAYBOOK.md`) AFTER implementation + QA + owner sign-off.

### 2.2 Overlay docs (current accepted)
- `change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `change_requests/PENDING_TASK_REGISTER_2026_05_04.md`
- `change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `change_requests/LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`
- `change_requests/SESSION_HANDOVER_2026_05_04_HYGIENE_AND_PHASE3.md`

No overlay row asserts a status-8 → Hold rule; no overlay backlog item conflicts with the new owner rule.

### 2.3 CR-specific
- **`change_requests/impact_analysis/POS2_004_F_STATUS_8_HOLD_PAID_DASHBOARD_INVESTIGATION_2026_05_08.md`** + addendum (§16 — owner correction + locked rule)
- `change_requests/impact_analysis/F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md` (2026-05-07)
- `change_requests/qa_reports/POS2_004_F_ORDER_STATUS_8_VALIDATION_REPORT_2026_05_08.md` (2026-05-08, earlier)
- `change_requests/CR_001_all_orders_status_derivation.md`
- `change_requests/implementation_summaries/CR_001_IMPLEMENTATION_SUMMARY.md` (line 43 — running set widening)
- `change_requests/qa_reports/CR_001_QA_REPORT.md` (lines 64-66, 99-103 — Hold/Running tab contracts)
- `change_requests/CR_003_paid_hold_order_actions.md` (lines 199-200 — OQ-C2 mark-unpaid round-trip)
- `change_requests/CR_007_ORDERID_VISIBILITY_AND_PRINT_BILL_IN_ORDER_ENTRY.md`
- `change_requests/qa_reports/CR_007_A2_QA_REPORT.md` (BUG-PREPAID-MERGE-SHIFT defence in depth)
- `change_requests/CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md` (sanity check — no status-8 dependency)
- `change_requests/CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md`
- `change_requests/CR_QA_CONSOLIDATION_AND_CLASH_MATRIX_2026_05_03.md`
- `change_requests/qa_handover/CR_001_QA_HANDOVER.md`
- `current-state/API_USAGE_MAP.md`, `current-state/MODULE_MAP.md`

### 2.4 Code (read-only — verified contracts cited in §4 and §7-§11)
- `frontend/src/api/constants.js` (F_ORDER_STATUS, F_ORDER_STATUS_API, STATUS_COLUMNS, ORDER_TO_TABLE_STATUS, REPORT_HOLD_ORDERS, SINGLE_ORDER_NEW)
- `frontend/src/api/transforms/orderTransform.js` (mapOrderStatus, mapTableStatus, fromAPI.order, fromAPI.orderList)
- `frontend/src/api/transforms/reportTransform.js`
- `frontend/src/api/services/orderService.js` (getRunningOrders, fetchSingleOrderForSocket, completePrepaidOrder)
- `frontend/src/api/services/reportService.js` (full file: priority chain at 660-714, getHoldOrders at 185, getAllOrders at 1074, getOrderLogsReport at 528, getOrdersByTab at 486, ISSUE-001 note at 180)
- `frontend/src/api/socket/socketHandlers.js` (handleNewOrder 146, handleOrderDataEvent 221, handleUpdateFoodStatus 317, handleUpdateOrderStatus 375, handleScanNewOrder 428, handleDeliveryAssignOrder 454, handleOrderEngage 526, handleSplitOrder 569)
- `frontend/src/api/socket/useSocketEvents.js`
- `frontend/src/api/socket/socketEvents.js`
- `frontend/src/contexts/OrderContext.jsx` (addOrder, updateOrder, removeOrder, derived selectors at 161-185)
- `frontend/src/pages/DashboardPage.jsx` (channel view 714-771, status view 859-883)
- `frontend/src/pages/StatusConfigPage.jsx` (DEFAULT_ENABLED, ALL_STATUSES)
- `frontend/src/pages/AllOrdersReportPage.jsx` (TAB_FILTERS lines 63-113; data source 528 → `getOrderLogsReport`)
- `frontend/src/components/cards/OrderCard.jsx` (lines 328-331 — PAID badge)
- `frontend/src/components/cards/TableCard.jsx` (lines 244-245 — PAID badge)
- `frontend/src/components/layout/Header.jsx` (Running pill row)
- `frontend/src/utils/statusHelpers.js`

---

## 3. Baseline / overlay conflict summary

| Source | Asserts (current/baseline) | Conflict with locked POS2-005 rule? | Resolution |
|---|---|---|---|
| `final/MODULE_DECISIONS_FINAL.md` (Module 4 status machinery, §70/§90/§443/§553) | Lists "running orders" as a concern of dashboard module. Silent on the specific 8-key. | **No direct conflict** — silent. | Future revision required AFTER acceptance to record Hold = `{9, 8, paylater}`. Out of scope for this CR. |
| `final/CHANGE_REQUEST_PLAYBOOK.md` | Requires new CR with impact analysis, owner sign-off, and post-implementation final-doc revision. | **No conflict** — POS2-005 follows the playbook. | This document **is** the impact analysis. |
| `change_requests/CR_001_all_orders_status_derivation.md:232` | "Paylater is tied to `f_order_status === 9`. Confirmed and verified in code." | **No conflict** with POS2-005 (POS2-005 leaves status-9 / paylater Hold semantics intact). | None. |
| `change_requests/implementation_summaries/CR_001_IMPLEMENTATION_SUMMARY.md:43` | "Audit fall-through fix: added `running` rule for `f_order_status ∈ {0,1,2,4,5,7,8}` so true running orders are no longer routed to Audit." | **Direct conflict.** POS2-005 reclassifies status-8 from `'running'` to `'hold'` for both the Audit Report priority-chain mapping AND the FE dashboard. CR-001's audit-fall-through goal is preserved (status-8 still doesn't fall through to `'audit'`), but the destination changes from Running tab to Hold tab. | POS2-005 must call out this rule revision in its implementation handover and in the post-acceptance final-doc revision. |
| `change_requests/qa_reports/CR_001_QA_REPORT.md:64-66, 99-103` | "Hold tab filter: `f_order_status===9` OR `payment_method==='paylater'`" — passed. "Running widening — paylater + 9 explicitly excluded" — passed. | **Direct conflict** with the Hold-tab predicate (which must now also include status-8). | POS2-005 widens both predicates symmetrically (Hold gains 8; Running excludes 8). CR-001 QA's CS-1 / CS-3 acceptance is replaced by POS2-005 acceptance. |
| `change_requests/CR_003_paid_hold_order_actions.md:199-200` (OQ-C2 + OQ-C3) | "Backend handles the reappearance. Order re-surfaces as a running order on the dashboard (emitted via socket — see OQ-C3). Frontend does not need to explicitly reopen the order state." | **Potential conflict — depends on BE-emitted f_order_status post-flip.** If `make-order-unpaid` causes the order to re-emit with `f_order_status = 8`, POS2-005 routes it to Hold (not Running) — owner must confirm this is intended. If `make-order-unpaid` re-emits with a different status (e.g., 5/served, or a non-8 running value), there is no conflict. | **Open question OQ-1 in §16 — needs BE confirmation before freeze.** |
| `change_requests/CR_007_*` BUG-PREPAID-MERGE-SHIFT (CR_007_A2_QA_REPORT.md) | Merge / Table-Shift action buttons hidden for `paymentType === 'prepaid'` (defence in depth: OrderCard + OrderEntry). | **No conflict.** Action-button gating is independent of Hold/Running/PAID-tag visibility. Hold-tab action buttons (Collect Bill / Mark Unpaid from CR-003) for a prepaid + status-8 order should still respect the prepaid action gating. | Verify in QA: a prepaid + status-8 order in Hold tab does not expose Merge / Table-Shift action buttons (if Hold tab even surfaces those — typically no, because Merge / Shift are dashboard-card actions). |
| `change_requests/CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md` | `payment_type` case canonicalisation (Prepaid/PREPAID/postpaid). | **No conflict.** | None. |
| `change_requests/CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md` | Delivery audit/dispatch navigation. | **No conflict** (no status-8 dependency observed). | None. |

**Summary:** One direct conflict (CR-001 CS-3 status-8 → running) is the **explicit revision target** of POS2-005. One conditional conflict (CR-003 OQ-C2) requires a single BE confirmation. All other docs are silent or compatible.

---

## 4. Current status-8 behavior (verified against `9-may` code)

| Surface | Current behavior | Source-of-truth |
|---|---|---|
| `f_order_status = 8` numeric → key | `'running'` | `api/constants.js:141` |
| `F_ORDER_STATUS_API[8]` | `'running'` | `api/constants.js:154` |
| `STATUS_COLUMNS` | `{ id: 8, fOrderStatus: 8, name: 'Running', key: 'running' }` | `api/constants.js:165` |
| `ORDER_TO_TABLE_STATUS['running']` | `'occupied'` | `api/constants.js:178` |
| `mapOrderStatus(8)` | `'running'` | `api/transforms/orderTransform.js:28-30` |
| Channel view (Dine-In / TakeAway / Delivery / Room tabs) — default | **Visible.** `activeStatuses` default includes `'running'` (`pages/DashboardPage.jsx:364`); `statusMatchesFilter` admits 8 (`pages/DashboardPage.jsx:714-736`). |
| Status view (Status columns) — default | **Hidden by default** (`enabledStatuses` default = `["pending","preparing","ready","served"]`; `pages/StatusConfigPage.jsx:109-110`); operator can enable. |
| Header status pill "Running" | Renders + counts status-8 (`components/layout/Header.jsx:23`). |
| OrderCard PAID badge | Single condition: `order.paymentType === 'prepaid'` (`components/cards/OrderCard.jsx:329`). |
| TableCard PAID badge | Single condition: `table.paymentType === 'prepaid'` (`components/cards/TableCard.jsx:244`). |
| Card-level HOLD label | **Does not exist anywhere** — no component renders a HOLD pill at card level. |
| Audit Report `getOrderLogsReport` priority chain | Status-8 → `status = 'running'` (`api/services/reportService.js:660-714` fall-through after Cancel/Merge/TAB/Hold(=9 or paylater)/transferToRoom/unpaid). |
| Audit Report Hold tab (`TAB_FILTERS.hold`) | `paymentMethod === 'paylater' OR fOrderStatus === 9`. **Status-8 excluded.** (`pages/AllOrdersReportPage.jsx:84`) |
| Audit Report Running tab (`TAB_FILTERS.running`) | Includes status-8 via `status === 'running'` (after CR-001 widening). (`pages/AllOrdersReportPage.jsx:97-107`) |
| Audit Report Hold endpoint (`getHoldOrders`) | `GET /api/v2/.../paid-paylater-order-list`. **Backend endpoint is keyed on paylater rows.** Has known ISSUE-001 (returns same data as paid-order-list). NOT used by `AllOrdersReportPage` Hold tab — that tab is fed from `/order-logs-report` and filtered client-side. (`api/services/reportService.js:185-191`, `api/constants.js:72`) |
| `getAllOrders` legacy bulk fetcher | Uses `getHoldOrders` + getPaidOrders + getCancelledOrdersRaw + getCreditOrders + getRunningOrders. Not the primary `AllOrdersReportPage` data source. (`api/services/reportService.js:1074-1100`) |
| Dashboard data source | `OrderContext` ← `getRunningOrders` (REST: `/employee-orders-list`) + socket events (new-order, update-order*, scan-new-order, update-food-status, update-order-status, etc.). |
| `getRunningOrders` REST | Empirical observation (POS2-004 validation §3.4): backend excludes `f_order_status = 8` from this endpoint. Owner-confirmed in POS2-004 addendum. FE code is a pure pass-through (`api/services/orderService.js:13-18`). |
| Socket entry path that DOES insert status-8 | `scan-new-order` → `handleScanNewOrder` (`api/socket/socketHandlers.js:428-447`): `addOrder(order)` is unconditional after `fetchSingleOrderForSocket` resolves the row from `/get-single-order-new`. Defensively, `handleNewOrder` (line 146-198) also calls `addOrder(transformedOrder)` unconditionally for embedded payloads. |
| Socket update path | `handleOrderDataEvent` (line 221-298) — `updateOrder` (patches existing) for non-terminal; `removeOrder` for terminal (`paid` / `cancelled`). **Cannot insert a previously-unknown status-8 order.** |

**Confirmed source of the observed mismatched card:** `scan-new-order` socket → `addOrder(...)`. This is the single most important entry path POS2-005 must guard.

---

## 5. Locked owner business rule (LOCKED — authoritative)

| Clause | Rule |
|---|---|
| **R1** | `f_order_status = 8` orders MUST route to the Hold/Audit area AND display a HOLD label. |
| **R2** | `f_order_status = 8` orders MUST NOT be visible on the running dashboard (channel view AND status view, both layouts). |
| **R3** | The PAID tag MUST display only when `order.paymentType === 'prepaid'` AND `order.fOrderStatus !== 8`. |

Implications:
- A prepaid + status-8 order shows **HOLD** (per R1) and **NOT PAID** (per R3) — HOLD takes priority over PAID display for status-8.
- If a card-level HOLD label is required for status-9 / paylater orders too (consistency question), that's an extra-scope decision (see OQ-2 in §16).

---

## 6. Corrected source path for `f_order_status = 8`

(Re-stated from POS2-004 addendum §16.2; verified in code on `9-may`.)

```
[Customer scans QR — backend creates order with f_order_status=8 + payment_type=prepaid]
                              │
                              ▼
   Backend emits socket frame: [scan-new-order, <orderId>, <restaurantId>, 8]
                              │
                              ▼
            handleScanNewOrder (socketHandlers.js:428-447)
                              │
                              ▼
             fetchOrderWithRetry (socketHandlers.js:85-109)
                              │
                              ▼
        fetchSingleOrderForSocket (orderService.js:27-40)
                              │
                              ▼
   POST /api/v2/.../get-single-order-new  →  raw row {f_order_status:8, payment_type:'prepaid', ...}
                              │
                              ▼
              orderFromAPI.order(rawOrder)  (orderTransform.js)
                              │
                              ▼
                addOrder(order)  (UNCONDITIONAL — current bug)
                              │
                              ▼
                       OrderContext
                              │
                              ▼
   dineInOrders / takeAwayOrders / deliveryOrders / walkInOrders selectors
                              │
                              ▼
         DashboardPage.jsx (channel view) — statusMatchesFilter admits 'running'
                              │
                              ▼
       OrderCard / TableCard renders the green PAID badge (paymentType==='prepaid')
                              │
                              ▼
                    [Owner sees the mismatched card]
```

**Defensive secondary path:** `handleNewOrder` (`socketHandlers.js:146-198`) also calls `addOrder(transformedOrder)` unconditionally on embedded payload. If backend ever emits a `new-order` frame with status-8, the same bug surfaces.

**Dismissed paths (verified safe):**
- `update-order-paid`, `update-order`, `update-order-target`, `update-order-source` (all routed through `handleOrderDataEvent`) — only `updateOrder` patches existing entries; cannot introduce a previously-unknown order.
- `update-food-status`, `update-order-status` — both use `getOrderById` short-circuit or call `updateOrder` (not `addOrder`).
- `delivery-assign-order` — `updateOrder` only.
- `split-order` — `updateOrder` for the original order.
- `/employee-orders-list` REST — backend filters status-8 out (per POS2-004 addendum §16.1; FE code pass-through verified).

---

## 7. Dashboard exclusion impact

### 7.1 Layers where status-8 must be excluded

| Layer | File / Symbol | Action | Rationale |
|---|---|---|---|
| **L1 — Socket insertion (primary)** | `api/socket/socketHandlers.js` — `handleScanNewOrder` (line 428-447) and `handleNewOrder` (line 146-198) | After transform, **skip `addOrder(...)` if `transformedOrder.fOrderStatus === 8`.** Log info. Do NOT engage table for the skipped order. | Stops status-8 at the door; the dashboard `OrderContext` never receives the row. Cleanest layer because it also keeps the ChannelView, StatusView, Header pill, sidebar count, and any other consumer of OrderContext consistent automatically. |
| **L2 — Dashboard channel-view filter (defence in depth)** | `pages/DashboardPage.jsx` — `statusMatchesFilter` (line 714-736) | Add hard-filter `if (fOrderStatus === 8) return false;` BEFORE the `activeStatuses` lookup. | Catches any status-8 order that slipped past L1 (e.g., a future socket handler that forgets the guard, or a race condition during deploy). |
| **L3 — Dashboard status-view filter (defence in depth)** | `pages/DashboardPage.jsx` — status-view `STATUS_COLUMNS.forEach` (line 859-880) | Either (a) remove the `id: 8` row from `STATUS_COLUMNS` (`api/constants.js:165`), OR (b) hard-filter the column items with `o.fOrderStatus !== 8`. | Status-view "Running" column was already default-off but operator-toggleable. After POS2-005 it must be permanently empty / removed. (a) is cleaner. |
| **L4 — Status pill row** | `components/layout/Header.jsx:23` — `running` pill row | Remove the pill OR re-key it to `Hold` (status 8 + status 9). | Pill count consistency. |
| **L5 — Status Config page** | `pages/StatusConfigPage.jsx:90-110` (`ALL_STATUSES`, `DEFAULT_ENABLED`) | Remove `running` from `ALL_STATUSES` so the operator cannot enable it. | UX correctness — no toggle that does nothing. |

### 7.2 Recommended layer combination

**L1 + L2 + L3 + L4 + L5** (full defence in depth). L1 alone is sufficient under current backend behaviour, but:
- L2 + L3 protect against future regressions if a new socket handler (or a refactor) calls `addOrder` without the guard.
- L4 + L5 prevent stale UI affordances that no longer represent live state.

### 7.3 Risk: socket-inserted status-8 orders if filter at dashboard layer alone

If POS2-005 only filters at L2/L3 without the L1 guard, a status-8 order would still enter `OrderContext`. Consequences:
- Header pill counts (e.g., a "Running" or "All Orders" count) might still tick up.
- Any other component that reads `OrderContext.orders` directly (e.g., a future analytics widget, a sidebar badge, a toast notification) would surface the order.
- **OrderEntry recovery** (when the operator opens an order from another surface) could still find the order via `OrderContext.getOrderById(orderId)`, opening a Pandora's box of action-button behavior on a Hold-classed order.

Therefore **L1 is mandatory.** L2/L3 are belt-and-braces.

### 7.4 OrderEntry surface — does it need a guard?

| Concern | Decision |
|---|---|
| Can OrderEntry be opened on a status-8 order? | Today: yes (via deep-link `/order/:id` — bypasses dashboard). Post-POS2-005: still yes — owner has not asked to block OrderEntry deep-link. The Hold tab can navigate to OrderEntry to take action. |
| Does OrderEntry render the PAID badge? | Inspect required (see code at `components/order-entry/OrderEntry.jsx`). If yes, R3 must apply there too. |
| Does OrderEntry render a HOLD label? | Probably not today; if owner wants HOLD label visible at OrderEntry too, that's an additional scope item — see OQ-3 in §16. |

---

## 8. Hold/Audit routing impact

### 8.1 Audit Report Hold tab (primary surface)

`pages/AllOrdersReportPage.jsx:84`:
```js
hold: (o) => o.paymentMethod?.toLowerCase() === 'paylater' || o.fOrderStatus === 9,
```

Change required:
```js
// POS2-005: include f_order_status === 8 (Active/Unpaid running becomes Hold)
hold: (o) =>
  o.paymentMethod?.toLowerCase() === 'paylater' ||
  o.fOrderStatus === 9 ||
  o.fOrderStatus === 8,
```

`pages/AllOrdersReportPage.jsx:97-107` (Running tab — must exclude status-8):
```js
running: (o) => {
  if (o.paymentMethod === 'Cancel') return false;
  if (o.paymentMethod === 'Merge' || o.paymentStatus === 'Merge') return false;
  if (o.paymentMethod?.toLowerCase() === 'paylater') return false;
  if (o.fOrderStatus === 9) return false;
  if (o.fOrderStatus === 8) return false;   // ← POS2-005
  return (
    o.status === 'running' ||
    o.paymentStatus === 'unpaid' ||
    o.paymentMethod?.toLowerCase() === 'transfertoroom'
  );
},
```

### 8.2 Audit Report priority-chain mapping (`api/services/reportService.js:660-714`)

Current order:
```
1. Cancel       → 'cancelled'
2. Merge        → 'merged'
3. TAB          → 'credit'
4. fStatus===9 OR paylater → 'hold'
5. transferToRoom → 'roomTransfer' / 'paid'
6. paymentStatus==='unpaid' → 'unpaid'
7. fStatus===6  → 'paid'
8. fStatus !== 3,6,9, !== null → 'running'    ← status-8 lands here
9. else         → 'audit'
```

Change required: insert a new branch for status-8 BEFORE the running fall-through, OR widen the existing Hold rule to include status-8.

**Recommended (cleanest):** widen rule 4:
```js
} else if (fStatus === 9 || fStatus === 8 || paymentMethodLower === 'paylater') {
  status = 'hold';
}
```

Rationale: status-8 → `hold` is the canonical mapping under POS2-005. Doing this in a single rule preserves rule-order semantics (Cancel/Merge/TAB still take precedence) and keeps the code tidy.

### 8.3 Hold orders endpoint (`getHoldOrders` / `paid-paylater-order-list`) — does backend need to change?

**No, for the AllOrdersReportPage Hold tab** — that page is fed by `/order-logs-report` (`getOrderLogsReport`, `pages/AllOrdersReportPage.jsx:528` … the page calls `getOrderLogsReport`, not `getHoldOrders`). The status-8 inclusion is purely a client-side TAB_FILTER + priority-chain change.

**Possibly, for the `getOrdersByTab('hold', ...)` legacy path** (`reportService.js:486-508`) — that path returns `getHoldOrders(date, schedules)`, which fetches `paid-paylater-order-list`. If any consumer relies on `getOrdersByTab('hold', ...)` to enumerate hold orders (we did not find one in `9-may`, but the function is exported), and if that consumer expects status-8 inclusion, **backend must add status-8 to the `paid-paylater-order-list` response.** This is OQ-4 in §16 — a backend confirmation, but **not blocking** because no current consumer in `9-may` uses this path for the dashboard / Audit Report flows.

### 8.4 `getAllOrders` legacy bulk fetcher (`reportService.js:1074-1145`)

This fetcher pulls `[paid, cancelled, credit, hold, runningOrders]` in parallel via:
- `getPaidOrders` (paid-order-list)
- `getCancelledOrdersRaw` (cancelled-order-list)
- `getCreditOrders` (credit-order-list)
- `getHoldOrders` (paid-paylater-order-list) — **does not include status-8 today**
- `getRunningOrders` (employee-orders-list) — **excludes status-8 per backend**

→ A status-8 order is **invisible** to `getAllOrders`. If any current code uses `getAllOrders` and expects to see status-8 orders, it will silently miss them. Inspection: `getAllOrders` is exported but `9-may` references it only for the running-orders-map metadata recovery (lines 1093-1098), not to enumerate the orders themselves. **No live consumer breaks.**

POS2-005 should document this limitation and defer (a) fixing `getAllOrders` and (b) updating `paid-paylater-order-list` until backend confirmation lands (OQ-4).

### 8.5 Live update of Hold/Audit when scan-new-order fires

The `AllOrdersReportPage` is **not socket-subscribed** in real-time today. The page refetches on (a) date change, (b) tab change (some tabs), (c) explicit user refresh. So a status-8 order arriving via socket while the user has the Audit page open will not appear until the next refetch.

This is **expected behavior of the existing Audit Report architecture**, not a POS2-005 regression. If the owner wants live updates on the Hold tab, that's a separate CR. For POS2-005, document the limitation and accept it.

---

## 9. HOLD label impact

### 9.1 Where the HOLD label must appear

| Surface | HOLD label required? | Notes |
|---|---|---|
| Dashboard channel-view card (OrderCard / TableCard) | **Defensively yes** — render HOLD label when `order.fOrderStatus === 8` regardless of whether the card actually appears (since L1+L2+L3 should hide it; the label is a fallback if the order ever leaks). | Coupled with R3 PAID-tag suppression. The two render slots can share the same conditional block. |
| Status-view card | Same as channel-view (same components). | — |
| Audit Report Hold tab row (OrderTable.jsx) | **Yes** — Hold tab now has two member types: `fStatus===9 OR paylater` (existing) and `fStatus===8` (new). A small badge or column annotation distinguishing the two would aid the operator. **Optional for POS2-005 MVP**; can be deferred. | OQ-3 in §16. |
| OrderEntry middle panel | **Defensively yes** — operator opening a status-8 order should see HOLD prominently. | Optional for POS2-005 MVP; can be deferred. OQ-3. |
| Order Summary report rows | No — Order Summary aggregates totals; no per-row label needed. | — |

### 9.2 Minimal HOLD label render contract (proposed)

`components/cards/OrderCard.jsx` — sibling of the PAID badge:
```jsx
{order.paymentType === 'prepaid' && order.fOrderStatus !== 8 && (
  <span data-testid={`prepaid-badge-${orderId}`} ...>PAID</span>
)}
{order.fOrderStatus === 8 && (
  <span
    data-testid={`hold-badge-${orderId}`}
    className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
    style={{ backgroundColor: '#FFF3E0', color: COLORS.primaryOrange }}
  >
    HOLD
  </span>
)}
```

`components/cards/TableCard.jsx` — analogous insertion in the header pill chain (line 244):
```jsx
{table.status === "reserved" ? (
  <span ...>Reserved</span>
) : table.fOrderStatus === 8 ? (
  <span ...>HOLD</span>                              // ← POS2-005
) : table.paymentType === 'prepaid' ? (              // existing PAID branch (note: now mutually exclusive with HOLD via the if-else chain)
  <span ...>PAID</span>
) : table.amount ? (
  <span ...>₹{...}</span>
) : null}
```

**Visual contract:** HOLD uses a warm orange/amber background (matching the existing 'orange' tab color of the Audit Report Hold tab) to distinguish from green PAID and yellow Running. Owner-design decision is folded into OQ-2 in §16 (consistency: should existing fStatus=9 / paylater orders also show HOLD label on the card? — outside POS2-005 MVP unless explicitly approved).

### 9.3 Conflict with PAID tag

By the proposed render contract, HOLD and PAID are **mutually exclusive at the card level**: HOLD wins for status-8 (per R3); PAID shows for prepaid + non-status-8 (per R3). The if-else chain in `TableCard` already enforces single-pill render; OrderCard requires a small refactor to make the render mutually exclusive (currently both are independent flex children — both could render simultaneously without the new R3 predicate).

---

## 10. PAID tag suppression impact

### 10.1 Files / lines

| File | Line | Current | POS2-005 |
|---|---|---|---|
| `components/cards/OrderCard.jsx` | 329 | `{order.paymentType === 'prepaid' && (...PAID...)}` | `{order.paymentType === 'prepaid' && order.fOrderStatus !== 8 && (...PAID...)}` |
| `components/cards/TableCard.jsx` | 244 | `: table.paymentType === 'prepaid' ? (...PAID...)` | (See §9.2 chain — HOLD branch inserted earlier; PAID branch unchanged because HOLD short-circuits) |

### 10.2 Other surfaces that derive PAID semantics

Inspected: `components/order-entry/OrderEntry.jsx`, `components/reports/OrderTable.jsx`, `components/reports/OrderDetailSheet.jsx`, `pages/AllOrdersReportPage.jsx`. None render a card-level PAID badge keyed on `paymentType`. The Audit Report side uses `status === 'paid'` (which requires `fOrderStatus === 6`) for its Paid tab — independent of paymentType. **No change needed in Audit Report side.**

### 10.3 Payment status fields

R3 says PAID must show iff `paymentType === 'prepaid' AND fOrderStatus !== 8`. **No reference to `payment_status` / `paymentStatus`** in the rule. Consistent with current code (which already ignores `paymentStatus` for the PAID badge). No change.

---

## 11. Socket handling impact

### 11.1 Required guard at insertion handlers

| Handler | File:line | Guard insertion |
|---|---|---|
| `handleScanNewOrder` | `api/socket/socketHandlers.js:428-447` | After `const order = await fetchOrderWithRetry(orderId);`: if `order && order.fOrderStatus === 8` → log INFO and **return early without `addOrder`**. Do NOT engage table. |
| `handleNewOrder` | `api/socket/socketHandlers.js:146-198` | Inside the `for (const apiOrder of orders)` loop after `transformedOrder = orderFromAPI.order(apiOrder);`: if `transformedOrder.fOrderStatus === 8` → log INFO and **`continue`** (skip `addOrder` + `syncTableStatus` + table-engage release). |

### 11.2 Update handlers — no new code required

`handleOrderDataEvent`, `handleUpdateFoodStatus`, `handleUpdateOrderStatus`, `handleDeliveryAssignOrder`, `handleSplitOrder`, `handleOrderEngage`: these all call `updateOrder` (patches existing) or `removeOrder` (drops existing) — never `addOrder`. They cannot introduce a previously-unknown status-8 order.

**However**, edge case: if a status-8 order is somehow already in `OrderContext` (e.g., a race condition during a deploy where L1 was added but the build hadn't propagated yet), an update event would keep it there. POS2-005's L2 dashboard filter catches this; the update event is harmless.

### 11.3 Mark-Unpaid round-trip (CR-003 OQ-C2) — depends on BE answer

If `make-order-unpaid` re-emits the order with `f_order_status = 8`:
- The order arrives via `update-order-paid` (or `new-order` per CR-003 OQ-C3 — backend was asked to emit a socket event).
- If via `update-order-paid` → `handleOrderDataEvent` will `updateOrder` (patches existing entry that's already in context as status-6 paid). The order's `fOrderStatus` flips 6 → 8. Dashboard L2 filter then hides the card. **Order disappears from dashboard.** Per R1, it should appear in the Hold tab on the next Audit Report refetch.
- If via `new-order` → `handleNewOrder` with the new L1 guard skips it. **Order never enters dashboard.** Per R1, it appears in the Hold tab on the next Audit Report refetch.
- Either way, the operator must navigate to the Audit Report Hold tab to take further action. This is consistent with the locked owner rule but **inconsistent with CR-003's documented expectation of "re-surfaces as a running order on the dashboard"** (CR-003 OQ-C2:199).

→ **OQ-1 in §16:** Owner must confirm whether CR-003 OQ-C2's "re-surfaces as running on dashboard" should be revised to "re-surfaces in Hold/Audit area" — i.e., the post-Mark-Unpaid order is now Hold, not Running.

If `make-order-unpaid` re-emits the order with a status code OTHER than 8 (e.g., 5/served, 7/pending, or a non-8 running value), no conflict — the order re-surfaces on the dashboard as documented in CR-003. POS2-005 plan unchanged.

### 11.4 Socket consistency across multiple operator terminals

Each terminal independently subscribes to the socket channel. With L1 guards in place, every terminal receiving `scan-new-order` for a status-8 order skips the insertion. **Consistency is maintained without coordination.**

---

## 12. Backend confirmation requirements

| # | Question | Why blocking? | Resolution |
|---|---|---|---|
| **BE-Q1** | When `make-order-unpaid` (CR-003 Endpoint B) is called on a paid order, what `f_order_status` value does the backend emit on the subsequent socket event? Is it `8`? | Determines whether POS2-005 routes Mark-Unpaid'd orders to Hold (per R1) or whether they continue to land on the dashboard via the CR-003 OQ-C2 contract. | **Single BE answer.** If status = 8 → owner OQ-1 in §16 (do you want the Mark-Unpaid round-trip to land in Hold instead of Running?). If status ≠ 8 → no conflict, freeze ready. |
| **BE-Q2** | Does `scan-new-order` socket emission for `f_order_status = 8` originate from a guest-QR-prepaid flow, or from any other origin (e.g., third-party POS sync, room-service, kitchen-display)? | Affects backlog — if `scan-new-order` should never carry status-8, the cleanest fix is at BE; FE's L1 guard becomes belt-and-braces. | Non-blocking (FE guard works regardless). Document for backlog. |
| **BE-Q3** | What does `f_order_status = 8` semantically mean from the BE perspective? "Active/Unpaid running" was inferred from FE constants. Does BE document the same? Are there sub-types (e.g., 8-prepaid-pending vs 8-postpaid-running)? | Could affect HOLD label wording or sub-classification (e.g., "HOLD - Awaiting Payment" vs "HOLD - On Park"). | Non-blocking for MVP. Affects copy decisions. |
| **BE-Q4** | Should `paid-paylater-order-list` (`getHoldOrders` / `REPORT_HOLD_ORDERS`) be updated to include `f_order_status = 8` rows, since they are now Hold-classified? | Affects `getOrdersByTab('hold', ...)` and `getAllOrders` legacy fetcher. | Non-blocking — no live consumer in `9-may` relies on this for the FE Hold display (Audit Report uses `getOrderLogsReport`). Document as backlog. |
| **BE-Q5** | Can `f_order_status = 8` transition back to a non-8 active/running state (e.g., after a successful payment retry)? Or is the only forward transition `8 → 6` (paid)? | Affects R3 stickiness — if 8 → 7/2/5 is possible, the dashboard may briefly see the order at 8 (in Hold) and then need to re-add it as running. | Likely covered by the existing socket update path: `update-order-status` payload updates `fOrderStatus`. If the new status ≠ 8, the existing `updateOrder` patches the order. But: if the order is **NOT in OrderContext** (because L1 skipped it at status 8), then `updateOrder` patches an unknown id → no-op. **Possible regression.** Mitigation: when receiving `update-order-status` with new status ≠ 8, if the order is not in context, fall back to `addOrder` after fetching the row. **Discussed in §15 V8.** |
| **BE-Q6** | Is there a backend field that distinguishes "hold reason / hold type" (e.g., `hold_reason: 'qr_unpaid' \| 'paylater' \| 'park'`)? | Could power a more granular HOLD label or sub-tab. | Non-blocking. Defer. |

**Blocking BE answer for freeze:** BE-Q1 only. Others are documentation/backlog.

---

## 13. Cross-impact with CR-001 / CR-003 / CR-007

### 13.1 CR-001 (status derivation)

| CR-001 acceptance | POS2-005 effect |
|---|---|
| CS-1: Hold = `fStatus===9 OR paylater` | **Widened** to `fStatus∈{8,9} OR paylater`. CR-001 rule preserved as a subset. |
| CS-3: Running tab includes status-8 (after `unpaid` → `running` rename) | **Revised** — status-8 removed from Running tab, moved to Hold. CR-001's audit-fall-through goal is preserved (status-8 still doesn't fall to `'audit'`); only the destination changes. |
| CS-4: Audit fall-through fix (status-8 NOT in Audit) | **Preserved.** Status-8 is now Hold, not Audit. |

### 13.2 CR-003 (Paid / Hold / Order Actions)

| CR-003 surface | POS2-005 effect |
|---|---|
| Hold tab — Collect Bill from Hold (CR-003 CS-A1, OQ-A1/A2/A3) | **No change required.** Status-8 orders newly entering the Hold tab inherit the existing Collect Bill UX (per-row button → modal with `CollectPaymentPanel`). Verify in QA: Collect Bill on a prepaid + status-8 order is well-defined (likely no-op or "already collected" message). Possible OQ for owner. |
| Paid tab — Change Payment Method (CR-003 CS-A2, OQ-B1-B5) | **No effect.** Status-8 was never in Paid tab (CR-003 limited the button to fStatus===6). |
| Paid tab — Mark Unpaid (CR-003 CS-A3, OQ-C1-C6) | **Direct interaction.** See §11.3 + OQ-1. |
| Permission keys (`update_payment`, `order_unpaid`) | **No change.** |
| Aggregator out-of-scope (CR-003 OQ-6) | **Inherited** — POS2-005 should also exclude aggregator orders from Hold-via-status-8 routing if the rule is meant to mirror CR-003. **Open question: do aggregator orders ever have `f_order_status = 8`?** Inferred no; verify with BE if relevant. Non-blocking. |

### 13.3 CR-007 / A2 (BUG-PREPAID-MERGE-SHIFT)

| CR-007 surface | POS2-005 effect |
|---|---|
| OrderCard / TableCard Merge + Table-Shift action button hidden when `paymentType === 'prepaid'` | **No effect on the gating predicate** — POS2-005 hides the entire card from the dashboard for status-8, so the buttons aren't reachable from the dashboard anyway. |
| OrderEntry double-layered prepaid action gating (defence in depth) | **Preserved.** OrderEntry is still reachable for status-8 orders (via Hold tab navigation or deep-link). Action buttons inside OrderEntry must continue to honor `paymentType === 'prepaid'`. |
| Print Bill (CR-007 A2.3) | **No effect.** |

### 13.4 CR-008 (Delivery Audit/Dispatch/Navigation)

No interaction observed. Delivery orders with status-8 (rare per inferred semantics) will follow the same Hold routing.

### 13.5 CR-011 (payment_type case canonicalisation)

No interaction. `paymentType === 'prepaid'` is the canonical post-CR-011 lowercase form used in the PAID badge; POS2-005 uses the same form.

---

## 14. Minimal implementation sequence

> **Order matters — it's designed to keep the dashboard safe at every commit.** Do not skip steps.

### 14.1 Phase A — Socket guards (L1)

1. **Edit `api/socket/socketHandlers.js`** — `handleScanNewOrder` (line 428-447): after `fetchOrderWithRetry`, check `order.fOrderStatus === 8`; if so, log INFO and return early (no `addOrder`, no `syncTableStatus`).
2. **Edit `api/socket/socketHandlers.js`** — `handleNewOrder` (line 146-198): inside the for-loop, after `orderFromAPI.order(apiOrder)`, check `transformedOrder.fOrderStatus === 8`; if so, log INFO and `continue` (skip `addOrder`, `syncTableStatus`, and table-engage release).
3. **Add unit tests** under `__tests__/api/socket/` covering: (a) scan-new-order with status-8 → no addOrder; (b) scan-new-order with status-7 → addOrder called; (c) new-order with status-8 in payload → no addOrder for that order; (d) new-order with mixed statuses (one 8, one 7) → only 7 added.

### 14.2 Phase B — Dashboard exclusion (L2 + L3)

4. **Edit `pages/DashboardPage.jsx:714-736`** — `statusMatchesFilter`: prepend `if (fOrderStatus === 8) return false;`.
5. **Edit `pages/DashboardPage.jsx:859-883`** — status-view loop: filter the items array per column with `o.fOrderStatus !== 8` (defensive — should be empty after L1 anyway).
6. **Edit `api/constants.js:161-171`** — remove `{ id: 8, fOrderStatus: 8, name: 'Running', key: 'running' }` from `STATUS_COLUMNS`. (Or re-key as Hold; OQ for owner — see OQ-2.)
7. **Edit `pages/StatusConfigPage.jsx:90-110`** — remove `running` from `ALL_STATUSES`. Migration concern: existing operator localStorage `mygenie_enabled_statuses` may contain `"running"` — the `enabledStatuses.includes(statusId)` check tolerates extra values, so no migration needed; the column simply doesn't render.
8. **Edit `components/layout/Header.jsx:23`** — remove or re-key the `running` status pill row.
9. **Add unit tests** for `statusMatchesFilter` and the status-view column-render path.

### 14.3 Phase C — PAID badge suppression + HOLD label (R3 + R1.b)

10. **Edit `components/cards/OrderCard.jsx:329-331`** — widen PAID predicate to `paymentType === 'prepaid' && fOrderStatus !== 8`. Add a sibling render block for HOLD label conditional on `fOrderStatus === 8`. (See §9.2 contract.)
11. **Edit `components/cards/TableCard.jsx:242-248`** — restructure the header pill if-else chain to insert a HOLD branch before the PAID branch (so HOLD short-circuits PAID for status-8). (See §9.2 contract.)
12. **Add component tests** for OrderCard and TableCard covering: (a) prepaid + status-7 → PAID, no HOLD; (b) prepaid + status-8 → HOLD, no PAID; (c) postpaid + status-8 → HOLD, no PAID; (d) postpaid + status-7 → no badge.

### 14.4 Phase D — Audit Report Hold inclusion (R1.a)

13. **Edit `pages/AllOrdersReportPage.jsx:84`** — widen `TAB_FILTERS.hold` to `paymentMethod === 'paylater' OR fOrderStatus === 9 OR fOrderStatus === 8`.
14. **Edit `pages/AllOrdersReportPage.jsx:97-107`** — exclude status-8 from `TAB_FILTERS.running` (`if (o.fOrderStatus === 8) return false;`).
15. **Edit `api/services/reportService.js:660-714`** — insert `fStatus === 8` into the existing Hold rule (rule 4): `else if (fStatus === 9 || fStatus === 8 || paymentMethodLower === 'paylater') { status = 'hold'; }`.
16. **Add unit tests** for the priority chain and TAB_FILTERS covering: (a) status-8 row → status=`'hold'` and surfaces in Hold tab; (b) status-8 row does NOT surface in Running tab; (c) existing fStatus=9 / paylater rows continue to surface in Hold (no regression).

### 14.5 Phase E — Cross-impact validation

17. **Smoke-test CR-003 OQ-C2 mark-unpaid round-trip** — paid order → Mark Unpaid → confirm it appears in Hold tab (per POS2-005), not Running tab (was the CR-003 expectation). Owner sign-off: this is the new contract.
18. **Smoke-test CR-001 audit fall-through** — confirm status-8 row no longer appears in Audit tab, confirm status-other-than-8 running rows still classify as `'running'`.
19. **Smoke-test CR-007 prepaid action-button gating** — confirm OrderEntry deep-linked to a prepaid + status-8 order still hides Merge / Table-Shift buttons.

### 14.6 Phase F — Documentation

20. **Create `change_requests/implementation_summaries/POS2_005_F_STATUS_8_HOLD_REROUTE_IMPLEMENTATION_SUMMARY.md`** — record exact files edited, lines changed, test coverage, owner sign-off.
21. **Create `change_requests/qa_reports/POS2_005_F_STATUS_8_HOLD_REROUTE_QA_REPORT.md`** — QA pass/fail matrix per validation checklist (§15).
22. **Defer** `/app/memory/final/MODULE_DECISIONS_FINAL.md` revision (Module 4 + Module 10 to record Hold = `{8, 9, paylater}`) until owner signs off post-QA. Per playbook, final-doc revisions follow a separate playbook approval gate.

---

## 15. Validation checklist

| # | Step | Expected | Severity |
|---|---|---|---|
| **V1** | Trigger a `scan-new-order` socket frame for an order with `f_order_status = 8` (test environment). | Order does NOT appear in OrderContext. No card on dashboard. Logs show "scan-new-order: skipping status-8 order". | **High — blocker** |
| **V2** | Trigger a `new-order` socket frame with embedded payload `f_order_status = 8`. | Same as V1. | High |
| **V3** | Open Audit Report on the same business day. | Order appears in Hold tab (with HOLD-related visual treatment if implemented per §9.1). | High |
| **V4** | Verify Audit Report Running tab does NOT include the status-8 order. | Running tab unchanged for non-8 rows; status-8 absent. | High |
| **V5** | Place a non-status-8 order (e.g., status 7 / 1 / 2 / 5). | Order appears on dashboard as before — no regression. | High |
| **V6** | Place a prepaid + status-7 order. | PAID badge shows on the dashboard card. No HOLD badge. | High |
| **V7** | Force a status-8 prepaid order onto the dashboard via test injection (bypass L1). | L2 hides it from channel view; L3 hides from status view. (Defence-in-depth check.) | Medium |
| **V8** | BE-Q5 mitigation: simulate a status-8 order receiving `update-order-status` with new status = 7. | Order is currently NOT in OrderContext (L1 skipped it). Either (a) `updateOrder` is a no-op (regression — order stays absent), OR (b) the handler falls back to `addOrder` after fetch. **Decide which behavior is desired** and add a small fallback if (b) — see OQ-5. | Medium |
| **V9** | Mark-Unpaid (CR-003) on a paid order — depends on BE-Q1 answer. | If BE emits status-8 → order appears in Hold tab (per POS2-005), NOT on dashboard. Owner sign-off required. If BE emits ≠ 8 → order continues to appear on dashboard (CR-003 contract preserved). | High |
| **V10** | Multi-terminal: open dashboard on terminal A, trigger scan-new-order with status-8 on terminal B (via QR), verify terminal A's dashboard does NOT show the order. | Consistent — both terminals skip the insertion via L1. | Medium |
| **V11** | OrderEntry deep-link `/order/:id` for a status-8 order. | Page loads. Action buttons (Merge, Table-Shift) hidden if prepaid (CR-007 still effective). HOLD label visible at OrderEntry if implemented (OQ-3). | Medium |
| **V12** | Header status pill — confirm "Running" pill is removed or re-keyed. | Pill no longer renders / displays new label. Counts consistent. | Medium |
| **V13** | Status Config page — confirm "Running" toggle is removed from `ALL_STATUSES`. | Operator cannot enable a column for status-8. | Low |
| **V14** | Order Summary report — verify status-8 totals are now bucketed under Hold (not Running) in any aggregation. | Aggregations consistent; revenue / order count reconciliation unchanged. | Medium |
| **V15** | Existing fStatus=9 / paylater Hold orders — no regression. | Continue to appear in Hold tab. HOLD label rendering decision (per OQ-2) applied. | High |
| **V16** | E2E: scan-new-order → BE webhook flips order to status 6 (paid) → dashboard / Hold both reflect terminal state. | Order disappears from Hold tab on next refetch (or via socket event); no orphan in either surface. | Medium |
| **V17** | Lint + type-check + build. | Clean (no new errors). | High |
| **V18** | Regression — open the prior `9-may` Audit Report Hold tab on existing live data. | All previously-Hold orders still present + new status-8 orders join. No row is silently dropped. | High |

---

## 16. Open questions (block / non-block)

| # | Owner / BE-Asked | Question | Blocking? | Default if unanswered |
|---|---|---|---|---|
| **OQ-1** | Owner | After Mark-Unpaid (CR-003) flips a paid order back to active, the backend re-emits the order. If BE-Q1 confirms the post-flip `f_order_status = 8`, the order will land in Hold (per POS2-005), NOT Running (per CR-003 OQ-C2). **Do you want this revised behavior?** | **Blocking** if BE-Q1 = 8 | Assume yes (the locked rule R1 implies all status-8 orders go to Hold regardless of how they got there). Owner sign-off recorded in implementation handover. |
| **OQ-2** | Owner | Should existing `fStatus === 9` / paylater Hold orders ALSO show a card-level HOLD label on the dashboard, for visual consistency? | Non-blocking | Default: no for POS2-005 MVP. POS2-005 adds HOLD label only for status-8. Existing 9/paylater orders already don't reach the dashboard via standard flows (they're typically paylater = held). |
| **OQ-3** | Owner | Should the HOLD label also render in OrderEntry middle panel and Audit Report Hold tab rows? | Non-blocking | Default: no for MVP. Add card-level HOLD only. Audit Report Hold tab already labels the row implicitly via tab membership. |
| **OQ-4** | BE | Should `paid-paylater-order-list` (`REPORT_HOLD_ORDERS`) include `f_order_status = 8` rows? | Non-blocking | Default: no — Audit Report doesn't depend on it. Document as backlog. |
| **OQ-5** | Owner / BE | If a status-8 order can transition back to a non-8 active state (BE-Q5), should the FE proactively re-add it to OrderContext when it sees the transition socket event? | Non-blocking but design-relevant | Default: yes — `handleUpdateOrderStatus` should fall back to `addOrder` if the order is not currently in context AND the new status ≠ 8. Small symmetric guard. |
| **OQ-6** | Owner | For the HOLD badge color/wording, accept the proposed warm-orange `#FFF3E0` background + `HOLD` text, or specify a different design token? | Non-blocking | Default: warm orange. Easy to change post-design review. |
| **BE-Q1** | BE (re-stated for clarity) | What `f_order_status` does `make-order-unpaid` emit on the post-flip socket event? | **Blocking** | If BE doesn't answer in time, owner can pre-decide via OQ-1 ("status-8 implies Hold regardless") and proceed. |

---

## 17. Final verdict

> ## **`needs_backend_confirmation`**

- **FE-side plan is complete and ready** — file map, line numbers, test coverage, and risk matrix are all specified in §14, §15, §11.
- **One blocking BE answer remains** (BE-Q1 — the post-Mark-Unpaid status code). Once answered, OQ-1 either becomes moot (if BE-Q1 ≠ 8) or requires a single owner sign-off (if BE-Q1 = 8).
- **No `/app/memory/final/*` edits made.** Final-doc revision is deferred to post-acceptance per playbook.
- **No code changed.** This document is impact analysis / planning only.

**Suggested next step:** Send BE-Q1 to backend owner. In parallel, present OQ-1 / OQ-2 / OQ-3 / OQ-6 to product owner for decision. Once BE-Q1 + OQ-1 are answered, the CR transitions to `ready_for_requirement_freeze` → implementation can begin from §14.1 (Phase A — socket guards) without further analysis.

---

— End of POS2-005 Impact Analysis & Planning 2026-05-08 —

---

# 18. Owner Decision Addendum — All Open Questions Closed (2026-05-08)

> **Trigger:** Owner reviewed §16 OQs and answered all of them in a single round. This addendum closes each OQ + BE-Q with the owner's verbatim intent and revises the final verdict from `needs_backend_confirmation` → **`ready_for_requirement_freeze`**.

## 18.1 Closed OQ ledger

| # | Question (recap) | Owner answer (verbatim intent) | Resolution |
|---|---|---|---|
| **BE-Q1** | What `f_order_status` does `make-order-unpaid` emit on the post-flip socket event? | "Whatever backend emits we show. No, it's not 8." | **CLOSED — not 8.** Mark-Unpaid'd orders carry a non-8 status (e.g., 5 / 7 / 2). They flow through the existing dashboard pipeline like any other running order. **No conflict with CR-003 OQ-C2.** POS2-005 does not affect the Mark-Unpaid round-trip. |
| **OQ-1** | If BE-Q1 = 8, do you want Mark-Unpaid'd orders to land in Hold instead of Running? | (Moot — BE-Q1 ≠ 8.) | **MOOT — closed.** |
| **OQ-2** | Should existing `fStatus = 9` / paylater Hold orders ALSO show a HOLD label, for visual consistency? | "Yes." | **CLOSED — yes, but scoped per OQ-3.** HOLD label scope widens beyond status-8 to include all Hold-classified rows (8 + 9 + paylater) — but only WHERE THEY APPEAR. Status-9 / paylater orders do NOT appear on the dashboard (owner clarified in OQ-3: "these are never on dashboard"), so HOLD label on dashboard cards remains status-8-only. HOLD label in Audit Report Hold tab rows applies to all members (8 + 9 + paylater). |
| **OQ-3** | Should HOLD label also render in OrderEntry middle panel and Audit Report Hold tab rows? | "Audit Report Hold tab rows (each row in the data table) ← important. These are never on dashboard." | **CLOSED — Audit Report Hold tab rows YES (important). OrderEntry NO (out of scope).** Status-9 / paylater orders never reach the dashboard, so HOLD label scope splits cleanly: dashboard cards = status-8 only; Audit Report Hold tab rows = all Hold members (8 + 9 + paylater). |
| **OQ-4** | Should backend extend `paid-paylater-order-list` to include `f_order_status = 8` rows (and address ISSUE-001)? | "That backend issue was fixed. Mark it close." | **CLOSED — backend already fixed ISSUE-001.** No FE work required. The Audit Report Hold tab continues to be fed by `/order-logs-report` (which already returns status-8 rows); no dependency on `paid-paylater-order-list` for the new behavior. ISSUE-001 (the duplicate-data bug) is reported as resolved by backend; FE does not need to verify in this CR. |
| **OQ-5 / BE-Q5** | If a status-8 order can transition back to a non-8 active state, should FE add a transition-back fallback in `handleUpdateOrderStatus`? | "We only skip f_order_status 8. If customer pays, it will come for ready / serve / etc. in docket and hence it will appear in dashboard." | **CLOSED — no defensive fallback required.** Owner's mental model: when the order progresses past status-8 (customer pays / order moves to preparing / ready / served), backend emits a fresh `new-order` (or equivalent insertion event) with the new non-8 status. The L1 guard in `handleScanNewOrder` / `handleNewOrder` only short-circuits the SPECIFIC frame carrying status-8; subsequent frames carrying status 1/2/5/7 will pass through and `addOrder` will land the order on the dashboard normally. **No special transition-back fallback in `handleUpdateOrderStatus`.** |
| **OQ-6** | HOLD badge styling — accept proposed warm orange `#FFF3E0` or specify another design token? | "This is only for audit report. Cleared above." | **CLOSED — accepted; scope = Audit Report Hold tab row + dashboard card (status-8 only).** Owner accepts the proposed warm-orange styling. Badge scope per OQ-2 + OQ-3 resolution. |

## 18.2 Revised HOLD label scope (post-OQ-2 + OQ-3)

| Surface | HOLD label rendered for |
|---|---|
| Dashboard `OrderCard` / `TableCard` | `f_order_status === 8` only. (Status-9 / paylater don't reach the dashboard, so no card-level pill needed for them.) |
| `pages/AllOrdersReportPage.jsx` Hold tab — per-row in `OrderTable.jsx` | **All Hold members:** rows where `paymentMethod === 'paylater' OR fOrderStatus === 9 OR fOrderStatus === 8`. (One label, three triggering predicates.) |
| OrderEntry middle panel | **Not in scope.** No HOLD label render. |
| Order Summary report | Not applicable. |

### 18.2.1 Implementation note for Audit Report row HOLD label

Add a small badge cell in `components/reports/OrderTable.jsx` (or wherever the Hold tab row is rendered) that displays a HOLD pill when the row matches `TAB_FILTERS.hold`. Use the same warm-orange styling as the dashboard card pill for consistency.

Pseudocode:
```jsx
{(o.paymentMethod?.toLowerCase() === 'paylater' || o.fOrderStatus === 9 || o.fOrderStatus === 8) && (
  <span data-testid={`hold-badge-row-${o.id}`} className="..." style={{ backgroundColor: '#FFF3E0', color: COLORS.primaryOrange }}>
    HOLD
  </span>
)}
```

(Exact insertion line in `OrderTable.jsx` to be located during implementation.)

## 18.3 Revised CR-003 OQ-C2 cross-impact analysis (BE-Q1 closed)

§13.2 (CR-003 row "Mark Unpaid") originally noted **"direct interaction — see §11.3 + OQ-1"**. With BE-Q1 confirmed as ≠ 8:

- Mark-Unpaid'd orders re-emerge with a non-8 status (running family: 1 / 2 / 5 / 7).
- The L1 socket guard in `handleScanNewOrder` / `handleNewOrder` does NOT short-circuit them.
- The order lands on the dashboard normally — exactly as CR-003 OQ-C2 documented.
- **POS2-005 introduces zero regression to the CR-003 mark-unpaid round-trip.** Smoke-test V9 in §15 expects success (order on dashboard after Mark-Unpaid).

## 18.4 Revised Validation Checklist updates

- **V8** (transition-back fallback test) — **DROPPED.** Per OQ-5 owner answer, no fallback is implemented; the natural flow handles transitions. The order's reappearance on the dashboard after `8 → 7/2/5` transition is owned by backend's downstream socket emission (`new-order` for the new state), not by any FE special path.
- **V9** (Mark-Unpaid round-trip) — Expected outcome refined: order **re-appears on dashboard** (CR-003 contract preserved). Severity remains High but the test is now a regression-prevention check, not a contract-decision gate.
- **V11** (OrderEntry deep-link for status-8) — Expected outcome refined: page loads, action buttons gated by CR-007, **HOLD label NOT shown in OrderEntry** (per OQ-3 closure). Severity downgraded to Low.
- **V14** (Order Summary aggregations) — Unchanged.
- **NEW V19** — Audit Report Hold tab row-level HOLD label visibility:
  - Open Audit Report → Hold tab.
  - Confirm HOLD pill renders on rows where `fStatus === 8` (newly-included rows).
  - Confirm HOLD pill ALSO renders on rows where `fStatus === 9` or `paymentMethod === 'paylater'` (pre-existing Hold members) — visual consistency per OQ-2.
  - Confirm Running tab rows do NOT render HOLD pill.

## 18.5 Revised final verdict

> ## **`ready_for_requirement_freeze`**

All blocking and non-blocking open questions are closed. The CR can transition to implementation. Phase A (Phase A — Socket guards, §14.1) can begin without further owner / BE input.

Implementation gates remain:
- Owner sign-off on the consolidated implementation handover (post-Phase F doc generation).
- Final-doc revision (`/app/memory/final/MODULE_DECISIONS_FINAL.md`) deferred per playbook to post-acceptance.

— End of POS2-005 Owner Decision Addendum 2026-05-08 —

