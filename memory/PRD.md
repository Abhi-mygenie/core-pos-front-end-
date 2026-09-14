# MyGenie Core POS Frontend — Deployment PRD

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: PMS13
- Deployed: 2026-09-14

## Architecture
- React (CRA + craco) frontend only — no local backend or database
- All API calls go to external API: https://preprod.mygenie.online/
- Socket: https://presocket.mygenie.online
- Firebase for auth/messaging
- Hosted at: https://494d04b0-021e-423f-9a56-2f723085dc1f.preview.emergentagent.com

## What Was Done
- Cloned branch `PMS13` from repo into `/tmp/pos-repo`
- Synced `/tmp/pos-repo/memory/` → `/app/memory/` (full remote memory dir pulled)
- Replaced `/app/frontend/` contents with repo's `frontend/` directory
- Wrote `/app/frontend/.env` with all provided env variables
- Installed deps with `yarn install --ignore-engines` (Node 20 vs engine req >=22)
- Restarted supervisor frontend → compiles with 0 errors, 1 ESLint warning
- App confirmed live at port 3000, HTTP 200

## Env Variables (frontend/.env)
- REACT_APP_BACKEND_URL (platform proxy)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (full Firebase config)
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- REACT_APP_SHOW_AUDIT_TAB=true

## Preserved Platform Files
- /app/.emergent/
- /app/memory/
- /app/backend/
- /etc/supervisor/conf.d/ (unchanged, READONLY)

## Supervisor
- Program: `frontend` → `yarn start` → `craco start` from `/app/frontend`
- Port: 3000 (HOST=0.0.0.0 set by supervisor env)
- Status: RUNNING, compiled successfully

## Previous Branches Deployed
- audit8 (2025-09-08)
- PMS13 (2026-09-14) ← current

## 2026-09-15 — CR-366 Planning (backend brief stage)
- Owner froze OD-366-01 (booked + collected revenue, booked primary), OD-366-02 (F&B separate, RevPAR rooms-only, TRevPAR extra), OD-366-03 (no range ceiling → server aggregation; Today/7D/30D pills + From/To).
- Filed `backend_briefs/BACKEND_BRIEF_CR366_REVENUE_AGGREGATION_2026_09_15.md` (GET aiosell/revenue-summary, payment_mode + booking_status enums, definitions §4, Q-366-01..10).
- Card added to `frontend/public/backend-briefs.html` (mirrored to `memory/backend_briefs/index.html`). registry.json / CR_REGISTRY.md / intake doc synced → CR-366 BACKEND-BLOCKED. OD-366-04 (placement) still open.


## 2026-09-16 — CR-363 Planning (conflict pre-check vs CR-366 + backend brief)
- Finding: Day Closure (`get-settlement-report`) DOES include room checkout cash (PmsCheckoutDrawer → `order-bill-payment` with cashier waiter_id), blended with F&B, no split. Night Audit must reconcile to it → backend split required.
- Owner froze OD-363-01..06: business-day per backend Q-366-08; **Both** Sales(booked)+Revenue(collected); F&B separate; read-only v1 (no lock); sidebar under Rooms & Reservations (= OD-366-04); replay unlimited.
- Filed `backend_briefs/BACKEND_BRIEF_CR363_NIGHT_AUDIT_2026_09_16.md` (GET aiosell/night-audit?date=, sections A–I incl. reconciliation, Q-363-01..08). CR-366 brief extended with Q-366-11..13 (tender split, settlement_room_share, same code path) + Sales/Revenue wording.
- Cards on `backend-briefs.html` (mirrored). registry.json / CR_REGISTRY.md / intake synced → CR-363 BACKEND-BLOCKED. Next: joint CR-363/366 Gate 2 after endpoints probe-able (R11).
- Pending: CR-362/BUG-397 Gate 6 owner smoke; CR-364 ODs; CR-357 OD-7.

## 2026-09-16 — Registry drift fix CR-365
- registry.json `backend_blocked` true→false, status_history entry added; CR_REGISTRY.md row rewritten to UNBLOCKED 2026-09-13; intake footer updated. Source of truth: intake L135 + SESSION_HANDOVER_2026_09_13.
