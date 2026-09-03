# PRD — MyGenie POS + PMS System

## Product Overview
MyGenie is a hospitality POS (Point of Sale) and PMS (Property Management System) for restaurants and hotels. It integrates with AIOSELL channel manager for reservation operations, room inventory, and guest management.

## Architecture
- **Frontend**: React SPA (port 3000) with TailwindCSS, Shadcn/UI components
- **Backend**: FastAPI (port 8001) — proxied via `/api` prefix
- **Database**: MongoDB (via MONGO_URL)
- **Auth**: Firebase Authentication
- **Channel Manager**: AIOSELL (reservations, inventory, status)

## Implemented Features

### PMS Phase 1 (CR-358-P1) — Complete
- Channel Manager page, In-House Guests page, PMS sidebar navigation
- AIOSELL service integration (status, rooms, inventory)

### PMS Phase 2 (CR-358-P2) — Complete
- New Booking page, Check-In page
- Reservation transforms (fromDirectReservation, fromPendingArrival)
- PMS service layer (getPmsReservations, getInHouseGuests, getBookableRooms)

### PMS Phase 3 (CR-358-P3) — Complete (QA Regression PASS 2026-09-03)
- Front Desk page (S1): KPI tiles, arrivals preview, departures mini-list, Channel Sync + Sync Now
- Arrivals page (S9): 5 KPIs, 4 tabs, pagination, PAH/Prepaid badges, SR indicator
- Departures page (S10): 4 KPIs, 4 tabs, in-page checkout via PmsCheckoutDrawer
- PmsCheckoutDrawer: CollectPaymentPanel host (OD-P3-14=b Dashboard parity)
- aiosellTransform.js: +fromReservationOps, +fromDashboardKpis
- pmsService.js: +localDate, +bucketReservationOps, +getReservationOps, +getFrontDeskKpis, +getChannelSyncStatus, +syncNow

### BUG-380 — Occupied Rooms in Picker — Fixed (QA PASS 2026-09-03)
- getBookableRooms() cross-refs getRoomList() for occupied room IDs, returns isOccupied flag
- NewBookingPage: greyed out with red "OCCUPIED" badge
- CheckInPage: dropdown disabled with "— Occupied" suffix

### BUG-381 — Walk-in Data Missing — Fixed (Backend, QA PASS 2026-09-03)
- Backend creates synthetic local-reservation for walk-ins (Option A)
- Zero frontend changes needed

## In Progress

### PMS Phase 4 (CR-358-P4) — Gate 3 PLAN WRITTEN (2026-09-04) — awaiting Gate 4 GO
- **S2 Tape Chart** (ReservationsPage): Gantt grid — rooms as rows, dates as columns, reservation blocks
- **S7 Room Status Board** (RoomStatusPage): Card grid — 5 room tiles with HK/OOO toggles
- Design APPROVED: `frontend/public/cr358-p4-pms-mockup.html`
- IA (Gate 2 CLOSED 2026-09-04): `memory/impact/CR-358-P4_IMPACT_ANALYSIS.md` — OD-P4-01..10 locked
- Implementation Plan (Gate 3, 2026-09-04): `memory/plans/CR-358-P4_IMPLEMENTATION_PLAN.md` — 5 app files + 2 tests, 43-check matrix, SC-P4-01 (App.js 6 lines), A-P4-11..20, CORS PATCH risk (V-B0 first)
- 2026-09-04: local `/app/frontend/src` re-synced to `origin/PMS1 @ 0c3d3c0` (was 9 files behind — P3 code); OG-PMS-012
- **Next: owner "Gate 4 GO" + SC-P4-01 ack → IMPLEMENTATION role**

## Design System
- Brand Orange: #F26B33 | Action Green: #329937 | Danger: #EF4444 | Warning: #F59E0B
- Text: #1A1A1A / #888 | Border: #E5E5E5 | BG: #F7F7F7 | Card: #FFF / #FAFAFA
- Font: Poppins (headings), Inter (body)
- **Forbidden**: #22C55E, #3B82F6, #2563EB, slate-* families

## Pending / Backlog
- **P0**: CR-358-P4 Gate 4 GO (owner) → Implementation per `plans/CR-358-P4_IMPLEMENTATION_PLAN.md` (V-B0 CORS PATCH smoke first)
- **P1**: CR-358-P3 QA (Gate 5b) + owner smoke — code is on origin/PMS1 and now local
- **P1**: V-M1..M4 money tests for PmsCheckoutDrawer (requires in-house room with ₹200 advance)
- **P1**: REACT_APP_CRM_API_KEYS truncated in .env (requires owner input)
- **P2**: OG-PMS-011 — sync `cr358-p3-design-comparison.html` from origin (local has forbidden #3B82F6)
- **P2**: OG-PMS-010 — auto-HK not firing after RM checkout (backend) — observe during P4 IMPL
- **P2**: Sidebar forbidden color fix (#3B82F6) — shared component
- **P2**: BUG-381 walk-in live test on preprod
- **P2**: Live token lint check (one-command color audit)

## Environment notes
- `/app/frontend` git remote `origin` = `https://github.com/Abhi-mygenie/core-pos-front-end-.git`; working branch content = `origin/PMS1`. Before planning/coding: `git fetch origin PMS1 && git diff --stat origin/PMS1 -- frontend/src` must be empty.
