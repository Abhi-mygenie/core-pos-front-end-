# BUG-371 INTAKE — Bulk Editor: Variation Price Not Editable
**Date:** 2026-09-01 | **Priority:** P2 | **Risk:** MEDIUM | **Severity:** MAJOR | **Status:** INTAKE

## Description
In Normal Menu Management → Bulk Edit, the Variations column shows the variation count as a chip (expandable) but the individual variation prices cannot be edited. Users expect to be able to update variation prices in bulk without opening each product individually.

## Code Reality: NONE
`BulkEditor.jsx`:
- Line 29: `{ key: "variations", label: "Variations", type: "var_expand", width: 110, tier: 1 }` — column renders chips + expand
- Line 375: `variations: () => false` — explicitly marked read-only in the isDirty map
- Expand panel (line 1075): shows variation count chip, no price input field

No variation price input exists anywhere in BulkEditor.

## Related: CR-145 (added variation column for display/expand — editing explicitly deferred)
## Duplicate Check: DISTINCT from GAP-BULK-DEFAULTS (column visibility only)

## Owner Decision — OD-1 RESOLVED (2026-09-01)
**Option A: Inline editing** — price input per variation row directly in the expand panel. Edit inline, save as part of normal bulk save.

## Fix Scope (updated)
- `BulkEditor.jsx` — add price input cells in variation expand panel; update `isDirty` map to include variation price changes
- `menuManagementTransform.js` — include updated variation prices in save payload
- No modal needed.

## Blast Radius: MEDIUM (BulkEditor.jsx + menuManagementTransform.js save payload)
## Planning Skip: NO — new UI needed
## Next: Gate 2 Impact Analysis after owner answers UX question
