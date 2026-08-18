# BACKEND_BRIEF — BUG-ADDON-SQL — 2026-08-14

## Summary
- Issue: `GET /addon-list` crashes with `Unknown column 'weight' in 'field list'` for some restaurants
- Classification: BACKEND_BUG / DATA_ISSUE (DB migration not applied universally)
- Frontend impact: Entire addon section blocked in Menu Management; error toast on every open
- Priority/Risk: P0 / HIGH

## Endpoint
- Method: GET
- URL: `/api/v2/vendoremployee/product/addon-list`
- Affected: Some restaurants (confirmed for restaurant with `add_ons` table missing `weight` column)
- NOT affected: Restaurant 69 (Goan Kitchen) — probe returns correctly

## Error
```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'weight' in 'field list'
SQL: select `id`, `name`, `price`, `status`, `weight`, `veg`, `has_inventory`,
     `recipe_id` from `add_ons` where `restaurant_id` = ? order by `name` asc
```

## Root Cause
V2 addon-list controller/model now SELECTs `weight` column. DB migration to add this column has NOT run on all restaurant environments — only some. The `add_ons` table schema is inconsistent across restaurants.

## Reproduction
1. Login as any restaurant where `add_ons.weight` column is missing
2. Open Menu Management
3. Error toast immediately fires

## Fix Required (backend only)
```sql
ALTER TABLE add_ons ADD COLUMN IF NOT EXISTS weight INT DEFAULT 0;
-- Also ensure: veg, has_inventory, recipe_id, has_recipe columns exist
```
Or run the pending migration on all restaurant DB instances.

## Frontend Workaround
NOT recommended to add a try/catch around addon-list — it should work. This is a backend migration gap.
