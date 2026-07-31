# CR-011 Phase 3 — Endpoint Sufficiency Audit

**Date:** 2026-06-15
**Purpose:** Map each of the 28 Phase 3 screens against existing backend endpoints. Identify gaps requiring new endpoints or contract amendments.

---

## Available Endpoints

| # | Endpoint | Key Fields |
|---|----------|-----------|
| 1 | `insights-dashboard` | revenue (total, by_hour), channel_mix, payment_mix, top_items, cancellations (order/item scope), discounts (manual/coupon/loyalty/comp), kitchen (prep/serve mins), customers (registered/guest/repeat), audits (make_unpaid/payment_change + order list), credit_outstanding |
| 2 | `insights-sales` | summary (revenue/tax/gst/vat/discount/aov/best_day/worst_day/peak_hour), daily[] (date/revenue/orders/tax/discount), channels[], payments[], hourly[] |
| 3 | `insights-items` | meta (totals per bucket), items[] with sold{qty,revenue,item_total,discount,service_charge,tax}, cancelled{qty,revenue}, comp{qty,revenue}, pending{qty,revenue}, credit{qty,revenue}, variations[], addons[], cancel_reasons[] |
| 4 | `insights-cancellations` | summary (order_scope/item_scope/total), by_day[], by_reason[], by_stage[], by_employee[], items[] (food_id,name,scope,qty,amount,stage,reason,cancel_date,cancelled_by,order_id) |

---

## Screen-by-Screen Assessment

### TAX (S23-S25)

| Screen | Data Needed | Available From | Gap? |
|--------|------------|---------------|:----:|
| **S23 — GST/VAT Detail** | Per-order GST amount, VAT amount, tax rate, inclusive/exclusive, per-item tax | `insights-sales.summary` has total_gst + total_vat. `insights-items.sold.tax` has per-item tax. | ⚠️ **PARTIAL** — No per-order tax breakdown. No tax rate per line. No inclusive/exclusive flag per item. |
| **S24 — Tax Slab Summary** | Revenue grouped by tax rate (5%, 12%, 18%, 28%) | `insights-items` has per-item tax amount but **NOT tax rate/slab** | ❌ **MISSING** — Need `tax_rate` or `tax_slab` per item in insights-items |
| **S25 — Inclusive vs Exclusive Mix** | Orders/revenue split by tax calculation method | None — profile has `restaurent_gst` (restaurant-level) but no per-order flag | ❌ **MISSING** — Need per-order or per-item `tax_calc` (inclusive/exclusive) field |

**Amendment needed:**
1. `insights-items`: Add `tax_rate`, `tax_type` (GST/VAT), `tax_calc` (inclusive/exclusive) per item
2. NEW: `insights-tax` endpoint OR add `tax_breakdown` section to `insights-sales`:
   ```json
   "tax_breakdown": {
     "by_slab": [{ "rate": 5, "orders": 40, "revenue": 50000, "tax": 2500 }, ...],
     "by_type": [{ "type": "GST", "amount": 7957 }, { "type": "VAT", "amount": 0 }],
     "by_calc": [{ "method": "exclusive", "orders": 160 }, { "method": "inclusive", "orders": 7 }]
   }
   ```

---

### DISCOUNTS (S26-S27)

| Screen | Data Needed | Available From | Gap? |
|--------|------------|---------------|:----:|
| **S26 — Discount Report** | Manual discount, coupon discount, loyalty discount, comp items — broken down by day and by employee | `insights-dashboard.discounts` has totals (manual/coupon/loyalty/comp). | ⚠️ **PARTIAL** — No daily breakdown of discounts. No per-employee discount breakdown. |
| **S27 — Coupon Usage** | Coupon codes used, frequency per code, discount per code, redemption count | `insights-dashboard.discounts` has `coupon_order_count` only | ❌ **MISSING** — Need per-coupon breakdown |

**Amendment needed:**
1. NEW: `insights-discounts` endpoint:
   ```json
   {
     "summary": { "manual_discount", "coupon_discount", "loyalty_discount", "comp_total" },
     "daily": [{ "date", "manual", "coupon", "loyalty", "comp" }],
     "by_employee": [{ "name", "manual_discount", "coupon_applied", "comp_count" }],
     "coupons": [{ "code", "type", "uses", "discount_total", "orders" }]
   }
   ```

---

### LOCATIONS & CHANNELS (S29-S31)

| Screen | Data Needed | Available From | Gap? |
|--------|------------|---------------|:----:|
| **S29 — Table-wise Sales** | Revenue per table_id/table_number, order count per table | `insights-sales.channels` has channel-level only (Dine-In/Takeaway/Delivery) — no table-level | ❌ **MISSING** — Need per-table breakdown |
| **S30 — Delivery Charge Report** | Delivery charge per order, total collected, by day | None in insights endpoints | ❌ **MISSING** — Need delivery charge data |
| **S31 — Room Transfer Trail** | Room-to-room transfer history, original room, target room, items transferred | None in insights endpoints | ❌ **MISSING** — Need room transfer data |

**Amendment needed:**
1. NEW: `insights-locations` endpoint:
   ```json
   {
     "by_table": [{ "table_id", "table_name", "orders", "revenue" }],
     "delivery_charges": { "total", "daily": [{ "date", "charge", "orders" }] },
     "room_transfers": [{ "order_id", "from_room", "to_room", "items", "transfer_date" }]
   }
   ```

---

### STAFF (S32-S33)

| Screen | Data Needed | Available From | Gap? |
|--------|------------|---------------|:----:|
| **S32 — Server/Captain Performance** | Orders per waiter, revenue per waiter, avg order value by server | `insights-cancellations.by_employee` has cancel data per employee only — no sales data per employee | ❌ **MISSING** — Need per-employee sales data |
| **S33 — Cashier Activity** | Orders per cashier, payment methods handled per cashier, settlement accuracy | None. BE-1 gap (partial payment split). | ❌ **MISSING** — Need per-cashier data + BE-1 fix |

**Amendment needed:**
1. NEW: `insights-staff` endpoint:
   ```json
   {
     "by_server": [{ "name", "orders", "revenue", "avg_order_value", "tips", "cancel_count" }],
     "by_cashier": [{ "name", "orders_processed", "cash_collected", "card_collected", "upi_collected" }]
   }
   ```
2. BE-1 fix needed for S33 (partial payment split)

---

### AUDIT LOG (S34-S35)

| Screen | Data Needed | Available From | Gap? |
|--------|------------|---------------|:----:|
| **S34 — Order Edit Audit** | Make-unpaid events, payment method changes — with order_id, actor, timestamp, amounts | `insights-dashboard.audits` has `orders[]` with `order_id, type, amount, by, prev_method, curr_method` | ✅ **SUFFICIENT** — Dashboard endpoint already returns audit order list |
| **S35 — Order Note Audit** | Food-level notes, cancel reason text per order | `insights-cancellations.items` has `reason` per cancel. No general food notes. | ⚠️ **PARTIAL** — Has cancel reasons but no food-level notes (food_level_notes field) |

**Amendment needed:**
1. S34: ✅ No change — use `insights-dashboard.audits.orders`
2. S35: Add `notes` field to `insights-cancellations.items` (food_level_notes). OR new section in dashboard endpoint: `order_notes[]`

---

### CUSTOMERS (S36-S37)

| Screen | Data Needed | Available From | Gap? |
|--------|------------|---------------|:----:|
| **S36 — Repeat Customer (RFM)** | Customer list with visit frequency, recency, total spend | `insights-dashboard.customers` has totals only (registered_count, repeat_pct) — no per-customer list | ❌ **MISSING** — Need per-customer breakdown |
| **S37 — Guest vs Registered Mix** | Daily split: registered vs guest orders | `insights-dashboard.customers` has totals only — no daily breakdown | ⚠️ **PARTIAL** — Has totals, no daily |

**Amendment needed:**
1. NEW: `insights-customers` endpoint:
   ```json
   {
     "summary": { "total_orders", "registered", "guest", "unique", "repeat", "repeat_pct" },
     "daily": [{ "date", "registered_orders", "guest_orders" }],
     "top_customers": [{ "customer_id", "name", "phone", "visits", "total_spend", "last_visit", "avg_order" }],
     "rfm_bands": [{ "band", "count", "revenue" }]
   }
   ```

---

## SUMMARY

| Screen | Existing Endpoint | Status | New Endpoint Needed? |
|--------|------------------|:------:|:--------------------:|
| **S23** GST/VAT Detail | insights-sales + insights-items | ⚠️ PARTIAL | Amend insights-items (add tax_rate, tax_type) |
| **S24** Tax Slab Summary | — | ❌ MISSING | NEW `insights-tax` OR amend insights-sales |
| **S25** Inclusive/Exclusive | — | ❌ MISSING | Amend insights-tax |
| **S26** Discount Report | insights-dashboard | ⚠️ PARTIAL | NEW `insights-discounts` (daily + by_employee) |
| **S27** Coupon Usage | — | ❌ MISSING | Amend insights-discounts (coupons section) |
| **S29** Table-wise Sales | — | ❌ MISSING | NEW `insights-locations` |
| **S30** Delivery Charge | — | ❌ MISSING | Amend insights-locations |
| **S31** Room Transfer | — | ❌ MISSING | Amend insights-locations |
| **S32** Server Performance | — | ❌ MISSING | NEW `insights-staff` |
| **S33** Cashier Activity | — | ❌ MISSING | Amend insights-staff + BE-1 fix |
| **S34** Order Edit Audit | insights-dashboard.audits | ✅ SUFFICIENT | None |
| **S35** Order Note Audit | insights-cancellations (partial) | ⚠️ PARTIAL | Amend cancellations (add notes) |
| **S36** Repeat Customer | — | ❌ MISSING | NEW `insights-customers` |
| **S37** Guest vs Registered | insights-dashboard.customers (partial) | ⚠️ PARTIAL | Amend insights-customers (daily) |

### Backend asks (sorted by effort)

| Priority | Ask | Screens Unblocked | Effort |
|:--------:|-----|:-----------------:|:------:|
| 1 | **Amend `insights-items`**: add `tax_rate`, `tax_type`, `tax_calc` per item | S23, S24, S25 | SMALL |
| 2 | **NEW `insights-tax`** endpoint (by_slab, by_type, by_calc) | S24, S25 | MEDIUM |
| 3 | **NEW `insights-discounts`** endpoint (daily, by_employee, coupons) | S26, S27 | MEDIUM |
| 4 | **NEW `insights-staff`** endpoint (by_server, by_cashier) | S32, S33 | MEDIUM |
| 5 | **NEW `insights-customers`** endpoint (daily, top_customers, rfm) | S36, S37 | MEDIUM |
| 6 | **NEW `insights-locations`** endpoint (by_table, delivery_charges, room_transfers) | S29, S30, S31 | LARGE |
| 7 | **Amend `insights-cancellations`**: add `notes` field | S35 | SMALL |
| 8 | **BE-1**: partial payment cash/card/upi split | S33 | MEDIUM |

### What FE can build TODAY (no backend changes)
- **S34** — Order Edit Audit ✅ (insights-dashboard.audits has everything)

### What FE can build with MINOR amendments (small backend changes)
- **S23** — GST/VAT Detail (if insights-items adds tax_rate)
- **S35** — Order Note Audit (if cancellations adds notes field)
