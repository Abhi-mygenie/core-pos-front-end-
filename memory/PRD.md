# Core POS Frontend — PRD

## Original Problem Statement
1. Pull code from github `core-pos-front-end-`
2. React frontend, no backend
3. Use Core POS API (preprod.mygenie.online)
4. Build and run as-is
5. Don't run test agent

## Phase 2A: Room (RM) Integration — COMPLETE
Rooms behave exactly like Tables (TB), sharing the same Context architecture and UI component (`TableCard`), differentiated only by an `isRoom` flag.

### Phase 2A Deliverables (ALL COMPLETE):
- Unified Table/Room architecture (Context, transforms, dedup)
- Dashboard renders rooms & tables from API
- "C/Out" button label for rooms (instead of "Bill")
- "Check In" order item filtering from cart/UI
- Real customer/waiter names on cards
- UI/CSS fixes (truncation, alignment, wrapping)
- RoomCheckInModal — Check-in panel with all API fields, multi-room selection
- CollectPaymentPanel — "Credit" hidden for rooms
- "Collect Bill"/"Pay" → "Checkout" for rooms
- Loading screen optimization (per-API timing, smart retry, 60s timeout)
- Documentation updated (CHG-043 to CHG-053)

## Phase 2B: Transfer to Room + Associated Orders — COMPLETE
Transfer table orders to rooms as a payment method. Display transferred (associated) orders on room cart and checkout views.

### Phase 2B Deliverables (ALL COMPLETE as of 2026-03-30):
- **CHG-054:** API Layer — `ORDER_SHIFTED_ROOM` endpoint + `transferToRoom` transform
- **CHG-055:** Capture `associated_order_list` in order transform with deduplication
- **CHG-056:** "To Room" payment method button (tables only, orange accent, inline room picker)
- **CHG-057:** Transfer API wiring — `POST /order-shifted-room` via third `onPaymentComplete` branch
- **CHG-058:** Associated Orders display in CartPanel (collapsible, order #/date/amount)
- **CHG-059:** Room Checkout — expandable Transferred Orders + Room Service sections. Discount/coupon/loyalty/wallet controls inside Room Service expand
- **CHG-060:** Combined total (room service + transfers) in BILL SUMMARY header, Checkout button, payment amount
- **CHG-061:** Bill/C-Out card buttons → direct navigation to payment/checkout screen

### Backend Clarifications (Pending):
- Duplicate entries in `associated_order_list` (Room 305: order 540564 listed twice) — flagged as potential backend bug

## Architecture
```
/app/frontend/src/
├── api/             # Axios, services, transforms (toAPI/fromAPI)
│   ├── services/    # roomService.js, tableService.js, orderService.js
│   ├── transforms/  # orderTransform.js, tableTransform.js
│   ├── constants.js # API_ENDPOINTS (incl. ORDER_SHIFTED_ROOM)
│   └── axios.js     # Interceptors, 60s timeout
├── components/      # UI (cards, layout, order-entry, modals, sections)
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
- **Associated Orders:** Deduped by ID in transform, displayed in CartPanel + CollectPaymentPanel
- **Room Checkout Layout:** Two expandable sections (Transferred Orders first, then Room Service with inline discount/tax controls)
- **Bill/C-Out Shortcut:** `initialShowPayment` prop bypasses cart view, opens payment panel directly

## Prioritized Backlog

### P0 — Immediate
- None (Phase 2B complete)

### P1 — Phase 2B+ Enhancements
- Wire `paid-in-room-order-list` endpoint for room checkout history page
- Get single order details for transferred orders (item-level view via `get-single-order-new`)

### P2 — Phase 3
- Socket-based real-time state sync (replace manual polling/refreshes)
- `get-single-order-new` API integration
- Item Ready / Serve status updates
- Accept / Reject Order

### P3 — Backlog
- Customize link full edit support (currently adds new item)
- `mockTables` replacement in ShiftTableModal, MergeTableModal, TransferFoodModal with real context data
- Out of Menu → Add to Order (CHG-039)
