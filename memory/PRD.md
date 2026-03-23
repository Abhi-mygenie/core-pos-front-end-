# POS Frontend - Product Requirements Document

## Original Problem Statement
Pull code from default branch https://github.com/Abhi-mygenie/core-pos-front-end-.git and build and run as it is. Incrementally analyze API endpoints and map them to the frontend UI. Build Phase 1 Part A (Login, Profile, Menu Admin, Settings, Tables) and Phase 1 Part B (Running Orders).

**UX Directive**: Admin UIs (Settings, Menu Management) must have fully functional CRUD UX (forms, inputs, dropdowns, toggles) but actual API POST/PUT/DELETE is deferred to Phase 2. Saves are visually mocked with toasts.

## Architecture
- **Frontend**: React (CRA) with Context API for global state
- **Backend**: External API at `preprod.mygenie.online` (direct from frontend via axios)
- **State**: AuthContext, RestaurantContext, MenuContext, TableContext, SettingsContext, **OrderContext**
- **Data Flow**: Login -> LoadingPage (fetches all data in 7 steps) -> stores in Contexts -> Dashboard/Panels
- **Transform Layer**: `/app/frontend/src/api/transforms/` — canonical field name mapping (API -> Frontend schema)
- **Order Pipeline**: `orderService.js` (API call with role_name) -> `orderTransform.js` (f_order_status mapping, room filtering, walk-in handling) -> `OrderContext.jsx` (computed: dineInOrders, takeAwayOrders, deliveryOrders, walkInOrders, orderItemsByTableId)

## Test Accounts
| Restaurant | Email | Orders | Useful For |
|---|---|---|---|
| 18march | owner@18march.com | 0 | Menu/Tables/Settings |
| **Mygenie Dev** | **owner@mygeniedev.com** | **30** | **Phase 1B testing** |
| Palm House | owner@palmhouse.com | 33 (all RM) | Room orders (Phase 2) |
| Serena By Sea | owner@serenabysea.com | 3 (all RM) | Room orders (Phase 2) |

## What's Implemented

### Phase 1 Part A (Completed)
- [x] Login page with credential validation
- [x] Loading screen with 7-step progress (Profile, Categories, Products, Tables, Settings, Popular Items, Running Orders)
- [x] StrictMode double-fetch fix (aborted ref pattern)
- [x] Sidebar & Header wired to real permissions, user profile, restaurant feature toggles
- [x] Settings Admin Panel — full-width, 3 CRUD UX patterns, mocked saves
- [x] Menu Management Panel — categories, products, filtering, Quick Edit, Drag & Drop
- [x] Dashboard Table Grid — real table data from useTables(), section-grouped, unique IDs
- [x] Order Entry Menu — real products/categories from useMenu(), category filtering, search, dietary filters
- [x] Variation/Add-on mapping — productTransform.js outputs canonical {id, name, price, required}
- [x] Currency symbol prop threading

### Phase 1 Part B (Completed)
- [x] Order Service + Transform (orderService.js, orderTransform.js)
- [x] f_order_status mapping (1=preparing, 2=ready, 3=cancelled, 5=served, 6=paid, 7=pending, 8=running)
- [x] OrderContext.jsx with computed: dineInOrders, takeAwayOrders, deliveryOrders, walkInOrders, orderItemsByTableId
- [x] LoadingPage — Running Orders fetch step (role_name: Manager for all except Waiter)
- [x] DashboardPage — replaced ALL mock order imports (mockDeliveryOrders, mockTakeAwayOrders, mockOrderItems)
- [x] DineInCard — reads from OrderContext instead of mockOrderItems
- [x] DeliveryCard — supports canonical field names (orderId, orderNumber, etc.)
- [x] Walk-in orders → virtual table cards (customer name or "WC" label)
- [x] Table status enrichment from order data (occupied→billReady→paid)
- [x] Room order filtering (rtype="RM" orders skipped)
- [x] Empty state handling ("No active orders" for empty channels)

### Known Issues
- Restaurant logo URL broken (backend returns relative filename, correct base URL unknown)
- Veg/NonVeg classification may have data quality issues in backend API
- f_order_status values 4 and 9 definitions pending
- order_type="WalkIn" vs "pos" treatment needs team clarification

### Remaining Mock Data
- `mockRooms` — Room section placeholder in DashboardPage (Phase 2)

## Backlog

### P0 — Phase 1C (Upcoming)
- Map `b_order_status`/`k_order_status` station-level statuses for KDS/Bar
- Delivery order address mapping (structured object)
- PayLater payment type handling

### P1 — API Integration
- Wire Merge/Shift/Transfer Food APIs when provided
- Wire real waiter info (separate API)
- Confirm f_order_status 4 and 9 meanings

### P2 — Phase 2
- Actual API POST/PUT/DELETE for Settings and Menu Management CRUD forms
- Room orders mapping (rtype="RM", associated_order_list)
- Add-ons management UI (deferred until separate API)
- Employee Management panel
- Place Order action, Collect Bill/Payment

## Key Documents
- `/app/docs/API_MAPPING.md` — Source of truth for API field -> UI mapping
- `/app/docs/ROLES_DEFINITION.md` — Permission definitions
- `/app/docs/BACKEND_CLARIFICATIONS.md` — Backend team questions, status definitions, confirmed behaviors
