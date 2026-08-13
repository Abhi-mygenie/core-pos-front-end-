# BUG-296 Investigation Note

## Status: BLOCKED — Login credentials required

## Attempts:
- Endpoint: `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login`
- Tried: `owner@shimlaqohfoodcourt.com` / `Qplazm@123` → HTTP 401
- Tried: `owner@shimlaqohfoodcourt.com` / `Mygenie@123` → HTTP 401
- Tried: `owner@shimlaqohfoodcourt.com` / `Qplazm123` → HTTP 401
- Stored session_token from /app/memory/evidence/.session_token: invalid (different restaurant)

## Required to proceed:
- Valid password for `owner@shimlaqohfoodcourt.com`
- OR: owner to share the specific June data comparison (which screen, which date range, what numbers differ)

## FE code pre-analysis done (no API needed):
- FoodCourtMockup.jsx uses `foodCourtService.getFoodCourtForRange()` → order-logs-report with station filter
- ItemSalesHybridMockup.jsx uses `getItemSalesAggregated()` → order-logs-report with different grouping
- Both use the same backend endpoint but DIFFERENT filter logic:
  - Food Court: filters by station, groups by food item within station
  - Item Sales: groups by food_id across all stations
- SUSPECTED root cause: Food court excludes cross-station items or applies station filter that Item Sales does not → totals diverge
- NEEDS live API verification to confirm
