# BUG-580 — Impact Analysis (Gate 2) — REVISED
## Discount report — complete end-to-end audit (6 months, Palm House + Pav2)

**ID:** BUG-580
**Date:** 2026-10-21 (revised after full 6-month probe on 2 restaurants)
**Code Reality:** PARTIAL — summary/daily/employee sections work, 2 FE gaps in orders table + missing category section
**Conflict Pre-Check:** CLEAN
**Risk:** LOW — display-only, 1 file

---

## 1. Data Verified (6 months: Apr 21 – Oct 21, 2026)

| | Palm House | Pav2 |
|---|---:|---:|
| **Total Discount** | ₹1,22,820.51 | ₹5,860.56 |
| Manual | ₹1,13,280.51 | ₹5,860.56 |
| Coupon | ₹0 | ₹0 |
| Loyalty | ₹0 | ₹0 |
| Comp | ₹9,540 | ₹0 |
| **M+C+L+Comp = Total?** | **✅** | **✅** |
| | | |
| Daily rows | 184 days | 184 days |
| Employees | 11 | 2 |
| Discount Orders | 583 | 119 |
| Coupons | 0 | 0 |
| **By Category** | **3 categories** | **0 (not present)** |

---

## 2. What's Working Correctly ✅

| Feature | FE Code | API Field | Status |
|---------|---------|-----------|--------|
| KPI: Total | L110 `analytics.total` | `summary.total` | ✅ |
| KPI: Manual | L111 `analytics.summary.manual_discount` | `summary.manual_discount` | ✅ |
| KPI: Coupon | L112 `analytics.summary.coupon_discount` | `summary.coupon_discount` | ✅ |
| KPI: Loyalty | L113 `analytics.summary.loyalty_discount` | `summary.loyalty_discount` | ✅ |
| KPI: Comp | L114 `analytics.summary.comp_total` | `summary.comp_total` | ✅ |
| Daily chart | L119-122 `analytics.daily` | `daily[].date/manual/coupon/loyalty/comp` | ✅ |
| Daily table | L132-137 | Same keys | ✅ |
| Employee chart | L125-130 `analytics.byEmployee` | `by_employee[].name/manual_discount/coupon_applied/comp_count` | ✅ |
| Orders table: Order # | L155 `row.restaurant_order_id` | `orders_table[].restaurant_order_id` | ✅ |
| Orders table: Discount ₹ | L158 `row.order_discount` | `orders_table[].order_discount` | ✅ |
| Orders table: Total ₹ | L159 `row.total_discount` | `orders_table[].total_discount` | ✅ |
| Excel export (Daily + Employee) | L83-86 | | ✅ |

---

## 3. FE Gap 1 — Orders Table "Reason" Column Shows Wrong Field (HIGH)

**FE code (L157):**
```jsx
<td>{row.discount_for || '—'}</td>
```

**API data (Palm House, 583 orders):**
```
discount_for values:      {'null': 583}          ← ALL null
discount_category values: {'null': 468, 'Thrive': 84, 'Complementary': 18, 'Google Review': 13}
```

**The problem:** `discount_for` is `null` on all 583 Palm House orders. The actual category label ("Thrive", "Complementary", "Google Review") is in `discount_category`. The "Reason" column shows "—" for every single row, even though 115 orders (20%) have a category.

**Pav2:** Both `discount_for` and `discount_category` are `null` on all 119 orders — no categories configured for this restaurant. Shows "—" correctly.

**Fix:** L157 — prioritize `discount_category`:
```jsx
<td>{row.discount_category || row.discount_for || '—'}</td>
```

**Lines:** 1

---

## 4. FE Gap 2 — `by_category[]` Not Rendered (MEDIUM)

**API sends (Palm House):**
```json
"by_category": [
    { "category_id": 49, "discount_category": "Thrive",        "manual": 10198.70, "total": 10198.70 },
    { "category_id": 50, "discount_category": "Google Review",  "manual": 895.80,   "total": 895.80 },
    { "category_id": 56, "discount_category": "Complementary",  "manual": 8785.00,  "total": 8785.00 }
]
```

**FE code (L70-77):** The `analytics` memo reads `summary`, `daily`, `by_employee`, `orders_table` — but **never reads `by_category`**. No UI section exists.

**What's hidden:** Palm House has ₹19,879.50 in categorized discounts across 3 custom types — 16.2% of total discounts. This data is returned by the API but invisible on the page.

**Pav2:** `by_category` is empty (0 categories) — no data to show.

**Fix:**
- L76: Add `byCategory: rawData.by_category || []` to analytics memo
- After L130 (employee chart): Render a new "Discount by Category" table showing each category with manual/coupon/loyalty/comp/total columns
- L83-86: Add `by_category` as a new sheet in the Excel export

**Lines:** ~25

---

## 5. FE Gap 3 — Orders Table Missing "Date" Column (LOW)

**FE code (L156):** reads `row.order_date`
**API sends:** `collect_bill` (e.g. "2026-10-17 09:59:46") — no `order_date` field.

**Result:** Date column shows "—" for every row.

**Fix:** L156:
```jsx
<td>{row.order_date || (row.collect_bill ? row.collect_bill.split(' ')[0] : '—')}</td>
```

**Lines:** 1

---

## 6. FE Gap 4 — Orders Table Missing Employee Name Column (LOW)

The API sends `employee_name` and `employee_id` per order but the table doesn't show who applied the discount. Adding this column would help identify discount patterns per employee at the order level.

**Scope: OPTIONAL** — enhance if desired.

---

## 7. Side-by-Side: What FE Shows vs What It Should Show

### Palm House (583 discount orders)

| Column | Current Display | Correct Display | Gap? |
|--------|----------------|-----------------|------|
| Order # | #012499 | #012499 | ✅ |
| Date | — | 2026-07-06 (from collect_bill) | ❌ Gap 3 |
| Reason | — | Thrive / Complementary / Google Review | ❌ Gap 1 |
| Discount ₹ | ₹930 | ₹930 | ✅ |
| Total ₹ | ₹930 | ₹930 | ✅ |

### Palm House by_category (not rendered at all)

| Category | Manual ₹ | Total ₹ | Currently Shown? |
|----------|----------|---------|:---:|
| Thrive | ₹10,198.70 | ₹10,198.70 | ❌ Hidden |
| Google Review | ₹895.80 | ₹895.80 | ❌ Hidden |
| Complementary | ₹8,785.00 | ₹8,785.00 | ❌ Hidden |

---

## 8. Summary — All Gaps

| # | Gap | Severity | Root Cause | Fix | Lines |
|---|-----|----------|-----------|-----|-------|
| 1 | "Reason" column shows "—" instead of Thrive/Google Review/Complementary | HIGH | Reads `discount_for` (all null) instead of `discount_category` | L157: `row.discount_category \|\| row.discount_for` | 1 |
| 2 | `by_category[]` not rendered — custom discount types invisible | MEDIUM | Analytics memo and UI never read `rawData.by_category` | Add to memo + render table + add to Excel export | ~25 |
| 3 | Date column shows "—" | LOW | Reads `order_date` but API sends `collect_bill` | L156: fallback to `collect_bill` | 1 |
| 4 | Employee name not shown per order | LOW | Column not added | Add column | OPTIONAL |

---

## 9. Files WILL Change

| # | File | Change | Lines |
|---|------|--------|-------|
| 1 | `DiscountReportMockup.jsx` L157 | `discount_category` priority | 1 |
| 2 | `DiscountReportMockup.jsx` L76 | Add `byCategory` to analytics | 1 |
| 3 | `DiscountReportMockup.jsx` after L130 | New "Discount by Category" table | ~20 |
| 4 | `DiscountReportMockup.jsx` L83-86 | Add `by_category` sheet to Excel | ~5 |
| 5 | `DiscountReportMockup.jsx` L156 | Date fallback to `collect_bill` | 1 |

**Total:** 1 file, ~28 lines

**Files WILL NOT touch:** insightsService.js, any transform, any other report page

---

## 10. Backend Status

**Backend has done its job.** All fields returned correctly:
- `summary` with all 5 KPI fields ✅
- `daily[]` with correct keys ✅
- `by_employee[]` with correct keys ✅
- `orders_table[]` with `discount_category` (new) ✅
- `by_category[]` (new) ✅
- `coupons[]` ✅

No backend fix needed.

---

## 11. Owner Decisions

**None required.** All gaps are FE display fixes using data the backend already sends.
