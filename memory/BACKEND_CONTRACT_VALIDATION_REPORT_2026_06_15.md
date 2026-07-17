# Backend Contract Validation Report — 2026-06-15

**Role:** INVESTIGATION agent
**Scope:** Validate 6 amendment/bug fixes on existing endpoints + 5 new endpoints against contract v2.0
**Restaurants:** Palm House (rid 541, May 2026) + cafe103 token for new endpoints
**Code changes:** NONE

---

## PART 1: Amendment & Bug Fix Validation (Existing Endpoints)

| # | Item | Type | Previous State | Current State | Verdict |
|---|------|------|---------------|---------------|:-------:|
| **A-1** | TAB settlement in `by_hour` | CONTRACT AMENDMENT | `tab_settlements[]` missing. `SUM(by_hour)` Δ=₹420 from `revenue.total` | `tab_settlements[]` PRESENT with timestamp+amount+method. `SUM(by_hour) = revenue.total` exactly (Δ=0) | **PASS ✅** |
| **A-2** | Cancel EP `order_scope.order_count` | BACKEND BUG | 72 (created_at) vs Dashboard 157 (cancel_at). Internal inconsistency. | All 4 sources agree: **157**. summary=157, by_day=157, by_employee=157 | **PASS ✅** |
| **A-3** | `daily.tax` scope + `tab_tax_total` | CONTRACT AMENDMENT | `tab_tax_total` missing. `SUM(daily.tax)` Δ=₹1,868 from `summary.total_tax` | `tab_tax_total` PRESENT (₹1,868). `summary.total_tax` = 55,558.38. `SUM(daily.tax)` = 55,558.38. Δ≈0 (floating point) | **PASS ✅** |
| **A-4** | Dashboard discount = Sales discount | CONTRACT AMENDMENT | Dashboard `manual_discount` included TAB. Δ=₹5,300 from Sales. | `tab_discount_total` PRESENT (₹2,040). BUT Dashboard `manual_discount` (₹49,852) ≠ Sales `total_discount` (₹46,592). **Δ=₹3,260 still.** Dashboard scope appears changed but not fully aligned. | **FAIL ❌** |
| **A-5** | Tax zeroed on cancelled lines (ESC-3) | BACKEND BUG | Items cancel rev ₹85,049 vs Dashboard ₹84,292. Δ=₹757. | Items cancel rev ₹84,945 vs Dashboard ₹84,188. **Δ=₹757 persists.** Tax still not zeroed on cancelled lines. | **FAIL ❌** |
| **A-6** | `daily.discount` scope explicit non-TAB | CONTRACT AMENDMENT | Scope undocumented | `SUM(daily.discount)` = `summary.total_discount` exactly (Δ≈0). Non-TAB scope confirmed. | **PASS ✅** |

### Amendment Summary: 4/6 PASS, 2/6 FAIL

**A-4 Detail:** Backend added `tab_discount_total` field (₹2,040) — good. But `manual_discount` is ₹49,852 while Sales `total_discount` is ₹46,592. The Δ is ₹3,260, not ₹2,040. This means `manual_discount` scope was partially changed but still includes some TAB discounts (₹3,260 - ₹2,040 = ₹1,220 unaccounted). Need: `manual_discount` = non-TAB only so that `Dashboard.manual_discount + coupon = Sales.total_discount`.

**A-5 Detail:** ESC-3 not yet shipped. `gst_tax_amount`/`vat_tax_amount` still non-zero on 34 cancelled item lines (Palm House May). Items EP cancel revenue exceeds Dashboard cancel loss by exactly ₹757, same as before.

---

## PART 2: New Endpoint Validation (5 endpoints)

### insights-tax — §5.1

| Check | Expected | Actual | Verdict |
|-------|----------|--------|:-------:|
| HTTP Status | 200 | 200 | ✅ |
| `success` | true | true | ✅ |
| `summary` keys | `total_gst, total_vat, total_tax` | All present | ✅ |
| `by_slab` keys | `rate, orders, revenue, tax` | All present (2 slabs) | ✅ |
| `by_type` keys | `type, amount` | All present (GST + VAT) | ✅ |
| `by_calc` keys | `method, orders, revenue` | All present (1 method: exclusive) | ✅ |
| `daily` keys | `date, gst, vat, total` | All present (31 days) | ✅ |

**insights-tax VERDICT: PASS ✅ — Full contract compliance. All fields present.**

---

### insights-discounts — §5.2

| Check | Expected | Actual | Verdict |
|-------|----------|--------|:-------:|
| HTTP Status | 200 | 200 | ✅ |
| `summary` keys | `manual_discount, coupon_discount, loyalty_discount, comp_total, total` | All present | ✅ |
| `daily` keys | `date, manual, coupon, loyalty, comp` | All present (31 days) | ✅ |
| `by_employee` keys | `name, manual_discount, coupon_applied, comp_count` | All present (3 employees) | ✅ |
| `coupons` | `code, type, uses, discount_total, orders` per coupon | 0 items (no coupons used in May — valid) | ✅ |

**insights-discounts VERDICT: PASS ✅ — Full contract compliance. Coupons array empty is valid (restaurant has no coupon usage in range).**

---

### insights-staff — §5.3

| Check | Expected | Actual | Verdict |
|-------|----------|--------|:-------:|
| HTTP Status | 200 | 200 | ✅ |
| `by_server` keys | `name, employee_id, orders, revenue, avg_order_value, tips, cancel_count` | All 7 fields present (7 servers) | ✅ |
| `by_cashier` keys | `name, employee_id, orders_processed, cash_collected, card_collected, upi_collected` | All 6 fields present (3 cashiers) | ✅ |

**insights-staff VERDICT: PASS ✅ — Full contract compliance.**

---

### insights-customers — §5.4

| Check | Expected | Actual | Verdict |
|-------|----------|--------|:-------:|
| HTTP Status | 200 | 200 | ✅ |
| `summary` keys | `total_orders, registered_orders, guest_orders, unique_customers, repeat_customers, repeat_pct` | All 6 fields present | ✅ |
| `daily` keys | `date, registered_orders, guest_orders` | All present (31 days) | ✅ |
| `top_customers` keys | `customer_id, name, phone, visits, total_spend, last_visit, avg_order` | All 7 fields present (25 customers) | ✅ |
| `rfm_bands` keys | `band, count, revenue` | All present (4 bands: Champions, Loyal, At Risk, Dormant) | ✅ |

**insights-customers VERDICT: PASS ✅ — Full contract compliance. RFM bands functional with real segmentation.**

---

### insights-locations — §5.5

| Check | Expected | Actual | Verdict |
|-------|----------|--------|:-------:|
| HTTP Status | 200 | 200 | ✅ |
| `by_table` keys | `table_id, table_name, orders, revenue` | All 4 fields present (69 tables) | ✅ |
| `delivery_charges.total` | number | ₹2,152.50 | ✅ |
| `delivery_charges.daily` keys | `date, charge, orders` | Present (31 days) | ✅ |
| `room_transfers` keys | `order_id, from_room, to_room, items_count, transfer_date, transfer_time` | All 6 fields present (61 transfers) | ✅ |

**insights-locations VERDICT: PASS ✅ — Full contract compliance. Rich data: 69 tables, 61 room transfers.**

---

## FINAL SCORECARD

### Amendments & Bug Fixes (Existing Endpoints)

| Item | Verdict | Notes |
|------|:-------:|-------|
| A-1 TAB settlement hourly | **PASS ✅** | `tab_settlements[]` with timestamp. `SUM(by_hour) = total`. |
| A-2 Cancel order_count | **PASS ✅** | Fixed from 72 → 157. All 4 sources consistent. |
| A-3 daily.tax + tab_tax_total | **PASS ✅** | `tab_tax_total` present. `SUM(daily.tax) = total_tax`. |
| A-4 Discount scope alignment | **FAIL ❌** | `tab_discount_total` added but `manual_discount` still Δ=₹3,260 from Sales. |
| A-5 ESC-3 tax on cancelled | **FAIL ❌** | Δ=₹757 persists. Tax not zeroed on 34 cancelled lines. |
| A-6 daily.discount scope | **PASS ✅** | `SUM(daily.discount) = total_discount`. Non-TAB confirmed. |

### New Endpoints

| Endpoint | Verdict | Fields | Data |
|----------|:-------:|:------:|------|
| `insights-tax` | **PASS ✅** | 5/5 sections, all fields | 2 slabs, 31 daily, 2 types, 1 calc method |
| `insights-discounts` | **PASS ✅** | 4/4 sections, all fields | 3 employees, 31 daily, 0 coupons (valid) |
| `insights-staff` | **PASS ✅** | 2/2 sections, all fields | 7 servers, 3 cashiers |
| `insights-customers` | **PASS ✅** | 4/4 sections, all fields | 25 top customers, 4 RFM bands, 31 daily |
| `insights-locations` | **PASS ✅** | 3/3 sections, all fields | 69 tables, 61 room transfers, 31 daily delivery |

### Overall

```
Amendments:    4/6 PASS (A-4 discount scope + A-5 ESC-3 still open)
New Endpoints: 5/5 PASS (all fully compliant with contract v2.0)
Total:         9/11 PASS
```

---

## OPEN ITEMS FOR BACKEND

1. **A-4 (Discount aggregation — Palm House only):** Dashboard `manual_discount` does NOT match Sales `total_discount` on Palm House (rid 541). cafe103 is FIXED and correct. Palm House 3-month (Mar–May): Dashboard = ₹1,48,190 vs Sales = ₹1,99,257 vs Raw = ₹1,99,257. Dashboard UNDER-reports by ₹51,066. Root cause is NOT TAB scope (Palm House has zero TAB orders with discount). Backend needs to trace the Dashboard aggregation query for rid 541 specifically. Discount field confirmed: only `restaurant_discount_amount` matters (= `order_discount` = SUM(`discount_on_food`)).

2. **A-5 (ESC-3):** Zero `gst_tax_amount`, `vat_tax_amount`, `discount_on_food`, `service_charge` on ALL cancelled item lines. ₹757 tax persists on 34 cancelled lines (Palm House May).

---

*Validation run: 2026-06-15. Evidence: `/tmp/a1_dashboard.json`, `/tmp/a2_cancel.json`, `/tmp/a3_sales.json`, `/tmp/new_tax.json`, `/tmp/new_discounts.json`, `/tmp/new_staff.json`, `/tmp/new_customers.json`, `/tmp/new_locations.json`*
