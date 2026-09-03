# BUG-367 IMPACT ANALYSIS — Printer Agent Print Style: Value Snaps to 0 (G4) — CLOSURE Phase B
**Date:** 2026-08-31
**Stage:** Gate 2 — Impact Analysis (CLOSURE Phase B)
**Code Reality:** FULL — G4 fix already exists in PrintStyleTab.jsx
**Conflict Pre-Check:** NO conflicts
**Risk:** LOW

---

## Summary

Gap G4 from CR-133. Numeric inputs in Print Style tab (font size, margin, logo size) were reported as snapping to 0 when cleared. Fix was shipped under CR-133-GAP label without a separate BUG ID. Code investigation confirms the fix is fully present.

---

## What Exists (Code Trace)

```
PrintStyleTab.jsx
  Line 1:   // G4 fix: allow clearing value to retype; clamp to min/max on blur
  Line 11:  const StyleInput = ({ value, onChange, min, max, step, testId }) => {
  Line 12-30: local display state (localVal) — allows clearing without onChange firing
              onBlur → clamp to valid range and commit via onChange
              Pattern: same as BUG-315/BUG-362 fix in shared.jsx + AutoPrintTab
```

All numeric inputs in PrintStyleTab use `StyleInput` with allow-empty + blur-clamp behaviour.

---

## Affected Files
NONE — no code changes required.

---

## Verification Matrix

| # | Test | Steps | Expected |
|---|---|---|---|
| V1 | Clear font size | Open Printer Agent → Print Style → clear a font size field | Field clears; stays empty while typing |
| V2 | Blur clamps | Clear font size field, click away | Snaps to minimum valid value (not 0 if min=1, not blank) |
| V3 | Android inputs | Try clearing Logo Size / UPI QR / Feedback QR fields | Same allow-empty + blur-clamp behaviour |
| V4 | No regression | Check AutoPrint copies (BUG-362 pattern) | Still works independently |

---

## Note on Android max constraint
BUG-317 previously fixed Logo Size / UPI QR / Feedback QR Android max = 8 constraint. Confirm these still allow values > 8 (separate fix, just verify not regressed).

---

## Risk: LOW — QA only, no code changes
## Blast Radius: NONE
## Next: QA verification (CLOSURE Phase B) — no Gate 3 plan needed
