# BACKEND_BRIEF_BUG-268_2026-07-28

## Summary
- Issue: All ingredient edit (PUT) operations fail with HTTP 500 — `inventory_audit_logs.id` column has no AUTO_INCREMENT or default value
- Classification: BACKEND_BUG
- Frontend impact: Every ingredient edit (category change, name change, unit change, alert threshold) fails. Error toast shows raw SQL to user.
- Priority/Risk: P0 / CRITICAL — all edit functionality is broken

## Endpoint
- Method: PUT
- URL: `/api/v2/vendoremployee/inventory/update-inventory/{id}`
- Auth: Bearer token (Owner role, restaurant_id=642 or 689)

## Reproduction
1. Login as owner@kunafamahal.com
2. Navigate to Inventory Setup → Ingredients
3. Click edit (pencil icon) on any ingredient
4. Change any field (e.g., category)
5. Click Save
6. → HTTP 500 error with SQL message

## Payload / Response
- Request payload:
```json
{
  "stock_title": "Base Cream",
  "category_id": 1060,
  "unit": "gm",
  "small_unit": "",
  "minimun_stock_alert": "0",
  "min_unit_alert": "",
  "reason": "update"
}
```
- Response (HTTP 500):
```json
{
  "message": "SQLSTATE[HY000]: General error: 1364 Field 'id' doesn't have a default value (SQL: insert into `inventory_audit_logs` (`inventory_id`, `restaurant_id`, `operation`, `reason`, `changed_data`, `created_at`) values (10741, 689, edit, update, {\"before\":{...},\"after\":{...}}, 2026-07-28 ...))"
}
```

## Root Cause
The `inventory_audit_logs` table's `id` column:
- Does NOT have AUTO_INCREMENT
- Does NOT have a DEFAULT value
- The Laravel INSERT statement does not include `id` in the column list
- MySQL strict mode rejects the INSERT

## Fix Required
**Option A (recommended):** `ALTER TABLE inventory_audit_logs MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;`
**Option B:** Set a default value or use UUID generation in the Laravel model

## Evidence
- Curl output: Saved at `/app/memory/evidence/BUG-267_268_INVESTIGATION_REPORT.md`
- Owner screenshot: Shows same error with ingredient_id=18936, restaurant_id=642

## Frontend Workaround
- Available: NO — no workaround possible; the backend must fix the table schema
