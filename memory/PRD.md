# Core POS Frontend — Deployment Record

## Original Problem Statement
Deploy the existing React frontend repo (https://github.com/Abhi-mygenie/core-pos-front-end-.git, branch: main) directly into /app and run as-is with no code edits.

## Architecture
- **Frontend**: React (CRA + Craco) on port 3000
- **Backend**: FastAPI stub on port 8001 (platform default)
- **Database**: MongoDB (platform default, not used by frontend)
- **Process Manager**: Supervisor

## What's Been Implemented (Nov 5, 2026)
- Cloned repo contents into /app (preserving platform .emergent and .git)
- Frontend: 915 npm packages installed via yarn
- .env configured with user-provided values (API URLs, socket URL, CRM URL, placeholders for API keys)
- Backend .env preserved with platform defaults
- Memory dir: 2,584 files fully synced with remote branch
- Frontend compiles and serves successfully (MyGenie POS login page)
- All repo folders verified: src/, public/, package.json, components, pages, api, etc.

## Environment Variables
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- REACT_APP_CRM_API_KEYS=PLACEHOLDER (needs real value)
- REACT_APP_GOOGLE_MAPS_KEY=PLACEHOLDER (needs real value)
- REACT_APP_SHOW_AUDIT_TAB=true
- WDS_SOCKET_PORT=443

## Backlog
- P0: Supply real REACT_APP_CRM_API_KEYS and REACT_APP_GOOGLE_MAPS_KEY
- P1: Verify login flow works with preprod backend
- P2: Production build and deployment

## CR-482 Keyboard Shortcuts (in progress, phase-by-phase)
- Toggle: Status Configuration → UI Elements → Keyboard Shortcuts (localStorage `mygenie_keyboard_shortcuts_enabled`, default OFF); backend `keyboard_shortcuts` setting pending (brief filed)
- Done (agent-tested, not user-confirmed): P0 foundation, P1 search auto-focus + focus trap, P2 item highlight, P3 arrow nav, P4 Enter adds item
- P5 (Jun 2026): Item Customization popup — Esc closes, Ctrl+Enter = Add to Order (same button/guards), focus moves into popup, Tab/Space/Enter native, search refocused on close; Tab/Shift+Tab loop inside popup (gap fix after user report); "(Ctrl+Enter)" hint on button only when ON. Flag OFF = unchanged
- Next: P11 F2 search … P26 cheat-sheet (see memory/plans/CR-482_IMPLEMENTATION_PLAN.md)
- P6 (Jun 2026): Weight popup — Enter in weight box = same validation + Add; Esc closes; search refocused; last-added ref set. Compiled + screen renders; NOT live-tested (no weight items in cafe103 test outlet) — awaiting user test
- P7 (Jun 2026): Dynamic price popup — Esc closes (ON only), data-kbd-modal, search refocus, last-added ref on all 3 add paths. Compiled; NOT live-tested (preprod login API timing out at test time)
- P8 (Jun 2026): +/- (and numpad) on last-added unplaced non-weight line, only from empty search/body/grid; − never below 1; last-added ref also set on customized adds. Compiled; NOT live-tested (preprod down)
- P9 (Jun 2026): CategoryPanel roving focus (active cat tabbable), ↑/↓ move, Enter/Space pick + refocus search; orange focus ring. Compiled; NOT live-tested (preprod down)
- P10 (Nov 2026): Ctrl+↓ from search → first unsent cart row (else first row); rows ↑/↓, +/− (same rules as buttons; sent items can't go below sent qty), Delete removes unsent only (cursor moves to next row / search), Esc → search. Agent-tested on new rows incl. delete focus fix; sent (placed) rows NOT tested (would need a real placed order)

