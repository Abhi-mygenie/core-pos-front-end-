# MODULE_DECISIONS_FINAL

## Purpose
This document defines the current module boundaries for the `step2` frontend using only:
- current code in `/app`
- `/app/memory/current-state/*`
- `/app/memory/analysis/*`

## Source set
- Code: `frontend/src/**/*`, `backend/*`
- Current-state: `/app/memory/current-state/MODULE_MAP.md`, `/app/memory/current-state/API_USAGE_MAP.md`, `/app/memory/current-state/CURRENT_ARCHITECTURE.md`, `/app/memory/current-state/PROJECT_INVENTORY.md`
- Analysis: `/app/memory/analysis/DOC_VS_CODE_GAP.md`, `/app/memory/analysis/SCALING_RISK_REGISTER.md`, `/app/memory/analysis/REFACTOR_OPPORTUNITY_MAP.md`, `/app/memory/analysis/OPEN_QUESTIONS_FROM_CODE.md`
- Open-question resolution: `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`

---

## 1. Authentication & Session Module
### Module purpose
Handles login, token persistence, route protection, logout, and permission primitives.
### Module ownership
- Primary: Frontend
- Policy dependencies: Tech / Security
### Related routes/screens
- `/`
- `ProtectedRoute` wrappers
### Related APIs
- `POST /api/v1/auth/vendoremployee/login`
### UI responsibility
- login screen
- login validation/errors
- logout entry
### State responsibility
- `auth_token`
- permissions
- bootstrap user shell
### External dependency responsibility
- login-time FCM token request
### What this module must not do
- Must not absorb restaurant bootstrap or report/order business logic.
### Dependencies on other modules
- Firebase helper
- Loading/Bootstrap module
### Common bug/change impact areas
- 401 redirect
- remember-me state
- permission visibility
- logout clearing
### Future change rules
- Any auth change must review login, axios interceptor, ProtectedRoute, logout, and loading bootstrap.
### Open decisions, if any
- Long-term token/session strategy remains unresolved.

---

## 2. Loading & Initial Data Bootstrap Module
### Module purpose
Hydrates core state after login before dashboard entry.
### Module ownership
- Primary: Frontend
- Data contract dependencies: API / Tech
### Related routes/screens
- `/loading`
### Related APIs
- profile
- categories
- products
- tables
- cancellation reasons
- popular food
- running orders
- station-order-list
### UI responsibility
- startup checklist
- progress display
- retry failed loaders
- redirect on success
### State responsibility
- seeds Auth, Restaurant, Menu, Table, Settings, Order, Station contexts
### External dependency responsibility
- CRM restaurant-id initialization
- station bootstrap from products
### What this module must not do
- Must not become general dashboard runtime logic.
### Dependencies on other modules
- Authentication first
- seeds most runtime modules
### Common bug/change impact areas
- startup stalls
- partial load states
- role scoping for running orders
- station initialization
### Future change rules
- Do not reorder/separate loaders without explicit dependency analysis.
### Open decisions, if any
- Sequential vs partial parallel loading remains unresolved.

---

## 3. Dashboard / POS Workspace Module
### Module purpose
Renders and orchestrates the main operational POS screen.
### Module ownership
- Primary: Frontend
- Policy dependency: Product / Tech
### Related routes/screens
- `/dashboard`
### Related APIs
- direct order status update
- direct food status update
- confirm/served/prepaid completion paths
### UI responsibility
- sidebar/header
- cards/sections/columns
- search/filter/view mode
- order entry opening
- room check-in opening
- station panel inclusion
### State responsibility
- heavy page-local orchestration state
- consumes Restaurant, Table, Order, Auth, Settings runtime state
### External dependency responsibility
- socket updates
- localStorage-driven terminal behavior
### What this module must not do
- Must not become an unbounded transport/business-rule sink.
### Dependencies on other modules
- Loading/bootstrap
- Order Entry
- Rooms
- Station
- Notifications
- Socket runtime
### Common bug/change impact areas
- card clicks vs action buttons
- order-taking toggle behavior
- view mode locks/defaults
- room card totals
- channel/status rendering
- served/cancelled item visibility in card summaries
### Future change rules
- Any change requires review of filters, permissions, localStorage keys, and socket effects.
- Card-level display changes may affect kitchen/cashier/waiter visibility expectations even when no payload math changes.
### Open decisions, if any
- final table-status precedence
- local config governance
- future module scope behind sidebar placeholders

---

## 4. Order Entry / Cart / Payment Workflow Module
### Module purpose
Owns transactional order creation, update, payment, cancellation, transfer, split, and print initiation flows.
### Module ownership
- Primary: Frontend
- Policy dependencies: Product / API / Business
### Related routes/screens
- embedded inside dashboard
### Related APIs
- place order
- update order
- cancel item/order
- transfer food
- merge order
- shift table
- bill payment
- print order
- split order
- room transfer
- add custom item
### UI responsibility
- carting
- customer/address
- notes/customization
- payment panel
- split bill launch
- print actions
### State responsibility
- cart items
- placed/unplaced delta handling
- customer/address selections
- payment-screen state
- notes/modal state
### External dependency responsibility
- CRM
- Google Maps
- print backend entry point
### What this module must not do
- Must not be treated as safe place for casual financial rule changes.
### Dependencies on other modules
- Menu
- Orders
- Tables
- Settings
- Restaurant
- CRM
- Rooms
### Common bug/change impact areas
- totals/tax/SC/discount interactions
- delivery address handling
- placed vs unplaced updates
- print parity
- room transfer behavior
### Future change rules
- Every change must identify whether it affects place-order, update-order, collect-bill, prepaid flow, split, room, or print behavior.
### Open decisions, if any
- official payment surface policy
- room billing/print lifecycle policy

---

## 5. Rooms / Room Check-In / Room Transfer Module
### Module purpose
Supports room occupancy, room check-in, room orders, and room-specific payment/print behavior.
### Module ownership
- Primary: Frontend
- Policy dependencies: Product / API / Business
### Related routes/screens
- dashboard room cards
- `RoomCheckInModal`
- room-related order-entry/payment flows
### Related APIs
- room check-in
- order shifted room
- room-related print/billing payloads
### UI responsibility
- available/occupied room opening behavior
- room check-in form
- room card totals
- advance-payment capture rules in room check-in flow
### State responsibility
- room entries in `TableContext`
- room orders in `OrderContext`
- room financial rendering through order data + transforms
- room check-in local form state including advance payment method when applicable
### External dependency responsibility
- backend room payloads and room workflow contract
### What this module must not do
- Must not be changed as if it were only a normal table variant.
### Dependencies on other modules
- Dashboard
- Order Entry
- Tables runtime
- Orders runtime
- Restaurant profile/transform rules
### Common bug/change impact areas
- room card total calculation
- room check-in payload shape
- room billing stack
- associated order handling
- room print output
- advance amount vs payment-method validation rules
### Future change rules
- Any room change requires impact review across dashboard, payment, transforms, print, and room check-in payload rules.
### Open decisions, if any
- lifecycle ownership of room billing/print semantics remains unresolved.

---

## 6. Customer / CRM Integration Module
### Module purpose
Supports customer search/lookup/create/update and delivery-address management.
### Module ownership
- Primary: Frontend
- Capability policy dependency: Product / API / Business
### Related routes/screens
- embedded in order entry
### Related APIs
- `/pos/customers`
- `/pos/customer-lookup`
- `/pos/address-lookup`
- `/pos/customers/{id}/addresses`
### UI responsibility
- customer modal
- address picker
- address form
### State responsibility
- selected customer
- delivery addresses
- selected address
### External dependency responsibility
- CRM base URL + restaurant-key map
- Google Maps Places for address entry
### What this module must not do
- Must not assume CRM is mandatory in product policy.
### Dependencies on other modules
- Loading/profile for CRM restaurant id
- Order Entry as UX surface
### Common bug/change impact areas
- missing CRM key per restaurant
- soft-fail lookup behavior
- local-only customer fallback
- address persistence/printing expectations
### Future change rules
- Any CRM UX tightening must explicitly define missing-config behavior.
### Open decisions, if any
- CRM required/optional/tiered capability remains unresolved.

---

## 7. Realtime Socket Module
### Module purpose
Maintains live updates for orders, tables, and engage locks.
### Module ownership
- Primary: Frontend
- Contract dependency: API / Tech / Security
### Related routes/screens
- cross-cutting; mainly dashboard runtime
### Related APIs
- socket server transport
- single-order fetch fallback in some handlers
### UI responsibility
- indirect live card updates and lock state
### State responsibility
- connection/subscription state
- routing event payloads into OrderContext/TableContext
### External dependency responsibility
- socket server URL
- backend event contract
### What this module must not do
- Must not be refactored based on comments alone.
### Dependencies on other modules
- Auth
- Restaurant
- OrderContext
- TableContext
- Dashboard
### Common bug/change impact areas
- subscription timing
- engage locks
- table-order sync conflicts
- comment/code drift
### Future change rules
- Socket changes require channel/event inventory and downstream state review.
### Open decisions, if any
- table-status precedence
- socket auth/security intent

---

## 8. Notifications & Firebase Module
### Module purpose
Handles push notification setup, foreground/background delivery, and sound behavior.
### Module ownership
- Primary: Frontend
- Strategy dependency: Tech
### Related routes/screens
- cross-cutting; dashboard banner/sidebar simulation behavior
### Related APIs
- Firebase browser messaging APIs
### UI responsibility
- banner/ringer behavior
- simulation/testing surfaces
### State responsibility
- notification list
- sound-enabled flag
### External dependency responsibility
- Firebase env config
- service worker registration
### What this module must not do
- Must not be documented as socket-only.
### Dependencies on other modules
- login/auth
- dashboard sidebar/banner
### Common bug/change impact areas
- permission denial handling
- service worker setup
- sound toggle behavior
### Future change rules
- Preserve foreground/background distinction.
### Open decisions, if any
- long-term Firebase version strategy remains unresolved.

---

## 9. Station / Kitchen Panel Module
### Module purpose
Shows station-wise aggregated kitchen workload and refresh behavior.
### Module ownership
- Primary: Frontend
- Operational UX dependency: Product / Tech
### Related routes/screens
- embedded on dashboard
- configured from status config page
### Related APIs
- `/api/v1/vendoremployee/station-order-list`
### UI responsibility
- station panel rendering
- display mode selection
- station grouping
- density-aware item detail rendering
### State responsibility
- available stations
- enabled stations
- station view enabled flag
- display mode
- aggregated station data
### External dependency responsibility
- station API
- localStorage station config
### What this module must not do
- Must not equate station fetch failure with confirmed empty state.
### Dependencies on other modules
- Menu products/categories
- Loading bootstrap
- Status config
- socket refresh helper
### Common bug/change impact areas
- empty panel confusion
- stale data after settings save
- category mapping
- hardcoded endpoint risk
- item aggregation collisions when variants/add-ons/notes differ
### Future change rules
- Review service soft-failure behavior, config sync, bootstrap, and socket refresh together.
- Treat variant/add-on/note-aware station grouping as current implementation truth.
### Open decisions, if any
- failure UX policy remains unresolved.

---

## 10. Reports / Audit / Summary Module
### Module purpose
Provides historical reporting and summary dashboards using multiple report endpoints.
### Module ownership
- Primary: Frontend
- Strategy dependency: Tech / API / Business
### Related routes/screens
- `/reports/audit`
- `/reports/summary`
### Related APIs
- order logs
- paid/cancelled/credit/hold reports
- aggregator reports
- order detail reports
- daily sales report
- running order reconciliation
### UI responsibility
- tabs, filters, export, summaries, detail sheets
### State responsibility
- mostly page-local report state
### External dependency responsibility
- report endpoint shape and business-day semantics
### What this module must not do
- Must not be treated as display-only; it carries business-day aggregation logic.
### Dependencies on other modules
- Restaurant/profile schedules/currency/features
- shared layout/report components
### Common bug/change impact areas
- business-day filtering
- reconciliation logic
- duplicate/merged counts
- payment bucket interpretation
### Future change rules
- Changes must identify whether they alter fetching, normalization, business-day policy, or presentation only.
### Open decisions, if any
- long-term aggregation ownership remains unresolved.

---

## 11. Visibility Settings / Device Configuration Module
### Module purpose
Controls device-local dashboard visibility, station display, view modes, defaults, layout, and order-taking behavior.
### Module ownership
- Primary: Frontend
- Governance dependency: Product / Business / Tech
### Related routes/screens
- `/visibility/status-config`
### Related APIs
- indirect station refresh only
### UI responsibility
- settings cards/toggles for statuses, channels, stations, layouts, view modes, and order taking
### State responsibility
- local page state persisted to localStorage
- station-context sync on save
### External dependency responsibility
- localStorage only in current implementation
### What this module must not do
- Must not be presented as centrally governed admin policy today.
### Dependencies on other modules
- Dashboard
- Station module
- Sidebar/Header behavior
### Common bug/change impact areas
- settings not applying until reload
- cross-tab sync drift
- default-view behavior
- order-taking restrictions
### Future change rules
- Any persistence-scope change requires migration planning from device-local state.
### Open decisions, if any
- whether these should become auditable administrative controls remains unresolved.

---

## 12. Menu / Category / Product Module
### Module purpose
Maintains catalog data used for ordering, station extraction, and menu utilities.
### Module ownership
- Primary: Frontend
- Data contract dependency: API
### Related routes/screens
- no direct route module; used in order entry and menu panel
### Related APIs
- categories
- products
- popular food
### UI responsibility
- category panel
- item pills/list
- menu panel surfaces
### State responsibility
- categories
- products
- popular food
- lookup helpers
### External dependency responsibility
- backend catalog endpoints
### What this module must not do
- Must not duplicate financial settlement ownership beyond catalog facts.
### Dependencies on other modules
- Loading bootstrap
- Order Entry
- Station module
### Common bug/change impact areas
- tax propagation into cart
- station extraction
- popular-item behavior
### Future change rules
- Product shape changes must be validated through cart and station flows.
### Open decisions, if any
- none beyond general API evolution.

---

## 13. Tables & Orders Runtime State Module
### Module purpose
Provides live operational representation of tables, rooms, and running orders.
### Module ownership
- Primary: Frontend
- Contract dependency: API / Realtime
### Related routes/screens
- shared runtime module for dashboard/order entry/rooms
### Related APIs
- tables list
- running orders list
- socket mutation flows
### UI responsibility
- indirect via consuming modules
### State responsibility
- unified tables array
- unified orders array
- engage lock sets
- wait/helper selectors
### External dependency responsibility
- backend/order/socket contract
### What this module must not do
- Must not absorb unrelated UI concerns.
### Dependencies on other modules
- Loading bootstrap
- Dashboard
- Order Entry
- Rooms
- Socket handlers
### Common bug/change impact areas
- stale locks
- wait helper timeouts
- order/table lookup assumptions
### Future change rules
- Mutation-helper changes require review against socket handlers and dashboard behavior.
### Open decisions, if any
- durable recovery of engage locks is unresolved.

---

## 14. Printing / Bill / KOT Module
### Module purpose
Prepares and sends print payloads for KOT and bill flows.
### Module ownership
- Primary: Frontend
- Policy dependencies: Product / API / Business
### Related routes/screens
- embedded from dashboard cards and order/payment flows
### Related APIs
- `POST /api/v1/vendoremployee/order-temp-store`
### UI responsibility
- manual print actions
- print availability in relevant flows
### State responsibility
- relies on live order/payment state rather than separate store ownership
### External dependency responsibility
- backend print endpoint
### What this module must not do
- Must not recompute financials casually without collect-bill parity review.
### Dependencies on other modules
- Order Entry
- Dashboard
- Restaurant settings
- Order transforms
### Common bug/change impact areas
- bill values drifting from payment screen
- room print semantics
- delivery address print data
- prepaid/postpaid auto-print differences
### Future change rules
- Print changes require review of manual print, auto-print, room print, and fallback payload behavior together.
### Open decisions, if any
- room billing/print policy remains unresolved.

---

## Final module usage rule
Before implementing any change, map the request to one or more modules in this document and then inspect:
- affected route/page
- affected context(s)
- affected service(s)
- affected transform(s)
- affected localStorage keys
- affected print/socket/payment/room paths if applicable
