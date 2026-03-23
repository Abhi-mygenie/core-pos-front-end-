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
- **Order Pipeline**: `orderService.js` (API call with role_name) -> `orderTransform.js` (f_order_status mapping, room filtering, walk-in handling, source detection) -> `OrderContext.jsx` (computed: dineInOrders, takeAwayOrders, deliveryOrders, walkInOrders, orderItemsByTableId)

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
- [x] Loading screen with 7-step progress
- [x] Sidebar & Header wired to real permissions
- [x] Settings Admin Panel — full-width, 3 CRUD UX patterns, mocked saves
- [x] Menu Management Panel — categories, products, filtering, Quick Edit, Drag & Drop
- [x] Dashboard Table Grid — real table data from useTables(), section-grouped
- [x] Order Entry Menu — real products/categories, variation/add-on mapping

### Phase 1 Part B (Completed)
- [x] Order Service + Transform (orderService.js, orderTransform.js)
- [x] f_order_status mapping (1=preparing, 2=ready, 3=cancelled, 5=served, 6=paid, 7=pending, 8=paid via gateway)
- [x] OrderContext.jsx with computed order lists
- [x] DashboardPage — replaced ALL mock order imports

### Phase 1B+ — Unified Grid & Cards (Completed 2026-03-24)
- [x] **Unified Grid View** — All order types (Dine-in, TakeAway, Delivery, Walk-in) in one grid
- [x] **Grid card icons** — ShoppingBag for TakeAway (amber pill), Bike for Delivery (blue pill), no icon for Dine-in
- [x] **View toggle** (Grid/List) available for ALL channel tabs, not just Dine-in
- [x] **Grid filters** — Only Schedule + Confirm in grid view; full filters in list view
- [x] **Unified OrderCard** component — Single card for all 3 order types:
  - Dine-In: MyGenie logo, table label, customer, waiter, item-level actions (Ready/Serve), collapsed served section with Cancel
  - TakeAway: MyGenie logo (own) / S (Swiggy) / Z (Zomato), order #, simple item list, no item actions
  - Delivery: Same as TakeAway + address icon (own) + rider section (aggregator)
- [x] **Responsive grid layout** — `repeat(auto-fill, minmax(360px, 1fr))` for list view
- [x] **Customer data pre-population** — Name + phone populate in cart panel when clicking running order
- [x] **Cart pre-population** — Real prices from order items (not random)
- [x] **Time format** — "X mins" / "X hrs" / "X days" (not "X min ago")
- [x] **No status badges** — Removed "RUNNING", "OCCUPIED", "BILL READY" labels from cards
- [x] **₹ Amount at top** — Prominent in header row
- [x] **Source/waiter** — `order.source` and `order.waiter` mapped in orderTransform

### Key Restaurant Config Fields Discovered
| Field | Value (Mygenie Dev) | Meaning |
|---|---|---|
| `def_ord_status` | 2 (Ready) | Repeat item = qty increment on same row |
| `configuration` | "Simple" | Restaurant config type |
| `print_kot` | "No" | KOT printing disabled |
| `schedule_order` | True | Scheduled orders enabled |

### Known Issues
- Restaurant logo URL broken (backend issue, frontend has graceful fallback)
- Veg/NonVeg classification may have data quality issues in backend API
- f_order_status=8 → "paid via gateway" (NOT "running") — label needs correction
- f_order_status=9 → unknown, needs user clarification
- f_order_status=4 → unknown, needs user clarification

### Remaining Mock Data
- `mockRooms` — Room section placeholder in DashboardPage (Phase 2)
- POST/PUT/DELETE — All CRUD operations mocked with toasts

## Backlog

### P0 — Immediate
- Discuss f_order_status 8 (paid via gateway) and 9 (unknown) with user
- Fix f_order_status=8 label from "running" to correct label

### P1 — Phase 1C
- Map `b_order_status`/`k_order_status` station-level statuses for KDS/Bar
- Delivery order address mapping (structured object display)
- PayLater payment type handling

### P2 — Phase 2
- Actual API POST/PUT/DELETE for Settings and Menu Management CRUD forms
- Room orders mapping (rtype="RM", associated_order_list)
- Add-ons management UI
- Employee Management panel
- Place Order action, Collect Bill/Payment

## Key Documents
- `/app/docs/API_MAPPING.md` — Source of truth for API field -> UI mapping (fully updated with Running Orders)
- `/app/docs/ROLES_DEFINITION.md` — Permission definitions
- `/app/docs/BACKEND_CLARIFICATIONS.md` — Backend team questions, status definitions, confirmed behaviors

## Files of Reference
- `/app/frontend/src/components/cards/OrderCard.jsx` — Unified order card (NEW)
- `/app/frontend/src/pages/DashboardPage.jsx` — Grid/list view, channel filtering
- `/app/frontend/src/api/transforms/orderTransform.js` — Order data transform with source, waiter
- `/app/frontend/src/contexts/OrderContext.jsx` — Order state management
- `/app/frontend/src/components/layout/Header.jsx` — Channel tabs, view toggle, status filters
- `/app/frontend/src/components/cards/TableCard.jsx` — Grid card with orderType icons
- `/app/frontend/src/constants/colors.js` — SOURCE_COLORS for aggregator logos
