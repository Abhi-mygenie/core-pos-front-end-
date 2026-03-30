# MyGenie POS Frontend - PRD

## Original Problem Statement
Pull code from main branch https://github.com/Abhi-mygenie/core-pos-front-end-.git, build and run the React frontend app. Implement Order Reports screen based on provided UX specifications and Phase 4A requirements.

## Architecture
- Frontend-only React app with CRACO build system
- Backend: External preprod API at `preprod.mygenie.online`
- No local backend/database

## What's Been Implemented

### Phase 1-3: Core POS (Pre-existing)
- Login, Dashboard, Order Entry, Table Management
- Menu Management panel, Settings panel
- Context-based state management
- Customer lookup, Place Order, Collect Bill, Update Order APIs
- Room Check-In, Transfer to Room, Associated Orders
- Table operations: Shift, Merge, Transfer Food, Cancel Item/Order

### Phase 4A: Order Reports (Completed - March 2026)
- `/reports` route with Sidebar navigation
- 8 tabs: All Orders, Paid, Cancelled, Credit, On Hold, Merged, Room Transfer, Aggregator
- `reportService.js` — API fetchers for 7 report endpoints
- `reportTransform.js` — Normalizes disparate backend responses into unified formats
- Date filtering with parallel tab count updates on date change
- Date picker with prev/next day arrows (next disabled on today)
- Payment type filtering, CSV/PDF export
- Order sequence gap detection (missing orders highlighted in red)
- Order detail drill-down side sheet (glass-morphism)
- 2-row filter toolbar:
  - Row 1: Compact pill-style filter dropdowns (left) + summary stats (right)
  - Row 2: Status breakdown pills spread full-width (`flex-1`)
- Compact loading indicator (spinner + text, replaces skeleton rows)
- Channel/Platform filters disabled with "Coming soon" tooltips (awaiting backend GAP-001/GAP-002)
- Hold tab shows info banner (backend ISSUE-001: returns same data as Paid)

### UI Cleanup (March 30, 2026)
- Sidebar restricted to 3 items: Dashboard, Reports, Menu Management
- Hidden: Orders, Employees, Expenses, Inventory, Settings

## Components (Phase 4A)
```
/app/frontend/src/
  api/
    services/reportService.js       — 7 API fetchers
    transforms/reportTransform.js   — Normalizers per tab
  components/reports/
    ReportTabs.jsx                  — 8 tab buttons with count badges
    DatePicker.jsx                  — Calendar + prev/next day arrows
    OrderTable.jsx                  — Dense table with sorting, gap detection
    FilterBar.jsx                   — 2-row: filters+stats / breakdown pills
    FilterTags.jsx                  — Active filter tag chips
    OrderDetailSheet.jsx            — Side sheet drill-down
    ExportButtons.jsx               — PDF print + CSV download
  pages/ReportsPage.jsx             — Container with all state management
```

## Known Backend Issues (Blocked)
- PHP Fatal Error on preprod (duplicate class declaration) - intermittent
- Hold API returns identical data to Paid API (ISSUE-001)
- Channel/Platform fields missing from report API responses (GAP-001, GAP-002)

## Backlog
- P1: CHG-040 Edit Placed Item (awaiting backend endpoint)
- P1: Menu Variations (Buffet, HappyHour)
- P2: Real-time WebSocket sync
- P2: Loyalty/Wallet Integration
- P3: KDS Integration
- P3: Aggregator orders in gap detection
