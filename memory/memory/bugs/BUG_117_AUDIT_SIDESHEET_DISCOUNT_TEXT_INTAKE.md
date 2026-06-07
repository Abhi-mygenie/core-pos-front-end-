# BUG-117 — Audit Report Side-Sheet: Discount Displaying as Raw Text

**Status:** INTAKE
**Priority:** P2
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Component:** OrderDetailSheet.jsx

---

## 1. Problem Statement (Owner Verbatim)

> Sometimes discount which is coming is coming in audit report in right-hand side model in texts. That needs to be checked.

---

## 2. Symptom

In the Audit Report, when clicking on an order row to open the **right-hand side-sheet** (OrderDetailSheet / drill modal), the discount value is sometimes rendered as **raw text** (e.g., a stringified object, JSON, or unformatted label) instead of displaying as a properly formatted currency value or discount breakdown.

---

## 3. Expected Behavior

Discount in the side-sheet should display as:
- Formatted currency value (e.g., "₹13.50" or "50%")
- Correct label (e.g., "Restaurant Discount", "Coupon", "Category Discount")
- Never as raw text, `[object Object]`, `null`, or unformatted strings

---

## 4. Likely Affected Files

| File | Role |
|---|---|
| `OrderDetailSheet.jsx` | Right-hand side-sheet / drill modal — renders order details including discount |
| `reportTransform.js` | Transforms API response into display data — may pass discount as wrong type |

---

## 5. Open Questions (Discovery Phase)

| # | Question |
|---|---|
| Q-117-1 | Which discount type triggers the issue? (restaurant/comm discount, coupon, category, manual?) |
| Q-117-2 | Is it showing as raw JSON/object, or as the wrong field value (e.g., showing type string instead of amount)? |
| Q-117-3 | Specific order IDs / restaurant that reproduce the issue? |
| Q-117-4 | Does this happen on all orders with discounts, or only specific discount types? |

---

## 6. Next Steps

1. Reproduce the text rendering issue on preprod with a discounted order
2. Inspect what value `OrderDetailSheet` receives for discount fields
3. Fix formatting / field mapping
4. Part of BUG-115 production validation scope (Audit Report freeze)
