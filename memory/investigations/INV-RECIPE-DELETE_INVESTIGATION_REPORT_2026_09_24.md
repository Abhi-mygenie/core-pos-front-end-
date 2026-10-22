# INV-RECIPE-DELETE — Recipe / Addon-Recipe delete: "The reason field is required." + deleted row stays in list

**Date:** 2026-09-24 · **Role:** INVESTIGATION (Role 6) · **Steps used:** 10/10
**Registered ID:** PENDING (R0 — owner directed investigation before intake; register as BUG at Intake next)
**Owner report:** (1) Addon Recipes › Bulk Edit › trash → red toast "The reason field is required." (screenshot provided). (2) Earlier same day: Standard recipe delete → green "deleted" toast but recipe "not getting away from the list".
**Environment probed:** preprod API, test restaurant used by CR-385 probes (owner alias OWNER_TGK — never echoed). All probe records created by this investigation were deleted again; **net-zero mutation**. Owner's live restaurant not touched.
**No code edited.**

---

## 1. Summary

| # | Symptom | Root cause | Classification | Confidence |
|---|---|---|---|---|
| S1 | Addon recipe delete → 422 "The reason field is required." | Backend `DELETE product/delete-addon-recipe/{id}` validates a **required body key `reason`**. FE `recipeService.deleteAddonRecipe()` sends **no body**; `RecipeBulkEditor.deleteRow()` uses `window.confirm` and collects no reason. Key is `reason` — **not** `delete_reason` (menu-food / expense precedent), which is also rejected 422. | **FE_BUG** (contract mismatch — FE never adopted the addon-delete contract) | **HIGH** — live-reproduced by curl 3 ways + code traced |
| S2 | Standard recipe delete → green toast, row still listed | Delete succeeds server-side (verified: standard + sub delete need **no** reason, 200, row gone from API). FE removes the row only from the editor's local `rows` state and **never calls `onRefresh()`**; parent `RecipeManagementPanel` keeps the stale `standardRecipes` array and passes `recipes={sortRecipes(...)}` — a **new array reference on every render** — so the editor's hydration effect re-seeds rows from the stale list on the next parent render (tab switch, sort, view toggle, search), and the Card view shows the recipe until page reload. | **FE_BUG** (stale-list / missing refresh) | **MEDIUM** — traced, not browser-reproduced |
| S3 (side) | BUG-233 "addon-recipe-list returns `ingredients: []`" — BACKEND-BLOCKED since 2026-07 | Live probe: `addon-recipe-list` now returns populated `ingredients[]` (`ingredient_id/name/unit/qty`). Backend appears fixed. | **RETROACTIVE / UNBLOCK candidate** | MEDIUM (1 restaurant, 1 addon recipe sampled) |

---

## 2. Hypotheses Tested

| # | Hypothesis | Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | Backend requires a delete reason for **all three** recipe types | curl DELETE on bogus id ×3 types | 1 | ELIMINATED as stated (existence check runs first → 404) → needed live records | `probe_delete_contract_2026_09_24.json` |
| H2 | Addon delete requires `reason`; key might be `delete_reason` (BUG-201 / menu precedent) | create probe addon recipe → DELETE no-body / `{delete_reason}` / `{reason}` | 1 | **CONFIRMED**: no-body 422 · `{delete_reason}` 422 · `{reason}` 200 + row gone | `probe_delete_live_2026_09_24.json` |
| H3 | Sub-recipe delete also requires reason | create probe sub recipe → DELETE no-body | 1 | **ELIMINATED**: 200 "Sub-recipe deleted successfully." with no body | `probe_delete_sub_2026_09_24.json` |
| H4 | Standard recipe delete also requires reason | create probe standard recipe → DELETE no-body | 1 | **ELIMINATED**: 200 "Recipe deleted successfully." with no body | `probe_delete_standard_2026_09_24.json` |
| H5 | S2 is a backend "200 but not deleted" | same probes: re-GET list after delete | (shared) | **ELIMINATED**: all three types disappear from API list after 200 | same files |
| H6 | S2 is FE stale state (no refetch + unstable prop) | code trace `RecipeBulkEditor.jsx` L99–103, L209–221; `RecipeManagementPanel.jsx` L583 | 2 | **CONFIRMED by code** (not browser-reproduced) | §3 |
| H7 | FE has a reasons source for a dropdown | curl `GET product/delete-reasons` | 1 | 200 `{"reason":["Item not in menu any more","Duplicate item"]}` — menu-oriented list; already fetched by `menuManagementService.getDeleteReasons()` | `probe_delete_reasons_2026_09_24.json` |
| — | Endpoint/transform/service inventory + parent/child trace | grep + read | 3 | see §3 | — |

---

## 3. Data Flow Trace

**S1 — Addon delete**
```
UI  RecipeBulkEditor.jsx:209 deleteRow(row)
    → window.confirm(`Delete recipe "${row.name}"?`)      ← OK/Cancel only, no reason input
    → :216 dispatch.del(row.id)   (DISPATCH.addon.del = recipeService.deleteAddonRecipe, L27)
SVC recipeService.js:83 deleteAddonRecipe(id) → api.delete(`${DELETE_ADDON_RECIPE}/${id}`)   ← NO body
API DELETE /api/v2/vendoremployee/product/delete-addon-recipe/{id}
    → 422 {"message":"The given data was invalid.","errors":{"reason":["The reason field is required."]}}
UI  :220 toast.error(e.readableMessage)  → "The reason field is required."
BREAK POINT: recipeService.js:83–84 (no `{ data: { reason } }`) + RecipeBulkEditor.jsx:214 (no reason collected)
```
Contract (live-verified): `api.delete(url, { data: { reason: '<text>' } })` → 200 `{"status":true,"message":"Add-on recipe deleted successfully."}`.
Standard (`recipe/delete-recipe`) and Sub (`recipe/delete-sub-recipe`) accept no body → 200. Sending `{reason}` to them is harmless (ignored).

**S2 — Row stays after successful delete**
```
RecipeBulkEditor.jsx:216 await dispatch.del(row.id)            → 200
:217 toast.success(...)
:218 setRows(prev => prev.filter(r => r._key !== row._key))      → local removal only
     (no onRefresh() — contrast handleSave :272/:277 and import :329 which DO call onRefresh)
RecipeManagementPanel.jsx:583 <RecipeBulkEditor recipes={sortRecipes({...}[activeTab])} …/>
     → sortRecipes() returns a NEW array each parent render
RecipeBulkEditor.jsx:99–103 useEffect(() => setRows((recipes||[]).map(normaliseRecipe…)), [recipes, recipeType, foodsMaster])
     → any parent re-render re-hydrates rows from the parent's STALE standardRecipes → deleted row reappears
Card view (RecipeTab :590/:598) and tab counters (:493) read the same stale arrays until fetchData() (page reload / next save).
BREAK POINT: RecipeBulkEditor.jsx:218 missing `onRefresh?.()` (primary) · RecipeManagementPanel.jsx:583 unstable prop (amplifier)
```

**Delete surfaces inventoried:** only `RecipeBulkEditor` row trash (all 3 tabs). `RecipeFormPanel.jsx:367` trash removes an *ingredient row*, not the recipe. Card view (`RecipeTab`) has Edit/Create only — no delete. `AggregatorInventoryTab` — no recipe delete.

---

## 4. Evidence Artifacts

All in `/app/memory/evidence/INV-RECIPE-DELETE/`:
- `probe_delete_contract.py` + `probe_delete_contract_2026_09_24.json` — bogus-id probe (404 ×9), addon list shape, wrong delete-reasons path (404)
- `probe_delete_live.py` + `probe_delete_live_2026_09_24.json` — addon create → 422/422/200 → gone; sub create (id-key miss, cleaned in next file)
- `probe_delete_sub_2026_09_24.json` — sub delete no-body 200 → gone
- `probe_delete_standard_2026_09_24.json` — standard create (recipe 11224) → delete no-body 200 → gone
- `probe_delete_reasons_2026_09_24.json` — `GET product/delete-reasons` 200, 2 menu reasons
- Owner screenshot: red toast "The reason field is required." on Recipes tab (chat attachment 2026-09-24; not stored on disk)
- Cleanup state: probe addon 11223, probe sub 234, probe standard 11224 all deleted and confirmed absent from lists. Test restaurant restored.

Scripts read credentials from env vars; no secrets in any artifact.

---

## 5. Recommendations

**S1 — FE_FIX (HIGH confidence).** Scope: `recipeService.js` (`deleteAddonRecipe(id, reason)` → `api.delete(url, { data: { reason } })`) + `RecipeBulkEditor.jsx` (replace `window.confirm` with a confirm dialog that collects a reason when `recipeType === 'addon'`; BUG-276 precedent in `IngredientBulkEditor` replaced `window.confirm` with a proper dialog). 2 files, ~30–40 lines → **Planning skip NOT eligible** → Gate 2–3.
Owner decisions for Gate 2:
- **OD-A** Reason input: (a) free text · (b) dropdown from `product/delete-reasons` (menu wording: "Item not in menu any more", "Duplicate item") · (c) dropdown + "Other" free text. Recommend **(c)** or (a) — the menu reasons don't read naturally for recipes.
- **OD-B** Ask reason for addon only (contract) or all 3 types for consistency (backend ignores it for standard/sub)? Recommend **addon only** unless owner wants a uniform dialog.
- **OD-C** Backend ask (optional): make `reason` required for standard/sub too, or drop it for addon — the asymmetry is odd. Not blocking.
Risk: **HIGH** (API contract) · Severity: **P1** (addon recipe delete is fully broken, no workaround).

**S2 — FE_FIX (MEDIUM confidence — plan must include a browser validation step).** Scope: `RecipeBulkEditor.jsx:218` add `onRefresh?.()` after successful delete (and optionally stabilise the `recipes` prop with `useMemo` in `RecipeManagementPanel.jsx:583`). 1–2 files, ≤10 lines for the primary fix → **DIRECT_BUG_FIX eligible for the 1-line primary fix only if owner approves the skip**; otherwise bundle with S1 in one plan (same file). Risk: **MEDIUM** (component state) · Severity: **P2** (workaround = reload).

**S3 — BUG-233 unblock.** Recommend re-verify on owner's restaurant (RID 835) at QA time; if `ingredients[]` populated there too → move BUG-233 BACKEND-BLOCKED → re-test/close. No FE change expected (transform already maps `ingredient_*` keys).

**Bundling recommendation:** register S1 + S2 as **one BUG** (same file, same flow, one dialog rewrite) with S1 as headline; or two BUGs if owner wants S2 Fast-Laned separately.

---

## 6. Retroactive Candidates
- **BUG-233** — code already handles populated ingredients; backend now delivers them. Status `BACKEND-BLOCKED` is stale → candidate for re-verification/closure (not a code retro-registration).
- NONE other.

---

## 7. Hand-off
```
Root cause: S1 addon delete endpoint requires body key `reason`; FE sends none (contract mismatch). S2 editor never refetches after delete; unstable `recipes` prop re-seeds stale rows. Confidence: S1 HIGH · S2 MEDIUM. Steps: 10/10.
FE fix: yes — recipeService.js + RecipeBulkEditor.jsx (S1 ~30–40 lines; S2 1 line + optional useMemo). Backend ask: none blocking (optional: contract symmetry).
Planning skip eligible: S1 NO (2 files) · S2 YES for the 1-line refresh (owner approval) — recommend bundling.
Escalated from Bug Fix: NO. Retroactive candidates: BUG-233 re-verify.
Report: /app/memory/investigations/INV-RECIPE-DELETE_INVESTIGATION_REPORT_2026_09_24.md
Next: INTAKE (register BUG-457 [+ BUG-458 if split]; also pending BUG-455 / BUG-456 from INV_INVENTORY_FE_RULES_R2_R3) → Planning Gate 2.
```
