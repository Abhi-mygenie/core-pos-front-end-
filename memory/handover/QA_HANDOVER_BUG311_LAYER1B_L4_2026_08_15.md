# QA Handover — BUG-311 Layer 1B + Layer 4
**Date:** 2026-08-15
**For:** QA agent (Gate 5b)
**Environment:** https://react-pos-frontend-11.preview.emergentagent.com
**Credentials:** owner@thegoankitchen.com / *** (RID 69)
**Navigation:** Login → Inventory (sidebar) → Ingredients tab

---

## 1. Files Changed

| File | Change |
|------|--------|
| `components/inventory/IngredientNameCombobox.jsx` | NEW — shared typeahead component with `excludeId` prop |
| `components/inventory/InventorySetupPanel.jsx` | Edit form: `IngredientNameCombobox` wired (L412) + `isEditDuplicate` useMemo (L95) + Save `disabled` (L470) |
| `components/inventory/IngredientBulkEditor.jsx` | Bulk edit name cell: `IngredientNameCombobox` wired (L406) |

---

## 2. Inherited from Plan (Verification Matrix)

| Edit | File | Change | Self-Test |
|------|------|--------|-----------|
| Edit 1 | IngredientNameCombobox.jsx | New shared file + excludeId prop | ✅ File exists, excludeId in filtered + exactMatch |
| Edit 2+3 | InventorySetupPanel.jsx | Local def removed + import added | ✅ No local function, import at L13 |
| Edit 4 | InventorySetupPanel.jsx | isEditDuplicate useMemo at L95 | ✅ Present, excludes editingId |
| Edit 5 | InventorySetupPanel.jsx | Edit form combobox at L412 | ✅ `excludeId={editingId}` confirmed |
| Edit 6 | InventorySetupPanel.jsx | Edit Save disabled={isEditDuplicate} | ✅ `disabled={isEditDuplicate}` at L470 |
| Edit 7 | IngredientBulkEditor.jsx | Import at L13 | ✅ Present |
| Edit 8 | IngredientBulkEditor.jsx | Name cell combobox at L406 | ✅ `excludeId={row._isNew ? null : row._id}` |

---

## 3. Test Cases

### TC-1 — Edit form: typing existing name shows dropdown
**Steps:**
1. Ingredients tab → find any ingredient → click pencil (✏) icon
2. Clear the name field → type an existing ingredient name partially (e.g. "tom")
3. Observe dropdown below the input

**Expected:** Dropdown appears with "Existing ingredients" header, matching names listed with category badges.
**Previously:** Plain input, no dropdown.

---

### TC-2 — Edit form: exact self-name is NOT a duplicate
**Steps:**
1. Open edit row for ingredient "boil dead body"
2. Clear name → type "boil dead body" (exact same name)
3. Observe input border and Save button

**Expected:** No amber border. Save button enabled. (It's the same ingredient, not a duplicate.)
**Fail condition:** Amber border or disabled Save for own name.

---

### TC-3 — Edit form: exact OTHER name triggers amber + Save disabled
**Steps:**
1. Open edit row for ingredient X
2. Type the exact name of a DIFFERENT existing ingredient
3. Observe input border and Save button

**Expected:** Input border turns amber, "Already exists" badge in dropdown, Save button disabled (grey, cursor-not-allowed).

---

### TC-4 — Bulk Edit new row: typing existing name shows dropdown
**Steps:**
1. Click "Bulk Edit" button → opens IngredientBulkEditor
2. Click "+ Add Item" → a new green-bordered row appears at top
3. Type an existing ingredient name in the name field

**Expected:** Dropdown appears with matching existing ingredients + category badges.
**Previously:** Plain input, no dropdown.

---

### TC-5 — Bulk Edit existing row: rename to own name — no warning
**Steps:**
1. In Bulk Edit, find an existing ingredient row (e.g., "boil dead body")
2. Click into the name cell → clear → retype "boil dead body" exactly
3. Observe

**Expected:** No amber border on the name input. (Self-exclusion works via `excludeId={row._id}`.)

---

### TC-6 — Bulk Edit existing row: rename to another ingredient's name shows warning
**Steps:**
1. In Bulk Edit, click into an existing row's name cell
2. Type the exact name of a DIFFERENT existing ingredient

**Expected:** Input border turns amber + "Already exists" badge in dropdown.

---

### TC-7 — Regression: Add form still works
**Steps:**
1. Click "+ Add Ingredient" → new row appears
2. Type an existing ingredient name

**Expected:** Dropdown still appears as before. No regression.

---

### TC-8 — Regression: Bulk Edit auto-focus on new row
**Steps:**
1. Bulk Edit → click "+ Add Item"
2. Observe whether the name field auto-focuses

**Expected:** Name field is focused immediately (via `autoFocus` on inner Input).

---

### TC-9 — Regression: Bulk Edit save with Layer 3 guard still works
**Steps:**
1. Bulk Edit → Add Item → type an existing ingredient name exactly → click "Save N Changes"
2. Observe toast

**Expected:** Error toast "already exists" fires (Layer 3 guard at IngredientBulkEditor.jsx:192 still active).

---

## 4. Regression Scope

BulkEditor.jsx and InventorySetupPanel.jsx are HIGH-use files but not in R5 hotspot list.
Regression tests: TC-7 (Add form), TC-8 (auto-focus), TC-9 (Layer 3 guard).

---

## 5. Registry Sync Confirmation

- Registry synced: YES ✅
- Items: BUG-311 (Layer 1B + Layer 4)
- Sprint: pos_5_1
- EXIT GATE: ALL 5 PASSED ✅

Fix report / plan: `memory/plans/BUG-311-LAYER1B-L4_AMENDMENT_IMPLEMENTATION_PLAN.md`
