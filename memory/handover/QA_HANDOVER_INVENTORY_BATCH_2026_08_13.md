# QA Handover — Inventory Batch (BUG-309, 310, 311, 314, 320)

**Date:** 2026-08-13  
**Implementation:** Complete — EXIT GATE 5/5 PASS  
**Registry:** Synced — all 5 → IMPLEMENTED gate:5a sprint:pos_5_1

---

## §1 — Verification Matrix (self-test results)

| # | Edit | Bug | File | Expected | Self-Test |
|---|---|---|---|---|---|
| E1 | handleSave dup skip | BUG-311 L3 | IngredientBulkEditor.jsx:192 | `// BUG-311` marker present, dup check via allItems | ✅ Code verified |
| E2 | numCls Option A | BUG-310 | IngredientBulkEditor.jsx:296 | `border-slate-100 bg-slate-50/50` in numCls false branch | ✅ Code verified |
| E3 | minUnit span | BUG-309 | IngredientBulkEditor.jsx:442 | `<span>` with minUnitAlert\|\|smallUnit\|\|unit\|\|'—' | ✅ Code verified |
| E4 | Promise.allSettled | BUG-314 | InventorySetupPanel.jsx:42 | `allSettled` + 3 individual result handlers | ✅ Code verified |
| E5 | addIngredient dup | BUG-311 L2 | InventorySetupPanel.jsx:146 | `ingredients.some(...)` guard before try block | ✅ Code verified |
| E6 | physicalQty removed | BUG-320-A | SubRecipeStockPanel.jsx:94 | Comment only, no `physicalQty:` key | ✅ Code verified |
| E7 | physical_qty removed | BUG-320-B | inventoryTransform.js:227 | No `physical_qty:` in addSubRecipeStock return | ✅ Code verified |
| R1 | fromAPI READ path | BUG-320 | inventoryTransform.js:72 | `physicalQty: Number(item.physical_qty)` still present | ✅ Grep confirmed |
| R2 | Compile | All | — | webpack compiled 1 warning (pre-existing) — 0 new | ✅ PASS |

---

## §2 — Test Cases for QA Agent

**Credentials:** `owner@thegoankitchen.com` / `Qplazm@10`  
**App URL:** https://pos-frontend-deploy-28.preview.emergentagent.com  
**Navigation note:** `/inventory-setup` → Ingredients tab; click "Bulk Edit" button to open IngredientBulkEditor

### BUG-314 — Promise.allSettled (categories + units load)
| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Categories load | Login → `/inventory-setup` | Sidebar shows category "body parts" (not "CATEGORIES (0)") |
| T2 | Units load | `/inventory-setup` → click "+ Add Ingredient" | Base Unit dropdown shows kg, ltr, gm, etc. (not just "Unit...") |

### BUG-309 — Min Unit read-only span
| # | Test | Steps | Expected |
|---|---|---|---|
| T3 | Existing ingredient shows unit | `/inventory-setup` → Bulk Edit → find ingredient with gm smallUnit | Min Unit column shows "gm" (not "—") |
| T4 | No data overwrite | Bulk Edit → Save without editing | Network POST → `min_unit_alert` keeps original value |
| T5 | New row min unit | Bulk Edit → add new row, select unit "kg" | Min Unit column shows "gm" (auto-small of kg) |

### BUG-310 — Conversion styling visible
| # | Test | Steps | Expected |
|---|---|---|---|
| T6 | Clean input visible | Bulk Edit → Conversion column for unchanged row | Faint slate background visible (not plain black text on white) |
| T7 | Dirty stays amber | Bulk Edit → edit conversion value | Column turns amber border + white bg |

### BUG-311 — Duplicate detection
| # | Test | Steps | Expected |
|---|---|---|---|
| T8 | Card view dup blocked | `/inventory-setup` → "+ Add Ingredient" → type name of existing ingredient → click Add | Toast: `"<name>" already exists` |
| T9 | Card view unique passes | Same flow with new unique name | Ingredient added successfully |
| T10 | Bulk edit dup badge | Bulk Edit → add new row → type existing ingredient name → Save | Row shows red ✗ badge with "already exists" |
| T11 | Bulk edit unique passes | Bulk Edit → add row with unique name → Save | Saves successfully, row shows ✓ |

### BUG-320 — physical_qty removed from sub-recipe payload
| # | Test | Steps | Expected |
|---|---|---|---|
| T12 | Payload clean | `/inventory-sub-recipe-stock` → enter qty → Save → DevTools Network → POST body | No `physical_qty` key in request |
| T13 | Save succeeds | Same as T12 | HTTP 200, success toast |

### Regression
| # | Test | Steps | Expected |
|---|---|---|---|
| T14 | Stock Audit path | Stock Audit tab → update ingredient stock | `physical_qty` still sent (separate code path, untouched) |

---

## §3 — Registry Sync Confirmation

```
Registry synced: YES
Items: BUG-309, BUG-310, BUG-311, BUG-314, BUG-320
Status: IMPLEMENTED
Sprint: pos_5_1
Gate: 5a
EXIT GATE: ALL 5 PASSED
```

---

## §4 — Environment

**Account:** `owner@thegoankitchen.com` / `Qplazm@10` (The Goan Kitchen — has 1 category "body parts", 0 ingredients initially)  
**App URL:** https://pos-frontend-deploy-28.preview.emergentagent.com  
**Backend (preprod):** https://preprod.mygenie.online (get-inventory-master now returns 200+[])
