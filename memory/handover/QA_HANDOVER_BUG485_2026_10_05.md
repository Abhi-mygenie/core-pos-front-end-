# QA Handover — BUG-485
**Date:** 2026-10-05
**Implemented by:** Implementation agent
**Item:** BUG-485 — Insights Dashboard PDF/Excel buttons have no onClick
**Risk:** MEDIUM
**File changed:** `src/pages/reports-module/DashboardMockup.jsx`

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| E-1 | DashboardMockup.jsx:9 | `exportReportAsExcel` imported | ✅ PASS — line 9 |
| E-2 | DashboardMockup.jsx:174 | `buildExportPayload` function exists | ✅ PASS — line 174 |
| E-2 | DashboardMockup.jsx:253 | `handleDownloadAction` function exists | ✅ PASS — line 253 |
| E-3 | DashboardMockup.jsx:386 | PDF button has `onClick` | ✅ PASS — line 386 |
| E-4 | DashboardMockup.jsx:395 | Excel button has `onClick` | ✅ PASS — line 395 |
| E-3/E-4 | DashboardMockup.jsx:385,394 | Buttons disabled when `!tiles` | ✅ PASS — lines 385, 394 |
| V-7 | webpack | 0 new warnings | ✅ PASS — 1 pre-existing warning, unchanged |

**Self-test: 7/7 PASS**

---

## 2. QA Test Cases

| # | Test | Steps | Expected |
|---|------|-------|---------|
| TC-1 | PDF button fires when data loaded | 1. Login as `owner@thegoankitchen.com` / `Qplazm@10` 2. Navigate to `/reports-module/dashboard` 3. Wait for data to load (tiles visible) 4. Click PDF button (`data-testid="reports-export-pdf-btn"`) | Print/PDF window opens (same as SalesMockup PDF behaviour) |
| TC-2 | Excel button fires when data loaded | Same steps, click Excel button (`data-testid="reports-export-excel-btn"`) | `.xls` file downloads to browser |
| TC-3 | Buttons disabled while loading | Observe buttons immediately after page load (before data arrives) | Buttons have `opacity-50 cursor-not-allowed` class, `disabled` attribute present |
| TC-4 | Buttons enabled after data loads | Wait for tiles to appear | Both buttons no longer have `opacity-50 cursor-not-allowed`; `disabled` removed |
| TC-5 | PDF export content correct | After TC-1 — inspect print window content | Report shows title "Dashboard Report", date range, KPI table, 4 sheets (By Channel, By Payment, Top Items, Discounts) |
| TC-6 | Excel export content correct | After TC-2 — open downloaded file | Excel file has 4 sheets matching TC-5 content |

**Manual tests (V-8, V-9 from plan):** TC-1 and TC-2 require browser verification — cannot automate in static trace.

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R-1 | SalesMockup PDF/Excel still works (`/reports-module/sales`) | DashboardMockup uses same `reportExporter` utilities — verify shared module not broken |
| R-2 | Dashboard page loads without JS error | New import + functions must not throw on mount |
| R-3 | Dashboard data (tiles, charts) still renders correctly | E-2 inserts functions before `return` — verify no accidental JSX disruption |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-485
Status: GATE_5A_IMPLEMENTED
Sprint: oct_bug_batch
EXIT GATE: ALL 5 PASSED
  □1 registry.json: PASS
  □2 BUG_TRACKER.md: PASS
  □3 FILE_OWNERSHIP.md: PASS
  □4 Code markers (3×): PASS
  □5 Compile (0 new warnings): PASS
```

---

## 5. Credentials + Environment

| Item | Value |
|------|-------|
| App URL | `https://core-pos-deploy-32.preview.emergentagent.com` |
| Preprod API | `https://preprod.mygenie.online` |
| Test login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Dashboard route | `/reports-module/dashboard` |

---

## 6. Scope Lock

- **Files changed:** `src/pages/reports-module/DashboardMockup.jsx` (1 file only)
- **Files NOT touched:** `reportExporter.js`, `insightsService.js`, any other file
- **Scope expansion:** NONE
