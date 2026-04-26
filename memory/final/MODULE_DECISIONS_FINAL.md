# MODULE_DECISIONS_FINAL

## Purpose
This document defines the current module boundaries for the `step2` frontend. It is meant to be practical for bug-fixing, scaling, onboarding, and implementation planning.

## Ownership legend used here
- **Module ownership** means architectural responsibility, not org chart certainty.
- Recommended owners are expressed as: Frontend / Tech / Product / API depending on unresolved policy areas.

## Source set
- Code: `frontend/src/**/*`
- Current-state: `/app/memory/current-state/MODULE_MAP.md`, `/app/memory/current-state/API_USAGE_MAP.md`
- Analysis: `/app/memory/analysis/*`
- Open-question resolution: `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`

---

## 1. Authentication & Session Module

### Module purpose
Handle login, token persistence, route protection, logout, and permission primitives.

### Module ownership
- Primary: Frontend
- Policy dependencies: Tech / Security

### Related routes/screens
- `/`
- `ProtectedRoute` wrappers in `App.js`

### Related APIs
- `POST /api/v1/auth/vendoremployee/login`

### UI responsibility
- login form
- login error display
- route guard behavior
- logout trigger

### State responsibility
- `auth_token`
- auth loading state
- `permissions`
- current `user` after bootstrap

### External dependency responsibility
- FCM token request before login

### What this module must not do
- It must not own restaurant bootstrap data beyond token/permissions/user shell.
- It must not become the place for report/order/dashboard business logic.

### Dependencies on other modules
- Depends on Firebase notification helper for login-time token request
- Feeds Loading/Bootstrap module

### Common bug/change impact areas
- 401 redirects
- remember-me behavior
- permissions not reflected in UI
- logout not fully clearing state

### Future change rules
- Keep token semantics compatible unless session architecture is intentionally redesigned.
- Any auth change must include ProtectedRoute, axios interceptor, logout, and Loading bootstrap review.

### Open decisions, if any
- Token storage strategy and refresh flow remain unresolved long-term architecture items.

---

## 2. Loading & Initial Data Bootstrap Module

### Module purpose
Hydrate core app state after login before dashboard entry.

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
- progress UI
- retry failed loaders
- redirect to dashboard on success

### State responsibility
- pushes initial data into Auth, Restaurant, Menu, Table, Settings, Order, Station contexts

### External dependency responsibility
- CRM restaurant-id initialization
- station initialization dependent on product catalog

### What this module must not do
- It must not absorb ongoing dashboard behavior.
- It must not silently change bootstrap order without verifying context dependencies.

### Dependencies on other modules
- Requires Authentication module
- Seeds nearly all runtime modules

### Common bug/change impact areas
- startup stalls
- partial loads
- stale role scoping for running orders
- station panel not populating after bootstrap

### Future change rules
- Any parallelization or ordering change requires explicit dependency mapping.
- Bootstrap changes must preserve retry and visible failure reporting.

### Open decisions, if any
- Whether loading should remain sequential or partially parallelized is still architectural, not settled.

---

## 3. Dashboard / POS Workspace Module

### Module purpose
Render and orchestrate the main operational POS screen.

### Module ownership
- Primary: Frontend
- Heavy policy dependency: Product / Tech

### Related routes/screens
- `/dashboard`

### Related APIs
- direct order status updates
- direct food status updates
- service-layer confirm/served/prepaid completion paths

### UI responsibility
- sidebar/header layout
- channel vs status rendering
- table/room/order cards
- search/filter/view mode behavior
- entry points to order entry and room check-in
- station panel inclusion
- refresh behavior

### State responsibility
- page-local filters/search/modals/layout state
- consumption of Restaurant, Table, Order, Auth, Settings, Socket states

### External dependency responsibility
- relies on socket connectivity and localStorage-driven device settings

### What this module must not do
- It must not become a hidden service layer for unrelated modules.
- It must not define canonical API contracts by itself.

### Dependencies on other modules
- Loading/bootstrap
- Order Entry
- Room module
- Station module
- Notifications
- Socket runtime state

### Common bug/change impact areas
- card click vs action button behavior
- order-taking lockouts
- view mode / default mode / localStorage drift
- room card totals
- channel/status rendering regressions

### Future change rules
- Any change here requires explicit review of filters, locks, localStorage keys, permissions, and socket effects.
- New dashboard features should prefer extraction over added inline orchestration.

### Open decisions, if any
- Final authority for table status behavior
- governance of local config settings
- which sidebar sections are real future modules

---

## 4. Order Entry / Cart / Payment Workflow Module

### Module purpose
Own transactional order creation, update, payment, cancellation, transfer, split, and print initiation flows.

### Module ownership
- Primary: Frontend
- Policy dependencies: Product / API / Business

### Related routes/screens
- Embedded inside dashboard

### Related APIs
- place order
- update order
- cancel item/order
- transfer food
- merge order
- shift table/room
- bill payment
- print order
- room transfer
- split order
- custom item add

### UI responsibility
- cart management
- customer/address selection
- notes/customization modals
- payment panel
- split bill launch
- print actions

### State responsibility
- cart items
- placed/unplaced deltas
- payment-screen state
- selected customer/address
- order notes
- modal stack

### External dependency responsibility
- CRM customer/address lookup
- Google Maps address autocomplete
- print backend entry point

### What this module must not do
- It must not be treated as a safe place for casual financial rule edits.
- It must not define new payload shapes ad hoc outside transforms/service patterns.

### Dependencies on other modules
- Menu
- Orders
- Tables
- Settings
- Restaurant profile/settings
- CRM
- Room module

### Common bug/change impact areas
- cart totals
- tax/service charge/discount interactions
- placed vs unplaced item deltas
- auto-print/manual print differences
- delivery address handling
- room transfer and room bill behavior

### Future change rules
- Every change must identify whether it affects:
  - place-order
  - update-order
  - collect-bill
  - prepaid place+pay
  - room transfer
  - print payloads
  - split bill
- Financial changes require transform-level and UI-level impact review.

### Open decisions, if any
- room billing/print lifecycle policy
- long-term payment surface cleanup

---

## 5. Rooms / Room Check-In / Room Transfer Module

### Module purpose
Support room occupancy, check-in, room orders, and room-associated payment/print behavior.

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
- room-related print and billing payloads

### UI responsibility
- room availability/opening behavior
- room check-in modal
- occupied-room handoff into order-entry flow
- room card amount display

### State responsibility
- room entries inside `TableContext`
- room orders inside `OrderContext`
- room financial rendering via order data + transforms

### External dependency responsibility
- depends on backend room payload shape

### What this module must not do
- It must not be changed as if it were only a table variant.
- It must not bypass collect payment / print impact review.

### Dependencies on other modules
- Dashboard
- Order Entry
- TableContext
- OrderContext
- Restaurant/profile transform rules

### Common bug/change impact areas
- room card totals
- room check-in payload completeness
- room billing stack in payment UI
- print payloads including associated orders

### Future change rules
- Any room change requires review across dashboard card totals, room check-in API, order transform, payment panel, and print output.

### Open decisions, if any
- lifecycle ownership of room billing/print semantics remains unresolved.

---

## 6. Customer / CRM Integration Module

### Module purpose
Support customer search/lookup/create/update and delivery-address management.

### Module ownership
- Primary: Frontend
- Capability policy dependency: Product / API / Business

### Related routes/screens
- Embedded in order entry

### Related APIs
- `/pos/customers`
- `/pos/customer-lookup`
- `/pos/address-lookup`
- `/pos/customers/{id}/addresses`

### UI responsibility
- customer modal
- address picker
- address form
- delivery address selection in order flow

### State responsibility
- selected customer
- delivery addresses
- selected address
- address loading/saving state

### External dependency responsibility
- CRM base URL and restaurant-key map
- Google Maps Places for address search form

### What this module must not do
- It must not assume CRM is mandatory unless owner policy says so.
- It must not convert missing CRM config into silent business assumptions.

### Dependencies on other modules
- Loading/profile for CRM restaurant id
- Order Entry for UX surface

### Common bug/change impact areas
- missing API key per restaurant
- address lookup failure
- local-only customer behavior
- delivery address not printed/persisted as expected

### Future change rules
- Treat CRM as current degraded-capability module.
- Any UX tightening must explicitly define behavior for missing CRM configuration.

### Open decisions, if any
- CRM required/optional/tiered capability remains unresolved.

---

## 7. Realtime Socket Module

### Module purpose
Maintain live updates for orders, tables, and engage locks.

### Module ownership
- Primary: Frontend
- Contract dependency: API / Tech / Security

### Related routes/screens
- cross-cutting; mainly dashboard runtime

### Related APIs
- socket server transport
- single-order fetch fallback for some handlers

### UI responsibility
- indirect: live card updates, locks, reconnect status indicators

### State responsibility
- connection state
- subscriptions
- routing event payloads into OrderContext/TableContext

### External dependency responsibility
- socket server URL and backend event contract

### What this module must not do
- It must not be refactored based on comments alone.
- It must not be assumed secure/approved just because it works in frontend.

### Dependencies on other modules
- Auth
- Restaurant
- OrderContext
- TableContext
- Dashboard

### Common bug/change impact areas
- stale subscriptions
- comment/code contradictions
- engage locks not clearing
- duplicate or conflicting table updates

### Future change rules
- Socket changes require explicit channel/event inventory.
- Treat table-channel and order-derived table updates as live behavior until owner-approved simplification.

### Open decisions, if any
- final table-status precedence
- socket auth/security model intent

---

## 8. Notifications & Firebase Module

### Module purpose
Handle push notification setup, foreground/background delivery, and sound behavior.

### Module ownership
- Primary: Frontend
- Strategy dependency: Tech

### Related routes/screens
- cross-cutting; dashboard banner and notification simulation support

### Related APIs
- Firebase browser messaging APIs

### UI responsibility
- notification banner
- silent/ringer toggle behavior
- notification simulation surfaces

### State responsibility
- notification list/state in `NotificationContext`
- sound-enabled flag

### External dependency responsibility
- Firebase env config
- service worker registration

### What this module must not do
- It must not be documented as socket-only.
- It must not be assumed version-stable without explicit strategy.

### Dependencies on other modules
- Auth/login flow
- Dashboard sidebar/banner

### Common bug/change impact areas
- denied permission handling
- service worker registration issues
- sound/ringer state

### Future change rules
- Preserve distinction between foreground app handling and background service-worker forwarding.

### Open decisions, if any
- long-term Firebase SDK/version strategy remains unresolved.

---

## 9. Station / Kitchen Panel Module

### Module purpose
Show station-wise aggregated kitchen workload and refresh on demand/socket events.

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
- density/display mode toggles
- station grouping by category/items

### State responsibility
- available stations
- enabled stations
- station view enabled flag
- station panel display mode
- aggregated station data

### External dependency responsibility
- station API shape
- localStorage station config

### What this module must not do
- It must not mask fetch failures as confirmed clean kitchen state in documentation.
- It must not hardcode new endpoint behavior in multiple places.

### Dependencies on other modules
- Menu products/categories
- Loading bootstrap
- Status config
- Socket refresh hook

### Common bug/change impact areas
- empty station panels
- selected station mismatch
- category-name mapping
- stale data after settings save

### Future change rules
- Any station change requires reviewing service soft-failure behavior, config sync, loading bootstrap, and socket refresh behavior together.

### Open decisions, if any
- desired UX for station fetch failure vs empty state remains unresolved.

---

## 10. Reports / Audit / Summary Module

### Module purpose
Provide historical reporting and summary dashboards using multiple report endpoints.

### Module ownership
- Primary: Frontend
- Strategy dependency: Tech / API / Business

### Related routes/screens
- `/reports/audit`
- `/reports/summary`

### Related APIs
- order logs
- paid/cancelled/credit/hold report endpoints
- aggregator reports
- order detail reports
- daily sales report
- running orders reconciliation

### UI responsibility
- filters, tabs, export, summary cards, detail sheets

### State responsibility
- largely page-local report state rather than shared contexts

### External dependency responsibility
- report endpoint shape and business-day semantics from API contract

### What this module must not do
- It must not be treated as simple display-only code.
- It must not absorb more business-day aggregation without strategy review.

### Dependencies on other modules
- Restaurant/profile schedules/currency/features
- shared layout/report components

### Common bug/change impact areas
- date/business day filtering
- order reconciliation
- duplicate/merged counts
- payment bucket interpretation

### Future change rules
- Changes must identify whether they alter API fetching, business-day policy, normalization, or presentation only.

### Open decisions, if any
- frontend-composed vs backend-aggregated long-term reporting strategy remains unresolved.

---

## 11. Visibility Settings / Device Configuration Module

### Module purpose
Control device-local dashboard visibility, station display, view modes, defaults, layout, and order-taking behavior.

### Module ownership
- Primary: Frontend
- Governance dependency: Product / Business / Tech

### Related routes/screens
- `/visibility/status-config`

### Related APIs
- indirect station refresh only

### UI responsibility
- settings cards and toggles for statuses/channels/stations/layouts/view modes/order taking

### State responsibility
- local page state persisted to localStorage
- pushes selected station config into `StationContext`

### External dependency responsibility
- localStorage only in current implementation

### What this module must not do
- It must not be presented as centrally governed admin policy today.
- It must not silently change localStorage keys without migration planning.

### Dependencies on other modules
- Dashboard reads these settings
- Station module syncs from it
- Sidebar/Header react to resulting state

### Common bug/change impact areas
- settings not applying until reload
- cross-tab sync drift
- order-taking restrictions not reflecting correctly
- default view not respected

### Future change rules
- Any persistence-scope change must define migration from device-local to broader scope.

### Open decisions, if any
- whether these controls should become auditable administrative settings remains unresolved.

---

## 12. Menu / Category / Product Module

### Module purpose
Maintain catalog data used for ordering, station extraction, and menu utilities.

### Module ownership
- Primary: Frontend
- Data contract dependency: API

### Related routes/screens
- no direct route module; used inside order entry and menu management panel

### Related APIs
- categories
- products
- popular food

### UI responsibility
- category panel
- item list/pills
- menu management panel surfaces

### State responsibility
- categories
- products
- popular food
- item lookups through context helpers

### External dependency responsibility
- none besides backend catalog endpoints

### What this module must not do
- It must not duplicate pricing/tax settlement ownership beyond catalog facts.

### Dependencies on other modules
- Loading bootstrap
- Order Entry
- Station module
- Menu management panel

### Common bug/change impact areas
- station extraction
- tax field propagation into cart
- popular category behavior

### Future change rules
- Product shape changes must be validated against `adaptProduct`, transforms, cart math, and station extraction.

### Open decisions, if any
- none beyond general API contract evolution.

---

## 13. Tables & Orders Runtime State Module

### Module purpose
Provide the live operational representation of tables/rooms/orders.

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
- indirect via consumers

### State responsibility
- unified tables array
- unified orders array
- engage lock sets
- helper selectors and wait helpers

### External dependency responsibility
- none directly beyond backend/order/socket contract

### What this module must not do
- It must not embed unrelated UI concerns.

### Dependencies on other modules
- Loading bootstrap
- Dashboard
- Order Entry
- Room module
- Socket handlers

### Common bug/change impact areas
- stale engage locks
- wait helpers timing out
- table/order lookup inconsistencies

### Future change rules
- Any mutation helper change must be reviewed against socket handlers and dashboard assumptions.

### Open decisions, if any
- no final decision on durable recovery of engage locks.

---

## 14. Printing / Bill / KOT Module

### Module purpose
Prepare and send print payloads for KOT and bill flows.

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
- relies on current order/payment overrides rather than owning its own state module

### External dependency responsibility
- backend print endpoint and printer-side behavior

### What this module must not do
- It must not recompute financials casually without aligning with collect-bill behavior.
- It must not be treated as independent of room and payment logic.

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
- Print changes require end-to-end review of manual print, auto-print, room print, and fallback payload behavior.

### Open decisions, if any
- room billing/print policy and some print parity expectations remain unresolved.

---

## Final module usage rule
Before implementing any change, future agents must map the request to one or more modules in this document and then review:
- affected route/page
- affected context(s)
- affected service(s)
- affected transform(s)
- affected localStorage keys
- affected print/socket/payment paths if applicable
