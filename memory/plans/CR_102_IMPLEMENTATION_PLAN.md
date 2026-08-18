# CR-102 — Implementation Plan (Gate 3)

**Date:** 2026-07-24
**Impact Analysis:** `impact/CR_102_IMPACT_ANALYSIS.md` (Gate 2 ✅)
**Code Reality:** NONE
**Risk:** LOW
**Scope Lock:** 1 file WILL change, all others WILL NOT touch

---

## Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | `inventoryTransform.js:128-137` | Add `consumption_unit` + conditional `converion_factor` in addIngredient | Code inspection: field present in returned payload | NO |
| 2 | `inventoryTransform.js:141-152` | Same for updateIngredient | Code inspection: field present in returned payload | NO |
| 3 | — | Curl: POST /add-inventory with consumption_unit | Backend accepts without 422 | YES (curl) |

---

## Edits (Execution Sequence)

### Edit 1: `api/transforms/inventoryTransform.js` — addIngredient

**File:** `api/transforms/inventoryTransform.js`
**Line:** L128-137 (toAPI.addIngredient)
**Current:**
```js
  addIngredient(data) {
    return [{
      category_id: data.categoryId,
      stock_title: data.name,
      unit: data.unit,
      small_unit: data.smallUnit || '',
      minimun_stock_alert: String(data.minQtyAlert || 0),
      min_unit_alert: data.minUnitAlert || '',
      converion_factor: String(data.conversionFactor || 1),
    }];
  },
```
**New:**
```js
  // CR-102: G-020 alignment — send consumption_unit alongside converion_factor
  addIngredient(data) {
    const hasConversion = data.smallUnit && data.conversionFactor && Number(data.conversionFactor) > 0;
    return [{
      category_id: data.categoryId,
      stock_title: data.name,
      unit: data.unit,
      small_unit: data.smallUnit || '',
      minimun_stock_alert: String(data.minQtyAlert || 0),
      min_unit_alert: data.minUnitAlert || '',
      ...(hasConversion ? {
        consumption_unit: data.smallUnit,                        // CR-102: G-020 requires this with factor
        converion_factor: String(data.conversionFactor),         // R9 typo preserved
      } : {}),
    }];
  },
```

### Edit 2: `api/transforms/inventoryTransform.js` — updateIngredient

**File:** `api/transforms/inventoryTransform.js`
**Line:** L141-152 (toAPI.updateIngredient)
**Current:**
```js
  updateIngredient(data) {
    return {
      stock_title: data.name || '',
      category_id: data.categoryId,
      unit: data.unit || '',
      small_unit: data.smallUnit || '',
      converion_factor: String(data.conversionFactor || 1),
      minimun_stock_alert: String(data.minQtyAlert || 0),
      min_unit_alert: data.minUnitAlert || '',
      reason: 'update',
    };
  },
```
**New:**
```js
  // CR-102: G-020 alignment — send consumption_unit alongside converion_factor
  updateIngredient(data) {
    const hasConversion = data.smallUnit && data.conversionFactor && Number(data.conversionFactor) > 0;
    return {
      stock_title: data.name || '',
      category_id: data.categoryId,
      unit: data.unit || '',
      small_unit: data.smallUnit || '',
      ...(hasConversion ? {
        consumption_unit: data.smallUnit,                        // CR-102: G-020 requires this with factor
        converion_factor: String(data.conversionFactor),         // R9 typo preserved
      } : {}),
      minimun_stock_alert: String(data.minQtyAlert || 0),
      min_unit_alert: data.minUnitAlert || '',
      reason: 'update',
    };
  },
```

---

## Design Decisions (Locked)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Repurpose `smallUnit` as `consumption_unit` | YES | Same concept (conversion target unit). No new form field needed. |
| 2 | Conditional send (`hasConversion` guard) | YES | Only send both fields when user fills BOTH smallUnit + factor. Prevents orphan `converion_factor: "1"` triggering G-020. |
| 3 | Keep `small_unit` in payload | YES | Backward compat — legacy display field. Backend ignores for conversion but may still read for display. |

---

## Scope Lock

**Files WILL change:**
- `api/transforms/inventoryTransform.js` (2 edits: addIngredient + updateIngredient)

**Files WILL NOT touch:**
- InventorySetupPanel.jsx, inventoryService.js, constants.js, AutoShoppingList.jsx, SmartPurchasePanel.jsx

## Post-Code Registry Checklist

- [ ] registry.json: CR-102 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add inventoryTransform.js with CR-102
- [ ] Code markers: // CR-102 comment in every modified section

---

**Next:** Gate 4 GO → Implementation
