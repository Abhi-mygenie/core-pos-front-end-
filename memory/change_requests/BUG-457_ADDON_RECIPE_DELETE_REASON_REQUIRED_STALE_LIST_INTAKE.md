# BUG-457 — Addon recipe delete fails 422 "The reason field is required." (FE sends no `reason`); deleted recipes also stay listed until page reload — INTAKE 2026-09-24

**Source:** OWNER-REPORTED (2026-09-24: Addon Recipes › Bulk Edit › trash → red toast "The reason field is required." — screenshot in chat; earlier same day: Standard recipe delete → green "deleted" toast but row "not getting away from the list") → investigated same session (INVESTIGATION role) → `investigations/INV-RECIPE-DELETE_INVESTIGATION_REPORT_2026_09_24.md`
**Sprint:** `sep_bug_closure` · **Gate:** 1 (INTAKE)
**Related:** CR-073 (Recipe Bulk Editor), BUG-276 (IngredientBulkEditor `window.confirm` → AlertDialog precedent), BUG-201 (expense delete `delete_reason` precedent — **different key**), CR-159 (menu bulk delete reasons dropdown), BUG-233 (addon-recipe-list ingredients — see §Side finding)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | **P1 — HIGH** (addon recipe delete is fully broken — no workaround; S2 has a reload workaround) |
| Risk | **HIGH** — API contract change (DELETE body) + component state in `RecipeBulkEditor.jsx`; no financial logic; no R5 hotspot |
| RCA classification | **FE_BUG ×2** — S1 CONTRACT_MISMATCH (FE never adopted the addon-delete contract) · S2 stale list (missing refetch + unstable prop) |
| Confidence | **S1 HIGH** (live-reproduced by curl 3 ways + code traced) · **S2 MEDIUM** (code-traced, not browser-reproduced) |
| Code reality | **NONE** — `recipeService.js:22–24, 63–64, 83–84` plain `api.delete(url)` with no body; `RecipeBulkEditor.jsx:214` `window.confirm`; `:218` local filter only, no `onRefresh()` |
| Fast Lane eligible | **NO** (2 files, HIGH risk). S2's 1-line `onRefresh?.()` alone would qualify — owner may approve a skip, but recommendation is one bundled plan. |
| Duplicate check | **DISTINCT** — no prior item on recipe delete. RELATED BUG-201/CR-159 (reason precedents) and BUG-276 (dialog precedent). |

---

## Symptoms

**S1 — Addon tab:** trash → OK → red toast **"The reason field is required."**; recipe not deleted.
**S2 — Standard tab (owner report):** trash → OK → green "Recipe … deleted" toast → row still in the list.

---

## Root cause (from investigation — evidence `evidence/BUG-457/` = copy of `evidence/INV-RECIPE-DELETE/`)

**S1.** `DELETE /api/v2/vendoremployee/product/delete-addon-recipe/{id}` validates a **required body key `reason`**. Live probe on a throw-away addon recipe (test restaurant, cleaned up): no body → 422 `{"errors":{"reason":["The reason field is required."]}}` · `{delete_reason}` → 422 · `{reason:"…"}` → 200 "Add-on recipe deleted successfully." and gone from the list. FE `deleteAddonRecipe()` sends no body and the confirm is a native `window.confirm` — nothing collects a reason.
**Standard** (`recipe/delete-recipe`) and **Sub** (`recipe/delete-sub-recipe`) delete with **no body → 200** — reason is neither required nor stored there.

**S2.** `RecipeBulkEditor.deleteRow()` L216–218 removes the row from local `rows` only and never calls `onRefresh()` (Batch Save at L272/277/329 does). Parent `RecipeManagementPanel.jsx:583` passes `recipes={sortRecipes(...)}` — a new array every render — so the editor's hydration effect (L99–103, deps `[recipes, recipeType, foodsMaster]`) re-seeds rows from the parent's **stale** list on the next parent render (tab switch, sort, view toggle, search); Card view and tab counters stay stale until reload.

**Delete surfaces:** only the Bulk Edit row trash (all 3 tabs). `RecipeFormPanel.jsx:367` trash = remove ingredient row. Card view has no delete.

---

## Evidence

| Item | Detail |
|---|---|
| Screenshot | Owner chat attachment 2026-09-24 — red toast "The reason field is required." on Recipes tab (not stored on disk) |
| Curl | `evidence/BUG-457/probe_delete_live_2026_09_24.json` (addon 422/422/200), `probe_delete_sub_2026_09_24.json` (sub 200 no body), `probe_delete_standard_2026_09_24.json` (standard 200 no body), `probe_delete_reasons_2026_09_24.json` (`GET product/delete-reasons` → `["Item not in menu any more","Duplicate item"]`), `probe_delete_contract_2026_09_24.json` (bogus-id 404s) — scripts read creds from env; no secrets in artifacts |
| Steps to reproduce (S1) | 1. Setup › Recipes › Addon Recipes › Bulk Edit · 2. trash on any row · 3. OK → red toast "The reason field is required." |
| Steps to reproduce (S2) | 1. Standard Recipes › Bulk Edit · 2. trash → OK → green toast · 3. switch tab and back / switch to Card view → recipe still listed · 4. F5 → gone |
| Source | OWNER-REPORTED |
| Confidence | S1 **CONFIRMED** (owner reproduced + curl) · S2 **REPORTED + code-traced** |
| Mockup | `public/inv-intake-mockup-2026-09-24.html` §BUG-457 · `design_briefs/DESIGN_BRIEF_INVENTORY_INTAKE_BUG455_456_457_2026_09_24.md` |

---

## Blast Radius

| File | Change | Lines | Hotspot |
|---|---|---|---|
| `src/api/services/recipeService.js` | `deleteAddonRecipe(id, reason)` → `api.delete(url, { data: { reason } })` | ~3 | NO |
| `src/components/inventory/RecipeBulkEditor.jsx` | replace `window.confirm` with AlertDialog (BUG-276 pattern); reason `<select>` when `recipeType === 'addon'` (from `menuManagementService.getDeleteReasons()`); pass reason to `dispatch.del`; `onRefresh?.()` after success | ~35–45 | NO |
| `src/components/inventory/RecipeManagementPanel.jsx` (optional) | `useMemo` the `recipes` prop at L583 to stop per-render re-hydration | ~3 | NO |

- Blast radius: **SMALL–MEDIUM** (2–3 files, ~45–55 lines) · R5 hotspot: NO · Financial: NO · API contract: YES (DELETE body)

---

## Owner Decisions

| ID | Decision | Status |
|---|---|---|
| OD-457-01 | Reason input = dropdown from `GET product/delete-reasons` | **LOCKED 2026-09-24** (owner option b) |
| OD-457-02 | Reason field on Addon tab only (contract) vs all three tabs (cosmetic on standard/sub — backend ignores it) | **LOCKED — Option A: Addon tab only.** Standard + Sub use plain Confirm dialog, no reason field. Owner 2026-09-24. |
| OD-457-03 | Also stabilise the parent `recipes` prop (`useMemo`) or refetch-only? | **LOCKED — YES, include useMemo** (+3 lines, `RecipeManagementPanel.jsx`). Owner 2026-09-24. |
| OD-457-04 | Backend ask (non-blocking): contract symmetry — require `reason` for standard/sub too, or drop for addon? | OPEN — optional brief |

---

## Side finding — BUG-233 (not part of this bug)
`addon-recipe-list` now returns populated `ingredients[]` (`ingredient_id/name/unit/qty`) on the probed restaurant → BUG-233 (P0, BACKEND-BLOCKED since 2026-07-23) may be unblocked. Recommend re-verify on RID 835 during this item's QA; status change is an owner/QA call — **not modified at intake**.

---

## Next
**Gate 1 registered 2026-09-24.** → PLANNING Gate 2 (Impact Analysis) → Gate 3 → owner Gate 4 GO → Implementation → QA (must include S2 browser validation — MEDIUM confidence).
