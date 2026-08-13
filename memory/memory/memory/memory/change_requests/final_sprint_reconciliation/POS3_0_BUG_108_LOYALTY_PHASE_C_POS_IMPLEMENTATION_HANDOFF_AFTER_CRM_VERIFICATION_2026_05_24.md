# POS 3.0 BUG-108 — Loyalty Phase C POS Implementation Handoff (After CRM Verification)

**Date:** 2026-05-24
**From:** CRM/POS API Verification Agent
**To:** POS Phase C Implementation Agent
**Frozen plan:** `POS3_0_BUG_108_LOYALTY_PHASE_C_LR_REDEMPTION_TRIGGER_CORRECTION_PLAN_FROZEN_2026_05_24.md`
**Verification:** `POS3_0_BUG_108_LOYALTY_PHASE_C_CRM_API_VERIFICATION_REPORT_2026_05_24.md`

---

## 1. Handoff Status

```
bug_108_loyalty_phase_c_crm_api_verified_ready_for_pos_implementation
```

---

## 2. CRM API Verified Status

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /pos/max-redeemable` | **LIVE + VERIFIED** | All 8 frozen response cases match. Tier-aware. Non-mutating. |
| `POST /pos/loyalty/redeem` | **LIVE** (for POS Backend) | POS Frontend MUST NOT call this. Route exists for POS Backend use. |
| Auth (`X-API-Key`) | **VERIFIED** | Same pattern as existing CRM calls via `crmAxios`. |

---

## 3. Final Endpoint to Use

| | |
|---|---|
| **Endpoint** | `POST /pos/max-redeemable` |
| **Base URL** | `REACT_APP_CRM_BASE_URL` (= `https://insights-phase.preview.emergentagent.com/api`) |
| **Client** | `crmApi` from `src/api/crmAxios.js` |
| **Auth** | `X-API-Key` — automatically attached by `crmApi` interceptor |
| **Mutating?** | NO — safe to call on every bill amount change |

---

## 4. Final Request Contract

```js
{
  pos_id:        "mygenie",                    // hardcoded
  restaurant_id: String(restaurant?.id),       // from profile context
  customer_id:   customer?.id,                 // preferred — CRM UUID
  cust_mobile:   customer?.phone,              // fallback if no customer_id
  bill_amount:   itemTotal - manualDiscount - presetDiscount  // pre-loyalty subtotal
}
```

POS constant to add in `src/api/constants.js`:
```js
MAX_REDEEMABLE: '/pos/max-redeemable',
```

---

## 5. Final Response Contract

### Happy path (`data.error` absent):
```json
{
  "success": true,
  "data": {
    "max_points_redeemable": 664,     // → used_loyalty_point
    "max_discount_value": 664.0,       // → loyalty_dicount_amount + UI display
    "ratio_per_point": 1.0,            // → display
    "tier": "Gold",                    // → tier chip
    "available_points": 4588,          // → "(4588 pts)" display
    "min_redemption_points": 100,      // → threshold messaging
    "loyalty_enabled": true            // → UI gate
  }
}
```

### Error cases (`data.error.code` present):
All return HTTP 200. Branch on `data.error?.code`.

---

## 6. Error Code Handling Matrix

| `data.error.code` | `success` | UI action | Checkbox | Display |
|-------------------|-----------|-----------|----------|---------|
| _(absent)_ | `true` | Show discount | Auto-checked, enabled | `₹{max_discount_value} discount` |
| `BELOW_MIN_REDEMPTION` | `true` | Show threshold | Disabled | `Earn {min-available} more points` |
| `LOYALTY_DISABLED` | `true` | Hide loyalty section | — | — |
| `SETTINGS_MISSING` | `true` | Hide loyalty section | — | — |
| `CUSTOMER_NOT_FOUND` | `false` | Hide loyalty section | — | — |
| `INVALID_REQUEST` | `false` | Hide loyalty section; console.warn | — | — |

HTTP-level:
| HTTP | Action |
|------|--------|
| 401 | Hide loyalty; log auth issue |
| 422 | Hide loyalty; log schema issue |
| 5xx / network | Hide loyalty; show "Unable to calculate" |

---

## 7. POS Files To Modify

| File | Action | Frozen plan ref |
|------|--------|----------------|
| `src/api/constants.js` | ADD `MAX_REDEEMABLE: '/pos/max-redeemable'` | §8.2 |
| `src/api/services/loyaltyService.js` | ADD `getMaxRedeemable()` function | §8.1 |
| `src/api/transforms/loyaltyTransform.js` | ADD `fromAPI.maxRedeemable()` mapper | §8.3 |
| `src/components/order-entry/CollectPaymentPanel.jsx` | REMOVE direct redeem call (L713-824), REMOVE redeem state machine (L264-266), REMOVE orphan localStorage (L770-787), ADD `maxRedeemable` state + useEffect, REWRITE loyalty section UI (L1200-1270), REWRITE inline mirror (L1735-1770), FIX paymentData construction (L873-879) | §7.1-7.3, §8.4-8.5 |
| `src/api/transforms/orderTransform.js` | SIMPLIFY payload gates: remove `loyaltyRedeemLive` from AND, set `loyalty_redemption_id` to `null` | §7.4 |
| `src/utils/BUG108_FLAGS.js` | UPDATE copy strings, optionally remove/redefine `loyaltyRedeemLive` | §7.4-7.5 |

---

## 8. POS Files NOT To Modify

| File | Reason |
|------|--------|
| `src/api/services/loyaltyService.js` (existing `redeemLoyalty`) | Keep as dead code — no callers after removal from CollectPaymentPanel |
| `src/api/transforms/loyaltyTransform.js` (existing state machine, mappers) | Keep as dead code |
| `src/api/transforms/customerTransform.js` | No changes needed — max-redeemable provides all display data |
| `src/components/order-entry/OrderEntry.jsx` | No changes needed — enrichment still useful for non-loyalty customer data |
| `src/components/order-entry/CartPanel.jsx` | No changes needed |
| `src/api/crmAxios.js` | No changes needed — existing interceptor handles auth |
| `src/api/axios.js` | No changes needed |
| Backend files | No changes — CRM is remote |

---

## 9. Old Direct Redeem Wrapper Decision

| Component | Decision | Reason |
|-----------|----------|--------|
| `redeemLoyalty()` in `loyaltyService.js` | **KEEP (dead code)** | No callers after CollectPaymentPanel cleanup. May be useful if architecture changes. |
| `buildRedeemIdempotencyKey()` in `loyaltyTransform.js` | **KEEP (dead code)** | Same. |
| `LOYALTY_REDEEM_STATES` in `loyaltyTransform.js` | **KEEP (dead code)** | Same. |
| `LOYALTY_LS_KEYS` in `loyaltyTransform.js` | **KEEP (dead code)** | Same. |
| `import { redeemLoyalty }` in CollectPaymentPanel L18 | **REMOVE** | No longer called. |
| `import { LOYALTY_REDEEM_STATES, LOYALTY_LS_KEYS }` in CollectPaymentPanel L19 | **REMOVE** | No longer used. |

---

## 10. Payload Mapping Rules

### Bill Payment (to POS Backend via `api.post(BILL_PAYMENT, payload)`):

| Payload field | Source | When loyalty applied | When NOT applied |
|--------------|--------|---------------------|-----------------|
| `used_loyalty_point` | `maxRedeemable.maxPointsRedeemable` | CRM-returned int (e.g., 664) | `0` |
| `loyalty_dicount_amount` | (via print overrides) `maxRedeemable.maxDiscountValue` | CRM-returned float (e.g., 664.0) | `0` |
| `loyalty_redemption_id` | — | `null` (always — POS Backend generates) | `null` |

### Payload gate (in `orderTransform.js`):

**Before (current):**
```js
used_loyalty_point: (loyaltyRatioLive && loyaltyRedeemLive) ? value : 0
```

**After:**
```js
used_loyalty_point: loyaltyRatioLive ? (discounts.loyaltyPointsRedeemed || 0) : 0
```

Same simplification for `loyalty_dicount_amount` in print payload.
`loyalty_redemption_id` → always `null`.

### paymentData construction (in CollectPaymentPanel):

```js
discounts: {
  loyaltyPoints:         useLoyalty ? (maxRedeemable?.maxDiscountValue || 0) : 0,
  loyaltyPointsRedeemed: useLoyalty ? (maxRedeemable?.maxPointsRedeemable || 0) : 0,
  loyaltyRedemptionId:   null,
  // ... other existing fields unchanged
}
```

---

## 11. UI Display Rules

### Loyalty card right side:

| Condition | Display |
|-----------|---------|
| `maxRedeemable && !error && maxDiscountValue > 0` | `₹{maxDiscountValue} discount` (green) |
| `error.code === 'BELOW_MIN_REDEMPTION'` | `Earn {min - available} more` (gray) |
| `error.code === 'LOYALTY_DISABLED'` or `'SETTINGS_MISSING'` | Hide section |
| Loading | Spinner or "Calculating..." |
| API failed | "Unable to calculate" (gray) |

### Loyalty card left side:

Always show when max-redeemable returned data:
- Checkbox (auto-checked when `maxDiscountValue > 0`)
- "Loyalty" label
- Tier chip from `data.tier`
- `(data.available_points pts)` — NEVER "No points"

### Helper text:

| State | Copy |
|-------|------|
| Happy path, checkbox checked | `"{maxPointsRedeemable} pts redeemed · ratio ₹{ratioPerPoint}/pt"` |
| Happy path, checkbox unchecked | `"Tick to apply ₹{maxDiscountValue} loyalty discount"` |
| BELOW_MIN | `"Minimum {minRedemptionPoints} points required"` |
| Loading | `"Calculating loyalty discount..."` |
| Failed | `"Unable to calculate loyalty discount"` |

### Bill Summary:

When `loyaltyDiscount > 0`:
```
Loyalty Points ({maxPointsRedeemable} pts)    -₹{maxDiscountValue}
```

---

## 12. QA Checklist

| # | Test | Expected | Restaurant |
|---|------|----------|-----------|
| 1 | Gold customer (4588 pts), bill ₹349 | Loyalty: "₹349 discount", payload: `used=349, amount=349` | 689 |
| 2 | Gold customer, bill ₹1000 | Loyalty: "₹664 discount" (restaurant cap), payload: `used=664, amount=664` | 689 |
| 3 | Gold customer, bill ₹5000 | Same ₹664 cap | 689 |
| 4 | Zero-points customer | BELOW_MIN, checkbox disabled, "Earn 100 more" | 689 |
| 5 | Nonexistent customer | Loyalty section hidden | 689 |
| 6 | No customer selected | Loyalty section hidden (no API call) | any |
| 7 | Checkbox unchecked by cashier | `used_loyalty_point=0` in payload | 689 |
| 8 | Bill amount changes (add/remove item) | Re-call max-redeemable, discount updates | 689 |
| 9 | Manual discount changes | Re-call, discount updates (lower bill_amount → possibly lower discount) | 689 |
| 10 | Auth failure (unlikely) | Loyalty hidden, "Unable to calculate" | any |
| 11 | Phase B regression: loyalty preview still shows for display | `loyaltyPreviewLive=true` still works | any |
| 12 | Payload: `used_loyalty_point` sends CRM value | Verify via console.log or network tab | 689 |
| 13 | Payload: `loyalty_redemption_id` = null | Always null from POS Frontend | any |
| 14 | Print: `loyalty_dicount_amount` sends CRM value | Verify receipt includes loyalty line | 689 |
| 15 | "No points" text eliminated | Never appears when `available_points > 0` | 689 |

### Test credentials:
- **Login:** `owner@kunafamahal.com` / `Qplazm@10`
- **Restaurant ID:** 689
- **Customer:** abhishek jain (Gold, 4588 pts, phone: 7505242126, ID: `5ebde664-c7b7-46b7-85ab-f5c5319161b9`)
- **Restaurant cap:** ₹664, min: 100 pts

---

## 13. Blockers / Non-blockers

| # | Item | Type |
|---|------|------|
| — | — | **ZERO BLOCKERS** |
| 1 | CRM planning/handoff docs not local | NON-BLOCKING (endpoints verified live) |
| 2 | LOYALTY_DISABLED/SETTINGS_MISSING not testable | NON-BLOCKING (CRM agent samples trusted) |
| 3 | POS Backend redemption not verifiable | NON-BLOCKING (owner business rule) |

---

## 14. Ready/Not Ready for POS Implementation

```
READY FOR POS IMPLEMENTATION
```

All CRM endpoints are live and verified. The frozen plan is complete with file-level instructions. Test data and credentials are available. Zero blockers.

**The POS implementation agent should execute the frozen plan §7 (removals) and §8 (additions), then test using the QA checklist above.**

---

**End of POS Implementation Handoff.**
