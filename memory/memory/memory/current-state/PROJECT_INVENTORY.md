# PROJECT_INVENTORY

## Scope
This inventory documents the current `roomv3` frontend codebase as cloned from:
- Repo: `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
- Branch: `roomv3`
- Local checkout: `/app`
- Observed commit: `dbdd78f` (captured after clone)

Code is treated as the source of truth.

## Step-by-step discovery plan used
1. Clone the repository into `/app` on branch `roomv3` and verify current commit.
   - Test: `git branch --show-current`, `git rev-parse --short HEAD`
2. Inspect entry points, package manifest, routes, contexts, API files, and major pages.
   - Test: open `frontend/package.json`, `src/index.js`, `src/App.js`, page/context/service files
3. Discover modules from routes, screens, components, API services, socket flows, and state providers.
   - Test: cross-reference `pages/`, `components/`, `contexts/`, `api/services/`, `api/socket/`
4. Map API usage from constants + services + page-level direct calls.
   - Test: inspect `src/api/constants.js`, service files, and direct `api.*` calls in pages/components
5. Write current-state documentation under `/app/memory/current-state/`.
   - Test: confirm markdown files exist and `git status` shows documentation-only changes

## Repository structure
Top-level structure observed in `/app`:
- `README.md` — placeholder only (`/app/README.md:1`)
- `frontend/` — actual React application
  - `package.json` (`/app/frontend/package.json:1`)
  - `craco.config.js`, Tailwind/PostCSS config, `components.json`
  - `public/`
  - `src/`
- `.git/` — present after clone

### Important `frontend/src` structure
- `App.js`, `index.js` — app boot + route tree (`/app/frontend/src/index.js:1`, `/app/frontend/src/App.js:1`)
- `pages/` — route screens
- `contexts/` — app state via React Context providers
- `api/`
  - `axios.js` — main API client
  - `crmAxios.js` — separate CRM client
  - `constants.js` — endpoint map + status/constants
  - `services/` — API wrappers
  - `transforms/` — API ↔ UI mappers
  - `socket/` — realtime socket layer
- `components/`
  - `layout/` — sidebar/header/banner
  - `cards/` — dashboard cards
  - `order-entry/` — order editing/payment workflow
  - `reports/` — report UI
  - `station-view/` — kitchen station panel
  - `modals/`, `panels/`, `sections/`, `ui/`
- `config/firebase.js` — Firebase push setup
- `constants/`, `hooks/`, `utils/`, `data/`
- `__tests__/` — unit/integration tests are present

## Main dependencies
From `frontend/package.json` (`/app/frontend/package.json:5-100`):

### Core app/runtime
- `react` `^19.0.0` (`/app/frontend/package.json:52`)
- `react-dom` `^19.0.0` (`/app/frontend/package.json:54`)
- `react-router-dom` `^7.5.1` (`/app/frontend/package.json:58`)
- `axios` `^1.8.4` (`/app/frontend/package.json:39`)
- `socket.io-client` `^4.8.3` (`/app/frontend/package.json:61`)
- `firebase` `^12.12.0` (`/app/frontend/package.json:47`)

### Forms / validation / inputs
- `react-hook-form` (`/app/frontend/package.json:55`)
- `@hookform/resolvers` (`/app/frontend/package.json:7`)
- `zod` (`/app/frontend/package.json:66`)
- `react-phone-number-input` (`/app/frontend/package.json:56`)
- `libphonenumber-js` (`/app/frontend/package.json:49`)
- `input-otp` (`/app/frontend/package.json:48`)

### UI / styling
- Tailwind + PostCSS stack (`/app/frontend/package.json:97-98`, `85-98`)
- Many Radix UI primitives (`/app/frontend/package.json:8-38`)
- `lucide-react` icons (`/app/frontend/package.json:50`)
- `sonner`, `vaul`, `embla-carousel-react`, `recharts`

### Utility / app-specific
- `browser-image-compression` (`/app/frontend/package.json:40`)
- `date-fns` (`/app/frontend/package.json:45`)
- `@hello-pangea/dnd` (`/app/frontend/package.json:6`)
- `next-themes` (`/app/frontend/package.json:51`)

### Build tooling
- `@craco/craco` (`/app/frontend/package.json:87`)
- `react-scripts` `5.0.1` (`/app/frontend/package.json:59`)
- ESLint stack (`/app/frontend/package.json:88-96`)

## Scripts / build commands
Defined in `frontend/package.json`:
- `yarn start` → `craco start` (`/app/frontend/package.json:68-71`)
- `yarn build` → `craco build` (`/app/frontend/package.json:68-71`)
- `yarn test` → `craco test` (`/app/frontend/package.json:68-71`)

## Routing entry points
### App boot
- React root mounts `<App />` in `src/index.js` (`/app/frontend/src/index.js:1-11`)
- `App` wraps the app with:
  - `ErrorBoundary` (`/app/frontend/src/App.js:26`)
  - `AppProviders` (`/app/frontend/src/App.js:27`)
  - `BrowserRouter` (`/app/frontend/src/App.js:30`)

### Discovered routes
From `src/App.js`:
- `/` → `LoginPage` (`/app/frontend/src/App.js:32`)
- `/loading` → protected `LoadingPage` (`/app/frontend/src/App.js:33`)
- `/dashboard` → protected `DashboardPage` (`/app/frontend/src/App.js:34`)
- `/reports` → redirect to `/reports/audit` (`/app/frontend/src/App.js:36`)
- `/reports/audit` → protected `AllOrdersReportPage` (`/app/frontend/src/App.js:37`)
- `/reports/all-orders` → redirect to `/reports/audit` (`/app/frontend/src/App.js:38`)
- `/reports/summary` → protected `OrderSummaryPage` (`/app/frontend/src/App.js:39`)
- `/visibility/status-config` → protected `StatusConfigPage` (`/app/frontend/src/App.js:41`)

### Route guards
- `ProtectedRoute` used for every non-login screen (`/app/frontend/src/App.js:33-41`)
- `ErrorBoundary` wraps the full app (`/app/frontend/src/App.js:26-47`)

## State management files
The app uses React Context, not Redux/Zustand.

### Provider composition order
`AppProviders` wraps providers in this order (`/app/frontend/src/contexts/AppProviders.jsx:12-33`):
1. `AuthProvider`
2. `SocketProvider`
3. `NotificationProvider`
4. `RestaurantProvider`
5. `MenuProvider`
6. `TableProvider`
7. `SettingsProvider`
8. `OrderProvider`
9. `StationProvider`

### Context files
- `AuthContext.jsx` — auth token, permissions, login/logout (`/app/frontend/src/contexts/AuthContext.jsx:8-116`)
- `RestaurantContext.jsx` — restaurant profile/features/settings (`/app/frontend/src/contexts/RestaurantContext.jsx:7-126`)
- `MenuContext.jsx` — categories/products/popular food (`/app/frontend/src/contexts/MenuContext.jsx:7-131`)
- `TableContext.jsx` — unified tables + rooms, engage locks, refresh helpers (`/app/frontend/src/contexts/TableContext.jsx:9-270`)
- `SettingsContext.jsx` — cancellation reasons + local UI config (`/app/frontend/src/contexts/SettingsContext.jsx:11-109`)
- `OrderContext.jsx` — unified running orders + socket mutation helpers (`/app/frontend/src/contexts/OrderContext.jsx:8-393`)
- `StationContext.jsx` — station view config/data (`/app/frontend/src/contexts/StationContext.jsx:13-161`)
- `SocketContext.jsx` — connection lifecycle + subscriptions (`/app/frontend/src/contexts/SocketContext.jsx:16-248`)
- `NotificationContext.jsx` — FCM foreground/background notification handling (`/app/frontend/src/contexts/NotificationContext.jsx:24-186`)

## API / service layer files
### Main HTTP clients
- Main API client: `src/api/axios.js`
  - uses `process.env.REACT_APP_API_BASE_URL` (`/app/frontend/src/api/axios.js:5-18`)
  - injects `Authorization: Bearer <auth_token>` from localStorage (`/app/frontend/src/api/axios.js:21-32`)
  - on `401`, clears auth keys and redirects to `/` (`/app/frontend/src/api/axios.js:39-65`)
- CRM API client: `src/api/crmAxios.js`
  - uses `process.env.REACT_APP_CRM_BASE_URL` (`/app/frontend/src/api/crmAxios.js:8`)
  - parses `process.env.REACT_APP_CRM_API_KEYS` (`/app/frontend/src/api/crmAxios.js:11-16`)
  - injects `X-API-Key` based on current restaurant id (`/app/frontend/src/api/crmAxios.js:29-41`, `52-79`)

### Service files discovered
- `authService.js` — login/logout/token helpers
- `profileService.js` — vendor/restaurant profile fetch
- `categoryService.js`
- `productService.js`
- `tableService.js`
- `orderService.js`
- `settingsService.js`
- `reportService.js`
- `stationService.js`
- `roomService.js`
- `paymentService.js`
- `customerService.js`
- `profileService.js`
- `roomService.js`

## Socket / realtime files
- Socket env + event constants: `src/api/socket/socketEvents.js` (`/app/frontend/src/api/socket/socketEvents.js:7-155`)
- Connection manager singleton: `src/api/socket/socketService.js` (`/app/frontend/src/api/socket/socketService.js:21-364`)
- Event handlers: `src/api/socket/socketHandlers.js` (`/app/frontend/src/api/socket/socketHandlers.js:138-651`)
- React subscription hook: `src/api/socket/useSocketEvents.js` (`/app/frontend/src/api/socket/useSocketEvents.js:36-194`)
- Station-specific refresh hook: `src/hooks/useStationSocketRefresh.js` (`/app/frontend/src/hooks/useStationSocketRefresh.js:107-288`)

## Key shared components / hooks / utils
### Shared layout
- `Sidebar.jsx` — navigation, refresh, silent mode, logout (`/app/frontend/src/components/layout/Sidebar.jsx:111-522`)
- `Header.jsx` — filters, search, add button, online indicator (`/app/frontend/src/components/layout/Header.jsx:31-647`)
- `NotificationBanner.jsx` — dashboard banner (used in `DashboardPage`) (`/app/frontend/src/pages/DashboardPage.jsx:24`, `1298`)

### Core workflow component
- `OrderEntry.jsx` — main create/edit/pay order workflow (`/app/frontend/src/components/order-entry/OrderEntry.jsx:38-1274+`)

### Data refresh hooks
- `useRefreshAllData.js` — refreshes tables, menu, and orders (`/app/frontend/src/hooks/useRefreshAllData.js:14-45`)
- `useStationSocketRefresh.js` — refreshes station data on selected socket events (`/app/frontend/src/hooks/useStationSocketRefresh.js:1-288`)

### Utilities
- `utils/businessDay.js` — report business-day range logic (used by reports) (`/app/frontend/src/pages/AllOrdersReportPage.jsx:15`, `/app/frontend/src/api/services/reportService.js:14`)
- `utils/soundManager.js` — notification sounds (used by `NotificationContext`) (`/app/frontend/src/contexts/NotificationContext.jsx:5`)
- `lib/utils.js` — generic utility barrel for UI helpers

## Environment variable usage discovered in code
No committed `.env` file was found in the cloned repo tree, but code references these environment variables:

### Required / strongly expected by code
- `REACT_APP_API_BASE_URL`
  - `src/api/axios.js` (`/app/frontend/src/api/axios.js:5-8`)
  - image URL helpers in transforms (`/app/frontend/src/api/transforms/profileTransform.js:17-22`)
- `REACT_APP_SOCKET_URL`
  - `src/api/socket/socketEvents.js` (`/app/frontend/src/api/socket/socketEvents.js:8-12`)
- `REACT_APP_CRM_BASE_URL`
  - `src/api/crmAxios.js:8-20`
- `REACT_APP_CRM_API_KEYS`
  - `src/api/crmAxios.js:11-16`

### Firebase / push notifications
From `src/config/firebase.js`:
- `REACT_APP_FIREBASE_API_KEY` (`/app/frontend/src/config/firebase.js:6`)
- `REACT_APP_FIREBASE_AUTH_DOMAIN` (`/app/frontend/src/config/firebase.js:7`)
- `REACT_APP_FIREBASE_PROJECT_ID` (`/app/frontend/src/config/firebase.js:8`)
- `REACT_APP_FIREBASE_STORAGE_BUCKET` (`/app/frontend/src/config/firebase.js:9`)
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` (`/app/frontend/src/config/firebase.js:10`)
- `REACT_APP_FIREBASE_APP_ID` (`/app/frontend/src/config/firebase.js:11`)
- `REACT_APP_FIREBASE_MEASUREMENT_ID` (`/app/frontend/src/config/firebase.js:12`)
- `REACT_APP_FIREBASE_VAPID_KEY` (`/app/frontend/src/config/firebase.js:15`)

### Environment uncertainty
- The provided environment/setup instructions mention `REACT_APP_BACKEND_URL`, but current frontend code uses `REACT_APP_API_BASE_URL` and `REACT_APP_SOCKET_URL` instead. This is a current-state mismatch between instructions and code, not resolved here. Evidence: `/app/frontend/src/api/axios.js:5`, `/app/frontend/src/api/socket/socketEvents.js:9`.
- No committed `.env` file was found in the repository during discovery.

## Direct API usage outside services
Most HTTP traffic goes through `api/services/*`, but direct calls also exist:
- `DashboardPage.jsx`
  - `api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, payload)` during order cancel (`/app/frontend/src/pages/DashboardPage.jsx:1131-1134`)
  - `api.put(API_ENDPOINTS.FOOD_STATUS_UPDATE, payload)` for item status updates (`/app/frontend/src/pages/DashboardPage.jsx:1260-1269`)
- `OrderEntry.jsx`
  - direct `api.put/post` for update order, place order, transfer food, merge table, shift table, cancel item/order, add custom item, collect payment, etc. (`/app/frontend/src/components/order-entry/OrderEntry.jsx:626-681`, `729-805`, `831-850`, `1219-1235` and surrounding lines)

## Feature flags / local device configuration
### Hardcoded feature flags
- `USE_CHANNEL_LAYOUT = true` (`/app/frontend/src/constants/featureFlags.js:20`)
- `USE_STATUS_VIEW = true` (`/app/frontend/src/constants/featureFlags.js:37`)

### LocalStorage-driven device/UI config
Observed keys in `DashboardPage`, `Sidebar`, `Header`, `StatusConfigPage`, `StationContext`, `SettingsContext`:
- `mygenie_enabled_statuses` (`/app/frontend/src/pages/DashboardPage.jsx:219-230`, `/app/frontend/src/pages/StatusConfigPage.jsx:10-12`)
- `mygenie_channel_visibility` (`/app/frontend/src/pages/DashboardPage.jsx:232-242`, `/app/frontend/src/pages/StatusConfigPage.jsx:16-18`)
- `mygenie_layout_table_view`, `mygenie_layout_order_view` (`/app/frontend/src/pages/StatusConfigPage.jsx:19-21`)
- `mygenie_view_mode_table_order`, `mygenie_view_mode_channel_status` (`/app/frontend/src/pages/DashboardPage.jsx:266-304`, `/app/frontend/src/pages/StatusConfigPage.jsx:32-35`)
- `mygenie_default_pos_view`, `mygenie_default_dashboard_view` (`/app/frontend/src/pages/DashboardPage.jsx:46-56`, `/app/frontend/src/pages/StatusConfigPage.jsx:43-46`)
- `mygenie_order_taking_enabled` (`/app/frontend/src/pages/DashboardPage.jsx:61-70`, `421-472`, `/app/frontend/src/components/layout/Header.jsx:87-110`, `/app/frontend/src/pages/StatusConfigPage.jsx:52-53`)
- `mygenie_station_view_config` (`/app/frontend/src/contexts/StationContext.jsx:8`, `/app/frontend/src/api/services/stationService.js:8`, `/app/frontend/src/pages/StatusConfigPage.jsx:13-15`)
- `mygenie_enable_dynamic_tables` (`/app/frontend/src/contexts/SettingsContext.jsx:5`, `16-26`)

## Testing assets present
The codebase includes tests under `src/__tests__/` for:
- API constants / axios / payment service
- socket events and service
- transforms
- contexts
- route integration
Examples:
- `/app/frontend/src/__tests__/integration/App.routing.test.jsx`
- `/app/frontend/src/__tests__/contexts/SocketContext.test.jsx`
- `/app/frontend/src/__tests__/api/paymentService.test.js`

## Important current-state observations
1. The app is frontend-only in this repo snapshot; no backend source folder exists in the cloned repository.
2. React Context is the primary state mechanism.
3. Dashboard behavior is heavily influenced by localStorage-based device configuration.
4. Realtime updates are handled through Socket.IO plus context mutation.
5. CRM and Firebase integrations are optional at runtime but present in code.
6. Some comments reference 2026 bug/task history; documentation here records those comments as found, without validating every historical claim.
7. `paymentService.collectPayment()` references `API_ENDPOINTS.CLEAR_BILL`, but `CLEAR_BILL` was not found in `src/api/constants.js`; this suggests an unclear or stale path. Evidence: `/app/frontend/src/api/services/paymentService.js:12-14`, `/app/frontend/src/api/constants.js:6-74`.
