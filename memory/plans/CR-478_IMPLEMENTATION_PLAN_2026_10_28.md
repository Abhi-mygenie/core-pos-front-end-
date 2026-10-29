# CR-478 — Implementation Plan (Gate 3)
## Item Consumption Report: Search by Ingredient Name — Line-by-Line

**Date:** 2026-10-28
**Stage:** Gate 3 — Implementation Plan
**Risk:** LOW
**Fast Lane:** ELIGIBLE (1 file, <10 lines, no hotspot, no API/state change)
**File:** `src/pages/reports-module/ItemConsumptionReportPage.jsx` (only file touched)

---

## Edit E1 — Filter Logic (L98)

**Current code (L98):**
```js
    if (itemSearch) result = result.filter(it => it.item_name?.toLowerCase().includes(itemSearch.toLowerCase()));
```

**Replace with:**
```js
    if (itemSearch) { // CR-478: search item name + ingredient names
      const term = itemSearch.toLowerCase();
      result = result.filter(it => {
        if (it.item_name?.toLowerCase().includes(term)) return true; // existing item name match
        const ings = [...(it.consumed_ingredients || []), ...(it.returned_ingredients || []), ...(it.wastage_ingredients || [])];
        return ings.some(ing => ing.ingredient_name?.toLowerCase().includes(term));
      });
    }
```

**Exact search_replace match string (L98):**
```
old: "    if (itemSearch) result = result.filter(it => it.item_name?.toLowerCase().includes(itemSearch.toLowerCase()));"
new: (7-line block above)
```

**Why this works:**
- `item_name` match checked first (existing behavior preserved — fast return)
- If no item name match, concatenate all 3 ingredient arrays and check `ingredient_name`
- `|| []` guards against null/undefined arrays
- `?.toLowerCase()` guards against null ingredient_name

**Performance:** 78 items × ~3 ingredients avg = ~234 string comparisons — negligible for client-side filtering.

---

## Edit E2 — Placeholder Text (L275)

**Current code (L275):**
```js
                <input placeholder="Search item name..." value={itemSearch} ...
```

**Replace with:**
```js
                <input placeholder="Search item or ingredient..." value={itemSearch} ...
```

**Exact search_replace match string:**
```
old: 'placeholder="Search item name..."'
new: 'placeholder="Search item or ingredient..." // CR-478'
```

---

## Execution Sequence

| Step | Edit | What |
|---|---|---|
| 1 | E1 | Replace L98 filter logic (1 line → 7 lines) |
| 2 | E2 | Replace placeholder text (1 word change) |
| 3 | — | Wait for webpack compile |
| 4 | — | Verify via grep + compile log |

**Steps 1 and 2 can run in parallel** — no dependency between them.

---

## Verification Matrix

| # | Check | Method | Expected |
|---|---|---|---|
| V1 | Filter logic has ingredient matching | `grep -A5 "CR-478" ItemConsumptionReportPage.jsx` | 7-line block with `consumed_ingredients`, `returned_ingredients`, `wastage_ingredients` |
| V2 | Placeholder updated | `grep "placeholder" ItemConsumptionReportPage.jsx` | "Search item or ingredient..." |
| V3 | Webpack compiles clean | `tail /var/log/supervisor/frontend.out.log` | "webpack compiled successfully" |
| V4 | Search "Vanilla Protein Powder" → 3 results | Browser: login Palm House → Item Consumption → type search term | 3 items: Vanilla Berry Protein Shake, Banana Date Energiser, Cacao Peanut Banana Date |
| V5 | Search "Blue Tokai" → 23 results | Browser: type search term | 23 coffee-based menu items |
| V6 | Search "Americano" → 1 result (existing behavior) | Browser: type item name | 1 item — item_name match still works |
| V7 | Clear search → all 78 items visible | Browser: clear search field | Full list restored |
| REG | Menu filter (food_for) still works | Browser: select "Normal" or "Bar & Drinks" from dropdown | Filtered correctly alongside ingredient search |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-478 → GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: entry added
- [ ] FILE_OWNERSHIP.md: ItemConsumptionReportPage.jsx L98 + L275
- [ ] Code markers: // CR-478 on both edits
- [ ] Compile check: webpack 0 new warnings
```

---

```
Planning complete: CR-478
Stage: Gate 3 — Implementation Plan (line-by-line)
Code reality: NONE (search only matches item_name)
Risk: LOW
Fast Lane: ELIGIBLE
File WILL change: src/pages/reports-module/ItemConsumptionReportPage.jsx
  Edit E1: L98 — 1 line → 7 lines (filter logic)
  Edit E2: L275 — 1 word change (placeholder)
Files WILL NOT touch: any other file
Verification: 7 checks + 1 regression
Owner decisions: NONE
Next: Gate 4 GO → Implementation
```
