# BUG-226 — Conversion Factor Not Saved (ADD/EDIT) — IMPLEMENTATION PLAN (Gate 3)

**Date:** 2026-07-23 (Session E) | **Impact:** `/app/memory/BUG-226_IMPACT_ANALYSIS.md` (approved; Q1 resolved = Option A, default '1') | **Risk:** LOW (was HIGH pre-fix)
**Entry verification:** PASS 2026-07-23 — toAPI.addIngredient (:128-136) missing `converion_factor`; toAPI.updateIngredient (:146) `String(data.conversionFactor || 1)` — both match.

## Dependencies / Wave
WAVE 2 — **IMPLEMENT FIRST** in cluster (BUG-219 edits the adjacent lines of the same functions; 226 before/with 219, re-verify line numbers if 219 lands first).

## Scope Lock
WILL change: `api/transforms/inventoryTransform.js` only. WILL NOT touch: `converion_factor` spelling (R9), fromAPI read path, InventorySetupPanel.

## Edits (exact)
1. **toAPI.addIngredient** — insert after `min_unit_alert` line (:135):
```js
      converion_factor: String(data.conversionFactor || 1), // R9 typo preserved — BUG-226
```
2. **toAPI.updateIngredient (:146)** — Q1 Option A: keep `|| 1` fallback. NO change needed beyond adding marker comment:
```js
      converion_factor: String(data.conversionFactor || 1), // R9 typo preserved — BUG-226: '|| 1' per owner Q1 (blank/0 → 1:1)
```

1 file, ~2 lines.

## Verification Matrix
| # | Verify | How | Auto? |
|---|---|---|---|
| 1 | ADD payload contains converion_factor | Unit test / node eval: `toAPI.addIngredient({conversionFactor: 500})` → `'500'` | YES |
| 2 | ADD blank CF → `'1'` | Unit eval | YES |
| 3 | E2E: add ZZ_TEST ingredient CF=500 → curl get-inventory-master → `converion_factor: 500`; edit → still 500; DELETE test row | curl + browser | NO |
| 4 | Regression: BUG-219 fields unaffected (min alert lines untouched by this fix) | Code review | YES |

## Registry Checklist
- [ ] registry.json BUG-226 → IMPLEMENTED, pos_5_0  - [ ] BUG_TRACKER row  - [ ] FILE_OWNERSHIP  - [ ] `// BUG-226` markers  - [ ] webpack clean

*Gate 3 complete. Awaiting Gate 4 GO.*
