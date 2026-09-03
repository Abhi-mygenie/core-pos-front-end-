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

### PMS Phase 3 (CR-358-P3) — QA PASS Gate 5b (2026-09-04)
- Front Desk page (S1): KPI tiles, arrivals preview, departures mini-list, Channel Sync + Sync Now
- Arrivals page (S9): 5 KPIs, 4 tabs, pagination, PAH/Prepaid badges, SR indicator
- Departures page (S10): 4 KPIs, 4 tabs, in-page checkout via PmsCheckoutDrawer
- PmsCheckoutDrawer: CollectPaymentPanel host (OD-P3-14=b Dashboard parity)
- aiosellTransform.js: +fromReservationOps, +fromDashboardKpis
- pmsService.js: +localDate, +bucketReservationOps, +getReservationOps, +getFrontDeskKpis, +getChannelSyncStatus, +syncNow
- **QA: 25/25 executable tests PASS** (V-G1..9 auto, V-S1 security, V-U1..6 unit, V-B1..9 browser, V-R1..4 regression). 6 V-M money tests deferred (no checkout-eligible room). Report: `reports/QA_REPORT_CR358_P3_2026_09_04.md`. Ready for Gate 6 Owner Smoke.

### BUG-380 — Occupied Rooms in Picker — Fixed (QA PASS 2026-09-03)
- getBookableRooms() cross-refs getRoomList() for occupied room IDs, returns isOccupied flag
- NewBookingPage: greyed out with red "OCCUPIED" badge
- CheckInPage: dropdown disabled with "— Occupied" suffix

### BUG-381 — Walk-in Data Missing — Fixed (Backend, QA PASS 2026-09-03)
- Backend creates synthetic local-reservation for walk-ins (Option A)
- Zero frontend changes needed

## In Progress

*None — awaiting owner Gate 6 smoke tests for P3 and P4.*

### PMS Phase 4 (CR-358-P4) — QA PASS Gate 5b (2026-09-04)
- **S2 Tape Chart** (ReservationsPage.jsx): Gantt grid — rooms × dates, reservation blocks with kind-coded colours, view toggle (7d/14d/30d), navigation (prev/today/next), popover on click, unassigned section, room groups by type
- **S7 Room Status Board** (RoomStatusPage.jsx): Card grid — room tiles with status badges, filter chips, PATCH actions (HK/OOO/Available/Mark Clean), bulk Mark All Clean, Auto-HK pill, refetch after PATCH
- roomStatusTransform.js: `fromRoomStatusBoard`, `fromPatchResponse`, `patchErrorMessage`, `ROOM_MANUAL_STATUSES`
- pmsService.js: +`getRoomStatusBoard`, `patchRoomStatus`, `bulkMarkClean`, `buildTapeChart`, `getTapeChartData`
- App.js: SC-P4-01 (6 lines — +2 imports, −1 PmsPlaceholderPage, 2 route swaps)
- V-B0 CORS PATCH verified (preflight + browser round-trip)
- **QA: 34/34 executable tests PASS + testing agent 100%**. Report: `reports/QA_REPORT_CR358_P4_2026_09_04.md`. Ready for Gate 6.

## Design System
- Brand Orange: #F26B33 | Action Green: #329937 | Danger: #EF4444 | Warning: #F59E0B
- Text: #1A1A1A / #888 | Border: #E5E5E5 | BG: #F7F7F7 | Card: #FFF / #FAFAFA
- Font: Poppins (headings), Inter (body)
- **Forbidden**: #22C55E, #3B82F6, #2563EB, slate-* families

## Pending / Backlog
- **P1**: CR-358-P3 Gate 6 Owner Smoke (code QA-passed, ready for sign-off)
- **P1**: CR-358-P4 Gate 6 Owner Smoke (code QA-passed, ready for sign-off)
- **P1**: V-M1..M6 money tests for PmsCheckoutDrawer (deferred — requires checkout-eligible in-house room)
- **P1**: REACT_APP_CRM_API_KEYS truncated in .env (requires owner input)
- **P2**: OG-PMS-011 — sync `cr358-p3-design-comparison.html` from origin (local has forbidden #3B82F6)
- **P2**: OG-PMS-010 — auto-HK not firing after RM checkout (backend) — observe
- **P2**: Sidebar forbidden color fix (#3B82F6) — shared component
- **P2**: BUG-381 walk-in live test on preprod
- **P2**: Live token lint check (one-command color audit)

## Environment notes
- `/app/frontend` git remote `origin` = `https://github.com/Abhi-mygenie/core-pos-front-end-.git`; working branch content = `origin/PMS1`. Before planning/coding: `git fetch origin PMS1 && git diff --stat origin/PMS1 -- frontend/src` must be empty.
