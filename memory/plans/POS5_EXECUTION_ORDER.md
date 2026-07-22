# POS 5.0 — GATE 3+ EXECUTION ORDER & DEPENDENCY MAP
**Date:** 2026-07-23 (Session D) | **Author:** PLANNING agent
**Scope:** All 13 code items approved at Gate 2 (BUG-225 subsumed — no code). Gate 3 plans exist for BUG-217/219/220; remaining items need Gate 3 plans before implementation.

## File-Conflict Clusters (grep + impact-doc verified)

| Shared file | Items | Constraint |
|---|---|---|
| `RecipeFormPanel.jsx` | BUG-214 (:51,150), **BUG-215 (:90-96 guards→error states)**, BUG-216 (:84 autofill), **BUG-217 (:95 new guard)** | **215 BEFORE 217** (217's guard must adopt 215's error pattern). 214/216 parallel-safe (different lines). All 4 in ONE implementation session. |
| `RecipeBulkEditor.jsx` | BUG-216 (:185, 1 line), BUG-222 (export/import rewire, large) | 216 first (tiny), then 222. |
| `inventoryTransform.js` | **BUG-226 (toAPI.addIngredient converion_factor)**, **BUG-219 (min alert retype, 5 edits)** | **226 BEFORE/WITH 219** (adjacent toAPI region). |
| `InventorySetupPanel.jsx` | BUG-218 (deleteIngredient :86-95), BUG-219 (form rows/labels), BUG-220 (addCategory :74-84), BUG-221 (export/template buttons) | Different functions — parallel-safe. Implement 218/219/220/221 in ONE session to avoid churn. |
| `inventoryService.js` | BUG-221 (export blob→JSON download_url) | — |
| `recipeService.js` | BUG-222 (export blob fix + `products_file` field) | Same JSON-download_url pattern as 221 — reuse handler. |
| `SmartPurchasePanel.jsx` + `vendorRanking.js` + `purchasePlanner.js` | BUG-227 (vendor combobox + System Vendor), BUG-224 (low-stock Rule 2, amended B2) | Same cluster/session. Suggested: 224 (planner rule) then 227 (vendor UI) — or joint plan. Both feed add-purchase → CRITICAL care (R6-adjacent). |
| `StockAuditPanel.jsx` | BUG-223 (drift preview UX) | Standalone. |

## Recommended Implementation Waves

**WAVE 1 — Recipe Form cluster (1 session):** BUG-215 → BUG-217 → BUG-214 → BUG-216
Rationale: 215 sets the validation-error pattern; 217 adds guard in that pattern; 214/216 independent lines. 216 also patches RecipeBulkEditor:185 (prepares 222).
*Gate 3 status: 217 PLANNED ✅; 214/215/216 need plans.*

**WAVE 2 — Inventory Setup cluster (1 session):** BUG-226 → BUG-219 → BUG-220 → BUG-218
Rationale: 226 then 219 (shared transform); 220/218 independent functions in same panel. HIGH-risk 219 e2e no-corruption test gates this wave's QA.
*Gate 3 status: 219/220 PLANNED ✅; 226/218 need plans.*

**WAVE 3 — Bulk import/export (1 session):** BUG-221 → BUG-222
Rationale: identical export contract fix (JSON download_url); 221 establishes the download handler, 222 reuses it + fixes `products_file` field + wires template endpoints. After Wave 1 (216's bulk-editor line).
*Gate 3 status: both need plans.*

**WAVE 4 — Smart Purchase (1 session):** BUG-224 → BUG-227
Rationale: 224 amends planner rules (owner-amended B2); 227 layers vendor combobox + System Vendor bucketing on the resulting rows. Both touch add-purchase write path → strictest self-test + regression.
*Gate 3 status: both need plans.*

**ANY TIME (standalone):** BUG-223 (StockAuditPanel UX) — no dependencies, can fill any session.

## QA / Smoke Sequencing Notes
- Wave 2 QA MUST include the BUG-219 CRITICAL no-corruption e2e (edit-save → curl verify `min_unit_alert` intact).
- Wave 4 QA MUST include one end-to-end add-purchase with real vendor AND verify no `vendor_id:'system'` ever submitted (owner decision, Batch 5).
- Cross-wave regression (REGRESSION role, after all waves): recipe save → ingredient edit → bulk export/import → smart purchase suggestion flow.

## Blocked/Deferred
- CR-088→CR-094: DEFERRED (owner directive 2026-07-22).
- Backend briefs outstanding: 16 blockers register — none block the waves above (FE workarounds planned in each impact doc).
