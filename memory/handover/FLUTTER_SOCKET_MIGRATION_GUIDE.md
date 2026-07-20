# Flutter App — Socket Room-Join Migration Guide (CR-077 contract)

**Audience:** Flutter developer of the MyGenie POS mobile app (same Laravel backend + same Socket.IO server `https://presocket.mygenie.online`)
**Date:** 2026-07-20 | **Status of backend:** ALL changes deployed & QA-verified (5/5 PASS)
**This document is self-contained** — everything you need is here.

---

## 1. WHY THIS CHANGE IS MANDATORY (read this or your realtime is already broken)

Until July 2026 the socket server broadcast every restaurant's events to **every connected client** (`io.emit`, no rooms). This caused peak-hour outages (~1,000 devices each receiving all tenants' traffic) and a privacy leak.

The server has now been changed. **All events are room-scoped:**
```js
io.to('rest_' + restaurant_id).emit('new_order_' + restaurant_id, ...)
```
This applies to **every channel**: `new_order_<rid>`, `update_table_<rid>`, `food_update_<rid>`, `order-engage_<rid>`, `aggregator_order_<rid>`, `login_disabled_<rid>`.

**Consequence for your app:** a client that does not JOIN its room receives **NOTHING**. If the Flutter app still connects the old way (connect + listen only), it is receiving **zero realtime events right now**. This is not optional hardening — it is a breaking contract change.

---

## 2. THE CONTRACT (frozen, deployed, validated — do not rename anything)

### 2.1 Join (client → server), after every successful connect:
```
event:   'join_restaurant'
payload: { "restaurant_id": <int> }        // e.g. { "restaurant_id": 644 }
```

### 2.2 Ack (server → client), confirms membership:
```
event:   'joined_restaurant'
payload: { "room": "rest_<rid>" }          // e.g. { "room": "rest_644" }
```

### 2.3 Server-side behavior (already live — for your understanding only):
```js
socket.on('join_restaurant', (data) => {
  const rid = parseInt(data && data.restaurant_id, 10);
  if (!rid) return;                                   // invalid → silently ignored, no ack
  for (const room of socket.rooms) {                  // auto-leaves any previous rest_* room
    if (room !== socket.id && room.startsWith('rest_')) socket.leave(room);
  }
  socket.join('rest_' + rid);
  socket.emit('joined_restaurant', { room: 'rest_' + rid });
});
```
Notes: joining is idempotent (re-join same room = no-op). Joining a different room automatically leaves the old one (handles restaurant switch). Send `restaurant_id` as a number or numeric string — `"abc"`/missing is ignored with NO ack.

### 2.4 Event envelope (unchanged — same as before the migration):
Order events arrive as **5 positional arguments**, not one object:
```
'new_order_<rid>' → (event_name, order_id, restaurant_id, food_status, order_details)
  index 0: event name string, e.g. 'new-order', 'update-order', 'update-food-status', 'scan-new-order'...
  index 1: order id
  index 2: restaurant id
  index 3: status (meaning depends on event name)
  index 4: payload object (e.g. { orders: [...] }) — may be a primitive for 'scan-new-order'
```
In `socket_io_client` (Dart), multi-arg emits are delivered to your handler as a **`List`** — `data[0]` = event name, `data[4]` = payload. If you were already parsing events before this migration, **nothing changes here**.

---

## 3. WHAT THE REACT APP CHANGED (your reference implementation)

Three rules — copy the logic, not the syntax:
1. **Join when both are true:** socket connected AND restaurant id is known. (Rid usually loads after login, after the socket already connected — do not assume order.)
2. **RE-JOIN ON EVERY RECONNECT.** ← the single most important line. Socket.IO room membership is per-connection and is **lost on every reconnect**. The React app stores the rid in its socket service and re-emits `join_restaurant` inside the `connect` handler, which fires on every (re)connect. Without this, realtime silently dies after the first network blip and staff only notice when orders stop appearing.
3. **Clear the stored rid on logout** — so after logging into a different restaurant you never re-join the previous tenant's room.

---

## 4. WHAT YOU CHANGE IN FLUTTER

### 4.1 Package / version
Use `socket_io_client` (Dart). The server is **Socket.IO v4 / EIO4** → you need `socket_io_client: ^2.0.0` or newer (1.x speaks the v2 protocol and will fail the handshake). If your app currently connects fine, your version is fine.

### 4.2 Reference implementation (adapt names to your codebase)
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  IO.Socket? _socket;
  int? _restaurantId; // CR-077: room to (re)join on every connect

  void connect() {
    if (_socket != null && _socket!.connected) return;
    _socket = IO.io(
      'https://presocket.mygenie.online', // from your env/config, do not hardcode
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableReconnection()
          .build(),
    );

    // CR-077: fires on EVERY connect AND every auto-reconnect → re-join here
    _socket!.onConnect((_) {
      if (_restaurantId != null) {
        _socket!.emit('join_restaurant', {'restaurant_id': _restaurantId});
      }
    });

    // optional but recommended: observability ack
    _socket!.on('joined_restaurant', (data) {
      print('[socket] joined ${data['room']}');
    });
  }

  /// Call once restaurantId is known (after login/bootstrap),
  /// and again if the user switches restaurant.
  void joinRestaurant(int restaurantId) {
    _restaurantId = restaurantId;
    if (_socket != null && _socket!.connected) {
      _socket!.emit('join_restaurant', {'restaurant_id': restaurantId});
    }
    // if not connected yet: onConnect above will emit it — no extra code needed
  }

  /// Existing listeners stay EXACTLY as they were (envelope unchanged)
  void subscribeOrderChannel(int rid, Function(List) handler) {
    _socket!.on('new_order_$rid', (data) => handler(data as List));
  }

  void disconnect() {
    _restaurantId = null; // CR-077: prevents joining previous tenant's room after re-login
    _socket?.disconnect();
    _socket = null;
  }
}
```

### 4.3 Where to call `joinRestaurant()`
Wherever your app first learns the restaurant id after login (bootstrap/profile fetch). Exactly one call is enough — the `onConnect` re-join covers everything afterwards.

### 4.4 Mobile-specific lifecycle (this is where Flutter differs from web)
- **App background → foreground (resume):** the OS usually killed the socket. Your reconnect logic (existing or `enableReconnection()`) will reconnect → `onConnect` fires → re-join happens automatically. Just make sure you do NOT create a *new* socket instance on resume without going through the same `onConnect` wiring — one singleton service, always.
- **Network switch (WiFi ↔ mobile data):** same story — reconnect → onConnect → re-join. Free if rule 2 is implemented.
- **Logout:** call `disconnect()` (clears rid). **Restaurant switch without logout:** just call `joinRestaurant(newRid)` — the server auto-leaves the old room; also swap your `new_order_<rid>` listeners to the new rid.

### 4.5 What NOT to do
- Do NOT emit `join_restaurant` before the socket is connected (it's lost silently). Store the rid, let `onConnect` handle it.
- Do NOT join only once at startup — rule 2.
- Do NOT change any event names, payload shapes, or add wrapper objects. The envelope is unchanged and shared with the React app.
- Do NOT create multiple socket connections (one per screen etc.) — one app-level singleton.

---

## 5. HOW TO TEST (15 minutes, no backend help needed)

**Trigger command** (fires a synthetic order event through the real server — harmless, use your own test restaurant id):
```bash
curl -s -X POST https://presocket.mygenie.online/order-update \
  -H 'Content-Type: application/json' \
  -d '{"order_type":"new-order","order_id":999999,"restaurant_id":<YOUR_RID>,"food_status":0,"order_details":{"orders":[]}}'
# expect: {"status":"Message broadcasted22"}
```

| # | Test | Steps | Pass criteria |
|---|---|---|---|
| 1 | Join + ack | Login in the Flutter app, watch logs | `joined_restaurant {room: rest_<rid>}` logged after connect |
| 2 | Delivery | Fire the curl for your rid | exactly ONE `new_order_<rid>` event received, `data[0]=='new-order'`, `data[1]==999999` |
| 3 | Isolation | Fire the curl for a DIFFERENT rid (e.g. 777001 — fake, safe) | app receives NOTHING |
| 4 | **Reconnect (critical)** | Toggle airplane mode 10s → back on → wait for reconnect → fire curl for your rid | event still received; logs show a fresh `joined_restaurant` after the reconnect. If this fails, your re-join is not in `onConnect` |
| 5 | Background/resume | Background the app 1–2 min → resume → fire curl | event received after resume |
| 6 | Tenant switch | Logout → login as another restaurant → fire curl for the OLD rid, then the NEW rid | old: nothing; new: one event |

**Success signature (memorize it): own event = 1, other restaurant = 0, after reconnect still = 1.**

### Debug table
| Symptom | Cause |
|---|---|
| No `joined_restaurant` ack | join emitted before connect, wrong event name, or `restaurant_id` not numeric |
| Ack OK but no order events | listening on wrong channel name (`new_order_<rid>` — rid must match), or rid mismatch in the curl |
| Works, dies after airplane-mode test | re-join is not inside `onConnect` (rule 2 violated) |
| Old restaurant's events after switching | rid not cleared on logout / listeners for old rid not removed |
| Handshake fails entirely | `socket_io_client` 1.x (protocol v2) against the v4 server — upgrade to ^2.x |

---

## 6. TIMELINE / STATUS CONTEXT
- Server room-scoping + join handler: **DEPLOYED & VERIFIED** (all channels, QA 5/5, 2026-07-20).
- React web POS: join implemented, verified E2E incl. reconnect (branch core-pos-preview-10).
- Flutter app: **receives zero realtime events until this guide is implemented** — the polling fallback (if any) is the only thing keeping it updated. Treat as P0.
- Phase-2 (upcoming, will be announced): the join will require a token (`{restaurant_id, token}`) for security. Structure your `joinRestaurant()` so adding a field later is a one-line change.
