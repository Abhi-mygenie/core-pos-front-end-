# BUG-657 — `billPrinted` Missing from `orderItemsByTableId` Whitelist — CR-489 Lock Broken for Dine-In + Room Orders

**ID:** BUG-657
**Type:** BUG
**Priority:** P0 (security — CR-489 edit lock completely bypassed for dine-in and room orders)
**Risk:** HIGH (OrderContext.jsx — central data pipeline, all dine-in/room flows affected)
**Sprint:** nov_cr_batch
**Registered:** 2026-11-06
**Registered by:** INTAKE agent
**Source:** INVESTIGATION (traced from owner report on order #021106/C1 — bill printed but not locked)
**Related:** CR-489, BUG-656, BUG-583, CR-512

---

## Duplicate Check
- **DISTINCT** — not a duplicate of BUG-656 (which covered ungated handlers inside OrderEntry). This bug is about the data pipeline that feeds OrderEntry.
- **RELATED:** BUG-656 (OrderEntry lock gates), CR-489 (parent feature), BUG-583 (billPrinted rendering)

---

## Code Reality
**CONFIRMED GAP** — `OrderContext.jsx` line ~315, `orderItemsByTableId` useMemo builds a whitelist of fields per order. `billPrinted` is absent. Every other consumer of this whitelist (DashboardPage `getOrderDataForEntry` for dine-in/room orders) receives `billPrinted: undefined`.

---

## Evidence

- **Live API probe:** Order #021106 (C1) has `bill_print: "Yes"` in `employee-orders-list`
- **Dashboard card:** Shows green (BUG-583 works — adapters in DashboardPage use `getOrdersByTableId` which returns FULL order objects)
- **OrderEntry:** Lock NOT active — `isEditLocked` reads `orderData?.billPrinted` which is `undefined` because `getOrderDataForEntry` reads from `orderItemsByTableId` (whitelist, no `billPrinted`)
- **Confidence:** CONFIRMED (code-traced + live reproduction)

---

## Root Cause

Two different data paths for the same order:

| Path | Used by | Source | Has `billPrinted`? |
|------|---------|--------|:---:|
| `getOrdersByTableId(tableId)` | DashboardPage adapters (card rendering) | `orders.filter()` — full objects | ✅ Yes |
| `orderItemsByTableId[tableId]` | `getOrderDataForEntry` → OrderEntry `orderData` prop | **Whitelist memo** — picks fields explicitly | ❌ **No** |

The whitelist at `OrderContext.jsx` ~L320 includes: `orderId`, `orderNumber`, `customer`, `phone`, `items`, `amount`, `fOrderStatus`, `roomInfo`, `orderDiscountJson`... but NOT `billPrinted`.

---

## Impact

| Order Type | Card green (BUG-583) | Lock works (CR-489) | Why |
|---|:---:|:---:|---|
| **Takeaway** | ✅ | ✅ | Uses `orders.filter()` — full object |
| **Delivery** | ✅ | ✅ | Uses `orders.filter()` — full object |
| **Walk-in** | ✅ | ✅ | Uses `dineInOrders.filter()` — full object |
| **Dine-in (table)** | ✅ | ❌ **BROKEN** | Uses `orderItemsByTableId` whitelist — `billPrinted` dropped |
| **Room** | ✅ | ❌ **BROKEN** | Uses `orderItemsByTableId` whitelist — `billPrinted` dropped |

---

## Blast Radius
- **SMALL** — 1 file: `OrderContext.jsx`, 1 line addition inside existing whitelist
- NOT a hotspot file (not R5)
- No downstream changes needed — OrderEntry/OrderCard already read `billPrinted` correctly

---

## Fix Direction

Add 1 line to the `orderItemsByTableId` whitelist in `OrderContext.jsx` ~L343:

```javascript
          orderDiscountJson: order.orderDiscountJson || null,
          billPrinted: order.billPrinted || false, // BUG-657: CR-489 edit lock needs this for dine-in + room orders
```

**Fast Lane eligible?** NO — although it's 1 file, 1 line, it's in `OrderContext.jsx` (central state) and touches security (CR-489 lock). Full gate flow recommended.

---

## Risk Classification
- **HIGH** — central data pipeline, security feature enablement
- Regression risk: LOW (additive field, no existing consumer reads it from this path)
