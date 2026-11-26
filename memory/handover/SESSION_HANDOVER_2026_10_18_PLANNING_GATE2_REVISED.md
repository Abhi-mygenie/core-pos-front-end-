# Session Handover — 2026-10-18 — PLANNING Gate 2 REVISED: BUG-463 + CR-435

**Role:** PLANNING (Gate 2 re-done)
**Date:** 2026-10-18
**Code changed:** NO

---

## What Changed This Session

Owner confirmed BUG-463 is NOT about product `food_for` typo — it is about `assign_food_menu` (employee-level field from login API) being completely ignored by the FE.
Owner also asked for CR-435 impact analysis to be redone.
Both IAs revised and rewritten.

---

## BUG-463 — REVISED (assign_food_menu from API, not Local Settings)

**IA doc:** `/app/memory/impact/BUG-463_IMPACT_ANALYSIS.md`

**Root cause:** `assign_food_menu` in `COMMON_LOGIN` response is dropped in `authTransform.js` and never stored. Active menu type is device-wide via localStorage set manually by manager.

**Fix:** 2 files, 3 lines total:
- `authTransform.js` → add `assignFoodMenu: api.assign_food_menu || 'Normal'`
- `authService.js` → import `setActiveMenuType` + call it on every normal employee login

**NOT Fast Lane** (2 files). Needs Gate 3 plan.

**Owner decisions open:**
- OD-463-01: `assign_food_menu = null` → default to 'Normal'? (recommended: YES)
- OD-463-02: Local Settings picker overwritten on every login — is that acceptable? (recommended: YES — API always wins)
- OD-463-03: Product typo `"promational"` duplicate pill — fix separately or leave for backend data fix?

---

## CR-435 — REVISED (active state regression found)

**IA doc:** `/app/memory/impact/CR-435_IMPACT_ANALYSIS.md`

**New finding:** Removing children from the Inventory sidebar item causes a visual regression — the Inventory item loses its highlight when the user navigates to sub-pages (`/inventory-current-stock`, etc.) via InventoryTabBar.

**Two options presented:**
- **Option A** (8 line delta, Fast Lane): Remove children + add path. Accept that Inventory is only highlighted on `/inventory-dashboard`. Other sub-pages show no sidebar highlight.
- **Option B** (11 line delta, borderline Fast Lane): Same + 3-line guard in active detection. Inventory stays highlighted on ALL `/inventory-*` sub-pages.

**Owner decision open:**
- OD-435-01: Option A (accept gap) or Option B (fix active state)?

---

## Awaiting Owner

| Item | Decision needed |
|---|---|
| BUG-463 | OD-463-01, OD-463-02, OD-463-03 → then "Gate 3 GO" |
| CR-435 | OD-435-01 (A or B) → then "CR-435 Fast Lane GO" |
| BUG-354 | Still needs owner clarification: should Status badge use `deriveStatus` logic (Settled/Cancelled/Hold/Credit/Running) to match the filter dropdown? |
