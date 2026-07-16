# BUG-120 — CR-014 Menu Management Post-Delivery Bugs (5 Sub-Items)

**Status:** INTAKE
**Priority:** P0 (contains P0 sub-item)
**Sprint:** POS 4.0
**Date:** 2026-06-09
**Reporter:** Owner
**Parent CR:** CR-014 (Menu Management API Migration)
**Module:** Menu Management Panel + ProductForm + BulkEditor + Socket

---

## Summary

Owner smoke follow-up: 5 bugs found in Menu Management module after CR-014 Phase 1 + Phase 2 delivery. All relate to the same module — tracked as one bug with sub-items.

---

## Sub-Bugs

### BUG-120-A — Input Fields Lose Focus After Every Keystroke (P0)

**Symptom:** In the Add/Edit item form (`ProductForm.jsx`), typing a single character in ANY input field causes the field to lose focus. User must re-click the field to type the next character. Affects: Name, Description, Price, Item Code, Allergens, Kcal — all input fields.

**Impact:** P0 — form is effectively unusable for editing.

**Likely cause:** Component re-rendering on every keystroke (state lifted too high, or component re-mounting due to key/render issue).

**Scope:** `ProductForm.jsx` — investigate re-render cause. Also do full field validation (all fields working correctly after fix).

**Attachment:** Screenshot showing "Chicken Sweet & So" (unable to complete typing).

---

### BUG-120-B — Image Upload Destination Unknown (P1)

**Symptom:** Product image upload exists in the UI but it's unclear which server/endpoint/storage path the image is uploaded to.

**Action needed:**
1. Trace the image upload flow: `ProductForm.jsx` → which API endpoint?
2. Confirm: does `POST /product/add-food` or `POST /product/foods/{id}` handle the `image` field in multipart?
3. Document the server + storage path for owner visibility.
4. Verify uploaded images actually persist and display after save.

---

### BUG-120-C — Variation Creation UI Missing + Form UX Redesign (P1)

**Symptom:** No UI exists to create/edit/manage product variations (e.g., Small/Medium/Large with different prices). The form currently shows variations as read-only chips but provides no way to add or modify them.

**Additionally:** The Add/Edit form (`ProductForm.jsx`) has poor UX — all fields in a flat list with no logical grouping. Needs section-based layout redesign:

| Section | Fields |
|---------|--------|
| Basic Info | Name, Description, Image |
| Pricing & Tax | Price, Tax %, Tax Type, Discount, Discount Type, Give Discount |
| Classification | Category, Food Type, Item Code, Allergens, Kcal |
| Availability & Channels | Dine-in, Delivery, Takeaway, Live Web, Available Times |
| Variations | Create/Edit/Delete variations (NEW UI) |
| Add-ons | Addon selection/creation (existing) |
| Operations | Prep Time, Serve Time, Pack Charges, Takeaway/Delivery Charges |
| Status & Flags | Status, Complementary, Inventory, Packaged Item |

**Scope:** `ProductForm.jsx` — major UX overhaul + new Variation CRUD UI.

**Dependency:** Need to confirm variation API shape (does `POST /product/add-food` accept `variation` array in `food_info`?).

---

### BUG-120-D — `is_inventory` & `packed_food` Disabled + Full API Field Re-Audit (P1)

**Symptom:** `is_inventory` and `packed_food` fields are disabled/commented-out in the UI. Owner confirms backend has now added these fields to the `foods-list` API response.

**Action needed:**
1. Re-scan live `foods-list` API response to verify `is_inventory` and `packed_food` are present
2. Enable both fields in: ProductForm (full edit), ProductCard (quick edit), Bulk Editor
3. Uncomment `packed_food` and `is_inventory` in `toAPI.bulkFoodInfo()` (currently commented out in `menuManagementTransform.js`)
4. **Full field audit:** Check if backend has also added any of these previously-missing fields:
   - `egg` / `jain` (separate from `item_type`)
   - `stock_out`
   - `is_disable`
   - `station_name`
   - `tax_calc`
5. Wire any newly-available fields into transform + UI

---

### BUG-120-E — Menu Writes Not Updating MenuContext via Socket (P1)

**Symptom:** When adding/editing/deleting items or changing status in Menu Management, the backend emits a socket event — but the update does NOT reflect in MenuContext (order-taking side). The live menu on the dashboard/order-entry doesn't update until a full page refresh.

**Context:**
- Socket handler for `food_update` exists and works for the "Add Custom Item" flow (shipped previously)
- BUG-116 prepend change in `MenuContext.jsx` L34 handles new items via socket
- Menu Management API writes appear to trigger socket events (owner observed socket emitting) but MenuContext doesn't pick them up

**Also applies to Category operations:**
- Adding/editing/deleting a category affects the items within it
- Socket should reflect that items in that category have been updated
- Same socket → MenuContext refresh mechanism should handle this

**Action needed:**
1. Identify which socket event(s) Menu Management API writes emit
2. Check if existing `food_update` handler in `socketHandlers.js` catches them
3. If different event name, add handler
4. Verify MenuContext updates for: food add, food edit, food delete, food status toggle, category add, category edit, category delete
5. Reference: BUG-116 prepend pattern in `MenuContext.jsx`

---

## Files Likely Involved

| File | Sub-Bugs |
|------|----------|
| `ProductForm.jsx` | A, B, C, D |
| `ProductCard.jsx` | D |
| `BulkEditor.jsx` | D |
| `menuManagementTransform.js` | D |
| `menuManagementService.js` | B |
| `MenuContext.jsx` | E |
| `socketHandlers.js` (or equivalent) | E |
| `CategoryList.jsx` | E |

---

## Gate Plan

| Gate | Scope |
|------|-------|
| Gate 1 (Intake) | ✅ This document |
| Gate 2 (Impact Analysis) | Investigate all 5 sub-bugs, verify API shapes, identify root causes |
| Gate 3 (Implementation Plan) | Detailed fix plan per sub-bug |
| Gate 4 (Code-Gate) | Exact diffs |
| Gate 5 (Implementation + QA) | Fix + test all 5 |
| Gate 6 (Owner Smoke) | Owner verifies all 5 fixed |

---

*End of BUG-120 Intake — Gate 1 Complete. Next: Gate 2 (Impact Analysis).*
