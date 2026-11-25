# Investigation Report: Discount Not Reflecting on Dashboard / Order Entry

**Date:** 2026-11-17
**Investigator:** Agent (Investigation Role)
**Confidence:** HIGH (code-traced, full data flow mapped)
**Steps used:** 6/10
**Test Account:** owner@mantri.com / T2 / Order #001447

---

## 1. Summary

**Root cause:** The discount applied in `CollectPaymentPanel` is a **checkout-time adjustment** — it persists to the backend via `applyOrderDiscount` API (`order-discount-manage` endpoint) as a discount CONFIG (`order_discount_json`), but it does **NOT mutate `order_amount`** in the running orders data. The Dashboard (`OrderCard`) and Order Entry page (`CartPanel`) both read from `order.amount` / `orderFinancials.amount` which is the **pre-discount total**.

**Classification:** FE_ARCHITECTURE_GAP — The discount is stored (backend persists `order_discount_json`) but the order total shown elsewhere is not recalculated.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|----------|
| H1 | Discount is local-only, not saved to backend | Code trace: `applyOrderDiscount` → API call | 1 | ELIMINATED | `applyOrderDiscount` POSTs to `/api/v1/vendoremployee/order-discount-manage` → backend persists |
| H2 | Backend doesn't update `order_amount` after discount | Code trace: order transform + financials flow | 2 | CONFIRMED | `order_amount` in running orders list is the pre-discount total. `order_discount_json` holds discount config separately |
| H3 | Dashboard/CartPanel doesn't read discount data | Code trace: OrderCard + CartPanel total computation | 2 | CONFIRMED | `OrderCard.jsx:524` renders `order.amount` directly. `CartPanel` uses `authoritativeTotal = orderFinancials.amount` for placed orders |
| H4 | Socket update doesn't propagate new amount | Code trace: socket handlers | 1 | PARTIAL | Even if socket sends `update-order`, `order_amount` field would still be pre-discount |

---

## 3. Data Flow Trace

### Where discount is applied:
```
CollectPaymentPanel (checkout panel)
  → User sets discount (% or flat)
  → handleApplyDiscount() calls applyOrderDiscount()
  → API POST /api/v1/vendoremployee/order-discount-manage
  → Backend stores: order_discount_json = { discount: 50, discount_type: 'percent', discount_note: '' }
  → Backend does NOT change: order_amount (stays at pre-discount total)
```

### Where amount is READ (all show pre-discount):
```
1. Dashboard OrderCard (OrderCard.jsx:524):
   ₹{order.amount}  ← from orderTransform: parseFloat(api.order_amount) → pre-discount

2. Order Entry "Collect Bill" button (OrderEntry.jsx:1223-1227):
   total = hasPlacedItems ? orderFinancials.amount : localCompute
   orderFinancials.amount = orderData.amount  ← from same order_amount → pre-discount

3. CartPanel total (CartPanel.jsx:512):
   authoritativeTotal = hasPlacedItems ? total : finalTotal  ← same pre-discount
```

### Where discount IS correctly shown:
```
CollectPaymentPanel (only here):
  → initialDiscount pre-seeds from orderDiscountJson (line 408-414)
  → Local state computes discount amount
  → Bill Summary shows: Item Total → Discount → Post-discount → Grand Total
  → Pay button shows discounted amount
```

**BREAK POINT:** `order_amount` in backend running-orders response does NOT include the discount. The discount is only a configuration (`order_discount_json`), not an amount mutation.

---

## 4. Evidence Artifacts

- Screenshot 1: CollectPaymentPanel showing 50% discount (₹100 → ₹50 → Pay ₹58)
- Screenshot 2: Dashboard showing T2 at ₹116.24 (pre-discount amount)
- Screenshot 3: Order Entry showing "Collect Bill ₹116.24" (same pre-discount)
- Code: `OrderCard.jsx:524`, `OrderEntry.jsx:1223-1227`, `CartPanel.jsx:512`, `orderTransform.js:222`

---

## 5. Recommendations

**Classification:** FE_FIX + possibly BACKEND_ASK

### Option A: Frontend-side discount deduction (FE-only fix)
- When rendering `order.amount` on Dashboard and Order Entry, subtract the stored discount
- Read `order.orderDiscountJson` and compute the deduction
- Apply to: `OrderCard.jsx:524` (dashboard), `OrderEntry.jsx:1223` (collect bill button)
- **Risk:** MEDIUM — discount computation in multiple places risks inconsistency

### Option B: Backend returns post-discount amount (BACKEND_ASK)
- Ask backend to include discount in `order_amount` after `order-discount-manage` is called
- Or add a new field: `order_amount_after_discount` in running orders response
- **Risk:** LOW for frontend, needs backend change

### Option C: Frontend recalculates total using orderDiscountJson everywhere
- Wherever `order.amount` is displayed, apply the discount from `orderDiscountJson`
- Centralize in a utility function: `getEffectiveAmount(order)`
- **Risk:** MEDIUM — many consumers of `order.amount`

**Planning skip eligible:** NO — touches financial display across dashboard + order entry + potentially reports. HIGH risk area.

---

## 6. Retroactive Candidates
None.
