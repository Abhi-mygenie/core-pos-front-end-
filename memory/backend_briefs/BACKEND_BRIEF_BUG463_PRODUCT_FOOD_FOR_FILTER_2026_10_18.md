# BACKEND_BRIEF — BUG-463 — product load by assign_food_menu
# Date: 2026-10-18

## Summary
- Issue: `get-products-list` currently returns ALL products regardless of menu type. FE filters client-side.
- Desired: Backend should support `food_for` query param so FE can load ONLY the employee's assigned menu products at boot time.
- Frontend impact: During LoadingPage boot, FE wants to call `getProducts({ food_for: assign_food_menu })` and receive only that menu's products — no client-side filtering needed.
- Priority: P2 / MEDIUM

## Context — assign_food_menu
Login API (`/api/v1/auth/vendoremployee/common-login`) already returns `assign_food_menu` per employee:

| Account | assign_food_menu |
|---|---|
| owner@hyatt.com (RID 716) | Normal |
| manager@hyatt.com (RID 716) | GROK |

This field is correct and reliable. The FE reads it from the login response.

## What Backend Needs to Confirm / Add

### Q1: Does `get-products-list` already support `food_for` filtering?
- Endpoint: `GET /api/v1/vendoremployee/get-products-list`
- Current known params: `limit`, `offset`, `type`
- FE test: passing `food_for=Normal` on cafe103 (398 Normal products) returned 398 — but ambiguous because that restaurant has ONLY Normal products.
- **Need a multi-menu restaurant test (e.g. RID 716 Hyatt with Normal + GROK) to confirm the filter actually works server-side.**

### Q2: If not supported — please add `food_for` filter param
- When `food_for=Normal` → return only products where `food_for = 'Normal'`
- When `food_for=GROK` → return only products where `food_for = 'GROK'`
- When `food_for` is absent → return all (existing behaviour, backwards-compatible)

### Q3: Hyatt preprod account (RID 716) has restaurant_id = None in profile response
- `GET /api/v1/vendoremployee/profile` for owner@hyatt.com returns `restaurants[0].restaurant_id = None`
- Products endpoint returns `total_size: 0` for this account in preprod
- **Is this a preprod data issue? Does RID 716 exist in preprod?**

## FE Plan (pending backend confirmation on Q1/Q2)
Once confirmed:
1. LoadingPage reads `assign_food_menu` from login response (stored in memory/auth state)
2. Calls `getProducts({ limit: 2000, offset: 1, food_for: assign_food_menu })`
3. Only that menu's products are loaded into MenuContext
4. Remove client-side `activeMenuProducts` filter from MenuContext (redundant after this change)
5. Remove `mygenie_active_menu_type` localStorage key entirely

## Evidence
- Investigation: `/app/memory/investigations/REPORTS_BATCH_INVESTIGATION_2026_10_17.md`
- BUG-463 current plan: `/app/memory/plans/BUG-463_IMPLEMENTATION_PLAN.md`
- FILE_OWNERSHIP: `authTransform.js` + `authService.js` + `StatusConfigPage.jsx` (current partial fix)
