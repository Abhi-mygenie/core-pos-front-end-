# MyGenie Core POS - Frontend Deployment

## Original Problem Statement
Deploy frontend project from `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch: `23-may`) into the Emergent environment. Make it run successfully and prepare handover documentation.

Scope is STRICTLY limited to deployment / build / run verification. No code analysis, refactoring, bug fixing, or test execution was performed.

## Tech Stack (as required)
- React 19.0.0
- CRACO v7.1.0
- Yarn 1.22.22
- Node.js v20.20.2
- Package manager: **YARN ONLY** (npm forbidden)

## Deployment Actions Performed
1. Stopped supervisor `frontend` + `backend` services.
2. Backed up platform-required `/app/.git` and `/app/.emergent` to `/tmp/_preserve`.
3. Wiped `/app` clean (including all default Emergent scaffold).
4. Cloned `https://github.com/Abhi-mygenie/core-pos-front-end-.git` branch `23-may` directly into `/app`.
5. Restored the platform's `.git` and `.emergent` folders into `/app` (replacing the repo's own `.git` / `.emergent` to preserve platform functionality such as rollback/checkpoints).
6. Created `/app/frontend/.env` with all 16 required environment variables (see list below).
7. Ran `yarn install` in `/app/frontend` — completed in ~72s, lockfile saved.
8. Created minimal `/app/backend/.env` (`MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`) so the scaffold backend (unused by this frontend, which talks directly to `https://preprod.mygenie.online/`) doesn't crash supervisor.
9. Installed backend Python deps from `/app/backend/requirements.txt`.
10. Started supervisor `frontend` + `backend`.

## Current Status
- **Frontend**: RUNNING (supervisor) — `yarn start` via CRACO on port 3000.
  - HTTP 200 on `http://localhost:3000/`.
  - Compiled successfully (CRACO/webpack — only standard webpack-dev-server deprecation warnings, no errors).
  - Screenshot verified: MyGenie login page renders correctly.
- **Backend**: RUNNING (scaffold FastAPI — NOT used by this frontend; live API is `https://preprod.mygenie.online/`).
- **MongoDB**: RUNNING (scaffold; unused by this frontend).
- **Preview URL configured (REACT_APP_BACKEND_URL)**: `https://react-pos-build-11.preview.emergentagent.com/` (will become the public preview URL on deploy).

## Frontend Environment Variables (set in `/app/frontend/.env`)
| Variable | Value (summary) |
|---|---|
| REACT_APP_BACKEND_URL | https://react-pos-build-11.preview.emergentagent.com/ |
| WDS_SOCKET_PORT | 443 |
| ENABLE_HEALTH_CHECK | false |
| REACT_APP_API_BASE_URL | https://preprod.mygenie.online/ |
| REACT_APP_SOCKET_URL | https://presocket.mygenie.online |
| REACT_APP_FIREBASE_API_KEY | AIzaSyCvn7MctrSgULjgiHqQSl4QfeP3dWxITwY |
| REACT_APP_FIREBASE_AUTH_DOMAIN | mygenie-restaurant.firebaseapp.com |
| REACT_APP_FIREBASE_PROJECT_ID | mygenie-restaurant |
| REACT_APP_FIREBASE_STORAGE_BUCKET | mygenie-restaurant.firebasestorage.app |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | 969625631640 |
| REACT_APP_FIREBASE_APP_ID | 1:969625631640:web:2f2a2987f740b6fc8e09ed |
| REACT_APP_FIREBASE_MEASUREMENT_ID | G-WFK75QN54E |
| REACT_APP_FIREBASE_VAPID_KEY | BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI |
| REACT_APP_CRM_BASE_URL | https://crm.mygenie.online/api |
| REACT_APP_CRM_API_KEYS | JSON object — 27 store IDs → CRM live API keys (full value preserved in `/app/frontend/.env`) |
| REACT_APP_GOOGLE_MAPS_KEY | AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4 |

## Notes for Next Deployment Agent
- Yarn 1.22.22 is at `/usr/bin/yarn`. **Do not use npm** — react-scripts/CRACO peer-deps will break.
- Supervisor config is READONLY; frontend dir is fixed at `/app/frontend`. The cloned repo's structure matches this exactly (`/app/frontend/package.json` etc.), so no path changes were needed.
- `ENABLE_HEALTH_CHECK=false`, so the `/app/frontend/plugins/health-check/` webpack plugin is not loaded (verified in `craco.config.js`).
- The scaffold `backend/` in `/app` is from the cloned repo but is unrelated to the live MyGenie API. It's running purely so supervisor stays green — the frontend talks to `https://preprod.mygenie.online/` directly.
- Hot reload is active (webpack-dev-server). Any change in `/app/frontend/src/**` is picked up automatically.
- To rebuild: `cd /app/frontend && yarn install && sudo supervisorctl restart frontend`.
- For a production build (if/when needed): `cd /app/frontend && yarn build` (outputs to `/app/frontend/build`).

## Missing / Truncated Values
- `REACT_APP_CRM_API_KEYS` JSON in the problem statement was missing its closing `}`. The user instructed to **ignore**, so the value was committed to `.env` exactly as provided in the prompt (with the closing `}` appended so it parses as valid JSON at runtime). All 27 store-id keys are present.
- No other values were truncated or missing.

## Verification Evidence
- `curl http://localhost:3000/` → HTTP 200, 1185-byte index.html with proper MyGenie meta tags.
- Webpack compile log: `Compiled successfully!` / `webpack compiled successfully`.
- Playwright screenshot: MyGenie login UI (logo, "Streamlined Hospitality. Exceptional Experience.", Email/Password fields, LOG IN button) renders cleanly.

## Next Action Items
- Functional QA / login flow validation (out of scope here).
- Production build & ingress wiring under `react-pos-build-11.preview.emergentagent.com` if not already routed.
