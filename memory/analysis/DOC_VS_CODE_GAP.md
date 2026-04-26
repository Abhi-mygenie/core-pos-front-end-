# DOC_VS_CODE_GAP

## Scope validated
- Repo in code: `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
- Actual checked branch during this analysis: `step1`
- Actual observed commit during this analysis: `c9d6192`
- Source of truth used here: code under `/app`

---

## 1. Where current-state docs match code

### Repo shape and app architecture
- Frontend app is a React SPA with `App.js` + `index.js` entry points.
  - Evidence: `/app/frontend/src/index.js`, `/app/frontend/src/App.js:24-51`
- App uses React Context providers rather than Redux/Zustand.
  - Evidence: `/app/frontend/src/contexts/AppProviders.jsx:15-33`
- Provider order documented in current-state docs matches code.
  - Evidence: `/app/frontend/src/contexts/AppProviders.jsx:15-33`
- Main route map in docs matches code:
  - `/` login
  - `/loading`
  - `/dashboard`
  - `/reports/audit`
  - `/reports/summary`
  - `/visibility/status-config`
  - Evidence: `/app/frontend/src/App.js:31-41`

### Module coverage
- Docs correctly identify major modules:
  - Authentication/session
  - Loading/bootstrap
  - Dashboard/POS workspace
  - Order entry/cart/payment
  - Rooms/check-in/room transfer
  - Customer/CRM integration
  - Realtime sockets
  - Notifications/Firebase
  - Station view
  - Reports
  - Local visibility/device settings
  - Runtime tables/orders state
- Evidence spans:
  - `/app/frontend/src/pages/LoadingPage.jsx`
  - `/app/frontend/src/pages/DashboardPage.jsx`
  - `/app/frontend/src/components/order-entry/OrderEntry.jsx`
  - `/app/frontend/src/components/modals/RoomCheckInModal.jsx`
  - `/app/frontend/src/api/services/customerService.js`
  - `/app/frontend/src/api/socket/useSocketEvents.js`
  - `/app/frontend/src/contexts/NotificationContext.jsx`
  - `/app/frontend/src/contexts/StationContext.jsx`
  - `/app/frontend/src/api/services/reportService.js`
  - `/app/frontend/src/pages/StatusConfigPage.jsx`

### API/service layer characterization
- Docs correctly describe:
  - central `api/axios.js` client with bearer token injection
  - separate CRM axios client with dynamic API key resolution
  - service + transform pattern for many flows
  - direct page/component API calls still present in some places
- Evidence:
  - `/app/frontend/src/api/axios.js:5-65`
  - `/app/frontend/src/api/crmAxios.js:8-79`
  - `/app/frontend/src/components/order-entry/OrderEntry.jsx`
  - `/app/frontend/src/pages/DashboardPage.jsx`

### Runtime state and local storage coupling
- Docs correctly call out heavy `localStorage` coupling for device behavior and dashboard state.
- Evidence:
  - `/app/frontend/src/pages/StatusConfigPage.jsx:10-53,158-259,403-417`
  - `/app/frontend/src/pages/DashboardPage.jsx:48-63,221-301,344-427`
  - `/app/frontend/src/components/layout/Header.jsx:89-110`
  - `/app/frontend/src/contexts/StationContext.jsx:38-75`
  - `/app/frontend/src/contexts/SettingsContext.jsx`

### Realtime architecture
- Docs correctly state that socket updates mutate shared contexts directly.
- Evidence:
  - `/app/frontend/src/api/socket/useSocketEvents.js:36-191`
  - `/app/frontend/src/api/socket/socketHandlers.js`
  - `/app/frontend/src/contexts/OrderContext.jsx:87-154`
  - `/app/frontend/src/contexts/TableContext.jsx:44-136`

### Known stale endpoint reference
- Docs correctly identify `paymentService.collectPayment()` as stale/unclear because it references `API_ENDPOINTS.CLEAR_BILL`, which does not exist.
- Evidence:
  - `/app/frontend/src/api/services/paymentService.js:12-14`
  - `/app/frontend/src/api/constants.js:6-74`

### Firebase service worker uncertainty resolved by code
- Docs flagged uncertainty around service worker presence; code confirms it exists.
- Evidence:
  - `/app/frontend/public/firebase-messaging-sw.js:1-78`

---

## 2. Where current-state docs are incomplete

### Actual branch/commit are not current
- Current-state docs were written against branch `roomv3` and commit `dbdd78f`, not the analyzed branch `step1` at commit `c9d6192`.
- This does not invalidate all findings, but it does invalidate the docs as a branch-accurate snapshot.
- Evidence:
  - Docs: `/app/memory/current-state/PROJECT_INVENTORY.md:4-8`
  - Actual repo state observed during analysis: `git rev-parse --short HEAD` → `c9d6192`, branch `step1`

### Missing mention of Google Maps env dependency
- Current-state docs list API/socket/CRM/Firebase env dependencies, but they do not mention `REACT_APP_GOOGLE_MAPS_KEY` used by delivery address UI.
- Evidence:
  - `/app/frontend/src/components/order-entry/AddressFormModal.jsx:5`

### Missing mention of large file size concentration
- Docs say `DashboardPage.jsx` and `OrderEntry.jsx` are large, but do not quantify concentration enough to reflect maintenance risk.
- Evidence:
  - `/app/frontend/src/pages/DashboardPage.jsx` → 1652 lines
  - `/app/frontend/src/components/order-entry/OrderEntry.jsx` → 1794 lines
  - `/app/frontend/src/api/services/reportService.js` → 588 lines
  - `/app/frontend/src/api/transforms/orderTransform.js` → 1331 lines

### Missing mention of Firebase SDK split-version setup
- Current-state docs mention Firebase push, but not that the app uses Firebase modular SDK `^12.12.0` while the service worker imports compat scripts from `10.14.1` CDN.
- This may be intentional, but it is an architecture/dependency detail not captured.
- Evidence:
  - `/app/frontend/package.json:47`
  - `/app/frontend/public/firebase-messaging-sw.js:7-8`

### Missing mention of backend scaffold present in repo
- Current-state docs say the app is frontend-only in this repo snapshot; however a backend scaffold exists in this checkout.
- It appears generic/minimal rather than POS backend, but it is still present in repo.
- Evidence:
  - `/app/backend/server.py:1-89`
  - `/app/backend/requirements.txt:1-28`

### Missing mention of station error swallowing behavior
- Station service catches fetch errors and returns error-shaped objects instead of throwing. This affects monitoring and UI reliability but is not called out in current-state docs.
- Evidence:
  - `/app/frontend/src/api/services/stationService.js:201-209`

### Missing mention of report-service business logic concentration
- Current-state docs cover reports functionally, but understate that `reportService.js` contains substantial business-day logic, deduping, normalization, and multi-endpoint reconciliation.
- Evidence:
  - `/app/frontend/src/api/services/reportService.js:60-76,88-144,194-220,389-491,505-567`

---

## 3. Where current-state docs are wrong or materially outdated

### Wrong branch and observed commit
- Current-state docs claim:
  - branch: `roomv3`
  - commit: `dbdd78f`
- Actual analyzed code is on:
  - branch: `step1`
  - commit: `c9d6192`
- Evidence:
  - `/app/memory/current-state/PROJECT_INVENTORY.md:4-8`

### "Frontend-only repo snapshot" is wrong for this checkout
- Docs say no backend source folder exists in the cloned repository.
- Actual code contains `/app/backend/server.py` and `/app/backend/requirements.txt`.
- Evidence:
  - Doc claim: `/app/memory/current-state/PROJECT_INVENTORY.md:265`
  - Actual files: `/app/backend/server.py`, `/app/backend/requirements.txt`

### No-committed-env statement is only partially useful and now misleading in architecture handoff context
- Docs state no committed `.env` file was found. That is true for tracked files in this checkout, but the deeper architecture gap is that runtime instructions expect `REACT_APP_BACKEND_URL`, while code requires `REACT_APP_API_BASE_URL` and `REACT_APP_SOCKET_URL`.
- The docs mention this mismatch, but do not elevate it strongly enough as an environment contract conflict.
- Evidence:
  - `/app/frontend/src/api/axios.js:5-8`
  - `/app/frontend/src/api/socket/socketEvents.js:8-12`
  - `/app/memory/current-state/PROJECT_INVENTORY.md:224-226`

### Socket table-channel commentary is internally inconsistent
- Docs correctly noticed inconsistency, but current code definitively still subscribes to the table channel while comments state that channel was removed.
- This is more than an unclear area; it is an active code-comment contradiction.
- Evidence:
  - Comment says removed: `/app/frontend/src/api/socket/useSocketEvents.js:4-6,125-127`
  - Actual subscription still present: `/app/frontend/src/api/socket/useSocketEvents.js:143-179`

### Service-worker uncertainty is outdated
- Docs list service worker presence as uncertain, but file exists in this branch.
- Evidence:
  - `/app/memory/current-state/MODULE_MAP.md:324-325`
  - `/app/memory/current-state/CURRENT_ARCHITECTURE.md:229`
  - Actual file: `/app/frontend/public/firebase-messaging-sw.js:1-78`

---

## 4. Missing modules / APIs / state flows not captured well enough

### Delivery address map dependency flow
- Missing from docs as a first-class flow:
  - OrderEntry → AddressFormModal → Google Maps key dependency
- Evidence:
  - `/app/frontend/src/components/order-entry/AddressFormModal.jsx:5`

### Report reconciliation flow with running-orders overlay map
- `getAllOrders()` not only combines paid/cancelled/credit, it also computes `_runningOrdersMap` from current running orders for downstream audit/reconciliation behavior.
- Evidence:
  - `/app/frontend/src/api/services/reportService.js:507-565`

### Station view refresh flow from status config
- Status configuration page not only stores settings in localStorage, it pushes them into `StationContext` and optionally refetches station data immediately.
- Evidence:
  - `/app/frontend/src/pages/StatusConfigPage.jsx:419-453`

### Session/runtime debug flags
- Socket and station debug behavior are controllable through localStorage flags (`SOCKET_DEBUG`, `STATION_DEBUG`) but not captured in current-state docs.
- Evidence:
  - `/app/frontend/src/api/socket/socketService.js:31,333`
  - `/app/frontend/src/hooks/useStationSocketRefresh.js:71`

### Backend scaffold contract
- Minimal backend under `/app/backend` exposes `/api` routes and Mongo dependencies; this is absent from current-state frontend-centric architecture docs.
- Evidence:
  - `/app/backend/server.py:17-27,41-78`

---

## 5. Confirmed documentation conflicts that should be carried forward

1. **Branch/commit mismatch**
   - Docs snapshot is not for current `step1` branch.
   - Evidence: `/app/memory/current-state/PROJECT_INVENTORY.md:4-8`

2. **Repo-scope mismatch**
   - Docs claim frontend-only snapshot; checkout includes backend scaffold.
   - Evidence: `/app/backend/server.py`

3. **Environment contract mismatch**
   - Ops instructions prefer `REACT_APP_BACKEND_URL`; code requires `REACT_APP_API_BASE_URL` + `REACT_APP_SOCKET_URL`.
   - Evidence: `/app/frontend/src/api/axios.js:5-8`, `/app/frontend/src/api/socket/socketEvents.js:8-12`

4. **Socket design documentation mismatch**
   - Code comments claim update-table channel removed; implementation still subscribes to it.
   - Evidence: `/app/frontend/src/api/socket/useSocketEvents.js:4-6,143-179`

5. **Service worker uncertainty outdated**
   - File exists.
   - Evidence: `/app/frontend/public/firebase-messaging-sw.js:1-78`

---

## 6. Assumptions explicitly avoided
- No assumption made that backend scaffold is the real production POS backend; only its presence in repo is confirmed.
- No assumption made that all sidebar “coming soon” items are intended roadmap commitments; only current navigability is confirmed.
- No assumption made that Firebase compat service worker is broken; only version split is recorded as a potential maintenance risk.
- No assumption made that `REACT_APP_BACKEND_URL` is unused in deployment wrappers outside repo; only source code usage was validated.
