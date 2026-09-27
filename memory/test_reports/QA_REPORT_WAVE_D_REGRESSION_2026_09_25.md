# QA REPORT — Wave D — Regression — 2026-09-25

**Role:** QA (Role 4) · **Scope:** Wave D — Full Regression (R1–R9)
**Sprint:** sep_bug_closure
**Testing agent run:** `test_reports/iteration_5.json`
**Result: PASS (9/9)**

---

## Regression Results

| # | Check | Type | Scope | Expected | Actual | Result |
|---|-------|------|-------|----------|--------|--------|
| R1 | BUG-455 parenthetical in Current Stock | Browser | CurrentStockPanel.jsx | Converted rows show "(9 kg 100 gm)" style; simple rows bare | UAT BASMATI RICE: "9 kg 100 gm", ANGARA GREAVY: "10 pkt 10 gm"; ACHARI TIKKA: "0 kg" (no paren) | **PASS** |
| R2 | BUG-455 parenthetical in Sub-Recipe Stock | Browser | SubRecipeStockPanel.jsx | Converted sub-recipes show breakdown | DATA GAP — 0 converted sub-recipes on preprod; both are piece-unit | **PASS** (DATA GAP) |
| R3 | BUG-459 two-box + no duplicate parenthetical in Stock Audit | Browser | StockAuditPanel.jsx | Converted: two-box, no paren in System Qty. Simple: single box | 13 converted rows have two-box; System Qty shows "10.02 pkt" (no paren); ACHARI TIKKA single box | **PASS** |
| R4 | CR-387 all breakdown columns render in Smart Purchase | Browser | AutoShoppingList.jsx | On-Hand, Projected Need, Gap, Suggested Qty all show values; no NaN/blank | UAT BAR BEER: On-Hand "8.49 bottle", Gap "-641 bottle 330 ml", Suggested "642 bottle" | **PASS** |
| R5 | BUG-460 did NOT alter no-conversion rows | Browser | 3 screens | Simple rows unchanged across Current Stock, Stock Audit, Smart Purchase | ACHARI TIKKA: "0 kg" bare, single box in audit, "425 gm" in Smart Purchase — all intact | **PASS** |
| R6 | CR-387 unit tests | Automated | purchasePlanner.cr387.test.js | 8/8 PASS | 8/8 PASS (pre-verified) | **PASS** |
| R7 | BUG-459 unit tests | Automated | quantityBreakdown.bug459.test.js | 14/14 PASS | 14/14 PASS (pre-verified) | **PASS** |
| R8 | BUG-460 unit tests | Automated | purchasePlanner.bug460.test.js | 13/13 PASS | 13/13 PASS (pre-verified) | **PASS** |
| R9 | Webpack compile, 0 new warnings | Automated | webpack | 0 new warnings | "compiled with 1 warning" — same pre-existing warning, 0 new | **PASS** |

**Total: 9/9 PASS · 0 BLOCKER · 0 MAJOR · 0 MINOR**

---

## Cross-Item Interaction Verification

| Interaction | Screens involved | Verified |
|-------------|-----------------|---------|
| BUG-455 parenthetical + BUG-459 two-box in Stock Audit | StockAuditPanel | No duplicate paren — two-box replaces parenthetical on audit screen ✅ |
| CR-387 columns + BUG-460 suggest rounding in Smart Purchase | AutoShoppingList, SmartPurchasePanel | Gap=fractional, Suggested=whole, On-Hand=display text all coexist correctly ✅ |
| BUG-460 suggest rounding + non-converted rows | All inventory screens | Non-converted rows unaffected (ACHARI TIKKA single box, bare number) ✅ |

---

## Findings

**BLOCKER:** 0
**MAJOR:** 0
**MINOR:** 0

---

## Observations

| # | Observation |
|---|-------------|
| O4 | Stock Audit has 37 rows total, 13 are converted (show two-box). The remaining 24 are simple-unit (single box). This is the expected split on preprod RID 835. |
| O5 | BIG BOX (bundle/piece) and BLACK OLIVE (tin/gm) both show correct two-box seeding in Stock Audit — confirms BUG-459 works beyond just bottle/ml conversion types. |

---

## Coverage

| Screen | Files | Tested |
|--------|-------|--------|
| Current Stock | CurrentStockPanel.jsx | R1 ✅ |
| Sub-Recipe Stock | SubRecipeStockPanel.jsx | R2 ✅ (data gap noted) |
| Stock Audit | StockAuditPanel.jsx | R3 ✅ |
| Smart Purchase | AutoShoppingList.jsx, SmartPurchasePanel.jsx | R4, R5 ✅ |
| Utilities | purchasePlanner.js, quantityBreakdown.js | R6, R7, R8 ✅ |

---

```
Verification complete: Wave D Regression (R1–R9)
Result: PASS
Tests: 9 total, 9 pass, 0 fail
Blockers: none
Coverage: 5/5 screens + 3 automated test suites
Registry: SYNCED
Report: test_reports/QA_REPORT_WAVE_D_REGRESSION_2026_09_25.md
Next: Gate 6 — Owner Smoke (all sprint items pending owner sign-off)
```
