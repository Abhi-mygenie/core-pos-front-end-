# POS 3.0 BUG-108 — Coupon Frontend Payload Mapping Discovery

**Date:** 2026-05-25
**Persona:** Senior POS3.0 BUG-108 Coupon Payload Mapping Discovery Agent
**Mode:** Read-only discovery. No code changes, no API calls, no data mutation.

---

## 1. Status

```
bug_108_coupon_frontend_payload_partial_present_keys_mismatched_for_flow_3_no_crm_specific_fields
```

POS Frontend **already emits most of the field names** the CRM contract expects on the order-commit webhook (`coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type`, `customer_id`-via-`cust_membership_id`, `loyalty_points_used`). However:
- All coupon discount values are force-zeroed today via `BUG108_FLAGS.couponLive=false`.
- **Flow 3 (prepaid place+pay) has a key-mismatch latent bug** — reads the wrong key from `discounts`, so even if `couponLive` were flipped on, Flow 3 would still send `coupon_discount: 0`.
- CRM-side `/validate` request fields (`code`, `customer_id`, `order_total`, `channel`, `loyalty_points_used`, `items[]`, `order_time`) are **not part of any current POS payload** because no CRM `/validate` call exists.
- `channel` and `order_total` fields are not explicitly emitted; backend derives `order_total` from the `cart`/`food_detail` arrays. `channel` will need an `orderType` → `channel` mapper.
- Existing `cart` (place-order) and `food_detail` (bill-payment) arrays are in **POS-specific schemas**, not CRM `POSCartItem` (validate) or `OrderItem` (commit) schemas. POS Backend mapper bridge is responsible for translation (per owner-frozen Q8).

---

## 2. Files Inspected

| # | File | Purpose / Relevant lines |
|---|------|--------------------------|
| 1 | `src/utils/BUG108_FLAGS.js` | L35: `couponLive: false` (master kill switch); copy strings L62 onward |
| 2 | `src/api/transforms/orderTransform.js` | **Flow 1 (placeOrder)** L845–944 (coupon block L901–906); **Flow 2 (updateOrder)** L951–1056 (coupon block L1017–1022); **Flow 3 (placeOrderWithPayment)** L1063–1198 (coupon block L1145–1153); **Flow 4 (collectBillExisting)** L1206+ (coupon block L1355–1357 per earlier discovery); **Flow 5 (buildBillPrintPayload)** L1785 (coupon_code); **Flow 6 (transferToRoom)** L1390–1430 (no coupon fields) |
| 3 | `src/components/order-entry/CollectPaymentPanel.jsx` | Coupon state L264–266; `couponDiscount` math L521–526; coupon UI L1046–1099 + inline-mirror L1539–1620; `handleApplyCoupon` L659–672 (no-op when `couponLive=false`); `paymentData.discounts` emit L777–793; print override emit L834–867 |
| 4 | `src/components/order-entry/CartPanel.jsx` | QSR `QsrBillingSection.handleCollectBill` L374–411 — hardcodes `couponDiscount: 0, couponTitle: '', couponType: ''` (no QSR coupon UI per owner Q4) |
| 5 | `src/api/constants.js` | Endpoint registry — confirmed **no coupon endpoint constants** (no `COUPONS_AVAILABLE`, `COUPONS_VALIDATE`) |
| 6 | `src/api/services/customerService.js` | No coupon-related functions |
| 7 | `src/api/services/loyaltyService.js` / `src/api/transforms/loyaltyTransform.js` | Loyalty pattern reference for couponService scaffold |
| 8 | `src/api/transforms/reportTransform.js` | L442 — historical `order.coupon_discount` displayed in reports (read-only) |
| 9 | `src/api/transforms/profileTransform.js` | L314 — `is_coupon` → `restaurantSettings.isCoupon` mapping (profile gate per owner Q1) |
| 10 | `src/api/transforms/customerTransform.js` | `customer.coupons` slot not populated (orphan per discovery) |

---

## 3. Flow-by-Flow Status Table

| Flow | Function | Endpoint hit | Coupon UI? | Coupon math? | Coupon fields emitted | Force-zero gate | CRM `/validate` call? | Status |
|------|----------|--------------|-----------|--------------|----------------------|------------------|------------------------|--------|
| **1** placeOrder (unpaid) | `toAPI.placeOrder` | POS BE `…/order/place-order` | No | No | `coupon_discount: 0`, `coupon_title: null`, `coupon_type: null` (L901–906) — **hardcoded zero** | n/a (hardcoded) | No | Not applicable for V1 (postpaid creation) |
| **2** updateOrder (add items) | `toAPI.updateOrder` | POS BE `…/order/update-place-order` | No | No | `coupon_discount: 0`, `coupon_title: null`, `coupon_type: null` (L1017–1022) — **hardcoded zero** | n/a (hardcoded) | No | Not applicable for V1 |
| **3** placeOrderWithPayment (prepaid) | `toAPI.placeOrderWithPayment` | POS BE `…/order/place-order` (prepaid variant) | Yes (via `CollectPaymentPanel`) | Yes (always 0 today) | `coupon_discount: discounts.coupon \|\| 0` ❌ KEY-MISMATCH (panel emits `discounts.couponDiscount` not `discounts.coupon`); `coupon_title: discounts.couponTitle \|\| ''`; `coupon_type: discounts.couponType \|\| ''` (L1148–1153) — **NOT gated by `couponLive`** | None (latent risk) | No | **BLOCKER** — must co-fix in V1 |
| **4** collectBillExisting (postpaid Bill Payment) | `toAPI.collectBillExisting` | POS BE `…/order/order-bill-payment` | Yes (via `CollectPaymentPanel`) | Yes (always 0 today) | `coupon_discount`, `coupon_title`, `coupon_type` — force-zero via `BUG108_FLAGS.couponLive` gate (earlier discovery §8) | `couponLive` | No | Reference path — clean for V1 once UI wired |
| **5** buildBillPrintPayload (manual + auto print) | `toAPI.buildBillPrintPayload` | POS BE `order-temp-store` | N/A (print) | N/A | `coupon_code` only (L1785) — force-empty via `couponLive`; **no `coupon_discount` value in print payload today** | `couponLive` | No | Owner Q5 (A): add `coupon_discount` field to print payload in V1 |
| **6** transferToRoom | `toAPI.transferToRoom` | POS BE `…/transfer-to-room` | No | No | **NO coupon fields at all** (L1390–1430) | n/a | No | Out of scope V1; flag noted in earlier discovery |
| **7** QSR fresh Place+Pay | `OrderEntry.handleQsrCollectBill` → `placeOrderWithPayment` via `CartPanel.QsrBillingSection.handleCollectBill` | POS BE `…/order/place-order` | **No (QSR has no coupon UI)** | No | Caller hardcodes `discounts.couponDiscount: 0, couponTitle: '', couponType: ''` (CartPanel L391–393) | Hardcoded at caller | No | Owner Q4 (A): QSR stays coupon-free for fresh place+pay |
| **7B** QSR Collect Bill (Full View) | `CollectPaymentPanel` → `collectBillExisting` | POS BE `…/order/order-bill-payment` | Yes (inherits Flow 4) | Yes | Same as Flow 4 | `couponLive` | No | Inherits Flow 4 |
| **8** Hold-Tab Collect Bill (Audit) | `CollectBillPanelDrawer` → `collectBillExisting` | POS BE `…/order/order-bill-payment` | Yes (inherits Flow 4) | Yes | Same as Flow 4 | `couponLive` | No | Inherits Flow 4 |

---

## 4. Field Mapping Table: CRM Required → Current POS Key → Status → Action

### 4.1 Fields the CRM expects on **`POST /api/pos/orders`** (final commit, side-effect)

These are sent **by POS Backend, not POS Frontend** — but POS Backend mapper relies on what POS Frontend ships in `place-order` / `order-bill-payment` to populate them.

| CRM-expected field | CRM aliases accepted | Current POS Frontend payload key | Present? | Force-zero gate | Action needed |
|--------------------|----------------------|----------------------------------|----------|------------------|----------------|
| `coupon_code` | `couponCode`, `coupon` | `coupon_title` (CollectPaymentPanel emits `selectedCoupon?.code` into `discounts.couponTitle` → backend writes to `coupon_title`) **+** `coupon_code` (print payload only, L1785) | ⚠️ Partial — POS frontend's `coupon_title` carries the code today; no dedicated `coupon_code` on bill-payment/place-order payloads | `couponLive` | **V1:** Confirm with POS Backend whether `coupon_title` is forwarded as CRM `coupon_code` (alias `coupon`), OR POS Frontend emits a new `coupon_code` field on `…/order-bill-payment` and `…/place-order`. Owner Q5 path: add `coupon_code` to all four commit flows (1/2/3/4). |
| `coupon_discount` | `couponDiscount`, `coupon_amount`, `coupon_discount_amount` | `coupon_discount` (Flows 1/2/3/4) | ✅ Field name exact match | Flow 1/2: hardcoded 0; Flow 3: key-mismatch → 0; Flow 4: `couponLive` gate | **V1:** Fix Flow 3 key-mismatch (`discounts.coupon` → `discounts.couponDiscount`) + add `couponLive` gate to Flow 3. Wire CollectPaymentPanel `couponDiscount` value through. After CRM `/validate` returns `computed_discount`, use that as the value. |
| `coupon_title` | `couponTitle`, `coupon_name` | `coupon_title` (Flows 1/2/3/4) | ✅ Field name exact match | Flow 3: no gate (still 0/'' because key-mismatch); Flow 4: `couponLive` gate | **V1:** Same path — populate from `selectedCoupon.title` (from `/validate` or `/available` response), not `selectedCoupon.code`. Decision needed: should `coupon_title` be the human-readable title or the code? CRM contract says title is **informational only**. |
| `coupon_type` | `couponType` | `coupon_type` (Flows 1/2/3/4) | ✅ Field name exact match | Same as `coupon_title` | **V1:** Map `discount_scope` (`order`/`item`/`category`) from `/validate` response; **OMIT** field for V3 (BOGO/BXG/Nth) per CRM Q3 / Contract Freeze §3.3. Requires POS Backend mapper to support field omission. |
| `items[]` (OrderItem schema: `pos_food_id`, `item_category`, `item_name`, `item_qty`, `item_price`) | — | `cart` (place-order: `food_id`, `quantity`, `price`, `variations`, ...) + `food_detail` (bill-payment: `food_id`, `quantity`, `item_id`, `unit_price`, ...) | ⚠️ Schemas differ — POS frontend ships POS-internal shape | n/a | **V2 prerequisite** (NOT V1 scope). POS Backend mapper converts `cart` / `food_detail` → CRM `OrderItem` schema. POS Frontend stays as-is. Owner Q8 frozen: this is BE↔FE concern, not CRM-bound. |

### 4.2 Fields the CRM expects on **`POST /api/pos/coupons/validate`** (POS Frontend → CRM directly)

These are NOT in any current POS payload because no `/validate` call exists. They must be built fresh in V1 by `couponService.validateCoupon` + `couponTransform.toAPI.validateRequest`.

| CRM `/validate` field | Source on POS Frontend today | Present? | Action needed in V1 |
|-----------------------|------------------------------|----------|---------------------|
| `code` | `couponCode` state (CollectPaymentPanel L265) | ✅ Available | Pass through |
| `customer_id` | `customer.id` (already passed as `cust_membership_id` on place-order/bill-payment) | ✅ Available | Pass `customer.id` directly; CRM mandatory per Q1 (no guest support per G-1) |
| `order_total` | `subtotalAfterDiscount` or `itemTotal` — derived in CollectPaymentPanel L498, L533 | ✅ Available | Pass `Math.max(0, itemTotal - manualDiscount - presetDiscount)` (pre-loyalty/pre-coupon base). Mirrors loyalty's `billAmount` (L688). |
| `channel` | `orderType` (`'dineIn'` \| `'takeAway'` \| `'delivery'`) in CollectPaymentPanel props | ⚠️ Available but **needs normalization** | Build `toAPI.channel(orderType)` mapper: `'dineIn'` → `'dine_in'`, `'takeAway'` → `'takeaway'`, `'delivery'` → `'delivery'`, else `'pos'` (per owner Q1: strict CRM snake_case). |
| `loyalty_points_used` | `maxRedeemable.maxPointsRedeemable` when `useLoyalty=true` (already exposed via `paymentData.discounts.loyaltyPointsRedeemed` L790) | ✅ Available | Pass integer points when loyalty is also being redeemed; CRM uses this for `STACKING_NOT_ALLOWED` check. |
| `items[]` (POSCartItem schema: `food_id`, `item_id`, `name`, `quantity`, `unit_price`, `category_name`) | `cartItems` prop in CollectPaymentPanel (has `foodId`, `qty`, `price`/`unitPrice`, `category` via `item.category` if present) | ⚠️ Available but **needs schema transform** | **V2 deliverable.** Build `toAPI.posCartItem(cartLine)` mapper. V1 sends `items: null` because V1 supports only `discount_scope='order'` coupons (no item-level matching). |
| `order_time` | None (CRM treats as informational; server clock authoritative per Contract Freeze §3.9) | ⚠️ Optional | V1: send `new Date().toISOString()` for audit; CRM ignores for window check. |

### 4.3 Legacy POS keys audit

| Legacy POS key | Currently emitted? | Used by CRM? | Notes |
|----------------|---------------------|---------------|-------|
| `coupon_discount` | ✅ Yes — Flows 1/2/3/4 | ✅ Yes (CRM-required for commit, field-name exact match) | Already aligned |
| `coupon_title` | ✅ Yes — Flows 1/2/3/4 | ✅ Yes (CRM accepts, informational) | Carries the code today (POS emits `selectedCoupon.code` here); align with CRM intent (informational display name) in V1 |
| `coupon_type` | ✅ Yes — Flows 1/2/3/4 | ✅ Yes (CRM accepts for V1/V2; OMIT for V3) | Needs OMISSION-on-V3 support in POS Backend mapper |
| `coupon_code` | ⚠️ Print payload only (Flow 5 L1785) | ✅ Yes (CRM accepts on commit) | Add to Flows 1–4 if POS Backend doesn't forward `coupon_title` as `coupon_code` alias |
| `usage_id` | ⚠️ Present but ALWAYS `''`/`null` across all flows (L918, L1038, L1172) | ❌ Not in CRM coupon contract | This is a **non-coupon** field — its semantics on the place-order payload are unrelated to CRM coupon `coupon_usage.usage_id`. Do not repurpose. |
| `discount_value` | ❌ Not emitted | ❌ Not in CRM coupon commit fields | `reportTransform.js` L224 reads `discount_value` as legacy fallback for `restaurant_discount_amount`; unrelated to coupon |
| `order_discount` | ✅ Yes — Flows 1/2/3/4 | ❌ Not coupon-specific | Reserved for manual % discount; coexists alongside `coupon_discount` |

---

## 5. Keys Currently Sent by Frontend (Coupon-Related)

| Key | Path | Value source | Active? |
|-----|------|---------------|---------|
| `coupon_discount` | Flow 1 placeOrder L903 | Hardcoded `0` | Always 0 |
| `coupon_title` | Flow 1 placeOrder L904 | Hardcoded `null` | Always null |
| `coupon_type` | Flow 1 placeOrder L905 | Hardcoded `null` | Always null |
| `coupon_discount` | Flow 2 updateOrder L1019 | Hardcoded `0` | Always 0 |
| `coupon_title` | Flow 2 updateOrder L1020 | Hardcoded `null` | Always null |
| `coupon_type` | Flow 2 updateOrder L1021 | Hardcoded `null` | Always null |
| `coupon_discount` | Flow 3 placeOrderWithPayment L1148 | `discounts.coupon \|\| 0` ❌ wrong key | Always 0 (key-mismatch latent bug) |
| `coupon_title` | Flow 3 placeOrderWithPayment L1149 | `discounts.couponTitle \|\| ''` | Empty string (because `couponLive=false`) |
| `coupon_type` | Flow 3 placeOrderWithPayment L1150 | `discounts.couponType \|\| ''` | Empty string |
| `coupon_discount`, `coupon_title`, `coupon_type` | Flow 4 collectBillExisting (per earlier discovery L1355–1357) | Gated by `BUG108_FLAGS.couponLive` | Force-zero/empty |
| `coupon_code` | Flow 5 print payload L1785 | `overrides.couponCode` (`selectedCoupon?.code`), gated by `couponLive` | Force-empty |
| `cust_membership_id` (== CRM `customer_id`) | Flows 1/3 (placeOrder/placeOrderWithPayment) — L880, L1123 | `customer?.id` | Active |
| `cust_mobile` (== fallback identifier for CRM) | Flows 1/3 — L876, L1119 | `customer?.phone` | Active |
| `used_loyalty_point` / `loyalty_points_used` (== CRM `loyalty_points_used` integer points) | Flow 3 L1157–1162 | Gated by `BUG108_FLAGS.loyaltyRatioLive`; reads `discounts.loyaltyPointsRedeemed` | Active via Loyalty Phase C |

---

## 6. Keys Missing from Frontend (for CRM Contract Compliance)

### 6.1 On commit-flow payloads (Flows 1/2/3/4)

| Missing field | Severity | Notes |
|---------------|----------|-------|
| `coupon_code` (dedicated key, not via `coupon_title` alias) | LOW–MEDIUM | If POS Backend forwards `coupon_title` → CRM `coupon_code` via alias, no action. Otherwise, add `coupon_code` to all 4 commit flows (mirrors `coupon_title`). |
| **Fixed `discounts.couponDiscount` read in Flow 3** | **HIGH** | Latent bug — must be fixed in V1. Current code reads `discounts.coupon` (undefined key). |
| **`couponLive` gate in Flow 3** | **HIGH** | Flow 3 has no flag gate today. Add for safety symmetry with Flow 4. (Will be removed in V1 closure per New-Q1.) |

### 6.2 On `/validate` request (no payload exists today)

| Missing field | Action |
|---------------|--------|
| `code` | New — built by `couponService.validateCoupon` in V1 |
| `customer_id` | New — built by `couponService.validateCoupon` from `customer.id` |
| `order_total` | New — built by `couponService.validateCoupon` from `subtotalAfterDiscount` (pre-coupon base) |
| `channel` | New — `toAPI.channel(orderType)` mapper |
| `loyalty_points_used` | New — pass `maxRedeemable.maxPointsRedeemable` when `useLoyalty=true` |
| `items[]` | V2 only — POSCartItem mapper |
| `order_time` | New — informational ISO string |

### 6.3 On `/available` request (no payload exists today)

| Missing field | Action |
|---------------|--------|
| `customer_id` | New — built by `couponService.getAvailableCoupons` from `customer.id` |
| `order_total` | New — same source as `/validate` |
| `channel` | New — `toAPI.channel(orderType)` mapper |

### 6.4 On print payload (Flow 5)

| Missing field | Action |
|---------------|--------|
| `coupon_discount` (value field) | **V1 (Owner Q5 = A):** add `coupon_discount` to print payload, mirroring `loyalty_dicount_amount` pattern. Display "Coupon `<CODE>` −₹X" line on bill print. |

---

## 7. Fields That Are Backend Mapper Responsibility (POS Frontend Stays As-Is)

Per owner Q8 (frozen): the schema divergence between `cart` / `food_detail` (POS-internal) and CRM `POSCartItem` / `OrderItem` is a **POS Frontend ↔ POS Backend internal concern**, not a CRM contract question.

| Concern | Owner | Phase blocker |
|---------|-------|----------------|
| POS frontend `cart[]` (place-order) → CRM `OrderItem` schema (`pos_food_id`, `item_category`, `item_name`, `item_qty`, `item_price`) | POS Backend mapper | **V2 prerequisite (B-2 from gap doc).** Not blocking V1. |
| POS frontend `food_detail[]` (bill-payment) → CRM `OrderItem` schema | POS Backend mapper | **V2 prerequisite.** |
| `coupon_*` fields pass-through on `/api/v2/vendoremployee/order/place-order` and `…/order-bill-payment` → CRM `POST /api/pos/orders` | POS Backend mapper | **V1 prerequisite (B-1).** Must verify before flag flip. |
| `coupon_type` field **omission** support for V3 BOGO/BXG/Nth | POS Backend mapper | V3 prerequisite. |
| Idempotency `(user_id, order_id)` propagation | POS Backend | V1 verification (likely already in place from existing order flow). |
| Threading CRM `coupon_usage.recorded` / `discount_mismatch` flags back to POS Frontend in place-order/bill-payment response | POS Backend | V1 enhancement (for cashier-cancel warning per Q3). Optional. |

---

## 8. Recommended Frontend Changes (V1 Scope)

Scoped to V1 per Contract Freeze §7.1.

### 8.1 New files
1. `src/api/services/couponService.js` — new service: `getAvailableCoupons({ customerId, orderTotal, channel })`, `validateCoupon({ code, customerId, orderTotal, channel, loyaltyPointsUsed, items, orderTime })`. Uses existing `crmApi` axios instance (no auth changes).
2. `src/api/transforms/couponTransform.js` — new transform:
   - `fromAPI.availableCoupons(apiResponse)` → array of coupons with `code`, `title`, `expectedDiscount`, `finalAmountPreview`, `couponType`, `discountScope`, `offerType`, `withinWindowNow`, `nextWindowStart`, `stackableWithLoyalty`
   - `fromAPI.validateCoupon(apiResponse)` → `{ valid, computedDiscount, finalAmountPreview, error?: { code, field, detail }, posInstruction?: string }`
   - `toAPI.channel(orderType)` → `'pos'` | `'dine_in'` | `'takeaway'` | `'delivery'`
   - `toAPI.posCartItem(cartLine)` — **stub in V1**, full impl in V2
   - `toAPI.validateRequest({ code, customer, orderTotal, channel, loyaltyPointsUsed })` → CRM request body
   - `toAPI.availableRequest({ customerId, orderTotal, channel })` → CRM query-string params

### 8.2 New constants in `src/api/constants.js`
- `COUPONS_AVAILABLE: '/pos/coupons/available'`
- `COUPONS_VALIDATE: '/pos/coupons/validate'`

### 8.3 Edits in `src/components/order-entry/CollectPaymentPanel.jsx`
1. Replace existing manual coupon input with **type-ahead autocomplete** (Owner Q6 spec from Contract Freeze §6).
2. Wire `handleApplyCoupon` to call `couponService.validateCoupon` and parse `error.code`.
3. Add `pos_instruction` display slot (new `data-testid="coupon-pos-instruction-text"`).
4. Add `useEffect` to call `couponService.getAvailableCoupons` on coupon-input focus (single call, cache in state).
5. Add debounced (500ms) auto-apply of highest-`expected_discount` match.
6. Add greyed-out treatment for outside-window coupons with `next_window_start` formatting.
7. Pass `couponDiscount` correctly into `paymentData.discounts.couponDiscount` (no change — already done correctly at L782).
8. Add cancel-warning toast trigger when coupon-applied order is cancelled (per Owner Q3 = A).
9. In `handlePrintBill` overrides (L834+), pass `couponDiscount` (new) alongside existing `couponCode`.

### 8.4 Edits in `src/api/transforms/orderTransform.js`
1. **Flow 3 fix (L1148):** read `discounts.couponDiscount` (correct key), not `discounts.coupon`.
2. **Flow 3 gate (L1148–1153):** add `BUG108_FLAGS.couponLive ? (...) : 0` gate for symmetry with Flow 4.
3. **Flow 5 print payload (L1785+):** add `coupon_discount: BUG108_FLAGS.couponLive ? (overrides.couponDiscount \|\| 0) : 0` field beside existing `coupon_code` (mirrors `loyalty_dicount_amount` pattern).
4. **V1 closure post-QA:** remove `BUG108_FLAGS.couponLive` gates entirely (per New-Q1 = A); only `restaurantSettings.isCoupon` remains as the cascade gate.

### 8.5 NO CHANGES needed in
- `src/components/order-entry/CartPanel.jsx` — QSR remains coupon-free per Owner Q4 = A.
- `src/api/transforms/customerTransform.js` — `customer.coupons` slot stays as-is in V1 (lazy-loaded via `/available` per Q6).
- POS Frontend → CRM `POST /api/pos/orders` direct call — confirmed NEVER per Owner Q4 = yes; POS Backend bridges.

---

## 9. Implementation Readiness Verdict

```
bug_108_coupon_frontend_payload_v1_changes_well_scoped_pending_backend_mapper_audit_b_1
```

- **POS Frontend coupon payload keys** are mostly in place. Field names `coupon_discount`, `coupon_title`, `coupon_type` already match the CRM contract exactly.
- **V1 work is well-scoped** (§8): 2 new files, 2 new constants, ~7 targeted edits in `CollectPaymentPanel.jsx`, ~3 edits in `orderTransform.js`. No QSR, no backend changes from the frontend side.
- **Blockers before V1 flag flip:**
  1. POS Backend mapper audit (B-1): verify `coupon_code` / `coupon_discount` / `coupon_title` / `coupon_type` fields pass through POS Backend `place-order` and `order-bill-payment` to CRM `POST /api/pos/orders` unstripped. Must include `coupon_code` propagation (or confirm `coupon_title` aliasing).
  2. Pre-launch `food_id` casing audit (for V2, NOT V1 — V1 doesn't send `items[]`).
- **Latent bug in Flow 3** (key-mismatch + missing `couponLive` gate) must be co-fixed inside V1 — it is safe today only because `couponLive=false` zeroes everything upstream.

---

## 10. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code changed | **Confirmed** |
| 2 | No frontend changed | **Confirmed** |
| 3 | No backend changed | **Confirmed** |
| 4 | No CRM changed | **Confirmed** |
| 5 | No data mutated | **Confirmed** |
| 6 | No mutating API called | **Confirmed** (only read-only file inspection) |
| 7 | `/app/memory/final/` untouched | **Confirmed** |
| 8 | Baseline docs untouched | **Confirmed** |

---

**End of BUG-108 Coupon Frontend Payload Mapping Discovery.**
