# BUG-332 — "Search By" Setting Not Consumed in Frontend UI

**ID:** BUG-332  
**Type:** BUG  
**Severity:** P2 — MEDIUM  
**Risk:** MEDIUM (search/filter UI behaviour)  
**Area:** Settings → Order & Kitchen → Search By; Dashboard / Order search  
**Sprint:** POS 5.x  
**Created:** 2026-08-18  
**Source:** INVESTIGATION (INV-AUG18-2026, INV-6)  
**Duplicate check:** DISTINCT from CR-115 (Smart Purchase search — different area)  

---

## Description

Restaurant Settings Step 5 allows the owner to configure **"Search By"** options (e.g. "order id", "table no", "user id"). This controls which search criteria are available to staff when searching orders.

However, whatever search filter UI exists in the app **always shows all options** regardless of this setting. The `searchBy` setting is saved but never read by any frontend component.

## Evidence

- `restaurantSettingsTransform.js:154`: `searchBy: Array.isArray(advanced.search_by) ? advanced.search_by : []` ✓ mapped in settings
- `profileTransform.js:232`: `searchOptions: api.search_by || ['order id', 'table no', 'user id']` ✓ mapped to `restaurant.searchOptions`
- **Codebase-wide grep** for `searchOptions` / `restaurant.searchOptions`: **ZERO consumers** outside `profileTransform`
- `CartPanel.jsx:869`: references `searchByPhone` (CHG-036 customer phone search) — UNRELATED to `search_by` setting
- `DashboardPage.jsx`: reads `features, settings, cancellation` from `useRestaurant()` — NOT `searchOptions`
- **Break point**: `restaurant.searchOptions` is mapped but no UI component reads it
- Source: AGENT-DISCOVERED
- Confidence: HIGH

## Root Cause

`searchOptions` is correctly mapped in `profileTransform` and available at `restaurant.searchOptions`, but **no UI component reads it** to filter/limit the search options shown to staff.

## Blast Radius

- Need to identify which component(s) render the order search filter/type selector
- That component needs to filter its options array against `restaurant.searchOptions`
- Hotspot files: TBD (depends on which search UI component)
- Estimated scope: SMALL-MEDIUM (~1-2 files)

## Open Questions

- OQ-1: Which component renders the search-by options dropdown/selector for staff? (Need owner to point to it or investigation to locate it)
- OQ-2: Should an empty `searchOptions` array mean "show all" or "show none"?

## Next: Gate 2 (Planning) — locate search UI component, then Gate 3
