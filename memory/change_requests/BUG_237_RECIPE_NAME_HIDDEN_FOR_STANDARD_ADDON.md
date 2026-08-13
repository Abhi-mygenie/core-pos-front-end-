# BUG-237: Recipe Form — Recipe Name Field Should Be Hidden for Standard & Addon Types (Auto-Derived from Item Selection)

**Registered:** 2026-07-24
**Source:** OWNER-REPORTED (screenshot evidence provided)
**Classification:** BUG
**Severity:** P2
**Risk:** LOW
**Duplicate Check:** DISTINCT (no existing bug covers this specific field-visibility issue)
**Fast Lane Eligible:** YES (1 file, ≤10 lines logic, no API/financial/hotspot)
**Code Reality:** NONE — bug still present in current code

---

## Summary

On the **Create Recipe** (standard) and **Create Addon Recipe** forms, the "Recipe Name" text input is visible and marked as required (`*`). However:

- **Standard recipe:** The transform (`recipeTransform.js:116`) sends `name: data.foodId` — the backend expects the food_id integer in the `name` field. The user-typed recipe name is **completely ignored** by the API payload. The field is dead UI.
- **Addon recipe:** The transform (`recipeTransform.js:189`) sends `name: data.name` — but per owner directive, the recipe name should be the addon item's name, not user-typed input.
- **Sub-recipe:** The user types the name (correct behavior, no change).

### Expected Behavior

1. **Standard recipe:** Hide the "Recipe Name" input. Auto-derive name from the selected Menu Item (food). Display the food name as a read-only label or simply remove the field.
2. **Addon recipe:** Hide the "Recipe Name" input. Auto-derive name from the selected Addon Item. Display the addon name as a read-only label or remove the field.
3. **Sub-recipe:** Keep the "Recipe Name" input as-is (user types the name).

### Current Behavior

The "Recipe Name" input is always visible for all recipe types (standard, addon, sub). For standard, the typed value is silently discarded. For addon, the typed value is sent but owner wants it auto-derived.

---

## Evidence

- **Screenshot 1:** "Create Addon Recipe" with empty Recipe Name field visible + Addon Item dropdown
- **Screenshot 2:** "Create Addon Recipe" with "poi5 (₹90)" selected in Addon Item, Recipe Name still empty and editable
- **Source:** Owner-reported with screenshots
- **Confidence:** CONFIRMED (code trace verifies the transform behavior)

---

## Blast Radius

- **Files affected:** 1 (`RecipeFormPanel.jsx`)
- **Lines changed:** ~15 (hide field + auto-set name from selected item on standard/addon)
- **Hotspot files:** NO
- **Estimated scope:** SMALL

### Code References

| # | File | Line | Current | Issue |
|---|------|------|---------|-------|
| 1 | `RecipeFormPanel.jsx` | L26 | `const [name, setName] = useState(recipe?.name \|\| '')` | Name state always initialized from recipe prop — needs auto-derive logic |
| 2 | `RecipeFormPanel.jsx` | L92 | `if (!name.trim()) newErrors.name = 'Recipe name is required'` | Validation should be different for standard/addon (name auto-derived) |
| 3 | `RecipeFormPanel.jsx` | L108 | `name: name.trim()` | For standard: ignored (transform sends foodId). For addon: should be addon name |
| 4 | `RecipeFormPanel.jsx` | L147-149 | Recipe Name input visible for ALL types | Should be hidden for standard & addon |
| 5 | `recipeTransform.js` | L116 | `name: data.foodId` | Standard recipe: confirms FE name is discarded |
| 6 | `recipeTransform.js` | L189 | `name: data.name` | Addon recipe: sends user-typed name — should send addon item name |

---

## Open Questions

None — owner directive is clear: standard & addon use the item name, sub-recipe stays user-input.

---

## Related Items

- **BUG-197:** CR-072 Inventory Post-Delivery (10 gaps) — includes recipe form field renames
- **BUG-214:** Addon Recipe Dropdown Shows Menu Items Instead of Addon Items — IMPLEMENTED
- **BUG-215:** Recipe Forms Validation Errors Not Shown — IMPLEMENTED
- **BUG-206:** RecipeBulkEditor name:null fix — IMPLEMENTED

---

## Next

Planning Gate 2 (or Fast Lane if owner approves — 1 file, ≤15 lines, LOW risk, non-financial).
