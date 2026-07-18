# QA Report — CR-072 + BUG-197 + BUG-196 (Inventory Module)

**Date:** 2026-07-17
**Agent Role:** QA
**Sprint:** POS 5.0
**Risk:** HIGH
**Credentials:** cafe103, 18March

---

## Summary

**CR-072:** 7/8 READ endpoints PASS. 1 FAIL (vendor-list 404 — BACKEND_BUG).
**BUG-197:** 4/6 write tests PASS. 2 INCONCLUSIVE (store-recipe duplicate + vendor verify blocked).
**BUG-196:** 6/6 sidebar pages PASS. Screenshot confirmed.

**Overall: PARTIAL PASS — 1 BLOCKER + 1 MAJOR (both backend). 0 FE code bugs.**

---

## CR-072: Read Endpoints

| # | Test | Result | Severity |
|---|------|--------|----------|
| T-CR1 | GET stock-inventory | **PASS** — 51 items | — |
| T-CR2 | GET recipe list | **PASS** — 175 recipes | — |
| T-CR3 | GET sub-recipe list | **PASS** — 0 (no data) | — |
| T-CR4 | GET addon-recipe list | **PASS** — 7 (18March) | — |
| T-CR5 | GET vendor list | **FAIL** — HTTP 404 | **BLOCKER** |
| T-CR6 | GET vendor types | **PASS** — 5 types | — |
| T-CR7 | GET wastage reasons | **PASS** — 4 reasons | — |
| T-CR8 | GET inventory categories | **PASS** — 7 categories | — |

## BUG-197: Write Endpoints

| # | Test | Result | Severity |
|---|------|--------|----------|
| T1 | Store standard recipe | **INCONCLUSIVE** — "already exists" | NOTE |
| T2 | Update standard recipe (PUT) | **PASS** — "Recipe updated successfully" | — |
| T6 | Update addon recipe (PUT) | **PASS** — "Add-on recipe updated" | — |
| T7 | Vendor add | **INCONCLUSIVE** — data returned, list 404 | NOTE |
| T8 | Wastage add | **PASS** — "added successfully" | — |
| T10 | Recipe list read | **PASS** — 175 recipes | — |
| T-FID | food_id in recipe response | **FAIL** — 0/175 have food_id | **MAJOR** |

## BUG-196: Sidebar

| Page | Result |
|------|--------|
| InventoryDashboardPage | **PASS** ✅ (screenshot) |
| InventorySetupPage | **PASS** ✅ |
| PhysicalCountPage | **PASS** ✅ |
| PurchaseEntryPage | **PASS** ✅ |
| RecipeManagementPage | **PASS** ✅ |
| EmployeeManagementPage | **PASS** ✅ |

---

## Issues

| # | Severity | Issue | Classification |
|---|----------|-------|---------------|
| 1 | **BLOCKER** | `/inventory/vendor-list` returns 404 — no vendor list endpoint on backend | BACKEND_BUG |
| 2 | **MAJOR** | `food_id` not in GET /get-recipe response — edit mode dropdown broken | BACKEND_GAP |
| 3 | NOTE | Store recipe "already exists" for unlisted foods — soft-delete/cache | BACKEND_QUIRK |
| 4 | NOTE | FE has no getVendorList() — needs backend endpoint first | CODE_GAP |

---

## Registry: SYNCED ✅
Coverage: 8/8 files tested
Evidence: /app/memory/evidence/QA_CR072_BUG197_BUG196/
