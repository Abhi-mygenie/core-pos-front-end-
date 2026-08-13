# Impact Analysis + Implementation Plan — BUG-277, BUG-278, BUG-279

**IDs:** BUG-277, BUG-278, BUG-279
**Gate:** 2+3 (combined — all same file, no conflicts, LOW risk)
**Date:** 2026-07-29
**Risk:** LOW (all 3)
**Files:** 1 (`IngredientBulkEditor.jsx`) | **Lines changed:** ~12

---

## Conflict Pre-Check

All 3 bugs are in `IngredientBulkEditor.jsx`. BUG-274 + BUG-276 already IMPLEMENTED in this file (different lines). No overlap:
- BUG-277: L64-67 (useEffect)
- BUG-278: L151 (handleSave entry)
- BUG-279: L336 (thead)

No other open items touch this file.

---

## BUG-277 — Multi-Select Resets

### Impact
- `useEffect([allItems])` at L64-67 fires on every prop reference change
- Parent creates new `allItems` array each render → selection wiped
- Blocks all multi-select operations (bulk delete, etc.)

### Edit 1 — Stable ID guard
**L61:** Add ref:
```js
const prevItemIds = useRef('');
```

**L64-67:** Replace:
```js
useEffect(() => {
    setRows(allItems.map(buildRow));
    setSelected(new Set());
}, [allItems]);
```
With:
```js
useEffect(() => {
    const ids = allItems.map(i => i.id).join(',');
    if (ids !== prevItemIds.current) {
      prevItemIds.current = ids;
      setRows(allItems.map(buildRow));
      setSelected(new Set());
    }
}, [allItems]);
```

---

## BUG-278 — DELETE Double Fire

### Impact
- Two Save buttons (L300 toolbar + L466 footer) both call `handleSave`
- `disabled={saving}` uses async state — both can fire before re-render
- Each ingredient DELETE called twice → 400 on second call

### Edit 2 — useRef re-entry guard
**L61 (same area):** Add ref:
```js
const saveInProgress = useRef(false);
```

**L151:** Wrap handleSave:
```js
const handleSave = async () => {
    if (saveInProgress.current) return; // BUG-278: prevent double fire
    saveInProgress.current = true;
    try {
      // ... existing code ...
    } finally {
      saveInProgress.current = false;
    }
};
```

---

## BUG-279 — Header Not Sticky

### Impact
- 426 items across 31 categories — header scrolls away
- User loses context of which column is which

### Edit 3 — Sticky thead
**L336:** Change:
```jsx
<thead>
```
To:
```jsx
<thead className="sticky top-0 z-10 bg-slate-50">
```

---

## Verification Matrix

| # | Test | Method | Expected |
|---|------|--------|----------|
| V1 | Select row A checkbox → select row B checkbox → both remain selected | Playwright | "2 selected" banner stays |
| V2 | Select 2 rows → Delete Selected → Save → network shows N calls (not 2N) | Playwright + Network | No duplicate DELETE calls |
| V3 | Scroll down in bulk editor → header row stays pinned at top | Playwright screenshot | Header visible while scrolled |
| V4 | Compile: webpack | log | compiled successfully |

## Rollback
Revert 3 edits. Selection resets, double fire, header scrolls away.
