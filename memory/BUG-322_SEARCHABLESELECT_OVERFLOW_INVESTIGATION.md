# BUG-322 — Investigation Report
# SearchableSelect dropdown clipped by overflow-hidden in RecipeFormPanel (ingredient rows)

**Date:** 2026-08-14
**Role:** INVESTIGATION AGENT (Role 6)
**Steps used:** 4/10
**Confidence:** HIGH — root cause confirmed by code trace, matches screenshots exactly

---

## 1. Summary

Root cause: `SearchableSelect` (local component in `RecipeFormPanel.jsx:12-82`) uses
`position: absolute` (line 46) for its dropdown. The ingredients table container (line 305)
applies `overflow-hidden`, which clips the absolutely-positioned dropdown to the
container boundary.

Classification: **FE_BUG — CODE_ERROR**
Risk: **LOW** (1 file, 1 local component, no API/financial logic)
Planning skip eligible: **YES — owner must approve** (≤10 lines, 1 file, not hotspot, not financial)

---

## 2. Hypotheses Tested

| # | Hypothesis | Method | Result |
|---|---|---|---|
| H1 | SearchableSelect uses position:absolute | Read RecipeFormPanel.jsx:46 | CONFIRMED |
| H2 | Ingredient rows container has overflow-hidden | Read RecipeFormPanel.jsx:305 | CONFIRMED |
| H3 | Top-card dropdowns (working) have no overflow-hidden | Read RecipeFormPanel.jsx:227 | CONFIRMED |
| H4 | SearchableSelect used elsewhere / imported | grep codebase | CONFIRMED local-only, 3 usages same file |

---

## 3. Data Flow Trace

### Broken (ingredient rows — all recipe types)
```
RecipeFormPanel.jsx:305
  <div class="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
    <table>                              ← line 314
      <tbody>
        <tr><td>
          <SearchableSelect>             ← line 328
            [trigger button]
            <div class="absolute z-50 top-full ...">   ← line 46
            ^^^^ CLIPPED by overflow-hidden at line 305
```

### Working (addon item / menu item — top card)
```
RecipeFormPanel.jsx:227
  <div class="bg-white rounded-xl border border-slate-200 p-5 mb-5">
    ← NO overflow-hidden → absolute dropdown escapes fine
    <SearchableSelect>       ← line 243 (addon) / 258 (menu item)
      <div class="absolute z-50 top-full ...">   ← visible ✓
```

BREAK POINT: `RecipeFormPanel.jsx:46` — `position: absolute` + parent `overflow-hidden` at L305

---

## 4. Affected Screens

| Screen | Dropdown | Status |
|---|---|---|
| Create/Edit Sub-Recipe → ingredient rows | SearchableSelect L328 | **BROKEN** |
| Create/Edit Standard Recipe → ingredient rows | SearchableSelect L328 | **BROKEN** |
| Create/Edit Addon Recipe → ingredient rows | SearchableSelect L328 | **BROKEN** |
| Create/Edit Addon Recipe → Addon Item (top card) | SearchableSelect L243 | Working |
| Create/Edit Standard Recipe → Menu Item (top card) | SearchableSelect L258 | Working |

"Cancel popup" = the `X` clear-search button at L57-60 inside the clipped dropdown
is partially/fully hidden when the dropdown overflows the container boundary.

---

## 5. Proposed Fix

**Pattern:** identical to BUG-311 Layer 1 `IngredientNameCombobox` (already shipped, verified).

Change `SearchableSelect` dropdown from `position: absolute` → `position: fixed`
using `getBoundingClientRect()` on the trigger button ref.

### Current (RecipeFormPanel.jsx:36-46)
```jsx
function SearchableSelect({ items, value, onChange, placeholder, error, testId, renderItem }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  ...
  return (
    <div className="relative" ref={containerRef} data-testid={testId}>
      <button type="button" onClick={() => setOpen(o => !o)} ...>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full ..." style={{ minWidth: 240 }}>
```

### New (proposed)
```jsx
function SearchableSelect({ items, value, onChange, placeholder, error, testId, renderItem }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 }); // BUG-322
  const containerRef = useRef(null);
  const triggerRef = useRef(null);   // BUG-322: ref on trigger button for getBoundingClientRect
  const inputRef = useRef(null);

  const openDrop = () => {                                           // BUG-322
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(true);
  };
  ...
  return (
    <div className="relative" ref={containerRef} data-testid={testId}>
      <button type="button" ref={triggerRef} onClick={() => open ? setOpen(false) : openDrop()} ...>
      {open && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left,
                   width: dropPos.width, zIndex: 9999, minWidth: 240,
                   maxHeight: 240, overflowY: 'auto' }}>
```

**Risk:** LOW — 1 file, 1 local component, ~12 lines changed, no API/financial logic, not a hotspot file.

---

## 6. Evidence Artifacts
- Code trace: RecipeFormPanel.jsx lines 46, 305
- Screenshots: owner-provided (broken = ingredient row dropdown clipped; working = addon item dropdown visible)
- SearchableSelect grep: local-only, 3 usages in same file

---

## 7. Recommendations

Classification: FE_FIX
Planning skip eligible: YES (owner must approve — ≤10 lines, 1 file, not hotspot, not financial)
If owner approves direct fix → implement Edit 1 only in RecipeFormPanel.jsx (~12 lines)
If owner wants full gate cycle → Planning Gate 2-3 → Implementation

---

```
Root cause: CONFIRMED — HIGH confidence. Steps: 4/10.
Classification: FE_BUG — CODE_ERROR
Risk: LOW
File: RecipeFormPanel.jsx (1 file, local SearchableSelect component)
FE fix: YES — position:fixed + getBoundingClientRect (same as BUG-311 L1)
Backend ask: NO
Planning skip eligible: YES (owner approval needed)
Retroactive candidates: NONE
Investigation report: /app/memory/BUG-322_SEARCHABLESELECT_OVERFLOW_INVESTIGATION.md
```
