# Live Socket Room Join Probe — 2026-11-16

## Test: Connect → join_restaurant → observe ACK

### Setup
- Restaurant: Ruby ZAP (RID=672)
- Server: presocket.mygenie.online
- Client: python-socketio 5.18.1

### Result
```
[PROBE] CONNECTED sid=xHJCBFWos9W_QFSDAApv transport=websocket
[PROBE] Emitted join_restaurant for rid=672
[PROBE] ✅ JOINED_ACK received: ({'room': 'rest_672'},)

SOCKET STATE AFTER 10s:
  Connected: True
  SID: xHJCBFWos9W_QFSDAApv
  Transport: websocket
  Events logged: 2
    CONNECT: xHJCBFWos9W_QFSDAApv
    JOINED_ACK: ({'room': 'rest_672'},)

✅ Server CONFIRMED room join (joined_restaurant ACK received)
```

### Key Finding
The server DOES send a `joined_restaurant` acknowledgment event with payload `{room: 'rest_672'}`.

**BUT:** The POS frontend NEVER listens for this event.

Evidence:
- `JOINED_ACK_EVENT` is DEFINED at `socketEvents.js:100` → `export const JOINED_ACK_EVENT = 'joined_restaurant';`
- grep for `joined_restaurant` usage (excluding the export): **ZERO handlers found**
- `socketService.js` does NOT subscribe to `joined_restaurant`
- `useSocketEvents.js` does NOT subscribe to `joined_restaurant`

**Impact:**
- If `join_restaurant` emission fails silently (network glitch, server error, race condition),
  the client has NO detection mechanism
- Socket shows "connected" (green) but receives ZERO restaurant events
- This is a **silent failure mode** — indistinguishable from "server has no events to send"
