# DESIGN BRIEF — Inventory intake batch (BUG-455 · BUG-456 · BUG-457) — where the UI changes land

**Date:** 2026-09-24 · **Stage:** INTAKE (pre-Gate 2) · **Purpose:** owner asked "show in design where the changes are" before registering. Wireframes only — nothing here is implemented. Final visuals are frozen at Gate 2.5 if the owner wants a mockup round.
**Screenshot reference:** Ingredients edit row captured on preview 2026-09-24 (test restaurant) — row "Chicken" in edit mode, columns: Ingredient Name · Base Unit · Conversion · Small Unit · Min Alert · Actions (Save / Cancel).

---

## BUG-455 — Current Stock: show backend `display_qty_text` alongside current qty (OD-455-01 LOCKED: alongside, not replacing)

**Screens:** Operations › **Current Stock** (`CurrentStockPanel.jsx:325–326`), **Sub-Recipe Stock** (`SubRecipeStockPanel.jsx:291–292`), **Stock Audit** (`StockAuditPanel.jsx:174–175`).
**Column touched:** only the **CURRENT STOCK** cell. No new column, no layout shift.

```
BEFORE (today)                              AFTER
┌──────────────┬──────────┬──────────────┐  ┌──────────────┬──────────┬────────────────────────────┐
│ INGREDIENT   │ CATEGORY │ CURRENT STOCK│  │ INGREDIENT   │ CATEGORY │ CURRENT STOCK              │
├──────────────┼──────────┼──────────────┤  ├──────────────┼──────────┼────────────────────────────┤
│ UAT Marination│ Raw     │ 9  pkt       │  │ UAT Marination│ Raw     │ 9 pkt  · 9 pkt 400 gm      │
│ Chicken      │ Raw      │ 12.5 kg      │  │ Chicken      │ Raw      │ 12.5 kg  · 12 kg 500 gm    │
│ Rice         │ Raw      │ 3 kg         │  │ Rice         │ Raw      │ 3 kg                       │  ← text omitted when identical
└──────────────┴──────────┴──────────────┘  └──────────────┴──────────┴────────────────────────────┘
                                              ^ existing bold qty + grey unit unchanged
                                                ^ NEW: small muted text (text-xs text-slate-500) = display_qty_text
```
Rules: render the extra text only when `display_qty_text` is non-empty **and** differs from `"{qty} {unit}"`. Excel/PDF export gets one extra column "Stock (text)" — owner may decline (OD-455-02).
Data: `inventoryTransform.js` maps `display_qty_text → displayQtyText` (both `ingredients()` and `stockItems()`). No API payload change.

---

## BUG-456 — Ingredients edit row: zero-stock gate for Unit / Conversion changes

**Screen:** Setup › **Ingredients** › pencil (edit) on a row (`InventorySetupPanel.jsx` edit row L415–475). Matches the captured screenshot.

```
TODAY (edit mode, stock > 0)
┌ Chicken ─────────────┬ [kg ▾] ┬ [   —   ] ┬ gm ┬ [Alert] kg ┬ [Test Raw ▾]  [Save] [Cancel] ┐
                                                                           ^ Save always enabled → backend 422 after click

AFTER — stock > 0 AND unit or conversion changed
┌ Chicken ─────────────┬ [gm ▾]⚠┬ [  1000 ]⚠┬ gm ┬ [Alert] kg ┬ [Test Raw ▾]  [Save] [Cancel] ┐
│ ⚠ Stock on hand is 12.5 kg — unit and conversion are locked until stock is 0.  Undo change     │  ← amber inline strip under the row
└───────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                              ^ Save DISABLED (grey) with tooltip
AFTER — stock = 0 → identical to today, no strip, Save enabled.
AFTER — stock > 0 but only name/category/alert changed → no strip, Save enabled (unit/conversion untouched).
```
Rules: `startEdit()` snapshots `originalUnit` + `originalFactor`; gate = `stockQty > 0 && (editIng.unit !== originalUnit || Number(editIng.conversionFactor) !== Number(originalFactor))`. Stock qty comes from the already-loaded ingredient row (`displayQty / quantity`), no extra call. Backend 422 handling stays as a fallback.
Alternative (OD-456-01): grey-out the Unit select + Conversion input entirely when stock > 0 (lock icon, tooltip) instead of warn-on-change. Recommend **warn-on-change** — user can still see the fields and understands why.

---

## BUG-457 — Recipes › Bulk Edit: delete confirm with reason (addon) + list refresh

**Screen:** Setup › **Recipes** › Bulk Edit view › row trash icon (`RecipeBulkEditor.jsx:209–221`).

```
TODAY                                        AFTER (all three tabs)
native browser box:                          shadcn Dialog (same pattern as IngredientBulkEditor BUG-276):
┌ preview.emergentagent.com says ──┐         ┌ Delete recipe ─────────────────────────────────┐
│ Delete recipe "with fingertips"? │         │ "with fingertips" (Addon) will be removed.      │
│              [Cancel]  [OK]      │         │                                                 │
└──────────────────────────────────┘         │ Reason *            [ Select reason        ▾ ]  │  ← ADDON TAB ONLY (OD-457-01 = dropdown from
                                             │                       Item not in menu any more │     GET product/delete-reasons)
                                             │                       Duplicate item            │
                                             │                                                 │
                                             │                    [Cancel]  [Delete recipe]    │  ← Delete disabled until a reason is picked (addon)
                                             └─────────────────────────────────────────────────┘
Standard / Sub tabs: same dialog WITHOUT the Reason field (backend does not require it — see OD-457-02).
After success: toast + list refetched (onRefresh) → row gone in Bulk view, Card view and tab counters.
```
Data: `deleteAddonRecipe(id, reason)` → `api.delete(url, { data: { reason } })`. Standard/sub unchanged.

---

## Owner decisions surfaced by this brief
| ID | Decision | Recommendation |
|---|---|---|
| OD-455-01 | display text alongside existing qty | **LOCKED (owner 2026-09-24)** |
| OD-455-02 | Add "Stock (text)" column to Excel/PDF export? | Yes, cheap |
| OD-456-01 | Warn-on-change + disable Save **vs** hard-lock fields when stock > 0 | Warn-on-change |
| OD-457-01 | Reason input = dropdown from `delete-reasons` | **LOCKED (owner 2026-09-24, option b)** |
| OD-457-02 | Reason field on addon only vs all tabs | Addon only — backend requires it only there; sending to standard/sub is ignored, not stored (probe: they delete with no body) |
