# Impact Analysis — BUG-311 Layer 1: Ingredient Name Typeahead Combobox

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-14
**Role:** PLANNING
**Sprint:** pos_5_1
**Status:** GATE 2 COMPLETE

---

## Header

| Field | Value |
|---|---|
| Code Reality | NONE — no combobox exists on the ingredient name input |
| Conflict Pre-Check | NO CONFLICTS — last touch on add-form area: BUG-311 L2 (2026-08-13, IMPLEMENTED). Different lines. |
| Items | BUG-311 Layer 1 |
| Risk | LOW — UI only, no API change, no financial logic |

---

## Owner Decisions Locked

| # | Decision |
|---|---|
| Style | **Full dropdown** — opens as user types, shows existing ingredients |
| Exact match | **Block** — Save button disabled when typed name exactly matches existing ingredient |
| Scope | **Add form only** — not in edit form (see note below) |
| Match type | **Partial** — same as expense: "Tom" shows "Tomato", "Tomato Paste" |

**Note on edit form:** When renaming an ingredient to a name that already exists, a duplicate would be silently created. The same guard would apply there. This is deferred per owner decision — document as a follow-up item.

---

## §1 — Current State

```
InventorySetupPanel.jsx:317-318 (add form name cell):
  <Input
    value={newIng.name}
    onChange={e => setNewIng(p => ({ ...p, name: e.target.value }))}
    placeholder="Ingredient name..."
    className="h-8 text-sm"
    autoFocus
    data-testid="new-ingredient-name"
  />

InventorySetupPanel.jsx:369 (Save button — no disabled for duplicates):
  <Button size="sm" variant="outline" onClick={addIngredient}
    className="h-7 px-2 text-xs"
    data-testid="save-new-ingredient">Save</Button>
```

**`ingredients` state** is already in scope at line 21:
`const [ingredients, setIngredients] = useState([])`  — populated by `fetchData()`. Contains `{ id, name, categoryId, categoryName, ... }` for every existing ingredient.

---

## §2 — Reference Pattern

**Expense `ItemCombobox`** (`ExpenseEntryPanel.jsx:65-160`):
- Plain text input at top of dropdown
- Filters `items` by `search.toLowerCase().includes`
- Each row: item name + category badge
- No match: shows "+ Use {text} (new item)" option → free-text entry
- User can CLICK an existing item to SELECT it (fills the expense form)

**Ingredient combobox is different:**
- User is CREATING a new ingredient, not selecting an existing one
- Existing matches = WARNINGS (shown but not "selectable" to reuse)
- Exact match = amber highlight + Save button blocked
- Partial match only = hints shown, Save still enabled (user is typing something new)
- No match at all = green "✓ New ingredient" indicator

---

## §3 — Component Design: `IngredientNameCombobox`

**Location:** Defined as a local function component at the top of `IngredientsTab()` in `InventorySetupPanel.jsx` — same pattern as `ItemCombobox` being local to `ExpenseEntryPanel.jsx`. No new file needed.

```jsx
// BUG-311 Layer 1: typeahead warning combobox for ingredient name input
function IngredientNameCombobox({ value, onChange, existingIngredients, testId }) {
  const [open, setOpen] = useState(false);

  const trimmed = (value || '').trim().toLowerCase();

  const filtered = useMemo(() =>
    trimmed.length > 0
      ? existingIngredients.filter(i => i.name.toLowerCase().includes(trimmed))
      : [],
    [existingIngredients, trimmed]
  );

  const exactMatch = trimmed.length > 0 &&
    existingIngredients.some(i => i.name.toLowerCase() === trimmed);

  return (
    <div className="relative" data-testid={`${testId}-wrapper`}>
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => (value || '').trim() && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Ingredient name..."
        className={`h-8 text-sm ${exactMatch ? 'border-amber-400 bg-amber-50' : ''}`}
        autoFocus
        data-testid={testId}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
          style={{ minWidth: 220 }}>
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            Existing ingredients
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.map(ing => {
              const isExact = ing.name.toLowerCase() === trimmed;
              return (
                <li key={ing.id}
                  className={`px-3 py-2 text-sm flex items-center justify-between cursor-default
                    ${isExact ? 'bg-amber-50 text-amber-800' : 'text-slate-700 hover:bg-slate-50'}`}
                  data-testid={`ingredient-suggestion-${ing.id}`}>
                  <span className="font-medium">{ing.name}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {ing.categoryName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">
                        {ing.categoryName}
                      </span>
                    )}
                    {isExact && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                        Already exists
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## §4 — Affected Files & Exact Edits

| File | Lines | Change | Risk |
|---|---|---|---|
| `components/inventory/InventorySetupPanel.jsx` | +65 lines (component) + ~8 lines changed | Add `IngredientNameCombobox` local component + `isExactDuplicate` useMemo + replace Input + update Save button disabled | LOW |

**Files NOT touched:** `inventoryService.js`, `inventoryTransform.js`, `IngredientBulkEditor.jsx`, any hotspot file.  
**New files:** NONE — local component inside existing file.

### Edit A — Add `IngredientNameCombobox` component

Insert the component function BEFORE the `IngredientsTab` function definition (currently around line 20).

### Edit B — Add `isExactDuplicate` derived state

Inside `IngredientsTab`, after the existing `useMemo` for `catCounts` and `filtered`:

```js
// BUG-311 Layer 1: exact duplicate check drives Save button disabled state
const isExactDuplicate = useMemo(() =>
  newIng.name.trim().length > 0 &&
  ingredients.some(i => i.name.trim().toLowerCase() === newIng.name.trim().toLowerCase()),
  [newIng.name, ingredients]
);
```

### Edit C — Replace `<Input>` with `<IngredientNameCombobox>` (line 317)

```jsx
// BEFORE:
<Input value={newIng.name} onChange={e => setNewIng(p => ({ ...p, name: e.target.value }))}
  placeholder="Ingredient name..." className="h-8 text-sm" autoFocus data-testid="new-ingredient-name" />

// AFTER:
<IngredientNameCombobox
  value={newIng.name}
  onChange={v => setNewIng(p => ({ ...p, name: v }))}
  existingIngredients={ingredients}
  testId="new-ingredient-name"
/>
```

### Edit D — Update Save button disabled (line 369)

```jsx
// BEFORE:
<Button size="sm" variant="outline" onClick={addIngredient}
  className="h-7 px-2 text-xs"
  data-testid="save-new-ingredient">Save</Button>

// AFTER:
<Button size="sm" variant="outline" onClick={addIngredient}
  disabled={isExactDuplicate}
  className={`h-7 px-2 text-xs ${isExactDuplicate ? 'opacity-50 cursor-not-allowed' : ''}`}
  data-testid="save-new-ingredient">Save</Button>
```

**Note:** Layer 2 guard (`addIngredient()` pre-save check at line 146) remains as defence-in-depth. No change needed there.

---

## §5 — Risk Assessment

| Factor | Assessment |
|---|---|
| Financial logic | NO |
| Hotspot file (R5) | NO |
| API change | NO — purely UI |
| State management | LOW — `isExactDuplicate` is a derived `useMemo`, no new state atom |
| Regression risk | LOW — only the name input cell in the add row is touched; all other fields unchanged |
| `data-testid="new-ingredient-name"` | PRESERVED on the inner `<Input>` inside the combobox |

**Risk: LOW**

---

## §6 — Conflict Pre-Check

| File | Last Modifier | Conflict? |
|---|---|---|
| `InventorySetupPanel.jsx` | BUG-311 L2 / BUG-314 (2026-08-13, IMPLEMENTED) | **NO** — L2 touches `addIngredient()` (line 146). L1 touches add-form JSX (line 317) and adds local component. Different sections. |

---

## §7 — Verification Matrix

| # | Edit | How to Verify |
|---|---|---|
| V1 | Edit A — Component renders | Open add form → name input shows as normal Input; no dropdown while empty |
| V2 | Edit A — Partial match dropdown | Type "tom" → dropdown appears showing "Tomato", "Tomato Paste" etc. with category badge |
| V3 | Edit A — Exact match highlight | Type "Tomato" (exact) → row highlighted amber + "Already exists" badge |
| V4 | Edit B + D — Save blocked | Type exact existing name → Save button disabled (greyed out) |
| V5 | Edit C — New name passes | Type unique new name → no warning → Save enabled → saves correctly |
| V6 | Regression | All other add-form fields (unit, category, conversion) work as before |
| V7 | Regression | BUG-311 L2 guard still fires if Save somehow called with duplicate (defence-in-depth) |

---

## §8 — Post-Code Registry Checklist

```
□ registry.json: BUG-311 updated with Layer 1 artifact ref
□ BUG_TRACKER.md: BUG-311 row updated with Layer 1 IMPLEMENTED note
□ FILE_OWNERSHIP.md: InventorySetupPanel.jsx entry updated
□ Code marker: // BUG-311 Layer 1 in component + useMemo + button
□ Compile: 0 new warnings
```

---

## §9 — Owner Decision Queue

None — all 4 decisions answered.

**Note on edit form (deferred):**
When a user renames "Oil" → "Butter" and "Butter" already exists, a duplicate would be created. The same `IngredientNameCombobox` could be wired to the edit row's name input. Deferred per owner. Register as follow-up CR when needed.
