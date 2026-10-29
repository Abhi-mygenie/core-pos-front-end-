# CR-478 — Impact Analysis + Implementation Plan
## Item Consumption Report: Search by Ingredient Name

**Date:** 2026-10-28
**Stage:** Gate 2 + Gate 3 (combined — Fast Lane eligible)
**Agent role:** PLANNING
**Code Reality:** NONE — search only matches `item_name` at L98
**Conflict Pre-Check:** `ItemConsumptionReportPage.jsx` last touched CR-475 (food_for filter). No conflict — different line (L97 vs L98).

---

## 1. Root Cause

`ItemConsumptionReportPage.jsx:98`:
```js
if (itemSearch) result = result.filter(it => it.item_name?.toLowerCase().includes(itemSearch.toLowerCase()));
```
Only checks `item_name`. The ingredient arrays (`consumed_ingredients`, `returned_ingredients`, `wastage_ingredients`) are loaded in each item but never searched.

## 2. Data Flow Trace

```
API returns 78 items, each with:
  item_name: "Americano"
  consumed_ingredients: [{ ingredient_name: "Blue Tokai Attikan Coffee", qty, unit }]
  returned_ingredients: [{ ingredient_name: "Blue Tokai Attikan Coffee", qty, unit }]
  wastage_ingredients:  [{ ingredient_name: "Blue Tokai Attikan Coffee", qty, unit }]

Current search: itemSearch → match on item_name only → misses ingredient names
After fix:      itemSearch → match on item_name OR any ingredient_name → 3 results for "Vanilla Protein Powder"
```

## 3. Verified Impact (API probe)

| Search Term | BEFORE | AFTER |
|---|---|---|
| "Vanilla Protein Powder" | 0 results | **3 results** (Vanilla Berry Protein Shake, Banana Date Energiser, Cacao Peanut Banana Date) |
| "Blue Tokai" | 0 results | **23 results** (all coffee-based menu items) |
| "Americano" (item name) | 1 result | 1 result (unchanged — item_name match still works) |

## 4. Risk: LOW
- Client-side filter only — no API, state, or provider changes
- Same data, same fetch, same rendering
- 1 file, 2 edits, ~8 lines

## 5. Exact Fix

### E1 — Filter logic (L98)
```js
// BEFORE:
if (itemSearch) result = result.filter(it => it.item_name?.toLowerCase().includes(itemSearch.toLowerCase()));

// AFTER:
if (itemSearch) { // CR-478: search item name + ingredient names
  const term = itemSearch.toLowerCase();
  result = result.filter(it => {
    if (it.item_name?.toLowerCase().includes(term)) return true;
    const ings = [...(it.consumed_ingredients || []), ...(it.returned_ingredients || []), ...(it.wastage_ingredients || [])];
    return ings.some(ing => ing.ingredient_name?.toLowerCase().includes(term));
  });
}
```

### E2 — Placeholder text (L276)
```js
// BEFORE:
placeholder="Search item name..."

// AFTER:
placeholder="Search item or ingredient..." // CR-478
```

## 6. Verification Matrix

| # | Check | How |
|---|---|---|
| V1 | Search "Vanilla Protein Powder" → 3 results | Browser: type in search, verify 3 items appear |
| V2 | Search "Blue Tokai" → 23 results | Browser: type in search, verify coffee items |
| V3 | Search "Americano" → 1 result (item name match) | Browser: verify existing behavior unchanged |
| V4 | Placeholder updated | Browser: see "Search item or ingredient..." |
| V5 | Compile clean | tail log |
| REG | Existing filters (menu type, date) unchanged | Navigate, apply filters |

## 7. Post-Code Registry Checklist
```
- [ ] registry.json: CR-478 → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: ItemConsumptionReportPage.jsx L98 + L276
- [ ] Code markers: // CR-478 on both edits
- [ ] Compile: 0 new warnings
```

**Fast Lane ELIGIBLE. Awaiting Gate 4 GO.**
