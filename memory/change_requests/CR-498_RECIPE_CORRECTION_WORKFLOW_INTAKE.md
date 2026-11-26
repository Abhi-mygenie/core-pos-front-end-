# CR-498 — Recipe Correction Workflow

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (inventory accuracy: incorrect recipes lead to wrong stock deductions)
**Risk:** HIGH (touches inventory, recipe management, stock calculations)
**Process required:** Full gate flow + regression. FAST LANE eligible? **NO**
**Sprint:** TBD

---

## Description

A workflow for correcting recipes after they have been set up and are in use. When a recipe has wrong ingredient quantities or wrong ingredients, the correction should:
1. Allow editing the recipe (ingredients + quantities)
2. Track what was changed (before vs after)
3. Optionally trigger a stock reconciliation/adjustment for past orders affected by the incorrect recipe

**Expected behavior:**
- Navigate to recipe management → select recipe → edit ingredients/quantities
- System shows "before" and "after" comparison
- Option to apply correction retroactively or only for future orders
- Change logged for audit trail

**Current behavior:** Recipe editing exists in `RecipeBulkEditor` and `RecipeManagementPanel`, but there is no formal "correction" workflow with before/after tracking or retroactive adjustment capability.

---

## Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** N/A (new workflow)
- **Confidence:** N/A

---

## Code Reality Check

**Code reality: PARTIAL** — Recipe CRUD exists (`recipeService.js`, `RecipeBulkEditor.jsx`, `RecipeManagementPanel.jsx`). Recipe editing is functional. But no "correction" workflow with change tracking, before/after comparison, or retroactive stock adjustment.

---

## Duplicate Check

**RELATED** to:
- CR-473 (Recipe Mapping by Menu Master — INTAKE): recipe setup, not correction
- BUG-457 (Addon Recipe Delete Reason — GATE_5A): delete flow, not edit correction
- BUG-459 (Stock Audit Physical Qty Mismatch — GATE_5A): stock audit, downstream effect

**Verdict: DISTINCT** — no existing item covers a recipe correction workflow.

---

## Blast Radius

- Recipe service: `recipeService.js`
- Recipe UI: `RecipeBulkEditor.jsx`, `RecipeManagementPanel.jsx`
- Possibly new comparison component
- Inventory transforms if retroactive adjustment is needed
- Estimated scope: LARGE (4+ files, ~100+ lines for comparison UI + tracking)

---

## Open Questions

- **OD-498-01:** Should recipe corrections be logged with a reason (similar to stock audit adjustments)?
- **OD-498-02:** Should there be a "before vs after" comparison view, or just allow direct editing?
- **OD-498-03:** Should corrections trigger retroactive stock adjustments for past orders?
- **OD-498-04:** BACKEND DEPENDENCY — Does the backend support recipe versioning or change tracking?
