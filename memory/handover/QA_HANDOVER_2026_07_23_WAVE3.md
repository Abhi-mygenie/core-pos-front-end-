# QA Handover — Wave 3 (Bulk Import/Export)
**Date:** 2026-07-23 | **Items:** BUG-221, BUG-222
**Files changed:** `inventoryService.js`, `recipeService.js`, `constants.js`, `IngredientBulkEditor.jsx`, `RecipeBulkEditor.jsx` (5 files)

## 1. Verification Matrix Results

| Edit | File | Verification | Self-Test |
|------|------|-------------|:---:|
| BUG-221 E1 | inventoryService.js:28-38 | Dual-pattern export (JSON first, blob fallback) | ✅ |
| BUG-221 E2 | constants.js:155 | EXPORT_SAMPLE_INVENTORY endpoint | ✅ |
| BUG-221 E3a | IngredientBulkEditor.jsx:199-215 | Server export replaces client-side handleExcel | ✅ |
| BUG-221 E3b | IngredientBulkEditor.jsx:220-229 | Template button + handler | ✅ |
| BUG-221 E3c | IngredientBulkEditor.jsx:232-252 | Import button + handler + 2xx status:false trap | ✅ |
| BUG-222 E1 | recipeService.js:26-38 | Dual-pattern export + exportSampleRecipes() | ✅ |
| BUG-222 E2 | RecipeBulkEditor.jsx:282-300 | handleExport uses download_url first | ✅ |
| BUG-222 E3 | RecipeBulkEditor.jsx:320 | `products_file` field name (was `file`) | ✅ |
| BUG-222 E4 | RecipeBulkEditor.jsx:375-384 | Template button + handleTemplate | ✅ |
| BUG-222 E5 | RecipeBulkEditor.jsx:323-326 | 2xx status:false defensive trap | ✅ |

## 2. Test Cases

| # | Item | Test | Expected |
|---|------|------|----------|
| T1 | BUG-221 | Ingredient Excel export | Click Excel → valid .xlsx downloads via server download_url |
| T2 | BUG-221 | Ingredient Template button | Click Template → sample xlsx downloads |
| T3 | BUG-221 | Ingredient Import junk file | Upload .txt → error toast (2xx status:false handled) |
| T4 | BUG-221 | Ingredient Import valid file | Upload template row → success + list refresh |
| T5 | BUG-222 | Recipe Excel export | Click Excel → valid .xlsx via download_url (not corrupt blob) |
| **T6 Q1-check** | BUG-222 | Exported file contains sub-recipe rows | Open file → verify sub-recipes present — STOP-GATE if not |
| T7 | BUG-222 | Recipe Template button | Click Template → sample xlsx downloads |
| T8 | BUG-222 | Recipe Import with products_file | Import file → no 422 (field name fixed) |
| T9 | BUG-222 | Recipe Import bad file | Upload junk → error toast (readableMessage) |

## 3. Regression
| # | What | Why |
|---|------|-----|
| R1 | InventorySetupPanel export still works | Same service, verify-only |
| R2 | RecipeBulkEditor batch save untouched | BUG-206/207 unaffected |
| R3 | Addon/Sub tabs Excel buttons stay disabled | excelEnabled gating unchanged |

## 4. Registry Sync: YES. EXIT GATE: 5/5 PASS.

## 5. Credentials: Frontend https://react-app-preview-6.preview.emergentagent.com. Test data: ZZ_TEST names, delete after.
