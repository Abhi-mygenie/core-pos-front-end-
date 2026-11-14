# QA Handover — BUG-540
**Date:** 2026-10-12
**Item:** BUG-540 — P&L Report: Expenses column wrong value + KPI card wrong label/value
**From:** IMPLEMENTATION agent
**To:** QA agent (Role 4)

---

## 1. Inherited from Plan (Verification Matrix — self-test results)

| Edit | File | Verification | Self-Test |
|------|------|-------------|:---:|
| E1 — +totalExpensesCombined L91 | PLReportPage.jsx | `summary.totalExpensesCombined` key present in useMemo | ✅ PASS |
| E2 — r.expenses L116 | PLReportPage.jsx | tableRows reads `r.expenses` not `r.total_expenses` | ✅ PASS |
| E3 — KPI label+value L225 | PLReportPage.jsx | label="Total Expenses and Purchases", value=totalExpensesCombined | ✅ PASS |
| PRESERVE — L103 chartData | PLReportPage.jsx | `r.total_expenses` unchanged (OD-540-01=B) | ✅ PASS |
| PRESERVE — L304 tfoot | PLReportPage.jsx | `summary.totalExpenses` unchanged (pure expenses sum) | ✅ PASS |
| PRESERVE — L141 pieData | PLReportPage.jsx | `summary.totalExpenses` unchanged (pie Expenses slice) | ✅ PASS |
| Compile | — | `yarn build` exit 0, 0 new warnings | ✅ PASS |

Self-test: **7/7 PASS**

---

## 2. Test Cases for QA Execution

Navigate to `/reports-module/profit-loss` on preprod. Use any date range that returns data with both expenses and purchases (e.g. 30D preset).

| # | Test | Steps | Expected | Severity if fail |
|---|------|-------|----------|:---:|
| TC-1 | KPI card label | Load P&L page → inspect 3rd KPI card (red, Receipt icon) | Label reads **"Total Expenses and Purchases"** (not "Total Expenses") | MAJOR |
| TC-2 | KPI card value = combined | Note KPI card value | Value ≥ any single Expenses column row (it is a combined figure) | MAJOR |
| TC-3 | Table Expenses column = pure expenses | Inspect data rows — compare Expenses and Purchase columns | Expenses column value < (Expenses + Purchase) for same row where both > 0 | MAJOR |
| TC-4 | tfoot Expenses unchanged | Inspect TOTAL footer row | Expenses footer = sum of Expenses column (pure expenses, not combined) | BLOCKER |
| TC-5 | pieData unchanged | Inspect Cost Breakdown pie chart | Pie shows two slices: "Expenses" and "Purchase" independently (no change) | MINOR |
| TC-6 | Bar chart unchanged (OD-540-01=B) | Inspect Revenue vs Expenses bar chart | "Expenses" bar still renders (combined value intentionally kept per OD-540-01=B) | MINOR |
| TC-7 | No regression on other KPI cards | Check all 4 KPI cards | "Total Sales", "Paid Revenue", "Net P&L" unchanged in label and value | MAJOR |
| TC-8 | PDF export | Click PDF button → print preview | Table columns appear correctly; Expenses column shows pure values | MINOR |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | BUG-539 not regressed — P&L header still renders (no JS error) | BUG-539 also touches PLReportPage.jsx at L175+L264; verify page loads without error |
| R2 | No cross-report impact — open any other report page (Expense Report, Settlement Report) | BUG-540 is PLReportPage.jsx only; other pages must be unaffected |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-540
Status: GATE_5A_IMPLEMENTED
Sprint: oct_cr_batch
EXIT GATE: ALL 5 PASSED
  □1 registry.json: GATE_5A_IMPLEMENTED ✅
  □2 BUG_TRACKER.md: row updated ✅
  □3 FILE_OWNERSHIP.md: PLReportPage.jsx BUG-540 row added ✅
  □4 Code markers: // BUG-540 × 3 in PLReportPage.jsx ✅
  □5 yarn build exit 0, 0 new warnings ✅
```

---

## 5. Credentials + Environment

- **Account:** owner@thegoankitchen.com / Qplazm@10 (RID 69, The Goan Kitchen)
- **URL:** https://genie-core-pos.preview.emergentagent.com
- **Route to test:** `/reports-module/profit-loss`
- **External backend:** https://preprod.mygenie.online
- **Note:** Test requires a date range with both expense and purchase data. Use 30D preset for best coverage.
