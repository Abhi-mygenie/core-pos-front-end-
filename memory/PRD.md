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
- CR-381 `backend_blocked` string→false (text moved to note); full scan: 0 non-boolean flags remain.

## 2026-09-16 — CR-364 Intake continuation (INVESTIGATION + INTAKE)
- **CIB vs CR-364 comparison** (`memory/CR-364_INVESTIGATION_CIB_COMPARISON.md`): CR-131 Customer Intelligence (Beta) is CRM-fed restaurant-wide aggregate; CR-364 is per-stay operational folio (Check Out / Record Payment / Print Folio). DISTINCT — not duplicates.
- **CR-363/366 vs CR-364 gap analysis**: Night Audit and Revenue Dashboard are aggregate reports; cannot substitute per-guest operational surface (real-time balance, walk-ins without CRM profile, action layer, folio print, placeholder-link fix).
- **Print field spec**: swept `buildBillPrintPayload` (`orderTransform.js` L1797–L2268). Today emits `roomAdvancePay/roomRemainingPay/associated_orders[]/rtype='RM'`; missing room#, dates, meal plan, channel, booking id, per-night lines, dated ledger, special requests, pax, ID proof. ~60% of missing fields already in FE transform → wire into payload; ~30% BE-side on `room_info`/`reservation_ops`; ~10% new (per-night expansion, reprint counter, UPI QR, actual timestamps).
- **Backend brief filed**: `memory/backend_briefs/BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md` — 9 blocks / ~60 keys / 15 questions (Q-364P-01..15). Mirrored on `frontend/public/backend-briefs.html` + `memory/backend_briefs/index.html`. Smoke-tested (card expands, layout intact).
- **Owner decisions frozen**: **OD-364-01 = v1 totals only** (dated ledger endpoint B-364-01 optional post-v1); **OD-364-02 = PMS-specific folio via `rtype='RM'` template branch, FE passes every field BE accepts, R6 owner sign-off required before template goes live**.
- registry.json / CR_REGISTRY.md / intake doc synced. CR-364 UNBLOCKED, intake OPEN — Gate 2 gated on OD-03/04/05 answered next session.
- Pending: CR-364 OD-03 (re-point vs add links), OD-04 (F&B inline vs drill), OD-05 (departed access window); CR-362/BUG-397 Gate 6 owner smoke; CR-357 OD-7; walkthrough of remaining unblocked CR/BUG items.


## 2026-09-14 — CR-363 + CR-366 Gate 2 Impact Analysis (PLANNING role)
- R11 curl-probe on preprod PASS: `aiosell/night-audit` 200, `aiosell/revenue-summary` (day/week) 200; 422 on missing params. Evidence `evidence/CR-363/`, `evidence/CR-366/`.
- Joint IA written: `impact/CR-363_CR-366_JOINT_IMPACT_ANALYSIS.md`. OD-366-04 resolved (sidebar under Rooms & Reservations). `aiosellTransform.js` dropped from CR-366 scope; 2nd revenue-summary call dropped from CR-363.
- New owner decisions before Gate 3: OD-363-07/08, OD-366-05..08 + combined Sidebar SC ack. BE notes BN-1..6 (null fields, occupancy >100 %, audit_trail detail null ↔ BUG-193).
- Next: PLANNING Gate 3 (Implementation Plan) for CR-363/366; Gate 2 IA for CR-364 (data path) and CR-357.
