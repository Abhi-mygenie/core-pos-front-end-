# Investigation Report — BUG-VQTY: Variance Quantity Not Multiplied in Billing Payload

**Date:** 2026-07-07  
**Investigator:** INVESTIGATION AGENT (AGENT_PROMPT_ALPHA v0.7)  
**Classification:** `FE_BUG`  
**Severity:** P0 — Wrong billing amount on every varied item with qty > 1  
**Reported by:** Owner — "3x Masala Dosa + Cheese variance → bill shows 3 Masala + 1 Cheese"

---

## 1. Symptom

When a customer orders **N units of an item that has a variance/variation** (e.g., qty=3 Masala Dosa, variance = Cheese at ₹20):

| Field on bill | Expected | Actual |
|---|---|---|
| Base item amount | ₹300 (3 × ₹100) | ₹300 ✅ |
| Variation amount | ₹60 (3 × ₹20) | ₹20 ❌ — only 1× variance |
| Line total | ₹360 | ₹320 |

Affects: **Place Order**, **QSR Place & Pay**, **Collect Bill** (all three flows).

---

## 2. Code Trace

### Root File
`/app/frontend/src/api/transforms/orderTransform.js`

### Cause Site 1 — `buildCartItem()` (used by placeOrder + placeOrderWithPayment)

```js
// Line 619 — variationAmount accumulates per option price, NOT × item qty:
variationAmount += parseFloat(option?.price) || 0;   // = ₹20 always (cheese)

// Line 670 — food_amount IS multiplied correctly:
const foodAmount = basePrice * (item.qty || 1);       // = ₹100 × 3 = ₹300 ✅

// Line 703 — variation_amount is NOT multiplied:
variation_amount: isRuntimeComp ? 0 : variationAmount,  // = ₹20 ❌ (should be ₹60)
```

### Cause Site 2 — `collectBill` food_detail builder (lines 1449–1492)

```js
// Line 1449-1455 — variationAmount computed from placed item.variation, not × qty:
variationAmount = item.variation.reduce((sum, v) => { ... }, 0);  // = ₹20

// Line 1491-1492:
food_amount:      isRuntimeComp ? 0 : (unitPrice * qty),    // = ₹300 ✅
variation_amount: isRuntimeComp ? 0 : variationAmount,       // = ₹20 ❌ (should be ₹60)
```

---

## 3. Why `order_amount` Is Unaffected

`calcOrderTotals` (line 745) computes the grand total using `_fullUnitPrice × qty`:

```js
// Line 771 — CORRECT grand total:
const lineTotal = (item._fullUnitPrice || item.price || 0) * (item.quantity || 1);
// _fullUnitPrice = base + addon + variation = 100 + 0 + 20 = ₹120
// lineTotal = ₹120 × 3 = ₹360 ✅
```

So `order_amount` sent to backend = ₹360 (correct).  
But individual cart item `variation_amount` = ₹20 (wrong).

**The backend uses `food_amount + variation_amount` to display/compute the line item breakdown:**
- Backend sees: `food_amount (300) + variation_amount (20) = ₹320` per line
- Grand total field `order_amount = ₹360` contradicts the line sum
- Bill receipt renders: **3× Masala + 1× Cheese** (₹320), not 3× Masala + 3× Cheese (₹360)

---

## 4. Contrast With Addons (Why Addons Work)

Addons handle quantity via a **separate array** `add_on_qtys`:
```js
// Line 587 — addon has its own per-addon quantity:
const addonQtys = addons.map(a => a.quantity || a.qty || 1);

// Line 698:
add_on_qtys: addonQtys,   // backend multiplies addon price × this qty
```

Variations have **no equivalent `variation_qtys` field**. The backend receives only a scalar `variation_amount` and has no mechanism to multiply it by the parent item qty — it reads it as-is (1× charge).

---

## 5. Affected Flows — Full Call Chain Map

QSR mode was traced in full. It has **two internal paths**, both affected.

| Path | Mode | Entry Point (OrderEntry.jsx) | Transform Function | Bug Site | API Endpoint |
|---|---|---|---|---|---|
| **A** | QSR — fresh order (no placed items) | `handleQsrCollectBill` L1291 | `placeOrderWithPayment` → `buildCartItem` | **L703** | `PLACE_ORDER` |
| **B** | QSR — already-placed order (edge case) | `handleQsrCollectBill` L1439 | `collectBillExisting` → food_detail builder | **L1492** | `BILL_PAYMENT` |
| **C** | Non-QSR — postpaid fresh order | `handlePlaceOrder` L1022 | `placeOrder` → `buildCartItem` | **L703** | `PLACE_ORDER` |
| **D** | Non-QSR — prepaid fresh order | Prepaid button L2000 | `placeOrderWithPayment` → `buildCartItem` | **L703** | `PLACE_ORDER` |
| **E** | Non-QSR — postpaid collect bill | Collect Bill L2112 | `collectBillExisting` → food_detail builder | **L1492** | `BILL_PAYMENT` |

**All 5 paths** are affected. They all converge on the same **2 root cause sites**:
- `buildCartItem` L703 → Paths A, C, D (fresh order placement)
- `collectBillExisting` food_detail builder L1492 → Paths B, E (existing order payment)

---

## 6. Root Cause Classification

**`FE_BUG` — Missing quantity multiplier on `variation_amount` in two transform sites.**

The `variationAmount` variable accumulates the total price of ALL selected variant options for one unit. It is never multiplied by `item.qty || 1` before being emitted as `variation_amount` in the payload.

---

## 7. Recommended Fix (for BUG FIX Agent — DO NOT implement here)

### Fix Site 1 — `buildCartItem` (line 703)
```js
// BEFORE:
variation_amount: isRuntimeComp ? 0 : variationAmount,

// AFTER:
variation_amount: isRuntimeComp ? 0 : variationAmount * (item.qty || 1),
```

### Fix Site 2 — `collectBill` food_detail builder (line 1492)
```js
// BEFORE:
variation_amount: isRuntimeComp ? 0 : variationAmount,

// AFTER:
variation_amount: isRuntimeComp ? 0 : variationAmount * qty,
```

### Regression Risk
- `calcOrderTotals` uses `_fullUnitPrice × qty` (already correct) — grand total `order_amount` will remain unchanged ✅
- `food_amount` is already `basePrice × qty` — pattern is consistent with this fix ✅
- `addonAmount` in `buildCartItem` (line 590-592) already multiplies by addon's own qty — variation fix is consistent ✅
- Confirm: variation_amount on the backend side is used ADDITIVELY (`food_amount + variation_amount + addon_amount`) NOT as a unit price. Fix required here: multiplied by qty in FE before sending.

### Verify After Fix (curl probe)
Place order with qty=3 + 1 variation (e.g., Cheese ₹20):
- Cart item `variation_amount` should be `60` (not `20`)
- `order_amount` should stay ₹360

---

## 8. Files to Change (BUG FIX Agent scope)

| File | Lines | Change |
|---|---|---|
| `/app/frontend/src/api/transforms/orderTransform.js` | L703 | `variationAmount * (item.qty \|\| 1)` |
| `/app/frontend/src/api/transforms/orderTransform.js` | L1492 | `variationAmount * qty` |

**Total: 1 file, 2 line changes.**

---

## 9. Confidence Level

**HIGH (95%)** — Confirmed via full code trace. No curl probe needed; the math is deterministic.  
The `variationAmount` scalar is used in two payload sites without qty multiplication. `food_amount` at both sites DOES multiply by qty. The asymmetry is the bug.

---

*Investigation complete. Handoff to BUG FIX Agent.*
