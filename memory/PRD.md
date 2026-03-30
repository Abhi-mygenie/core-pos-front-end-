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

## Phase 4: Reports — PLANNING COMPLETE, READY TO BUILD

### Phase 4A: Order Reports
A dedicated reports page for viewing and analyzing orders with filtering, summary totals, and export.

#### Order Status Tabs (7):
1. **Paid** — Successfully paid orders
2. **Cancelled** — Cancelled orders (excluding merged)
3. **Credit** — Orders put on credit (TAB)
4. **On Hold** — Pay later + failed online orders
5. **Merged** — Orders merged into another order
6. **Room Transfer** — Orders transferred to a room
7. **Aggregator** — Orders from third-party platforms (UrbanPiper)

#### Filters (apply to active tab):
- **Payment Method** (dynamic): Cash, Card, UPI, TAB Cash, TAB Card, TAB UPI, Online UPI, Online Card, + dynamic
- **Channel:** Dine-in, Delivery, Takeaway, Rooms, Aggregator — DISABLED until backend adds field (GAP-001)
- **Platform:** POS, Web (Scan & Order) — DISABLED until backend adds field (GAP-002)
- **Payment Type:** Prepaid, Postpaid
- **Date Picker:** Today (default), custom date

#### Features:
- **Summary Bar** — Total orders count, total amount (₹), avg order value
- **Order Table** — #, Order ID, Customer, Waiter, Table/Room, Amount, Tax, Discount, Payment Method, Time
- **Detail Drill-down** — Click row → side sheet with full item-level view via `employee-order-details`
- **Export** — PDF, Excel/CSV of current filtered view
- **Empty/Loading States** — Skeleton loaders, "No orders found" with icon
- **Filter Tags** — Active filters shown as removable tags below filter bar

---

### UX SPECIFICATION

#### Page Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ SIDEBAR │            ORDER REPORTS                          │
│ (dark)  │                                                   │
│         │  ┌──────────────────────────────────────────────┐ │
│ [Dash]  │  │  ORDER REPORTS          [Date: Today ▼]     │ │
│ [Report]│  │                     [⬇ PDF] [⬇ CSV/Excel]   │ │
│  ←active│  └──────────────────────────────────────────────┘ │
│         │                                                   │
│         │  ── Paid ── Cancel ── Credit ── Hold ──           │
│         │  ── Merged ── Room Transfer ── Aggregator ──      │
│         │  (underline tabs, color-coded active state)       │
│         │                                                   │
│         │  ┌──────────────────────────────────────────────┐ │
│         │  │ FILTERS ROW:                                 │ │
│         │  │ [Payment Method ▼] [Channel ▼*] [Platform ▼*]│ │
│         │  │ [Payment Type ▼]                              │ │
│         │  │ *disabled with "Coming soon" tooltip          │ │
│         │  │                                               │ │
│         │  │ Active: [Cash ✕] [UPI ✕]  ← removable tags   │ │
│         │  └──────────────────────────────────────────────┘ │
│         │                                                   │
│         │  ┌──────────────────────────────────────────────┐ │
│         │  │ SUMMARY CARDS (3 grid):                      │ │
│         │  │ ┌──────────┐ ┌──────────┐ ┌──────────┐      │ │
│         │  │ │Total Ord │ │Total Amt │ │Avg Order │      │ │
│         │  │ │   88     │ │ ₹50,329  │ │  ₹571    │      │ │
│         │  │ └──────────┘ └──────────┘ └──────────┘      │ │
│         │  └──────────────────────────────────────────────┘ │
│         │                                                   │
│         │  ┌──────────────────────────────────────────────┐ │
│         │  │ ORDER TABLE (dense, sortable):               │ │
│         │  │ #│Order │Customer│Waiter│Table│ Amt │Method  │ │
│         │  │ 1│11419 │Table 5 │Cntr  │ T5  │₹462 │card    │ │
│         │  │ 2│11420 │Daisy   │Cntr  │ C-08│₹210 │cash    │ │
│         │  │ ... click any row → side sheet opens ────►   │ │
│         │  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Side Sheet (on row click → calls employee-order-details):
```
┌──────────────────────────┐
│  Order #011419      [✕]  │
│  ■ PAID (blue badge)     │
│─────────────────────────│
│  Customer: Table 5       │
│  Waiter: Counter         │
│  Table: T5 (area: T)     │
│  Date: 17 Mar, 09:52     │
│  Payment: card           │
│  Ref: 132532421          │
│─────────────────────────│
│  ITEMS:                  │
│  1× Kombucha (plain) ₹100│
│     └ Choice: Oat       │
│  1× Iced Latte      ₹200│
│  1× Toast            ₹150│
│  1× Vegan Chai       ₹100│
│─────────────────────────│
│  Subtotal        ₹550   │
│  Discount       -₹110   │
│  GST              ₹22   │
│  ─────────────────────   │
│  TOTAL           ₹462   │
└──────────────────────────┘
```

#### Tab-Specific UX:
| Tab | Color | Special Treatment |
|---|---|---|
| Paid | Blue (bg-blue-600) | Standard. Channel/Platform filters disabled |
| Cancelled | Red (bg-red-600) | Sheet shows: cancel reason, cancel type (Pre/Post-Serve), cancelled by in red alert box |
| Credit | Purple (bg-purple-600) | Table prioritizes customer Name + Phone (monospace). For follow-up |
| On Hold | Amber (bg-amber-500) | Info banner: "Displaying provisional hold data" (backend bug) |
| Merged | Teal (bg-teal-600) | Source: cancel-order-list filtered by payment_method=Merge |
| Room Transfer | Indigo (bg-indigo-600) | Source: paid-order-list filtered by payment_method in [ROOM, transferToRoom] |
| Aggregator | Orange (bg-orange-500) | Zomato/Swiggy CSS badges. Sheet: rider info + delivery address |

#### Filter Availability Per Tab:
| Filter | Paid | Cancel | Credit | Hold | Merged | Room Transfer | Aggregator |
|---|---|---|---|---|---|---|---|
| Date | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Payment Method | ✅ | ✅ | ✅ (always TAB) | ✅ | ✅ (always Merge) | ✅ (always ROOM) | ✅ |
| Channel | DISABLED | PARTIAL | DISABLED | DISABLED | PARTIAL | DISABLED | ✅ (delivery) |
| Platform | DISABLED | PARTIAL | DISABLED | DISABLED | PARTIAL | DISABLED | ✅ (zomato/swiggy) |
| Payment Type | ✅ | ✅ | HIDDEN | ✅ | ✅ | ✅ | ✅ |

#### Design Specs (from design_guidelines.json):
- **Theme:** Swiss & High-Contrast Light (white content area against dark sidebar)
- **Typography:** Monospace for all numbers/currency/IDs/dates/phones (JetBrains Mono or system monospace)
- **Tabs:** Underline style (not pills). border-b-2 active state
- **Table:** Dense rows, hover:bg-zinc-50, cursor-pointer for drill-down
- **Filters:** Flat inputs, rounded-sm, disabled = opacity-50 + "Coming soon" tooltip
- **Summary Cards:** Flat white bg, sharp 1px border, no shadows
- **Sheet:** Glass-morphism backdrop-blur-xl bg-white/80 overlay
- **Empty State:** Centered, large icon, "No orders found" + subtitle

---

### IMPLEMENTATION PLAN (10 Steps)

#### Step 1: Foundation — Route + Page Shell + Sidebar
**Files to create/modify:**
- `App.js` — Add `/reports` route
- `pages/ReportsPage.jsx` — New page shell
- `pages/index.js` — Export ReportsPage
- `components/layout/Sidebar.jsx` — Wire "Reports" click → navigate to `/reports`
**Test:** Click Reports in sidebar → reports page loads

#### Step 2: API Service + Transform Layer
**Files to create:**
- `api/services/reportService.js` — 6 API functions (getPaidOrders, getCancelledOrders, getCreditOrders, getHoldOrders, getAggregatorOrders, getOrderDetails)
- `api/transforms/reportTransform.js` — Normalize 5 different response shapes into common schema
- `api/constants.js` — Add report endpoint constants
**Common schema per order:**
```js
{ id, orderId, amount, customer, waiter, table, paymentMethod, paymentType, 
  paymentStatus, tax: { gst, vat, service }, discount, createdAt, collectedAt,
  channel, platform, orderType, transactionRef, customerContact: { name, phone, email } }
```
**Test:** `curl` each endpoint, verify transform output

#### Step 3: Tab Bar + Date Picker
**Files:**
- `components/reports/ReportTabs.jsx` — 7 tabs with underline style + color coding
- `components/reports/DatePicker.jsx` — Date selector (today default, custom)
- Wire into `ReportsPage.jsx`
**Test:** Tabs switch, date changes, no API calls yet (just state)

#### Step 4: Summary Bar
**Files:**
- `components/reports/SummaryBar.jsx` — 3 cards (Total Orders, Total Amount, Avg Order)
**Test:** Renders with mock data, numbers formatted correctly

#### Step 5: Order Table + Data Fetching
**Files:**
- `components/reports/OrderTable.jsx` — Dense Shadcn table with all columns
- Wire API calls: tab switch + date change → fetch → display
- Handle missing columns (show "—" for credit tab's missing table_no etc.)
- Sortable columns (amount, time)
**Test:** Switch to Paid tab → 88 orders load for 2026-03-17. Cancelled tab → 11 orders

#### Step 6: Filters
**Files:**
- `components/reports/FilterBar.jsx` — Payment Method, Channel, Platform, Payment Type dropdowns
- `components/reports/FilterTags.jsx` — Active filter removable tags
- Channel/Platform dropdowns disabled with tooltip
- Dynamic payment method options (extracted from current data)
**Test:** Filter Paid by "cash" → 44 orders, summary updates

#### Step 7: Side Sheet — Order Detail Drill-down
**Files:**
- `components/reports/OrderDetailSheet.jsx` — Glass-morphism side panel
- Click row → calls `employee-order-details?order_id=X` → renders items, totals
- Tab-specific sections:
  - Cancelled: red alert box (cancel reason, type, by)
  - Credit: customer phone/email prominent
  - Aggregator: platform badge, rider info, delivery address
**Test:** Click order row → sheet opens with correct items

#### Step 8: Export
**Files:**
- `components/reports/ExportButtons.jsx` — PDF + CSV/Excel buttons
- Use browser-side libraries (jspdf + jspdf-autotable for PDF, xlsx/csv for Excel)
**Test:** Export Paid tab → PDF/CSV downloaded with correct data

#### Step 9: Empty + Loading States
**Files:**
- Update `OrderTable.jsx` with skeleton loader
- Empty state component with icon + message
- Hold tab info banner
**Test:** Visual verification

#### Step 10: Polish + Merged/Room Transfer Logic
- Merged tab: filter cancel-order-list where payment_method === "Merge"
- Room Transfer tab: filter paid-order-list where payment_method in ["ROOM", "transferToRoom"]
- Paid tab: EXCLUDE Room Transfer orders from paid total
- Aggregator Zomato/Swiggy badges
- Error handling for failed API calls
**Test:** All 7 tabs show correct data with correct filters

---

### New Files Created (Phase 4A):
```
/app/frontend/src/
├── pages/ReportsPage.jsx                    (NEW)
├── api/services/reportService.js            (NEW)
├── api/transforms/reportTransform.js        (NEW)
├── components/reports/
│   ├── ReportTabs.jsx                       (NEW)
│   ├── DatePicker.jsx                       (NEW)
│   ├── SummaryBar.jsx                       (NEW)
│   ├── OrderTable.jsx                       (NEW)
│   ├── FilterBar.jsx                        (NEW)
│   ├── FilterTags.jsx                       (NEW)
│   ├── OrderDetailSheet.jsx                 (NEW)
│   └── ExportButtons.jsx                    (NEW)
```

### Modified Files:
```
├── App.js                                   (ADD /reports route)
├── pages/index.js                           (ADD ReportsPage export)
├── api/constants.js                         (ADD report endpoints)
├── components/layout/Sidebar.jsx            (WIRE Reports navigation)
```

---

### Tab → API Data Source Mapping:

| Tab | Primary API | Filter Logic |
|---|---|---|
| Paid | `paid-order-list` | Exclude `payment_method in ["ROOM","transferToRoom"]` |
| Cancelled | `cancel-order-list` | Exclude `payment_method === "Merge"` |
| Credit | `paid-in-tab-order-list` | Direct |
| On Hold | `paid-paylater-order-list` | Direct (⚠️ data issue — ISSUE-001) |
| Merged | `cancel-order-list` | `payment_method === "Merge"` |
| Room Transfer | `paid-order-list` | `payment_method in ["ROOM","transferToRoom"]` |
| Aggregator | `urbanpiper/get-complete-order-list` | Direct |

#### API Endpoints:

| # | Endpoint | Method | Fields | Notes |
|---|---|---|---|---|
| 1 | `/api/v2/vendoremployee/paid-order-list` | GET | 32 | Missing order_type |
| 2 | `/api/v2/vendoremployee/cancel-order-list` | GET | 100+ | Richest, has order_type + order_details |
| 3 | `/api/v2/vendoremployee/paid-in-tab-order-list` | GET | 23 | Leanest, TAB only |
| 4 | `/api/v2/vendoremployee/paid-paylater-order-list` | GET | 31 | ⚠️ Returns same as paid |
| 5 | `/api/v1/vendoremployee/urbanpiper/get-complete-order-list` | POST | 70+ nested | Zomato/Swiggy via UrbanPiper |
| 6 | `/api/v1/vendoremployee/order-shifted-room` | POST | N/A | Action only (Phase 2B) |
| 7 | `/api/v2/vendoremployee/employee-order-details?order_id=X` | GET | 108+ | Detail drill-down |

All list endpoints accept `search_date=YYYY-MM-DD` (defaults today). Aggregator uses POST body.

#### Field Availability Matrix:

| Field | Paid(32) | Cancel(100+) | Credit(23) | Hold(31) | Detail(108+) |
|---|---|---|---|---|---|
| order_type | ❌ | ✅ | ❌ | ❌ | ✅ |
| order_details[] | ❌ | ✅ | ❌ | ❌ | ✅ |
| table_no | ✅ | ✅ | ❌ | ✅ | ✅ |
| payment_type | ✅ | ✅ | ❌ | ✅ | ✅ |
| tip_amount | ✅ | ✅ | ❌ | ✅ | ✅ |
| employee_id | ✅ | ✅ | ❌ | ✅ | ✅ |
| customer info | ✅ | ✅ | ✅ | ✅ | ✅ |
| cancellation fields | ❌ | ✅ | ❌ | ❌ | ✅ |
| restaurant_table_area | ❌ | ❌ | ❌ | ❌ | ✅ |

#### Backend Clarifications (see ORDER_REPORT_CLARIFICATIONS.md for full details):
1. **GAP-001:** Add `channel` field to paid, credit, hold list endpoints
2. **GAP-002:** Add `platform` field to paid, credit, hold list endpoints
3. **GAP-003:** Split `order_type` into separate `channel` + `platform`
4. **ISSUE-001:** `paid-paylater-order-list` returns identical data to `paid-order-list`
5. **INCONSISTENCY-003:** Enrich `paid-in-tab-order-list` with table_no, employee_id, payment_type
6. Aggregator response has different nested structure (needs separate transform)

#### Test Accounts:
| Account | Paid | Cancel | Credit | Hold | Aggregator |
|---|---|---|---|---|---|
| owner@palmhouse.com / Qplazm@10 | ✅ 88/day | ✅ 11/day | ✅ 12/day | ⚠️ same as paid | ❌ 0 |
| owner@kunafamahal.com / Qplazm@10 | ? | ? | ? | ? | ✅ 6/day |

#### Reference Documents:
- `/app/docs/ORDER_REPORT_CLARIFICATIONS.md` — Full backend gaps & action items
- `/app/design_guidelines.json` — Swiss & High-Contrast design specs

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
