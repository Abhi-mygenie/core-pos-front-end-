# Implementation Plan — BUG-144 Token Number

**Date:** 2026-07-11
**Gate:** 3 (Implementation Plan)
**Risk:** MEDIUM
**Owner Decision:** Display + print ONLY when `use_token = true` (gated)

---

## Execution Sequence

### Edit 1: profileTransform.js — Extract `useToken`
- **File:** `src/api/transforms/profileTransform.js`
- **Line:** After L362 (after `aggregatorOrderTone`)
- **Add:** `useToken: toBoolean(apiSettings.settings?.use_token),`
- **Verify:** Console log `restaurant.settings.useToken` after login

### Edit 2: orderTransform.js — Extract `dailyToken` in `fromAPI.order()`
- **File:** `src/api/transforms/orderTransform.js`
- **Line:** After L196 (`orderNumber: api.restaurant_order_id || '',`)
- **Add:** `dailyToken: api.daily_token || null,`
- **Verify:** Console log order object — check `dailyToken` field

### Edit 3: orderTransform.js — Add `daily_token` to `buildBillPrintPayload()`
- **File:** `src/api/transforms/orderTransform.js`
- **Line:** After L2036 (`restaurant_order_id: order.orderNumber || '',`)
- **Add:** `daily_token: order.dailyToken || '',`
- **Verify:** Console log print payload — check `daily_token` field

### Edit 4: orderService.js — Add `daily_token` to KOT payload
- **File:** `src/api/services/orderService.js`
- **Line:** Inside KOT payload block (~L147-159), after `billFoodList`
- **Add:** `daily_token: orderData?.dailyToken || '',`
- **Verify:** Console log KOT payload

### Edit 5: OrderCard.jsx — Display token (gated by `useToken`)
- **File:** `src/components/cards/OrderCard.jsx`
- **Line:** L96 area (destructure `dailyToken`) + L426-434 area (display)
- **Add:** Extract `dailyToken` from order, read `useToken` from restaurant context, render `T{dailyToken}` alongside `#{orderNumber}` when both are truthy
- **Verify:** Screenshot — token visible on OrderCard when `use_token=Yes`

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| 1 | profileTransform.js | +useToken | Unit test or console log | NO |
| 2 | orderTransform.js:196 | +dailyToken | Console log running orders | NO |
| 3 | orderTransform.js:2036 | +daily_token in bill | Console log print payload | NO |
| 4 | orderService.js:147 | +daily_token in KOT | Console log KOT payload | NO |
| 5 | OrderCard.jsx | Token display | Browser screenshot | NO |

---

## Post-Code Registry Checklist
- [ ] registry.json: BUG-144 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: 4 files listed
- [ ] Code markers: // BUG-144 in every modified file
- [ ] Compile check: webpack 0 new warnings
