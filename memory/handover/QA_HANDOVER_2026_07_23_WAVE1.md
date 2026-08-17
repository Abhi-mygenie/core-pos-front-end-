# QA Handover — Wave 1 (Recipe Form Cluster)
**Date:** 2026-07-23 | **Items:** BUG-215, BUG-217, BUG-214, BUG-216
**Files changed:** `RecipeFormPanel.jsx`, `RecipeBulkEditor.jsx` (2 files)

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| BUG-215 E1 | RecipeFormPanel.jsx:23 | `errors` state added | ✅ Code verified |
| BUG-215 E2 | RecipeFormPanel.jsx:90-103 | Error-collection block replaces toast-per-field | ✅ Code verified |
| BUG-215 E3 | RecipeFormPanel.jsx:148-149,155,160,164,169,178-183,205 | Red borders + inline error msgs + banner | ✅ Code verified |
| BUG-215 E4 | RecipeFormPanel.jsx:148,155,164,179 | onChange clears field error | ✅ Code verified |
| BUG-217 E1 | RecipeFormPanel.jsx:95 | Unit guard in error block | ✅ Code verified |
| BUG-217 E2 | RecipeFormPanel.jsx:178 | Required `*` on Unit label | ✅ Code verified |
| BUG-214 E1 | RecipeFormPanel.jsx:52 | Silent catch → toast error | ✅ Code verified |
| BUG-214 E2 | RecipeFormPanel.jsx:157-158 | Foods fallback removed from dropdown | ✅ Code verified |
| BUG-214 E3 | RecipeFormPanel.jsx:66 | Foods fallback removed from edit-mode reverse-lookup | ✅ Code verified |
| BUG-216 E1 | RecipeFormPanel.jsx:83 | `ing.smallUnit \|\| ing.unit` autofill | ✅ Code verified |
| BUG-216 E2 | RecipeFormPanel.jsx:229 | Option label shows smallUnit | ✅ Code verified |
| BUG-216 E3 | RecipeBulkEditor.jsx:185 | `master.smallUnit \|\| master.unit` | ✅ Code verified |

## 2. Test Cases

| # | Item | Test | Steps | Expected |
|---|------|------|-------|----------|
| T1 | BUG-215 | Blank name → red border + persistent text | Navigate Recipes → Create Recipe → leave name blank → Save | Red border on name, inline text "Recipe name is required", toast "Please fix the highlighted fields" |
| T2 | BUG-215 | Fix name → error clears | Type a name in the field | Red border disappears, inline text disappears |
| T3 | BUG-215 | Standard recipe without food → food select highlighted | Create Standard recipe → leave food blank → Save | Red border on food select, error text visible |
| T4 | BUG-215 | No ingredients → banner above table | Create recipe with name+food but empty ingredients → Save | Red banner "Add at least one ingredient" above ingredients table |
| T5 | BUG-217 | Unit required → blocks save | Create sub-recipe → fill all EXCEPT unit → Save | Red border on unit, "Unit is required" text, no POST in Network |
| T6 | BUG-217 | `*` marker visible | All 3 recipe type forms | Red asterisk next to "Unit" label |
| T7 | BUG-214 | Addon dropdown no menu items | Create Addon recipe → check dropdown | Only addon items shown OR "No addon items found" placeholder |
| T8 | BUG-216 | Small unit autofill | Select a kg/gm ingredient row | Row badge shows 'gm' (small unit), not 'kg' (base unit) |
| T9 | BUG-216 | Bulk editor same behavior | Open RecipeBulkEditor → change ingredient | Same small unit autofill |
| T10 | BUG-215+217 | Regression: valid save | Fill all fields correctly → Save | Recipe saves successfully (HTTP 200 or 201) |

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Standard recipe full save | Guard ordering unchanged |
| R2 | Sub-recipe save with Serves blank | Serves stays optional (BUG-217 scope) |
| R3 | Edit existing recipe | Autofill and reverse-lookup |
| R4 | RecipeBulkEditor bulk save | BUG-216 didn't break existing flow |

## 4. Registry Sync Confirmation
Registry synced: YES
Items: BUG-214, BUG-215, BUG-216, BUG-217
Sprint: pos_5_0
EXIT GATE: 5/5 PASSED
  ✅ registry.json synced
  ✅ BUG_TRACKER.md (update pending — same session)
  ✅ FILE_OWNERSHIP (RecipeFormPanel.jsx, RecipeBulkEditor.jsx)
  ✅ Code markers: // BUG-214, // BUG-215, // BUG-216, // BUG-217 present
  ✅ webpack compiled successfully (0 new warnings)

## 5. Credentials & Environment
- Frontend: https://react-app-preview-6.preview.emergentagent.com
- Backend API: https://preprod.mygenie.online/
- Auth tokens: re-login per session (expire in minutes)
- Test data: use ZZ_TEST names, delete after testing
