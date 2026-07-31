# QA Report — 6 Batches, 14 Items (2026-07-24)

**QA Agent Session:** 2026-07-24
**Testing Method:** Testing subagent (iteration_11) — code inspection + live API curl + regression
**Result:** ALL PASS — 35/35 tests (28 code + 3 curl + 4 regression)

---

## Results by Batch

### BATCH-1: OrderCard Features (CR-098, CR-099) — 8/8 PASS
| Test | Item | Method | Result |
|------|------|--------|--------|
| itemCode Preparing/Ready L677 | CR-098 | Code | PASS ✅ |
| No empty brackets | CR-098 | Code | PASS ✅ |
| Search by short code L534 | CR-098 | Code | PASS ✅ |
| Menu pill prefix L1656 | CR-098 | Code | PASS ✅ |
| adaptProduct L91 | CR-098 | Code | PASS ✅ |
| orderTransform L118 | CR-098 | Code | PASS ✅ |
| formatElapsed + timer + prep/wait | CR-099 | Code | PASS ✅ |
| Served prep/serve time L767-770 | CR-099 | Code | PASS ✅ |

### BATCH-2: Settings + Dashboard (CR-056) — 5/5 PASS
| Test | Method | Result |
|------|--------|--------|
| show_scan_popup=1 in profile API | Curl | PASS ✅ |
| settingsTransform fromAPI/toAPI | Code | PASS ✅ |
| Toggle in SettingsPage Step 4 | Code | PASS ✅ |
| DashboardPage conditional gate | Code | PASS ✅ |
| profileTransform mapping | Code | PASS ✅ |

### BATCH-3: Expense Module (CR-062, BUG-164, BUG-165, BUG-203) — 6/6 PASS
| Test | Item | Method | Result |
|------|------|--------|--------|
| POST /expense-aggregation → 200 | CR-062 | Curl | PASS ✅ |
| serverAgg + fallback in ExpenseReportPage | CR-062 | Code | PASS ✅ |
| Duplicate category → HTTP 409 | BUG-164 | Curl | PASS ✅ |
| Client-side duplicate guard | BUG-165 | Code | PASS ✅ |
| updateExpenseItem single PUT + unit_price | BUG-203 | Code | PASS ✅ |
| Body-inspection workaround removed | BUG-164 | Code | PASS ✅ |

### BATCH-4: Inventory + Smart Purchase (CR-102, CR-103) — 6/6 PASS
| Test | Item | Method | Result |
|------|------|--------|--------|
| addIngredient hasConversion + consumption_unit | CR-102 | Code | PASS ✅ |
| updateIngredient hasConversion + consumption_unit | CR-102 | Code | PASS ✅ |
| selectedRows + toggle/bulk handlers | CR-103 | Code | PASS ✅ |
| activeRows + validate skip + canSubmit | CR-103 | Code | PASS ✅ |
| Checkbox testids + bulk remove + prominent × | CR-103 | Code | PASS ✅ |
| No converion_factor:'1' leak without conversion | CR-102 | Code | PASS ✅ |

### BATCH-5: Reports + Recipe PDF (CR-089, CR-101) — 4/4 PASS
| Test | Item | Method | Result |
|------|------|--------|--------|
| jsPDF import + handleExportPDF + 3 sections | CR-089 | Code | PASS ✅ |
| Download PDF button + disabled while loading | CR-089 | Code | PASS ✅ |
| Filter state + logic + options useMemo | CR-101 | Code | PASS ✅ |
| FilterBar dropdowns + hidden when empty | CR-101 | Code | PASS ✅ |

### BATCH-6: Recipe Form Fixes (BUG-237, BUG-238, BUG-239) — 3/3 PASS
| Test | Item | Method | Result |
|------|------|--------|--------|
| Recipe name hidden for standard | BUG-237 | Code | PASS ✅ |
| Shadcn combobox, no plain select | BUG-238 | Code | PASS ✅ |
| Serves hidden for sub/addon | BUG-239 | Code | PASS ✅ |

### Regression — 4/4 PASS
| Test | Result |
|------|--------|
| Webpack compiles successfully | PASS ✅ |
| No empty brackets on orders without item_code | PASS ✅ |
| Expense entry unaffected | PASS ✅ |
| Existing report filters work | PASS ✅ |

---

## Registry Spot-Check: SYNCED ✅

## Coverage: 17/17 changed files tested (100%)

## Code Review Notes (NON-BLOCKING)
1. formatElapsed NaN if createdAt missing — minor defensive guard
2. Timer per OrderCard could be shared context — perf optimization
3. collectedBy → actionedBy field name mismatch worth code comment
4. R9 typo `converion_factor` preserved per backend contract — documented

## Blockers: NONE

---

**Verdict: QA PASS — ALL 14 items verified. Ready for Gate 6 (Owner Smoke).**
