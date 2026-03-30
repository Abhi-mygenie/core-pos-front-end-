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

### Phase 4A: Order Reports (Completed - March 2026)
- 8 tabs: All Orders, Paid, Cancelled, Credit, On Hold, Merged, Room Transfer, Aggregator
- Date filtering with parallel tab count updates
- Payment type filtering, CSV/PDF export
- Order sequence gap detection (missing orders highlighted)
- Order detail drill-down side sheet (glass-morphism)
- Compact single-row filter toolbar: pill-style filter buttons + summary stats + status breakdown pills — full-width, no wasted space

### UI Cleanup (March 30, 2026)
- Sidebar restricted to 3 items only: Dashboard, Reports, Menu Management
- Hidden: Orders, Employees, Expenses, Inventory, Settings
- FilterBar redesigned: removed dropdown labels, made everything a single compact row spanning full width

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
