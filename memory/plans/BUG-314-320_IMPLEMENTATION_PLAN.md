# Implementation Plan — Batch 1: Inventory (BUG-314 + BUG-320)

**Gate:** 3 — Implementation Plan  
**Date:** 2026-08-13  
**Role:** PLANNING  
**Sprint:** pos_5_1  
**Based on:** `memory/impact/BUG-314-320_INVENTORY_IMPACT_ANALYSIS.md` (Gate 2, verified accurate)  
**Status:** GATE 3 COMPLETE — Awaiting Gate 4 GO

---

## Pre-Plan Verification (PASS)

| File | IA Claim | Live Code | Match? |
|---|---|---|---|
| `InventorySetupPanel.jsx:42` | `Promise.all([...])` | Confirmed — line 42 reads `const [ings, cats, unitList] = await Promise.all([` | ✅ PASS |
| `SubRecipeStockPanel.jsx:94` | `physicalQty: Number(entry.qty),` | Confirmed — line 94 reads `physicalQty: Number(entry.qty), // V4: physicalQty always equals quantity entered` | ✅ PASS |
| `inventoryTransform.js:232` | `physical_qty: data.physicalQty ?? 0,` | Confirmed — line 232 reads `physical_qty: data.physicalQty ?? 0,` | ✅ PASS |

---

## Scope Lock

| File | BUG-314 | BUG-320 | Touch? |
|---|---|---|---|
| `components/inventory/InventorySetupPanel.jsx` | ✅ Edit 1 | — | YES |
| `api/transforms/inventoryTransform.js` | — | ✅ Edit 3 | YES |
| `components/inventory/SubRecipeStockPanel.jsx` | — | ✅ Edit 2 | YES |
| `inventoryTransform.js:72` (fromAPI.ingredients) | — | ❌ DO NOT TOUCH | NO — this reads physical_qty from backend response (correct). Only the WRITE path is removed. |
| All other files | ❌ | ❌ | NO |

**New files:** NONE  
**Total edits:** 3 (across 3 files)

---

## Execution Sequence

**Step 1 → BUG-314** (InventorySetupPanel.jsx)  
**Step 2 → BUG-320 Edit A** (SubRecipeStockPanel.jsx)  
**Step 3 → BUG-320 Edit B** (inventoryTransform.js)  
**Step 4 → Compile check** (webpack 0 new warnings)  
**Step 5 → Self-test** (V1–V7)  
**Step 6 → EXIT GATE** (5 checkboxes)

BUG-314 and BUG-320 are **independent** — no shared files, safe to implement in sequence.

---

## Edit 1 — BUG-314: `InventorySetupPanel.jsx` — Promise.allSettled

**File:** `src/components/inventory/InventorySetupPanel.jsx`  
**Function:** `fetchData()` inside `IngredientsTab`  
**Lines:** 42–51 (replace entire try-block contents)

### Current code (lines 42–51):
```js
    try {
      const [ings, cats, unitList] = await Promise.all([
        inventoryService.getIngredients(),
        inventoryService.getCategories(),
        inventoryService.getUnits(),
      ]);
      setIngredients(ings);
      setCategories(cats);
      setUnits(Array.isArray(unitList) ? unitList : []);
    } catch (err) {
      toast.error('Failed to load ingredients');
    }
```

### New code:
```js
    try {
      // BUG-314: Promise.allSettled — categories+units load even if getIngredients fails
      const [ingsResult, catsResult, unitsResult] = await Promise.allSettled([
        inventoryService.getIngredients(),
        inventoryService.getCategories(),
        inventoryService.getUnits(),
      ]);
      const ings     = ingsResult.status  === 'fulfilled' ? ingsResult.value  : [];
      const cats     = catsResult.status  === 'fulfilled' ? catsResult.value  : [];
      const unitList = unitsResult.status === 'fulfilled' ? unitsResult.value : [];
      if (ingsResult.status === 'rejected') toast.error('Could not load ingredients list');
      setIngredients(ings);
      setCategories(cats);
      setUnits(Array.isArray(unitList) ? unitList : []);
    } catch (err) {
      toast.error('Failed to load inventory data');
    }
```

**What changes:**
- `Promise.all` → `Promise.allSettled` (line 43)
- Destructured array result → individual result objects with `.status` / `.value`
- 3 conditional assignments to extract fulfilled values or `[]` on rejection
- Conditional toast only when ingredients fail (not on category/unit failure)
- Outer `catch` kept as safety net (e.g. if `Promise.allSettled` itself throws — extremely unlikely but safe to keep)

**Code marker:** `// BUG-314:` on the `Promise.allSettled` line

---

## Edit 2 — BUG-320 (Part A): `SubRecipeStockPanel.jsx` — Remove physicalQty

**File:** `src/components/inventory/SubRecipeStockPanel.jsx`  
**Function:** `handleSave()` (the async batch-save loop)  
**Line:** 94

### Current code (line 94):
```js
          physicalQty: Number(entry.qty), // V4: physicalQty always equals quantity entered
```

### New code:
```js
          // BUG-320: physical_qty removed — not applicable to sub-recipe produced-qty context
```

**What changes:** Remove `physicalQty` argument from the `addSubRecipeStock` call. The `// BUG-320` comment replaces the line to preserve the code marker and explain the removal.

**After removal, the call reads:**
```js
        await inventoryService.addSubRecipeStock(sub.id, {
          quantity: Number(entry.qty),
          unit,
          // BUG-320: physical_qty removed — not applicable to sub-recipe produced-qty context
          reason: reasonLabel,
          ...(entry.batch ? { batch: entry.batch } : {}),
          ...(entry.expiry ? { expiry: entry.expiry } : {}),
        });
```

---

## Edit 3 — BUG-320 (Part B): `inventoryTransform.js` — Remove physical_qty from payload

**File:** `src/api/transforms/inventoryTransform.js`  
**Function:** `toAPI.addSubRecipeStock()`  
**Line:** 232

### Current code (lines 227–237):
```js
  addSubRecipeStock(data) {
    return {
      sub_recipe_id: data.subRecipeId,
      quantity: data.quantity,
      unit: data.unit || '',
      physical_qty: data.physicalQty ?? 0,
      waste_reason: data.reason || '',
      ...(data.batch ? { batch: data.batch } : {}),
      ...(data.expiry ? { expiry_date: data.expiry } : {}),
    };
  },
```

### New code:
```js
  // BUG-320: physical_qty removed from sub-recipe stock payload (ingredient audit concept, not applicable here)
  addSubRecipeStock(data) {
    return {
      sub_recipe_id: data.subRecipeId,
      quantity: data.quantity,
      unit: data.unit || '',
      waste_reason: data.reason || '',
      ...(data.batch ? { batch: data.batch } : {}),
      ...(data.expiry ? { expiry_date: data.expiry } : {}),
    };
  },
```

**What changes:** Remove `physical_qty: data.physicalQty ?? 0,` from the return object (line 232). Add `// BUG-320` marker on the function.

**DO NOT CHANGE** `fromAPI.ingredients()` line 72 (`physicalQty: Number(item.physical_qty) || 0`) — this is the READ path (reading `physical_qty` from the API response for ingredient display). It is correct and unrelated to this fix.

---

## Risk Register

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | `Promise.allSettled` unavailable in target environment | Very Low (Node 20, React 19) | ES2020 built-in — safe |
| R2 | Backend uses `physical_qty` from sub-recipe endpoint for audit | Low | Owner confirmed removal; backend returns HTTP 200 regardless |
| R3 | Other call site passes `physicalQty` to `addSubRecipeStock` | None | Only `SubRecipeStockPanel.jsx` calls this function (grep confirmed) |
| R4 | Removing `physical_qty` breaks backend contract | Low | Backend accepts but doesn't require the field; HTTP 200 still returned |

---

## Verification Matrix (Gate 4 → Self-Test → QA)

| # | Edit | File | How to Verify | Automated? |
|---|---|---|---|---|
| V1 | Edit 1 — categories load when no ingredients | `InventorySetupPanel.jsx` | Browser: login as owner@thegoankitchen.com → `/inventory-setup` → CATEGORIES sidebar shows "body parts" (id=1746) | NO — browser |
| V2 | Edit 1 — unit dropdown loads when no ingredients | `InventorySetupPanel.jsx` | Browser: click "+ Add Ingredient" → Base Unit dropdown shows kg, ltr, etc. | NO — browser |
| V3 | Edit 1 — toast "Could not load ingredients" shown | `InventorySetupPanel.jsx` | Browser DevTools: block `/get-inventory-master` → toast appears, but categories still show | NO — browser |
| V4 | Edit 1 — ingredients load normally when present | `InventorySetupPanel.jsx` | Browser: any restaurant with ingredients → list populates correctly | NO — browser |
| V5 | Edit 2+3 — payload does NOT contain physical_qty | `SubRecipeStockPanel.jsx` + `inventoryTransform.js` | Browser DevTools → Network → `/add-sub-recipe-stock` POST → Request tab → no `physical_qty` key | NO — browser |
| V6 | Edit 2+3 — adjustment saves successfully (HTTP 200) | Both | Browser: enter qty, click Save → success toast | NO — browser |
| V7 | fromAPI unchanged — ingredients still map physicalQty correctly | `inventoryTransform.js:72` | Verify line 72 still present and unchanged (READ path untouched) | YES — grep |

---

## Post-Code Registry Checklist (Implementation Agent MUST execute)

```
□ 1. REGISTRY SYNC:
     python3 -c "
     import json
     with open('/app/memory/control/registry.json') as f:
         d = json.load(f)
     items = {i['id']: i for i in d['items']}
     for cid in ['BUG-314', 'BUG-320']:
         assert cid in items, f'{cid} MISSING from registry'
         assert 'IMPLEMENTED' in items[cid].get('status',''), f'{cid} not IMPLEMENTED'
     print('Registry sync PASS')
     "

□ 2. BUG_TRACKER.md: BUG-314 + BUG-320 rows → IMPLEMENTED status

□ 3. FILE_OWNERSHIP.md: Add entries:
     | components/inventory/InventorySetupPanel.jsx | BUG-314: Promise.allSettled in fetchData(), 3 per-API result handlers | BUG-314 IMPL agent 2026-08-13 |
     | components/inventory/SubRecipeStockPanel.jsx | BUG-320: removed physicalQty from addSubRecipeStock call (L94) | BUG-320 IMPL agent 2026-08-13 |
     | api/transforms/inventoryTransform.js         | BUG-320: removed physical_qty from toAPI.addSubRecipeStock() (L232) | BUG-320 IMPL agent 2026-08-13 |

□ 4. CODE MARKERS:
     InventorySetupPanel.jsx: // BUG-314: on the Promise.allSettled line
     SubRecipeStockPanel.jsx: // BUG-320: on the removed line (as comment)
     inventoryTransform.js:   // BUG-320: on the addSubRecipeStock function

□ 5. COMPILE CHECK:
     Check /var/log/supervisor/frontend.out.log → "Compiled successfully"
     Zero new warnings introduced
```

---

## QA Handover Seeds

**Test credentials:** `owner@thegoankitchen.com` / `***`  
**App URL:** https://pos-frontend-deploy-28.preview.emergentagent.com  
**Navigation:**
- BUG-314: `/inventory-setup` → Ingredients tab
- BUG-320: `/inventory-sub-recipe-stock`

**Key test flows:**
1. BUG-314 — Login as owner@thegoankitchen.com → `/inventory-setup` → Sidebar should show "body parts" category (currently broken — shows 0)
2. BUG-314 — Click "+ Add Ingredient" → Base Unit dropdown should show 17 units (currently broken — shows only "Unit...")
3. BUG-320 — `/inventory-sub-recipe-stock` → Enter qty for "churmuratoe" → Save → DevTools Network → POST `/add-sub-recipe-stock` → Request body should NOT contain `physical_qty`

**Regression areas:**
- Verify StockAuditPanel still sends `physical_qty` for regular ingredients (no change expected — different code path)
- Verify adding ingredients still works after Promise.allSettled change

---

## Awaiting Gate 4 GO

Owner must approve before implementation starts.

```
OWNER APPROVAL REQUIRED
Reason: Gate 4 implementation GO for BUG-314 + BUG-320
Risk: MEDIUM (BUG-314), LOW (BUG-320)
Proposed next step: Implementation agent applies 3 edits across 3 files, self-tests via browser, writes QA handover.
I will not proceed until owner approves.
```
