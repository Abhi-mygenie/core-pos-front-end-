# CR-053 — Impact Analysis (Gate 2)

**Item:** CR-053 — MyGenie Training Academy
**Gate:** 2 (Impact Analysis ONLY — no implementation plan)
**Date:** 2026-06-18
**Risk:** HIGH (new module, but ZERO existing code modification)
**Code Reality:** NONE — full greenfield
**Conflict Pre-Check:** CLEAR — no open items touch any integration point

---

## ⚠️ OWNER DIRECTIVE: COMPLETE ISOLATION

> "There should be no dependency and connection to current POS code. Complete structure should be such." — Owner

> "Admin panel = separate app." — Owner

**This changes everything.** The Training Academy is NOT a feature inside the POS. It is **3 independent systems** that interact with the POS the way Intercom or Hotjar interacts with any website — by injecting a script that reads the DOM. Zero imports, zero shared components, zero code coupling.

---

## 1. SYSTEM ARCHITECTURE — 3 Independent Apps

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  APP 1: POS APPLICATION (EXISTING — UNTOUCHED)                     │
│  ──────────────────────────────────────────────                    │
│  React 19 + CRACO + Tailwind                                      │
│  Host: pos-frontend-deploy-25.preview.emergentagent.com            │
│  The ONLY change: 1 <script> tag in index.html                    │
│                                                                     │
│  index.html adds:                                                   │
│  <script src="/training/training-sdk.js" defer></script>           │
│                                                                     │
│  That's it. Zero other POS file modifications.                     │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  APP 2: TRAINING SDK (NEW — standalone JS bundle)                  │
│  ──────────────────────────────────────────────                    │
│  Pure JavaScript/React bundle that:                                 │
│  • Injects itself into the POS page DOM                            │
│  • Creates its own React root (separate from POS React tree)       │
│  • Reads POS DOM via data-testid selectors (READ-ONLY)             │
│  • Reads auth_token from localStorage (READ-ONLY)                  │
│  • Renders overlay, spotlight, tooltips, dashboards                │
│  • Communicates ONLY with Training Backend API                     │
│  • Has ZERO imports from POS codebase                              │
│  • Deployed as a static JS file served from /training/ path        │
│                                                                     │
│  Think of it as: Intercom widget but for training                  │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  APP 3: TRAINING ADMIN PANEL (NEW — separate React app)            │
│  ──────────────────────────────────────────────                    │
│  Completely separate React application                              │
│  Own codebase, own build, own deployment                           │
│  Own route: e.g., training-admin.mygenie.online                    │
│  MyGenie team access only                                          │
│  Communicates ONLY with Training Backend API                       │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  APP 4: TRAINING BACKEND (NEW — FastAPI + MongoDB)                 │
│  ──────────────────────────────────────────────                    │
│  Completely separate from POS backend (preprod.mygenie.online)     │
│  Own server process, own API routes (/api/training/*)              │
│  Own MongoDB collections (training_*)                              │
│  Validates POS auth tokens by calling POS API                      │
│  Serves SDK bundle + Admin panel                                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Interaction Diagram

```
                    POS User's Browser
                    ┌──────────────────────────────────────┐
                    │                                       │
                    │  POS React App (existing, untouched)  │
                    │  ┌─────────────────────────────────┐  │
                    │  │  Dashboard, Orders, Reports...  │  │
                    │  │  DOM elements with data-testid   │  │
                    │  │  localStorage: auth_token        │  │
                    │  └─────────────┬───────────────────┘  │
                    │                │ reads DOM              │
                    │                │ reads auth_token       │
                    │                ▼                        │
                    │  Training SDK (own React root)         │
                    │  ┌─────────────────────────────────┐  │
                    │  │  Overlay, Spotlight, Tooltip     │  │
                    │  │  Training Dashboard              │  │
                    │  │  Staff Dashboard                 │  │
                    │  │  Mission Player                  │  │
                    │  └─────────────┬───────────────────┘  │
                    │                │                        │
                    └────────────────┼────────────────────────┘
                                     │ API calls
                                     ▼
                    ┌──────────────────────────────────────┐
                    │  Training Backend (FastAPI)           │
                    │  /api/training/*                      │
                    │  MongoDB: training_* collections      │
                    │                                       │
                    │  Validates auth via:                  │
                    │  → POS API (preprod.mygenie.online)   │
                    └──────────────────────────────────────┘
                                     ▲
                                     │ API calls
                    ┌──────────────────────────────────────┐
                    │  Training Admin Panel                 │
                    │  (separate React app,                │
                    │   separate URL,                       │
                    │   MyGenie team only)                  │
                    └──────────────────────────────────────┘
```

---

## 2. THE SDK INJECTION MODEL — How Training Gets Into POS

The Training SDK loads into the POS page **without any POS code dependency**. It's a standalone bundle that creates its own world.

### 2.1 Injection Point (THE ONLY POS MODIFICATION)

```html
<!-- /app/frontend/public/index.html — ADD 1 LINE -->
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <!-- CR-053: Training Academy SDK — standalone, zero POS dependency -->
    <div id="training-root"></div>
    <script src="/training/training-sdk.js" defer></script>
</body>
```

**POS files modified: 1 (index.html). Lines added: 2. Lines modified: 0.**

### 2.2 SDK Bootstrap (training-sdk.js)

```javascript
// The SDK creates its OWN React root, completely separate from POS
// It reads POS DOM but never imports POS components

(function() {
  // 1. Create container if not exists
  let container = document.getElementById('training-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'training-root';
    document.body.appendChild(container);
  }

  // 2. Read POS auth token (READ-ONLY — SDK never writes to POS localStorage keys)
  const posToken = localStorage.getItem('auth_token');

  // 3. Mount SDK's own React tree
  const root = ReactDOM.createRoot(container);
  root.render(
    React.createElement(TrainingApp, { posToken })
  );
})();
```

### 2.3 What the SDK Reads from POS (READ-ONLY contract)

| POS Resource | How SDK Reads It | Purpose | Write? |
|-------------|-----------------|---------|:------:|
| `localStorage.auth_token` | `localStorage.getItem('auth_token')` | Auth for training API calls | ❌ NEVER |
| DOM elements by `data-testid` | `document.querySelector('[data-testid="..."]')` | Spotlight targeting | ❌ NEVER |
| Current URL | `window.location.href` | Step validation (url_contains) | ❌ NEVER |
| DOM mutations | `MutationObserver` on `document.body` | Detect element appearance | ❌ NEVER |
| Click events | `document.addEventListener('click', ..., true)` | Detect user clicks for step validation | ❌ NEVER |
| Toast elements | `document.querySelectorAll('[data-sonner-toast]')` | Detect toast for validation | ❌ NEVER |

**The SDK is a PURE OBSERVER. It reads POS state but never writes to it.**

The SDK writes ONLY to:
- Its own `training-root` div (overlay UI)
- Its own localStorage keys (prefixed `mygenie_training_*`)
- Its own API (Training Backend)

### 2.4 SDK Isolation Guarantees

| Guarantee | How |
|-----------|-----|
| SDK crash doesn't break POS | Own React root with error boundary. If SDK throws, POS continues. |
| SDK styles don't leak into POS | All SDK styles scoped via CSS-in-JS or `#training-root` prefix. Shadow DOM optional. |
| SDK doesn't block POS rendering | `defer` script + async mount. POS loads first, SDK mounts after. |
| SDK removal = remove 2 lines | Delete the `<div>` and `<script>` from index.html. POS works as before. |
| POS update doesn't break SDK | SDK depends on `data-testid` selectors (stable contract), not component internals. |

---

## 3. APP 2: TRAINING SDK — Internal Architecture

```
/app/training-sdk/                    ← NEW: separate directory (not inside /frontend/src)
├── package.json                      ← Own dependencies (React, own UI lib)
├── webpack.config.js                 ← Builds to single training-sdk.js bundle
├── tsconfig.json                     ← (optional: TypeScript)
├── src/
│   ├── index.js                      ← Bootstrap: find #training-root, mount React
│   ├── TrainingApp.jsx               ← Root component with error boundary
│   ├── TrainingProvider.jsx           ← Context: state machine, API client, auth
│   │
│   ├── overlay/                       ← Mission execution UI
│   │   ├── MissionExecutor.jsx        ← Orchestrator: manages step sequence
│   │   ├── DimmedBackdrop.jsx         ← Semi-transparent full-screen overlay
│   │   ├── Spotlight.jsx              ← Box-shadow cutout around target
│   │   ├── PulseRing.jsx             ← Animated glow ring
│   │   ├── InstructionTooltip.jsx    ← The instruction panel
│   │   ├── TrainingTopBar.jsx         ← Header with progress + controls
│   │   ├── StepIndicator.jsx         ← Bottom dots
│   │   ├── CompletionScreen.jsx      ← Mission complete celebration
│   │   └── tooltipPositioner.js      ← Smart placement algorithm
│   │
│   ├── validator/                     ← Step validation engine
│   │   ├── StepValidator.js           ← Core: watches DOM for correct actions
│   │   ├── validators/                ← One file per validation type
│   │   │   ├── urlContains.js
│   │   │   ├── elementVisible.js
│   │   │   ├── clickTarget.js
│   │   │   ├── inputNotEmpty.js
│   │   │   ├── inputHasValue.js
│   │   │   ├── elementCountGte.js
│   │   │   ├── toastAppeared.js
│   │   │   └── waitSeconds.js
│   │   └── ValidatorRegistry.js       ← Maps type string → validator function
│   │
│   ├── practice/                      ← Practice mode
│   │   └── PracticeModeInterceptor.js ← Axios-level mock for destructive APIs
│   │
│   ├── dashboards/                    ← Training views (rendered inside SDK's own root)
│   │   ├── TrainingLauncher.jsx       ← The 🎓 floating button
│   │   ├── TrainingDashboard.jsx      ← "My Training" — employee course grid
│   │   ├── CourseCard.jsx
│   │   ├── MissionList.jsx
│   │   ├── StaffDashboard.jsx         ← Manager: all employees progress
│   │   ├── StaffTable.jsx
│   │   ├── EmployeeDetail.jsx         ← Manager: drill-down per employee
│   │   └── ProgressBar.jsx
│   │
│   ├── api/                           ← Training API client
│   │   ├── trainingApi.js             ← Axios instance → Training Backend
│   │   └── endpoints.js               ← All endpoint paths
│   │
│   ├── hooks/
│   │   ├── useTrainingProgress.js
│   │   ├── useMissionPlayer.js
│   │   ├── useStepValidation.js
│   │   ├── usePosAuth.js             ← Reads auth_token from localStorage
│   │   └── usePosDOM.js              ← DOM queries via data-testid
│   │
│   ├── state/
│   │   ├── missionStateMachine.js    ← IDLE→LOADING→STEP_ACTIVE→...→DONE
│   │   └── progressCache.js          ← localStorage write-ahead buffer
│   │
│   └── styles/
│       ├── overlay.css               ← All scoped to #training-root
│       └── dashboards.css
│
├── dist/
│   └── training-sdk.js               ← Single output bundle (~150-200KB)
│
└── README.md
```

### Build Output
```bash
# SDK builds to a single file that POS loads via <script>
yarn build → dist/training-sdk.js

# This file is served at /training/training-sdk.js
# Copy to POS public: cp dist/training-sdk.js /app/frontend/public/training/
# OR: served from Training Backend as static file
```

---

## 4. APP 3: TRAINING ADMIN — Internal Architecture

```
/app/training-admin/                   ← NEW: completely separate React app
├── package.json
├── src/
│   ├── index.js
│   ├── App.jsx                        ← Routes: /courses, /restaurants, /analytics
│   │
│   ├── pages/
│   │   ├── LoginPage.jsx              ← Super admin auth (separate from POS auth)
│   │   ├── CoursesPage.jsx            ← List all courses
│   │   ├── CourseEditorPage.jsx       ← Edit course details
│   │   ├── MissionEditorPage.jsx      ← Edit mission + steps (the builder)
│   │   ├── StepEditorPage.jsx         ← Individual step editor with selector tester
│   │   ├── RestaurantsPage.jsx        ← List restaurants, manage configs
│   │   ├── RestaurantConfigPage.jsx   ← Enable/disable courses per restaurant
│   │   ├── AnalyticsPage.jsx          ← Global stats: adoption, drop-off, effectiveness
│   │   └── ContentPipelinePage.jsx    ← Draft → Review → Published workflow
│   │
│   ├── components/
│   │   ├── StepBuilder.jsx            ← Visual step editor (instruction, target, action, validate)
│   │   ├── SelectorTester.jsx         ← "Test Selector" — opens POS in iframe, highlights match
│   │   ├── MissionPreview.jsx         ← "Preview Mission" — runs overlay in sandbox
│   │   ├── DragReorderList.jsx        ← Reorder missions/steps by drag
│   │   ├── RoleSelector.jsx
│   │   └── CourseCard.jsx
│   │
│   ├── api/
│   │   └── adminApi.js                ← Admin API client → Training Backend
│   │
│   └── styles/
│
└── README.md
```

---

## 5. APP 4: TRAINING BACKEND — API Architecture

```
/app/training-backend/                 ← NEW: separate FastAPI app
├── server.py                          ← FastAPI app + CORS + routes
├── requirements.txt
├── .env                               ← MONGO_URL, POS_API_BASE_URL, ADMIN_SECRET
│
├── models/
│   ├── course.py                      ← Course Pydantic model
│   ├── mission.py                     ← Mission + Step models
│   ├── progress.py                    ← Training progress model
│   ├── assignment.py                  ← Course assignment model
│   ├── activity.py                    ← Activity log model
│   └── restaurant_config.py          ← Per-restaurant config model
│
├── routes/
│   ├── catalog.py                     ← GET /courses, GET /courses/:id/missions
│   ├── progress.py                    ← POST /start, /step-complete, /skip, GET /me
│   ├── manager.py                     ← GET /overview, /employee/:id, POST /assign, /remind
│   ├── admin_courses.py              ← CRUD courses (super admin only)
│   ├── admin_missions.py             ← CRUD missions + steps (super admin only)
│   ├── admin_restaurants.py          ← Restaurant config CRUD (super admin only)
│   └── admin_analytics.py            ← Global analytics queries
│
├── middleware/
│   ├── pos_auth.py                    ← Validates POS Bearer token via preprod API
│   └── admin_auth.py                 ← Validates admin credentials (separate auth)
│
├── services/
│   ├── pos_api.py                     ← Calls preprod.mygenie.online to validate tokens + get employee list
│   ├── progress_service.py           ← Business logic for progress tracking
│   └── analytics_service.py          ← Aggregation queries for admin analytics
│
├── seed/
│   ├── seed_courses.py               ← Initial course content (Phase 1: 3 courses)
│   └── seed_restaurant_config.py    ← Default config for test restaurants
│
└── tests/
```

### Backend Endpoints (Full List)

```
TRAINING API: /api/training/

═══ CATALOG (POS users — cacheable) ═══
GET  /courses                          → Course list for current employee's restaurant + role
GET  /courses/:courseId/missions       → All missions with steps for a course

═══ PROGRESS (POS users — per employee) ═══
GET  /progress/me                      → Current employee's full progress
POST /progress/start                   → Start or resume a mission
POST /progress/step-complete           → Mark step as done
POST /progress/skip-mission            → Skip a mission
POST /progress/reset-mission           → Re-take a mission
POST /progress/sync                    → Bulk sync from offline buffer

═══ MANAGER (POS owner/manager) ═══
GET  /manager/overview                 → All staff progress for this restaurant
GET  /manager/employee/:empId          → Detailed progress for one employee
GET  /manager/course/:courseId/stats   → Course-level completion/skip/time stats
POST /manager/assign                   → Assign course to employee
POST /manager/remind                   → Send training reminder
POST /manager/exempt                   → Exempt employee from course
POST /manager/set-deadline             → Set completion deadline
GET  /manager/export                   → Excel download of all progress

═══ ADMIN (MyGenie super admin) ═══
POST /admin/auth/login                 → Admin login (separate credential system)

GET  /admin/courses                    → All courses (all statuses incl. draft)
POST /admin/courses                    → Create new course
PUT  /admin/courses/:courseId          → Update course details
DEL  /admin/courses/:courseId          → Archive course (soft delete)

GET  /admin/courses/:courseId/missions → All missions for a course
POST /admin/courses/:courseId/missions → Create new mission
PUT  /admin/missions/:missionId        → Update mission (title, steps, order)
DEL  /admin/missions/:missionId        → Archive mission

POST /admin/missions/:missionId/steps  → Add step to mission
PUT  /admin/steps/:stepId              → Update step
DEL  /admin/steps/:stepId              → Remove step

GET  /admin/restaurants                → All restaurants with training config
PUT  /admin/restaurants/:restId/config → Update restaurant training config

GET  /admin/analytics/adoption         → How many restaurants use training
GET  /admin/analytics/drop-off         → Per-mission completion vs skip rates
GET  /admin/analytics/time-analysis    → Average time per step/mission
GET  /admin/analytics/effectiveness    → Correlation: training % vs support tickets

POST /admin/content/publish/:courseId  → Publish draft course → active
POST /admin/content/unpublish/:courseId→ Revert to draft
```

---

## 6. AUTH FLOWS — Two Separate Systems

### 6.1 POS User Auth (Training SDK + Manager views)

```
Employee uses POS → logs in → auth_token in localStorage
                                    │
Training SDK reads auth_token       │
    │                               │
    ▼                               │
SDK calls Training Backend:         │
  GET /api/training/progress/me     │
  Authorization: Bearer <pos_token> │
    │                               │
    ▼                               │
Training Backend validates token:   │
  → POST preprod.mygenie.online/api/v1/profile
    Authorization: Bearer <pos_token>
  → Response: { user_id, name, role, restaurant_id }
  → Cache validation result for 15 minutes (avoid re-calling per request)
    │
    ▼
  Proceed with training API logic using extracted identity
```

### 6.2 Admin Auth (Training Admin Panel)

```
MyGenie admin opens admin panel
    │
    ▼
Admin login page → POST /api/training/admin/auth/login
  Body: { email, password }
  → Validates against training_admin_users collection
  → Returns JWT with { admin_id, role: "super_admin" }
    │
    ▼
Admin panel stores JWT, uses for all admin API calls
  Authorization: Bearer <admin_jwt>

COMPLETELY SEPARATE from POS auth.
Admin credentials are in training_admin_users MongoDB collection.
```

---

## 7. MONGODB COLLECTIONS — Complete Schema

### 7.1 Collection Index

| Collection | Writer | Reader | Purpose |
|-----------|--------|--------|---------|
| `training_courses` | Admin panel | SDK + Admin | Course catalog |
| `training_missions` | Admin panel | SDK + Admin | Missions with steps |
| `training_progress` | SDK (via API) | SDK + Manager + Admin | Per-employee per-mission progress |
| `training_assignments` | Manager + Admin | SDK + Manager | Course assignments |
| `training_activity_log` | SDK (via API) | Admin (analytics) | Append-only audit trail |
| `training_restaurant_config` | Admin | SDK + Manager | Per-restaurant course enablement |
| `training_admin_users` | Admin (seed) | Admin auth | Super admin credentials |

### 7.2 Indexes for Query Performance

```javascript
// training_progress — most queried collection
db.training_progress.createIndex({ restaurant_id: 1, employee_id: 1 })               // "my progress"
db.training_progress.createIndex({ restaurant_id: 1, employee_id: 1, course_id: 1 }) // "my course progress"
db.training_progress.createIndex({ restaurant_id: 1, course_id: 1, status: 1 })      // "course stats"

// training_activity_log — time-series reads
db.training_activity_log.createIndex({ restaurant_id: 1, employee_id: 1, timestamp: -1 }) // "activity timeline"
db.training_activity_log.createIndex({ restaurant_id: 1, timestamp: -1 })                  // "restaurant activity"

// training_courses — low volume, read-heavy
db.training_courses.createIndex({ course_id: 1 }, { unique: true })
db.training_courses.createIndex({ status: 1 })

// training_missions — read by course
db.training_missions.createIndex({ course_id: 1, display_order: 1 })
db.training_missions.createIndex({ mission_id: 1 }, { unique: true })

// training_restaurant_config — lookup by restaurant
db.training_restaurant_config.createIndex({ restaurant_id: 1 }, { unique: true })
```

---

## 8. DEPENDENCY MAP — What Depends on What

```
                    ZERO COUPLING
                    ═════════════

POS App ──────────────────────────── Training SDK
         │                              │
         │ SDK reads DOM via            │ SDK calls Training Backend
         │ data-testid (stable          │ for all data
         │ selectors, no imports)       │
         │                              │
         │ SDK reads auth_token         │
         │ from localStorage            │
         │ (standard browser API)       │
         │                              │
         └──── NO IMPORT ──────────────┘

Training SDK ─────────── Training Backend ─────────── Training Admin
              API calls                     API calls
              (REST)                        (REST)

Training Backend ──── MongoDB (training_* collections)
                 ──── POS API (token validation + employee list, READ-ONLY)

NOTHING calls back into POS code.
NOTHING imports POS modules.
NOTHING modifies POS state.
NOTHING shares POS dependencies.
```

---

## 9. FILES AFFECTED IN POS (MINIMAL)

| # | File | Change | Lines |
|---|------|--------|:-----:|
| 1 | `/app/frontend/public/index.html` | Add `<div id="training-root"></div>` + `<script src="/training/training-sdk.js" defer></script>` | +2 |

**That's it. 1 file. 2 lines added. 0 lines modified. 0 imports. 0 dependencies.**

Everything else is NEW files in NEW directories.

### Files/Directories WILL NOT Touch

- `src/App.js` — NO route changes
- `src/contexts/AppProviders.jsx` — NO provider additions
- `src/components/*` — NO component modifications
- `src/api/*` — NO axios instance sharing
- `src/pages/*` — NO page modifications
- `package.json` — NO dependency additions (SDK has own package.json)
- `.env` — NO new env vars in POS (SDK reads its own config)

---

## 10. RISK REGISTER

| # | Risk | Level | Mitigation |
|---|------|:-----:|-----------|
| R1 | SDK bundle size increases POS page load | MEDIUM | SDK loads with `defer` — after POS renders. Budget: <200KB gzipped. Lazy-load dashboards. |
| R2 | data-testid selectors change in POS update | MEDIUM | Selectors are stable (testing contract). Mission steps reference them. If POS changes a testid, the affected mission step gracefully falls back ("element not found, skip step"). Admin can update the selector in the DB without code deploy. |
| R3 | SDK overlay z-index conflicts with POS modals | LOW | SDK uses z-1000+ range. POS max z-index is z-200 (flyout). 800 gap. |
| R4 | SDK reads stale auth_token | LOW | SDK polls `localStorage.getItem('auth_token')` on each API call. If user logs out (token removed), SDK shows "Please login to continue training." |
| R5 | Training Backend down → SDK crashes | LOW | Error boundary on SDK root. SDK shows "Training temporarily unavailable" and hides overlay. POS unaffected. |
| R6 | Admin makes a bad step (wrong selector, impossible validation) | MEDIUM | Admin panel has "Preview Mission" button to test before publishing. "Test Selector" highlights element live. Content pipeline (draft→review→publish) prevents untested content from going live. |
| R7 | POS DOM not ready when SDK mounts | LOW | SDK waits for `DOMContentLoaded` + checks for `[data-testid="sidebar"]` before activating. Retries with exponential backoff. |
| R8 | Multiple browser tabs conflict | LOW | SDK scopes progress to current tab. localStorage buffer uses tab-specific keys. |
| R9 | Practice mode interceptor conflicts with POS API calls | MEDIUM | Interceptor ONLY activates when a mission with `practice_mode: true` is actively running. Deactivates the moment mission ends/exits. Uses POS app's axios interceptor mechanism (reads `window.__posAxios` if exposed) OR intercepts at fetch/XMLHttpRequest level. |

---

## 11. OPEN QUESTIONS RESOLVED

| # | Question | Resolution |
|---|----------|-----------|
| 1 | Does preprod API have an employee list endpoint? | **MUST VERIFY** — curl-probe needed. If not, SDK can collect employee IDs from progress docs (employees appear as they use the system). |
| 2 | Does POS JWT contain restaurant_id + role? | **VERIFY via profile API** — SDK calls `GET /api/v1/profile` with token to extract identity. Response structure already seen in AuthContext.jsx. |
| 3 | Which data-testid selectors exist? | **1636 total data-testids in POS codebase.** Good coverage. Sidebar: 14 testids. OrderEntry: 10+. Adequate for Phase 1 missions. |
| 4 | Should admin panel be a separate app? | **YES — Owner confirmed.** Separate React app, separate URL, separate auth. |
| 5 | Firebase notification integration? | **DEFER to Phase 3.** Phase 1 uses in-app prompts only. |

### New Question Surfaced

| # | Question | Impact |
|---|----------|--------|
| 6 | **How does SDK JS file get served?** Options: A) Copy to POS `/public/training/` dir (simple, couples deploy). B) Training Backend serves it as static file at `/training/training-sdk.js` via nginx proxy. C) CDN. | Architecture for deployment. **Recommend B** — Backend serves SDK, so SDK version can be updated independently of POS deploy. |

---

## 12. PHASE 1 SCOPE LOCK

### WILL BUILD (Phase 1):
- Training SDK bundle (overlay engine + employee dashboard + manager dashboard)
- Training Backend (FastAPI: catalog + progress + manager APIs)
- MongoDB collections (courses, missions, progress, activity_log, restaurant_config)
- Seed script for 3 courses (~32 missions): Restaurant Setup, Order Taking, Billing
- 1 line in POS `index.html` to load SDK

### WILL NOT BUILD (Phase 1):
- Admin panel (Phase 2)
- Practice mode interceptor (Phase 2)
- Gamification / badges (Phase 3)
- Push notifications (Phase 3)
- Content versioning pipeline (Phase 3)
- Analytics dashboard (Phase 3)

### WILL NOT TOUCH:
- Any POS source code (src/*)
- Any POS dependency (package.json)
- Any POS configuration (.env, craco.config.js)
- Any POS backend (server.py)

---

## 13. GATE STATUS

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE |
| 2 — Impact Analysis | ✅ COMPLETE (this document) |
| 3 — Implementation Plan | ⏳ PENDING — awaiting owner review of Impact Analysis |
| 4 — Code Gate / Owner GO | ⏳ PENDING |
| 5 — Implementation | ⏳ PENDING (Phase 1 first) |
| 6 — Owner Smoke | ⏳ PENDING |

---

*CR-053 Gate 2 COMPLETE. 3 independent apps (SDK + Admin + Backend). 1 POS file touched (index.html, +2 lines). Zero POS code dependency. Zero POS import. Training SDK is a pure DOM observer. UX is #1 priority.*
