# BUG-218 — Delete-Ingredient Blocked Dialog — IMPLEMENTATION PLAN (Gate 3)

**Date:** 2026-07-23 (Session E) | **Impact:** `/app/memory/impact/BUG-218_IMPACT_ANALYSIS.md` (approved; Q1=BLOCK, Q2=400+list, curl-proven) | **Risk:** LOW
**Entry verification:** PASS 2026-07-23 — `deleteIngredient` at InventorySetupPanel.jsx:86-95 matches.

## Dependencies / Wave
WAVE 2 (InventorySetupPanel cluster: 226→219→220→218). Different function than 219/220 — parallel-safe, same session.

## Scope Lock
WILL change: `components/inventory/InventorySetupPanel.jsx` only (+Dialog imports). WILL NOT touch: inventoryService, transforms, constants, success path.

## Edits (exact — from approved impact doc)
1. Import: `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'; // BUG-218`
2. State: `const [deleteBlocker, setDeleteBlocker] = useState(null); // BUG-218`
3. Catch block (lines 92-94) → parse `err?.response?.data?.data?.used_in_recipes` → `setDeleteBlocker({ name, recipes, count: apiData.recipe_count })`; else existing generic toast (impact doc verbatim).
4. Dialog JSX appended to component return (impact doc verbatim): title `Cannot Delete "{name}"`, count + bulleted recipe list, guidance line, single Close button. data-testids: `delete-blocker-dialog`, `delete-blocker-close`.

1 file, ~30 lines.

## Verification Matrix
| # | Verify | How | Auto? |
|---|---|---|---|
| 1 | Delete "Base Cream" (in 5 recipes) → dialog lists 5 recipes | Browser on preprod | NO |
| 2 | Dialog Close resets state | Browser | NO |
| 3 | Delete unused ingredient → confirm + success toast (unchanged) | Browser (use a ZZ_TEST ingredient; created + deleted in test) | NO |
| 4 | Non-recipe 4xx error still shows generic toast | Code review / curl sim | NO |

## Registry Checklist
- [ ] registry.json BUG-218 → IMPLEMENTED, pos_5_0  - [ ] BUG_TRACKER row  - [ ] FILE_OWNERSHIP  - [ ] `// BUG-218` markers  - [ ] webpack clean

*Gate 3 complete. Awaiting Gate 4 GO.*
