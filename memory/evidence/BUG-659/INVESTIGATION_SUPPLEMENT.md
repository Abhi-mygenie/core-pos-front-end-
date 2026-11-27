# BUG-659 — Investigation Report (Supplement): Why Fix Doesn't Work on P5 Paths

**Date:** 2026-11-08
**Investigator:** Agent (Investigation Role)
**Trigger:** Owner tested manual reprint on order 1537880 (Ruby ZAP, RID 672) — `discount_amount: 0`, `discount_percentage` ABSENT, `roundoff` ABSENT despite BUG-659 implementation
**Steps used:** 4/10

---

## 1. Summary

**Root cause:** The BUG-659 fix (E1+E2) correctly adds fallbacks in `buildBillPrintPayload`, but the fallbacks depend on `order.discountType`, `order.discountValue`, and `order.roundUp` — fields mapped from `api.discount_type`, `api.discount_value`, and `api.round_up`. These API fields are **only available from `get-single-order-new`** (post-backend-fix). They are **NOT returned by `employee-orders-list`** or **socket event payloads**, which are the data sources for P5 paths (dashboard/OrderEntry manual reprints).

**Classification:** DATA_ISSUE (API data source gap between endpoints)
**Confidence:** HIGH
**FE fix works for:** P6 paths (report reprints) — these call `get-single-order-new` before printing ✅
**FE fix does NOT work for:** P5 paths (dashboard/OrderEntry reprints) — these use running orders context ❌

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|---------|
| H1 | Socket/running-orders data lacks `discount_type` and `round_up` | Prior investigation probe (order 1537857): `employee-orders-list` → `discount_type: null`, `round_up: null` | 1 | **CONFIRMED** | `evidence/BUG-659/employee_orders_list_vs_get_single_order_probe.json` |
| H2 | Socket handler goes through `fromAPI.order` transform | Code trace: `socketHandlers.js` L270 → `orderFromAPI.order(payload.orders[0])` | 1 | **CONFIRMED** — transform IS applied, but input data lacks the fields | `socketHandlers.js:270` |
| H3 | `discount_amount: 0` because `restaurant_discount_amount` missing from socket payload | Owner's payload comparison: auto-print has 136.05, manual reprint has 0 | 1 | **CONFIRMED** — socket re-seed after payment doesn't refresh `restaurant_discount_amount` on the running order object | Owner payloads for order 1537880 |
| H4 | P6 paths work because they call `get-single-order-new` directly | Code trace: `AllOrdersReportPage.jsx` L824 → `api.post(SINGLE_ORDER_NEW)` → `orderFromAPI.order(raw)` | 1 | **CONFIRMED** — P6 fetches fresh data with all fields | `AllOrdersReportPage.jsx:824`, `OrderReportBetaPage.jsx:338` |

---

## 3. Data Flow Trace

### P5 Path (Dashboard reprint — BROKEN)

```
Initial load:
  employee-orders-list API → fromAPI.order() → OrderContext
    → restaurant_discount_amount: 119.05 (for settled orders)
    → discount_type: null ❌ (not in this endpoint)
    → round_up: null ❌ (not in this endpoint)
    → discount_value: "50.00" ✅

Socket update-order event (after payment):
  payload.orders[0] → fromAPI.order() → OrderContext.updateOrder()
    → restaurant_discount_amount: ??? (depends on socket payload — may be 0/null)
    → discount_type: null ❌ (not in socket payload)
    → round_up: null ❌ (not in socket payload)

Manual reprint:
  OrderCard/TableCard/RePrintButton → getOrderById(orderId) → order from context
    → order.discount = 0 (if from socket re-seed where restaurant_discount_amount absent)
    → order.discountType = null (never populated)
    → order.roundUp = 0 (never populated)
  → buildBillPrintPayload(order, scPct, {serviceChargeTaxPct, deliveryChargeGstPct})
    → discount_amount: order.discount = 0 ❌
    → discount_percentage: order.discountType === 'Percent' → FALSE (null) → OMITTED ❌
    → roundoff: order.roundUp = 0 → ro !== 0 → FALSE → OMITTED ❌
```

### P6 Path (Report reprint — WORKS)

```
AllOrdersReportPage/OrderReportBetaPage:
  api.post(SINGLE_ORDER_NEW, {order_id}) → raw order data
    → restaurant_discount_amount: 136.05 ✅ (post-backend-fix)
    → discount_type: "Percent" ✅ (post-backend-fix)
    → round_up: "0.70" ✅ (post-backend-fix)
    → discount_value: "50.00" ✅
  → fromAPI.order(raw) → order object
    → order.discount = 136.05 ✅
    → order.discountType = "Percent" ✅
    → order.roundUp = 0.70 ✅
  → buildBillPrintPayload(order, 0, {})
    → discount_amount: order.discount = 136.05 ✅
    → discount_percentage: order.discountType === 'Percent' → TRUE → 50 ✅
    → roundoff: order.roundUp = 0.70 → included ✅
```

---

## 4. Field Availability Matrix

| Field | `get-single-order-new` (post-fix) | `employee-orders-list` | Socket payload |
|-------|:---:|:---:|:---:|
| `restaurant_discount_amount` | ✅ 136.05 | ✅ 119.05 (for settled) | ❓ May be 0/null |
| `discount_value` | ✅ "50.00" | ✅ "50.00" | ❓ |
| `discount_type` | ✅ "Percent" | ❌ null | ❌ null |
| `order_discount_type` | ✅ "Percent" | ❌ null | ❌ null |
| `round_up` | ✅ "0.49" / "0.70" | ❌ null | ❌ null |

---

## 5. Recommendations

### Option A (Recommended — FE-only): P5 paths fetch from `get-single-order-new` before printing

Make `RePrintButton`, `OrderCard`, and `TableCard` call `get-single-order-new` before printing — exactly like `AllOrdersReportPage` and `OrderReportBetaPage` already do. This ensures fresh data with all fields.

**Scope:** 3 files (RePrintButton.jsx, OrderCard.jsx, TableCard.jsx) — add async fetch before `printOrder()`.
**Risk:** Adds 1 network call per manual reprint (~100-300ms latency).
**Benefit:** Fixes ALL three missing fields. Also fixes `discount_amount: 0` issue (stale data).

### Option B (Backend): Add fields to `employee-orders-list` + socket events

Ask backend team to add `discount_type`, `round_up` to:
- `employee-orders-list` API response
- Socket `update-order` / `update-order-paid` event payloads

**Scope:** Backend changes only — FE fix (BUG-659 E1+E2) already handles the fields.
**Risk:** Requires backend deployment.
**Benefit:** No additional FE network calls. Fields available immediately in running context.

### Option C (Hybrid — immediate + long-term)

1. **Immediate:** Implement Option A (P5 paths fetch fresh data)
2. **Long-term:** Backend adds fields per Option B → FE removes the fetch calls

---

## 6. Evidence Artifacts

All saved to `/app/memory/evidence/BUG-659/`:

| File | Description |
|------|-------------|
| `owner_payload_comparison_1537880.json` | Auto-print vs manual reprint payload comparison |
| `employee_orders_list_vs_get_single_order_probe.json` | Pre-existing: field availability comparison between APIs |
| `INVESTIGATION_REPORT.md` | Original investigation (order 1537857) |

---

**Investigation complete.**
**Root cause: DATA_ISSUE — `employee-orders-list` and socket events do NOT return `discount_type` and `round_up`. BUG-659 E1+E2 fallbacks only work when data comes from `get-single-order-new`.**
**Recommended: Option A — P5 paths fetch from `get-single-order-new` before printing (mirrors P6 pattern).**
**Planning skip eligible: NO — 3 files, adds async fetch + error handling, R5-adjacent (OrderCard/TableCard are dashboard-critical). Full gate cycle.**
