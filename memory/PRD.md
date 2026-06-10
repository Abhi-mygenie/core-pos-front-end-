# MyGenie POS — Deployment Setup

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: `10-june`
- Cloned directly into `/app` (preserved platform `.git` and `.emergent`).

## Architecture
- Frontend: React 19 (CRA + CRACO), Tailwind, Radix UI, Firebase, Socket.IO client.
- Backend: STOPPED (per user instruction — repo backend not in use).
- External services (consumed by frontend):
  - API: https://preprod.mygenie.online/
  - Socket: https://presocket.mygenie.online
  - CRM: https://crm.mygenie.online/api
  - Firebase project: mygenie-restaurant

## Done (2026-01)
- Removed scaffold `/app/frontend` and `/app/backend`; replaced with repo contents.
- Installed frontend dependencies via `yarn install`.
- Configured `/app/frontend/.env` with all required vars (Firebase, API, Socket, CRM, REACT_APP_BACKEND_URL preview URL).
- Stopped `backend` supervisor service; frontend running on port 3000.
- Verified: login page (MyGenie POS) renders correctly on preview URL.

## Next Action Items
- Validate end-to-end login flow against `preprod.mygenie.online` once credentials are shared.
- Confirm Firebase push notifications (VAPID) work from the preview origin (may require domain whitelisting in Firebase Auth).

## Backlog
- P1: Re-enable/repurpose backend if needed.
- P2: Production build pipeline (`yarn build`) and static hosting if desired.
