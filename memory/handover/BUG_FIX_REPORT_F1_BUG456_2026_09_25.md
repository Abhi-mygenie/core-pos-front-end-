# BUG FIX REPORT — F1 (BUG-456) — 2026-09-25

**Role:** BUG FIX (Role 5)
**Source:** QA Wave A finding F1 (MINOR) — `iteration_2.json`
**Owner instruction:** "Fix F1 with Option A, no other edit"

---

## Finding Summary

| # | Severity | Bug | Finding |
|---|----------|-----|---------|
| F1 | MINOR | BUG-456 | `InventorySetupPanel.jsx L190`: `Number(ing.displayQty)` returns `NaN` when `displayQty` is a formatted string (e.g. "9.4 pkt") → coerces to `0` → unit/conv fields incorrectly unlocked for a stocked ingredient |

---

## Fix Table

| Test # | Severity | RCA Classification | Root Cause | Fix | File Changed | Verified |
|--------|----------|--------------------|-----------|-----|-------------|---------|
| F1 | MINOR | CODE_ERROR | `Number("9.4 pkt")` → `NaN` → `0` → `!!stockQty` false → unit/conv unlocked incorrectly. `parseFloat` handles leading numeric prefix correctly. | `Number(...)` → `parseFloat(...)` at L190 | `src/components/inventory/InventorySetupPanel.jsx` | ✅ PASS |

---

## Before / After

**Before (L190):**
```js
stockQty: Number(ing.displayQty || ing.calQuantity || ing.quantity) || 0, // BUG-456
```

**After (L190):**
```js
stockQty: parseFloat(ing.displayQty || ing.calQuantity || ing.quantity) || 0, // BUG-456 F1-fix
```

---

## Self-Verification

- `parseFloat("9.4 pkt")` → `9.4` → `!!9.4` → `true` → fields correctly **locked** ✅
- `parseFloat(4.5)` (calQuantity path) → `4.5` → fields correctly **locked** ✅
- `parseFloat(undefined)` → `NaN` → `|| 0` → `0` → zero-stock item fields correctly **unlocked** ✅
- No change to `IngredientBulkEditor.jsx` (uses `buildRow()` path, not `startEdit()` — not affected)

---

## Scope Expansion

**NONE.** 1 file, 1 word changed. No other files touched.

---

## EXIT GATE

| # | Check | Result |
|---|-------|--------|
| 1 | Registry sync | BUG-456 remains `GATE_5B_QA_PASS` — F1 is sub-finding, no status change needed ✅ |
| 2 | BUG_TRACKER.md | Row updated (new "Last Updated" line at top) ✅ |
| 3 | FILE_OWNERSHIP.md | New row added for F1-FIX 2026-09-25 ✅ |
| 4 | Code marker | `// BUG-456 F1-fix` present at L190 ✅ |
| 5 | Compile check | `webpack compiled with 1 warning` — 0 new warnings ✅ |

**EXIT GATE: 5/5 PASS**

---

## Summary

- **1/1 fixed.** Root cause: CODE_ERROR (1 of 1).
- Scope expansion: NONE.
- Escalated: none.
- Recommended next: Wave C (BUG-460) + Wave D regression QA.
