# MODULE_MAP

This map groups the current frontend by discovered functional modules. Module names are derived from routes, components, services, contexts, and flows found in code.

## 1. Authentication & Session
### Purpose
Handles login, token persistence, auth guard behavior, and logout.

### User flow
1. User lands on `/` and enters email/password on `LoginPage`.
2. App optionally requests FCM permission/token before login.
3. `AuthContext.login()` calls `authService.login()`.
4. Token is stored in localStorage.
5. User is redirected to `/loading`.
6. If API later returns `401`, axios clears auth state and redirects to `/`.

### Routes / screens
- `/` → `LoginPage` (`/app/frontend/src/App.js:32`)
- route guard for protected screens: `ProtectedRoute` (`/app/frontend/src/App.js:33-41`)

### Related components
- `pages/LoginPage.jsx` (`/app/frontend/src/pages/LoginPage.jsx:11-274`)
- `components/guards/ProtectedRoute.jsx`
- `components/guards/ErrorBoundary.jsx`

### Related API calls
- `POST /api/v1/auth/vendoremployee/login` via `authService.login()` (`/app/frontend/src/api/constants.js:8`, `/app/frontend/src/api/services/authService.js:13-31`)

### Related state / context / hooks
- `AuthContext` (`/app/frontend/src/contexts/AuthContext.jsx:8-116`)
- localStorage keys from `STORAGE_KEYS` (`/app/frontend/src/api/constants.js:253-257`)
- `useToast` for login errors (`/app/frontend/src/pages/LoginPage.jsx:13`, `88-95`)

### Dependencies on other modules
- Depends on Firebase notifications module for FCM token request before login (`/app/frontend/src/pages/LoginPage.jsx:8`, `53-78`)
- Feeds Loading/Data bootstrap after success (`/app/frontend/src/pages/LoginPage.jsx:85-86`)
- Socket connection is auth-gated by `SocketContext` (`/app/frontend/src/contexts/SocketContext.jsx:22-24`, `32-64`)

### Known unclear areas
- Login response includes `firebase_token`, `zone_wise_topic`, `first_login`, but current UI usage appears limited (`/app/frontend/src/api/transforms/authTransform.js:14-21`).
- `user` in `AuthContext` is not populated at login time; it is filled later from profile loading (`/app/frontend/src/contexts/AuthContext.jsx:39-45`).

---

## 2. Loading & Initial Data Bootstrap
### Purpose
Fetches all required startup data after login and hydrates contexts before dashboard entry.

### User flow
1. Protected `/loading` screen mounts.
2. Sequentially loads profile, categories, products, tables, cancellation reasons, popular items, running orders.
3. Populates contexts.
4. Then loads station data.
5. Redirects to `/dashboard` on success or shows per-API retry UI on failure.

### Routes / screens
- `/loading` → `LoadingPage` (`/app/frontend/src/App.js:33`)

### Related components
- `pages/LoadingPage.jsx` (`/app/frontend/src/pages/LoadingPage.jsx:20-529`)

### Related API calls
- profile, categories, products, tables, settings, popular food, running orders, station-order-list
- Services invoked in `LoadingPage`: `profileService`, `categoryService`, `productService`, `tableService`, `settingsService`, `orderService`, `stationService` (`/app/frontend/src/pages/LoadingPage.jsx:8-15`)

### Related state / context / hooks
- `useAuth`, `useRestaurant`, `useMenu`, `useTables`, `useSettings`, `useOrders`, `useStations` (`/app/frontend/src/pages/LoadingPage.jsx:7`, `25-38`)
- `API_LOADING_ORDER`, `LOADING_STATES` (`/app/frontend/src/pages/LoadingPage.jsx:6`)

### Dependencies on other modules
- Requires Authentication module first.
- Seeds almost every major runtime module.
- Calls `setCrmRestaurantId()` for CRM integration after profile load (`/app/frontend/src/pages/LoadingPage.jsx:9`, `191-194`).

### Known unclear areas
- Data loads mostly sequentially rather than fully parallel; comments do not explain whether backend dependencies require this.
- `stationViewEnabled` / `enabledStations` are read from context in `LoadingPage` but not directly used in the main completion check (`/app/frontend/src/pages/LoadingPage.jsx:32-38`).

---

## 3. Dashboard / POS Workspace
### Purpose
Primary operational screen for viewing and interacting with active dine-in, walk-in, takeaway, delivery, and room orders.

### User flow
1. User lands on `/dashboard` after loading.
2. Sidebar, header, filters, and optional station panel render.
3. Orders/tables are displayed by channel or by status depending on feature flags and localStorage view settings.
4. Clicking an eligible card opens `OrderEntry` or `RoomCheckInModal`.
5. Card actions can confirm, mark ready/served, bill, cancel, or transfer.

### Routes / screens
- `/dashboard` → `DashboardPage` (`/app/frontend/src/App.js:34`)

### Related components
- `pages/DashboardPage.jsx` (`/app/frontend/src/pages/DashboardPage.jsx:153-1540+`)
- `components/layout/Sidebar.jsx`
- `components/layout/Header.jsx`
- `components/layout/NotificationBanner.jsx`
- `components/dashboard/ChannelColumnsLayout.jsx`
- `components/cards/*`
- `components/sections/TableSection.jsx`
- `components/station-view/StationPanel.jsx`
- `components/order-entry/OrderEntry.jsx`
- `components/modals/RoomCheckInModal.jsx`
- `components/order-entry/CancelOrderModal.jsx`

### Related API calls
Direct in page:
- `PUT /api/v2/vendoremployee/order/order-status-update` (`/app/frontend/src/pages/DashboardPage.jsx:1131-1134`)
- `PUT /api/v2/vendoremployee/order/food-status-update` (`/app/frontend/src/pages/DashboardPage.jsx:1260-1269`)
Via services:
- `confirmOrder`, `updateOrderStatus`, `completePrepaidOrder` (`/app/frontend/src/pages/DashboardPage.jsx:21`, `1100-1114`, `1224-1254`)

### Related state / context / hooks
- `useRestaurant`, `useTables`, `useOrders`, `useAuth`, `useSettings` (`/app/frontend/src/pages/DashboardPage.jsx:11`, `157-178`)
- `useRefreshAllData` (`/app/frontend/src/pages/DashboardPage.jsx:14`, `176`, `474-487`)
- `useSocketEvents` (`/app/frontend/src/pages/DashboardPage.jsx:17`, `180`)
- multiple localStorage-driven UI preferences (`/app/frontend/src/pages/DashboardPage.jsx:219-472`)

### Dependencies on other modules
- Strongly depends on Loading/Data bootstrap contexts.
- Opens Order Entry, Room Check-In, and Cancel flows.
- Consumes socket updates to stay live.
- Uses Station View and Notification modules.

### Known unclear areas
- `DashboardPage.jsx` is very large and mixes UI state, local config, search, socket-driven behavior, and action orchestration in one file.
- Comments claim some socket/table behavior is legacy or partially replaced, but code still subscribes to table channel (`/app/frontend/src/api/socket/useSocketEvents.js:143-180`) while comments mention removal.

---

## 4. Order Entry / Cart / Payment Workflow
### Purpose
Creates new orders, updates existing orders, edits carts, collects payment, prints bills/KOT, and handles table operations.

### User flow
1. User opens `OrderEntry` from dashboard card or Add button.
2. User selects order type, customer, address (delivery), notes, and items.
3. Depending on existing state:
   - place new order,
   - update existing order,
   - collect bill on existing order,
   - place+pay for prepaid order,
   - transfer to room,
   - split bill,
   - cancel food/order,
   - shift/merge/transfer food.
4. Socket events become the source of truth for many post-submit updates.

### Routes / screens
- No direct route; rendered inside dashboard overlay (`/app/frontend/src/pages/DashboardPage.jsx:9`, `1215-1219`, `1292+`)

### Related components
- `components/order-entry/OrderEntry.jsx` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:38-1274+`)
- `CartPanel.jsx`, `CategoryPanel.jsx`, `CollectPaymentPanel.jsx`
- modals: `AddCustomItemModal`, `ItemCustomizationModal`, `OrderNotesModal`, `ItemNotesModal`, `CustomerModal`, `AddressPickerModal`, `AddressFormModal`, `OrderPlacedModal`, `TransferFoodModal`, `MergeTableModal`, `ShiftTableModal`, `CancelFoodModal`, `CancelOrderModal`, `SplitBillModal`

### Related API calls
- Place order (`API_ENDPOINTS.PLACE_ORDER`) via direct `api.post` in `OrderEntry` (`/app/frontend/src/api/constants.js:41`, `/app/frontend/src/components/order-entry/OrderEntry.jsx:664-681`)
- Update order (`API_ENDPOINTS.UPDATE_ORDER`) via direct `api.put` (`/app/frontend/src/api/constants.js:43`, `/app/frontend/src/components/order-entry/OrderEntry.jsx:612-627`)
- Cancel item/order, merge, shift, transfer, add custom item, room shift, collect payment paths are orchestrated here with a mix of transforms and direct calls (`/app/frontend/src/components/order-entry/OrderEntry.jsx:729-850`, `1176-1235+`)

### Related state / context / hooks
- `useMenu`, `useOrders`, `useSettings`, `useRestaurant`, `useAuth`, `useTables` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:4`, `40-46`)
- `lookupAddresses`, `addAddress` from CRM customer service (`/app/frontend/src/components/order-entry/OrderEntry.jsx:7`, `128-169`)
- heavy use of `orderTransform.toAPI` and `tableTransform.toAPI`

### Dependencies on other modules
- Depends on Menu, Orders, Tables, Settings, Customer/CRM, Room module, Printing, and Socket module.
- Triggered from Dashboard module.

### Known unclear areas
- `OrderEntry.jsx` is partially truncated in inspection due to file size; some late-stage payment/autoprint flow details may exist beyond viewed lines.
- It mixes transport logic, business rules, and UI state in one file.
- Some current behavior relies on comments referencing historical bug IDs rather than centralized docs.

---

## 5. Rooms / Room Check-In / Room Transfer
### Purpose
Handles room-specific table records, check-in workflow, room service billing additions, and transfer-to-room flows.

### User flow
1. Dashboard treats room tables as `isRoom` entries.
2. Clicking an available room opens `RoomCheckInModal` instead of regular order entry (`/app/frontend/src/pages/DashboardPage.jsx:1170-1174`).
3. Occupied rooms use the dine-in-style order entry flow.
4. Existing orders can be transferred to a room from payment flow.
5. Room orders may include associated transferred bills and room booking balance.

### Routes / screens
- no dedicated route screen; surfaced from dashboard + order entry

### Related components
- `components/modals/RoomCheckInModal.jsx`
- room cards rendered through dashboard card/table abstractions

### Related API calls
- `POST /api/v1/vendoremployee/pos/user-group-check-in` via `roomService.checkIn()` (`/app/frontend/src/api/constants.js:49`, `/app/frontend/src/api/services/roomService.js:45-119`)
- `POST /api/v1/vendoremployee/order-shifted-room` from payment flow (`/app/frontend/src/api/constants.js:50`, `/app/frontend/src/components/order-entry/OrderEntry.jsx:1178-1181`)

### Related state / context / hooks
- room records live in `TableContext` unified tables array (`/app/frontend/src/contexts/TableContext.jsx:10-20`)
- room orders live in `OrderContext` unified orders array (`/app/frontend/src/contexts/OrderContext.jsx:9-25`)
- profile-derived room config via `restaurant.checkInFlags` (`/app/frontend/src/api/transforms/profileTransform.js:128-137`)

### Dependencies on other modules
- Depends on Dashboard, TableContext, OrderContext, Profile/Restaurant context, and Payment/Print flow.

### Known unclear areas
- The exact UI behavior inside `RoomCheckInModal.jsx` was not inspected line-by-line during this pass.
- Comments indicate room billing has special financial rules; those rules are distributed across transform and dashboard comments, not centralized.

---

## 6. Customer / CRM Integration
### Purpose
Supports customer search, lookup, customer CRUD, address management, and delivery address selection.

### User flow
1. During order entry, cashier can open customer modal.
2. App searches CRM customers or looks up by phone.
3. For delivery, address lookup and selection/addition are supported.
4. CRM API key is selected dynamically from restaurant id after profile load.

### Routes / screens
- no route; embedded in order-entry customer/address modals

### Related components
- `CustomerModal.jsx`
- `AddressPickerModal.jsx`
- `AddressFormModal.jsx`
- customer interactions initiated in `OrderEntry.jsx` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:114-123`, `128-169`)

### Related API calls
All via CRM client:
- `/pos/customers`
- `/pos/customer-lookup`
- `/pos/address-lookup`
- `/pos/customers/{id}/addresses`
Evidence: `/app/frontend/src/api/constants.js:34-40`, `/app/frontend/src/api/services/customerService.js:20-178`

### Related state / context / hooks
- `crmAxios.js` dynamic API key resolution (`/app/frontend/src/api/crmAxios.js:22-41`, `52-79`)
- restaurant id set via `setCrmRestaurantId()` on loading (`/app/frontend/src/pages/LoadingPage.jsx:191-194`)
- order-entry local state for `customer`, `selectedAddress`, `deliveryAddresses` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:115-123`)

### Dependencies on other modules
- Depends on Loading/Profile module for CRM restaurant ID.
- Primarily used by Order Entry module.

### Known unclear areas
- CRM env values are required but no committed `.env` file exists.
- It is unclear whether all restaurants always have a matching API key in `REACT_APP_CRM_API_KEYS`; missing key only logs warnings (`/app/frontend/src/api/crmAxios.js:55-60`).

---

## 7. Realtime Socket Updates
### Purpose
Maintains live order/table state updates across devices using Socket.IO.

### User flow
1. Socket connects only when authenticated.
2. Dynamic channels are built from restaurant id.
3. Incoming messages route to handlers that add/update/remove orders and sync table status.
4. Order/table engage states lock UI during in-flight operations.

### Routes / screens
- consumed primarily by Dashboard and any view using shared contexts

### Related components / hooks
- `SocketContext.jsx`
- `useSocketEvents.js`
- `socketService.js`
- `socketHandlers.js`
- `DashboardPage` uses `useSocketEvents()` (`/app/frontend/src/pages/DashboardPage.jsx:17`, `180`)

### Related API calls
- some socket handlers use payload-only updates
- some fetch fresh order via `fetchSingleOrderForSocket()` (`/app/frontend/src/api/socket/socketHandlers.js:14`, `85-109`)

### Related state / context / hooks
- `SocketContext`, `OrderContext`, `TableContext` are tightly coupled (`/app/frontend/src/api/socket/useSocketEvents.js:37-52`)
- order engage + table engage refs in contexts (`/app/frontend/src/contexts/OrderContext.jsx:16-18`, `/app/frontend/src/contexts/TableContext.jsx:14-16`)

### Dependencies on other modules
- Depends on Auth module and RestaurantContext for `restaurant.id`.
- Mutates Orders and Tables modules.

### Known unclear areas
- `socketEvents.js` comments say update-table is legacy/no longer subscribed in some places, but `useSocketEvents.js` still subscribes to table channel (`/app/frontend/src/api/socket/useSocketEvents.js:143-180`).
- `REACT_APP_SOCKET_URL` is required in code, but no committed env file exists.

---

## 8. Notifications & Firebase Push
### Purpose
Handles foreground/background push notifications and sound playback.

### User flow
1. During login, app requests FCM token/permission.
2. After authentication, notification provider preloads sounds and listens for messages.
3. Incoming notifications are normalized, sound is selected, and local notification list updates.

### Routes / screens
- no dedicated route; cross-cutting module

### Related components
- `NotificationBanner.jsx` in dashboard (`/app/frontend/src/pages/DashboardPage.jsx:24`, `1298`)
- `NotificationTester.jsx` exists in layout folder

### Related API / external calls
- Firebase browser messaging through `src/config/firebase.js` (`/app/frontend/src/config/firebase.js:1-115`)

### Related state / context / hooks
- `NotificationContext.jsx` (`/app/frontend/src/contexts/NotificationContext.jsx:24-186`)
- sound manager utility (`/app/frontend/src/contexts/NotificationContext.jsx:5`)

### Dependencies on other modules
- Depends on Authentication state.
- Login module requests initial FCM token before auth submit (`/app/frontend/src/pages/LoginPage.jsx:53-78`).

### Known unclear areas
- Service worker file path `/firebase-messaging-sw.js` is referenced in code (`/app/frontend/src/config/firebase.js:68-70`), but this discovery pass did not inspect whether the file exists in `public/`.
- Notification toast rendering path is not fully visible from the inspected code alone.

---

## 9. Station View / Kitchen Aggregation
### Purpose
Displays station-wise aggregated kitchen items and refreshes them from startup + socket-driven changes.

### User flow
1. Loading page extracts unique stations from product catalog.
2. Station config is initialized from localStorage.
3. If enabled, station-order-list data is fetched per station.
4. Dashboard renders station panel before main content.
5. Socket refresh hook can debounce-refresh affected stations.

### Routes / screens
- dashboard-adjacent panel, not a standalone route

### Related components
- `components/station-view/StationPanel.jsx`
- related settings live in `StatusConfigPage`

### Related API calls
- `POST /api/v1/vendoremployee/station-order-list` in `stationService.fetchStationData()` (`/app/frontend/src/api/services/stationService.js:122-211`)

### Related state / context / hooks
- `StationContext.jsx` (`/app/frontend/src/contexts/StationContext.jsx:13-161`)
- `useStationSocketRefresh.js` (`/app/frontend/src/hooks/useStationSocketRefresh.js:107-288`)
- `LoadingPage.loadStationData()` (`/app/frontend/src/pages/LoadingPage.jsx:103-161`)

### Dependencies on other modules
- Depends on Menu products for extracting stations.
- Depends on Loading/bootstrap and Dashboard modules.
- Configured through Status/Visibility Settings module.

### Known unclear areas
- `useStationSocketRefresh()` exists, but this pass did not confirm where it is mounted in the rendered tree.
- Comments mention backend quirks around station data; those are documented inline rather than in a central module doc.

---

## 10. Reports / Audit / Summary
### Purpose
Provides historical order reporting and daily summary reporting.

### User flow
1. User navigates from sidebar to `/reports/audit` or `/reports/summary`.
2. Audit report fetches order logs + running orders and builds tabs, counts, filters, gap detection.
3. Summary report fetches daily sales report and renders card/dashboard style summary.

### Routes / screens
- `/reports/audit` → `AllOrdersReportPage` (`/app/frontend/src/App.js:37`)
- `/reports/summary` → `OrderSummaryPage` (`/app/frontend/src/App.js:39`)

### Related components
- `AllOrdersReportPage.jsx` (`/app/frontend/src/pages/AllOrdersReportPage.jsx:72-484`)
- `OrderSummaryPage.jsx` (`/app/frontend/src/pages/OrderSummaryPage.jsx:16-517`)
- report UI components in `components/reports/*`

### Related API calls
- `getOrderLogsReport()` (`/app/frontend/src/pages/AllOrdersReportPage.jsx:11`, `110-199`)
- `getRunningOrders()` in audit reconciliation (`/app/frontend/src/pages/AllOrdersReportPage.jsx:12`, `116-138`)
- `getDailySalesReport()` (`/app/frontend/src/pages/OrderSummaryPage.jsx:10`, `35-49`)

### Related state / context / hooks
- `useRestaurant()` for schedules / currency / features (`/app/frontend/src/pages/AllOrdersReportPage.jsx:14-15`, `/app/frontend/src/pages/OrderSummaryPage.jsx:9`, `18-20`)
- business day utils used heavily in reports (`/app/frontend/src/pages/AllOrdersReportPage.jsx:15`, `/app/frontend/src/api/services/reportService.js:14`)

### Dependencies on other modules
- Depends on Restaurant/profile data for schedules and payment feature flags.
- Uses shared `Sidebar` and report components.

### Known unclear areas
- Sidebar contains children for `X Report`, `Y Report`, `Z Report`, but those routes are not present in `App.js`; they currently appear as “coming soon” behavior in sidebar (`/app/frontend/src/components/layout/Sidebar.jsx:55-58`, `208-216`).

---

## 11. Visibility Settings / Device Configuration
### Purpose
Allows local device configuration of visible statuses/channels, station view, default layout, and view mode behavior.

### User flow
1. User navigates to `/visibility/status-config`.
2. User toggles visible statuses, channels, station display, order-taking switch, layout defaults, and view-mode defaults/locks.
3. Changes are saved to localStorage and some station context state is immediately synchronized.
4. Dashboard reads these settings on mount and via storage events.

### Routes / screens
- `/visibility/status-config` → `StatusConfigPage` (`/app/frontend/src/App.js:41`)

### Related components
- `pages/StatusConfigPage.jsx` (`/app/frontend/src/pages/StatusConfigPage.jsx:108-1304`)
- consumed by `DashboardPage`, `Sidebar`, and `Header`

### Related API calls
- indirect station refresh via `fetchStationData()` when saving station settings (`/app/frontend/src/pages/StatusConfigPage.jsx:8`, `419-453`)

### Related state / context / hooks
- localStorage keys across dashboard/header/sidebar/status config
- `useStations()` + `useMenu()` for station config save/refresh (`/app/frontend/src/pages/StatusConfigPage.jsx:7-8`, `115-123`)

### Dependencies on other modules
- Controls Dashboard behavior.
- Controls Station View behavior.

### Known unclear areas
- These settings are explicitly local-device only for now; there is no server persistence in current code (`/app/frontend/src/pages/StatusConfigPage.jsx:532-539`).

---

## 12. Menu / Category / Product Data
### Purpose
Provides product catalog, category list, popular items, and product lookups for ordering and station extraction.

### User flow
1. Loading page fetches categories/products/popular items.
2. MenuContext stores them.
3. Order entry filters them by category, search, and dietary tags.
4. Station service extracts unique station names from products.

### Routes / screens
- no direct route currently; used in order entry and menu management panel

### Related components
- `CategoryPanel.jsx`
- menu management panel components under `components/panels/menu/*`
- `OrderEntry.jsx`

### Related API calls
- `GET /api/v1/vendoremployee/get-categories`
- `GET /api/v1/vendoremployee/get-products-list`
- `GET /api/v2/vendoremployee/buffet/buffet-popular-food`
Evidence: `/app/frontend/src/api/constants.js:14-17`, `/app/frontend/src/api/services/categoryService.js:11-14`, `/app/frontend/src/api/services/productService.js:12-45`

### Related state / context / hooks
- `MenuContext.jsx` (`/app/frontend/src/contexts/MenuContext.jsx:7-131`)

### Dependencies on other modules
- Used by Loading, Order Entry, Station View, and Menu Management panel.

### Known unclear areas
- Menu management routes are not in `App.js`; sidebar opens a panel instead (`/app/frontend/src/components/layout/Sidebar.jsx:188-193`).

---

## 13. Tables & Orders Runtime State
### Purpose
Maintains current operational state for physical tables, rooms, and running orders.

### User flow
1. Loading page fetches tables and running orders.
2. Contexts expose helpers to query by table/order, derive grouped views, and lock engage states.
3. Dashboard and Order Entry consume these contexts as the live operational source.
4. Socket handlers mutate these contexts in response to backend events.

### Routes / screens
- shared runtime data, mainly consumed by dashboard/order entry

### Related components
- cards, dashboard, order entry, sections, room-related components

### Related API calls
- `getTables()` and `getRunningOrders()` (`/app/frontend/src/api/services/tableService.js:11-14`, `/app/frontend/src/api/services/orderService.js:12-17`)

### Related state / context / hooks
- `TableContext.jsx`
- `OrderContext.jsx`

### Dependencies on other modules
- Core dependency for Dashboard, Room, Socket, and Order Entry modules.

### Known unclear areas
- `TableContext.refreshTables()` calls `tableService.getTables()` without params, while `useRefreshAllData` calls `tableService.getTables(true)` even though service signature has no parameter (`/app/frontend/src/contexts/TableContext.jsx:30-33`, `/app/frontend/src/hooks/useRefreshAllData.js:21`). The extra argument is ignored by JavaScript, but intent is unclear.

---

## 14. Print / Bill / KOT
### Purpose
Builds print payloads for KOT and bill printing and triggers print-related backend endpoints.

### User flow
1. User can manually print bill/KOT from cards or payment flow.
2. Some prepaid/new-order flows attempt auto-bill print if settings allow.
3. `orderTransform.buildBillPrintPayload()` shapes the detailed bill payload.

### Routes / screens
- no route; actions invoked from dashboard and order-entry flows

### Related components
- `RePrintButton.jsx`
- `CollectPaymentPanel.jsx`
- card actions in dashboard/order cards

### Related API calls
- `POST /api/v1/vendoremployee/order-temp-store` via `orderService.printOrder()` (`/app/frontend/src/api/constants.js:56`, `/app/frontend/src/api/services/orderService.js:132-151`)

### Related state / context / hooks
- restaurant settings (`autoBill`, service charge) from `RestaurantContext`
- order raw details + associated room billing from `OrderContext`/transforms

### Dependencies on other modules
- Depends on Order Entry, Dashboard, Orders runtime state, and Restaurant profile settings.

### Known unclear areas
- Some auto-print logic exists deep in `OrderEntry.jsx` and was only partially visible in this pass because the file is very large.
