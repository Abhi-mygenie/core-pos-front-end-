# f_order_status === 8 — Dashboard Regression Check

**Type:** Read-only regression-check report. NO code, NO QA, NO tracker rewrite, NO `/app/memory/final/` edit, NO branch switch.
**Agent:** F_ORDER_STATUS_8 Dashboard Regression Check Agent
**Date:** 2026-05-07
**Branch:** `6-may` (cloned to `/app` 2026-05-05; HEAD verified equivalent to `5may` `5b85c2c` per FA-03)
**Trigger:** User recall — *"when an order from Razorpay is not paid and `f_order_status === 8`, it should NOT appear on the Dashboard, it should be on Hold — we fixed this; please confirm against code."*

---

## 1. Executive summary

> **Recommendation: `owner_rule_needs_confirmation`.**
>
> There is **no evidence in code or in `/app/memory`** of a hard rule "Razorpay-unpaid + `f_order_status === 8` → exclude from dashboard / move to Hold." The opposite rule is documented as the active baseline behaviour: `f_order_status === 8` is the canonical `running` status and is **explicitly listed in the running-set** in CR-001's implementation summary (`f_order_status ∈ {0,1,2,4,5,7,8}`) and re-confirmed in `BUG_CANCEL_DERIVATION_HANDOVER.md`. The dashboard currently shows it in the channel-view by default; the status-column view default visibility config DOES exclude it but that's a configurable visibility, not a hard rule, and applies regardless of payment method.

### 1.1 Three findings at a glance

| Finding | Detail |
|---|---|
| **Rule the user describes is NOT in code** | No code path in `/app/frontend/src` reads `razorpay_order_id` / `isPaymentGateway` / `payment_status` to gate dashboard inclusion. Razorpay-awareness is confined to the **Audit-Report** side only (`reportService.js`, `OrderTable.jsx`, `FilterBar.jsx`, `AllOrdersReportPage.jsx`). |
| **Rule the user describes is NOT in any baseline doc** | A grep across `/app/memory/**` for "razorpay AND status 8 AND hide", "exclude status 8", "status 8 should not show", "running hide" returns **zero hits**. The opposite rule (`8 ∈ running`) is documented in 3 places: `CR_001_IMPLEMENTATION_SUMMARY.md:43`, `BUG_CANCEL_DERIVATION_HANDOVER.md:429`, and `StatusConfigPage.jsx:101`. |
| **There IS a default-OFF behaviour for fOrderStatus 8 in the STATUS-COLUMN view** | `enabledStatuses` defaults to `["pending","preparing","ready","served"]` (`pages/DashboardPage.jsx:228-229`, `pages/StatusConfigPage.jsx:109-110`) — i.e. statuses 7/1/2/5. The "Running" column (fOrderStatus 8) is **NOT rendered by default** in the status-grouped layout. **But this is a visibility config, not a Razorpay-conditional exclusion**, and it does not apply to the channel-grouped layout (which is the layout shown in the user's screenshot). |

### 1.2 Verdict against the recalled fix

| Recalled rule | Status |
|---|---|
| Razorpay-unpaid order with `f_order_status === 8` → not shown on dashboard | ❌ Not in code |
| Such order should land on a Hold tab | ❌ Not in code (Hold is keyed on `f_order_status === 9` OR `payment_method === 'paylater'`, not Razorpay) |
| Was it reverted? | ⚠️ **Cannot be confirmed as "reverted"** — there is no historical record of this specific rule ever shipping. If it shipped, it shipped on a branch outside this repo / not into `6-may`. |

---

## 2. Files inspected

### 2.1 Frontend source (read-only)

| File | What was inspected | Result |
|---|---|---|
| `pages/DashboardPage.jsx` | Lines 220-242 (`enabledStatuses` localStorage default), 358-364 (`activeStatuses` runtime default), 698-771 (`statusMatchesFilter` channel-view gate), 773-883 (status-view group rendering) | No Razorpay/payment-status gate anywhere |
| `pages/StatusConfigPage.jsx` | Lines 90-110 (`ALL_STATUSES`, `DEFAULT_ENABLED`) | `running` (fOrderStatus 8) NOT in `DEFAULT_ENABLED` |
| `components/layout/Header.jsx` | Line 23 (status pill definition) | `running fOrderStatus: 8` |
| `api/constants.js` | Lines 133-145 (`F_ORDER_STATUS`), 165 (status-config row), 174-186 (`ORDER_TO_TABLE_STATUS`) | Pure numeric mapping — no payment/Razorpay branch |
| `api/transforms/orderTransform.js` | Lines 25-38 (`mapOrderStatus`/`mapTableStatus`), 159-225 (`fromAPI.order`) | Reads `payment_status` + `payment_type` + `payment_method` → state only; does NOT remap `f_order_status` based on Razorpay or `payment_status` |
| `api/transforms/tableTransform.js` | Full file (165 lines) | No `f_order_status`, no Razorpay, no payment-status filter |
| `api/services/orderService.js` | Lines 12-17 (`getRunningOrders`), 67-90 (`completePrepaidOrder`) | Plain pass-through; no client-side filter |
| `api/services/reportService.js` | Lines 567, 684-685, 759-760 | `razorpay_order_id` / `isPaymentGateway` / `Hold` rule live HERE — Audit-Report only, NOT Dashboard |
| `contexts/OrderContext.jsx` | Lines 161-184 (`dineInOrders`/`takeAwayOrders`/`deliveryOrders`/`walkInOrders` selectors) | Filter on `orderType` only — no payment / Razorpay / fOrderStatus filter |
| `utils/statusHelpers.js` | Line 80 (sort priority) | Comment confirms `running` = `fOrderStatus 8 — active but not urgent` |
| `pages/AllOrdersReportPage.jsx` | Lines 162, 425, 428 | `isPaymentGateway` filter — Audit-Report side only |

### 2.2 `/app/memory` baseline + change-request docs (per task spec)

| Doc | Relevance |
|---|---|
| `/app/memory/final/*` | **NOT opened** (strict-rule scope honoured) |
| `change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | No row claims fOrderStatus 8 hidden / razorpay-conditional exclusion |
| `change_requests/PENDING_TASK_REGISTER_2026_05_04.md` | No matching parked or pending item |
| `change_requests/implementation_summaries/CR_001_IMPLEMENTATION_SUMMARY.md:43` | **Direct evidence:** `f_order_status ∈ {0,1,2,4,5,7,8}` is the running-set audit fall-through fix |
| `BUG_CANCEL_DERIVATION_HANDOVER.md:429` | **Direct evidence:** `running` (`fStatus∈{0..2,4..5,7..8}`) — re-confirms 8 is running |
| `change_requests/CR_001_QA_REPORT.md:64-66, 99-103` | `Hold` keyed on `f_order_status === 9` OR `paylater`; `Running` widening explicitly excludes 9/paylater. No mention of Razorpay-or-status-8 exclusion |
| `change_requests/CR_001_all_orders_status_derivation.md:232, 278` | Confirms paylater ↔ `f_order_status === 9` (Hold). No 8-related exclusion |
| `change_requests/CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md` | About `payment_type` case canonicalisation (`Prepaid`/`PREPAID`/`postpaid`) — does not touch fOrderStatus 8 visibility. Backlog item is BE-A. |
| `change_requests/CR_003_paid_hold_order_actions.md:199` | OQ-C2: on Mark Unpaid flip the order **re-surfaces as a running order on the dashboard** — this is the OPPOSITE of the recalled "hide running on dashboard" rule |
| `change_requests/CR_QA_CONSOLIDATION_AND_CLASH_MATRIX_2026_05_03.md:90, 110` | No 8-conditional rule |
| `change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` | No 8-conditional rule |
| `change_requests/qa_handover/CR_001_QA_HANDOVER.md:51` | Confirms `running` count is computed from running-set — no Razorpay condition |

### 2.3 Greps run

```
grep -rE "f_order_status[^0-9]*8|fOrderStatus[^0-9]*8|fOrderStatus === 8|f_order_status === 8" /app/memory/
grep -rE "razorpay|Razorpay|RAZORPAY" /app/frontend/src/ --include='*.js' --include='*.jsx'
grep -rE "razorpay_order_id|isPaymentGateway" /app/frontend/src/ --include='*.js' --include='*.jsx'
grep -rE "running.*hide|hide.*running|exclude.*running|dashboard.*hide.*8|don.*show.*dashboard" /app/memory/
grep -rE "isHold|on_hold|onHold|hold.*order|order.*hold" /app/frontend/src/ --include='*.js' --include='*.jsx'
grep -rE "payment_method.*razorpay|razorpay.*hold|prepaid.*hold|hold.*prepaid" /app/frontend/src/ --include='*.js' --include='*.jsx'
```

**Total Razorpay-aware files:** 5, all in the **Audit-Report** path:
- `api/services/reportService.js`
- `api/transforms/reportTransform.js` (read indirectly via reportService)
- `components/reports/OrderTable.jsx`
- `components/reports/FilterBar.jsx` + `FilterTags.jsx`
- `pages/AllOrdersReportPage.jsx`

**Razorpay references in Dashboard pipeline:** **zero**.

---

## 3. Current dashboard inclusion / exclusion logic

The Dashboard has **two coexisting layouts** with **two different gating rules**:

### 3.1 Channel-grouped layout (Dine-In / TakeAway / Delivery / Room tabs — the layout in the user's screenshot)

**File:** `pages/DashboardPage.jsx`
**Gate:** `statusMatchesFilter` at lines 714-736

```js
const statusMap = {
  7: 'pending',  1: 'preparing',  2: 'ready',  8: 'running',
  5: 'served',   9: 'pendingPayment',  6: 'paid',  3: 'cancelled',  10: 'reserved',
};
const statusId = statusMap[fOrderStatus];
return statusId ? activeStatuses.includes(statusId) : true;
```

`activeStatuses` is initialised at line 364 to **all 9 statuses including "running"**:
```js
useState(["pending","preparing","ready","running","served",
         "pendingPayment","paid","cancelled","reserved"]);
```

**→ Dine-In/TakeAway/Delivery/Room cards with `fOrderStatus === 8` ARE shown by default.** Users can hide the "Running" pill via the Header status pills (which then drives `activeStatuses` to drop "running") but that's a runtime user action, not a default-off rule.

### 3.2 Status-grouped layout (Status columns — alternate layout)

**File:** `pages/DashboardPage.jsx`
**Gate:** lines 859-880

```js
STATUS_COLUMNS.forEach(col => {
  const statusIdMap = { 7:'pending', 1:'preparing', 2:'ready', 8:'running',
    5:'served', 9:'pendingPayment', 6:'paid', 3:'cancelled', 10:'reserved' };
  const statusId = statusIdMap[col.fOrderStatus];
  const isEnabled = enabledStatuses.length === 0 || enabledStatuses.includes(statusId);
  if (isEnabled) { /* render the column */ }
});
```

`enabledStatuses` is initialised at lines 220-230 from `localStorage['mygenie_enabled_statuses']` with **default `["pending","preparing","ready","served"]`** (i.e. statuses 7/1/2/5; **NOT including "running"**). Same default in `pages/StatusConfigPage.jsx:109-110`:
```js
// Default: Only status 7, 1, 2, 5 enabled (YTC, Preparing, Ready, Served)
const DEFAULT_ENABLED = ["pending", "preparing", "ready", "served"];
```

**→ The "Running" column (`fOrderStatus === 8`) is NOT rendered by default in the status-grouped layout.** It only appears if the operator explicitly turns "Running" ON in the Status Config page.

### 3.3 Razorpay condition

**Neither gate** reads `razorpay_order_id`, `isPaymentGateway`, `payment_method`, `payment_type`, or `payment_status`. The visibility rules at §3.1 and §3.2 are purely numeric — they apply to ALL fOrderStatus-8 orders identically, regardless of payment provider or paid/unpaid state.

### 3.4 What "Hold" means in the current code

| Surface | Hold definition |
|---|---|
| **Audit Report `On Hold` tab** | `TAB_FILTERS.hold` at `reportService.js`/transform: `paymentMethod?.toLowerCase() === 'paylater' \|\| fOrderStatus === 9`. (`CR_001_QA_REPORT.md:64`.) |
| **Dashboard "Pending Pay" column** | `fOrderStatus === 9` only (status-config column "pendingPayment", `Header.jsx:25`). |
| **Backend "BILL_PAYMENT failure" bucket?** | Not surfaced as a distinct dashboard column or filter. |

→ "Hold" / "Pending Pay" is keyed on `fOrderStatus === 9`, never on Razorpay-unpaid status 8.

---

## 4. Whether the old rule is present or reverted

### 4.1 The recalled rule

> *"when order comes from razorpay and its not paid, f_order_status is 8 and not 7, it should not come on dashboard — it should be on hold."*

### 4.2 Evidence search

| Check | Result |
|---|---|
| Code reads `razorpay_order_id` in dashboard / order-card / OrderContext / orderTransform / orderService | **Not present** |
| Code reads `isPaymentGateway` in dashboard pipeline | **Not present** |
| Code remaps `f_order_status === 8` based on `payment_status` or `payment_method` | **Not present** |
| `/app/memory` mentions "Razorpay-unpaid + status 8 → hide dashboard" | **No match** |
| `/app/memory` mentions "running orders should not show" | **No match** |
| `/app/memory` mentions "exclude status 8" / "hide running" | **No match** |
| `/app/memory` mentions "status 8 → hold" | **No match** |
| Inverse rule (`status 8 IS running and shows on dashboard`) | **Three direct hits in baseline docs** (see §2.2): `CR_001_IMPLEMENTATION_SUMMARY.md:43`, `BUG_CANCEL_DERIVATION_HANDOVER.md:429`, `StatusConfigPage.jsx:101` |
| CR-003 OQ-C2 (paid → unpaid flip) | Confirms order **re-surfaces as RUNNING on dashboard** — opposite of the recalled rule |
| Git log on `6-may` for "razorpay" / "hold" / "status 8" / "f_order_status" | Only auto-generated commits — fresh clone, no historical chain to follow |

### 4.3 Conclusion on revert claim

**Cannot conclude "reverted_fix_confirmed".** A fix can only be considered "reverted" if it was previously documented to ship. There is:

- **No baseline rule** in `/app/memory/final/*` mentioning Razorpay-conditional fOrderStatus-8 exclusion
- **No CR or implementation summary** ever recording such a fix shipping
- **No regression test** in `__tests__/` referencing such a rule
- **No comment / TODO / removed-block trace** in current source code referring to a previously-removed Razorpay-status-8 exclusion

The most parsimonious explanation: **the recalled rule did not ship on this branch.** Possibilities:
1. **It shipped on a different branch** (not `6-may`) and was never merged forward.
2. **It is a backend-side fix** that filters such orders out of `/api/v1/vendoremployee/pos/employee-orders-list` before the FE ever sees them — in which case the FE has nothing to verify, and the user's recollection conflates a backend change with an FE change.
3. **It was a discussed-but-not-implemented design proposal** (e.g. mentioned in a meeting) that never reached code.
4. **The "fix" was actually the existing default-off behaviour at §3.2** (status-column-view default excludes "Running") which is unconditional, not Razorpay-specific — and the user is recalling it with extra detail.

### 4.4 Closest existing behaviour that resembles the recalled rule

| Surface | Behaviour | Razorpay-conditional? |
|---|---|---|
| Status-column-view default visibility config | Default `enabledStatuses` excludes "running" → fOrderStatus 8 hidden by default in status-view | **No** — applies to ALL status-8 orders regardless of payment provider |
| `BUG-PREPAID-MERGE-SHIFT` (closed-fixed via CR-007 A2) | Hides Merge / Table-Shift actions on prepaid orders | **No** — about action buttons, not card visibility |
| Audit "On Hold" tab | Shows orders with `fOrderStatus === 9` OR `paymentMethod === 'paylater'` | **No** — Razorpay is not in the rule |
| Mark-Unpaid (CR-003) | Re-surfaces order as running on dashboard | **Opposite direction** |

→ None of these is the rule the user described.

---

## 5. Exact code locations

### 5.1 Where `f_order_status === 8` is treated as `running` (canonical mapping)

| File:line | Purpose |
|---|---|
| `api/constants.js:133-144` | `F_ORDER_STATUS = { 8: 'running' }` map |
| `api/constants.js:147-160` | `F_ORDER_STATUS_API` reverse |
| `api/constants.js:165` | StatusConfigPage row: `{ id: 8, fOrderStatus: 8, name: 'Running', key: 'running' }` |
| `api/transforms/orderTransform.js:25-37` | `mapOrderStatus` / `mapTableStatus` lookup |
| `pages/StatusConfigPage.jsx:101` | `{ id: "running", fOrderStatus: 8, label: "Running", description: "Active running orders" }` |
| `components/layout/Header.jsx:23` | Header status pill: `{ id: "running", fOrderStatus: 8, label: "Running" }` |
| `utils/statusHelpers.js:80` | Sort priority comment: `running: 5, // fOrderStatus 8 — active but not urgent` |

### 5.2 Where the dashboard decides what to render

| File:line | Layout | Gate |
|---|---|---|
| `pages/DashboardPage.jsx:228-230` | (state init) | `enabledStatuses` default `["pending","preparing","ready","served"]` — excludes "running" |
| `pages/DashboardPage.jsx:364` | (state init) | `activeStatuses` default — INCLUDES "running" |
| `pages/DashboardPage.jsx:714-736` | Channel view | `statusMatchesFilter` reads `activeStatuses` → fOrderStatus 8 INCLUDED by default |
| `pages/DashboardPage.jsx:861-880` | Status view | reads `enabledStatuses` → fOrderStatus 8 NOT shown by default |
| `pages/StatusConfigPage.jsx:109-110` | (config defaults) | `DEFAULT_ENABLED = ["pending","preparing","ready","served"]` — same as DashboardPage |

### 5.3 Where Razorpay state is consumed

| File:line | Surface |
|---|---|
| `api/services/reportService.js:759-760` | Audit-Report transform sets `razorpayOrderId` + `isPaymentGateway` |
| `api/services/reportService.js:684-685` | `On Hold` tab rule (`fOrderStatus === 9` OR `paylater`) |
| `pages/AllOrdersReportPage.jsx:162, 425, 428` | Audit gateway/non-gateway filter |
| `components/reports/FilterBar.jsx`, `FilterTags.jsx`, `OrderTable.jsx` | Audit UI |

→ All five hits are on the **Audit-Report** side. **Zero hits in Dashboard / Order-card / OrderContext / orderTransform / orderService.**

---

## 6. Risk of excluding `f_order_status === 8` (if the owner wants to add this rule now)

### 6.1 Direct dashboard risk

| Surface | Impact if status 8 globally excluded from dashboard |
|---|---|
| **Channel view dineIn cards** | Dine-In tables with active running orders disappear from `OrderCard` / `TableCard` rendering. Operators cannot see in-flight orders to act on them (Print KOT, Move to Pay, Cancel, Edit items). |
| **Channel view takeAway / delivery / walkIn** | Same: in-flight orders disappear. |
| **Status-column view** | Already default-off via `enabledStatuses`; no further change observed. |
| **Header status pill counts** | "Running" pill count must continue to count status-8 orders or be removed. |
| **Sidebar / activity badges** | Any badge that derives from running-orders count drops. |

### 6.2 Adjacent surface risk

| Surface | Impact |
|---|---|
| **OrderEntry "current-cart" recovery** | When a cashier returns to a table mid-bill, OrderEntry fetches the live order via `getRunningOrders`. If FE silently drops status-8 orders, OrderEntry will appear to start a fresh order on top of an existing one — **silent double-billing risk**. |
| **Sockets** | Live socket update for an in-flight order's items / status would be ignored if the order is filtered out at OrderContext level. |
| **OrderEntry status checks** | `useOrderManagement.js` uses `fOrderStatus` for next-action gating (Send to Kitchen, Mark Ready, Move to Pay). Filtering at the Dashboard level alone (not at OrderContext) keeps OrderEntry working — so a Dashboard-only rule is the safer scope. |
| **CR-003 Mark Unpaid round-trip** | OQ-C2 documents the post-flip order **re-surfaces as running on the dashboard**. Hiding running silently breaks the mark-unpaid → re-edit loop. |
| **CR-001 `running` tab in Audit Report** | `TAB_FILTERS.running` widens to `status === 'running' OR paymentStatus === 'unpaid' OR transferToRoom` (excludes `9`/paylater). Independent of the dashboard. Audit-side stays correct. |
| **CR-007 BUG-PREPAID-MERGE-SHIFT** | Action-button gating is on `payment_type === 'Prepaid'`, not on status 8 visibility. No interaction. |

### 6.3 If the rule is narrowed to "Razorpay-unpaid only"

| Risk | Severity |
|---|---|
| **Definition of "Razorpay-unpaid"** | Code currently has `razorpay_order_id` (set when a Razorpay payment was attempted) and `payment_status` (`'paid'` / `'unpaid'`). What about Razorpay-attempted-then-refunded? Razorpay-attempted-then-paid-via-cash? Razorpay-attempted-but-customer-cancelled-checkout? Each needs an explicit predicate. |
| **Hidden in-flight order** | If Razorpay payment is genuinely in-flight (customer hasn't tapped Pay yet) and status is 8, hiding the card means the cashier cannot intervene — same silent-loss risk as §6.2. |
| **Mark-Unpaid round-trip** | If the unpaid Razorpay order is hidden, but Mark-Unpaid expects it to re-surface as Running, the post-flip card never appears → users think the flip failed and retry. |
| **Auditor confusion** | If dashboard hides Razorpay-unpaid + status 8 BUT Audit Report shows it under Running, the two surfaces disagree. |
| **Race condition with backend** | A status-8 Razorpay order may flip to status-6 at any moment when payment webhook fires. If FE has already hidden it, the operator may not see the paid state immediately (until next refresh). |

### 6.4 Net assessment

If the user's intent is **"Razorpay-unpaid orders should not show on the main running cards because the customer hasn't paid yet"**, a narrower / safer interpretation exists:

- **Backend pre-filter:** `/employee-orders-list` excludes Razorpay-unpaid orders entirely until the webhook confirms payment. (Most likely the actual production behaviour the user is recalling — and an FE-side check would be redundant.)
- **OR FE soft-grouping:** Show such orders under a separate "Payment Pending" pill (akin to the existing `pendingPayment` / fOrderStatus 9 column) instead of under Running. **This is a new CR**, not a regression-revert.
- **OR dedicated `f_order_status` value:** Backend assigns `9` (or a new value) to Razorpay-unpaid orders, and the existing `pendingPayment` column auto-receives them.

None of the above three is in the current code as a Razorpay-conditional FE filter.

---

## 7. Recommendation

> **`owner_rule_needs_confirmation`**

The rule the user describes is **not in the current `6-may` codebase, not in baseline docs, and not in any change-request history under `/app/memory`.** Before any FE change, the owner needs to confirm:

### 7.1 Three clarifying questions for the owner

| # | Question | Why it matters |
|---|---|---|
| **Q1** | Is this fix **on a different branch** (not `6-may`) — and if so, which branch / PR / commit? | If yes, this is a branch-merge issue, not a regression. We can diff and forward-port. |
| **Q2** | Is this fix actually **on the backend side** (e.g., `/employee-orders-list` server-filters Razorpay-unpaid orders out of the response)? | Most likely scenario — the FE never sees such orders so the filter "looks like" an FE rule. A live Network capture of `/employee-orders-list` response on a Razorpay-unpaid order would resolve in seconds. |
| **Q3** | If FE-side, what is the **exact predicate** — `razorpay_order_id !== null && payment_status !== 'paid' && f_order_status === 8`? Or a different condition? And what happens to such an order — is it (a) hidden entirely, (b) moved to the existing `pendingPayment` column, or (c) shown under a new column? | Required before any planning/impact analysis can begin. |

### 7.2 Until the owner confirms, NO code change should be made

- **No revert / re-apply.** There is no documented prior fix to revert to.
- **No new exclusion.** A new exclusion adds the `silent in-flight order loss` risk in §6.2 — particularly the OrderEntry double-billing path.
- **No quick fix on the channel-view `statusMatchesFilter` gate.** This is the safest place to add such a rule when the owner confirms, but only after Q1–Q3 are answered.

### 7.3 If the owner confirms it should be added now

This becomes a new CR (or sub-CR under CR-011 / CR-013, since it touches `payment_method` / `payment_status` semantics on the dashboard pipeline). Scope:

- **Impact analysis** — would need a fresh impact-analysis doc covering the §6.2 adjacent surfaces (OrderEntry recovery, sockets, Mark-Unpaid round-trip).
- **Implementation plan** — single-site edit at `pages/DashboardPage.jsx:714-736` (channel view) and possibly the Status view `enabledStatuses` default. Predicate built on `order.razorpayOrderId && order.paymentStatus !== 'paid' && order.fOrderStatus === 8`.
- **Owner approval gate** — required before code edit because the rule introduces a new payment-state-conditional UI gate that interacts with at least 4 documented decisions (CR-001 running widening, CR-003 Mark-Unpaid round-trip, CR-011 paymentType case canonicalisation, BUG-PREPAID-MERGE-SHIFT).

### 7.4 Recommendation tag

```yaml
recommendation: owner_rule_needs_confirmation
reason: |
  No evidence of a prior FE fix matching the user's recall. Baseline docs and
  current source code consistently treat f_order_status === 8 as the canonical
  'running' status. Three plausible alternatives (different branch / backend-side
  filter / discussed-but-not-implemented) need owner clarification before any
  FE change.
prerequisites:
  - Q1: which branch / commit shipped the fix (if any)?
  - Q2: is the filter backend-side?
  - Q3: exact predicate + intended target column?
next_steps_if_confirmed_FE_side:
  - new CR (impact analysis required)
  - owner approval before code edit
  - test coverage on Mark-Unpaid round-trip + OrderEntry recovery + sockets
```

---

## 8. Appendix — Quick-reference rule table (current state on `6-may`)

| `f_order_status` | Status ID | Header pill | Channel-view (`activeStatuses` default) | Status-view (`enabledStatuses` default) | Audit `On Hold` tab |
|---|---|---|---|---|---|
| 0 | (preparing variants) | (mapped to running set) | ✅ shown | ❌ hidden | ❌ |
| 1 | preparing | Preparing | ✅ shown | ✅ shown | ❌ |
| 2 | ready | Ready | ✅ shown | ✅ shown | ❌ |
| 3 | cancelled | Cancelled | ✅ shown | ❌ hidden | ❌ |
| 5 | served | Served | ✅ shown | ✅ shown | ❌ |
| 6 | paid | Paid | ✅ shown | ❌ hidden | ❌ |
| 7 | pending (YTC) | YTC | ✅ shown | ✅ shown | ❌ |
| **8** | **running** | **Running** | **✅ shown** | **❌ hidden by default** ← the closest to user's recall | ❌ |
| 9 | pendingPayment | Pending Pay | ✅ shown | ❌ hidden | ✅ shown (OR `paylater`) |
| 10 | reserved | Reserved | ✅ shown | ❌ hidden | ❌ |

The "❌ hidden by default" cell at row 8 / Status-view is a **status-config default**, not a Razorpay-conditional rule. No row has any Razorpay condition.

---

## 9. Strict-rules compliance certification

| Rule | Status |
|---|---|
| Read-only — no implementation | ✅ |
| No frontend / backend source edited | ✅ |
| No QA / tests run | ✅ |
| No tracker rewrite | ✅ — only this regression-check report created |
| No `/app/memory/final/*` touched | ✅ |
| No code pulled / branch switched | ✅ |
| Stop after report | ✅ |

---

— End of f_order_status === 8 Dashboard Regression Check 2026-05-07 —
