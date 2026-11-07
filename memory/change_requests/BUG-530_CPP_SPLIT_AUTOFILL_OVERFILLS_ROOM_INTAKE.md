# BUG-530 — Intake

## CPP Split Auto-fill Uses Food+Room Total → Overfills UPI (e.g. ₹601 instead of ₹1)

**Date:** 2026-10-10
**Type:** BUG
**Priority:** P1
**Risk:** HIGH
**Area:** Order Entry / CollectPaymentPanel (R5)
**Sprint:** oct_bug_batch
**Registered by:** INTAKE role (bundled with BUG-529)
**Related:** BUG-527 (E3 fixed split threshold; auto-fill onBlur not fixed), BUG-529 (same bundle)

---

## Duplicate check
- DISTINCT from BUG-527: BUG-527 E3 fixed the **split enable/disable threshold** (`< (isRoom ? effectiveTotal - roomBalance : effectiveTotal)`)  
- The **auto-fill onBlur handler** (~L2886-2900) was NOT updated by E3 — it still uses raw `effectiveTotal` for both `maxForThisRow` and `remaining`
- DISTINCT from BUG-526, BUG-529, BUG-531, BUG-532

---

## Symptom
When a room order has a CPP split with 2 rows (e.g. Cash + UPI):
- User types Cash = ₹190
- `onBlur` auto-fills UPI = `effectiveTotal − 190` = `791 − 190` = **₹601** (wrong)
- Correct: UPI should fill `(effectiveTotal − roomBalance) − 190` = `191 − 190` = **₹1**
- Because `roomBalance` = ₹600 is settled by backend `paid_room=yes`, food-only total = ₹191

---

## Code Reality Check
**NONE — fix not applied**

```
CollectPaymentPanel.jsx onBlur handler (~L2884-2903):
  maxForThisRow = Math.max(0, effectiveTotal - othersSum)     ← uses full effectiveTotal
  remaining     = Math.max(0, effectiveTotal - clampedNum)    ← uses full effectiveTotal
  Both should use: isRoom ? effectiveTotal - roomBalance : effectiveTotal
```

BUG-527 E3 at L3318 correctly uses `isRoom ? effectiveTotal - roomBalance : effectiveTotal`  
for the **split button threshold** but the same correction was NOT applied to the **onBlur auto-fill**.

---

## Root Cause
`onBlur` auto-fill cap and fill reference = raw `effectiveTotal` (food+room) for all order types.  
For room orders: `effectiveTotal = finalTotal + roomBalance = 248 + 600 = 791` (CPP E1 corrected).  
The auto-fill should cap/fill against food-only = `effectiveTotal − roomBalance = 791 − 600 = 191`.

---

## Evidence
- Source: AGENT-DISCOVERED (investigation session 2026-10-10)
- Confidence: CONFIRMED — code trace verified in `CollectPaymentPanel.jsx` ~L2884-2903
- Test data: bonk booking — effectiveTotal=791, roomBalance=600, food=191, SC=21
  - Cash input = 190 → UPI auto-fills to 601 (observed/inferred) → should be 1

---

## Blast Radius
- **1 file:** `src/components/order-entry/CollectPaymentPanel.jsx` (**R5 hotspot**)
- **~3 lines:** `maxForThisRow` formula + `remaining` formula + deps comment
- Estimated scope: SMALL (1 file, 3 lines)
- Hotspot: YES (R5 — requires full gate flow)
- Fast Lane eligible: NO (R5 file)

---

## Owner Decisions
- OD-530-01: Confirm fix scope = `onBlur` only OR also `onChange` clamp?  
  (Recommended: `onBlur` only — `onChange` clamp doesn't auto-fill, just prevents over-entry)

---

## Gate Status
- Gate 1: COMPLETE (this document)
- Gate 2: PENDING (Impact Analysis needed — R5 requires full gate)
- Gate 3: PENDING
- Gate 4 GO: NOT given

---

## Next
Gate 2 Impact Analysis — PLANNING role.  
Can be bundled in same implementation session as BUG-529 + BUG-531.
