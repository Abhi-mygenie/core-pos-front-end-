# MyGenie POS Frontend — Deployment Record

## Original Problem Statement
Deploy the existing React frontend repo (https://github.com/Abhi-mygenie/core-pos-front-end-.git, branch: main) directly into /app and run as-is with no code edits. Preserve platform files, set env variables, and keep memory dir in sync with remote.

## Architecture
- **Stack**: React 19 + CRACO + Tailwind CSS + Radix UI + Firebase
- **Process Manager**: Supervisor (`yarn start` → `craco start` on port 3000)
- **Backend API**: External (https://preprod.mygenie.online/)
- **Socket**: External (https://presocket.mygenie.online)
- **Auth**: Firebase

## What's Been Implemented
- **2026-10-22 (Emergent Re-deploy)**: Fresh clone from `main` branch into /app
  - Platform files preserved (.emergent/, .git/, .env, backend/)
  - All env variables configured (Firebase, API, Socket, CRM, Google Maps, VAPID key)
  - Memory dir fully synced (2,438 files — verified identical with repo)
  - yarn install completed, craco start compiles with 0 errors (1 lint warning)
  - App responds on port 3000 with MyGenie login page (HTTP 200)
  - Backend supervisor process disabled (frontend-only deployment)
  - Zero code edits — deployed as-is from repo
- **2026-10-21**: Fresh clone from `main` branch (commit `8d26b678`) into /app
  - Platform files preserved (.emergent/, .git/, .env files)
  - All env variables configured (Firebase, API, Socket, CRM, Google Maps)
  - Memory dir fully synced (2408 files, 14 subdirs)
  - yarn install completed, webpack compiles with only lint warnings
  - App responds on port 3000 with MyGenie login page
- **2026-10-22**: CTO Google Sheet + registry cleanup (`pos-fixes-2026-10-22.csv`, 9 points)
  - Registry (`/app/memory/control/registry.json`, 937 items) + CTO sheet reconciled; push shows **0 drift**.
  - P1 — TT provenance: appended `from TT-NNN` to Notes for CR-443→449, BUG-605→608.
  - P5 — applied owner's **sheet priorities as law** (9 items → P0) + 10 owner `Blocked on = BACKEND` edits.
  - P2 — Tech Tasks write-back: TT-006/TT-030 reverted Done→In Progress (BUG-597 is IMPLEMENTED, not CLOSED).
  - P3 — BUG-600/BUG-579 `GATE_2_CLOSED`→`GATE_2_COMPLETE`, BUG-598-B `INVESTIGATION_COMPLETE`→`GATE_2_PLANNING`; all now show PLANNING (were mis-shown as CLOSED).
  - P4/P8 — set modules on 13 blank + 53 `Other` items; 9 kept as Other (sidebar/nav/training).
  - P6 — `sheets_sync.build_summary_rows()` now counts from the **All Items** tab (Summary INTAKE 92 == All Items 92).
  - P7 — "Neo " tab kept (owner created it). P9 — money_path left as-is per owner.
  - `sheets_sync.py` hardened: exact `GATE_N_CLOSED` mapper guard, Summary-from-sheet, permanent `--tech-writeback <file.json>` CLI (CR-442 Part C).
  - AGENT_PROMPT_ALPHA.md v0.9: added **REGISTRAR EXIT CHECKLIST** (7 items) so these gaps are not missed again.

## sheets_sync.py CLI reference
- `--push` — registry.json → all 10 tabs + post-push drift to Change Log (SHEET PUSH role)
- `--pull --dry-run` — read-only drift incl. Tech Tasks POS inbox (SHEET DRIFT role)
- `--tech-writeback <file.json>` — write `[{id,status,note,registry_id?}]` back to Tech Tasks `Tasks` tab (K/L/M/O by TT ID)
- `--dry-run` alone — validate credentials + sheet access

## Preserved Platform Files
- `/app/.emergent/` — platform config
- `/app/.git/` — platform git
- `/app/frontend/.env` — all env variables
- `/app/backend/.env` — MongoDB, CORS config

## Re-pull Procedure
1. Backup: `.emergent/`, `.git/`, `frontend/.env`, `backend/.env`
2. Wipe /app (keep .emergent, .git)
3. Clone from `main` branch to staging dir
4. Copy contents (excl .git, .emergent) to /app
5. Restore .env files
6. `yarn install` in /app/frontend
7. `supervisorctl restart frontend`
8. Verify: compilation + HTTP 200 + memory sync

## Backlog
- P0: None
- P1: BUG-601 aggregator menu variations dropped (awaiting backend confirm OD-601-02); BUG-600 → Gate 3 (Implementation Plan)
- P1: New intakes CR-443→449, BUG-605→608 (all BACKEND-blocked) → Gate 2 planning when unblocked
- P2: Production build optimization; BUG-400/BUG-401 carry prose "closed" in status text (mapper leaves them CLOSED — rename to leading `GATE_N_COMPLETE` if they should reopen)
- Process: do NOT commit `.emergent/emergent.yml` to remote (pod-specific job_id breaks re-pulls)
