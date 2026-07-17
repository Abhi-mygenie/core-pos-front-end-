# POS2-004 — f_order_status = 8: Dashboard Visibility, HOLD/Audit Routing, PAID Tag (Combined Investigation)

> **Sprint:** pos2.0
> **Item ID:** POS2-004
> **Type:** Combined Business Logic + Regression Investigation (read-only, no code change)
> **Date:** 2026-05-08
> **Branch:** `9-may` (cloned to `/app` 2026-05-08)
> **Final verdict:** **`baseline_conflict_needs_owner_decision`**

---

## 1. Executive summary

Owner observed: an order with `f_order_status = 8` is showing on the running dashboard with a green **PAID** tag, is **not** visible in Hold/Audit, and shows **no HOLD label**. Owner expects status-8 orders to be routed to Audit/Hold with a HOLD label.

**Findings against baseline + current code:**

1. **`f_order_status = 8` means `'running'`** ("Active/Unpaid" — order placed, items in progress, money not yet collected). This mapping is canonical in `api/constants.js:133-144`, declared as a column in `STATUS_COLUMNS` (`api/constants.js:165`), shipped in CR-001 as part of the running-set `{0,1,2,4,5,7,8}`, and re-confirmed in `BUG_CANCEL_DERIVATION_HANDOVER.md:429`.
2. **Current code routes status-8 to the Live Dashboard's "Running" surface, NOT to Hold/Audit.** Channel view's `statusMatchesFilter` includes `'running'` in `activeStatuses` by default (`pages/DashboardPage.jsx:364, 722-735`). Hold tab is keyed on `fOrderStatus === 9 OR payment_method === 'paylater'` (`pages/AllOrdersReportPage.jsx:83-84`, `api/services/reportService.js:683-685`). **No code path moves `f_order_status = 8` to Hold or shows a HOLD label on a status-8 card.**
3. **The green PAID tag is driven solely by `order.paymentType === 'prepaid'`** (`components/cards/OrderCard.jsx:329-331`, `components/cards/TableCard.jsx:244-245`). It is **not** tied to `payment_status`, `f_order_status`, or the `update-order-paid` socket. Any prepaid order — regardless of `f_order_status` or `payment_status` — renders the PAID badge.
4. **The owner's recalled "earlier HOLD/Audit logic for f_order_status = 8" has no evidence of ever shipping** in baseline, overlay, CRs, or current code. The earlier 2026-05-07 regression-check (`F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md`) and today's 2026-05-08 validation (`POS2_004_F_ORDER_STATUS_8_VALIDATION_REPORT_2026_05_08.md`) both reached the same conclusion against an earlier owner recall. No CR, no QA report, no implementation summary, no test, no removed-code comment trail referencing such a rule was found.

**Net classification (per the six-option list in the task):**

| Aspect | Classification |
|---|---|
| Dashboard shows `f_order_status = 8` | **expected behavior** — channel view default includes `'running'`; CR-001 widened the running set to include 8 |
| PAID tag on a prepaid status-8 order | **expected behavior** — single-condition badge, prepaid ⇒ PAID, by design |
| No HOLD label on status-8 card | **expected behavior** — HOLD belongs to the Audit Report Hold tab and its rule is `fStatus===9 OR paylater`; no code path renders HOLD on a dashboard card |
| "Earlier HOLD/Audit logic for status-8 has regressed" | **NOT a regression** — the rule has no historical record of shipping; this is a `baseline_conflict_needs_owner_decision` |

The combined verdict is therefore **`baseline_conflict_needs_owner_decision`**: the owner's expected behavior contradicts the documented baseline (CR-001 + `STATUS_COLUMNS` contract) and current code. No fix can be planned until the owner either (a) accepts the documented baseline or (b) explicitly approves a new CR to re-route prepaid + status-8 orders into Hold/Audit and add a card-level HOLD label.

---

## 2. Docs read (mandatory order)

### 2.1 `/app/memory/final/`
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `ARCHITECTURE_DECISIONS_FINAL.md`
- `MODULE_DECISIONS_FINAL.md`
- `CHANGE_REQUEST_PLAYBOOK.md`
- `IMPLEMENTATION_AGENT_RULES.md`
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `FINAL_DOCS_SUMMARY.md`

Greps run on `/app/memory/final/`:
```
grep -niE "f_order_status|fOrderStatus|status.*8|Hold|paylater|prepaid|paid tag|paid label" *.md
```
Result: **no `f_order_status = 8 → Hold` rule** in any final doc. The only Hold-relevant reference is `MODULE_DECISIONS_FINAL.md:439` which lists "paid/cancelled/credit/hold reports" as an Audit Report module concern (not a dashboard rule).

### 2.2 Overlay docs
- `change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `change_requests/PENDING_TASK_REGISTER_2026_05_04.md`
- `change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `change_requests/LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`

No overlay row asserts a status-8 → Hold rule, a status-8 → Audit rule, or a card-level HOLD label.

### 2.3 CR-specific / current-state
- `change_requests/CR_001_all_orders_status_derivation.md`
- `change_requests/CR_001_AUDIT_SRM_BADGE_FIX.md`
- `change_requests/CR_002_unify_status_and_tab_logic.md`
- `change_requests/CR_003_paid_hold_order_actions.md`
- `change_requests/CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md`
- `change_requests/CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md`
- `change_requests/CR_QA_CONSOLIDATION_AND_CLASH_MATRIX_2026_05_03.md`
- `change_requests/implementation_summaries/CR_001_IMPLEMENTATION_SUMMARY.md`
- `change_requests/qa_reports/CR_001_QA_REPORT.md`
- `change_requests/qa_handover/CR_001_QA_HANDOVER.md`
- **`change_requests/impact_analysis/F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md`** (2026-05-07) — earlier same-topic investigation
- **`change_requests/qa_reports/POS2_004_F_ORDER_STATUS_8_VALIDATION_REPORT_2026_05_08.md`** (today, earlier) — earlier same-topic validation
- `current-state/API_USAGE_MAP.md`, `current-state/CURRENT_ARCHITECTURE.md`, `current-state/MODULE_MAP.md`

### 2.4 Code (read-only)
- `frontend/src/api/constants.js` (lines 132-184 — F_ORDER_STATUS, STATUS_COLUMNS, ORDER_TO_TABLE_STATUS)
- `frontend/src/api/transforms/orderTransform.js` (mapOrderStatus / mapTableStatus / fromAPI.order)
- `frontend/src/api/services/orderService.js` (getRunningOrders / fetchSingleOrderForSocket / completePrepaidOrder)
- `frontend/src/api/services/reportService.js` (lines 660-714 — status priority chain; lines 175-188 — REPORT_HOLD_ORDERS endpoint)
- `frontend/src/api/socket/socketHandlers.js` (lines 200-298 — handleOrderDataEvent; lines 366-417 — handleUpdateOrderStatus)
- `frontend/src/api/socket/useSocketEvents.js`
- `frontend/src/contexts/OrderContext.jsx` (lines 155-185 — derived dineIn/takeAway/delivery/walkIn selectors)
- `frontend/src/pages/DashboardPage.jsx` (lines 220-242, 364, 714-771, 859-883 — visibility gates)
- `frontend/src/pages/StatusConfigPage.jsx` (lines 90-110 — DEFAULT_ENABLED)
- `frontend/src/pages/AllOrdersReportPage.jsx` (lines 71-103 — TAB_FILTERS hold/running/paid/audit)
- `frontend/src/components/cards/OrderCard.jsx` (lines 329-331 — PAID badge)
- `frontend/src/components/cards/TableCard.jsx` (lines 244-245 — PAID badge)
- `frontend/src/components/layout/Header.jsx` (status pill row)
- `frontend/src/utils/statusHelpers.js`

---

## 3. Baseline / overlay findings

| Source | What it says about `f_order_status = 8` | Direction |
|---|---|---|
| `final/MODULE_DECISIONS_FINAL.md:70, 90, 443, 553` | Lists "running orders" as a concern of the dashboard module — does **not** define a status-8 → Hold rule. | Neutral |
| `change_requests/CR_001_all_orders_status_derivation.md:232` | "Paylater is tied to `f_order_status === 9` — Confirmed and verified in code". | **Hold ↔ 9, not 8.** |
| `change_requests/implementation_summaries/CR_001_IMPLEMENTATION_SUMMARY.md:43` | "Audit fall-through fix: added `running` rule for `f_order_status ∈ {0,1,2,4,5,7,8}` so true running orders are no longer routed to Audit." | **Status-8 explicitly whitelisted into Running, away from Audit.** |
| `change_requests/qa_reports/CR_001_QA_REPORT.md:64-66` | "Hold tab filter: `f_order_status===9` OR `payment_method==='paylater'` (case-insensitive); paylater NOT in Unpaid/Running" — **Passed**. | **Hold = 9 / paylater. Status-8 is Running.** |
| `change_requests/CR_003_paid_hold_order_actions.md:199` | OQ-C2: on Mark Unpaid flip, the order **re-surfaces as a running order on the dashboard**. | Confirms status-8 belongs on the dashboard, not Hold. |
| `change_requests/impact_analysis/F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md` (2026-05-07) | After exhaustive grep across `/app/memory/**` and `/app/frontend/src/**`: "No baseline rule mentioning Razorpay-conditional fOrderStatus-8 exclusion. No CR or implementation summary recording such a fix shipping. No regression test. No comment / TODO / removed-block trace." Verdict: **`owner_rule_needs_confirmation`**. | **No prior shipped rule.** |
| `change_requests/qa_reports/POS2_004_F_ORDER_STATUS_8_VALIDATION_REPORT_2026_05_08.md` (today) | Verdict: **`behavior_as_expected`** — system handles `f_order_status = 8` consistently per CR-001 + STATUS_COLUMNS contract. | **Confirmed not a defect.** |
| `change_requests/CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md` | About `payment_type` case-canonicalisation (Prepaid/PREPAID/postpaid). Does **not** touch fOrderStatus-8 visibility. | Neutral. |

**Direct evidence that the recalled rule did NOT ship:** three independent doc citations (CR-001 IMPL, CR-001 QA, CR-003 OQ-C2) all confirm status-8 belongs on the running dashboard, not in Hold.

---

## 4. Previous CR / QA evidence on this exact topic

Two prior investigations (both authored before this report) reached aligned conclusions:

| Doc | Date | Verdict |
|---|---|---|
| `impact_analysis/F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md` | 2026-05-07 | `owner_rule_needs_confirmation` — recalled rule absent from code and docs |
| `qa_reports/POS2_004_F_ORDER_STATUS_8_VALIDATION_REPORT_2026_05_08.md` | 2026-05-08 (earlier today) | `behavior_as_expected` — `no CR needed` unless owner explicitly approves a behavior change |

This is the **third** time the owner has surfaced essentially the same expectation against the same documented baseline. There is no new code change, no new CR, no new commit, and no new QA evidence between yesterday's `behavior_as_expected` verdict and today's renewed observation. The current report is the consolidated combined-investigation form requested under POS2-004.

---

## 5. Meaning of `f_order_status = 8`

### 5.1 Numeric → key map (`/app/frontend/src/api/constants.js:132-157`)

```js
export const F_ORDER_STATUS = {
  1: 'preparing',
  2: 'ready',
  3: 'cancelled',
  // 4: reserved for future development
  5: 'served',
  6: 'paid',
  7: 'pending',          // YTC
  8: 'running',          // ← here
  9: 'pendingPayment',
  10: 'reserved',
};

export const F_ORDER_STATUS_API = {
  // PascalCase API labels — 8 → 'running' (see comment "Running (Active/Unpaid)")
  ...
  8: 'running',
  ...
};
```

### 5.2 STATUS_COLUMNS (`api/constants.js:161-171`)

```js
{ id: 8, fOrderStatus: 8, name: 'Running', key: 'running' }
```

→ Status 8 has its own column ("Running") in the by-status dashboard layout.

### 5.3 ORDER_TO_TABLE_STATUS (`api/constants.js:174-184`)

```js
running: 'occupied',
```

→ Tables with a status-8 order render with the "occupied" table-card status.

### 5.4 Operational semantics

> **Status 8 = "Active/Unpaid Running"** — order has been placed, items are in progress, but the bill has not yet been collected. (See `utils/statusHelpers.js:80` — comment: `running: 5, // fOrderStatus 8 — active but not urgent`.)

### 5.5 Status maps to Hold? Audit? Pending? Paid? Completed? Cancelled?

| Bucket | Mapped from `f_order_status = 8`? |
|---|---|
| Hold | **NO.** Hold key = `fStatus === 9 OR paymentMethod === 'paylater'` (CR-001 CS-1, `AllOrdersReportPage.jsx:83-84`). |
| Audit | **NO.** Audit key = `_isMissing === true OR status === 'audit'` (CR-001 CS-3 widened the running rule to absorb status 8). |
| Pending (YTC) | **NO.** Pending = `fStatus === 7`. |
| Paid | **NO.** Paid = `fStatus === 6` (`AllOrdersReportPage.jsx:71-78`, also rendered on the cards via the `paymentType === 'prepaid'` BADGE — but that's a label, not a status remap). |
| Completed (settled) | **NO.** Completed states are `fStatus ∈ {3, 6}`. |
| Cancelled | **NO.** Cancelled = `fStatus === 3 OR paymentMethod === 'Cancel'`. |
| Running | **YES.** This is the canonical mapping. |

### 5.6 Frontend normalisation

`api/transforms/orderTransform.js:25-30`:
```js
const mapOrderStatus = (fOrderStatus) => F_ORDER_STATUS[fOrderStatus] || 'unknown';
```
→ Status-8 normalises to `'running'`. There is **no override path** that re-keys status-8 to Hold or Audit based on `payment_status`, `payment_type`, `payment_method`, `razorpay_order_id`, or any other predicate.

`api/services/reportService.js:660-714` (Audit Report transform priority chain) similarly lands status-8 on `status = 'running'` whenever the row is not Cancel / Merge / TAB / Hold(=9 or paylater) / TransferToRoom / unpaid.

---

## 6. Current dashboard visibility logic

### 6.1 Two layouts, two gates

**A. Channel-grouped layout (Dine-In / TakeAway / Delivery / Room tabs — the layout the owner is viewing.)**

`pages/DashboardPage.jsx:714-736`:
```js
const statusMatchesFilter = (item) => {
  if (!item.order && !item.fOrderStatus) return true;
  const fOrderStatus = item.order?.fOrderStatus || item.fOrderStatus;
  if (!fOrderStatus) return true;
  const statusMap = {
    7: 'pending', 1: 'preparing', 2: 'ready', 8: 'running',
    5: 'served', 9: 'pendingPayment', 6: 'paid', 3: 'cancelled', 10: 'reserved',
  };
  const statusId = statusMap[fOrderStatus];
  return statusId ? activeStatuses.includes(statusId) : true;
};
```

`pages/DashboardPage.jsx:364`:
```js
const [activeStatuses, setActiveStatuses] = useState([
  "pending","preparing","ready","running","served",
  "pendingPayment","paid","cancelled","reserved",
]);
```

→ **`'running'` is included by default → status-8 cards are SHOWN by default in channel view.**

**B. Status-grouped layout (status columns)**

`pages/DashboardPage.jsx:220-242`:
```js
const [enabledStatuses, setEnabledStatuses] = useState(() => {
  // localStorage 'mygenie_enabled_statuses' OR DEFAULT_ENABLED
});
```

`pages/StatusConfigPage.jsx:109-110`:
```js
const DEFAULT_ENABLED = ["pending", "preparing", "ready", "served"];
// status 7, 1, 2, 5 only — 'running' (8) is NOT in the default list
```

→ In the status-grouped layout, the "Running" column is **hidden by default**, but the operator can enable it via Status Config. This is a **default-off visibility config**, not a status remap; the underlying order is still classified as `'running'`.

### 6.2 Where `f_order_status = 8` cards come from

| Source | Includes status-8? | Notes |
|---|---|---|
| `getRunningOrders` (`/api/v1/.../employee-orders-list?role_name=...`) | Backend-dependent — earlier observed to **exclude** status-8 (see POS2-004 validation report, 2026-05-08, §3.4). May have changed. | Backend filter is outside our scope. |
| `fetchSingleOrderForSocket` (`/api/v2/.../get-single-order-new`) | **Yes** — returns the raw row regardless of `f_order_status`. | Used by socket handlers. |
| `update-order` / `update-order-paid` / `update-order-target` / `update-order-source` socket | **Yes** — payload contains the order; transformed and added to OrderContext via `updateOrder` (unless terminal). | See §10. |
| `addOrder` from `new-order` socket | **Yes** — appends to OrderContext. | See §10. |

**→ The order the owner is observing most likely entered the dashboard via a socket path (new-order, update-order, or update-order-paid), or because backend has lifted the previously observed `f_order_status = 8` exclusion on the running-orders endpoint. Either way, FE behavior is correct: status-8 belongs on the dashboard per the documented baseline.**

---

## 7. Current Hold / Audit / pending-hold routing logic

There is **no Hold/Audit area on the Live Dashboard.** The Hold and Audit tabs live entirely on the Audit Report page (`pages/AllOrdersReportPage.jsx`).

### 7.1 Audit Report `TAB_FILTERS` (`pages/AllOrdersReportPage.jsx:71-103`)

```js
hold: (o) =>
  o.paymentMethod?.toLowerCase() === 'paylater' || o.fOrderStatus === 9,

running: (o) => {
  // CS-3: paylater / fOrderStatus === 9 belong in Hold, not Running
  if (o.paymentMethod?.toLowerCase() === 'paylater') return false;
  if (o.fOrderStatus === 9) return false;
  return o.status === 'running' || o.paymentStatus === 'unpaid' || o.transferToRoom === true;
},

paid: (o) =>
  o.fOrderStatus === 6 && o.paymentMethod?.toLowerCase() !== 'paylater',
```

→ **Status-8 falls into the `running` tab, NOT `hold` and NOT `paid`.** A status-8 order will surface in:
- **Audit Report → All Orders** ✅
- **Audit Report → Running** ✅
- **Audit Report → Hold** ❌ (rule excludes 8)
- **Audit Report → Audit** ❌ (status-8 is not classified as audit)

### 7.2 Hold orders endpoint (`api/services/reportService.js:175-188`)

```js
REPORT_HOLD_ORDERS: '/api/v2/vendoremployee/paid-paylater-order-list',
```
→ This is a separate backend endpoint scoped to paylater/hold orders. It is **not** the source for status-8 orders.

### 7.3 Pending Pay column (Live Dashboard status-view)

`api/constants.js:167`: `{ id: 9, fOrderStatus: 9, name: 'Pending Payment', key: 'pendingPayment' }`.

→ Pending Pay column is keyed on `fStatus === 9`. Status-8 does **not** route there.

### 7.4 Conclusion on §7

**No code path moves `f_order_status = 8` to Hold, Audit, or Pending Pay.** This is the documented and shipped baseline (CR-001 CS-1 + CS-3, validated in CR-001 QA report passed). The owner's expectation contradicts this baseline.

---

## 8. Current HOLD label logic

### 8.1 Where "HOLD" text appears in the codebase

Greps across `frontend/src/components/`, `pages/`, `contexts/`, `api/`:

| File | Match | Surface |
|---|---|---|
| `pages/AllOrdersReportPage.jsx:71-103` | `hold` tab filter, `Hold` tab label | Audit Report tabs only |
| `api/services/reportService.js:175-188, 672-685` | `REPORT_HOLD_ORDERS` endpoint, `hold` rule in priority chain | Audit Report only |
| `api/transforms/reportTransform.js:283` | `paid-paylater-order-list` transform | Audit Report only |
| `api/constants.js:72` | `REPORT_HOLD_ORDERS` constant | Endpoint constant |

**There is NO card-level HOLD label in `OrderCard.jsx`, `TableCard.jsx`, `pages/DashboardPage.jsx`, or any dashboard component.** The HOLD concept exists only as the Audit Report Hold tab — not as a per-card pill.

### 8.2 Why no HOLD label on the observed status-8 card

Because the dashboard never renders a HOLD label on any card. The HOLD concept is scoped to the Audit Report page. The observed card is correctly missing a HOLD label per current code.

If the owner expected a card-level HOLD label, **that label has never existed in shipped code** for any `f_order_status` value (including 9 and paylater). A new CR would be required to introduce it.

---

## 9. Current PAID tag derivation logic

### 9.1 OrderCard (`components/cards/OrderCard.jsx:328-331`)

```jsx
{order.paymentType === 'prepaid' && (
  <span data-testid={`prepaid-badge-${orderId}`} ... >PAID</span>
)}
```

### 9.2 TableCard (`components/cards/TableCard.jsx:242-248`)

```jsx
{table.status === "reserved" ? (
  <span ...>Reserved</span>
) : table.paymentType === 'prepaid' ? (
  <span ... >PAID</span>           {/* ← single-condition badge */}
) : table.amount ? (
  <span ...>{currencySymbol}{table.amount.toLocaleString()}</span>
) : null}
```

### 9.3 Field used / fields NOT used

| Field | Used by PAID badge? |
|---|---|
| `order.paymentType === 'prepaid'` | **Yes — sole condition.** |
| `order.paymentStatus` (`'paid'` / `'unpaid'` / `'pending'`) | **No.** |
| `order.fOrderStatus === 6` | **No.** (Status 6 is the Paid column in by-status view; that's a layout-grouping concern, not the card badge.) |
| `order.paymentMethod` | **No.** |
| `update-order-paid` socket payload | **No** — does not directly set the badge; it only updates the order's fields, and the badge re-renders from `paymentType`. |
| `razorpay_order_id` / `isPaymentGateway` | **No.** |

### 9.4 So why is the PAID tag showing on this status-8 order?

> **Because `order.paymentType === 'prepaid'`.** Per `api/transforms/orderTransform.js`, `paymentType` is derived directly from `payment_type` in the API payload. The earlier POS2-004 validation report (2026-05-08, §3.1-3.2) confirmed order #825648 has `payment_type: 'prepaid'` in both `/get-single-order-new` and `/order-logs-report` — which is exactly the trigger.

**The PAID tag is NOT showing because the order is paid.** It's showing because the order is **prepaid** (i.e., the customer pre-paid via an upstream channel — Razorpay, walk-in prepayment, or any other prepayment-typed flow).

This is consistent with shipped behavior since CR-007 BUG-PREPAID-MERGE-SHIFT and CR-011 (`payment_type` case-canonicalisation): "prepaid" is treated as "money already collected" for badge / action-button gating.

### 9.5 Is "prepaid" responsible for the PAID tag?

**Yes — directly and solely.** No other condition (payment_status, fOrderStatus, payment_method, socket event) participates in the PAID badge render. If `paymentType === 'prepaid'`, the badge renders; otherwise it does not.

### 9.6 PAID tag vs. HOLD status — independent?

**Yes, fully independent.** PAID badge is keyed on `paymentType`. HOLD-tab membership is keyed on `fOrderStatus === 9 OR paymentMethod === 'paylater'`. There is **no card-level HOLD label** anywhere. The two concerns do not interact in any rendering path.

---

## 10. Socket / update-order behavior for status = 8

### 10.1 Which socket events route a status-8 payload to the dashboard

`api/socket/useSocketEvents.js` registers the following handlers:

| Event | Handler | Behavior for status-8 |
|---|---|---|
| `new-order` | `handleNewOrder` (calls `addOrder`) | Adds the order to OrderContext. Status-8 lands as `dineIn`/`takeAway`/`delivery`/`walkIn` per `orderType`. |
| `update-order` | `handleOrderDataEvent` (lines 200-298) | If `order.status` ∈ `{paid, cancelled}` → `removeOrder`. Else → `updateOrder` (status-8 falls into "else"). |
| `update-order-target` | same | Same + table-change detection. |
| `update-order-source` | same | Same. |
| `update-order-paid` | same | **Same.** `update-order-paid` is **not** a "remove" event for status-8. |
| `update-order-status` | `handleUpdateOrderStatus` (lines 366-417) | Re-fetches via `fetchSingleOrderForSocket`, then `removeOrder` on terminal, else `updateOrder`. Status-8 is not terminal. |

### 10.2 Key terminal-state rule (`socketHandlers.js:271`)

```js
const isTerminal   = (order.status === 'cancelled' || order.status === 'paid');
const shouldRemove = isTerminal;
```

→ `'running'` (status 8) is **NOT terminal** → order is **kept on the dashboard** after any update event, including `update-order-paid`.

### 10.3 What `update-order-paid` does NOT do for a status-8 order

- It does **NOT** remove the order from the dashboard.
- It does **NOT** flip `f_order_status` from 8 to anything else (the FE consumes whatever `f_order_status` the backend sends in the v2 payload).
- It does **NOT** set the PAID tag explicitly — the tag re-derives from `paymentType` only.
- It does **NOT** route the order to Hold/Audit.

### 10.4 Asymmetry observed (per POS2-004 validation report 2026-05-08, §6.5)

> "`socket new-order` event: appends to OrderContext via `addOrder`. If a backend-side socket emission includes a status=8 order, it would land in the FE OrderContext directly (bypassing the RUNNING_ORDERS endpoint exclusion)."

This is the most likely explanation for why the owner now sees a status-8 order on the dashboard while the earlier validation noted backend's `employee-orders-list` was excluding status-8 rows. Sockets are a separate feed and have always been able to introduce status-8 orders.

### 10.5 Required payload sample to fully confirm

For a 100% trace, the next investigator (or backend owner) should capture, for the offending order:
1. The raw `new-order` / `update-order` / `update-order-paid` socket frame (full message array including the `{orders: [...]}` payload).
2. The `/employee-orders-list` response on the same business day with the order present (or absent) and its `f_order_status` value.
3. The `/get-single-order-new` response for that order ID showing `f_order_status`, `payment_status`, `payment_type`, `payment_method`.

Without these, the answer to "did this order arrive via REST or socket" is `unclear_needs_payload` — but **it does not change the FE behavior verdict** because in both paths status-8 is treated as `'running'` per documented baseline.

---

## 11. Root cause / likely root cause

### 11.1 The three observed symptoms

| Symptom | Root cause |
|---|---|
| Status-8 order visible on running dashboard | **Per documented baseline** — channel view's `activeStatuses` default includes `'running'`; CR-001 CS-3 widened the running set to absorb status-8. The order entered OrderContext via either the running-orders REST fetch (if backend now includes status-8) or a socket event (`new-order` / `update-order*`). |
| Green PAID tag shown | **Per documented baseline** — `paymentType === 'prepaid'` is the sole trigger. The order is prepaid; therefore the badge renders. Independent of `payment_status`, `f_order_status`, and any socket event. |
| Order NOT visible in Hold / Audit | **Per documented baseline** — Hold is keyed on `fStatus === 9 OR paymentMethod === 'paylater'` (CR-001 CS-1). Audit is keyed on `_isMissing OR status === 'audit'` (CR-001 CS-3 explicitly removed status-8 from Audit). Status-8 lands in the Audit Report **Running** tab, not Hold and not Audit. |
| HOLD label missing on the card | **Per documented baseline** — there is no card-level HOLD label anywhere in the dashboard codebase, for any `f_order_status` value. HOLD is exclusively an Audit Report tab. |

### 11.2 Owner's recalled rule vs. evidence

| Owner's recall | Evidence |
|---|---|
| "Earlier we implemented: if `f_order_status = 8`, the order should go into Audit / Hold / pending-hold area and show a HOLD label." | **No evidence in baseline, overlay, CRs, or current code.** The earlier 2026-05-07 regression-check (`F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md`) and today's earlier validation (`POS2_004_F_ORDER_STATUS_8_VALIDATION_REPORT_2026_05_08.md`) both reached this conclusion independently. CR-001 IMPL §43, CR-001 QA §64, and CR-003 OQ-C2 all confirm the **opposite** rule shipped: status-8 belongs on the dashboard as Running. |

### 11.3 Likely true source of owner's recollection (best-effort hypotheses)

1. **`enabledStatuses` default in the status-view layout excludes "running"** (`StatusConfigPage.jsx:109-110`). This is the closest existing behavior to the recall — but it is unconditional (not Razorpay-conditional, not prepaid-conditional) and it does not apply to the channel view (which is the layout the owner is currently viewing).
2. **Backend may have previously excluded status-8 from `/employee-orders-list`** (observed in POS2-004 validation 2026-05-08, §3.4 — only 16 orders returned, none with status 8). If backend behavior changed, status-8 cards now reach the dashboard without an FE-side change. This is a **backend change**, not an FE regression.
3. **A discussed-but-not-implemented design proposal** (e.g., from a meeting or older sprint planning) that never reached code.
4. **Conflation with CR-007 BUG-PREPAID-MERGE-SHIFT** (which hides Merge / Table-Shift action buttons on prepaid orders) — that's an action-button rule, not a card-visibility rule.

None of these constitutes a regression of a previously shipped status-8 → Hold/Audit rule, because no such rule was ever shipped.

---

## 12. Classification

Per the task's six-option list:

| Aspect | Classification |
|---|---|
| Status-8 visible on running dashboard | **expected behavior** |
| Green PAID tag on prepaid status-8 order | **expected behavior** |
| Order NOT visible in Hold/Audit (Hold tab) | **expected behavior** |
| HOLD label missing on dashboard card | **expected behavior** (no such label has ever existed at card level) |
| "Earlier HOLD/Audit logic for status-8 has regressed" | **NOT a regression** — no historical evidence of shipping; this is a `baseline_conflict_needs_owner_decision`. Could optionally be re-classified as `incomplete earlier implementation` if the owner produces evidence the rule reached a non-shipped state (design draft, half-merged branch, etc.), but no such evidence has surfaced across two prior investigations. |
| Whether socket asymmetry causing the order to appear is a defect | **expected behavior** — sockets correctly add the order; non-terminal status-8 is correctly retained. If backend now serves status-8 from REST too, that's a backend question (could be `backend payload mismatch` from a separate angle, but the FE side is correct). |

**Combined verdict:** **`baseline_conflict_needs_owner_decision`**

> The owner's stated expected behavior contradicts the documented and shipped baseline (CR-001 CS-1 + CS-3, validated). FE code, baseline docs, and overlay docs are mutually consistent. Until the owner accepts the baseline OR explicitly approves a new CR to introduce a status-8 → Hold/Audit re-route plus a card-level HOLD label, no fix can be planned.

---

## 13. Minimal fix plan — only if owner approves a new CR (NOT a regression fix)

> **No minimal fix is recommended,** because no regression is confirmed. If the owner explicitly says "yes, change current shipped behavior so prepaid + status-8 orders move to Hold and show a HOLD label," that is a **new behavior change** — drafted here purely as a forecast of scope, **not as authorisation to implement.**

### 13.1 Owner-decision questions (must precede any change)

| # | Question | Why |
|---|---|---|
| Q1 | Should the status-8 → Hold rule apply to **all** status-8 orders, or only **prepaid** ones, or only **Razorpay-prepaid-but-unpaid** ones? | Three different scopes; very different impact surface. CR-003 OQ-C2 already documents that mark-unpaid → re-running is the intended round-trip. Hiding all status-8 would break that loop. |
| Q2 | Should the FE keep showing such orders elsewhere (e.g., a new "Pending Hold" pill, or move them to the existing `pendingPayment` (status-9) column), or hide them entirely from the dashboard? | Hiding entirely creates a silent in-flight order loss risk (operator cannot Print KOT / Move to Pay / Cancel). |
| Q3 | Should the change be FE-only, or coordinated with backend (so backend sets `f_order_status = 9` for these orders, removing the FE special-case entirely)? | Backend re-classification is the cleanest path and avoids a payment-state-conditional FE gate. |
| Q4 | Should the card-level HOLD label be introduced for all `f_order_status === 9` cards too, or only for the new status-8-in-Hold case? | Consistency vs. minimum-viable scope. |

### 13.2 Forecast scope (FE-only, post-approval)

Single-site change zones (NOT to be edited in this investigation):
- `pages/DashboardPage.jsx:714-736` — extend `statusMatchesFilter` with the prepaid-status-8 predicate.
- `pages/AllOrdersReportPage.jsx:83-84` — extend `TAB_FILTERS.hold` with the same predicate.
- `components/cards/OrderCard.jsx`, `components/cards/TableCard.jsx` — add a HOLD label render with a clear visual contract that does not visually conflict with the existing PAID badge.
- `pages/StatusConfigPage.jsx` — possibly add a "Hold" status pill / column.
- Tests under `__tests__/` — coverage on the predicate, mark-unpaid round-trip, OrderEntry recovery, sockets.

Cross-impact docs to revise (post-approval):
- `final/MODULE_DECISIONS_FINAL.md` (§10 Reports / Audit / Summary, §dashboard module)
- `change_requests/CR_001_*` (rule revision)
- `change_requests/CR_003_paid_hold_order_actions.md` (mark-unpaid re-surface contract)
- `change_requests/CR_007_*` BUG-PREPAID-MERGE-SHIFT interaction

### 13.3 Risks if the owner approves the change (forecast only)

- **Silent in-flight order loss** if the predicate is too broad and operators cannot reach an active order to Print KOT / Move to Pay.
- **Mark-Unpaid round-trip break** (CR-003 OQ-C2): post-flip order is documented to re-surface as Running on the dashboard. A status-8 → Hold rule would silently break this loop.
- **Race with backend webhook**: a Razorpay payment webhook flipping the order to status 6 could lag — operator may briefly see the order in Hold even after payment is complete.
- **Auditor confusion**: dashboard shows the order in Hold but Audit Report Running tab still shows it as Running, unless both surfaces are updated atomically.

---

## 14. Validation checklist (for the next investigator / owner — only if the owner authorises a behavior change)

| # | Step | Why |
|---|---|---|
| V1 | Capture the raw socket frame (full message array + payload) for the offending order at the moment it appeared on the dashboard. | Confirms whether the entry path was REST or socket. |
| V2 | Capture the response of `/api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager` on the same business day with and without the offending order. | Confirms whether backend lifted the previously observed status-8 exclusion. |
| V3 | Capture the response of `/api/v2/.../get-single-order-new` for the offending order ID, recording `f_order_status`, `payment_status`, `payment_type`, `payment_method`, `razorpay_order_id`. | Confirms the prepaid + status-8 + payment-status combination. |
| V4 | Capture the response of `/api/v2/.../order-logs-report` for the same order ID for the same business day. | Confirms which Audit Report tabs surface the order — should be All Orders + Running, not Hold or Audit. |
| V5 | Diff `pages/DashboardPage.jsx`, `pages/AllOrdersReportPage.jsx`, `api/services/reportService.js`, `api/transforms/orderTransform.js`, `api/socket/socketHandlers.js`, `components/cards/OrderCard.jsx`, `components/cards/TableCard.jsx` against the prior `9-may` and previous-sprint branches for any uncommitted / unmerged change touching `f_order_status` or HOLD logic. | Verifies the codebase has not been silently tampered with. |
| V6 | Re-grep `/app/memory/**` for `f_order_status.*8`, `status.*8.*hold`, `status.*8.*audit`, `prepaid.*hold`, `paylater.*8` to re-confirm absence of any prior shipped rule. | Final regression-check on the docs side. |
| V7 | Re-test mark-unpaid round-trip (CR-003 OQ-C2): paid order → flip to Mark Unpaid → confirm it re-surfaces as Running on the dashboard. | Sanity-check baseline. |
| V8 | Owner explicit written authorisation if behavior is to be changed. | Required before any code edit (per §13.1). |

---

## 15. Final verdict

> ## **`baseline_conflict_needs_owner_decision`**

- The system is operating exactly as the documented and shipped baseline prescribes: `f_order_status = 8` is `'running'`, status-8 orders belong on the running dashboard (channel view) and in the Audit Report Running tab, the PAID badge is driven solely by `paymentType === 'prepaid'`, and there is no card-level HOLD label.
- The owner's recalled "earlier HOLD/Audit logic for `f_order_status = 8`" has **no evidence of ever shipping** in code, baseline docs, overlay docs, CRs, QA reports, or git history. Two prior investigations (`F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md` 2026-05-07; `POS2_004_F_ORDER_STATUS_8_VALIDATION_REPORT_2026_05_08.md` 2026-05-08) reached the same conclusion.
- **No regression is confirmed. No fix is recommended. No code change has been made.** A behavior change that meets the owner's stated expectation requires (a) explicit owner approval and (b) a new CR with impact analysis covering CR-001 / CR-003 / CR-007 cross-impact and the silent-in-flight-order-loss risk.

— End of POS2-004 Combined Investigation 2026-05-08 —

---

# 16. Owner Decision + Source Correction Addendum (2026-05-08, post-investigation)

> **Trigger:** Owner reviewed §10-§11 of this report and corrected the source-of-entry interpretation, then locked a new business rule for `f_order_status = 8`. This addendum overrides those sub-sections only; all other findings (status mapping, HOLD label absence, PAID-tag derivation, baseline contradiction) stand unchanged.
> **Effect on verdict:** Verdict revised from `baseline_conflict_needs_owner_decision` → **`new_CR_required_ready_for_planning`**.

---

## 16.1 Correction — `/employee-orders-list` does NOT serve `f_order_status = 8`

§10.5 / §11.1 / §11.3 of this report previously hypothesised that backend may have lifted a status-8 exclusion on `/api/v1/vendoremployee/pos/employee-orders-list`. **Owner has corrected this:**

| Statement | Status |
|---|---|
| Backend serves `f_order_status = 8` from `/employee-orders-list` | ❌ **Incorrect — withdrawn.** |
| `/employee-orders-list` excludes `f_order_status = 8` | ✅ **Correct — stands.** |
| The observed status-8 dashboard card came in via REST (running-orders fetch) | ❌ **Incorrect — withdrawn.** |
| The observed status-8 dashboard card came in via socket (specifically `scan-new-order` / scan-order flow) | ✅ **Correct — confirmed.** |
| `update-order-paid` is the source of `f_order_status = 8` on the dashboard | ❌ **Incorrect — withdrawn.** `update-order-paid` only updates already-known orders; it is not the entry path for status-8. |

### 16.1.1 Can FE code prove `/employee-orders-list` excludes status 8?

**Strictly, no — it is a backend-side filter.** FE code is a pure pass-through:

`/app/frontend/src/api/services/orderService.js:13-18`:
```js
export const getRunningOrders = async (roleName = 'Manager') => {
  const response = await api.get(API_ENDPOINTS.RUNNING_ORDERS, {
    params: { role_name: roleName },
  });
  return fromAPI.orderList(response.data.orders || []);
};
```
- No client-side `filter(o => o.f_order_status !== 8)` exists.
- `fromAPI.orderList` passes every row through `orderTransform.fromAPI.order`, which does **not** drop rows by `f_order_status`.

Empirical evidence from the prior 2026-05-08 validation (`POS2_004_F_ORDER_STATUS_8_VALIDATION_REPORT_2026_05_08.md`, §3.4) captured the live response:
```
GET /api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager
→ HTTP 200, 16 orders
   f_order_status distribution: {2: 14, 5: 1, 7: 1}
   #825648 (f_order_status=8) is NOT present
```

**Conclusion:** The exclusion of status-8 from `/employee-orders-list` is **owner-asserted backend behavior, supported by one empirical capture**. FE code does not enforce it; it merely consumes whatever backend returns. This is good enough to lock the assumption for planning; backend ownership of the rule should be reaffirmed in the new CR's BE-asks.

---

## 16.2 Confirmed entry path — `scan-new-order` (and any handler using `fetchSingleOrderForSocket`)

The actual code path that brings an `f_order_status = 8` order into the dashboard's `OrderContext`:

### 16.2.1 `scan-new-order` (`api/socket/socketHandlers.js:423-447`)

```js
export const handleScanNewOrder = async (message, { addOrder, updateTableStatus }) => {
  const parsed = parseMessage(message);
  if (!parsed) { ...return; }

  const { orderId } = parsed;
  log('INFO', `scan-new-order received: ${orderId}`);

  const order = await fetchOrderWithRetry(orderId);   // ← lines 85-109
  if (order) {
    addOrder(order);                                  // ← unconditional add
    syncTableStatus(order, updateTableStatus);
    log('INFO', `scan-new-order: Added order ${orderId}`);
  }
};
```

Key properties:
- **Trigger payload:** `[scan-new-order, order_id, restaurant_id, f_order_status]` (no embedded order body).
- **Source-of-truth fetch:** `fetchOrderWithRetry(orderId)` → `fetchSingleOrderForSocket(orderId)` (`api/services/orderService.js:27-40`) → `POST /api/v2/.../get-single-order-new`.
- **Whatever `f_order_status` the `/get-single-order-new` API returns is accepted as-is.** Status 8 is *not* filtered, *not* re-routed, *not* dropped. The order is then `addOrder(order)`-ed straight into `OrderContext`, where it becomes visible in the channel-grouped dashboard tabs (`dineInOrders` / `takeAwayOrders` / `deliveryOrders` / `walkInOrders`).
- **No predicate** on `payment_type`, `payment_status`, `payment_method`, `razorpay_order_id`, or `f_order_status` exists in this handler or in `fetchSingleOrderForSocket`.

### 16.2.2 `fetchSingleOrderForSocket` — the universal back-door (`api/services/orderService.js:27-40`)

```js
export const fetchSingleOrderForSocket = async (orderId) => {
  const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, { order_id: orderId });
  const orders = response.data?.orders || [];
  if (orders.length === 0) { ...return null; }
  const rawOrder = orders[0];
  return fromAPI.order(rawOrder);   // ← raw order accepted regardless of f_order_status
};
```

**Every socket handler that resolves an order via this path inherits the same back-door.** Mapped occurrences:

| Handler | Path | Adds/updates dashboard? | Status-8 admissible? |
|---|---|---|---|
| `handleScanNewOrder` (`socketHandlers.js:428`) | `addOrder(order)` after fetch | **Yes — adds new** | **Yes — primary entry path** |
| `handleUpdateFoodStatus` (`socketHandlers.js:317`) | `updateOrder(order.orderId, order)` after fetch | Yes — updates existing | Status 8 admissible if order already in context |
| `handleDeliveryAssignOrder` (`socketHandlers.js:454`) | `updateOrder(order.orderId, order)` after fetch | Yes — updates existing | Status 8 admissible if order already in context |
| `handleNewOrder` (`socketHandlers.js:146`) | Uses **embedded `payload.orders`**, NOT `fetchSingleOrderForSocket`. Calls `addOrder(transformedOrder)`. | **Yes — adds new** | **Yes — also a viable entry path if backend emits new-order with status 8** |
| `handleOrderDataEvent` (`socketHandlers.js:221`) — covers `update-order`, `update-order-target`, `update-order-source`, **`update-order-paid`** | Uses embedded `payload.orders[0]`. Transforms and `updateOrder(...)` unless terminal (`paid`/`cancelled`). | Yes — updates existing | Status 8 admissible **only if** the order is already in context. Does NOT introduce new status-8 orders by itself. |
| `handleUpdateOrderStatus` (`socketHandlers.js:375`) | Uses embedded `payload.orders[0]`. `updateOrder` unless terminal. | Yes — updates existing | Same as above. |

### 16.2.3 `update-order-paid` is NOT the source of status-8 entries

Owner correction reaffirmed: **`update-order-paid` does not introduce status-8 orders.**

Evidence in code (`socketHandlers.js:209-298`):
- `update-order-paid` is one of four events routed through the unified `handleOrderDataEvent`.
- It always carries an embedded `payload.orders[0]` (line 234 — explicit guard).
- `handleOrderDataEvent` calls `updateOrder(order.orderId, order)` (line 279) — which **updates an existing order in `OrderContext`**. There is no `addOrder` fall-through. (Verified by reading the function in full; no addOrder branch exists.)
- For terminal states (`paid`/`cancelled`), it calls `removeOrder` (line 276).

Therefore: an `update-order-paid` event for an order that is **not already in `OrderContext`** results in an `updateOrder` call against an unknown id. By inspection of `OrderContext.jsx`, `updateOrder` mutates an existing array entry; it does not insert. (`updateOrder` semantics — `prev.map(o => o.orderId === id ? {...o, ...patch} : o)` — see `OrderContext.jsx`.) So a previously-unknown status-8 order **cannot enter the dashboard via `update-order-paid` alone**.

**Locked:** `update-order-paid` is dismissed as a status-8 source. The previous report's hypothesis in §10.4 / §11.1 is hereby withdrawn.

### 16.2.4 Most likely scenario for the observed order

1. Customer scans QR → backend creates an order with `f_order_status = 8` (Razorpay-prepaid or guest-scan flow).
2. Backend emits `scan-new-order` socket frame `[scan-new-order, <orderId>, <restaurantId>, 8]`.
3. FE `handleScanNewOrder` fetches via `/get-single-order-new`, gets the raw row with `f_order_status = 8` and `payment_type = 'prepaid'`.
4. FE calls `addOrder(order)` unconditionally → order joins `OrderContext` → channel view's `statusMatchesFilter` lets it through (because `'running'` is in `activeStatuses` default) → card renders with the green PAID badge (`paymentType === 'prepaid'` is the sole trigger).
5. Order becomes the visible mismatched card the owner observed.

This perfectly explains the symptom set and matches owner's corrected understanding.

---

## 16.3 Locked owner business rule (LOCKED — authoritative)

> **From this point forward, the system MUST enforce the following three-clause rule for `f_order_status = 8`:**

| Clause | Rule | Notes |
|---|---|---|
| **R1** | `f_order_status = 8` orders MUST be routed to the **Hold/Audit area** and display a **HOLD label**. | Hold/Audit "area" interpreted as: (a) Audit Report Hold tab membership, AND (b) a card-level HOLD label on the surface where status-8 orders surface. |
| **R2** | `f_order_status = 8` orders MUST NOT be visible on the **running dashboard** (channel view OR status view). | The order is excluded from `dineIn` / `takeAway` / `delivery` / `room` / `walkIn` columns and from the "Running" status column. |
| **R3** | The PAID tag MUST display ONLY when `paymentType === 'prepaid'` **AND** `f_order_status !== 8`. | A prepaid + status-8 order is suppressed from showing the green PAID badge. (HOLD label is shown instead per R1.) |

This rule supersedes the previously-shipped CR-001 CS-3 widening of the running set to include status 8 (`CR_001_IMPLEMENTATION_SUMMARY.md:43`) **for FE display purposes**. CR-001's Audit-side `running` tab classification is unaffected unless the new CR explicitly revises it (see §16.6 for cross-impact).

---

## 16.4 Current code gaps against the locked rule

| Locked rule | Current code state | Gap |
|---|---|---|
| **R1.a** Hold tab includes status 8 | `pages/AllOrdersReportPage.jsx:83-84` — `hold` tab matches `paymentMethod === 'paylater' OR fOrderStatus === 9`. Status 8 NOT included. | **Hold tab predicate must be widened** to include `fOrderStatus === 8`. |
| **R1.a** Audit-side derivation routes status 8 to Hold | `api/services/reportService.js:660-714` priority chain — status 8 currently lands on `status = 'running'`. | **Audit-side priority chain must be revised** so status 8 lands on `status = 'hold'` (or on a new sibling key). Order of rules matters — must run BEFORE the running fall-through. |
| **R1.b** Card-level HOLD label exists | `components/cards/OrderCard.jsx`, `components/cards/TableCard.jsx` — no HOLD pill exists for any status. | **New HOLD pill component / inline render** must be introduced. Position must not visually conflict with the existing PAID pill (which will be suppressed under R3). |
| **R2** Status-8 hidden from channel view | `pages/DashboardPage.jsx:364` — `activeStatuses` default includes `'running'`. `pages/DashboardPage.jsx:714-736` `statusMatchesFilter` admits `'running'`. | Either (a) drop `'running'` from `activeStatuses` default and Header pills, OR (b) inject a hard filter at `statusMatchesFilter` for `fOrderStatus === 8`. (b) is safer — preserves Status Config UX for any future use. |
| **R2** Status-8 hidden from status-view "Running" column | `pages/DashboardPage.jsx:861-880` + `STATUS_COLUMNS` (`api/constants.js:165`) — Running column rendered when `enabledStatuses` includes it (default-off, but operator can enable). | Either (a) remove the Running column from `STATUS_COLUMNS`, OR (b) hard-filter the order list for `fOrderStatus === 8` at the column-render step. |
| **R2** Socket `scan-new-order` does not introduce status-8 to Live Dashboard | `api/socket/socketHandlers.js:428-447` — `addOrder(order)` is unconditional. | **Add a guard in `handleScanNewOrder`** (preferred) OR **add a guard in OrderContext.addOrder** (more invasive — affects all callers). Status-8 orders may still need to flow into the Audit Report data (which is a separate fetch path), so the guard belongs at the dashboard-bound `addOrder` call site, not at the network layer. |
| **R2** Socket `new-order` does not introduce status-8 to Live Dashboard | `api/socket/socketHandlers.js:146-198` — `addOrder(transformedOrder)` is unconditional. | Same guard pattern as `scan-new-order`. Defensive measure even if backend currently does not emit status-8 via `new-order`. |
| **R2** Socket `update-order` / `update-order-paid` does not surface status-8 from a fresh state | `api/socket/socketHandlers.js:271-282` — `updateOrder` is called for non-terminal orders. | **No new filter required** for `update-order*` because `updateOrder` only patches existing orders (verified §16.2.3). However, if a status-8 order is *somehow* already in context (e.g., via a race), an `update-order-paid` keeping it at status-8 would re-affirm presence. Recommended: when filtering at OrderContext level, the status-8 order is dropped on next `addOrder` rejection — no special path needed for update events. |
| **R3** PAID badge hidden when status-8 | `components/cards/OrderCard.jsx:329` — `{order.paymentType === 'prepaid' && (...PAID...)}` (single condition). `components/cards/TableCard.jsx:244` — same. | **Predicate must be widened** to `order.paymentType === 'prepaid' && order.fOrderStatus !== 8`. (Two file edits.) |

---

## 16.5 Minimal implementation areas likely affected (forecast — NOT authorisation)

> All paths listed are read-only forecasts. **Nothing has been edited.** The new CR must own the actual edits.

### 16.5.1 Frontend file map

| File | Sub-area | Change forecast |
|---|---|---|
| `api/socket/socketHandlers.js` | `handleScanNewOrder` (~line 428), `handleNewOrder` (~line 146) | Add status-8 short-circuit: if `transformedOrder.fOrderStatus === 8`, skip `addOrder(...)`. Document with a comment block referencing the new CR id and POS2-004. Sync table status correctly (do NOT engage table for a hidden order). |
| `pages/DashboardPage.jsx` | `statusMatchesFilter` (~lines 714-736), and/or `activeStatuses` default (~line 364), and/or status-view loop (~lines 859-880) | Hard-filter `fOrderStatus === 8` at the channel-view gate. For status view: either remove the Running column from `STATUS_COLUMNS` or hard-filter at the column items list. |
| `pages/AllOrdersReportPage.jsx` | `TAB_FILTERS.hold` (lines 83-84), `TAB_FILTERS.running` (lines 86-94), `TAB_FILTERS.paid` (lines 71-78) | Widen `hold` predicate to include `fOrderStatus === 8`. Exclude `fOrderStatus === 8` from `running` (remove from absorbed running set). Confirm `paid` already excludes via `fOrderStatus === 6` requirement. |
| `api/services/reportService.js` | Status priority chain (lines 660-714) | Insert a new branch: `else if (fStatus === 8) status = 'hold'` BEFORE the unpaid/paid/running fall-through. Order matters — must run after Cancel / Merge / TAB. |
| `api/constants.js` | `STATUS_COLUMNS` (lines 161-171) and possibly `F_ORDER_STATUS` mapping comment | Either remove the `{ id: 8, fOrderStatus: 8, name: 'Running', ... }` row OR re-key it to a Hold column. Decision for the new CR. |
| `components/cards/OrderCard.jsx` | PAID badge render (line 329) | Add `&& order.fOrderStatus !== 8` to the conditional. Add a sibling HOLD label render conditional on `order.fOrderStatus === 8` (or an equivalent computed field). |
| `components/cards/TableCard.jsx` | PAID badge render (line 244) | Same pattern. |
| `components/layout/Header.jsx` | "Running" status pill (~line 23) | Remove the pill OR re-label it. Header pill count must not include status-8 if the rule is enforced cleanly. |
| `pages/StatusConfigPage.jsx` | `DEFAULT_ENABLED` (~line 109), `ALL_STATUSES` (~line 90) | Remove `running` from the configurable list OR re-key it (Status 8 is no longer operator-configurable). |
| `utils/statusHelpers.js` | Sort priority comments (~line 80) | Update comment that currently says `running: 5, // fOrderStatus 8 — active but not urgent` to reflect new Hold semantics. |
| `__tests__/...` | New unit/integration tests | Tests for: `handleScanNewOrder` rejects status-8; `statusMatchesFilter` hides status-8; `TAB_FILTERS.hold` includes status-8; PAID badge hidden when status-8; mark-unpaid round-trip still works (CR-003 OQ-C2); HOLD label renders on status-8 cards (in their new Hold home). |

### 16.5.2 Backend asks (forecast — coordinate with BE owner)

| Ask | Why |
|---|---|
| Confirm backend filter on `/employee-orders-list` for `f_order_status = 8` is intentional and stable. | FE rule R2 depends on this. If backend ever lifts the filter, FE will silently surface the order again unless the FE-side guard is also in place (which it must be — defense in depth). |
| Confirm whether `scan-new-order` socket emission for `f_order_status = 8` is intentional. | If backend should NOT emit `scan-new-order` for status-8 (because such orders should not enter the live operational stream until paid), the cleanest fix is at the BE side; FE then becomes a defensive secondary guard. |
| Confirm whether `new-order` socket can ever carry `f_order_status = 8`. | Defensive symmetry. |
| Confirm `update-order-paid` payload `f_order_status` distribution observed in production. | Sanity check that no race conditions can re-introduce status-8 via update-paid for an order that escaped a previous filter. |

### 16.5.3 Documentation updates (post-implementation, post-QA)

- `change_requests/CR_001_*` — note the rule revision (status 8 no longer in "running" set for FE display).
- `change_requests/CR_003_paid_hold_order_actions.md` OQ-C2 — re-affirm or revise the mark-unpaid → re-running contract (mark-unpaid currently re-keys to `fStatus = 8` per backend; this would now route directly to Hold, not Running — owner must confirm this is the desired round-trip behavior).
- `change_requests/CR_007_*` BUG-PREPAID-MERGE-SHIFT — re-confirm action-button gating for Hold-classified prepaid orders.
- `change_requests/CR_011_*` payment_type case-canonicalisation — no change expected.
- `final/MODULE_DECISIONS_FINAL.md` — Module 4 status machinery and Module 10 Reports/Audit must be revised to reflect Hold = `{9, 8, paylater}` instead of `{9, paylater}`. **(Final-doc edit requires playbook approval — out of scope for this addendum.)**

---

## 16.6 Risks and watch-outs (forecast)

| Risk | Severity | Mitigation |
|---|---|---|
| **Scan-new-order silent in-flight order loss** | High | If a customer scans the QR and creates a status-8 order, hiding the card from the dashboard means the cashier cannot intervene if Razorpay fails or the customer abandons checkout. Must validate the Audit Report Hold tab (and HOLD label) provides the operator a clear surface to view + action such orders, including the ability to **Mark Unpaid** / **Cancel** / **Edit items** / **Resume payment**. |
| **CR-003 OQ-C2 mark-unpaid round-trip break** | High | CR-003 documents that flipping a paid order to Mark Unpaid re-surfaces it as a Running card. With R2 in place, the post-flip card would land in Hold instead of Running. Owner must confirm this is intended (likely yes — consistent with the new rule). Re-test the entire flip-and-reopen flow end-to-end. |
| **CR-001 Audit-side classification regression** | Medium | CR-001 widened the running-set to include status-8 to fix an audit fall-through. Re-keying status-8 from `running` to `hold` in the Audit Report priority chain partially reverses CR-001. Verify the audit fall-through doesn't reappear (i.e., status-8 rows must land cleanly in Hold, not in Audit). |
| **CR-007 BUG-PREPAID-MERGE-SHIFT interaction** | Low | Action buttons (Merge, Table-Shift) are already hidden for prepaid orders per CR-007. No new conflict expected, but action buttons inside the Hold tab (or on Hold-card render) must still respect the prepaid gating. |
| **PAID badge suppression visual ambiguity** | Medium | An operator viewing the Hold tab on a prepaid + status-8 order will see the HOLD label but not the PAID badge. They should still understand that money was paid upfront. Consider showing a subtler indicator (e.g., "Prepaid · Hold") so the operator does not refund or re-charge by mistake. |
| **Race condition: status flips 8 → 6 mid-render** | Low | When a Razorpay webhook fires, backend updates the order to `f_order_status = 6` and emits `update-order-paid`. FE handler removes the order (terminal). Brief race window where order is in Hold then disappears. Document as expected; no fix needed. |
| **Status 8 in `/get-single-order-new` access via direct deep-link** | Low | If an operator navigates to OrderEntry via `/order/:id` for a status-8 order, the page should still load (current behavior). Don't filter at the network layer. |
| **Tests + e2e coverage** | Medium | Add explicit test cases for: status-8 not visible in dashboard; status-8 visible in Hold tab; PAID badge suppressed when status-8; HOLD label rendered when status-8; mark-unpaid round-trip; scan-new-order with status-8 not added to OrderContext. |

---

## 16.7 Revised final verdict

> ## **`new_CR_required_ready_for_planning`**

The owner has locked the business rule and corrected the source-path interpretation. The investigation now has:
- A concrete locked predicate set (R1, R2, R3 in §16.3).
- A confirmed entry path for status-8 orders (`scan-new-order` socket → `fetchSingleOrderForSocket` → `addOrder`).
- A withdrawn / dismissed alternate hypothesis (`update-order-paid` is NOT the source).
- A complete forecast of file-level change zones (§16.5.1).
- A risk matrix (§16.6) covering the two highest-impact downstream contracts (CR-003 OQ-C2 round-trip, CR-001 Audit fall-through).

**Next step (NOT authorised here):** Open a new CR (suggested id: `CR-014_F_ORDER_STATUS_8_HOLD_REROUTE` or under POS2 sprint as `POS2-005`). The CR plan must include:
1. Impact analysis citing CR-001, CR-003 OQ-C2, CR-007.
2. A precise predicate sheet for R1 / R2 / R3 with code-level locations.
3. Backend coordination on `scan-new-order` emission policy for status-8.
4. Test plan covering §16.6 risks.
5. Owner sign-off gate before `/app/memory/final/*` revision.

— End of POS2-004 Owner Decision + Source Correction Addendum 2026-05-08 —

