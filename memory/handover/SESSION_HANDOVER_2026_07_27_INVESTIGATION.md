# Session Handover — 2026-07-27 (Investigation: Reports + Inventory + Smart Purchase)

**Last session (2026-07-27):** Investigation of 11 owner-reported issues across P&L, Consumption, Expense reports, Smart Purchase, and Inventory Intelligence.

---

## 1-Line Summary

11 issues investigated across reports (calendar/pills/graphs), inventory (Smart Purchase UX), and intelligence (wastage blocked). All root-caused with HIGH confidence. 1 owner ruling recorded. 0 code changes.

---

## What Was Done

- **Role:** INVESTIGATION (10/10 steps used)
- **Scope:** P&L Report, Consumption Report, Expense Report, Smart Purchase, Inventory Intelligence, app-wide "Coming Soon" audit
- **Items investigated:** 11
- **Root causes found:** 10 FE-fixable, 1 BACKEND-BLOCKED (wastage)
- **Code changes:** NONE (investigation only)
- **Owner rulings:** Preset pill pattern `[Today, 7D, 30D, MTD]` confirmed as standard

---

## Items Pending Registration (INTAKE)

These 11 issues have been investigated but NOT yet registered with formal IDs. Next INTAKE session should assign BUG-258+ / CR-114+ IDs and create intake docs.

| # | Summary | Type | Severity | Risk |
|---|---------|------|----------|------|
| 1 | P&L Calendar broken + different UI (no presets, no max, no calendar component) | BUG | P1 | MEDIUM |
| 2 | P&L charts hidden when 1 data point (`chartData.length > 1` too strict) | BUG | P2 | LOW |
| 3 | Future dates allowed in 5 reports (PLReport, Consumption, EdgeStates, ItemSales, Dashboard) | BUG | P1 | LOW |
| 4 | Missing preset pills in P&L + Consumption (should be [Today, 7D, 30D, MTD]) | BUG | P1 | MEDIUM |
| 5 | "Coming Soon" text visible in production (6 locations: Intelligence, Setup, Sidebar, Login) | BUG | P0 | MEDIUM |
| 6 | Smart Purchase: all items visible by default (should be opt-in) | CR | P2 | MEDIUM |
| 7 | Smart Purchase: no search filter or sort by category (100+ items) | CR | P1 | MEDIUM |
| 8 | Smart Purchase: no sticky toolbar (long scroll) | BUG | P2 | LOW |
| 9 | System Vendor: no explanation/tooltip | BUG | P2 | LOW |
| 10 | Conversion Factor: no help text | BUG | P3 | LOW |
| 11 | Wastage report/top wasted items: BACKEND-BLOCKED (no endpoint) | BUG | P1 | N/A |

---

## Recommended Batching for Next Session

**Batch A — Quick Fixes (5 items, planning skip eligible):**
Items 2, 3, 8, 9, 10 — all LOW risk, small scope, single-file changes

**Batch B — Needs Planning (4 items):**
Items 1+4 (P&L + Consumption date bar rewrite), 5 (Coming Soon audit), 6+7 (Smart Purchase UX)

**Batch C — Backend Brief:**
Item 11 (wastage endpoints)

---

## Key Artifacts

| Artifact | Path |
|----------|------|
| Investigation Report | `/app/memory/evidence/INVESTIGATION_BATCH_2026_07_27/INVESTIGATION_REPORT.md` |

---

## Test Credentials

- **Login:** owner@18march.com / Qplazm@10
- **Restaurant ID:** 478 (18march)
- **Frontend:** https://react-pos-frontend-5.preview.emergentagent.com
- **Backend API:** https://preprod.mygenie.online

---

## Environment Notes

- Frontend: React 19 + CRACO, port 3000, hot reload enabled
- Backend: Disabled (frontend-only deployment per owner request)
- Branch: `27july` from `core-pos-front-end-.git`
- Env: Real values configured (preprod API, Firebase, Socket, CRM, Google Maps)
