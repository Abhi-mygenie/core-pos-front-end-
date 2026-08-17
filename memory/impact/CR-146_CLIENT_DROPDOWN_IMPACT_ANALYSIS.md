# Impact Analysis — CR-146: Aggregator Client/Branch Selector Dropdown

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-16
**Role:** PLANNING
**Sprint:** pos_5_1
**Based on:** Investigation `memory/investigation/CR140_CR141_CLIENT_DROPDOWN_STOCK_INV_2026_08_16.md`

---

## Header

| Field | Value |
|---|---|
| Code Reality | NONE — no `selectedClientId` state, no filter dropdown exists anywhere |
| Conflict Pre-Check | NO CONFLICTS — `MenuManagementPanel.jsx` last touched by CR-144/145 (addons) + G1 stock toggle (2026-08-16). No in-flight CRs on this file. |
| Risk | LOW — frontend-only, no API change, no financial logic, not in R5 hotspot list |
| Fast Lane | NOT RECOMMENDED — new state + useMemo + JSX dropdown; full Gate flow preferred |

---

## §1 — Current State (Code Reality)

### What exists
- `clients` state in `MenuManagementPanel.jsx` L27 — fetched when `menuType === 'Aggregator'` ✅
- `clients` passed to ProductList (L278) and BulkEditor (L246) — used only for brand selector in add/edit forms ✅
- `foods` prop passed directly to ProductList and BulkEditor — contains ALL aggregator foods, unfiltered

### What is missing
```
❌ selectedClientId state
❌ Client filter dropdown in header
❌ filteredFoods derived state
❌ categoriesWithCounts using filtered foods (counts would be wrong in filtered view)
❌ filteredFoods passed to ProductList and BulkEditor
```

---

## §2 — API Behaviour (Confirmed via Investigation)

| Fact | Source |
|---|---|
| `GET /restaurant-clients` returns brands only (`[{id:109, name:'mallu goan'}]`) | API probe |
| Main Branch has `clientId=0` — NOT in API response | API probe |
| `GET /foods-list?food_for=Aggregator` returns ALL 7 foods regardless of `client_id` param | API probe |
| Each food has `clientId` field: 0 = Main Branch, 109 = mallu goan | Transform L87 |
| Frontend must filter entirely by `f.clientId === selectedClientId` | Confirmed |

**Main Branch must be manually prepended** as `{ id: 0, name: 'Main Branch' }` — never comes from the API.

---

## §3 — Affected Files

| File | Change | Risk |
|---|---|---|
| `components/panels/MenuManagementPanel.jsx` | +`selectedClientId` state + reset useEffect + `filteredFoods` useMemo + `categoriesWithCounts` from filteredFoods + client dropdown JSX + pass `filteredFoods` to ProductList/BulkEditor | LOW |
| All other files | NONE — filtering happens in the parent, children receive filtered data via props | ❌ NO |

**Files WILL NOT touch:** `ProductList.jsx`, `BulkEditor.jsx`, `CategoryList.jsx`, `ProductCard.jsx`, services, transforms, constants.

---

## §4 — Design Decisions (All owner-confirmed via investigation)

| # | Decision |
|---|---|
| D1 | Dropdown appears ONLY when `menuType === 'Aggregator'` AND `clients.length > 0` |
| D2 | Options: `[All, Main Branch, ...client names]` — "All" = null, "Main Branch" = 0, brand = client.id |
| D3 | "Main Branch" manually prepended — not from API |
| D4 | Filtering is pure frontend: `foods.filter(f => selectedClientId === null \|\| f.clientId === selectedClientId)` |
| D5 | `selectedClientId` resets to `null` when `menuType` changes away from Aggregator |
| D6 | `categoriesWithCounts` computed from `filteredFoods` so category sidebar counts are accurate per client view |
| D7 | Both ProductList (card view) AND BulkEditor receive filtered foods |

---

## §5 — Data Flow Trace

```
CURRENT:
  fetchFoods() → foods (all aggregator) → [categoriesWithCounts, ProductList, BulkEditor]

AFTER CR-146:
  fetchFoods() → foods (all aggregator) → filteredFoods (by selectedClientId) → [categoriesWithCounts, ProductList, BulkEditor]

  selectedClientId = null  → filteredFoods = foods (all)
  selectedClientId = 0     → filteredFoods = foods.filter(f => f.clientId === 0)  [Main Branch]
  selectedClientId = 109   → filteredFoods = foods.filter(f => f.clientId === 109) [mallu goan]
```

---

## §6 — Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | clients.length === 0 (restaurant has no sub-brands) | Dropdown hidden when `clients.length === 0`. Normal experience preserved. |
| R2 | filteredFoods affects BulkEditor save (does it submit only filtered foods?) | BulkEditor saves rows individually via `editFood()`/`addFoodAggregator()`. No batch payload of all foods. Passing filtered foods is safe. |
| R3 | Category counts wrong when filtering | Fixed: `categoriesWithCounts` uses `filteredFoods` not `foods`. |
| R4 | `selectedClientId` persists when switching to Normal mode | Reset in useEffect watching `menuType`. |
| R5 | User switches client while in BulkEditor with unsaved changes | BulkEditor has its own "No Changes" / "Save N Changes" guard. Switching the client filter unmounts/remounts BulkEditor — user loses unsaved changes. Acceptable (same as switching menu type). |

---

## §7 — Verification Matrix

| # | Edit | How to Verify |
|---|---|---|
| V1 | Dropdown appears in Aggregator mode | Switch to Aggregator → second `<select>` appears beside menu type dropdown |
| V2 | Dropdown absent in Normal mode | Switch to Normal → second dropdown gone |
| V3 | "All" shows all aggregator foods | Select All → all 7 foods visible |
| V4 | "Main Branch" filters to clientId=0 | Select Main Branch → only "69 special", "_GOAN_TEST_MAIN_", "poi", "poi_poi_A", "poison" |
| V5 | "mallu goan" filters to clientId=109 | Select mallu goan → only "_GOAN_TEST_CLIENT_", "test_A" |
| V6 | Category counts update per filter | Select Main Branch → category sidebar counts match filtered food count |
| V7 | BulkEditor also filtered | Open Bulk Edit in Main Branch → only 5 rows |
| V8 | Reset on menu type change | Switch Aggregator → Main Branch → switch to Normal → back to Aggregator → dropdown shows "All" |
| V9 | Regression: Normal mode unchanged | Switch to Normal → foods unchanged, no client dropdown |

---

## §8 — Post-Code Registry Checklist

```
□ 1. registry.json: CR-146 → IMPLEMENTED, sprint_key: pos_5_1
□ 2. CR_REGISTRY.md: CR-146 row added
□ 3. FILE_OWNERSHIP.md: MenuManagementPanel.jsx updated
□ 4. Code markers: // CR-146 on selectedClientId, filteredFoods, dropdown, reset
□ 5. Compile: webpack 0 new warnings
```

---

## §9 — Owner Decisions Needed

None. All design decisions confirmed by the investigation and owner's feature request description.
