# PROD-007 + PROD-008 — Impact Analysis & Implementation Plan

**Date:** 2026-05-29
**Author:** Implementation Agent
**Artifact:** #2 (Impact Analysis) + #3 (Implementation Plan)

---

# PROD-008: Manual KOT/Bill Print — custName & custPhone NULL

## Module Mapping
- **Primary:** Order Entry / Print Workflow
- **Downstream:** Print payload → backend `/order-temp-store`

## Root Cause (CONFIRMED)

In `orderTransform.js` line 1828-1829:
```js
custName: order.customerName || '',
custPhone: order.phone || '',
```

These read from `fromAPI.order` (line 207-209):
```js
customerName: customer,      // ← from api.user_name || user.f_name+l_name
phone: user.phone || '',     // ← from api.user.phone
```

**The problem:** `api.user` is the **user object nested in the order API response**. For dine-in orders where a customer was linked AFTER order placement (via CustomerModal), the `user` object on the placed order may be **empty or null** — the customer data lives in the `customer_details` or a separate field that's NOT being read.

When the order is fetched via `/get-single-order-new` for manual print, if the backend doesn't populate `api.user` with the linked customer, `order.customerName` and `order.phone` are both empty → `custName: null`, `custPhone: null` in the print payload.

**Contrast with working paths:**
- **Place+Pay (prepaid):** Uses `customer` object from OrderEntry state directly via `overrides` → works ✅
- **Collect Bill:** Uses `customer` object from CollectPaymentPanel state via `overrides` → works ✅  
- **Manual print (re-print from dashboard):** No `overrides` for customer → falls back to `order.customerName` from `fromAPI.order` → **fails when `api.user` is empty** ❌

## Affected Files

| File | Change | Risk |
|---|---|---|
| `api/transforms/orderTransform.js` | `fromAPI.order`: add fallback to `api.customer_name` / `api.customer_details` | MEDIUM — hotspot file, financial transform |

## Regression Risk: MEDIUM
- Touches `orderTransform.js` (hotspot) but ONLY the `fromAPI.order` mapping, not financial logic
- All existing print paths with overrides are unaffected
- Only the default/fallback path (manual print) is changed

## Investigation Needed Before Fix
- **What field does the backend actually send?** Need to check the raw API response for order 869335 — does it have `customer_name`, `customer_details`, `user.f_name`, or none?
- This determines the correct fallback chain

## Proposed Fix (pending API field confirmation)
In `fromAPI.order` (line 207-209), expand the customer name resolution:
```js
// Current:
customerName: customer,       // only reads api.user_name || user.f_name+l_name
phone: user.phone || '',      // only reads api.user.phone

// Proposed:
customerName: customer || api.customer_name || '',
phone: user.phone || api.customer_phone || api.customer_mobile || '',
```

## Scope Lock
- WILL change: `orderTransform.js` (fromAPI.order, ~3 lines)
- Will NOT change: `buildBillPrintPayload`, `CollectPaymentPanel`, `OrderEntry`

---

# PROD-007: Loyalty "Earn Points" Not Displayed

## Module Mapping
- **Primary:** Collect Payment / CRM Integration
- **Downstream:** UI display only — no payload impact

## Root Cause (CONFIRMED — CRM API GAP)

The CRM `/pos/max-redeemable` API returns:
```
maxPointsRedeemable, maxDiscountValue, ratioPerPoint, tier,
availablePoints, minRedemptionPoints, loyaltyEnabled
```

**There is NO `points_to_earn` or `earn_rate` field** in the API response. The CRM API only tells us:
- How many points the customer HAS (available_points)
- How many they CAN REDEEM (max_points_redeemable)
- The tier and ratio

It does NOT tell us:
- How many points the customer will EARN from this order
- The earn rate (e.g., 1 point per ₹100 spent)

The UI currently shows:
- Sufficient points: `₹X discount` + `X pts redeemed · ratio ₹Y/pt`
- Insufficient points: `Earn X more` (meaning X more points needed to hit minimum)
- No points info about earning

## Resolution Options

| Option | Description | Effort | Dependency |
|---|---|---|---|
| **A** | CRM API adds `points_to_earn` field to `/pos/max-redeemable` response | Low FE (display only) | **CRM backend must add field** |
| **B** | Frontend calculates earn from a known rate (e.g., `bill_amount / earn_ratio`) | Low FE | Need earn ratio from CRM config or profile |
| **C** | Add a new CRM endpoint `/pos/earn-preview` | Medium | CRM backend |
| **D** | Defer — not critical for v1 | Zero | — |

## Recommendation
**Option A** is cleanest — CRM API already receives `bill_amount` in the request. It should return `points_to_earn` in the response. Frontend display is ~5 lines.

## Affected Files (if Option A)

| File | Change | Risk |
|---|---|---|
| `api/transforms/loyaltyTransform.js` | Add `pointsToEarn` to `maxRedeemableFromAPI` | LOW |
| `components/order-entry/CollectPaymentPanel.jsx` | Add "You'll earn X pts" line in loyalty section | LOW — UI only |

## Scope Lock (Option A)
- WILL change: `loyaltyTransform.js` (~1 line), `CollectPaymentPanel.jsx` (~5 lines)
- Will NOT change: `loyaltyService.js`, `orderTransform.js`, any payment/financial logic

---

# APPROVAL GATE

## PROD-008
- **Safe to implement without owner?** PARTIALLY — need to confirm the backend API field name for customer on the order response. Once confirmed, the fix is safe.
- **Regression risk:** MEDIUM (hotspot file, but isolated change)

## PROD-007
- **Safe to implement without owner?** NO — requires CRM backend to add `points_to_earn` field
- **Action:** Escalate to CRM team (Option A), or owner picks Option B/C/D

---

# NEXT STEPS

1. **PROD-008:** Check the raw API response for order 869335 to confirm backend field names → implement fix
2. **PROD-007:** Owner decision on Option A/B/C/D → if A, escalate to CRM team → implement after field is available
