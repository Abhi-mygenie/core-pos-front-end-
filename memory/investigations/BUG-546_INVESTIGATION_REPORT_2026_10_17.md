# BUG-546 — Investigation Report
## "Order Report: split payment settled orders should show 'Split Bill'"

**Date:** 2026-10-17
**Role:** INVESTIGATION
**Steps used:** 3/10
**Confidence:** HIGH

---

## 1. Summary

- **Root cause:** `OrderReportBetaPage.jsx` defines `PAYMENT_BADGE_MAP` with `partial → label: 'Partial'`. Split-payment orders set `payment_method = 'partial'` by `orderTransform.js`. The label shows "Partial" instead of "Split Bill".
- **Classification:** FE_BUG — CODE_ERROR (label key exists, wrong text)
- **Confidence:** HIGH
- **Files affected:** 1 (`OrderReportBetaPage.jsx`) · **Lines:** 2

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result |
|---|---|---|---|
| H1 | `PAYMENT_BADGE_MAP` uses `'Partial'` label, needs `'Split Bill'` | `grep "Partial\|partial" OrderReportBetaPage.jsx` | CONFIRMED — L40 + L52 |
| H2 | Other report pages also show "Partial" label for split payments | scan all report pages for same map | ELIMINATED — only in OrderReportBetaPage |

---

## 3. Data Flow Trace

`orderTransform.js:1372` → `payment_method: splitPayments?.length > 0 ? 'partial' : method`
→ API returns `payment_method: "partial"` for split-settled orders
→ `OrderReportBetaPage.jsx:93` → `const pm = (r.payment_method || '').toLowerCase()` → `'partial'`
→ `PAYMENT_BADGE_MAP` lookup hits `partial: { label: 'Partial', cls: 'bg-blue-100 text-blue-800' }` (L40)
→ AND `Partial: { label: 'Partial', ... }` (L52 — capital P fallback)
→ Badge renders: **"Partial"**

**Required:** Badge renders: **"Split Bill"**

---

## 4. Exact Fix

```js
// Line 40 — lowercase key
partial: { label: 'Split Bill', cls: 'bg-blue-100 text-blue-800' },

// Line 52 — capital P fallback  
Partial: { label: 'Split Bill', cls: 'bg-blue-100 text-blue-800' },
```

**File:** `src/pages/reports-module/OrderReportBetaPage.jsx`
**Lines changed:** 2
**Hotspot:** NO
**Financial logic:** NO

---

## 5. Recommendations

- **Classification:** FE_FIX
- **Planning skip eligible:** YES — ≤10 lines, 1 file, not R5, not financial. **Owner must approve.**
- **Risk:** LOW
- **Registry action:** BUG-546 → `GATE_1_INTAKE_COMPLETE` (ready for Fast Lane with owner GO)
