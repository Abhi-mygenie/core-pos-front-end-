# BUG-113 + BUG-114 — Implementation Plan & Code Gate

**Gate 3 (Plan) + Gate 4 (Code Gate / Scope Lock)**
**Date:** 2026-06-07
**Author:** Agent
**Status:** AWAITING OWNER GO

---

## BUG-113 — Split Payment Auto-Fill Circular Override

### Summary
Remove the 2-row circular auto-fill from `onChange`. Replace with `onBlur`-based auto-fill for the last remaining row. Keep capping as a soft guide but allow free typing.

### File: `CollectPaymentPanel.jsx`

#### Change 1 — Replace onChange handler (L2626–2646)

**BEFORE:**
```jsx
onChange={(e) => {
  const typedVal = e.target.value;
  const typedNum = parseFloat(typedVal) || 0;
  setSplitPayments(prev => {
    const newSplit = prev.map(s => ({ ...s }));
    const othersSum = newSplit.reduce((sum, s, i) => i !== idx ? sum + (parseFloat(s.amount) || 0) : sum, 0);
    const maxForThisRow = Math.max(0, Math.round((effectiveTotal - othersSum) * 100) / 100);
    const cappedNum = Math.min(typedNum, maxForThisRow);
    const cappedVal = typedNum > maxForThisRow ? String(cappedNum) : typedVal;
    newSplit[idx].amount = cappedVal;
    if (newSplit.length === 2) {
      const otherIdx = idx === 0 ? 1 : 0;
      const remaining = Math.max(0, Math.round((effectiveTotal - cappedNum) * 100) / 100);
      newSplit[otherIdx].amount = remaining > 0 ? String(remaining) : "";
    }
    return newSplit;
  });
}}
```

**AFTER:**
```jsx
onChange={(e) => {
  const typedVal = e.target.value;
  setSplitPayments(prev => {
    const newSplit = prev.map(s => ({ ...s }));
    newSplit[idx].amount = typedVal;
    return newSplit;
  });
}}
onBlur={() => {
  setSplitPayments(prev => {
    const newSplit = prev.map(s => ({ ...s }));
    const currentVal = parseFloat(newSplit[idx].amount) || 0;
    const othersSum = newSplit.reduce((sum, s, i) => i !== idx ? sum + (parseFloat(s.amount) || 0) : sum, 0);
    const maxForThisRow = Math.max(0, Math.round((effectiveTotal - othersSum) * 100) / 100);
    // Cap only on blur, not on every keystroke
    if (currentVal > maxForThisRow) {
      newSplit[idx].amount = String(maxForThisRow);
    }
    // Auto-fill: if this is the second-to-last row with a value,
    // and exactly one other row is still empty, fill it with remaining
    const emptyRows = newSplit.filter(s => !s.amount || s.amount === '0' || s.amount === '');
    if (emptyRows.length === 1) {
      const emptyIdx = newSplit.findIndex(s => !s.amount || s.amount === '0' || s.amount === '');
      const filledSum = newSplit.reduce((sum, s, i) => i !== emptyIdx ? sum + (parseFloat(s.amount) || 0) : sum, 0);
      const remaining = Math.max(0, Math.round((effectiveTotal - filledSum) * 100) / 100);
      newSplit[emptyIdx].amount = remaining > 0 ? String(remaining) : "";
    }
    return newSplit;
  });
}}
```

**Behavioral change:**
- `onChange`: free typing, no capping, no auto-fill → user can type any amount
- `onBlur`: caps the field if over max, auto-fills the last empty row with remaining
- Works for both 2-row and 3-row configs
- No circular override because auto-fill only targets the LAST EMPTY row (not the one you just left)

#### No other files affected.

---

## BUG-114 — Discount Category Fields Not Threaded to Payload

### Summary
Thread `selectedDiscountType.id` and `selectedDiscountType.name` through `paymentData.discounts` and read them in all 4 payload builders instead of hardcoded `0` / `''`.

### File 1: `CollectPaymentPanel.jsx`

#### Change 1 — Add category fields to `discounts` object (L1005–1028)

**BEFORE (L1020–1021):**
```js
        discountType:         discountType || '',
        orderDiscountType:    discountType === 'percent' ? 'Percent' : discountType === 'flat' ? 'Amount' : '',
```

**AFTER:**
```js
        discountType:                selectedDiscountType ? (selectedDiscountType.name || 'category') : (discountType || ''),
        orderDiscountType:           selectedDiscountType ? 'Percent' : (discountType === 'percent' ? 'Percent' : discountType === 'flat' ? 'Amount' : ''),
        discountMemberCategoryId:    selectedDiscountType?.id || 0,
        discountMemberCategoryName:  selectedDiscountType?.name || '',
```

### File 2: `orderTransform.js`

#### Change 2a — `placeOrder` builder (L922–923)

**BEFORE:**
```js
      discount_member_category_id:   0,
      discount_member_category_name: null,
```

**AFTER:**
```js
      discount_member_category_id:   0,    // placeOrder = no payment, no discount category
      discount_member_category_name: null,
```
*(No change needed — `placeOrder` is the non-payment path, no discount applied yet.)*

#### Change 2b — `updateOrder` builder (L1047–1048)

**BEFORE:**
```js
      discount_member_category_id:   0,
      discount_member_category_name: null,
```

**AFTER:**
```js
      discount_member_category_id:   0,    // updateOrder = no payment, no discount category
      discount_member_category_name: null,
```
*(No change needed — `updateOrder` is the non-payment path.)*

#### Change 2c — `placeOrderWithPayment` builder (L1194–1195)

**BEFORE:**
```js
      discount_member_category_id:   0,
      discount_member_category_name: '',
```

**AFTER:**
```js
      discount_member_category_id:   discounts.discountMemberCategoryId || 0,
      discount_member_category_name: discounts.discountMemberCategoryName || '',
```

#### Change 2d — `collectBillExisting` builder (L1390–1391)

**BEFORE:**
```js
      discount_member_category_id:  0,
      discount_member_category_name: '',
```

**AFTER:**
```js
      discount_member_category_id:  discounts.discountMemberCategoryId || 0,
      discount_member_category_name: discounts.discountMemberCategoryName || '',
```

---

## Risk Assessment

| Bug | Risk | Mitigation |
|---|---|---|
| BUG-113 | Low — split payment is isolated; only changes `onChange`→`onBlur` timing | Remaining label already exists for UX guidance |
| BUG-114 | Low — additive fields only; no existing field values change; non-payment paths untouched | `|| 0` / `|| ''` fallbacks preserve backward compat |

## Files Changed Summary

| File | Bug | Lines Changed |
|---|---|---|
| `CollectPaymentPanel.jsx` | BUG-113 | L2626–2646 (replace onChange + add onBlur) |
| `CollectPaymentPanel.jsx` | BUG-114 | L1020–1021 (add 2 new fields + fix discountType for preset) |
| `orderTransform.js` | BUG-114 | L1194–1195, L1390–1391 (read from discounts instead of hardcoded) |

## Test Plan

| Test | Expected |
|---|---|
| Split payment: 2 rows, type in Cash → blur | UPI auto-fills with remaining |
| Split payment: 2 rows, clear Cash → retype | Can freely type new amount, no lock |
| Split payment: 3 rows, type Cash+UPI → blur | Card auto-fills with remaining |
| Category discount: select preset → submit | `discount_type`, `discount_member_category_id`, `discount_member_category_name` populated in payload |
| Manual % discount → submit | `discount_member_category_id: 0`, `discount_member_category_name: ''` (unchanged) |
| No discount → submit | All discount fields 0/empty (unchanged) |
