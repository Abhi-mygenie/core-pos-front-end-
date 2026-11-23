# INV-BUZZER-20261123 — Evidence probes
Branch under test: 20261123-150416 (HEAD fdc8e500 "FCM & Sound Diagnostics Panel — Built & Verified")

## P1 — Socket server reachable (Engine.IO v4 handshake)
curl -s -i "https://presocket.mygenie.online/socket.io/?EIO=4&transport=polling"
HTTP/1.1 200 OK · Server: nginx/1.18.0
0{"sid":"PyW5mQEMBc6GuVMPAAK5","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":60000,"maxPayload":1000000}
→ Socket server is UP and speaks Engine.IO v4.

## Socket client version
package.json: "socket.io-client": "^4.8.3" · installed 4.8.4
→ Client is v4, server is EIO=4. NO protocol mismatch.

## P2 — API base reachable (Cloudflare-fronted, sets cross-site cookies)
curl -s -i "https://preprod.mygenie.online/"
HTTP/2 200 · server: cloudflare
set-cookie: XSRF-TOKEN=...; samesite=lax
set-cookie: mygenie_session=...; httponly; samesite=lax
→ Backend is behind Cloudflare and sets SameSite=Lax/httponly cookies for mygenie.online.
  When the POS runs on *.preview.emergentagent.com these are THIRD-PARTY cookies and the
  browser rejects them → the repeated `Cookie "__cf_bm" has been rejected for invalid domain.`
  console flood in the owner's screenshot.

## socketHandlers.js — does the socket order path ring any sound?
grep -n "soundManager|play|buzzer|ring" src/api/socket/socketHandlers.js → ZERO soundManager references.
→ Socket new-order/update handlers mutate order/table state only. They NEVER play a sound.
  The ring is produced only by FCM → NotificationContext.processNotification → soundManager.play.

## Live console on this pod (firebase keys set here)
[Firebase] App initialized
[Firebase] Messaging initialized
[useSocketEvents] Socket not ready, skipping subscriptions (pre-login — socket connects only when authenticated)
→ With valid firebase + VAPID keys, Firebase + Messaging initialize fine. The __cf_bm errors
  do NOT appear on the login page; they start after login when the socket + API traffic begins.
