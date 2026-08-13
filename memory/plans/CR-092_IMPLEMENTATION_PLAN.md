# CR-092 — Implementation Plan v2: Recipe Tabs — Sort Controls (Gate 3 REVISED)

**Date:** 2026-07-23 (v2 — corrected for post-CR-088 file state) | **Risk:** LOW
**Entry verification:** PASS 2026-07-23 — RecipeManagementPanel.jsx now 507 lines. viewMode state at L353, fetchData ends L378, Card/Bulk toggle guard at L446-459, By Ingredient ternary at L461, RecipeBulkEditor at L483, RecipeTab×3 at L490/494/498.
**v2 change:** Corrected all line numbers for post-CR-088 v4 file. Added `activeTab !== 'by-ingredient'` guard on sort dropdown (Gap 1 from plan recheck).

## Scope Lock
WILL change: `components/inventory/RecipeManagementPanel.jsx` only (~30 lines added).
WILL NOT touch: `recipeService.js`, `recipeTransform.js`, `RecipeFormPanel.jsx`, `RecipeBulkEditor.jsx`, `RecipeCard`, `ByIngredientTab`.

## Edits (exact, v2 line numbers)

### Edit 1 — `sortBy` state (after L353, after viewMode)
```jsx
  const [viewMode, setViewMode] = useState('card');   // CR-073 · 'card' | 'bulk'
  const [sortBy, setSortBy] = useState('name-asc');   // CR-092
```

### Edit 2 — `sortRecipes` comparator (after L380, after useEffect fetchData, before handleEdit)
```jsx
  // CR-092: client-side sort
  const sortRecipes = useCallback((recipes) => {
    if (!recipes) return [];
    const sorted = [...recipes];
    switch (sortBy) {
      case 'name-asc': return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc': return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'cost-high': return sorted.sort((a, b) => (Number(b.cost) || 0) - (Number(a.cost) || 0));
      case 'cost-low': return sorted.sort((a, b) => (Number(a.cost) || 0) - (Number(b.cost) || 0));
      case 'ings-high': return sorted.sort((a, b) => (b.ingredients?.length || 0) - (a.ingredients?.length || 0));
      default: return sorted;
    }
  }, [sortBy]);
```
Added `if (!recipes) return [];` defensive guard (Gap 2 fix).

### Edit 3 — Sort dropdown UI (after L459, OUTSIDE Card/Bulk guard but WITH OWN guard)
```jsx
        {/* CR-092: Sort controls — hidden on By Ingredient tab */}
        {activeTab !== 'by-ingredient' && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400">
            {({ standard: standardRecipes, sub: subRecipes, addon: addonRecipes })[activeTab]?.length || 0} recipes
          </span>
          <select className="h-8 text-xs border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white"
            value={sortBy} onChange={e => setSortBy(e.target.value)} data-testid="recipe-sort-select">
            <option value="name-asc">Name A→Z</option>
            <option value="name-desc">Name Z→A</option>
            <option value="cost-high">Cost High→Low</option>
            <option value="cost-low">Cost Low→High</option>
            <option value="ings-high">Most Ingredients</option>
          </select>
        </div>
        )}
```
**Gap 1 fix:** Own `activeTab !== 'by-ingredient'` guard added.

### Edit 4 — Apply sort to BulkEditor (L483)
```
recipes={{ ... }[activeTab]}  →  recipes={sortRecipes({ ... }[activeTab])}
```

### Edit 5 — Apply sort to RecipeTab ×3 (L490, L494, L498)
```
recipes={standardRecipes}  →  recipes={sortRecipes(standardRecipes)}
recipes={subRecipes}        →  recipes={sortRecipes(subRecipes)}
recipes={addonRecipes}      →  recipes={sortRecipes(addonRecipes)}
```

### Edit 6 — No import change needed (useCallback already imported at L3)

Total: 1 file, ~30 lines.

## Verification Matrix
| # | Verify | How | Auto? |
|---|--------|-----|-------|
| 1 | Sort dropdown visible on Standard/Sub/Addon tabs | Browser | NO |
| 2 | Sort dropdown HIDDEN on By Ingredient tab | Browser: click By Ingredient → no sort dropdown | NO |
| 3 | Name A→Z default: first card alphabetically first | Browser | NO |
| 4 | Cost High→Low: highest cost recipe first | Browser | NO |
| 5 | Most Ingredients: recipe with most ingredients first | Browser | NO |
| 6 | Sort persists across tab switch (Standard→Sub→back) | Browser | NO |
| 7 | Bulk editor receives sorted data | Toggle to Bulk, rows sorted | NO |
| 8 | Search still works on sorted data | Type search + sort | NO |
| 9 | Recipe count shows correct number per tab | Browser | NO |
| 10 | Regression: By Ingredient tab still works | Browser: select ingredient → table shows | NO |

## Registry Checklist
- [ ] registry.json CR-092 → IMPLEMENTED, pos_5_0
- [ ] `// CR-092` markers in RecipeManagementPanel.jsx
- [ ] webpack clean
