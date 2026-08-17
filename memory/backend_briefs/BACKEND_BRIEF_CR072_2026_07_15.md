# BACKEND_BRIEF_CR072_INVENTORY_INTELLIGENCE

## Summary
- **Issue:** CR-072 Inventory Management needs backend aggregation endpoints for Phase 2 intelligence features
- **Classification:** CONTRACT_MISMATCH (endpoints exist per owner but not yet mapped)
- **Frontend impact:** Phase 1 (CRUD) can ship without these. Phase 2 (intelligence) is blocked.
- **Priority/Risk:** P1 / HIGH

---

## Required Backend Endpoints (6 endpoints)

### EP-1: Consumption History (per ingredient)
**Purpose:** Daily/weekly/monthly consumption data per ingredient — derived from recipe deductions when orders are placed.

**Needed for:** "Days of stock remaining" calculation, consumption trend sparklines, waste-vs-consumption ratio.

```
GET /api/v2/vendoremployee/inventory/consumption-history?ingredient_id={id}&from={date}&to={date}
```

**Expected response:**
```json
{
  "ingredient_id": 10741,
  "ingredient_name": "Base Cream",
  "unit": "gm",
  "period": { "from": "2026-07-01", "to": "2026-07-15" },
  "daily_consumption": [
    { "date": "2026-07-15", "consumed_qty": 250, "order_count": 12 },
    { "date": "2026-07-14", "consumed_qty": 310, "order_count": 15 }
  ],
  "avg_daily_consumption": 280,
  "total_consumed": 4200
}
```

---

### EP-2: Purchase History (per ingredient or all)
**Purpose:** Historical purchases — vendor, date, qty, rate, amount per purchase entry.

**Needed for:** Cost-per-dish (latest rate), purchase trend, reorder forecast, vendor analysis.

```
GET /api/v2/vendoremployee/inventory/purchase-history?ingredient_id={id}&from={date}&to={date}
```

**Expected response:**
```json
{
  "purchases": [
    {
      "purchase_id": 1234,
      "date": "2026-07-10",
      "ingredient_id": 10741,
      "ingredient_name": "Base Cream",
      "vendor_id": 173,
      "vendor_name": "Kunafabake",
      "quantity": 5,
      "unit": "kg",
      "rate": 450,
      "amount": 2250,
      "payment_type": "UPI"
    }
  ],
  "latest_rate": 450,
  "avg_rate_30d": 440
}
```

---

### EP-3: Stock Aggregation / Dashboard Summary
**Purpose:** Pre-computed KPI totals — avoids client counting 100+ items.

**Needed for:** Stock Dashboard KPI cards, low-stock alerts count.

```
GET /api/v2/vendoremployee/inventory/stock-summary
```

**Expected response:**
```json
{
  "total_ingredients": 105,
  "total_categories": 70,
  "low_stock_count": 12,
  "out_of_stock_count": 3,
  "total_stock_value": 125000,
  "low_stock_items": [
    { "id": 10741, "name": "Base Cream", "current_qty": 1.654, "unit": "kg", "min_alert": 5, "days_remaining": 2.4 }
  ]
}
```

---

### EP-4: Days Remaining (Bulk or per-ingredient)
**Purpose:** Pre-computed "days of stock remaining" based on avg consumption rate.

**Needed for:** Embedded intelligence on stock rows, reorder forecast.

```
GET /api/v2/vendoremployee/inventory/stock-forecast
```

**Expected response:**
```json
{
  "forecast": [
    {
      "ingredient_id": 10741,
      "ingredient_name": "Base Cream",
      "current_stock": 1654,
      "unit": "gm",
      "avg_daily_consumption": 280,
      "days_remaining": 5.9,
      "reorder_urgency": "medium",
      "last_purchase_vendor": "Kunafabake",
      "last_purchase_rate": 450
    }
  ],
  "critical_items": 3,
  "reorder_within_3_days": 5
}
```

---

### EP-5: Cost Per Dish (Recipe Costing)
**Purpose:** Calculate raw material cost per recipe based on ingredient quantities × latest purchase rates.

**Needed for:** Embedded cost on recipe cards, margin analysis.

```
GET /api/v2/vendoremployee/recipe/cost-analysis
```

**Expected response:**
```json
{
  "recipes": [
    {
      "recipe_id": 4870,
      "food_name": "50-50 Aam -E -Bahar",
      "selling_price": 250,
      "ingredient_cost": 87.50,
      "margin_percent": 65,
      "ingredients": [
        { "name": "Butter", "qty": 13, "unit": "gm", "rate_per_unit": 0.45, "cost": 5.85 },
        { "name": "Sugar Syrup", "qty": 13, "unit": "gm", "rate_per_unit": 0.12, "cost": 1.56 }
      ]
    }
  ]
}
```

---

### EP-6: Wastage Summary
**Purpose:** Aggregated wastage data — by reason, by ingredient, over time period.

**Needed for:** Waste-vs-consumption ratio, wastage trend, anomaly flags.

```
GET /api/v2/vendoremployee/inventory/wastage-summary?from={date}&to={date}
```

**Expected response:**
```json
{
  "total_wastage_value": 4500,
  "by_reason": [
    { "reason": "Expired", "count": 12, "value": 2100 },
    { "reason": "Spillage", "count": 8, "value": 1200 },
    { "reason": "Pilferage", "count": 5, "value": 1200 }
  ],
  "top_wasted_items": [
    { "ingredient_id": 10741, "name": "Base Cream", "wastage_qty": 2.5, "unit": "kg", "wastage_value": 1125, "consumption_ratio": 0.18 }
  ]
}
```

---

## Existing Endpoints Owner Confirmed (URLs not yet mapped)

| Endpoint | Status | Action |
|---|---|---|
| Consumption history | **EXISTS per owner** — URL unknown | Owner to share curl |
| Purchase history | **EXISTS per owner** — URL unknown | Owner to share curl |
| Stock summary/aggregation | **TBD** — may need to be built | Backend team |
| Stock forecast / days remaining | **TBD** — likely needs to be built | Backend team |
| Recipe cost analysis | **TBD** — likely needs to be built | Backend team |
| Wastage summary | **TBD** — likely needs to be built | Backend team |

---

## Frontend Dependency Map

| Phase | Feature | Blocked By |
|---|---|---|
| Phase 1 | Ingredients CRUD, Stock CRUD, Purchase, Recipes, Vendors | **Nothing** — all 37 endpoints live |
| Phase 2a (embedded) | Days remaining on stock rows | EP-4 (stock-forecast) |
| Phase 2a (embedded) | Cost per dish on recipe cards | EP-5 (cost-analysis) |
| Phase 2a (embedded) | Reorder alerts on dashboard | EP-3 (stock-summary) + EP-4 |
| Phase 2b (panel) | Consumption trends | EP-1 (consumption-history) |
| Phase 2b (panel) | Purchase analysis | EP-2 (purchase-history) |
| Phase 2b (panel) | Wastage analysis | EP-6 (wastage-summary) |

---

## Next Steps
1. **Owner shares consumption + purchase history curls** → we map exact endpoints
2. **Backend team reviews EP-3 through EP-6** → confirms which exist, which need building
3. **Phase 1 proceeds immediately** — no backend dependency
4. **Phase 2 implementation after backend confirms aggregation endpoints**
