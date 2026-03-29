# Core POS Frontend — PRD

## Original Problem Statement
1. Pull code from github `core-pos-front-end-`
2. React frontend, no backend
3. Use Core POS API (preprod.mygenie.online)
4. Build and run as-is
5. Don't run test agent

## Evolving Requirements — Phase 2A: Room (RM) Integration
Rooms behave exactly like Tables (TB), sharing the same Context architecture and UI component (`TableCard`), differentiated only by an `isRoom` flag.

### Phase 2A Requirements (ALL COMPLETE):
- Unified Table/Room architecture (Context, transforms, dedup)
- Dashboard renders rooms & tables from API
- "C/Out" button label for rooms (instead of "Bill")
- "Check In" order item filtering from cart/UI
- Real customer/waiter names on cards
- UI/CSS fixes (truncation, alignment, wrapping)
- Step 8: RoomCheckInModal — Check-in panel with all API fields, multi-room selection
- Step 9: CollectPaymentPanel — "Credit" hidden for rooms
- Step 10: "Collect Bill"/"Pay" -> "Checkout" for rooms
- Documentation updated (CHANGE_MANAGEMENT.md, API_MAPPING.md, CHANGELOG.md)

### Phase 2B (Deferred - P1):
- Associated order list (transferred orders from tables to rooms)
- Transfer to Room functionality (from table payment screen)
- Room checkout summary

## Architecture
```
/app/frontend/src/
├── api/             # Axios, services, transforms (toAPI/fromAPI)
├── components/      # UI (cards, layout, order-entry, modals)
├── contexts/        # React Contexts (Auth, Table, Order, Menu, Restaurant, Settings)
├── pages/           # DashboardPage, LoadingPage, LoginPage
├── hooks/           # useRefreshAllData, useToast
└── utils/           # Helpers
/app/docs/           # CHANGE_MANAGEMENT.md, API_MAPPING.md, CHANGELOG.md
```

## Key Technical Decisions
- **Unified State:** Tables + Rooms in single arrays, differentiated by `isRoom` flag
- **Transform Firewall:** All API data cleaning (dedup, filtering) happens in transforms before reaching state
- **No Auto-Refresh:** App relies on manual refresh button + future Phase 3 sockets
- **403 refresh disabled:** Commented out in OrderEntry, sockets will handle state sync

## What's Implemented (as of 2026-03-29)
- Phase 2A fully complete (Steps 1-10)
- Room Check-In modal with all API fields (name, phone, email, booking type/for, adults/children, dates, payment, ID images)
- Multi-room selection via chips
- API service for `POST /api/v1/vendoremployee/pos/user-group-check-in`
- JSON and multipart/form-data submission modes
- Loading screen: per-API timing (live counter + elapsed), smart retry (failed-only), 60s timeout
- Credit payment hidden for rooms, Checkout labels applied
- All Phase 2A documentation finalized

## Prioritized Backlog
### P1 — Phase 2B
- Associated order list (transferred orders from tables to rooms)
- Transfer to Room (from table payment screen)
- Room checkout summary (direct room service + transferred orders)

### P2 — Phase 3
- Socket-based real-time state sync
- `get-single-order-new` integration
