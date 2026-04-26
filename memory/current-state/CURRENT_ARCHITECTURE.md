# CURRENT_ARCHITECTURE

## 1. Current frontend architecture
The current app is a React 19 + CRACO single-page application using React Router and React Context as the primary state mechanism.

### Core composition
- React entry: `src/index.js` mounts `<App />` (`/app/frontend/src/index.js:1-11`)
- App shell: `ErrorBoundary` → `AppProviders` → `BrowserRouter` → `Routes` (`/app/frontend/src/App.js:24-47`)
- Context provider stack: `Auth → Socket → Notification → Restaurant → Menu → Table → Settings → Order → Station` (`/app/frontend/src/contexts/AppProviders.jsx:12-33`)

### Architectural style observed
- **Context-centric state management** for nearly all app state
- **Service + transform layer** for most API integrations
- **Feature-flag + localStorage-driven UI behavior** for dashboard modes and visibility settings
- **Socket-driven runtime mutation** for live order/table updates
- **Large page/component orchestrators** (especially `DashboardPage.jsx` and `OrderEntry.jsx`) containing significant business logic

## 2. Routing flow
### Route map
From `src/App.js`:
- `/` → `LoginPage` (`/app/frontend/src/App.js:32`)
- `/loading` → protected bootstrap screen (`/app/frontend/src/App.js:33`)
- `/dashboard` → protected POS workspace (`/app/frontend/src/App.js:34`)
- `/reports/audit` → protected audit report (`/app/frontend/src/App.js:37`)
- `/reports/summary` → protected summary report (`/app/frontend/src/App.js:39`)
- `/visibility/status-config` → protected local configuration (`/app/frontend/src/App.js:41`)

### Runtime flow
1. User starts at `LoginPage`.
2. After successful login, app navigates to `/loading` (`/app/frontend/src/pages/LoginPage.jsx:82-86`).
3. `LoadingPage` fetches and hydrates startup data, then redirects to `/dashboard` (`/app/frontend/src/pages/LoadingPage.jsx:89-99`, `91-95`).
4. Sidebar navigation can move user to reports or status config (`/app/frontend/src/components/layout/Sidebar.jsx:205-231`).

### Guarding
- Non-login routes are wrapped in `ProtectedRoute` (`/app/frontend/src/App.js:33-41`)
- Axios `401` handling can force a redirect back to `/` (`/app/frontend/src/api/axios.js:40-52`)

## 3. Data flow
### Startup / hydration flow
`LoadingPage` is the main hydration orchestrator:
1. Fetch profile (`/app/frontend/src/pages/LoadingPage.jsx:174-201`)
2. Fetch categories (`203-216`)
3. Fetch products (`218-236`)
4. Fetch tables (`238-252`)
5. Fetch cancellation reasons (`254-269`)
6. Fetch popular food (`271-286`)
7. Fetch running orders (`288-304`)
8. Dispatch data into contexts (`331-336`)
9. Fetch station data (`103-161`)

### Runtime context flow
- `RestaurantContext` holds restaurant profile, features, defaults, settings, and derived values (`/app/frontend/src/contexts/RestaurantContext.jsx:23-108`)
- `MenuContext` holds categories/products/popular food and lookup helpers (`/app/frontend/src/contexts/MenuContext.jsx:13-113`)
- `TableContext` holds a unified list of tables and rooms, plus engage-lock state (`/app/frontend/src/contexts/TableContext.jsx:10-27`, `44-55`, `94-136`)
- `OrderContext` holds a unified order list, derived channel splits, and engage-lock state (`/app/frontend/src/contexts/OrderContext.jsx:9-39`, `87-154`, `160-375`)
- `SettingsContext` combines API-fetched cancellation reasons with local device settings (`/app/frontend/src/contexts/SettingsContext.jsx:12-91`)
- `StationContext` stores station view configuration and fetched station data (`/app/frontend/src/contexts/StationContext.jsx:14-141`)

### Page/component consumption flow
- `DashboardPage` reads from Restaurant, Tables, Orders, Auth, and Settings contexts to derive current cards/columns (`/app/frontend/src/pages/DashboardPage.jsx:157-178`)
- `OrderEntry` reads from Menu, Orders, Settings, Restaurant, Auth, Tables to build cart and submit actions (`/app/frontend/src/components/order-entry/OrderEntry.jsx:40-46`)
- Report pages directly call report services and also consume restaurant context for schedules/currency (`/app/frontend/src/pages/AllOrdersReportPage.jsx:73-75`, `/app/frontend/src/pages/OrderSummaryPage.jsx:18-20`)

## 4. API integration flow
### Standard pattern
Most backend requests follow this chain:
1. UI/page/component triggers service call
2. Service uses `api` or `crmApi`
3. Optional transform normalizes request/response
4. Context/page stores normalized result

Examples:
- login: `LoginPage` → `AuthContext.login` → `authService.login` → `authTransform` (`/app/frontend/src/pages/LoginPage.jsx:82-86`, `/app/frontend/src/contexts/AuthContext.jsx:18-28`, `/app/frontend/src/api/services/authService.js:13-31`)
- profile: `LoadingPage` → `profileService.getProfile` → `profileTransform` (`/app/frontend/src/pages/LoadingPage.jsx:178-195`, `/app/frontend/src/api/services/profileService.js:11-14`)
- running orders: `LoadingPage` / `OrderContext.refreshOrders` → `orderService.getRunningOrders` → `orderTransform.fromAPI.orderList` (`/app/frontend/src/pages/LoadingPage.jsx:291-298`, `/app/frontend/src/contexts/OrderContext.jsx:35-39`, `/app/frontend/src/api/services/orderService.js:12-17`)

### Exceptions to the standard pattern
Some calls bypass service wrappers and use `api` directly in pages/components:
- `DashboardPage` direct cancel/item status calls (`/app/frontend/src/pages/DashboardPage.jsx:1131-1134`, `1260-1269`)
- `OrderEntry` direct place/update/merge/shift/transfer/cancel calls (`/app/frontend/src/components/order-entry/OrderEntry.jsx:626-681`, `729-805`, `831-850`, `1219-1235`)

### Report API flow
Reports use a richer aggregation service layer:
- `reportService.js` fetches one or more endpoints
- normalizes various backend shapes through `reportTransform.js`
- pages then filter/tabulate client-side (`/app/frontend/src/api/services/reportService.js:88-572`, `/app/frontend/src/api/transforms/reportTransform.js:147-710`)

### CRM API flow
- `LoadingPage` sets current restaurant id for CRM key selection (`/app/frontend/src/pages/LoadingPage.jsx:191-194`)
- `crmAxios` resolves `X-API-Key` per restaurant (`/app/frontend/src/api/crmAxios.js:29-41`, `52-61`)
- customer/address services then use that client (`/app/frontend/src/api/services/customerService.js:5-178`)

## 5. Auth / session / token flow
### Login/session lifecycle
1. `LoginPage` calls `requestFCMToken()` before attempting login (`/app/frontend/src/pages/LoginPage.jsx:53-78`)
2. `authService.login()` sends credentials and stores `auth_token` in localStorage (`/app/frontend/src/api/services/authService.js:13-25`)
3. `AuthContext` stores token in state and derives `isAuthenticated` (`/app/frontend/src/contexts/AuthContext.jsx:9-16`, `21-24`)
4. `ProtectedRoute` gates protected routes (route usage shown in `App.js`)
5. After login, profile bootstrap loads user/restaurant/permissions (`/app/frontend/src/pages/LoadingPage.jsx:189-190`)
6. Logout clears auth token and most app/session state (`/app/frontend/src/contexts/AuthContext.jsx:31-37`, `/app/frontend/src/components/layout/Sidebar.jsx:233-246`)

### API auth
- Main API client adds `Authorization` from `localStorage.auth_token` (`/app/frontend/src/api/axios.js:21-27`)
- CRM client does **not** use bearer token; it uses `X-API-Key` (`/app/frontend/src/api/crmAxios.js:52-61`)

### Session failure handling
- Any `401` from main axios client clears stored auth and redirects to `/` (`/app/frontend/src/api/axios.js:40-52`)

### Remember-me behavior
- `authService.login()` stores `remember_me` and `user_email` when selected (`/app/frontend/src/api/services/authService.js:22-29`)
- `LoginPage` restores remembered email on mount (`/app/frontend/src/pages/LoginPage.jsx:23-29`)

## 6. State management approach
### Primary approach: React Context
There is no Redux/Zustand store in current code. State is partitioned by domain through Context providers.

### Shared state categories
- auth/session: `AuthContext`
- profile/restaurant defaults: `RestaurantContext`
- catalog/menu: `MenuContext`
- tables/rooms: `TableContext`
- orders: `OrderContext`
- app settings / cancellation reasons / device flags: `SettingsContext`
- sockets: `SocketContext`
- notifications: `NotificationContext`
- station panel data: `StationContext`

### Local page/component state
Complex pages also keep large local UI state:
- `DashboardPage` contains extensive local state for filters, hidden columns, localStorage-derived toggles, search, modals, and order entry overlays (`/app/frontend/src/pages/DashboardPage.jsx:205-419`)
- `OrderEntry` contains extensive local state for cart, notes, customer/address, split, payment, and modals (`/app/frontend/src/components/order-entry/OrderEntry.jsx:76-123`)

### Persistence outside React state
The app relies heavily on `localStorage` for device-specific behavior:
- channel/status visibility
- view mode locks/defaults
- order-taking enablement
- station view config
- dynamic tables flag
Evidence across `DashboardPage`, `Header`, `Sidebar`, `StatusConfigPage`, `StationContext`, `SettingsContext`.

## 7. Realtime / socket integration flow
### Connection lifecycle
- `SocketProvider` connects only when authenticated (`/app/frontend/src/contexts/SocketContext.jsx:32-64`)
- visibility and online/offline events can trigger reconnect attempts (`/app/frontend/src/contexts/SocketContext.jsx:70-113`)
- low-level connection management is in `socketService` singleton (`/app/frontend/src/api/socket/socketService.js:21-364`)

### Channel subscription flow
`useSocketEvents()`:
1. gets current `restaurant.id` from `RestaurantContext`
2. computes dynamic channels:
   - `new_order_${restaurantId}`
   - `update_table_${restaurantId}`
   - `order-engage_${restaurantId}`
3. subscribes through `SocketContext.subscribe()` (`/app/frontend/src/api/socket/useSocketEvents.js:129-180`)

### Mutation flow
Socket handlers mutate shared contexts by calling:
- `addOrder`, `updateOrder`, `removeOrder`
- `updateTableStatus`
- `setOrderEngaged`, `setTableEngaged`
Evidence: `/app/frontend/src/api/socket/socketHandlers.js:146-197`, `221-289`, `308-354`, `366-412`, `471-544`, `560-600`

### Architectural note
The current architecture uses **contexts as the live runtime source of truth**, with sockets updating them directly and UI re-rendering off context state.

## 8. Component structure
### Top-level structure
- `App` defines routes and global wrappers
- route pages are thin-to-medium shells except `DashboardPage`, `LoadingPage`, `StatusConfigPage`

### Key component layers
- `pages/` — route-level screens
- `components/layout/` — navigation/header/banner
- `components/cards/` — dashboard cards
- `components/sections/` / `components/dashboard/` — dashboard layouts
- `components/order-entry/` — major workflow subsystem
- `components/reports/` — reports subsystem
- `components/station-view/` — station subsystem
- `components/ui/` — generic UI primitives

### Observed composition pattern
- many “business components” are composed from domain contexts + local UI state
- transform files centralize shape normalization for APIs
- comments in some files act as embedded historical handover notes

## 9. External PaaS / third-party dependency summary
### Backend API (external or separately hosted)
- Main app backend is addressed through `REACT_APP_API_BASE_URL` (`/app/frontend/src/api/axios.js:5-18`)
- Socket server URL is separate via `REACT_APP_SOCKET_URL` (`/app/frontend/src/api/socket/socketEvents.js:8-12`)

### CRM service
- separate CRM base URL + restaurant-scoped API key mapping (`/app/frontend/src/api/crmAxios.js:3-20`, `29-41`)

### Firebase Cloud Messaging
- app initializes Firebase from env and registers messaging service worker (`/app/frontend/src/config/firebase.js:5-27`, `59-71`)
- used for order/notification push behavior

### Socket.IO realtime service
- separate transport/server dependency via `socket.io-client` and `REACT_APP_SOCKET_URL` (`/app/frontend/src/api/socket/socketService.js:1-6`, `/app/frontend/src/api/socket/socketEvents.js:7-18`)

## 10. Known architectural limitations observed from code
These are observations about the current code shape, not proposed fixes.

1. **Very large orchestration files**
   - `DashboardPage.jsx` and `OrderEntry.jsx` concentrate extensive UI + business + networking logic in single files.
2. **Mixed API access patterns**
   - some flows use service wrappers + transforms; others call `api` directly from pages/components.
3. **Heavy localStorage coupling**
   - dashboard behavior depends on many local keys across multiple files, increasing runtime coupling.
4. **Context coupling is high**
   - dashboard/order-entry/sockets depend on multiple contexts simultaneously.
5. **Socket behavior documentation in comments is partly inconsistent with active code**
   - comments mention dropped table-channel subscription, but `useSocketEvents.js` still subscribes to the table channel (`/app/frontend/src/api/socket/useSocketEvents.js:143-180`).
6. **Environment contract mismatch exists between instructions and code**
   - current code expects `REACT_APP_API_BASE_URL` and `REACT_APP_SOCKET_URL`; provided setup guidance mentioned `REACT_APP_BACKEND_URL`.
7. **No committed env files were found**
   - runtime configuration is required but not represented in repo.
8. **One stale/unclear endpoint reference exists**
   - `paymentService.js` references `API_ENDPOINTS.CLEAR_BILL`, but that constant is not present in `api/constants.js`.
9. **Direct route coverage is narrower than sidebar tree suggests**
   - sidebar lists more conceptual sections than `App.js` actually routes.
10. **Business rules are partially embedded in comments and bug-history notes**
   - current intent sometimes depends on inline historical commentary instead of centralized architecture docs.

## 11. Current-state uncertainties
1. The exact runtime env variable mapping used in deployment cannot be verified from committed repo files because `.env` files are absent.
2. Some deep payment/autoprint flows in `OrderEntry.jsx` were only partially viewable due to file size, though enough was visible to identify the main patterns.
3. Presence/contents of `firebase-messaging-sw.js` in the deployed frontend were not validated in this discovery pass.
4. Some menu-management/settings sidebar entries open panels or “coming soon” states rather than routed modules, so their functional completeness is unclear from route mapping alone.
