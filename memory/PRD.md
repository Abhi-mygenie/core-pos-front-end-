# MyGenie POS — Deployment Notes

## Original Problem
Deploy existing React frontend repo directly into `/app` and run as-is, no code edits.
- Source: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 15-july
- Frontend-only.

## What was done (2026-02-15)
- Backed up platform files: `/app/.emergent`, `/app/frontend/.env`, `/app/backend/.env`
- Cleared `/app`
- Cloned `15-july` directly into `/app` (repo already ships with `frontend/` + `backend/` layout)
- Restored platform files
- Installed frontend deps with `yarn install` (no lockfile, `packageManager` field says yarn)
- Created two symlinks inside `/app/frontend/node_modules` to expose react-scripts's nested deps at the top level:
  - `@pmmmwh` → `react-scripts/node_modules/@pmmmwh`
  - `html-webpack-plugin` → `react-scripts/node_modules/html-webpack-plugin`
  (Fix for react-scripts 5 + webpack 5 hoisting mismatch; no source code edits.)
- Started via existing supervisor `frontend` program (`yarn start` → `craco start`, host `0.0.0.0`, port `3000`)

## Verified
- Local `http://localhost:3000` → 200
- Public preview URL → 200
- Page title: "MyGenie POS"
- Hot reload active (webpack-dev-server)

## Notes / Next Action Items
- Body renders blank until you supply real env values (Firebase, API endpoints, etc.) in `/app/frontend/.env`. This is expected per the deployment brief.
- Backend supervisor still running the platform's placeholder FastAPI; not touched (frontend-only deploy).
