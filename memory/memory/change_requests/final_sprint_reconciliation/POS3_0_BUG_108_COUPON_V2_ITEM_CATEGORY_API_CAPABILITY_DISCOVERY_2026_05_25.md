# POS 3.0 BUG-108 — Coupon V2 Item/Category API + Capability Discovery

**Date:** 2026-05-25
**Persona:** Senior POS3.0 BUG-108 Coupon V2 Item/Category API + Capability Discovery Agent
**Mode:** Read-only discovery. No code changes, no API calls (except read-only CRM checks), no data mutation.
**Previous status:** `bug_108_coupon_v1b_qa_passed_waiting_v2_item_category_discovery`

---

## 1. Status

```
bug_108_coupon_v2_blocked_missing_item_data
```

V2 implementation is **partially ready** but blocked by a **category data gap on Flow 4 (postpaid) items** and the **POSCartItem mapper stub**. Flow 3 (prepaid) has all required data. CRM API is fully ready.

---

## 2. Inputs Read

### Baseline docs
| # | Document | Read? |
|---|----------|-------|
| 1 | ARCHITECTURE_DECISIONS_FINAL.md | ✅ |
| 2 | CHANGE_REQUEST_PLAYBOOK.md | ✅ |
| 3 | FINAL_DOCS_APPROVAL_STATUS.md | ✅ |
| 4 | FINAL_DOCS_SUMMARY.md | ✅ |
| 5 | IMPLEMENTATION_AGENT_RULES.md | ✅ |
| 6 | MODULE_DECISIONS_FINAL.md | ✅ |

### Coupon docs
| # | Document | Read? |
|---|----------|-------|
| 1 | CRM Contract Freeze V1 | ✅ |
| 2 | CR_001C_C_COUPON_POS_API_HANDOFF_SUMMARY.md | ✅ (§1-§8, §12, §14-§15) |
| 3 | V1 Implementation Plan | ✅ |
| 4 | V1B UI Mapping Plan | ✅ |
| 5 | V1B Implementation Status Verification | ✅ |
| 6 | PRD.md | ✅ |

### Code files inspected
| # | File | Inspected? |
|---|------|-----------|
| 1 | `src/api/constants.js` | ✅ |
| 2 | `src/api/services/couponService.js` | ✅ |
| 3 | `src/api/transforms/couponTransform.js` | ✅ |
| 4 | `src/components/order-entry/CollectPaymentPanel.jsx` | ✅ |
| 5 | `src/api/transforms/orderTransform.js` | ✅ (buildCartItem L468-604, fromAPI.orderItem L111-152, collectBillExisting, placeOrderWithPayment) |
| 6 | `src/components/order-entry/OrderEntry.jsx` | ✅ (adaptProduct L60-81, cartItems state) |
| 7 | `src/api/transforms/categoryTransform.js` | ✅ |
| 8 | `src/api/transforms/productTransform.js` | ✅ (categoryId mapping) |
| 9 | `src/contexts/MenuContext.jsx` | ✅ (getCategoryById) |

---

## 3. CRM V2 API Support Verdict

**FULLY READY.** CRM backend V2 is implemented and QA'd (45/45 pass).

| Capability | CRM Status | Evidence |
|------------|-----------|----------|
| `/available` returns item/category coupons | ✅ Live | KUNAFA20 returns with `discount_scope: "item"`, `requires_cart_validation: true`, `eligible_match_hint: { type: "food_ids", values: [...] }` |
| `/validate` accepts `items[]` for item/category coupons | ✅ Live | CRM handoff §6: `items` field is conditional-required when `requires_cart_validation=true` |
| POSCartItem schema documented | ✅ | CRM handoff §8: `{ food_id, item_id, name, quantity, unit_price, line_total, category_name }` |
| `eligible_match_hint` for items | ✅ | `{ type: "food_ids", values: ["182048", "182036", "182035"] }` |
| `eligible_match_hint` for categories | ✅ | `{ type: "category_names", values: ["beverages", "desserts"] }` |
| V2 error codes | ✅ | `MISSING_ITEMS_FOR_ITEM_COUPON`, `NO_ELIGIBLE_ITEMS_IN_CART`, `MIN_ITEM_QTY_NOT_MET` |
| `matched_food_ids` / `matched_category_names` in validate response | ✅ | Returned on success for V2 coupons |

**Same `/available` + `/validate` endpoints.** V2 does NOT require new endpoints — only sending `items[]` in the `/validate` request body.

---

## 4. Current POS V1B Reuse Verdict

**HIGH REUSE.** V1B provides the full UI framework; V2 needs only:

| V1B Component | Reusable for V2? | Notes |
|---------------|------------------|-------|
| `couponService.getAvailableCoupons` | ✅ Yes | Same endpoint, same call |
| `couponService.validateCoupon` | ✅ Yes | Same endpoint — just needs `items[]` in body |
| `couponTransform.fromAPI.availableCoupons` | ✅ Yes | Already maps `requires_cart_validation`, `eligible_match_hint` |
| `couponTransform.fromAPI.validateCoupon` | ✅ Yes | Already maps `matched_food_ids`, `matched_category_names` |
| `couponTransform.toAPI.validateRequest` | ⚠️ Needs edit | Currently sends `items: null` — V2 must send real `items[]` |
| `couponTransform.toAPI.posCartItem` | ❌ Stub | Returns `null` — V2 must implement |
| `couponTransform.toAPI.channel` | ✅ Yes | Unchanged |
| CollectPaymentPanel dropdown UI | ✅ Yes | Shows all coupons already |
| CollectPaymentPanel error handling | ✅ Yes | `errorCodeToCopy` needs 3 new V2 error codes added |
| CollectPaymentPanel auto-apply debounce | ⚠️ Needs guard | Must skip auto-apply for `requires_cart_validation: true` coupons (need items[] first) |
| `orderTransform.js` Flow 3/4 coupon fields | ✅ Yes | `coupon_code`, `coupon_discount`, etc. already in place |

---

## 5. POSCartItem Mapper Status

**STUBBED.** `couponTransform.toAPI.posCartItem(_cartLine)` returns `null` (L153).

CRM expects this schema per handoff §8:

```js
{
  food_id:       string,    // POS catalog food ID
  item_id:       string,    // POS order line item ID (or same as food_id for fresh cart)
  name:          string,    // Item display name
  quantity:      number,    // Line quantity
  unit_price:    number,    // Per-unit price (pre-tax, pre-addon)
  line_total:    number,    // unit_price × quantity (CRM uses for eligible_subtotal)
  category_name: string,    // Category name (for category-scope matching — case-insensitive on CRM)
}
```

---

## 6. Flow 3 Item Data Audit (Prepaid — fresh cart items)

**READY with one gap.**

Flow 3 (`placeOrderWithPayment`) uses `cartItems` from `OrderEntry` state. These are fresh items created via `adaptProduct()`:

| CRM POSCartItem Field | POS Cart Item Field | Available? | Source |
|-----------------------|--------------------|-----------|--------|
| `food_id` | `item.foodId \|\| item.id` | ✅ Yes | `adaptProduct.id = product.productId` |
| `item_id` | `item.id` | ✅ Yes | Same as food_id for fresh items (no order line ID yet) |
| `name` | `item.name` | ✅ Yes | `adaptProduct.name = product.productName` |
| `quantity` | `item.qty` | ✅ Yes | Cart state |
| `unit_price` | `item.price` | ✅ Yes | `adaptProduct.price = product.basePrice` |
| `line_total` | `item.price * item.qty` | ✅ Computable | Simple multiplication |
| `category_name` | ❓ | ⚠️ **Indirect** | `item.categoryId` exists (numeric). Must resolve via `MenuContext.getCategoryById(categoryId).categoryName`. **Not a string on the item itself.** |

**Verdict:** Flow 3 is **READY** — `categoryId` is on the cart item, and `categoryName` can be resolved via the already-loaded MenuContext category list. The POSCartItem mapper just needs to accept a `getCategoryById` resolver function.

---

## 7. Flow 4 Item Data Audit (Postpaid — hydrated order items)

**PARTIAL — category data gap.**

Flow 4 (`collectBillExisting`) uses items hydrated from `api.orderDetails[].food_details` via `fromAPI.orderItem()`:

| CRM POSCartItem Field | Hydrated Item Field | Available? | Source |
|-----------------------|--------------------|-----------|--------|
| `food_id` | `item.foodId` | ✅ Yes | `food_details.id` |
| `item_id` | `item.id` | ✅ Yes | `detail.id` (order line ID) |
| `name` | `item.name` | ✅ Yes | `food_details.name` |
| `quantity` | `item.qty` | ✅ Yes | `detail.quantity` |
| `unit_price` | `item.unitPrice \|\| item.price` | ✅ Yes | `detail.unit_price` |
| `line_total` | Computable | ✅ Yes | `unitPrice * qty` |
| `category_name` | ❌ | ❌ **MISSING** | `fromAPI.orderItem` does NOT extract `food_details.category_id` or category name. Neither `detail` nor `food_details` carries a category name field in the hydrated shape. |

**Root cause:** `fromAPI.orderItem()` (L111-152) maps `food_details.id`, `food_details.name`, `food_details.tax`, etc. but does NOT extract `food_details.category_id` or any category field. The backend order-detail response likely carries `food_details.category_id` (since it includes full `food_details`), but it's never mapped to the frontend cart item shape.

**Resolution options:**
- **Option A (preferred):** Add `categoryId: foodDetails.category_id || null` to `fromAPI.orderItem()`. Then resolve `categoryName` via `getCategoryById()` — categories are already loaded in MenuContext.
- **Option B:** Check if `food_details` also carries `category_name` or `category.name` from backend. If so, map directly.
- **Option C:** For category-scope coupons only, skip the category field on Flow 4 items and send `food_id`-only matching. CRM can still match by `food_id` even for category coupons. **Not recommended** — breaks category-scope matching contract.

---

## 8. Category Data Audit

**PARTIALLY READY.**

| Source | `categoryId` | `categoryName` |
|--------|-------------|---------------|
| Fresh cart items (adaptProduct) | ✅ numeric `categoryId` from `product.categoryId` | ❌ Not on item — must resolve via `getCategoryById(categoryId).categoryName` |
| Hydrated items (fromAPI.orderItem) | ❌ **NOT MAPPED** from `food_details` | ❌ Not available |
| MenuContext categories | ✅ `{ categoryId, categoryName }` | ✅ Name available via lookup |
| CRM expectation | N/A | `category_name` string (case-insensitive match on CRM) |

**CRM matching rules (handoff §8):**
- Category matching is **casefold-tolerant** (CRM lowercases both sides)
- `food_id` matching is **case-sensitive, exact**
- POS must send the **base food's `food_id`**, never a variant-suffixed ID

**Key question for V2:** Does the backend `food_details` response include `category_id`? If yes, `fromAPI.orderItem` can map it and the lookup resolves the name. This needs a one-time API response inspection.

---

## 9. Final Payload / Backend Mapper Audit Need

**YES — audit still needed for V2.**

| Audit Item | Status | Notes |
|-----------|--------|-------|
| POS BE forwards `coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type` to CRM `/api/pos/orders` | ⚠️ Unverified (was V1 gate PT-1/PT-2) | V1B QA tested UI flow but CRM `coupon_usage.recorded` wasn't verified end-to-end |
| POS BE forwards `items[]` (OrderItem schema) to CRM `/api/pos/orders` | ❌ **Unverified — V2 HARD BLOCKER** | POS Backend mapper must convert POS `cart[]`/`food_detail[]` → CRM `OrderItem` schema. This was explicitly called out as V2 prerequisite in Contract Freeze §7.2 |
| POS BE supports `coupon_type` field omission for V3 | ⚠️ Future V3 concern | Not blocking V2 |

---

## 10. Test Data Need

**PARTIAL — need category-scope test coupon.**

| Coupon | Type | Scope | Status |
|--------|------|-------|--------|
| FLAT100TEST | order | order | ✅ Exists (V1 test) |
| KUNAFA20 | item | item | ✅ Exists (targets food_ids: 182048, 182036, 182035) |
| (category-scope test) | category | category | ❌ **NEEDED** — must create in CRM for V2 QA |

---

## 11. Blockers

| # | Blocker | Severity | Resolution |
|---|---------|----------|-----------|
| **B-1** | **POSCartItem mapper is stubbed** — `posCartItem()` returns `null`. V2 coupons with `requires_cart_validation: true` will get `MISSING_ITEMS_FOR_ITEM_COUPON` error without items[]. | **HIGH** | Implement `posCartItem(cartLine, getCategoryById)` in `couponTransform.js` |
| **B-2** | **Flow 4 hydrated items missing `categoryId`** — `fromAPI.orderItem()` does not extract `food_details.category_id`. Category-scope coupons on postpaid orders cannot resolve category_name. | **HIGH** | Add `categoryId` mapping to `fromAPI.orderItem()`. Verify `food_details.category_id` exists in backend response. |
| **B-3** | **POS Backend mapper audit for `items[]` forwarding** — CRM `/api/pos/orders` expects `items[]` in OrderItem schema. POS BE must convert frontend `cart[]`/`food_detail[]` to CRM shape. Unverified. | **HIGH** | POS BE team must audit and confirm. |
| **B-4** | **No category-scope test coupon** — KUNAFA20 is item-scope only. Need a category-scope coupon to test category matching. | **MEDIUM** | Create one in CRM admin for restaurant 689. |
| **B-5** | **Auto-apply debounce needs guard** — current 500ms debounce auto-applies without sending items[]. For V2 coupons, this will fail because `items: null` triggers `MISSING_ITEMS_FOR_ITEM_COUPON`. | **MEDIUM** | Guard auto-apply: skip coupons where `requires_cart_validation: true`, or build items[] before calling validate. |

**Total blockers: 5 (3 HIGH, 2 MEDIUM)**

---

## 12. Recommended Next Step

```
1. Verify food_details.category_id exists in backend order-detail response (one curl call)
2. Create a category-scope test coupon in CRM (B-4)
3. Get POS BE team commitment on items[] forwarding audit (B-3)
4. Then proceed to V2 UI planning with full data availability map
```

V2 implementation is **close** — the CRM API is ready, the UI framework from V1B is reusable, and most item data is available. The primary engineering work is:
- Implement `posCartItem` mapper (~20 lines)
- Add `categoryId` to `fromAPI.orderItem` (~1 line)
- Add `items[]` to `validateRequest` when `requires_cart_validation` is true (~5 lines)
- Add 3 V2 error codes to `errorCodeToCopy` (~3 lines)
- Guard auto-apply for cart-dependent coupons (~3 lines)

Estimated V2 frontend scope: **~35 lines of code changes** across 3 files.

---

## 13. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code changed | ✅ |
| 2 | No frontend changed | ✅ |
| 3 | No backend changed | ✅ |
| 4 | No CRM changed | ✅ |
| 5 | No data mutated | ✅ |
| 6 | No mutating API called | ✅ (only read-only `/available` CRM check) |
| 7 | `/app/memory/final/` untouched | ✅ |
| 8 | Baseline docs untouched | ✅ |

---

## Appendix A — POSCartItem Field Availability Matrix

| Field | Fresh Cart (Flow 3) | Hydrated Item (Flow 4) | Resolution |
|-------|--------------------|-----------------------|-----------|
| `food_id` | ✅ `item.foodId \|\| item.id` | ✅ `item.foodId` | Direct |
| `item_id` | ✅ `item.id` (= food_id for fresh) | ✅ `item.id` (order line ID) | Direct |
| `name` | ✅ `item.name` | ✅ `item.name` | Direct |
| `quantity` | ✅ `item.qty` | ✅ `item.qty` | Direct |
| `unit_price` | ✅ `item.price` | ✅ `item.unitPrice \|\| item.price` | Direct |
| `line_total` | ✅ Computable | ✅ Computable | `price × qty` |
| `category_name` | ⚠️ `item.categoryId` → lookup | ❌ **MISSING** — need `categoryId` in orderItem | Blocker B-2 |

---

**End of BUG-108 Coupon V2 Item/Category API + Capability Discovery.**
