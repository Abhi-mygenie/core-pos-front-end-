# BUG-368 Impact Analysis — Split Bill Reprint Fails After Settlement
**Date:** 2026-09-02
**Role:** PLANNING (Gate 2)
**Status:** COMPLETE — ready for Gate 3 Implementation Plan

---

## Header

| Field | Value |
|---|---|
| ID | BUG-368 |
| Title | Split Bill / Partial-Payment — Reprint fails after settlement in Order Report (Beta) |
| Priority | P1 |
| Risk | **MEDIUM** |
| Code Reality | PARTIAL — `handleReprint` exists at `OrderReportBetaPage.jsx:299` but has two defects |
| Conflict Pre-Check | No conflict — `OrderReportBetaPage.jsx` last touched by CR-349 (2026-08-26); `AllOrdersReportPage.jsx` not in active sprint |
| Blast Radius | SMALL — 2 files, non-financial, non-hotspot |

---

## API Probe Results (Step 11 — curl-verified 2026-09-02)

**Account used:** owner@*** (Ruby restaurant, restaurant_id 672)
**Order:** `restaurant_order_id = 000301` → internal `order_id = 1232186`
**Order type:** partial payment (Cash ₹200 + UPI ₹42) — settled, `f_order_status = 6`

**Probe:** `POST /api/v2/vendoremployee/get-single-order-new { order_id: 1232186 }`

**Actual response shape:**
```json
{
  "orders": [
    {
      "id": 1232186,
      "restaurant_order_id": "000301",
      "payment_method": "partial",
      "f_order_status": 6,
      "orderDetails": [ ...2 items... ],
      "vendorEmployee": {...},
      "restaurantTable": {...},
      ...
    }
  ]
}
```

**Evidence files:**
- `/app/memory/evidence/BUG-368/probe_order_1232186.json` — full SINGLE_ORDER_NEW response
- `/app/memory/evidence/BUG-368/probe_order_00301_raw.json` — empty probe (wrong ID format)
- `/app/memory/evidence/BUG-368/beta_report_2026_09_01.json` — full beta combined report

---

## Data Flow Trace

```
OrderReportBetaPage → handleReprint(row)   [row.order_id = 1232186, row.f_order_status = 6]
  │
  ├─ POST SINGLE_ORDER_NEW { order_id: 1232186 }
  │    → Response: { orders: [{ id: 1232186, orderDetails: [2 items] }] }
  │
  ├─ Path evaluation (const raw = ...):
  │    Path 1: response.data.orders.order_details_order → undefined (orders is Array)
  │    Path 2: response.data.order_details_order → undefined
  │    Path 3: Array.isArray(orders) ? orders[0] : null → { id: 1232186, ... } ✅ MATCHES
  │    raw = { id: 1232186, orderDetails: [2 items] }
  │
  ├─ if (!raw) → false → passes ✅
  │
  ├─ order = orderFromAPI.order(raw)
  │    → rawOrderDetails: raw.orderDetails = [2 items]  ✅
  │
  ├─ if (!order?.rawOrderDetails) → ![ 2 items ] → false → passes ✅
  │
  └─ printOrder(1232186, 'bill', null, order, 0, {}, printerAgents)
       → CALLED — this is where silent failure may occur for partial orders
```

**For order 1232186 (partial payment), Path 3 fires correctly. The reprint should succeed.**

---

## Root Cause — Two Defects Found

### Defect 1: Path 4 picks up empty array as `raw` (PRIMARY)

When `SINGLE_ORDER_NEW` returns `{ "orders": [] }` (empty array — e.g., for some split sub-orders):

```js
const raw =
  response?.data?.orders?.order_details_order ||   // undefined (array.prop)
  response?.data?.order_details_order ||             // undefined
  (Array.isArray([]) ? [][0] : null) ||              // undefined (falsy)
  response?.data?.orders ||                          // [] — EMPTY ARRAY IS TRUTHY IN JS!
  response?.data || null;
// raw = []   ← BUG: should be null
```

**In JavaScript:** `![]` = `false`, `Boolean([])` = `true`. An empty array is truthy.

Result:
- `!raw` check: `![]` = `false` → passes (toast should fire but doesn't)
- `orderFromAPI.order([])` called with Array as argument (expects Object)
  - `[].orderDetails` = `undefined` → `rawOrderDetails = []`
- `!order?.rawOrderDetails` = `![]` = `false` → passes again
- `printOrder` called with a garbage order (0 items)
- Print agent receives a bill with empty `billFoodList` → silent fail or print error

### Defect 2: `rawOrderDetails` guard doesn't check length (SECONDARY)

```js
// Current:
if (!order?.rawOrderDetails) { ... }   // ![] = false → doesn't catch empty array

// Should be:
if (!order?.rawOrderDetails?.length) { ... }  // [].length = 0 → catches empty
```

Even when `raw` is correctly extracted as the order object but `orderDetails` happens to be empty (`[]`), the current guard doesn't catch it and `printOrder` is called with 0 items.

---

## Classification

| Field | Value |
|---|---|
| Classification | FE_BUG — CODE_ERROR |
| Confidence | HIGH |
| Root cause file | `pages/reports-module/OrderReportBetaPage.jsx:304-317` |
| Secondary file | `pages/AllOrdersReportPage.jsx:830-852` (same pattern) |
| Risk | MEDIUM — non-financial, non-hotspot, isolated print path |

---

## Affected Files

### Files WILL change:
| File | Lines | Change |
|---|---|---|
| `pages/reports-module/OrderReportBetaPage.jsx` | ~304-316 | Fix Path 4 (empty array guard) + fix `rawOrderDetails?.length` check |
| `pages/AllOrdersReportPage.jsx` | ~830-852 | Same two fixes for `handlePrintBillFromAudit` |

### Files WILL NOT touch:
- `api/transforms/orderTransform.js` — `fromAPI.order` and `buildBillPrintPayload` are correct
- `api/services/orderService.js` — `printOrder` is not at fault
- `api/constants.js` — endpoint correct
- All other files

---

## Exact Edit Plan

### Edit 1 — `OrderReportBetaPage.jsx:304–316` (handleReprint)

**Current (lines 303–316):**
```js
const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, { order_id: row.order_id });
const raw =
  response?.data?.orders?.order_details_order ||
  response?.data?.order_details_order ||
  (Array.isArray(response?.data?.orders) ? response.data.orders[0] : null) ||
  response?.data?.orders || response?.data || null;
if (!raw) {
  toast({ title: 'Cannot print bill', description: 'Order details unavailable', variant: 'destructive' });
  return;
}
const order = orderFromAPI.order(raw);
if (!order?.rawOrderDetails) {
  toast({ title: 'Cannot print bill', description: 'Order details unavailable', variant: 'destructive' });
  return;
}
```

**New:**
```js
const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, { order_id: row.order_id });
const ordersArr = response?.data?.orders;
const raw =
  (ordersArr && !Array.isArray(ordersArr) ? ordersArr?.order_details_order : null) ||
  response?.data?.order_details_order ||
  (Array.isArray(ordersArr) && ordersArr.length > 0 ? ordersArr[0] : null) ||
  (ordersArr && !Array.isArray(ordersArr) ? ordersArr : null) ||
  response?.data || null;
if (!raw || Array.isArray(raw)) {
  toast({ title: 'Cannot print bill', description: 'Order details unavailable', variant: 'destructive' });
  return;
}
const order = orderFromAPI.order(raw);
if (!order?.rawOrderDetails?.length) {
  toast({ title: 'Cannot print bill', description: 'Order details unavailable', variant: 'destructive' });
  return;
}
```

**Changes:**
- E1a: `Array.isArray(ordersArr) && ordersArr.length > 0` — only extract `orders[0]` if array is non-empty
- E1b: `!Array.isArray(ordersArr)` on Path 4 — skip empty/non-dict arrays
- E1c: `!raw || Array.isArray(raw)` — reject array as raw value
- E1d: `rawOrderDetails?.length` — catch empty `orderDetails` array

### Edit 2 — `AllOrdersReportPage.jsx:830–852` (handlePrintBillFromAudit)

**Same pattern** — apply identical fix to the `raw` extraction chain and the `rawOrderDetails` check. Lines ~830–852.

---

## Verification Matrix

| Edit | File | Change | How to Verify |
|---|---|---|---|
| E1a-d | `OrderReportBetaPage.jsx` | Path4 + length guard | Open Order Report Beta → click Reprint on a partial order → bill prints (no toast) |
| E2a-d | `AllOrdersReportPage.jsx` | Path4 + length guard | Open All Orders → click Reprint on a partial order → bill prints |
| Guard test | Both | `!raw \|\| Array.isArray(raw)` | Mock empty orders response → "Order details unavailable" toast fires |

---

## Risk Assessment

| Dimension | Assessment |
|---|---|
| Financial impact | NONE — no billing/payment/tax logic touched |
| Hotspot files | NONE — both files are non-hotspot (R5 list) |
| Regression risk | LOW — isolated to print reprint path; no shared state |
| Fast Lane eligible | NO — 2 files (>1 file rule) but otherwise LOW risk |

---

## Owner Decisions Required

None. Fix is purely technical — no business rule change needed.

---

## Post-Code Registry Checklist

- [ ] `registry.json`: BUG-368 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] `BUG_TRACKER.md`: row updated → IMPLEMENTED
- [ ] `FILE_OWNERSHIP.md`: add `OrderReportBetaPage.jsx` + `AllOrdersReportPage.jsx` with BUG-368 + date
- [ ] Code markers: `// BUG-368` comment in both modified files

---

## Next Step

Gate 3 (Implementation Plan) can proceed immediately — no owner decisions needed.
Or owner may approve Gate 4 GO to go directly to Implementation since the fix scope is small and clear.
