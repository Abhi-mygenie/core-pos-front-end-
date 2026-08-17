# CR-023: Bulk Editor — Text Input Keystroke Lag (422 items)
## Intake + Discovery + Impact Analysis + Implementation Plan
**Registered:** 2026-06-10
**Sprint:** pos_4_0
**Priority:** P1 (UX — makes Bulk Editor unusable at scale)
**Status:** CLOSED — OWNER VERIFIED 2026-06-11 (header was stale at "GATE 3"; owner ruling R2 in baseline consolidation confirmed smoke DONE 2026-06-11, matching Artifact Tracker §7)
**Owner:** Abhi
**Reporter:** Owner (screenshot + chat, 2026-06-10)
**Module:** Menu Management → Bulk Editor

---

## 1. INTAKE

### 1.1 Reporter-stated symptom
When typing in the Name or Description field in Bulk Editor, the input becomes extremely slow/laggy. The cell turns yellow (dirty indicator) and each keystroke takes 200–500ms+ to appear. With 422 menu items loaded, the editor is effectively unusable for text editing.

### 1.2 Screenshot evidence
- Row 2 ("Allfredo Pasta hhh") is being edited — cell has yellow/amber border and background
- Bottom bar shows "1 item modified" with "Save 1 Change" button
- 422 items total across multiple category groups
- Network panel shows multiple API calls (foods-list) firing

---

## 2. DISCOVERY — Root Cause Chain

**File:** `src/components/panels/menu/BulkEditor.jsx` (753 lines, single component)

### 2.1 The render cascade (per keystroke)

Every keypress in a text `<input>` triggers this chain:

| Step | What happens | Cost (422 items × 10 cols) |
|------|-------------|---------------------------|
| **1** | `onChange` calls `updateCell(rowId, field, value)` (L282) | Calls `setRows()` — creates new 422-item array via `.map()` |
| **2** | `dirtyCount` useMemo recomputes (L239) | Iterates all 422 rows × `isRowDirty` (which checks ALL_COLUMNS = up to 31 fields per row) = **~13,000 comparisons** |
| **3** | `groupedRows` useMemo recomputes (L246) | Re-filters, re-groups, re-sorts all 422 items into category buckets |
| **4** | Entire `<tbody>` re-renders (L593) | 422 `<tr>` elements re-created. Each row calls `isRowDirty(row)` AGAIN (L611) + `isDirty(row, col.key)` per cell (L623) |
| **5** | `CellRenderer` re-renders for ALL cells (L672) | **4,220 function calls** (422 rows × 10 visible columns). NOT memoized — plain function component |

**Total per keystroke:** ~13,000 dirty comparisons + 4,220 component renders + DOM diffing for 422 rows. At 60fps budget (16ms/frame), this takes **200–500ms** → visible lag.

### 2.2 Why the yellow appears instantly but typing is slow

The yellow is correct — `isDirty(row, "productName")` returns `true` because `row.productName !== row._original.productName`. The problem isn't the dirty detection logic itself — it's that dirty detection runs for **every cell in every row** on every keystroke, plus the entire table re-renders.

### 2.3 Why dropdowns/toggles feel faster

Dropdowns and toggles are single-click interactions (click → done). The user doesn't notice the 200ms re-render because there's no continuous typing. But the same performance problem exists — it's just masked by the interaction pattern.

### 2.4 `CellRenderer` is not memoized (L672)

```js
function CellRenderer({ col, row, updateCell, catOptions, dirty }) { ... }
```

Plain function — React re-creates it on every parent render. Since `updateCell` is not wrapped in `useCallback` with stable dependencies (it closes over nothing, but each `<td>` passes a fresh `row` object), even `React.memo` on CellRenderer alone won't help without also stabilizing row identity.

### 2.5 `updateCell` creates new row objects for ALL rows (L282–291)

```js
const updateCell = (rowId, field, value) => {
    setRows(prev => prev.map(r => {
      if (r._id !== rowId) return r;       // unchanged rows: same reference ✓
      const u = { ...r, [field]: value };   // edited row: new object
      ...
      return u;
    }));
};
```

Good news: unchanged rows keep their reference identity (`return r`). Bad news: all downstream memos (`dirtyCount`, `groupedRows`) depend on the `rows` array itself, which is always new → they always recompute.

---

## 3. IMPACT ANALYSIS

### 3.1 Affected surface

| Surface | Affected? | Why |
|---------|-----------|-----|
| **Bulk Editor text inputs (Name, Description, Item Code, Allergens, Portion Size)** | **YES** — keystroke lag | Every char triggers full re-render |
| **Bulk Editor number inputs (Price, Tax%, Discount, etc.)** | YES but less noticeable | Same re-render, but number inputs have fewer keystrokes |
| **Bulk Editor dropdowns/toggles/yesno** | Minimal | Single-click, lag not perceptible |
| **Card View (ProductList)** | Not affected | Different component, no shared state |
| **ProductForm (full edit)** | Not affected | Single-item form, no bulk state |
| **Save/Export/Import** | Not affected | Different code paths |

### 3.2 Risk of fix approaches

| Approach | Risk | Effort | Effectiveness |
|----------|------|--------|---------------|
| **A: Local state in text CellRenderer** (type locally, sync to parent on blur) | **LOW** — isolated to CellRenderer, no state architecture change | Small — ~20 lines | **HIGH** — eliminates 4,220 re-renders per keystroke for text inputs |
| **B: React.memo on CellRenderer** | LOW — additive wrapper | Tiny — 1 line | **MEDIUM** — helps only if props are stable; `row` object changes → memo busts for edited row's cells |
| **C: Debounce `updateCell` for text** | MEDIUM — introduces timing complexity, dirty state lags behind typed value | Small | MEDIUM — reduces frequency but doesn't eliminate lag |
| **D: Virtualize table (react-window)** | **HIGH** — major rewrite of table layout, breaks sticky headers, category group headers, drag handles | Large — 100+ lines | HIGH — only renders ~20 visible rows |
| **E: Move to uncontrolled inputs** | MEDIUM — lose React state binding for text fields | Medium | HIGH — but harder to integrate with dirty detection |

---

## 4. IMPLEMENTATION PLAN

### Recommended: Option A — Local state in text CellRenderer

**Concept:** For `type === "text"` and `type === "textarea"` cells, `CellRenderer` manages its own local `useState` for the input value. Typing updates local state only (zero parent re-renders). On **blur**, the local value is flushed to `updateCell()` → parent re-renders once.

**Why this works:**
- Typing is instant — local state update = single component re-render (1 input, not 4,220 cells)
- Dirty detection still works — fires on blur when parent state updates
- Yellow border appears on blur (slight UX change: yellow shows after you leave the field, not mid-typing)
- All other cell types (dropdown, toggle, number, yesno) keep current behavior (single-click, no typing)

**Companion: React.memo on CellRenderer (Option B)**
Wrap `CellRenderer` in `React.memo` so unchanged rows' cells don't re-render when the parent does re-render on blur. This reduces the blur-time cost from 4,220 → ~10 (only the edited row's cells).

### Line-by-line changes

**File:** `src/components/panels/menu/BulkEditor.jsx`

#### Change 1 — Convert CellRenderer to memo'd component with local state for text (L672–678)

**Before:**
```jsx
function CellRenderer({ col, row, updateCell, catOptions, dirty }) {
  const bc = dirty ? COLORS.amber : COLORS.borderGray;
  const base = "w-full px-2 py-1 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200 bg-transparent";

  if (col.type === "text" || col.type === "textarea") {
    return <input type="text" value={row[col.key] || ""} onChange={e => updateCell(row._id, col.key, e.target.value)}
      className={base} style={{ color: COLORS.darkText, borderColor: bc }} placeholder={col.label + "..."} data-testid={`cell-${col.key}-${row._id}`} />;
  }
```

**After:**
```jsx
const CellRenderer = React.memo(function CellRenderer({ col, row, updateCell, catOptions, dirty }) {
  const bc = dirty ? COLORS.amber : COLORS.borderGray;
  const base = "w-full px-2 py-1 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200 bg-transparent";

  if (col.type === "text" || col.type === "textarea") {
    return <LocalTextInput
      value={row[col.key] || ""}
      onChange={val => updateCell(row._id, col.key, val)}
      className={base}
      style={{ color: COLORS.darkText, borderColor: bc }}
      placeholder={col.label + "..."}
      data-testid={`cell-${col.key}-${row._id}`}
    />;
  }
```

Close the function with the same closing, add `});` for React.memo.

#### Change 2 — Add LocalTextInput component (new, ~15 lines, above CellRenderer)

```jsx
function LocalTextInput({ value, onChange, ...props }) {
  const [local, setLocal] = useState(value);
  const ref = useRef(null);

  // Sync from parent when value changes externally (e.g. reset row)
  useEffect(() => { setLocal(value); }, [value]);

  return (
    <input
      {...props}
      ref={ref}
      type="text"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onChange(local); }}
    />
  );
}
```

#### Change 3 — Add React import (L1)

Add `React` to the import (needed for `React.memo`):
```js
import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
```

### What does NOT change
- `updateCell` — same function, same signature
- `isDirty` / `isRowDirty` / `dirtyCount` — same logic, same behavior
- `groupedRows` — same memo
- `buildRow` / `buildPayload` — untouched
- `handleSave` — untouched
- All non-text cell types (number, dropdown, toggle, yesno, time) — untouched

### UX difference after fix
| Aspect | Before | After |
|--------|--------|-------|
| Typing speed | 200-500ms per char (laggy) | Instant |
| Yellow border appears | On every keystroke | On blur (when you leave the field) |
| Dirty count in footer | Updates per keystroke | Updates on blur |
| "Save N Changes" button | Reflects every char | Reflects on blur |
| Tab/click away from field | No change | Triggers parent update + dirty check |

### Files to edit

| File | Change | Lines |
|------|--------|-------|
| `src/components/panels/menu/BulkEditor.jsx` | Add `React` import (L1), add `LocalTextInput` component (~15 lines before CellRenderer), wrap `CellRenderer` in `React.memo`, use `LocalTextInput` for text/textarea cells | ~25 lines net change |

**Total impact:** ~25 lines in 1 file. No new files. No dependency changes. No API changes.

---

## 5. TESTING PLAN

### Smoke Tests
- [ ] Type in Name field (422 items loaded) — input is responsive, no lag
- [ ] Type in Description field — same, no lag
- [ ] Yellow border/background appears when you tab/click away from the field
- [ ] "1 item modified" footer appears after blur
- [ ] Save button works after editing Name/Description
- [ ] Reset row (undo icon) clears the edit and removes yellow

### Regression
- [ ] Dropdown (Category, Type, Tax Type) still works — single click
- [ ] Toggle (Status) still works — single click
- [ ] Yes/No (Packaged Item, Inventory) still works — single click
- [ ] Number inputs (Price, Tax %) still work — typing + blur
- [ ] Add Item → type name → save → appears in list
- [ ] Reset All clears all edits (including text fields currently being typed in)
- [ ] Search still filters items
- [ ] Sort by column still works
- [ ] Excel export/import still works

### Edge Cases
- [ ] Type in Name → DON'T blur → click Save → should save (or show as not dirty?)
  - **Decision needed:** If user types but never blurs, the parent state hasn't updated yet. Save won't include the in-progress edit. Mitigation: on Save click, blur the active input first (via `document.activeElement.blur()`). OR: flush local state on Save.
- [ ] Edit Name → blur → Reset Row → field reverts to original
- [ ] Edit Name → blur → type more → blur again → dirty state still correct

---

## 6. OWNER DECISION QUEUE

| ID | Decision needed | Recommendation |
|----|-----------------|----------------|
| **OD-023-1** | Accept yellow-on-blur instead of yellow-per-keystroke? | **Yes** — owner confirmed 2026-06-10 |
| **OD-023-2** | Save button behavior: should clicking Save auto-blur the active text field first? | **Yes** — owner confirmed 2026-06-10 |

---

## 7. ARTIFACT TRACKER

| # | Artifact | Status |
|---|----------|--------|
| 1 | Intake | DONE |
| 2 | Discovery | DONE |
| 3 | Impact Analysis | DONE |
| 4 | Implementation Plan | DONE |
| 5 | Owner Decisions | DONE — both confirmed 2026-06-10 |
| 6 | Code Implementation | DONE |
| 7 | QA Report | DONE — iteration 8 passed |
| 8 | Owner Smoke / Signoff | DONE — 2026-06-11 |

---

## 8. CROSS-REFS
- BulkEditor introduced in CR-014 (Menu Management Phase 2)
- No related performance bugs in tracker
- `CellRenderer` is self-contained — no external consumers
- `LocalTextInput` pattern is standard React optimization (used by AG Grid, TanStack Table, etc.)
