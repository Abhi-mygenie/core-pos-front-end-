# BUG-530 — Implementation Plan (Gate 3)

## CPP Split Auto-fill onBlur Overfills UPI (₹601 instead of ₹1)

**Date:** 2026-10-10
**Stage:** Gate 3 — Implementation Plan
**Based on:** `impact/BUG-530_IMPACT_ANALYSIS_2026_10_10.md`
**Risk:** HIGH / R5 — full gate required
**OD-530-01:** RESOLVED — onBlur only; onChange is intentionally free per BUG-113

---

## Scope Lock

**Files WILL change:**
- `src/components/order-entry/CollectPaymentPanel.jsx` (**R5**) — 1 block (~L2883–L2896), net +1 line

**Files WILL NOT touch:**
- `orderTransform.js` (R5)
- `CartPanel.jsx`
- `DashboardPage.jsx`
- `OrderEntry.jsx` (R5)
- Any test file

---

## Entry Verification (Implementation agent must run before coding)

```
Plan says: lines ~L2883-2896 currently read:

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

→ View CollectPaymentPanel.jsx lines 2882-2897. Confirm this block matches exactly.
→ Confirm L2885 = maxForThisRow line, L2895 = remaining line.
→ If mismatch → STOP. Return to Planning. Do not proceed.
```

---

## Edit

### E1 — `CollectPaymentPanel.jsx` onBlur block — add `splitCap`, replace 2 uses of `effectiveTotal`

This is a single contiguous block replacement. Use one `search_replace` call.

**Current block (~L2883–L2896):**
```js
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
```

**New block (net +1 line — the `splitCap` const):**
```js
                              const othersSum = newSplit.reduce((sum, s, i) => i !== idx ? sum + (parseFloat(s.amount) || 0) : sum, 0);
                              const splitCap = isRoom ? effectiveTotal - roomBalance : effectiveTotal; // BUG-530: food-only cap for room orders; mirrors BUG-527 E3 threshold
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
```

**Changes:**
1. `+` Line: `const splitCap = isRoom ? effectiveTotal - roomBalance : effectiveTotal; // BUG-530`
2. `~` L2885: `effectiveTotal - othersSum` → `splitCap - othersSum`
3. `~` L2895: `effectiveTotal - clampedNum` → `splitCap - clampedNum`

**Why this pattern:**
- Mirrors BUG-527 E3 at L3318 which uses the same `isRoom ? effectiveTotal - roomBalance : effectiveTotal` formula for the split threshold
- Extracts to a named const for readability (same cap used twice)
- `isRoom=false` (non-room orders): `splitCap = effectiveTotal` → zero regression

---

## Verification Matrix

| # | Edit | Verification | How | Auto? |
|---|------|-------------|-----|:---:|
| V1 | E1 | Room order: type Cash=190, blur → UPI auto-fills ₹1 | Browser: bonk → Dashboard → CPP split open | NO |
| V2 | E1 | Room order: type Cash=200 (over cap=191) → clamps to 191, UPI auto-fills 0 | Browser | NO |
| V3 | E1 | Non-room order: auto-fill unchanged (normal effectiveTotal) | Browser: dine-in split | NO |
| V4 | regression | BUG-527 E3 threshold still correct (L3318 unchanged) | Code: grep BUG-527 L3318 | YES |
| V5 | regression | webpack compiles with 0 new warnings | terminal | YES |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| R5 file — any typo could break payment flow | Single contiguous block; pattern mirrors existing BUG-527 E3; `isRoom=false` path is algebraically identical |
| `splitCap` const used only within the `setSplitPayments` closure | Declared inside the closure — no scope leak |
| `roomBalance` might be 0 for non-room orders | `isRoom=false` guard → `splitCap = effectiveTotal` regardless of roomBalance value |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-530 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row status → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CollectPaymentPanel.jsx entry — BUG-530 + 2026-10-10
- [ ] Code marker: // BUG-530 on the splitCap line ✓ (in the new code above)
- [ ] webpack compile: 0 new warnings — MANDATORY for R5 file
```
