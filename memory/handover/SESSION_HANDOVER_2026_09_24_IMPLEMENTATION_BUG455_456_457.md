# SESSION HANDOVER — 2026-09-24 — IMPLEMENTATION: BUG-455 + BUG-456 + BUG-457

```
Session:    2026-09-24 · Role: IMPLEMENTATION
Owner:      kunafamahal.com · sprint sep_bug_closure
State now:  BUG-455 / BUG-456 / BUG-457 → GATE_5A_IMPLEMENTED. yarn build exit 0. webpack compiled successfully.
Next step:  QA Gate 5b — execute test cases from QA_HANDOVER_2026_09_24_BUG455_456_457.md
```

---

## 1 · What Was Implemented

### BUG-455 — display_qty_text (6 files, 16 lines added)
- `inventoryTransform.js`: +`displayQtyText` in `ingredients()` L25 and `stockItems()` L71
- `CurrentStockPanel.jsx`: muted "(1 kg 640 gm)" text after qty+unit (guard: skip if same as plain value) + Excel "Stock (text)" col + PDF col
- `SubRecipeStockPanel.jsx`: `getCurrentQty` +`text` return; cell destructures + appends
- `StockAuditPanel.jsx`: book-stock cell appends
- `purchasePlanner.js`: +`display_qty_text` in plan rows and alert rows
- `AutoShoppingList.jsx`: on-hand cells ×2 append text

### BUG-456 — hard-lock Unit + Conversion when stock > 0 (2 files, 12 lines changed)
- `InventorySetupPanel.jsx`: `startEdit()` captures `stockQty`; unit `<select>` + conv `<Input>` get `disabled={!!editIng.stockQty}` + opacity class + title
- `IngredientBulkEditor.jsx`: `buildRow()` captures `stockQty`; unit `<select>` + conv `<input>` get `disabled={!_isNew && stockQty>0}` + title

### BUG-457 — Addon delete reason + stale list fix + useMemo (3 files, 45 lines changed)
- `recipeService.js`: `deleteAddonRecipe(id, reason)` → `api.delete(url, { data: { reason } })`
- `RecipeBulkEditor.jsx`: AlertDialog import; 3 state vars; `useEffect` pre-fetches `getDeleteReasons()` on addon tab; `deleteRow` opens dialog; `confirmDelete` calls `dispatch.del` with reason (addon only) + `onRefresh?.()` after success; AlertDialog JSX with reason dropdown + disabled Delete until picked
- `RecipeManagementPanel.jsx`: `const activeRecipes = useMemo(sortRecipes(...), deps)` before early return; `recipes={activeRecipes}` on RecipeBulkEditor

---

## 2 · Self-Test Results

| Check | Result |
|---|---|
| `yarn build` | ✅ Exit 0, 0 new warnings |
| `webpack compiled successfully` (dev) | ✅ |
| Code markers (grep) | ✅ All 11 files |
| Registry synced | ✅ GATE_5A_IMPLEMENTED |
| FILE_OWNERSHIP updated | ✅ |
| BUG_TRACKER updated | ✅ |

---

## 3 · Notes for QA

- BUG-455: The muted text has a guard — it only shows when `displayQtyText !== "${displayQty} ${displayUnit}"`. Simple-unit items (e.g. "1.05 gm") will NOT show text. Test with a multi-unit ingredient (pkt+gm conversion).
- BUG-456: New ingredients (stockQty=0 by definition) remain fully editable. Only existing ingredients with stock > 0 are locked.
- BUG-457 S2 confidence: MEDIUM per original investigation. T457-5 (stale row) requires a browser reload test. The `onRefresh?.()` is the correct fix.

---

## 4 · Deferred / Not in Scope

- OD-457-04 (backend contract symmetry ask) — optional, not blocking
- BUG-455 `display_qty_parts` field also present in API — not consumed, noted for future

*End of handover — 2026-09-24.*
