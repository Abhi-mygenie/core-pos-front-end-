# BUG-125-B: Food Type (item_type) Not Persisting on Edit — IMPLEMENTED

**Date:** 2026-06-11 (planned) · 2026-06-12 (implemented)
**Priority:** P1 (data integrity — food type changes silently lost)
**Status:** ✅ CODE COMPLETE — compiled clean, pending owner smoke test
**Reporter:** Owner (CR-022 Quick Edit investigation)
**Affects:** All 3 edit paths (Quick Edit, Full Edit, Bulk Editor)

---

## 1. ROOT CAUSE

Backend edit endpoint `POST /api/v2/vendoremployee/product/foods/{id}` reads the **`veg` field** (combined enum: 0=NV, 1=Veg, 2=Egg, 3=Jain). FE sends **`item_type`** which backend ignores.

Confirmed via curl (owner-provided working example):
```bash
PUT /api/v2/vendoremployee/product/foods/181747
Content-Type: application/json
{ "name": "Curd", "price": 20, "category_id": 6763, "veg": 2, "food_for": "Normal" }
```
Backend reads `veg: 2` → sets food type to Egg. ✅

FE currently sends:
```json
{ "item_type": 2 }   ← backend ignores this
```
No `veg` field sent → food type unchanged.

**Verified via live API tests (2026-06-11 preprod Palm House):**
- Sent `item_type: 2` → ignored ❌
- Sent `veg: 0` → persisted (item_type changed to 0) ✅
- Sent `veg: 1` → persisted (item_type changed to 1) ✅

---

## 2. IMPACT ANALYSIS

### Outbound (FE → Backend): 3 paths affected

| # | Path | File | Line | Current (broken) | Fix |
|---|------|------|------|-----------------|-----|
| 1 | **toAPI.foodInfo** (shared by ProductForm + QuickEdit) | `menuManagementTransform.js` | L249 | `item_type: 0/1/2/3` | Add `veg: 0/1/2/3` |
| 2 | **BulkEditor buildPayload** (inline, not shared) | `BulkEditor.jsx` | L144 | `item_type: Number(row.itemType)` | Add `veg: Number(row.itemType)` |

Both call `menuService.editFood()` → same backend endpoint.

### Inbound (Backend → FE): 2 read paths — NO CHANGE NEEDED

| # | Path | File | Line | Reads | Status |
|---|------|------|------|-------|--------|
| 1 | Menu Management foods-list | `menuManagementTransform.js` | L57-60 | `api.item_type` → `isVeg/hasEgg/isJain/itemType` | ✅ Correct (backend returns `item_type` derived from `veg`) |
| 2 | Order-taking products-list | `productTransform.js` | L79-81 | `api.veg` → `isVeg`, `api.egg` → `hasEgg`, `api.jain` → `isJain` | ✅ Correct (different API, different field names) |

### UI (display): NO CHANGE NEEDED

| Component | How it reads food type | Status |
|-----------|----------------------|--------|
| ProductCard.jsx L6-8 | `product.hasEgg / isJain / isVeg` | ✅ |
| ProductCard.jsx L31 (QuickEdit init) | Same | ✅ |
| ProductForm.jsx L222 | Same | ✅ |
| ProductList.jsx L58-61 (filter) | `p.itemType === 0/1/2/3` | ✅ |
| BulkEditor.jsx L81 | `f.itemType` | ✅ |
| BulkEditor.jsx L729-733 | `row.itemType` dropdown | ✅ |

### Add Food path: VERIFY

`addFood` (`POST /add-food`) uses the same `toAPI.foodInfo` payload. If backend add endpoint also reads `veg` not `item_type`, then **new items added as Egg/Jain are also broken**. The fix covers this automatically since `toAPI.foodInfo` is shared.

---

## 3. FIX PLAN

### Change 1: `menuManagementTransform.js` L249
**Add `veg` field** alongside existing `item_type` (keep `item_type` for forward compatibility if backend ever reads it):

```js
// Current:
item_type: form.foodType === 'veg' ? 1 : form.foodType === 'egg' ? 2 : form.foodType === 'jain' ? 3 : 0,

// Add after:
veg: form.foodType === 'veg' ? 1 : form.foodType === 'egg' ? 2 : form.foodType === 'jain' ? 3 : 0,
```

**1 line addition.** `item_type` kept as-is (no removal — harmless, backend ignores it).

### Change 2: `BulkEditor.jsx` L144
**Add `veg` field** alongside existing `item_type`:

```js
// Current:
item_type: Number(row.itemType),

// Add after:
veg: Number(row.itemType),
```

**1 line addition.**

### Total: 2 lines added across 2 files. Zero lines modified. Zero lines removed.

**Implementation date:** 2026-06-12. Compiled clean. Both changes verified in codebase:
- `menuManagementTransform.js` L251: `veg: form.foodType === 'veg' ? 1 : ...`
- `BulkEditor.jsx` L146: `veg: Number(row.itemType)`

---

## 4. FILES TOUCHED

| File | Change | Lines |
|------|--------|-------|
| `src/api/transforms/menuManagementTransform.js` | Add `veg:` field after L249 | +1 line |
| `src/components/panels/menu/BulkEditor.jsx` | Add `veg:` field after L144 | +1 line |

---

## 5. REGRESSION RISK

| Risk | Assessment |
|------|-----------|
| Existing veg items broken? | **None** — `veg: 1` is what backend already stores for veg. Same value, now explicitly sent. |
| Backend rejects unknown field? | **None** — backend upsert ignores unknown fields (tested: `item_type` ignored, not rejected). |
| `item_type` in response changes? | **None** — backend derives `item_type` from `veg` field on read. Sending `veg` correctly means `item_type` will be correct on next fetch. |
| Order-taking affected? | **None** — order-taking uses `productTransform.js` which reads from a different API (`get-products-list`). No outbound writes. |
| BulkEditor dirty-tracking? | **None** — dirty check at L209 uses `itemType` (FE state), not `veg` (API field). No change to dirty logic. |
| CR-022 food type filter? | **Fixed** — ProductList filter uses `p.itemType` from `fromAPI.food`. Once `veg` is sent correctly, `item_type` on re-fetch will be correct → filter works. |

---

## 6. VERIFICATION PLAN

After fix:

| # | Test | Expected |
|---|------|----------|
| 1 | Quick Edit: change Veg → Egg → Save → Refresh | `item_type: 2` persisted |
| 2 | Quick Edit: change Veg → Jain → Save → Refresh | `item_type: 3` persisted |
| 3 | Quick Edit: change Egg → Non-Veg → Save → Refresh | `item_type: 0` persisted |
| 4 | Full Edit: change Veg → Egg → Save → Refresh | `item_type: 2` persisted |
| 5 | Bulk Editor: change multiple items' type → Save → Refresh | All types persisted |
| 6 | Add new item as Egg → verify `item_type: 2` on fetch | Egg persisted |
| 7 | Food type filter: after changing to Egg, item appears under Egg filter | Filter works |
| 8 | Order-taking menu: after change, OrderEntry shows correct food dot | Correct display |

---

## 7. RELATED

- **CR-022** (Food Type Filters) — CLOSED but this bug was latent since CR-014 (Menu Management migration). CR-022 fixed the filter enum, but the save path was broken from the start.
- **CR-014** (Menu Management) — The migration mapped `item_type` for reads correctly but missed `veg` for writes.
- **BUG-120-D** (6 API fields wired) — Wired `is_inventory`, `packed_food`, etc. but did not catch the `veg` vs `item_type` discrepancy for food type.
