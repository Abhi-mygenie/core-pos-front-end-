# Deployment Handover — MyGenie POS Frontend

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: `23-may`
- Latest HEAD at clone: `dc4f76c Auto-generated changes`
- Cloned directly into `/app` (repo root mapped to `/app`; frontend at `/app/frontend`, backend stub at `/app/backend`).

## Deployment Performed
1. Wiped existing `/app` template contents.
2. Cloned `23-may` branch directly into `/app`.
3. Created `/app/frontend/.env` with the env values provided by the user.
4. Created minimal `/app/backend/.env` (`MONGO_URL`, `DB_NAME`) so the supervisor-managed FastAPI stub does not crash. Task scope is frontend only.
5. Installed deps with **yarn** (`yarn install`) — node v20.20.2, yarn 1.22.22.
6. Restarted `frontend` and `backend` via supervisor.

## Build / Run Verification
- `yarn install` — completed in 82.33s (only standard CRA peer-dep warnings).
- `craco start` — compiled with 1 ESLint warning only (`react-hooks/exhaustive-deps` in `src/components/order-entry/OrderEntry.jsx:1259`). Non-blocking.
- `curl http://localhost:3000` → HTTP 200.
- External preview: `https://react-pos-build-11.preview.emergentagent.com/` → MyGenie POS login page renders successfully.
- Supervisor status: `frontend RUNNING`, `backend RUNNING`, `mongodb RUNNING`.

## Stack
- React 19.0.0, CRACO 7.1.0, Yarn 1.22.22, Node 20.20.2.
- Tailwind + shadcn/ui; Firebase web SDK; Google Maps; CRM proxy.

## Environment Variables (frontend `/app/frontend/.env`)
| Key | Value |
| --- | --- |
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
| REACT_APP_CRM_BASE_URL | https://mygenie-crm-build-3.preview.emergentagent.com/api  (updated per user) |
| REACT_APP_GOOGLE_MAPS_KEY | AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4 |

### Intentionally NOT set
- `REACT_APP_CRM_API_KEYS` — user explicitly asked to ignore.

## Known / Notable Items for Next Agent
- Initial supervisor log shows transient `craco: not found` (race during install) and a stale `node_modules/.cache/default-development/0.pack` ENOENT — both resolved after `yarn install` finished; final compile is clean (1 lint warning only).
- `[VisualEditsPlugin] Failed to read overlay: ENOENT ...visual-edit-overlay.js` — harmless platform plugin notice, not a build error.
- ESLint warning to optionally clean later: `src/components/order-entry/OrderEntry.jsx:1259` (`printOrder` unnecessary dep in `useCallback`).
- `/app/backend` only contains a placeholder `server.py` + `requirements.txt`; no real backend code is part of the `23-may` branch. The configured `REACT_APP_API_BASE_URL` and `REACT_APP_SOCKET_URL` point to external MyGenie pre-prod services.
- The login page footer shows a "Frontend Preview Only. Please wake servers to enable backend functionality." pill — produced by the app itself when external backend services are unreachable.

## Service Layout
Supervisor programs (read-only): `frontend` (`yarn start` in `/app/frontend`), `backend` (`uvicorn server:app` in `/app/backend`), `mongodb`, `code-server`, `nginx-code-proxy`.

## Restart Commands
```
sudo supervisorctl restart frontend
sudo supervisorctl restart backend
sudo supervisorctl status
```

## Verification URL
https://react-pos-build-11.preview.emergentagent.com/  (HTTP 200, MyGenie POS login renders).
