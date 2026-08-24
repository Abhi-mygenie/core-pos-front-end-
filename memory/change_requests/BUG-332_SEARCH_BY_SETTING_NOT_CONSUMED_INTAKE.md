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

## Open Questions — RESOLVED (2026-08-19)

- OQ-1 ✅ **Component found:** `DashboardPage.jsx` search bar — `searchItems()` helper at line 84, called at lines 1205/1212/1219/1231
- OQ-2 ✅ **Empty array = no restriction** — if `searchOptions` is empty, search all fields (same as current behaviour, no degradation)

## Planning Investigation Findings (2026-08-19)

### Component Located
The search UI is the **Dashboard typeahead search bar**. User types → dropdown shows grouped results (TAKEAWAY ORDERS, DINE-IN, etc.).

### Confirmed Root Cause
```js
// DashboardPage.jsx line 1205 — ALL hardcoded, restaurant.searchOptions ignored:
results.tables = searchItems(allSearchableTables, query, item => ({
  all: [item.label || item.id, item.customer, item.phone]  // ← HARDCODED
}));
results.takeAway = searchItems(takeAwayOrders, query, item => ({
  all: [item.orderNumber, item.customer, item.phone]       // ← HARDCODED
}));
// Same for delivery (line 1212) and rooms (line 1231)

// restaurant.searchOptions — correctly mapped at profileTransform.js:232:
searchOptions: api.search_by || ['order id', 'table no', 'user id']  // ← EXISTS but never used
```

### searchOptions → field mapping
| searchOptions value | Field to include |
|---|---|
| `'order id'` | `item.orderNumber` / `item.id` |
| `'table no'` | `item.label` / `item.tableId` |
| `'phone no'` | `item.phone` |
| `'user id'` | `item.customer` (customer name) |

### Separate CR noted (no registration)
StatusConfigPage has ~14 localStorage settings to migrate to server-side — future CR.

### Owner Decisions: NONE REMAINING
**Status: Ready for Gate 2 Impact Analysis**
