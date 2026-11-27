# BUG-647 — Zero Tax in Payload When GST/VAT OFF — Implementation Plan (Gate 3) — 2026-11-16

> Status: **GATE_3_PLAN_FROZEN**
> Risk: CRITICAL (money, billing, tax — R5+R6)
> IA: `change_requests/BUG-647_GST_OFF_PAYLOAD_STILL_SENDS_GST_INTAKE.md`
> Evidence: Order #021537, CAFE 103 — payload gst_tax=50.45 when GST OFF

---

## 0. Code reality at HEAD

`buildCartItem` (L654) and `calcOrderTotals` (L818) are **pure functions** — they receive item data and options but have NO access to `restaurant` context. The tax flags (`gstStatus`, `vatEnabled`) must be plumbed through the `options` parameter from each caller.

**Tax flags available at:**
- `restaurant.tax.gstStatus` (profileTransform L187) — boolean
- `restaurant.settings.vatEnabled` (restaurantSettingsTransform L125) — boolean
- In OrderEntry: `restaurant` is destructured at L66

---

## 1. Approach — add `taxFlags` to existing `options` / `extras` params

Rather than changing `buildCartItem` from a pure item→object function (which would break 6+ `.map(buildCartItem)` call sites), the cleanest approach is:

**For `buildCartItem`:** Create a wrapper that applies tax zeroing AFTER buildCartItem returns. This avoids changing the function signature.

**For `calcOrderTotals`:** Add `gstEnabled` + `vatEnabled` to the existing `extras` destructure. When false, zero the respective tax totals at the end.

**For `OrderEntry.jsx` localTax/unplacedTax:** Add a simple guard check on `gstStatus`/`vatEnabled` before accumulating tax.

**For `CartPanel.jsx` taxTotals:** Same guard.

---

## 2. Exact edits

### E1: orderTransform.js — Tax-zeroing wrapper for buildCartItem calls (~4 sites)

**After `buildCartItem` function (L803), add a helper:**

```js
// BUG-647: zero tax fields when restaurant toggle is OFF
const applyTaxFlags = (builtItem, taxFlags = {}) => {
  const { gstEnabled = true, vatEnabled = true } = taxFlags;
  const isGst = parseFloat(builtItem.gst_amount) > 0;
  const isVat = parseFloat(builtItem.vat_amount) > 0;
  if (isGst && !gstEnabled) return { ...builtItem, gst_amount: '0.00' };
  if (isVat && !vatEnabled) return { ...builtItem, vat_amount: '0.00' };
  return builtItem;
};
```

**Update call sites — wrap `.map(buildCartItem)` with `.map(i => applyTaxFlags(i, taxFlags))`:**

| # | Line | Current | New |
|---|---|---|---|
| E1a | L1061 | `.map(buildCartItem).map(({ _fullUnitPrice, ...item }) => item)` | `.map(buildCartItem).map(i => applyTaxFlags(i, options.taxFlags)).map(({ _fullUnitPrice, ...item }) => item)` |
| E1b | L1069 | `expandCompItems(unplacedItems).map(buildCartItem)` | `expandCompItems(unplacedItems).map(buildCartItem).map(i => applyTaxFlags(i, options.taxFlags))` |
| E1c | L1192 | `newItems.map(buildCartItem)` | `newItems.map(buildCartItem).map(i => applyTaxFlags(i, options.taxFlags))` |
| E1d | L1199 | `allActiveItems.map(buildCartItem)` | `allActiveItems.map(buildCartItem).map(i => applyTaxFlags(i, options.taxFlags))` |
| E1e | L1338 | `unplacedItems.map(buildCartItem)` | `unplacedItems.map(buildCartItem).map(i => applyTaxFlags(i, options.taxFlags))` |

### E2: orderTransform.js — calcOrderTotals tax zeroing

**Line L818-820, add to extras destructure:**
```js
const calcOrderTotals = (cart, serviceChargePercentage = 0, extras = {}) => {
  const {
    discountAmount = 0,
    tipAmount = 0,
    deliveryCharge = 0,
    serviceChargeTaxPct = 0,
    deliveryChargeGstPct = 0,
    roundOffEnabled = true,
    gstEnabled = true,    // BUG-647
    vatEnabled = true,    // BUG-647
  } = extras;
```

**Line L906 (after `gstTax = itemGstPostDiscount + scGstAmt + tipGstAmt + delGstAmt;`), add:**
```js
  // BUG-647: zero tax when restaurant toggle is OFF
  if (!gstEnabled) { gstTax = 0; }
  if (!vatEnabled) { vatTaxPostDiscount = 0; }
```

Note: `vatTaxPostDiscount` is a `const` at L904. Need to change it to `let` at L903:
```js
  // L903 current: const vatTaxPostDiscount = ...
  // L903 new:     let vatTaxPostDiscount = ...
```

### E3: orderTransform.js — calcOrderTotals return zeroing for SC/Tip/Delivery GST

**Line L929-934 (the return object), add conditional zeroing:**
```js
    service_tax:                 serviceCharge,
    service_gst_tax_amount:      gstEnabled ? Math.round(scGstAmt * 100) / 100 : 0,  // BUG-647
    tip_tax_amount:              gstEnabled ? Math.round(tipGstAmt * 100) / 100 : 0,  // BUG-647
    tip_amount:                  tipAmount,
    delivery_charge:             deliveryCharge,
    ...(gstEnabled && delGstAmt > 0 ? { delivery_charge_gst_amount: Math.round(delGstAmt * 100) / 100 } : {}), // BUG-647
```

### E4: orderTransform.js — All callers pass taxFlags through options/extras

**placeOrder (L1058 options destructure):** Add `taxFlags = {}` to destructure.
**placeOrder (L1069 calcOrderTotals extras):** Add `gstEnabled: taxFlags.gstEnabled, vatEnabled: taxFlags.vatEnabled`.

**updateOrder (L1178 options destructure):** Same.
**updateOrder (L1205 calcOrderTotals extras):** Same.

**placeOrderWithPayment (L1338 calcOrderTotals extras):** Add same two flags. Note: this function reads from `options` differently — check the actual destructure.

### E5: orderTransform.js — collectBillExisting food_detail tax zeroing

**Line L1617-1618 (inside the food_detail map):**
```js
// Current:
gst_amount: isRuntimeComp ? '0.00' : String((isGst ? taxAmount : 0).toFixed(2)),
vat_amount: isRuntimeComp ? '0.00' : String((!isGst ? taxAmount : 0).toFixed(2)),

// New (BUG-647):
gst_amount: isRuntimeComp ? '0.00' : String((isGst && gstEnabled ? taxAmount : 0).toFixed(2)),
vat_amount: isRuntimeComp ? '0.00' : String((!isGst && vatEnabled ? taxAmount : 0).toFixed(2)),
```

`gstEnabled`/`vatEnabled` must be available in `collectBillExisting` scope — read from the options param.

### E6: OrderEntry.jsx — localTax / unplacedTax guard

**Line L1144-1155 (localTax + unplacedTax reduce):**

Add guard at the top of each reduce callback:
```js
// L1148 (inside localTax reduce): add after the cancelled/placed/marker check:
const taxType = (item.tax?.type || 'GST').toUpperCase();
if (taxType === 'GST' && !restaurant?.tax?.gstStatus) return sum;
if (taxType === 'VAT' && !restaurant?.settings?.vatEnabled) return sum;

// L1159 (inside unplacedTax reduce): same guard
```

### E7: CartPanel.jsx — taxTotals guard

**Line L434-447 (inside taxTotals useMemo forEach):**

Add guard at start of forEach callback (after the `!tax || tax.percentage === 0` check):
```js
// After L433: if (!tax || tax.percentage === 0) return;
// Add BUG-647:
const taxType = (tax.type || 'GST').toUpperCase();
if (taxType === 'GST' && !restaurant?.tax?.gstStatus) return;
if (taxType === 'VAT' && !restaurant?.settings?.vatEnabled) return;
```

Note: CartPanel needs access to `restaurant`. Check if it already imports `useRestaurant`:

### E8: OrderEntry.jsx — Pass taxFlags to all orderToAPI calls

**Every call to `orderToAPI.placeOrder`, `orderToAPI.updateOrder`, `orderToAPI.placeOrderWithPayment`, `orderToAPI.collectBillExisting` must include:**
```js
taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.settings?.vatEnabled !== false }
```

---

## 3. Files WILL change

| # | File | Edits | Lines |
|---|---|---|---|
| 1 | `api/transforms/orderTransform.js` | E1 (wrapper + 5 call sites), E2 (extras), E3 (return), E4 (options), E5 (collectBill) | ~25 lines |
| 2 | `components/order-entry/OrderEntry.jsx` | E6 (localTax/unplacedTax guard), E8 (pass taxFlags) | ~10 lines |
| 3 | `components/order-entry/CartPanel.jsx` | E7 (taxTotals guard) | ~4 lines |

## 4. Files WILL NOT touch

| File | Reason |
|---|---|
| `CollectPaymentPanel.jsx` | Display already gated (L321). No payload change needed. |
| `profileTransform.js` | `gstStatus` already mapped |
| `restaurantSettingsTransform.js` | `vatEnabled` already mapped |

---

## 5. Verification matrix

| # | Test | Expected |
|---|---|---|
| V1 | GST OFF + VAT OFF → place dine-in order | Payload: gst_tax=0, vat_tax=0, tax_amount=0, order_amount=subtotal only, all items gst_amount="0.00", vat_amount="0.00" |
| V2 | GST ON + VAT OFF → place order with GST item + VAT item | GST item has tax, VAT item has 0 |
| V3 | GST OFF + VAT ON → same | GST item 0, VAT item has tax |
| V4 | Both ON → normal flow | No change from today |
| V5 | GST OFF → Collect Bill button total | Shows subtotal only (no tax) |
| V6 | GST OFF → CartPanel (QSR) total | Shows subtotal only |
| V7 | GST OFF → update-place-order | Same zeroing |
| V8 | GST OFF → collectBillExisting | food_detail[].gst_amount = "0.00" |

---

## 6. Risk

| # | Risk | Mitigation |
|---|---|---|
| R1 | `vatTaxPostDiscount` is const → need to change to let | Minimal change, same logic |
| R2 | CartPanel may not have `restaurant` in scope | Check if `useRestaurant` is imported — if not, add it |
| R3 | `collectBillExisting` has its own food_detail builder (not buildCartItem) | E5 handles it separately |

---

## 7. Post-code registry checklist

- [ ] registry.json: BUG-647 → GATE_5A_IMPLEMENTED
- [ ] CR_REGISTRY.md updated
- [ ] FILE_OWNERSHIP.md: 3 files
- [ ] Code markers: // BUG-647
- [ ] Compile: 0 new warnings
