# INV-SOCKET-001 — LIVE RE-PROBE (backend UP) 2026-07-19 ~04:19–04:22 UTC

Backend recovered between 03:19 and 04:19 UTC. Re-ran all probes. This CORRECTS several
earlier findings that were taken while the origin was down (521).

## Corrected endpoint status (backend UP)
| Endpoint | Earlier (down) | NOW (up) | Note |
|---|---|---|---|
| preprod API /api/v1/ | HTTP 521 | HTTP 404 (root), 403 on login w/ bad creds | Origin healthy; 404 just means no handler at that exact path |
| crm.mygenie.online/api | HTTP 521 | HTTP 301 | Healthy (redirect) |
| presocket :443 | REFUSED | **HTTP 200 — nginx/1.18.0 (Ubuntu)** | Socket server IS on 443 via nginx now |
| socket.io handshake | n/a | **EIO4 OK** → sid issued, upgrades:["websocket"], pingInterval 25s, pingTimeout 20s, maxPayload 1MB | Socket.IO v4 server |
| socket.io EIO3 | n/a | `{"code":5,"Unsupported protocol version"}` | Server is v3/v4 only; client uses socket.io-client ^4.8.3 ✅ match |

## CORRECTIONS to earlier report
1. **"Socket server unreachable on 443 / Apache on the box"** — was an ARTIFACT of the outage window. When healthy, **nginx 1.18.0 serves 443** and Socket.IO v4 handshake works. The Apache:80 seen earlier is a secondary/idle listener; the real socket entry is nginx→443. (User confirmed stack is nginx.)
2. **Handshake auth:** connecting with NO auth/token still returns HTTP 200 and a valid sid → **the server does NOT reject unauthenticated sockets at handshake.** (Security gap stands: any client can open a socket.)
3. **Transport:** healthy server upgrades to **websocket** (good — not stuck on polling).

## Unauthenticated wire probe (pod, NO join emitted) — 2.5 min @ ~04:22 UTC
- Result: connected via websocket, **0 events received** in 2.5 min.
- INTERPRETATION (honest): **INCONCLUSIVE for global-broadcast.** Two possibilities remain:
  (a) genuinely quiet 2.5-min window across the fleet (~09:52 IST, between breakfast/lunch), OR
  (b) events ARE scoped server-side (rooms or per-socket-id emit) so an un-joined socket sees nothing.
- This means my earlier "global broadcast" conclusion is **NOT yet proven**. It was inferred from the
  FRONTEND having no join protocol — but the SERVER could still be scoping by other means
  (e.g., emitting to specific socket ids it tracks, or Laravel echo/room logic we can't see from FE).
- DECISIVE TEST NEEDED: authenticated session (client subscribes to its own `new_order_<rid>`),
  then `onAny` to detect whether events for OTHER restaurants also arrive. Running via testing agent.

## Net effect on root cause
- The **origin-down (521) mechanism is REAL and observed twice** (03:19 and 04:12 UTC) — that outage
  signature is confirmed independent of broadcast scoping.
- The **global-broadcast claim is now DOWNGRADED to "suspected, unproven"** pending the authenticated
  onAny test during real traffic. Everything about in-handler API herd, retry-no-jitter, poll sync,
  and the connect() leak remains code-proven and unaffected.
