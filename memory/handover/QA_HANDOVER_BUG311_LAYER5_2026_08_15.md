# QA Handover — BUG-311 Layer 5 + L5b
**Date:** 2026-08-15
**For:** QA agent (Gate 5b)
**Environment:** https://react-pos-frontend-11.preview.emergentagent.com
**Credentials:** owner@thegoankitchen.com / *** (RID 69)
**Navigation:** Login → Inventory → Ingredients → Bulk Edit

---

## 1. Files Changed

| File | Change |
|------|--------|
| `components/inventory/IngredientBulkEditor.jsx` | +`hasDuplicateInDirty` useMemo (L103) + both Save buttons `disabled` (L346, L519) + handleSave EDITED-row guard (L220) |

---

## 2. Inherited from Plan (Self-Test Results)

| Edit | Change | Self-Test |
|------|--------|-----------|
| Edit 1 | `hasDuplicateInDirty` useMemo at L103 | ✅ Present, covers Cases A/B/C/D |
| Edit 2 | Top Save `disabled={... \|\| hasDuplicateInDirty}` at L346 | ✅ Confirmed |
| Edit 3 | Footer Save `disabled={... \|\| hasDuplicateInDirty}` at L519 | ✅ Confirmed |
| Edit 4 | handleSave EDITED-row guard at L220 | ✅ Confirmed |

---

## 3. Test Cases

### TC-1 — NEW row matching existing DB name blocks BOTH Save buttons
**Steps:**
1. Inventory → Ingredients → Bulk Edit
2. Click "+ Add Item" → type exact name of any existing ingredient (e.g. "test-qa-1786782593")
3. Observe the "Save N Changes" button in the **top toolbar** and **bottom footer**

**Expected:** Both buttons greyed / disabled immediately.
**Previously:** Both buttons active (orange, clickable).

---

### TC-2 — EDITED row renamed to existing name blocks BOTH Save buttons
**Steps:**
1. In Bulk Edit, click into an existing ingredient's name cell
2. Change the name to exactly match a DIFFERENT existing ingredient
3. Observe both Save buttons

**Expected:** Both buttons greyed immediately.

---

### TC-3 — Two NEW rows with same name blocks Save
**Steps:**
1. Click "+ Add Item" twice (two new rows)
2. Type the exact same name in both name fields
3. Observe both Save buttons

**Expected:** Both buttons greyed (cross-row duplicate detected).

---

### TC-4 — Unique new name keeps Save ENABLED
**Steps:**
1. Click "+ Add Item" → type a name that does NOT exist in any ingredient
2. Fill required fields (category, unit)
3. Observe both Save buttons

**Expected:** Both buttons remain orange / active.

---

### TC-5 — Resolving duplicate re-enables Save
**Steps:**
1. Reproduce TC-1 (Save disabled)
2. Clear the duplicate name → type a unique name
3. Observe both Save buttons

**Expected:** Both buttons become active again as soon as name is unique.

---

### TC-6 — Defence-in-depth: EDITED row guard in handleSave
*(Low-priority; primary protection is the disabled button)*
**Steps:**
1. If the Save button somehow becomes clickable with a renamed duplicate (e.g., direct DOM manipulation or race condition)
2. Click Save

**Expected:** Row shows a red `_saveError` badge "already exists". Toast fires. Row is not saved to API.

---

### TC-7 — Regression: pending delete rows do NOT trigger false disable
**Steps:**
1. Select an existing row → delete it (trash icon)
2. Observe Save buttons (should be active — there IS a dirty change)

**Expected:** Save buttons active (deletes are `_deleted` rows, excluded from `hasDuplicateInDirty` check).

---

### TC-8 — Regression: Layer 3 NEW row guard still fires
**Steps:**
1. (If disable is bypassed) Save a new row with a duplicate name
2. Observe row status badge

**Expected:** Row shows error badge from Layer 3 guard. Pre-existing behaviour unchanged.

---

### TC-9 — Regression: single Add form save-disable still works
**Steps:**
1. Exit Bulk Edit → use "+ Add Ingredient" in list view
2. Type a duplicate name

**Expected:** Save button in add form still disabled (Layer 1/L2 unaffected by this change).

---

## 4. Regression Scope
IngredientBulkEditor.jsx is not in R5 hotspot list.
Key regression tests: TC-7 (delete rows), TC-8 (Layer 3 guard), TC-9 (add form).

---

## 5. Registry Sync Confirmation
- Registry synced: YES ✅
- Items: BUG-311 (Layer 5 + L5b)
- Sprint: pos_5_1
- EXIT GATE: ALL 5 PASSED ✅
