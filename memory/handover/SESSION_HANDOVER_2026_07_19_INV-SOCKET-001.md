# SESSION HANDOVER — 2026-07-19 (INV-SOCKET-001)

**Role this session:** INVESTIGATION (+ initial DEPLOYMENT of the repo)
**Item:** INV-SOCKET-001 — Peak-traffic outage / socket broadcast architecture (P0 / CRITICAL)
**Status:** INVESTIGATED — root cause PROVEN. No code changed (investigation-only mandate honored).

## One-line summary
Socket server broadcasts every restaurant's events to ALL connected clients on the default namespace (no rooms) — PROVEN live; the Laravel origin also flaps down (Cloudflare 521). Together they cause the 1–4 min peak hangs. Backend files now requested to pinpoint the first-resource-to-die.

## What happened this session
1. **Deployed the repo as-is** into `/app` (frontend CRA+craco, external Laravel API + Socket.IO). Env was empty → user supplied `.env`, app now boots to MyGenie login. Frontend runs via supervisor `yarn start` on :3000.
2. **Investigated socket architecture** (code trace + live probes).
3. **Proved global broadcast LIVE** via testing_agent (`/app/test_reports/iteration_4.json`): logged in as restaurant 644, ran `onAny` 4 min → `own=0, foreign=6`. Foreign events on `login_disabled_689` / `login_disabled_523`.
4. **Key nuance (user-raised):** those foreign events were NOT orders — they were `login_disabled_<rid>` system/admin events. Frontend has ZERO references to that channel yet still received it → cleanest proof of raw `io.emit()` fan-out. `own=0` on order channels only meant restaurant 644 was quiet.
5. **Corrected outage artifacts:** earlier "443 refused / Apache on socket host" was because backend was DOWN (521 at 03:19 & 04:12 UTC). When UP: socket host = **nginx 1.18.0 + Socket.IO v4**, websocket upgrade OK, EIO4. User confirmed stack is nginx (not Apache).

## Proven findings (code + live evidence)
- **F1 GLOBAL BROADCAST — PROVEN.** No rooms/join; server emits on default namespace to all ~1,000 fleet sockets. O(N²) fan-out.
- **F2** 3 socket handlers call the order API from inside the handler (GET-back herd, fixed 1s retry no jitter) — `socketHandlers.js:94-112,380-434,459+`.
- **F3** 60s poll per client + rehydration on every reconnect >1.5s = synchronized fleet storms.
- **F4** `connect()` duplicate-socket race — `socketService.js:45` guard only checks `.connected`.
- **F5** Origin flaps to HTTP 521 (Cloudflare origin-down) — observed twice.
- **F6** Single A record (52.66.232.149), no LB, SPOF; handshake accepts unauthenticated sockets (privacy gap).

## Open / NOT yet done (next agent)
- **Awaiting backend files** (Tier 1–3, listed in report §8 and workbook §10). Cannot pinpoint first-resource-to-die (PHP-FPM vs DB vs event loop vs OOM) without them.
- **FE hardening NOT registered yet:** FE-1 connect() leak, FE-2 jitter/backoff + poll de-sync, FE-3 in-flight fetch dedupe, FE-4 handshake auth+join. → Run INTAKE then PLANNING. Socket files are hotspots (R5) — no Fast Lane; testing_agent verification mandatory.
- **Backend fixes** (external team): BE-B1 rooms (`io.to('rest_'+rid).emit`) = highest leverage; BE-B2 payload-complete status events. Re-run wire probe after BE-B1 → expect `foreign=0`.

## Next agent — start here
1. If user brings backend files → ingest, build single incident timeline, confirm `io.emit` vs `io.to` at source line, identify first-resource-to-die. Save under `/app/memory/evidence/INV-SOCKET-001/`.
2. Else → begin INTAKE for FE-1…FE-4.
3. Re-run decisive test any time via `/app/memory/evidence/INV-SOCKET-001/wire_probe.js` (browser console, logged-in) or `pod_wire_probe.js` (node).

## Artifacts (all under /app/memory)
- Report: `INV-SOCKET-001_INVESTIGATION_REPORT.md` (learnings §7, files-to-provide §8, next steps §9)
- Backend brief: `backend_briefs/BACKEND_BRIEF_INV-SOCKET-001_2026-07-19.md`
- Workbook HTML: `INV-SOCKET-001_WORKBOOK.html` (also published static at `/app/frontend/public/__dev/docs/` → `https://pos-react-deploy-3.preview.emergentagent.com/__dev/docs/INV-SOCKET-001_WORKBOOK.html`)
- Evidence: `evidence/INV-SOCKET-001/` (handshake_probe*.txt, pod_wire_probe*.{js,txt}, wire_probe.js, LIVE_REPROBE_2026-07-19.md)
- Test report: `/app/test_reports/iteration_4.json`
- Registry: `control/registry.json` → INV-SOCKET-001 (P0/CRITICAL/INVESTIGATED)

## Credentials used (from control/test_credentials.md)
owner@cafe103.com (Owner, restaurantId=644) — WORKING. Password in test_credentials.md (do not reprint).

## Env note
`/app/frontend/.env` is now populated by user (API/socket/Firebase/CRM/Maps). Contains live CRM keys — do NOT commit publicly / do not print.
