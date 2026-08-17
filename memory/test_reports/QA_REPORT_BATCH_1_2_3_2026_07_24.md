# QA Report — Batch 1 + 2 + 3 (17 Items)

**Date:** 2026-07-24
**Agent:** QA (AGENT_PROMPT_ALPHA v0.7, Role 4)
**Scope:** 17 IMPLEMENTED items across Inventory, Recipe, Reports, Settlement modules
**Method:** Live UI browser automation (testing_agent_v3) + code review
**Credentials:** owner@kunafamahal.com / *** (R689, Kunafa Mahal — 106 ingredients, 71 categories, 92 std + 7 sub + 1 addon recipes)
**Environment:** https://90bdc789-656c-4fa8-9eb4-be8c69d6df73.preview.emergentagent.com
**Backend:** https://preprod.mygenie.online

---

## Summary

| Batch | Items | Tests | Result |
|-------|:-----:|:-----:|:------:|
| Batch 1 — Recipe/Ingredient Fixes | 7 | 7 | **7/7 PASS** |
| Batch 2 — Inventory Data/Transforms | 5 | 5 | **5/5 PASS** |
| Batch 3 — New Screens + Features | 5 | 5 | **5/5 PASS** |
| **Total** | **17** | **17** | **17/17 PASS** |

**Blockers: NONE**
**Failures: NONE**

---

## Batch 1: Recipe/Ingredient Fixes (iteration_3.json)

| # | ID | Title | Severity | Result | Evidence |
|---|-----|-------|----------|:------:|---------|
| 1 | BUG-214 | Addon Recipe Dropdown source | HIGH | **PASS** | Addon tab dropdown shows 10 addon items with prices, NOT menu foods |
| 2 | BUG-215 | Recipe form inline validation | MEDIUM | **PASS** | 4 inline red errors on blank form save (name, foodId, unit, ingredients) |
| 3 | BUG-216 | Ingredient smallUnit autofill | HIGH | **PASS** | Dropdown shows "Name (gm)" format, auto-populates Unit on select |
| 4 | BUG-217 | Sub-Recipe Unit required | MEDIUM | **PASS** | Red asterisk on Unit label, "Unit is required" error on blank save |
| 5 | BUG-218 | Delete Ingredient blocking Dialog | LOW | **PASS (code)** | Dialog markup + handler wired. 0 recipes prevents live test of block path |
| 6 | BUG-219 | Min Unit Alert as dropdown | HIGH | **PASS** | SELECT element with 16 unit options, not number input. No data corruption |
| 7 | BUG-220 | Category duplicate pre-check | LOW | **PASS** | "Dairy" blocked before API call, 0 network requests, toast shown |

## Batch 2: Inventory Data/Transforms (iteration_4.json)

| # | ID | Title | Severity | Result | Evidence |
|---|-----|-------|----------|:------:|---------|
| 8 | BUG-226 | Conversion Factor in payload | LOW | **PASS** | Form fields present (add+edit), transform sends `converion_factor` (R9 typo) |
| 9 | BUG-223 | Wastage preview badge | LOW | **PASS** | Amber banner + drift badge "-3.60 kg preview" appears on physical count entry |
| 10 | BUG-224 | Smart Purchase all ingredients | HIGH | **PASS** | 45 items: 20 "out of stock" + 25 "Low stock" (B2 Rule 2 origin=stock_alert) |
| 11 | BUG-227 | Vendor column populated | HIGH | **PASS** | Searchable combobox with 13 vendors incl. System Vendor + 7 master vendors |
| 12 | BUG-232 | By Ingredient loading race | LOW | **PASS** | Spinner shows during load, combobox populates after. Fast tab switch: no empty state |

## Batch 3: New Screens + Features (iteration_5.json)

| # | ID | Title | Severity | Result | Evidence |
|---|-----|-------|----------|:------:|---------|
| 13 | CR-094 | P&L Report | MEDIUM | **PASS** | 4-card KPI strip, date picker, sortable table, PDF export, bar+pie charts (gated by data) |
| 14 | CR-088 | By Ingredient tab | LOW | **PASS** | 106 ingredients in combobox, selecting shows recipes + quantities, filter pills work |
| 15 | CR-092 | Recipe sort controls | LOW | **PASS** | Sort dropdown (Name A-Z/Z-A, Cost High/Low, Most Ingredients), re-orders correctly |
| 16 | CR-093 | Consumption Report | LOW | **PASS** | 63 ingredients, 2136 entries, 11 categories. Drill-down, Excel+PDF export, filters |
| 17 | CR-095 | Waiter-to-Waiter Transfer | LOW | **PASS (code+UI)** | Transfer modal fully implemented. No active waiters on test day prevents live submit |

---

## Notes (non-blocking)

| # | Finding | Severity |
|---|---------|----------|
| N-1 | CR-094 route is `/reports-module/profit-loss` (not `/pl-report` as some docs state) — consistent in Sidebar + App.js | **NOTE** |
| N-2 | CR-088 data-testid is `recipe-tab-byingredient-trigger` (no dash) vs spec `recipe-tab-by-ingredient-trigger` | **NOTE** |
| N-3 | CR-095 accessed via `/day-closure` sidebar item, not Dashboard slide-over as some docs state | **NOTE** |
| N-4 | BUG-218 delete-blocker-dialog could not be live-tested (0 recipes using ingredients at test time) — code-verified | **NOTE** |
| N-5 | CR-095 transfer-btn not clickable (0 active waiters with balance on test day) — code-verified complete | **NOTE** |

---

## Coverage

- 17/17 items have code markers verified
- 14/17 fully live-UI tested
- 3/17 code-verified + partial UI (data preconditions not met in test tenant)

## Registry

- All 17 items updated: IMPLEMENTED → **QA PASS (2026-07-24)**
- Gate: 0-5b
- No registry drift detected

## Next

- All 17 items ready for **Gate 6 (Owner Smoke)**
- Combined with 15 previously QA-passed items = **32 items total awaiting Owner Smoke**
- After Owner Smoke → **Regression (R1 intra-module → R2 inter-module → R3 meta)**
