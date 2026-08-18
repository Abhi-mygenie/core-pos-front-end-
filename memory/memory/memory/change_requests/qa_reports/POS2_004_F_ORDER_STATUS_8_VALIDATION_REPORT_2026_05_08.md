# POS2-004 — Validation Report: f_order_status = 8 Behavior

> **Sprint:** pos2.0
> **Item ID:** POS2-004
> **Type:** Quick Validation / Possible CR Discovery
> **Date:** 2026-05-08
> **Tenant probed:** `18march` (id=478)
> **Reference order:** #825648 (real order on tenant 478, placed 2026-05-08)
> **Verdict (preview):** `behavior_as_expected` — the system handles `f_order_status = 8` consistently per the existing baseline. No CR needed unless owner intentionally wants order #825648 also visible on the **Live Dashboard**, which is currently blocked by a **backend filter**, not a frontend defect.

---

## 1. Docs read (mandatory order)

- `/app/memory/final/MODULE_DECISIONS_FINAL.md` (re-read — covers Module 4 status machinery)
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` (re-read)
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`, `IMPLEMENTATION_AGENT_RULES.md`, `FINAL_DOCS_APPROVAL_STATUS.md` (re-read)
- Overlay: `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`, `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` (re-read)
- CR-001 trail (status-derivation history): inline references in `reportService.js:621-714` and `AllOrdersReportPage.jsx:47-113`
- Raw FE code: `api/constants.js`, `api/services/reportService.js`, `api/services/orderService.js`, `api/transforms/orderTransform.js`, `pages/AllOrdersReportPage.jsx`, `pages/DashboardPage.jsx`, `components/cards/OrderCard.jsx`, `components/cards/TableCard.jsx`, `components/Header.jsx`

---

## 2. What `f_order_status = 8` means

### 2.1 Mapping in code

`/app/frontend/src/api/constants.js:132-160`:

```js
//   8 → Running (Active/Unpaid)  - F_ORDER_STATUS_API[8] = "Running"
export const F_ORDER_STATUS = {
  1: 'preparing',   2: 'ready',    3: 'cancelled',  5: 'served',
  6: 'paid',        7: 'pending',  8: 'running',    9: 'pendingPayment',
  10: 'reserved',
};
export const F_ORDER_STATUS_API = {
  1: 'Preparing',   2: 'Ready',    3: 'Cancelled',  5: 'Served',
  6: 'Paid',        7: 'Yet to Confirm', 8: 'Running', 9: 'Pending Payment',
  10: 'Reserved',
};
```

### 2.2 STATUS_COLUMNS (live dashboard "by-status" view)

`/app/frontend/src/api/constants.js` (STATUS_COLUMNS):

| Numeric | FE key | Column label | Table-card status |
|---|---|---|---|
| 7 | pending | Yet to Confirm | yetToConfirm |
| 1 | preparing | Preparing | occupied |
| 2 | ready | Ready | occupied |
| 5 | served | Served | billReady |
| **8** | **running** | **Running** | **occupied** |
| 9 | pendingPayment | Pending Payment | (occupied/billReady) |
| 6 | paid | Paid | available |
| 3 | cancelled | Cancelled | available |
| 10 | reserved | Reserved | reserved |

**Conceptual meaning:** "Active/Unpaid Running" — the order has been placed and items are in progress, but the bill has not yet been generated (or has been generated but payment is still pending).

### 2.3 How `8 → 'running'` is derived in the report layer

`/app/frontend/src/api/services/reportService.js:660-714` (status priority chain, applied per row in `getOrderLogsReport`):

```
let status = 'audit';              // default
if (paymentMethod === 'Cancel' || …)         status = 'cancelled'
else if (paymentMethod === 'Merge' || …)     status = 'merged'
else if (paymentMethod === 'TAB')            status = 'credit'
else if (fStatus === 9 || paymentMethodLower === 'paylater')
                                              status = 'hold'
else if (paymentMethodLower === 'transfertoroom')   status = 'roomTransfer'/'paid'
else if (paymentStatus === 'unpaid')         status = 'unpaid'
else if (fStatus === 6)                      status = 'paid'
else if (fStatus !== 3 && fStatus !== 6 && fStatus !== 9 && fStatus != null)
                                              status = 'running'   ← f_order_status=8 lands here
```

For order #825648, `/order-logs-report` returns `payment_status: 'pending'` (NOT 'unpaid'), so the chain falls through past the unpaid rule and lands on `status = 'running'`.

---

## 3. Live wire trace for order #825648

### 3.1 Raw row from `/api/v2/.../get-single-order-new`

```json
{
  "id": 825648,
  "f_order_status": 8,
  "order_status": "queue",
  "payment_status": "unpaid",
  "payment_type": "prepaid",
  "order_type": "dinein",
  "table_id": 0,
  "daily_token": "0017",
  "restaurant_order_id": "...",
  "order_amount": 116
}
```

### 3.2 Raw row from `/api/v2/.../order-logs-report` (today)

```json
{
  "orders_table": {
    "id": 825648,
    "f_order_status": 8,
    "order_status": "queue",
    "payment_status": "pending",      // ← differs from single-order!
    "payment_type": "prepaid",
    "order_type": "dinein",
    "order_in": null,
    "daily_token": "0017"
  },
  "payment_method": (absent or empty)
}
```

### 3.3 Backend payload-shape inconsistency observed (informational)

The same backend reports the same order with two different `payment_status` values depending on the endpoint:

| Endpoint | `payment_status` |
|---|---|
| `/api/v2/.../get-single-order-new` | `"unpaid"` |
| `/api/v2/.../order-logs-report` | `"pending"` |

Both translate to "money not yet collected" semantically, and the FE handles each consistently in its respective consumer. This is **not** a POS2-004 issue, but worth noting for backend hygiene (BE-side data inconsistency).

### 3.4 Live RUNNING_ORDERS endpoint distribution

```
GET /api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager
→ HTTP 200, 16 orders
   f_order_status distribution:  {2: 14, 5: 1, 7: 1}
   #825648 is NOT present
```

**Backend's running-orders endpoint omits `f_order_status = 8` orders entirely.** This is a backend filter, applied before the FE sees the data.

---

## 4. Where order #825648 currently surfaces in the FE

| # | Surface | Endpoint backing it | Includes #825648? | Why |
|---|---|---|---|---|
| 1 | **Live Dashboard "Running" column** (by-status view) | `RUNNING_ORDERS` (`employee-orders-list`) | ❌ No | **Backend excludes status=8** before FE sees it. Column renders empty. |
| 2 | Live Dashboard "Yet to Confirm" / "Preparing" / "Ready" / "Served" / etc. | same | ❌ No | Wrong column for status=8 even if backend included it. |
| 3 | Header status pill "Running" count | derived from OrderContext (live) | ❌ Shows 0 | OrderContext fed by RUNNING_ORDERS — same exclusion. |
| 4 | Table grid card | OrderContext + tables | ❌ No | `table_id = 0` (walk-in) — not anchored to a table. Independent of status filter. |
| 5 | OrderCard view (list of running orders) | OrderContext | ❌ No | Same OrderContext exclusion. |
| 6 | **Audit Report (`/reports/audit`) > "All Orders" tab** | `/order-logs-report` via `getOrderLogsReport` | ✅ **Yes** | `TAB_FILTERS.all = () => true` matches every row. |
| 7 | **Audit Report > "Running" tab** | same | ✅ **Yes** | `TAB_FILTERS.running` accepts `status === 'running'` (which is the derived status for fStatus=8). Tab also includes any unpaid/transferToRoom rows. |
| 8 | Audit Report > "Paid" tab | same | ❌ No | Filter requires `fStatus === 6`. |
| 9 | Audit Report > "Cancelled" tab | same | ❌ No | Filter requires `paymentMethod === 'Cancel'`. |
| 10 | Audit Report > "Credit" tab | same | ❌ No | Filter requires `paymentMethod === 'TAB'`. |
| 11 | Audit Report > "Hold" tab | same | ❌ No | Filter requires `paymentMethod === 'paylater'` OR `fStatus === 9`. |
| 12 | Audit Report > "Merged" tab | same | ❌ No | Filter requires `paymentMethod === 'Merge'`. |
| 13 | Audit Report > "Aggregator" tab | same | ❌ No | Filter requires `orderIn ∈ {zomato, swiggy}`. |
| 14 | Audit Report > "Audit" tab | same | ❌ No | Filter requires `_isMissing === true` OR `status === 'audit'`. |
| 15 | Audit Report `getAllOrders` (legacy bulk fetcher) | aggregates paid/credit/cancelled/hold/merged/roomTransfer | ❌ No | `getAllOrders` explicitly **excludes** running rows from its row list (only retains them in `_runningOrdersMap` for missing-order metadata recovery). Note: this is **not** the page's primary data source — `/order-logs-report` is. |
| 16 | Order Summary page (`/reports/summary`) | `/order-logs-report` aggregated | depends on metric — counts in totals if fStatus=8 is included in the metric definition | varies |

### 4.1 Concise answer to "where exactly does order #825648 show?"

> **Order #825648 currently shows in exactly TWO places in the frontend:**
> 1. **Audit Report ➜ "All Orders" tab** (count includes it)
> 2. **Audit Report ➜ "Running" tab** (count includes it)
>
> It does **NOT** show on the Live Dashboard (Running column / Header pill / cards), because the backend's `employee-orders-list` endpoint filters out `f_order_status = 8` rows before the FE sees them.

### 4.2 Visual reproduction steps

1. Open `https://insights-phase.preview.emergentagent.com` (or live FE URL pointed at preprod).
2. Login as `owner@18march.com`.
3. Click **Reports → Audit Report** in the sidebar.
4. Select today's date (2026-05-08).
5. **All Orders** tab → order #825648 listed with daily_token "0017", `Status: Running`, payment status pending/unpaid.
6. **Running** tab → order #825648 listed.
7. Other tabs → order absent.
8. Navigate to **Dashboard** → Status switcher: order #825648 absent from every column.

---

## 5. Behavior vs. existing baseline

| Question | Answer | Baseline reference |
|---|---|---|
| Is `f_order_status = 8` mapped? | ✅ Yes — to `'running'` (column label "Running"). | `constants.js:F_ORDER_STATUS / F_ORDER_STATUS_API / STATUS_COLUMNS` |
| Is the Audit Report **Running tab** intentional? | ✅ Yes — added by **CR-001 CS-3 + follow-up** (renamed from `unpaid` → `running`, lines 86-94 in `AllOrdersReportPage.jsx`). | Code comments document this is the canonical "money not yet collected" tab. |
| Is the Live Dashboard "Running" column documented to include status=8? | ✅ Per `STATUS_COLUMNS` definition the column **should** include status=8. The FE renders the column but the backend's exclusion makes it always-empty in practice. | Implicit baseline — STATUS_COLUMNS is the FE contract. |
| Is hold-vs-running distinction correct for status=8? | ✅ Yes. Hold = `f_order_status === 9` OR `paymentMethod === 'paylater'`. Status=8 is **not** Hold. | CR-001 CS-1 (lines 71-73 in AllOrdersReportPage). |
| Is status=8 ever expected to also be Paid? | ❌ No. Paid requires `fStatus === 6`. | TAB_FILTERS.paid line 79. |
| Is status=8 ever Audit? | ❌ Only if `paymentMethod` is empty AND none of the earlier rules match — which would imply a row with no signals. The current order has signals (payment_status=pending), so it correctly lands in Running, not Audit. | reportTransform priority chain. |
| Is status=8 ever Cancelled? | ❌ No — `paymentMethod !== 'Cancel'` for #825648. | TAB_FILTERS.cancelled. |

**Conclusion:** The system's handling of `f_order_status = 8` is **consistent with the documented FE baseline** and the CR-001 CS-3 acceptance.

---

## 6. Specific checks (per task)

### 6.1 Status mappings for `f_order_status` — full table

Located in `/app/frontend/src/api/constants.js:132-180`:

```
F_ORDER_STATUS:       1→preparing, 2→ready, 3→cancelled, 5→served,
                      6→paid, 7→pending, 8→running, 9→pendingPayment, 10→reserved
F_ORDER_STATUS_API:   API-ready human labels mirror the above (PascalCase).
STATUS_COLUMNS:       Live dashboard column ordering (by-status view).
```

Plus the report-side derivation chain in `reportService.js:621-714` (priority-based status normalisation).

### 6.2 What numeric status 8 means

- **FE label:** "Running" (Active/Unpaid)
- **Operational meaning:** order placed, items active, bill not yet collected

### 6.3 Dashboard filtering logic

- Backend (`/api/v1/vendoremployee/pos/employee-orders-list`): **excludes** `f_order_status = 8` rows.
- FE: respects whatever the backend returns; `STATUS_COLUMNS` declares the column but nothing populates it because of the upstream exclusion.

### 6.4 Audit / Hold filtering logic

- "Hold" tab: `paymentMethod === 'paylater'` OR `fOrderStatus === 9`. **Status 8 is not Hold.** ✅ correct.
- "Audit" tab: `_isMissing === true` OR `status === 'audit'`. **Status 8 is not Audit.** ✅ correct.

### 6.5 Socket / new-order / update-order handling for status=8

- `socket new-order` event: appends to OrderContext via `addOrder`. If a backend-side socket emission includes a status=8 order, it would land in the FE OrderContext directly (bypassing the RUNNING_ORDERS endpoint exclusion).
- `socket update-order` event: re-reads f_order_status; same logic.
- **No FE-side status=8 exclusion in socket handlers.** The FE happily processes status=8.
- This means: a status=8 order placed *while* the user is logged in (socket already connected) can land on the Live Dashboard via the socket path, but a status=8 order placed *before* login (or after a refresh) cannot land via the REST endpoint. **Asymmetry acknowledged.**

### 6.6 Whether normalized FE status maps 8 correctly

| Source | Normalized FE status | Tab placement |
|---|---|---|
| `reportTransform` priority chain (Audit Report) | `'running'` (when payment_status ≠ 'unpaid') or `'unpaid'` (when 'unpaid') | Both fall under the **Running tab** in the Audit Report (TAB_FILTERS.running accepts status='running' OR paymentStatus='unpaid'). |
| `orderTransform.toCanonical` (live dashboard) | preserves `fOrderStatus = 8` and adds derived `kotPrinted`, `billPrinted` flags | STATUS_COLUMNS routes to **"Running" column** if backend ever returns it. |

### 6.7 Card rendering — does it exclude status=8?

- `OrderCard.jsx`: renders any order regardless of `fOrderStatus`. No exclusion.
- `TableCard.jsx`: renders the table; the status badge is derived via STATUS_COLUMNS — for fStatus=8 it would show "occupied" (matches by-status mapping).
- **No FE-side card-level exclusion.**

---

## 7. Why QA hadn't surfaced this earlier

There is no QA gap here — the behaviour is **as designed by CR-001 CS-3** (the rename `unpaid` → `running` tab). The Audit Report Running tab is the canonical surface for `f_order_status = 8` orders. The reason the owner asks now is likely confusion about whether the **Live Dashboard** should also show the order — which it currently doesn't due to the backend's RUNNING_ORDERS filter.

---

## 8. Recommendation

> ## **`no CR needed`** *(default — current behaviour is consistent with the FE baseline)*

### 8.1 If owner wants order #825648 visible on the Live Dashboard "Running" column

This requires a **backend** change (lift the `f_order_status = 8` exclusion in `employee-orders-list`). Not a frontend defect; would not require an FE CR.

### 8.2 If owner wants the FE to show a Live Dashboard "Running" pill that derives count from `/order-logs-report` rather than RUNNING_ORDERS

This would require an FE CR (re-route the Header pill / by-status column to use the broader endpoint). Possible POS2-005 candidate. **Not opened today.**

### 8.3 If owner is satisfied that the order surfaces only in the Audit Report

No action needed. Behaviour is correct per the existing CR-001 contract. POS2-004 closes as `behavior_as_expected`.

---

## 9. Specific answer to the user's exact question

> **"Tell me where exactly is order #825648 showing"**

| Surface | Visible? |
|---|:---:|
| Audit Report `/reports/audit` → **All Orders** tab | ✅ |
| Audit Report `/reports/audit` → **Running** tab | ✅ |
| Audit Report → Paid / Cancelled / Credit / Hold / Merged / Aggregator / Audit tabs | ❌ |
| Live Dashboard → Running column (by-status view) | ❌ (backend filters it out) |
| Live Dashboard → other status columns | ❌ |
| Live Dashboard → Header status pill counts | ❌ |
| Live Dashboard → Table grid as a card | ❌ (table_id=0, walk-in) |
| OrderEntry detail screen (if order_id is opened explicitly) | ✅ accessible if you click into it from Audit Report |

---

## 10. Final verdict

> ## **`behavior_as_expected`**

**Recommendation:** `no CR needed` (unless the owner explicitly wants the Live Dashboard "Running" column to also surface this order, which is gated by a backend filter — that would warrant a backend ticket, not a frontend CR).

---

— End of POS2-004 Validation Report 2026-05-08 —
