# BUG-114 — Discount Type & Category Fields Not Passed to Backend

**Status:** DISCOVERY COMPLETE
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Component:** CollectPaymentPanel.jsx, orderTransform.js, profileTransform.js

---

## 1. Problem Statement (Owner Verbatim + Screenshot)

> Discount type as well as category — discount category is coming null to the backend. It's not getting passed from the frontend when any category discount is applied.

Evidence (Order #939399): `discount_type: ""`, `discount_member_category_id: 0`, `discount_member_category_name: ""` despite `comm_discount: 13.5` being correctly calculated.

---

## 2. Root Cause (Code-Traced) — TWO gaps

### Gap 1: `discount_member_category_id` and `discount_member_category_name` are HARDCODED

**File:** `orderTransform.js`

| Payload Builder | Lines | Value |
|---|---|---|
| `placeOrderWithPayment` | L1194–1195 | `discount_member_category_id: 0`, `discount_member_category_name: ''` |
| `collectBillExisting` | L1390–1391 | `discount_member_category_id: 0`, `discount_member_category_name: ''` |
| `placeOrder` | L922–923 | `discount_member_category_id: 0`, `discount_member_category_name: null` |
| `updateOrder` | L1047–1048 | `discount_member_category_id: 0`, `discount_member_category_name: null` |

**None of these read from `discounts` object.** They're all hardcoded to 0/''.

### Gap 2: `discountType` is empty when preset category discount is selected

**File:** `CollectPaymentPanel.jsx` L1212–1229

When user selects a preset category discount from the dropdown:
```js
} else if (val.startsWith('preset_')) {
  const found = (discountTypes || []).find(dt => String(dt.id) === presetId);
  setSelectedDiscountType(found || null);  // ← stores { id, name, discountPercent }
  setDiscountType(null);                   // ← CLEARS discountType to null
  setDiscountValue("");
}
```

Then in paymentData (L1020-1021):
```js
discountType: discountType || '',           // ← '' (null was set above)
orderDiscountType: discountType === 'percent' ? 'Percent' : ... // ← '' (same)
```

**Result:** `discount_type` and `order_discount_type` are empty in the payload even though a category discount IS applied.

### Gap 3: `selectedDiscountType` data NOT threaded to `paymentData.discounts`

The `selectedDiscountType` object has `{ id, name, discountPercent }` (from `profileTransform.js` L260-264), but these fields are **never included** in `paymentData.discounts` (L1005-1028). So even though the data exists in React state, it never reaches the payload builder.

---

## 3. Data Flow Trace

```
Profile API → profileTransform.discountTypes() → { id, name, discountPercent }
                                                        ↓
RestaurantContext.discountTypes → CollectPaymentPanel.selectedDiscountType
                                                        ↓
paymentData.discounts = {
  preset: presetDiscount (calculated ✅),
  discountType: '' (❌ null because setDiscountType(null)),
  orderDiscountType: '' (❌ derived from null discountType),
  // selectedDiscountType.id → NEVER THREADED ❌
  // selectedDiscountType.name → NEVER THREADED ❌
}
                                                        ↓
orderTransform.collectBillExisting / placeOrderWithPayment:
  comm_discount: discounts.preset ✅ (13.5 — correct)
  discount_type: discounts.discountType ❌ ('' — empty)
  discount_member_category_id: 0 ❌ (HARDCODED)
  discount_member_category_name: '' ❌ (HARDCODED)
```

---

## 4. Fix Plan

### Step 1: Thread category info through `paymentData.discounts` (CollectPaymentPanel.jsx)

At L1005-1028, add to the `discounts` object:
```js
discounts: {
  ...existing fields,
  // NEW — category discount metadata
  discountMemberCategoryId:   selectedDiscountType?.id || 0,
  discountMemberCategoryName: selectedDiscountType?.name || '',
  discountType:               selectedDiscountType
                                ? selectedDiscountType.name    // or a fixed type string
                                : (discountType || ''),
  orderDiscountType:          selectedDiscountType
                                ? 'Percent'                    // presets are always percentage
                                : (discountType === 'percent' ? 'Percent' : discountType === 'flat' ? 'Amount' : ''),
}
```

### Step 2: Read from `discounts` in payload builders (orderTransform.js)

Replace hardcoded values in ALL 4 builders:
```js
// BEFORE (all 4 builders):
discount_member_category_id:  0,
discount_member_category_name: '',

// AFTER:
discount_member_category_id:  discounts.discountMemberCategoryId || 0,
discount_member_category_name: discounts.discountMemberCategoryName || '',
```

### Step 3: Fix `discount_type` to carry category name when preset selected

Already handled by Step 1 — `discountType` will carry `selectedDiscountType.name` when a preset is selected.

---

## 5. Affected Files

| File | Lines | Change |
|---|---|---|
| `CollectPaymentPanel.jsx` | L1005–1028 | Add `discountMemberCategoryId`, `discountMemberCategoryName` to `discounts` object; fix `discountType` for preset mode |
| `orderTransform.js` | L922–923 | `placeOrder`: read from `discounts` instead of hardcoded 0 |
| `orderTransform.js` | L1047–1048 | `updateOrder`: same |
| `orderTransform.js` | L1194–1195 | `placeOrderWithPayment`: same |
| `orderTransform.js` | L1390–1391 | `collectBillExisting`: same |

---

## 6. Open Questions

| # | Question |
|---|---|
| Q-114-1 | What value should `discount_type` carry for category discounts? The category `name` (e.g., "Staff Discount"), or a fixed type string (e.g., "category", "member")? |
| Q-114-2 | Does the `placeOrder` (non-payment) path also need category info, or only payment paths? |
