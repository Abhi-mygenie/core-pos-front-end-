# PROJECT_INVENTORY

## Scope
This inventory documents the current code implementation found under `/app`, excluding `/app/memory` per user instruction.

## Repository Snapshot
- **Observed project shape:** single frontend + single backend application in one repo.
- **Git state at inspection time:** repository appears to be on branch `main`, with most visible project files showing as untracked in `git status --short`.
- **Evidence/files:** git status output from `/app`; `/app/frontend/package.json`; `/app/backend/requirements.txt`; `/app/backend/server.py`.
- **Confidence:** High
- **Impact:** Version-history-based lineage and ownership are unclear from current working tree state.
- **Recommendation:** Treat this inventory as a code snapshot of the current filesystem, not as a reviewed git history.

## Top-Level Inventory

### 1) Frontend application
- **Location:** `/app/frontend`
- **Framework/tooling:** React 19 + Create React App runtime (`react-scripts`) with CRACO customization.
- **Styling:** Tailwind CSS + generated shadcn/ui-style component set.
- **Routing:** `react-router-dom` browser routing.
- **API client:** `axios`.
- **Evidence/files:** `/app/frontend/package.json`, `/app/frontend/craco.config.js`, `/app/frontend/src/App.js`, `/app/frontend/src/index.js`, `/app/frontend/tailwind.config.js`.
- **Confidence:** High
- **Impact:** Frontend is set up as a general-purpose SPA shell, but current implemented feature scope is minimal.
- **Recommendation:** None for behavior; document actual route/component usage separately.

### 2) Backend application
- **Location:** `/app/backend`
- **Framework/tooling:** FastAPI with Motor/MongoDB.
- **Persistence:** MongoDB accessed through `AsyncIOMotorClient` using environment variables.
- **API prefixing:** implemented through `APIRouter(prefix="/api")`.
- **Evidence/files:** `/app/backend/server.py`, `/app/backend/.env`, `/app/backend/requirements.txt`.
- **Confidence:** High
- **Impact:** Backend currently exposes only a very small API surface.
- **Recommendation:** None; document endpoint-level behavior in architecture/module documents.

### 3) Tests and auxiliary directories
- **Observed directories:** `/app/tests`, `/app/test_reports`.
- **Current visible test content:** only `/app/tests/__init__.py` was found during quick file listing.
- **Evidence/files:** `/app/tests/__init__.py`, directory listing from `/app/tests`.
- **Confidence:** High
- **Impact:** There is little evidence of active automated app-level test coverage in the repo snapshot.
- **Recommendation:** Confirm whether additional tests exist outside the visible paths or are generated externally.

## Frontend Inventory

### Entry points and configuration
- `/app/frontend/src/index.js`
  - Creates React root and renders `<App />` inside `React.StrictMode`.
- `/app/frontend/src/App.js`
  - Main application component and only visible route configuration.
- `/app/frontend/craco.config.js`
  - Configures alias `@ -> src`, eslint rules, watch ignores, optional health-check plugin, optional Emergent visual edits wrapper in dev.
- `/app/frontend/jsconfig.json`
  - Mirrors alias mapping for editor/module resolution.
- `/app/frontend/components.json`
  - shadcn/ui generator metadata.
- `/app/frontend/tailwind.config.js`, `/app/frontend/postcss.config.js`, `/app/frontend/src/index.css`
  - Tailwind wiring and CSS variable theme definitions.
- **Confidence:** High

### Frontend implemented feature files
- `/app/frontend/src/App.js`
  - Contains the only visible screen (`Home`) and the only visible API call.
- `/app/frontend/src/App.css`
  - Provides basic dark full-screen centered layout.
- `/app/frontend/src/hooks/use-toast.js`
  - Client-side toast store/hook implementation.
- `/app/frontend/src/lib/utils.js`
  - `cn()` helper for class merging.
- **Confidence:** High

### Generated UI primitive inventory
- **Observed count:** 46 `.jsx` files under `/app/frontend/src/components/ui`.
- **Examples:** `button.jsx`, `dialog.jsx`, `form.jsx`, `toast.jsx`, `toaster.jsx`, `table.jsx`, `tabs.jsx`.
- **Usage observation:** current `App.js` does not import these primitives directly.
- **Evidence/files:** file listing of `/app/frontend/src/components/ui`; `/app/frontend/src/App.js`.
- **Confidence:** High
- **Impact:** Large UI scaffold exists, but current screen implementation uses almost none of it.
- **Recommendation:** Track “available but not currently used” separately from “active runtime dependencies” in future audits.

### Frontend environment and external runtime additions
- `.env`
  - `REACT_APP_BACKEND_URL`
  - `WDS_SOCKET_PORT=443`
  - `ENABLE_HEALTH_CHECK=false`
- `public/index.html`
  - Loads `https://assets.emergent.sh/scripts/emergent-main.js`
  - Initializes PostHog with a hardcoded public key and host
  - Includes Emergent badge markup
- **Evidence/files:** `/app/frontend/.env`, `/app/frontend/public/index.html`.
- **Confidence:** High
- **Impact:** Frontend behavior includes external script and analytics initialization that are not declared in React component code.
- **Recommendation:** Keep these external script dependencies visible in architecture docs and operational risk tracking.

## Backend Inventory

### Backend application files
- `/app/backend/server.py`
  - Contains environment loading, Mongo connection setup, FastAPI app creation, API router, models, route handlers, CORS middleware, shutdown hook.
- `/app/backend/requirements.txt`
  - Declares a much broader dependency set than the currently visible backend implementation uses.
- `/app/backend/.env`
  - `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`.
- **Confidence:** High

### Implemented backend endpoints
- `GET /api/`
  - Returns `{ "message": "Hello World" }`.
- `POST /api/status`
  - Accepts `{ client_name }`, creates a generated `id` and UTC timestamp, stores record in MongoDB.
- `GET /api/status`
  - Returns up to 1000 stored status records, excluding Mongo `_id`.
- **Evidence/files:** `/app/backend/server.py` lines defining routes.
- **Confidence:** High
- **Impact:** Current backend is closer to a starter/demo API than a domain-complete service.
- **Recommendation:** None; reflect actual endpoint scope clearly to stakeholders.

### Backend dependency inventory vs visible usage
- **Fact:** `requirements.txt` includes auth/security/data tooling such as `pyjwt`, `bcrypt`, `passlib`, `python-jose`, `python-multipart`, `boto3`, `pandas`, `numpy`, and `emergentintegrations`.
- **Fact:** the currently visible `server.py` does not import or use most of these packages.
- **Evidence/files:** `/app/backend/requirements.txt`, `/app/backend/server.py`.
- **Confidence:** High
- **Impact:** Installed dependency breadth may reflect template history or planned features rather than implemented behavior.
- **Recommendation:** In future audits, separate “declared dependencies” from “executed code paths.”

## Runtime/Operations Inventory
- **Supervisor services observed running:** `backend`, `frontend`, `mongodb`, `nginx-code-proxy`, `code-server`.
- **Evidence/files:** `sudo supervisorctl status` output.
- **Confidence:** High
- **Impact:** App is currently deployed as a two-service application with local MongoDB and proxying in front.
- **Recommendation:** Keep ingress and supervisor assumptions in operations documentation.

## Not Found in Current Code Snapshot
The following items were specifically looked for and were **not** found in the current repository code snapshot:
- dedicated auth module/files
- socket/websocket module/files
- printing module/files
- order calculation module/files
- domain-specific business modules beyond starter health/status flow
- **Evidence/files:** filename search over `/app`; code review of `/app/frontend/src/App.js` and `/app/backend/server.py`.
- **Confidence:** Medium-High
- **Impact:** Requested focus areas mostly map to “absent/not implemented” rather than “implemented elsewhere,” unless hidden in omitted/generated/untracked locations.
- **Recommendation:** Confirm whether any omitted private packages or runtime-injected code provide these capabilities outside the repository.
