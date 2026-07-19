# BACKEND_BRIEF_INV-SOCKET-001_2026-07-19

## Summary
- Issue: Peak-traffic outages (1–4 min total unresponsiveness, HTTP 500s, timeouts, missing socket updates) across ~150 restaurants. Frontend investigation traced the mechanism; server-side evidence is required to close it.
- Classification: BACKEND_BUG + CONFIG_ISSUE (socket broadcast architecture + origin capacity)
- Frontend impact: order placement fails, statuses stale, kitchen displays wrong, cashiers panic-refresh (adds more load)
- Priority/Risk: P0 / CRITICAL

## What the frontend PROVES about the server contract
1. The client NEVER joins a room and sends NO identity at handshake. **LIVE-PROVEN 2026-07-19 04:25 UTC:** an authenticated client for restaurant 644 received 6 unsolicited FOREIGN events for restaurants 689 & 523 on channel `login_disabled_<rid>` (`own=0, foreign=6`). Server emits on the DEFAULT namespace to every connected socket in the fleet.
   - NOTE: the proof events were `login_disabled_<rid>` (a system/admin event), NOT order events — the frontend has ZERO references to that channel yet still received it. Please tell us what emits `login_disabled_<rid>`, how often, and whether ORDER emits (`new_order_<rid>` etc.) use the same global `io.emit()` path.
2. Three events force clients to call the API back: `update-food-status`, `update-order-status`, `scan-new-order` → each emit triggers `GET single-order` from EVERY device of that restaurant (5–10×), with a 1s retry on failure.
3. Every client also calls `GET running-orders` every 60s, plus on every reconnect >1.5s (reconnect storm = herd of heavy queries).
4. Live probe 2026-07-19: `https://preprod.mygenie.online/api/v1/` → **HTTP 521 (Cloudflare: origin down)**. `presocket.mygenie.online:443` refused; port 80 = Apache 404; port 6001 = uvicorn. Single A record (52.66.232.149) — single node, SPOF, no LB.

## Evidence needed from backend team (capture during one peak window, ideally during an incident)
| # | Metric | How |
|---|--------|-----|
| 1 | Active socket count over time | `io.engine.clientsCount` logged every 10s |
| 2 | Emit rate + fan-out | count `io.emit` calls/sec; multiply by clientsCount; log bytes written |
| 3 | Confirm global emit | grep socket server for `io.emit(` vs `io.to(`/`socket.join(` — expected: zero `join` handlers |
| 4 | Node event-loop lag | `perf_hooks.monitorEventLoopDelay()` — p99 during peak |
| 5 | Node CPU + RSS memory | `pm2 monit` / `top` during peak; check for OOM kills in `dmesg`/syslog around incident times |
| 6 | Same-process check | list processes on 52.66.232.149: is socket node co-located with Apache/PHP/uvicorn? Who owns port 443 (why closed)? |
| 7 | Laravel: PHP-FPM/Apache worker saturation | `server-status`, fpm status page: active vs max children at incident time |
| 8 | DB | max_connections vs used, slow query log, locks during incident window |
| 9 | Cloudflare | origin error analytics for the 521/52x windows — correlate to order-status emit bursts |
| 10 | Duplicate emits | confirm `scan-new-order` v1+v2 double payload; count emits per single order placement (expected 3–5) |
| 11 | Redis | is any socket.io adapter configured? (expected: none — fine for single node, mandatory before adding a 2nd) |

## Requested fixes (in order)
1. **Room protocol:** on connect, require `join` with restaurantId (+token validation); `socket.join('rest_'+rid)`; change all `io.emit(channel,...)` → `io.to('rest_'+rid).emit(channel,...)`. FE will follow with handshake auth (FE-4).
2. **Payload-complete status events:** include the full order object in `update-order-status`/`update-food-status` so clients stop GET-ing back (FE already handles payload events).
3. Serve production frontend from nginx/CDN static build — verify it is NOT `craco start` (dev server caps ~100 connections).
4. Report back who owns presocket:443 and why it is closed while the FE config points at `https://presocket.mygenie.online`.

## Frontend Workaround
- Available: PARTIAL — FE-1..FE-4 (connect-leak fix, retry jitter, poll de-sync, fetch dedupe) reduce herd amplitude but cannot fix global broadcast or origin capacity.

## Evidence artifacts
- /app/memory/evidence/INV-SOCKET-001/handshake_probe.txt, handshake_probe2.txt
- /app/memory/evidence/INV-SOCKET-001/wire_probe.js (browser test that proves global vs room broadcast in 5 minutes)
- Full report: /app/memory/INV-SOCKET-001_INVESTIGATION_REPORT.md
