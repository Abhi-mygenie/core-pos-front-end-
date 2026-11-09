# BUG-598 — Intake (Gate 1)
## assign_food_menu lost between login and MenuContext

**ID:** BUG-598
**Type:** BUG
**Date:** 2026-10-21
**Sprint:** nov_cr_batch
**Area:** Menu / Order Entry
**Priority:** P1
**Risk:** HIGH — affects product visibility for all multi-menu restaurants
**Fast Lane eligible:** NO (touches AuthContext + MenuContext + login flow)
**Source:** OWNER-REPORTED + INVESTIGATION (same session)

---

## 1. Code Reality Check
**NONE.** `grep -rn "assignFoodMenu" src/` → 1 hit (authTransform.js:25 — the mapping). Nobody reads it.

## 2. Duplicate Check
**DISTINCT.** Related: BUG-463 (removed localStorage menu picker), CR-376 (added activeMenuProducts filtering).

## 3. Root Cause
`authTransform.js:25` maps `assign_food_menu` → `assignFoodMenu`. But:
- `authService.js` never stores it
- `AuthContext.jsx` has no field for it
- `LoginPage.jsx` discards it after login
- `MenuContext.jsx:102` derives `activeMenuType` from the first product's `food_for` instead

When backend returns mixed menu products (production without assign_food_menu feature), the first product's food_for drives the chip — random, hides the other menu.

## 4. Evidence
- curl: `common-login` returns `assign_food_menu: "Normal"` for owner@palmhouse.com
- curl: `get-products-list` returns 313 products, all `food_for: Normal` (preprod)
- Owner screenshot: production shows "Premium Menu" chip for same account
- Code trace: `assignFoodMenu` referenced only in transform, never consumed
- Investigation report: `evidence/BUG-598/BUG-598_INVESTIGATION_REPORT_2026_10_21.md`

## 5. Blast Radius
- `authService.js` — store assignFoodMenu
- `AuthContext.jsx` — add field + expose
- `MenuContext.jsx` — read from auth instead of deriving from products
- Possibly `LoginPage.jsx` if auth flow changes
- Estimated: 4 files, ~15 lines, no R5 hotspots

## 6. Owner Decisions
- OD-598-01: LOCKED — `assign_food_menu` is the source of truth; default to `'Normal'` when missing
- No open decisions

## 7. Next
Planning Gate 2 → Impact Analysis + Implementation Plan.
