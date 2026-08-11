# CR-118 Print ID Investigation — Evidence

**Date:** 2026-07-31  
**Role:** INVESTIGATION  
**Finding:** ROOT CAUSE CONFIRMED via curl

---

## Issue

Manual print for aggregator orders (KOT/Bill) fires but print never arrives or goes to wrong printer.

---

## Curl Evidence (confirmed)

```bash
# Auth
POST /api/v1/auth/vendoremployee/login → token ✓

# Test A — Internal orderId (numeric)
POST /api/v1/urbanpiper/manually-print-aggregator
Body: { "aggr_order_id": "40500", "aggr_order_type": "aggr_kot" }
Response: { "order_id": 40500, "restaurant_id": 478 }   ← CORRECT restaurant

# Test B — External aggrId (Swiggy/Zomato string)
POST /api/v1/urbanpiper/manually-print-aggregator
Body: { "aggr_order_id": "3H5H9488", "aggr_order_type": "aggr_kot" }
Response: { "order_id": 3, "restaurant_id": 383 }       ← WRONG restaurant entirely
```

**Backend behaviour:** Casts `aggr_order_id` to integer. `"3H5H9488"` → leading digit `3` → looks up order ID 3 → belongs to restaurant 383. Print socket fires to **wrong restaurant**.

---

## Root Cause

All 3 files pass `order.aggrId` (Swiggy/Zomato external string like `"3H5H9488"`) as `aggr_order_id` instead of `order.orderId` (internal numeric DB ID like `40500`).

| File | Line | Current (WRONG) | Fix |
|------|------|-----------------|-----|
| `AggregatorOrderPopOut.jsx` | 121 | `const aggrId = order.aggrId \|\| order.orderId;` | `const printId = order.orderId;` |
| `OrderCard.jsx` | 260 | `const aggrId = order.aggrId \|\| order.orderId;` | `const printId = order.orderId;` |
| `TableCard.jsx` | 244 | `const aggrId = table.order?.aggrId \|\| table.aggrId \|\| table.orderId;` | `const printId = table.orderId;` |

---

## Why CR-118 Didn't Fix It

The plan at Gate 3 specified using `order.orderId` — but the implementation used `order.aggrId || order.orderId` (aggrId-first fallback). This means the Swiggy/Zomato string ID is always used when present, which is always — so the fallback to `orderId` never triggers.

---

## Fix Required (3 files, 1 line each)

Replace `aggrId` variable with `printId = order.orderId` / `table.orderId` in each handler. Downstream calls already correct:
- `manuallyPrintAggregator(printId, printType)` — no change to function signature
- Toast messages referencing `order.aggrId` for **display** are fine — display is separate from the API call

---

## Risk

LOW — 1-line change per file. No logic change. The internal `orderId` is always populated (it is the DB primary key from socket payload). No fallback needed.
