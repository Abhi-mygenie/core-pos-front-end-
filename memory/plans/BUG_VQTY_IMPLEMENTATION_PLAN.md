# BUG-VQTY — Gate 3: Implementation Plan

**ID:** BUG-VQTY
**Gate:** 3 — Implementation Plan
**Date:** 2026-07-07
**Depends on:** `BUG_VQTY_IMPACT_ANALYSIS.md`
**Risk:** MEDIUM
**Priority:** P0
**Fast Lane:** NO

---

## SCOPE LOCK

### Files WILL change
1. `api/transforms/orderTransform.js` — 2 line changes

### Files WILL NOT touch
- `OrderEntry.jsx` — no change to callers
- `CollectPaymentPanel.jsx` — no change
- `calcOrderTotals` — grand total calculation is already correct, do not touch
- Any other file

---

## EXECUTION — 2 exact edits

---

### Edit 1 — `buildCartItem()` Line 703

**File:** `/app/frontend/src/api/transforms/orderTransform.js`

**Verify before editing — line 703 must read:**
```js
variation_amount:    isRuntimeComp ? 0 : variationAmount,
```

**Change to:**
```js
variation_amount:    isRuntimeComp ? 0 : variationAmount * (item.qty || 1),
```

**Context (lines 700–706 for search_replace precision):**
```js
// BEFORE:
    food_amount:         isRuntimeComp ? 0 : foodAmount,
    variation_amount:    isRuntimeComp ? 0 : variationAmount,
    addon_amount:        isRuntimeComp ? 0 : addonAmount,

// AFTER:
    food_amount:         isRuntimeComp ? 0 : foodAmount,
    variation_amount:    isRuntimeComp ? 0 : variationAmount * (item.qty || 1),
    addon_amount:        isRuntimeComp ? 0 : addonAmount,
```

**Why `(item.qty || 1)`:** `foodAmount = basePrice * (item.qty || 1)` two lines above uses the same guard. Consistent.

---

### Edit 2 — `collectBillExisting` food_detail builder Line 1492

**File:** `/app/frontend/src/api/transforms/orderTransform.js`

**Verify before editing — line 1492 must read:**
```js
          variation_amount:   isRuntimeComp ? 0 : variationAmount,
```

**Change to:**
```js
          variation_amount:   isRuntimeComp ? 0 : variationAmount * qty,
```

**Context (lines 1489–1495 for search_replace precision):**
```js
// BEFORE:
          food_amount:        isRuntimeComp ? 0 : (unitPrice * qty),
          variation_amount:   isRuntimeComp ? 0 : variationAmount,
          addon_amount:       isRuntimeComp ? 0 : addonAmount,

// AFTER:
          food_amount:        isRuntimeComp ? 0 : (unitPrice * qty),
          variation_amount:   isRuntimeComp ? 0 : variationAmount * qty,
          addon_amount:       isRuntimeComp ? 0 : addonAmount,
```

**Why `qty` (not `item.qty`):** In `collectBillExisting`, the qty variable is declared as `const qty = item.quantity || item.qty || 1` earlier in the same loop. Use that local variable, consistent with `food_amount: unitPrice * qty` on the line above.

---

## RISK REGISTER

| # | Risk | Mitigation |
|---|---|---|
| R1 | `item.qty` is undefined (no quantity on item) | `(item.qty \|\| 1)` guard handles this — same pattern as `foodAmount` on L670 |
| R2 | `qty` variable not declared in `collectBillExisting` scope | Verified — `qty = item.quantity \|\| item.qty \|\| 1` declared earlier in same block |
| R3 | Orders with qty=1 show different values | NONE — `variationAmount * 1 = variationAmount` — identical result |
| R4 | Orders with no variance show different values | NONE — `variationAmount = 0`, `0 * qty = 0` — identical result |
| R5 | `order_amount` grand total is affected | NO — `calcOrderTotals` uses `_fullUnitPrice × qty`, completely separate path |
| R6 | hotspot file merge conflict | Low probability — no open CR on this file; verify git status before editing |

---

## VERIFICATION MATRIX

| # | Test | Expected | How |
|---|---|---|---|
| 1 | Webpack compile | 0 new errors/warnings | Auto — check frontend logs |
| 2 | Place order: item qty=1, has variance | `variation_amount` unchanged (multiply by 1) | Browser DevTools Network tab |
| 3 | Place order: item qty=3, has variance (e.g. Cheese ₹20) | `variation_amount = 60` in PLACE_ORDER payload | Browser DevTools Network tab |
| 4 | QSR Place & Pay: item qty=2, has variance ₹15 | `variation_amount = 30` | DevTools Network tab |
| 5 | Collect Bill: item qty=3, has variance | `variation_amount = 60` in BILL_PAYMENT payload | DevTools Network tab |
| 6 | Order with NO variance | `variation_amount = 0` (unchanged) | DevTools Network tab |
| 7 | `order_amount` grand total | Unchanged — same value before and after fix | DevTools Network tab |
| 8 | Bill receipt | Shows 3× Masala + 3× Cheese (not 1× Cheese) | Visual verify on preprod |

**Total: 8 checks (1 automated, 7 DevTools/visual)**

---

## POST-CODE REGISTRY CHECKLIST

```
- [ ] Add code comment on both edited lines: // BUG-VQTY fix
- [ ] BUG_TRACKER.md: BUG-VQTY → status: IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: orderTransform.js — add BUG-VQTY to last-modified
- [ ] Compile check: 0 new webpack warnings/errors
```

---

## COMBINATION NOTE

**BUG-ROOM-PAIDROOM is in the same file (`orderTransform.js` L1632).**
Both bugs can and should be fixed in the same session to minimise hotspot file touches.
Fix order: Edit 1 (L703) → Edit 2 (L1492) → BUG-ROOM-PAIDROOM Edit 3 (L1632) → single compile check.

---

```
Gate 3 complete: BUG-VQTY
Files WILL change: 1 (orderTransform.js)
Lines to change: 2 (L703 + L1492)
Risk: MEDIUM — hotspot file, financial field; changes are targeted 1-line multiplications
All owner decisions: N/A — purely technical fix
Combination: Fix alongside BUG-ROOM-PAIDROOM (same file, same session)

STATUS: GATE 4 GO — ready for BUG FIX agent
```
