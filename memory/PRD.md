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

### PMS Phase 4 (CR-358-P4) — Gate 2 CLOSED (2026-09-03)
- **S2 Tape Chart** (ReservationsPage): Gantt grid — rooms as rows, dates as columns, reservation blocks
- **S7 Room Status Board** (RoomStatusPage): Card grid — 5 room tiles with HK/OOO toggles
- Design APPROVED: `frontend/public/cr358-p4-pms-mockup.html`
- IA written: `memory/impact/CR-358-P4_IMPACT_ANALYSIS.md`
- Decisions locked: OD-P4-01 (PATCH body), OD-P4-02 (reuse getReservationOps), OD-P4-03 (disabled+tooltip), OD-P4-04 (Check In/View Folio)
- **Gate 2 REOPENED 2026-09-03 (IA compliance audit — see handover §GATE 2 COMPLIANCE AUDIT). Next: complete IA (T1-T11), owner re-closes Gate 2, then Gate 3**

## Design System
- Brand Orange: #F26B33 | Action Green: #329937 | Danger: #EF4444 | Warning: #F59E0B
- Text: #1A1A1A / #888 | Border: #E5E5E5 | BG: #F7F7F7 | Card: #FFF / #FAFAFA
- Font: Poppins (headings), Inter (body)
- **Forbidden**: #22C55E, #3B82F6, #2563EB, slate-* families

## Pending / Backlog
- **P0**: CR-358-P4 Gate 3 → Gate 4 → Implementation
- **P1**: V-M1..M4 money tests for PmsCheckoutDrawer (requires in-house room with ₹200 advance)
- **P1**: REACT_APP_CRM_API_KEYS truncated in .env (requires owner input)
- **P2**: Sidebar forbidden color fix (#3B82F6) — shared component
- **P2**: BUG-381 walk-in live test on preprod
- **P2**: Live token lint check (one-command color audit)
