# CR-119 — Gate 2 Impact Analysis

**ID:** CR-119
**Title:** Aggregator Food → Recipe Mapping (Aggregator Inventory Tab)
**Date:** 2026-08-01
**Written by:** PLANNING AGENT
**Risk:** MEDIUM
**Sprint:** pos_5_0

**Source docs:**
- Intake: `/app/memory/change_requests/CR-119_AGGREGATOR_FOOD_MAPPING_INTAKE.md`
- API Spec: `agg_recipe_mapping.md` (owner-provided 2026-08-01)
- Design Guidelines: `/app/design_guidelines.json`

---

## 0. Code Reality

**Code Reality: NONE** — No food-recipe mapping code exists in the codebase.

```bash
grep -rn "food-recipe-mapping\|recipe-mapping\|aggregator_food" /app/frontend/src/ --include="*.js" --include="*.jsx"
# Only hits: BulkEditor.jsx (xlsx import counter) — unrelated
```

---

## 1. Conflict Pre-Check

| File | Last Modifier | Conflict? |
|---|---|---|
| `RecipeManagementPanel.jsx` | CR-088/CR-092 (2026-07-24) | NO — adding a new tab, not modifying existing tabs |
| `api/constants.js` | CR-124 (2026-07-31) | NO — adding new section, not touching existing constants |
| `Sidebar.jsx` | CR-124 (2026-07-31) | NO — not touching sidebar (tab lives inside existing Recipes page) |
| `App.js` | CR-107 (2026-07-31) | NO — no new route needed (tab within existing /recipes page) |

**No conflicts detected.**

---

## 2. Locked Owner Decisions

| # | Decision | Status |
|---|---|---|
| OQ-1 | MD spec file | ✅ RESOLVED — `agg_recipe_mapping.md` provided |
| OQ-2 | Backend API contract | ✅ RESOLVED — 6 endpoints confirmed, probed live (2026-08-01) |
| OQ-3 | Platform scope | ✅ RESOLVED — All aggregator foods unified, filtered by brand/client |
| OQ-4 | UI placement | ✅ RESOLVED — **Inventory → Recipes → new "Aggregator Inventory" tab** |
| OQ-5 | Push vs pull | ✅ RESOLVED — Mapping config (owner assigns recipes to aggregator foods) |

---

## 3. API Contract Summary

**Base URLs:**
- Recipe mapping: `https://preprod.mygenie.online/api/v2/vendoremployee/recipe/`
- Restaurant clients: `https://preprod.mygenie.online/api/v2/vendoremployee/product/`

### Endpoint Map

| # | Action | Method | Path | Auth |
|---|---|---|---|---|
| 1 | List brands/clients | GET | `product/restaurant-clients` | Bearer |
| 2 | List aggregator foods + recipe dropdown | GET | `recipe/food-recipe-mapping?client=X` | Bearer |
| 3 | Assign recipe to food | POST | `recipe/update-recipe-mapping` | Bearer |
| 4 | Unlink recipe from food | POST | `recipe/unlink-recipe-mapping` | Bearer |
| 5 | Batch assign | POST | `recipe/update-recipe-mapping-batch` | Bearer |
| 6 | Export xlsx | GET | `recipe/export-recipe-mapping?type=aggregator` | Bearer |

### Live API Probe Results (kunafamahal, restaurant #689, 2026-08-01)

```
restaurant-clients → 1 client: "Dubai Laban" (id=106)
food-recipe-mapping → 74 aggregator foods, 100 recipes
  Mapped: 71, Unmapped: 3
  Stats: { recipes_total: 100, aggregator_total: 74, aggregator_mapped: 71 }
  Sample: "50-50 Kunafa" → recipe "50-50 kunafa"
  Unmapped: "Pistachio Luxe Mini Bar", "Assorted Mini Kunafa Combo", "Astha-E-Malai Cone"
```

### Key API Response Shape

```json
{
  "success": true,
  "client_id": "0",
  "clients": [{ "id": 106, "name": "Dubai Laban" }],
  "recipes": [{ "id": 4864, "name": "50-50 kunafa" }, ...],
  "aggregator_foods": [
    { "id": 10949, "food_name": "50-50 Kunafa", "recipe_id": 4864, "recipe_name": "50-50 kunafa" },
    { "id": 11236, "food_name": "Pistachio Luxe Mini Bar", "recipe_id": null, "recipe_name": null }
  ],
  "stats": { "recipes_total": 100, "aggregator_total": 74, "aggregator_mapped": 71 }
}
```

---

## 4. Data Flow Trace

```
API (preprod.mygenie.online)
  ↓ GET product/restaurant-clients → brands list
  ↓ GET recipe/food-recipe-mapping?client=X → foods + recipes + stats
  ↓
New Service Layer (recipeService.js or new aggregatorMappingService.js)
  ↓ fetchClients(), fetchFoodRecipeMapping(clientId), updateMapping(), unlinkMapping(), batchUpdate(), exportMapping()
  ↓
New Component: AggregatorInventoryTab
  ↓ Brand selector → filters foods by client
  ↓ Stats bar (total/mapped/unmapped)
  ↓ Searchable food table with recipe combobox per row
  ↓ Batch save → POST update-recipe-mapping-batch
  ↓ Export → GET export-recipe-mapping → xlsx download
  ↓
Existing RecipeManagementPanel.jsx
  ↓ New 5th tab: "Aggregator Inventory"
```

---

## 5. Files Affected

### Files WILL Change

| File | Change | Risk |
|---|---|---|
| `src/api/constants.js` | +6 new endpoint constants in new `RECIPE_MAPPING_ENDPOINTS` section | LOW |
| `src/api/services/recipeService.js` (or new `aggregatorMappingService.js`) | +6 service functions | LOW |
| `src/components/inventory/RecipeManagementPanel.jsx` | +1 TabTrigger + TabContent for "Aggregator Inventory" | LOW |
| `src/components/inventory/AggregatorInventoryTab.jsx` | **NEW** — main component (~300-400 lines) | MEDIUM |

### Files Will NOT Touch

- `App.js` — no new route (tab within existing /recipes page)
- `Sidebar.jsx` — no new nav item (already navigates to /recipes)
- `aggregatorTransform.js` — different feature (live orders, not config)
- `aggregatorService.js` — different feature (live order actions)
- `OrderCard.jsx` — display component, not config
- Any existing recipe tab components

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Wrong recipe assigned to aggregator food | LOW | HIGH (kitchen prepares wrong item) | Confirmation toast on save; unlink action available |
| API returns `clients: 0` (number) instead of `[]` (array) | CONFIRMED | LOW | Guard: `Array.isArray(clients) ? clients : []` |
| Large recipe list (100+) in dropdown slows rendering | LOW | MEDIUM | Use shadcn Combobox with search filtering (Command component) |
| Batch save partial failure | LOW | MEDIUM | Show success_count/failed_count in toast |
| Brand selector confusion (client=0 vs client=id) | LOW | LOW | Default to client=0; only show brand selector if clients exist |

---

## 7. Component Architecture

```
RecipeManagementPanel.jsx
  └── <Tabs>
        ├── Standard Recipes (existing)
        ├── Sub-Recipes (existing)
        ├── Addon Recipes (existing)
        ├── By Ingredient (existing)
        └── Aggregator Inventory (NEW) ← AggregatorInventoryTab
              ├── Brand/Client Select (if clients exist)
              ├── Stats Bar (total / mapped / unmapped)
              ├── Filters Row (search + batch save + export)
              └── Data Table
                    └── Per row: food name | status badge | recipe combobox | unlink button
```

---

## 8. Acceptance Criteria (Updated)

```
AC-1: "Aggregator Inventory" tab appears as 5th tab in Recipes Management
AC-2: Brand/client dropdown shows when restaurant has brands; defaults to all (client=0)
AC-3: Stats bar shows total aggregator foods, mapped count, unmapped count
AC-4: Table lists all aggregator foods with mapped/unmapped badge
AC-5: Searchable recipe combobox per row allows assigning a recipe
AC-6: Unlink button clears recipe assignment
AC-7: Batch save sends all pending changes in one API call
AC-8: Export button downloads xlsx file
AC-9: Search input filters food list by name
AC-10: Toast feedback on save success/failure with counts
```

---

## 9. Open Questions — ALL RESOLVED

| # | Decision | Status |
|---|---|---|
| OQ-6 | **Auto-search combobox** (typeahead) for recipe assignment instead of plain dropdown. User types → filters recipes in real-time → selects. Uses shadcn Command/Popover pattern. Batch save with explicit "Save All" button. | ✅ RESOLVED (owner, 2026-08-01) |

---

## 10. Mockup

Static HTML mockup available at: `/app/frontend/public/cr119-mockup.html`
Access via: `https://pos-react-deploy-6.preview.emergentagent.com/cr119-mockup.html`

---

## Next

**Gate 2 COMPLETE → awaiting owner review → Gate 3 (Implementation Plan)**
