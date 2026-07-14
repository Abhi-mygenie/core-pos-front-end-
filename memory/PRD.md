# MyGenie POS — PRD & Session Log

**Last Updated:** 2026-07-11

## Architecture
- React 19 + CRACO + Tailwind CSS + Radix UI + shadcn
- Backend: Laravel (preprod.mygenie.online)
- Socket: presocket.mygenie.online
- Firebase: auth/notifications
- CRM: crm.mygenie.online

## User Personas
- **Restaurant Owner:** Full access — order management, billing, reports, settings, expenses
- **Cashier/Waiter:** Limited access — order entry, KOT/bill printing, table management

## Core Requirements
- POS order lifecycle: place → confirm → prepare → ready → serve → bill → pay
- Multi-channel: dine-in, walk-in, takeaway, delivery, web orders
- Real-time: socket events for order updates, menu changes
- Print: KOT + Bill via order-temp-store API with printer agent routing
- Reports: 30+ Insights reports with backend aggregation
- Expenses: Full expense module with entry, setup, bulk edit, reports, unit prices

## What's Been Implemented (2026-07-11 Full Day Session)

### Deployment
- Cloned repo from GitHub (main branch), configured .env, services running

### Bugs Implemented (8)
1. **BUG-144** — Token number: dailyToken extraction + display gated by useToken + KOT/Bill print
2. **BUG-194** — Payments report: .data? prefix fix (CR-049 regression)
3. **BUG-186** — Settlement: negative balance handling for partial settlement
4. **BUG-195** — Takeaway name: localStorage toggle reads (CR-051 parity)
5. **BUG-188** — Discount CSS: overflow-hidden + flex-shrink-0
6. **BUG-187** — Red border: CLOSED (already fixed, cascades from BUG-195)
7. **BUG-135-C** — Bulk Editor: hybrid ≤3 inline toast / >3 drawer for save errors
8. **BUG-147** — Error messages: item name prefix on 3 surfaces

### QA Completed (47 items → QA PASS)
- 43 existing IMPLEMENTED items + 4 new fixes all verified

### Investigations (3)
- BUG-144: Token number (12 print routes traced)
- BUG-184: CRE-Credit payment type (4,590 orders analyzed, backend gap confirmed)
- BUG-135-C: Bulk Editor error visibility (toast/tooltip/drawer paths traced)

### Remote Merge
- Pulled 25 new docs from parallel session (BUG-183→195, CR-068)
- Merged registry.json (14 new items + 46 QA statuses)

## Prioritized Backlog

### P0 — Owner Action
- Gate 6: Owner smoke (11 tests) on preprod
- BUG-185: Day Closure formula — backend alignment needed

### P1 — Ready
- QA for BUG-135 + BUG-147 (just implemented)
- Regression: 6 zones after smoke
- BUG-166: addon_amount × qty (Gate 4 GO)
- CR-060: Table/Room Management (Gate 3 complete)

### P1 — Backend Blocked (9 items)
- BUG-182, 183, 184, 185, 191, 192, 193: backend data gaps
- BUG-090: room check-in customer_id
- CR-062: expense report backend aggregation

### P2 — Backlog
- 24 items at INTAKE — triage next session

## Next Tasks
1. Owner smoke batch → screenshots → PASS/FAIL
2. QA BUG-135 + BUG-147
3. Regression after smoke
4. Implement BUG-166 + CR-060
