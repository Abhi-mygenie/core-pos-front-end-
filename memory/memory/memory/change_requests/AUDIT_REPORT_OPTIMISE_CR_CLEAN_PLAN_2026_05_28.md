# CR: Audit Report Optimise — Clean Implementation Plan

**CR ID:** `AUDIT_REPORT_OPTIMISE_CR_2026_05_28_V2`
**Date:** 2026-05-28
**Status:** `CODE_COMPLETE — QA_PENDING`
**Parent:** `AUDIT_REPORT_CONTRACT_FREEZE_2026_05_28`
**Branch:** `28-may`
**Hard Rule:** If data is not in the API response, don't show it. No fallbacks, no derivations, no remainder hacks.

---

## 1. Scope

> Eliminate `get-single-order-new` API call on row click by parsing `order_details_table[]` and `operations[]` already present in `/order-logs-report`. Extract the inline transform. Fix bill summary. Build lifecycle timeline.

**NOT in scope:**
- Room SRM cascade elimination (GAP-8 — separate CR)
- `employee-orders-list` elimination (gap detection)
- Backend gap fixes

---

## 2. Drift Analysis (27-may plan vs 28-may code)

| Item | Previous Plan (27-may) | Current Code (28-may) | Impact |
|---|---|---|---|
| `reportService.js` line count | ~1066 lines | **1257 lines** | ~190 lines added since plan. Inline transform at L636-947 is now L636-1066. Extra diagnostic blocks added. |
| `reportTransform.js` line count | ~647 lines | **746 lines** | Minor additions. Structure unchanged. New transforms to be added after L659 (after `reportListFromAPI`). |
| `OrderDetailSheet.jsx` line count | ~760 lines (plan said L482-516 for fetch) | **802 lines**. Fetch at L482-516 confirmed. | Bill summary at L726-760 — **confirmed: remainder hack still at L749-755**. |
| `AllOrdersReportPage.jsx` | Plan said no changes needed | **1063 lines**. `handleRowClick` at L526 passes full row. `<OrderDetailSheet order={selectedOrder}>` at L1032-1037. | **Confirmed: no changes needed** — row already passed as full object. |
| `CreditCustomerDetailSheet` → `OrderDetailSheet` | Passes `{ id, orderId }` only | **Confirmed at L718**: `order={billOrder ? { id: billOrder.orderId, orderId: ... } : null}` — no `items` field. | **Dual-mode confirmed needed**: Credit panel has no items → must keep fetch mode. |
| Inline transform return shape | Plan documented ~40 fields | **Current inline transform returns 42 fields** (L888-947). Additional fields: `pgAmount`, `pgStatus`, `displayOrderId`, `orderIdPrefix`, `displayLocationLabel`, `punchedBy`, `actionedBy`, `actionedByLabel`, `tableNo` | New fields must be preserved in extracted transform. |
| Dev diagnostics | Plan said ~80 lines | **Now ~180 lines** (L541-633 BE-1 invariant + L956-1060 CR-001/G5 diag) | Will be removed per plan. |
| Backend `operations[]` | Was empty on prepaid/merged/cancelled | **Now fixed by backend** — operations block populated | Timeline feature fully viable. |
| GAP-4 `payment_status` | Plan listed as always NULL | **Owner clarified: already exists, not a gap** | No concern. |
| GAP-6 `serve_at` | Plan listed as inconsistent | **Owner clarified: restaurant configuration, not a gap** | Show only if present. |

---

## 3. Files Affected

| # | File | Lines | Action | Risk |
|---|---|---|---|---|
| 1 | `frontend/src/api/transforms/reportTransform.js` | 746 | **ADD** new `orderLogsReportRow` transform after L659 | MEDIUM (hotspot per FA-03) |
| 2 | `frontend/src/api/services/reportService.js` | 1257 | **REPLACE** inline transform (L636-1066) with call to new transform. Remove diagnostics. | MEDIUM (hotspot) |
| 3 | `frontend/src/components/reports/OrderDetailSheet.jsx` | 802 | **MODIFY** — add data-mode detection, fix bill summary, add timeline | LOW |
| 4 | `frontend/src/pages/AllOrdersReportPage.jsx` | 1063 | **NO CHANGES** — verified row already passed as full object | NONE |

**Files NOT touched:**
- `orderTransform.js` — no change
- `OrderTable.jsx` — no change
- `CollectBillPanelDrawer.jsx` — keeps its own `SINGLE_ORDER_NEW` call
- `CreditCustomerDetailSheet.jsx` — passes `{ id, orderId }` → sheet uses fetch mode
- Print handler (`handlePrintBillFromAudit`) — keeps its own fetch

---

## 4. Implementation Steps

### Step 1 — Add `orderLogsReportRow` transform to `reportTransform.js`

**What it does:**
- New function `orderLogsReportRow(orderWrapper, activeSrmIds)` that:
  - Extracts all existing 42 fields from `orders_table` (preserving the current inline logic exactly)
  - **NEW:** Parses `order_details_table[]` items — `JSON.parse(food_details)`, `JSON.parse(variation)`, `JSON.parse(add_ons)` per item
  - **NEW:** Extracts bill breakdown fields from `orders_table`: `order_sub_total_without_tax`, `total_gst_tax_amount`, `total_vat_tax_amount`, `total_service_tax_amount`, `tip_amount`, `tip_tax_amount`, `round_up`, `delivery_charge`, `delivery_charge_gst`, `restaurant_discount_amount`, `coupon_code`, `coupon_discount_amount`, `order_note`
  - **NEW:** Attaches `operations[]` as-is from wrapper (no transform needed)
  - **NEW:** Builds `timeline` from `operations[]` only — strict, no item-level fallback
- New list transform `orderLogsReport(orders, activeSrmIds)`
- Exports `deriveOrderStatus` as reusable utility (extracted from inline)

**Key rule:** Only show data that exists. No fallbacks. If `operations[]` is empty, timeline is empty. If a bill field is NULL, don't include it.

**Shape of new fields added to each row:**
```js
{
  // ...existing 42 fields unchanged...

  // NEW: Bill breakdown (strictly from orders_table, show only if non-null)
  subtotal,              // order_sub_total_without_tax
  gstAmount,             // total_gst_tax_amount
  vatAmount,             // total_vat_tax_amount
  serviceChargeAmount,   // total_service_tax_amount
  tipAmount,             // tip_amount
  tipTaxAmount,          // tip_tax_amount
  roundOff,              // round_up
  deliveryCharge,        // delivery_charge
  deliveryChargeGst,     // delivery_charge_gst
  discountAmount,        // restaurant_discount_amount
  couponCode,            // coupon_code
  couponAmount,          // coupon_discount_amount
  orderNote,             // order_note

  // NEW: Parsed items from order_details_table[]
  items: [{
    id, foodId, name, quantity, unitPrice, price,
    isVeg, isEgg, image, taxPercent, taxType, taxCalc,
    station, itemType, foodStatus, notes,
    variations, addOns,
    readyAt, readyBy, serveAt, serveBy,
    cancelAt, cancelByName, cancelType, cancelReason,
    complementary, gstAmount, vatAmount, discountAmount, serviceCharge,
  }],
  itemCount,

  // NEW: Operations (pass-through)
  operations: [...],

  // NEW: Timeline (from operations[] only — no fallback)
  timeline: {
    created,    // orders_table.created_at
    confirmed,  // first operation with status transition to confirmed
    ready,      // orders_table.ready_at (if present)
    served,     // orders_table.serve_at (if present) — restaurant config dependent
    paid,       // orders_table.collect_bill (if present)
    cancelled,  // from operations[] cancel entry (if present)
  },
}
```

### Step 2 — Replace inline transform in `reportService.js`

**What changes:**
- L636-1066 (inline transform + all diagnostics) replaced with:
  ```js
  const transformedOrders = reportListFromAPI.orderLogsReport(orders, activeSrmIds);
  ```
- **Remove:** BE-1 invariant block (L541-633), CR-001 DIAG (L956-979), WATCH_ORDER_IDS (L985-1034), G5 snapshot (L1036-1060)
- **Keep:** API call (L528-539), business-day filter (L950-954), return statement (L1062-1065)

**Net effect:** ~530 lines removed, ~5 lines added. Service becomes a thin fetch-transform-filter function.

### Step 3 — Update `OrderDetailSheet.jsx`

**3a. Dual-mode detection (before existing fetch):**
```js
// DATA MODE: items already attached from order-logs-report
if (order.items) {
  setDetails(order);
  setIsLoading(false);
  setError(null);
  return;
}
// FETCH MODE: fallback for Credit panel
// ...existing fetch logic unchanged...
```

**3b. Fix bill summary (L726-760):**
Replace the remainder hack with strict field rendering:
- Show each line ONLY if the field exists and is > 0
- Subtotal, Discount, Coupon, Delivery, GST, VAT, Service Charge, Tip, Round-off, Total
- No computation: each value comes directly from the row data
- Remove `Tax (GST) = amount - subtotal - deliveryCharge` calculation entirely

**3c. Timeline section (new):**
- Render from `displayData.timeline` — only show steps that have timestamps
- Render from `displayData.operations[]` — chronological activity log with WHO/WHEN
- If `operations` is empty array → don't show timeline section at all

### Step 4 — Verify `AllOrdersReportPage.jsx`

No changes. Verified:
- `handleRowClick` at L526 passes full row object
- `<OrderDetailSheet order={selectedOrder}>` at L1032-1037
- After Step 1, row object will have `items`, `operations`, `timeline`, bill fields attached
- Sheet detects `order.items` → data mode → no fetch → instant open

---

## 5. Regression Boundaries (MUST NOT change)

| Component | Why unchanged |
|---|---|
| `handlePrintBillFromAudit` | Print needs `rawOrderDetails` from `orderTransform.order()`. Keep its own `SINGLE_ORDER_NEW` call. |
| `CollectBillPanelDrawer` | Collect bill needs `rawOrderDetails` for payment payload. Keep its own call. |
| `CreditCustomerDetailSheet` → `OrderDetailSheet` | Passes `{ id, orderId }` — no `items` → sheet uses fetch mode (existing behavior). |
| Tab filters (`TAB_FILTERS`) | Same fields, same derivation. |
| Gap detection logic | Uses `orderId` field — unchanged. |
| Room SRM cascade (`getActiveSrmIds`) | Stays as-is. |
| Status derivation logic | Moved to transform but logic identical — zero behavioral change. |

---

## 6. Test Matrix

| # | Test | Expected |
|---|---|---|
| T-1 | Open Audit Report, select date, rows load | Rows populate as before. Network: `employee-orders-list` + `get-room-list` (if rooms) + `order-logs-report`. NO extra calls. |
| T-2 | Click any Paid order row | Modal opens **instantly** (no spinner). Items shown. NO `get-single-order-new` in network. |
| T-3 | Click any Cancelled order row | Modal shows cancel badge. Items shown if present. |
| T-4 | Click any Merged order row | Modal shows Merged badge. |
| T-5 | Bill summary on paid order | Shows real GST/VAT/SC/Tip/Roundoff from API. NO negative tax. NO remainder hack. |
| T-6 | Bill summary on cancelled order | Shows only what API sends. No ₹-50 tax. |
| T-7 | Timeline on order with operations[] | Shows chronological activity with WHO/WHEN. |
| T-8 | Timeline on order with empty operations[] | Timeline section not shown. |
| T-9 | Credit panel → click order → OrderDetailSheet | Modal still calls `getSingleOrderNew` (fetch mode). Same behavior as today. |
| T-10 | Print Bill button | Still calls `SINGLE_ORDER_NEW`. Same as today. |
| T-11 | Collect Bill (Hold tab) | Still calls `SINGLE_ORDER_NEW`. Same as today. |
| T-12 | Tab counts | Identical to current. |
| T-13 | All filters | Work as today. |
| T-14 | Audit tab gap detection | Missing orders detected as today. |

### Restaurants to Test

| Restaurant | Why | Credential |
|---|---|---|
| owner@cafe103.com (rid=644) | No rooms, postpaid, has operations[] | Qplazm@10 |
| vishal@pav.com (rid=383) | Prepaid, has ready_at | Qplazm@10 |
| owner@palmhouse.com (rid=541) | Rooms, mixed pre/postpaid | Qplazm@10 |

---

## 7. Implementation Order

```
Step 1 → Add transform to reportTransform.js
  Gate: Build green, lint clean

Step 2 → Replace inline in reportService.js  
  Gate: Build green, all tabs still render, tab counts identical

Step 3 → Update OrderDetailSheet dual mode + bill summary + timeline
  Gate: Row click = instant open (data mode), Credit panel = still fetches (fetch mode)

Step 4 → Verify AllOrdersReportPage (no changes)
  Gate: Full regression pass
```

---

## 8. Backend Gap Status (updated)

| Gap | Status | Impact on this CR |
|---|---|---|
| GAP-1 operations[] prepaid | ✅ FIXED | Timeline works for prepaid |
| GAP-2 operations[] merged | ✅ FIXED | Timeline works for merged |
| GAP-3 operations[] cancelled | ✅ FIXED | Timeline works for cancelled |
| GAP-4 payment_status | ✅ NOT A GAP (already exists) | No concern |
| GAP-5 order-level cancel fields | ⏳ PENDING BACKEND | If NULL → don't show. No fallback. |
| GAP-6 serve_at | ✅ NOT A GAP (restaurant config) | Show only if present |
| GAP-7 subtotal = 0 on rid=383 | Parked | Show only if > 0 |
| GAP-8 SRM payment_method | Parked | Room cascade stays |

---

*End of Clean Implementation Plan.*
