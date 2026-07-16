# API_USAGE_MAP

This file maps current frontend API usage as found in code. Endpoints are listed from `src/api/constants.js`, service wrappers, and direct page/component calls.

## Client configuration
### Main API client
- File: `/app/frontend/src/api/axios.js`
- Base URL env: `REACT_APP_API_BASE_URL` (`/app/frontend/src/api/axios.js:5-8`)
- Default headers: `Content-Type: application/json`, `Accept: application/json` (`/app/frontend/src/api/axios.js:11-18`)
- Auth dependency: `Authorization: Bearer <auth_token>` from localStorage (`/app/frontend/src/api/axios.js:21-27`)
- Error handling:
  - `401` clears `auth_token` / `remember_me` and redirects to `/` (`/app/frontend/src/api/axios.js:39-52`)
  - sets `error.readableMessage` from API response (`/app/frontend/src/api/axios.js:54-63`)

### CRM client
- File: `/app/frontend/src/api/crmAxios.js`
- Base URL env: `REACT_APP_CRM_BASE_URL` (`/app/frontend/src/api/crmAxios.js:8`)
- Auth/header dependency: dynamic `X-API-Key` based on current restaurant id (`/app/frontend/src/api/crmAxios.js:29-41`, `52-61`)
- Additional env: `REACT_APP_CRM_API_KEYS` JSON map (`/app/frontend/src/api/crmAxios.js:11-16`)

---

## 1. Authentication API
### Endpoint
`POST /api/v1/auth/vendoremployee/login`

### File / function
- constant: `/app/frontend/src/api/constants.js:8`
- service: `authService.login()` (`/app/frontend/src/api/services/authService.js:13-31`)
- caller: `AuthContext.login()` (`/app/frontend/src/contexts/AuthContext.jsx:18-28`)
- UI caller: `LoginPage.handleLogin()` (`/app/frontend/src/pages/LoginPage.jsx:38-87`)

### Request payload
Built in `authTransform.toAPI.loginRequest()`:
- `email`
- `password`
- optional `fcm_token`
Evidence: `/app/frontend/src/api/transforms/authTransform.js:27-37`

### Response fields used in UI/state
Mapped by `authTransform.fromAPI.loginResponse()`:
- `token`
- `role_name` → `roleName`
- `role` → `permissions`
- `firebase_token`
- `first_login`
- `zone_wise_topic`
Evidence: `/app/frontend/src/api/transforms/authTransform.js:14-21`

Directly used afterward:
- token stored in localStorage (`/app/frontend/src/api/services/authService.js:19-29`)
- permissions stored in AuthContext (`/app/frontend/src/contexts/AuthContext.jsx:21-24`)

### Response fields not clearly used
- `firebase_token`
- `isFirstLogin`
- `zoneWiseTopic`
No clear downstream use was found in this pass.

### Error handling
- Login page toast uses `error.readableMessage` or fallback text (`/app/frontend/src/pages/LoginPage.jsx:88-95`)
- Axios interceptor builds `readableMessage` (`/app/frontend/src/api/axios.js:54-63`)

### Auth/header dependency
- none before login

### Module using it
- Authentication & Session

---

## 2. Profile API
### Endpoint
`GET /api/v2/vendoremployee/vendor-profile/profile`

### File / function
- constant: `/app/frontend/src/api/constants.js:11`
- service: `profileService.getProfile()` (`/app/frontend/src/api/services/profileService.js:11-14`)
- caller: `LoadingPage.loadProfile()` (`/app/frontend/src/pages/LoadingPage.jsx:174-201`)

### Request payload
- none

### Response fields used in UI/state
Transformed by `profileTransform.fromAPI.profileResponse()`:
- user fields (name, email, phone, role, image) (`/app/frontend/src/api/transforms/profileTransform.js:31-51`)
- restaurant fields including:
  - identity/contact (`56-68`)
  - features (`69-79`)
  - service charge/tax (`81-89`)
  - payment types/methods (`91-100`)
  - discount types (`102-104`)
  - printers (`105-107`)
  - schedules (`108-110`)
  - settings (`111-113`, `198-208`)
  - cancellation rules (`114-120`)
  - `defaultOrderStatus` (`122-124`)
  - `checkInFlags` for room flows (`128-137`)
- permissions from `api.role` (`/app/frontend/src/api/transforms/profileTransform.js:31-35`)

Used to:
- set auth user + permissions (`/app/frontend/src/pages/LoadingPage.jsx:189-190`)
- set restaurant context (`/app/frontend/src/pages/LoadingPage.jsx:190-191`)
- set CRM restaurant id (`/app/frontend/src/pages/LoadingPage.jsx:191-194`)

### Response fields not clearly used
- Many transformed restaurant fields may be available but not fully consumed everywhere (e.g. some printer fields, some tax details); exact unused subset is not exhaustively provable without full dataflow instrumentation.

### Error handling
- toast on loading page (`/app/frontend/src/pages/LoadingPage.jsx:196-200`)

### Auth/header dependency
- requires bearer token via axios interceptor

### Module using it
- Loading & Initial Data Bootstrap
- Restaurant/Profile-driven behavior across dashboard/order/payment/room modules

---

## 3. Categories API
### Endpoint
`GET /api/v1/vendoremployee/get-categories`

### File / function
- constant: `/app/frontend/src/api/constants.js:14`
- service: `categoryService.getCategories()` (`/app/frontend/src/api/services/categoryService.js:11-14`)
- caller: `LoadingPage.loadCategories()` (`/app/frontend/src/pages/LoadingPage.jsx:203-216`)
- refresh hook: `useRefreshAllData()` (`/app/frontend/src/hooks/useRefreshAllData.js:25-38`)

### Request payload
- none

### Response fields used in UI
- transformed category list via `categoryTransform` into category ids/names/counts
- item counts are later calculated from products (`/app/frontend/src/api/services/categoryService.js:32-46`)
- used by `MenuContext`, order entry category panel, and station category mapping

### Response fields not used
- raw API fields beyond transform output are not directly used.

### Error handling
- loading page toast on failure (`/app/frontend/src/pages/LoadingPage.jsx:211-215`)

### Auth/header dependency
- bearer token

### Module using it
- Loading/bootstrap
- Menu/catalog
- Station view mapping

---

## 4. Products API
### Endpoint
`GET /api/v1/vendoremployee/get-products-list`

### File / function
- constant: `/app/frontend/src/api/constants.js:15`
- service: `productService.getProducts()` (`/app/frontend/src/api/services/productService.js:12-21`)
- caller: `LoadingPage.loadProducts()` (`/app/frontend/src/pages/LoadingPage.jsx:218-236`)
- refresh hook: `useRefreshAllData()` (`/app/frontend/src/hooks/useRefreshAllData.js:25-38`)

### Request payload
Query params:
- `limit`
- `offset`
- `type`
Evidence: `/app/frontend/src/api/services/productService.js:12-20`

### Response fields used in UI
Via `productTransform.fromAPI.productListResponse()`:
- product id, name, base price
- category id
- tax object
- station
- variation/add-on info
- availability/activity fields
These are consumed by menu display, cart building, station extraction, and billing payload generation.

### Response fields not used
- Any raw response fields not surfaced in transform are not directly used.

### Error handling
- loading page toast on failure (`/app/frontend/src/pages/LoadingPage.jsx:231-235`)

### Auth/header dependency
- bearer token

### Module using it
- Loading/bootstrap
- Menu/catalog
- Order entry
- Station view

---

## 5. Popular Food API
### Endpoint
`GET /api/v2/vendoremployee/buffet/buffet-popular-food`

### File / function
- constant: `/app/frontend/src/api/constants.js:16`
- service: `productService.getPopularFood()` (`/app/frontend/src/api/services/productService.js:37-46`)
- caller: `LoadingPage.loadPopularFood()` (`/app/frontend/src/pages/LoadingPage.jsx:271-286`)
- refresh hook: `useRefreshAllData()` (`/app/frontend/src/hooks/useRefreshAllData.js:25-38`)

### Request payload
Query params:
- `limit`
- `offset`
- `type`

### Response fields used in UI
- transformed `.products`
- used for `popular` category in order entry (`/app/frontend/src/components/order-entry/OrderEntry.jsx:376-387`)

### Response fields not used
- any additional raw metadata not surfaced in transform

### Error handling
- loading page toast on failure (`/app/frontend/src/pages/LoadingPage.jsx:281-285`)

### Auth/header dependency
- bearer token

### Module using it
- Loading/bootstrap
- Menu/catalog

---

## 6. Tables API
### Endpoint
`GET /api/v1/vendoremployee/all-table-list`

### File / function
- constant: `/app/frontend/src/api/constants.js:19`
- service: `tableService.getTables()` (`/app/frontend/src/api/services/tableService.js:11-14`)
- callers:
  - `LoadingPage.loadTables()` (`/app/frontend/src/pages/LoadingPage.jsx:238-252`)
  - `TableContext.refreshTables()` (`/app/frontend/src/contexts/TableContext.jsx:29-33`)
  - `useRefreshAllData()` (`/app/frontend/src/hooks/useRefreshAllData.js:21-23`)

### Request payload
- none

### Response fields used in UI
Transformed by `tableTransform.fromAPI.tableList()` / `table()`:
- `id` → `tableId`
- `table_no` → `tableNumber`
- `title` → `sectionName`
- `rtype` → room/table type + `isRoom`
- `status` + `engage` → active/occupied/status
- waiter assignment, QR code, timestamps
Evidence: `/app/frontend/src/api/transforms/tableTransform.js:23-76`

Used to build dashboard table/room cards and section grouping.

### Response fields not used
- raw backend fields not copied in transform

### Error handling
- loading page toast on failure (`/app/frontend/src/pages/LoadingPage.jsx:247-250`)

### Auth/header dependency
- bearer token

### Module using it
- Loading/bootstrap
- Dashboard
- Table/Room runtime state

---

## 7. Cancellation Reasons API
### Endpoint
`GET /api/v1/vendoremployee/cancellation-reasons`

### File / function
- constant: `/app/frontend/src/api/constants.js:59`
- service: `settingsService.getCancellationReasons()` (`/app/frontend/src/api/services/settingsService.js:12-20`)
- caller: `LoadingPage.loadCancellationReasons()` (`/app/frontend/src/pages/LoadingPage.jsx:254-269`)

### Request payload
Query params:
- `limit`
- `offset`

### Response fields used in UI
Transformed reasons are stored in `SettingsContext` and later filtered into:
- order cancellation reasons
- item cancellation reasons
Evidence: `/app/frontend/src/contexts/SettingsContext.jsx:28-58`

### Response fields not used
- raw fields not exposed by `settingsTransform`

### Error handling
- loading page toast (`/app/frontend/src/pages/LoadingPage.jsx:264-267`)

### Auth/header dependency
- bearer token

### Module using it
- Loading/bootstrap
- Order cancellation/item cancellation flows

---

## 8. Running Orders API
### Endpoint
`GET /api/v1/vendoremployee/pos/employee-orders-list`

### File / function
- constant: `/app/frontend/src/api/constants.js:62`
- service: `orderService.getRunningOrders()` (`/app/frontend/src/api/services/orderService.js:12-17`)
- callers:
  - `LoadingPage.loadRunningOrders()` (`/app/frontend/src/pages/LoadingPage.jsx:288-304`)
  - `OrderContext.refreshOrders()` (`/app/frontend/src/contexts/OrderContext.jsx:35-39`)
  - `reportService.getAllOrders()` (`/app/frontend/src/api/services/reportService.js:505-568`)
  - `AllOrdersReportPage.fetchOrders()` (`/app/frontend/src/pages/AllOrdersReportPage.jsx:116-138`)

### Request payload
Query params:
- `role_name`
Evidence: `/app/frontend/src/api/services/orderService.js:12-16`

### Response fields used in UI
Orders are transformed by `orderTransform.fromAPI.orderList()` into:
- order identity/status/payment fields
- table/room/walk-in classification
- customer/phone
- timing and items
- room info / associated orders / raw details
Evidence: `/app/frontend/src/api/transforms/orderTransform.js:79-300`

### Response fields not used
- raw fields excluded by transform

### Error handling
- loading page toast (`/app/frontend/src/pages/LoadingPage.jsx:299-302`)
- report service callers sometimes `.catch(() => [])` (`/app/frontend/src/api/services/reportService.js:116-120`, `507-513`)

### Auth/header dependency
- bearer token

### Module using it
- Loading/bootstrap
- Dashboard runtime state
- Reports reconciliation
- Socket fallback logic indirectly

---

## 9. Single Order (socket fetch)
### Endpoint
`POST /api/v2/vendoremployee/get-single-order-new`

### File / function
- constant: `/app/frontend/src/api/constants.js:71`
- service: `orderService.fetchSingleOrderForSocket()` (`/app/frontend/src/api/services/orderService.js:38-51`)
- used in socket handlers via `fetchOrderWithRetry()` (`/app/frontend/src/api/socket/socketHandlers.js:76-109`)
- also used in reports: `reportService.getSingleOrderNew()` (`/app/frontend/src/api/services/reportService.js:248-253`)

### Request payload
- `order_id`

### Response fields used in UI
- for socket path: first order transformed with `orderTransform.fromAPI.order()` (`/app/frontend/src/api/services/orderService.js:43-50`)
- for report detail path: passed to `reportFromAPI.singleOrderNew()` (`/app/frontend/src/api/services/reportService.js:248-253`)

### Response fields not used
- socket path only uses first order entry from response

### Error handling
- socket fetch helper retries and logs (`/app/frontend/src/api/socket/socketHandlers.js:85-109`)

### Auth/header dependency
- bearer token

### Module using it
- Realtime socket updates
- Report detail drilldown

---

## 10. Order status update API
### Endpoint
`PUT /api/v2/vendoremployee/order/order-status-update`

### File / function
- constant: `/app/frontend/src/api/constants.js:26`
- service helper: `orderService.updateOrderStatus()` (`/app/frontend/src/api/services/orderService.js:60-64`)
- direct page use in dashboard cancel flow (`/app/frontend/src/pages/DashboardPage.jsx:1131-1134`)
- direct component use in order-entry cancel order flow (`/app/frontend/src/components/order-entry/OrderEntry.jsx:831-833`)

### Request payload
Two observed payload builders:
- generic status update (`orderTransform.toAPI.updateOrderStatus`) with:
  - `order_id`
  - `role_name`
  - `order_status`
  Evidence: `/app/frontend/src/api/transforms/orderTransform.js:1012-1016`
- cancel order payload (`orderTransform.toAPI.cancelOrder`) with:
  - `order_id`
  - `role_name`
  - `order_status: cancelled`
  - `cancellation_reason`
  - `cancellation_note`
  Evidence: `/app/frontend/src/api/transforms/orderTransform.js:547-553`

### Response fields used in UI
- service returns `response.data` but often actual UI sync relies on socket follow-up rather than response body (`/app/frontend/src/api/services/orderService.js:60-64`, `/app/frontend/src/pages/DashboardPage.jsx:1106-1111`)

### Response fields not used
- most/all response fields appear unused in UI

### Error handling
- dashboard logs errors for confirm/ready/served paths (`/app/frontend/src/pages/DashboardPage.jsx:1111-1113`, `1230-1232`, `1250-1252`)
- order entry cancel order catches and toasts (`/app/frontend/src/components/order-entry/OrderEntry.jsx:833-836`)

### Auth/header dependency
- bearer token

### Module using it
- Dashboard actions
- Order entry cancellation

---

## 11. Confirm order API
### Endpoint
`PUT /api/v2/vendoremployee/order/waiter-dinein-order-status-update`

### File / function
- constant: `/app/frontend/src/api/constants.js:27`
- service: `orderService.confirmOrder()` (`/app/frontend/src/api/services/orderService.js:74-78`)
- caller: `DashboardPage.handleConfirmOrder()` (`/app/frontend/src/pages/DashboardPage.jsx:1100-1114`)

### Request payload
Uses `orderTransform.toAPI.updateOrderStatus()` with:
- `order_id`
- `role_name`
- `order_status` (from restaurant `defaultOrderStatus`)

### Response fields used in UI
- not directly; socket is expected to update state

### Response fields not used
- all response body fields appear unused in current UI path

### Error handling
- dashboard logs error only (`/app/frontend/src/pages/DashboardPage.jsx:1110-1113`)

### Auth/header dependency
- bearer token

### Module using it
- Dashboard / POS operations

---

## 12. Food status update API
### Endpoint
`PUT /api/v2/vendoremployee/order/food-status-update`

### File / function
- constant: `/app/frontend/src/api/constants.js:28`
- direct caller: `DashboardPage.handleItemStatusChange()` (`/app/frontend/src/pages/DashboardPage.jsx:1257-1272`)

### Request payload
Built inline:
- `order_id`
- `order_food_id`
- `item_id`
- `order_status`
- `cancel_type: null`
Evidence: `/app/frontend/src/pages/DashboardPage.jsx:1260-1267`

### Response fields used in UI
- none observed

### Response fields not used
- all response fields appear unused

### Error handling
- catches and logs only (`/app/frontend/src/pages/DashboardPage.jsx:1268-1271`)

### Auth/header dependency
- bearer token

### Module using it
- Dashboard item status controls

---

## 13. Cancel item API
### Endpoint
`PUT /api/v2/vendoremployee/order/cancel-food-item`

### File / function
- constant: `/app/frontend/src/api/constants.js:25`
- payload builder: `orderTransform.toAPI.cancelItem()` (`/app/frontend/src/api/transforms/orderTransform.js:521-538`)
- caller: `OrderEntry.handleCancelFood()` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:798-821`)

### Request payload
- `order_id`
- `order_food_id`
- `item_id`
- `cancel_qty`
- `order_status: cancelled`
- `reason_type`
- `reason`
- `cancel_type`

### Response fields used in UI
- not directly; success toast is generic and socket is expected to continue state sync

### Response fields not used
- all response fields appear unused

### Error handling
- catches and shows destructive toast using nested error message fallback (`/app/frontend/src/components/order-entry/OrderEntry.jsx:804-815`)

### Auth/header dependency
- bearer token

### Module using it
- Order Entry cancel-food flow

---

## 14. Add custom item API
### Endpoint
`POST /api/v1/vendoremployee/add-single-product`

### File / function
- constant: `/app/frontend/src/api/constants.js:31`
- payload builder: `orderTransform.toAPI.addCustomItem()` (`/app/frontend/src/api/transforms/orderTransform.js:562-569`)
- caller: `OrderEntry.handleAddCustomItem()` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:848-856`)

### Request payload
- `name`
- `category_id`
- `price`
- `tax: 0`
- `tax_type: GST`
- `tax_calc: Exclusive`

### Response fields used in UI
- `response.data.data` transformed via `customItemFromAPI()` into cart item (`/app/frontend/src/components/order-entry/OrderEntry.jsx:848-851`, `/app/frontend/src/api/transforms/orderTransform.js:1319-1329`)

### Response fields not used
- any extra response fields beyond `data`

### Error handling
- no local try/catch in `handleAddCustomItem()`; error handling may bubble to modal caller (unclear from current pass)

### Auth/header dependency
- bearer token

### Module using it
- Order Entry custom item flow

---

## 15. Place order API
### Endpoint
`POST /api/v2/vendoremployee/order/place-order`

### File / function
- constant: `/app/frontend/src/api/constants.js:41`
- payload builder: `orderTransform.toAPI.placeOrder()` (`/app/frontend/src/api/transforms/orderTransform.js:576-639`)
- prepaid variant: `orderTransform.toAPI.placeOrderWithPayment()` (`/app/frontend/src/api/transforms/orderTransform.js:710-805`)
- direct caller: `OrderEntry.handlePlaceOrder()` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:581-719`)
- direct prepaid caller: payment completion path in `OrderEntry` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:1219-1273`)

### Request payload
Submitted as `FormData` with one field:
- `data` = JSON stringified payload (`/app/frontend/src/components/order-entry/OrderEntry.jsx:674-680`, `1223-1235`)

Payload includes many fields such as:
- customer info
- table/order type
- payment method/status/type
- totals (`order_sub_total_amount`, `tax_amount`, `order_amount`, etc.)
- discounts/loyalty/wallet
- `cart` array with detailed line items
- optional `delivery_address`
- prepaid variant also includes `partial_payments`
Evidence: `/app/frontend/src/api/transforms/orderTransform.js:583-638`, `750-804`

### Response fields used in UI
- new-order flow mostly ignores immediate response and waits for socket updates (`/app/frontend/src/components/order-entry/OrderEntry.jsx:677-707`)
- prepaid path captures `order_id` from response for auto-print (`/app/frontend/src/components/order-entry/OrderEntry.jsx:1238-1244`)

### Response fields not used
- most response fields beyond message/order id appear unused

### Error handling
- toasts based on response message/error in both standard and prepaid flow (`/app/frontend/src/components/order-entry/OrderEntry.jsx:682-687`, `1247-1252`)

### Auth/header dependency
- bearer token
- for delivery, relies on CRM-derived selected address state but not extra headers

### Module using it
- Order Entry / cart placement
- Prepaid place+pay flow

---

## 16. Update existing order API
### Endpoint
`PUT /api/v2/vendoremployee/order/update-place-order`

### File / function
- constant: `/app/frontend/src/api/constants.js:43`
- payload builder: `orderTransform.toAPI.updateOrder()` (`/app/frontend/src/api/transforms/orderTransform.js:646-703`)
- direct caller: `OrderEntry.handlePlaceOrder()` update path (`/app/frontend/src/components/order-entry/OrderEntry.jsx:607-639`)

### Request payload
JSON payload with fields such as:
- `order_id`
- `order_type`
- customer name/order note/payment defaults
- combined totals
- `address_id`
- `'cart-update'` array for new items

### Response fields used in UI
- response body only logged (`/app/frontend/src/components/order-entry/OrderEntry.jsx:626-627`)
- socket engage/update is the operational source of truth

### Response fields not used
- almost all response body fields

### Error handling
- catches and toasts destructive message (`/app/frontend/src/components/order-entry/OrderEntry.jsx:628-634`)

### Auth/header dependency
- bearer token

### Module using it
- Order Entry update-order flow

---

## 17. Bill payment / collect bill API
### Endpoint
`POST /api/v2/vendoremployee/order/order-bill-payment`

### File / function
- constant: `/app/frontend/src/api/constants.js:44`
- payload builder: `orderTransform.toAPI.collectBillExisting()` (`/app/frontend/src/api/transforms/orderTransform.js:813-968`)
- payment collection is orchestrated from `CollectPaymentPanel` → `OrderEntry` (large file; payment section partially truncated during view)

### Request payload
Large JSON payload including:
- `order_id`
- payment mode/status/amount/transaction id
- `food_detail` line array
- taxes, discounts, loyalty, wallet, room/tab fields
- optional `partial_payments`
Evidence: `/app/frontend/src/api/transforms/orderTransform.js:901-967`

### Response fields used in UI
- exact downstream use is partially outside viewed lines due to file truncation; success toast and/or socket updates are expected based on surrounding patterns.

### Response fields not used
- unclear from partial inspection

### Error handling
- likely in `OrderEntry` payment completion branch after truncated region; partial certainty only.

### Auth/header dependency
- bearer token

### Module using it
- Collect Payment / bill settlement

### Unclear note
- `paymentService.collectPayment()` exists but uses `API_ENDPOINTS.CLEAR_BILL`, which is not defined in constants (`/app/frontend/src/api/services/paymentService.js:12-14`, `/app/frontend/src/api/constants.js:6-74`). It appears stale or unused relative to `order-bill-payment`.

---

## 18. Prepaid completion API
### Endpoint
`POST /api/v2/vendoremployee/order/paid-prepaid-order`

### File / function
- constant: `/app/frontend/src/api/constants.js:42`
- service: `orderService.completePrepaidOrder()` (`/app/frontend/src/api/services/orderService.js:88-97`)
- caller: `DashboardPage.handleMarkServed()` for prepaid orders (`/app/frontend/src/pages/DashboardPage.jsx:1240-1249`)

### Request payload
- `order_id`
- `payment_status: paid`
- `service_tax`
- `tip_amount`

### Response fields used in UI
- none directly; socket expected afterward

### Response fields not used
- all body fields appear unused

### Error handling
- dashboard logs errors (`/app/frontend/src/pages/DashboardPage.jsx:1250-1252`)

### Auth/header dependency
- bearer token

### Module using it
- Dashboard prepaid served/completion flow

---

## 19. Split order API
### Endpoint
`POST /api/v2/vendoremployee/order/split-order`

### File / function
- constant: `/app/frontend/src/api/constants.js:53`
- service: `orderService.splitOrder()` (`/app/frontend/src/api/services/orderService.js:108-118`)
- UI launcher observed in `OrderEntry`/`CollectPaymentPanel` split bill flow (`/app/frontend/src/components/order-entry/OrderEntry.jsx:89-94`, `1027-1040`)

### Request payload
- `order_id`
- `split_count`
- `splits`

### Response fields used in UI
- service logs response and returns `response.data` (`/app/frontend/src/api/services/orderService.js:114-117`)
- exact UI consumption not fully traced in this pass

### Response fields not used
- unclear without full split modal tracing

### Error handling
- no internal catch in service; handled by caller

### Auth/header dependency
- bearer token

### Module using it
- Split Bill workflow

---

## 20. Print API
### Endpoint
`POST /api/v1/vendoremployee/order-temp-store`

### File / function
- constant: `/app/frontend/src/api/constants.js:56`
- service: `orderService.printOrder()` (`/app/frontend/src/api/services/orderService.js:132-151`)
- payload builder for bills: `orderTransform.toAPI.buildBillPrintPayload()` (`/app/frontend/src/api/transforms/orderTransform.js:1025-1307`)
- used in order entry payment/print flows (`/app/frontend/src/components/order-entry/OrderEntry.jsx:11`, `1042-1067`, `1162-1169`)

### Request payload
Two modes:
- generic:
  - `order_id`
  - `print_type`
  - optional `station_kot`
- bill mode: detailed bill payload from `buildBillPrintPayload()` containing:
  - totals, taxes, discounts, delivery address
  - customer/waiter/table fields
  - `billFoodList`
  - room-related fields and `associated_orders` for room bills

### Response fields used in UI
- generally not used beyond success confirmation/logging

### Response fields not used
- most response body fields

### Error handling
- service logs payload/response but does not catch; callers toast on error (`/app/frontend/src/components/order-entry/OrderEntry.jsx:1063-1065`, `1171-1173`)

### Auth/header dependency
- bearer token

### Module using it
- Printing / bill / KOT
- Order entry payment flow

---

## 21. Table switch API
### Endpoint
`POST /api/v2/vendoremployee/order/order-table-room-switch`

### File / function
- constant: `/app/frontend/src/api/constants.js:20`
- payload builder: `tableTransform.toAPI.shiftTable()` (`/app/frontend/src/api/transforms/tableTransform.js:136-141`)
- direct caller: `OrderEntry.handleShift()` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:775-796`)

### Request payload
- `order_id`
- `old_table_id`
- `new_table_id`
- `order_edit_count`

### Response fields used in UI
- success toast uses `res.data?.message` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:780-785`)

### Response fields not used
- any other response body fields

### Error handling
- destructive toast with message fallback (`/app/frontend/src/components/order-entry/OrderEntry.jsx:786-790`)

### Auth/header dependency
- bearer token

### Module using it
- Table shift workflow

---

## 22. Merge order API
### Endpoint
`POST /api/v2/vendoremployee/order/transfer-order`

### File / function
- constant: `/app/frontend/src/api/constants.js:21`
- payload builder: `tableTransform.toAPI.mergeTable()` (`/app/frontend/src/api/transforms/tableTransform.js:161-164`)
- direct caller: `OrderEntry.handleMerge()` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:749-773`)

### Request payload
- `source_order_id`
- `target_order_id`

### Response fields used in UI
- success toast is generic, not deeply data-driven (`/app/frontend/src/components/order-entry/OrderEntry.jsx:756-763`)

### Response fields not used
- most response fields

### Error handling
- destructive toast (`/app/frontend/src/components/order-entry/OrderEntry.jsx:764-767`)

### Auth/header dependency
- bearer token

### Module using it
- Merge tables/orders workflow

---

## 23. Transfer food item API
### Endpoint
`POST /api/v2/vendoremployee/order/transfer-food-item`

### File / function
- constant: `/app/frontend/src/api/constants.js:22`
- payload builder: `tableTransform.toAPI.transferFood()` (`/app/frontend/src/api/transforms/tableTransform.js:149-154`)
- direct caller: `OrderEntry.handleTransfer()` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:725-747`)

### Request payload
- `source_order_id`
- `target_order_id`
- `food_item_id`

### Response fields used in UI
- success toast uses `res.data?.message` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:731-736`)

### Response fields not used
- all others

### Error handling
- destructive toast (`/app/frontend/src/components/order-entry/OrderEntry.jsx:737-741`)

### Auth/header dependency
- bearer token

### Module using it
- Food transfer workflow

---

## 24. Room check-in API
### Endpoint
`POST /api/v1/vendoremployee/pos/user-group-check-in`

### File / function
- constant: `/app/frontend/src/api/constants.js:49`
- service: `roomService.checkIn()` (`/app/frontend/src/api/services/roomService.js:45-119`)

### Request payload
Multipart `FormData` with always-present fields such as:
- guest identity/name/phone/email
- `room_id[i]`
- adult/children counts
- id document fields/images
- booking dates/type/for
- room price/order amount/advance/balance/order note
- GST/firm fields
Evidence: `/app/frontend/src/api/services/roomService.js:52-118`

### Response fields used in UI
- returns `res.data`; current UI caller was not fully inspected in this pass

### Response fields not used
- unclear

### Error handling
- no explicit catch inside service; caller handles it

### Auth/header dependency
- bearer token
- explicit extra header `X-localization: en` (`/app/frontend/src/api/services/roomService.js:113-117`)

### Module using it
- Rooms / room check-in

---

## 25. Transfer order to room API
### Endpoint
`POST /api/v1/vendoremployee/order-shifted-room`

### File / function
- constant: `/app/frontend/src/api/constants.js:50`
- payload builder: `orderTransform.toAPI.transferToRoom()` (`/app/frontend/src/api/transforms/orderTransform.js:977-1000`)
- direct caller: `OrderEntry` payment completion (`/app/frontend/src/components/order-entry/OrderEntry.jsx:1178-1181`)

### Request payload
- `order_id`
- `payment_mode`
- `payment_amount`
- `payment_status`
- `room_id`
- discount/tax/tip/service charge fields

### Response fields used in UI
- success toast uses `res.data?.message` (`/app/frontend/src/components/order-entry/OrderEntry.jsx:1181-1182`)

### Response fields not used
- all others

### Error handling
- current catch path is outside visible lines for this branch; not fully confirmed

### Auth/header dependency
- bearer token

### Module using it
- Room transfer workflow

---

## 26. Station order list API
### Endpoint
`POST /api/v1/vendoremployee/station-order-list`

### File / function
- hardcoded in service (not in constants): `/app/frontend/src/api/services/stationService.js:131`
- service: `fetchStationData()` (`/app/frontend/src/api/services/stationService.js:122-211`)
- callers:
  - `LoadingPage.loadStationData()` (`/app/frontend/src/pages/LoadingPage.jsx:140-155`)
  - `StatusConfigPage.saveConfiguration()` (`/app/frontend/src/pages/StatusConfigPage.jsx:441-446`)
  - `useStationSocketRefresh.flush()` (`/app/frontend/src/hooks/useStationSocketRefresh.js:147-152`)

### Request payload
`FormData`:
- `role_name` = station name
- `def_order_status` = `1`

### Response fields used in UI
- `response.data.orders`
- each order’s `order_details_food`
- each item’s `food_status`, `station`, `food_details.name`, `food_details.category_id`, `quantity`
These are aggregated into station categories and item counts.

### Response fields not used
- most other raw order fields in station response are not used

### Error handling
- service catches errors and returns an error-shaped object instead of throwing (`/app/frontend/src/api/services/stationService.js:201-209`)

### Auth/header dependency
- bearer token

### Module using it
- Station view / kitchen aggregation

### Note
- This endpoint is hardcoded in service, not centralized in `API_ENDPOINTS`.

---

## 27. CRM customer search API
### Endpoint
`GET /pos/customers`

### File / function
- constants: `/app/frontend/src/api/constants.js:34`, `36-38`, `40`
- service: `customerService.searchCustomers()` (`/app/frontend/src/api/services/customerService.js:20-32`)

### Request payload
Query params:
- `search`
- `limit`

### Response fields used in UI
Transformed via `customerTransform.fromAPI.searchResults()`:
- `id`, `name`, `phone`, `tier`, `total_points`, `wallet_balance`, `last_visit`
Evidence: `/app/frontend/src/api/transforms/customerTransform.js:14-33`

### Response fields not used
- any raw fields beyond transformed list and wrapper metadata

### Error handling
- catches, warns, returns `[]` (`/app/frontend/src/api/services/customerService.js:23-31`)

### Auth/header dependency
- CRM `X-API-Key` required via `crmAxios`

### Module using it
- Customer / CRM integration

---

## 28. CRM customer lookup API
### Endpoint
`POST /pos/customer-lookup`

### File / function
- constant: `/app/frontend/src/api/constants.js:35`
- service: `customerService.lookupCustomer()` (`/app/frontend/src/api/services/customerService.js:40-49`)

### Request payload
- `phone`

### Response fields used in UI
Transformed via `customerTransform.fromAPI.customerLookup()` into:
- `customer_id`, `registered`, `name`, `phone`
- loyalty/wallet/visits/spend
- allergies/favorites
- addresses
Evidence: `/app/frontend/src/api/transforms/customerTransform.js:39-54`

### Response fields not used
- raw fields outside transformed set

### Error handling
- catches, warns, returns `null` (`/app/frontend/src/api/services/customerService.js:42-49`)

### Auth/header dependency
- CRM `X-API-Key`

### Module using it
- Customer / CRM integration

---

## 29. CRM customer detail API
### Endpoint
`GET /pos/customers/{customer_id}`

### File / function
- constant base: `/app/frontend/src/api/constants.js:36`
- service: `customerService.getCustomerDetail()` (`/app/frontend/src/api/services/customerService.js:58-63`)

### Request payload
- path param: customer id

### Response fields used in UI
Transformed via `customerTransform.fromAPI.customerDetail()`:
- id, name, phone, email
- loyalty/wallet/tier/visits/spend
- DOB/anniversary
- addresses
- recent orders
Evidence: `/app/frontend/src/api/transforms/customerTransform.js:60-77`

### Response fields not used
- raw fields outside transformed object

### Error handling
- no catch in service; caller handles exceptions

### Auth/header dependency
- CRM `X-API-Key`

### Module using it
- Customer / CRM integration

---

## 30. CRM customer create / update APIs
### Endpoints
- `POST /pos/customers`
- `PUT /pos/customers/{customer_id}`

### File / function
- constants: `/app/frontend/src/api/constants.js:37-38`
- services:
  - `createCustomer()` (`/app/frontend/src/api/services/customerService.js:76-81`)
  - `updateCustomer()` (`/app/frontend/src/api/services/customerService.js:91-96`)

### Request payload
Built by `customerTransform.toAPI`:
- create payload may include `pos_id`, `restaurant_id`, `name`, `phone`, email, DOB, anniversary, gender, country code, customer type, addresses (`/app/frontend/src/api/transforms/customerTransform.js:149-163`)
- update payload may include `pos_id`, `restaurant_id`, `phone`, name, email, DOB, anniversary (`/app/frontend/src/api/transforms/customerTransform.js:170-180`)

### Response fields used in UI
- service returns `response.data?.data` only (`/app/frontend/src/api/services/customerService.js:79-80`, `94-95`)

### Response fields not used
- wrapper metadata not used

### Error handling
- no service-level catch

### Auth/header dependency
- CRM `X-API-Key`

### Module using it
- Customer / CRM integration

---

## 31. CRM address APIs
### Endpoints
- `POST /pos/address-lookup`
- `POST /pos/customers/{customer_id}/addresses`
- `PUT /pos/customers/{customer_id}/addresses/{addr_id}`
- `DELETE /pos/customers/{customer_id}/addresses/{addr_id}`
- `PUT /pos/customers/{customer_id}/addresses/{addr_id}/default`

### File / function
- constants: `/app/frontend/src/api/constants.js:39-40`
- services: `/app/frontend/src/api/services/customerService.js:108-178`

### Request payload
- address lookup: `{ phone }`
- add address: transformed address payload (`/app/frontend/src/api/transforms/customerTransform.js:187-203`)
- update/delete/default: path params + direct payload as applicable

### Response fields used in UI
- address lookup transforms to cross-restaurant address list (`/app/frontend/src/api/transforms/customerTransform.js:116-138`)
- add/update/delete/default return `response.data?.data`
- `OrderEntry.fetchDeliveryAddresses()` stores address list and selects default (`/app/frontend/src/components/order-entry/OrderEntry.jsx:128-141`)

### Response fields not used
- any wrapper metadata beyond `data`

### Error handling
- lookup catches and returns `[]` (`/app/frontend/src/api/services/customerService.js:109-117`)
- others do not catch in service

### Auth/header dependency
- CRM `X-API-Key`

### Module using it
- Delivery address handling in order entry

---

## 32. Report paid orders API
### Endpoint
`GET /api/v2/vendoremployee/paid-order-list`

### File / function
- constant: `/app/frontend/src/api/constants.js:65`
- service: `reportService.getPaidOrders()` (`/app/frontend/src/api/services/reportService.js:88-94`)

### Request payload
Query params through helper:
- `search_date` for one or more dates (`/app/frontend/src/api/services/reportService.js:60-67`)

### Response fields used in UI
Normalized by `reportListFromAPI.paidOrders()` and related filters.
Used in report tabs and combined all-orders flows.

### Response fields not used
- raw wrapper fields outside transformed order list

### Error handling
- some higher-level callers catch and default to `[]` (`/app/frontend/src/api/services/reportService.js:507-513`)

### Auth/header dependency
- bearer token

### Module using it
- Reports

---

## 33. Report cancelled orders API
### Endpoint
`GET /api/v2/vendoremployee/cancel-order-list`

### File / function
- constant: `/app/frontend/src/api/constants.js:66`
- service: `reportService.getCancelledOrdersRaw()` (`/app/frontend/src/api/services/reportService.js:122-128`)

### Request payload
Query param:
- `search_date`

### Response fields used in UI
- transformed by `reportFromAPI.cancelledOrder()` with cancellation metadata and items (`/app/frontend/src/api/transforms/reportTransform.js:184-229`)

### Response fields not used
- raw extras outside transform

### Error handling
- some parent flows catch/default to `[]`

### Auth/header dependency
- bearer token

### Module using it
- Reports (cancelled / merged)

---

## 34. Report credit orders API
### Endpoint
`GET /api/v2/vendoremployee/paid-in-tab-order-list`

### File / function
- constant: `/app/frontend/src/api/constants.js:67`
- service: `reportService.getCreditOrders()` (`/app/frontend/src/api/services/reportService.js:156-162`)

### Request payload
Query param:
- `search_date`

### Response fields used in UI
- transformed by `reportFromAPI.creditOrder()` (`/app/frontend/src/api/transforms/reportTransform.js:232-263`)

### Response fields not used
- raw extras outside transform

### Error handling
- higher level catches in combined flows

### Auth/header dependency
- bearer token

### Module using it
- Reports (credit/tab)

---

## 35. Report hold orders API
### Endpoint
`GET /api/v2/vendoremployee/paid-paylater-order-list`

### File / function
- constant: `/app/frontend/src/api/constants.js:68`
- service: `reportService.getHoldOrders()` (`/app/frontend/src/api/services/reportService.js:175-181`)

### Request payload
Query param:
- `search_date`

### Response fields used in UI
- transformed by `reportFromAPI.holdOrder()` (`/app/frontend/src/api/transforms/reportTransform.js:264-298`)

### Response fields not used
- raw extras outside transform

### Error handling
- comments note known backend issue: same data as paid-order-list (`/app/frontend/src/api/services/reportService.js:168-174`)

### Auth/header dependency
- bearer token

### Module using it
- Reports

---

## 36. Aggregator orders API
### Endpoint
`POST /api/v1/vendoremployee/urbanpiper/get-complete-order-list`

### File / function
- constant: `/app/frontend/src/api/constants.js:69`
- service: `reportService.getAggregatorOrders()` (`/app/frontend/src/api/services/reportService.js:194-220`)

### Request payload
- `{ search_date }`

### Response fields used in UI
Transformed by `reportFromAPI.aggregatorOrder()`:
- nested order details, customer details, food list, rider info, platform, delivery address (`/app/frontend/src/api/transforms/reportTransform.js:301-359`)

### Response fields not used
- raw nested fields not surfaced in transform

### Error handling
- per-date calls catch and return `[]` inside Promise.all (`/app/frontend/src/api/services/reportService.js:198-203`)

### Auth/header dependency
- bearer token

### Module using it
- Reports (aggregator tab)

---

## 37. Order detail report API
### Endpoint
`GET /api/v2/vendoremployee/employee-order-details`

### File / function
- constant: `/app/frontend/src/api/constants.js:70`
- service: `reportService.getOrderDetails()` (`/app/frontend/src/api/services/reportService.js:233-239`)

### Request payload
Query params:
- `order_id`

### Response fields used in UI
Transformed via `reportFromAPI.orderDetails()`:
- core order summary
- customer/waiter/table
- tax/discount/tip/subtotal
- item list with food/add-on/variation details
- cancellation fields if present
Evidence: `/app/frontend/src/api/transforms/reportTransform.js:362-429`

### Response fields not used
- raw fields outside transform

### Error handling
- no service-level catch

### Auth/header dependency
- bearer token

### Module using it
- Reports order detail sheet

---

## 38. Daily sales report API
### Endpoint
`POST /api/v2/vendoremployee/daily-sales-revenue-report`

### File / function
- constant: `/app/frontend/src/api/constants.js:72`
- service: `reportService.getDailySalesReport()` (`/app/frontend/src/api/services/reportService.js:265-342`)
- caller: `OrderSummaryPage.fetchSummaryData()` (`/app/frontend/src/pages/OrderSummaryPage.jsx:35-49`)

### Request payload
- `{ from: YYYY-MM-DD }`

### Response fields used in UI
Mapped into:
- `sales`, `paidRevenue`, `runningOrders`, `orderTAB`, `unpaidRevenue`, `cancelled`
- payment breakdown (`Cash`, `Card`, `UPI`)
- `station_revenue`
- `tab_*`
- `room_revenue`, `orderRoom`
- aggregator totals
- cancellations
- deductions (`discount`, `tax`, `tips`, `service_charge`, `round_off`)
Evidence: `/app/frontend/src/api/services/reportService.js:275-341`

These drive most of `OrderSummaryPage` cards/sections (`/app/frontend/src/pages/OrderSummaryPage.jsx:154-509`).

### Response fields not used
- any raw response fields not mapped into returned summary object

### Error handling
- page catches and stores error string (`/app/frontend/src/pages/OrderSummaryPage.jsx:39-48`)

### Auth/header dependency
- bearer token

### Module using it
- Reports / summary dashboard

---

## 39. Order logs report API
### Endpoint
`POST /api/v2/vendoremployee/report/order-logs-report`

### File / function
- constant: `/app/frontend/src/api/constants.js:73`
- service: `reportService.getOrderLogsReport()` (`/app/frontend/src/api/services/reportService.js:389-491`)
- caller: `AllOrdersReportPage.fetchOrders()` (`/app/frontend/src/pages/AllOrdersReportPage.jsx:110-199`)

### Request payload
- `sort_by`
- `from_date`
- `to_date`

### Response fields used in UI
Mapped from `response.data.order[*].orders_table` into:
- `id`, `restaurant_order_id`, `order_amount`
- `user_name`, `waiter_name`
- `order_in`, `table_id`, `table_no`, `parent_order_id`
- `payment_method`, `payment_status`, `f_order_status`
- `created_at`, `collect_bill`, `updated_at`
- tax/discount/tip/order_type
Evidence: `/app/frontend/src/api/services/reportService.js:403-489`

These drive audit tab lists, counts, summary, filters, and gap detection in `AllOrdersReportPage`.

### Response fields not used
- fields not copied from `orders_table`

### Error handling
- report page catches and sets banner state (`/app/frontend/src/pages/AllOrdersReportPage.jsx:192-198`, `421-435`)

### Auth/header dependency
- bearer token

### Module using it
- Reports / audit page

---

## 40. Unclear / stale API references
### `API_ENDPOINTS.CLEAR_BILL`
- Referenced by `paymentService.collectPayment()` (`/app/frontend/src/api/services/paymentService.js:12-14`)
- Not present in `src/api/constants.js` (`/app/frontend/src/api/constants.js:6-74`)
- Current status: unclear / likely stale / possibly unused in current app flow

### `EDIT_ORDER_ITEM` / `EDIT_ORDER_ITEM_QTY`
- Present as `'TBD'` constants (`/app/frontend/src/api/constants.js:45-46`)
- No concrete implementation found in current flow

### Hardcoded station endpoint
- `/api/v1/vendoremployee/station-order-list` is hardcoded directly in `stationService` rather than declared in `API_ENDPOINTS` (`/app/frontend/src/api/services/stationService.js:131`)
