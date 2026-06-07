# BUG-112 — Auto-Print Blocked by Place Order API Response

**Status:** DISCOVERY COMPLETE
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Component:** OrderEntry.jsx, orderService.js, orderTransform.js
**Confirmed Case:** Prepaid order with auto-bill enabled

---

## 1. Problem Statement (Owner Verbatim)

> Auto-print (order-temp-store) is called AFTER place-order API response. This should fire in parallel or before, not sequentially. Specific case: prepaid order with auto-bill.

**Evidence:** Owner screenshot shows network tab: `place-order` → `order-temp-store` (sequential).

---

## 2. Discovery — Full Blocking Chain (Code-Traced)

### File: `OrderEntry.jsx` — Prepaid Place+Pay Flow (L1752–1832)

```
STEP 1  [L1782]  Fire place-order HTTP POST → placePromise (not awaited yet)
STEP 2  [L1802]  await socket table-engage (or 200ms delay for walk-in/TA/Del)
STEP 3  [L1816]  Navigate away → onClose() or onCollectBillStayOnOrder()
         ──── user sees dashboard / next order ────
STEP 4  [L1824]  BACKGROUND: placePromise.then(() => { ... })
                 ↳ only fires AFTER HTTP response returns with order_id
STEP 5  [L1640]  Inside autoPrintNewOrderIfEnabled:
                 ↳ waitForOrderReady(orderId, 3000) — polls every 50ms
                 ↳ waits for: order in context (via socket) + engage released
STEP 6  [L1646]  Read order.rawOrderDetails from context (backend-enriched)
STEP 7  [L1680]  printOrder() → POST /api/v1/vendoremployee/order-temp-store
```

### Timing Analysis

| Step | Blocking Duration | What's Waited On |
|---|---|---|
| Place Order HTTP | 200–500ms | Backend creates order, returns `order_id` |
| waitForOrderReady | 0–3000ms | Socket `new-order` populates context + `update-table` releases engage |
| Print API call | 200–400ms | POST order-temp-store |
| **Total delay** | **400–3900ms** | **Before printer even starts** |

### Why It's Sequential (Historical Reason)

**BUG-273 (Session 16 fix-up)** at L1778–1781:
> *"HTTP promise must be captured and awaited before auto-print. Previously fire-and-forget .then() caused newOrderId to remain null when autoPrintNewOrderIfEnabled ran, because engage socket arrives BEFORE HTTP response."*

So the sequential pattern was a **deliberate fix** for a previous bug where `newOrderId` was null. The fix correctly captures `order_id` from HTTP response, but introduces the latency the owner is now flagging.

---

## 3. Dependencies Analysis — What Does `order-temp-store` Actually Need?

### From `buildBillPrintPayload` (orderTransform.js L1485–1750):

| Data Needed | Current Source | Available at Place-Order Time? |
|---|---|---|
| `order_id` | HTTP response `res.data.order_id` | **NO** — only exists after backend creates order |
| `rawOrderDetails` (billFoodList) | Socket-delivered order in context | **NO** — arrives via socket after backend processes |
| `order.orderType`, `order.isRoom`, `order.tableNumber` | Order context | **YES** — available as local variables (`orderType`, `effectiveTable`) |
| `paymentData` (tip, discount, SC, delivery, tax) | Closure scope | **YES** — already available before API call |
| `printerAgents` | Closure scope | **YES** — already available |
| `serviceChargePercentage` | `restaurant` context | **YES** — already available |

**Critical finding:** The two things NOT available before the API call are:
1. `order_id` — needs backend to create the order
2. `rawOrderDetails` — needs socket to deliver backend-enriched line items

### What `rawOrderDetails` is used for:
- **billFoodList** — the line items printed on the receipt (food name, qty, price, tax, addons, variations)
- **Complimentary carve-out** — zeroes price on comp items
- **Cancelled-item exclusion** — filters food_status=3
- **Tax computation** — per-item GST/VAT from backend-enriched `gst_tax_amount`

### Can `cartItems` (local) substitute for `rawOrderDetails` (socket)?
**Partially.** `cartItems` has: name, qty, price, tax, foodId, addons, variations. But it uses a different shape than `rawOrderDetails` (which has `food_details.name`, `food_details.tax`, `food_details.id`, etc.). A **transform adapter** would be needed.

---

## 4. Key Insight — `billing_auto_bill_print: 'Yes'` Already in Payload

At `orderTransform.js` L1144:
```js
billing_auto_bill_print: autoBill ? 'Yes' : 'No',
```

The place-order payload already tells the backend that auto-bill-print is requested. **If the backend honors this flag and triggers the print server-side**, the FE `order-temp-store` call is redundant for this case.

**Q-112-CRITICAL:** Does the backend already auto-print when `billing_auto_bill_print: 'Yes'`? If yes → FE just needs to STOP calling `order-temp-store` on prepaid. If no → one of the options below is needed.

---

## 5. Solution Options (Updated After Discovery)

### Option A — Backend-Owned Print (RECOMMENDED if backend supports it)
- **If** backend already triggers print when `billing_auto_bill_print: 'Yes'` → FE removes the `autoPrintNewOrderIfEnabled` call on prepaid path. Zero latency.
- **If** backend does NOT → backend team adds this (one-time change).
- **FE change:** Remove L1824–1830 (background print block) from prepaid path.
- **Risk:** Low. Backend has all data at order-creation time.

### Option B — FE Early Print (Fire on order_id capture, skip waitForOrderReady)
- Current: `placePromise.then(() → autoPrintNewOrderIfEnabled(orderId))` → waits for context
- Change: Inside `.then()`, **skip `waitForOrderReady`** and build print payload from local data:
  - `billFoodList` → built from `cartItems` via a new adapter function
  - Financial overrides → already available from `paymentData`
  - `order_id` → just captured from response
- **Saves:** 0–3000ms (the waitForOrderReady polling)
- **Risk:** Medium. Local cart shape differs from `rawOrderDetails`. Adapter needed. Edge cases: addons, variations, complimentary items, cancelled items (not applicable on new order).

### Option C — FE Parallel with Socket (Fire print when socket delivers order, not when HTTP responds)
- Listen for socket `new-order` event that carries `order_id`
- As soon as socket delivers the order (with `rawOrderDetails`), fire print immediately
- No need to wait for HTTP response at all
- **Saves:** Full HTTP round-trip (200–500ms)
- **Risk:** Medium. Socket payload shape needs verification. Race condition if socket arrives before print is ready.

### Option D — FE Hybrid (Fire HTTP + immediately queue print)
- Fire place-order HTTP
- In `.then()` callback: fire `order-temp-store` immediately using `cartItems`-based payload + `order_id`
- Don't wait for socket context at all
- **Saves:** Full waitForOrderReady (0–3000ms)
- **Risk:** Same as Option B (cart→rawOrderDetails adapter)

---

## 6. Recommendation

**Ask owner Q-112-CRITICAL first:** Does backend print when `billing_auto_bill_print: 'Yes'`?

- If **YES** → Option A (remove FE print, backend handles it). Simplest, zero latency.
- If **NO** → Option B or D (build print payload from local cart, skip context wait). Eliminates 0–3s delay. Needs a `cartItemsToRawOrderDetails()` adapter (~30 lines).

---

## 7. Affected Files (for Implementation)

| File | Lines | Change |
|---|---|---|
| `OrderEntry.jsx` | L1824–1830 | Remove/modify background print block |
| `OrderEntry.jsx` | L1610–1693 | Modify `autoPrintNewOrderIfEnabled` to skip `waitForOrderReady` |
| `orderTransform.js` | NEW function | `cartItemsToRawOrderDetails()` adapter (if Option B/D) |
| `orderService.js` | L134–188 | No change (printOrder stays as-is) |

---

## 8. Open Questions

| # | Question | Status |
|---|---|---|
| **Q-112-CRITICAL** | Does backend auto-print when `billing_auto_bill_print: 'Yes'` in place-order payload? | **MUST ANSWER BEFORE IMPLEMENTATION** |
| Q-112-2 | Is the KOT path also affected? (Owner said "QOT or bill") | KOT uses `printAllKOT` flag in payload — likely backend-handled. Confirm. |
| Q-112-3 | For Option B/D: is it acceptable to build print payload from local cart (minor shape differences)? | Owner decision |
| Q-112-4 | Postpaid collect-bill path (Scenario 1) — same fix needed? | Yes, same pattern at L1879. Separate scope or combined? |
