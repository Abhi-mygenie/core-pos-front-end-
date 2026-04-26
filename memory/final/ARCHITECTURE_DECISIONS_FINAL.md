# ARCHITECTURE_DECISIONS_FINAL

## Executive summary
This document is the final source-of-truth architecture guide for the current `step2` frontend codebase in `/app`. It is intended for developers and future AI agents doing bug fixes, change requests, scaling work, onboarding, and planning.

The application is a React 19 + CRACO POS frontend with:
- React Router route shell
- React Context domain state
- service + transform API integration pattern
- socket-driven runtime updates
- localStorage-driven terminal configuration
- large orchestration hotspots in `DashboardPage.jsx`, `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, and `reportService.js`

### Source hierarchy used
1. **Code** — highest source of truth for current implementation
2. **Current-state docs** — what exists
3. **Analysis docs** — known gaps, risks, refactor opportunities, open questions
4. **V3 docs** — useful for prior decisions only when not contradicted by current code

### Key final position
- Current implementation can be documented confidently.
- Several product/owner decisions remain intentionally unresolved.
- Future agents must not convert unresolved business/policy questions into implementation assumptions.

### Primary supporting sources
- Code: `/app/frontend/src/App.js`, `/app/frontend/src/contexts/AppProviders.jsx`, `/app/frontend/src/pages/DashboardPage.jsx`, `/app/frontend/src/components/order-entry/OrderEntry.jsx`, `/app/frontend/src/api/services/*`, `/app/frontend/src/api/socket/*`
- Current-state: `/app/memory/current-state/CURRENT_ARCHITECTURE.md`, `/app/memory/current-state/MODULE_MAP.md`, `/app/memory/current-state/API_USAGE_MAP.md`
- Analysis: `/app/memory/analysis/SCALING_RISK_REGISTER.md`, `/app/memory/analysis/REFACTOR_OPPORTUNITY_MAP.md`, `/app/memory/analysis/OPEN_QUESTIONS_FROM_CODE.md`
- Open-question resolution: `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- V3 references used with caution: `/app/v3/*`

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

**Current-state reference**
- `/app/memory/current-state/CURRENT_ARCHITECTURE.md:4-17`

### Provider architecture
Provider order is a real dependency rule, not just an implementation detail:
1. `AuthProvider`
2. `SocketProvider`
3. `NotificationProvider`
4. `RestaurantProvider`
5. `MenuProvider`
6. `TableProvider`
7. `SettingsProvider`
8. `OrderProvider`
9. `StationProvider`

This order should be treated as architecture-critical because later providers depend on earlier auth/socket/profile state.

**Code reference**
- `/app/frontend/src/contexts/AppProviders.jsx:13-34`

**Current-state reference**
- `/app/memory/current-state/PROJECT_INVENTORY.md:124-145`

### Architectural hotspots
The following files are architecture hotspots and require extra change control:
- `pages/DashboardPage.jsx`
- `components/order-entry/OrderEntry.jsx`
- `components/order-entry/CollectPaymentPanel.jsx`
- `api/transforms/orderTransform.js`
- `api/services/reportService.js`
- `api/socket/socketHandlers.js`

**Analysis reference**
- `/app/memory/analysis/SCALING_RISK_REGISTER.md:3-18,67-98`
- `/app/memory/analysis/REFACTOR_OPPORTUNITY_MAP.md:3-22,53-71`

---

## Final frontend architecture rules

### Rule FA-01 — Preserve route-shell architecture
New work must respect the existing route shell:
- global wrappers stay in `App.js`
- module-level behavior belongs below route/page boundary
- no module should bypass `ProtectedRoute` for protected screens

**Code reference**
- `/app/frontend/src/App.js:31-41`

### Rule FA-02 — Preserve provider dependency ordering
Do not casually reorder providers in `AppProviders`. Changes here affect auth-gating, socket readiness, notification startup, and restaurant-derived module initialization.

**Code reference**
- `/app/frontend/src/contexts/AppProviders.jsx:15-33`

### Rule FA-03 — New domain logic should not expand page hot spots unless unavoidable
`DashboardPage` and `OrderEntry` already carry too much orchestration. New work should prefer extracting helpers/hooks/services instead of adding more inline business logic.

**Analysis reference**
- `/app/memory/analysis/SCALING_RISK_REGISTER.md:3-18`
- `/app/memory/analysis/REFACTOR_OPPORTUNITY_MAP.md:3-22`

### Rule FA-04 — Maintain code-first module boundaries
A route, context, service, transform, or panel only counts as a real module boundary when it is visible in code. Sidebar placeholders are not module commitments.

**Code reference**
- `/app/frontend/src/components/layout/Sidebar.jsx:31-109,176-231`
- `/app/frontend/src/App.js:31-41`

### Rule FA-05 — Distinguish implemented module, panel utility, and placeholder
Going forward, architecture docs and change plans must classify functionality into:
- routed module
- embedded workflow module
- panel utility
- placeholder/coming-soon nav item

**Analysis reference**
- `/app/memory/analysis/OPEN_QUESTIONS_FROM_CODE.md:84-91`
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` (OQ-10)

---

## API integration rules

### Rule API-01 — Prefer service-layer entry points for new work
Current code mixes service wrappers with direct `api.*` usage in pages/components. Future changes should prefer service/action-layer entry points unless a legacy path must be touched.

**Code reference**
- service pattern: `/app/frontend/src/api/services/*`
- direct API usage: `/app/frontend/src/pages/DashboardPage.jsx`, `/app/frontend/src/components/order-entry/OrderEntry.jsx`

**Analysis reference**
- `/app/memory/analysis/SCALING_RISK_REGISTER.md:27-34`
- `/app/memory/analysis/REFACTOR_OPPORTUNITY_MAP.md:23-32`

### Rule API-02 — Preserve transform-mediated payload shaping for financial/order flows
Order, room, profile, report, table, and CRM payload/response mapping is heavily transform-driven. Changes to API contracts must start in transforms and then be validated across dependent UI.

**Code reference**
- `/app/frontend/src/api/transforms/orderTransform.js`
- `/app/frontend/src/api/transforms/profileTransform.js`
- `/app/frontend/src/api/transforms/reportTransform.js`
- `/app/frontend/src/api/transforms/tableTransform.js`

### Rule API-03 — Current canonical payment write path is not `paymentService.collectPayment()`
Canonical active payment/bill flows currently live in the order-entry payment workflow and `API_ENDPOINTS.BILL_PAYMENT`/prepaid paths. `paymentService.collectPayment()` is stale and must not be treated as canonical.

**Code reference**
- `/app/frontend/src/api/constants.js:43-46`
- `/app/frontend/src/api/services/paymentService.js:12-14`
- `/app/frontend/src/components/order-entry/OrderEntry.jsx`

**Resolution reference**
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` (OQ-05)

### Rule API-04 — Distinguish hard failure, degraded result, and empty state
Station, CRM, and some report helpers currently soft-fail into empty arrays/objects/null. Future work must preserve this distinction in planning and bug analysis.

**Code reference**
- `/app/frontend/src/api/services/stationService.js:201-209`
- `/app/frontend/src/api/services/customerService.js`
- `/app/frontend/src/api/services/reportService.js`

### Rule API-05 — Do not silently normalize away stale endpoints/constants in docs
The following must remain documented as latent issues until deliberately cleaned:
- `paymentService.collectPayment()` → `CLEAR_BILL` missing
- `EDIT_ORDER_ITEM` / `EDIT_ORDER_ITEM_QTY` → `TBD`
- station endpoint hardcoded in `stationService`

**Current-state reference**
- `/app/memory/current-state/API_USAGE_MAP.md:1427-1439`

---

## External PaaS dependency rules

### Rule EP-01 — Current external dependency boundaries
The frontend depends on:
- main backend API via `REACT_APP_API_BASE_URL`
- socket server via `REACT_APP_SOCKET_URL`
- CRM via `REACT_APP_CRM_BASE_URL` + `REACT_APP_CRM_API_KEYS`
- Firebase messaging env set
- Google Maps Places via `REACT_APP_GOOGLE_MAPS_KEY`
- optional dev health-check feature via `ENABLE_HEALTH_CHECK`

**Code reference**
- `/app/frontend/src/api/axios.js:5-8`
- `/app/frontend/src/api/socket/socketEvents.js:8-12`
- `/app/frontend/src/api/crmAxios.js:8-20`
- `/app/frontend/src/config/firebase.js:5-15`
- `/app/frontend/src/components/order-entry/AddressFormModal.jsx:5`
- `/app/frontend/craco.config.js:11-23`

### Rule EP-02 — Do not use task/setup env wording as code truth when it conflicts
The task/environment brief mentions `REACT_APP_BACKEND_URL`. Current code does not use that variable. Final architecture documentation must prefer code truth and clearly mark the mismatch.

**Conflict reference**
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` (OQ-01)

### Rule EP-03 — CRM is currently a soft-optional capability in code
CRM failures degrade softly; this is an implementation fact, not a product decision.

**Code reference**
- `/app/frontend/src/api/crmAxios.js:18-20,55-60`
- `/app/frontend/src/components/order-entry/OrderEntry.jsx:127-169`

### Rule EP-04 — Firebase implementation is active, but policy is unresolved
Push notifications are implemented via app runtime Firebase + compat service worker. Treat this as current implementation, not a final version strategy.

**Code reference**
- `/app/frontend/src/config/firebase.js:17-110`
- `/app/frontend/public/firebase-messaging-sw.js:7-8,24-58`

### Rule EP-05 — Health-check plugin is present in current branch
Current `step2` branch contains plugin files and conditional CRACO wiring. This conflicts with `/app/v3/` claims from another branch that the plugin files were absent.

**Code reference**
- `/app/frontend/craco.config.js:14-23,71-95`
- `/app/frontend/plugins/health-check/webpack-health-plugin.js`
- `/app/frontend/plugins/health-check/health-endpoints.js`

**V3 conflict reference**
- `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md:42`
- `/app/v3/DOCUMENTATION_AUDIT_SUMMARY.md:55-60`

---

## State management rules

### Rule SM-01 — React Context is the authoritative client-state pattern
Do not introduce a parallel global state system casually. Current state partitioning is context-based and deeply embedded in module wiring.

**Code reference**
- `/app/frontend/src/contexts/*`

### Rule SM-02 — Contexts own shared runtime state; pages own ephemeral orchestration state
- Shared auth/profile/order/table/socket/notification/station state belongs in contexts.
- Screen-local modal/filter/form orchestration belongs in page/component state.

**Code reference**
- contexts: `/app/frontend/src/contexts/*`
- local state hotspots: `/app/frontend/src/pages/DashboardPage.jsx`, `/app/frontend/src/components/order-entry/OrderEntry.jsx`

### Rule SM-03 — `localStorage` is part of current architecture, not an implementation accident
The following are current architectural dependencies:
- status visibility
- channel visibility
- station config
- view-mode locks/defaults
- order-taking toggle
- dynamic tables flag
- density toggles and debug flags in some modules

**Code reference**
- `/app/frontend/src/pages/StatusConfigPage.jsx`
- `/app/frontend/src/pages/DashboardPage.jsx`
- `/app/frontend/src/contexts/SettingsContext.jsx:4-26`
- `/app/frontend/src/contexts/StationContext.jsx`
- `/app/frontend/src/api/socket/socketService.js`
- `/app/frontend/src/hooks/useStationSocketRefresh.js`

### Rule SM-04 — Current persistence scope is device-local unless explicitly documented otherwise
Future agents must not assume these settings are user-level or restaurant-level just because they affect workflow.

**Resolution reference**
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` (OQ-03, OQ-11)

### Rule SM-05 — Orders and tables are shared runtime sources; engage locks are transient
`OrderContext` and `TableContext` are shared runtime sources for live operations. Engage locks are in-memory and not durable across reconnects/reloads.

**Code reference**
- `/app/frontend/src/contexts/OrderContext.jsx`
- `/app/frontend/src/contexts/TableContext.jsx`

---

## Auth/session/token rules

### Rule AUTH-01 — Auth is token-in-localStorage based in current implementation
Current implementation stores and reads `auth_token` from localStorage. This is operationally important and security-sensitive.

**Code reference**
- `/app/frontend/src/api/services/authService.js`
- `/app/frontend/src/api/axios.js:21-27`

### Rule AUTH-02 — There is no refresh-token lifecycle in current architecture
Any future session or auth improvements must start from the fact that current behavior is hard redirect + local token clearing.

**Code reference**
- `/app/frontend/src/api/axios.js:39-65`

### Rule AUTH-03 — Protected routes rely on auth token presence, then profile/bootstrap enriches user state
Do not assume login fully hydrates user/restaurant context. Protected flow is:
- login → token
- `/loading` → profile/bootstrap
- dashboard runtime

**Code reference**
- `/app/frontend/src/contexts/AuthContext.jsx:18-45`
- `/app/frontend/src/pages/LoginPage.jsx`
- `/app/frontend/src/pages/LoadingPage.jsx:174-201`

### Rule AUTH-04 — Socket connection is auth-gated by frontend state only
Frontend only connects socket when authenticated, but client-side handshake itself currently sends no auth data.

**Code reference**
- `/app/frontend/src/contexts/SocketContext.jsx:32-64`
- `/app/frontend/src/api/socket/socketService.js`

**Resolution reference**
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` (OQ-02 context, socket auth unresolved via V3)

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

**Code reference**
- `/app/frontend/src/App.js:31-41`

### Rule RT-02 — Sidebar does not define the route map
Sidebar includes placeholders and panel-open items that are not routed modules. Route truth comes from `App.js`, not navigation labels.

**Code reference**
- `/app/frontend/src/App.js:31-41`
- `/app/frontend/src/components/layout/Sidebar.jsx:31-109,176-231`

### Rule RT-03 — Embedded workflows are not standalone route modules
`OrderEntry`, room check-in, payment panel, split bill, and most customer flows are embedded dashboard workflows, not route-level pages.

**Code reference**
- `/app/frontend/src/pages/DashboardPage.jsx`
- `/app/frontend/src/components/order-entry/OrderEntry.jsx`
- `/app/frontend/src/components/modals/RoomCheckInModal.jsx`

---

## Module communication rules

### Rule MC-01 — Preferred communication chain
Preferred cross-module chain is:
UI/page/component → service/transform → context update → UI render

### Rule MC-02 — Realtime flows may short-circuit via socket mutation
Order and table state often update after HTTP through socket handlers, not through immediate API response bodies.

**Code reference**
- `/app/frontend/src/api/socket/socketHandlers.js`
- `/app/frontend/src/contexts/OrderContext.jsx`
- `/app/frontend/src/contexts/TableContext.jsx`

### Rule MC-03 — Dashboard is the main orchestrator boundary
Dashboard coordinates:
- table/room card interactions
- order-entry opening
- room check-in opening
- payment/open bill entry
- channel/status view rendering
- socket subscriptions
- station panel inclusion

**Code reference**
- `/app/frontend/src/pages/DashboardPage.jsx`

### Rule MC-04 — Order Entry is the transactional workflow boundary
OrderEntry coordinates:
- carting
- customer/address
- place/update order
- transfer/merge/shift
- cancel item/order
- payment collection
- print actions
- split bill launch

**Code reference**
- `/app/frontend/src/components/order-entry/OrderEntry.jsx`

### Rule MC-05 — Room logic is not isolated enough to modify casually
Room behavior spans dashboard cards, room check-in modal, order transform rules, collect payment, and print payloads.

**Resolution reference**
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` (OQ-12)

---

## Error handling rules

### Rule EH-01 — Axios readableMessage contract is real and should be preserved
Many UI toasts depend on `error.readableMessage` from axios/crm interceptors.

**Code reference**
- `/app/frontend/src/api/axios.js:54-63`
- `/app/frontend/src/api/crmAxios.js:66-78`

### Rule EH-02 — Soft-fail service methods must be documented before changes
If a service intentionally returns `[]`, `null`, or error-shaped data instead of throwing, future changes must not “fix” that behavior without impact review.

### Rule EH-03 — Empty state and failure state are not always the same
Station and CRM code especially must preserve the distinction between:
- valid empty result
- missing config
- transport failure
- auth failure

### Rule EH-04 — Startup errors are surfaced at LoadingPage item level
Initial bootstrap uses per-API status tracking and retry for failed loaders. Future bootstrap changes must preserve explainable startup failure behavior.

**Code reference**
- `/app/frontend/src/pages/LoadingPage.jsx:40-57,163-357`

---

## Environment/configuration rules

### Rule ENV-01 — Code-level env contract for this branch
Required/expected current envs are:
- `REACT_APP_API_BASE_URL`
- `REACT_APP_SOCKET_URL`
- `REACT_APP_CRM_BASE_URL`
- `REACT_APP_CRM_API_KEYS`
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID`
- `REACT_APP_FIREBASE_VAPID_KEY`
- `REACT_APP_GOOGLE_MAPS_KEY` (delivery-address search)
- `ENABLE_HEALTH_CHECK` (optional dev-time behavior)

### Rule ENV-02 — `.env.example` is still absent from repo evidence
This is an onboarding/documentation gap, not permission to invent alternate variable names.

### Rule ENV-03 — Do not rename runtime variables based on external instructions alone
Any migration from split env names to a unified backend variable must be owner-approved and treated as a contract change.

**Resolution reference**
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` (OQ-01)

---

## Logging/debugging expectations

### Rule LOG-01 — Console logging is part of current operational behavior
Socket/order/payment/station code uses significant console logging. Debugging plans should expect and use those logs; cleanup is a separate concern.

### Rule LOG-02 — Debug flags may be localStorage-driven
Socket and station debug behavior can be influenced by local runtime flags. Future debugging docs should mention this rather than assuming hidden framework tooling.

### Rule LOG-03 — Inline comments are not equally trustworthy across modules
Realtime comments in particular contain known drift. Prefer current executable code over comments when analyzing socket/table behavior.

**Code vs analysis support**
- `/app/frontend/src/api/socket/useSocketEvents.js:4-6,143-179`
- `/app/frontend/src/api/socket/socketHandlers.js:4-6,466-502`
- `/app/memory/analysis/DOC_VS_CODE_GAP.md:172-178`

---

## Areas that must not be changed casually
1. **Provider order in `AppProviders`**
2. **Bootstrap sequencing and context hydration in `LoadingPage`**
3. **Dashboard card/view orchestration in `DashboardPage`**
4. **Order/payment/print/room flows in `OrderEntry` + `CollectPaymentPanel`**
5. **Financial payload builders in `orderTransform.js`**
6. **Socket event handling and engage-lock behavior in `socketHandlers.js` / `useSocketEvents.js`**
7. **Room billing/print behavior across dashboard/order/payment/print flows**
8. **LocalStorage key names already in active use**

---

## Confirmed decisions from V3 that still apply
The following V3 conclusions remain useful and code-compatible in current `step2` review:
- stale `paymentService.collectPayment()` should not be treated as canonical
- socket/table comments are stale and must not outrank code
- environment setup contract is under-documented
- room/print/financial areas require extra caution
- route tree is narrower than the broader conceptual navigation surface

**Supporting sources**
- `/app/v3/OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md`
- `/app/v3/DOCUMENTATION_AUDIT_SUMMARY.md`
- `/app/v3/RISK_REGISTER.md`

---

## Code vs V3 conflicts
1. **V3 path location conflict**
   - Brief says `/app/memory/v3/`; actual repo path is `/app/v3/`.
2. **Health-check plugin conflict**
   - Current branch contains plugin files.
   - V3 says plugin files were absent in the audited branch.
3. **Branch/commit drift**
   - V3 was generated from a different branch/commit and cannot be treated as branch-accurate implementation truth.

These conflicts must be carried into any future planning packet.

---

## Unresolved decisions
1. Canonical frontend env contract and whether ops guidance should be realigned
2. Final table-status source-of-truth precedence between order-derived and table-channel updates
3. Which settings remain device-local vs user/admin/server-persisted
4. Whether backend scaffold is in-scope product infrastructure or just repo artifact
5. CRM policy: required, optional, or capability-tiered
6. Long-term report aggregation strategy: frontend, backend, or hybrid
7. Station failure UX and telemetry contract
8. Long-term Firebase version strategy
9. Whether workflow settings should become auditable administrative controls
10. Room billing/print lifecycle ownership and policy centralization

**Supporting source**
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`

---

## Refactor guardrails
- Refactors must preserve API payload shapes unless owner-approved.
- Refactors must preserve socket event names/channels unless backend contract is verified.
- Refactors must preserve localStorage key compatibility on first migration pass.
- Refactors must not silently change rounding, tax, service charge, room billing, or print semantics.
- Refactors must not treat placeholder nav items as proof of implemented modules.
- Refactors touching `DashboardPage`, `OrderEntry`, `CollectPaymentPanel`, `orderTransform`, `reportService`, or socket handlers require explicit module-level impact analysis.

**Analysis reference**
- `/app/memory/analysis/REFACTOR_OPPORTUNITY_MAP.md`

---

## Scaling guardrails
- Avoid increasing orchestration logic in hotspot files.
- Prefer extraction by domain concern before adding more feature logic.
- Preserve context ownership boundaries.
- Preserve explicit degraded-mode handling for CRM/station/report failure cases until product policy changes.
- Do not widen the route map and sidebar surface simultaneously without reclassifying actual modules vs placeholders.
- Any reporting scale work should begin with a strategy decision on frontend vs backend aggregation.
- Any configuration scale work should begin with a decision on device-local vs user/admin persistence.

**Analysis reference**
- `/app/memory/analysis/SCALING_RISK_REGISTER.md`

---

## Final usage directive
Future developers and agents should use this document to:
- understand the real current architecture
- distinguish code-backed rules from open owner decisions
- avoid accidental rewrites of brittle operational surfaces
- plan change requests with explicit module, API, state, and regression impact mapping
