# PRD — MyGenie Core POS Frontend

## Original Problem Statement (2026-06-11)
Deploy repo https://github.com/Abhi-mygenie/core-pos-front-end-.git (branch `11-june`) directly into /app (wipe local), configure env variables, then summarize the latest insight report audit document. No code edits.

## Architecture
- React frontend (CRACO) at /app/frontend, supervisor-managed on port 3000
- FastAPI backend at /app/backend (port 8001), MongoDB local
- External APIs: preprod.mygenie.online (REACT_APP_API_BASE_URL), presocket.mygenie.online (socket), crm.mygenie.online (CRM), Firebase (mygenie-restaurant project)

## What's been implemented (2026-06-11)
- Wiped /app (preserved .git/.emergent), pulled branch `11-june` via fetch + checkout
- Created /app/frontend/.env with all user-provided variables (REACT_APP_BACKEND_URL kept as existing preview URL per user choice)
- Recreated /app/backend/.env (MONGO_URL, DB_NAME — gitignored in repo)
- yarn install + pip install, services restarted, login page verified via screenshot
- Summarized /app/INSIGHTS_REPORTS_AUDIT.md (dated 2026-06-10) for the user

## Notes
- /app/audit_data/ referenced in the audit doc is NOT present in this branch
- No code edits made (per user instruction)

## Backlog / Next
- P0: Apply quick-win fixes from audit (A3 cancellation string match, A8 round_off→round_up, A7 duplicate fetch, A6 dead TAB tile) — pending user approval
- P1: TAB revenue policy alignment, shared tax helper, canonical cancellation formula
- P2: Punch-vs-collection attribution toggle on all screens
