# SCALING_RISK_REGISTER

## 1. Monolithic dashboard orchestration
- **Area/module:** Dashboard / POS workspace
- **Evidence from code:** `/app/frontend/src/pages/DashboardPage.jsx` is 1652 lines and mixes local storage hydration, socket wiring, filtering, action orchestration, modal control, and layout behavior.
- **Impact:** Slower feature delivery, regression-prone changes, harder onboarding, higher defect density under scale.
- **Severity:** Critical
- **Suggested mitigation:** Split by concerns first: view-state hooks, card action controllers, channel/status derivation, modal orchestration, local-storage preference adapters.
- **Decision needed:** Yes

## 2. Monolithic order-entry workflow
- **Area/module:** Order creation / edit / payment / transfer / print
- **Evidence from code:** `/app/frontend/src/components/order-entry/OrderEntry.jsx` is 1794 lines with mixed UI, API calls, transforms, payment logic, printing, room-transfer, and CRM interactions.
- **Impact:** High change risk in revenue-critical flow; difficult to test or safely extend.
- **Severity:** Critical
- **Suggested mitigation:** Extract workflow services/hooks by subdomain: cart math, customer/address, order submit, payment submit, transfer/split/print actions.
- **Decision needed:** Yes

## 3. Environment contract drift between ops guidance and code
- **Area/module:** App bootstrap / deployment / runtime config
- **Evidence from code:** Frontend requires `REACT_APP_API_BASE_URL` and `REACT_APP_SOCKET_URL` (`/app/frontend/src/api/axios.js:5-8`, `/app/frontend/src/api/socket/socketEvents.js:8-12`) while environment guidance outside code references `REACT_APP_BACKEND_URL`.
- **Impact:** Fragile deployments, failed builds, inconsistent environments across stages.
- **Severity:** Critical
- **Suggested mitigation:** Define and publish a single frontend env contract; document ownership of API base, socket URL, CRM, Firebase, and maps keys.
- **Decision needed:** Yes

## 4. Mixed API access patterns
- **Area/module:** API integration / domain actions
- **Evidence from code:** Some flows use service wrappers; others call `api` directly inside pages/components such as `DashboardPage` and `OrderEntry`.
- **Impact:** Inconsistent error handling, duplicated payload logic, harder observability, harder contract migrations.
- **Severity:** High
- **Suggested mitigation:** Standardize new work on service/action-layer entry points; gradually collapse direct API calls behind domain actions.
- **Decision needed:** Yes

## 5. Socket implementation/documentation contradiction
- **Area/module:** Realtime updates
- **Evidence from code:** `useSocketEvents.js` comments say update-table channel removed, but code still subscribes to it (`/app/frontend/src/api/socket/useSocketEvents.js:4-6,143-179`).
- **Impact:** Confused maintenance, duplicate update paths, accidental double mutations, hard RCA during sync bugs.
- **Severity:** High
- **Suggested mitigation:** Decide source of truth for table status updates, then align comments, tests, and implementation.
- **Decision needed:** Yes

## 6. Heavy localStorage coupling for business behavior
- **Area/module:** Dashboard behavior / device config / view rules
- **Evidence from code:** Extensive reliance across `DashboardPage.jsx`, `StatusConfigPage.jsx`, `Header.jsx`, `Sidebar.jsx`, `StationContext.jsx`.
- **Impact:** Multi-device inconsistency, hard-to-debug state drift, weak auditability, poor enterprise manageability.
- **Severity:** High
- **Suggested mitigation:** Define which settings are truly device-local vs user-level vs restaurant-level; isolate persistence adapter behind a config service.
- **Decision needed:** Yes

## 7. Station endpoint hardcoded and station errors swallowed
- **Area/module:** Station/kitchen aggregation
- **Evidence from code:** Endpoint hardcoded in `stationService.fetchStationData()` and errors are converted into success-shaped fallback objects (`/app/frontend/src/api/services/stationService.js:131,201-209`).
- **Impact:** Harder endpoint governance, silent data quality issues, weak monitoring when kitchen data fails.
- **Severity:** High
- **Suggested mitigation:** Centralize endpoint in constants and distinguish "empty station" from "station fetch failed" in returned state.
- **Decision needed:** Yes

## 8. Stale payment service entry point
- **Area/module:** Payment integration surface
- **Evidence from code:** `paymentService.collectPayment()` uses nonexistent `API_ENDPOINTS.CLEAR_BILL` (`/app/frontend/src/api/services/paymentService.js:12-14`, `/app/frontend/src/api/constants.js:6-74`).
- **Impact:** Hidden dead code, accidental future misuse in payment path, misleading test/documentation surface.
- **Severity:** Medium
- **Suggested mitigation:** Confirm canonical payment entry path and deprecate/remove stale API abstraction in a controlled refactor.
- **Decision needed:** Yes

## 9. Reports layer contains growing business logic and reconciliation logic
- **Area/module:** Reporting / audit
- **Evidence from code:** `reportService.js` performs business-day range calculation, multi-endpoint merging, dedupe, and running-order overlay mapping (`/app/frontend/src/api/services/reportService.js:60-76,88-144,194-220,389-491,505-567`).
- **Impact:** Reporting rules become hard to validate and reuse; scaling reports/features will concentrate complexity in one service file.
- **Severity:** High
- **Suggested mitigation:** Separate API adapters, business-day policy helpers, normalizers, and tab-specific orchestration.
- **Decision needed:** Yes

## 10. CRM integration can fail soft without clear UX contract
- **Area/module:** Customer/CRM integration
- **Evidence from code:** Missing CRM base URL/API keys only warn; request interceptor may proceed without a key (`/app/frontend/src/api/crmAxios.js:18-20,55-60`).
- **Impact:** Intermittent customer/address failures with weak operator feedback; harder multi-tenant rollout.
- **Severity:** High
- **Suggested mitigation:** Define explicit degraded-mode UX and required telemetry when CRM config is missing per restaurant.
- **Decision needed:** Yes

## 11. Firebase runtime uses modular SDK while SW uses older compat CDN
- **Area/module:** Notifications / push
- **Evidence from code:** `firebase` dependency is `^12.12.0` in app, but service worker imports compat scripts from `10.14.1` CDN (`/app/frontend/package.json:47`, `/app/frontend/public/firebase-messaging-sw.js:7-8`).
- **Impact:** Upgrade friction, hard-to-diagnose push issues, split dependency assumptions.
- **Severity:** Medium
- **Suggested mitigation:** Define long-term notification integration strategy and version alignment policy.
- **Decision needed:** Yes

## 12. Large transform file is becoming business-rule sink
- **Area/module:** Order transforms / pricing / room billing / print payloads
- **Evidence from code:** `/app/frontend/src/api/transforms/orderTransform.js` is 1331 lines and contains many order/payment/print/room payload builders.
- **Impact:** Small changes can break multiple flows; difficult to reason about financial correctness.
- **Severity:** High
- **Suggested mitigation:** Split transform domains: runtime order mapping, submit payloads, payment payloads, print payloads, room-specific financial transforms.
- **Decision needed:** Yes

## 13. Soft-failure pattern obscures monitoring signal
- **Area/module:** Station/CRM/report helper flows
- **Evidence from code:** Multiple service methods convert errors to empty arrays/nulls or fallback objects (`stationService`, parts of `customerService`, parts of `reportService`).
- **Impact:** Operators may see “no data” instead of “failed data,” slowing incident detection.
- **Severity:** Medium
- **Suggested mitigation:** Distinguish transport failure, auth failure, and valid empty state in normalized responses.
- **Decision needed:** Yes

## 14. Frontend contains many conceptual routes/features not actually implemented as routes
- **Area/module:** Navigation / capability surface
- **Evidence from code:** Sidebar exposes many sections as coming soon or panel-only while route tree is narrow (`/app/frontend/src/components/layout/Sidebar.jsx:31-109,206-231`, `/app/frontend/src/App.js:31-41`).
- **Impact:** Information architecture drift, user confusion, harder permission and feature ownership planning.
- **Severity:** Medium
- **Suggested mitigation:** Separate actual modules, panel utilities, and roadmap placeholders in navigation architecture.
- **Decision needed:** Yes
