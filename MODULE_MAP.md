# MODULE_MAP

## Purpose
This map lists the current modules/components visible in code, their responsibilities, dependencies, and boundary observations.

---

## Frontend Module Map

### Module: `src/index.js`
- **Finding:** frontend bootstrap entrypoint.
- **Responsibility:** create root and render `<App />`.
- **Depends on:** `react`, `react-dom/client`, `@/index.css`, `@/App`.
- **Evidence/files:** `/app/frontend/src/index.js`
- **Confidence level:** High
- **Impact:** all runtime flow starts here.
- **Recommendation:** none.

### Module: `src/App.js`
- **Finding:** only visible application composition module.
- **Responsibility:**
  - configure browser routing
  - define `Home` component
  - perform hello-world backend request on mount
  - render minimal landing page UI
- **Depends on:** `react`, `react-router-dom`, `axios`, `@/App.css`, `process.env.REACT_APP_BACKEND_URL`.
- **Inbound dependencies:** imported by `src/index.js`.
- **Evidence/files:** `/app/frontend/src/App.js`
- **Confidence level:** High
- **Impact:** any app-level behavior currently flows through one file.
- **Recommendation:** none for implementation; note high centralization.

### Module: `Home` component inside `src/App.js`
- **Finding:** only active page component found.
- **Responsibility:**
  - call backend root endpoint on mount
  - render logo link and text
- **Outputs:** console log only from API response; no rendered data.
- **Evidence/files:** `/app/frontend/src/App.js`
- **Confidence level:** High
- **Impact:** backend integration is present but not surfaced to users.
- **Recommendation:** document as a connectivity check component.

### Module: `src/hooks/use-toast.js`
- **Finding:** standalone in-memory toast store and hook.
- **Responsibility:** create/update/dismiss/remove toast state shared through module-scope memory.
- **Depends on:** `react`.
- **Inbound dependencies:** `src/components/ui/toaster.jsx`.
- **Evidence/files:** `/app/frontend/src/hooks/use-toast.js`, `/app/frontend/src/components/ui/toaster.jsx`
- **Confidence level:** High
- **Impact:** provides shared ephemeral state without context provider.
- **Recommendation:** note that visible app composition does not clearly mount toaster UI.

### Module: `src/lib/utils.js`
- **Finding:** utility helper module.
- **Responsibility:** merge CSS class names via `clsx` and `tailwind-merge`.
- **Depends on:** `clsx`, `tailwind-merge`.
- **Inbound dependencies:** many generated UI primitive files.
- **Evidence/files:** `/app/frontend/src/lib/utils.js`
- **Confidence level:** High
- **Impact:** foundational helper for UI primitives.
- **Recommendation:** none.

### Module group: `src/components/ui/*`
- **Finding:** large generated UI primitive library.
- **Responsibility:** wrapper components for Radix/shadcn-style UI primitives.
- **Observed count:** 46 files.
- **Examples:** button, dialog, form, drawer, tabs, toast, table, tooltip.
- **Evidence/files:** `/app/frontend/src/components/ui/*.jsx`
- **Confidence level:** High
- **Impact:** increases module count substantially, but active app usage appears limited.
- **Recommendation:** distinguish scaffold modules from feature modules in ownership discussions.

### Module group: frontend configuration
- **Files:**
  - `/app/frontend/craco.config.js`
  - `/app/frontend/jsconfig.json`
  - `/app/frontend/tailwind.config.js`
  - `/app/frontend/postcss.config.js`
  - `/app/frontend/components.json`
- **Responsibility:** build-time aliasing, Tailwind config, generated component metadata, optional dev health endpoints.
- **Confidence level:** High
- **Impact:** important for architecture/runtime behavior even though not feature code.
- **Recommendation:** keep these files in scope during future debugging.

### Module group: `frontend/plugins/health-check/*`
- **Finding:** dev-server health monitoring plugin and route injector.
- **Responsibility:** expose `/health*` endpoints on webpack dev server when enabled.
- **Activation condition:** `ENABLE_HEALTH_CHECK === "true"`.
- **Current env value:** false.
- **Evidence/files:** `/app/frontend/plugins/health-check/webpack-health-plugin.js`, `/app/frontend/plugins/health-check/health-endpoints.js`, `/app/frontend/.env`, `/app/frontend/craco.config.js`
- **Confidence level:** High
- **Impact:** exists in code but inactive in current environment.
- **Recommendation:** classify as dormant capability, not active architecture.

### Module: `public/index.html`
- **Finding:** HTML shell contains material runtime dependencies.
- **Responsibility:** root HTML template, external script loading, PostHog initialization, Emergent badge.
- **Evidence/files:** `/app/frontend/public/index.html`
- **Confidence level:** High
- **Impact:** some runtime concerns bypass React source ownership.
- **Recommendation:** include HTML shell under frontend ownership map.

---

## Backend Module Map

### Module: `backend/server.py`
- **Finding:** monolithic backend module.
- **Responsibility:**
  - load environment variables
  - open MongoDB client
  - select database
  - define Pydantic models
  - define API routes
  - register CORS middleware
  - close DB client on shutdown
- **Depends on:** `fastapi`, `dotenv`, `motor`, `pydantic`, `starlette`, standard library.
- **Inbound dependencies:** runtime entrypoint under supervisor (exact launcher not visible in inspected files).
- **Evidence/files:** `/app/backend/server.py`
- **Confidence level:** High
- **Impact:** backend ownership is concentrated in one file with no internal submodule boundaries.
- **Recommendation:** document as single-module backend.

### Backend sub-area: environment/bootstrap
- **Finding:** environment and DB setup occur at import time.
- **Evidence/files:** `/app/backend/server.py` lines 14-20
- **Confidence level:** High
- **Impact:** startup depends on env presence and Mongo connectivity very early.
- **Recommendation:** track as operational sensitivity.

### Backend sub-area: models
- **Models:** `StatusCheck`, `StatusCheckCreate`
- **Responsibility:** request/response validation for status endpoints.
- **Evidence/files:** `/app/backend/server.py` lines 29-38
- **Confidence level:** High
- **Impact:** only domain model currently visible.
- **Recommendation:** none.

### Backend sub-area: routes
- **Routes:**
  - `GET /api/`
  - `POST /api/status`
  - `GET /api/status`
- **Evidence/files:** `/app/backend/server.py` lines 41-67
- **Confidence level:** High
- **Impact:** very small API surface; no separate controller/service/repository layers.
- **Recommendation:** none.

### Backend sub-area: persistence
- **Finding:** directly uses `db.status_checks` collection in route handlers.
- **Evidence/files:** `/app/backend/server.py` lines 54, 60
- **Confidence level:** High
- **Impact:** data access is embedded in handlers; no abstraction layer is present.
- **Recommendation:** document direct handler-to-database coupling as current truth.

---

## Cross-Cutting Boundaries

### API boundary
- **Finding:** frontend/backend integration boundary is environment-driven and manually composed.
- **Construction:** `process.env.REACT_APP_BACKEND_URL + '/api'` in frontend.
- **Evidence/files:** `/app/frontend/src/App.js`, `/app/frontend/.env`
- **Confidence level:** High
- **Impact:** correct backend routing depends on env correctness and route prefix consistency.
- **Recommendation:** document this as a key integration boundary.

### Data boundary
- **Finding:** only visible persisted collection is `status_checks` in MongoDB.
- **Evidence/files:** `/app/backend/server.py`
- **Confidence level:** High
- **Impact:** there is no evidence of additional collections/entities in code.
- **Recommendation:** none.

### Auth boundary
- **Finding:** no active auth boundary found.
- **Evidence/files:** `/app/frontend/src/App.js`, `/app/backend/server.py`
- **Confidence level:** Medium-High
- **Impact:** all visible endpoints are unauthenticated.
- **Recommendation:** mark auth ownership as currently absent.

### Real-time boundary
- **Finding:** no app-level socket/event boundary found.
- **Evidence/files:** repository filename search; inspected app files.
- **Confidence level:** Medium-High
- **Impact:** no real-time subsystem ownership can be assigned.
- **Recommendation:** mark as not implemented in visible code.

---

## Dependency Concentration Hotspots

### Hotspot 1: `frontend/src/App.js`
- **Why:** route config, screen component, and API call live together.
- **Evidence/files:** `/app/frontend/src/App.js`
- **Confidence level:** High
- **Impact:** minor changes to app shell and feature behavior likely touch same file.
- **Recommendation:** none; just note concentration.

### Hotspot 2: `backend/server.py`
- **Why:** all backend concerns are centralized.
- **Evidence/files:** `/app/backend/server.py`
- **Confidence level:** High
- **Impact:** any backend feature addition would likely increase coupling here.
- **Recommendation:** none for now; record current ownership concentration.

### Hotspot 3: `public/index.html`
- **Why:** telemetry and external script behavior are injected outside React.
- **Evidence/files:** `/app/frontend/public/index.html`
- **Confidence level:** High
- **Impact:** some runtime behavior may surprise teams reviewing only `src/`.
- **Recommendation:** include in operational ownership.
