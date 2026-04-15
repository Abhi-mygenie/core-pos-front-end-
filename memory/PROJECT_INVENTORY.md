# PROJECT INVENTORY

> Generated: July 2025 | Source: `main` branch of `core-pos-front-end-`
> Method: Static code analysis — no runtime observation

---

## 1. Project Identity

| Field | Value |
|---|---|
| Name | MyGenie POS Frontend |
| Company | HOSIGENIE HOSPITALITY SERVICES PRIVATE LIMITED |
| Type | Restaurant Point-of-Sale (POS) Single-Page Application |
| Repository | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| Analyzed Branch | `main` |
| Default Branch (HEAD) | `7th-april-v1-` (NOTE: `main` is NOT the default) |

---

## 2. Technology Stack

### Frontend (Primary Codebase)

| Technology | Version | Purpose | Evidence |
|---|---|---|---|
| React | 19.0.0 | UI Framework | `package.json` line 50 |
| React Router DOM | 7.5.1 | Client-side routing | `package.json` line 55 |
| CRA + CRACO | 5.0.1 / 7.1.0 | Build toolchain | `package.json` lines 56, 84 |
| Tailwind CSS | 3.4.17 | Utility-first CSS | `package.json` line 95 |
| Radix UI | Various ^1.x–^2.x | Headless UI primitives (shadcn/ui pattern) | `package.json` lines 7-38 |
| Axios | 1.8.4 | HTTP client | `package.json` line 39 |
| Socket.IO Client | 4.8.3 | Real-time WebSocket | `package.json` line 58 |
| Firebase | 12.12.0 | Push notifications (FCM) | `package.json` line 46 |
| React Hook Form | 7.56.2 | Form management | `package.json` line 53 |
| Zod | 3.24.4 | Schema validation | `package.json` line 63 |
| date-fns | 4.1.0 | Date utilities | `package.json` line 44 |
| Recharts | 3.6.0 | Charts/graphs | `package.json` line 57 |
| Lucide React | 0.507.0 | Icon library | `package.json` line 48 |
| class-variance-authority | 0.7.1 | Variant class management | `package.json` line 40 |

### Backend (Stub Only)

| Technology | Version | Purpose | Evidence |
|---|---|---|---|
| FastAPI | — | Placeholder backend (NOT the real API) | `backend/server.py` |
| Motor (MongoDB) | — | Database driver for stub | `backend/server.py` |

**CRITICAL NOTE**: The `backend/server.py` is a **stub** with only `/api/` root and `/api/status` endpoints. All real business API calls go to external services.

### External Services

| Service | URL / Config Var | Purpose |
|---|---|---|
| MyGenie API | `REACT_APP_API_BASE_URL` (preprod.mygenie.online) | Main business API |
| Socket Server | `REACT_APP_SOCKET_URL` (presocket.mygenie.online) | Real-time order/table events |
| CRM API | `REACT_APP_CRM_BASE_URL` (crm.mygenie.online) | Customer relationship management |
| Firebase | Multiple `REACT_APP_FIREBASE_*` vars | Push notifications (FCM) |
| Google Maps | `REACT_APP_GOOGLE_MAPS_KEY` | *Purpose unclear — no visible usage in code* |

---

## 3. Codebase Metrics

| Metric | Value |
|---|---|
| Total source files (`.js` + `.jsx`) | 209 |
| Total lines of code (source) | ~36,387 |
| Context providers | 9 |
| API services | 12 |
| Transform modules | 9 |
| Pages | 6 |
| Custom components (non-UI) | ~40 |
| UI primitives (shadcn/ui) | ~40 |
| Socket event types handled | 11 |
| API endpoints defined | 34 |

---

## 4. Directory Structure

```
frontend/src/
├── api/                          # API layer
│   ├── axios.js                  # Main Axios instance (preprod.mygenie.online)
│   ├── crmAxios.js               # CRM Axios instance (crm.mygenie.online)
│   ├── constants.js              # API endpoints, status enums, mappings
│   ├── index.js                  # Barrel export
│   ├── services/                 # 12 service modules (API call wrappers)
│   │   ├── authService.js
│   │   ├── categoryService.js
│   │   ├── customerService.js    # CRM-backed
│   │   ├── orderService.js
│   │   ├── paymentService.js     # ⚠️ References undefined endpoint
│   │   ├── productService.js
│   │   ├── profileService.js
│   │   ├── reportService.js      # Most complex (589 lines)
│   │   ├── roomService.js
│   │   ├── settingsService.js
│   │   ├── stationService.js
│   │   └── tableService.js
│   ├── socket/                   # Socket.IO layer
│   │   ├── socketService.js      # Connection singleton
│   │   ├── socketEvents.js       # Event constants & channel generators
│   │   ├── socketHandlers.js     # Event processing logic (594 lines)
│   │   └── useSocketEvents.js    # React hook wiring
│   └── transforms/               # API ↔ Frontend data mapping
│       ├── authTransform.js
│       ├── categoryTransform.js
│       ├── customerTransform.js
│       ├── orderTransform.js     # Most complex (843 lines)
│       ├── productTransform.js
│       ├── profileTransform.js
│       ├── reportTransform.js
│       ├── settingsTransform.js
│       └── tableTransform.js
├── components/
│   ├── cards/                    # Order/Table card components
│   ├── dashboard/                # Dashboard layout components
│   ├── guards/                   # Route protection & error boundary
│   ├── layout/                   # Header, Sidebar, Notification
│   ├── modals/                   # Room check-in, Split bill, Station picker
│   ├── order-entry/              # Order taking flow (17 components)
│   ├── panels/                   # Settings & Menu management
│   ├── reports/                  # Report page components
│   ├── sections/                 # Table/Order grid sections
│   ├── station-view/             # Kitchen station display
│   └── ui/                       # shadcn/ui primitives (~40 files)
├── config/
│   ├── firebase.js               # FCM initialization
│   └── paymentMethods.js         # Payment method registry
├── constants/
│   ├── colors.js                 # Brand colors & status colors
│   ├── config.js                 # UI configuration
│   ├── featureFlags.js           # Feature toggles
│   └── index.js
├── contexts/                     # 9 React Context providers
│   ├── AppProviders.jsx          # Provider composition
│   ├── AuthContext.jsx
│   ├── SocketContext.jsx
│   ├── NotificationContext.jsx
│   ├── RestaurantContext.jsx
│   ├── MenuContext.jsx
│   ├── TableContext.jsx
│   ├── SettingsContext.jsx
│   ├── OrderContext.jsx
│   ├── StationContext.jsx
│   └── index.js
├── data/                         # Mock data (appears unused in production)
├── hooks/
│   ├── use-toast.js
│   ├── useLocalStorage.js
│   └── useRefreshAllData.js
├── pages/
│   ├── LoginPage.jsx
│   ├── LoadingPage.jsx           # Data hydration screen
│   ├── DashboardPage.jsx         # Main POS interface (1376 lines)
│   ├── AllOrdersReportPage.jsx   # Order audit/reports
│   ├── OrderSummaryPage.jsx      # Sales summary
│   ├── StatusConfigPage.jsx      # Order status visibility config
│   └── index.js
├── utils/
│   ├── businessDay.js            # Business hours calculation
│   ├── soundManager.js           # Notification audio playback
│   ├── statusHelpers.js          # Status display configs & sorting
│   └── index.js
├── App.js                        # Root component with routing
├── App.css
├── index.js                      # React entry point
└── index.css                     # Global styles (Tailwind imports)
```

---

## 5. Environment Variables Required

| Variable | Type | Required | Used In |
|---|---|---|---|
| `REACT_APP_API_BASE_URL` | URL | **Critical** | `api/axios.js` — Main API base |
| `REACT_APP_SOCKET_URL` | URL | **Critical** | `api/socket/socketEvents.js` — Socket server |
| `REACT_APP_CRM_BASE_URL` | URL | Required for CRM | `api/crmAxios.js` |
| `REACT_APP_CRM_API_KEYS` | JSON | Required for CRM | `api/crmAxios.js` — per-restaurant keys |
| `REACT_APP_FIREBASE_API_KEY` | String | Required for notifications | `config/firebase.js` |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | String | Required | `config/firebase.js` |
| `REACT_APP_FIREBASE_PROJECT_ID` | String | Required | `config/firebase.js` |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | String | Required | `config/firebase.js` |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | String | Required | `config/firebase.js` |
| `REACT_APP_FIREBASE_APP_ID` | String | Required | `config/firebase.js` |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | String | Optional | `config/firebase.js` |
| `REACT_APP_FIREBASE_VAPID_KEY` | String | Required for FCM | `config/firebase.js` |
| `REACT_APP_GOOGLE_MAPS_KEY` | String | **Unused in code** | No visible consumer |
| `REACT_APP_BACKEND_URL` | URL | Unused by app | Kubernetes ingress config only |
| `WDS_SOCKET_PORT` | Number | Dev HMR | CRA WebSocket dev server |
| `ENABLE_HEALTH_CHECK` | Boolean | — | Not seen in source |

---

## 6. Routes

| Path | Page | Protected | Description |
|---|---|---|---|
| `/` | LoginPage | No | Email/password login with FCM token |
| `/loading` | LoadingPage | Yes | Sequential 7-step data hydration |
| `/dashboard` | DashboardPage | Yes | Main POS interface |
| `/reports/audit` | AllOrdersReportPage | Yes | Order audit with tabs (Paid, Cancelled, etc.) |
| `/reports/summary` | OrderSummaryPage | Yes | Daily sales summary |
| `/reports` | — | — | Redirects to `/reports/audit` |
| `/reports/all-orders` | — | — | Redirects to `/reports/audit` |
| `/visibility/status-config` | StatusConfigPage | Yes | Order status visibility settings |

---

## 7. External API Dependencies

### Main API (preprod.mygenie.online) — 28 endpoints

Authentication, Menu, Tables, Orders, Payments, Reports, Settings, Rooms, Printing, Station

### CRM API (crm.mygenie.online) — 6+ endpoints

Customer search/lookup/CRUD, Address management — authenticated via per-restaurant X-API-Key

### Socket Server (presocket.mygenie.online) — 3 channels

- `new_order_{restaurantId}` — 10 event types
- `update_table_{restaurantId}` — 1 event type
- `order-engage_{restaurantId}` — 1 event type

### Firebase Cloud Messaging — Push notifications

Foreground + background (via service worker) notification handling with sound playback
