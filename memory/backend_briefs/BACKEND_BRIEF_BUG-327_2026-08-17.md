# BACKEND BRIEF — BUG-327 — 2026-08-17

## Summary
- Issue: `foods-list?food_for=Aggregator` returns 500 TypeError HTML; preprod aggregator menu management is broken
- Classification: BACKEND_BUG + DATA_ISSUE
- Frontend impact: Entire Aggregator food list is inaccessible; menu management Aggregator mode broken
- Priority/Risk: P0 / HIGH

## Endpoint
- Method: GET
- URL: `https://preprod.mygenie.online/api/v2/vendoremployee/product/foods-list?food_for=Aggregator`
- Auth: `owner@thegoankitchen.com` (restaurant_id = 69)

## Reproduction
1. Login as `owner@thegoankitchen.com` (Qplazm@10)
2. `GET /api/v2/vendoremployee/product/foods-list?food_for=Aggregator`
3. Observe: returns `TypeError: cleanBindings(): Argument #1 must be array, string given` HTML instead of JSON

## Root Cause (traced)
Investigation probes sent `variations=[]` and `addon_ids=[]` as multipart string values via `-F "variations=[]"`.
The backend's `store_aggregator_food` stored these as literal strings `"[]"` in the `aggregator_food` table.

The `foods-list` query at `FoodController.php:1583` does:
```php
->whereIn(some_column, $food->variations_or_addon_ids)
```
Where `$food->field = "[]"` (string) instead of `[]` (array) → `cleanBindings()` TypeError.

**Cascade:** The DELETE endpoint (`/product/delete/{id}`) soft-deletes from the `food` table but does NOT cascade to `aggregator_food`. Orphaned records for food IDs 13312–13315 remain with `food_status=0` (active) in `aggregator_food`, causing the `foods-list` query to include them.

## Payload / Response
- Actual: TypeError HTML (714KB debug page)
- Expected: `{"foods": [...], "restaurant_settings": {...}}`

## Fix Required (backend)
**Immediate (P0):** Directly set `food_status = 1` (or equivalent deleted flag) for `aggregator_food` records where `id IN (13312, 13313, 13314, 13315)` — OR delete those rows entirely.

**Systemic fix:**
1. `store_aggregator_food`: validate `variations` and `addon_ids` — cast to array or reject non-array values; never store string "[]" as the column value
2. `/product/delete/{id}`: cascade soft-delete to `aggregator_food` table when `food_for=Aggregator`

## Evidence
- Probe results: `/app/memory/evidence/BUG-327/api_probe_results.json`
- Investigation report: `/app/memory/investigation/BUG-327_AGG_IMAGE_INVESTIGATION.md`

## Frontend Workaround
- Available: NO — the list endpoint returning HTML breaks the entire Aggregator menu management UI
- Impact: Cannot list, add, or edit aggregator foods until backend DB is fixed
