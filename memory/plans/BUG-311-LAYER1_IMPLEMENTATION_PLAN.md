# Implementation Plan — BUG-311 Layer 1: Ingredient Name Typeahead Combobox

**Gate:** 3 — Implementation Plan
**Date:** 2026-08-14
**Role:** PLANNING
**Based on:** `memory/impact/BUG-311-LAYER1_TYPEAHEAD_IMPACT_ANALYSIS.md` (Gate 2, design frozen)
**Status:** GATE 3 COMPLETE — Awaiting Gate 4 GO

---

## Pre-Plan Verification (ALL PASS)

| Target | IA Claim | Live Code | Match? |
|---|---|---|---|
| Name Input | `<Input value={newIng.name}...>` at L317 | Confirmed L317–318 | ✅ |
| Save Button | `<Button onClick={addIngredient}...>Save</Button>` at L369 | Confirmed L369 | ✅ |
| Imports | `useState, useEffect, useCallback, useMemo` + `Input` already imported | Confirmed L3, L6 | ✅ |
| No existing combobox | No `IngredientNameCombobox` in file | Confirmed (grep empty) | ✅ |

---

## Overflow Technical Decision

**Problem:** `overflow-hidden` at L272 and `overflow-x-auto` at L299 both clip absolutely positioned children. A normal `position: absolute` dropdown inside the `<td>` will be invisible.

**Solution:** Use `position: fixed` + `useRef` + `getBoundingClientRect()` in `IngredientNameCombobox`. The dropdown is rendered in the normal DOM tree but positioned using fixed coordinates computed from the input's bounding rect. This escapes ALL overflow containers with zero change to the existing card markup. Zero regression risk.

---

## Scope Lock

| File | Change | Touch? |
|---|---|---|
| `components/inventory/InventorySetupPanel.jsx` | +component, +useMemo, +input swap, +button disabled | ✅ YES |
| All other files | — | ❌ NO |

**New files:** NONE
**Total:** 1 file · 5 targeted edits · ~75 lines net

---

## Execution Order

```
Edit 1 → Add IngredientNameCombobox component (before IngredientsTab fn)
Edit 2 → Add useRef import to lucide line (no — useRef already in react import? check)
Edit 3 → Add isExactDuplicate useMemo inside IngredientsTab
Edit 4 → Replace <Input> with <IngredientNameCombobox> at L317
Edit 5 → Update Save button disabled at L369
```

---

## Edit 1 — Add `IngredientNameCombobox` component

**Location:** Insert BEFORE the `function IngredientsTab()` declaration — currently around line 20 (after the constant declarations `UNIT_SMALL_MAP`, `AUTO_CONV_UNITS`, `NO_CONV_UNITS`).

**Anchor line (unique — insert after this):**
```js
const NO_CONV_UNITS = new Set(['gm', 'ml']); // BUG-275: already small, no conversion
```

**Code to insert:**
```jsx
// BUG-311 Layer 1: typeahead warning combobox for ingredient name — shows existing matches as amber warnings
// Uses position:fixed + getBoundingClientRect to escape overflow-hidden/overflow-x-auto ancestors
function IngredientNameCombobox({ value, onChange, existingIngredients, testId }) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const trimmed = (value || '').trim().toLowerCase();

  const filtered = useMemo(() =>
    trimmed.length > 0
      ? existingIngredients.filter(i => i.name.toLowerCase().includes(trimmed))
      : [],
    [existingIngredients, trimmed]
  );

  const exactMatch = trimmed.length > 0 &&
    existingIngredients.some(i => i.name.trim().toLowerCase() === trimmed);

  const openDrop = () => {
    if (!inputRef.current || trimmed.length === 0) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={e => { onChange(e.target.value); if (e.target.value.trim()) openDrop(); else setOpen(false); }}
        onFocus={openDrop}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Ingredient name..."
        className={`h-8 text-sm ${exactMatch ? 'border-amber-400 bg-amber-50' : ''}`}
        autoFocus
        data-testid={testId}
      />
      {open && filtered.length > 0 && (
        <div
          className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999, maxHeight: 192, overflowY: 'auto' }}>
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50">
            Existing ingredients
          </div>
          {filtered.map(ing => {
            const isExact = ing.name.trim().toLowerCase() === trimmed;
            return (
              <div key={ing.id}
                className={`px-3 py-2 text-sm flex items-center justify-between cursor-default
                  ${isExact ? 'bg-amber-50 text-amber-800' : 'text-slate-700 hover:bg-slate-50'}`}
                data-testid={`ingredient-suggestion-${ing.id}`}>
                <span className="font-medium">{ing.name}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  {ing.categoryName && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">{ing.categoryName}</span>
                  )}
                  {isExact && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Already exists</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Import needed:** `useRef` — check if already imported:

Current import line 3: `import { useState, useEffect, useCallback, useMemo } from 'react';`

`useRef` is NOT currently imported. Must add it.

---

## Edit 2 — Add `useRef` to React import

**Current (line 3):**
```js
import { useState, useEffect, useCallback, useMemo } from 'react';
```

**New:**
```js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
```

---

## Edit 3 — Add `isExactDuplicate` useMemo inside `IngredientsTab`

**Location:** Inside `function IngredientsTab()`, after the existing `filtered` useMemo (currently around line 70–75 in the function body).

**Anchor (insert after this block):**
```js
  }, [ingredients, selectedCat, search]);
```
*(This is the end of the `filtered` useMemo)*

**Code to insert:**
```js
  // BUG-311 Layer 1: drives Save button disabled + combobox amber state
  const isExactDuplicate = useMemo(() =>
    newIng.name.trim().length > 0 &&
    ingredients.some(i => i.name.trim().toLowerCase() === newIng.name.trim().toLowerCase()),
    [newIng.name, ingredients]
  );
```

---

## Edit 4 — Replace `<Input>` with `<IngredientNameCombobox>` at L317

**Current (lines 317–318):**
```jsx
                      <Input value={newIng.name} onChange={e => setNewIng(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ingredient name..." className="h-8 text-sm" autoFocus data-testid="new-ingredient-name" />
```

**New:**
```jsx
                      <IngredientNameCombobox
                        value={newIng.name}
                        onChange={v => setNewIng(p => ({ ...p, name: v }))}
                        existingIngredients={ingredients}
                        testId="new-ingredient-name"
                      />
```

**Note:** `data-testid="new-ingredient-name"` is passed as `testId` prop and forwarded to the inner `<Input>` — existing tests continue to locate the element.

---

## Edit 5 — Update Save button disabled at L369

**Current (line 369):**
```jsx
                          <Button size="sm" variant="outline" onClick={addIngredient} className="h-7 px-2 text-xs" data-testid="save-new-ingredient">Save</Button>
```

**New:**
```jsx
                          <Button size="sm" variant="outline" onClick={addIngredient}
                            disabled={isExactDuplicate}
                            className={`h-7 px-2 text-xs ${isExactDuplicate ? 'opacity-50 cursor-not-allowed' : ''}`}
                            data-testid="save-new-ingredient">Save</Button>
```

**Note:** Layer 2 guard (`addIngredient()` at line 141 — `ingredients.some(...)` check already present) stays unchanged as defence-in-depth.

---

## Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | `position: fixed` dropdown shifts on scroll | Low risk — the ingredient add form is in a panel, user unlikely to scroll while dropdown is open. No scroll listener needed. |
| R2 | `useRef` on `<Input>` (shadcn component) — does it forward refs? | Verify shadcn `Input` uses `React.forwardRef`. If not, wrap in a `<div ref={inputRef}>` instead. |
| R3 | `setTimeout 150ms` on blur vs click — click fires after blur | Standard pattern; 150ms lets click register before dropdown closes. |
| R4 | `filtered` useMemo in component vs outer IngredientsTab state | Component receives `existingIngredients` prop — always in sync with parent state. |

---

## Verification Matrix

| # | Edit | How to Verify |
|---|---|---|
| V1 | Edit 1+4 — Dropdown opens on type | Click Add Ingredient → type "tom" → dropdown appears showing "Tomato", "Tomato Paste" |
| V2 | Edit 1+4 — Exact match amber | Type "Tomato" (exact) → input turns amber, "Already exists" badge shown |
| V3 | Edit 1+5 — Save blocked | Exact match → Save button disabled (greyed) |
| V4 | Edit 1+4 — Unique name passes | Type "Saffron" (no match) → no dropdown, Save enabled |
| V5 | Edit 1+4 — Dropdown closes on blur | Click away → dropdown closes |
| V6 | Edit 4 — testid preserved | Existing test `data-testid="new-ingredient-name"` still locatable on inner Input |
| V7 | Edit 5 — Layer 2 still fires | Even if Save button somehow clicked with duplicate → toast "already exists" (L2 defence-in-depth) |
| V8 | Regression | All other add-form fields (unit, category, conversion) unchanged |
| V9 | Regression | Inline edit row unaffected (scope: add form only) |
| V10 | R2 check | Verify `<Input ref={inputRef}>` works; if not, wrap in `<div ref={inputRef}>` |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: BUG-311 → IMPLEMENTED (Layer 1 complete — all 3 layers now shipped)
□ 2. BUG_TRACKER.md: BUG-311 row updated — Layer 1 IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: InventorySetupPanel.jsx entry updated with BUG-311 Layer 1
□ 4. Code markers: // BUG-311 Layer 1 on component + useMemo + input + button
□ 5. Compile check: webpack 0 new warnings
```
