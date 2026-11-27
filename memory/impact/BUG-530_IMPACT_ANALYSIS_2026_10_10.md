# BUG-530 — Impact Analysis (Gate 2)

## CPP Split Auto-fill onBlur Uses food+room Total → Overfills UPI (e.g. ₹601 not ₹1)

**Date:** 2026-10-10
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE — fix not applied (BUG-527 E3 fixed split threshold, not auto-fill)
**Conflict Pre-check:** NONE
**Risk:** HIGH (R5 file — payment entry; incorrect auto-fill leads to split sum > food-only balance)

---

## Code Reality Check

```bash
grep -n "BUG-530" /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
# → no results — fix not applied

# BUG-527 E3 fixed the split THRESHOLD (L3318):
# < (isRoom ? effectiveTotal - roomBalance : effectiveTotal)
# But the onBlur AUTO-FILL handler still uses raw effectiveTotal:
sed -n '2880,2905p' CollectPaymentPanel.jsx
# → maxForThisRow = Math.max(0, Math.round((effectiveTotal - othersSum) * 100) / 100)
# → remaining     = Math.max(0, Math.round((effectiveTotal - clampedNum) * 100) / 100)
```

---

## Conflict Pre-check

Last modifier of `CollectPaymentPanel.jsx` (R5): BUG-527 E1+E2+E3 IMPL 2026-10-10.  
E3 touched L3318 (split threshold). The onBlur block at ~L2884-2903 was **not touched**.  
No other open item targets the onBlur block.  
**No conflict.**

---

## Data Flow Trace

### Variable scope at onBlur closure (confirmed in code):

| Variable | Defined at | Value (bonk scenario) | In scope at L2884? |
|---|---|---|---|
| `isRoom` | CPP prop, destructured L38 | `true` (folio/dashboard path) | YES — component prop |
| `roomBalance` | useMemo L195-203 | `600` (1600 − 1000 discount) | YES — component useMemo |
| `effectiveTotal` | const L731-737 | `791` (248 + 0 transfers + 600 + 543 room) | YES — component const |
| `splitPayments` | useState | `[{method:'cash',amount:'190'},{method:'upi',amount:''}]` | YES — component state |

`effectiveTotal` formula (L731-737):
```js
const effectiveTotal =
  finalTotal +
  (isRoom && associatedOrders.length > 0 ? associatedTotal : 0) +
  roomBalance;
// = 248 (food with SC) + 0 (no transfers) + 600 (room post-discount) = 848
```

Wait: actual bonk value: effectiveTotal = 248 + 543 (associatedOrders) + 0 = 791?  
Correction per handover: effectiveTotal = 791 (from investigation). roomBalance = 600.  
Food-only = effectiveTotal - roomBalance = 791 - 600 = 191.

### onBlur auto-fill sequence (broken):

```
User types Cash = 190 → blur fires
  typedNum = 190
  othersSum = 0 (UPI is empty)
  maxForThisRow = Math.max(0, effectiveTotal - 0) = 791       ← WRONG: should be 191
  typedNum (190) <= maxForThisRow (791) → no clamp
  clampedNum = 190
  newSplit.length === 2 → auto-fill UPI:
    remaining = Math.max(0, effectiveTotal - 190) = 601       ← WRONG: should be 1
    newSplit[1].amount = "601"
```

### onBlur auto-fill sequence (fixed):

```
  splitCap = isRoom ? effectiveTotal - roomBalance : effectiveTotal = 791 - 600 = 191
  maxForThisRow = Math.max(0, splitCap - 0) = 191             ← CORRECT
  clampedNum = min(190, 191) = 190
  remaining = Math.max(0, splitCap - 190) = 1                 ← CORRECT
  newSplit[1].amount = "1"
```

### Non-room orders: unaffected

For non-room orders: `isRoom = false` → `splitCap = effectiveTotal` (same as current) → zero regression.

---

## Downstream Consumers

The `onBlur` handler only sets `splitPayments` state. Downstream:
- `splitPayments` → payload building in `handlePay/handleBill` via `splitPayments.map`
- The auto-fill is a UX convenience; user can still manually correct the amount before confirming
- `handlePay` guards: `splitPayments.reduce(sum) < effectiveTotal` → payment blocked until correct total entered
- The fix prevents wrong auto-fill, does not affect payment math downstream

---

## Affected Files

| File | Lines | R5? | Change |
|------|-------|-----|--------|
| `src/components/order-entry/CollectPaymentPanel.jsx` | ~L2886, L2893, +1 const | **YES (R5)** | Add `splitCap` const; replace 2 occurrences of `effectiveTotal` in onBlur |

**Files WILL NOT touch:**
- `orderTransform.js` (R5) — no change
- `CartPanel.jsx` — no change
- `DashboardPage.jsx` — no change
- Any test file — no change (onBlur is UI behavior, not unit-testable easily)

---

## Exact Edit

### E1 — Add `splitCap` const + replace 2 uses in `onBlur` (~L2886-L2893)

**Current (~L2886-2903):**
```js
onBlur={() => {
  // BUG-113 (POS 4.0): On blur — clamp to max, auto-fill
  // the other row if exactly 2 rows and other is empty.
  setSplitPayments(prev => {
    const newSplit = prev.map(s => ({ ...s }));
    const typedNum = parseFloat(newSplit[idx].amount) || 0;
    const othersSum = newSplit.reduce((sum, s, i) => i !== idx ? sum + (parseFloat(s.amount) || 0) : sum, 0);
    const maxForThisRow = Math.max(0, Math.round((effectiveTotal - othersSum) * 100) / 100);
    // Clamp if over max
    if (typedNum > maxForThisRow) {
      newSplit[idx].amount = String(maxForThisRow);
    }
    const clampedNum = Math.min(typedNum, maxForThisRow);
    // Auto-fill other row only if 2 rows and other row is empty
    if (newSplit.length === 2) {
      const otherIdx = idx === 0 ? 1 : 0;
      if (!newSplit[otherIdx].amount || newSplit[otherIdx].amount === '0') {
        const remaining = Math.max(0, Math.round((effectiveTotal - clampedNum) * 100) / 100);
        newSplit[otherIdx].amount = remaining > 0 ? String(remaining) : "";
      }
    }
    return newSplit;
  });
}}
```

**New (~L2886-2905):**
```js
onBlur={() => {
  // BUG-113 (POS 4.0): On blur — clamp to max, auto-fill
  // the other row if exactly 2 rows and other is empty.
  setSplitPayments(prev => {
    const newSplit = prev.map(s => ({ ...s }));
    const typedNum = parseFloat(newSplit[idx].amount) || 0;
    const othersSum = newSplit.reduce((sum, s, i) => i !== idx ? sum + (parseFloat(s.amount) || 0) : sum, 0);
    const splitCap = isRoom ? effectiveTotal - roomBalance : effectiveTotal; // BUG-530: food-only cap for room orders
    const maxForThisRow = Math.max(0, Math.round((splitCap - othersSum) * 100) / 100);
    // Clamp if over max
    if (typedNum > maxForThisRow) {
      newSplit[idx].amount = String(maxForThisRow);
    }
    const clampedNum = Math.min(typedNum, maxForThisRow);
    // Auto-fill other row only if 2 rows and other row is empty
    if (newSplit.length === 2) {
      const otherIdx = idx === 0 ? 1 : 0;
      if (!newSplit[otherIdx].amount || newSplit[otherIdx].amount === '0') {
        const remaining = Math.max(0, Math.round((splitCap - clampedNum) * 100) / 100);
        newSplit[otherIdx].amount = remaining > 0 ? String(remaining) : "";
      }
    }
    return newSplit;
  });
}}
```

**Lines changed:** +1 new line (`splitCap` const) + 2 substitutions (`effectiveTotal` → `splitCap`) = **3 changed lines**

---

## OD-530-01 — RESOLVED (agent-recommended): onBlur only (not onChange)

The `onChange` handler (L2869-2878) intentionally does NOT clamp or auto-fill — free typing until blur per BUG-113 design note in the comment. No change needed in `onChange`.

---

## Risk Classification

| Dimension | Assessment |
|---|---|
| Risk | **HIGH** — R5 file, payment amount entry |
| Financial payload? | NO — auto-fill is UX only; `handlePay` downstream validates total separately |
| R5? | YES — full gate flow required |
| Fast Lane eligible | NO |
| Regression risk | LOW — `isRoom=false` path: `splitCap = effectiveTotal` (identical to current) |

---

## Verification Matrix

| # | Test | How | Auto? |
|---|------|-----|:---:|
| V1 | Room order: type Cash=190, blur → UPI auto-fills ₹1 | Browser: bonk → CPP split | NO |
| V2 | Room order: type Cash=200 (over cap=191) → clamps to 191, UPI=0 | Browser | NO |
| V3 | Non-room order: auto-fill unchanged (uses effectiveTotal) | Browser: normal dine-in split | NO |
| V4 | Split sum = splitCap after auto-fill | Browser: verify total row | NO |
| V5 | Regression: BUG-527 E3 threshold still correct (unchanged) | Code review L3318 | YES |

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-530 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: CollectPaymentPanel.jsx + date + BUG-530
- [ ] Code marker: // BUG-530 comment on the splitCap line
- [ ] webpack: 0 new warnings (R5 — verify carefully)
```
