# QA Handover — CR-082 Socket Room-Join

**Date:** 2026-07-19
**Item:** CR-082 — Socket Room-Join (FE must emit `join_restaurant` after socket connect)
**Risk:** CRITICAL (sockets)
**Sprint:** POS 5.0

---

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test |
|---|---|---|---|
| JOIN_EVENT constant | socketEvents.js:99 | String = 'join_restaurant' | ✅ PASS |
| JOINED_ACK_EVENT constant | socketEvents.js:100 | String = 'joined_restaurant' | ✅ PASS |
| Import JOIN_EVENT | socketService.js:5 | Added to import | ✅ PASS |
| this.restaurantId = null | socketService.js:31 | Constructor init | ✅ PASS |
| joinRestaurant() method | socketService.js:79-86 | Stores rid + emits JOIN_EVENT | ✅ PASS |
| Re-join on connect | socketService.js:250-255 | Emits JOIN_EVENT inside CONNECT handler | ✅ PASS |
| Clear rid on disconnect | socketService.js:98-99 | Sets this.restaurantId = null | ✅ PASS |
| Join call in effect | useSocketEvents.js:210 | socketService.joinRestaurant(restaurantId) | ✅ PASS |
| Compile | all 3 files | webpack 0 new warnings | ✅ PASS |

## 2. Test Cases

### T1 — Cold Login Join (MANUAL / E2E)
**Steps:**
1. Login as owner@cafe103.com (rid=644)
2. Wait for app to fully load (dashboard)
3. Open browser console

**Expected:**
- Console shows: `[Socket] ... join_restaurant emitted for 644`
- Wiretap (run in console): `window.__SOCKET_SERVICE__.socket.onAny((ev,...a) => console.log('WIRETAP', ev, JSON.stringify(a).slice(0,150)));`
- Should see: `WIRETAP joined_restaurant {"room":"rest_644"}`

### T2 — Order Event Delivery (MANUAL / E2E)
**Steps:**
1. With T1 logged in, fire trigger:
```bash
curl -s -X POST https://presocket.mygenie.online/order-update -H 'Content-Type: application/json' \
  -d '{"order_type":"new-order","order_id":999999,"restaurant_id":644,"food_status":0,"order_details":{"orders":[]}}'
```
**Expected:** Exactly ONE `WIRETAP new_order_644 ["new-order",999999,644,0,...]` in console

### T3 — Outsider Isolation (NODE PROBE)
**Steps:** Run while T2 is active:
```js
const { io } = require('./frontend/node_modules/socket.io-client');
const s = io('https://presocket.mygenie.online', { transports:['websocket'], reconnection:false });
let n = 0;
s.onAny((ev) => { n++; console.log('OUTSIDER GOT', ev); });
s.on('connect', () => console.log('outsider connected (no join) — must receive 0'));
setTimeout(() => { console.log('outsider total:', n, n === 0 ? 'PASS' : 'FAIL — leak!'); process.exit(0); }, 60000);
```
**Expected:** 0 events received

### T4 — Reconnect Re-Join (MANUAL)
**Steps:**
1. Login as rid 644
2. DevTools → Network → Offline (5 seconds) → Online
3. Wait for reconnect
4. Fire trigger for 644

**Expected:** Still ONE event (re-join works). If 0 → CONNECT handler re-join is broken.

### T5 — Tenant Switch Isolation (MANUAL)
**Steps:**
1. Login as rid 644, verify join
2. Logout
3. Login as different restaurant (owner@palmindia.com, rid=816)
4. Fire trigger for 644 → should see 0 events
5. Fire trigger for 816 → should see 1 event

**Expected:** 0 events for old tenant, 1 for new tenant

### T6 — Station View Refresh (MANUAL — if enabled)
**Steps:** On an account with kitchen stations enabled, fire new-order trigger → station panel should update

### T7 — Compile Check (AUTOMATED)
**Steps:** `tail -1 /var/log/supervisor/frontend.out.log`
**Expected:** `webpack compiled successfully`

### T8 — Existing Socket Tests Still Pass (AUTOMATED)
**Steps:** `cd /app/frontend && npx craco test --watchAll=false --testPathPattern=socket 2>&1`
**Expected:** All existing tests pass, 0 failures

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | food_update channel still works (add item in admin → POS shows immediately) | Same subscription effect modified |
| R2 | Order-engage channel still works (lock indicator on orders) | Same effect block |
| R3 | Table channel still receives events | Same effect block |
| R4 | Reconnect rehydration still fires (BUG-068) | CONNECT handler modified |

## 4. Registry Sync Confirmation
Registry synced: YES
Items: CR-082
Sprint: pos_5_0
EXIT GATE: 5/5 PASSED

## 5. Credentials + Environment
- Account: owner@cafe103.com / owner@palmindia.com (password: ask owner — per R20 not printed)
- Restaurant IDs: 644 (Cafe103), 816 (Palm India)
- Socket Server: https://presocket.mygenie.online
- Frontend: https://core-pos-preview-10.preview.emergentagent.com
- Trigger: POST https://presocket.mygenie.online/order-update
- Dev debug: `window.__SOCKET_SERVICE__` available in console
