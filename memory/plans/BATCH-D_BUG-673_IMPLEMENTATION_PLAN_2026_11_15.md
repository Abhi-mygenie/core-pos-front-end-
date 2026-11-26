# BATCH-D · BUG-673 (Enter key re-adds default item after search) — Implementation Plan (Gate 3) — 2026-11-15

> Status: GATE_3_PLAN_DRAFT
> HEAD commit: 66ffe518
> Risk: MEDIUM (R5 hotspot file — OrderEntry.jsx, 3315 lines)
> Conflicts: OrderEntry.jsx open items: BUG-656 (L820/L2085/L2919), CR-512, BUG-662, CR-492/493/515 (Batch A Gate 3). **None overlap with BUG-673 lines (L121, L639-647, L762-781, L2085).** CR-523 (this batch) also edits OrderEntry.jsx — **implement BUG-673 first, then CR-523, same branch.**

## 1. What changes
Fix the keyboard highlight so that an empty search box has no item highlighted (Enter does nothing). After a mouse-click add, clear the search and refocus the search box. Prevents accidental re-add of the first menu item.

## 2. Files changed

| # | File | Function / Line at HEAD | What changes |
|---|------|------------------------|--------------|
| E1 | `src/components/order-entry/OrderEntry.jsx` | L121 `useState(0)` | Init `highlightIndex` to `-1` (nothing highlighted) |
| E2 | same | L639-647 (`useEffect` highlight reset) | Empty query → `-1` instead of `0` |
| E3 | same | L768-770 (Enter handler) | Guard: if `highlightIndex < 0` → return (do nothing) |
| E4 | same | L795 (arrow key `querySelectorAll`) | Guard for `-1` index |
| E5 | same | L2085 (`onClick` on grid item) | After add: `setSearchQuery('')` + refocus search when `kbdEnabled` |

## 3. Exact edits

### E1 — OrderEntry.jsx L121

**Before:**
```js
  const [highlightIndex, setHighlightIndex] = useState(0);
```
**After:**
```js
  const [highlightIndex, setHighlightIndex] = useState(-1); // BUG-673: -1 = no item highlighted
```

### E2 — OrderEntry.jsx L639-647

**Before:**
```js
  useEffect(() => {
    if (!kbdEnabled || filteredItems.length === 0) { setHighlightIndex(0); return; }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const exactIdx = filteredItems.findIndex(item => item.itemCode && item.itemCode.toLowerCase() === q);
      setHighlightIndex(exactIdx >= 0 ? exactIdx : 0); // CR-482 R8: exact itemCode match prioritized
    } else {
      setHighlightIndex(0);
    }
  }, [searchQuery, activeCategory, filteredItems.length]); // eslint-disable-line react-hooks/exhaustive-deps
```
**After:**
```js
  useEffect(() => {
    if (!kbdEnabled || filteredItems.length === 0) { setHighlightIndex(-1); return; } // BUG-673: -1
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const exactIdx = filteredItems.findIndex(item => item.itemCode && item.itemCode.toLowerCase() === q);
      setHighlightIndex(exactIdx >= 0 ? exactIdx : 0); // CR-482 R8: exact itemCode match prioritized; name search still highlights first result
    } else {
      setHighlightIndex(-1); // BUG-673: empty search = no highlight
    }
  }, [searchQuery, activeCategory, filteredItems.length]); // eslint-disable-line react-hooks/exhaustive-deps
```

### E3 — OrderEntry.jsx L762-770 (Enter handler)

**Before (L768-770):**
```js
      if (filteredItems.length === 0) return;
      const item = filteredItems[highlightIndex];
      if (!item) return;
```
**After:**
```js
      if (filteredItems.length === 0) return;
      if (highlightIndex < 0) return; // BUG-673: no highlight = Enter does nothing
      const item = filteredItems[highlightIndex];
      if (!item) return;
```

### E4 — OrderEntry.jsx L795 (arrow key navigation)

**Before:**
```js
    const currentEl = menuGridRef.current?.querySelectorAll('[data-kbd-item]')[highlightIndex];
```
**After:**
```js
    const currentEl = highlightIndex >= 0 ? menuGridRef.current?.querySelectorAll('[data-kbd-item]')[highlightIndex] : undefined; // BUG-673: -1 = start from nothing
```

Arrow from `-1`: `currentEl` is `undefined` → `moveFocus` starts from the first element → `nextIdx` becomes 0 → first item highlighted. This is the correct behavior (OD-673-A: "first arrow press highlights item 0").

### E5 — OrderEntry.jsx L2085 (onClick handler on grid item button)

**Before:**
```jsx
                    onClick={() => { if (isEditLocked) { toast({ title: "Order Locked", description: "Bill printed — editing requires permission.", variant: "destructive" }); return; } item.customizable ? setCustomizationItem(item) : addToCart(item); }}
```
**After:**
```jsx
                    onClick={() => { if (isEditLocked) { toast({ title: "Order Locked", description: "Bill printed — editing requires permission.", variant: "destructive" }); return; } item.customizable ? setCustomizationItem(item) : addToCart(item); if (kbdEnabled) { setSearchQuery(''); searchInputRef.current?.focus(); } }} {/* BUG-673: clear + refocus after mouse add */}
```

## 4. Test steps
| # | Steps | Expected |
|---|-------|----------|
| V1 | Keyboard ON → open OE | No orange ring on any item; Enter does nothing |
| V2 | Type short code (exact match) → item is ringed → Enter | Adds it → search clears → no ring → Enter again does nothing |
| V3 | Type a name → first result ringed → Enter | Adds first result → same as V2 |
| V4 | Arrow ↓ from empty search | First item ringed → Enter adds it |
| V5 | Mouse: type search → click item B | Search clears, cursor in search, no ring → Enter does nothing |
| V6 | Customizable item via Enter → popup → close | No ring, Enter does nothing |
| V7 | Keyboard OFF / tablet | No change at all |
| V8 | Regression: CR-482 P1-P16, BUG-649 (+/-), BUG-650 (Ctrl+↓), weight/dynamic-price popups | All still work |
| V9 | Webpack compile | 0 new warnings |

## 5. Rebase note
**CR-523 (next in sequence) also edits OrderEntry.jsx.** Implement BUG-673 first. CR-523 must re-anchor its line numbers on the post-BUG-673 state. Both plans share the same HEAD commit; line shifts from BUG-673 are minimal (no lines added/removed, only changed).

## 6. Scope lock
**WILL change:** OrderEntry.jsx (L121, L639-647, L768, L795, L2085)
**WILL NOT touch:** Esc chain (L728-742), +/- handlers (L744-759), F-keys, Ctrl+↓, CategoryPanel, CartPanel, any transforms/APIs, customizationItem logic, weightEntryItem logic
