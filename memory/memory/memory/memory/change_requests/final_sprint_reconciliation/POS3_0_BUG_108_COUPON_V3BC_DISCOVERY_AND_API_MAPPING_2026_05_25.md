# POS 3.0 BUG-108 — Coupon V3-B/V3-C Discovery & API Mapping

**Date:** 2026-05-25
**Persona:** Senior POS3.0 BUG-108 Coupon V3-B/V3-C Discovery + API Mapping Agent
**Mode:** Read-only discovery. No code changes, no data mutation.
**Previous status:** V1B QA passed, V2 item/category mapping done, V3-A time-window done.

---

## 1. Status

```
bug_108_coupon_v3bc_discovery_complete_ready_for_planning
```

CRM API is fully ready (V3-B 49/49, V3-C 41/41 QA pass). POS has high V1/V2 reuse. Primary work is: cart filter for BOGO/BXG/Nth hint formats, validate response mapping for benefit_items/applied_applications, 12 new error codes, and a benefit_items UI display component.

---

## 2. Inputs Read

### Baseline docs (read earlier in session)
All 7 `/app/memory/final/` docs ✅

### Coupon docs
| # | Document | Read? |
|---|----------|-------|
| 1 | CRM Handoff §10 (BOGO/BXG) | ✅ |
| 2 | CRM Handoff §11 (Every-Nth) | ✅ |
| 3 | CRM Handoff §12 (Error Codes — 27 total) | ✅ |
| 4 | CRM Handoff §8 (POSCartItem) | ✅ |
| 5 | CRM Handoff §14 (Business Rules) | ✅ |
| 6 | CRM Handoff §15 (POS Checklist) | ✅ |
| 7 | CRM Handoff §16 (Open Items) | ✅ |
| 8 | V2 Discovery Report | ✅ |
| 9 | PRD.md | ✅ |

### Additional docs found (not in baseline list)
| Doc | Relevance |
|-----|-----------|
| `POS3_0_BUG_108_COUPON_CRM_CONTRACT_GAP_AND_QUESTIONS_2026_05_25.md` | Original gap analysis — V3 scope boundaries defined here |
| `POS3_0_BUG_108_COUPON_CRM_INTEGRATION_DISCOVERY_REPORT_2026_05_25.md` | Initial discovery of coupon state |
| `POS3_0_BUG_108_COUPON_V1B_STEP1_IMPLEMENTATION_REPORT_2026_05_25.md` | V1B implementation details |
| `POS3_0_BUG_108_COUPON_V1B_STEP1_SESSION_CLOSE_OUT_2026_05_25.md` | V1B session closeout |

### Code inspected
| File | Inspected? |
|------|-----------|
| `CollectPaymentPanel.jsx` | ✅ (cart filter L710-721, error codes L740-784, dropdown, chip) |
| `couponTransform.js` | ✅ (availableCoupons mapper L46-63, validateCoupon mapper L78-102, posCartItem L151-158) |
| `couponService.js` | ✅ |
| `orderTransform.js` | ✅ |
| `BUG108_FLAGS.js` | ✅ |

### Live CRM API tests (read-only)
| Test | Result |
|------|--------|
| V3-B BOGO: SEED_V3B_BOGO with 2× Cheese Kunafa | ✅ `valid: true`, `computed_discount: 299`, `applied_applications: 1`, `benefit_items: [1× Cheese Kunafa, discount: 299]` |
| V3-C Nth: SEED_V3C_EVERY3_FREE with 3× Pista Dream | ✅ `valid: true`, `computed_discount: 349`, `applied_applications: 1`, `nth_item_number: 3`, `benefit_items: [1× Pista Dream, discount: 349]` |

---

## 3. CRM V3-B Contract Summary (BOGO / BXG)

### Offer types
- `bogo` — Buy 1 Get 1 (same item)
- `bxg` (alias `buy_x_get_y`) — Buy X of item A, Get Y of item B

### Request requirements
- `items[]` is **mandatory** (`requires_cart_validation: true`)
- Get item **must already be in cart** — POS must NOT auto-add items
- Same POSCartItem schema as V2

### Key response fields (success)
| Field | Type | Purpose |
|-------|------|---------|
| `computed_discount` | float | Total discount amount |
| `applied_applications` | int | Number of times the offer was applied (e.g., 2× BOGO = 2 applications) |
| `benefit_items` | array | Which items got discounted: `[{ food_id, name, quantity, unit_price, line_discount }]` |
| `buy_match_summary` | array | What matched as "buy" items |
| `get_match_summary` | array | What matched as "get" items |
| `same_item_required` | bool | Whether buy and get must be same item |
| `max_applications` | int/null | Cap on applications |
| `allow_repeat` | bool | Whether offer can apply multiple times |

### Application math
- `applications = floor(get_eligible_qty / get_quantity)`, capped by `floor(buy_eligible_qty / buy_quantity)`
- Further capped by `max_applications` and `allow_repeat`
- Benefit on get items: `free` / `percentage` / `flat`
- Default: cheapest eligible get unit receives benefit

### eligible_match_hint format (from /available)
```json
{
  "kind": "bogo",
  "buy_quantity": 1,
  "get_quantity": 1,
  "buy": { "type": "food_ids", "values": ["182042"] },
  "get": { "type": "food_ids", "values": ["182042"] },
  "same_item_required": true,
  "get_discount_type": "free",
  "get_discount_value": null
}
```

### Error codes (7)
| Code | Meaning |
|------|---------|
| `MISSING_ITEMS_FOR_BXGY_COUPON` | No items[] sent |
| `BUY_REQUIREMENT_NOT_MET` | Not enough buy items |
| `GET_REQUIREMENT_NOT_MET` | Not enough get items |
| `NO_ELIGIBLE_BUY_ITEMS_IN_CART` | No buy-eligible lines found |
| `NO_ELIGIBLE_GET_ITEMS_IN_CART` | No get-eligible lines found |
| `BXGY_CONFIG_INVALID` | Coupon misconfigured |
| `UNSUPPORTED_BENEFIT_TYPE` | Unknown benefit type |

---

## 4. CRM V3-C Contract Summary (Every-Nth)

### Offer type
- `nth_item` (aliases: `every_nth`, `every_nth_item`)

### Request requirements
- `items[]` is **mandatory** (`requires_cart_validation: true`)
- Same POSCartItem schema as V2

### Key response fields (success)
| Field | Type | Purpose |
|-------|------|---------|
| `computed_discount` | float | Total discount amount |
| `applied_applications` | int | How many times Nth triggered |
| `benefit_items` | array | Which items got discounted |
| `eligible_match_summary` | array | What matched as eligible |
| `nth_item_number` | int | The "N" in every-Nth |
| `nth_discount_type` | string | `free` / `percentage` / `flat` |
| `nth_discount_value` | float/null | Discount amount (null for free) |

### Application math
- `applications = floor(eligible_total_qty / nth_item_number)`
- Quantity-based, NOT cart-sequence-based
- Capped by `max_applications` and `allow_repeat`
- Default: cheapest eligible unit receives benefit

### eligible_match_hint format (from /available)
```json
{
  "kind": "nth_item",
  "nth_item_number": 3,
  "eligibility": { "type": "category_names", "values": ["Authentic Kunafa"] },
  "nth_discount_type": "free",
  "nth_discount_value": null
}
```

### Error codes (5)
| Code | Meaning |
|------|---------|
| `MISSING_ITEMS_FOR_EVERY_NTH_COUPON` | No items[] sent |
| `NTH_REQUIREMENT_NOT_MET` | Eligible qty < nth_item_number |
| `NO_ELIGIBLE_NTH_ITEMS_IN_CART` | No eligible lines found |
| `EVERY_NTH_CONFIG_INVALID` | Coupon misconfigured |
| `UNSUPPORTED_NTH_BENEFIT_TYPE` | Unknown benefit type |

---

## 5. Current POS V1/V2 Reuse Status

| Component | Reusable? | Notes |
|-----------|----------|-------|
| `couponService.getAvailableCoupons` | ✅ Yes | Same endpoint |
| `couponService.validateCoupon` | ✅ Yes | Same endpoint, already sends `items` param |
| `couponTransform.toAPI.posCartItem` | ✅ Yes | V2 mapper works for V3 too — same POSCartItem schema |
| `couponTransform.toAPI.validateRequest` | ✅ Yes | Already accepts `items` param |
| `couponTransform.fromAPI.availableCoupons` | ⚠️ Partial | Maps `offerType` but NOT `buy_quantity`, `get_quantity`, `nth_item_number`, `max_applications`, `allow_repeat`, `same_item_required` |
| `couponTransform.fromAPI.validateCoupon` | ❌ Missing V3 fields | Does NOT map `benefit_items`, `applied_applications`, `buy_match_summary`, `get_match_summary`, `nth_item_number`, `nth_discount_type`, `nth_discount_value` |
| CollectPaymentPanel cart filter | ❌ Gap | Only handles `hint.type === 'food_ids'/'category_names'`. Does NOT handle `hint.kind === 'bogo'/'bxg'/'nth_item'` |
| CollectPaymentPanel error codes | ❌ Gap | Only has 3 V2 codes. Missing all 12 V3-B/V3-C codes |
| CollectPaymentPanel dropdown UI | ⚠️ Partial | Shows code + discount. No BOGO/BXG/Nth-specific display |
| CollectPaymentPanel applied chip | ⚠️ Partial | Shows `✓ CODE (-₹X)`. No benefit_items display |
| `orderTransform` Flow 3/4 payloads | ✅ Yes | `coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type` already in place. CRM handoff §14: `coupon_type` should be OMITTED for V3 types — POS BE mapper must support field omission |
| `billableItems` items[] builder | ✅ Yes | V2 Change D already builds items[] conditionally |

---

## 6. Current POS Gaps

### Gap 1 — Cart filter does not handle V3 hint formats
Current filter (L710-721) only matches:
- `hint.type === 'food_ids'` → food_id set match
- `hint.type === 'category_names'` → category name match
- Falls through to `return true` for unknown formats

V3 hints use `hint.kind` (not `hint.type`):
- BOGO/BXG: `{ kind: "bogo"/"bxg", buy: { type, values }, get: { type, values } }`
- Every-Nth: `{ kind: "nth_item", eligibility: { type, values } }`

**Result:** V3 coupons pass the filter and show in dropdown even when cart has no matching items.

### Gap 2 — Validate response missing V3 fields
`couponTransform.fromAPI.validateCoupon` (L78-92) only maps 10 fields. Missing:
- `benefit_items` (array of discounted items)
- `applied_applications` (number of offer applications)
- `buy_match_summary` / `get_match_summary` (V3-B audit)
- `eligible_match_summary` (V3-C audit)
- `nth_item_number`, `nth_discount_type`, `nth_discount_value` (V3-C offer description)
- `same_item_required`, `max_applications`, `allow_repeat` (V3-B config)

### Gap 3 — 12 error codes not handled
| Missing V3-B codes (7) | Missing V3-C codes (5) |
|------------------------|----------------------|
| MISSING_ITEMS_FOR_BXGY_COUPON | MISSING_ITEMS_FOR_EVERY_NTH_COUPON |
| BUY_REQUIREMENT_NOT_MET | NTH_REQUIREMENT_NOT_MET |
| GET_REQUIREMENT_NOT_MET | NO_ELIGIBLE_NTH_ITEMS_IN_CART |
| NO_ELIGIBLE_BUY_ITEMS_IN_CART | EVERY_NTH_CONFIG_INVALID |
| NO_ELIGIBLE_GET_ITEMS_IN_CART | UNSUPPORTED_NTH_BENEFIT_TYPE |
| BXGY_CONFIG_INVALID | |
| UNSUPPORTED_BENEFIT_TYPE | |

### Gap 4 — No benefit_items UI
When a V3 coupon is applied, CRM returns `benefit_items` showing exactly which items got discounted. Current UI only shows `✓ CODE (-₹X)`. No way for cashier to see WHAT got discounted.

### Gap 5 — Available coupons transform missing V3 fields
`fromAPI.availableCoupons` doesn't map `buy_quantity`, `get_quantity`, `nth_item_number`, `max_applications`, `allow_repeat`, `same_item_required` — needed for dropdown display hints.

---

## 7. API Mapping Table

### /available response — fields to ADD to `fromAPI.availableCoupons`

| CRM Field | Mapped? | POS Field (proposed) |
|-----------|---------|---------------------|
| `offer_type` | ✅ `offerType` | — |
| `buy_quantity` | ❌ | `buyQuantity` |
| `get_quantity` | ❌ | `getQuantity` |
| `get_discount_type` | ❌ | `getDiscountType` |
| `get_discount_value` | ❌ | `getDiscountValue` |
| `max_applications` | ❌ | `maxApplications` |
| `allow_repeat` | ❌ | `allowRepeat` |
| `same_item_required` | ❌ | `sameItemRequired` |
| `nth_item_number` | ❌ | `nthItemNumber` |
| `nth_discount_type` | ❌ | `nthDiscountType` |
| `nth_discount_value` | ❌ | `nthDiscountValue` |

### /validate response — fields to ADD to `fromAPI.validateCoupon`

| CRM Field | Mapped? | POS Field (proposed) |
|-----------|---------|---------------------|
| `benefit_items` | ❌ | `benefitItems` |
| `applied_applications` | ❌ | `appliedApplications` |
| `buy_match_summary` | ❌ | `buyMatchSummary` |
| `get_match_summary` | ❌ | `getMatchSummary` |
| `eligible_match_summary` | ❌ | `eligibleMatchSummary` |
| `nth_item_number` | ❌ | `nthItemNumber` |
| `nth_discount_type` | ❌ | `nthDiscountType` |
| `nth_discount_value` | ❌ | `nthDiscountValue` |
| `same_item_required` | ❌ | `sameItemRequired` |
| `max_applications` | ❌ | `maxApplications` |
| `allow_repeat` | ❌ | `allowRepeat` |

---

## 8. POSCartItem / items[] Readiness

**READY.** V2 `posCartItem` mapper already produces the correct schema. V3-B and V3-C use the same `items[]` format. No changes needed to the mapper.

The V2 `items[]` builder in `runValidate` (Change D) also works for V3 — it builds items[] when `requiresCartValidation === true`, which all V3 coupons are.

---

## 9. Dropdown / Filtering Readiness

### Current state
- Dropdown shows max 5 coupons sorted by `expectedDiscount` desc
- V3 coupons have `expectedDiscount: null` (CRM can't preview without cart) → shows as `-₹0`
- Cart filter only handles `hint.type` format, not `hint.kind` format
- V3 coupons pass the filter fallthrough (`return true`) and show even without matching items

### Required changes
1. **Cart filter** — add `hint.kind` matching for bogo/bxg/nth_item:
   - BOGO/BXG: check `hint.buy.values` AND `hint.get.values` against cart food_ids
   - Nth: check `hint.eligibility.values` against cart food_ids or category_names
2. **Dropdown display** — show offer description instead of just `-₹0`:
   - BOGO: "Buy 1 Get 1 Free" or from `title`
   - BXG: "Buy 2 Get 1 Free" or from `title`
   - Nth: "Every 3rd Free" or from `title`
3. **expectedDiscount null handling** — show `title` or offer description when discount is null, not `-₹0`

---

## 10. UI Display Requirements

### Dropdown row (for V3 coupons)
| Coupon Type | Current Display | Proposed Display |
|------------|----------------|-----------------|
| BOGO | `SEED_V3B_BOGO  -₹0` | `SEED_V3B_BOGO  Buy 1 Get 1 Free` (from title) |
| BXG | `SEED_V3B_BXGY_FREE  -₹0` | `SEED_V3B_BXGY_FREE  Buy 2 Get 1 Free` (from title) |
| Nth | `SEED_V3C_EVERY3_FREE  -₹0` | `SEED_V3C_EVERY3_FREE  Every 3rd Free` (from title) |

**Simplest approach:** When `expectedDiscount` is null/0, show `title` instead of `-₹0`.

### Applied coupon chip
| Current | Proposed |
|---------|----------|
| `✓ CODE (-₹X)` | `✓ CODE (-₹X)` + optional benefit_items list below |

### Benefit items display (NEW component)
When `selectedCoupon.benefitItems.length > 0`, show below the chip:
```
Free items:
  • 1× Cheese Kunafa (-₹299)
```
Or for percentage/flat benefit:
```
Discounted items:
  • 1× Shake (-₹75, 50% off)
```

### Bill summary
`couponDiscount` already flows from `selectedCoupon.computedDiscount`. No change needed — V3 uses the same path. The total discount shows correctly.

### Error display
Use existing `coupon-error-text` + `coupon-pos-instruction-text` slots. `pos_instruction` from CRM tells the cashier what to add (e.g., "Add 1 more pizza to qualify").

---

## 11. Error Handling Gaps

12 new error codes needed in `errorCodeToCopy`:

```js
// V3-B BOGO/BXG (7)
MISSING_ITEMS_FOR_BXGY_COUPON:   'Cart items required for this offer',
BUY_REQUIREMENT_NOT_MET:          'Not enough qualifying items to buy',
GET_REQUIREMENT_NOT_MET:          'Required free/discount item not in cart',
NO_ELIGIBLE_BUY_ITEMS_IN_CART:    'No eligible buy items in cart',
NO_ELIGIBLE_GET_ITEMS_IN_CART:    'Required item not in cart',
BXGY_CONFIG_INVALID:              'Offer configuration error',
UNSUPPORTED_BENEFIT_TYPE:         'Offer configuration error',

// V3-C Every-Nth (5)
MISSING_ITEMS_FOR_EVERY_NTH_COUPON: 'Cart items required for this offer',
NTH_REQUIREMENT_NOT_MET:            'Not enough items to qualify',
NO_ELIGIBLE_NTH_ITEMS_IN_CART:      'No eligible items in cart',
EVERY_NTH_CONFIG_INVALID:           'Offer configuration error',
UNSUPPORTED_NTH_BENEFIT_TYPE:       'Offer configuration error',
```

Also add V2 missing code: `MISSING_ITEMS_FOR_CATEGORY_COUPON` and `NO_ELIGIBLE_CATEGORY_IN_CART`.

---

## 12. Final Payload / Backend Mapper Impact

### POS Frontend payloads
- `coupon_code`, `coupon_discount`, `coupon_title` — **already in place** from V1B. No change.
- `coupon_type` — CRM handoff §3.3: **OMIT this field for V3 types** (BOGO/BXG/Nth). Per Contract Freeze §3.3: "send 'order'/'item'/'category' for V1/V2; OMIT field entirely for V3". This is a **POS Backend mapper concern**, not frontend.

### POS Backend mapper
- Must support `coupon_type` field **omission** when not provided by frontend
- Must forward `items[]` to CRM `POST /api/pos/orders` for revalidation at commit
- These are existing V2 blockers (B-3 from V2 discovery) — still unresolved

### items[] at commit
CRM revalidates at `POST /api/pos/orders`. POS BE must forward `items[]` so CRM can verify V3 coupon eligibility at commit time.

---

## 13. Recommended Phase Split

**Combined V3-B + V3-C in a single phase.** Reasons:

1. **Shared infrastructure:** Cart filter (hint.kind parsing), benefit_items UI, error codes — all shared between V3-B and V3-C
2. **Shared transform work:** Both need the same validate response field additions
3. **Small delta:** V3-C adds only `nth_item_number/type/value` and 5 error codes on top of V3-B
4. **Test coupons ready:** Both V3-B (5 coupons) and V3-C (3 coupons) are already seeded in CRM
5. **Estimated total scope:** ~60 lines across 2 files (couponTransform.js + CollectPaymentPanel.jsx)

Split only makes sense if V3-B/V3-C need separate owner QA gates, but the UI treatment is identical (benefit_items display).

---

## 14. Blockers

| # | Blocker | Severity | Resolution |
|---|---------|----------|-----------|
| **B-1** | POS Backend mapper audit for `items[]` forwarding + `coupon_type` omission | 🔴 HIGH | External — POS BE team. Blocks commit-time revalidation. Does NOT block POS FE implementation/QA. |
| **B-2** | CRM `/available` endpoint takes ~17s on staging-15 | 🟡 MEDIUM | CRM N+1 fix planned. POS has 30s timeout workaround. |

**No frontend blockers.** All V3-B/V3-C frontend work can proceed immediately.

---

## 15. Recommended Next Step

```
Proceed to V3-B + V3-C combined implementation planning.
```

Implementation scope:
1. **couponTransform.js** — Add ~11 fields to `fromAPI.availableCoupons`, ~11 fields to `fromAPI.validateCoupon` (~20 lines)
2. **CollectPaymentPanel.jsx** — Cart filter for `hint.kind` formats (~10 lines), 14 error codes (~14 lines), benefit_items display below chip (~15 lines), dropdown null-discount display fix (~3 lines)
3. **Total:** ~60 lines across 2 files

---

## 16. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code changed | ✅ |
| 2 | No frontend changed | ✅ |
| 3 | No backend changed | ✅ |
| 4 | No CRM changed | ✅ |
| 5 | No data mutated | ✅ |
| 6 | No mutating API called | ✅ (only read-only `/validate` tests) |
| 7 | `/app/memory/final/` untouched | ✅ |
| 8 | Baseline docs untouched | ✅ |

---

**End of BUG-108 Coupon V3-B/V3-C Discovery & API Mapping.**
