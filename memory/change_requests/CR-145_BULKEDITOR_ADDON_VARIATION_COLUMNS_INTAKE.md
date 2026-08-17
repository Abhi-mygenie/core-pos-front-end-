# CR-145 — BulkEditor: Addon & Variation Columns + Row Expand / Quick Edit

**ID:** CR-145
**Type:** Change Request (new feature)
**Date:** 2026-08-14
**Sprint:** pos_5_1
**Status:** INTAKE COMPLETE — DESIGN REVIEW REQUIRED BEFORE GATE 2
**Gate:** 1 ✅

---

## Classification

| Field | Value |
|---|---|
| Priority | **P2** |
| Risk | **HIGH** |
| Blast Radius | **LARGE** — BulkEditor.jsx is 1100+ lines; nested data pattern breaks current flat-cell architecture |
| Fast Lane Eligible | NO — significant architectural change to BulkEditor |
| Duplicate Check | **DISTINCT** — No existing CR touches BulkEditor addon/variation display |
| Related | CR-036 (original BulkEditor), CR-140 (added Swiggy/Zomato/Brand columns) |
| Code Reality | **NONE** — no addon/variation column exists in BulkEditor |
| Source | OWNER-DIRECTED |
| ⚠ Design Note | Owner stated: "need to look at possibility with design agent" — **Gate 2 must be preceded by a design feasibility study** |

---

## Problem Statement

The BulkEditor currently has **no way to view or edit addons or variations** attached to foods. Users editing 97 items in bulk (as seen in screenshot) cannot:
- See which addons are attached to each food item
- Add/remove addons from foods in bulk
- See which variation groups + option values exist per food
- Edit variation names/options/prices in bulk

**Current BulkEditor column tiers:**
- Tier 1 (default visible): Name, Category, Price, Status, Type, Tax Type, Tax%, Sold By (Unit), Description, Packaged Item, Inventory
- Tier 2: Discount, Give Discount, Live Web, Dine-in, Delivery, Takeaway, Complementary, Out of Stock, Hidden, Tax Calc
- Tier 3: Prep Time, Serve Time, Pack Charges, Takeaway Charge, Delivery Charge, Avail. Start/End, Item Code, Sort Order
- Tier 4: Allergens, Kcal, Portion Size

**None of these tiers include addons or variations** because both are nested arrays — not simple flat values. This is an architectural challenge.

---

## Feature Description

### Feature A: Addon Column (summary + expand)

A new Tier 2 column "Add-ons" showing:
- Cell: addon count chip (e.g., "3 addons" or "None")
- Expand/Quick Edit: clicking the cell or an expand icon opens an **inline sub-panel** below the row showing:
  - Checkbox list of all available addons (from restaurant addon pool)
  - Pre-checked: addons already assigned to this food
  - User can check/uncheck to add/remove
  - "Apply" button saves the addon_ids change via `editFood()`

### Feature B: Variation Column (summary + expand)

A new Tier 2 column "Variations" showing:
- Cell: variation group count (e.g., "2 groups" or "None")
- Expand/Quick Edit: clicking opens an **inline sub-panel** showing:
  - Existing variation groups (name, type, options)
  - Ability to add a new option value to existing group
  - **Scope limit:** Add/remove full variation groups NOT in scope (too complex for bulk) — only adding options to existing groups or removing options

---

## Technical Challenges (requires design feasibility study)

| Challenge | Description |
|-----------|-------------|
| Flat vs Nested | Current BulkEditor cells = single scalar values. Addons/Variations = arrays. CellRenderer pattern doesn't support this. |
| Row expand pattern | No existing row-expand mechanism in BulkEditor. Would need a new `expandedRowId` state + sub-row render. |
| Column width | Addon/Variation column would be non-sortable, non-filterable — different from existing columns. |
| Dirty tracking | Current `isDirty(row, field)` uses scalar comparison. Arrays need deep comparison. |
| Save path | Currently `buildPayload(row)` + `editFood(id, payload)`. Addon changes need `addon_ids[]` included. This is already in `toAPI.foodInfo()` but never passed via BulkEditor. |
| Variation save | Variations are sent as `variations[]` in `toAPI.foodInfo()`. BulkEditor currently doesn't include variations in its save payload. |

---

## Design Study Required (owner directed)

Before Gate 2 (Impact Analysis), a **design agent feasibility study** must answer:

| Question | Options |
|----------|---------|
| How to show addons in a table cell? | A) Count chip "3 add-ons" that expands below; B) Tag pills visible in cell (truncated) |
| Row expand pattern | A) Sub-row appears between rows; B) Side drawer slides from right; C) Inline modal |
| Variation display | A) Show only group count; B) Show group names in cell |
| Edit depth | A) Assign/unassign addons only; B) Also edit variation options; C) Full variation CRUD |
| Performance | Fetching addon list for 97+ rows — one fetch on BulkEditor mount? |

---

## Proposed Scope (minimal viable, pending design study)

**In scope:**
- New "Add-ons" Tier 2 column showing addon count chip
- Click to expand row → addon checkbox panel (add/remove)
- New "Variations" Tier 3 column showing variation group count
- Click to expand row → read-only variation summary (names + values)
- Save: includes `addon_ids` in editFood payload when changed

**Out of scope (defer):**
- Full variation editing in BulkEditor (use Full Edit / ProductForm for that)
- Adding new addons from BulkEditor (use AddonManagementPanel, CR-144)
- Adding/removing variation groups

---

## Files WILL Change (estimated)

| # | File | Action | Change |
|---|------|--------|--------|
| 1 | `components/panels/menu/BulkEditor.jsx` | EDIT | +expand state, +addon/variation columns, +CellRenderer expand pattern, +isDirty for arrays, +buildPayload addon_ids |
| 2 | `api/transforms/menuManagementTransform.js` | EDIT | `fromAPI.food()` already maps addOns[] + variations[]. Verify buildRow captures them. |
| 3 | `components/panels/menu/AddonExpandPanel.jsx` | NEW | Checkbox list of addons for a food row |
| 4 | `components/panels/menu/VariationExpandPanel.jsx` | NEW | Read-only variation summary for a food row |

## Files WILL NOT Touch
`ProductForm.jsx`, `ProductCard.jsx`, `ProductList.jsx`, all R5 hotspots

---

## Open Questions (for design study)
| # | Question |
|---|----------|
| OQ-1 | Expand pattern: sub-row (simpler) vs side drawer (richer)? |
| OQ-2 | When expanded, should other rows be hidden/dimmed? |
| OQ-3 | Variation column: read-only summary only, or allow option-level edits? |
| OQ-4 | Performance: addon list is small (<50 typically) — safe to fetch once on BulkEditor mount? |
| OQ-5 | Dirty state with arrays: use JSON.stringify comparison or shallow check on addon_ids? |

---

## Next Steps
1. **Design agent study** — produce wireframes for expand pattern before Gate 2
2. Owner approves design approach (OQ-1 to OQ-5)
3. Gate 2: Impact Analysis (can proceed once design is approved)
