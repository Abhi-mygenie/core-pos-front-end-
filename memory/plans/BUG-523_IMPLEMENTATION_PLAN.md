# BUG-523 — Implementation Plan (Gate 3)
## Split Button Missing in Folio Checkout CPP

**Date:** 2026-10-09
**Status:** GATE_3_PLAN_COMPLETE
**Risk:** HIGH
**Impact Analysis:** `impact/BUG-523_IMPACT_ANALYSIS.md`

---

## Scope Lock

**Files WILL change:**
- `src/api/transforms/profileTransform.js` — 3 edits

**Files WILL NOT touch:**
- `CollectPaymentPanel.jsx` (R5)
- `paymentMethods.js`
- `RestaurantContext.jsx`
- `FolioCheckoutPanel.jsx`
- Any test files

---

## Edits

### E1 — `profileTransform.js` L77: pass root-level `payment_types` as 4th arg

**Current L77:**
```js
    restaurant: fromAPI.restaurant(api.restaurants?.[0], api.print_agent, api.restaurant_discount_type),
```

**New L77:**
```js
    // BUG-523: v1 endpoint places `payment_types` at ROOT level (same as print_agent/restaurant_discount_type).
    // Pass it down explicitly so fromAPI.restaurant can use it as override over restaurants[0].payment_types.
    restaurant: fromAPI.restaurant(api.restaurants?.[0], api.print_agent, api.restaurant_discount_type, api.payment_types),
```

---

### E2 — `profileTransform.js` L105: add `paymentTypesOverride` 4th parameter

**Current L105:**
```js
  restaurant: (api, printAgent, discountTypesOverride) => {
```

**New L105:**
```js
  restaurant: (api, printAgent, discountTypesOverride, paymentTypesOverride) => { // BUG-523
```

---

### E3 — `profileTransform.js` L188: use `paymentTypesOverride` with fallback

**Current L188:**
```js
      paymentTypes: fromAPI.paymentTypes(api.payment_types),
```

**New L188:**
```js
      paymentTypes: fromAPI.paymentTypes(paymentTypesOverride ?? api.payment_types), // BUG-523
```

---

## Execution Order

E1 → E2 → E3 (sequential — all in same file, E2+E3 depend on E1 arg addition)

---

## Verification Matrix

| Edit | File | Line | How to verify | Automated? |
|---|---|---|---|:---:|
| E1 | profileTransform.js | 77 | `grep -n "api.payment_types" profileTransform.js` — 4th arg present | YES |
| E2 | profileTransform.js | 105 | `grep -n "paymentTypesOverride" profileTransform.js` — in signature | YES |
| E3 | profileTransform.js | 188 | `grep -n "paymentTypesOverride ??" profileTransform.js` | YES |
| V1 | Browser | — | Open Folio checkout → PAYMENT METHOD section → Split button visible in row 2 | NO |
| V2 | Browser | — | Dashboard CPP: Split still visible (no regression) | NO |
| V3 | Compile | — | `tail frontend.out.log` → webpack compiled, 0 new warnings | YES |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: BUG-523 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
□ 2. BUG_TRACKER.md: BUG-523 row → GATE_5A_IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: src/api/transforms/profileTransform.js → BUG-523, 2026-10-09
□ 4. Code markers: // BUG-523 in all 3 edited lines ✓ (already in plan above)
□ 5. Compile check: webpack 0 new warnings
```
