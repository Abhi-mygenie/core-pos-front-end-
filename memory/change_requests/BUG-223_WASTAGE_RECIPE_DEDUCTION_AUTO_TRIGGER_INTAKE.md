# BUG-223 — Wastage & Recipe Deduction Auto-Trigger Without Explicit Save

**ID:** BUG-223
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** HIGH
**Module:** Inventory — Recipe Management + Wastage (RecipeFormPanel, InventorySetupPanel)
**Duplicate Check:** NONE — fresh issue, not addressed in prior sessions.
**Code Reality:** NEEDS INVESTIGATION — could not confirm auto-trigger from static grep alone. The wastage and recipe deduction flow involves multiple API calls. Root cause unclear without full trace of save → deduction chain.
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** REPORTED (deduction trigger not code-verified this session — requires runtime trace)

---

## Description

Owner reports that **stock deductions happen automatically** when a Recipe or Wastage entry is saved — without any separate explicit confirmation step.

Expected behavior: saving a recipe definition should NOT deduct stock. Stock deduction should only happen when a **consumption event** is recorded explicitly (e.g., end-of-day production entry or manual wastage record). Saving the recipe template itself is a setup action, not a consumption action.

Possible causes:
- The recipe save endpoint triggers server-side stock deduction
- The wastage save endpoint immediately deducts stock without requiring a date/quantity confirmation
- A secondary useEffect or onChange fires a deduction call on form state change (auto-save)

---

## Evidence

- Owner-reported: "wastage & recipe deduction auto-trigger without explicit save"
- Code: `RecipeFormPanel.jsx` — no auto-save useEffect found in grep; but full save chain (recipeService.storeRecipe) not traced to backend behavior
- Code: `InventorySetupPanel.jsx` — wastage `addReason()` (line 617) calls `inventoryService.addWastageReason()` — needs investigation: does adding a reason also log a deduction?
- Backend trace required: does `POST /recipe/store-recipe` also fire `POST /consumption`?

---

## Blast Radius

- Potentially: `RecipeFormPanel.jsx`, `InventorySetupPanel.jsx`, `recipeService.js`, `inventoryService.js`
- If backend-side: backend API brief needed
- Scope: UNKNOWN until traced — HIGH risk if confirmed

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Curl-verify: `POST /api/v2/vendoremployee/recipe/store-recipe` — inspect response for any `stock_deducted` flag or side effect
2. Curl-verify: `POST /api/v2/vendoremployee/inventory/add-wastage-reason` — does it deduct stock?
3. If auto-deduction confirmed: separate the "save recipe template" and "record consumption" flows
4. If frontend trigger: remove any onChange/useEffect that fires a deduction call
5. Add explicit "Record Consumption" / "Log Wastage" buttons separate from Save

---

## Next
Planning Gate 2 → Gate 3 → Implementation
