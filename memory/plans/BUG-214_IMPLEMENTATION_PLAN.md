# BUG-214 — Addon Dropdown Fallback Removal — IMPLEMENTATION PLAN (Gate 3)

**Date:** 2026-07-23 (Session E) | **Impact:** `/app/memory/BUG-214_IMPACT_ANALYSIS.md` (approved) | **Risk:** MEDIUM→LOW
**Entry verification:** PASS 2026-07-23 — lines 51, 64-68, 150 match impact doc.

## Dependencies / Wave
WAVE 1 (RecipeFormPanel cluster). Parallel-safe with 215/216/217 (different lines). Implement all four in ONE session, order: 215 → 217 → 214 → 216.

## Scope Lock
WILL change: `components/inventory/RecipeFormPanel.jsx` only. WILL NOT touch: recipeService, transforms, non-addon paths.

## Edits (exact — from approved impact doc)
1. **Line 51** — silent catch → surface error:
   `try { addonList = await recipeService.getActiveAddons(); } catch { /* addon list optional */ }`
   → `try { addonList = await recipeService.getActiveAddons(); } catch { toast.error('Failed to load addon items'); } // BUG-214`
2. **Line 150** — remove foods fallback:
   `{(addons.length > 0 ? addons : foods).map(a => <option key={a.id} value={a.id}>{a.name}{a.price ? \` (₹${a.price})\` : ''}</option>)}`
   → `{addons.length === 0 ? <option value="" disabled>No addon items found — add in Menu first</option> : addons.map(a => <option key={a.id} value={a.id}>{a.name}{a.price ? \` (₹${a.price})\` : ''}</option>)} {/* BUG-214 */}`
3. **Lines 64-68** — edit-mode reverse-lookup drops foods fallback:
   `const match = addonList.length > 0 ? addonList.find(...) : foodList.find(...)` → `const match = addonList.find(a => a.name.toLowerCase() === recipe.addonName.toLowerCase()); // BUG-214`

1 file, ~8 lines.

## Verification Matrix
| # | Verify | How | Auto? |
|---|---|---|---|
| 1 | Addon dropdown never shows menu items | Browser: create addon recipe on preprod (addon-list returns []) → placeholder "No addon items found" | NO |
| 2 | getActiveAddons error surfaces | Devtools offline sim or code review of catch | NO |
| 3 | Regression: standard recipe dropdown | Unaffected (foods path untouched) | NO |
| 4 | Regression: edit existing addon recipe | If any exist: name lookup no longer matches foods | NO |

## Registry Checklist
- [ ] registry.json BUG-214 → IMPLEMENTED, pos_5_0  - [ ] BUG_TRACKER row  - [ ] FILE_OWNERSHIP: RecipeFormPanel.jsx  - [ ] `// BUG-214` markers  - [ ] webpack clean

*Gate 3 complete. Awaiting Gate 4 GO.*
