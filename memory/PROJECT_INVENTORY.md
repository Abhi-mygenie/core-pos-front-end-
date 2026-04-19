# PROJECT INVENTORY — v2

> Generated: 2026 (v2 revision) | Source: `main` branch of `core-pos-front-end-` (commit `b32dec9`)
> Method: Static code analysis — no runtime observation
> Change from v1: Adds v2 socket events, order-engage channel, new StatusConfigPage route, payment layout/engage state, reports service growth, 18 test files, updated risk flags.

---

## 1. Project Identity

| Field | Value | Evidence | Confidence |
|---|---|---|---|
| Name | MyGenie POS Frontend | `frontend/package.json` line 2 (`"name": "frontend"`) — marketing name only inferred | MEDIUM |
| Type | Restaurant Point-of-Sale (POS) Single-Page Application | `frontend/src/App.js` routes + page set | HIGH |
| Repository | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` | User input, git remote not configured in workspace clone | HIGH |
| Analyzed Branch | `main` | Explicitly fetched `--branch main` | HIGH |
| Default Branch (HEAD of origin) | `7th-april-v1-` | `git branch -a` remote HEAD — `main` is NOT the default | HIGH |
| Package manager | `yarn@1.22.22+sha512…` | `frontend/package.json` line 97 (`packageManager` field) | HIGH |
| Build tool | CRA (`react-scripts` 5.0.1) wrapped by CRACO 7.1.0 | `package.json` lines 56, 84; `craco.config.js` present | HIGH |

---

## 2. Technology Stack

### 2.1 Frontend (Primary Codebase)

| Technology | Version | Purpose | Evidence |
|---|---|---|---|
| React | ^19.0.0 | UI framework (StrictMode enabled) | `package.json` line 50, `src/index.js` |
| React DOM | ^19.0.0 | DOM renderer | `package.json` line 52 |
| React Router DOM | ^7.5.1 | Client-side routing | `package.json` line 55, `src/App.js` |
| CRACO + CRA | 7.1.0 / 5.0.1 | Build toolchain (`craco start`) | `package.json` scripts |
| Tailwind CSS | ^3.4.17 | Utility-first CSS | `tailwind.config.js` |
| Radix UI (20+ packages) | 1.x–2.x | Headless UI primitives (shadcn/ui pattern) | `package.json` lines 8–38, `src/components/ui/*.jsx` |
| Axios | ^1.8.4 | HTTP client (two instances) | `src/api/axios.js`, `src/api/crmAxios.js` |
| Socket.IO Client | ^4.8.3 | Real-time WebSocket | `src/api/socket/socketService.js` |
| Firebase | ^12.12.0 | FCM push notifications | `src/config/firebase.js`, `public/firebase-messaging-sw.js` |
| React Hook Form | ^7.56.2 | Form management | Used in panels/settings |
| Zod | ^3.24.4 | Schema validation | Declared; test coverage not verified |
| date-fns | ^4.1.0 | Date utilities | Used in `utils/businessDay.js`, reports |
| Recharts | ^3.6.0 | Charts/graphs | Reports pages |
| Lucide React | ^0.507.0 | Icon library | Used throughout UI |
| react-day-picker | 8.10.1 | Calendar picker | Reports DatePicker |
| react-resizable-panels | ^3.0.1 | Resizable dashboard columns | `components/dashboard/ResizeHandle.jsx` |
| Sonner | ^2.0.3 | Toast system (alternative) | `src/components/ui/sonner.jsx` |
| `@hello-pangea/dnd` | ^18.0.1 | Drag & drop (Pangea fork of react-beautiful-dnd) | Usage site not audited |
| `cmdk` | ^1.1.1 | Command menu primitives | `ui/command.jsx` |
| `vaul` | ^1.1.2 | Drawer primitive | `ui/drawer.jsx` |
| `@emergentbase/visual-edits` | 1.0.8 (tarball) | Emergent visual edits devDep | `package.json` line 85 |

### 2.2 Backend (Stub Only — NOT the real API)

| Technology | Version | Purpose | Evidence |
|---|---|---|---|
| FastAPI | 0.110.1 | Placeholder HTTP server | `backend/server.py` lines 1–89 |
| Motor (MongoDB async) | 3.3.1 | Database driver for stub | `backend/requirements.txt` |
| pymongo | 4.5.0 | MongoDB sync client | `backend/requirements.txt` |
| emergentintegrations | 0.1.0 | Declared, not imported in `server.py` | `requirements.txt` |
| boto3, cryptography, python-jose, pyjwt, bcrypt, passlib, etc. | Various | Declared, not referenced in stub code | `requirements.txt` |

**CRITICAL NOTE (unchanged from v1)**: `backend/server.py` exposes only `GET/POST /api/status` and `GET /api/`. ALL real business API calls go to external services:
- MyGenie REST API (`REACT_APP_API_BASE_URL`)
- MyGenie CRM API (`REACT_APP_CRM_BASE_URL`)
- MyGenie WebSocket (`REACT_APP_SOCKET_URL`)
These URLs are read from the frontend `.env` (which is not present in this repo clone — must be supplied via deployment env).

---

## 3. Repository Layout (Source Tree Only, excl. tests and UI primitives)

```
/
├── .emergent/                       Emergent platform scaffolding
├── backend/
│   ├── server.py                    FastAPI stub (89 lines)
│   └── requirements.txt
├── frontend/
│   ├── craco.config.js              Build config
│   ├── components.json              shadcn config
│   ├── jsconfig.json                Path aliases (`@/`)
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── plugins/
│   │   └── health-check/            Local craco plugin (not audited)
│   ├── public/
│   │   ├── index.html
│   │   ├── firebase-messaging-sw.js Service worker for FCM bg msgs
│   │   └── sounds/                  15 .wav notification chimes (referenced)
│   └── src/
│       ├── App.js                   Router + AppProviders + Toaster + ErrorBoundary
│       ├── App.css, index.css       Global styles
│       ├── index.js                 React root with StrictMode
│       ├── setupTests.polyfills.js  Jest polyfills
│       ├── api/
│       │   ├── axios.js             Main API axios instance (REACT_APP_API_BASE_URL)
│       │   ├── crmAxios.js          CRM axios (X-API-Key per restaurant)
│       │   ├── constants.js         Endpoints, status mappings, storage keys
│       │   ├── index.js             Barrel
│       │   ├── services/            9 service modules (auth, category, customer,
│       │   │                        order, payment, product, profile, report,
│       │   │                        room, settings, station, table)
│       │   ├── socket/              Socket layer (service, events, handlers,
│       │   │                        useSocketEvents hook, index barrel)
│       │   └── transforms/          10 transform modules (API ↔ frontend shape)
│       ├── components/
│       │   ├── cards/               Order/table/dineIn/delivery cards + timeline
│       │   ├── dashboard/           ChannelColumn(s)Layout, ResizeHandle
│       │   ├── guards/              ProtectedRoute, ErrorBoundary
│       │   ├── layout/              Header, Sidebar, NotificationBanner, Tester
│       │   ├── modals/              RoomCheckIn, SplitBill, StationPicker
│       │   ├── order-entry/         19 components (OrderEntry orchestrator,
│       │   │                        Cart/Category/CollectPayment panels, modals,
│       │   │                        RePrintButton, PaymentMethodButton, etc.)
│       │   ├── panels/              MenuManagementPanel, SettingsPanel + sub-views
│       │   ├── reports/             DatePicker, ExportButtons, FilterBar,
│       │   │                        FilterTags, OrderDetailSheet, OrderTable,
│       │   │                        ReportTabs, SummaryBar
│       │   ├── sections/            OrderSection, TableSection
│       │   ├── station-view/        StationPanel
│       │   └── ui/                  47 shadcn/ui primitives
│       ├── config/
│       │   ├── firebase.js          FCM setup (env-driven)
│       │   └── paymentMethods.js    Payment method definitions + dynamic resolver
│       ├── constants/
│       │   ├── colors.js            Design tokens
│       │   ├── config.js            App constants (DEFAULT_CHANNELS, etc.)
│       │   ├── featureFlags.js      USE_CHANNEL_LAYOUT=true, USE_STATUS_VIEW=true
│       │   └── index.js             Barrel
│       ├── contexts/                9 providers + AppProviders + barrel
│       ├── data/                    Legacy mock data (mockOrders, mockTables, mockMenu,
│       │                            mockCustomers, mockConstants, notePresets) —
│       │                            still imported in some panels/tests
│       ├── hooks/                   use-toast, useLocalStorage, useRefreshAllData
│       ├── lib/                     utils.js (shadcn `cn()` helper)
│       ├── pages/                   6 pages (Login, Loading, Dashboard,
│       │                            AllOrdersReport, OrderSummary, StatusConfig)
│       ├── utils/                   businessDay, soundManager, statusHelpers, index
│       └── __tests__/               18 Jest test files
├── memory/                          Existing planning / docs folder (empty)
├── test_reports/                    Prior run artifacts
├── test_result.md                   Prior test results
└── tests/                           Empty (placeholder)
```

**File counts (main branch HEAD):**
- Frontend source files (excl. tests): 169
- Test files under `__tests__/`: 18
- Backend files: 2 (server.py + requirements.txt)

---

## 4. Routing Map

Source: `frontend/src/App.js`

| Path | Guard | Component | Evidence |
|---|---|---|---|
| `/` | none | `LoginPage` | `App.js` line 17 |
| `/loading` | `ProtectedRoute` | `LoadingPage` | line 18 |
| `/dashboard` | `ProtectedRoute` | `DashboardPage` | line 19 |
| `/reports` | `ProtectedRoute` | redirects → `/reports/audit` | line 21 |
| `/reports/audit` | `ProtectedRoute` | `AllOrdersReportPage` | line 22 |
| `/reports/all-orders` | `ProtectedRoute` | redirects → `/reports/audit` | line 23 |
| `/reports/summary` | `ProtectedRoute` | `OrderSummaryPage` | line 24 |
| `/visibility/status-config` | `ProtectedRoute` | `StatusConfigPage` | line 26 — **NEW vs v1** |

**No 404 / catch-all route.** Unknown paths render nothing.

---

## 5. Context Providers (9)

Source: `src/contexts/AppProviders.jsx` (nesting order top-down):

1. `AuthProvider` — Token (localStorage), user, permissions, `hasPermission*` helpers
2. `SocketProvider` — Connection lifecycle, auth-gated, visibility/online hooks
3. `NotificationProvider` — FCM foreground + SW-forwarded background messages, sound
4. `RestaurantProvider` — Restaurant config (features, service charge, payment types, printers)
5. `MenuProvider` — Categories, products, popular food
6. `TableProvider` — Unified tables + rooms, `engagedTables` Set, `waitForTableEngaged`
7. `SettingsProvider` — Cancellation reasons, `paymentLayoutConfig`, `enableDynamicTables`
8. `OrderProvider` — Unified orders, `engagedOrders` Set, `waitForOrderReady/Engaged/Removal`
9. `StationProvider` — Station view state (localStorage-persisted)

**Wrapped by**: `ErrorBoundary` (guards/ErrorBoundary.jsx) at the App root.

---

## 6. Environment Variables Referenced by Frontend

| Variable | Referenced In | Required? |
|---|---|---|
| `REACT_APP_API_BASE_URL` | `api/axios.js` (throws if missing), `profileTransform.js` (image URLs) | YES (throws at startup) |
| `REACT_APP_SOCKET_URL` | `api/socket/socketEvents.js` (throws if missing) | YES (throws at startup) |
| `REACT_APP_CRM_BASE_URL` | `api/crmAxios.js` (warns if missing) | Recommended |
| `REACT_APP_CRM_API_KEYS` | `api/crmAxios.js` (JSON map `{restaurantId: apiKey}`) | Recommended |
| `REACT_APP_FIREBASE_API_KEY` | `config/firebase.js` | For FCM only |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | `config/firebase.js` | For FCM only |
| `REACT_APP_FIREBASE_PROJECT_ID` | `config/firebase.js` | For FCM only |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | `config/firebase.js` | For FCM only |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | `config/firebase.js` | For FCM only |
| `REACT_APP_FIREBASE_APP_ID` | `config/firebase.js` | For FCM only |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | `config/firebase.js` | For FCM only |
| `REACT_APP_FIREBASE_VAPID_KEY` | `config/firebase.js` | For FCM token |
| `NODE_ENV` | `socketService.js` (debug default), `socketService.js` line 360 (window exposure) | Env-built |

**Protected note**: Per workspace policy, `.env` is not committed and must not be modified. No `.env` / `.env.example` was found in the repo clone.

---

## 7. External Service Boundaries

| Boundary | URL source | Auth | Purpose | Evidence |
|---|---|---|---|---|
| MyGenie REST API | `REACT_APP_API_BASE_URL` | `Authorization: Bearer ${auth_token}` | Orders, menu, tables, reports, profile, payments | `api/axios.js` |
| MyGenie CRM API | `REACT_APP_CRM_BASE_URL` | `X-API-Key` (per restaurant; map from `REACT_APP_CRM_API_KEYS`) | Customers, addresses | `api/crmAxios.js` |
| MyGenie WebSocket | `REACT_APP_SOCKET_URL` | Unclear — no token in handshake visible in code | Order/table engage + state push | `api/socket/socketService.js` |
| Firebase FCM | Google (Firebase SDK) | Firebase config + VAPID | Push notifications | `config/firebase.js`, `public/firebase-messaging-sw.js` |

---

## 8. API Endpoints Declared

Source: `src/api/constants.js` — **38 named endpoints**, grouped:

| Group | Keys | Notes |
|---|---|---|
| Auth | LOGIN | v1 API |
| Profile | PROFILE | v2 API |
| Menu | CATEGORIES, PRODUCTS, POPULAR_FOOD | Mixed v1/v2 |
| Tables & Order ops | TABLES, ORDER_TABLE_SWITCH, MERGE_ORDER, TRANSFER_FOOD | v1/v2 |
| Cancel & Status | CANCEL_ITEM, ORDER_STATUS_UPDATE, CONFIRM_ORDER, FOOD_STATUS_UPDATE | v2 |
| Out-of-menu | ADD_CUSTOM_ITEM | v1 |
| CRM | CUSTOMER_SEARCH, CUSTOMER_LOOKUP, CUSTOMER_DETAIL, CUSTOMER_CREATE, CUSTOMER_UPDATE, ADDRESS_LOOKUP, CUSTOMER_ADDRESSES | Base URL swapped via `crmAxios` |
| Order-taking | PLACE_ORDER, PREPAID_ORDER, UPDATE_ORDER, BILL_PAYMENT | v2 |
| **TBD placeholders** | EDIT_ORDER_ITEM, EDIT_ORDER_ITEM_QTY | Literal `'TBD'` — see RISK_REGISTER RISK-005 |
| Rooms | ROOM_CHECK_IN, ORDER_SHIFTED_ROOM | v1 |
| Split | SPLIT_ORDER | v2 |
| Print | PRINT_ORDER (= `/api/v1/vendoremployee/order-temp-store`) | v1 |
| Settings | CANCELLATION_REASONS | v1 |
| Running orders | RUNNING_ORDERS | v1 |
| Reports (Phase 4A) | REPORT_PAID_ORDERS, REPORT_CANCELLED_ORDERS, REPORT_CREDIT_ORDERS, REPORT_HOLD_ORDERS, REPORT_AGGREGATOR_ORDERS, REPORT_ORDER_DETAILS, SINGLE_ORDER_NEW, DAILY_SALES_REPORT, ORDER_LOGS_REPORT | Mostly v2 |

**Endpoint NOT declared but referenced** (still present in v2):
- `paymentService.collectPayment` reads `API_ENDPOINTS.CLEAR_BILL` — no such key exists. See RISK-001 (upgraded evidence below).

---

## 9. Storage Keys (Client-Side Persistence)

Source: `api/constants.js` `STORAGE_KEYS` + scattered usages.

| Key | Usage | Evidence |
|---|---|---|
| `auth_token` | Bearer token | `authService.js`, `axios.js` line 23 |
| `remember_me` | Remember-me flag | `authService.js` |
| `user_email` | Remembered email | `authService.js` |
| `auth_redirect` (sessionStorage) | Beforeunload dialog suppression | `axios.js` line 49 |
| `SOCKET_DEBUG` | Socket debug toggle | `socketService.js` line 31, 333 |
| `mygenie_station_view_config` | Station view pref | `StationContext.jsx` line 8, `stationService.js` |
| `mygenie_enable_dynamic_tables` | Settings toggle | `SettingsContext.jsx` line 5 |

---

## 10. Routes Access Matrix

| Route | Requires auth? | Reads contexts | Side-effects on mount |
|---|---|---|---|
| `/` | No | Auth (to auto-redirect if already logged in — logic inside LoginPage) | FCM token request on explicit user action |
| `/loading` | Yes | Auth, Restaurant, Menu, Tables, Settings, Orders, Stations | Sequential 7 API loads + station data parallel (`LoadingPage.jsx`) |
| `/dashboard` | Yes | All 9 contexts | `useSocketEvents()` subscribes to 3 channels |
| `/reports/*` | Yes | Restaurant (for schedules/business day) | `reportService.getOrdersByTab(...)` on mount |
| `/visibility/status-config` | Yes | Settings | localStorage-backed status visibility toggle |

---

## 11. Key File Size Census (source lines)

| File | Lines |
|---|---|
| `pages/DashboardPage.jsx` | 1431 |
| `components/order-entry/CollectPaymentPanel.jsx` | 1592 |
| `components/order-entry/OrderEntry.jsx` | 1554 |
| `components/order-entry/CartPanel.jsx` | 805 |
| `components/cards/OrderCard.jsx` | 700 |
| `api/transforms/orderTransform.js` | 1028 |
| `api/transforms/reportTransform.js` | 710 |
| `api/services/reportService.js` | 588 |
| `components/modals/SplitBillModal.jsx` | 542 |
| `pages/LoadingPage.jsx` | 529 |
| `components/cards/TableCard.jsx` | 502 |
| `pages/OrderSummaryPage.jsx` | 517 |
| `pages/AllOrdersReportPage.jsx` | 484 |
| `pages/StatusConfigPage.jsx` | 890 |

Total source LOC (frontend/src, excl. `ui/`, `__tests__/`, `data/`): ~ 26,000+ (approx).

---

## 12. Test Inventory

18 test files under `src/__tests__/`:

- `integration/App.routing.test.jsx`
- `api/socket/socketEvents.test.js`, `socketServiceGlobal.test.js`, `updateOrderStatus.test.js`
- `api/paymentService.test.js` *(asserts `CLEAR_BILL` endpoint exists — this test currently FAILS because `CLEAR_BILL` is not defined in `constants.js`)*
- `api/constants.test.js`
- `api/transforms/updateOrderPayload.test.js`, `orderTransformFinancials.test.js`, `rawField.test.js`, `cancelItemPayload.test.js`, `profileTransform.test.js`, `categoryTransform.test.js`
- `api/axios.test.js`
- `guards/ProtectedRoute.test.jsx`, `ErrorBoundary.test.jsx`
- `structure/barrelExports.test.js`
- `contexts/SocketContext.test.jsx`

No e2e framework configured (no Playwright/Cypress).

---

## 13. What Changed From v1 (Evidence-Based)

| Area | v1 state | v2 state (current `main`) | Evidence |
|---|---|---|---|
| Socket order events | 6 events (new-order, update-order, update-food-status, update-order-status, scan-new-order, delivery-assign-order) | 12 events — added v2 payload-carrying events (update-order-target, update-order-source, update-order-paid, update-item-status), split-order, order-engage | `socket/socketEvents.js` SOCKET_EVENTS |
| Order engage | Not present | `engagedOrders` Set in OrderContext, subscribed on `order-engage_${restaurantId}` channel | `OrderContext.jsx` lines 17–71, `useSocketEvents.js` |
| Socket channels | 2 channels (order, table) | 3 channels (order, table, order-engage) — table channel is still subscribed despite header comment noting BUG-203 removal | `useSocketEvents.js` lines 144–154 |
| Table engage | Not present | `engagedTables` Set, `waitForTableEngaged` used during place/update/cancel flows | `TableContext.jsx` lines 14–87 |
| Routes | 5 | 6 — added `/visibility/status-config` | `App.js` line 26 |
| Auto-print on new-order | Not present | BUG-273 flow: `waitForOrderReady` → `printOrder('bill', …)` without overrides; gated by `settings.autoBill` | `OrderEntry.jsx` lines 994–1137 |
| Bill print payload overrides | Absent | `buildBillPrintPayload(..., overrides)` accepts `orderItemTotal`, `orderSubtotal`, `paymentAmount`, discount, loyalty, wallet, SC, tip, etc. | `orderTransform.js` lines 867–1004, `CollectPaymentPanel.jsx` lines 354–384 |
| Service charge per-order toggle | Not present | BUG-276 `serviceChargeEnabled` state in CollectPaymentPanel | `CollectPaymentPanel.jsx` line 140 |
| Tip (flat ₹) | Hardcoded 0 | BUG-281 feature-flagged by `restaurant.features.tip`; `tipInput` state in CollectPaymentPanel | `CollectPaymentPanel.jsx` lines 146–147, 228 |
| Subtotal semantic | itemTotal − discount (pre-SC) | BUG-281: `subtotal = (itemTotal − totalDiscount) + serviceCharge + tip` | `CollectPaymentPanel.jsx` lines 230–236, `orderTransform.js` lines 944–960 |
| Delta item pattern for qty increase | Not explicitly documented | BUG-237 — `_deltaForId` cart entries for increasing placed qty | `OrderEntry.jsx` lines 424–466 |
| Pre-flight table occupied check | Not present | BUG-210 checks `isTableEngaged` + `getOrderByTableId` before placing | `OrderEntry.jsx` lines 577–589 |
| Reports module size | Smaller (v1 noted presence) | `reportService.js` now 588 lines; 16 exported functions; business-day-aware | `api/services/reportService.js` |
| Tests | Some tests | 18 test files (includes paymentService, rawField, updateOrderPayload) | `src/__tests__/` |
| `backend/` | Stub with a Todo context | Still stub; `requirements.txt` now includes `emergentintegrations==0.1.0`, `pandas`, `numpy`, `jq`, etc. (unused by the stub code) | `backend/requirements.txt` |

---

## 14. Open Items (Pointers — details in other docs)

- `paymentService.collectPayment` still references undeclared `API_ENDPOINTS.CLEAR_BILL` → RISK-001
- `EDIT_ORDER_ITEM`, `EDIT_ORDER_ITEM_QTY` still literal `'TBD'` → RISK-005
- `handleUpdateOrder` (socketHandlers.js line 204) is annotated “LEGACY — kept for rollback”; `useSocketEvents.js` currently routes `update-order` via `handleOrderDataEvent` — the legacy function is dead code → see MODULE_MAP §5
- Table channel subscription contradiction: file headers claim BUG-203 removed it; runtime still subscribes to `update_table_${restaurantId}` → see ARCHITECTURE §4.2 and OPEN_QUESTIONS OQ-106
- Socket auth: No evidence of token passed to Socket.IO handshake (see OPEN_QUESTIONS OQ-107)
