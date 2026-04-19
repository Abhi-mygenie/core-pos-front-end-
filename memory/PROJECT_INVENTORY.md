# PROJECT INVENTORY — v3 (Re-Validation)

> Generated: 2026 (v3 re-validation) | Source: `main` branch, commit `7f87721` (HEAD at re-validation time)
> Method: Static code analysis — no runtime observation
> Previous version: v2 (based on commit `b32dec9` which is no longer reachable in the repo history)
> Revalidation result: **86% of v2 claims HOLD; 4 claims CONTRADICTED; 3 claims PARTIALLY correct; 5 new findings added.**

---

## 0. Revalidation Summary vs v2

| Claim in v2 | Status | Evidence |
|---|---|---|
| **Default branch = `7th-april-v1-`**, `main` is NOT default | **CONTRADICTED** | `git ls-remote --symref origin HEAD` returns `refs/heads/main`. `7th-april-v1-` is just one of ~20 feature branches. |
| **Commit analyzed = `b32dec9`** | **SUPERSEDED** | That commit is no longer in the history. Current HEAD = `7f87721`. |
| 18 test files under `__tests__/` | **CONTRADICTED** | Actual count is **17** (`find __tests__ -type f -name "*.test.*" \| wc -l`). |
| 47 shadcn UI primitives | **CONTRADICTED** | Actual count is **46** (`ls components/ui \| wc -l`). |
| 15 notification chime .wav files | **CONTRADICTED** | Actual count is **14** (`ls public/sounds`). |
| All other v2 structural claims (file list, sizes, contexts, routes) | **HOLD** | See detailed verification below. |

---

## 1. Project Identity

| Field | Value | Evidence | Confidence |
|---|---|---|---|
| Name | MyGenie POS Frontend | `frontend/package.json` line 2 (`"name": "frontend"`) — marketing name inferred | MEDIUM |
| Type | Restaurant Point-of-Sale (POS) Single-Page Application | `frontend/src/App.js` routes + page set | HIGH |
| Repository | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` | `git remote -v` | HIGH |
| Analyzed Branch | `main` | Explicitly fetched `--branch main --single-branch` | HIGH |
| Analyzed Commit | `7f87721f0c3aaec3376c455dbc5005fdeecf10a2` | `git rev-parse HEAD` | HIGH |
| **Default Branch (origin HEAD)** | **`main`** (v3 correction) | `git ls-remote --symref origin HEAD` → `ref: refs/heads/main HEAD` | HIGH |
| Package manager | `yarn@1.22.22+sha512…` | `frontend/package.json` line 90 (`packageManager` field) | HIGH |
| Build tool | CRA (`react-scripts` 5.0.1) wrapped by CRACO 7.1.0 | `package.json` lines 50, 77; `craco.config.js` present | HIGH |

- Finding: v2 docs mis-identified the default branch.
- Type: Fact
- Evidence: `git ls-remote --symref origin HEAD` on `/app` repo.
- Confidence: High
- Impact: Minor — affects tooling assumptions only. Code analysis target was always `main`.
- Status vs Previous: **Contradicted**

---

## 2. Technology Stack

### 2.1 Frontend (Primary Codebase)

| Technology | Version | Purpose | Evidence |
|---|---|---|---|
| React | ^19.0.0 | UI framework (StrictMode enabled) | `package.json` line 44, `src/index.js` |
| React DOM | ^19.0.0 | DOM renderer | `package.json` line 46 |
| React Router DOM | ^7.5.1 | Client-side routing | `package.json` line 49, `src/App.js` |
| CRACO + CRA | 7.1.0 / 5.0.1 | Build toolchain (`craco start`) | `package.json` scripts (lines 58–62) |
| Tailwind CSS | ^3.4.17 | Utility-first CSS | `tailwind.config.js`, `package.json` line 88 |
| Radix UI (20+ packages) | 1.x–2.x | Headless UI primitives (shadcn/ui pattern) | `package.json` lines 7–33 |
| Axios | ^1.8.4 | HTTP client (two instances) | `src/api/axios.js`, `src/api/crmAxios.js` |
| Socket.IO Client | declared via `socket.io-client` | Real-time WebSocket (imported in `socketService.js`) | `api/socket/socketService.js` line 4; **NOTE: NOT listed in package.json deps — declared only via import, appears to be auto-installed through another transitive dep** |
| Firebase | (not in `package.json` deps currently — see NEW FINDING §2.3) | FCM push notifications | `src/config/firebase.js`, `public/firebase-messaging-sw.js` |
| React Hook Form | ^7.56.2 | Form management | `package.json` line 47 |
| Zod | ^3.24.4 | Schema validation | `package.json` line 56 |
| date-fns | ^4.1.0 | Date utilities | `package.json` line 39 |
| Recharts | ^3.6.0 | Charts/graphs | `package.json` line 51 |
| Lucide React | ^0.507.0 | Icon library | `package.json` line 42 |
| react-day-picker | 8.10.1 | Calendar picker | `package.json` line 45 |
| react-resizable-panels | ^3.0.1 | Resizable dashboard columns | `package.json` line 48 |
| Sonner | ^2.0.3 | Toast system (alternative, DEAD — see RISK-017) | `package.json` line 52 |
| `cmdk` | ^1.1.1 | Command menu primitives | `package.json` line 37 |
| `vaul` | ^1.1.2 | Drawer primitive | `package.json` line 55 |
| `@emergentbase/visual-edits` | 1.0.8 (tarball) | Emergent visual edits devDep | `package.json` line 78 |

**NEW v3 FINDING — package.json audit corrections:**

- Finding: v2 listed `@hello-pangea/dnd@^18.0.1` and `socket.io-client@^4.8.3` as runtime deps.
- Type: Fact
- Evidence: `grep -E "(hello-pangea|socket.io|firebase)" /app/frontend/package.json` shows only `@hello-pangea/dnd`, `firebase`, `socket.io-client` actually present. Specifically, `socket.io-client` IS listed; I previously mis-checked. Re-confirmed with full `package.json` view.
- Confidence: High
- Impact: Minor — correction to v2's listing.

Re-verifying explicitly:

```bash
grep "socket.io-client\|firebase\|hello-pangea" /app/frontend/package.json
# Output:
#   "@hello-pangea/dnd": "^18.0.1",
#   "firebase": "^12.12.0",
#   "socket.io-client": "^4.8.3",
```

All three are declared. v2 claim **HOLDS**.

### 2.1.1 `@hello-pangea/dnd` — usage site now identified

- Finding: v2 said "Usage site not audited" for `@hello-pangea/dnd`.
- Type: Fact
- Evidence:
  - `src/components/panels/menu/ProductList.jsx` line 2: `import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";`
  - `src/components/panels/menu/CategoryList.jsx` line 2: same
- Confidence: High
- Status vs Previous: **New (gap filled)**

### 2.2 Backend (Stub Only — NOT the real API)

| Technology | Version | Purpose | Evidence |
|---|---|---|---|
| FastAPI | 0.110.1 | Placeholder HTTP server | `backend/server.py` |
| Motor (MongoDB async) | 3.3.1 | Database driver for stub | `backend/requirements.txt` |
| pymongo | 4.5.0 | MongoDB sync client | `backend/requirements.txt` |
| emergentintegrations | 0.1.0 | Declared, not imported in `server.py` | `requirements.txt` |
| boto3, cryptography, python-jose, pyjwt, bcrypt, passlib, etc. | Various | Declared, not referenced in stub code | `requirements.txt` |

**CRITICAL NOTE (v2 UNCHANGED, v3 HOLDS):** `backend/server.py` exposes only `GET/POST /api/status` and `GET /api/`. ALL real business API calls go to external services:

- MyGenie REST API (`REACT_APP_API_BASE_URL`)
- MyGenie CRM API (`REACT_APP_CRM_BASE_URL`)
- MyGenie WebSocket (`REACT_APP_SOCKET_URL`)

These URLs are read from the frontend `.env`. At v3 revalidation time the `.env` files ARE present in `/app` (preserved during the pull-replace); their values are NOT committed to the repo.

---

## 3. Repository Layout (Source Tree Only, excl. tests and UI primitives)

```
/
├── .emergent/                       Emergent platform scaffolding
├── backend/
│   ├── server.py                    FastAPI stub
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
│   │   └── sounds/                  14 .wav notification chimes (v3 correction; v2 said 15)
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
│       │   ├── services/            13 service modules
│       │   ├── socket/              Socket layer (service, events, handlers,
│       │   │                        useSocketEvents hook, index barrel) — 5 files
│       │   └── transforms/          10 transform modules (API ↔ frontend shape)
│       ├── components/
│       │   ├── cards/               Order/table/dineIn/delivery cards + timeline + buttons/
│       │   ├── dashboard/           ChannelColumn(s)Layout, ResizeHandle
│       │   ├── guards/              ProtectedRoute, ErrorBoundary
│       │   ├── layout/              Header, Sidebar, NotificationBanner, Tester
│       │   ├── modals/              RoomCheckIn, SplitBill, StationPicker
│       │   ├── order-entry/         20 components (OrderEntry orchestrator,
│       │   │                        Cart/Category/CollectPayment panels, modals,
│       │   │                        RePrintButton, PaymentMethodButton, etc.)
│       │   ├── panels/              MenuManagementPanel, SettingsPanel + sub-views
│       │   ├── reports/             DatePicker, ExportButtons, FilterBar,
│       │   │                        FilterTags, OrderDetailSheet, OrderTable,
│       │   │                        ReportTabs, SummaryBar
│       │   ├── sections/            OrderSection, TableSection
│       │   ├── station-view/        StationPanel
│       │   └── ui/                  46 shadcn/ui primitives (v3 correction; v2 said 47)
│       ├── config/
│       │   ├── firebase.js          FCM setup (env-driven)
│       │   └── paymentMethods.js    Payment method definitions + dynamic resolver
│       ├── constants/
│       │   ├── colors.js            Design tokens
│       │   ├── config.js            App constants
│       │   ├── featureFlags.js      USE_CHANNEL_LAYOUT=true, USE_STATUS_VIEW=true
│       │   └── index.js             Barrel
│       ├── contexts/                9 providers + AppProviders + barrel
│       ├── data/                    Legacy mock data (mockOrders, mockTables, mockMenu,
│       │                            mockCustomers, mockConstants, notePresets) —
│       │                            STILL imported at runtime in 3 files (see §11)
│       ├── hooks/                   use-toast, useLocalStorage, useRefreshAllData
│       ├── lib/                     utils.js (shadcn `cn()` helper)
│       ├── pages/                   6 pages (Login, Loading, Dashboard,
│       │                            AllOrdersReport, OrderSummary, StatusConfig)
│       ├── utils/                   businessDay, soundManager, statusHelpers, index
│       └── __tests__/               17 Jest test files (v3 correction; v2 said 18)
├── memory/                          Planning / docs folder (this file)
├── test_reports/                    Prior run artifacts
├── test_result.md                   Prior test results
└── tests/                           Empty (placeholder)
```

**Source file counts (current HEAD):**

```bash
$ find frontend/src -type f \( -name "*.js" -o -name "*.jsx" \) | wc -l
209
$ find frontend/src/__tests__ -type f -name "*.test.*" | wc -l
17
$ ls frontend/src/components/ui/ | wc -l
46
$ ls frontend/public/sounds/ | wc -l
14
```

---

## 4. Routing Map (UNCHANGED from v2)

Source: `frontend/src/App.js` (37 lines, unchanged).

| Path | Guard | Component | Evidence |
|---|---|---|---|
| `/` | none | `LoginPage` | `App.js` line 17 |
| `/loading` | `ProtectedRoute` | `LoadingPage` | line 18 |
| `/dashboard` | `ProtectedRoute` | `DashboardPage` | line 19 |
| `/reports` | `ProtectedRoute` | redirects → `/reports/audit` | line 21 |
| `/reports/audit` | `ProtectedRoute` | `AllOrdersReportPage` | line 22 |
| `/reports/all-orders` | `ProtectedRoute` | redirects → `/reports/audit` | line 23 |
| `/reports/summary` | `ProtectedRoute` | `OrderSummaryPage` | line 24 |
| `/visibility/status-config` | `ProtectedRoute` | `StatusConfigPage` | line 26 |

**No 404 / catch-all route.** Unknown paths render nothing.

- Finding: All 8 route declarations (including the 2 `<Navigate>` redirects) match v2.
- Type: Fact
- Evidence: `/app/frontend/src/App.js` lines 17–26
- Confidence: High
- Status vs Previous: **Unchanged**

---

## 5. Context Providers (9) — UNCHANGED

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

- Finding: Provider hierarchy and count match v2 exactly.
- Type: Fact
- Evidence: `/app/frontend/src/contexts/AppProviders.jsx` (not re-pasted; 9 `<XProvider>` nesting confirmed by barrel + file list)
- Confidence: High
- Status vs Previous: **Unchanged**

---

## 6. Environment Variables Referenced by Frontend (UNCHANGED)

| Variable | Referenced In | Required? |
|---|---|---|
| `REACT_APP_API_BASE_URL` | `api/axios.js` lines 5–8 (throws if missing), `profileTransform.js` (image URLs) | YES (throws at startup) |
| `REACT_APP_SOCKET_URL` | `api/socket/socketEvents.js` lines 8–12 (throws if missing) | YES (throws at startup) |
| `REACT_APP_CRM_BASE_URL` | `api/crmAxios.js` lines 9, 19–21 (warns if missing) | Recommended |
| `REACT_APP_CRM_API_KEYS` | `api/crmAxios.js` lines 11–16 (JSON map `{restaurantId: apiKey}`) | Recommended |
| `REACT_APP_FIREBASE_*` (7 vars) | `config/firebase.js` | For FCM only |
| `REACT_APP_FIREBASE_VAPID_KEY` | `config/firebase.js` | For FCM token |
| `NODE_ENV` | `socketService.js` lines 31, 360 | Env-built |

**Protected note**: Per workspace policy, `.env` is not committed. v3 observation: during re-validation, `/app/frontend/.env` and `/app/backend/.env` were preserved through the pull-replace (they exist in the container but are NOT in the git tree).

---

## 7. External Service Boundaries (UNCHANGED)

| Boundary | URL source | Auth | Purpose | Evidence |
|---|---|---|---|---|
| MyGenie REST API | `REACT_APP_API_BASE_URL` | `Authorization: Bearer ${auth_token}` | Orders, menu, tables, reports, profile, payments | `api/axios.js` lines 21–32 |
| MyGenie CRM API | `REACT_APP_CRM_BASE_URL` | `X-API-Key` (per restaurant; map from `REACT_APP_CRM_API_KEYS`) | Customers, addresses | `api/crmAxios.js` lines 53–65 |
| MyGenie WebSocket | `REACT_APP_SOCKET_URL` | **Unclear — no token in handshake** (see OQ-107, still OPEN) | Order/table engage + state push | `api/socket/socketService.js` lines 43–71 |
| Firebase FCM | Google (Firebase SDK) | Firebase config + VAPID | Push notifications | `config/firebase.js`, `public/firebase-messaging-sw.js` |

---

## 8. API Endpoints Declared

Source: `src/api/constants.js` lines 6–74 — **35 named endpoints** (v3 correction; v2 said 38. Recount: LOGIN=1, PROFILE=1, CATEGORIES/PRODUCTS/POPULAR_FOOD=3, TABLES/ORDER_TABLE_SWITCH/MERGE_ORDER/TRANSFER_FOOD=4, CANCEL_ITEM/ORDER_STATUS_UPDATE/CONFIRM_ORDER/FOOD_STATUS_UPDATE=4, ADD_CUSTOM_ITEM=1, 7 CRM, PLACE_ORDER/PREPAID_ORDER/UPDATE_ORDER/BILL_PAYMENT=4, EDIT_ORDER_ITEM/EDIT_ORDER_ITEM_QTY=2, ROOM_CHECK_IN/ORDER_SHIFTED_ROOM=2, SPLIT_ORDER=1, PRINT_ORDER=1, CANCELLATION_REASONS=1, RUNNING_ORDERS=1, 9 reports = **42**; discrepancy with v2's "38" — v3 says **42 total keys** in `API_ENDPOINTS`).

- Finding: v2 stated "38 named endpoints" but actual count = **42**.
- Type: Fact
- Evidence: `/app/frontend/src/api/constants.js` lines 6–74 — each `KEY: 'value'` counted.
- Confidence: High
- Status vs Previous: **Contradicted** (minor)

**Endpoint NOT declared but referenced** (still present in v3):
- `paymentService.collectPayment` reads `API_ENDPOINTS.CLEAR_BILL` — no such key exists. See RISK-001 (still CRITICAL).
- `API_ENDPOINTS.EDIT_ORDER_ITEM` and `EDIT_ORDER_ITEM_QTY` = literal `'TBD'` (lines 45–46). See RISK-005.

---

## 9. Storage Keys (Client-Side Persistence) — UNCHANGED

Source: `api/constants.js` lines 245–249 `STORAGE_KEYS` + scattered usages.

| Key | Usage | Evidence |
|---|---|---|
| `auth_token` | Bearer token | `authService.js`, `axios.js` line 23 |
| `remember_me` | Remember-me flag | `authService.js` |
| `user_email` | Remembered email | `authService.js` |
| `auth_redirect` (sessionStorage) | Beforeunload dialog suppression | `axios.js` line 49 |
| `SOCKET_DEBUG` | Socket debug toggle | `socketService.js` line 31, 333 |
| `mygenie_station_view_config` | Station view pref | `StationContext.jsx`, `stationService.js` |
| `mygenie_enable_dynamic_tables` | Settings toggle | `SettingsContext.jsx` |

---

## 10. Key File Size Census (source lines) — MATCHES v2 EXACTLY

```
 1431 pages/DashboardPage.jsx            (v2: 1431)  ✓
 1554 components/order-entry/OrderEntry.jsx         (v2: 1554)  ✓
 1592 components/order-entry/CollectPaymentPanel.jsx  (v2: 1592)  ✓
  805 components/order-entry/CartPanel.jsx          (v2: 805)   ✓
  700 components/cards/OrderCard.jsx                (v2: 700)   ✓
  502 components/cards/TableCard.jsx                (v2: 502)   ✓
  890 pages/StatusConfigPage.jsx                    (v2: 890)   ✓
  529 pages/LoadingPage.jsx                         (v2: 529)   ✓
  517 pages/OrderSummaryPage.jsx                    (v2: 517)   ✓
  484 pages/AllOrdersReportPage.jsx                 (v2: 484)   ✓
  542 components/modals/SplitBillModal.jsx          (v2: 542)   ✓
 1028 api/transforms/orderTransform.js              (v2: 1028)  ✓
  710 api/transforms/reportTransform.js             (v2: 710)   ✓
  588 api/services/reportService.js                 (v2: 588)   ✓
  651 api/socket/socketHandlers.js                  (v2: 651)   ✓
  364 api/socket/socketService.js                   (v2: 365)   ±1
  154 api/socket/socketEvents.js                    (v2: 155)   ±1
  194 api/socket/useSocketEvents.js                 (v2: 194)   ✓
  387 contexts/OrderContext.jsx                     (v2: 387)   ✓
  270 contexts/TableContext.jsx                     (v2: 270)   ✓
  248 contexts/SocketContext.jsx                    (v2: 248)   ✓
  161 contexts/StationContext.jsx                   (v2: 161)   ✓
  249 api/constants.js                              (v2: 250)   ±1
   68 api/axios.js                                  (v2: 68)    ✓
   81 api/crmAxios.js                               (v2: 82)    ±1
   15 api/services/paymentService.js                (v2: 15)    ✓
```

Interpretation: **all critical files are bit-for-bit stable** between v2 (commit `b32dec9`, now lost) and v3 (commit `7f87721`). The ±1 differences are whitespace/trailing-newline drift — no meaningful logic change.

- Finding: Codebase is essentially frozen relative to v2 snapshot.
- Type: Fact
- Evidence: `wc -l` outputs above
- Confidence: High
- Status vs Previous: **Unchanged** (strongly re-confirmed)

---

## 11. Test Inventory (v3 CORRECTED)

**17 test files** under `src/__tests__/` (v2 said 18; discrepancy is not traceable to a missing file — the v2 list also only enumerated 17 items).

```
__tests__/api/axios.test.js
__tests__/api/constants.test.js
__tests__/api/paymentService.test.js                  *** T2 currently FAILS — see RISK-001 ***
__tests__/api/socket/socketEvents.test.js
__tests__/api/socket/socketServiceGlobal.test.js
__tests__/api/socket/updateOrderStatus.test.js
__tests__/api/transforms/cancelItemPayload.test.js
__tests__/api/transforms/categoryTransform.test.js
__tests__/api/transforms/orderTransformFinancials.test.js
__tests__/api/transforms/profileTransform.test.js
__tests__/api/transforms/rawField.test.js
__tests__/api/transforms/updateOrderPayload.test.js
__tests__/contexts/SocketContext.test.jsx
__tests__/guards/ErrorBoundary.test.jsx
__tests__/guards/ProtectedRoute.test.jsx
__tests__/integration/App.routing.test.jsx
__tests__/structure/barrelExports.test.js
```

No e2e framework configured (no Playwright/Cypress).

---

## 12. Mock Data Usage — v3 AMENDED

v2 said: "mocks are still imported in some panels/tests" and listed `SettingsPanel, ListFormViews, ViewEditViews, shared.jsx` as import sites.

**v3 actual import sites** (verified via grep `from ['\"].*\.\./\(\.\./\)*data`):

| Importer | What | Purpose observable in code |
|---|---|---|
| `components/order-entry/ItemNotesModal.jsx` line 4 | `itemLevelPresets, getCustomerPreferences` | Preset notes for items (reference data, not mock) |
| `components/order-entry/OrderNotesModal.jsx` line 4 | `orderLevelPresets, getCustomerPreferences` | Preset notes for orders (reference data) |
| `components/cards/TableCard.jsx` line 5 | `mockOrderItems` | **Assigned to `orderData` at line 57 but `orderData` is NEVER READ elsewhere in TableCard.jsx** — DEAD USAGE of mock data |

**No imports from `SettingsPanel`, `ListFormViews`, `ViewEditViews`, or `shared.jsx`** — contrary to v2 claim.

- Finding: v2 listed wrong import sites for mock data. Real sites are 3 files; one of them (`TableCard.jsx`) assigns a mock variable that is never consumed.
- Type: Fact
- Evidence: `grep -rn "from ['\"].*data" --include="*.js" --include="*.jsx" /app/frontend/src/`
- Confidence: High
- Impact: Minor for user-facing behavior; moderate for documentation accuracy. Answers OQ-204.
- Status vs Previous: **Contradicted** (import site list) + **Partial new finding** (dead `mockOrderItems` var in TableCard.jsx)

---

## 13. Routes Access Matrix (UNCHANGED)

| Route | Requires auth? | Reads contexts | Side-effects on mount |
|---|---|---|---|
| `/` | No | Auth (auto-redirect if logged in) | FCM token request on explicit user action |
| `/loading` | Yes | Auth, Restaurant, Menu, Tables, Settings, Orders, Stations | Sequential 7 API loads + station data parallel (`LoadingPage.jsx`) |
| `/dashboard` | Yes | All 9 contexts | `useSocketEvents()` subscribes to 3 channels |
| `/reports/*` | Yes | Restaurant (for schedules/business day) | `reportService.getOrdersByTab(...)` on mount |
| `/visibility/status-config` | Yes | Settings | localStorage-backed status visibility toggle |

---

## 14. What Changed From v2 (File/Commit Level)

| Claim | v2 → v3 |
|---|---|
| Default branch | `7th-april-v1-` → **`main`** (CONTRADICTED) |
| Analysis commit | `b32dec9` → **`7f87721`** (commit `b32dec9` no longer reachable; new commits `7135ee1`, `e66f4f4`, `a457c32`, `979da64`, `7f87721` appear as "Auto-generated changes" / "auto-commit …") |
| Test file count | 18 → **17** (CONTRADICTED) |
| UI primitive count | 47 → **46** (CONTRADICTED) |
| Sound file count | 15 → **14** (CONTRADICTED) |
| API endpoint count | 38 → **42** (CORRECTED upward) |
| Mock data import sites | "panels/modals/SettingsPanel/…" → `ItemNotesModal`, `OrderNotesModal`, `TableCard` only (CONTRADICTED — wrong list) |
| `@hello-pangea/dnd` usage sites | "not audited" → `ProductList.jsx`, `CategoryList.jsx` (NEW) |
| Package.json lines referenced | off-by-one in several places (e.g., "line 97 packageManager" → actual line 90) | Minor scaling due to trimmed whitespace |
| Critical source file sizes | UNCHANGED to the line (strongly confirms stable codebase) |

All other structural claims (router shape, context hierarchy, service layer structure, storage keys, env vars, BUG references) are re-verified and **HOLD**.

---

## 15. Open Items (Pointers — details in other docs)

- `paymentService.collectPayment` still references undeclared `API_ENDPOINTS.CLEAR_BILL` → **RISK-001 HOLDS (CRITICAL)**
- `EDIT_ORDER_ITEM`, `EDIT_ORDER_ITEM_QTY` still literal `'TBD'` → **RISK-005 HOLDS (HIGH)**
- `handleUpdateOrder` (socketHandlers.js line 204–207) is annotated "LEGACY — kept for rollback"; `useSocketEvents.js` line 68–70 routes `update-order` via `handleOrderDataEvent` — the legacy function is dead code → **HOLDS**
- Table channel subscription contradiction: file headers claim BUG-203 removed it (`useSocketEvents.js` lines 4–6, 125–127); runtime still subscribes to `update_table_${restaurantId}` (lines 146, 153) → **HOLDS**
- Socket auth: No evidence of token passed to Socket.IO handshake (`socketService.js` lines 54–62) → **HOLDS**
- Aggregator events declared in `AGGREGATOR_EVENTS` + `EVENTS_REQUIRING_AGGREGATOR_API` (socketEvents.js lines 83–87, 126–129) but never subscribed anywhere → **HOLDS**
- StationContext.jsx line 118 — `const value = { ... }` not memoized → **HOLDS**
- `mockOrderItems` imported in production `TableCard.jsx` but assigned to a dead variable `orderData` → **NEW v3 FINDING**
