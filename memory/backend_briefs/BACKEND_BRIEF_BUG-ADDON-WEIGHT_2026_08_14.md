# BACKEND_BRIEF — BUG-ADDON-WEIGHT — 2026-08-14

## Summary
- Issue: `GET /api/v2/vendoremployee/product/addon-list` throws SQL error for restaurant 69
- Classification: BACKEND_BUG / DATA_ISSUE (DB schema missing column)
- Frontend impact: Add-ons section empty in ProductForm; error toast on every Menu Management open
- Priority/Risk: P1 / MEDIUM

## Endpoint
- Method: GET
- URL: `/api/v2/vendoremployee/product/addon-list`
- Auth: Bearer token (restaurant 69 — owner@thegoankitchen.com)

## Error
```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'weight' in 'field list'
SQL: select `id`, `name`, `price`, `status`, `weight`, `veg`, `has_inventory`, `recipe_id`
     from `add_ons` where `restaurant_id` = 69 order by `name` asc
```

## Reproduction
1. Login as owner@thegoankitchen.com
2. Open Menu Management
3. Error toast fires immediately

## Root Cause
Backend `addon-list` query references `weight` column in `add_ons` table.
Column does not exist in DB for restaurant 69.
Either:
  a) `weight` column was added to the model/query but migration was never run for this restaurant's DB, OR
  b) `weight` column was added to some restaurants' `add_ons` tables but not all

## Frontend Workaround
- Available: YES (partial)
- The error only affects the add-ons fetch. Foods/categories still load.
- `getAddonList()` currently has no try/catch in MenuManagementPanel — could add silent fail, but this is a backend fix.

## Fix Required (backend)
Option A: Add `weight` column to `add_ons` table via migration (if intentional field)
Option B: Remove `weight` from the SELECT query in the addon-list controller/model (if not needed)
