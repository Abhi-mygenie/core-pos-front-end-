# PRD — Core POS Frontend

## Original Problem Statement
Deploy Core POS Frontend from GitHub repo (branch: 5-june). Frontend-only React app connecting to external backend at preprod.mygenie.online.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS
- **External APIs**: preprod.mygenie.online (backend), presocket.mygenie.online (sockets), Firebase (auth/messaging), CRM
- **No local backend** — FastAPI kept as placeholder

## What's Been Implemented

### 2026-06-07 — Initial Deployment
- Cloned repo, configured all env variables, yarn install, services running

### 2026-06-07 — CR-013 Food Court Report Column Enhancement
- Added 3 new columns: Payment Type, Discount, Sub Total to table + TOTALS + exports
- Verified 1Y (13 chunks) and FY (3 chunks) batching
- Testing agent: 100% pass

### 2026-06-07 — CR-013-AUDIT Gate ①→④
- Registered CR-013-AUDIT in CR_REGISTRY.md + CR_011_SCREEN_FREEZE_LOG.md
- Gate ① seed data mockup → Gate ②+③ owner approved → Gate ④ live API wired
- Per-order audit grid: rows = order IDs, columns = stations + TOTAL + DRIFT
- 5 metrics: Item Total, Discount, Sub Total, Tax (GST), Total
- Proportional discount/subtotal/total distribution (same formula in main report + audit)
- Drift sections: drift orders on top (red), clean orders below (green)
- UNASSIGNED column for items with no station
- All 174 orders ₹0 drift on Jun 1 across all 5 metrics

### 2026-06-07 — Backend Gaps Flagged
- BE-ADDON-001: order_sub_total_amount inconsistent for add-ons (old vs new orders)
- BE-CANCELLED-TAX-001: cancelled item tax still in order_details_table
- FE-PROPORTIONAL-001: proportional distribution implemented in CR-013 only, cross-report audit needed

### Files Modified
- `foodCourtService.js` — toStationRow(): proportional discount, derived subtotal/total, allOrders return
- `FoodCourtMockup.jsx` — 3 new columns, Audit tab, 5 metrics, drift, proportional distribution
- Control docs: CR_REGISTRY, SCREEN_FREEZE_LOG, CONTROL_DASHBOARD, OPEN_GAPS_REGISTER, HANDOVER

## Test Accounts
- owner@shimlaqohfoodcourt.com / Qplazm@10 (shimla food court)
- owner@welcomeresort.com / Qplazm@10 (rooms)
- owner@palmhouse.com / Qplazm@10 (transfer-to-room)
- owner@cafe103.com / Qplazm@10 (no rooms)

## Prioritized Backlog
### P0
- Cross-report business logic consistency audit (S5, S6, S7, S-ROOM) — validate discount/itemTotal/subtotal formulas
- CR-013-AUDIT Gate ⑤ owner data validation → Gate ⑥ frozen
- CR-013 (S-FC) main report Gate ② sign-off

### P1
- "Download Audit Report" Excel export (5 sheets)
- S10 Prep & Serve Time Gate ② review

### P2
- Column chooser for Food Court
- Backend gaps resolution (BE-ADDON-001, BE-CANCELLED-TAX-001)
