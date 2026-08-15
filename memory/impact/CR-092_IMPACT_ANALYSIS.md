# CR-092 — Impact Analysis: Recipe Tabs — Sort Controls

**ID:** CR-092
**Gate:** 2 (Impact Analysis)
**Risk:** LOW
**Code Reality:** NONE — no sort state, comparator, or UI control exists in RecipeManagementPanel.jsx
**Conflict Pre-Check:** CLEAR — RecipeManagementPanel.jsx last modified by CR-073 (2026-07-16, IMPLEMENTED). No active items touch this file.

---

## 1. Data Flow Trace

```
Current flow:
  RecipeManagementPanel.jsx
    → fetchData() → recipeService.getRecipes/getSubRecipes/getAddonRecipes
    → setState: standardRecipes, subRecipes, addonRecipes
    → Tabs: { standard: standardRecipes, sub: subRecipes, addon: addonRecipes }[activeTab]
    → RecipeTab: filters by search → renders cards in received order (API order)

After CR-092:
  Same flow, but BEFORE passing to RecipeTab:
    → sortRecipes(recipes, sortBy) → client-side sort
    → Sorted array passed to RecipeTab / RecipeBulkEditor
```

No API change. No new fetch. Pure client-side sort on already-fetched data.

---

## 2. Affected Files

| # | File | Lines | Change | Est. Lines |
|---|------|-------|--------|------------|
| 1 | `components/inventory/RecipeManagementPanel.jsx` | 235 total | Add sortBy state + comparator fn + sort dropdown in toolbar + apply sort before rendering | ~25 lines |

**Files WILL NOT touch:** `recipeService.js`, `recipeTransform.js`, `RecipeFormPanel.jsx`, `RecipeBulkEditor.jsx`, `RecipeCard`, `constants.js`, `App.js`

---

## 3. Sort Fields Available (from recipe data shape)

| Field | Key | Source | Available |
|---|---|---|---|
| Name | `recipe.name` | All 3 types | YES |
| Cost | `recipe.cost` | BUG-207 wired vendor cost lookup | YES (may be 0 for some) |
| Creation date | `recipe.id` (monotonic) or `recipe.created_at` | Check if API returns `created_at` | NEEDS VERIFY |
| Ingredient count | `recipe.ingredients.length` | All 3 types | YES |

→ Safe default sorts: **Name (A→Z)**, **Name (Z→A)**, **Cost (High→Low)**, **Cost (Low→High)**

---

## 4. UI Placement

Insert sort dropdown **between** the Card/Bulk toggle and the tab content. Exact insertion point: after `data-testid="recipe-view-bulk"` button group (line ~207), before `{viewMode === 'bulk' ? (` (line ~210).

Pattern reference: OrderLedgerMockup.jsx `handleSort` + column header approach, but here a dropdown is simpler (3-4 sort options, not per-column).

---

## 5. Downstream Consumers

- `RecipeTab` component: receives `recipes` prop → currently renders in received order → will now receive sorted array → no change needed inside RecipeTab
- `RecipeBulkEditor`: also receives `recipes` prop → same sorted array → no change needed
- No other component reads recipe list state

---

## 6. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Sort resets on tab switch | LOW | Keep sortBy state across tabs (single state) |
| Cost = 0 items cluster | LOW | Sort zeros to bottom for "High→Low" |
| Performance on large recipe lists | NEGLIGIBLE | <500 items typical, client-side sort is instant |

---

## 7. Owner Decisions — NONE

All sort options are standard. No business logic involved.

---

## Next
Gate 3 (Implementation Plan) → Gate 4 GO
