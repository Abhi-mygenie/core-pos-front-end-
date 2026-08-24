# CR-104 — Item-Level Complementary Reason
## Gate 2: Impact Analysis

**Date:** 2026-08-22
**Role:** PLANNING agent
**Stage:** Gate 2 — Impact Analysis
**Risk:** MEDIUM (R5 hotspots: OrderEntry.jsx + CollectPaymentPanel.jsx)
**Sprint:** POS 6.0

---

## Owner Decisions — ALL RESOLVED

| # | Question | Answer |
|---|---|---|
| OQ-Backend | `complementary_reason` field in API | **CONFIRMED** — backend has added `complementary_reason` to `order_details`. Pass at item level when `isComplementaryRuntime = true` |
| OQ-1 | UI for reason input | **CONFIRMED 2026-08-22 — INLINE** — small text input appears ONLY after the item is marked complimentary (when `isComp === true`). Hidden when unchecked. No modal, no popup. Cashier-friendly — can skip with no friction |
| OQ-2 | Mandatory or optional? | **OPTIONAL** — never blocks settle, no validation |
| OQ-3 | Merge with CR-058? | **KEEP SEPARATE** — CR-058 is order-level bulk action; CR-104 is per-item reason on existing checkbox |

---

## Code Reality: NONE

No `compReason` or `complementary_reason` in cart item shape, toggle handler, CollectPaymentPanel UI, or orderTransform payload. Existing `isComplementaryRuntime` boolean toggle is a bare boolean flip — no reason field attached.

---

## Step 1 — Conflict Pre-Check

| File | Last Modifier | Open Conflict? |
|---|---|---|
| `OrderEntry.jsx` | BUG-334 agent 2026-08-20 (table switch fix) | ✅ Clean — additive new handler |
| `CollectPaymentPanel.jsx` | BUG-304/305 agent 2026-08-11 (tax split) | ✅ Clean — additive UI below existing comp label |
| `orderTransform.js` | BUG-305 agent 2026-08-11 (discountableRatio) | ✅ Clean — add one field in buildCartItem |

---

## Step 2 — Data Flow

### Current (broken — no reason)

```
User taps comp checkbox on item
  → OrderEntry.jsx:810 toggleItemComplimentary(itemId)
    → cartItems.map → { ...item, isComplementaryRuntime: !prev }
    (reason NEVER captured)

CollectPaymentPanel renders:
  isComp=true → shows "(Complimentary)" green label
  (no reason input rendered)

orderTransform.buildCartItem():
  isRuntimeComp=true → is_complementary: 'Yes'
  (complementary_reason: MISSING from payload)
```

### Fixed (CR-104)

```
User taps comp checkbox on item
  → OrderEntry.jsx toggleItemComplimentary(itemId)
    → cartItems.map → { ...item, isComplementaryRuntime: !prev, compReason: '' }
    (reason initialised as empty on toggle ON; cleared on toggle OFF)

CollectPaymentPanel renders:
  isComp=false → reason input HIDDEN (not rendered at all)
  isComp=true  → "(Complimentary)" green label [same as today]
               → reason input APPEARS below label (CONFIRMED UX 2026-08-22: only shown after marked comp)
                  placeholder="Reason (optional)"
                  value={item.compReason || ''}
                  onChange → onSetCompReason(item.id, value)
  isComp toggled OFF → reason input disappears, compReason cleared to ''

OrderEntry.jsx setCompReason(itemId, reason):
  → cartItems.map → { ...item, compReason: reason }

orderTransform.buildCartItem():
  isRuntimeComp=true → is_complementary: 'Yes'
  + complementary_reason: item.compReason || ''   ← NEW FIELD
```

---

## Step 3 — UI Design (Inline, no modal)

Based on OQ-1 (inline, cashier-friendly, optional):

```
BEFORE comp:
  ☐  Butter Chicken        ×1    ₹319

AFTER comp checkbox ticked:
  ☑  Butter Chicken        ×1    ₹0
     (Complimentary)
     [________________ Reason (optional) ________________]
     ← small, single-line text input, subtle gray border, text-xs
```

- Input appears **only** when `isComp === true`
- Disappears when cashier unticks the comp checkbox (reason cleared)
- Width: `flex-1`, matching item name width
- Style: `text-xs text-zinc-500 border border-zinc-200 rounded px-2 py-0.5 mt-1`
- Placeholder: `"Reason (optional)"`
- `data-testid="comp-reason-input-{item.id}"`

The reason input must be added in **two places** in CollectPaymentPanel.jsx because the Bill Summary section renders items in two similar blocks (one around line 1898, another around line 2267 — both have identical comp checkbox + label structure).

---

## Step 4 — Files WILL Change (3 files)

| File | Change | Risk |
|---|---|---|
| `src/components/order-entry/OrderEntry.jsx` | A) `toggleItemComplimentary`: initialise `compReason: ''` on toggle ON, clear on OFF. B) Add `setCompReason(itemId, reason)` handler. C) Pass `onSetCompReason={setCompReason}` to `<CollectPaymentPanel>` | HIGH (R5) — additive only |
| `src/components/order-entry/CollectPaymentPanel.jsx` | A) Accept `onSetCompReason` prop. B) Render inline reason input in **both** comp item blocks (lines ~1926 and ~2306) when `isComp === true` | HIGH (R5) — additive JSX only |
| `src/api/transforms/orderTransform.js` | Add `complementary_reason: isRuntimeComp ? (item.compReason || '') : ''` in `buildCartItem()` return object, after `is_complementary` field | HIGH (R6 financial) — 1 additive line |

## Files WILL NOT Touch

- `MarkCompModal.jsx` — qty-aware modal, no reason needed there (qty choice only)
- `productTransform.js`
- `restaurantSettingsTransform.js`
- Any billing/settlement/print logic (reason is pass-through only)

---

## Step 5 — Exact Insert Points

### OrderEntry.jsx

**Edit A — toggleItemComplimentary (line 806):**
```js
// Current:
return { ...item, isComplementaryRuntime: !item.isComplementaryRuntime };

// New (CR-104):
const nowComp = !item.isComplementaryRuntime;
return { ...item, isComplementaryRuntime: nowComp, compReason: nowComp ? (item.compReason || '') : '' };
```

**Edit B — new setCompReason handler (after toggleItemComplimentary ~line 812):**
```js
// CR-104: update per-item complementary reason
const setCompReason = useCallback((itemId, reason) => {
  setCartItems(prev => prev.map(item =>
    item.id === itemId ? { ...item, compReason: reason } : item
  ));
}, []);
```

**Edit C — pass prop to CollectPaymentPanel (~line 1777):**
```jsx
onToggleComplimentary={toggleItemComplimentary}
onSetCompReason={setCompReason}   {/* CR-104 */}
```

### CollectPaymentPanel.jsx

**Edit D — accept prop (near line 33):**
```js
onSetCompReason, // CR-104: (itemId, reason) => void — optional inline reason on comp toggle
```

**Edit E — inline input (TWO places, after the "(Complimentary)" span):**

Both around lines ~1926 and ~2306 — after the `{isComp && <span>(Complimentary)</span>}` block:
```jsx
{isComp && !isCatalogLocked && (
  <input
    type="text"
    className="w-full text-xs text-zinc-500 border border-zinc-200 rounded px-2 py-0.5 mt-0.5 outline-none focus:border-zinc-400"
    placeholder="Reason (optional)"
    value={item.compReason || ''}
    onChange={e => onSetCompReason && onSetCompReason(item.id, e.target.value)}
    onClick={e => e.stopPropagation()}
    data-testid={`comp-reason-input-${item.id}`}
  />
)}
```

### orderTransform.js

**Edit F — in buildCartItem() after `is_complementary` (~line 746):**
```js
is_complementary:     isRuntimeComp ? 'Yes' : 'No',
complementary_reason: isRuntimeComp ? (item.compReason || '') : '', // CR-104
```

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| OrderEntry.jsx R5 — two edits | HIGH | Additive. `toggleItemComplimentary` change is minimal (one extra field). `setCompReason` is a new callback. |
| CollectPaymentPanel.jsx R5 — two JSX inserts | HIGH | Purely additive JSX. Both renders already have the `isComp` guard — reason input only appears when item is already comp. |
| orderTransform.js R5/R6 — one line | HIGH | Additive field only. Backend confirmed it accepts `complementary_reason`. Empty string when not comp = safe. |
| Catalog-locked items (`isComplementary=true`) | LOW | Guard `!isCatalogLocked` on the input — catalog-comp items can't be toggled, so reason input won't show |
| MarkCompModal (qty>1 path) | LOW | Modal only handles qty choice, not reason. Reason input is only in CollectPaymentPanel's bill summary view after comp is applied. Scope is correct. |

---

## Verification Matrix

| # | Check | How | Auto |
|---|---|---|---|
| 1 | `compReason` initialised on comp toggle ON | `grep -n "compReason"` in OrderEntry.jsx | AUTO |
| 2 | `setCompReason` handler exists | `grep -n "setCompReason"` | AUTO |
| 3 | Prop passed to CollectPaymentPanel | `grep -n "onSetCompReason"` in OrderEntry.jsx | AUTO |
| 4 | Inline input renders when isComp=true | Browser: tick comp on item → small input appears below label | MANUAL |
| 5 | Input hidden when isComp=false | Browser: untick → input disappears | MANUAL |
| 6 | Reason clears when unchecked | Browser: type reason, untick, re-tick → input is empty | MANUAL |
| 7 | `complementary_reason` in outbound payload | Browser Network tab: settle → check order_details[].complementary_reason | MANUAL |
| 8 | Empty string sent when no reason typed | Network: verify `complementary_reason: ""` not `null`/missing | MANUAL |
| 9 | Catalog-locked items show no input | BulkEditor: mark catalog comp → Collect Bill → no input on those items | MANUAL |
| 10 | Settle still works with or without reason | Place order → mark comp → settle without typing reason → succeeds | MANUAL |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-104 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] CR_REGISTRY.md: CR-104 row updated
- [ ] FILE_OWNERSHIP.md: OrderEntry.jsx + CollectPaymentPanel.jsx + orderTransform.js (CR-104)
- [ ] Code markers: // CR-104 in every modified file
```

---

Planning complete: CR-104
Stage: Gate 2 — Impact Analysis
Code reality: NONE
Risk: MEDIUM (3 R5/R6 files — all additive)
Files WILL change: OrderEntry.jsx · CollectPaymentPanel.jsx · orderTransform.js
Files WILL NOT touch: MarkCompModal.jsx · productTransform.js · any billing logic
Owner decisions: ALL RESOLVED
Docs: /app/memory/impact/CR-104_IMPACT_ANALYSIS.md
Next: Gate 3 → Implementation Plan → Gate 4 GO
