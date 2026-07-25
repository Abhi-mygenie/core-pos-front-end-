# POS2.0 Wave 2 — Financial Core — Code Diff Preview — 2026-05-17

## 1. Purpose

This is the **exact code-change preview** before source files are modified. Owner approval is required before any of these changes are applied.

## 2. Approved Bugs For Diff Preview

All 6 Wave 2 bugs approved by owner (Option A):
BUG-051, BUG-054, BUG-055, BUG-075, BUG-083, BUG-052

---

## 3. Per-Bug Diff Preview

---

### BUG-051 — Round-off always-ceil

#### File: `frontend/src/api/transforms/orderTransform.js`
#### Lines: 585-595, 649-680

**Current Code (L585-595) — `calcOrderTotals` signature:**
```js
const calcOrderTotals = (cart, serviceChargePercentage = 0, extras = {}) => {
  const {
    discountAmount = 0,
    tipAmount = 0,
    deliveryCharge = 0,
    // CR-013: component-specific GST rate sources (pcts as 0..100). Defaults to
    // 0 — backward-compatible (callers pre-CR-013 still produce a valid payload,
    // just with 0 GST on SC/tip/delivery, which matches the force-0 fallback).
    serviceChargeTaxPct = 0,
    deliveryChargeGstPct = 0,
  } = extras;
```

**No change to L585-595** — signature unchanged for BUG-051.

**Current Code (L649-680):**
```js
  const itemGstPostDiscount = gstTax * (1 - discountRatio);

  gstTax = itemGstPostDiscount + scGstAmt + tipGstAmt + delGstAmt;

  const totalTax = Math.round((gstTax + vatTax) * 100) / 100;

  // BUG-009: Rounding based on fractional part (old POS parity).
  // If fractional > 0.10 → ceil; if fractional <= 0.10 → floor.
  const rawTotal = postDiscount + serviceCharge + tipAmount + deliveryCharge + totalTax;
  const fractional = Math.round((rawTotal - Math.floor(rawTotal)) * 100) / 100;
  const orderAmount = rawTotal > 0
    ? (fractional > 0.10 ? Math.ceil(rawTotal) : Math.floor(rawTotal))
    : 0;
  const roundUp = Math.round((orderAmount - rawTotal) * 100) / 100;
  const roundUpAbs = roundUp > 0 ? roundUp : 0;

  return {
    order_sub_total_amount:      subtotal,
    order_sub_total_without_tax: subtotalWithoutTax,
    tax_amount:                  totalTax,
    gst_tax:                     Math.round(gstTax * 100) / 100,
    vat_tax:                     Math.round(vatTax * 100) / 100,
    order_amount:                orderAmount,
    round_up:                    String(roundUpAbs.toFixed(2)),
    service_tax:                 serviceCharge,
    // CR-013 Phase 1.5 D-GST-3 ...
    service_gst_tax_amount:      Math.round(scGstAmt  * 100) / 100,
    tip_tax_amount:              Math.round(tipGstAmt * 100) / 100,
  };
};
```

**New Code (L649-680) — BUG-051 + BUG-054 + BUG-083 combined:**
```js
  const itemGstPostDiscount = gstTax * (1 - discountRatio);

  // BUG-054: VAT proration mirrors GST (frozen TAX-003).
  const vatTaxPostDiscount = vatTax * (1 - discountRatio);

  gstTax = itemGstPostDiscount + scGstAmt + tipGstAmt + delGstAmt;

  const totalTax = Math.round((gstTax + vatTaxPostDiscount) * 100) / 100;

  // BUG-051 / ROUND-001: always-ceil round-off, replacing BUG-009 fractional
  // rule. Pending-freeze rule until promoted into BUSINESS_RULES_BASELINE_FINAL.md.
  // ROUND-002: round-off applies ONLY to Grand Total; component values keep
  // 2-decimal precision. Owner directive 2026-05-05.
  const rawTotal = postDiscount + serviceCharge + tipAmount + deliveryCharge + totalTax;
  const orderAmount = rawTotal > 0 ? Math.ceil(rawTotal) : 0;
  const roundUp = Math.round((orderAmount - rawTotal) * 100) / 100;
  const roundUpAbs = roundUp > 0 ? roundUp : 0;

  return {
    order_sub_total_amount:      subtotal,
    order_sub_total_without_tax: subtotalWithoutTax,
    tax_amount:                  totalTax,
    gst_tax:                     Math.round(gstTax * 100) / 100,
    vat_tax:                     Math.round(vatTaxPostDiscount * 100) / 100,   // BUG-054: prorated
    order_amount:                orderAmount,
    round_up:                    String(roundUpAbs.toFixed(2)),
    service_tax:                 serviceCharge,
    service_gst_tax_amount:      Math.round(scGstAmt  * 100) / 100,
    tip_tax_amount:              Math.round(tipGstAmt * 100) / 100,
    // BUG-083: Separate delivery GST key. Absent for non-delivery (delGstAmt = 0
    // when deliveryCharge = 0). Composite gst_tax retains delivery GST per DEL-001.
    ...(delGstAmt > 0 ? { delivery_charge_gst_amount: Math.round(delGstAmt * 100) / 100 } : {}),
  };
};
```

---

#### File: `frontend/src/components/order-entry/CollectPaymentPanel.jsx`
#### Lines: 573-585

**Current Code:**
```jsx
  // Item-level VAT bucket (CR-VAT-COLLECT, 2026-05): folds in alongside sgst+cgst.
  // SC / Tip / Delivery tax math intentionally untouched per owner decision.
  const vat = taxTotals.vat;

  const rawFinalTotal = Math.round((subtotal + sgst + cgst + vat) * 100) / 100;

  // BUG-009: Round-off based on fractional part (old POS parity).
  // If fractional > 0.10 → ceil; if fractional <= 0.10 → floor.
  const fractional = Math.round((rawFinalTotal - Math.floor(rawFinalTotal)) * 100) / 100;
  const finalTotal = rawFinalTotal > 0
    ? (fractional > 0.10 ? Math.ceil(rawFinalTotal) : Math.floor(rawFinalTotal))
    : 0;
  const roundOff = Math.round((finalTotal - rawFinalTotal) * 100) / 100;
```

**New Code (BUG-051 + BUG-054 combined):**
```jsx
  // BUG-054: VAT proration mirrors GST (frozen TAX-003).
  // SC / Tip / Delivery tax math intentionally untouched per owner decision.
  const vat = taxTotals.vat * (1 - discountRatio);

  const rawFinalTotal = Math.round((subtotal + sgst + cgst + vat) * 100) / 100;

  // BUG-051 / ROUND-001: always-ceil round-off, replacing BUG-009 fractional
  // rule. Pending-freeze rule. ROUND-002: Grand Total only.
  const finalTotal = rawFinalTotal > 0 ? Math.ceil(rawFinalTotal) : 0;
  const roundOff = Math.round((finalTotal - rawFinalTotal) * 100) / 100;
```

---

### BUG-055 — Prepaid `order_discount_type` payload parity

#### File: `frontend/src/api/transforms/orderTransform.js`

**Change 1 — `placeOrderWithPayment` (L1085):**

Current:
```js
      order_discount:             discounts.orderDiscountPercent || 0,
      // Loyalty & Wallet
```

New:
```js
      order_discount:             discounts.orderDiscountPercent || 0,
      // BUG-055: payload parity with collectBillExisting (L1273).
      order_discount_type:        discounts.orderDiscountType || '',
      // Loyalty & Wallet
```

**Change 2 — `updateOrder` (L964):**

Current:
```js
      order_discount:             0,
      // Loyalty & Wallet
```

New:
```js
      order_discount:             0,
      // BUG-055: payload parity — always emit key even on update (value is 0 on
      // update path since update-order does not carry discount yet).
      order_discount_type:        '',
      // Loyalty & Wallet
```

---

### BUG-075 — Tip orderType gate

#### File: `frontend/src/components/order-entry/CollectPaymentPanel.jsx`

**Change 1 — L269 (add tipApplicable):**

Current:
```jsx
  // BUG-281: Tip input — flat ₹, gated by restaurant.features.tip profile flag
  const tipEnabled = !!restaurant?.features?.tip;
  const [tipInput, setTipInput] = useState('');
```

New:
```jsx
  // BUG-281: Tip input — flat ₹, gated by restaurant.features.tip profile flag
  const tipEnabled = !!restaurant?.features?.tip;
  // BUG-075 / TIP-003: Tip applies only to dine-in, walk-in, room — mirrors
  // BUG-013 SC pattern. Takeaway/delivery tip = 0 and input hidden.
  const tipApplicable = tipEnabled && (orderType === 'dineIn' || orderType === 'walkIn' || isRoom);
  const [tipInput, setTipInput] = useState('');
```

**Change 2 — L507 (tip value gate):**

Current:
```jsx
  // BUG-281: Tip (flat ₹) — only contributes when feature flag enabled
  const tip = tipEnabled ? (parseFloat(tipInput) || 0) : 0;
```

New:
```jsx
  // BUG-281 + BUG-075: Tip only for applicable order types
  const tip = tipApplicable ? (parseFloat(tipInput) || 0) : 0;
```

**Change 3 — L1029 (tip input render gate):**

Current:
```jsx
        {tipEnabled && (
```

New:
```jsx
        {tipApplicable && (
```

**Change 4 — L1462 (bill summary compact tip row):**

Current:
```jsx
                    {tipEnabled && tip > 0 && (
```

New:
```jsx
                    {tipApplicable && tip > 0 && (
```

**Change 5 — L1681 (bill summary tip display row):**

Current:
```jsx
          {tipEnabled && tip > 0 && (
```

New:
```jsx
          {tipApplicable && tip > 0 && (
```

---

### BUG-083 — Delivery GST key

#### Changes in `calcOrderTotals` return already shown above (combined with BUG-051/054).

#### File: `frontend/src/api/transforms/orderTransform.js` — `collectBillExisting`

**Change — Add delivery GST key (after L1265):**

Current (L1262-1266):
```js
      tip_tax_amount:               Math.round((tipTaxAmount || 0) * 100) / 100,
      delivery_charge:              deliveryCharge || 0,
      // Discounts (BUG-252: field names aligned with OLD POS)
```

New:
```js
      tip_tax_amount:               Math.round((tipTaxAmount || 0) * 100) / 100,
      delivery_charge:              deliveryCharge || 0,
      // BUG-083: separate delivery GST key. Absent for non-delivery per Q-083-6.
      // Composite gst_tax retains delivery GST per DEL-001. deliveryGstAmount is
      // passed through from CollectPaymentPanel (deliveryGst variable).
      ...(paymentData.deliveryGstAmount > 0 ? { delivery_charge_gst_amount: Math.round(paymentData.deliveryGstAmount * 100) / 100 } : {}),
      // Discounts (BUG-252: field names aligned with OLD POS)
```

#### File: `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — `handlePayment`

**Change — Pass deliveryGstAmount through paymentData (after L723):**

Current (L722-724):
```jsx
      serviceGstTaxAmount: Math.round(scGst  * 100) / 100,
      tipTaxAmount:        Math.round(tipGst * 100) / 100,
    };
```

New:
```jsx
      serviceGstTaxAmount: Math.round(scGst  * 100) / 100,
      tipTaxAmount:        Math.round(tipGst * 100) / 100,
      // BUG-083: pass delivery GST amount for collectBillExisting payload.
      deliveryGstAmount:   Math.round(deliveryGst * 100) / 100,
    };
```

#### File: `frontend/src/api/transforms/orderTransform.js` — `buildBillPrintPayload`

**Change — Add delivery GST key to print payload (after L1694):**

Current (L1693-1696):
```js
      vat_tax: finalVatTax,
      delivery_charge: overrides.deliveryCharge !== undefined ? overrides.deliveryCharge : (order.deliveryCharge || 0),
    };
  },
```

New:
```js
      vat_tax: finalVatTax,
      delivery_charge: overrides.deliveryCharge !== undefined ? overrides.deliveryCharge : (order.deliveryCharge || 0),
      // BUG-083: delivery GST for print template. Absent for non-delivery.
      ...(overrides.deliveryGstAmount > 0 ? { delivery_charge_gst_amount: Math.round(overrides.deliveryGstAmount * 100) / 100 } : {}),
    };
  },
```

---

### BUG-052 — Profile boolean gate for round-off

#### File: `frontend/src/api/transforms/profileTransform.js`

**Change — Add `totalRound` to restaurant builder (after L157):**

Current (L157-158):
```js
      deliveryChargeGstPct: parseTaxPct(api.deliver_charge_gst ?? api.settings?.deliver_charge_gst),

      // Tax settings
```

New:
```js
      deliveryChargeGstPct: parseTaxPct(api.deliver_charge_gst ?? api.settings?.deliver_charge_gst),

      // BUG-052: Profile-driven round-off boolean. "Yes" → ceiling round-off
      // applied; "No"/missing → no round-off (raw total used). Owner-confirmed
      // API key: `total_round`. Backend already sends this field.
      totalRound: toBoolean(api.total_round),

      // Tax settings
```

#### File: `frontend/src/api/transforms/orderTransform.js` — `calcOrderTotals`

**Change — Accept `roundOffEnabled` in extras and gate Math.ceil:**

Current signature extras (L586-595):
```js
const calcOrderTotals = (cart, serviceChargePercentage = 0, extras = {}) => {
  const {
    discountAmount = 0,
    tipAmount = 0,
    deliveryCharge = 0,
    serviceChargeTaxPct = 0,
    deliveryChargeGstPct = 0,
  } = extras;
```

New:
```js
const calcOrderTotals = (cart, serviceChargePercentage = 0, extras = {}) => {
  const {
    discountAmount = 0,
    tipAmount = 0,
    deliveryCharge = 0,
    serviceChargeTaxPct = 0,
    deliveryChargeGstPct = 0,
    // BUG-052: profile-driven round-off gate. true = apply ceiling, false = no round-off.
    // Defaults to true for backward compatibility (callers that don't pass this
    // field still get ceiling round-off from BUG-051).
    roundOffEnabled = true,
  } = extras;
```

**Change — Gate Math.ceil (already shown in BUG-051 diff, updated with BUG-052):**

The round-off section becomes:
```js
  // BUG-051 / ROUND-001: always-ceil round-off. BUG-052: gated by profile boolean.
  // When roundOffEnabled = false, raw total is used (no rounding).
  const rawTotal = postDiscount + serviceCharge + tipAmount + deliveryCharge + totalTax;
  const orderAmount = rawTotal > 0
    ? (roundOffEnabled ? Math.ceil(rawTotal) : Math.round(rawTotal * 100) / 100)
    : 0;
  const roundUp = Math.round((orderAmount - rawTotal) * 100) / 100;
  const roundUpAbs = roundUp > 0 ? roundUp : 0;
```

#### File: `frontend/src/components/order-entry/CollectPaymentPanel.jsx`

**Change 1 — Round-off gated by profile (L577-585 area, after BUG-051 changes):**

The round-off section becomes:
```jsx
  // BUG-051 / ROUND-001 + BUG-052: ceiling round-off gated by profile.
  // When restaurant.totalRound is false, use raw total (2-decimal precision).
  const roundOffEnabled = restaurant?.totalRound !== false;  // default true
  const finalTotal = rawFinalTotal > 0
    ? (roundOffEnabled ? Math.ceil(rawFinalTotal) : Math.round(rawFinalTotal * 100) / 100)
    : 0;
  const roundOff = Math.round((finalTotal - rawFinalTotal) * 100) / 100;
```

**Change 2 — Pass `roundOffEnabled` to calcOrderTotals callers:**

Every caller of `calcOrderTotals` in `orderTransform.js` that accepts `extras` from the component needs to receive `roundOffEnabled`. The callers in `placeOrderWithPayment` (L1009-1015) and `placeOrder` (L854-860) already spread `extras`. I need to ensure the `CollectPaymentPanel` passes `roundOffEnabled` when it calls into OrderEntry's payment flow. Since `calcOrderTotals` is called with `extras` from the `options` parameter at each flow:

- `placeOrder` (L854): extras come from `options` — add `roundOffEnabled: options.roundOffEnabled ?? true`
- `updateOrder` (L916): same pattern
- `placeOrderWithPayment` (L1009): same pattern

The `CollectPaymentPanel` → `OrderEntry` → `toAPI.*` call chain already passes `restaurant` context. The `roundOffEnabled` boolean needs to be threaded through the `options` object.

---

## 4. Test File Changes

### File: `qa_subtotal_delivery_validation.test.js`

**L67**: `expect(payload.order_amount).toBe(105);` → **No change** (105.00 is already integer, Math.ceil(105) = 105)

**L111**: `expect(payload.order_amount).toBe(2353);` → Change to `expect(payload.order_amount).toBe(2354);`
(rawTotal = 2353.05, Math.ceil = 2354)

**L140**: `expect(payload.order_amount).toBe(2353);` → Change to `expect(payload.order_amount).toBe(2354);`

**L166**: `expect(payload.order_amount).toBe(2353);` → Change to `expect(payload.order_amount).toBe(2354);`

**L347-351 (invariance)**: The signed round-off assertion `Math.abs(roundUpSigned) <= 1.0` still holds (ceil round-off is always 0 to < 1). No change needed.

---

## 5. Files NOT Changed

| File | Reason |
|------|--------|
| `transferToRoom` | No delivery GST (Q-083-3: delivery can't transfer to room) |
| `socketHandlers.js` | No changes to socket layer |
| `OrderEntry.jsx` | Consumer only — changes flow through props/paymentData |
| `OrderCard.jsx` | Consumer only — no financial logic changes |
| Any `/app/memory/final/` doc | Frozen baseline — not modified during implementation |

---

## 6. Summary of All Changed Files

| File | Bugs Applied | Type of Change |
|------|-------------|---------------|
| `orderTransform.js` | BUG-051, BUG-054, BUG-055, BUG-083, BUG-052 | Math.ceil, VAT proration, payload keys, delivery GST, round-off gate |
| `CollectPaymentPanel.jsx` | BUG-051, BUG-054, BUG-075, BUG-083, BUG-052 | Math.ceil, VAT proration, tip gate, delivery GST passthrough, round-off gate |
| `profileTransform.js` | BUG-052 | Add `totalRound` mapping |
| `qa_subtotal_delivery_validation.test.js` | BUG-051 | Re-baseline `order_amount` assertions |

---

## 7. Final Status

`code_diff_preview_created_pending_owner_approval`

---

*— End of POS2.0 Wave 2 Code Diff Preview —*
