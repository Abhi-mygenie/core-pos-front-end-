# Backend API Contract — Insights Module — CONSOLIDATED v2.1

**From:** POS Frontend Team
**To:** Backend Team
**Date:** 2026-06-17 (v2.1 — incorporates CR-011 owner feedback session amendments)
**Status:** CONSOLIDATED v2.1 — adds owner-feedback-driven amendments C-V2.1-1, C-V2.1-3, C-V2.1-4 and backend briefs B-130-1 through B-130-8

**v2.1 CHANGELOG (2026-06-17):**
- C-V2.1-1: `insights-items.variations[].label` — sentinel `"default"` for no-variation items (F-1)
- C-V2.1-3: `insights-customers.rfm_bands[]` — publish band definition rules (F-7)
- C-V2.1-4: `insights-locations.room_transfers[]` — add `type: "tb"/"rm"` discriminator (F-9)
- B-130-1: Decompose partial payments into individual method legs (F-3)
- B-130-4: Stop emitting `variations[].label = "[]"` — use `"default"` sentinel (F-1)
- B-130-5: Populate `room_transfers[].items_count` correctly (currently always 0) (F-9b)
- B-130-7: Expose existing `type` discriminator (`tb`/`rm`) in `room_transfers[]` response (F-9)
- B-130-8: Contract amendment documenting `type` field semantics (F-9)

---

## TABLE OF CONTENTS

1. [Contract Status Summary](#1-contract-status-summary)
2. [Outstanding Backend Bugs (v1.1)](#2-outstanding-backend-bugs)
3. [Outstanding Contract Amendments (v1.1)](#3-outstanding-contract-amendments)
4. [Existing Endpoints — Current State](#4-existing-endpoints--current-state)
5. [Phase 3 — New Endpoints Required](#5-phase-3--new-endpoints-required)
6. [Phase 3 — Amendments to Existing Endpoints](#6-phase-3--amendments-to-existing-endpoints)
7. [Backend Brief — Open Items](#7-backend-brief--open-items)
8. [Priority Matrix & Sequencing](#8-priority-matrix--sequencing)
9. [Verification Data](#9-verification-data)

---

## 1. CONTRACT STATUS SUMMARY

### What's Delivered & Live (v1.0 — 2026-06-12)

All 4 aggregation endpoints are **LIVE on preprod** and serving data. FE has migrated to them (CR-049).

| # | Endpoint | HTTP Status | Schema Correct | Fields Present |
|---|----------|:---:|:---:|:---:|
| 1 | `POST insights-dashboard` | ✅ 200 | ✅ | ✅ 10 tile groups |
| 2 | `POST insights-sales` | ✅ 200 | ✅ | ✅ summary + daily + channels + payments + hourly |
| 3 | `POST insights-items` | ✅ 200 | ✅ | ✅ meta + 299 items (Palm House) |
| 4 | `POST insights-cancellations` | ✅ 200 | ✅ | ✅ summary + by_day + by_reason + by_stage + by_employee + items |

### What's Pending

| Category | Count | Details |
|----------|:-----:|---------|
| **Backend Bugs (v1.1)** | 2 | B-1 (cancel count), B-2 (ESC-3 tax on cancelled) |
| **Contract Amendments (v1.1)** | 4 | A-1, A-3, A-4, A-6 (TAB separation) |
| **Contract Amendments (v2.1)** | 3 | C-V2.1-1 (variations label), C-V2.1-3 (RFM bands), C-V2.1-4 (room_transfers type) |
| **New Phase 3 Endpoints** | 5 | insights-tax, insights-discounts, insights-staff, insights-customers, insights-locations |
| **Amendments to Existing Endpoints** | 2 | Add `tax_rate`/`tax_type` to insights-items; add `notes` to insights-cancellations |
| **Backend Brief Open Items (v1.0)** | 6 | Items #1–#8 from Backend Brief (some overlap with above) |
| **Backend Brief Open Items (v2.1 / B-130 series)** | 6 | B-130-1 (partial payments), B-130-2 (RFM rules), B-130-4 (variations), B-130-5 (items_count), B-130-7 (type field), B-130-8 (contract doc) |

---

## 2. OUTSTANDING BACKEND BUGS

### B-1: Cancel EP `order_scope.order_count` Uses `created_at` Instead of `cancel_at`

**Endpoint:** `insights-cancellations`
**Severity:** HIGH — cross-endpoint inconsistency visible to users
**Confirmed on:** Both restaurants (Palm House + cafe103), May 2026

| Evidence Field | Palm House | cafe103 | Attribution |
|----------------|:----------:|:-------:|:-----------:|
| `summary.order_scope.order_count` | 72 | 17 | ❌ `created_at` |
| `SUM(by_day.order_cancel_count)` | 72 | 17 | ❌ `created_at` |
| `SUM(by_employee.order_cancels)` | 157 | 54 | ✅ `cancel_at` |
| Dashboard EP `order_scope_count` | 157 | 54 | ✅ `cancel_at` |

**The same endpoint contradicts itself.** `summary + by_day` use `created_at`; `by_employee` uses `cancel_at`. Dashboard EP is correct.

**Fix:**
```
Cancel EP (insights-cancellations):
  summary.order_scope.order_count → count distinct orders where ANY cancelled
    line has cancel_at within the business-day range (with 45-day lookback).
  by_day[].order_cancel_count → count per business-day derived from cancel_at.
  by_employee[].order_cancels → already correct. No change.

Post-fix guarantee:
  summary.order_scope.order_count
  = SUM(by_day.order_cancel_count)
  = SUM(by_employee.order_cancels)
  = Dashboard EP order_scope_count
```

---

### B-2: Tax Not Zeroed on Cancelled Item Lines (ESC-3)

**Endpoint:** Data layer (affects `insights-items` → `insights-dashboard/cancellations` cross-check)
**Severity:** HIGH — financial data inconsistency
**Confirmed on:** Palm House May 2026

```
Dashboard + Cancel EP total_loss:   ₹84,291.50 (uses OPS-CANCEL §2.7 formula)
Items EP total_cancelled_revenue:   ₹85,048.50 (uses line-level sum §2.6)
Delta:                              ₹757 = tax still on 34/403 cancelled lines
```

Per frozen business rule (2026-06-02): *"If order is cancelled, tax, discount, service charge, delivery charge — all must be reverted."*

**Fix:** Zero `gst_tax_amount`, `vat_tax_amount`, `discount_on_food`, `service_charge` on ALL cancelled item lines. Already escalated as ESC-3 in `CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS_2026_06_02.md`.

No contract schema change needed. Once ESC-3 is fixed, Items EP cancel revenue and Dashboard/Cancel EP cancel loss will converge.

---

## 3. OUTSTANDING CONTRACT AMENDMENTS (v1.1)

All 4 amendments address TAB (credit) order separation to ensure cross-endpoint consistency.

### A-1: TAB Settlement Timestamp for Hourly Attribution

**Endpoint:** `insights-dashboard` → `revenue` object
**Current state:** `tab_settlements[]` array NOT present. `by_hour` does NOT include TAB settlement amounts.

**Evidence (Palm House May):**
```
revenue.total:       ₹14,09,418
SUM(by_hour.amount): ₹14,08,998
Gap:                 ₹420 = tab_settlement_total
```

**Change required:**
```json
"revenue": {
  "total": 1409418.00,
  "paid_order_count": 1690,
  "avg_order_value": 833.98,
  "tab_settlement_total": 420.00,
  "tab_settlements": [                    ← NEW ARRAY
    { "timestamp": "2026-05-15T14:30:00", "amount": 420.00 }
  ],
  "by_hour": [
    { "hour": 14, "amount": 185420 }     ← MUST include TAB settlement
  ]
}
```

**Guarantees:**
- `SUM(by_hour.amount) = revenue.total` — ALWAYS
- `SUM(channel_mix.revenue) + tab_settlement_total = revenue.total` — ALWAYS
- FE shows footnote: *"Revenue includes ₹X credit settled (not attributed to any channel)"*

**Effort:** SMALL

---

### A-3: Sales Tax Scope — Separate TAB Tax

**Endpoint:** `insights-sales` → `summary`
**Current state:** `tab_tax_total` field NOT present. `total_tax` includes TAB orders.

**Evidence (Palm House May):**
```
SUM(daily.tax):      ₹55,558
summary.total_tax:   ₹57,426
Gap:                 ₹1,868 = TAB order tax
```

**Change required:**
```
total_tax    = SUM(total_gst + total_vat) for NON-TAB fs=6 orders
tab_tax_total = SUM(total_gst + total_vat) for TAB fs=6 orders     ← NEW FIELD
daily[].tax  = non-TAB fs=6 (matching daily.revenue scope)
```

**Guarantee:** `SUM(daily.tax) = summary.total_tax` — ALWAYS

**Effort:** SMALL — split one SUM, add 1 field

---

### A-4: Dashboard Discount Scope — Separate TAB Discount

**Endpoint:** `insights-dashboard` → `discounts`
**Current state:** `tab_discount_total` field NOT present. `manual_discount` includes TAB orders.

**Evidence (Palm House May):**
```
Dashboard.manual_discount:   ₹51,892
Sales.total_discount:        ₹46,592
Gap:                         ₹5,300 = TAB order discounts
```

**Change required:**
```json
"discounts": {
  "manual_discount": 46591.60,         ← CHANGE: non-TAB only
  "coupon_discount": 0.00,
  "coupon_order_count": 0,
  "loyalty_discount": 0.00,
  "comp_item_total": 2320.00,
  "comp_item_count": 11,
  "total_leakage": 48911.60,
  "tab_discount_total": 5300.00        ← NEW FIELD
}
```

**Guarantee:** `Dashboard.manual_discount + coupon_discount = Sales.total_discount` — ALWAYS

**Effort:** SMALL

---

### A-6: Daily Discount Scope — Explicit Non-TAB

**Endpoint:** `insights-sales` → `daily[]`
**Current state:** Scope not explicit. Backend appears to return non-TAB (correct), but contract doesn't specify.

**Change:** Document + confirm existing behavior:
```
daily[].discount = non-TAB fs=6 orders — SUM(restaurant_discount_amount + coupon_discount_amount)
```

**Guarantee:** `SUM(daily.discount) = summary.total_discount` — ALWAYS (currently Δ≈0 — floating point only)

**Effort:** DOCUMENTATION ONLY (confirm current behavior is non-TAB)

---

## 4. EXISTING ENDPOINTS — CURRENT STATE (Validated 2026-06-15)

### 4.1 `insights-dashboard` — Response Keys

```
revenue:           { total, paid_order_count, avg_order_value, tab_settlement_total, by_hour[] }
channel_mix:       [{ channel, orders, revenue }]
payment_mix:       [{ method, orders, revenue }]
top_items:         [{ food_id, name, qty, revenue }]                   — top 5
cancellations:     { order_scope_count, order_scope_loss, item_scope_count, item_scope_loss,
                     total_count, total_loss, top_reason, top_reason_count }
discounts:         { manual_discount, coupon_discount, coupon_order_count, loyalty_discount,
                     comp_item_total, comp_item_count, total_leakage }
kitchen:           { avg_prep_minutes, avg_serve_minutes, sla_breach_count, has_prep_data }
customers:         { total_orders, registered_count, guest_count, unique_customers,
                     repeat_customers, repeat_pct }
audits:            { make_unpaid_count, payment_method_change_count, total, orders[] }
credit_outstanding: <number>
```

### 4.2 `insights-sales` — Response Keys

```
summary:  { total_revenue, total_orders, total_tax, total_gst, total_vat, total_discount,
            avg_order_value, tab_settlement_total, best_day, worst_day, peak_hour, active_days }
daily:    [{ date, revenue, orders, tax, discount, tab_settlement }]
channels: [{ channel, orders, revenue }]
payments: [{ method, orders, revenue }]
hourly:   [{ hour, revenue, orders }]
```

### 4.3 `insights-items` — Response Keys

```
meta:  { total_sold_qty, total_sold_revenue, total_cancelled_qty, total_cancelled_revenue,
         total_comp_qty, total_comp_revenue, total_pending_qty, total_pending_revenue,
         total_credit_qty, total_credit_revenue, product_count, category_count }
items: [{
  food_id, name, category_id, category_name, station,
  sold:          { qty, revenue, item_total, discount, service_charge, tax },
  cancelled:     { qty, revenue },
  complementary: { qty, revenue },
  pending:       { qty, revenue },
  credit:        { qty, revenue },
  order_charges_distributed, menu_price, avg_price_sold,
  variations:    [{ label, qty, revenue }],
  addons:        [{ name, count, rate_pct }],
  cancel_reasons: [{ reason, scope, count }]
}]
```

**⚠️ C-V2.1-1 AMENDMENT (2026-06-17 — F-1):** `variations[].label` sentinel rule:
- When an item has named variations, `label` is the variation name (e.g., `"single"`, `"multi"`, `"500ml"`, `"Large"`).
- When an item has **no variation** (or quantity tracked outside any variation), `label` MUST be the sentinel **`"default"`**.
- `label` MUST NEVER be `"[]"`, `null`, `""`, or `undefined`. Backend currently emits `"[]"` (literal stringified empty array) for ~82% of items — **this is a serialization bug** (see B-130-4).
- When an item has zero qty for a variation, omit the row entirely (don't send `qty: 0`).

**Fields NOT present (Phase 3 needs):** `tax_rate`, `tax_type`, `tax_calc` per item

### 4.4 `insights-cancellations` — Response Keys

```
summary:     { order_scope: { order_count, qty, loss }, item_scope: { line_count, qty, loss },
               total_qty, total_loss }
by_day:      [{ date, order_cancel_count, order_cancel_loss, item_cancel_count, item_cancel_loss }]
by_reason:   [{ reason, count, loss }]
by_stage:    [{ stage, count, loss }]
by_employee: [{ name, order_cancels, item_cancels, total_loss }]
items:       [{ food_id, name, scope, qty, amount, stage, reason, cancel_date, cancel_time,
               cancelled_by, order_id, order_date }]
```

**Fields NOT present (Phase 3 needs):** `notes` (food-level notes per cancelled item)

---

## 5. PHASE 3 — NEW ENDPOINTS REQUIRED

All 5 probed on 2026-06-15 — all return **HTTP 404** (not built yet).

### 5.1 `POST /api/v2/vendoremployee/report/insights-tax`

**Purpose:** Tax Slab Summary (S24) + Inclusive vs Exclusive Mix (S25). Partially serves GST/VAT Detail (S23).
**Screens unblocked:** S23, S24, S25

**Request:** Same pattern as other insights endpoints:
```json
{
  "from_date": "2026-05-01",
  "to_date": "2026-05-31",
  "business_day_start": "06:00",
  "business_day_end": "03:00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_gst": 57426.38,
      "total_vat": 0,
      "total_tax": 57426.38
    },
    "by_slab": [
      { "rate": 5, "orders": 40, "revenue": 50000, "tax": 2500 },
      { "rate": 12, "orders": 120, "revenue": 280000, "tax": 33600 },
      { "rate": 18, "orders": 85, "revenue": 150000, "tax": 27000 },
      { "rate": 28, "orders": 5, "revenue": 12000, "tax": 3360 }
    ],
    "by_type": [
      { "type": "GST", "amount": 57426.38 },
      { "type": "VAT", "amount": 0 }
    ],
    "by_calc": [
      { "method": "exclusive", "orders": 1650, "revenue": 1380000 },
      { "method": "inclusive", "orders": 40, "revenue": 29418 }
    ],
    "daily": [
      { "date": "2026-05-01", "gst": 1800, "vat": 0, "total": 1800 }
    ]
  }
}
```

**Source data:** Per-item tax rate from `food_details.tax` or item-level `item_gst`/`item_vat`. Tax calculation method from `food_details.tax_calc` or restaurant-level `restaurent_gst`. Scope: fs=6 non-TAB orders, `collect_bill` business day.

**Effort:** MEDIUM

---

### 5.2 `POST /api/v2/vendoremployee/report/insights-discounts`

**Purpose:** Discount Report (S26) + Coupon Usage (S27)
**Screens unblocked:** S26, S27

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "manual_discount": 46591.60,
      "coupon_discount": 0,
      "loyalty_discount": 0,
      "comp_total": 2320.00,
      "total": 48911.60
    },
    "daily": [
      { "date": "2026-05-01", "manual": 1200, "coupon": 0, "loyalty": 0, "comp": 100 }
    ],
    "by_employee": [
      { "name": "Raju", "manual_discount": 8500, "coupon_applied": 0, "comp_count": 3 }
    ],
    "coupons": [
      { "code": "FLAT10", "type": "percentage", "uses": 12, "discount_total": 4800, "orders": 12 }
    ]
  }
}
```

**Source data:** `restaurant_discount_amount` (manual), `coupon_discount_amount` + `coupon_code` (coupon), `loyalty_info.loyalty_discount` (loyalty), `complementary=1` lines (comp). Scope: fs=6 non-TAB, `collect_bill` business day. By_employee uses `employee_name` or `waiter_name`.

**Effort:** MEDIUM

---

### 5.3 `POST /api/v2/vendoremployee/report/insights-staff`

**Purpose:** Server/Captain Performance (S32) + Cashier Activity (S33)
**Screens unblocked:** S32, S33

**Response:**
```json
{
  "success": true,
  "data": {
    "by_server": [
      {
        "name": "Raju",
        "employee_id": 123,
        "orders": 145,
        "revenue": 210000,
        "avg_order_value": 1448.28,
        "tips": 4500,
        "cancel_count": 5
      }
    ],
    "by_cashier": [
      {
        "name": "Sita",
        "employee_id": 456,
        "orders_processed": 320,
        "cash_collected": 180000,
        "card_collected": 95000,
        "upi_collected": 45000
      }
    ]
  }
}
```

**Source data:** `waiter_name` for server performance, `employee_name` for cashier. Revenue/tips from order-level. Cancel count by joining with cancellation data. Payment split from `payment_method` classification (§2.4). **Note:** S33 (cashier partial payment legs) requires BE-1 fix (partial payment split exposed on order record) — see §7.

**Effort:** MEDIUM (by_server) + MEDIUM (by_cashier, needs BE-1 for partial legs)

---

### 5.4 `POST /api/v2/vendoremployee/report/insights-customers`

**Purpose:** Repeat Customer / RFM (S36) + Guest vs Registered Mix (S37)
**Screens unblocked:** S36, S37

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_orders": 1690,
      "registered_orders": 1200,
      "guest_orders": 490,
      "unique_customers": 890,
      "repeat_customers": 310,
      "repeat_pct": 35
    },
    "daily": [
      { "date": "2026-05-01", "registered_orders": 42, "guest_orders": 16 }
    ],
    "top_customers": [
      {
        "customer_id": "usr_123",
        "name": "John Doe",
        "phone": "+91XXXXXXXX",
        "visits": 12,
        "total_spend": 18500,
        "last_visit": "2026-05-28",
        "avg_order": 1541.67
      }
    ],
    "rfm_bands": [
      { "band": "Champions", "count": 45, "revenue": 245000 },
      { "band": "Loyal", "count": 120, "revenue": 380000 },
      { "band": "At Risk", "count": 85, "revenue": 110000 },
      { "band": "Dormant", "count": 640, "revenue": 674418 }
    ]
  }
}
```

**⚠️ C-V2.1-3 AMENDMENT (2026-06-17 — F-7):** RFM Band Definition — REQUIRED before owner can sign off S36:

The contract currently specifies the **shape** of `rfm_bands[]` but does NOT specify:
- What cutoff values assign a customer to each band (fixed thresholds or dynamic percentile-based?)
- Why only 4 bands? Standard RFM uses 8-11 bands (Champions, Loyal, Potential Loyalists, New, Promising, Need Attention, About-to-Sleep, At Risk, Can't Lose, Hibernating, Lost)
- Whether cutoffs are **fixed** (e.g., "Champion = last visit ≤ 14d AND visits ≥ 5 AND spend ≥ ₹5,000") or **dynamic per period** (quintile/quartile based)
- Whether guests (no user_id, no phone) are included or excluded from bands
- Minimum order count to be eligible for any band

**Backend MUST provide:**
1. A new `rfm_thresholds` object in the response documenting the actual cutoff values used for the selected period:
```json
"rfm_thresholds": {
  "R5": { "label": "≤ 14 days", "value": 14 },
  "F5": { "label": "≥ 5 visits", "value": 5 },
  "M5": { "label": "≥ ₹4,237", "value": 4237 },
  "band_rules": [
    { "band": "Champions", "R": "4-5", "F": "4-5", "M": "4-5" },
    { "band": "Loyal", "R": "any", "F": "4-5", "M": "3-5" },
    { "band": "At Risk", "R": "1-2", "F": "3-5", "M": "3-5" },
    { "band": "Dormant", "R": "1-2", "F": "1-2", "M": "1-2" }
  ]
}
```
2. Justification for the 4-band (vs standard 8-11 band) choice
3. Confirmation: guests included or excluded?

**Source data:** `user_id` + `cust_mobile` from order records. Guest = no `user_id` AND no `cust_mobile`. RFM = recency (days since last order), frequency (order count in range), monetary (total spend). Scope: fs=6 orders, `collect_bill` business day.

**Effort:** MEDIUM

---

### 5.5 `POST /api/v2/vendoremployee/report/insights-locations`

**Purpose:** Table-wise Sales (S29) + Delivery Charge Report (S30) + Room Transfer Trail (S31)
**Screens unblocked:** S29, S30, S31

**Response:**
```json
{
  "success": true,
  "data": {
    "by_table": [
      { "table_id": 45, "table_name": "T1", "orders": 82, "revenue": 134000 },
      { "table_id": 46, "table_name": "T2", "orders": 75, "revenue": 118000 }
    ],
    "delivery_charges": {
      "total": 12500,
      "daily": [
        { "date": "2026-05-01", "charge": 450, "orders": 6 }
      ]
    },
    "room_transfers": [
      {
        "order_id": "015823",
        "type": "rm",
        "from_room": "Room 101",
        "to_room": "Room 205",
        "items_count": 3,
        "transfer_date": "2026-05-15",
        "transfer_time": "14:30"
      }
    ]
  }
}
```

**⚠️ C-V2.1-4 AMENDMENT (2026-06-17 — F-9):** `room_transfers[]` — type discriminator + field semantics:

**NEW FIELD: `type`** (REQUIRED on every row)
| Value | Meaning | When to use |
|-------|---------|-------------|
| `"rm"` | Room-to-room transfer | Source order's location is a **room** (hotel restaurant) |
| `"tb"` | Table-to-table move | Source order's location is a **table** (regular restaurant) |

**Why:** Backend currently dumps ALL `transferToRoom` events into `room_transfers[]` regardless of restaurant topology. For cafe103 (no rooms), the `from_room`/`to_room` values are actually **TABLE IDs** (verified: match `by_table.table_id` 1:1). The `type` field already exists internally in the backend — it just needs to be exposed in the API response.

**Additional field fixes:**
- `from_room` / `to_room`: Should return the **name** (string, e.g., `"Room 101"` or `"Table 34"`) — not the numeric ID. If both are needed, return `from_room_id` + `from_room_name` and `to_room_id` + `to_room_name`.
- `items_count`: Currently returns `0` for ALL rows on both restaurants (see B-130-5). Must return actual count of items in the transferred order at transfer time.
- When `from_room` is `0` or `null` (order originally not assigned to any room/table), return `from_room_name: null` (FE will display as "—" / "Unassigned").

**FE usage:**
- Restaurants with `features.room = true`: FE shows both `type: "rm"` and `type: "tb"` rows (or filters by type in tabs).
- Restaurants with `features.room = false`: FE hides the Room Transfer menu entirely (sidebar gated). If shown, only `type: "tb"` rows would be relevant.

**Source data:** `table_name`/`table_id` from order records (Dine-In only). `delivery_charge` + `delivery_charge_gst` from order records (Delivery only). Room transfers from operations/transfer log. Scope: fs=6 orders, `collect_bill` business day.

**Effort:** LARGE (3 sub-domains: tables, delivery, rooms)

---

## 6. PHASE 3 — AMENDMENTS TO EXISTING ENDPOINTS

### 6.1 Amend `insights-items`: Add Tax Per-Item Fields

**Screens unblocked:** S23 (GST/VAT Detail)
**Current state:** Items have `sold.tax` (total tax amount) but NO rate, type, or inclusive/exclusive flag.

**Add to each item in `items[]`:**
```json
{
  "food_id": 107739,
  "name": "Zanzibar Burger",
  "tax_rate": 5,                  ← NEW: tax percentage (from food_details.tax)
  "tax_type": "GST",              ← NEW: "GST" or "VAT" (from food_details.tax_type)
  "tax_calc": "exclusive",        ← NEW: "exclusive" or "inclusive" (from food_details.tax_calc)
  "sold": { "qty": 10, "revenue": 4200, "item_total": 4000, "discount": 0, "service_charge": 0, "tax": 200 }
}
```

**Source:** `food_details` JSON blob already has `tax`, `tax_type`, `tax_calc` per item. Just expose them.

**Effort:** SMALL — extract 3 fields from existing `food_details` JSON

---

### 6.2 Amend `insights-cancellations`: Add Food-Level Notes

**Screens unblocked:** S35 (Order Note Audit)
**Current state:** Items have `reason` but no general food-level notes.

**Add to each item in `items[]`:**
```json
{
  "food_id": 116593,
  "name": "Butter Chicken",
  "reason": "Customer Changed Mind",
  "notes": "Extra spicy requested, customer complained"     ← NEW
}
```

**Source:** `order_details_table.food_level_notes` or equivalent field. If no notes field exists in data, return `null`.

**Effort:** SMALL

---

## 7. BACKEND BRIEF — OPEN ITEMS (from 2026-06-11)

These are separate asks from the Phase 3 endpoints. Some overlap.

| # | Brief Item | Status | Overlaps With | Priority |
|---|-----------|:------:|:-------------:|:--------:|
| **1** | Settlement `total_sale` formula — CONFIRM + explain Palm House 4-day residue | ⏳ AWAITING CONFIRM | — | HIGH |
| **2** | Balance-as-of-date for credit (TAB) customers — `as_of_date` param on `tap-waiter-list` | ⏳ NOT DELIVERED | BUG-127 | MEDIUM |
| **3** | TAB orders `f_order_status=6` at punch — CONFIRM semantics (DO NOT CHANGE) | ⏳ AWAITING CONFIRM | — | INFO |
| **4** | Range version of `daily-sales-revenue-report` — accept `{from, to}` | ⏳ NOT DELIVERED | Performance | LOW (CR-049 reduced need) |
| **5** | `operations[].order_cancel` — partial coverage + semantics | ⏳ AWAITING CONFIRM | — | MEDIUM |
| **6** | Partial payments — expose leg amounts on order record | ⏳ NOT DELIVERED | insights-staff S33 | MEDIUM |
| **7** | `payment_method='pending'` semantics — CONFIRM | ⏳ AWAITING CONFIRM | — | INFO |
| **8** | Data anomalies (ghost cash, wrong cancel_at, inconsistent zeroing) | ⏳ HYGIENE | B-2/ESC-3 (partial) | LOW |

---

## 7.1 BACKEND BRIEF — B-130 SERIES (from CR-011 Owner Feedback Session 2026-06-17)

These items were identified during the CR-011 owner feedback/smoke session and Investigation Round 2.

| # | Brief Item | Trigger | Status | Priority | Effort |
|---|-----------|---------|:------:|:--------:|:------:|
| **B-130-1** | **Decompose partial payments into individual method legs** in `insights-sales.payments[]`. Currently partial payments show as `method: "Partial", revenue: 0, orders: 684` — the ₹0 is misleading. Backend must split each partial order's revenue into its constituent legs (e.g., ₹500 cash + ₹300 UPI). This affects S14 (Channel & Payment donut) and S33 (Cashier Activity). Overlaps with Brief #6 above. | F-3 (confirmed by owner screenshot: ₹0 · 684 orders · 28.7% on S14 donut) | 🟢 READY | **P1** | M |
| **B-130-2** | **Publish RFM band rules** — document the exact cutoff values or algorithm used to assign customers to Champions/Loyal/At Risk/Dormant. Justify 4-band vs standard 8-11 band. Confirm fixed vs dynamic-per-period. Confirm guest inclusion/exclusion. Optionally return `rfm_thresholds` in response (see C-V2.1-3 in §5.4 above). | F-7 (owner asked "where is Champions coming from, what's the logic") | 🟢 READY | P2 | S–M |
| **B-130-4** | **Stop emitting `variations[].label = "[]"`** — standardize on sentinel `"default"` for items with no variation. Currently ~82% of items (157/199 for palmhouse May) have `label: "[]"` which is a PHP/Python `str([])` serialization mistake. See C-V2.1-1 in §4.3 above. | F-1 (owner: "variations reports `[]`? not clear this array") | 🟢 READY | P2 | S (1 line) |
| **B-130-5** | **Populate `room_transfers[].items_count` correctly** — currently returns `0` for ALL rows on both palmhouse (126 rows) and cafe103 (61 rows). Must return actual item count in the transferred order at transfer time. | F-9b (observed during F-9 investigation) | 🟢 READY | P2 | S |
| **B-130-7** | **Expose `type: "tb"/"rm"` in `room_transfers[]` response** — owner confirmed the discriminator already exists internally in the backend. Just needs to be included in the API response. See C-V2.1-4 in §5.5 above. | F-9 (owner: "we have identification as type tb or rm") | 🟢 READY | **P1** | **S** (field already exists internally) |
| **B-130-8** | **Contract amendment documentation** — document the `type` field semantics, clarify room_id vs room_name, specify when `from_room = 0/null`. Already written in C-V2.1-4 above. This brief is for backend team acknowledgment. | F-9 | 🟢 READY | **P1** | S |

**Deferred (owner decision):**

| # | Brief Item | Trigger | Status | Priority |
|---|-----------|---------|:------:|:--------:|
| ~~B-130-6~~ | ~~Decide & implement `handover_at` timestamp for takeaway orders~~ | ~~F-4 (Takeaway HANDOVER = 0 min)~~ | ⏸️ DEFERRED | ~~P2~~ |

**Moved to separate CR:**

| # | Brief Item | Trigger | Status |
|---|-----------|---------|:------:|
| B-130-3 | Wire S36 Customer Intelligence to CRM endpoint; fix phone field | F-8 (owner: "separate CR") | 🔵 → CR-011.C |

---

## 8. PRIORITY MATRIX & SEQUENCING

### Tier 1: Fix What's Delivered (Backend Bugs + Amendments)

These items fix the 4 endpoints already in production. FE is already wired to them.

| # | Item | Type | Effort | Screens Affected |
|---|------|------|:------:|:----------------:|
| **B-1** | Cancel EP `order_scope.order_count` wrong date | BUG FIX | SMALL | Cancellations screen |
| **B-2** | Tax not zeroed on cancelled lines (ESC-3) | BUG FIX | MEDIUM | Items ↔ Cancel cross-check |
| **A-1** | TAB settlement in `by_hour` | AMENDMENT | SMALL | Dashboard hourly chart |
| **A-3** | Separate TAB tax | AMENDMENT | SMALL | Sales daily tax |
| **A-4** | Separate TAB discount | AMENDMENT | SMALL | Dashboard ↔ Sales discount |
| **A-6** | Daily discount scope explicit | DOCUMENTATION | — | Sales daily |

### Tier 2: Small Amendments to Existing Endpoints (Phase 3 Quick Wins)

| # | Item | Type | Effort | Screens Unblocked |
|---|------|------|:------:|:-----------------:|
| **6.1** | Add `tax_rate`, `tax_type`, `tax_calc` to insights-items | AMEND | SMALL | S23 (GST/VAT Detail) |
| **6.2** | Add `notes` to insights-cancellations items | AMEND | SMALL | S35 (Order Note Audit) |

### Tier 3: New Phase 3 Endpoints

| # | Endpoint | Effort | Screens Unblocked | Dependencies |
|---|----------|:------:|:-----------------:|:------------:|
| **5.1** | `insights-tax` | MEDIUM | S23, S24, S25 | Needs 6.1 for full S23 |
| **5.2** | `insights-discounts` | MEDIUM | S26, S27 | None |
| **5.3** | `insights-staff` | MEDIUM | S32, S33 | Brief #6 (partial payments) for S33 |
| **5.4** | `insights-customers` | MEDIUM | S36, S37 | None |
| **5.5** | `insights-locations` | LARGE | S29, S30, S31 | None |

### Tier 4: Backend Brief Confirmations & Remaining Items

| # | Item | Type | Effort |
|---|------|------|:------:|
| **Brief #1** | Settlement formula CONFIRM | CONFIRM | — |
| **Brief #3** | TAB fs=6 semantics CONFIRM | CONFIRM | — |
| **Brief #5** | operations[].order_cancel CONFIRM | CONFIRM | — |
| **Brief #7** | payment_method='pending' CONFIRM | CONFIRM | — |
| **Brief #2** | Balance-as-of-date | FEATURE | SMALL |
| **Brief #4** | Range daily-sales-revenue-report | FEATURE | SMALL |
| **Brief #6** | Partial payment legs on order record | FEATURE | MEDIUM |
| **Brief #8** | Data anomalies | HYGIENE | SMALL |

### Tier 5: B-130 Series (CR-011 Owner Feedback — 2026-06-17)

**P1 items (do with Tier 1-2):**

| # | Item | Type | Effort | Screens Affected |
|---|------|------|:------:|:----------------:|
| **B-130-1** | Decompose partial payments into method legs | BUG FIX | MEDIUM | S14, S33 |
| **B-130-7** | Expose `type: tb/rm` in room_transfers[] | AMENDMENT | SMALL (field exists) | S31 |
| **B-130-8** | Contract doc for type field | DOCUMENTATION | — | S31 |

**P2 items (do with Tier 2-3):**

| # | Item | Type | Effort | Screens Affected |
|---|------|------|:------:|:----------------:|
| **B-130-2** | Publish RFM band rules | DOCUMENTATION + FEATURE | SMALL-MEDIUM | S36 |
| **B-130-4** | Fix variations label "[]" → "default" | BUG FIX | SMALL (1 line) | S15 |
| **B-130-5** | Fix room_transfers items_count = 0 | BUG FIX | SMALL | S31 |

### Recommended Sequencing (UPDATED 2026-06-17)

```
Sprint N (immediate):
  B-1 + B-2          → Fix delivered endpoints
  A-1 + A-3 + A-4    → Cross-endpoint consistency
  Brief #1,3,5,7     → Confirmations (no code, just answers)
  B-130-7 + B-130-8  → Expose type:tb/rm (SMALL — field exists internally)
  B-130-1             → Decompose partial payment legs (P1, unblocks S14 donut)

Sprint N+1:
  6.1 + 6.2          → Amend existing endpoints (quick wins, SMALL)
  5.1 (insights-tax)  → Unblocks 3 tax screens
  5.2 (insights-discounts) → Unblocks 2 discount screens
  B-130-4             → Fix variations label (1 line)
  B-130-5             → Fix room_transfers items_count

Sprint N+2:
  5.4 (insights-customers)  → Unblocks 2 customer screens
  5.3 (insights-staff)      → Unblocks 2 staff screens (needs Brief #6)
  Brief #2, #6              → Supporting features
  B-130-2                   → Publish RFM band rules (unblocks S36 sign-off)

Sprint N+3:
  5.5 (insights-locations)  → Unblocks 3 location screens (largest)
  Brief #4, #8              → Nice-to-haves
```

---

## 9. VERIFICATION DATA

### Cross-Endpoint Consistency Check (Palm House May 2026 — 2026-06-15)

| # | Check | Result | Notes |
|---|-------|:------:|-------|
| 1 | Revenue: Dashboard = Sales | ✅ ₹14,09,418 | Match |
| 2 | Orders: Dashboard = Sales | ✅ 1,690 | Match |
| 3 | Payment total = Revenue | ✅ | Match |
| 4 | Channel total + TAB settle = Revenue | ✅ ₹14,08,998 + ₹420 | Match |
| 5 | SUM(by_hour) = Revenue | ❌ Δ=₹420 | **A-1: TAB settle not in hourly** |
| 6 | SUM(daily.revenue) = Summary | ✅ | Match |
| 7 | SUM(daily.orders) = Summary | ✅ | Match |
| 8 | SUM(daily.tax) = Summary tax | ❌ Δ=₹1,868 | **A-3: TAB tax not separated** |
| 9 | SUM(daily.discount) = Summary discount | ✅ (Δ≈0) | Floating point only |
| 10 | Cancel loss: Dashboard = Cancel EP | ✅ ₹84,291.50 | Match |
| 11 | Cancel order count: Dashboard = Cancel EP | ❌ 157 vs 72 | **B-1: created_at vs cancel_at** |
| 12 | Items cancel rev = Dashboard cancel loss | ❌ Δ=₹757 | **B-2/ESC-3: tax on cancelled lines** |
| 13 | Dashboard discount = Sales discount | ❌ Δ=₹5,300 | **A-4: TAB discount not separated** |

### cafe103 Confirmation (May 2026)

| Check | Result |
|-------|:------:|
| B-1: Dashboard cancel count (54) vs Cancel EP (17) | ❌ BUG CONFIRMED |
| A-4: Dashboard discount includes TAB | ❌ CONFIRMED (no `tab_discount_total`) |

### Phase 3 Endpoints Probe (2026-06-15)

| Endpoint | HTTP Status | Exists? |
|----------|:----------:|:-------:|
| `insights-tax` | 404 | ❌ NOT BUILT |
| `insights-discounts` | 404 | ❌ NOT BUILT |
| `insights-staff` | 404 | ❌ NOT BUILT |
| `insights-customers` | 404 | ❌ NOT BUILT |
| `insights-locations` | 404 | ❌ NOT BUILT |

---

## APPENDIX: Screen-to-Endpoint Mapping (Complete)

| Screen | Endpoint | Status | Blocked On |
|--------|----------|:------:|------------|
| S1 Dashboard | `insights-dashboard` | ✅ LIVE (pending A-1, A-4) | — |
| S2 Sales | `insights-sales` | ✅ LIVE (pending A-3) | — |
| S3 Payments | `insights-sales` | ✅ LIVE | — |
| S4 Items & Menu | `insights-items` | ✅ LIVE | — |
| S5 Cancellations | `insights-cancellations` | ✅ LIVE (pending B-1) | — |
| S6 Order Ledger | `order-logs-report` (paginated) | ✅ LIVE | — |
| S23 GST/VAT Detail | `insights-items` + `insights-tax` | ⚠️ PARTIAL | Amend 6.1 + New 5.1 |
| S24 Tax Slab Summary | `insights-tax` | ❌ MISSING | New 5.1 |
| S25 Inclusive/Exclusive Mix | `insights-tax` | ❌ MISSING | New 5.1 |
| S26 Discount Report | `insights-discounts` | ❌ MISSING | New 5.2 |
| S27 Coupon Usage | `insights-discounts` | ❌ MISSING | New 5.2 |
| S29 Table-wise Sales | `insights-locations` | ❌ MISSING | New 5.5 |
| S30 Delivery Charge Report | `insights-locations` | ❌ MISSING | New 5.5 |
| S31 Room Transfer Trail | `insights-locations` | ❌ MISSING | New 5.5 |
| S32 Server Performance | `insights-staff` | ❌ MISSING | New 5.3 |
| S33 Cashier Activity | `insights-staff` | ❌ MISSING | New 5.3 + Brief #6 |
| S34 Order Edit Audit | `insights-dashboard.audits` | ✅ SUFFICIENT | — |
| S35 Order Note Audit | `insights-cancellations` | ⚠️ PARTIAL | Amend 6.2 |
| S36 Repeat Customer (RFM) | `insights-customers` | ❌ MISSING | New 5.4 |
| S37 Guest vs Registered | `insights-customers` | ❌ MISSING | New 5.4 |

### What FE Can Build TODAY (no backend changes)
- **S34** — Order Edit Audit ✅ (`insights-dashboard.audits` has everything)

### What FE Can Build with SMALL Amendments
- **S23** — GST/VAT Detail (needs 6.1: `tax_rate`/`tax_type` on items)
- **S35** — Order Note Audit (needs 6.2: `notes` field on cancellations)

---

## REFERENCE DOCUMENTS

| Document | Path | Purpose |
|----------|------|---------|
| Original Contract v1.0 | `/app/memory/BACKEND_API_CONTRACT_INSIGHTS_AGGREGATION.md` | Full endpoint specs + aggregation rules |
| Amendment v1.1 | `/app/memory/BACKEND_API_CONTRACT_INSIGHTS_AGGREGATION_AMENDMENT_V1_1.md` | 2 bugs + 4 amendments |
| Phase 3 Audit | `/app/memory/CR_011_PHASE3_ENDPOINT_SUFFICIENCY_AUDIT.md` | Screen-by-screen assessment |
| Backend Brief (Final) | `/app/memory/control/BACKEND_BRIEF_FINAL_2026_06_11.md` | 8 open items |
| ESC-3 Escalation | `/app/memory/memory/memory/change_requests/impact_analysis/CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS_2026_06_02.md` | Cancelled tax zeroing |
| Validation Evidence | `/app/memory/evidence/dashboard_probe.json`, `sales_probe.json`, `items_probe.json`, `cancellations_probe.json` | Live API responses (2026-06-15) |

---

*Consolidated Contract v2.1 — 2026-06-17. Updated with CR-011 owner feedback amendments (C-V2.1-1, C-V2.1-3, C-V2.1-4) and B-130 series backend briefs. Live-validated on Palm House (rid 541) + cafe103 (rid 644), May 2026 full month. "One document, one truth."*
