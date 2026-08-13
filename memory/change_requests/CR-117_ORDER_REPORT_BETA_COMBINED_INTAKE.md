# CR-117 — Order Report Beta (Combined Daily Order Report)

**ID:** CR-117  
**Type:** CR (Feature / New Page)  
**Priority:** P1  
**Risk:** LOW  
**Area:** Reports → Daily Sales  
**Sprint:** pos_5_0  
**Intake Date:** 2026-07-30  
**Gate:** 0-1  

---

## Owner Description

> "In order report currently (daily order report) as well as order leisure we are using order logs. We need to create another order report in daily sales — first say it Order Report Beta. This report will have backend aggregation point for all orders including aggregator orders. Giving 2 endpoints — UI as well as Excel."

---

## Problem Statement

The existing `AllOrdersReportPage` (route `/reports/audit`) and `OrderLedgerMockup` both rely on the `/api/v2/vendoremployee/report/order-logs-report` endpoint which:
- Does client-side aggregation
- May NOT include aggregator orders from Swiggy/Zomato/UrbanPiper

The new `daily-order-report-details-combined` endpoint:
- Has **backend-side aggregation** (all computation done server-side)
- Includes **all order sources** including aggregator/platform orders (`order_plateform` field)
- Has a corresponding **Excel export endpoint** for bulk data download

A new report page ("Order Report Beta") is needed to surface this backend-aggregated data.

---

## Feature Scope

### 1. New Page: Order Report Beta
- Route: `/reports/order-report-beta`
- Navigation: **Daily Sales** section → new nav item "Order Report Beta" (or "Orders (Beta)")
- Mirrors the structural pattern of `AllOrdersReportPage` / `DailySalesMockup`

### 2. Data Source — UI Display
**Endpoint:** `POST /api/v1/vendoremployee/daily-order-report-details-combined`  
**Request body:** `{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }`  
**Auth:** Bearer token

**Confirmed response shape (live probed 2026-07-30):**
```json
{
  "order_stats": { "paidOrders": 17, "unpaidOrders": 14, "cancelOrders": 2 },
  "daily_reports": [
    {
      "date": "2026-07-25",
      "report": [/* array of order rows — see Order Row Fields below */],
      "paid_revenue": "...",
      "order_revenue": { "Cash": "...", "Card": "...", "UPI": "...", "CashOnDelivery": "..." },
      "tab_revenue": { "tab_cash": "...", "tab_card": "...", "tab_upi": "..." },
      "room_revenue": { "Room Cash": "...", "Room Card": "...", "Room UPI": "..." },
      "unpaid_revenue": { "orderTAB": "...", "orderRoom": "..." },
      "total_sales": "...", "total_discount": "...", "gst_amount": "...",
      "delivery_charge": "...", "packing_charge": "...", "service_tax": "...",
      "tip_amount": "...", "roundoff": "..."
    }
  ],
  "grand_total": {
    "paid_revenue": "4,703.00",
    "order_revenue": { "Cash": "3,340.00", "Card": "0.00", "UPI": "0.00", "CashOnDelivery": "0.00" },
    "tab_revenue": {...}, "room_revenue": {...}, "unpaid_revenue": {...},
    "total_sales": "20,047.00", "total_discount": "0.00", "gst_amount": "..."
  },
  "from": "2026-07-25",
  "to": "2026-07-30"
}
```

**Order Row Fields (all confirmed from live response):**
```
source, order_id, restaurant_order_id, original_restaurant_order_id,
order_plateform (null=POS, value=aggregator platform name),
order_type (pos/dinein/delivery/etc),
waiter_id, employee_id, waiter, collected_by,
order_date (HH:MM), order_new_date (YYYY-MM-DD HH:MM:SS),
customer_info, date_of_birth, date_of_anniversary, membership_id, user_name, user_phone,
gst_amount, gst_amount_only, vat_amount,
delivery_charge, packing_charge, order_discount, service_tax, tip_amount, roundoff,
payment_for, quantity, food_name, discount_for, total_order_value, order_amount_raw,
payment_method_raw, coupon_code, coupon_discount, wallet_used, loyalty_used,
total_discount, transaction_id, collect_bill, order_sub_total_without_tax,
payment_type, amount, payment
```

### 3. Data Source — Excel Export
**Endpoint:** `POST /api/v1/vendoremployee/daily-order-report-excel-export-combined`  
**Request body:** `{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }`  
**Note:** Excel export uses the same `REACT_APP_API_BASE_URL` from env (owner-confirmed 2026-07-31).

### 4. UI Components

**Header / KPI Strip:**
- Total orders: paidOrders + unpaidOrders + cancelOrders
- Paid Orders | Unpaid Orders | Cancelled Orders (from `order_stats`)
- Date range picker (from/to)

**Per-Day Collapsible Section:**
Each day in `daily_reports` shows:
- Date header + day-level totals (paid_revenue, total_sales, total_discount)
- Expandable order table per day with columns:
  - Order # | Date/Time | Platform (POS/Swiggy/Zomato) | Order Type | Waiter | Items | Amount | GST | VAT | Payment Method | Status
- Platform badge: show `order_plateform` value as a badge (S=Swiggy, Z=Zomato, etc.)

**Grand Total Footer:**
- Revenue breakdown by payment method (Cash/Card/UPI)
- Tab + Room revenue
- Unpaid summary
- Total sales / Total discount / GST / VAT

**Filter Bar:**
- Date range (required, default: today–today)
- Platform filter (All / POS / Swiggy / Zomato / etc.)
- Order type filter (All / dine-in / delivery / pos)
- Punched By / Collected By (similar to CR-101 pattern)

**Export:**
- "Export Excel" button → calls Excel endpoint with same date range
- Pattern: reuse `ExportButtons.jsx` or similar

---

## Open Questions (OQs)

| # | Question | Blocking? |
|---|----------|-----------|
| OQ-1 | ~~Excel endpoint domain~~ | **RESOLVED** — owner confirmed all APIs use `REACT_APP_API_BASE_URL` from env. No hardcoded domains. | NO |
| OQ-2 | Should this appear as a **tab within** AllOrdersReportPage or as a **separate route** under Daily Sales? Owner said "in daily sales first" — treat as new nav item. | CONFIRM |
| OQ-3 | Per-day collapsible or flat list? AllOrdersReportPage is flat. DailySalesMockup has day-level grouping. Which pattern for this? | YES |
| OQ-4 | Should `order_plateform` be displayed as a source badge matching CR-106/CR-110 badge design (S/Z/M)? | COSMETIC |

---

## Duplicate Check

- `AllOrdersReportPage` uses `/order-logs-report` — DIFFERENT endpoint → DISTINCT
- `OrderLedgerMockup` uses different API → DISTINCT
- No existing "combined" endpoint consumer in codebase → NEW

**Verdict: DISTINCT**

---

## Blast Radius

| File | Change Type | Size Estimate |
|------|------------|---------------|
| `pages/reports-module/OrderReportBetaPage.jsx` | NEW | ~450-600 lines |
| `api/services/reportService.js` | +2 functions | ~20 lines |
| `api/constants.js` | +2 constants | ~4 lines |
| `App.js` | +1 route | ~3 lines |
| `components/layout/Sidebar.jsx` | +1 nav item | ~5 lines |

**Total: 5 files, ~500 net new lines**  
**Risk: LOW** (new page, no changes to existing report or financial logic)

---

## Acceptance Criteria

```
AC-1: Page loads at /reports/order-report-beta with date range defaulting to today
AC-2: KPI strip shows paidOrders, unpaidOrders, cancelOrders from order_stats
AC-3: Orders table shows all order rows from daily_reports[*].report with all key fields
AC-4: Aggregator orders show platform badge (Swiggy/Zomato/etc) from order_plateform field
AC-5: Grand total footer matches grand_total from API
AC-6: Date range filter re-fetches with new from/to
AC-7: Export Excel button calls excel endpoint and downloads file
AC-8: "Daily Sales" sidebar nav includes "Order Report Beta" link
AC-9: Empty state shown when no orders in date range
```

---

## Evidence

- Live API probe: `/app/memory/evidence/CR-117/` (verified 2026-07-30 with owner@18march.com on preprod)
- Test credentials: `owner@18march.com` / `Qplazm@10` (preprod)
