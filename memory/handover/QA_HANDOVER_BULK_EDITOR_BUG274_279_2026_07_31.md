# QA Handover — Bulk Editor Cluster: BUG-274, BUG-275, BUG-276, BUG-277, BUG-278, BUG-279

**Document:** QA_HANDOVER_BULK_EDITOR_BUG274_279_2026_07_31.md
**Items:** BUG-274 · BUG-275 · BUG-276 · BUG-277 · BUG-278 · BUG-279
**Implementation Date:** 2026-07-27

---

## 1. Registry Sync Confirmation

```
Items: BUG-274/275/276/277/278/279 — IMPLEMENTED gate 5a
Code markers:
  ✅ BUG-274: IngredientBulkEditor.jsx L97+162+163+175 — bulk delete fix
  ✅ BUG-275: inventoryTransform.js L18+62+130+150 · InventorySetupPanel.jsx L17-18 — no default 1 for conversion
  ✅ BUG-276: ExpenseBulkEditor.jsx L285+322+811 — visual position + badge on category move
  ✅ BUG-277: IngredientBulkEditor.jsx L62+65 — stable ID guard (prevItemIds ref)
  ✅ BUG-278: IngredientBulkEditor.jsx L63+158+212 — saveInProgress re-entry guard
  ✅ BUG-279: IngredientBulkEditor.jsx L347 — sticky header thead
```

---

## 2. Code Checks

| Check | Command | Expected |
|-------|---------|---------|
| C1-BUG274 | `grep -c 'BUG-274' /app/frontend/src/components/inventory/IngredientBulkEditor.jsx` | ≥3 |
| C2-BUG275 | `grep -c 'BUG-275' /app/frontend/src/api/transforms/inventoryTransform.js` | ≥2 |
| C3-BUG276 | `grep -c 'BUG-276' /app/frontend/src/components/expense/ExpenseBulkEditor.jsx` | ≥2 |
| C4-BUG277 | `grep -c 'BUG-277' /app/frontend/src/components/inventory/IngredientBulkEditor.jsx` | ≥2 |
| C5-BUG278 | `grep -c 'BUG-278' /app/frontend/src/components/inventory/IngredientBulkEditor.jsx` | ≥2 |
| C6-BUG279 | `grep -c "sticky top-0" /app/frontend/src/components/inventory/IngredientBulkEditor.jsx` | 1 |

---

## 3. Test Cases

### BUG-274 — Bulk Delete Not Working

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-1 | Inventory → Ingredients & Setup → Bulk Edit → check 2 items → click Delete | Both items removed; `dirtyCount` updates immediately showing pending deletes |
| TC-2 | Delete items → Save | DELETE API called once per ingredient (not zero); save succeeds |

### BUG-275 — Edit Ingredient Conversion Pre-Fills to 1

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-3 | Edit ingredient with NO conversion factor set → observe conversion input | Conversion input shows empty (not pre-filled with "1") |
| TC-4 | Edit ingredient WITH conversion factor (e.g. 500) → observe | Shows "500" correctly |
| TC-5 | Edit ingredient: base=kg (auto-mapped) → conversion column | Shows "—" (auto-conversion, no input needed) |

### BUG-276 — Category Move Causes Item Jump (ExpenseBulkEditor)

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-6 | Expenses → Bulk Edit → move an item to a different category | Item stays in its CURRENT visual position; shows "→ NewCategory" badge instead of jumping |
| TC-7 | Save after category move | Item appears in correct category after save + refresh |

### BUG-277 — Multi-Select Checkbox Resets

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-8 | Ingredient Bulk Editor → check 3 items → uncheck + recheck one | All 3 checkboxes remain in expected state (no spurious resets) |
| TC-9 | Close and reopen bulk editor | Checkboxes reset correctly |

### BUG-278 — DELETE API Called Twice

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-10 | Bulk Editor → select items for delete → Save → check Network tab | DELETE API called exactly ONCE per ingredient (not twice) |
| TC-11 | Double-click Save button rapidly | Second click ignored (saveInProgress guard) |

### BUG-279 — Header Sticky in Ingredient Bulk Editor

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-12 | Ingredient Bulk Editor → scroll down through many rows | Table header (Name, Unit, Conversion, Alert, Category columns) sticks to top |

---

## 4. Credentials + Environment

| Field | Value |
|---|---|
| Login | `owner@18march.com` / `Qplazm@10` |
| Routes | Inventory → Ingredients & Setup → Bulk Edit; Expenses → Bulk Edit |
| Note | BUG-278 TC-10 requires Network tab. BUG-274 requires multiple ingredients with existing `_id`. |
