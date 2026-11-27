# PWA vs Browser — Socket Behavior Deep Analysis

**Date:** 2026-11-16
**Context:** Follow-up to INV-SOCKET-PWA-2026-11-16

---

## Core Question: Why does socket disconnection mainly affect PWA and not browser?

**Short answer:** It CAN happen in both — but PWA is **dramatically worse** because the OS fully suspends JS execution in the background (pong never fires), whereas a browser tab merely throttles timers (pong still fires, just delayed).

---

## Side-by-Side Comparison

| Behavior | Regular Browser Tab | PWA (Standalone) |
|----------|--------------------|--------------------|
| **WebSocket in background** | Chrome: throttled but alive ~5min. Tab "frozen" but WS stays open. | iOS: KILLED after ~30s. Android: KILLED after ~5min. OS FULLY SUSPENDS the process — no JS runs at all. |
| **Timer throttling** | `setInterval` → 1/min (Chrome). Pong responses delayed but still sent within 60s timeout. Server sees slow client, doesn't disconnect. | `setInterval` → FROZEN (no execution). Pong NEVER sent. Server sees DEAD client → disconnects after 85s. |
| **Tab/Process kill** | Browser MAY discard tab after long inactivity. On re-focus, Chrome RELOADS the page = fresh start. Socket works. | OS may fully kill OR partially suspend. Full kill → fresh boot ✅. **Partial suspension** → socket frozen in ERROR state, not killed → STUCK. |
| **visibilitychange** | Fires reliably on tab switch. Socket recovery works well — socket was alive all along. | Fires on app foreground BUT may fire BEFORE network is ready (iOS delays ~2-3s). `connect()` fails → starts 10-attempt cycle → can exhaust budget. |
| **Recovery** | Usually instant — socket was never truly dead, just slow. | Must create fresh connection → room join → subscribe. If any step fails → stuck = force refresh. |
| **"Disconnects after a time"** | RARE — throttled pong keeps server happy. Only after 30+ min inactive. | GUARANTEED — 85s after backgrounding, server disconnects every time. |

---

## Why Server-Initiated Disconnect Hits PWA Harder

**Browser tab:**
```
Tab background → timers throttled 1/min → pong still fires (delayed)
→ Server sees slow pong within 60s timeout → doesn't disconnect
→ Tab return: socket ALIVE, just slow → immediate recovery ✅
```

**PWA standalone:**
```
App background → OS SUSPENDS JS entirely → pong NEVER fires
→ After 85s (25s interval + 60s timeout): server disconnects
→ Reason: 'ping timeout' → mapped to 'io server disconnect'
→ socketService.js:261: status=DISCONNECTED (NOT RECONNECTING)
→ Socket.IO design: server disconnect = NO auto-reconnect
→ App return: socket is DEAD. Only visibilitychange handler can save it.
→ If connect() fails (network not ready): 10 attempts start → can exhaust → STUCK
```

---

## Why Reconnection Budget Exhaustion Hits PWA Harder

**Browser:**
```
Reconnect needed (rare) → network was active all along
→ Attempt 1-2 succeeds → back online quickly
→ 10 attempts is plenty
```

**PWA:**
```
Reconnect needed (every backgrounding) → OS may delay network resume
→ iOS: ~2-3s network delay after app foregrounding
→ First few attempts fire before network ready → FAIL
→ Delay schedule: 1s, 2s, 4s, 8s, 16s, 30s, 30s, 30s, 30s, 30s (total ~181s)
→ If network comes back at ~3s: attempt 2-3 succeeds ✅
→ If network is unstable (weak WiFi, cellular handoff): multiple fail → budget exhausted → STUCK
→ 10 attempts is NOT enough for PWA's hostile environment
```

---

## The "Partial Suspension" Problem (PWA-only)

The worst failure mode is **partial suspension** — unique to PWA:

1. OS suspends the PWA process (no JS runs)
2. Socket.IO reconnect timer was already counting
3. All 10 reconnect attempts fire "instantly" from the client's perspective (timers compressed)
4. But network isn't ready yet → all 10 fail in rapid succession
5. `reconnect_failed` fires → ERROR state → permanently stuck
6. User brings app to foreground → sees stale data
7. `visibilitychange` fires → `connect()` called → **BUT** old socket singleton is in ERROR with no cleanup
8. `connect()` at L46-49 creates new socket → should work... but old event handlers may leak

In browser: Chrome doesn't do "partial suspension" — it either keeps the tab alive (throttled) or fully discards it (clean reload).
