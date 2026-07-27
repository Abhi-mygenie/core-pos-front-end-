# MyGenie POS Frontend — PRD

## Original Problem Statement
Deploy existing React frontend repo (core-pos-front-end-, branch 27july) into /app and run as-is. Then investigate owner-reported issues across reports, inventory, and smart purchase modules.

## Architecture
- **Frontend:** React 19 + CRACO, port 3000 via supervisor
- **Backend:** Disabled (frontend-only). API calls go to preprod.mygenie.online
- **Database:** N/A (external backend)

## What's Been Implemented

### 2026-07-27 — Deployment
- Cloned repo, installed deps, configured .env with real values
- Frontend running on port 3000, backend disabled

### 2026-07-27 — Investigation Session
- 11 issues investigated across P&L, Consumption, Expense reports, Smart Purchase, Inventory Intelligence
- All root-caused with HIGH confidence
- 10 FE-fixable, 1 backend-blocked (wastage)
- Owner ruling: preset pill pattern [Today, 7D, 30D, MTD] is standard

## Prioritized Backlog

### P0
- BUG: "Coming Soon" placeholders visible in production (6 locations)

### P1
- BUG: P&L Calendar broken/different UI + missing presets
- BUG: Future dates allowed in 5 reports
- BUG: Missing preset pills in P&L + Consumption
- CR: Smart Purchase search/sort by category
- BUG: Wastage report blocked (BACKEND-BLOCKED)

### P2
- BUG: P&L charts hidden with 1 data point
- CR: Smart Purchase items should be opt-in
- BUG: Smart Purchase no sticky toolbar
- BUG: System Vendor no explanation

### P3
- BUG: Conversion Factor no help text

## Next Tasks
1. INTAKE: Register all 11 issues with formal IDs (BUG-258+, CR-114+)
2. Batch A quick fixes (items 2, 3, 8, 9, 10) — planning skip eligible
3. Batch B planning for items 1+4, 5, 6+7
4. Backend brief for item 11 (wastage)
