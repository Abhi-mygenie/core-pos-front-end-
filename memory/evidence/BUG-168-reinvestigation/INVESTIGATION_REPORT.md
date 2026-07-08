# BUG-168 Re-Investigation Report — CORRECTED

**Date:** 2026-07-08 (re-investigation, corrected per owner socket evidence)
**Agent role:** INVESTIGATION (Alpha v0.7 Role 6)
**Steps used:** 10/10
**Confidence:** HIGH — full data flow traced + API curl evidence + owner socket evidence

---

## 1. Summary

**Root cause is a 3-layer data loss chain:**

1. **Socket `new-order` DOES provide `order_sub_total_amount: 219`** — confirmed by owner. `fromAPI.order` correctly maps it to `subtotalAmount: 219`. Order enters context with correct value.

2. **`employee-orders-list` API does NOT return `order_sub_total_amount`** — confirmed via curl. Transformed order has `subtotalAmount: 0`.

3. **Polling reconciliation (every 60s) OVERWRITES socket data with list API data** — `useOrderPollingReconciliation.js` L148-178 detects a fingerprint diff (because `219.00 ≠ 0.00`) and calls `updateOrder(orderId, serverOrder)` where `serverOrder.subtotalAmount = 0`. This **destroys** the correct socket-provided value.

**Result:** After the first polling cycle (~60s), `order.subtotalAmount` drops from 219 → 0, and `buildBillPrintPayload` falls to the FE-computed `computedSubtotal`.

For **pre-existing orders** (loaded on dashboard init from `employee-orders-list`), `subtotalAmount` is **never** populated — it's 0 from the start.

**Classification:** DATA_EDGE (list API omits field) + INTERACTION (polling reconciliation destroys socket-provided value)

---

## 2. The Full Data Loss Chain

```
TIMELINE FOR A FRESHLY PLACED ORDER:

T+0s    Place Order → socket `new-order` fires
        → handleNewOrder → fromAPI.order(socketPayload)
        → subtotalAmount = 219 ✅ (socket has order_sub_total_amount: 219)
        → addOrder(order) → OrderContext stores subtotalAmount: 219

T+0-60s Print here → order.subtotalAmount = 219 → CORRECT ✅

T+60s   useOrderPollingReconciliation fires
        → getRunningOrders() → employee-orders-list
        → server order has subtotalAmount: 0 (field MISSING from API)
        → fingerprint(local) includes "219.00"
        → fingerprint(server) includes "0.00"
        → DIFFERENT → updateOrder(orderId, serverOrder)
        → subtotalAmount OVERWRITTEN: 219 → 0 ❌

T+60s+  Print here → order.subtotalAmount = 0
        → falls to computedSubtotal (FE calculation)
        → WRONG VALUES ❌

TIMELINE FOR PRE-EXISTING ORDERS (on dashboard load):

T+0     LoadingPage → getRunningOrders() → employee-orders-list
        → subtotalAmount = 0 (field MISSING)
        → OrderContext stores subtotalAmount: 0

T+any   Print → order.subtotalAmount = 0
        → falls to computedSubtotal → WRONG ❌
```

---

## 3. Three Paths That Destroy Socket Data

| # | Path | Trigger | What it does |
|---|------|---------|-------------|
| 1 | **Polling reconciliation** | Every 60s | `updateOrder(orderId, serverOrder)` where server has `subtotalAmount: 0` — destroys socket's `219` |
| 2 | **Socket reconnect** | On reconnect | `mergeRunningOrders(freshOrders)` — FULL REPLACE of all orders with list API data (subtotalAmount: 0) |
| 3 | **refreshOrders()** | Called from OrderEntry L2775 | `setOrdersState(fresh)` — FULL REPLACE |

---

## 4. API Field Evidence (curl-verified)

**Order #002384 (id=940279)**

| Field | `employee-orders-list` | `get-single-order-new` | Socket `new-order` |
|-------|:--:|:--:|:--:|
| `order_sub_total_amount` | **MISSING** ❌ | **219** ✅ | **219** ✅ (owner confirmed) |
| `order_sub_total_without_tax` | **MISSING** ❌ | **240.9** ✅ | **240.9** ✅ (owner confirmed) |
| `order_amount` | 250 | 250 | 250 |

---

## 5. Code Locations (Precise)

### Where the value gets lost:
- `useOrderPollingReconciliation.js` L159-177 — fingerprint diff triggers overwrite
- `useSocketEvents.js` L92-95 — reconnect handler does full replace
- `OrderContext.jsx` L36-38 — `refreshOrders` does full replace

### Where the FE fallback fires:
- `orderTransform.js` L1938-1940:
  ```js
  const finalOrderItemTotal = overrides.orderItemTotal !== undefined
    ? overrides.orderItemTotal
    : (order.subtotalAmount || computedSubtotal || 0);
  //   ↑ 0 after polling          ↑ FE computation (WRONG)
  ```

### Where FE computes (should not, per owner):
- `orderTransform.js` L1802-1843 — the `computedSubtotal` loop

---

## 6. Why Collect Bill Works

CollectPaymentPanel passes **live-UI overrides** that bypass the entire fallback chain:
```js
overrides.orderItemTotal = liveComputedItemTotal  // from cart
overrides.orderSubtotal = liveComputedSubtotal
overrides.gstTax = liveComputedGst
// etc.
```
These override values come from the CART items in memory, not from `order.subtotalAmount`. So the polling destruction doesn't affect the Collect Bill path.

---

## 7. Owner's Core Concern — Confirmed

> "We should not be doing any manipulation for these amounts."

**Confirmed.** The backend provides correct values via `get-single-order-new` and via socket events. The problem is that `employee-orders-list` omits them, and the polling reconciliation destroys the socket-provided values by overwriting with list API data.

---

## 8. Recommendations

### Option A: Fetch before print (SIMPLEST, no polling change)
In each manual print caller, call `get-single-order-new` before building the print payload. Use the fresh order's `subtotalAmount` (which will be 219). This bypasses the entire polling destruction issue.

**Callers to modify:**
1. `OrderCard.jsx` L217
2. `TableCard.jsx` ~L218
3. `RePrintButton.jsx` L115
4. `AllOrdersReportPage.jsx` ~L771

**Risk:** LOW — adds 1 API call per print. Print is infrequent.

### Option B: Preserve socket fields during polling reconciliation
In `useOrderPollingReconciliation.js`, before calling `updateOrder`, merge missing fields from local:
```js
if (!s.subtotalAmount && l.subtotalAmount) {
  s.subtotalAmount = l.subtotalAmount;
  s.subtotalBeforeTax = l.subtotalBeforeTax;
}
```
**Risk:** MEDIUM — changes polling logic, needs careful testing.

### Option C: Backend fix — add fields to `employee-orders-list`
Ask backend to include `order_sub_total_amount` and `order_sub_total_without_tax` in the list endpoint response.
**Risk:** LOW (backend only) — eliminates the entire problem at source.

### Recommended: Option A (immediate) + Option C (backend request)
Option A can ship now with zero backend dependency. Option C is the proper long-term fix.

---

## 9. Evidence Artifacts

```
/app/memory/evidence/BUG-168-reinvestigation/
├── running_orders_940279.json      ← employee-orders-list (MISSING subtotals)
├── single_order_940279.json        ← get-single-order-new (HAS subtotals)
└── INVESTIGATION_REPORT.md         ← THIS FILE
```

---

**INVESTIGATION COMPLETE — Alpha v0.7 Compact Final:**

Root cause: 3-layer data loss — socket provides `order_sub_total_amount: 219`, but `employee-orders-list` omits it (→ `subtotalAmount: 0`), and polling reconciliation (60s) overwrites socket data with list data, destroying the correct value. `buildBillPrintPayload` then falls to FE computation.
Classification: DATA_EDGE + INTERACTION. Confidence: HIGH. Steps: 10/10.
FE fix: YES — fetch `get-single-order-new` before print (Option A). Backend ask: add field to list API (Option C).
Planning skip eligible: NO — touches 4+ files + financial semantics.
Report at `/app/memory/evidence/BUG-168-reinvestigation/INVESTIGATION_REPORT.md`.
Next: Owner decision on fix approach → Planning Gate 2-3.
