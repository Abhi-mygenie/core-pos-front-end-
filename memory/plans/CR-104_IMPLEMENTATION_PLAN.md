# CR-104 — Item-Level Complementary Reason
## Gate 3: Implementation Plan

**Date:** 2026-08-22
**Role:** PLANNING agent
**Stage:** Gate 3 — Implementation Plan
**Risk:** MEDIUM (R5: OrderEntry.jsx, CollectPaymentPanel.jsx; R6: orderTransform.js)
**Sprint:** POS 6.0
**Gate 2 doc:** `/app/memory/impact/CR-104_IMPACT_ANALYSIS.md`

---

## Entry Verification (confirmed 2026-08-22)

| Plan says | Verified |
|---|---|
| `toggleItemComplimentary` at OrderEntry.jsx:806 — bare boolean flip | ✅ Confirmed |
| CollectPaymentPanel prop list: `onToggleComplimentary` at line 33 | ✅ Confirmed |
| Block 1: `{isComp && <span>(Complimentary)</span>}` at ~line 1924 | ✅ Confirmed |
| Block 2: same structure at ~line 2304 | ✅ Confirmed |
| `is_complementary: isRuntimeComp ? 'Yes' : 'No'` at orderTransform.js:746 | ✅ Confirmed |
| **NEW (found at Gate 3):** second `is_complementary` at line 1539 (collect-bill path) | ✅ Confirmed — plan adds Edit F2 |

---

## Scope Lock

**Files WILL change (3 files, 7 edits):**
- `src/components/order-entry/OrderEntry.jsx` — Edits A, B, C
- `src/components/order-entry/CollectPaymentPanel.jsx` — Edits D, E1, E2
- `src/api/transforms/orderTransform.js` — Edits F1, F2

**Files WILL NOT touch:**
- `MarkCompModal.jsx` · `productTransform.js` · `restaurantSettingsTransform.js`
- Any billing/settlement/print logic beyond the two payload lines

---

## Edit A — `OrderEntry.jsx` — toggleItemComplimentary (line 810)

**Change:** Initialise `compReason` as empty string on comp toggle ON; clear it on toggle OFF.

**Location:** Line 810 — inside `toggleItemComplimentary` callback.

**Before:**
```js
      return { ...item, isComplementaryRuntime: !item.isComplementaryRuntime };
```

**After:**
```js
      // CR-104: carry compReason — initialise empty on toggle ON, clear on toggle OFF
      const nowComp = !item.isComplementaryRuntime;
      return { ...item, isComplementaryRuntime: nowComp, compReason: nowComp ? (item.compReason || '') : '' };
```

**Risk:** LOW — minimal change to existing handler. Adds one field to cart item shape.

---

## Edit B — `OrderEntry.jsx` — new `setCompReason` handler

**Change:** Add new `useCallback` handler after `toggleItemComplimentary` (~line 813).

**Location:** After the closing `}, []);` of `toggleItemComplimentary`.

**Add:**
```js
  // CR-104: update per-item complementary reason (optional inline input in Collect Bill)
  const setCompReason = useCallback((itemId, reason) => {
    setCartItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, compReason: reason } : item
    ));
  }, []);
```

**Risk:** LOW — new standalone callback, no existing code touched.

---

## Edit C — `OrderEntry.jsx` — pass prop to CollectPaymentPanel (~line 1777)

**Change:** Pass `onSetCompReason` alongside the existing `onToggleComplimentary`.

**Location:** Line 1777 in the `<CollectPaymentPanel>` JSX.

**Before:**
```jsx
              onToggleComplimentary={toggleItemComplimentary}
```

**After:**
```jsx
              onToggleComplimentary={toggleItemComplimentary}
              onSetCompReason={setCompReason} // CR-104
```

**Risk:** LOW — additive prop pass-through.

---

## Edit D — `CollectPaymentPanel.jsx` — accept `onSetCompReason` prop

**Change:** Add to prop destructuring after `onToggleComplimentary`.

**Location:** Line 33 (after `onToggleComplimentary` entry).

**Before:**
```js
  onToggleComplimentary, // BUG-018 Part 2: (itemId) => toggle runtime-complimentary flag
  onSetCompItem, // BUG-298 / BUG-299: open MarkCompModal for partial-qty comp
```

**After:**
```js
  onToggleComplimentary, // BUG-018 Part 2: (itemId) => toggle runtime-complimentary flag
  onSetCompReason, // CR-104: (itemId, reason) => void — optional inline reason when item is comp
  onSetCompItem, // BUG-298 / BUG-299: open MarkCompModal for partial-qty comp
```

**Risk:** LOW — additive destructured prop with no default needed (optional callback).

---

## Edit E1 — `CollectPaymentPanel.jsx` — Block 1 inline reason input (~line 1924)

**Change:** Render inline reason input immediately after the `(Complimentary)` span. Input appears **only** when `isComp === true` AND item is not catalog-locked.

**Location:** Lines ~1924-1928 — after the `{isComp && <span>(Complimentary)</span>}` closing `)}`.

**Before:**
```jsx
                                {isComp && (
                                  <span className="ml-1 text-[10px] font-semibold" style={{ color: COLORS.primaryGreen }}>
                                    (Complimentary)
                                  </span>
                                )}
                                {isCancelled && (
```

**After:**
```jsx
                                {isComp && (
                                  <span className="ml-1 text-[10px] font-semibold" style={{ color: COLORS.primaryGreen }}>
                                    (Complimentary)
                                  </span>
                                )}
                                {isComp && !isCatalogLocked && (
                                  <input
                                    type="text"
                                    className="block w-full text-xs text-zinc-500 border border-zinc-200 rounded px-2 py-0.5 mt-0.5 outline-none focus:border-zinc-400 bg-transparent"
                                    placeholder="Reason (optional)"
                                    value={item.compReason || ''}
                                    onChange={e => onSetCompReason && onSetCompReason(item.id, e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    data-testid={`comp-reason-input-${item.id}`}
                                  />
                                )}
                                {isCancelled && (
```

**Risk:** MEDIUM (R5 — CollectPaymentPanel). Purely additive JSX. Input is gated by `isComp && !isCatalogLocked` so it never appears on catalog-comp or non-comp items.

---

## Edit E2 — `CollectPaymentPanel.jsx` — Block 2 inline reason input (~line 2304)

**Change:** Same input in the second Bill Summary render block.

**Location:** Lines ~2304-2307 — after the second `{isComp && <span>(Complimentary)</span>}` closing `)}`.

**Before:**
```jsx
                        {isComp && (
                          <span className="ml-1 text-[10px] font-semibold" style={{ color: COLORS.primaryGreen }}>
                            (Complimentary)
                          </span>
                        )}
                        {isPartial && (
```

**After:**
```jsx
                        {isComp && (
                          <span className="ml-1 text-[10px] font-semibold" style={{ color: COLORS.primaryGreen }}>
                            (Complimentary)
                          </span>
                        )}
                        {isComp && !isCatalogLocked && (
                          <input
                            type="text"
                            className="block w-full text-xs text-zinc-500 border border-zinc-200 rounded px-2 py-0.5 mt-0.5 outline-none focus:border-zinc-400 bg-transparent"
                            placeholder="Reason (optional)"
                            value={item.compReason || ''}
                            onChange={e => onSetCompReason && onSetCompReason(item.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            data-testid={`comp-reason-input-${item.id}`}
                          />
                        )}
                        {isPartial && (
```

**Risk:** MEDIUM (R5). Identical pattern to Edit E1.

---

## Edit F1 — `orderTransform.js` — buildCartItem() — place-order path (line 746)

**Change:** Add `complementary_reason` field in `buildCartItem()` return object, immediately after `is_complementary`.

**Location:** Line 746.

**Before:**
```js
    is_complementary:    isRuntimeComp ? 'Yes' : 'No',
    food_level_notes:    Array.isArray(item.itemNotes) ? item.itemNotes.map(n => n.label).join(', ') : (item.notes || ''),
```

**After:**
```js
    is_complementary:    isRuntimeComp ? 'Yes' : 'No',
    complementary_reason: isRuntimeComp ? (item.compReason || '') : '', // CR-104
    food_level_notes:    Array.isArray(item.itemNotes) ? item.itemNotes.map(n => n.label).join(', ') : (item.notes || ''),
```

**Risk:** HIGH (R6) — 1 additive line. Backend confirmed it accepts `complementary_reason`. Empty string when not comp is safe.

---

## Edit F2 — `orderTransform.js` — buildBillPrintPayload inner loop — collect-bill path (line 1539)

**Change:** Add `complementary_reason` in the second `is_complementary` occurrence inside `buildBillPrintPayload()`.

**Location:** Line 1539.

**Before:**
```js
          is_complementary:   isRuntimeComp ? 'Yes' : 'No',
          food_amount:        isRuntimeComp ? 0 : (unitPrice * qty),
```

**After:**
```js
          is_complementary:    isRuntimeComp ? 'Yes' : 'No',
          complementary_reason: isRuntimeComp ? (item.compReason || '') : '', // CR-104
          food_amount:         isRuntimeComp ? 0 : (unitPrice * qty),
```

**Why this is needed:** `buildBillPrintPayload` constructs the payload for the `collectBillExisting` (settle bill) API call — separate function from `buildCartItem`. Both paths must include `complementary_reason` so the backend receives it on both place-order and settle.

**Risk:** HIGH (R6) — 1 additive line, same pattern as F1. Collect-bill path is the primary settle path; both must be consistent.

---

## Execution Sequence

```
1. Edit A  — OrderEntry.jsx toggleItemComplimentary   (no dependencies)
2. Edit B  — OrderEntry.jsx setCompReason handler      (no dependencies)
3. Edit C  — OrderEntry.jsx prop pass                  (depends on B)
4. Edit D  — CollectPaymentPanel prop accept            (no dependencies)
5. Edit E1 — CollectPaymentPanel Block 1 input          (depends on D)
6. Edit E2 — CollectPaymentPanel Block 2 input          (depends on D)
7. Edit F1 — orderTransform.js buildCartItem            (no dependencies)
8. Edit F2 — orderTransform.js buildBillPrintPayload    (no dependencies)

Webpack compile check after Edit F2 (all edits done).
```

Edits 1+2+7+8 can run in parallel (independent files/sections).
Edits 3, 5, 6 depend on their setup steps but 5+6 can run in parallel.

---

## Verification Matrix

| # | Edit | File | What to verify | How | Auto |
|---|---|---|---|---|---|
| 1 | A | OrderEntry.jsx | `compReason` in toggleItemComplimentary | `grep -n "compReason" OrderEntry.jsx` | AUTO |
| 2 | B | OrderEntry.jsx | `setCompReason` callback exists | `grep -n "setCompReason" OrderEntry.jsx` | AUTO |
| 3 | C | OrderEntry.jsx | `onSetCompReason={setCompReason}` passed to CollectPaymentPanel | `grep -n "onSetCompReason" OrderEntry.jsx` | AUTO |
| 4 | D | CollectPaymentPanel.jsx | `onSetCompReason` in prop list | `grep -n "onSetCompReason" CollectPaymentPanel.jsx` | AUTO |
| 5 | E1+E2 | CollectPaymentPanel.jsx | Two `comp-reason-input` testids present | `grep -n "comp-reason-input" CollectPaymentPanel.jsx` | AUTO |
| 6 | F1+F2 | orderTransform.js | Two `complementary_reason` entries | `grep -n "complementary_reason" orderTransform.js` | AUTO |
| 7 | — | Webpack | 0 new warnings | `tail -3 /var/log/supervisor/frontend.out.log` | AUTO |
| 8 | E1 | Browser — Block 1 | Tick comp → input appears below "(Complimentary)" label | Visual | MANUAL |
| 9 | E2 | Browser — Block 2 | Same in second bill summary section | Visual | MANUAL |
| 10 | A | Browser | Untick comp → input disappears, reason cleared | Visual | MANUAL |
| 11 | A | Browser | Re-tick after typing reason → input is empty | Visual | MANUAL |
| 12 | F1 | Network | Place order with comp item → `order_details[].complementary_reason` present | DevTools Network | MANUAL |
| 13 | F2 | Network | Settle bill with comp item → `food_details[].complementary_reason` present | DevTools Network | MANUAL |
| 14 | E1+E2 | Browser | Type reason, settle → succeeds with no errors (optional, not blocking) | Functional test | MANUAL |
| 15 | D | Browser | Catalog-locked comp item → no reason input shown | Visual | MANUAL |

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-104 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] CR_REGISTRY.md: CR-104 row → GATE 5 IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add OrderEntry.jsx, CollectPaymentPanel.jsx, orderTransform.js (CR-104, date)
- [ ] Code markers: // CR-104 comment in every modified file (already in plan above)
- [ ] EXIT GATE 5 checkboxes: registry sync, CR_REGISTRY, FILE_OWNERSHIP, code markers, compile check
```

---

Planning complete: CR-104
Stage: Gate 3 — Implementation Plan
Code reality: NONE (confirmed at Gate 2 and Gate 3 entry verify)
Risk: MEDIUM (R5+R6 — 3 files, 7 additive edits, zero logic changes)
Scope expansion from Gate 2: +1 edit (Edit F2 — second is_complementary path in buildBillPrintPayload). Risk unchanged.
Files WILL change: OrderEntry.jsx (3 edits) · CollectPaymentPanel.jsx (3 edits) · orderTransform.js (2 edits)
Files WILL NOT touch: MarkCompModal.jsx · productTransform.js · any financial/print logic
Owner decisions: ALL RESOLVED
Docs: /app/memory/plans/CR-104_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
