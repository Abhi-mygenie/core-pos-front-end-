# BUG FIX REPORT — BUG-461
**Date:** 2026-09-25
**Agent:** BUG FIX (ALPHA v0.7 Role 5) — Fast Lane
**Sprint:** sep_bug_closure

---

## Fix Summary

| Test # | Severity | RCA Classification | Root Cause | Fix | Files Changed | Verified |
|---|---|---|---|---|---|---|
| BUG-461 | MAJOR | CODE_ERROR (×2) | (1) `buildRow()` never copies `isSubRecipe` from source ingredient → rows have `isSubRecipe: undefined`. (2) `filtered` useMemo missing `!r.isSubRecipe` filter. Both failures needed fixing. | (1) Added `isSubRecipe: ing.isSubRecipe \|\| false` to `buildRow()` return at L39. (2) Added `!r.isSubRecipe &&` to both filter branches at L80+L82. | `IngredientBulkEditor.jsx` | ✅ Code review PASS (iteration_2.json) |

**1/1 fixed. Root cause pattern: CODE_ERROR — field not propagated from source object + filter not applied.**

---

## Scope expansion: NONE

Single file `IngredientBulkEditor.jsx`, 3 lines changed. No hotspot files. No scope expansion.

---

## Escalated items: NONE

---

## EXIT GATE 5/5 PASS

```
✅ 1. Registry: BUG-461 → GATE_5A_IMPLEMENTED, sep_bug_closure
✅ 2. BUG_TRACKER.md: row updated to IMPLEMENTED
✅ 3. FILE_OWNERSHIP.md: IngredientBulkEditor.jsx entry added
✅ 4. Code markers: 3× // BUG-461 in IngredientBulkEditor.jsx (L39, L80, L82)
✅ 5. Compile: webpack compiled with 1 warning (pre-existing isScheduled/scheduleAt — not BUG-461)
```

---

## Live UI Test Status

Code review PASS (100%). Live UI test requires QA_INV credentials (test_credentials.md updated with placeholder — owner to supply inventory account). When credentials available: Login → Inventory → Bulk Edit Ingredients → verify no "SUB RECIPE" group header appears.

---

**Fixed 1/1. Root causes: 1 CODE_ERROR (double — missing field propagation + missing filter).**
**Fix report: `handover/BUG_FIX_REPORT_BUG461_2026_09_25.md`**
**Registry synced: YES. EXIT GATE: 5/5.**
**Recommended: Owner smoke on preprod — Inventory → Bulk Edit Ingredients.**
