# ARCHITECTURE_CURRENT_STATE

## Method
This document describes the **current implementation truth** observed in code. It separates facts from inferences and does not describe a target-state architecture.

---

## 1. System Overview

### Finding
The current system is a minimal full-stack application consisting of:
- a React SPA frontend served separately
- a FastAPI backend exposing `/api` routes
- a MongoDB database used by the backend

### Evidence/files
- `/app/frontend/src/index.js`
- `/app/frontend/src/App.js`
- `/app/backend/server.py`
- `/app/backend/.env`
- supervisor status output showing `frontend`, `backend`, and `mongodb`

### Confidence level
High

### Impact
The architecture is simple enough to reason about quickly, but many requested business areas are not yet represented in code.

### Recommendation
Keep all further analysis anchored to the currently implemented flows only.

---

## 2. Frontend Architecture

### Finding
The frontend is a Create React App-based SPA using CRACO for configuration overrides, with Tailwind CSS and a generated shadcn/ui-style component library available in the codebase.

### Evidence/files
- `/app/frontend/package.json`
- `/app/frontend/craco.config.js`
- `/app/frontend/tailwind.config.js`
- `/app/frontend/components.json`
- `/app/frontend/src/components/ui/*`

### Confidence level
High

### Impact
The frontend has more scaffold/tooling than feature implementation. This can make the project appear larger than the active user-facing behavior actually is.

### Recommendation
When discussing frontend scope, distinguish between scaffolded UI primitives and actively rendered screens.

### Facts
- React 19 is declared in `package.json`.
- Runtime entry is `src/index.js`.
- Routing is provided by `react-router-dom`.
- Axios is used for HTTP calls.
- Tailwind is configured and CSS variables are defined in `src/index.css`.
- `@` alias resolves to `src` through CRACO and `jsconfig.json`.

### Inferences
- This appears to have been generated from an Emergent/CRA starter template and then minimally customized.
- Confidence for inference: Medium

---

## 3. Frontend Route and Render Flow

### Finding
There is only one visible application route and one visible screen component (`Home`).

### Evidence/files
- `/app/frontend/src/App.js`

### Confidence level
High

### Impact
There is no evidence of multi-page module boundaries, route guards, nested feature areas, or feature-specific layouts.

### Recommendation
Document the frontend as a single-screen app unless additional code is introduced later.

### Render flow
1. `index.js` mounts `<App />`.
2. `App` wraps the application in `BrowserRouter`.
3. Route config maps `/` to `<Home />`.
4. `Home` renders a centered logo/image link and the text “Building something incredible ~!”.

### Notable contradiction
`App.js` defines:
- `<Route path="/" element={<Home />}>`
- nested `<Route index element={<Home />} />`

This creates duplicate `Home` route mapping for the same location.

### Evidence/files
- `/app/frontend/src/App.js` lines 43-47

### Confidence level
High

### Impact
Behavior may still work, but route structure ownership is unclear and redundant.

### Recommendation
Track as duplicate logic/routing ambiguity rather than assuming it is intentional.

---

## 4. Frontend State Management

### Finding
There is no app-wide state management library in active use. Current visible runtime state is limited to local React lifecycle and an in-memory toast store utility.

### Evidence/files
- `/app/frontend/src/App.js`
- `/app/frontend/src/hooks/use-toast.js`
- grep results showing `useToast` is only referenced by `components/ui/toaster.jsx`

### Confidence level
High

### Impact
State complexity is currently low. There is no visible persistence layer, cache layer, query library, Redux store, Zustand store, or context-based app state orchestration.

### Recommendation
Describe current state management as “local component/effect state + standalone toast store utility present but not visibly mounted by App.”

### Facts
- `Home` uses `useEffect` to trigger an API call on mount.
- `use-toast.js` keeps `memoryState` and `listeners` at module scope.
- Toast removal uses long timeout constant `TOAST_REMOVE_DELAY = 1000000`.

### Uncertainty
`Toaster` component exists, but `App.js` does not visibly render it. If it is not mounted elsewhere, toasts may be non-visible despite the hook existing.

### Evidence/files
- `/app/frontend/src/components/ui/toaster.jsx`
- `/app/frontend/src/App.js`

### Confidence level
Medium-High

---

## 5. API Integration Flow

### Finding
The frontend performs exactly one visible backend call: `GET ${REACT_APP_BACKEND_URL}/api/` on `Home` mount.

### Evidence/files
- `/app/frontend/src/App.js`
- `/app/frontend/.env`

### Confidence level
High

### Impact
The frontend currently uses the backend only as a connectivity check / hello-world call. No visible user-facing data is rendered from the response.

### Recommendation
Treat API integration as “connectivity ping” rather than an end-user feature flow.

### Request flow
1. `BACKEND_URL` is read from `process.env.REACT_APP_BACKEND_URL`.
2. `API` is constructed as `${BACKEND_URL}/api`.
3. `axios.get(`${API}/`)` executes inside `useEffect`.
4. Success path logs `response.data.message` to console.
5. Failure path logs an error to console.

### Observed characteristics
- No retry logic
- No cancellation logic
- No loading state
- No error state shown in UI
- No shared axios instance/interceptor layer
- No auth header injection

---

## 6. Backend Architecture

### Finding
The backend is implemented in a single file and combines application bootstrap, configuration loading, database initialization, schema definitions, and route handlers.

### Evidence/files
- `/app/backend/server.py`

### Confidence level
High

### Impact
Ownership boundaries are straightforward for a small app, but separation of concerns is currently minimal.

### Recommendation
Document module boundaries as collapsed into one file rather than implying a layered backend architecture.

### Facts
- `load_dotenv(ROOT_DIR / '.env')` loads environment variables.
- `AsyncIOMotorClient` is initialized at import time.
- `db = client[os.environ['DB_NAME']]` selects the database at import time.
- `FastAPI()` app is created without global prefix.
- `APIRouter(prefix="/api")` is used for all declared endpoints.
- CORS middleware reads `CORS_ORIGINS` and splits on commas.

---

## 7. Data Model and Persistence Flow

### Finding
The only visible persisted model is `StatusCheck` stored in Mongo collection `status_checks`.

### Evidence/files
- `/app/backend/server.py`

### Confidence level
High

### Impact
Current data architecture is minimal and does not show domain entities such as users, orders, tickets, carts, printers, or sessions.

### Recommendation
All domain-level assumptions beyond `StatusCheck` should be treated as unsupported by code evidence.

### Data flow for POST `/api/status`
1. Request body is validated by `StatusCheckCreate` with `client_name` only.
2. Backend creates `StatusCheck` with generated UUID string and UTC timestamp.
3. Model is converted to dict.
4. Timestamp is converted to ISO string before insertion.
5. Record is inserted into `db.status_checks`.
6. API returns the Pydantic model object.

### Data flow for GET `/api/status`
1. Query fetches documents from `db.status_checks` with `_id` excluded.
2. Up to 1000 results are materialized.
3. If `timestamp` is a string, backend converts it back to `datetime`.
4. List is returned as `List[StatusCheck]`.

### Notable implementation detail
Timestamps are stored as strings rather than native MongoDB date types.

### Evidence/files
- `/app/backend/server.py` lines around timestamp serialization/deserialization

### Confidence level
High

### Impact
This affects query semantics, sorting expectations, and interoperability if future code expects native BSON dates.

### Recommendation
Record as a current-state behavior and a risk; do not reinterpret it as intentional domain design without more evidence.

---

## 8. Socket / Event Flow

### Finding
No socket, websocket, SSE, or event-bus implementation was found in the visible repository code.

### Evidence/files
- filename search over `/app` for `socket`
- `/app/frontend/src/App.js`
- `/app/backend/server.py`

### Confidence level
Medium-High

### Impact
Any real-time behavior discussed outside code is not represented in the current implementation snapshot.

### Recommendation
Mark this focus area as “not implemented in visible code.”

### Important nuance
Frontend `.env` contains `WDS_SOCKET_PORT=443`, but this is associated with CRA dev server websocket configuration, not app-level domain socket flow.

### Evidence/files
- `/app/frontend/.env`

### Confidence level
High

---

## 9. Printing Flow

### Finding
No printing flow was found in the visible codebase.

### Evidence/files
- filename search over `/app` for `print`
- review of `/app/frontend/src/App.js`
- review of `/app/backend/server.py`

### Confidence level
Medium-High

### Impact
Printing cannot be documented as an implemented subsystem based on current code.

### Recommendation
List this as absent and request confirmation if printing exists in a hidden service/repo.

---

## 10. Order Calculation Flow

### Finding
No order, cart, pricing, totals, tax, discount, or calculation logic was found in the visible code snapshot.

### Evidence/files
- code review of `/app/frontend/src`
- code review of `/app/backend/server.py`
- filename search findings

### Confidence level
Medium-High

### Impact
This focus area is currently unimplemented or not present in the inspected repository.

### Recommendation
Do not infer order behavior from dependency lists or directory names.

---

## 11. Auth / Token Handling

### Finding
No implemented authentication flow or token handling logic was found in the current visible app code.

### Evidence/files
- filename search for `auth`
- `/app/frontend/src/App.js`
- `/app/backend/server.py`

### Confidence level
Medium-High

### Impact
There is no visible login, logout, route protection, token storage, bearer injection, or backend auth middleware.

### Recommendation
Document auth as absent in active implementation, while separately noting that some auth-related Python packages are declared but unused in visible code.

### Important distinction
- **Fact:** `requirements.txt` includes `pyjwt`, `python-jose`, `bcrypt`, and `passlib`.
- **Fact:** `server.py` does not use them.
- **Inference:** these may be leftover template dependencies or reserved for future work.
- **Inference confidence:** Medium

---

## 12. External Scripts and Telemetry

### Finding
The frontend HTML shell includes external runtime behavior outside the React bundle.

### Evidence/files
- `/app/frontend/public/index.html`

### Confidence level
High

### Impact
Operational/privacy/security review cannot be limited to React source files.

### Recommendation
Include HTML shell review in all future audits.

### Facts
- `emergent-main.js` is loaded from `assets.emergent.sh`.
- PostHog is initialized in `index.html` with a hardcoded key and host.
- Emergent badge markup is present in the DOM shell.

### Uncertainty
The exact runtime behavior of `emergent-main.js` is not knowable from repo code alone because the script is externally hosted.

### Confidence level
High for presence, Low for internal behavior.

---

## 13. Module Boundary Assessment

### Finding
Module boundaries exist mainly as tooling/grouping boundaries rather than feature boundaries.

### Evidence/files
- `/app/frontend/src/App.js`
- `/app/frontend/src/components/ui/*`
- `/app/frontend/src/hooks/use-toast.js`
- `/app/frontend/src/lib/utils.js`
- `/app/backend/server.py`

### Confidence level
High

### Impact
The codebase is organized as:
- one active page module
- one utility hook store
- one utility helper module
- one large generated UI primitive library
- one monolithic backend module

### Recommendation
When assigning ownership, treat current boundaries as low-granularity and partly template-derived.

### Duplicate / unclear ownership notes
- Duplicate route mapping for `Home` in `App.js`
- Toast infrastructure exists, but no evidence in `App.js` that it is mounted into user flow
- Many UI primitives exist without evidence of active feature ownership
- Backend dependencies imply broader intent than backend code implements

---

## 14. Current Runtime Verification

### Finding
The currently deployed UI renders a simple centered landing screen, consistent with `App.js` and `App.css`.

### Evidence/files
- Browser screenshot captured from deployed frontend URL
- `/app/frontend/src/App.js`
- `/app/frontend/src/App.css`

### Confidence level
High

### Impact
Observed runtime behavior aligns with the inspected source for the main page.

### Recommendation
None.
