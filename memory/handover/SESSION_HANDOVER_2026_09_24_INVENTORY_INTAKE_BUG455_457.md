# SESSION HANDOVER — 2026-09-24 — Inventory intake batch · BUG-455 · BUG-456 · BUG-457 registered (Gate 1) · ready for Planning Gate 2

```
Session:    2026-09-24 (ALPHA v0.7) · Roles taken in order: DEPLOYMENT (remote refresh, earlier fork) → INVESTIGATION (R2/R3 rules) → INVESTIGATION (recipe delete) → INTAKE
Owner:      MyGenie POS owner (English) · sprint sep_bug_closure · items BUG-455, BUG-456, BUG-457
State now:  All three at GATE_1_INTAKE in registry.json (716 items). Zero src/ code changed this session. Test-restaurant probes net-zero.
Next step:  NEXT AGENT = PLANNING role. First: read this file, then EXPLAIN the three bugs to the owner in plain words (§2), then ASK "Gate 2 GO?" (Impact Analysis only — do NOT write Implementation Plans until owner says Gate 3 GO).
Not pushed: nothing saved to GitHub this session — owner "Save to GitHub" needed
```

## 0 · What the next agent must do, in order
1. Read `control/AGENT_PROMPT_ALPHA.md` (v0.7), then this file.
2. Present the 1-line summary: "Last session (2026-09-24): three inventory bugs registered at Gate 1 — BUG-455 display text, BUG-456 zero-stock gate, BUG-457 addon recipe delete."
3. **Explain each bug to the owner** using §2 below (plain language, the owner is non-technical; keep it short; point at the mockup URL).
4. Ask: **"Gate 2 GO for BUG-455, BUG-456, BUG-457 — Impact Analysis only?"** together with the open owner decisions in §4 (offer the recommendation as default).
5. On GO → PLANNING role, Stage = Impact Analysis (Gate 2) only → `impact/BUG-455_IMPACT_ANALYSIS.md`, `impact/BUG-456_IMPACT_ANALYSIS.md`, `impact/BUG-457_IMPACT_ANALYSIS.md`. STOP. Do not write plans, do not code.
6. Environment: PLANNING needs no live app (STEP -1.5). Curl probes for R11 need preprod login — see §6.

## 1 · Items registered this session

| ID | Title (short) | Sev | Risk | Files (expected) | Intake doc |
|---|---|---|---|---|---|
| BUG-455 | On-hand shows `9.8 pkt` only; backend `display_qty_text` ("9 pkt 400 gm") never shown | P2 | MEDIUM | `inventoryTransform.js` · `CurrentStockPanel.jsx` · `SubRecipeStockPanel.jsx` · `StockAuditPanel.jsx` (+ `AutoShoppingList.jsx`/`purchasePlanner.js`, export — ODs) | `change_requests/BUG-455_CURRENT_STOCK_DISPLAY_QTY_TEXT_INTAKE.md` |
| BUG-456 | Ingredient edit row lets Unit/Conversion change while stock > 0; only backend 422 after Save | P2 | MEDIUM | `InventorySetupPanel.jsx` only | `change_requests/BUG-456_INGREDIENT_UNIT_CHANGE_ZERO_STOCK_GATE_INTAKE.md` |
| BUG-457 | Addon recipe delete → 422 "The reason field is required."; deleted rows stay listed until reload | P1 | HIGH | `recipeService.js` · `RecipeBulkEditor.jsx` (+ `RecipeManagementPanel.jsx` optional) | `change_requests/BUG-457_ADDON_RECIPE_DELETE_REASON_REQUIRED_STALE_LIST_INTAKE.md` |

All: code reality NONE · duplicate check DISTINCT · no R5 hotspot · no financial logic · sprint `sep_bug_closure`.

## 2 · Plain-language explanation for the owner (read this out)

**BUG-455 — "Show the stock the way the store-room counts it."**
Backend now sends a ready-made text like *"9 pkt 400 gm"* for every ingredient. Our screens still show only *"9.8 pkt"*. Fix: on Current Stock, Sub-Recipe Stock and Stock Audit (and optionally Stock Update + Excel/PDF), keep the existing number and add the small grey text next to it. You already decided: **alongside, not replacing** (OD-455-01). Nothing about quantities changes — display only.

**BUG-456 — "Warn before the backend says no."**
Backend now refuses to change an ingredient's Unit or Conversion factor while it has stock (otherwise the stock count would be wrong). Our edit row lets you change it anyway and you only see a red error after clicking Save. Fix: when stock > 0 and you touch Unit/Conversion, show an amber note *"Stock on hand is 12.5 kg — unit and conversion are locked until stock is 0"* and grey out Save. Zero stock → screen works exactly as today.

**BUG-457 — "Addon recipe delete is broken; other deletes don't refresh."**
(a) Deleting an **Addon** recipe fails with *"The reason field is required."* because the backend wants a delete reason for addon recipes and our screen never asks for one (we proved this with live API calls: no reason → error; with reason → deleted). Standard and Sub-recipe deletes do **not** need a reason. Fix: replace the browser's OK/Cancel box with a proper dialog; on the Addon tab it has a required **Reason** dropdown (you chose the dropdown — OD-457-01; list = "Item not in menu any more", "Duplicate item").
(b) After a successful delete (Standard tab), the recipe stays in the list until you reload — the screen forgets to re-fetch. Fix: re-fetch after delete.
Side note: **BUG-233** (July, parked because the backend sent empty ingredient lists for addon recipes) looks fixed on the backend now — we should re-check on your restaurant; status untouched.

**Mockup to show the owner:** `https://<preview-host>/inv-intake-mockup-2026-09-24.html` (file `frontend/public/inv-intake-mockup-2026-09-24.html`; static, orange dashed = changes). Design brief: `design_briefs/DESIGN_BRIEF_INVENTORY_INTAKE_BUG455_456_457_2026_09_24.md`.

## 3 · Key facts Planning must carry (verified this session)

- **Addon delete contract (curl-confirmed, test restaurant, records created + deleted, net-zero):** `DELETE /api/v2/vendoremployee/product/delete-addon-recipe/{id}` — no body → 422 `{"errors":{"reason":["The reason field is required."]}}` · `{delete_reason}` → 422 · `{reason:"…"}` → 200 `"Add-on recipe deleted successfully."`. Axios: `api.delete(url, { data: { reason } })`.
- **Standard** `recipe/delete-recipe/{id}` and **Sub** `recipe/delete-sub-recipe/{id}`: 200 with no body. Reason not required, not stored.
- `GET /api/v2/vendoremployee/product/delete-reasons` → 200 `{"reason":["Item not in menu any more","Duplicate item"]}` — already wrapped by `menuManagementService.getDeleteReasons()` (`BASE_V2 = /api/v2/vendoremployee/product`).
- Only recipe delete surface: `RecipeBulkEditor.jsx:209–221 deleteRow()` (all 3 tabs, `window.confirm`). `RecipeFormPanel.jsx:367` trash = ingredient row. Card view has no delete.
- S2 mechanism: `deleteRow()` L218 local filter only, **no `onRefresh?.()`** (Batch Save L272/277/329 has it). Parent `RecipeManagementPanel.jsx:583` `recipes={sortRecipes(...)}` new array per render → editor hydration `useEffect` L99–103 deps `[recipes, recipeType, foodsMaster]` re-seeds stale rows. MEDIUM confidence — **plan must include a browser validation step**.
- Dialog precedent: `IngredientBulkEditor.jsx:527` AlertDialog (BUG-276). Reason dropdown precedent: `components/panels/menu/BulkEditor.jsx:1281` / `ProductCard.jsx:428`.
- BUG-455: `grep display_qty_text|displayQtyText src/` = 0. `inventoryTransform.js:24–25 / 70–71` map `display_qty`, `display_unit` only. On-hand render sites: `CurrentStockPanel.jsx:325–326, 119, 150` · `SubRecipeStockPanel.jsx:61–62, 291–292` · `StockAuditPanel.jsx:174–175` · `AutoShoppingList.jsx:193, 305` via `purchasePlanner.js:133, 158`. **R11: curl-verify `display_qty_text` presence/name on RID 835 (`inventory/get-inventory-master`, current-stocks) before planning** — the field was documented by the owner's backend doc, not probed this session.
- BUG-456: `InventorySetupPanel.jsx` `startEdit()` L183–192, `saveEdit()` L194–206, edit-row Unit select L421–427, Conversion input L428–431, Save button L469. Backend 422 codes `UNIT_CHANGE_REQUIRES_ZERO_STOCK` / `CONVERSION_CHANGE_REQUIRES_ZERO_STOCK` (from `inv_changes.md`; not live-triggered — do not mutate real ingredients to test; use a probe ingredient if needed).
- The owner's backend doc `inv_changes.md` is **not on disk**; its 7 FE rules are summarised in `investigations/INV_INVENTORY_FE_RULES_R2_R3_2026_09_24.md` (R1, R4–R7 already implemented; R2 → BUG-455; R3 → BUG-456).

## 4 · Owner decisions — LOCKED vs OPEN (ask at Gate 2 GO)

| ID | Decision | Status / recommendation |
|---|---|---|
| OD-455-01 | `display_qty_text` alongside existing qty+unit | **LOCKED** (owner 2026-09-24) |
| OD-455-02 | Add "Stock (text)" column to Excel/PDF export | OPEN — rec. YES |
| OD-455-03 | Include Stock Update shopping-list On-hand column | OPEN — rec. YES |
| OD-456-01 | (a) warn-on-change + Save disabled vs (b) hard-lock fields when stock > 0 | OPEN — rec. **(a)** |
| OD-456-02 | Same gate inside Ingredient Bulk Edit cells | OPEN — rec. YES if small, else follow-up |
| OD-456-03 | Planning skip for BUG-456 (1 file ~20 lines) | OPEN — owner approval required; default full Gate 2–3 |
| OD-457-01 | Reason input = dropdown from `delete-reasons` | **LOCKED** (owner option b) |
| OD-457-02 | Reason field on Addon tab only vs all 3 tabs | OPEN — rec. **Addon only** (backend ignores it elsewhere) |
| OD-457-03 | Also `useMemo` the parent `recipes` prop | OPEN — rec. YES (3 lines) |
| OD-457-04 | Backend ask for contract symmetry | OPEN — optional, non-blocking |
| BUG-233 | Add "backend appears fixed — re-verify RID 835" note / leave | OPEN — owner asked for explanation (given, §2); status untouched |

Owner was asked "1a 2a 3a 4a 5a?" for the mockup and did not answer before closing — **re-ask at session start** (sprint key defaulted to `sep_bug_closure`).

## 5 · Artifacts written this session

| Artifact | Path |
|---|---|
| Investigation (R2/R3) | `investigations/INV_INVENTORY_FE_RULES_R2_R3_2026_09_24.md` |
| Investigation (recipe delete) | `investigations/INV-RECIPE-DELETE_INVESTIGATION_REPORT_2026_09_24.md` |
| Evidence | `evidence/INV-RECIPE-DELETE/` (original) · `evidence/BUG-457/` (copy) — probe scripts read creds from env; JSONs contain no secrets |
| Intake docs ×3 | `change_requests/BUG-455_…`, `BUG-456_…`, `BUG-457_…_INTAKE.md` |
| Design brief | `design_briefs/DESIGN_BRIEF_INVENTORY_INTAKE_BUG455_456_457_2026_09_24.md` |
| Mockup (static HTML, not app code) | `frontend/public/inv-intake-mockup-2026-09-24.html` |
| Registry | `control/registry.json` — BUG-455/456/457 added, meta total 716, last_action set |
| Tracker / dashboard | `control/BUG_TRACKER.md` (new section + Last Updated) · `control/CONTROL_DASHBOARD.md` (Last Updated) |
| Not done | Dev-dashboard JSON regen — `gen_dashboard_sync.py` still points at `public/__dev` (moved to `memory/dev-dashboard/` by CR-372-A; stale since 2026-07-31). Flag for CLOSURE / OPEN_GAPS, not blocking. |
| Not created | `memory/test_credentials.md` does not exist on this pod (gitignored) — see §6 |

## 6 · Environment / credentials (aliases only — never echo values)
- Preview: `REACT_APP_BACKEND_URL` in `frontend/.env`; login route is `/` (not `/login`). Preprod boot is slow (60–90 s on LoadingPage) — allow long waits in screenshots.
- Probe account used this session: the CR-385 test-restaurant owner login (alias **OWNER_TGK**). Re-extract from `evidence/CR-385/probes_2026_09_20_final/run_gate4.py` line 12 (owner instruction, prior sessions). Owner's live restaurant = RID 835 (`yabyum`) — **do not mutate it**.
- Probe pattern that works: `POST /api/v1/auth/vendoremployee/common-login` → Bearer token; headers `Accept: application/json`, `X-localization: en`.

## 7 · Process notes / lessons (for the next agent)
- Earlier this fork an agent edited code while in INVESTIGATION role and had to revert (`recipeService.js`, `RecipeBulkEditor.jsx`, `RecipeFormPanel.jsx`). Owner is strict about roles/gates: **no code before Gate 4 GO**, ask before advancing any gate.
- Owner likes to be walked through each item in plain words and to see a mockup before deciding. Keep questions in lettered options.
- Creating throw-away records on the **test** restaurant for contract probes is acceptable if deleted in the same run and logged (net-zero); never on RID 835.
- The bogus-id trick (`/999999999`) does not reveal validation rules here — existence check runs first (404).

*End of handover — 2026-09-24. Next: PLANNING (Gate 2) after owner explanation + "Gate 2 GO".*
