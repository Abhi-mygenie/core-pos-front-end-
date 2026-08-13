# POS 3.0 BUG-108 — Coupon Phase V1 Implementation Plan

**Date:** 2026-05-25
**Status:** `bug_108_coupon_v1_plan_ready_for_implementation`
**Scope:** Phase V1 only (simple order coupons + type-ahead UX + time-window UX + print parity + Flow 3 fix + kill-switch removal at closure).
**Source docs:**
- Contract Freeze: `POS3_0_BUG_108_COUPON_CRM_CONTRACT_FREEZE_V1_2026_05_25.md`
- Payload Mapping: `POS3_0_BUG_108_COUPON_FRONTEND_PAYLOAD_MAPPING_DISCOVERY_2026_05_25.md`
- CRM Contract: `crm/crm_1_0/handoff/CR_001C_C_COUPON_POS_API_HANDOFF_SUMMARY.md`

---

## 1. Objective & Success Criteria

### Objective
Ship a production-quality coupon redemption flow in POS Frontend for **`offer_type='simple'` + `discount_scope='order'`** coupons, including time-window UX, type-ahead discovery, auto-apply max-discount, and bill-print parity. Fix the Flow 3 latent key-mismatch bug. Remove the `couponLive` kill switch at closure.

### Success criteria
1. Type-ahead autocomplete works on `CollectPaymentPanel` coupon input — calls `/api/pos/coupons/available` on focus, filters client-side as cashier types, auto-applies highest-discount match via `/api/pos/coupons/validate` after 500ms debounce.
2. Manual code entry works for codes NOT in the suggested list (cashier types unknown code → Apply → CRM `/validate` decides).
3. Outside-window coupons appear greyed-out with `next_window_start` formatted hint.
4. All 9 V1-relevant CRM error codes are mapped to cashier-facing messages with `pos_instruction` rendering.
5. Flow 3 (`placeOrderWithPayment` / prepaid) key-mismatch is fixed and `couponLive` gate added.
6. Flow 4 (`collectBillExisting` / postpaid) emits `coupon_code` + `coupon_discount` + `coupon_title` + `coupon_type` correctly.
7. Bill print shows "Coupon `<CODE>` −₹X" line, mirroring `loyalty_dicount_amount` pattern.
8. Cashier-cancel pre-confirm warning toast appears when a coupon-applied order is being cancelled.
9. CRM `coupon_usage.recorded=true` confirmed on at least 10 test orders across cash, UPI, card, split-payment methods.
10. Existing flows (Loyalty, Wallet, Discount, Tip, Split, TAB, transferToRoom, room balance, QSR Full View, Hold-Tab Collect Bill) remain regression-free.
11. `BUG108_FLAGS.couponLive` kill switch removed at V1 closure; only `restaurantSettings.isCoupon` gates the module.

### Out of scope (deferred to V2/V3)
- Item / category coupons (V2)
- BOGO / BXG / Every-Nth (V3)
- `items[]` sent to `/validate` (V2)
- `benefit_items` UI preview (V3)
- POS Backend mapper changes for `items[]` (V2 prerequisite)
- QSR fresh Place+Pay coupon UI (deferred per Owner Q4 = A)
- Exclusion-inference UX (deferred Phase 2+ enhancement)
- Customer-less / guest coupons (deferred — `customer_id` mandatory per G-1)

---

## 2. File-by-File Change Plan

### 2.1 New File — `src/api/constants.js` (edit existing)

Add to the CRM endpoints block (alongside existing `LOYALTY_REDEEM`, `MAX_REDEEMABLE`):

```js
// BUG-108 V1 Coupon CRM (CR-001C-C, 2026-05-25)
COUPONS_AVAILABLE: '/pos/coupons/available',
COUPONS_VALIDATE: '/pos/coupons/validate',
```

Path prefix `/api` comes from `REACT_APP_CRM_BASE_URL` env var.

### 2.2 New File — `src/api/services/couponService.js`

```js
// Coupon CRM service — wraps GET /api/pos/coupons/available + POST /api/pos/coupons/validate.
// Auth: X-API-Key via existing crmAxios interceptor (login response crm_token).
// BUG-108 V1 (2026-05-25). Mirrors loyaltyService.js pattern.

import crmApi from '../crmAxios';
import { CRM_ENDPOINTS } from '../constants';
import * as couponTransform from '../transforms/couponTransform';

/**
 * Fetch coupons eligible for a customer + order context.
 * Called on coupon-input focus. Read-only.
 * @returns {Promise<{coupons: Array, error?: {code, detail}}>}
 */
export const getAvailableCoupons = async ({ customerId, orderTotal, channel = 'pos' }) => {
  try {
    const response = await crmApi.get(CRM_ENDPOINTS.COUPONS_AVAILABLE, {
      params: { customer_id: customerId, order_total: orderTotal, channel },
    });
    return couponTransform.fromAPI.availableCoupons(response.data);
  } catch (e) {
    console.warn('[Coupon] getAvailableCoupons error:', e.readableMessage || e.message);
    return { coupons: [], error: { code: 'NETWORK', detail: e.readableMessage } };
  }
};

/**
 * Validate a specific coupon + compute discount. Read-only.
 * @returns {Promise<{valid, computedDiscount, finalAmountPreview, error?, posInstruction?, ...}>}
 */
export const validateCoupon = async ({ code, customerId, orderTotal, channel = 'pos', loyaltyPointsUsed = 0 }) => {
  try {
    const response = await crmApi.post(CRM_ENDPOINTS.COUPONS_VALIDATE, couponTransform.toAPI.validateRequest({
      code, customerId, orderTotal, channel, loyaltyPointsUsed,
    }));
    return couponTransform.fromAPI.validateCoupon(response.data);
  } catch (e) {
    // CRM returns 200 with valid:false; this catch is network-only.
    console.warn('[Coupon] validateCoupon error:', e.readableMessage || e.message);
    return { valid: false, error: { code: 'NETWORK', detail: e.readableMessage || 'Network error' } };
  }
};
```

### 2.3 New File — `src/api/transforms/couponTransform.js`

```js
// Coupon transforms — POS ↔ CRM coupon API.
// BUG-108 V1 (2026-05-25). V1 supports offer_type='simple', discount_scope='order' only.

const CHANNEL_MAP = {
  dineIn:   'dine_in',
  takeAway: 'takeaway',
  delivery: 'delivery',
};

export const fromAPI = {
  /**
   * GET /available response → POS-canonical shape.
   */
  availableCoupons: (apiData) => {
    if (!apiData?.success) return { coupons: [], error: apiData?.data?.error || null };
    const coupons = (apiData.data?.coupons || []).map(c => ({
      id:                    c.id,
      code:                  c.code,
      title:                 c.title || c.code,
      offerType:             c.offer_type || 'simple',
      discountScope:         c.discount_scope || 'order',
      expectedDiscount:      parseFloat(c.expected_discount) || 0,
      finalAmountPreview:    parseFloat(c.final_amount_preview) || 0,
      stackableWithLoyalty:  c.stackable_with_loyalty !== false,
      requiresCartValidation: c.requires_cart_validation === true,
      // Time-window
      withinWindowNow:       c.time_window?.within_window_now !== false,
      nextWindowStart:       c.time_window?.next_window_start || null,
      timeWindowConfigured:  c.time_window?.configured === true,
      posInstruction:        c.pos_instruction || null,
    }));
    return { coupons, error: null };
  },

  /**
   * POST /validate response → POS-canonical shape.
   */
  validateCoupon: (apiData) => {
    if (apiData?.data?.valid) {
      const d = apiData.data;
      return {
        valid:              true,
        couponId:           d.coupon_id,
        code:               d.code,
        title:              d.title || d.code,
        couponType:         d.coupon_type || 'order',
        discountScope:      d.discount_scope || 'order',
        computedDiscount:   parseFloat(d.computed_discount) || 0,
        finalAmountPreview: parseFloat(d.final_amount_preview) || 0,
        stackableWithLoyalty: d.stackable_with_loyalty !== false,
        offerType:          d.offer_type || 'simple',
      };
    }
    const errData = apiData?.data || {};
    return {
      valid:          false,
      error:          errData.error || { code: 'UNKNOWN', detail: apiData?.message || 'Coupon not valid' },
      posInstruction: errData.pos_instruction || null,
      timeWindowStatus: errData.time_window_status || null,
    };
  },
};

export const toAPI = {
  /**
   * POS orderType → CRM channel. Owner Q1 frozen: strict CRM snake_case.
   */
  channel: (orderType) => CHANNEL_MAP[orderType] || 'pos',

  /**
   * Build POST /validate request body.
   */
  validateRequest: ({ code, customerId, orderTotal, channel, loyaltyPointsUsed }) => ({
    code:                 String(code || '').trim().toUpperCase(),
    customer_id:          String(customerId),
    order_total:          parseFloat(orderTotal) || 0,
    channel:              channel || 'pos',
    loyalty_points_used:  parseInt(loyaltyPointsUsed) || 0,
    items:                null,                          // V1: null. V2: build via toAPI.posCartItem.
    order_time:           new Date().toISOString(),      // informational only — CRM uses server clock.
  }),

  // V2 stub — implemented in V2 phase.
  posCartItem: (_cartLine) => null,
};
```

### 2.4 Edit — `src/components/order-entry/CollectPaymentPanel.jsx`

Required edits (in order of appearance):

| Edit # | Location | Change |
|---|---|---|
| **E-1** | L264–266 (coupon state block) | Add `availableCoupons` state, `couponLoading` state, `couponInstruction` state, `showCouponDropdown` state. Keep existing `selectedCoupon`, `couponCode`, `couponError`. |
| **E-2** | L521–526 (couponDiscount math) | Replace `selectedCoupon.type === 'percent' ? ... : selectedCoupon.discount` math with `selectedCoupon?.computedDiscount || 0` (CRM is now source of truth — POS no longer recomputes the discount). Remove the `BUG108_FLAGS.couponLive` gate (V1 closure removes flag). |
| **E-3** | L659–672 (handleApplyCoupon) | Replace early-return stub with real `validateCoupon` call. Parse error code → set `couponError` (i18n string) + `couponInstruction` (CRM `pos_instruction`). On success, set `selectedCoupon` from `fromAPI.validateCoupon`. |
| **E-4** | NEW useEffect after L724 | Trigger `getAvailableCoupons` on coupon-input focus (only if `customer && restaurantSettings.isCoupon`). Cache in `availableCoupons` state. Single call per focus event. |
| **E-5** | NEW useEffect for debounced auto-apply | 500ms after cashier stops typing in coupon input → filter `availableCoupons` by `code.startsWith(typed.toUpperCase())`, skip outside-window coupons (per EC-2), pick highest `expectedDiscount`, call `validateCoupon` with that code, apply. If no match → no auto-apply. |
| **E-6** | L777–793 (paymentData.discounts emit) | Update fields: `couponDiscount: selectedCoupon?.computedDiscount \|\| 0`; `couponTitle: selectedCoupon?.title \|\| ''` (SQ-1 = A: display name); `couponCode: selectedCoupon?.code \|\| ''` (SQ-1 = A: NEW separate field); `couponType: selectedCoupon?.couponType \|\| 'order'`. |
| **E-7** | L834–867 (handlePrintBill overrides) | Add `couponDiscount: couponDiscount` (NEW — was missing). Keep existing `couponCode: selectedCoupon?.code \|\| ''`. |
| **E-8** | L1046–1099 (coupon UI block) | Replace input-only render with full type-ahead UX (see §2.4.1 below for spec). |
| **E-9** | L1539–1620 (inline-mirror coupon UI for room service) | Same treatment as E-8. |
| **E-10** | NEW data-testid additions | `coupon-suggestions-dropdown`, `coupon-suggestion-{code}`, `coupon-pos-instruction-text`, `coupon-outside-window-hint`. |

#### 2.4.1 Coupon UI Spec (E-8)

```
┌─ Coupon Section (data-testid="coupon-section") ──────────────────┐
│ 🎫 Coupon  [Enter code or pick from list_______]   [ Apply ]    │
│                                                                  │
│ [Optional dropdown when input focused + availableCoupons.length > 0:│
│   data-testid="coupon-suggestions-dropdown"                      │
│   ┌────────────────────────────────────────────────────────┐    │
│   │ SUMMER20    −₹100                            (auto)    │    │
│   │ BIRTHDAY50  −₹50                                       │    │
│   │ HAPPY3PM    Available from 3:00 PM (greyed)           │    │
│   └────────────────────────────────────────────────────────┘ ]  │
│                                                                  │
│ [If empty list: "No coupons available for this customer"         │
│   data-testid="coupon-empty-hint" (per EC-1)]                    │
│                                                                  │
│ [If applied: ✓ SUMMER20 (-₹100) [Remove]                          │
│   data-testid="applied-coupon-chip"]                             │
│                                                                  │
│ [If error: "Coupon expired" data-testid="coupon-error-text"]     │
│ [If posInstruction: "Add 1 more coffee to qualify"               │
│   data-testid="coupon-pos-instruction-text"]                     │
└──────────────────────────────────────────────────────────────────┘
```

Behavior:
- Input visible when `customer && restaurantSettings.isCoupon`. No mention of "Coming soon" — V1 closure removes that helper text.
- Dropdown shows max 5 items, scrollable below.
- Outside-window items greyed (opacity 0.5), not clickable.
- Manual code entry path: cashier types code → Apply button → calls `validateCoupon` directly (per SQ-3 EC unknown-code fallback).
- Mutual exclusion with manual discount preserved (BUG-108 P1 Q10).

### 2.5 Edit — `src/api/transforms/orderTransform.js`

| Edit # | Location | Change |
|---|---|---|
| **E-11** | L901–906 (Flow 1 `placeOrder` coupon block) | Add new `coupon_code: ''` field (alongside existing `coupon_discount: 0`, `coupon_title: null`, `coupon_type: null`). Keep hardcoded since Flow 1 is unpaid order — no coupon at placement time. |
| **E-12** | L1017–1022 (Flow 2 `updateOrder` coupon block) | Same as E-11 — add `coupon_code: ''`. |
| **E-13** | **L1148 (Flow 3 prepaid placeOrderWithPayment) — CRITICAL FIX** | Replace `coupon_discount: discounts.coupon \|\| 0` with `coupon_discount: discounts.couponDiscount \|\| 0` (fix key-mismatch). Add `couponLive` gate during V1; remove flag at V1 closure. |
| **E-14** | L1149–1153 (Flow 3 continued) | Update `coupon_title: discounts.couponTitle \|\| ''`; add `coupon_code: discounts.couponCode \|\| ''` (NEW per SQ-1 = A); `coupon_type: discounts.couponType \|\| ''`. |
| **E-15** | Flow 4 `collectBillExisting` coupon block (L1355–1357 per earlier discovery) | Update `coupon_title: discounts.couponTitle \|\| ''`; add `coupon_code: discounts.couponCode \|\| ''` (NEW per SQ-1 = A); `coupon_type: discounts.couponType \|\| ''`. Keep `couponLive` gate during V1; remove flag at V1 closure. |
| **E-16** | L1785 (Flow 5 print payload) | Existing `coupon_code` field — keep. ADD `coupon_discount: BUG108_FLAGS.couponLive ? (overrides.couponDiscount \|\| 0) : 0` (NEW per Owner Q5 = A, mirrors `loyalty_dicount_amount` pattern at L1786). |

### 2.6 Edit — `src/utils/BUG108_FLAGS.js`

| Edit # | Location | Change |
|---|---|---|
| **E-17** | L35 `couponLive: false` | **V1 implementation:** flip to `true` after Step 3 QA gate passes. **V1 closure:** remove the `couponLive` constant entirely (per New-Q1 = A). |
| **E-18** | L62+ copy strings | Remove `couponDisabledHelper: 'Coming soon'` (no longer used after V1 closure). Keep `couponBlockedByDiscount` and `discountBlockedByCoupon` (mutual exclusion still active). |

### 2.7 NO CHANGES

- `src/components/order-entry/CartPanel.jsx` — QSR remains coupon-free per Owner Q4 = A.
- `src/api/transforms/customerTransform.js` — `customer.coupons` slot stays orphan in V1 (lazy-loaded via `/available`, not eager-populated via customer selection).
- POS Frontend → CRM `POST /api/pos/orders` direct call — confirmed NEVER per Owner Q4 = yes; POS Backend bridges.

---

## 3. Data Flow Diagrams

### 3.1 `/available` flow (on coupon-input focus)

```
Cashier focuses coupon input
  ↓
useEffect detects focus, customer.id + isCoupon truthy
  ↓
couponService.getAvailableCoupons({ customerId, orderTotal: subtotalAfterDiscount, channel: 'dine_in' })
  ↓
crmApi.get('/pos/coupons/available', { params: {...} })
  ↓
[X-API-Key: crm_token from login]
  ↓
CRM returns { data: { coupons: [...] } }
  ↓
couponTransform.fromAPI.availableCoupons(response)
  ↓
setAvailableCoupons(result.coupons)
  ↓
Dropdown renders below input
```

### 3.2 `/validate` flow (on debounced auto-apply or Apply button click)

```
Cashier types "SU" + 500ms passes
  ↓
filteredCoupons = availableCoupons.filter(c => c.code.startsWith('SU'))
  ↓
Filter out outside-window (per EC-2)
  ↓
Pick highest expectedDiscount
  ↓
couponService.validateCoupon({ code: 'SUMMER20', customerId, orderTotal, channel, loyaltyPointsUsed })
  ↓
crmApi.post('/pos/coupons/validate', { code, customer_id, order_total, channel, loyalty_points_used, items: null, order_time })
  ↓
CRM returns { data: { valid: true, computed_discount: 100, ... } }
  ↓
couponTransform.fromAPI.validateCoupon(response)
  ↓
setSelectedCoupon({ code: 'SUMMER20', computedDiscount: 100, ... })
  ↓
Bill recomputes: couponDiscount = 100
  ↓
UI: "✓ SUMMER20 (-₹100) [Remove]"
```

### 3.3 Commit flow (POS Frontend → POS Backend → CRM)

```
Cashier clicks Pay
  ↓
handlePayment builds paymentData.discounts = {
  couponDiscount: 100,
  couponTitle:    'Summer 20% off',
  couponCode:     'SUMMER20',
  couponType:     'order',
  ...
}
  ↓
onPaymentComplete(paymentData) → OrderEntry.handleCollectBill
  ↓
orderTransform.toAPI.collectBillExisting builds payload {
  coupon_discount: 100,
  coupon_title:    'Summer 20% off',
  coupon_code:     'SUMMER20',
  coupon_type:     'order',
  ...
}
  ↓
POST /api/v2/vendoremployee/order/order-bill-payment
  ↓
[POS Backend mapper forwards coupon_* fields to CRM]
  ↓
CRM POST /api/pos/orders → revalidates + commits coupon_usage
  ↓
Response carries coupon_usage.recorded=true (audit only)
```

### 3.4 Print flow

```
Cashier clicks "Print Bill" (CollectPaymentPanel L908)
  ↓
handlePrintBill builds overrides {
  couponCode:     'SUMMER20',
  couponDiscount: 100,  // NEW per Owner Q5 = A
  ...
}
  ↓
onPrintBill(overrides) → OrderEntry → orderTransform.toAPI.buildBillPrintPayload
  ↓
Print payload {
  coupon_code:     'SUMMER20',
  coupon_discount: 100,  // NEW
  ...
}
  ↓
POST POS Backend /order-temp-store
  ↓
Bill renders "Coupon SUMMER20  −₹100" line below "Discount" line
```

---

## 4. Phased Rollout

| Step | Scope | Gate to next step |
|---|---|---|
| **Step 1 — Read-only wiring** | Add E-1 to E-7 (new constants + new service + new transform + minor CollectPaymentPanel state additions). Keep `couponLive=false`. No UI change visible to cashier. | Code compiles. Unit-test that `couponService.getAvailableCoupons` and `validateCoupon` work end-to-end against `https://crm.mygenie.online/api/pos/coupons/*` (CRM Q1 confirmed — endpoint reachable with valid token). |
| **Step 2 — UI integration** | Apply E-8 + E-9 (full type-ahead UX) + E-10 (testids). Apply E-11 to E-16 (orderTransform fixes including Flow 3 latent bug). Apply E-17 = flip `couponLive=true`. Apply E-18 = remove "Coming soon" copy. | All success-criteria tests pass (see §7). 10 test orders across cash/UPI/card/split with `coupon_usage.recorded=true` confirmed at CRM. |
| **Step 3 — QA flag-flip gate** | Run full regression checklist (see §6). Stress-test type-ahead with various coupon configs. Verify Loyalty stacking gate (`stackable_with_loyalty=false` + `loyalty_points_used > 0` → `STACKING_NOT_ALLOWED`). | Owner sign-off + no P0/P1 bugs from QA. |
| **Step 4 — V1 closure** | **Remove `BUG108_FLAGS.couponLive` constant entirely** from `BUG108_FLAGS.js`. Remove all `BUG108_FLAGS.couponLive ? ... : ...` ternary gates from `orderTransform.js` (E-13, E-15, E-16). Keep `is_coupon` profile gate as the only cascade. Remove `couponDisabledHelper` copy. Update PRD + Contract Freeze doc with closure date. | None — V1 closed; V2 planning begins. |

---

## 5. Error Code Mapping (V1-Relevant)

POS handles errors by `data.error.code` only (per CRM contract §12). All 9 V1-relevant codes:

| CRM `error.code` | Cashier-facing message | UI slot | Show `pos_instruction`? |
|------------------|------------------------|---------|--------------------------|
| `INVALID_CODE` | "Invalid coupon code" | `coupon-error-text` | No |
| `EXPIRED` | "Coupon has expired" | `coupon-error-text` | No |
| `INACTIVE` | "Coupon is no longer active" | `coupon-error-text` | No |
| `MIN_ORDER_NOT_MET` | "Minimum order value not met" | `coupon-error-text` | Yes (e.g., "Add ₹150 more to qualify") |
| `USAGE_LIMIT_REACHED` | "Coupon fully redeemed" | `coupon-error-text` | No |
| `CUSTOMER_USAGE_LIMIT_REACHED` | "You have used this coupon the maximum number of times" | `coupon-error-text` | No |
| `CUSTOMER_NOT_ELIGIBLE` | "Coupon not available for this customer" | `coupon-error-text` | No |
| `CHANNEL_NOT_VALID` | "Coupon not valid for this order type" | `coupon-error-text` | No |
| `STACKING_NOT_ALLOWED` | "Cannot combine coupon with loyalty points" | `coupon-error-text` | Yes if returned |
| `OUTSIDE_TIME_WINDOW` | "Coupon not active right now" | `coupon-error-text` | Yes (e.g., "Available from 3 PM") |
| `NETWORK` (POS-side) | "Unable to validate coupon. Try again." | `coupon-error-text` | No |

V2/V3 codes (NOT handled in V1):
- `MISSING_ITEMS_FOR_*`, `NO_ELIGIBLE_*`, `MIN_ITEM_QTY_NOT_MET`, `BUY_REQUIREMENT_NOT_MET`, `GET_REQUIREMENT_NOT_MET`, `NTH_REQUIREMENT_NOT_MET`, `BXGY_CONFIG_INVALID`, `EVERY_NTH_CONFIG_INVALID`, `UNSUPPORTED_BENEFIT_TYPE`, `UNSUPPORTED_NTH_BENEFIT_TYPE` — show generic "Coupon not applicable to this cart" if encountered in V1 (shouldn't be, since V1 doesn't request V2/V3 coupons).

---

## 6. Regression Checklist (Step 3 Gate)

Verify ALL of the following remain unchanged in behavior with `couponLive=true`:

### 6.1 CollectPaymentPanel core flows
- [ ] Loyalty redemption (`/pos/max-redeemable` flow) — unchanged math, unchanged payload
- [ ] Wallet section (visible read-only when `walletDebitLive=false`)
- [ ] Manual discount (%/₹) — mutual exclusion with coupon preserved (BUG-108 P1 Q10)
- [ ] Preset discount (from `restaurant.discountTypes`)
- [ ] Service charge toggle (BUG-028 / BUG-276)
- [ ] Tip input (BUG-281 / BUG-075 — applicable types only)
- [ ] Delivery charge input (BUG-019 / CR-008)
- [ ] Round-off (BUG-051 / BUG-052)
- [ ] Cash quick-pills + change calculation (BUG-CASH-PREFILL)
- [ ] Split-payment modal (BUG-080 / BUG-004)
- [ ] Card transaction ID (BUG-240)
- [ ] TAB/Credit customer search (BUG-038)
- [ ] PayLater special-case (BUG-058)
- [ ] Hold-Tab Collect Bill (BUG-042-A) — `allowedMethods` restriction
- [ ] transferToRoom flow (no coupon fields emitted — out of V1 scope)
- [ ] Room balance + associated orders (ROOM_CHECKIN_GAP3)
- [ ] Print Bill button (BUG-277) — now shows "Coupon −₹X" when applied

### 6.2 Order payload regression
- [ ] Flow 1 placeOrder: no coupon (unpaid order) — verify backend echoes 0
- [ ] Flow 2 updateOrder: no coupon (item-add only) — verify backend echoes 0
- [ ] Flow 3 placeOrderWithPayment (prepaid): coupon now flows correctly through `discounts.couponDiscount` (key-fix verified) — `coupon_usage.recorded=true` on CRM side
- [ ] Flow 4 collectBillExisting (postpaid): same as Flow 3
- [ ] Flow 5 buildBillPrintPayload: emits `coupon_code` AND `coupon_discount` correctly
- [ ] Flow 6 transferToRoom: unaffected (no coupon fields, V1 deferred)
- [ ] Flow 7 QSR fresh place+pay (via CartPanel): hardcoded zeros — verify unchanged
- [ ] Flow 7B QSR Collect Bill on placed order: coupon works via Full View → Flow 4 path

### 6.3 Existing testids
- [ ] All existing `data-testid` attributes still present and unchanged
- [ ] New testids: `coupon-suggestions-dropdown`, `coupon-suggestion-*`, `coupon-pos-instruction-text`, `coupon-outside-window-hint`, `coupon-empty-hint`

---

## 7. QA Test Cases (Step 2 + Step 3)

### 7.1 Type-ahead UX
- T-1 Customer with 3 eligible coupons → focus input → dropdown shows 3 items in descending `expectedDiscount` order
- T-2 Customer with 0 eligible coupons → focus input → "No coupons available for this customer" hint shown (EC-1)
- T-3 Cashier types "SU" → dropdown filters to codes starting with "SU"
- T-4 Cashier types and pauses 500ms → highest-discount match auto-applied via `/validate`
- T-5 Cashier types unknown code "RANDOM" → no auto-apply, Apply button enabled → click Apply → CRM returns `INVALID_CODE` → "Invalid coupon code" shown
- T-6 Highest match is outside-window → skipped → next-best auto-applied (EC-2)
- T-7 Two coupons tie for highest discount → first-by-API-response-order picked (EC-3)
- T-8 Remove applied coupon → bill recomputes without coupon discount, input cleared

### 7.2 Time-window UX
- T-9 Outside-window coupon in dropdown → greyed (opacity 0.5), `next_window_start` formatted as "Available from 3:00 PM"
- T-10 Outside-window coupon clicked → no-op (not clickable)
- T-11 Outside-window coupon code typed and Apply → CRM returns `OUTSIDE_TIME_WINDOW` → error shown with `pos_instruction`

### 7.3 Loyalty stacking
- T-12 `stackable_with_loyalty=false` coupon + `useLoyalty=true` → `STACKING_NOT_ALLOWED` error
- T-13 `stackable_with_loyalty=true` coupon + `useLoyalty=true` → both apply correctly

### 7.4 Payload + CRM verification
- T-14 Apply coupon in Flow 4 (postpaid Collect Bill) + Cash payment → CRM `coupon_usage.recorded=true`
- T-15 Apply coupon in Flow 3 (prepaid Place+Pay) + UPI → CRM `coupon_usage.recorded=true` (verifies key-mismatch fix)
- T-16 Apply coupon + split payment (cash + UPI) → CRM commit successful
- T-17 Apply coupon + cancel order (pre-commit, in `CollectPaymentPanel`) → no CRM call made (`/validate` is non-mutating per contract)
- T-18 Apply coupon + complete order + cancel via OrderEntry → cancel-warning toast appears per Owner Q3 = A + SQ-2 = A
- T-19 Apply coupon + manual print bill → printout shows "Coupon `<CODE>` −₹X" line

### 7.5 Field-name verification (PT-1/PT-2)
- T-20 DevTools Network tab → POST `/order-bill-payment` body contains `coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type` populated correctly
- T-21 Same for POST `/place-order` (prepaid Flow 3)
- T-22 POS Backend logs show forwarding of these fields to CRM `POST /api/pos/orders`

---

## 8. V1 Closure Tasks (Step 4)

After Step 3 sign-off, execute as one PR:
1. Remove `BUG108_FLAGS.couponLive` constant from `src/utils/BUG108_FLAGS.js`
2. Remove all `BUG108_FLAGS.couponLive ? ... : ...` ternary in `orderTransform.js` (E-13, E-15, E-16) — keep field emission unconditional
3. Remove `BUG108_COPY.couponDisabledHelper` constant
4. Remove "Coming soon" rendering paths from `CollectPaymentPanel.jsx` (helper-text slot)
5. Update `/app/memory/PRD.md` with closure date and V1 launch summary
6. Update Contract Freeze doc §9 status to `bug_108_coupon_v1_shipped`
7. Append closure summary to `POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_*.md`

---

## 9. Open Dependencies (Tracked, Not Blocking)

| # | Item | Owner | Resolution path |
|---|------|-------|-----------------|
| PT-1 | Verify POS Frontend actually emits `coupon_code`/`coupon_discount`/`coupon_title`/`coupon_type` on outgoing payload | POS Frontend (Step 2 verification via DevTools Network) | T-20, T-21 in §7.4 |
| PT-2 | If FE doesn't emit `coupon_code` (today it's missing from Flows 1–4), this plan ADDS it via E-11/E-12/E-14/E-15. After Step 2 + T-20, ask POS Backend team only if CRM `coupon_usage` shows `coupon_code=null` despite FE sending it. | POS Backend team (only if T-22 fails) | Post-Step-2 conditional |
| PT-3 | ✅ Resolved — same `crm_token` from login authenticates `/api/pos/coupons/*` (owner-confirmed) | — | Closed |

---

## 10. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | Planning document only — no code changes | **Confirmed** |
| 2 | `/app/memory/final/` untouched | **Confirmed** |
| 3 | Baseline docs untouched | **Confirmed** |
| 4 | No CRM mutating API called | **Confirmed** |
| 5 | All decisions traceable to Contract Freeze doc + owner answers | **Confirmed** |
| 6 | V2/V3 scope explicitly excluded | **Confirmed** |

---

**End of BUG-108 Coupon Phase V1 Implementation Plan.**
