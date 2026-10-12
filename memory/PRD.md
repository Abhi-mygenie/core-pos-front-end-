# PRD — core-pos-front-end (Mygenie POS)

## Latest Deployment Record — 2026-10-12 (Full Session Close — oct_cr_batch wave 1)

### Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: main (latest HEAD deployed at session start)
- Deployed to: /app/frontend

### Architecture
- Frontend-only React app (no backend/database in this deployment)
- Build tool: CRACO + React 19
- Package manager: yarn
- Start command: `yarn start` → `craco start` → port 3000
- External backend: `https://preprod.mygenie.online`
- External socket: `https://presocket.mygenie.online`
- Supervisor: `directory=/app/frontend`, `command=yarn start`

---

## What's Been Implemented (this session — 2026-10-12)

### BUG-540 — P&L Report data mapping GATE_5A
- `PLReportPage.jsx` L91: added `totalExpensesCombined` to summary useMemo
- L116: `r.expenses` (pure) replaces `r.total_expenses` (combined) in tableRows
- L225: KPI label → "Total Expenses and Purchases", value → `totalExpensesCombined`
- OD-540-01=B: chartData bar unchanged

### BUG-536 — SC GST manual bill print GATE_5A
- `orderTransform.js` L2011-2012: 2 lines in manual print path add SC GST to `gst_tax`
- Collect-bill path untouched; callers with `{}` unaffected

### BUG-539 — Report page layout (PARTIAL — new root cause open)
- PLReportPage.jsx: E1 flex-wrap header + E2 overflow-x-auto table + BUG-539-W max-w-7xl removed
- ConsumptionReportPage.jsx: E3 flex-wrap header + BUG-539-W max-w-7xl removed
- **⚠ STILL BROKEN:** ml-64/ml-16 double-offset root cause found in re-investigation. Fix pending Gate 2.

### CR-415 — Sidebar cleanup GATE_5A
- Sidebar.jsx: 7 lines removed (4 comingSoon, Insights expense duplicate, PMS legacy Front Desk)
- Kept: expense-report (Daily Report), pms-front-desk-v2 (Front Desk Beta)

---

## Open Backlog (P0/P1)

| ID | Status | Priority | Notes |
|----|--------|---------|-------|
| **BUG-539 (ml-64 fix)** | INVESTIGATION_COMPLETE | **P0** | ml-64/ml-16 removes content 256px from sidebar. Gate 2 needed. |
| **BUG-538** | GATE_1_INTAKE | P1 | OD-538-01 OPEN (hide vs disable discount) |
| **CR-413** | GATE_1_INTAKE | P1 | OD-INV-01=A LOCKED, ready for Gate 2 |
| **CR-412** | GATE_1_INTAKE (blocked) | P1 | BLOCKED by CR-410 backend |
| **BUG-537** | PARKED | — | Owner decision |
| **CR-410** | BACKEND-BLOCKED | — | Backend must ship loyalty_info in socket |
| **CR-414** | GATE_1_INTAKE | — | OD-414-01/02 open; parked with BUG-537 |

## Test Credentials

| Account | Email | Password |
|---------|-------|---------|
| Owner (RID 69, The Goan Kitchen) | owner@thegoankitchen.com | Qplazm@10 |

**Test booking:** bonk · MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D · room r4 · order #000361
