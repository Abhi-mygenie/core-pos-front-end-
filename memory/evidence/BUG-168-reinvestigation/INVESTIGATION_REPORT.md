# BUG-168 Re-Investigation Report — Print Subtotal Drift

**Date:** 2026-07-08 (re-investigation)
**Agent role:** INVESTIGATION (Alpha v0.7 Role 6)
**Steps used:** 10/10
**Confidence:** HIGH — root cause confirmed with live API curl evidence

---

## 1. Summary

**Root cause:** `buildBillPrintPayload` falls back to a **frontend computation** of item subtotal because `order.subtotalAmount = 0`. The zero arises because the **running orders API** (`employee-orders-list`) does NOT return `order_sub_total_amount`. The **single order API** (`get-single-order-new`) DOES return it — but the manual print path never calls that endpoint before building the payload.

**Classification:** DATA_EDGE (primary) — the backend list endpoint omits fields that the detail endpoint provides; the FE print pipeline was built around a computation fallback instead of fetching the authoritative value.

**Owner's concern confirmed:** The FE should NOT be computing subtotals for the manual print path. The backend has the correct values — they're just not being fetched.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|:-----:|--------|---------|
| 1 | `buildBillPrintPayload` recalculates item totals instead of using backend values | Code trace L1795-1843, L1938-1940 | 2 | **CONFIRMED** — L1802-1826 computes `computedSubtotal` from item-level loop; L1940 uses it when `order.subtotalAmount` is 0 | `orderTransform.js:1802-1940` |
| 2 | `order.subtotalAmount` is 0 because `employee-orders-list` doesn't return `order_sub_total_amount` | curl both APIs for same order | 2 | **CONFIRMED** — running orders: MISSING; single order: 219 | `/app/memory/evidence/BUG-168-reinvestigation/` |
| 3 | Socket events also omit `order_sub_total_amount`, so updates don't fix it | Code trace socketHandlers.js L238-274 | 1 | **CONFIRMED** — `handleOrderDataEvent` comment: "v2 only, no GET fallback". Socket payload uses same shape as `employee-orders-list` | `socketHandlers.js:261` |

---

## 3. Data Flow Trace

```
MANUAL PRINT PATH (OrderCard / RePrintButton / TableCard):
                                                          
  Dashboard load                                          
    → getRunningOrders()                                  
    → GET /api/v1/vendoremployee/pos/employee-orders-list 
    → Response: order_sub_total_amount = <MISSING>        ← ROOT CAUSE
    → fromAPI.order(): subtotalAmount = parseFloat(undefined) || 0 = 0
    → OrderContext stores order with subtotalAmount = 0   
                                                          
  Socket update (new-order / update-order / etc.)         
    → handleOrderDataEvent()                              
    → Socket payload: order_sub_total_amount = <MISSING>  ← SAME GAP
    → fromAPI.order(): subtotalAmount = 0                 
    → OrderContext stays at subtotalAmount = 0             
                                                          
  User clicks "Print Bill" on OrderCard                   
    → OrderCard.handlePrintBill()                         
    → printOrder(orderId, 'bill', null, order, scPct, {   
        serviceChargeTaxPct, deliveryChargeGstPct         
      })                                                  
    → orderService.printOrder()                           
    → buildBillPrintPayload(order, scPct, overrides)      
                                                          
  Inside buildBillPrintPayload:                           
    L1802-1843: FE computes computedSubtotal from item loop ← SHOULD NOT EXIST FOR THIS PATH
    L1938-1940:                                           
      overrides.orderItemTotal? → NO (not passed)         
      order.subtotalAmount?     → 0 (missing from API)    
      computedSubtotal?         → YES → USED ← FE VALUE, NOT BACKEND TRUTH
                                                          
  BREAK POINT: order.subtotalAmount = 0                   
  because employee-orders-list doesn't return the field.  
```

```
COLLECT BILL PATH (works correctly):
                                                          
  CollectPaymentPanel computes all values live from cart   
    → Passes full overrides to buildBillPrintPayload:     
      orderItemTotal, orderSubtotal, gstTax, vatTax,      
      paymentAmount, serviceChargeAmount, tip, etc.        
    → overrides.orderItemTotal is DEFINED                 
    → buildBillPrintPayload uses override → CORRECT       
```

---

## 4. API Field Comparison (Live Evidence)

**Order #002384 (id=940279) — sahi paneer x3 + extra cheese slice addon**

| Field | `employee-orders-list` | `get-single-order-new` |
|-------|:----------------------:|:----------------------:|
| `order_amount` | 250 | 250 |
| `order_sub_total_amount` | **MISSING** | **219** |
| `order_sub_total_without_tax` | **MISSING** | **240.9** |
| `total_service_tax_amount` | 21.90 | 21.90 |

Evidence saved: `/app/memory/evidence/BUG-168-reinvestigation/`

---

## 5. Where FE Computation Happens (and shouldn't for this path)

**File:** `orderTransform.js` L1795-1843

```js
// L1802: FE computation loop — iterates rawOrderDetails
let gst_tax = 0, vat_tax = 0, computedSubtotal = 0;
billFoodList.forEach(item => {
    // ... computes lineTotal from unit_price + addons
    // BUG-168 v2 fix adds addon computation here
    computedSubtotal += lineTotal;
    // ... computes tax
});
```

This entire block (L1802-1843) is the FE fallback computation. For the manual print path, this **should not be the source of truth** — the backend already knows the correct values.

**File:** `orderTransform.js` L1938-1940

```js
const finalOrderItemTotal = overrides.orderItemTotal !== undefined
  ? overrides.orderItemTotal                    // Collect Bill path — CORRECT
  : (order.subtotalAmount || computedSubtotal || 0); // Manual print — falls to FE computation
```

---

## 6. Why the Collect Bill Path Works

CollectPaymentPanel passes **live-UI computed overrides**:
- `orderItemTotal` — from its own cart computation
- `orderSubtotal` — from its own subtotal computation  
- `gstTax`, `vatTax`, `serviceChargeAmount`, etc.

These overrides bypass the fallback entirely. The Collect Bill path works because it locally computes everything from the cart items that were just placed, and sends those values as overrides.

---

## 7. Recommendations

**Owner's directive is clear: the manual print path must use backend values, not FE computation.**

### Option A: Fetch before print (RECOMMENDED — minimal risk)
Before calling `buildBillPrintPayload` in the manual print callers (OrderCard, TableCard, RePrintButton, AllOrdersReportPage), call `get-single-order-new` to get the full financial data. Then either:
- Use the refreshed order (which will have `subtotalAmount = 219`), OR
- Pass `order_sub_total_amount` directly as an override

**Affected callers (4):**
1. `OrderCard.jsx:217` — `handlePrintBill`
2. `TableCard.jsx:~218` — similar print handler
3. `RePrintButton.jsx:115` — `handlePrintBill`
4. `AllOrdersReportPage.jsx:~771` — report print

**Pros:** No backend change needed. Backend already provides the data on `get-single-order-new`.
**Cons:** Adds 1 API call per manual print (acceptable — printing is infrequent).

### Option B: Ask backend to include `order_sub_total_amount` in `employee-orders-list`
If backend adds the field to the list endpoint, `fromAPI.order` will populate `subtotalAmount` automatically and the existing fallback chain works.

**Pros:** No FE code change for the print path.
**Cons:** Requires backend change; socket events would still need the field added.

### Option C: Hybrid — pass backend values directly in print payload
After fetching via `get-single-order-new`, pass the raw backend financial fields (`order_sub_total_amount`, `order_sub_total_without_tax`) directly to the `order-temp-store` API as the print payload, bypassing `buildBillPrintPayload`'s computation entirely.

**Pros:** Zero FE computation for manual print.
**Cons:** Larger refactor; need to verify `order-temp-store` accepts these fields directly.

---

## 8. What Does NOT Need Changing (per this investigation)

| Component | Why |
|-----------|-----|
| `buildBillPrintPayload` L1802-1843 computation | Still needed as safety net for edge cases where backend data is unavailable; but should NOT be the primary path for manual print |
| Collect Bill flow | Works correctly — uses local overrides |
| `fromAPI.order` mapping | Correct — maps `order_sub_total_amount` → `subtotalAmount` when the field exists |
| BUG-168 v2 fix (L1808-1826) | Stays — improves the fallback computation for addon case; but the real fix is to avoid needing the fallback |

---

## 9. Evidence Artifacts

```
/app/memory/evidence/BUG-168-reinvestigation/
├── running_orders_940279.json      ← employee-orders-list response (MISSING subtotal fields)
├── single_order_940279.json        ← get-single-order-new response (HAS subtotal fields)
└── (this report)
```

---

**Investigation complete: BUG-168 Re-investigation**
Root cause: DATA_EDGE — `employee-orders-list` API omits `order_sub_total_amount`, forcing FE computation fallback. Confidence: HIGH. Steps: 10/10.
FE fix: YES — fetch order via `get-single-order-new` before building print payload (Option A). Backend ask: OPTIONAL (Option B — add field to list endpoint + socket events).
Planning skip eligible: NO — touches 4 callers across 4 hotspot-adjacent files + financial semantics.
Investigation report at `/app/memory/evidence/BUG-168-reinvestigation/INVESTIGATION_REPORT.md`.
