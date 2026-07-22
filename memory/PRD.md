# PRD — MyGenie POS Frontend Deployment

## Original Problem Statement
Deploy the existing React frontend repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `main`) directly into `/app` and run it as-is, with no code edits. Env variables to be supplied later by user. Run dev version.

## What Was Done (2026-06)
- Backed up platform files (.emergent, frontend/.env, backend/.env, memory/test_credentials.md)
- Cleared /app and moved repo contents + .git directly into /app (repo already follows the frontend/ + backend/ layout)
- Restored platform files (.env placeholders, .emergent)
- Installed frontend deps with `yarn install --ignore-engines` (repo has no lockfile; @testing-library/jest-dom@6.10.0 requires Node >=22, env has 20.20.2 — engines check bypassed at install time only, no code changes)
- Frontend runs via supervisor (`yarn start` → craco/CRA dev server, 0.0.0.0:3000), backend also running
- Added root-level `.oxlintrc.json` (mirror of repo's frontend/.oxlintrc.json) so platform lint ignores the minified vendor file `public/training/training-sdk.js`
- Verified: webpack compiled (lint warnings only), HTTP 200 on port 3000, app renders title "MyGenie POS"

## Known/Expected Issue
- Runtime error on load: `[Config] REACT_APP_API_BASE_URL is not set` from src/api/axios.js — EXPECTED per user; API env values pending from user. Add to `/app/frontend/.env` and restart frontend.

## Next Tasks
- User to provide env values (REACT_APP_API_BASE_URL, etc.) → add to /app/frontend/.env → `sudo supervisorctl restart frontend`
- Verify app flows once API config is in place
