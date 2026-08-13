# BUG-314 — Investigation Report: Inventory Setup — Categories & Units Not Loading

**Date:** 2026-08-13  
**Role:** INVESTIGATION  
**Confidence:** HIGH  
**Steps used:** 6/10  
**Classification:** FE_BUG + BACKEND_BUG (dual root cause)

---

## 1. Summary

**Root cause:** `InventorySetupPanel.jsx` uses `Promise.all([getIngredients(), getCategories(), getUnits()])`. When `get-inventory-master` returns HTTP 404 for this restaurant (no ingredients registered), `axios` throws and `Promise.all` rejects atomically — `categories` and `units` state are **never set**, even though both their APIs succeed (200). Result: category sidebar shows 0, unit dropdown shows only placeholder "Unit...", ingredient add form is non-functional.

**Secondary root cause:** `get-inventory-master` returns HTTP 404 instead of HTTP 200 + empty array when a restaurant has no ingredients — non-standard REST behavior.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | `get-inventory-master` 404 → `Promise.all` atomic failure → cats/units not set | Browser screenshot + code trace | 1–4 | **CONFIRMED** | Screenshot shows 404; `Promise.all` in `InventorySetupPanel.jsx:42-51`; catch block sets no state |
| H2 | Categories API fails independently | curl GET stock-item-categories | 2 | ELIMINATED | Returns 200 + 1 category ("body parts") |
| H3 | Units API fails | curl GET get-unit | 3 | ELIMINATED | Returns 200 + 17 units |

---

## 3. Data Flow Trace

```
API: GET /api/v2/vendoremployee/inventory/get-inventory-master → HTTP 404
     GET /api/v2/vendoremployee/inventory/stock-item-categories → HTTP 200 ✅
     GET /api/v2/vendoremployee/expense/get-unit → HTTP 200 ✅

Code: InventorySetupPanel.jsx:42
  const [ings, cats, unitList] = await Promise.all([
    getIngredients(),   ← throws (404)
    getCategories(),    ← would succeed
    getUnits(),         ← would succeed
  ]);
  // ← never reached
  setIngredients(ings);
  setCategories(cats);
  setUnits(...);

CATCH block: toast.error('Failed to load ingredients')
  → categories = [] (initial)  → CATEGORIES (0) in sidebar
  → units = []     (initial)  → dropdown shows only "Unit..." placeholder
  → validation "Name, category, and unit are required" fires on save attempt
  → red "Unit..." badge shown in screenshot 2

BREAK POINT: Promise.all:42 — atomic rejection on get-inventory-master 404
```

---

## 4. Evidence Artifacts

Saved to: `/app/memory/evidence/BUG-INV-DROPDOWN/`

- `inv_master.txt` — curl probe: `success: None, count: 0` (HTTP 404 body, no data)
- `cats.txt` — curl probe: `success: True, count: 1` (1 category: "body parts", id=1746)
- `units.txt` — curl probe: 17 units returned successfully

**Screenshots (owner-provided):**
- Screenshot 1: Network tab shows `get-inventory-master` = **404**, `stock-item-categories` = 200, UI shows "CATEGORIES (0)"
- Screenshot 2: User typing ingredient "toe" with Base Unit dropdown showing only truncated "Unit..." + red error badge

---

## 5. Recommendations

### FE Fix (PRIMARY — independent of backend fix)
**Classification:** FE_BUG  
**File:** `src/components/inventory/InventorySetupPanel.jsx` — `fetchData()` function  
**Lines:** ~42–51  
**Change:** Replace `Promise.all` with `Promise.allSettled` so categories and units load even when ingredients fail:

```js
const results = await Promise.allSettled([
  inventoryService.getIngredients(),
  inventoryService.getCategories(),
  inventoryService.getUnits(),
]);
const ings     = results[0].status === 'fulfilled' ? results[0].value : [];
const cats     = results[1].status === 'fulfilled' ? results[1].value : [];
const unitList = results[2].status === 'fulfilled' ? results[2].value : [];
if (results[0].status === 'rejected') toast.error('Failed to load ingredients');
setIngredients(ings);
setCategories(cats);
setUnits(Array.isArray(unitList) ? unitList : []);
```

**Planning skip eligible:** YES — 1 file, ~10 lines, non-hotspot, non-financial. Requires owner approval.

### Backend Ask (SECONDARY)
`get-inventory-master` should return HTTP 200 + `{ data: [] }` when no ingredients exist, not 404.
→ File backend brief.

---

## 6. Retroactive Candidates
None.

---

## 7. Other Issues Observed (a, b, c per owner request)
a. **Category not showing:** Confirmed — root cause above. CATEGORIES(0) because cats never loaded.  
b. **Unit dropdown not working:** Confirmed — root cause above. units=[] so only "Unit..." placeholder shown.  
c. **Other issues:** No other FE bugs observed on this screen. The add-ingredient form validation (red "Unit..." badge) is correct behavior given empty units list — it's a consequence, not an independent bug.
