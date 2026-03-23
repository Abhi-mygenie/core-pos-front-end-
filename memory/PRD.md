# POS Frontend - Product Requirements Document

## Original Problem Statement
Pull code from default branch https://github.com/Abhi-mygenie/core-pos-front-end-.git and build and run as it is. Incrementally analyze API endpoints and map them to the frontend UI. Build Phase 1 Part A (Login, Profile, Menu Admin, Settings, Tables).

**UX Directive**: Admin UIs (Settings, Menu Management) must have fully functional CRUD UX (forms, inputs, dropdowns, toggles) but actual API POST/PUT/DELETE is deferred to Phase 2. Saves are visually mocked with toasts.

## Architecture
- **Frontend**: React (CRA) with Context API for global state
- **Backend**: External API at `preprod.mygenie.online` (FastAPI proxy at `/app/backend`)
- **State**: AuthContext, RestaurantContext, MenuContext, TableContext, SettingsContext
- **Data Flow**: Login -> LoadingPage (fetches all data) -> stores in Contexts -> Dashboard/Panels read from Contexts
- **Transform Layer**: `/app/frontend/src/api/transforms/` — canonical field name mapping (API -> Frontend schema)

## Credentials
- Email: owner@18march.com / Pass: Qplazm@10

## What's Implemented (Phase 1 Part A)

### Completed
- [x] Login page with credential validation
- [x] Loading screen with progress indicators (Profile, Categories, Products, Tables, Settings, Popular Items)
- [x] StrictMode double-fetch fix (aborted ref pattern)
- [x] Sidebar & Header wired to real permissions, user profile, restaurant feature toggles
- [x] Settings Admin Panel — full-width, 3 CRUD UX patterns (View/Edit, List+Form, Master-Detail), mocked saves
- [x] Menu Management Panel — categories, products, filtering, Quick Edit inline, drag-and-drop reordering
- [x] Dashboard Table Grid — real table data from useTables() context, section-grouped, unique IDs with display labels
- [x] Order Entry Menu — real products/categories from useMenu() context, category filtering, search, dietary filters
- [x] Variation/Add-on mapping — productTransform.js outputs canonical {id, name, price, required} fields
- [x] Currency symbol prop threading through TableCard, TableSection, DashboardPage
- [x] API mapping documentation (`/app/docs/API_MAPPING.md`)

### Known Issues
- Restaurant logo URL broken (backend returns relative filename, correct base URL unknown)
- Veg/NonVeg classification may have data quality issues in backend API

### Mocked Data (Still Active)
- Delivery orders (mockDeliveryOrders)
- TakeAway orders (mockTakeAwayOrders)
- Per-table order details: waiter, customer, items, amount (mockOrderItems)

## Backlog

### P0 — Phase 1 Part B
- Implement `employee-orders-list` API → populate Dashboard Order Cards (blocked on `order_status` mapping clarification)

### P1 — API Integration
- Wire Merge/Shift/Transfer Food APIs when provided by backend team
- Wire real order data to replace mockOrderItems on table cards

### P2 — Phase 2
- Actual API POST/PUT/DELETE for Settings and Menu Management CRUD forms
- Add-ons management UI (deferred until separate API provided)
- Employee Management panel
- Room mapping (`rtype: "RM"`), Place Order action, Collect Bill/Payment

## Key Documents
- `/app/docs/API_MAPPING.md` — Source of truth for API field -> UI element mapping
- `/app/docs/ROLES_DEFINITION.md` — Permission definitions
- `/app/docs/BACKEND_CLARIFICATIONS.md` — Backend team questions and status definitions

## Tech Stack Additions
- `@hello-pangea/dnd` — React drag-and-drop for category/product reordering
