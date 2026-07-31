# Impact Analysis + Backend Brief — BUG-266 (Wastage Report / Top Wasted Items)

**ID:** BUG-266
**Gate:** 2 (Impact Analysis) + BACKEND_BRIEF
**Date:** 2026-07-27
**Code Reality:** NONE (frontend has placeholder UI)
**Classification:** BACKEND_BLOCKED
**Risk:** N/A (no frontend work possible until backend delivers)

---

## Summary

Wastage Insights and Top Wasted Items widgets on the Inventory Intelligence Dashboard are BACKEND-BLOCKED. No wastage aggregation/report endpoints exist. The frontend has placeholder `WastagePlaceholder` components (being removed by BUG-262).

---

## Current Frontend State

### InventoryIntelligencePanel.jsx
- Lines 315-316: `<WastagePlaceholder title="Wastage Insights" />` and `<WastagePlaceholder title="Top Wasted Items" />`
- Line 276: KPI card "Wastage Value" shows "—" with "P2" badge
- Widget grid has 6 data widgets + 2 placeholders

### Existing Wastage CRUD (CR-072)
- `inventoryService.js` has wastage log endpoints (add/edit/delete single wastage entries)
- `InventorySetupPanel.jsx` has "Wastage Reasons" tab with CRUD
- Wastage LOG entries exist — but no AGGREGATION/REPORTING endpoint

---

# BACKEND BRIEF — BUG-266

## Summary
- **Issue:** Wastage report data not available in frontend
- **Classification:** BACKEND_BUG (missing endpoints)
- **Frontend impact:** 2 Intelligence Dashboard widgets empty + 1 KPI card shows "—"
- **Priority/Risk:** P1 / HIGH

## Endpoints Needed

### 1. GET /api/v1/inventory/wastage-report
**Purpose:** Aggregated wastage data for a date range, grouped by ingredient.

**Request:**
```
GET /api/v1/inventory/wastage-report?from_date=DD-MM-YYYY&to_date=DD-MM-YYYY
Authorization: Bearer <token>
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "total_wastage_value": 12500.00,
    "total_wastage_quantity": 45,
    "wastage_by_ingredient": [
      {
        "ingredient_id": 123,
        "ingredient_name": "Tomato",
        "category_name": "Vegetables",
        "total_quantity_wasted": 5.5,
        "unit": "kg",
        "total_value": 550.00,
        "wastage_count": 3,
        "reasons": [
          { "reason": "Expired", "quantity": 3.0, "value": 300.00 },
          { "reason": "Spoiled", "quantity": 2.5, "value": 250.00 }
        ]
      }
    ],
    "wastage_by_reason": [
      { "reason": "Expired", "total_quantity": 20, "total_value": 5000.00, "count": 15 },
      { "reason": "Spoiled", "total_quantity": 15, "total_value": 4500.00, "count": 10 }
    ],
    "daily_totals": [
      { "date": "20-07-2026", "total_value": 1500.00, "count": 5 }
    ]
  }
}
```

### 2. GET /api/v1/inventory/top-wasted-items
**Purpose:** Ranked list of most-wasted items (by value or quantity).

**Request:**
```
GET /api/v1/inventory/top-wasted-items?days=30&limit=10&sort_by=value
Authorization: Bearer <token>
```

**Expected Response:**
```json
{
  "status": "success",
  "data": [
    {
      "ingredient_id": 123,
      "ingredient_name": "Tomato",
      "category_name": "Vegetables",
      "total_value_wasted": 2500.00,
      "total_quantity_wasted": 25.0,
      "unit": "kg",
      "wastage_count": 12,
      "top_reason": "Expired",
      "trend": "increasing"
    }
  ]
}
```

## Data Source
- Wastage log entries are already being created via existing CRUD endpoints
- These endpoints need to AGGREGATE existing log data, not create new data flows

## Frontend Workaround
- Available: NO
- Frontend will show empty state or hide widgets until endpoints are available

## Frontend Readiness
- Widget structure exists (currently placeholder)
- Once endpoints deliver, wire into existing `InventoryIntelligencePanel.jsx` widget grid
- Estimated frontend work: 2 new widget components (~100 lines each), 2 new service functions, 1 transform
