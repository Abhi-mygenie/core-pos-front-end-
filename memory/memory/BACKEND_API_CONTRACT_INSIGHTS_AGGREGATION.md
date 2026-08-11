# Backend API Contract — Insights Server-Side Aggregation

**From:** POS Frontend Team  
**To:** Backend Team  
**Date:** 2026-06-12  
**Priority:** P0 — Current architecture cannot scale beyond 2-week date ranges reliably  
**Status:** Contract DRAFT — awaiting backend review and feasibility sign-off

---

## 1. WHY THIS IS NEEDED

The Insights module currently downloads **raw order data** from `order-logs-report` and computes all aggregations client-side. This worked when restaurants had low volume, but it no longer scales:

| Date Range | Payload Size (cafe103) | Payload Size (Palm House) | API Calls | Load Time |
|---|---|---|---|---|
| 1 week | ~10 MB | ~10 MB | 8–36 | 3–5s |
| 1 month | **37.5 MB** | **40 MB** | 32–36 | 15–60s |
| 3 months | ~110 MB | ~120 MB | 32–36 | **Timeout** |
| 1 year | **~450 MB** | **~480 MB** | 32–365 | **Impossible** |

The Dashboard alone makes **36 API calls** for a 1-month range (3 order-logs-report calls + 31 daily-sales calls + cancellation-reasons + tap-waiter-list). Navigating between screens re-fetches everything from scratch.

**Root cause:** 77% of the payload is unused by the frontend. Each `order_details_table` item carries a full product snapshot in `food_details` (~1.6 KB) when only 7 fields (~100 bytes) are needed. `orders_table` has 128 fields; frontend uses 40. Operations and partial_payments are sent for all orders but only needed for cancelled/partial ones.

**The ask:** 4 new server-side aggregation endpoints that return pre-computed summaries. Total response size for ALL Insights screens: **~100–150 KB** (vs current ~450 MB). Any date range including 1 year loads in under 1 second.

---

## 2. SHARED CONCEPTS (apply to all endpoints)

### 2.1 Business Day

Every restaurant has a schedule defining operating hours. A "business day" for a given calendar date runs from `opening_time` on that date to `closing_time` on the next date (when closing crosses midnight).

**Example:** Restaurant open 06:00, close 03:00
- Business day "May 15" = `2026-05-15 06:00:00` → `2026-05-16 03:00:00`
- An order at `2026-05-16 01:30:00` belongs to the **May 15** business day

The frontend currently computes this from `restaurant.schedules`. The backend should apply the same logic.

**Request fields (all endpoints):**
```
business_day_start  string  "06:00"   Opening time HH:MM (from restaurant profile)
business_day_end    string  "03:00"   Closing time HH:MM (from restaurant profile)
```

If backend already knows the restaurant's schedule from the auth token, these can be omitted and derived server-side. Frontend will pass them as a safety net.

### 2.2 Order Filters (universal exclusions)

These apply to ALL endpoints unless explicitly stated otherwise:

| Filter | Rule | Reason |
|---|---|---|
| **Merge excluded** | `payment_method = 'Merge'` → skip entirely | Merge orders are housekeeping records (fs=3, amount=0). Including them inflates counts and contaminates cancel logic. |
| **TAB handling** | `payment_method = 'TAB'` → NOT revenue, but tracked separately | TAB = credit. Money hasn't been collected. Backend marks TAB as fs=6 at punch, but it's not realized revenue. See §3.2 for how each endpoint handles TAB. |
| **Room orders INCLUDED** | `order_in = 'RM'` or `'SRM'` or `payment_method = 'ROOM'` → include in all aggregations | Owner decision (H6=b): rooms are part of restaurant revenue everywhere. Not excluded. |
| **Zero-amount orders** | `order_amount = 0` and `f_order_status = 6` → include in counts but flag | 100%-discounted orders. Count in order count, include in revenue (₹0), flag for AOV exclusion. |

### 2.3 Channel Classification

Classify each order into one channel:

```
IF order_in IN ('RM', 'SRM') OR payment_method = 'ROOM'  →  "Room"
ELSE IF order_type ILIKE '%delivery%' OR order_type ILIKE '%home_delivery%'  →  "Delivery"  
ELSE IF order_type ILIKE '%takeaway%' OR order_type ILIKE '%take_away%'  →  "Takeaway"
ELSE  →  "Dine-In"
```

### 2.4 Payment Method Classification

Map `payment_method` to display buckets:

| `payment_method` (case-insensitive) | Bucket |
|---|---|
| `cash`, `cash_on_delivery` | `"Cash"` |
| `card`, `credit_card`, `debit_card` | `"Card"` |
| `upi`, `gpay`, `phonepe`, `paytm` | `"UPI"` |
| `room`, `ROOM` | `"Room Bill"` |
| `partial` | `"Partial"` |
| `zomato_gold` | `"Zomato Gold"` |
| Contains `razorpay` + `card` | `"Card"` |
| Contains `razorpay` (without card) | `"UPI"` |
| Contains `upi` | `"UPI"` |
| Contains `card` | `"Card"` |
| Contains `cash` | `"Cash"` |
| `tab` | **EXCLUDED from payment mix** (handled as Credit) |
| `transfertoroom` | **EXCLUDED** |
| `pending` | **EXCLUDED** (unpaid) |
| `cancel`, `cancelled`, `merge` | **EXCLUDED** |
| Anything else | `"Other"` (log the unknown value) |

### 2.5 Cancellation Stage Classification

Map `order_details_table.cancel_type` to display stages:

| `cancel_type` (case-insensitive) | Stage |
|---|---|
| `preparing` | `"Before Cooking"` |
| `serve`, `pre-serve` | `"Before Serving"` |
| `ready`, `post-serve` | `"After Serving"` |
| `order` | `"Order"` |
| null / empty / unknown | `"Unknown"` |

### 2.6 Cancelled Line Value Formula

For each cancelled item line (`food_status = '3'`):

```
is_comp = (complementary = '1' OR complementary = 1)

IF is_comp:
    item_total = (complementary_price OR unit_price) × quantity
ELSE:
    item_total = unit_price × quantity + total_add_on_price + total_variation_price

discount = discount_on_food        -- backend-allocated per-line discount
service_charge = service_charge    -- per-line service charge
tax = gst_tax_amount               -- holds total tax (GST + VAT combined)

value = item_total - discount + service_charge + tax
```

**Note:** On all 823 verified cancelled lines across both restaurants (Mar–Jun 2026), `discount_on_food` and `service_charge` were 0 on cancelled lines. The formula includes them for correctness but they should always be 0 in practice.

### 2.7 Cancelled Order Value (OPS-CANCEL rule)

For fully-cancelled orders (`f_order_status = 3`), the display value is:

```
IF operations[] contains an entry where operation = 'order_cancel' AND previous_order_amount > 0:
    value = previous_order_amount    -- tax-inclusive, captured at cancel time
ELSE:
    value = SUM of cancelled line values (§2.6)    -- line consolidation fallback
```

`previous_order_amount` exists on ~25% of cancelled orders. Line consolidation is the fallback.

### 2.8 Sold Item Line Value Formula (for Items & Menu)

For each sold/pending/credit item line:

```
is_comp = (complementary = '1' OR complementary = 1)

IF is_comp:
    item_total = (complementary_price OR unit_price) × quantity
ELSE:
    item_total = unit_price × quantity + total_add_on_price + total_variation_price

discount = discount_on_food
service_charge = service_charge
tax = gst_tax_amount               -- total tax (GST + VAT combined)

subtotal = item_total - discount + service_charge
total_revenue = subtotal + tax
```

### 2.9 Item Bucket Classification

Each non-cancelled item line belongs to exactly one bucket (evaluated in priority order):

```
1. Cancelled:      food_status = '3'
2. Complementary:  complementary = '1' OR complementary = 1  (AND not cancelled)
3. Credit:         parent order payment_method = 'TAB'  (AND not cancelled, not comp)
4. Sold:           parent order f_order_status = 6  (AND not cancelled, not comp, not TAB)
5. Pending:        everything else (f_order_status ≠ 6, not TAB, not cancelled, not comp)
```

---

## 3. ENDPOINT CONTRACTS

### 3.1 `POST /api/v2/vendoremployee/report/insights-dashboard`

**Purpose:** Serves the Dashboard screen — 8 tile groups in one response.  
**Replaces:** 3 order-logs-report calls + 31 daily-sales calls + cancellation-reasons + tap-waiter-list = **36 API calls, ~150 MB**

#### Request

```json
{
  "from_date": "2026-05-01",
  "to_date": "2026-05-31",
  "business_day_start": "06:00",
  "business_day_end": "03:00"
}
```

All fields required. Dates are `YYYY-MM-DD`. Times are `HH:MM`.

#### Response

```json
{
  "success": true,
  "data": {
    "revenue": {
      "total": 2534440.00,
      "paid_order_count": 1847,
      "avg_order_value": 1365.22,
      "tab_settlement_total": 12500.00,
      "by_hour": [
        { "hour": 0, "amount": 2300.00 },
        { "hour": 1, "amount": 1100.00 },
        { "hour": 9, "amount": 45000.00 },
        { "hour": 10, "amount": 78000.00 },
        { "hour": 13, "amount": 210000.00 },
        { "hour": 14, "amount": 185000.00 }
      ]
    },

    "channel_mix": [
      { "channel": "Dine-In", "orders": 1200, "revenue": 1800000.00 },
      { "channel": "Takeaway", "orders": 400, "revenue": 500000.00 },
      { "channel": "Delivery", "orders": 200, "revenue": 180000.00 },
      { "channel": "Room", "orders": 47, "revenue": 54440.00 }
    ],

    "payment_mix": [
      { "method": "Cash", "orders": 800, "revenue": 1100000.00 },
      { "method": "Card", "orders": 500, "revenue": 750000.00 },
      { "method": "UPI", "orders": 400, "revenue": 550000.00 },
      { "method": "Room Bill", "orders": 47, "revenue": 54440.00 },
      { "method": "Partial", "orders": 12, "revenue": 45000.00 },
      { "method": "Zomato Gold", "orders": 5, "revenue": 22000.00 },
      { "method": "Credit", "orders": 5, "revenue": 12500.00 }
    ],

    "top_items": [
      { "food_id": 116593, "name": "Butter Chicken", "qty": 245, "revenue": 98000.00 },
      { "food_id": 116791, "name": "Paneer Tikka", "qty": 189, "revenue": 66150.00 },
      { "food_id": 116729, "name": "Dal Makhani", "qty": 167, "revenue": 33400.00 },
      { "food_id": 116619, "name": "Naan", "qty": 520, "revenue": 31200.00 },
      { "food_id": 116888, "name": "Biryani", "qty": 142, "revenue": 49700.00 }
    ],

    "cancellations": {
      "order_scope_count": 17,
      "order_scope_loss": 28226.00,
      "item_scope_count": 107,
      "item_scope_loss": 25656.00,
      "total_count": 124,
      "total_loss": 53882.00,
      "top_reason": "Customer Changed Mind",
      "top_reason_count": 34
    },

    "discounts": {
      "manual_discount": 45000.00,
      "coupon_discount": 12000.00,
      "coupon_order_count": 15,
      "loyalty_discount": 8000.00,
      "comp_item_total": 5600.00,
      "comp_item_count": 12,
      "total_leakage": 70600.00
    },

    "kitchen": {
      "avg_prep_minutes": 8.5,
      "avg_serve_minutes": 3.2,
      "sla_breach_count": 14,
      "has_prep_data": true
    },

    "customers": {
      "total_orders": 1847,
      "registered_count": 1200,
      "guest_count": 647,
      "unique_customers": 890,
      "repeat_customers": 310,
      "repeat_pct": 35
    },

    "audits": {
      "make_unpaid_count": 3,
      "payment_method_change_count": 7,
      "total": 10,
      "orders": [
        {
          "order_id": "012580",
          "type": "make_unpaid",
          "amount": 120.00,
          "by": "Raju",
          "prev_method": "card",
          "curr_method": ""
        }
      ]
    },

    "credit_outstanding": 627428.00
  }
}
```

#### Aggregation Rules

| Tile | Date Attribution | Source Filter | Value |
|---|---|---|---|
| **Revenue** (total, hourly, AOV) | `collect_bill` business day | fs=6, pm≠Merge, pm≠TAB | `SUM(order_amount)` + tab settlements |
| **Channel Mix** | `collect_bill` business day | Same as Revenue | Per §2.3 |
| **Payment Mix** | `collect_bill` business day | Same as Revenue | Per §2.4, plus Credit group from tab settlements |
| **Top Items** | `created_at` business day | fs=6, non-cancelled, non-comp lines | `SUM(price)` per food_id, top 5 by revenue. `name` from `food_details.name` |
| **Cancellations** | `cancel_at` business day (with 45-day lookback from `from_date`) | Per §2.6, §2.7. Merge excluded. | Order-scope: §2.7. Item-scope: §2.6. Count = qty (not lines). |
| **Discounts** | `created_at` business day | fs=6 orders | `manual_discount = SUM(restaurant_discount_amount)`. `coupon_discount = SUM(coupon_discount_amount)`. `loyalty_discount = SUM(loyalty_info.loyalty_discount)`. Comp: non-cancelled lines with `complementary=1`, value = `complementary_price × qty`. |
| **Kitchen** | `created_at` business day | fs=6, non-cancelled lines with `ready_at` | Prep = `ready_at - created_at` (minutes). Serve = `serve_at - ready_at` (minutes). Exclude if < 0 or > 300 min. SLA breach = total > 25 min. |
| **Customers** | `created_at` business day | fs=6 orders | Guest = no `user_id` and no `cust_mobile`. Registered = has either. Unique = distinct `user_id` or `cust_mobile`. Repeat = unique customers with >1 order in range. |
| **Audits** | `created_at` business day | All orders (not just fs=6) | Scan `operations[]` for `operation = 'make_unpaid'` or `'payment_method_change'`. Include order_id, amount, employee name, prev/curr method. |
| **Credit Outstanding** | As of today (ignore date range) | From `tap-waiter-list` → `restaurant-tap-summary.balance` | Single number. |

**Tab Settlement Logic:**
- For each day in `[from_date, to_date]`, read `daily-sales-revenue-report` → `paid_revenue_method.tab_payment`
- Sum `Credit Cash + Credit Card + Credit UPI` per day = settlement total for that day
- Add total settlements to revenue. Show as "Credit" in payment mix.
- `by_hour` entry not needed for settlements (no hourly granularity available).

---

### 3.2 `POST /api/v2/vendoremployee/report/insights-sales`

**Purpose:** Serves Sales + Payments screens (same data, different UI).  
**Replaces:** 32 API calls × 2 screens = 64 calls, ~75 MB each

#### Request

```json
{
  "from_date": "2026-05-01",
  "to_date": "2026-05-31",
  "business_day_start": "06:00",
  "business_day_end": "03:00"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_revenue": 2534440.00,
      "total_orders": 1847,
      "total_tax": 185000.00,
      "total_gst": 162000.00,
      "total_vat": 23000.00,
      "total_discount": 65000.00,
      "avg_order_value": 1365.22,
      "tab_settlement_total": 12500.00,
      "best_day": { "date": "2026-05-15", "revenue": 98000.00, "orders": 72 },
      "worst_day": { "date": "2026-05-03", "revenue": 42000.00, "orders": 28 },
      "peak_hour": { "hour": 13, "revenue": 210000.00, "orders": 148 },
      "active_days": 31
    },

    "daily": [
      {
        "date": "2026-05-01",
        "revenue": 82000.00,
        "orders": 58,
        "tax": 6100.00,
        "discount": 2100.00,
        "tab_settlement": 0.00
      },
      {
        "date": "2026-05-02",
        "revenue": 75000.00,
        "orders": 52,
        "tax": 5600.00,
        "discount": 1800.00,
        "tab_settlement": 500.00
      }
    ],

    "channels": [
      { "channel": "Dine-In", "orders": 1200, "revenue": 1800000.00 },
      { "channel": "Takeaway", "orders": 400, "revenue": 500000.00 },
      { "channel": "Delivery", "orders": 200, "revenue": 180000.00 },
      { "channel": "Room", "orders": 47, "revenue": 54440.00 }
    ],

    "payments": [
      { "method": "Cash", "orders": 800, "revenue": 1100000.00 },
      { "method": "Card", "orders": 500, "revenue": 750000.00 },
      { "method": "UPI", "orders": 400, "revenue": 550000.00 },
      { "method": "Room Bill", "orders": 47, "revenue": 54440.00 },
      { "method": "Partial", "orders": 12, "revenue": 45000.00 },
      { "method": "Credit", "orders": 5, "revenue": 12500.00 }
    ],

    "hourly": [
      { "hour": 0, "revenue": 2300.00, "orders": 2 },
      { "hour": 9, "revenue": 45000.00, "orders": 32 },
      { "hour": 10, "revenue": 78000.00, "orders": 55 },
      { "hour": 13, "revenue": 210000.00, "orders": 148 }
    ]
  }
}
```

#### Aggregation Rules

- **Revenue attribution:** `collect_bill` business day (same as Dashboard revenue)
- **Daily breakdown:** One entry per business day. `date` = `YYYY-MM-DD` of the business day. Revenue = `SUM(order_amount)` for non-TAB fs=6 orders whose `collect_bill` falls in that business day. `tab_settlement` = Credit Cash + Card + UPI from `daily-sales-revenue-report` for that calendar date.
- **Tax:** `total_gst = SUM(total_gst_tax_amount)`, `total_vat = SUM(total_vat_tax_amount)` from order level, for all fs=6 orders (including TAB — TAB GST stays in tax per H5).
- **Discount:** `SUM(restaurant_discount_amount + coupon_discount_amount)` from non-TAB fs=6 orders.
- **Channels / Payments / Hourly:** Same rules as Dashboard (§3.1). Hour is extracted from `collect_bill` timestamp.
- **Best/worst day:** From the daily array. Worst = lowest revenue among days with revenue > 0.
- **Peak hour:** Hour with highest revenue.

---

### 3.3 `POST /api/v2/vendoremployee/report/insights-items`

**Purpose:** Serves Items & Menu screen — per-item breakdown with 5 buckets.  
**Replaces:** 1 order-logs-report call (~75 MB with 45-day cancel lookback) + products + categories

#### Request

```json
{
  "from_date": "2026-05-01",
  "to_date": "2026-05-31",
  "business_day_start": "06:00",
  "business_day_end": "03:00",
  "include_drill": true
}
```

`include_drill`: if `false`, omit `variations`, `addons`, `cancel_reasons` from each item (lighter response for summary views).

#### Response

```json
{
  "success": true,
  "data": {
    "meta": {
      "total_sold_qty": 8996,
      "total_sold_revenue": 2530613.27,
      "total_cancelled_qty": 107,
      "total_cancelled_revenue": 25656.00,
      "total_comp_qty": 45,
      "total_comp_revenue": 18000.00,
      "total_pending_qty": 12,
      "total_pending_revenue": 4800.00,
      "total_credit_qty": 162,
      "total_credit_revenue": 230932.11,
      "product_count": 465,
      "category_count": 28
    },

    "items": [
      {
        "food_id": 116593,
        "name": "Butter Chicken",
        "category_id": 2461,
        "category_name": "Main Course",
        "station": "Kitchen 1",

        "sold": {
          "qty": 245,
          "item_total": 90650.00,
          "discount": 1200.00,
          "service_charge": 450.00,
          "tax": 4532.00,
          "revenue": 94432.00
        },
        "cancelled": {
          "qty": 8,
          "revenue": 3200.00
        },
        "complementary": {
          "qty": 3,
          "revenue": 1200.00
        },
        "pending": {
          "qty": 0,
          "revenue": 0.00
        },
        "credit": {
          "qty": 12,
          "revenue": 4800.00
        },

        "order_charges_distributed": 850.45,
        "menu_price": 400.00,
        "avg_price_sold": 385.44,

        "variations": [
          { "label": "Half", "qty": 80, "revenue": 32000.00 },
          { "label": "Full", "qty": 165, "revenue": 62432.00 }
        ],
        "addons": [
          { "name": "Extra Gravy", "count": 45, "rate_pct": 18 },
          { "name": "Cheese", "count": 12, "rate_pct": 5 }
        ],
        "cancel_reasons": [
          { "reason": "Too Spicy", "scope": "item", "count": 5 },
          { "reason": "Kitchen Closed", "scope": "order", "count": 3 }
        ]
      }
    ]
  }
}
```

#### Aggregation Rules

- **Date attribution:** `created_at` business day (punch date — NOT collection date). This is different from Sales/Dashboard.
- **Order filter:** Fetch all orders where `created_at` falls in the business-day range. For cancelled items, also fetch orders created up to 45 days before `from_date` (so cancellations of older orders whose `cancel_at` falls in the range are captured).
- **Bucket classification:** Per §2.9.
- **Line value (Sold/Pending/Credit):** Per §2.8.
- **Line value (Cancelled):** Per §2.6. Attributed by `cancel_at` (not `created_at`).
- **Line value (Complementary):** `complementary_price × qty` (billed keys are zeroed by backend). If `complementary_price` is 0 or null, use `unit_price`.
- **Order-level charge distribution (Pass 2):** For each order that has sold+credit lines with revenue > 0:
  ```
  order_charges = delivery_charge + tip_amount + round_up
  For each sold/credit line:
      share = line.total_revenue / order_sold_line_revenue_sum
      distributed = order_charges × share
  ```
  Add `distributed` to the item's `order_charges_distributed` field (accumulates across all orders).
- **`name`:** From `food_details.name` on the item line (JSON string — parse it).
- **`category_id`:** From `food_details.category_id`.
- **`category_name`:** Resolve from categories table (or include in response if available).
- **`station`:** From `order_details_table.station`.
- **`menu_price`:** From products table `price` field, or `food_details.price`, or `complementary_price`, or `unit_price` (first non-zero).
- **`avg_price_sold`:** `sold.revenue / sold.qty` (0 if qty=0).
- **`variations`:** Group by `order_details_table.variation` label. Sum qty and revenue per label.
- **`addons`:** Parse `order_details_table.add_ons` (JSON string). Count occurrences per addon name. `rate_pct = round((addon_count / total_sold_lines_for_this_item) × 100)`.
- **`cancel_reasons`:** Group by `cancel_reason_text` or cancellation reason lookup. Include scope (`"order"` if parent order is fs=3, else `"item"`).

---

### 3.4 `POST /api/v2/vendoremployee/report/insights-cancellations`

**Purpose:** Serves Cancellations screen — detailed cancellation breakdown.  
**Replaces:** 1 order-logs-report call (~75 MB with 45-day lookback)

#### Request

```json
{
  "from_date": "2026-05-01",
  "to_date": "2026-05-31",
  "business_day_start": "06:00",
  "business_day_end": "03:00",
  "include_line_items": true
}
```

`include_line_items`: if `false`, omit the `items[]` array (only return summary + breakdowns).

#### Response

```json
{
  "success": true,
  "data": {
    "summary": {
      "order_scope": {
        "order_count": 17,
        "qty": 85,
        "loss": 28226.00
      },
      "item_scope": {
        "line_count": 83,
        "qty": 107,
        "loss": 25656.00
      },
      "total_qty": 192,
      "total_loss": 53882.00
    },

    "by_day": [
      {
        "date": "2026-05-01",
        "order_cancel_count": 2,
        "order_cancel_loss": 3200.00,
        "item_cancel_count": 5,
        "item_cancel_loss": 1800.00
      }
    ],

    "by_reason": [
      { "reason": "Customer Changed Mind", "count": 34, "loss": 12000.00 },
      { "reason": "Kitchen Closed", "count": 18, "loss": 8500.00 },
      { "reason": "Too Long Wait", "count": 12, "loss": 4200.00 },
      { "reason": "Others", "count": 8, "loss": 2500.00 },
      { "reason": "No reason provided", "count": 4, "loss": 1200.00 }
    ],

    "by_stage": [
      { "stage": "Before Cooking", "count": 90, "loss": 22000.00 },
      { "stage": "Before Serving", "count": 60, "loss": 18000.00 },
      { "stage": "After Serving", "count": 30, "loss": 12000.00 },
      { "stage": "Order", "count": 12, "loss": 1882.00 }
    ],

    "by_employee": [
      { "name": "Raju", "order_cancels": 5, "item_cancels": 12, "total_loss": 8500.00 },
      { "name": "Sita", "order_cancels": 2, "item_cancels": 8, "total_loss": 4200.00 }
    ],

    "items": [
      {
        "food_id": 116593,
        "name": "Butter Chicken",
        "scope": "item",
        "qty": 4,
        "amount": 1600.00,
        "stage": "Before Cooking",
        "reason": "Customer Changed Mind",
        "cancel_date": "2026-05-03",
        "cancel_time": "14:30",
        "cancelled_by": "Raju",
        "order_id": "012580",
        "order_date": "2026-05-03"
      }
    ]
  }
}
```

#### Aggregation Rules

- **Date attribution:** `cancel_at` (the moment the cancellation happened), NOT `created_at`. Use business-day logic to bucket the cancel timestamp.
- **45-day lookback:** Fetch orders created from `from_date - 45 days` to `to_date + 1 day`. Filter cancelled items by `cancel_at` within the requested business-day range. This captures cancellations of orders punched before the range (max observed gap: 33 days across 4 months of data).
- **Scope classification:**
  - **Order-scope:** `f_order_status = 3` OR `payment_method IN ('Cancel', 'cancelled')`. BUT exclude `payment_method = 'Merge'` (merge also has fs=3). Value per §2.7 (OPS-CANCEL rule). Only include if at least one cancelled item line has `cancel_at` within range.
  - **Item-scope:** Individual lines with `food_status = '3'` in orders that are NOT order-scope cancelled. Filter each line by `cancel_at` within range.
- **Counting:** `qty` = `SUM(quantity)` of cancelled lines. NOT line count (an item with qty=4 counts as 4 cancellations).
- **Line value:** Per §2.6.
- **Order value:** Per §2.7 (OPS-CANCEL: `operations[].order_cancel.previous_order_amount` when present, else line consolidation).
- **by_day:** Business day derived from `cancel_at`. One entry per day. Order-scope: count once per order on the day of its first cancelled line's `cancel_at`. Item-scope: count per line.
- **by_reason:**
  - Order-scope: `orders_table.cancellation_reason`
  - Item-scope: Resolve `order_details_table.reason_type` against the `cancellation-reasons` table to get the display string. If `reason_type` is null, use `cancel_reason_text` or `"No reason provided"`.
- **by_stage:** Per §2.5, based on `order_details_table.cancel_type`.
- **by_employee:** `order_details_table.cancel_by_name`. Sum per unique name.
- **items[]:** Flat list of all cancelled item lines within range. Each line includes food_id, name (from `food_details.name`), scope, qty, amount (per §2.6), stage, reason, cancel_date/time (from `cancel_at`), cancelled_by (`cancel_by_name`), parent order_id (`restaurant_order_id`).

---

## 4. ORDER LEDGER — FIELD SELECTION + PAGINATION

The Order Ledger displays raw order rows in a table with drill-down. It **cannot** use aggregation — it needs actual order data. Instead, we need the existing `order-logs-report` endpoint enhanced with:

### 4.1 Pagination

```json
POST /api/v2/vendoremployee/report/order-logs-report
{
  "sort_by": "collect_bill",
  "from_date": "2026-05-01",
  "to_date": "2026-05-31",
  "page": 1,
  "limit": 100
}
```

**Response additions:**
```json
{
  "order": [ ...100 orders... ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total_orders": 2264,
    "total_pages": 23
  }
}
```

### 4.2 Field Selection (optional, for further optimization)

```json
{
  "sort_by": "collect_bill",
  "from_date": "2026-05-01",
  "to_date": "2026-05-31",
  "fields": {
    "orders_table": [
      "id", "restaurant_order_id", "created_at", "collect_bill", "updated_at",
      "f_order_status", "payment_method", "payment_status", "payment_type",
      "order_amount", "order_in", "order_type", "order_sub_total_amount",
      "delivery_charge", "delivery_charge_gst", "tip_amount", "tip_tax_amount",
      "round_up", "table_name", "waiter_name", "employee_name",
      "restaurant_discount_amount", "coupon_discount_amount", "coupon_code",
      "cancellation_reason", "cancel_at",
      "total_gst_tax_amount", "total_vat_tax_amount", "service_gst_tax_amount",
      "discount_value", "order_discount", "order_discount_type",
      "comunity_discount", "discount_member_category",
      "user_id", "user_name", "cust_mobile",
      "transaction_reference", "razorpay_order_id"
    ],
    "order_details_table": [
      "food_id", "food_status", "quantity", "unit_price", "price",
      "total_add_on_price", "total_variation_price", "discount_on_food",
      "service_charge", "gst_tax_amount", "vat_tax_amount",
      "complementary", "complementary_price",
      "cancel_at", "cancel_by_name", "cancel_reason_text", "cancel_type",
      "add_ons", "variation", "station", "created_at",
      "item_gst", "item_vat",
      "ready_at", "serve_at"
    ],
    "food_details_fields": [
      "name", "category_id", "price", "give_discount",
      "tax", "tax_type", "tax_calc"
    ],
    "include_operations": true,
    "include_partial_payments": true
  }
}
```

If `fields` is omitted, return all fields (backward compatible). If `food_details_fields` is provided, trim the `food_details` JSON blob to only those keys before including in response.

**Expected reduction:** 37.5 MB → 8.8 MB per month (77% savings). With pagination at 100 orders/page: ~400 KB per page.

---

## 5. RESPONSE SIZE COMPARISON

| Screen | Current | With Aggregation | Reduction |
|---|---|---|---|
| Dashboard | ~150 MB (36 calls) | **~10 KB** (1 call) | **99.99%** |
| Sales | ~75 MB (32 calls) | **~30 KB** (1 call) | **99.96%** |
| Payments | ~75 MB (32 calls) | Uses Sales response | **100%** (cached) |
| Items & Menu | ~75 MB (1 call) | **~80 KB** (1 call) | **99.89%** |
| Cancellations | ~75 MB (1 call) | **~15 KB** (1 call) | **99.98%** |
| Order Ledger | ~38 MB (1 call) | **~400 KB/page** (paginated) | **98.9%** |
| **All screens** | **~450 MB, ~100+ calls** | **~135 KB, 5 calls** | **99.97%** |
| **1-year range** | **~5.4 GB (impossible)** | **~500 KB** | ✅ Works |

---

## 6. IMPLEMENTATION PRIORITY

| Priority | What | Effort Estimate | Impact |
|---|---|---|---|
| **P0** | `insights-dashboard` (§3.1) | Medium | Unblocks Dashboard for any date range |
| **P0** | `insights-sales` (§3.2) | Medium | Unblocks Sales + Payments (same data) |
| **P1** | `insights-items` (§3.3) | Medium-Large (per-item aggregation + Pass 2 distribution) | Unblocks Items & Menu |
| **P1** | `insights-cancellations` (§3.4) | Medium (45-day lookback + OPS-CANCEL) | Unblocks Cancellations |
| **P2** | Pagination on `order-logs-report` (§4.1) | Small | Unblocks Order Ledger for long ranges |
| **P2** | Field selection on `order-logs-report` (§4.2) | Small-Medium | Reduces payload by 77% for any raw-data consumer |
| **P3** | Enable gzip/brotli on API responses (nginx/LB config) | Config only | ~80% wire-size reduction on ALL endpoints |

---

## 7. QUESTIONS FOR BACKEND TEAM

1. **Feasibility:** Can the aggregation be done efficiently in SQL/DB queries, or would it require loading all orders into application memory (same problem as frontend)?
2. **Schedule profiles:** Should the frontend pass `business_day_start`/`business_day_end`, or can backend derive them from the restaurant's stored schedule?
3. **Tab settlements:** Can `daily-sales-revenue-report` accept a date range (`from` + `to`) and return all days in one response? This would simplify both the aggregation endpoints and the current frontend.
4. **Operations table:** Is `operations[]` stored in a separate table? If so, the aggregation queries can JOIN only for fs=3 orders (instead of loading operations for all orders).
5. **food_details:** Is this stored as a JSON column? If so, can it be trimmed at query time (e.g., `food_details->>'name'` in PostgreSQL)?
6. **Caching:** Would it be feasible to cache aggregation results server-side (e.g., materialized views that refresh hourly)?
7. **Timeline:** Rough estimate for shipping `insights-dashboard` and `insights-sales` (the P0 items)?

---

## 8. VERIFICATION

Once endpoints are available, we will verify using the existing replication harness (`/app/audit_data/analyze.py` + `reconcile_cafe103.py`) which reproduces every screen's numbers from raw data. The acceptance criterion (owner-approved, H33):

> **"A fix is DONE only when the screen matches the harness to the rupee."**

Both restaurants (cafe103 rid=644, Palm House rid=541), Mar–Jun 2026.

---

*Document version: 1.0 · 2026-06-12 · POS Frontend Team*
