# QA REPORT — Wave B: BUG-458
**Date:** 2026-09-25 · **Role 4 QA** · **Sprint:** sep_bug_closure
**Source:** testing_agent iteration_3 (`/app/test_reports/iteration_3.json`)
**Credentials:** QA_INV (owner@yabyum.com, preprod RID 835)
**Mutation policy:** READ-ONLY — no Update Stock / Save clicked. Only client-side Add-to-list.

---

## Results Summary

| Bug | Cases | PASS | FAIL | Verdict |
|-----|:-----:|:----:|:----:|---------|
| BUG-458 | 3 | 3 | 0 | **PASS** |
| **Total** | **3** | **3** | **0** | **0 BLOCKER · 0 MAJOR · 0 MINOR** |

---

## Detail

| # | Test | Result | Evidence |
|---|------|--------|----------|
| T458-1 | Purchase list vendor column shows real name | **PASS** | All 13 rows: "System Vendor · ₹0" or "UAT Biryani Supplier". Zero "(unnamed)" anywhere on page. |
| T458-2 | Vendor dropdown options show real names | **PASS** | Dropdown: "System Vendor Recommended (system) ₹0" + "UAT Biryani Supplier" with real rate ₹0.00125 for UAT VIS SPICE PKT. No "(unnamed)" in any dropdown. |
| T458-EXTRA | "suggest:" hint text renders correctly | **PASS** | All 13 rows: "suggest: 642 bottle" (converted), "suggest: 8 box", "suggest: 11 pkt" (simple). Multi-unit breakdown correct. |

---

## Findings

None. Zero issues found.

## Bonus Observation

The T458-EXTRA test also confirmed that **BUG-460**'s `ceilToDisplayUnit` fix is rendering correctly in the suggest hints — "suggest: 642 bottle" (was "641 bottle 330 ml" before the fix). This is a positive cross-validation of Wave C before it formally runs.

## Coverage

| File | Exercised by |
|------|-------------|
| vendorRanking.js | T458-1, T458-2 ✅ |
| AutoShoppingList.jsx | T458-1, T458-2, T458-EXTRA ✅ |
| SmartPurchasePanel.jsx | T458-EXTRA (screen load) ✅ |
| **Coverage: 3/3 relevant files** | |

## Registry Spot-Check

```
BUG-458: GATE_5B_QA_PASS, sprint_key=sep_bug_closure ✅
BUG-460: GATE_5A_IMPLEMENTED, sprint_key=sep_bug_closure ✅ (no drift)
```
