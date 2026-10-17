# BACKEND BRIEF — Insights Reports API Contract
**Document:** BACKEND_BRIEF_INSIGHTS_API_CONTRACT_2026_10_17.md
**Created:** 2026-10-17
**Author:** E1 Investigation Agent (Role 6)
**Status:** FORMAL CONTRACT — Frontend expects these exact field names

---

## Overview

All Insights endpoints share the same request/response wrapper pattern:

```
Method:   POST
Base URL: https://preprod.mygenie.online
Auth:     Authorization: Bearer <vendor_employee_token>
Content-Type: application/json

Request body (all endpoints):
{
  "from_date": "YYYY-MM-DD",
  "to_date":   "YYYY-MM-DD"
}

Response wrapper (all endpoints):
{
  "data": {
    "data": { ... }   ← Frontend reads resp.data.data
  }
}
```

---

## 1. insights-dashboard

**Endpoint:** `POST /api/v2/vendoremployee/report/insights-dashboard`
**Frontend consumer:** `DashboardMockup.jsx`, `AuditLogMockup.jsx`
**Transform:** `transformDashboardResponse()` in `insightsService.js`

### Required response shape (`resp.data.data`):

```json
{
  "revenue": {
    "total": 0,
    "paid_order_count": 0,
    "by_hour": [{ "hour": 0, "revenue": 0 }],
    "tab_settlement_total": 0
  },
  "channel_mix": [
    { "channel": "Dine In", "orders": 0, "revenue": 0 }
  ],
  "top_items": [
    { "name": "Item Name", "qty": 0, "revenue": 0 }
  ],
  "payment_mix": [
    { "method": "Cash", "orders": 0, "revenue": 0 }
  ],
  "credit_outstanding": 0,
  "cancellations": {
    "order_scope_count": 0,
    "item_scope_count": 0,
    "total_count": 0,
    "order_scope_loss": 0,
    "item_scope_loss": 0,
    "total_loss": 0,
    "top_reason": "",
    "top_reason_count": 0
  },
  "discounts": {
    "manual_discount": 0,
    "coupon_discount": 0,
    "coupon_order_count": 0,
    "loyalty_discount": 0,
    "comp_item_total": 0,
    "comp_item_count": 0,
    "total_leakage": 0
  },
  "audits": {
    "make_unpaid_count": 0,
    "payment_method_change_count": 0,
    "total": 0,
    "orders": []
  },
  "kitchen": {
    "avg_prep_minutes": 0.0,
    "avg_serve_minutes": 0.0,
    "sla_breach_count": 0,
    "has_prep_data": false
  },
  "customers": {
    "repeat_pct": 0,
    "repeat_customers": 0,
    "unique_customers": 0,
    "guest_count": 0,
    "total_orders": 0
  }
}
```

---

## 2. insights-sales

**Endpoint:** `POST /api/v2/vendoremployee/report/insights-sales`
**Frontend consumer:** `DailySalesMockup.jsx`, `ChannelPivotMockup.jsx`, `HourlySalesMockup.jsx`

### Required response shape:

```json
{
  "summary": {
    "total_revenue": 0,
    "total_orders": 0,
    "total_tax": 0,
    "total_discount": 0
  },
  "daily": [
    {
      "date": "YYYY-MM-DD",
      "revenue": 0,
      "orders": 0,
      "tax": 0,
      "discount": 0
    }
  ]
}
```

---

## 3. insights-items

**Endpoint:** `POST /api/v2/vendoremployee/report/insights-items`
**Frontend consumer:** `ItemSalesHybridMockup.jsx`, `ItemDrillSheet.jsx`
**Transform:** `transformItemRows()` in `insightsService.js`

### Required response shape (array of items):

```json
[
  {
    "food_id": 0,
    "name": "Item Name",
    "category_id": 0,
    "category_name": "Category",
    "station": "",
    "menu_price": 0,
    "avg_price_sold": 0,
    "order_charges_distributed": 0,
    "tax_rate": 0,
    "tax_type": "",
    "tax_calc": "",
    "sold": {
      "qty": 0,
      "revenue": 0,
      "item_total": 0,
      "discount": 0,
      "service_charge": 0,
      "tax": 0
    },
    "cancelled":      { "qty": 0, "revenue": 0 },
    "complementary":  { "qty": 0 },
    "pending":        { "qty": 0 },
    "credit":         { "qty": 0 },
    "variations":     [],
    "addons":         [],
    "cancel_reasons": []
  }
]
```

---

## 4. insights-cancellations  ⚠️ BUG-579 OPEN

**Endpoint:** `POST /api/v2/vendoremployee/report/insights-cancellations`
**Frontend consumer:** `CancellationsMockup.jsx`, `CancelDetailMockup.jsx`
**Note:** No transform function — FE reads raw response directly.

### Required response shape:

```json
{
  "summary": {
    "total_qty": 0,
    "total_count": 0,
    "cancelled_order_count": 0,
    "order_scope_count": 0,
    "item_scope_count": 0,
    "total_loss": 0,        ← ⚠️ BUG-579: currently 0/null — must return ₹ value
    "order_loss": 0,        ← ⚠️ BUG-579
    "item_loss": 0          ← ⚠️ BUG-579
  },
  "items": [
    {
      "order_number": "",
      "restaurant_order_id": 0,
      "cancel_date": "YYYY-MM-DD",
      "cancel_time": "HH:MM",
      "cancel_at": "",
      "created_at": "",
      "food_name": "",
      "food_id": 0,
      "unit_price": 0,
      "qty": 1,
      "value": 0,           ← ⚠️ BUG-579: monetary loss per item — must return ₹ value
      "item_total": 0,
      "discount": 0,
      "service_charge": 0,
      "gst": 0,
      "vat": 0,
      "stage": "",
      "cancel_type": "",
      "scope": "item",      ← "item" | "order"
      "reason": "",
      "notes": "",
      "cancelled_by": "",
      "punched_by": "",
      "station": "",
      "ready_at": null,
      "serve_at": null
    }
  ],
  "by_stage": [
    { "stage": "Before Cooking", "loss": 0, "count": 0 }
  ],
  "by_reason": [
    { "reason": "Customer cancelled", "count": 0, "loss": 0 }
  ],
  "by_employee": [
    { "name": "Staff Name", "order_cancels": 0, "item_cancels": 0, "loss": 0 }
  ],
  "by_day": [
    {
      "date": "YYYY-MM-DD",
      "order_cancels": 0,
      "item_cancels": 0,
      "order_loss": 0,      ← ⚠️ BUG-579
      "item_loss": 0        ← ⚠️ BUG-579
    }
  ]
}
```

> **BUG-579 action required:** All `loss`, `value`, `order_loss`, `item_loss`, `total_loss` fields must carry monetary (₹) values. Frontend display code is ready — currently showing ₹0 because backend returns 0 or null.

---

## 5. insights-tax

**Endpoint:** `POST /api/v2/vendoremployee/report/insights-tax`
**Frontend consumer:** `TaxSlabsMockup.jsx`, `TaxDetailMockup.jsx`, `TaxCalcMockup.jsx`
**Status:** No open bugs — contract stable.

---

## 6. insights-discounts  ⚠️ BUG-580 OPEN

**Endpoint:** `POST /api/v2/vendoremployee/report/insights-discounts`
**Frontend consumer:** `DiscountReportMockup.jsx` (S26), `CouponUsageMockup.jsx` (S27)

### Required response shape:

```json
{
  "summary": {
    "total": 0,
    "manual_discount": 0,
    "coupon_discount": 0,
    "loyalty_discount": 0,
    "comp_total": 0
  },
  "daily": [
    {
      "date": "YYYY-MM-DD",
      "manual": 0,
      "coupon": 0,
      "loyalty": 0,
      "comp": 0
    }
  ],
  "by_employee": [
    {
      "name": "Staff Name",
      "manual_discount": 0,
      "coupon_applied": 0,
      "comp_count": 0
    }
  ],
  "orders_table": [
    {
      "restaurant_order_id": 0,
      "order_id": 0,
      "order_date": "YYYY-MM-DD",
      "discount_for": "Thrive",   ← ⚠️ BUG-580: discount type label — ALL types must appear here
      "order_discount": 0,
      "total_discount": 0
    }
  ],
  "coupons": [
    {
      "code": "SAVE10",
      "type": "percentage",
      "uses": 0,
      "discount_total": 0,
      "orders": 0
    }
  ]
}
```

> **BUG-580 action required:**
> - `orders_table[]` must include ALL discount types applied — including custom types like "Thrive", "Staff Meal", "Manager Comp" etc.
> - `discount_for` is the label FE displays as the discount reason/type. If a discount type is missing from `orders_table`, it won't appear in the UI at all.
> - Also confirm: Is "Thrive" included in `summary.manual_discount` or tracked separately? FE currently has no separate Thrive field — it relies on `orders_table[].discount_for` for per-type breakdown.

---

## 7. insights-staff

**Endpoint:** `POST /api/v2/vendoremployee/report/insights-staff`
**Frontend consumer:** `CashierSettlementMockup.jsx`, `StaffCashiersMockup.jsx`, `StaffServersMockup.jsx`
**Status:** No open bugs — contract stable.

---

## 8. insights-customers

**Endpoint:** `POST /api/v2/vendoremployee/report/insights-customers`
**Frontend consumer:** `CustomersMixMockup.jsx`, `CustomersRfmMockup.jsx`
**Status:** No open bugs — contract stable.

---

## 9. insights-locations

**Endpoint:** `POST /api/v2/vendoremployee/report/insights-locations`
**Frontend consumer:** `FoodCourtBetaPage.jsx`
**Status:** Food court only — no open bugs.

---

## Open Backend Action Items

| Bug | Endpoint | Missing | Impact |
|---|---|---|---|
| **BUG-579** | `insights-cancellations` | `summary.total_loss`, `items[].value`, `by_day[].order_loss/item_loss` must return ₹ values (not 0) | Cancellation report shows ₹0 everywhere |
| **BUG-580** | `insights-discounts` | `orders_table[]` missing entries for custom discount types (e.g. Thrive). `discount_for` must be populated for all types | Thrive and other discount types invisible in Discount Report |

---

*Document path: `/app/memory/backend_briefs/BACKEND_BRIEF_INSIGHTS_API_CONTRACT_2026_10_17.md`*
*Next: Share with backend team. No frontend code changes required for BUG-579/580.*
