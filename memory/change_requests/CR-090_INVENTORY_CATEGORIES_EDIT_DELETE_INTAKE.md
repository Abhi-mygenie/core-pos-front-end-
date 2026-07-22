# CR-090 — Inventory Categories: Edit & Delete

**ID:** CR-090
**Type:** CR
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** MEDIUM
**Module:** Inventory — Ingredients Setup (InventorySetupPanel — Category sidebar)
**Duplicate Check:** RELATED to BUG-220 (No Duplicate Alert — handled as bug, same category sidebar). DISTINCT: CR-090 is the Add/Edit/Delete capability; BUG-220 is the duplicate-check fix.
**Code Reality:** NONE — `InventorySetupPanel.jsx:186-210` category list has only click-to-filter behavior, no Edit or Delete buttons.
**Source:** OWNER-REQUESTED (session 2026-07-22)
**Confidence:** CONFIRMED (feature gap verified)

---

## Description

The Ingredient Category sidebar currently supports only:
- **Add**: new category via input + button
- **Filter**: click a category to filter ingredients

It lacks:
- **Edit**: rename an existing category (inline edit or modal)
- **Delete**: remove an empty category (should block if ingredients are assigned)

### Expected Behavior
- Edit: click pencil icon on category row → inline input → Save/Cancel (same pattern as vendor/ingredient edit rows)
- Delete: click trash icon → check if any ingredients use this category → if yes, block with count ("X ingredients use this category"); if empty, confirm + delete

---

## Evidence

- Code: `InventorySetupPanel.jsx:186-210` — category sidebar JSX, no edit/delete controls
- Backend: need to check `PUT /category/{id}` and `DELETE /category/{id}` endpoints exist
- Pattern: inline edit row pattern already used in ingredient and vendor rows

---

## Blast Radius

- 2 files: `InventorySetupPanel.jsx`, `inventoryService.js`
- Possibly `constants.js` if category update/delete endpoints not registered
- ~40-50 lines change
- Scope: MEDIUM

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Curl-verify: `PUT /api/v2/vendoremployee/inventory/category/{id}` and `DELETE /api/v2/.../category/{id}` exist?
2. Add `editCategoryId`, `editCatName` state to `InventorySetupPanel`
3. Category sidebar: add Pencil + Trash icons per row
4. Edit flow: inline input, Save/Cancel (existing pattern)
5. Delete flow: check ingredient count for category, block if > 0, confirm modal if 0

---

## Next
Planning Gate 2 → Gate 3 → Implementation
