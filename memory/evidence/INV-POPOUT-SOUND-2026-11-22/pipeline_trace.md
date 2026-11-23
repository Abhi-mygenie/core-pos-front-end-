# Evidence — Pop-out vs Sound pipeline trace (INV-POPOUT-SOUND-2026-11-22)

## Key architectural fact: TWO DECOUPLED PIPELINES
- **Pop-out (visual)** = SOCKET + OrderContext driven. ScanOrderPopOut derives its queue purely from the `orders` array (DashboardPage L1935-1947). No FCM, no sound import for play.
- **Sound (audio)** = FCM push driven. NotificationContext ← `onForegroundMessage` (foreground) + service-worker `BACKGROUND_NOTIFICATION` forward. `soundManager.play()` fires ONLY from `processNotification`. It is NOT triggered by the socket order arrival or by the pop-out opening.
→ The two can (and do) desync: order pops with no ring, or a ring with no pop. Matches "randomly".

## Pop-out open predicate (ScanOrderPopOut.jsx)
- L62  isUnconfirmedScanOrder:  `order.fOrderStatus === 7 && !scheduled && order.isWebOrder`   (new web order)
- L65-68 hasUnconfirmedWebEditItems: `order.isWebOrder && !scheduled && fOrderStatus !== 7 && items.some(isNotConfirmed && !cancelled)`  (web EDIT)
- L204-213 queue = orders.filter(either predicate). Pure derivation on every render — NO "already seen" suppression beyond in-memory snooze.

Both predicates REQUIRE `order.isWebOrder === true`.
`isWebOrder` source: orderTransform.js L268-269 → `normaliseOrderFrom(api.order_from) === 'web'`.

## The cold-boot gap (why pop-out "sometimes" doesn't open after reload/login)
- Boot/reload hydrates orders from GET `employee-orders-list` (orderService.getRunningOrders, constants RUNNING_ORDERS).
- Documented in code: `useOrderPollingReconciliation.js` L170-177 (BUG-082):
  "The running-order-list API may omit `order_from` for YTC orders" — guard copies `orderFrom`/`isWebOrder` from a LOCAL socket order IF one exists.
- On a COLD reload/login there is NO prior local socket order to copy from → if the GET omits `order_from`, `isWebOrder=false` → neither predicate matches → POP-OUT DOES NOT OPEN.
- When the GET happens to include `order_from='web'` → it works → "sometimes/randomly".
- Web-EDIT variant also needs item `food_status===7` to survive on the GET (orderTransform L162-163 isNotConfirmed). If the GET returns the appended lines with a different status, the edit pop-out won't open either.
- RELATED registered item: BUG-701 — same `isWebOrder` recomputed-false mechanism (room order_from pos/null) makes the popup disappear; guard exists in reconciliation but "missing in socket handlers + single-order transform".

## The sound gap (why ring "randomly" doesn't fire)
`soundManager.play()` (soundManager.js L81-84): `audio.play().catch(err => console.warn('[SoundManager] Play blocked', ...))`.
Random no-ring causes (all consistent with "after instant reload or login"):
1. **Browser autoplay policy** — `HTMLAudioElement.play()` is rejected until a user gesture occurs on the freshly loaded page. Right after reload/login (no click yet) → "Play blocked" → silent.
2. **FCM dependency** — sound requires a foreground FCM message to arrive, which needs Notification permission granted + a valid `REACT_APP_FIREBASE_VAPID_KEY` (was empty in env until added). Best-effort delivery → intermittent.
3. **Dedup window** — NotificationContext L109-116: 2s window keyed on message_id→order_id→title+body; a legit second event with same fingerprint within 2s is suppressed.
4. **Preload/decode race** — preload on auth (L218); a notification arriving before audio is decodable can fail the first play.
5. **Per-order mute** — soundManager mute registry (BUG-453) suppresses sound for muted orderIds.
6. Sound key is inferred from notification title/body text (inferSoundFromContent L12-24); if backend text changes, the wrong/no tone may resolve.

## Line references
- components/dashboard/ScanOrderPopOut.jsx: L62, L65-68, L204-213
- pages/DashboardPage.jsx: L1934-1948 (ScanOrderPopOut wiring, gated on settings.showScanPopup)
- api/transforms/orderTransform.js: L162-163 (isNotConfirmed), L268-269 (isWebOrder)
- hooks/useOrderPollingReconciliation.js: L170-177 (BUG-082 web-origin guard)
- contexts/NotificationContext.jsx: L93-205 (processNotification), L213-246 (FCM listeners/preload)
- utils/soundManager.js: L46-85 (play + autoplay catch)
- contexts/SocketContext.jsx: socket connect/reconnect (visibility/heartbeat/online)
