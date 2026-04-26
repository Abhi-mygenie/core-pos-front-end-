# ARCHITECTURE_DECISIONS_FINAL

## Executive summary
This document is the final source-of-truth architecture guide for the current `step3` codebase in `/app`, rebuilt using only these allowed evidence sources:
- current code in `/app`
- `/app/memory/current-state/*`
- `/app/memory/analysis/*`

No `/app/v3/*` documents were used.

The application is a React 19 + CRACO POS frontend with:
- React Router route shell
- React Context domain state
- service + transform API integration pattern
- socket-driven runtime updates
- localStorage-driven terminal configuration
- large orchestration hotspots in dashboard, order entry, collect payment, transforms, and reports

### Source hierarchy used
1. **Code** — highest source of truth for current implementation
2. **Current-state docs** — current structure and discovery summaries
3. **Analysis docs** — gaps, risks, refactor opportunities, and open questions

### Primary supporting sources
- Code: `/app/frontend/src/App.js`, `/app/frontend/src/contexts/AppProviders.jsx`, `/app/frontend/src/pages/DashboardPage.jsx`, `/app/frontend/src/components/order-entry/OrderEntry.jsx`, `/app/frontend/src/api/services/*`, `/app/frontend/src/api/socket/*`
- Current-state: `/app/memory/current-state/CURRENT_ARCHITECTURE.md`, `/app/memory/current-state/MODULE_MAP.md`, `/app/memory/current-state/API_USAGE_MAP.md`, `/app/memory/current-state/PROJECT_INVENTORY.md`
- Analysis: `/app/memory/analysis/DOC_VS_CODE_GAP.md`, `/app/memory/analysis/SCALING_RISK_REGISTER.md`, `/app/memory/analysis/REFACTOR_OPPORTUNITY_MAP.md`, `/app/memory/analysis/OPEN_QUESTIONS_FROM_CODE.md`
- Open-question resolution: `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`

---

## Application architecture summary

### Current architecture shape
The app is a single React SPA booted from `src/index.js` into `src/App.js`.

#### Core shell
- `index.js` mounts `<App />` inside `React.StrictMode`
- `App.js` wraps the app with:
  - `ErrorBoundary`
  - `AppProviders`
  - `BrowserRouter`
  - route tree
  - global `Toaster`

**Code reference**
- `/app/frontend/src/index.js:1-11`
- `/app/frontend/src/App.js:24-47`

### Provider architecture
Provider order is architecture-significant:
1. `AuthProvider`
2. `SocketProvider`
3. `NotificationProvider`
4. `RestaurantProvider`
5. `MenuProvider`
6. `TableProvider`
7. `SettingsProvider`
8. `OrderProvider`
9. `StationProvider`

**Code reference**
- `/app/frontend/src/contexts/AppProviders.jsx:13-34`

**Current-state reference**
- `/app/memory/current-state/PROJECT_INVENTORY.md:124-145`

### Architectural hotspots
The following are high-risk architecture hotspots:
- `pages/DashboardPage.jsx`
- `components/order-entry/OrderEntry.jsx`
- `components/order-entry/CollectPaymentPanel.jsx`
- `api/transforms/orderTransform.js`
- `api/services/reportService.js`
- `api/socket/socketHandlers.js`
- `components/modals/RoomCheckInModal.jsx`
- `pages/StatusConfigPage.jsx`

**Analysis reference**
- `/app/memory/analysis/SCALING_RISK_REGISTER.md`
- `/app/memory/analysis/REFACTOR_OPPORTUNITY_MAP.md`

---

## Final frontend architecture rules

### Rule FA-01 — Preserve the route-shell architecture
Global wrappers stay in `App.js`. Protected flows remain behind `ProtectedRoute`. New domain logic should not bypass route/page boundaries casually.

### Rule FA-02 — Preserve provider ordering
Do not reorder providers without explicit dependency analysis. Auth/socket/profile dependencies rely on current order.

### Rule FA-03 — Do not expand hotspot files casually
`DashboardPage`, `OrderEntry`, `CollectPaymentPanel`, `RoomCheckInModal`, `StatusConfigPage`, `orderTransform`, and `reportService` already hold concentrated business logic. Future work should prefer extraction over further inline growth.

### Rule FA-04 — Distinguish implemented module, embedded workflow, panel utility, and placeholder
Route map in `App.js` is the actual routed surface. Sidebar labels alone do not establish a real module boundary.

### Rule FA-05 — Treat current code as implementation truth
When current-state/analysis docs summarize implementation, code still wins if details diverge.

---

## API integration rules

### Rule API-01 — Prefer service-layer entry points for new work
Current code mixes service wrappers with direct `api.*` usage. Future changes should prefer service/action-layer entry points unless touching a legacy path.

**Analysis reference**
- `/app/memory/analysis/SCALING_RISK_REGISTER.md:27-34`
- `/app/memory/analysis/REFACTOR_OPPORTUNITY_MAP.md:23-32`

### Rule API-02 — Preserve transform-mediated payload shaping for order/financial/report flows
Order, room, profile, report, table, and CRM payloads/responses are strongly transform-driven.

### Rule API-03 — Current active payment implementation lives in OrderEntry/CollectPaymentPanel flows
The active bill/payment behavior is implemented there. `paymentService.collectPayment()` is stale from a code perspective and must not be treated as canonical for new work.

**Code reference**
- `/app/frontend/src/api/services/paymentService.js:12-14`
- `/app/frontend/src/components/order-entry/OrderEntry.jsx`

### Rule API-04 — Distinguish empty state from degraded state
Station, CRM, and parts of reporting use soft-fail return patterns (`[]`, `null`, fallback objects). Future work must preserve that distinction explicitly.

### Rule API-05 — Keep known stale/unclear API surfaces documented until deliberately cleaned
- stale payment service entry
- `EDIT_ORDER_ITEM*` placeholders
- hardcoded station endpoint in `stationService`

### Rule API-06 — Room check-in payload now includes advance payment tender when applicable
Current room check-in behavior now treats advance-payment method as part of the room workflow contract:
- when advance amount is greater than zero, payment method is required in the UI
- `roomService.checkIn()` sends `payment_method` in multipart payload
- accepted frontend values are constrained to enabled restaurant payment methods among `cash`, `card`, and `upi`

**Code reference**
- `/app/frontend/src/components/modals/RoomCheckInModal.jsx`
- `/app/frontend/src/api/services/roomService.js`

---

## External dependency rules

### Rule EP-01 — Current code-level env dependencies
Current code depends on:
- `REACT_APP_API_BASE_URL`
- `REACT_APP_SOCKET_URL`
- `REACT_APP_CRM_BASE_URL`
- `REACT_APP_CRM_API_KEYS`
- Firebase env set
- `REACT_APP_GOOGLE_MAPS_KEY`
- `ENABLE_HEALTH_CHECK`

### Rule EP-02 — CRM is soft-optional in current implementation
Missing CRM base URL/key mapping does not hard-stop the app; CRM flows degrade softly.

### Rule EP-03 — Firebase push is active implementation, not a settled strategy
Current code uses app runtime Firebase plus service-worker compat imports. This is a current implementation fact, not a final architecture policy.

### Rule EP-04 — Google Maps is a real dependency for delivery address form behavior
Address autocomplete relies on `REACT_APP_GOOGLE_MAPS_KEY` and dynamic Maps Places script loading.

### Rule EP-05 — Backend scaffold exists in repo, but intent is not documented in allowed sources
The `/app/backend` folder is present and must be acknowledged, but not assumed to be the real product backend.

---

## State management rules

### Rule SM-01 — React Context is the authoritative shared client-state pattern
Do not introduce a second global state system casually.

### Rule SM-02 — Contexts own shared runtime state; pages own orchestration state
Shared auth/profile/order/table/socket/notification/station state belongs in contexts. Local page/component UI state belongs in pages/components.

### Rule SM-03 — `localStorage` is part of current architecture
The app materially depends on localStorage for:
- status visibility
- channel visibility
- station config
- view-mode locks/defaults
- order-taking toggle
- dynamic tables flag
- some debug behavior

### Rule SM-04 — Current persistence scope is device-local unless explicitly changed
Allowed sources do not establish user-level or restaurant-level persistence for those settings.

### Rule SM-05 — Orders and tables are live runtime sources; engage locks are transient
`OrderContext` and `TableContext` own live runtime state. Engage locks are in-memory and not durable.

### Rule SM-06 — Station aggregation is signature-sensitive in current implementation
Current station behavior no longer aggregates solely by item name. Station rows are now split by item signature components including:
- variant selection
- add-ons
- notes
This is important when validating kitchen counts or debugging “merged” station rows.

**Code reference**
- `/app/frontend/src/api/services/stationService.js`
- `/app/frontend/src/components/station-view/StationPanel.jsx`

---

## Auth/session/token rules

### Rule AUTH-01 — Auth is token-in-localStorage based
Current implementation stores and reads `auth_token` from localStorage.

### Rule AUTH-02 — No refresh-token/session-refresh flow is evident in current implementation
Current auth failure behavior is local token clearing + redirect.

### Rule AUTH-03 — Protected flows are token-first, then bootstrap-enriched
Login provides token and permissions shell; `/loading` performs full bootstrap.

### Rule AUTH-04 — Socket connection is gated by auth state, but socket security intent is unresolved
Frontend connects socket only when authenticated, but allowed sources do not define final security policy.

---

## Routing rules

### Rule RT-01 — Current routed pages are narrow and explicit
Implemented routes are:
- `/`
- `/loading`
- `/dashboard`
- `/reports/audit`
- `/reports/summary`
- `/visibility/status-config`
- redirects for `/reports` and `/reports/all-orders`

### Rule RT-02 — Sidebar does not define the route map
Sidebar includes placeholders and panel-open items not present in `App.js`.

### Rule RT-03 — Embedded workflows are not route modules
Order entry, room check-in, payment, split bill, and customer flows are embedded workflow surfaces.

---

## Module communication rules

### Rule MC-01 — Preferred chain
UI/page/component → service/transform → context update → UI render

### Rule MC-02 — Realtime flows may sync through socket instead of HTTP response
Operational state often depends on socket follow-up rather than immediate response bodies.

### Rule MC-03 — Dashboard is the main orchestration boundary
Dashboard coordinates card interactions, order-entry openings, room openings, station view, realtime subscriptions, and local terminal settings.

### Rule MC-04 — Order Entry is the transactional workflow boundary
OrderEntry coordinates carting, customer/address handling, place/update order, transfer/merge/shift, cancellation, payment, print, and split-bill launch.

### Rule MC-05 — Room logic is cross-cutting
Room behavior spans dashboard cards, room check-in, order transforms, collect payment, and print payloads.

---

## Error handling rules

### Rule EH-01 — `readableMessage` is part of current UI error contract
Axios and CRM interceptors attach user-facing message fields used by the UI.

### Rule EH-02 — Soft-fail service patterns must be preserved knowingly
Do not “fix” empty-array/null/fallback returns without impact review.

### Rule EH-03 — Empty state and failure state are not the same
This is especially important in station and CRM flows.

### Rule EH-04 — Bootstrap errors must remain visible and retryable
`LoadingPage` uses per-API status tracking and retry behavior that should be preserved.

---

## Environment/configuration rules

### Rule ENV-01 — Code-level env contract for this branch is multi-variable
Allowed sources do not define any owner-approved simplification beyond what code already uses.

### Rule ENV-02 — No committed `.env.example` is evidenced in allowed sources
This is a documentation/setup gap, not permission to invent alternate variable names.

### Rule ENV-03 — Do not rename envs without owner approval
Any env-consolidation plan is a contract change, not a local cleanup.

---

## Logging/debugging expectations

### Rule LOG-01 — Console logging is part of current operational behavior
Socket/order/payment/station code relies on it.

### Rule LOG-02 — Debug flags can be localStorage-driven
Debug behavior is not purely framework-managed.

### Rule LOG-03 — Comments are not always architecture truth
Realtime comments in particular contain documented ambiguity or drift. Prefer executable behavior.

---

## Areas that must not be changed casually
1. Provider order in `AppProviders`
2. Bootstrap sequencing in `LoadingPage`
3. Dashboard orchestration in `DashboardPage`
4. Transactional/payment/print behavior in `OrderEntry` + `CollectPaymentPanel`
5. Financial payload builders in `orderTransform.js`
6. Socket event handling in `socketHandlers.js` / `useSocketEvents.js`
7. Room billing/print behavior across dashboard/order/payment/print flows
8. Existing localStorage key names already used by runtime logic
9. Station aggregation behavior once variant/add-on/note splitting is relied on by kitchen users

---

## Unresolved decisions
1. Canonical frontend environment contract
2. Table-status source-of-truth precedence
3. Device-local vs user/admin/server persistence scope
4. Intent of `/app/backend`
5. CRM policy: required vs optional vs tiered
6. Reporting strategy: frontend vs backend aggregation
7. Station failure UX policy
8. Firebase long-term version strategy
9. Whether local workflow settings should become auditable admin controls
10. Room billing/print lifecycle ownership

**Supporting source**
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`

---

## Refactor guardrails
- Preserve API payload shapes unless owner-approved.
- Preserve socket event names/channels unless backend contract is verified.
- Preserve localStorage key compatibility on first migration pass.
- Do not silently change tax, service charge, round-off, room billing, or print semantics.
- Refactors touching hotspot files require explicit impact analysis.

---

## Scaling guardrails
- Avoid increasing orchestration logic inside hotspot files.
- Prefer extraction by concern before adding more logic.
- Preserve context ownership boundaries.
- Preserve degraded-mode behavior unless policy changes are approved.
- Do not widen route map and sidebar scope together without reclassifying real modules vs placeholders.
- Reporting scale work should start with an owner decision on aggregation ownership.
- Settings scale work should start with an owner decision on persistence scope.

---

## Final usage directive
Use this document to:
- understand the real current architecture
- separate code-backed rules from unresolved policy
- avoid accidental rewrites of brittle operational surfaces
- plan future changes with explicit module, API, state, UI, and regression mapping
