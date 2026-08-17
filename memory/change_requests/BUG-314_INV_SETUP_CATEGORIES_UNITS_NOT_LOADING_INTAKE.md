# BUG-314 — Intake: Inventory Setup — Categories & Units Dropdowns Not Loading

**Date:** 2026-08-13  
**Source:** OWNER-REPORTED + AGENT-INVESTIGATED  
**Confidence:** CONFIRMED (curl-verified)  
**Duplicate check:** DISTINCT (no prior registration for this exact failure mode)  
**Related:** BUG-212 (Ingredients Edit) — same panel, different issue

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | **P1 — HIGH** (Add ingredient flow completely broken — no workaround) |
| Risk | **MEDIUM** (non-financial, but core inventory data entry blocked) |
| Fast Lane eligible | NO (Promise.allSettled change touches data loading architecture) |

---

## Description

On the Inventory Setup page (`/inventory-setup`), when a restaurant has no ingredients yet registered in the system:
1. `get-inventory-master` returns **HTTP 404** instead of 200 + empty array
2. `Promise.all([getIngredients(), getCategories(), getUnits()])` rejects atomically
3. Categories sidebar shows **CATEGORIES (0)** — even existing categories (e.g. "body parts") don't appear
4. Unit dropdown shows only **"Unit..."** placeholder — no actual units selectable
5. User cannot add any ingredient (validation fires: "Name, category, and unit are required")

---

## Evidence

- **Screenshot 1:** Network tab — `get-inventory-master` = 404, `stock-item-categories` = 200, UI shows "CATEGORIES (0)"  
- **Screenshot 2:** Add ingredient row — Unit dropdown shows "L" (truncated "Unit...") with red error badge  
- **Curl results saved:** `/app/memory/evidence/BUG-INV-DROPDOWN/`  
  - cats.txt: 1 category returned (id=1746, "body parts") — API works, FE never shows it  
  - units.txt: 17 units returned — API works, FE never shows them  
  - inv_master.txt: 0 items, no success key — confirms 404  
- **Steps to reproduce:** Login as owner@thegoankitchen.com → navigate to `/inventory-setup` → observe CATEGORIES (0) and empty unit dropdown

---

## Root Cause

`InventorySetupPanel.jsx:42` — `Promise.all` atomic rejection when `getIngredients()` throws (404).  
Investigation report: `/app/memory/BUG-314_INV_SETUP_DROPDOWN_INVESTIGATION_REPORT.md`

---

## Blast Radius

- 1 file (`InventorySetupPanel.jsx`, `fetchData()` function)
- Hotspot files touched: NO
- Estimated scope: SMALL
- Impact: Any restaurant with 0 ingredients registered cannot add their first ingredient

---

## Fix Summary (for Planning)

Replace `Promise.all` → `Promise.allSettled` with individual result handling. ~10 lines in `fetchData()`.  
Backend brief needed separately: `get-inventory-master` should return 200 + empty array, not 404.

---

## Owner Decisions Needed

None — fix approach is clear. Planning skip eligible with owner approval.
