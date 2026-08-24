# CR-098 — Impact Analysis (Gate 2)

**Date:** 2026-07-24
**Code Reality:** NONE — `item_code` not mapped in orderTransform, not displayed on OrderCard
**Conflict Pre-Check:** No active CR/BUG touches same lines. OrderCard is R5 hotspot — display-only addition, zero state/financial risk.
**Risk:** LOW

---

## Data Flow Trace

```
API: order.order_details[].food_details.item_code (string, e.g. "SC01")
  → Transform: orderTransform.js:112-158 — NOT MAPPED (gap)
    → Component: OrderCard.jsx:659/734/779 — shows item.name only, no itemCode
      → UI: "[item name] (qty)" — no short code visible
```

**Break point:** `orderTransform.js` does NOT extract `food_details.item_code` into the item object.

## Affected Files

| # | File | Line(s) | Change | Risk |
|---|------|---------|--------|------|
| 1 | `api/transforms/orderTransform.js` | L112-158 (item mapping) | Add `itemCode: foodDetails.item_code \|\| ''` | LOW — additive, 1 line |
| 2 | `components/cards/OrderCard.jsx` | L659, L734, L779 (3 item render spots) | Show `item.itemCode` before item name when available | LOW — display only, +5 lines |

**Files WILL NOT touch:** CartPanel, CollectPaymentPanel, orderService, productTransform, RestaurantSettings (toggle already exists via BUG-143).

## Gate Condition

Short Code toggle (`useToken` in profileTransform L373) is already wired via Restaurant Settings. The OrderCard display should be gated on this toggle, accessible via `useRestaurant().features` or passed as prop.

**Owner decision:** Should the code show even when toggle is OFF (always visible), or respect the toggle? Intake says "when Short Code is enabled" — recommend respecting toggle.

## Scope Lock

- **2 files, ~6 lines**
- No API change, no transform contract change, no financial impact
- R5 hotspot (OrderCard) — display-only addition

---

**Next:** Gate 3 (Implementation Plan) → Gate 4 GO
