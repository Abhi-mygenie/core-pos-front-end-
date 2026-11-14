# BUG-512 — INTAKE DOC

**ID:** BUG-512
**Date:** 2026-10-07
**Status:** GATE_1_INTAKE
**Registered by:** INTAKE agent

---

## Title
CheckInForm Collect Now allows collecting gstOnAdv (₹50) at max discount — GST should settle at checkout, not check-in

---

## Description

At max discount (₹7,950), `collectMax = bc − maxFlat − advance = gstOnAdv = ₹50`. This ₹50 is the GST on advance that was deliberately preserved by the `maxFlat` formula to ensure it is collected at **checkout**, not check-in.

However, the current hint condition uses strict `>`:
```js
{displayBalance > collectMax && collectMax > 0 && (...hint...)}
```

At max discount: `displayBalance = 50 = collectMax`. `50 > 50 = FALSE` → hint does NOT fire → user can enter 50 and collect it at check-in.

### Contrast with normal discounts (working correctly)
- At ₹4,000: displayBalance=4250 > collectMax=4000 → hint fires ✓ (screenshot confirmed)
- At ₹300: displayBalance=9266 > collectMax=7700 → hint fires ✓

### At max discount (broken)
- displayBalance=50 = collectMax=50 → `50 > 50 = FALSE` → no hint ✗
- User types 50, no error, Confirm check-in enabled
- ₹50 = gstOnAdv collected at check-in — WRONG per hotel accounting

### Owner statement (verbatim)
*"the 50 we are collecting is gst not the room rent — that's why we are not gave discount on that 50 and we settle gst on check out right"*

---

## Code Reality
**FULL — code exists.** `CheckInForm.jsx` L304 hint condition uses strict `>`. `CheckInPage.jsx` same pattern.

---

## Duplicate Check
**RELATED to BUG-497** (collect now cap) — DISTINCT (different failure mode: equal case not caught).
**RELATED to BUG-504** (maxFlat preserves gstOnAdv).
**DISTINCT** new bug.

---

## Severity & Risk
- **Severity:** P1 — wrong GST collection at check-in
- **Risk:** CRITICAL (R6 — tax collection)
- **Fast Lane:** NO — financial, owner approval required

---

## Evidence
- Screenshots in current session showing max discount ₹7,950 with COLLECT NOW input showing 50, Confirm enabled
- Investigation: `investigations/INV-CHECKINFORM-COLLECT-MAX-2026_10_07.md`
- Steps: Open check-in form, enter max discount ₹7,950, scroll to Collect Now → no hint shown, can enter ₹50

---

## Blast Radius
- `CheckInForm.jsx` L304 + L310 (hint condition + input max, ~3 lines)
- `CheckInPage.jsx` L857-875 (ci-advance hint, ~3 lines)
- **SMALL** (2 files, ~6 lines)

---

## Detection Condition (owner decision needed)
```js
// Fires ONLY at max discount (collectMax = gstOnAdv)
const collectAtMaxGst = collectMax <= gstOnAdvFloor && collectMax > 0;
// max: 50 ≤ 50 = TRUE  ← fires
// ₹7,949: 51 > 50 = FALSE ← silent
// ₹300: 7700 > 50 = FALSE ← silent
```

When TRUE:
1. Show: "Maximum discount applied. GST (₹{gstOnAdvFloor}) settled at checkout — nothing to collect at check-in."
2. Set collect input effective max = 0 (UI only)
3. `collectMax` for backend: **UNCHANGED** (BUG-500/OD-500-04)

---

## Next
Gate 2 GO → PLANNING
