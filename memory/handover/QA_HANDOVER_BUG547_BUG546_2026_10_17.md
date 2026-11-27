# QA Handover — BUG-547 + BUG-546 — 2026-10-17

**Role:** BUG FIX → QA
**Date:** 2026-10-17
**Sprint:** oct_cr_batch

---

## 1. Files Changed

| File | Line | Change |
|---|---|---|
| `src/pages/reports-module/DashboardMockup.jsx` | L88 | `transformDashboardResponse(raw)` → `transformDashboardResponse(raw.data \|\| raw)` |
| `src/pages/reports-module/OrderReportBetaPage.jsx` | L40 | `label: 'Partial'` → `label: 'Split Bill'` (lowercase key) |
| `src/pages/reports-module/OrderReportBetaPage.jsx` | L52 | `label: 'Partial'` → `label: 'Split Bill'` (capital-P key) |

---

## 2. Test Cases

### BUG-547 — Dashboard doughnut shows ₹0

| # | Test | Steps | Expected |
|---|---|---|---|
| V1 | Channel Mix tile loads data | Open Insights Dashboard, apply a date range with orders | Channel Mix tile shows named channels (e.g. Dine-In, Swiggy) with non-zero counts and ₹ revenue |
| V2 | Payment Mix doughnut renders | Same page | Doughnut renders coloured arcs; legend shows payment methods with % and ₹ amount (not ₹0) |
| V3 | Net Sales tile loads | Same page | Net Sales tile shows non-zero ₹ figure matching the date range |
| V4 | Top Items tile loads | Same page | Top Items shows item names with revenue figures |
| V5 | No "Function Error" or blank screen | Same page | No error banner, no empty-state message on tiles that have data |
| V6 | Empty date range shows graceful empty state | Apply a future date range (no orders) | Tiles show "No data" / "No payment data" — not a crash or ₹0 on a populated range |

### BUG-546 — "Partial" → "Split Bill" in Order Report

| # | Test | Steps | Expected |
|---|---|---|---|
| V7 | Split-settled order shows "Split Bill" badge | Open Orders (Beta) report, find an order settled with two payment methods (e.g. Cash + UPI) | Payment badge reads **"Split Bill"** (blue chip), not "Partial" |
| V8 | Single-method order unchanged | Find a cash-only settled order | Badge reads "Cash" — no regression |
| V9 | Status column unaffected | Same report, check Status column | Status column shows "Paid" / "Unpaid" — "Split Bill" does not appear there |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | All other Dashboard tiles still load (KPIs, sparkline, Top Items) | `raw.data \|\| raw` fallback ensures no regression if shape changes |
| R2 | Other payment badges (Cash, UPI, TAB, Aggregator, COD) unchanged in Order Report | Only `partial` / `Partial` keys were modified |
| R3 | Dashboard export (Excel/PDF) still works | `buildExportPayload` uses `tiles` from the same `useReportFetch` — if tiles now populate correctly, export payload should also be non-empty |

---

## 4. Registry Sync Confirmation

- BUG-547 → `GATE_5A_IMPLEMENTED` ✅
- BUG-483 → `CLOSED_SUPERSEDED_BY_BUG-547` ✅
- BUG-546 → `GATE_5A_IMPLEMENTED` ✅
- FILE_OWNERSHIP.md updated ✅
- Code markers: `// BUG-547` at L88 · `// BUG-546` at L40 + L52 ✅
- Compile: `webpack compiled with 1 warning` (pre-existing allDays warning, 0 new) ✅

**EXIT GATE: 5/5 PASS**

---

## 5. Credentials + Environment

- Insights Dashboard: `/reports-module/dashboard`
- Orders (Beta): `/reports-module/order-report-beta`
- Needs an authenticated session with orders in the selected date range to verify V1–V5 and V7
- Test account: refer to `memory/test_credentials.md`
