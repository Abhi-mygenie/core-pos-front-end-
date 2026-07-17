# POS2-005 — Implementation Handover: f_order_status = 8 Hold/Audit Reroute

> **Sprint:** pos2.0
> **CR ID:** POS2-005
> **Status:** `ready_for_implementation`
> **Date:** 2026-05-08
> **Branch:** `9-may` (cloned to `/app` 2026-05-08)
> **Author:** Planning agent (read-only — no code edits made by this agent)
> **Implementation Agent:** to pick up from this document

---

## 1. Title and CR ID

**POS2-005 — f_order_status=8 Hold/Audit Reroute** — exclude `f_order_status = 8` from the running dashboard, route to Audit Report Hold tab with HOLD label, and suppress the green PAID badge for prepaid + status-8 orders.

---

## 2. Fresh reading checklist (mandatory before code edit)

The Implementation Agent MUST re-read the following in this order before any commit. Skipping the read order is a baseline violation per `IMPLEMENTATION_AGENT_RULES.md`.

### 2.1 `/app/memory/final/`
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `ARCHITECTURE_DECISIONS_FINAL.md`
- `MODULE_DECISIONS_FINAL.md` (Module 4 status machinery, Module 10 Reports/Audit/Summary, dashboard module)
- `CHANGE_REQUEST_PLAYBOOK.md`
- `IMPLEMENTATION_AGENT_RULES.md`
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `FINAL_DOCS_SUMMARY.md`

### 2.2 Overlay (current accepted)
- `change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `change_requests/PENDING_TASK_REGISTER_2026_05_04.md`
- `change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `change_requests/LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`
- `change_requests/SESSION_HANDOVER_2026_05_04_HYGIENE_AND_PHASE3.md`

### 2.3 CR-specific (chain — read in order)
- `change_requests/impact_analysis/POS2_004_F_STATUS_8_HOLD_PAID_DASHBOARD_INVESTIGATION_2026_05_08.md` (read all 16 sections — §16 is the source-correction addendum; do not skip)
- **`change_requests/impact_analysis/POS2_005_F_STATUS_8_HOLD_REROUTE_CR_IMPACT_ANALYSIS_2026_05_08.md`** ← primary source-of-truth for this CR (read all 18 sections — §18 closes all OQs; do not skip)
- `change_requests/CR_001_all_orders_status_derivation.md`
- `change_requests/implementation_summaries/CR_001_IMPLEMENTATION_SUMMARY.md` (line 43 — the running-set widening that POS2-005 partially revises)
- `change_requests/qa_reports/CR_001_QA_REPORT.md` (lines 64-66 + 99-103 — Hold/Running tab contracts that POS2-005 widens/revises)
- `change_requests/CR_003_paid_hold_order_actions.md` (lines 199-200 — OQ-C2 mark-unpaid round-trip; BE-Q1 confirmed non-8 → no conflict)
- `change_requests/CR_007_ORDERID_VISIBILITY_AND_PRINT_BILL_IN_ORDER_ENTRY.md` + `qa_reports/CR_007_A2_QA_REPORT.md` (BUG-PREPAID-MERGE-SHIFT defence in depth — preserved by POS2-005)
- `change_requests/CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md`
- `current-state/API_USAGE_MAP.md`, `current-state/MODULE_MAP.md`

### 2.4 Code (read after docs only)
- `frontend/src/api/constants.js`
- `frontend/src/api/transforms/orderTransform.js`
- `frontend/src/api/services/orderService.js`
- `frontend/src/api/services/reportService.js`
- `frontend/src/api/socket/socketHandlers.js`
- `frontend/src/api/socket/useSocketEvents.js`
- `frontend/src/contexts/OrderContext.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/StatusConfigPage.jsx`
- `frontend/src/pages/AllOrdersReportPage.jsx`
- `frontend/src/components/cards/OrderCard.jsx`
- `frontend/src/components/cards/TableCard.jsx`
- `frontend/src/components/reports/OrderTable.jsx`
- `frontend/src/components/layout/Header.jsx`
- `frontend/src/utils/statusHelpers.js`

---

## 3. Baseline / overlay reconciliation summary

| Source | Asserts | POS2-005 effect | Action required |
|---|---|---|---|
| `final/MODULE_DECISIONS_FINAL.md` | Lists "running orders" + Audit module concerns. Silent on numeric status-8 rule. | No conflict. | Final-doc revision deferred to post-acceptance per playbook. **Do not edit `/app/memory/final/` in this CR.** |
| `CR_001_IMPLEMENTATION_SUMMARY.md:43` | Status-8 widened into running set (running-set = `{0,1,2,4,5,7,8}`). | **Direct revision** — status-8 reclassifies from `running` to `hold` for both FE dashboard display and Audit Report priority chain. CR-001's audit-fall-through goal preserved (status-8 still doesn't fall to `'audit'`); destination changes from Running tab to Hold tab. | Document the revision in the implementation summary. |
| `CR_001_QA_REPORT.md:64-66, 99-103` | Hold = `{9 OR paylater}`; Running excludes 9 + paylater. | **Widened symmetrically:** Hold = `{8, 9, paylater}`; Running additionally excludes 8. | Update by code edits in Phase D + new test cases. |
| `CR_003_paid_hold_order_actions.md:199` (OQ-C2) | Mark-Unpaid causes order to "re-surface as a running order on the dashboard" via socket. | **No conflict** (BE-Q1 closed: post-flip status ≠ 8). The Mark-Unpaid'd order arrives with a non-8 running status (1/2/5/7) and flows through the dashboard normally. POS2-005's L1 socket guard does NOT short-circuit it. | Add V9 regression test (see §9). |
| `CR_007_A2_QA_REPORT.md` (BUG-PREPAID-MERGE-SHIFT) | Merge / Table-Shift hidden when `paymentType === 'prepaid'`; defence in depth at OrderCard + OrderEntry. | **No conflict.** Action-button gating preserved. POS2-005 hides the dashboard card for status-8 (so buttons unreachable from dashboard); OrderEntry gating remains intact for any deep-link access. | None. |
| `CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md` | `payment_type` case-canonicalisation. | **No conflict.** | None. |
| `POS2_004_F_STATUS_8_HOLD_PAID_DASHBOARD_INVESTIGATION_2026_05_08.md` §16 | Source correction: `scan-new-order` is the entry path; `update-order-paid` is NOT. `/employee-orders-list` continues to exclude status-8. | This is the operating assumption for POS2-005. | Honor in Phase A guard scope. |
| `POS2_005_F_STATUS_8_HOLD_REROUTE_CR_IMPACT_ANALYSIS_2026_05_08.md` §18 | All OQs closed. | Implementation can begin. | This handover. |

**Net:** No unresolved baseline conflict blocks implementation. CR-001 revision is the explicit POS2-005 outcome; CR-003 / CR-007 are unaffected.

---

## 4. Locked owner rules

| # | Rule | Authority |
|---|---|---|
| **R1** | `f_order_status = 8` MUST route to the Audit Report Hold tab AND display a HOLD label. | Owner, locked POS2-004 §16.3. |
| **R2** | `f_order_status = 8` MUST NOT be visible on the running dashboard (channel view AND status view). | Owner, locked POS2-004 §16.3. |
| **R3** | The PAID tag MUST display only when `order.paymentType === 'prepaid'` AND `order.fOrderStatus !== 8`. | Owner, locked POS2-004 §16.3. |

**HOLD-label scope (post-OQ-2 + OQ-3 closure, POS2-005 §18.2):**

| Surface | HOLD label rendered for |
|---|---|
| Dashboard `OrderCard` / `TableCard` | `f_order_status === 8` only (status-9 / paylater never reach the dashboard). |
| Audit Report Hold tab rows (`OrderTable.jsx`) | All Hold members: `paymentMethod === 'paylater' OR fOrderStatus === 9 OR fOrderStatus === 8`. The existing amber "On Hold" badge in the Status column (`OrderTable.jsx:60-95, 403-413`) automatically renders for any row classified as `hold` in the priority chain. After Phase D widens the priority chain, status-8 rows inherit this badge with no new component code. **Implementation Agent should verify the existing Status-column badge is sufficient before adding a separate pill.** If owner / QA wants an additional explicit "HOLD" pill (warm orange `#FFF3E0`), it can be inserted as a sibling of the Status column — see §6 Phase D notes. |
| OrderEntry middle panel | **Out of scope** (per OQ-3 closure). No HOLD label render. |

**Other locked decisions (POS2-005 §18.1):**
- **BE-Q1 closed:** Mark-Unpaid emits a non-8 status. No special FE handling required.
- **OQ-5 closed:** No transition-back fallback. Owner asserts that when the order progresses past status-8 (customer pays / order moves to ready / served), backend emits a fresh insertion event with the new non-8 status; the natural flow re-introduces the order to OrderContext via `addOrder`.
- **OQ-6 closed:** Warm-orange `#FFF3E0` styling accepted for the (optional) explicit HOLD pill in Audit Report. Existing amber Status badge already in place satisfies the row-level HOLD indicator requirement on its own.
- **No backend changes required** — the Audit Report Hold tab is fed by `/order-logs-report` which already returns status-8 rows.

---

## 5. Correct source-path summary

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
                addOrder(order)  ← UNCONDITIONAL (the bug POS2-005 fixes)
                              │
                              ▼
                    OrderContext (entered)
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

**Defensive secondary path:** `handleNewOrder` (`socketHandlers.js:146-198`) also calls `addOrder(transformedOrder)` unconditionally on embedded payload. Guard symmetrically in Phase A.

**Dismissed paths (verified not the source):**
- `update-order-paid`, `update-order`, `update-order-target`, `update-order-source` (all routed through `handleOrderDataEvent`) — only `updateOrder` patches existing entries; cannot insert a previously-unknown order.
- `update-food-status`, `update-order-status` — both call `updateOrder` only, with optional terminal-state `removeOrder`; cannot insert.
- `delivery-assign-order` — `updateOrder` only.
- `split-order` — `updateOrder` for the original order.
- `/employee-orders-list` REST — backend filters status-8 out (per POS2-004 addendum §16.1).

**Do NOT add filters at the network layer** (`fetchSingleOrderForSocket`, `getRunningOrders`). The order data may still be needed for OrderEntry deep-link or future Hold-tab consumers; the filter belongs at the `addOrder` call site.

---

## 6. File-by-file implementation plan

> All line numbers verified on `9-may` HEAD on 2026-05-08. **Re-verify with `grep -n` before editing** in case of intervening commits.

### Phase A — Socket guards (highest priority — fixes the bug)

#### A.1 `frontend/src/api/socket/socketHandlers.js` — `handleScanNewOrder` (lines 428-447)

**Change:** Insert status-8 short-circuit immediately AFTER `fetchOrderWithRetry` resolves, BEFORE `addOrder(order)`.

**Pseudocode:**
```js
export const handleScanNewOrder = async (message, { addOrder, updateTableStatus }) => {
  const parsed = parseMessage(message);
  if (!parsed) { ...return; }

  const { orderId } = parsed;
  log('INFO', `scan-new-order received: ${orderId}`);

  const order = await fetchOrderWithRetry(orderId);
  if (!order) { ...return; }

  // POS2-005: status-8 orders belong on the Audit Hold tab, not the running
  // dashboard. Skip insertion — the order remains accessible via the Audit
  // Report Hold tab (fed by /order-logs-report). When backend later transitions
  // the order to a non-8 active state (1/2/5/7), it emits a fresh insertion
  // event which lands the order on the dashboard normally (per CR-003 OQ-C2
  // and POS2-005 OQ-5 owner closure).
  if (order.fOrderStatus === 8) {
    log('INFO', `scan-new-order: skipping order ${orderId} (f_order_status=8 → Hold)`);
    return;
  }

  addOrder(order);
  syncTableStatus(order, updateTableStatus);
  log('INFO', `scan-new-order: Added order ${orderId}`);
};
```

**Notes:**
- Do NOT call `syncTableStatus` for the skipped order — that would falsely mark the table as occupied.
- Comment must reference both POS2-005 and the OQ-5 closure (transitions handled by natural flow) so the next reader doesn't re-introduce the bug under the assumption that we need a transition-back fallback.

#### A.2 `frontend/src/api/socket/socketHandlers.js` — `handleNewOrder` (lines 146-198)

**Change:** Inside the `for (const apiOrder of orders)` loop, AFTER `transformedOrder = orderFromAPI.order(apiOrder)`, skip status-8 with `continue`.

**Pseudocode (inside the existing for-loop):**
```js
for (const apiOrder of orders) {
  try {
    const transformedOrder = orderFromAPI.order(apiOrder);

    // POS2-005: skip status-8 orders (defensive — same rationale as
    // handleScanNewOrder). Status-8 belongs on the Audit Hold tab.
    if (transformedOrder.fOrderStatus === 8) {
      log('INFO', `new-order: skipping order ${transformedOrder.orderId} (f_order_status=8 → Hold)`);
      continue;
    }

    addOrder(transformedOrder);
    syncTableStatus(transformedOrder, updateTableStatus);
    log('INFO', `new-order: Added order ${transformedOrder.orderId} (complete socket data)`);

    // Step 3: Release table after context update
    if (setTableEngaged && transformedOrder.tableId) {
      requestAnimationFrame(() => { ... });
    }
  } catch (error) {
    log('ERROR', `new-order: Transform failed for order`, error.message);
  }
}
```

**Notes:**
- The Step-1 table-engage block (lines 167-174) reads `tableInfo.table_status === 'engage'` BEFORE the loop. If the new-order frame for a status-8 order also engages a table, the engage call would have already executed before the skip. **Acceptable** because table-engage is short-lived and the engage will be released by the next `update-table free` (or table refresh).
- Do NOT engage / release any state for the skipped order. Let the for-loop's `continue` exit cleanly.

### Phase B — Dashboard exclusion (defence in depth)

#### B.1 `frontend/src/pages/DashboardPage.jsx` — `statusMatchesFilter` (lines 714-736)

**Change:** Prepend a hard-filter for `fOrderStatus === 8` BEFORE the existing `activeStatuses` lookup.

**Pseudocode:**
```js
const statusMatchesFilter = (item) => {
  if (!item.order && !item.fOrderStatus) return true;

  const fOrderStatus = item.order?.fOrderStatus || item.fOrderStatus;
  if (!fOrderStatus) return true;

  // POS2-005: defensive — exclude f_order_status=8 from running dashboard.
  // Primary guard is at socket insertion (handleScanNewOrder / handleNewOrder).
  if (fOrderStatus === 8) return false;

  // Map fOrderStatus to filter IDs
  const statusMap = {
    7: 'pending', 1: 'preparing', 2: 'ready', 8: 'running',
    5: 'served', 9: 'pendingPayment', 6: 'paid', 3: 'cancelled', 10: 'reserved',
  };

  const statusId = statusMap[fOrderStatus];
  return statusId ? activeStatuses.includes(statusId) : true;
};
```

#### B.2 `frontend/src/pages/DashboardPage.jsx` — status-view loop (lines 859-883)

**Change:** Hard-filter the items array with `o.fOrderStatus !== 8` (defensive — should be empty after Phase A anyway).

**Pseudocode (inside the STATUS_COLUMNS.forEach loop):**
```js
STATUS_COLUMNS.forEach(col => {
  const statusIdMap = { 7:'pending', 1:'preparing', 2:'ready', 8:'running', 5:'served', 9:'pendingPayment', 6:'paid', 3:'cancelled', 10:'reserved' };
  const statusId = statusIdMap[col.fOrderStatus];
  const isEnabled = enabledStatuses.length === 0 || enabledStatuses.includes(statusId);
  if (isEnabled) {
    columns.push({
      // ...
      // POS2-005: defensive filter — exclude status-8 even if column tries to surface it.
      items: allOrders.filter(o => o.fOrderStatus === col.fOrderStatus && o.fOrderStatus !== 8),
      // ...
    });
  }
});
```

#### B.3 `frontend/src/api/constants.js` — `STATUS_COLUMNS` (line 165)

**Change:** Remove the `{ id: 8, fOrderStatus: 8, name: 'Running', key: 'running' }` row from `STATUS_COLUMNS`.

**Pseudocode (lines 161-171, before/after):**
```js
// BEFORE
export const STATUS_COLUMNS = [
  { id: 7, fOrderStatus: 7, name: 'Yet to Confirm', key: 'pending' },
  { id: 1, fOrderStatus: 1, name: 'Preparing', key: 'preparing' },
  { id: 2, fOrderStatus: 2, name: 'Ready', key: 'ready' },
  { id: 8, fOrderStatus: 8, name: 'Running', key: 'running' },     // ← remove
  { id: 5, fOrderStatus: 5, name: 'Served', key: 'served' },
  { id: 9, fOrderStatus: 9, name: 'Pending Payment', key: 'pendingPayment' },
  { id: 6, fOrderStatus: 6, name: 'Paid', key: 'paid' },
  { id: 3, fOrderStatus: 3, name: 'Cancelled', key: 'cancelled' },
  { id: 10, fOrderStatus: 10, name: 'Reserved', key: 'reserved' },
];

// AFTER
export const STATUS_COLUMNS = [
  { id: 7, fOrderStatus: 7, name: 'Yet to Confirm', key: 'pending' },
  { id: 1, fOrderStatus: 1, name: 'Preparing', key: 'preparing' },
  { id: 2, fOrderStatus: 2, name: 'Ready', key: 'ready' },
  { id: 5, fOrderStatus: 5, name: 'Served', key: 'served' },
  { id: 9, fOrderStatus: 9, name: 'Pending Payment', key: 'pendingPayment' },
  { id: 6, fOrderStatus: 6, name: 'Paid', key: 'paid' },
  { id: 3, fOrderStatus: 3, name: 'Cancelled', key: 'cancelled' },
  { id: 10, fOrderStatus: 10, name: 'Reserved', key: 'reserved' },
  // POS2-005: status 8 (Running/Active-Unpaid) is now Hold-classified;
  // surfaced only in Audit Report Hold tab, not on the dashboard.
];
```

**Notes:**
- `F_ORDER_STATUS` (lines 132-144) and `F_ORDER_STATUS_API` (lines 147-157) keep the `8: 'running'` mapping — the numeric → key map is still consumed by the Audit Report priority chain (which routes 'running' → 'hold' for status-8 in Phase D). Do NOT remove these.
- `ORDER_TO_TABLE_STATUS['running']` (line 178) keeps `'occupied'` — used for any rendering that resolves a `'running'`-keyed row, including post-flip Mark-Unpaid'd orders (which are non-8 running and should still occupy the table).

#### B.4 `frontend/src/pages/StatusConfigPage.jsx` — `ALL_STATUSES` and `DEFAULT_ENABLED` (lines 90-110)

**Change:** Remove the `running` entry from `ALL_STATUSES` (so the operator cannot enable a column for status-8). `DEFAULT_ENABLED` does not currently include `running`, so no change needed there.

**Pseudocode:**
```js
// Remove this entry from ALL_STATUSES:
{ id: "running", fOrderStatus: 8, label: "Running", description: "Active running orders" },

// Add a comment marker:
// POS2-005: Running (fOrderStatus=8) is no longer operator-toggleable;
// it is now Hold-classified and surfaced only in the Audit Report Hold tab.
```

**Migration note:** Existing operator localStorage `mygenie_enabled_statuses` may contain `"running"`. The `enabledStatuses.includes(statusId)` check tolerates extra values without error — the `running` key simply matches no column after Phase B.3. **No migration code required.**

#### B.5 `frontend/src/components/layout/Header.jsx` (line 23)

**Change:** Remove the `running` status pill row from the Header pill list.

**Pseudocode:**
```js
// Remove this entry:
{ id: "running", fOrderStatus: 8, label: "Running", ... },

// Add a comment marker:
// POS2-005: Running pill removed — status-8 is now Hold-classified.
```

**Notes:**
- Verify that no downstream consumer of the pill list (e.g., `activeStatuses` initialiser at `DashboardPage.jsx:364`) hard-codes `'running'` in a way that would error if the list shrinks. The `activeStatuses` array is independent (declared inline at line 364), so the Header pill removal is decoupled.
- After removal, recompute the pill count UI to avoid orphan zeros.

### Phase C — Card-level PAID suppression + HOLD label (R3 + R1.b)

#### C.1 `frontend/src/components/cards/OrderCard.jsx` (lines 328-331)

**Change:** Widen PAID predicate to `paymentType === 'prepaid' && fOrderStatus !== 8`. Add a sibling HOLD label rendered when `fOrderStatus === 8`.

**Pseudocode:**
```jsx
{/* Prepaid badge — POS2-005: hidden when fOrderStatus === 8 (HOLD takes priority) */}
{order.paymentType === 'prepaid' && order.fOrderStatus !== 8 && (
  <span data-testid={`prepaid-badge-${orderId}`}
        className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ backgroundColor: '#E8F5E9', color: COLORS.primaryGreen }}>
    PAID
  </span>
)}

{/* POS2-005: defensive HOLD label for any status-8 card that slips past
    the socket guards (Phase A) and dashboard filters (Phase B). */}
{order.fOrderStatus === 8 && (
  <span data-testid={`hold-badge-${orderId}`}
        className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ backgroundColor: '#FFF3E0', color: COLORS.primaryOrange }}>
    HOLD
  </span>
)}
```

**Also check `OrderCard.jsx:754` — second `paymentType === 'prepaid'` reference:** Verify whether this is a different render slot (e.g., bottom row "PAID" indicator) or related styling. Apply the same `&& order.fOrderStatus !== 8` guard if it renders the green PAID treatment. **Implementation Agent must inspect line 754 in context** before editing.

#### C.2 `frontend/src/components/cards/TableCard.jsx` (lines 242-248 + line 401)

**Change:** Restructure the header pill if-else chain (line 242-248) to insert a HOLD branch BEFORE the PAID branch (so HOLD short-circuits PAID for status-8). Apply the same predicate to the secondary PAID render at line 401 if it renders the green PAID treatment.

**Pseudocode (header pill chain at line 242-248):**
```jsx
{table.status === "reserved" ? (
  <span ...>Reserved</span>
) : table.fOrderStatus === 8 ? (
  /* POS2-005: HOLD takes priority over PAID for status-8 */
  <span data-testid={`hold-badge-table-${table.id}`}
        className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ backgroundColor: '#FFF3E0', color: COLORS.primaryOrange }}>
    HOLD
  </span>
) : table.paymentType === 'prepaid' ? (
  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ backgroundColor: '#E8F5E9', color: COLORS.primaryGreen }}>
    PAID
  </span>
) : table.amount ? (
  <span className="text-xs font-semibold flex-shrink-0">{currencySymbol}{table.amount.toLocaleString()}</span>
) : null}
```

**Notes:**
- The if-else chain naturally enforces single-pill render. HOLD and PAID never render simultaneously on the same card.
- For line 401 (secondary `table.paymentType === 'prepaid'`), inspect surrounding context to determine whether it's a different render slot (e.g., expanded card body) and apply the same logic — either a HOLD-takes-priority chain or a `&& fOrderStatus !== 8` guard.

#### C.3 No change required for OrderEntry middle panel

Per OQ-3 closure (POS2-005 §18.1), HOLD label in OrderEntry is **out of scope**. Do not add HOLD render to `components/order-entry/OrderEntry.jsx`.

### Phase D — Audit Report Hold routing (R1.a)

#### D.1 `frontend/src/pages/AllOrdersReportPage.jsx` — `TAB_FILTERS.hold` (line 84)

**Change:** Widen Hold predicate to include `fOrderStatus === 8`.

**Pseudocode:**
```js
// CR-001 CS-1 + POS2-005: Hold matches paylater payment method OR
// fOrderStatus === 9 OR fOrderStatus === 8 (POS2-005 reroute).
hold: (o) =>
  o.paymentMethod?.toLowerCase() === 'paylater' ||
  o.fOrderStatus === 9 ||
  o.fOrderStatus === 8,
```

#### D.2 `frontend/src/pages/AllOrdersReportPage.jsx` — `TAB_FILTERS.running` (lines 97-107)

**Change:** Exclude `fOrderStatus === 8` from Running tab.

**Pseudocode:**
```js
running: (o) => {
  if (o.paymentMethod === 'Cancel') return false;
  if (o.paymentMethod === 'Merge' || o.paymentStatus === 'Merge') return false;
  if (o.paymentMethod?.toLowerCase() === 'paylater') return false;
  if (o.fOrderStatus === 9) return false;
  if (o.fOrderStatus === 8) return false;   // ← POS2-005: Hold-classified, no longer running
  return (
    o.status === 'running' ||
    o.paymentStatus === 'unpaid' ||
    o.paymentMethod?.toLowerCase() === 'transfertoroom'
  );
},
```

#### D.3 `frontend/src/api/services/reportService.js` — priority chain (lines 660-714)

**Change:** Widen the existing Hold rule (rule 4 in the chain) to include `fStatus === 8`.

**Pseudocode (target the existing `else if (fStatus === 9 || paymentMethodLower === 'paylater')` branch):**
```js
} else if (fStatus === 9 || fStatus === 8 || paymentMethodLower === 'paylater') {
  // CR-001 CS-1 + POS2-005: Hold rule keyed on f_order_status === 9 OR === 8 OR
  // payment_method === 'paylater'. POS2-005 reclassifies status-8 from
  // 'running' to 'hold' for FE display + Audit Report tab routing.
  status = 'hold';
}
```

**Order matters:** Cancel / Merge / TAB rules MUST run before this Hold rule (to preserve CR-001 priority semantics). Do NOT reorder.

#### D.4 `frontend/src/components/reports/OrderTable.jsx` — Audit Hold row HOLD pill

**Verify first (recommended path):** The existing Status column at lines 403-413 already renders an "On Hold" badge with `getStatusBadgeStyle('hold')` (= `bg-amber-100 text-amber-800 border-amber-200`, lines 60-95) for any row classified as `hold` in the priority chain. After Phase D.3 widens the priority chain to include status-8, **status-8 rows automatically inherit the "On Hold" badge** in the Status column with NO further code edit required.

**Decision tree for Implementation Agent:**

| Owner / QA expectation | Action |
|---|---|
| The existing amber "On Hold" badge in the Status column is sufficient as the row-level HOLD indicator. | **No edit to `OrderTable.jsx` required.** Phase D ends after D.1 + D.2 + D.3. |
| Owner / QA wants an additional explicit "HOLD" pill in a separate cell with the warm-orange `#FFF3E0` styling (matching the dashboard card pill). | Add a small badge cell in the table row near the Status column, conditional on `o.paymentMethod?.toLowerCase() === 'paylater' OR o.fOrderStatus === 9 OR o.fOrderStatus === 8`. Use `data-testid="hold-badge-row-${o.id}"`. |

**Recommended:** Start with the no-edit path (rely on existing Status badge). If owner / QA explicitly asks for a separate pill during validation, add it in a follow-up edit. Document the decision tree explicitly in the implementation summary.

### Phase E — Tests / validation

(See §9 — Test/validation checklist.)

---

## 7. Phase A / B / C / D / E sequence (commit-by-commit safe order)

> Each phase is a self-contained commit. Run lint + build between phases.

| Order | Phase | Files | Why this order |
|---|---|---|---|
| **1** | Phase A | `socketHandlers.js` | Stops the bug at the door. After this commit, no new status-8 orders enter OrderContext. |
| **2** | Phase B | `DashboardPage.jsx`, `constants.js`, `StatusConfigPage.jsx`, `Header.jsx` | Defence-in-depth. Hides any status-8 orders that slipped past Phase A or were already in localStorage. |
| **3** | Phase C | `OrderCard.jsx`, `TableCard.jsx` | PAID suppression + HOLD label rendering. Cards that survive Phase A+B (e.g., during a deploy race) display correctly. |
| **4** | Phase D | `AllOrdersReportPage.jsx`, `reportService.js`, optionally `OrderTable.jsx` | Audit Report routing. Independent of dashboard work; can ship in parallel but recommended after Phase C so visual parity is testable end-to-end. |
| **5** | Phase E | New test files under `__tests__/` | Verifies each phase. |
| **6** | Documentation | `change_requests/implementation_summaries/POS2_005_*.md` + `change_requests/qa_reports/POS2_005_*.md` | Record what was edited, owner sign-off, QA pass/fail. |
| **7** | Final-doc revision | DEFERRED | Per playbook, `/app/memory/final/MODULE_DECISIONS_FINAL.md` (Module 4 + Module 10) is revised AFTER acceptance + owner sign-off, in a separate task. Do not edit `/app/memory/final/` in this CR. |

**Lint + build gate between phases:**
```bash
cd /app/frontend && yarn lint
cd /app/frontend && yarn build   # optional smoke; webpack compiled successfully on dev server is sufficient
```

---

## 8. What NOT to change

| Forbidden zone | Why |
|---|---|
| `/app/memory/final/*` | Final-doc revisions follow a separate playbook; deferred to post-acceptance. |
| Backend contracts, endpoints, or socket message shapes | POS2-005 is FE-only. No BE changes required (per §3 + POS2-005 §18.1). |
| Billing / GST / service tax / delivery charge logic | Unrelated to POS2-005 scope. |
| POS2-003 printer-agent work | Concurrent CR; do not touch. |
| POS2-002 web YTC pop-out work | Concurrent CR; do not touch. |
| Payment collection logic (CollectPaymentPanel, prepaid settlement endpoints, completePrepaidOrder) | Unrelated. |
| Prepaid / postpaid settlement endpoints (`paid-prepaid-order`, etc.) | Unrelated. |
| Socket architecture broadly (event registration in `useSocketEvents.js`, message parsing helpers, table-engage/free contract) | Out of scope. POS2-005 only adds two `if` statements at insertion sites. |
| Dashboard architecture (channel-vs-status layout switching, OrderContext shape, table grid render) | Out of scope. POS2-005 is a filter widening + a localStorage-tolerant config trim. |
| OrderEntry HOLD label | Out of scope per OQ-3 closure. |
| `F_ORDER_STATUS` / `F_ORDER_STATUS_API` mapping (constants.js:132-157) | Numeric → key map is preserved (still `8: 'running'`); only `STATUS_COLUMNS` row 8 is removed. |
| `ORDER_TO_TABLE_STATUS['running']` (constants.js:178) | Preserved; used by Mark-Unpaid'd orders (non-8 running) and any other future running-status row. |
| `getRunningOrders` / `fetchSingleOrderForSocket` network layer | Do not filter at the network layer; OrderEntry deep-link and Audit Report fetches still need access to status-8 rows. Filter only at the dashboard `addOrder` call sites. |
| CR-001 widening rule for status-0 / 4 (running set `{0,1,2,4,5,7,8}`) | POS2-005 only revises status-8. Statuses 0 and 4 retain the CR-001 audit-fall-through routing. |
| CR-007 BUG-PREPAID-MERGE-SHIFT action-button gates | Preserved as-is. |
| CR-003 Mark-Unpaid round-trip socket handling | Preserved as-is (BE-Q1 closed: post-flip status ≠ 8). |

---

## 9. Test / validation checklist

| # | Test | Phase | Expected | Severity |
|---|---|---|---|---|
| **V1** | Trigger `scan-new-order` socket frame for an order with `f_order_status = 8`. | A | Order does NOT enter OrderContext. No card on dashboard. Log: "scan-new-order: skipping order X (f_order_status=8 → Hold)". | High — blocker |
| **V2** | Trigger `new-order` socket frame with embedded payload `f_order_status = 8`. | A | Same as V1, log entry from `handleNewOrder`. | High |
| **V3** | Place a non-status-8 order (status 7 / 1 / 2 / 5). | A | Order appears on dashboard normally — no regression. | High |
| **V4** | Force a status-8 order into `OrderContext` via test injection (bypass Phase A). | B | `statusMatchesFilter` (channel view) returns false for the item. Status-view loop returns empty items array for status-8. (Defence in depth.) | Medium |
| **V5** | Inspect Header status pill list. | B | "Running" pill removed. Other pills (YTC, Preparing, Ready, Served, Pending Payment, Paid, Cancelled, Reserved) intact. | Medium |
| **V6** | Open Status Config page. | B | "Running" toggle removed from `ALL_STATUSES`. Existing localStorage `enabledStatuses` containing `"running"` does not error; the column simply doesn't render. | Low |
| **V7** | Render an OrderCard for a prepaid + status-7 order. | C | Green PAID badge visible. No HOLD badge. | High |
| **V8** | Render an OrderCard for a prepaid + status-8 order (test injection). | C | HOLD badge visible (warm orange). No PAID badge. | High |
| **V9** | Render an OrderCard for a postpaid + status-8 order (test injection). | C | HOLD badge visible. No PAID badge. | High |
| **V10** | Render a TableCard for a prepaid + status-8 order (test injection). | C | Header pill shows HOLD (warm orange). No PAID. No `{currencySymbol}{table.amount}`. | High |
| **V11** | Open Audit Report → Hold tab on a date with one or more status-8 orders. | D | Status-8 rows appear in Hold tab. Status column shows existing amber "On Hold" badge. (Or warm-orange explicit HOLD pill if D.4 is implemented.) | High |
| **V12** | Open Audit Report → Running tab on the same date. | D | Status-8 rows do NOT appear in Running tab. Pre-existing Running rows (status 1/2/5/7) intact. | High |
| **V13** | Open Audit Report → Hold tab — verify pre-existing fStatus=9 / paylater rows still appear. | D | No regression on existing Hold members. | High |
| **V14** | Open Audit Report → Audit tab on the same date. | D | Status-8 rows do NOT appear in Audit tab (CR-001 audit-fall-through preserved — they're Hold, not Audit). | High |
| **V15** | Trigger `make-order-unpaid` (CR-003 Endpoint B) on a paid order. | D + cross-CR | Backend emits a non-8 active status (per BE-Q1 closure). Order arrives via socket and lands on the dashboard normally. CR-003 OQ-C2 contract preserved. | High |
| **V16** | Trigger an `update-order-status` socket frame for an existing dashboard order with new status = 8. | A + B | The L1 guard does NOT short-circuit `update-order-status` (it's not an insertion event). The order's `fOrderStatus` flips to 8 in OrderContext via `updateOrder`. Phase B's `statusMatchesFilter` then hides the card from the dashboard. (Defence in depth.) Optional: order may need to surface in Audit Report Hold tab on next refetch. | Medium |
| **V17** | OrderEntry deep-link `/order/:id` for a status-8 order. | C (negative test) | Page loads normally. Action buttons gated by CR-007 prepaid rule. **No HOLD label rendered in OrderEntry** (out-of-scope per OQ-3). | Low |
| **V18** | Multi-terminal: terminal A on dashboard, terminal B triggers a scan-new-order with status-8. | A | Terminal A's dashboard does NOT show the new order. Both terminals consistent — both skip insertion via L1. | Medium |
| **V19** | Lint + build. | All phases | Clean. No new warnings. | High |
| **V20** | Regression: open the Audit Report on `9-may` live data without status-8 rows. | D | All previously-Hold orders still present. Running tab unchanged for non-8 rows. No row silently dropped. | High |

**Tests OMITTED (per owner closures):**
- Transition-back fallback test (OQ-5 closed — owner asserts natural flow handles it via fresh insertion events).
- OrderEntry HOLD label test (OQ-3 closed — out of scope).

**Test files to add under `__tests__/`:**
- `__tests__/api/socket/handleScanNewOrder.test.js` (V1)
- `__tests__/api/socket/handleNewOrder.test.js` (V2, V3)
- `__tests__/pages/DashboardPage.statusFilter.test.js` (V4)
- `__tests__/components/cards/OrderCard.holdBadge.test.js` (V7, V8, V9)
- `__tests__/components/cards/TableCard.holdBadge.test.js` (V10)
- `__tests__/pages/AllOrdersReportPage.tabFilters.test.js` (V11, V12, V13, V14)
- `__tests__/api/services/reportService.priorityChain.test.js` (V11 / D.3 unit)

---

## 10. Risks and mitigations

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| **R-1** | Status-8 order silently lost — operator cannot Print KOT / Move to Pay / Cancel from the Hold tab. | Medium | Audit Report Hold tab is the single recovery surface. CR-003 already provides "Collect Bill from Hold" button per row (CS-A1 / OQ-A1). Operator workflow: Audit Report → Hold tab → row → Collect Bill modal. **Verify in V11 + V15 that the action affordances are reachable.** |
| **R-2** | Mark-Unpaid round-trip break (CR-003 OQ-C2). | Low | BE-Q1 closed: post-flip status ≠ 8. POS2-005's L1 guard does NOT short-circuit Mark-Unpaid'd orders. **Validate in V15.** |
| **R-3** | CR-001 audit-fall-through regression (status-8 falls back to `'audit'` instead of landing in Hold). | Medium | Phase D.3 widens the existing Hold rule (rule 4) to include status-8 BEFORE the running fall-through (rule 8) and BEFORE the audit fallback (rule 9). Order preserved. **Validate in V14.** |
| **R-4** | CR-007 prepaid action-button gating regression. | Low | OrderCard / TableCard predicates for Merge / Table-Shift action buttons are independent of POS2-005 changes. Status-8 cards are hidden anyway (Phase B). OrderEntry retains its prepaid gate. **Validate in V17.** |
| **R-5** | localStorage `mygenie_enabled_statuses` containing `"running"` causes UI glitch after Phase B.4. | Low | `enabledStatuses.includes(statusId)` tolerates extra values; no error. **No migration required.** Verify in V6. |
| **R-6** | Header pill count UI break after Phase B.5 (orphan zero or layout shift). | Low | Inspect `Header.jsx` after pill removal; ensure container does not render an empty pill slot. Quick visual test. |
| **R-7** | Deploy race: build with Phase A NOT YET PROPAGATED but Phase B PROPAGATED, status-8 enters context but is hidden by filter. Order is in OrderContext but invisible. | Low | Phase B is defence-in-depth — filter hides the card. Operator unaware of the order until the next page refresh / build catches up. Acceptable. **Document.** |
| **R-8** | Backend changes the `f_order_status` semantic for `8` (e.g., re-uses 8 for a different state in a future sprint). | Low | Out of POS2-005 scope. If BE re-uses 8, a new CR is required to revisit the rule. |
| **R-9** | Audit Report Hold tab not socket-subscribed — operator on Audit page does not see new status-8 orders live until refresh. | Low | Existing Audit Report architecture limitation (also true for paylater + status-9 today). Not a POS2-005 regression. **Document as known limitation.** |
| **R-10** | OrderTable.jsx existing amber "On Hold" badge (Status column) and proposed warm-orange HOLD pill (dashboard cards) use different colors → visual inconsistency. | Low | Owner OQ-6 closure accepts the current proposal. If owner / QA flag the inconsistency in V11, unify by adopting warm-orange in `getStatusBadgeStyle` for the `hold` case. Out of scope for MVP unless explicitly flagged. |

---

## 11. Implementation Agent prompt draft

> Copy/adapt the block below when invoking the next agent.

```
SPRINT: pos2.0
TASK TYPE: Implementation (POS2-005 Phase A → E)
CR ID: POS2-005
TITLE: f_order_status=8 Hold/Audit Reroute

Implementation handover (read this first, end-to-end):
`/app/memory/change_requests/implementation_handover/POS2_005_F_STATUS_8_HOLD_REROUTE_IMPLEMENTATION_HANDOVER_2026_05_08.md`

Mandatory reading order before any code edit:
1. `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
2. `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
3. The implementation handover (above) — sections 1 through 11.
4. The primary planning doc:
   `/app/memory/change_requests/impact_analysis/POS2_005_F_STATUS_8_HOLD_REROUTE_CR_IMPACT_ANALYSIS_2026_05_08.md`
5. POS2-004 investigation source-correction addendum:
   `/app/memory/change_requests/impact_analysis/POS2_004_F_STATUS_8_HOLD_PAID_DASHBOARD_INVESTIGATION_2026_05_08.md` §16

Locked owner rules (verbatim):
R1: f_order_status = 8 must route to Hold/Audit (Audit Report Hold tab) and show HOLD label.
R2: f_order_status = 8 must NOT show on running dashboard (channel view AND status view).
R3: PAID tag shows iff paymentType === 'prepaid' AND fOrderStatus !== 8.

HOLD-label scope (locked):
- Dashboard cards: status-8 only.
- Audit Report Hold tab rows: all 3 members (8, 9, paylater) — existing amber Status badge already handles this; add explicit warm-orange pill only if owner/QA flags during validation.
- OrderEntry: out of scope.

Implementation phases (commit-by-commit):
A. Socket guards — `handleScanNewOrder` + `handleNewOrder` (api/socket/socketHandlers.js)
B. Dashboard exclusion — `DashboardPage.jsx`, `constants.js` (STATUS_COLUMNS), `StatusConfigPage.jsx`, `Header.jsx`
C. Card-level PAID suppression + HOLD label — `OrderCard.jsx`, `TableCard.jsx`
D. Audit Report Hold routing — `AllOrdersReportPage.jsx`, `reportService.js` (priority chain)
E. Tests — under __tests__/ per §9 of the handover

Forbidden zones:
- /app/memory/final/* (final-doc revisions deferred)
- Backend contracts / endpoints / socket message shapes
- Billing / GST / service tax / delivery
- POS2-002, POS2-003, payment collection logic, prepaid settlement endpoints
- OrderEntry HOLD label
- F_ORDER_STATUS numeric mapping (preserved); only STATUS_COLUMNS row 8 removed
- Network-layer filters (filter only at addOrder call sites)

Validation:
After each phase: `cd /app/frontend && yarn lint`. After all phases: webpack compile must succeed.
Validation matrix V1-V20 in §9 of the handover. Skip OQ-5 (transition-back) and OQ-3 (OrderEntry HOLD) tests — owner closed them.

Documentation deliverables (post-implementation):
1. `change_requests/implementation_summaries/POS2_005_F_STATUS_8_HOLD_REROUTE_IMPLEMENTATION_SUMMARY.md`
2. `change_requests/qa_reports/POS2_005_F_STATUS_8_HOLD_REROUTE_QA_REPORT.md`
3. Do NOT update /app/memory/final/* in this task.

Stop after Phase E + documentation. Do NOT update /app/memory/final/.
```

---

## 12. Final verdict

> ## **`ready_for_implementation`**

- All locked owner rules + closed OQs documented in §4.
- File-by-file implementation plan complete with verified line numbers (§6).
- Commit-by-commit phase sequence (§7).
- 20-item validation checklist with severity gating (§9).
- Risk matrix with mitigations (§10).
- Implementation Agent prompt draft (§11).
- No baseline conflict, no unresolved BE/owner question, no code drift detected.
- Defer `/app/memory/final/*` revision per playbook (post-acceptance).

**Implementation Agent may begin from §6 Phase A.1 immediately.**

— End of POS2-005 Implementation Handover 2026-05-08 —
