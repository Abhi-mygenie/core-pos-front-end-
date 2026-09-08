# MyGenie POS + PMS — Product Requirements Document

## Original Problem Statement
Deploy existing React frontend (`PMS1` branch), investigate proposed PMS enhancements (feasibility and API presence), create an investigation report, and then register formal Change Requests (CRs) for the missing features in the intake registry. PRODUCT REQUIREMENTS: MyGenie POS + PMS System (Frontend only).

## Architecture
- **Frontend:** React + TailwindCSS + Craco (no backend in this repo)
- **API Target:** External preprod server (`https://preprod.mygenie.online`)
- **Project Management:** Local markdown/JSON control layer in `/app/memory/`

## What's Been Implemented

### Session 2026-09-04 (Investigation & Intake)
- API Feasibility Probing for 7 proposed PMS enhancements
- Generated Feasibility Investigation Report (`PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md`)
- Registered CR-361 through CR-367 and CR-358-P5 in the control layer
- Updated `registry.json`, `CR_REGISTRY.md`, `CONTROL_DASHBOARD.md`, `OPEN_GAPS_REGISTER.md`

### Session 2026-09-05 (PDF Generation v2)
- Generated **MyGenie PMS Screen Reference Guide** PDF — 14 pages, landscape, 661 KB
- Captured all 13 PMS screens with rich dummy data injected via DOM manipulation
- All AIOSELL and sandbox-pms references scrubbed
- Screens include: Front Desk, New Booking, Arrivals, Check-In, In-House Guests, Departures, Tape Chart, Room Status Board, Channel Manager (4 tabs: OTA/Sync, Setup, Room Mapping, Rates & Restrictions), Daily Room Report
- PDF at `/frontend/public/MyGenie_PMS_Screen_Reference.pdf`

### Session 2026-09-06 (Investigation — CR-363/364/366 API Impact)
- Live `v2` probes on preprod for Night Audit, Guest Folio, Revenue Dashboard
- Report: `INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md`; evidence in `evidence/INV-PMS-CRs-363-364-366/`
- Findings: all `/api/v1/` order endpoints now 404 (v2 live, FE unaffected); `pos/room-payment` → 403; no no-show field
- Status revisions: CR-363 🟡 partial, CR-364 🟡 partial, CR-366 🟢 mostly unblocked
- Control layer updated: CR_REGISTRY, CONTROL_DASHBOARD, OPEN_GAPS (OG-PMS-014/015/016), registry.json
- Session closed by user

### Session 2026-09-06 (AUDIT track opened — Baseline + Prompt v0.8 gap analysis)
- `control/PROJECT_BASELINE_2026_09.md` — 35 findings (security S1: `public/__dev` + 71 HTML briefs shipped; quality S1: 3 fake node-script tests hang Jest, 56 failing tests; drift: 89 closed items without code markers)
- `control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md` — 10 gaps (mode state machine, missing-input protocol, Gate 5c regression, …); **v0.8 file NOT written — awaiting owner approval of 5 decisions**
- Evidence: `evidence/BASELINE-2026-09/`
- Two handovers: `handover/SESSION_HANDOVER_2026_09_06_AUDIT_BASELINE_PROMPT_V08.md` (next session starts here) and `handover/SESSION_HANDOVER_2026_09_06_PMS_TRACK.md`
- No application code changed

## Live PMS Screens (9 routes, 13 views)
1. Front Desk (`/pms/front-desk`)
2. New Booking (`/pms/new-booking`)
3. Arrivals (`/pms/arrivals`)
4. Check-In (`/pms/check-in`)
5. In-House Guests (`/pms/in-house`)
6. Departures (`/pms/departures`)
7. Reservations / Tape Chart (`/pms/reservations`)
8. Room Status Board (`/pms/room-status`)
9. Channel Manager (`/pms/channel-manager`) — 4 tabs: OTA/Sync, Setup, Room Mapping, Rates & Restrictions
10. Daily Room Report (`/reports/rooms`)

## Registered CRs (Pending Implementation)

### Unblocked (can start now)
| CR | Feature | Priority |
|----|---------|----------|
| CR-358-P5 | Rates & Restrictions tab + Mark No-Show | P1 |
| CR-363 | Night Audit Report (🟡 partial — no no-show field, OG-PMS-015) | P1 |
| CR-364 | Guest Folio Detail Page (🟡 partial — Record Payment 403, OG-PMS-014) | P1 |
| CR-366 | Revenue Dashboard Analytics (🟢 mostly unblocked) | P2 |

### Backend-Blocked
| CR | Feature | Priority | Blocking |
|----|---------|----------|----------|
| CR-361 | Room Assignment & Tape Chart | P1 | No assign endpoint |
| CR-362 | Booking Modification & Cancellation | P1 | No cancel/modify/extend endpoints |
| CR-365 | Housekeeping Workflow | P2 | No task/checklist model |
| CR-367 | WhatsApp/SMS Guest Notifications | P2 | No messaging endpoint |

## Open Issues
| Issue | Priority | Status |
|-------|----------|--------|
| ~~CRM API Keys truncated~~ — OBSOLETE (var valid JSON and unused in code; remove from .env, F-SEC-07) | — | CLOSE |
| Internal `public/__dev` dashboard + 71 HTML briefs served in prod (F-SEC-01/02) | P1 | NOT STARTED |
| Test suite untrustworthy: 3 node-script tests hang Jest, 56 failures (F-QA-01/02) | P1 | NOT STARTED |
| `pos/room-payment` v2 returns 403 (OG-PMS-014) | P1 | BLOCKED (backend ruling) |
| Forbidden color #3B82F6 in Sidebar | P2 | NOT STARTED |
| BUG-381 walk-in live test on preprod | P2 | BLOCKED (awaiting user) |

## Upcoming Tasks
0. **AUDIT track (next session):** get owner approval on gap analysis D1–D4 → write `AGENT_PROMPT_ALPHA_v0.8.md` → apply record corrections → remediation order in baseline §9
1. Owner picks Gate 2 order (CR-366 → CR-363 → CR-364 recommended by INV)
2. Backend ruling on OG-PMS-014 (`pos/room-payment` 403)
3. Write Backend Briefs for blocked CRs (CR-361, CR-362, CR-365, CR-367)
4. Implement CR-358-P5 (Rates & Restrictions + Mark No-Show)
5. Implement CR-363 (Night Audit Report)
6. Implement CR-364 (Guest Folio Detail Page)
7. Gate 6 Owner Smoke Test for Phase 3 & Phase 4
