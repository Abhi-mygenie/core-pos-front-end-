# BUG-112 — Auto-Print Blocked by Place Order API Response

**Status:** INTAKE
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Component:** OrderEntry.jsx, orderService.js

---

## 1. Problem Statement (Owner Verbatim)

> The first bug is related to auto-print during order taking, not manual printing. Currently, when we take an order and auto-print a QOT or bill, the print-related API (order temp API) is being called after the Place Order API response comes back. This is wrong.
>
> The print API should be called before the Place Order API, or at least in parallel with the Place Order API, so printing can start immediately without waiting for the Place Order API response.
>
> Core issue: Auto-print is currently blocked by the Place Order API response. Auto-print should be non-blocking and should trigger immediately/in parallel during order placement, especially when the socket confirms table engagement.

---

## 2. Current Flow (Code-Verified)

### Scenario 2 — Prepaid (place + pay, fresh order)
**File:** `OrderEntry.jsx` L1758–1830

```
1. Build payload (placeOrderWithPayment)
2. Fire HTTP POST /api/v2/vendoremployee/place-order → placePromise
3. Wait for socket table-engage (or 200ms delay for walk-in/TA/Del)
4. Navigate away (onClose or onCollectBillStayOnOrder)
5. THEN (background): placePromise.then(() => {
      if (newOrderId) {
        autoPrintNewOrderIfEnabled(newOrderId)  ← L1827
      }
   })
6. Inside autoPrintNewOrderIfEnabled (L1610–1693):
   a. Check printAllBill, isRoom gates
   b. waitForOrderReady(orderId, 3000) — wait for order in React context via socket
   c. Read order.rawOrderDetails
   d. Build overrides (tip/discount/SC/delivery/tax)
   e. Call printOrder(orderId, 'bill', ...) → POST /api/v1/vendoremployee/order-temp-store
```

**Total blocking chain:** API response (~200-500ms) + socket settle (~0-3000ms) + print API (~200ms)

### Scenario 1 — Postpaid (collect bill on existing order)
**File:** `OrderEntry.jsx` L1846–1908

```
1. await POST /api/v1/vendoremployee/order-bill-payment
2. Wait for order-engage socket
3. Navigate away
4. THEN (background): autoPrintNewOrderIfEnabled(collectOrderId)
```

### New Order (no payment, KOT only)
**File:** `OrderEntry.jsx` L940–968

```
1. Fire POST /api/v2/vendoremployee/place-order (fire-and-forget)
2. Wait for socket table-engage
3. Navigate away
```
KOT auto-print is backend-handled via `printAllKOT` flag in the payload. No FE `order-temp-store` call on this path. **This path is NOT affected.**

---

## 3. Expected Flow (Owner Requirement)

```
Current:   Place Order API → wait response → wait socket settle → Print API
Expected:  Place Order API ─┬─ Print API (parallel/immediate)
                            └─ Socket engage → navigate
```

Print should fire as early as possible — ideally when the socket confirms table engagement (which means the order exists in backend), without waiting for the HTTP response round-trip.

---

## 4. Architectural Constraints

| Constraint | Impact |
|---|---|
| `order-temp-store` needs `order_id` | Cannot fire BEFORE Place Order creates the order |
| `order-temp-store` needs `rawOrderDetails` (billFoodList) | Currently read from React context after socket delivers the order |
| `order_id` comes from HTTP response body | Socket engage does NOT carry order_id (only table_id) |

### Possible Solutions (Owner to Pick)

**Option A — FE-only: Fire print on order_id capture, don't wait for context settle**
- As soon as HTTP response returns `order_id`, fire `order-temp-store` immediately using cart data already in scope (no need to wait for socket to deliver order to context).
- Build `billFoodList` from local `cartItems` instead of `order.rawOrderDetails`.
- Risk: local cart might not perfectly match server-persisted order (e.g., backend enrichment).

**Option B — FE-only: Listen for socket `new-order` event to extract order_id, fire print immediately**
- Socket `new-order` event arrives BEFORE HTTP response (per CLARIFICATIONS §8 in code comments).
- If socket payload carries `order_id`, FE can capture it and fire print without waiting for HTTP.
- Risk: depends on socket payload shape — needs investigation.

**Option C — Backend-owned: Backend fires `order-temp-store` as part of Place Order processing**
- Place Order API internally triggers print as a side-effect after order creation.
- FE sends `autoBill: true` in payload (already threaded in `placeOrderWithPayment`).
- Backend has all data — no round-trip needed.
- Risk: backend owns change; FE just removes auto-print logic.

**Option D — Hybrid: Fire Place Order + a "pre-print" API in parallel**
- FE fires a new "pre-print" endpoint with cart data (no order_id) simultaneously with Place Order.
- Backend queues print, associates with order once created.
- Risk: new backend endpoint needed.

---

## 5. Affected Files

| File | Lines | Role |
|---|---|---|
| `OrderEntry.jsx` | L1610–1693 | `autoPrintNewOrderIfEnabled` — auto-bill print pipeline |
| `OrderEntry.jsx` | L1824–1830 | Prepaid: background print trigger after navigate |
| `OrderEntry.jsx` | L1874–1908 | Postpaid: background print trigger after collect-bill |
| `orderService.js` | L134–188 | `printOrder` → builds payload → POST `order-temp-store` |
| `orderTransform.js` | `buildBillPrintPayload` | Builds bill print payload from order data |

---

## 6. Affected Scenarios

| Scenario | Current Behavior | Desired Behavior |
|---|---|---|
| Prepaid (place+pay) — Dine-in/Walk-in/TA/Del | Print fires AFTER API response + 3s context wait | Print fires immediately on socket engage or order_id capture |
| Postpaid (collect bill) | Print fires AFTER bill-payment API response + context wait | Print fires immediately/in parallel |
| New Order KOT (no payment) | Backend-handled via `printAllKOT` flag | **NOT AFFECTED** — already correct |

---

## 7. Open Questions (Owner)

| # | Question | Options |
|---|---|---|
| Q-112-1 | Which solution approach? | A (FE cart-based print) / B (socket order_id) / C (backend-owned) / D (hybrid) |
| Q-112-2 | Is the KOT (non-payment) path also affected, or only bill auto-print? | KOT is backend-handled via `printAllKOT` — confirm this is working as expected |
| Q-112-3 | For Option A: is it acceptable to build print payload from local cart instead of server-persisted order? | Yes / No (if No → Option B or C needed) |

---

## 8. Impact Assessment

- **User-facing latency:** 500ms–3500ms added delay before print starts (API round-trip + context settle)
- **Cashier UX:** After placing order, table engages and redirects but printer hasn't fired yet — perceived slowness
- **No data corruption risk** — this is a timing/sequencing optimization
