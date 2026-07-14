# Investigation Report — BUG-144 Token Number Deep Dive

**Date:** 2026-07-11
**Agent:** INVESTIGATION (AGENT_PROMPT_ALPHA v0.7)
**Steps used:** 7/10
**Confidence:** HIGH
**Restaurant:** CAFE 103 (id=644)

---

## Summary

**BUG-144 is NOT done in this codebase.** Owner stated "this was done" and "we use use_token from profile and daily_token we pass in place order" — but zero references to either field exist in the frontend.

## Evidence

### 1. `use_token` in API (confirmed via curl)
```
profile.restaurants[0].settings.use_token = 'No'
```
The field EXISTS in the profile API response under `restaurants[0].settings.use_token`. Currently set to `'No'` for cafe103.

### 2. `use_token` NOT extracted by profileTransform
`profileTransform.js` `settings()` function (lines 318-363) maps:
- `isCoupon`, `isLoyalty`, `isCustomerWallet`, `autoKot`, `autoBill`, `defaultPrepTime`, `confirmOrderTone`, `aggregatorOrderTone`
- **Does NOT map `useToken` or `use_token`** — field is silently ignored.

### 3. `daily_token` NOT in place order payload
`orderTransform.js` `placeOrder()` (lines 993-1052) sends 35+ fields:
- `user_id`, `restaurant_id`, `table_id`, `order_type`, `cart`, `print_kot`, `payment_method`, etc.
- **`daily_token` is NOT among them.**
- Same absence in `placeOrderWithPayment()` and `updateOrder()`.

### 4. Zero codebase references
```bash
grep -rn "use_token\|useToken\|daily_token\|dailyToken" /app/frontend/src/ --include="*.js" --include="*.jsx"
# Result: ZERO matches
```

### 5. OrderCard display
- `OrderCard.jsx` line 432: `#{orderNumber}` where `orderNumber = restaurant_order_id`
- This is the restaurant sequential order number, NOT a token number.
- No token-related display anywhere on the card.

---

## What needs to be built

| # | Task | File | Scope |
|---|------|------|-------|
| 1 | Extract `use_token` from `settings` | `profileTransform.js` → `settings()` | +1 line: `useToken: toBoolean(apiSettings.settings?.use_token)` |
| 2 | Pass `daily_token` in place order | `orderTransform.js` → `placeOrder()` + `placeOrderWithPayment()` + `updateOrder()` | ~3-5 lines per function |
| 3 | Display token on OrderCard | `OrderCard.jsx` | ~5-10 lines (conditional on `useToken` setting) |
| 4 | Include in KOT/bill print payload | `orderService.js` → `printOrder()` | TBD |

## Open Questions (must resolve before planning)

| # | Question | Why it matters |
|---|----------|----------------|
| OQ-1 | When `use_token = 'Yes'`, does the backend **return** a `daily_token` on the order response after placing? Or does the FE generate/increment it locally? | Determines if FE needs local counter state or just reads API response |
| OQ-2 | Should token number replace `#{restaurant_order_id}` on OrderCard, or show alongside? | UI layout decision |
| OQ-3 | Does KOT/bill print payload need `daily_token`? | Print agent template question |
| OQ-4 | What is the reset cycle? Daily (resets to 1 at midnight)? Per-session? | Naming suggests daily reset |

---

## Registry Status
- **BUG-144:** INTAKE — confirmed NOT implemented. Needs planning (Gate 2-3) after OQ-1 to OQ-4 resolved.
