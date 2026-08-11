# CR-028 Deep Verification Report — Code Trace + API Test

**Date:** 2026-06-11 · **Restaurant:** Palm House (rid=541) + Kunafa Mahal (rid=689)

---

## PART A — Code Trace Findings

### 1. `give_discount` Data Flow (BROKEN — Phase 1 target)

| Stage | File | Line | Status |
|-------|------|------|--------|
| POS Menu API | `/api/v1/vendoremployee/get-products-list` | response | ✅ **EXISTS**: `give_discount: "Yes"/"No"` per product |
| productTransform.js | `fromAPI.product()` | L54-144 | ❌ **NOT MAPPED** — field ignored |
| OrderEntry.jsx | `adaptProduct()` | L64-89 | ❌ **NOT CARRIED** — no `giveDiscount` field |
| Cart item | `addToCart()` | L561-605 | ❌ **NOT IN CART** — spread from adaptProduct |
| orderTransform.js | `buildCartItem()` | L479-621 | ❌ **NOT READ** — no discount logic |
| orderTransform.js | `food_detail[]` builder | L1291-1357 | ❌ **NOT READ** — no discount logic |

**Conclusion:** `give_discount` dies at `productTransform.js` — never enters the pipeline.

### 2. `discount_amount` Hardcoded Locations (Phase 3 targets)

| Location | File | Line | Value | Payload |
|----------|------|------|-------|---------|
| `buildFoodItem()` | orderTransform.js | **603** | `'0.00'` | Flows 1/2/3 (placeOrder, updateOrder, placeOrderWithPayment) |
| `food_detail[]` builder | orderTransform.js | **1345** | `'0.00'` | Flow 4 (collectBillExisting) |

Both hardcoded. No `discount_value` field sent at item level currently.

### 3. All Payload Builders Traced

| Flow | Method | Line | Sends cart/food_detail? | Per-item discount? |
|------|--------|------|------------------------|-------------------|
| **Flow 1** placeOrder | L864 | L868: `cart = unplacedItems.map(buildCartItem)` | ✅ via `buildCartItem()` | ❌ `discount_amount: '0.00'` |
| **Flow 2** updateOrder | L976 | L994: `cartUpdateRaw = newItems.map(buildCartItem)` | ✅ via `buildCartItem()` | ❌ `discount_amount: '0.00'` |
| **Flow 3** placeOrderWithPayment | L1093 | L1098: `cart = unplacedItems.map(buildCartItem)` | ✅ via `buildCartItem()` | ❌ `discount_amount: '0.00'` |
| **Flow 4** collectBillExisting | L1259 | L1291: `food_detail = cartItems.filter(...).map(...)` | ✅ inline builder | ❌ `discount_amount: '0.00'` |
| **Flow 5** transferToRoom | L1458 | — | ❌ No cart/items sent | N/A — order-level only |
| **Flow 6** buildBillPrintPayload | L1510 | L1840 | Uses `rawOrderDetails` + overrides | `discount_amount` at L1840 is ORDER-level (for print), not per-item |

**Key finding:** `transferToRoom` (Flow 5) does NOT send per-item data — only order-level totals. No change needed there.
**Key finding:** `buildBillPrintPayload` (Flow 6) uses backend's `rawOrderDetails` for print — once backend has real per-item discount, print will automatically reflect it.

### 4. `calcOrderTotals` GST Proration (Phase 3 target)

| File | Line | Current Logic |
|------|------|--------------|
| orderTransform.js | L696 | `discountRatio = subtotal > 0 ? discountAmount / subtotal : 0` |
| orderTransform.js | L710 | `itemGstPostDiscount = gstTax * (1 - discountRatio)` — UNIFORM |
| CartPanel.jsx | L401 | `discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0` — UNIFORM |
| CollectPaymentPanel.jsx | L579 | `discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0` — UNIFORM |

All use a single uniform `discountRatio`. CR-028 Phase 3 must make this per-item.

### 5. Coupon + Manual Mutual Exclusivity (VERIFIED)

| File | Line | Guard |
|------|------|-------|
| CollectPaymentPanel.jsx | L1318-1319 | `couponBlocked = isManualActive` |
| CollectPaymentPanel.jsx | L1306-1310 | `{BUG108_COPY.discountBlockedByCoupon}` shown when coupon active |
| BUG108_FLAGS.js | L45-46 | `couponBlockedByDiscount: 'Remove the manual discount to apply a coupon.'` / `discountBlockedByCoupon: 'Remove the coupon to apply a manual discount.'` |

✅ Confirmed: only ONE discount source per order.

---

## PART B — API Test Findings (Live Preprod Data)

### Backend Item-Level Fields (from `order_details_table`)

```
ITEM KEYS: ['add_ons', 'cancel_at', 'cancel_by', 'cancel_by_name', 'cancel_reason_text',
  'cancel_type', 'complementary', 'complementary_price', 'created_at',
  'discount_amount',      ← EXISTS (always 0.00)
  'discount_on_food',     ← EXISTS (always 0, backend-computed from order-level)
  'discount_type',        ← EXISTS (always 'amount')
  'food_details',         ← JSON blob with give_discount inside
  'food_id', 'food_level_notes', 'food_status', 'gst', 'gst_tax_amount', 'id',
  'item_campaign_id', 'item_gst', 'item_type', 'item_update_count', 'item_vat',
  'order_id', 'paid_status', 'price', 'priority', 'quantity', 'ready_at', 'ready_by',
  'reason', 'reason_type', 'serve_at', 'serve_by', 'service_charge', 'station',
  'table_id_seq', 'tax_amount', 'total_add_on_price', 'total_variation_price',
  'unit_price', 'updated_at', 'variant', 'variation', 'vat_tax_amount', 'web_coupon_type']
```

**`discount_value` does NOT exist yet at item level** in the backend response. Only `discount_amount`, `discount_on_food`, `discount_type` exist. Backend must add `discount_value` column, or POS must send it and backend must store it.

### Backend Order-Level Fields (key discount fields)

```
ORDER KEYS include: discount_value, order_discount, order_discount_type,
  comunity_discount, discount_member_category, restaurant_discount_amount,
  coupon_discount_amount, coupon_code, coupon_discount_type, discount_for,
  discount_on_product_by
```

### Live Order Samples

**PRESET (Thrive 20%) — Order #016033:**
```
ORDER LEVEL:
  order_amount=544 | sub_total=640
  discount_value=128.00     ← ₹ resolved (20% of 640)
  order_discount=0.00       ← no manual
  order_discount_type=Percent
  comunity_discount=128.00  ← preset ₹
  discount_member_category=Thrive
  restaurant_discount_amount=0

ITEM LEVEL (6 items):
  [cream]        discount_amount=0.00 | discount_on_food=0 | discount_type=amount | give_discount=Yes
  [1 boiled egg] discount_amount=0.00 | discount_on_food=0 | discount_type=amount | give_discount=Yes
```

**MANUAL 20% — Order #016021:**
```
ORDER LEVEL:
  order_amount=101 | sub_total=120
  discount_value=20.00       ← RAW INPUT (20 for 20%)
  order_discount=24.00       ← ₹ resolved (20% of 120)
  order_discount_type=Percent
  comunity_discount=0.00
  restaurant_discount_amount=24

ITEM LEVEL:
  [Organic Espresso] discount_amount=0.00 | discount_on_food=0 | discount_type=amount | give_discount=Yes
```

**NO DISCOUNT — Order #016032:**
```
ORDER LEVEL:
  discount_value=0.00 | order_discount=0.00 | restaurant_discount_amount=0

ITEM LEVEL:
  [extra gravy]      discount_amount=0.00 | discount_on_food=0 | give_discount=Yes
  [Extra Sweet Potato] discount_amount=0.00 | discount_on_food=0 | give_discount=Yes
```

### ⚠️ DISCREPANCY FOUND: `discount_value` at order level

For **manual** order: `discount_value=20.00` (raw %) and `order_discount=24.00` (₹ resolved).
For **preset** order: `discount_value=128.00` (₹ resolved) and `comunity_discount=128.00` (₹ resolved).

Current FE code sends: `discount_value: discounts.total || 0` = ₹ resolved for BOTH.
But backend stores `20.00` for manual % — **backend may be overwriting** `discount_value` with the raw input.

**This means:** For manual % discount, backend already derives `discount_value` = raw input (20 for 20%). FE sends ₹ resolved, but backend may transform it. **Need to verify with owner whether FE should send raw or ₹ resolved, since backend might already handle the conversion.**

### `give_discount` in Menu API vs `food_details`

| Source | `give_discount` present? | Values seen |
|--------|-------------------------|-------------|
| GET `/get-products-list` | ✅ Yes | `"Yes"` / `"No"` |
| `order_details_table[].food_details` (in reports) | ✅ Yes | `"Yes"` (all items) |
| Palm House products | 464/464 = `"Yes"` | No `"No"` items to test |
| Kunafa Mahal products | 99/99 = `"Yes"` | No `"No"` items to test |

**⚠️ Cannot test `give_discount='No'` exclusion** — neither restaurant has non-discountable items currently. Must create one via Menu Management to test Phase 2.

### Coupon Orders

**Zero coupon orders found** in Palm House Apr-Jun sample (531 discounted orders, all manual/preset). Coupon testing deferred to Kunafa Mahal with customer Abhishek Jain.

---

## PART C — Impact on Implementation Plan

### No Changes to Phase Plan

All findings confirm the original plan. No surprises.

### New Findings to Incorporate

| # | Finding | Action |
|---|---------|--------|
| F-1 | `discount_value` does NOT exist at item level in backend response | **Backend must add column**, or we confirm POS sends it and backend stores it |
| F-2 | `food_details` is a JSON string blob in reports response, not a nested object | FE already handles this (`JSON.parse`) — no action |
| F-3 | `transferToRoom` (Flow 5) sends no per-item data | No change needed |
| F-4 | `buildBillPrintPayload` (Flow 6) uses `rawOrderDetails` — auto-inherits once backend stores real values | No change needed |
| F-5 | Backend may overwrite `discount_value` with raw input (manual order: FE sends ₹24, backend stores 20) | **Clarify with owner** — does FE send raw or ₹, and does backend transform? |
| F-6 | No `give_discount='No'` items in either restaurant | Must create test item before Phase 2 testing |
| F-7 | 0 coupon orders in Palm House | Coupon test on Kunafa Mahal only |

### Files Needing Changes (Exhaustive List)

| Phase | File | Changes |
|-------|------|---------|
| 1 | `productTransform.js` | Add `giveDiscount: toBoolean(api.give_discount)` in `fromAPI.product()` |
| 1 | `OrderEntry.jsx` L64-89 | Add `giveDiscount: product.giveDiscount` in `adaptProduct()` |
| 1 | `orderTransform.js` L111-157 | Add `giveDiscount` in `fromAPI.orderItem()` (for rehydrated cart items) |
| 2 | `CartPanel.jsx` L384-388 | Replace `itemTotal` with `discountableTotal` for % discount math |
| 2 | `CollectPaymentPanel.jsx` L521-527 | Replace `itemTotal` with `discountableTotal` for % discount math |
| 3 | `orderTransform.js` L603 | Replace `'0.00'` with computed `discount_value` + `discount_amount` in `buildCartItem()` |
| 3 | `orderTransform.js` L1345 | Replace `'0.00'` with computed `discount_value` + `discount_amount` in `food_detail[]` |
| 3 | `orderTransform.js` L696-710 | Per-item GST proration using `discount_amount` as tax base |
| 3 | `CartPanel.jsx` L401-409 | Per-item GST proration |
| 3 | `CollectPaymentPanel.jsx` L579-583 | Per-item GST proration |
| 3B | `CollectPaymentPanel.jsx` L860-906 | Coupon item/category guard for `give_discount='No'` |

### Questions for Owner Before Code

| # | Question | Why |
|---|----------|-----|
| Q-F1 | Does backend already have a `discount_value` column at item level (order_details table), or does it need to be added? Report API shows `discount_amount`, `discount_on_food`, `discount_type` but NO `discount_value`. | Phase 3 depends on this |
| Q-F5 | For manual 20% discount: FE sends `discount_value: discounts.total = ₹24` but backend stores `discount_value: 20`. Does backend transform this? Or should FE send 20 (raw input)? | Payload contract for `discount_value` at order level |
