# Impact Analysis — CR-430
## Served items: reduce card height + localStorage-controlled default expand/collapse

**Role:** PLANNING (Gate 2) · **Date:** 2026-10-16 · **Code Reality:** PARTIAL
**Conflict:** CR-433 (L857 was already changed — need to verify current state) · BUG-574 (L846 area) — different lines, CLEAN
**Files:** `OrderCard.jsx` (R5 only)

---

## OD-430-01 + 02 — LOCKED
1. Remove `min-h-[44px] min-w-[44px]` from static served checkmark div (L857) → reduces per-item height 44px → ~20px
2. Default collapsed (`showServed = false`)
3. BUG-293 auto-expand made configurable via localStorage key `mygenie_served_auto_expand`
4. Scope: order card only

## Fix (1 file, 3 edits)

**E-1 — L84-88:** Modify BUG-293 auto-expand `useEffect` to respect localStorage preference:
```js
// BEFORE:
useEffect(() => {
  if (_allServed) setShowServed(true);
}, [_allServed]);

// AFTER: // CR-430
useEffect(() => {
  const autoExpand = localStorage.getItem('mygenie_served_auto_expand') !== 'false';
  if (_allServed && autoExpand) setShowServed(true);
}, [_allServed]);
```
Default `localStorage.getItem('mygenie_served_auto_expand') !== 'false'` = `true` (auto-expand ON by default — staff can disable). Setting to `'false'` → collapsed always.

**E-2 — L857:** Remove `min-h-[44px] min-w-[44px]` from static checkmark div:
```jsx
// BEFORE:
<div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2">
// AFTER:
<div className="flex items-center justify-center -mr-2"> {/* CR-430: removed min-h/w touch target — static, non-interactive */}
```

**E-3 — Note on settings UI:** The localStorage toggle key `mygenie_served_auto_expand` is ready for a UI control (e.g. in a dashboard settings panel or profile). The underlying storage mechanism is set by this IA. UI control is a follow-up CR.

## Anchor verification needed at Gate 3
- L857 was previously targeted by CR-430 intake but NOT implemented — verify exact current className string
- L84-88 BUG-293 useEffect confirmed at boot ✅

## Risk: MEDIUM · R5 · 1 file · ~4 lines
## Verification
- V1: Served section collapsed by default on new orders ✅
- V2: Per-item height reduced (~20px vs 44px) ✅
- V3: Toggle button still shows/hides served section ✅
- V4: `mygenie_served_auto_expand = 'false'` → never auto-expands ✅
- V5: `mygenie_served_auto_expand = 'true'` or unset → auto-expands when all served ✅
