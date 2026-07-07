# core-pos-front-end — Deployment PRD

## Original Problem Statement
Clone `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `6-july`) into `/app`, install dependencies, and run the React POS frontend in development mode. Frontend-only (no backend spin-up required).

## User Choices (verbatim)
- Repo access: public
- Run mode: dev
- Backend: frontend only
- Existing /app contents & port: skipped → sensible defaults applied

## Architecture / Tasks Done (2026-01-07)
- Cloned `Abhi-mygenie/core-pos-front-end-` branch `6-july` into `/tmp` and merged the `frontend/` subtree into `/app/frontend` (preserved `/app/.git`, `/app/.emergent`, `/app/backend` starter).
- CRA + craco React 19 project (MyGenie POS).
- `yarn install` completed (802 pkgs, react-scripts 5.0.1, craco 7).
- `/app/frontend/.env` configured with required runtime env vars:
  - `REACT_APP_BACKEND_URL` (preserved)
  - `REACT_APP_API_BASE_URL` (mandatory — app throws if unset)
  - `REACT_APP_CRM_BASE_URL`, `REACT_APP_SOCKET_URL`
- Supervisor-managed `frontend` service running on port 3000 (`yarn start` → `craco start`), HTTP 200, login page renders.

## Core Requirements
- React POS frontend must build cleanly and serve on port 3000.
- Preview URL (`REACT_APP_BACKEND_URL`) must return the MyGenie POS login page.

## What's Implemented
- [2026-01-07] Repo cloned, deps installed, dev server up, UI verified via screenshot (login page loads).

## Backlog / Next Actions
- P1: Wire up backend API — the frontend expects a live REST + Socket.io backend at `REACT_APP_API_BASE_URL`. Login/POS flows will 4xx/5xx until a backend is provided.
- P2: Firebase env vars are optional (push/analytics). Add real values only if push notifications are required.
- P2: Address react-hooks/exhaustive-deps warnings (non-blocking).
- P3: Production build pipeline (`yarn build` + static serve).
