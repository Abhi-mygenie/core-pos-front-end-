# BUG-121 — Menu Management: Category Item Count Shows Zero + Post-Save Refresh

**Status:** INTAKE
**Priority:** P1
**Sprint:** POS 4.0
**Date:** 2026-06-09
**Reporter:** Owner
**Parent CR:** CR-014 (Menu Management)
**Module:** Menu Management Panel — CategoryList + ProductList

---

## Sub-Bugs

### BUG-121-A — Category Item Count Always Shows 0

**Symptom:** Every category in the left sidebar shows "0" — including "All Items". Should show actual count of items per category.

**Screenshot:** All categories (SWEET, FMCJ, Fry, Pizza, main, egg, Thali, new category) show 0.

**Likely cause:** Categories fetched from `GET /product/categories` API which returns `products_count: 0` (or not populated by backend). The item count should be derived from `foods-list` response by counting foods per `category.id`.

---

### BUG-121-B — Product List Not Refreshing After Add/Edit

**Symptom:** After adding an item ("Egg paratha"), it doesn't appear in the product list until manually searched. The list should auto-refresh after add/edit.

**Additional observation:** 3 duplicate "Egg paratha" entries appeared (1 active, 2 inactive) — possible duplicate submission or stale data.

**Likely cause:** `onSave → onRefresh → getFoodsList` chain not triggering correctly after ProductForm save.

---

## Files Likely Involved

| File | Sub-Bug |
|------|---------|
| `CategoryList.jsx` | A |
| `MenuManagementPanel.jsx` | A, B |
| `ProductList.jsx` | B |
| `menuManagementTransform.js` | A |

---

*End of BUG-121 Intake — Gate 1 Complete.*
