# BUG-523 — Split Button Missing in Folio Checkout CPP
## Impact Analysis (Gate 2)

**Date:** 2026-10-09
**Code Reality:** NONE — fix not yet applied
**Conflict Pre-Check:** CR-118 + BUG-366 touch `profileTransform.js` at Gate 6 (AWAITING OWNER SMOKE) — different fields, parallel-safe
**Risk:** HIGH — API contract, payment method detection at boot. Additive-only change.

---

## 1. Root Cause

`profileTransform.fromAPI.profileResponse` passes only 3 args to `fromAPI.restaurant`:

```js
// profileTransform.js L77 (current)
restaurant: fromAPI.restaurant(api.restaurants?.[0], api.print_agent, api.restaurant_discount_type)
```

`fromAPI.restaurant(api)` reads `api.payment_types` where `api = restaurants[0]`.

The v1 profile endpoint places `payment_types` (including `partial`) at the **ROOT** level of the response — not nested inside `restaurants[0]` — identical pattern to `print_agent` (fixed 2026-05-08) and `restaurant_discount_type` (BUG-056).

`restaurants[0].payment_types` = `[cash, card, upi, TAB, ROOM, dineout]` — no `partial`
`api.payment_types` (root) = `[cash, card, upi, TAB, ROOM, dineout, partial]` — has it

Result: `restaurant.paymentTypes` = array without `partial` → `filterLayoutByApiTypes` excludes `split` from `enabledLayout.row2` → Split button not rendered.

---

## 2. Data Flow Trace

```
GET /api/v1/vendoremployee/profile
  root: api.payment_types = [{name:"partial"}, ...]          ← contains partial
  api.restaurants[0].payment_types = [{name:"cash"}, ...]    ← no partial

profileTransform.fromAPI.profileResponse(api)
  → fromAPI.restaurant(api.restaurants[0], api.print_agent, api.restaurant_discount_type)
  → inside: paymentTypes: fromAPI.paymentTypes(api.payment_types)
                           ↑ api = restaurants[0] → reads restaurants[0].payment_types
  → restaurant.paymentTypes = [cash, card, upi, TAB, ROOM, dineout]  ← no partial ❌

RestaurantContext.paymentTypes = restaurant.paymentTypes
CPP: restaurantPaymentTypes = useRestaurant().paymentTypes        (L79)
filterLayoutByApiTypes(config, restaurantPaymentTypes, hasRooms)  (L96)
  → id==='split': apiPaymentTypes.some(pt => pt.name==='partial') = FALSE
  → split NOT in enabledLayout.row2
  → {enabledLayout.row2.includes('split') && <Split btn/>} = false  (L2733)
  → Split button absent ✗
```

**BREAK POINT:** `profileTransform.js:77` — root-level `api.payment_types` not passed to restaurant builder.

---

## 3. Affected Files

**WILL CHANGE:**
- `src/api/transforms/profileTransform.js`
  - L77: add `api.payment_types` as 4th argument
  - L105: add `paymentTypesOverride` as 4th parameter
  - L188: use `paymentTypesOverride ?? api.payment_types`

**WILL NOT TOUCH:**
- `CollectPaymentPanel.jsx` (R5) — no change
- `paymentMethods.js` — no change
- `RestaurantContext.jsx` — no change
- `FolioCheckoutPanel.jsx` — no change
- Any test files (no unit test for this transform path currently)

---

## 4. Downstream Consumers of `restaurant.paymentTypes`

| Consumer | Effect of fix | Safe? |
|---|---|---|
| `CollectPaymentPanel.jsx` via `useRestaurant()` | `split` now in `enabledLayout.row2` → Split button visible | ✅ Additive |
| `filterLayoutByApiTypes` | Now finds `partial` → includes split | ✅ |
| `getDynamicPaymentTypes` | `partial` excluded from dynamic (line 229: already in primaryApiNames) | ✅ No change |
| All other CPP instances (dashboard, hold, etc.) | Split also becomes visible where restaurant has partial | ✅ Correct |

---

## 5. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Root-level `payment_types` absent → falls back to `restaurants[0].payment_types` → no regression | LOW | Pattern uses `??` operator — graceful fallback |
| Over-expose payment methods not intended | LOW | Only adds what backend explicitly configured |
| Interaction with CR-118 / BUG-366 on profileTransform | LOW | Those edits are in `settings()` function, not `restaurant()` or `profileResponse()` |

---

## 6. Owner Decisions

None required. Fix is purely additive. Mirrors existing `print_agent` and `restaurant_discount_type` pattern already approved and live.

---

## 7. Verification

| # | What to verify | Method |
|---|---|---|
| V1 | `restaurant.paymentTypes` includes `{name:"partial"}` | Browser console: `window.__restaurantCtx?.paymentTypes` OR LoggingPage debug log |
| V2 | Split button appears in Folio CPP (PAYMENT METHOD section) | Browser: open folio checkout → verify Split visible in row 2 |
| V3 | Split button still appears in Dashboard CPP (no regression) | Browser: open order → CPP → Split visible |
| V4 | Cash/UPI/Card/Credit/More... unchanged | Browser: same folio checkout screen |
| V5 | webpack 0 new warnings | `tail frontend.out.log` |

---

Code Reality: NONE
Conflict: PARALLEL-SAFE (CR-118, BUG-366 at different lines)
Owner decisions: NONE
Next: Gate 3 Implementation Plan
