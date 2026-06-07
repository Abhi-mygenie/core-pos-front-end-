# BUG-117 — Audit Report Side-Sheet: Discount Displaying as Text

**Status:** DISCOVERY COMPLETE
**Priority:** P2
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Component:** OrderDetailSheet.jsx, reportTransform.js

---

## 1. Problem Statement (Owner Verbatim)

> Sometimes discount which is coming in audit report in right-hand side model in texts. That needs to be checked.

---

## 2. Discovery — Two Potential Sources of "Text" Rendering

### Source A — Field Name Mismatch Between Transforms

The side-sheet reads `displayData.discountAmount` (L805):
```jsx
{displayData.discountAmount > 0 ? `-${formatCurrency(displayData.discountAmount)}` : formatCurrency(0)}
```

Different transforms set different field names:

| Transform | Used By | Field Name | Matches Side-Sheet? |
|---|---|---|---|
| `orderLogsReportRow` (L1041) | order-logs-report (Audit Report main) | `discountAmount` | ✅ YES |
| `paidOrder` (L183) | paid-order-list | `discount` | ❌ NO |
| `cancelledOrder` (L218) | cancel-order-list | `discount` | ❌ NO |
| `creditOrder` (L270) | paid-in-tab-order-list | `discount` | ❌ NO |
| `holdOrder` (L305) | hold-order-list | `discount` | ❌ NO |
| `getSingleOrderNew` (L409) | FETCH MODE fallback | `discount` | ❌ NO |

**When the side-sheet opens in DATA MODE** (order from order-logs-report with `items` attached): `discountAmount` exists ✅.

**When the side-sheet opens in FETCH MODE** (falls back to `getSingleOrderNew`): The returned data has `discount` but NOT `discountAmount`. Result: `displayData.discountAmount` is **undefined**, `undefined > 0` = false → renders `formatCurrency(0)` = "₹0.00". **Discount silently shows as ₹0 instead of actual value.**

### Source B — `discount` Field May Contain Non-Numeric Data

The Audit Report row transform at L1023:
```js
discount: toNum(api.restaurant_discount_amount || api.discount_value || 0),
```

If `api.discount_value` is a string like `"50%"` or a discount type label instead of an amount, `toNum()` would return `NaN` or `0`. The `discount` field on the row object could carry unexpected data.

Additionally, `api.restaurant_discount_amount` has been observed as `0` even when discounts are applied (see Backend gap in OPEN_GAPS_REGISTER.md: *"`restaurant_discount_amount=0` despite discount applied"*). In that case `discount_value` becomes the fallback, and its contents may not be a clean number.

### Source C — Discount Type Shown as Text (Related to BUG-114)

The side-sheet only shows discount amount, not discount type/category. But if the `discount` field accidentally contains a type string (from wrong API field mapping), it would render as text in any component that displays `displayData.discount` directly.

---

## 3. Impact Analysis

| Scenario | Side-Sheet Behavior | Issue? |
|---|---|---|
| Open from Audit Report (order-logs-report, DATA MODE) | `discountAmount` present → renders correctly | ✅ OK |
| Open from Audit Report, order missing `items` → FETCH MODE | `discountAmount` undefined → shows ₹0 | ❌ **Discount hidden** |
| Backend `restaurant_discount_amount = 0` with actual discount | `discountAmount = 0` → shows ₹0 | ❌ **Discount hidden** (backend gap) |
| `discount_value` contains non-numeric text | `toNum()` returns 0 or NaN | ❌ **Possible text rendering** |

---

## 4. Fix Plan

### Fix 1 — Side-sheet should read BOTH field names

**File:** `OrderDetailSheet.jsx` L805

**BEFORE:**
```jsx
{displayData.discountAmount > 0 ? ...}
```

**AFTER:**
```jsx
{(displayData.discountAmount || displayData.discount || 0) > 0 ? 
  `-${formatCurrency(displayData.discountAmount || displayData.discount)}` : 
  formatCurrency(0)}
```

This handles both DATA MODE (`discountAmount`) and FETCH MODE (`discount`).

### Fix 2 — Normalize field names across transforms (deferred — production validation scope)

Long-term: all transforms should use the same field name. But this is a larger refactor, deferred to BUG-115 Part B production validation.

---

## 5. Affected Files

| File | Lines | Change |
|---|---|---|
| `OrderDetailSheet.jsx` | L805 | Read `discountAmount || discount` (both field names) |
| `reportTransform.js` | Multiple | (Deferred) Normalize `discount` vs `discountAmount` naming |

---

## 6. Relationship to Other Bugs

| Bug | Relationship |
|---|---|
| **BUG-114** | `discount_type` / `discount_member_category_name` empty — could cause "text" if these fields leak into display |
| **BUG-115** | Part of production validation scope — will test discount rendering across all order types |
| **Backend gap** | `restaurant_discount_amount=0` on discounted orders (OPEN_GAPS_REGISTER.md) |
