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

## Phase 4: Reports — IN PROGRESS

### Phase 4A: Order Reports (Next Up — Awaiting API Endpoints)
A dedicated reports page/section for viewing and analyzing orders with filtering, summary totals, and export capabilities.

#### Order Categories / Tabs:
1. **Paid Orders** — Successfully completed & paid orders
   - Filters: Payment Method, Channel, Platform
2. **Canceled Orders** — Orders that were canceled
3. **Credit Orders** — Orders put on credit (deferred payment)
4. **Hold / Pending Payment Orders** — Orders on hold awaiting payment

#### Features:
- **Date Range Filter** — TBD (to be confirmed with user)
- **Summary Totals** — Aggregate numbers per category (e.g., "Total Paid: ₹45,000 | 128 orders")
- **Export** — PDF, Excel/CSV export for all report views
- **Order Details** — Per-order data display (fields TBD, user will share endpoint details)

#### API Endpoints:

**1. Paid Orders:** `GET /api/v2/vendoremployee/paid-order-list`
- Query param: `search_date=YYYY-MM-DD` (optional, defaults to today)
- Auth: Bearer token
- Response: `{ orders: [...] }`
- Order fields per item:
  - `id`, `restaurant_order_id` (display order #)
  - `order_amount`, `restaurant_discount_amount`, `tip_amount`
  - `total_vat_tax_amount`, `total_gst_tax_amount`, `total_service_tax_amount`
  - `payment_method` → values seen: `cash`, `upi`, `card`, `ROOM`, `transferToRoom`
  - `payment_type` → values seen: `prepaid`, `postpaid`
  - `payment_status` → `paid`
  - `user_name`, `waiter_name`, `table_no`
  - `f_name`, `l_name`, `email`, `phone` (customer details, often null)
  - `f_order_status` (always 6 for paid), `order_status` (`delivered`/`deliverd`)
  - `collect_bill` (timestamp), `created_at`, `updated_at`
  - `transaction_reference`, `loyalty_info`, `coupon_info`, `wallet_info`
  - `online_pay[]`, `partial_payments[]`

**2. Canceled Orders:** `GET /api/v2/vendoremployee/cancel-order-list`
- Query param: `search_date=YYYY-MM-DD` (optional, defaults to today)
- Auth: Bearer token
- Response: `{ orders: [...] }` — MUCH richer than paid-order-list (100+ fields vs 32)
- Key extra fields vs paid endpoint:
  - `order_type` → values seen: `pos`, `dinein` (this IS the Channel/Platform field!)
  - `order_details[]` — full item-level data with food details, variations, cancel info
  - `cancellation_reason`, `cancellation_note`, `canceled_by` (all null in test data)
  - `cancel_at` timestamp
  - `order_note`, `parent_order_id`, lifecycle timestamps
  - Per-item: `cancel_type` (e.g., "Post-Serve"), `cancel_by`, `cancel_at`
- Observed data (2026-03-17, 11 orders):
  - order_type: pos (10), dinein (1)
  - payment_method: Merge (6), Cancel (3), cash_on_delivery (2)
  - payment_status: unpaid (9), Merge (2)
  - f_order_status: always 3 (cancelled)
  - 3 of 11 orders had item-level order_details
- NOTE: `order_type` field exists here but NOT in paid-order-list — backend needs to add it there
- CLARIFICATION: `order_type` mixes Channel + Platform values:
  - **Channel values:** `dinein`, takeaway, room (how customer is served)
  - **Platform values:** `pos`, scan_and_order (how order was placed)
  - Backend should ideally separate these into two distinct fields: `channel` + `platform`
**3. Credit Orders:** `GET /api/v2/vendoremployee/paid-in-tab-order-list`
- Query param: `search_date=YYYY-MM-DD` (optional, defaults to today)
- Auth: Bearer token
- Response: `{ orders: [...] }` — **leanest of all** (23 fields)
- Fields: id, restaurant_order_id, order_amount, user_name, restaurant_discount_amount, total_vat/gst/service_tax_amount, f/b/k_order_status, order_status, payment_status, collect_bill, payment_method, transaction_reference, created_at, updated_at, f_name, l_name, email, phone, waiter_name
- Key observations:
  - `payment_method` always `TAB` (all 12 orders)
  - `payment_status` always `paid`, `f_order_status` always 6
  - Has customer contact info: `f_name`, `l_name`, `email`, `phone`
  - **Missing vs paid-order-list:** employee_id, payment_type, tip_amount, table_no, loyalty/coupon/wallet_info, online_pay[], partial_payments[]
  - **No order_type, no order_details[]** — detail drill-down via `employee-order-details` needed
- Observed data (2026-03-17, 12 orders): total ₹6,734, range ₹137–₹1,302
**4. Hold / Pay Later Orders:** `GET /api/v2/vendoremployee/paid-paylater-order-list`
- Query param: `search_date=YYYY-MM-DD` (optional, defaults to today)
- Auth: Bearer token
- Response: `{ orders: [...] }` — 31 fields (nearly identical to paid-order-list)
- Fields: Same as paid-order-list MINUS `online_pay[]`
- ⚠️ **DATA ISSUE:** On 2026-03-17, returns the EXACT same 88 orders as `paid-order-list` (identical IDs, amounts, payment methods). Tested multiple dates — either returns 0 or same as paid.
  - Possible cause: No actual hold/paylater orders exist in test data, OR endpoint is not filtering correctly
  - **Needs backend clarification:** Is this endpoint working as intended? What differentiates a "hold/paylater" order from a "paid" order in the DB?
- Observed: payment_methods (cash:44, upi:20, card:18, ROOM:6), all payment_status: "paid"

#### Observed Data (2026-03-17, 88 paid orders):
- payment_methods: cash (44), upi (20), card (18), ROOM (6)
- payment_types: prepaid, postpaid
- Total amount: ₹50,329.50

#### ⚠️ Missing Fields (Backend team to add):
- **`channel`** — Order channel: Dine-in, Takeaway, Room Order, etc.
- **`platform`** — Order source: POS, Scan & Order, etc.
- Frontend will be built assuming these fields exist. Until backend adds them, filters will show "All" or placeholder values.

#### Paid Orders Filters (4 total):
1. **Payment Method** — `cash`, `upi`, `card`, `ROOM`, `transferToRoom` ✅ Available now
2. **Channel** — Dine-in, Takeaway, Room Order ⏳ Awaiting backend field
3. **Platform** — POS, Scan & Order ⏳ Awaiting backend field
4. **Date** — `search_date=YYYY-MM-DD` ✅ Available now

#### Status: PLANNING (Paid endpoint documented, awaiting Canceled/Credit/Hold endpoints)

---

## Prioritized Backlog

### P0 — Immediate
- Phase 4A: Order Reports (pending API endpoints from user)

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
