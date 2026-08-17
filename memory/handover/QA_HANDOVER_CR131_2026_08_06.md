# QA Handover — CR-131 (2026-08-06)

**ID:** CR-131
**Title:** Customer Intelligence (Beta) + Guest vs Registered (Beta)
**Date:** 2026-08-06
**Author:** IMPLEMENTATION agent
**Files changed:** 6 (3 NEW + 3 MODIFY)

---

## 1. Verification Matrix Results (self-test — all PASS)

| V# | Check | Result |
|----|-------|--------|
| V1 | 3 CRM_REPORT_* constants in constants.js | ✅ PASS — L71-73 |
| V2 | crmReportService.js: 4 exports (getSummary, getTopCustomers, getChurnRisk, clearCrmReportCache) | ✅ PASS |
| V3 | No "VIP" as tier value in new files (only "not VIP" comments) | ✅ PASS — 2 comment hits only |
| V4 | No hardcoded day numbers in lifecycle labels | ✅ PASS — 0 hits |
| V5 | data.count used for win-back badge (not customers.length) | ✅ PASS — churnData.high.count used |
| V6 | last_visit_days_ago null-guarded everywhere | ✅ PASS — `!= null` check at L44 + L306 |
| V7 | Sidebar: 2 new entries at L190-191 (no duplicates) | ✅ PASS |
| V8 | App.js: 2 imports (L35-36) + 2 routes (L142-143) (no duplicates) | ✅ PASS |
| V9 | Old screens (CustomersRfmMockup, CustomersMixMockup) untouched | ✅ PASS — 0 CR-131 markers |
| V10 | Webpack compile: 0 warnings, 0 errors | ✅ PASS — "webpack compiled successfully" |
| V11 | Route `/reports-module/customers-intel-beta` accessible (login required) | ✅ PASS — screen renders, header shows "Customer Intelligence" + "Beta" badge |
| V12 | API error handled gracefully (404 for test restaurant) | ✅ PASS — ReportLoadingShield shows error + Retry button |

**Self-test: 12/12 PASS**

---

## 2. What was changed

| File | Type | Change |
|------|------|--------|
| `api/constants.js` | MODIFY | +3 CRM_REPORT_* endpoints at L71-73 |
| `api/services/crmReportService.js` | **NEW** | getSummary/getTopCustomers/getChurnRisk + 5-min TTL cache |
| `pages/reports-module/CustomerIntelligenceBeta.jsx` | **NEW** | Full screen: KPI, lifecycle, tiers, revenue, top-customers (sort toggle), win-back (2 bands + WhatsApp) |
| `pages/reports-module/GuestVsRegisteredBeta.jsx` | **NEW** | Full screen: lifecycle funnel hero, AOV/redemption/points cards, both churn bands side-by-side |
| `components/layout/Sidebar.jsx` | MODIFY | +2 entries after L189 |
| `App.js` | MODIFY | +2 imports L35-36, +2 routes L142-143 |

---

## 3. Key behavior notes for QA

- **No date picker** on either screen — confirmed in UI ("CRM uses fixed windows — date filter not applicable")
- **data.count** for win-back tab badge = full pool before limit (if restaurant has 2,081 at-risk but limit=50, badge shows 2,081)
- **Lifecycle labels**: "New" / "Active" / "At Risk" / "Dormant" / "Churned" — no day numbers anywhere
- **Tiers**: Bronze / Silver / Gold / **Platinum** — no VIP
- **WhatsApp**: opens `wa.me/91{phone}` in new tab
- **Error state**: 404/500 from CRM → ReportLoadingShield error with Retry button (tested with kunafamahal — expected)
- **Sort toggle**: By Spend / By Visits / By Points → wires to `sort_by` param in `/top-customers` request

---

## 4. Regression tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | `/reports-module/customers-rfm` still loads (old CustomerIntelligence screen) | Old screen untouched |
| R2 | `/reports-module/customers-mix` still loads (old Guest vs Registered screen) | Old screen untouched |
| R3 | crmAxios 401 refresh still fires correctly (BUG-300 regression) | New CRM calls use same crmAxios |
| R4 | Both new screens appear in Sidebar under Customers group | Sidebar L190-191 entries |

---

## 5. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-131
Status: IMPLEMENTED — Gate 5a 2026-08-06
Sprint: pos_5_1
EXIT GATE: 5/5 PASS
```

---

## 6. Credentials + Environment

```
Test account: owner@kunafamahal.com / Qplazm@10 (0 CRM customers — shows error state, tests rendering)
Live CRM account: any restaurant with CRM Phase 1 enabled (for real data test)
Routes: /reports-module/customers-intel-beta + /reports-module/customers-gvr-beta
App: https://pos-react-preview-3.preview.emergentagent.com
```
