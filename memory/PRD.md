# mygenie Core POS — PRD (updated 2026-10-07)

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 5oct-1
- Deployed: 2026-10-06

## Architecture
- Frontend-only React app (CRA + CRACO)
- Connects to `https://preprod.mygenie.online/`
- Supervisor runs `yarn start` from `/app/frontend` on port 3000

## What Has Been Implemented (with dates)

### 2026-10-09 — Re-deployment (Deploy 6)
- Branch 5oct-1 re-cloned and deployed into /app/frontend
- Memory dir fully synced from remote branch (rsync --delete)
- All env vars written (Firebase, API base, socket, CRM, Google Maps, platform URL)
- yarn install --ignore-engines; webpack compiled with 1 warning (no errors)
- App running on port 3000; login page confirmed HTTP 200

### 2026-10-06 — Initial deployment
- Cloned branch 5oct-1 into /app/frontend, set all env vars, yarn install, supervisor start

### 2026-10-07 — Check-in + Login phase fixes (Gate 5A)

**BUG-500:** CheckInPage effectiveBalanceDue (no-GST backend formula) + GST strip recalculates live on discount
**BUG-496:** maxPct formula revised — `floor((bc−adv)/bc×100)` = 88% for ₹9k/₹1k; CheckInPage uses correct booking advance from LR
**BUG-497:** Collect Now/Advance Payment max cap + resets when discount changes (both CheckInForm + CheckInPage)
**BUG-501:** Login page copyright year dynamic `{new Date().getFullYear()}` — shows 2026

## Credentials (test)
- owner@thegoankitchen.com / Qplazm@10 (RID 69 The Goan Kitchen)
- boi@bang.com / Qplazm@10 (staff)

## Environment Variables
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- All Firebase, CRM, Maps keys set in /app/frontend/.env
- NOTE: REACT_APP_CRM_API_KEYS was truncated — supply full value for CRM features

## Prioritized Backlog (P0 → P2)

### Currently GATE_5A_IMPLEMENTED (needs QA Gate 5b):
- BUG-496, BUG-497, BUG-500, BUG-501

### Checkout phase (PARKED — next batch):
- BUG-498 (GATE_5A) — checkout discount wrong base
- BUG-499 (GATE_5A) — Both discount split

### Deferred / FU-385-C:
- BUG-431, 432, 443, 444, 446, 449 — legacy page issues

### QA pending (check-in phase):
- QA handover: memory/handover/QA_HANDOVER_BUG496_497_500_501_2026_10_07.md
