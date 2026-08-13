# CR: Audit Report — Eliminate `get-single-order-new` & Extract Transform

**CR ID:** `AUDIT_REPORT_OPTIMISE_CR_2026_05_28`
**Date:** 2026-05-28
**Status:** `FROZEN_PLAN — PENDING_SIGN_OFF`
**Parent:** `AUDIT_REPORT_CONTRACT_FREEZE_2026_05_28`
**Rule:** No code shall be written until this plan is signed off. Every diff is shown as text, not applied.

---

## 1. Scope

> Eliminate the `get-single-order-new` API call on row click, extract the inline transform to `reportTransform.js`, fix the bill summary, and build lifecycle timeline — all using data already present in `/order-logs-report`.

**NOT in scope (parked):**
- Room SRM cascade elimination (GAP-8 — separate CR)
- `employee-orders-list` elimination (gap detection — needs backend change)
- Backend gap fixes (GAP 1-6 — separate backend delivery)

---

## 2. Files Affected

| # | File | Action | Risk |
|---|---|---|---|
| 1 | `frontend/src/api/transforms/reportTransform.js` | **MODIFY** — Add `orderLogsReport` transform + `deriveOrderStatus` utility | MEDIUM — hotspot file per playbook |
| 2 | `frontend/src/api/services/reportService.js` | **MODIFY** — Replace inline transform with call to new transform | MEDIUM — hotspot |
| 3 | `frontend/src/components/reports/OrderDetailSheet.jsx` | **MODIFY** — Remove API call, read from row data | LOW |
| 4 | `frontend/src/pages/AllOrdersReportPage.jsx` | **MODIFY** — Pass full row (with items) to sheet | LOW |

**Files NOT touched:**
- `orderTransform.js` — no change
- `OrderTable.jsx` — no change (just passes row to `onRowClick`)
- `CollectBillPanelDrawer.jsx` — still needs its own `SINGLE_ORDER_NEW` call (print/collect bill needs `rawOrderDetails` which order-logs doesn't have)
- `AllOrdersReportPage.jsx` print handler (`handlePrintBillFromAudit`) — still needs its own `SINGLE_ORDER_NEW` call (same reason)
- `CreditCustomerDetailSheet.jsx` — still passes `{ id, orderId }` to `OrderDetailSheet` which will need its own fetch (not from order-logs context)

---

## 3. Impact Analysis — Other Consumers of `OrderDetailSheet`

`OrderDetailSheet` is used in 2 places:

| Consumer | How it calls | Impact of this CR |
|---|---|---|
| **AllOrdersReportPage** (Audit Report) | Passes `order` from row click → sheet fetches via `getSingleOrderNew(order.id)` | ✅ **CHANGED** — will pass full row data, no API call |
| **CreditCustomerDetailSheet** (Credit panel) | Passes `{ id: orderId, orderId: restaurantOrderId }` → sheet fetches via `getSingleOrderNew` | ⚠️ **NOT CHANGED** — Credit panel doesn't have order-logs data. Sheet must still support API-fetch mode as fallback |

**Decision:** `OrderDetailSheet` must support TWO modes:
1. **Data mode** (new) — row data with items already attached → render immediately
2. **Fetch mode** (existing) — only `order.id` provided → call `getSingleOrderNew` as today

The sheet detects mode by checking: `if (order?.items)` → data mode, else → fetch mode.

---

## 4. Diffs (text only — for review before implementation)

### Diff 1: Add `orderLogsReport` transform to `reportTransform.js`

**File:** `frontend/src/api/transforms/reportTransform.js`
**Location:** After `reportFromAPI` object (after L647), before `reportListFromAPI`

**What it does:**
- Moves the 300-line inline transform from `reportService.js:636-947` into a proper named function
- Adds `order_details_table[]` parsing (JSON.parse food_details, variation, add_ons)
- Adds bill breakdown extraction from `orders_table`
- Attaches `operations[]` as-is (no transform needed, already structured)
- Extracts `deriveOrderStatus()` as an exported utility

**New exports:**
```
export const deriveOrderStatus = (api, activeSrmIds) => { ... }

// Inside reportFromAPI:
orderLogsReportRow: (orderWrapper, activeSrmIds) => { ... }

// Inside reportListFromAPI:
orderLogsReport: (orders, activeSrmIds) => orders.map(w => reportFromAPI.orderLogsReportRow(w, activeSrmIds))
```

**Shape of transformed row (extended — new fields marked with ★):**
```js
{
  // --- Existing fields (unchanged) ---
  id, orderId, displayOrderId, orderIdPrefix,
  amount, customer, waiter, tableNo, displayLocationLabel,
  punchedBy, actionedBy, actionedByLabel,
  table, tableId, orderIn, roomId, location,
  paymentMethod, paymentStatus, status, fOrderStatus,
  createdAt, collectedAt, orderType,
  channel, platform, razorpayOrderId, pgAmount, pgStatus, isPaymentGateway,
  discount, tax, tip, cancellationReason, cancellationType,

  // --- ★ NEW: Bill breakdown (from orders_table) ---
  subtotal,              // ★ order_sub_total_without_tax (fallback: order_sub_total_amount)
  gstAmount,             // ★ total_gst_tax_amount
  vatAmount,             // ★ total_vat_tax_amount
  serviceChargeAmount,   // ★ total_service_tax_amount
  tipAmount,             // ★ tip_amount
  tipTaxAmount,          // ★ tip_tax_amount
  roundOff,              // ★ round_up
  deliveryCharge,        // ★ delivery_charge
  deliveryChargeGst,     // ★ delivery_charge_gst
  discountAmount,        // ★ restaurant_discount_amount
  couponCode,            // ★ coupon_code
  couponAmount,          // ★ coupon_discount_amount
  orderNote,             // ★ order_note

  // --- ★ NEW: Order-level lifecycle timestamps ---
  readyAt,               // ★ orders_table.ready_at
  serveAt,               // ★ orders_table.serve_at (when populated)

  // --- ★ NEW: Parsed items (from order_details_table[]) ---
  items: [               // ★ Array — parsed from order_details_table
    {
      id,                // item id
      foodId,            // food_id
      name,              // from JSON.parse(food_details).name
      quantity,          // direct
      unitPrice,         // direct
      price,             // direct (line total)
      isVeg,             // JSON.parse(food_details).veg === 1
      isEgg,             // JSON.parse(food_details).egg === 1
      image,             // JSON.parse(food_details).image
      taxPercent,        // JSON.parse(food_details).tax
      taxType,           // JSON.parse(food_details).tax_type
      taxCalc,           // JSON.parse(food_details).tax_calc
      station,           // direct
      itemType,          // direct
      foodStatus,        // direct (2=ready, 3=cancelled, 5=served)
      notes,             // food_level_notes
      variations,        // JSON.parse(variation) → mapped
      addOns,            // JSON.parse(add_ons) → mapped
      readyAt,           // direct
      readyBy,           // direct (employee ID)
      serveAt,           // direct
      serveBy,           // direct (employee ID)
      cancelAt,          // direct
      cancelBy,          // direct
      cancelByName,      // direct (actual name!)
      cancelType,        // direct (Pre-Serve / Post-Serve)
      cancelReason,      // cancel_reason_text
      complementary,     // direct (0/1)
      gstAmount,         // gst_tax_amount
      vatAmount,         // vat_tax_amount
      discountAmount,    // discount_amount
      serviceCharge,     // service_charge
    }
  ],
  itemCount,             // ★ items.length

  // --- ★ NEW: Lifecycle timeline ---
  timeline: {            // ★ Derived from items + orders_table + operations
    created,             // orders_table.created_at
    ready,               // orders_table.ready_at OR min(items[].readyAt)
    served,              // max(items[].serveAt)
    paid,                // orders_table.collect_bill (when paid)
    cancelled,           // min(items[].cancelAt) (when cancelled)
  },

  // --- ★ NEW: Operations audit trail (pass-through) ---
  operations: [...]      // ★ Raw operations[] array from wrapper

  // --- ★ NEW: Derived flags ---
  isCancelled,           // ★ payment_method === 'Cancel' etc
  isMerged,              // ★ payment_method === 'Merge' etc
}
```

**Lines added:** ~200 (transform function + item parsing + bill extraction)
**Lines removed from reportService.js:** ~300 (inline transform)
**Net:** ~100 lines less total code

---

### Diff 2: Replace inline transform in `reportService.js`

**File:** `frontend/src/api/services/reportService.js`
**Location:** `getOrderLogsReport()` function (L528-1066)

**Before (current):** 400+ lines including inline transform, dev diagnostics, WATCH_ORDER_IDS

**After:**
```js
export const getOrderLogsReport = async (date, schedules, sortBy = 'created_at', activeSrmIds = null) => {
  const dateStr = formatDateParam(date);
  const { start, end } = getBusinessDayRange(dateStr, schedules);

  const response = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, {
    sort_by: sortBy,
    from_date: dateStr,
    to_date: dateStr,
  });

  const orders = response.data?.order || [];

  // Transform via reportTransform (replaces 300-line inline transform)
  const transformedOrders = reportListFromAPI.orderLogsReport(orders, activeSrmIds);

  // Filter by business day
  const filteredOrders = transformedOrders.filter(o => {
    const createdAt = (o.createdAt || '').replace('T', ' ').substring(0, 19);
    return isWithinBusinessDay(createdAt, start, end);
  });

  return {
    orders: filteredOrders,
    totalOrders: filteredOrders.length,
  };
};
```

**Lines removed:** ~350 (inline transform + dev diagnostics)
**Lines added:** ~20

**Dev diagnostics disposition:**
- `[BE-1 INVARIANT]` checks → move to a gated utility in transform (only runs in dev)
- `WATCH_ORDER_IDS` + G5 snapshots → **remove** (investigation-specific, no longer needed)
- `[CR-001 DIAG]` logging → **remove** (CR-001 is closed)

---

### Diff 3: Update `OrderDetailSheet` — dual mode (data + fetch)

**File:** `frontend/src/components/reports/OrderDetailSheet.jsx`

**Current** (L482-516): Always calls `getSingleOrderNew(order.id)` on mount

**After:** Detect mode and skip fetch when data is attached

```js
useEffect(() => {
  if (!order?.id) { setDetails(null); return; }
  if (order._isMissing) { setDetails(null); setError('missing'); return; }

  // ★ DATA MODE: items already attached from order-logs-report
  if (order.items) {
    setDetails(order);  // Use row data directly
    setIsLoading(false);
    setError(null);
    return;
  }

  // FETCH MODE: fallback for Credit panel and other consumers
  const fetchDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSingleOrderNew(order.id);
      // ... existing fetch logic unchanged
    }
  };
  fetchDetails();
}, [order]);
```

**Lines changed:** ~15 (add data-mode detection before existing fetch logic)

**Bill summary update** (L726-760):

```js
// BEFORE (remainder hack):
Tax (GST) = amount - subtotal - deliveryCharge   // Can show ₹-50

// AFTER (real fields):
{displayData.subtotal > 0 && <Row label="Subtotal" value={displayData.subtotal} />}
{displayData.discountAmount > 0 && <Row label="Discount" value={-displayData.discountAmount} />}
{displayData.couponAmount > 0 && <Row label={`Coupon (${displayData.couponCode})`} value={-displayData.couponAmount} />}
{displayData.deliveryCharge > 0 && <Row label="Delivery" value={displayData.deliveryCharge} />}
{displayData.gstAmount > 0 && <Row label="GST" value={displayData.gstAmount} />}
{displayData.vatAmount > 0 && <Row label="VAT" value={displayData.vatAmount} />}
{displayData.serviceChargeAmount > 0 && <Row label="Service Charge" value={displayData.serviceChargeAmount} />}
{displayData.tipAmount > 0 && <Row label="Tip" value={displayData.tipAmount} />}
{displayData.roundOff != 0 && <Row label="Round-off" value={displayData.roundOff} />}
<Row label="Total" value={displayData.amount} bold />
```

**Lines changed:** ~30 (replace remainder hack with real field rendering)

**Timeline update** — use `order.timeline` when in data mode (already has ready/served/cancelled from transform), fall back to existing item-level derivation in fetch mode. ~10 lines changed.

---

### Diff 4: Pass full row to `OrderDetailSheet` in `AllOrdersReportPage`

**File:** `frontend/src/pages/AllOrdersReportPage.jsx`
**Location:** `handleRowClick` (L526) and `<OrderDetailSheet>` render (L1032)

**No change needed.** `handleRowClick` already passes the full row object:
```js
const handleRowClick = (order) => {
  setSelectedOrder(order);   // ← This IS the full transformed row
  setIsSheetOpen(true);
};
```

After Diff 1, the row object will have `items`, `timeline`, `operations`, bill fields already attached. The sheet will detect `order.items` exists → data mode → no fetch.

**Zero lines changed in this file for this diff.**

---

## 5. What STAYS Unchanged (Regression Boundaries)

| Component | Why unchanged |
|---|---|
| `handlePrintBillFromAudit` (AllOrdersReportPage L776) | Print needs `rawOrderDetails` from `orderTransform.order()` which order-logs doesn't provide. Keep its own `SINGLE_ORDER_NEW` call. |
| `CollectBillPanelDrawer` | Collect bill needs `rawOrderDetails` for payment payload. Keep its own `SINGLE_ORDER_NEW` call. |
| `CreditCustomerDetailSheet` → `OrderDetailSheet` | Credit panel doesn't have order-logs context. Passes `{ id, orderId }` → sheet uses fetch mode (existing behavior). |
| `CreditManagementPanel` → `getSingleOrderNew` | Separate flow, not part of audit report. Untouched. |
| `fetchSingleOrderForSocket` (orderService.js) | Socket flow, completely separate. Untouched. |
| `getSingleOrderRoom` (reportService.js) | Room report flow. Untouched. |
| Tab filters (`TAB_FILTERS`) | No change to filter logic. Same fields, same derivation. |
| Gap detection logic | No change. Uses `orderId` field which stays identical. |
| Room SRM cascade (`getActiveSrmIds`) | Parked. Stays as-is. |

---

## 6. Implementation Order & Gates

```
Gate G-0 — APPROVE THIS PLAN                          [PENDING]

Step 1 — Diff 1: Add transform to reportTransform.js  [HOLD until G-0]
  Gate G-1 — Review transform shape + item parsing

Step 2 — Diff 2: Replace inline in reportService.js   [HOLD until G-1]
  Gate G-2 — Build green, lint clean

Step 3 — Diff 3: Update OrderDetailSheet dual mode     [HOLD until G-2]
  Gate G-3 — Audit modal opens instantly (data mode)
           — Credit modal still works (fetch mode)

Step 4 — Diff 4: (No change needed — verify)           [HOLD until G-3]
  Gate G-4 — Full regression: all tabs, row clicks, print, collect bill

Gate G-5 — FINAL SIGN-OFF                             [HOLD until G-4]
```

---

## 7. Test Matrix

### Functional Tests

| # | Test | Expected |
|---|---|---|
| T-1 | Open Audit Report, select date, rows load | Rows populate as today. Network: only `employee-orders-list` + `get-room-list` (if rooms) + `order-logs-report`. NO `get-single-order-new` in list. |
| T-2 | Click any Paid order row | Modal opens **instantly** (no spinner). Items shown with name, qty, price, veg indicator, station, variations, add-ons. NO `get-single-order-new` call in network. |
| T-3 | Click any Cancelled order row | Modal shows cancel badge, item crossed out, cancel_by_name, cancel_type, cancel_reason. Timeline shows Created → Cancelled. |
| T-4 | Click any Merged order row | Modal shows Merged badge. |
| T-5 | Check bill summary on a paid order | Shows Subtotal, GST, VAT (if any), SC (if any), Tip (if any), Round-off (if any), Discount (if any), Coupon (if any), Delivery (if any), Total. NO negative tax values. |
| T-6 | Check bill summary on cancelled order | Subtotal shows, Total shows ₹0, Tax does NOT show ₹-50. |
| T-7 | Check timeline on order with serve_at | Shows Created → Served → Paid with times and durations. |
| T-8 | Check timeline on order with ready_at + serve_at | Shows Created → Ready → Served → Paid. |
| T-9 | Credit panel → click order → OrderDetailSheet | Modal still calls `getSingleOrderNew` (fetch mode). Items load after spinner. Same behavior as today. |
| T-10 | Print Bill button (Paid tab) | Still calls `SINGLE_ORDER_NEW` directly. Print works as today. |
| T-11 | Collect Bill (Hold tab) | Still calls `SINGLE_ORDER_NEW` directly. Collect works as today. |
| T-12 | Tab counts | All tab counts identical to current behavior. |
| T-13 | Filters (status, payment, channel, platform, PG) | All filters work as today. |
| T-14 | Audit tab gap detection | Missing orders detected as today. |
| T-15 | Export (PDF/CSV) | Exports work as today. |

### Build / Lint

| # | Test |
|---|---|
| B-1 | `cd /app/frontend && CI=false yarn build` → exit 0 |
| B-2 | Lint clean on all 4 changed files |
| B-3 | No new ESLint errors |

### Restaurants to Test

| Restaurant | Why | Credential |
|---|---|---|
| owner@cafe103.com (rid=644) | No rooms, postpaid, has operations[] | Qplazm@10 |
| vishal@pav.com (rid=383) | Prepaid, has ready_at, no operations[] | Qplazm@10 |
| owner@palmhouse.com (rid=541) | Rooms, mixed pre/postpaid, has operations[] | Qplazm@10 |

---

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `food_details` JSON string malformed on some orders | LOW | Item name shows "Unknown" | Try-catch `JSON.parse`, fallback to `{name: 'Unknown'}` |
| `variation` / `add_ons` JSON string malformed | LOW | Variations/add-ons not shown | Try-catch, fallback to `[]` |
| Large order count (200+ orders) with full items → memory | LOW | Page slightly heavier | Items are small (name + price + qty); 200 orders × 5 items avg × ~200 bytes = ~200KB — acceptable |
| Credit panel `OrderDetailSheet` regression | MEDIUM | Credit drill-down breaks | Dual-mode design: `order.items` check gates data vs fetch mode |
| Print/Collect Bill regression | LOW | Print or collect fails | These paths are NOT changed — they keep their own `SINGLE_ORDER_NEW` calls |

---

## 9. Rollback

Single-file revert per diff:
```bash
git checkout HEAD~1 -- frontend/src/api/transforms/reportTransform.js \
                       frontend/src/api/services/reportService.js \
                       frontend/src/components/reports/OrderDetailSheet.jsx
```

All new transform fields default to `undefined`/`null` → sheet falls back to fetch mode → zero consumer breakage.

---

## 10. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code edited by writing this plan | CONFIRMED |
| 2 | All diffs shown as text, not applied | CONFIRMED |
| 3 | `/app/memory/final/` UNTOUCHED | CONFIRMED |
| 4 | `/app/memory/crm/crm_1_0/` UNTOUCHED | CONFIRMED |
| 5 | No new dependencies, no new APIs | CONFIRMED |
| 6 | Print + Collect Bill flows untouched | CONFIRMED |
| 7 | Credit panel OrderDetailSheet untouched (fetch mode preserved) | CONFIRMED |
| 8 | Room cascade untouched (parked) | CONFIRMED |

---

## 11. Sign-Off

| Party | Name | Date | Status |
|---|---|---|---|
| **Owner** | | | `PENDING` |

**No implementation until sign-off.**

---

*End of CR Plan.*
*Document path: `/app/memory/change_requests/AUDIT_REPORT_OPTIMISE_CR_PLAN_2026_05_28.md`*
