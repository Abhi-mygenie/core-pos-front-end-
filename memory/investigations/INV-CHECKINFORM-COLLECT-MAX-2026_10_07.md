# INV-CHECKINFORM-COLLECT-MAX-2026_10_07 — Investigation Report

**Date:** 2026-10-07
**Role:** INVESTIGATION (no code changes)
**Steps used:** 5/10
**Status:** ROOT CAUSE FOUND — HIGH confidence

---

## 1. Summary

| Issue | Status | Evidence |
|-------|--------|---------|
| ₹7,949 inflated GST (₹52.55) | ✅ FIXED in code (BUG-509) | computeBase=1001 → GST=50.05 ✓ |
| % mode maxPct blocks max discount | ✅ FIXED in code (BUG-510) | ceil formula → 88.34% achieves 7950 ✓ |
| **Collect now at max ₹7,950: allows collecting ₹50 = gstOnAdv** | ❌ STILL BROKEN | Hint: 50 > 50 = FALSE (strict inequality misses equal) |

---

## 2. Root Cause — Collect Now at Max Discount

### Variables at max discount (bc=9000, advance=1000, maxFlat=7950)

```
gstOnAdvFloor = bc − advance − maxFlat = 50
collectMax    = bc − roomDiscountRs − advance = 9000 − 7950 − 1000 = 50

collectMax == gstOnAdvFloor  (exactly equal at max discount only)

displayBalance = computeBase + displayGstTotal − advance
               = 1000        + 50              − 1000  = 50

Hint condition (L304):  displayBalance > collectMax  →  50 > 50  →  FALSE
```

The hint uses **strict > (greater than)**. At max discount `displayBalance = collectMax = 50`. Strict `>` misses this case. The hint never shows.

The collect input has `max={collectMax} = 50`. User can enter 50, `collectOverMax = 50 > 50 = FALSE` (no error). Confirm button stays enabled. **₹50 = gstOnAdv is collected at check-in — which should not happen.**

### Why the condition works at ALL other discount levels

At any discount < maxFlat:
- `collectMax > gstOnAdvFloor` (e.g., ₹7,949: 51 > 50, ₹300: 7700 > 50)
- `displayBalance > collectMax` is TRUE → hint fires ✓

At max (roomDiscountRs = maxFlat):
- `collectMax = gstOnAdvFloor` (exactly 50 = 50)
- `displayBalance = collectMax = 50` → strict `>` misses it ❌

---

## 3. Data Flow Break Point

```
maxFlat = bc − advance − gstOnAdv  (gstOnAdv "secured" = floor)
collectMax at max = gstOnAdv = ₹50
displayBalance at max = advance + gstOnAdv − advance = gstOnAdv = ₹50

Hint condition: displayBalance > collectMax  →  50 > 50  →  FALSE  ← BREAK POINT
```

---

## 4. Fix Direction (recommendation only)

### Targeted condition that fires ONLY at max

```js
const collectAtMaxGstOnly = collectMax <= gstOnAdvFloor && collectMax > 0;
// At max:    50 <= 50 && 50>0 → TRUE
// At ₹7,949: 51 <= 50         → FALSE  (correct — ₹1 room balance exists)
// At ₹300:  7700 <= 50        → FALSE  (correct)
```

### What the implementation would need

1. **New message** when `collectAtMaxGstOnly`:
   > "Maximum discount applied — GST (₹{gstOnAdvFloor}) settled at checkout. No room balance to collect at check-in."

2. **Collect input**: when `collectAtMaxGstOnly`, set effective max = 0 (or disable).
   - UI-only: a new `collectEffectiveMax = collectAtMaxGstOnly ? 0 : collectMax`
   - `collectMax` for backend submission unchanged (BUG-500 constraint preserved)

3. **Normal hint** (`displayBalance > collectMax`) remains for all other discounts.

### Scope (estimate)

| File | Change | Risk |
|------|--------|------|
| `CheckInForm.jsx` | ~3 lines: new `collectAtMaxGstOnly` const + modified hint JSX + modified input max | LOW (UI only, no financial formula changes) |
| `CheckInPage.jsx` | Same pattern | LOW |

No change to: `collectMax`, `effectiveBalanceDue`, `maxFlat`, `gstOnAdvFloor`, computeBase, or any submitted amount.

---

## 5. Note on ₹7,949 "Still Inflated" Claim

Code trace (post BUG-509):
- `gstBase = 1051`, `computeBase = 1001`
- `computeRoomGst(1001, 1, 1)` at 5% slab → `gstTotal=50.05`, `cgst=25.03`, `sgst=25.02`
- `displayBalance = 1051.05 − 1000 = 51.05`
- Hint fires: `51.05 > 51` = TRUE ✓

**Code is correct for ₹7,949.** If ₹103.55 still visible in browser → hard refresh needed OR testing on `/pms/check-in` route (CheckInPage.jsx also fixed).

---

## 6. Precondition for Fix

This is a financial/discount logic change (per R6). Needs **owner approval** before implementation. Proposed classification: LOW risk (UI-only cap, no backend impact, no formula changes).
