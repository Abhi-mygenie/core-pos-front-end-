# REFACTOR_OPPORTUNITY_MAP

## 1. Extract dashboard state/composition layer
- **Refactor title:** Decompose `DashboardPage` into orchestrator + feature hooks
- **Current problem:** One page owns filters, localStorage hydration, socket hookup, modal state, action handlers, layout decisions, and rendering.
- **Affected files/modules:** `/app/frontend/src/pages/DashboardPage.jsx`, related layout/cards/sections hooks
- **Business/technical benefit:** Faster changes in core POS screen, lower regression risk, easier targeted tests.
- **Risk level:** Medium
- **Suggested priority:** P0
- **Recommended sequence:** First extract read-only selectors and local preference hooks; then action handlers; then modal orchestration.
- **What not to touch:** Socket payload semantics, order/payment business rules, current UX behavior unless separately approved.

## 2. Split order-entry by workflow boundaries
- **Refactor title:** Break `OrderEntry` into domain subflows
- **Current problem:** Carting, CRM, submit/update, split, transfer, room, payment, and print logic coexist in one file.
- **Affected files/modules:** `/app/frontend/src/components/order-entry/OrderEntry.jsx` plus adjacent child components
- **Business/technical benefit:** Safer evolution of revenue-critical flows; clearer ownership; improved testability.
- **Risk level:** High
- **Suggested priority:** P0
- **Recommended sequence:** Extract pure calculators/transforms adapters first, then async action hooks, then presentation state.
- **What not to touch:** Existing API payload shapes, print payload behavior, room billing semantics.

## 3. Introduce domain action layer for direct API calls
- **Refactor title:** Eliminate direct `api.*` calls from pages/components
- **Current problem:** Transport logic lives partly in UI files, partly in service files.
- **Affected files/modules:** `DashboardPage.jsx`, `OrderEntry.jsx`, `/app/frontend/src/api/services/*`
- **Business/technical benefit:** Consistent error handling, easier contract migration, better observability.
- **Risk level:** Medium
- **Suggested priority:** P0
- **Recommended sequence:** Wrap highest-risk write actions first: status updates, place/update order, payment, transfer/merge/shift.
- **What not to touch:** User-visible flow timing or socket-dependent post-submit behavior until validated.

## 4. Isolate device/user/restaurant configuration concerns
- **Refactor title:** Create a configuration access layer around localStorage
- **Current problem:** Many files read/write raw keys directly, creating implicit coupling.
- **Affected files/modules:** `DashboardPage.jsx`, `StatusConfigPage.jsx`, `Header.jsx`, `Sidebar.jsx`, `StationContext.jsx`, `SettingsContext.jsx`
- **Business/technical benefit:** Cleaner governance of settings, easier migration to backend persistence later.
- **Risk level:** Medium
- **Suggested priority:** P1
- **Recommended sequence:** Centralize key constants and serializers first; then migrate reads; then migrate writes.
- **What not to touch:** Existing storage key names during first pass if backward compatibility matters.

## 5. Normalize socket subscription design
- **Refactor title:** Align socket comments, channels, and mutation paths
- **Current problem:** Table-channel removal comments conflict with actual subscription behavior.
- **Affected files/modules:** `/app/frontend/src/api/socket/useSocketEvents.js`, `/app/frontend/src/api/socket/socketHandlers.js`, `/app/frontend/src/api/socket/socketEvents.js`, contexts
- **Business/technical benefit:** Lower realtime sync ambiguity, simpler debugging, safer event evolution.
- **Risk level:** Medium
- **Suggested priority:** P1
- **Recommended sequence:** First document actual event contract; then remove duplicate/legacy path only after behavior validation.
- **What not to touch:** Backend event names/channels without confirmed API/socket contract.

## 6. Break report service into policy + adapters
- **Refactor title:** Separate report API adapters from reporting policies
- **Current problem:** `reportService.js` contains endpoint calls plus business-day policy, merge logic, dedupe, tab logic, and normalization.
- **Affected files/modules:** `/app/frontend/src/api/services/reportService.js`, report transforms, report pages
- **Business/technical benefit:** Easier reporting enhancements, clearer test boundaries, safer business-hour changes.
- **Risk level:** Medium
- **Suggested priority:** P1
- **Recommended sequence:** Extract date/business-day helpers and raw fetchers first; then tab combiners; finally page-facing facades.
- **What not to touch:** Existing report payload/response contracts and current business-day outcomes until approved.

## 7. Split order transform by concern
- **Refactor title:** Decompose `orderTransform.js`
- **Current problem:** One transform file owns runtime normalization, submit payloads, cancellation payloads, payment payloads, and print payloads.
- **Affected files/modules:** `/app/frontend/src/api/transforms/orderTransform.js`
- **Business/technical benefit:** Lower blast radius for finance/order changes; easier targeted tests.
- **Risk level:** High
- **Suggested priority:** P1
- **Recommended sequence:** Extract read transforms first, then write payload builders, then bill/print payload generation.
- **What not to touch:** Financial formulas unless backed by business validation.

## 8. Formalize station module boundaries
- **Refactor title:** Centralize station endpoints, response states, and config handling
- **Current problem:** Station endpoint is hardcoded; config is split between context/service/page; fetch failure looks like empty data.
- **Affected files/modules:** `/app/frontend/src/api/services/stationService.js`, `/app/frontend/src/contexts/StationContext.jsx`, `/app/frontend/src/pages/StatusConfigPage.jsx`, `/app/frontend/src/hooks/useStationSocketRefresh.js`
- **Business/technical benefit:** More reliable kitchen display, clearer support behavior, easier rollout to more stations.
- **Risk level:** Medium
- **Suggested priority:** P1
- **Recommended sequence:** Centralize endpoint/constants and normalized response model first; then unify config reads/writes.
- **What not to touch:** Current station aggregation math until kitchen stakeholders validate alternatives.

## 9. Formalize CRM degraded-mode handling
- **Refactor title:** Separate CRM transport errors from empty search results
- **Current problem:** CRM calls often fail soft with warnings or empty arrays.
- **Affected files/modules:** `/app/frontend/src/api/crmAxios.js`, `/app/frontend/src/api/services/customerService.js`, `OrderEntry` customer/address flows
- **Business/technical benefit:** Better cashier guidance, easier restaurant onboarding, clearer support diagnostics.
- **Risk level:** Low
- **Suggested priority:** P2
- **Recommended sequence:** Add normalized result types and UI-state contract before any UX redesign.
- **What not to touch:** Existing CRM endpoint paths and API-key selection logic until ownership is clear.

## 10. Clean dead/stale API surfaces
- **Refactor title:** Remove or quarantine stale payment endpoints/constants
- **Current problem:** `paymentService.collectPayment()` references nonexistent endpoint constant; `EDIT_ORDER_ITEM*` placeholders remain `TBD`.
- **Affected files/modules:** `/app/frontend/src/api/services/paymentService.js`, `/app/frontend/src/api/constants.js`
- **Business/technical benefit:** Reduces misleading surface area and accidental misuse.
- **Risk level:** Low
- **Suggested priority:** P2
- **Recommended sequence:** Inventory actual call graph first, then deprecate unused exports, then remove.
- **What not to touch:** Canonical bill-payment flow already used in live order entry.

## 11. Clarify navigation architecture
- **Refactor title:** Split actual modules from placeholders/panels in sidebar
- **Current problem:** Sidebar mixes navigable routes, panel-open actions, and coming-soon placeholders in one structure.
- **Affected files/modules:** `/app/frontend/src/components/layout/Sidebar.jsx`, route map in `/app/frontend/src/App.js`
- **Business/technical benefit:** Better IA, clearer permissions model, easier scaling of admin/reporting areas.
- **Risk level:** Low
- **Suggested priority:** P2
- **Recommended sequence:** Create navigation metadata categories first; then align permission checks and route intent.
- **What not to touch:** Existing route paths unless a separate routing decision is made.

## 12. Create explicit environment contract documentation in codebase
- **Refactor title:** Codify runtime config schema
- **Current problem:** Required env variables are scattered across files and partially conflict with ops assumptions.
- **Affected files/modules:** `api/axios.js`, `api/socket/socketEvents.js`, `api/crmAxios.js`, `config/firebase.js`, `AddressFormModal.jsx`, deployment docs
- **Business/technical benefit:** Fewer setup/deployment failures, faster onboarding, safer scaling across environments.
- **Risk level:** Low
- **Suggested priority:** P0
- **Recommended sequence:** Inventory all env keys, classify required vs optional, then document owners and fallback behavior.
- **What not to touch:** Existing runtime variable names until deployment owner confirms migration path.
