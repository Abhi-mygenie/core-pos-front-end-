# QA Handover — BUG-269: Ingredient Add/Edit 3 UX Bugs

**Document:** QA_HANDOVER_BUG269_2026_07_31.md
**Items:** BUG-269-A · BUG-269-B · BUG-269-C
**Implementation Date:** 2026-07-27

---

## 1. Registry Sync Confirmation

```
Item: BUG-269 — IMPLEMENTED gate 5a
Sub-bugs:
  ✅ BUG-269-A: inventoryTransform.js L130+150 — only send conversion when units differ AND not auto-mapped
  ✅ BUG-269-B: InventorySetupPanel.jsx L15 — auto-select smallUnit when baseUnit changes
  ✅ BUG-269-C: InventorySetupPanel.jsx L155+343+410 — minUnitAlert locked to smallUnit (read-only)
```

---

## 2. Code Checks

| Check | Command | Expected |
|-------|---------|---------|
| C1 | `grep -c 'BUG-269' /app/frontend/src/api/transforms/inventoryTransform.js` | ≥2 |
| C2 | `grep -c 'BUG-269-B' /app/frontend/src/components/inventory/InventorySetupPanel.jsx` | 1 |
| C3 | `grep -c 'BUG-269-C' /app/frontend/src/components/inventory/InventorySetupPanel.jsx` | ≥2 |
| C4 | `grep -c 'minUnitAlert.*smallUnit\|Alert unit locked' /app/frontend/src/components/inventory/InventorySetupPanel.jsx` | ≥1 |

---

## 3. Test Cases

### BUG-269-A — Conversion Sent Incorrectly

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-1 | Inventory → Setup → Add ingredient: set base=kg, small=gm, conversion=1000 → save | No duplicate conversion API field; ingredient saves without error |
| TC-2 | Add ingredient: base=kg, small=gm (auto-mapped pair) | `has_unit_conversion=false` sent (no conversion needed for kg→gm) |
| TC-3 | Add ingredient: base=piece, small=half (non-standard) | `has_unit_conversion=true`, `converion_factor=<value>` sent |

### BUG-269-B — Small Unit Auto-Select

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-4 | Add new ingredient → select Base Unit = "kg" | Small Unit auto-populates to "gm" |
| TC-5 | Change Base Unit to "ltr" | Small Unit auto-updates to "ml" |
| TC-6 | Change Base Unit to "piece" | Small Unit does NOT auto-populate (no mapping for non-standard) |

### BUG-269-C — Alert Unit Read-Only

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-7 | Edit any ingredient → observe "Alert Unit" field | Alert Unit = smallUnit value, displayed as read-only text (not editable input) |
| TC-8 | Change small unit → observe alert unit | Alert unit updates to match new small unit automatically |

---

## 4. Credentials + Environment

| Field | Value |
|---|---|
| Login | `owner@18march.com` / `Qplazm@10` |
| Route | Inventory → Ingredients & Setup → Add/Edit ingredient |
