# INV-BUZZER-20261123 — Investigation Report

**Role:** INVESTIGATION (Role 6, AGENT_PROMPT_ALPHA v0.7)
**Date:** 2026-11-23
**Branch:** `20261123-150416` (HEAD `fdc8e500` — "FCM & Sound Diagnostics Panel — Built & Verified")
**Reported by:** Owner
**Symptoms:** (1) buzzer not ringing for orders; (2) "Enable Audio" shows errors in console; (3) "the FCM/socket does not appear to ring for an order"
**Gate status:** No code edited. Recommendations only.

---

## 1. Summary

Root cause is **two independent problems**, not one:

- **A — Ring architecture gap (FE_BUG, HIGH confidence).** The order *ring* is produced **only** by an FCM push message flowing through `NotificationContext.processNotification → soundManager.play`. The **Socket.IO order path never plays any sound** — `socketHandlers.js` has **zero** `soundManager` references. So when a socket `new-order` arrives, the order appears on screen (state updates) but **no buzzer rings** unless a matching FCM push *also* arrives in the foreground. This precisely matches the owner's wording "the socket shows the order but the FCM ring does not fire."

- **B — Cross-site / Cloudflare cookie noise (CONFIG_ISSUE, HIGH confidence for the console errors; MEDIUM for any socket impact).** The `Cookie "__cf_bm" has been rejected for invalid domain.` flood is **not** produced by the audio code. It comes from every XHR/Socket.IO request to `preprod.mygenie.online` / `presocket.mygenie.online` (both Cloudflare-fronted) while the POS is served from a different site (`*.preview.emergentagent.com`). Those `__cf_bm` / `XSRF-TOKEN` / `mygenie_session` cookies are third-party in that context and the browser rejects them. The "error when I enable audio" is this continuous flood coinciding with the click — `soundManager.unlock()` itself routes its errors to the diagnostics log, never to `console`.

**Classification:** FE_BUG (A) + CONFIG_ISSUE (B). **Not a backend bug.**
**Confidence:** A = HIGH (code-confirmed), B-console = HIGH (code + curl), B-socket-impact = MEDIUM (needs real-browser confirmation).
**Steps used:** 9/10.

---

## 2. Hypotheses Tested

| # | Hypothesis | Method | Result | Evidence |
|---|-----------|--------|--------|----------|
| 1 | Socket client/server protocol mismatch stops order events | read package.json + curl handshake | **ELIMINATED** | client `socket.io-client` 4.8.4; server answers `EIO=4` with valid sid (P1) |
| 2 | Socket server / API unreachable | curl both hosts | **ELIMINATED** | presocket → 200 handshake; preprod → 200 (P1, P2) |
| 3 | Socket order path is expected to ring the buzzer | grep `soundManager` in `socketHandlers.js` | **CONFIRMED root cause A** | zero `soundManager` refs — socket path never plays sound |
| 4 | Ring depends solely on FCM foreground push | trace `NotificationContext` + `firebase.js` + `LoginPage` | **CONFIRMED** | only `processNotification` calls `soundManager.play`; FCM token requested **only** at explicit login |
| 5 | "Enable Audio" console error comes from the unlock code | read `soundManager.unlock` + `fcmDiagLog` | **ELIMINATED** | unlock swallows errors into `fcmDiagLog`, never `console.*` |
| 6 | Console flood is Cloudflare cross-site cookies | curl preprod headers | **CONFIRMED root cause B** | `server: cloudflare`, `set-cookie … samesite=lax/httponly` for mygenie.online; rejected third-party on emergentagent.com |
| 7 | Firebase fails to init (bad/missing keys) | live console capture with keys set | **ELIMINATED (when keys present)** | `[Firebase] App initialized` + `[Firebase] Messaging initialized` |

---

## 3. Data Flow Trace

**Ring (sound) path — the only one that exists:**
```
FCM push (foreground) → config/firebase.js onForegroundMessage
  → NotificationContext.processNotification
  → resolve sound (data.sound | inferFromContent | tone override)
  → soundManager.play(resolvedSound)   ← ONLY place the buzzer fires
```

**Socket order path — updates UI, NO sound:**
```
SocketContext.connect() (only when isAuthenticated)
  → useSocketEvents subscribe new_order_<rid>
  → socketHandlers.handleNewOrder / handleOrderDataEvent / …
  → OrderContext / TableContext state update → order renders on screen
  ✗ no soundManager call anywhere in socketHandlers.js
```
**BREAK POINT:** the buzzer is coupled exclusively to FCM. If the FCM foreground message does not arrive (token never registered, permission not `granted`, or SW not controlling), the socket still shows the order but nothing rings.

**Why FCM may not deliver a foreground ring:**
- `requestFCMToken()` runs **only** inside `LoginPage.handleLogin`. On a page refresh/restored session (already authenticated) it is **not** re-called, so a device that never completed a token registration has no push target.
- `requestFCMToken` returns `null`/`denied` unless `Notification.permission === 'granted'` **and** `/firebase-messaging-sw.js` registers **and** `REACT_APP_FIREBASE_VAPID_KEY` is present.

---

## 4. Evidence Artifacts
All saved to `/app/memory/evidence/INV-BUZZER-20261123/`:
- `probes.md` — curl handshakes, header dumps, grep result, live console lines.

---

## 5. Recommendations (for OWNER decision → PLANNING; NOT fast-lane)

Both candidate fixes touch **sockets / notification hotspots → HIGH risk → full Gate 2–3 cycle** (not planning-skip eligible).

1. **Decide the intended ring architecture (owner decision).**
   - Option A: keep FCM as the only ring source (then the fix is purely making FCM token reliable).
   - Option B: also ring on Socket.IO `new-order` / confirm-order events so a connected POS buzzes even when FCM push is missing. This is the more robust POS behaviour but changes notification semantics (dedupe vs FCM, per-order mute, tone override) and must be planned carefully.

2. **FCM token reliability (FE).** Re-request / verify the FCM token on session restore and when permission flips to `granted`, not only at explicit login. Surface token/permission state (the new diagnostics panel already does this — use it to confirm on the affected device: *Notification permission = granted*, *FCM token present = yes*, *VAPID configured = yes*).

3. **Cross-site / Cloudflare console errors (CONFIG — environment, no app-code fix).** The `__cf_bm` rejections are expected whenever the POS origin differs from the API/socket origin. To remove them and de-risk Cloudflare challenging the socket:
   - serve the POS from the same site as the backend, **or** proxy `preprod`/`presocket` through the POS origin so cookies are first-party; **or**
   - accept them as benign and, in the affected browser, confirm via the Network tab whether the Socket.IO polling/websocket requests actually succeed (look for a CF `403`/challenge). If the socket stays connected, the errors are cosmetic and unrelated to the buzzer.

4. **Verify in the real browser (owner/QA):** open Settings → Test Notifications on the affected device and read the FCM Health rows + the Event Log. `received` with no `played`/`sound_ok` ⇒ FCM arrived but sound blocked/off; **no `received` at all for a live order ⇒ FCM not delivering** (confirms root cause A path).

---

## 6. Retroactive Candidates
None. (The diagnostics panel on this branch is already built; no code claims to ring on socket events.)

---
**Next:** Owner to choose ring architecture (A vs B) and whether to fix the cross-origin config, then → PLANNING (Gate 2 Impact Analysis). No code changed in this session.
