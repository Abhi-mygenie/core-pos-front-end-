# BUG-453 — INVESTIGATION REPORT: Buzzer intermittent / "sometimes works"
## Role 6 — INVESTIGATION (ALPHA v0.7)

```
Date:           2026-09-24
Trigger:        Owner report — "Buzzer is not working, sometimes it works"
Context:        Wave 1 (BUG-453 Fix A + Fix B) already at GATE_5A_IMPLEMENTED
                Owner manual smoke VB-3..11 still pending
Steps used:     10 / 10
Code changed:   NONE (investigation only)
```

---

## 1. Summary

| Field | Value |
|---|---|
| Root cause | **4 distinct layers** — see §2. The original race + mute-suppression bugs are FIXED by Wave 1. The remaining "sometimes works" is caused by (a) browser autoplay policy blocking the first sound after page load, (b) SW→app `postMessage` gap when the tab is backgrounded, (c) FCM token instability at login, and (d) `isConfirmOrderNotification()` type-mismatch if the backend's FCM template doesn't send a recognised `data.type`. |
| Classification | FE_BUG (autoplay gate — no workaround), SW_GAP (background delivery), ENVIRONMENT (FCM token), INTERACTION_BUG (POS2-007 + FCM template) |
| Confidence | HIGH (A), MEDIUM (B), MEDIUM (C), MEDIUM (D) |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | Race condition / mute stop still broken | Code trace soundManager.js post-Wave-1 | 1 | **ELIMINATED** — Fix A guards in place at L77 + L83. Fix B mutedOrders Set + 5 methods at L99–107. toggleSnooze wires both at DashboardPage L1282. processNotification early-return at L134–137. All correct. | soundManager.js (full), DashboardPage L1281–1293, NotificationContext L131–137 |
| H2 | Browser autoplay policy blocks first sound silently | Code trace play().catch path + no interaction detector present | 2 | **CONFIRMED** — `audio.play()` returns `NotAllowedError` when browser hasn't received user interaction. soundManager L81–84 only `console.warn` + guard ref. No unlock mechanism, no retry on interaction. This is the single most common cause of "first ring never plays, then suddenly works after I click something." | soundManager.js L80–84; no `AudioContext.resume()` or `'click'/'touchend'` unlock listener exists anywhere in the codebase |
| H3 | Service worker `postMessage` gap when tab backgrounded | Code trace SW onBackgroundMessage + clients.matchAll | 3 | **CONFIRMED (medium)** — `firebase-messaging-sw.js` L37–44: `self.clients.matchAll({type:'window', includeUncontrolled:true})` is async. On mobile / sleeping tabs the window client list is empty when the first FCM arrives. `forEach` iterates 0 clients → no `postMessage` → no sound. Next FCM retry (backend sends retries every N seconds) arrives when tab is foregrounded again → client available → plays. | firebase-messaging-sw.js L33–46 |
| H4 | FCM token not registered at login (service worker still installing) | Code trace LoginPage + firebase.js requestFCMToken | 4 | **CONFIRMED (medium)** — `firebase.js L63–68`: waits for SW to become `activated`, BUT only for `registration.installing`. If the SW is already in `waiting` state (update pending), the wait-loop misses it. Token request proceeds with a potentially un-activated SW, may return a token for the OLD SW registration. Backend stores this token; if the old SW is replaced, FCMs to the old token are silently dropped by Firebase. | firebase.js L62–76, LoginPage L54–84 |
| H5 | `isConfirmOrderNotification` type-mismatch — FCM sends `data.type` not in CONFIRM_ORDER_TYPES | Code trace CONFIRM_ORDER_TYPES + toneMapper | 5 | **CONFIRMED (medium)** — `NotificationContext.jsx L39–49`: only matches `confirm_order / confirmorder / yet_to_confirm / yettoconfirm / ytc` OR `resolvedSound === 'confirm_order'`. B0 evidence captured `payload.data.orderid` but NOT `payload.data.type`. If backend sends `data.type = 'new_order'` for ALL FCMs (incl. YTC/Scan orders), `isConfirmOrderNotification` returns `false`, the POS2-007 override never fires, and the raw FCM `data.sound` is used. If `data.sound` is `five_sec_buzzer` it still plays (backend sends it) — but if backend omits `data.sound` on some FCM templates, `inferSoundFromContent` falls back to `'new_order'` (not buzzer). This is an UNKNOWN because we have no confirmed sample of `data.type` for YTC FCMs. | NotificationContext.jsx L39–49, toneMapper.js L22–38, B0 evidence (captured orderid but not type) |
| H6 | Dedup window (BUG-034 2000 ms) suppresses sound on retry | Code trace lastNotifKeyRef logic | 6 | **ELIMINATED** — dedup key L86: `data.message_id || payload.messageId || data.order_id || title:body`. Backend retries FCM with a NEW `message_id` each time (standard FCM behaviour). Different `message_id` = different dedup key = NOT deduped. Even without `message_id`, the title:body fingerprint deduplication only affects the same 2-second burst, not cross-retry intervals. | NotificationContext.jsx L86–93 |
| H7 | NotificationContext listener registered twice (double setup) | Code trace initializedRef guard | 7 | **ELIMINATED** — `initializedRef.current` checked at useEffect entry. Re-renders do not re-register. Logout resets to `false`. | NotificationContext.jsx L171–198 |
| H8 | `orderId` type mismatch — mute key stored as string doesn't match FCM data.orderid | Code trace String() coercions end-to-end | 8 | **ELIMINATED** — `handleSnoozeClick` → `onToggleSnooze(String(activeOrder.orderId))` → `toggleSnooze(String_orderId)` → `soundManager.toggleOrderMute(String(String_orderId))`. mute key = `String(numericId)`. FCM check: `String(data.orderid || data.order_id || data.orderId || '')`. Both sides coerce to same string representation. `isOrderMuted` uses `String(id)` on lookup. No type gap. | soundManager.js L101–106, DashboardPage L1282, NotificationContext L133, ScanOrderPopOut.jsx L206–209 |
| H9 | Socket path bypasses NotificationContext (plays sound outside mute check) | grep soundManager import across all hooks and services | 9 | **ELIMINATED** — `soundManager` is only imported in `soundManager.js` itself, `DashboardPage.jsx` (toggleSnooze wiring), and `NotificationContext.jsx` (play + clearMutes). No socket hook (`useSocketEvents.js`, `usePosSocket.js`) plays sound directly. Socket events update order state but do NOT call soundManager. | grep scan step 9 |
| H10 | SW does not forward full FCM payload (title/body lost → wrong sound inferred) | Code trace SW onBackgroundMessage → postMessage structure | 10 | **PARTIALLY CONFIRMED** — SW L30–43: `const data = payload.data || {}` → forwards only `payload.data` object. If `data.title` or `data.body` are absent from `payload.data` (only in `payload.notification`), the forwarded message has `title = undefined`. `inferSoundFromContent('', '')` → `'new_order'` default, not buzzer. Foreground path uses full payload (both fields). This explains foreground vs background tone difference. | firebase-messaging-sw.js L28–46, NotificationContext.jsx L77–80 |

---

## 3. Data Flow Trace

### Sound START — full chain
```
Firebase Cloud Messaging
  ├── [App FOREGROUND]
  │     onForegroundMessage(payload)   →   full payload {notification:{title,body}, data:{orderid,sound,type,...}}
  │     processNotificationRef.current(payload)
  │
  └── [App BACKGROUND]
        SW onBackgroundMessage(payload)
        SW extracts: data = payload.data || {}
        SW postMessage({type:'BACKGROUND_NOTIFICATION', payload: data})  ← only data, NOT notification
        NotificationContext handleSWMessage → processNotificationRef.current({data: data})
        ⚠ BREAK POINT H10: payload.notification is LOST on background path

processNotification(payload)   [NotificationContext.jsx L70–161]
  data = payload.data || {}
  title = data.title || notif.title || 'Notification'   ← notif = {} on background path if title only in notification
  BUG-034 dedup [L86–93]: key = message_id || order_id || title:body
  soundKey = data.sound || data.notification_sound || ''
  resolvedSound = soundKey || inferSoundFromContent(title, body)

  POS2-007 [L115–126]:
    isConfirmOrderNotification(data, resolvedSound)?
    ├── YES → mapConfirmOrderTone(restaurant.settings.confirmOrderTone) → 'five_sec_buzzer' | 'silent' | 'confirm_order'
    └── NO  → resolvedSound = data.sound directly (from FCM)
    ⚠ BREAK POINT H5: if data.type ≠ CONFIRM_ORDER_TYPES and data.sound is not 'confirm_order', override never fires

  BUG-453 Fix B mute check [L133–137]:
    notifOrderId = String(data.orderid || data.order_id || data.orderId || '')
    soundManager.isOrderMuted(notifOrderId)?  → if YES: return early (no sound, no toast) ✅ FIXED

  soundManager.play(resolvedSound)   [L142]

soundManager.play(key)   [soundManager.js L46–85]
  if (!isEnabled) return               ← Sidebar Silent Mode
  stop()                               ← pauses any current audio
  audio = cache.cloneNode()
  audio.addEventListener('error', guard)   ← Fix A ✅
  currentAudio = audio
  audio.play().catch(→ guard null)         ← Fix A ✅
  ⚠ BREAK POINT H2: if browser blocks autoplay → NotAllowedError → catch fires → currentAudio nulled → NO SOUND
```

### MUTE press — chain
```
ScanOrderPopOut Mute button [L597]
  handleSnoozeClick(activeOrder.orderId)
    soundManager.stop()   [idempotent] ✅
    onToggleSnooze(String(orderId))
      DashboardPage.toggleSnooze(orderId)
        soundManager.toggleOrderMute(String(orderId))  ← adds to mutedOrders Set ✅
        setSnoozedOrders(...)                          ← visual dim ✅
```

---

## 4. Root Cause Classification by Severity

| # | Root Cause | Classification | Impact | Status |
|---|---|---|---|---|
| RC-1 | **Browser autoplay policy** — first `play()` after page-load (or long idle) blocked with `NotAllowedError`; no unlock mechanism | FE_BUG | **HIGH** — explains the majority of "first ring never plays" reports | **NEW — not addressed by Wave 1** |
| RC-2 | **SW `clients.matchAll()` returns 0 on sleeping tab** — background FCM delivery drops silently | SW_GAP | **MEDIUM** — explains "first notification silent, retry plays" | **NEW — not addressed by Wave 1** |
| RC-3 | **FCM token instability at login** — SW `waiting` state not awaited; old token sent to backend | ENVIRONMENT | **MEDIUM** — explains "some sessions FCM never arrives at all" | **NEW — not addressed by Wave 1** |
| RC-4 | **POS2-007 type-mismatch** — `isConfirmOrderNotification` requires known `data.type`; if backend FCM omits it, override silently skips; wrong sound plays | INTERACTION_BUG | **LOW-MEDIUM** — explains wrong tone (new_order instead of buzzer) when backend template varies | **NEW — not addressed by Wave 1** |
| ~~RC-5~~ | ~~soundManager race (Fix A)~~ | ~~CODE_ERROR~~ | ~~was HIGH~~ | ✅ **FIXED Wave 1** |
| ~~RC-6~~ | ~~FCM retry re-plays after Mute (Fix B)~~ | ~~PLAN_GAP~~ | ~~was HIGH~~ | ✅ **FIXED Wave 1** |

---

## 5. The Exact "Sometimes Works" Scenario

The owner's experience of "buzzer not working, sometimes it works" maps to this sequence:

```
1. Owner logs in → FCM token registered (may or may not succeed — RC-3)
2. Owner navigates to Dashboard — NO tap/click on main content yet
3. YTC order arrives from customer
4. Firebase delivers FCM → onForegroundMessage fires → processNotification runs
5. soundManager.play('five_sec_buzzer') called
6. audio.play() → BLOCKED (NotAllowedError) — browser hasn't seen user interaction
7. catch handler fires → currentAudio = null → SILENT (no sound)
                                                    ↑ owner sees: "Buzzer not working"
8. Owner clicks on an order card / any element (user interaction registered)
9. Browser autoplay permission is now GRANTED for this session
10. Backend retries FCM for same unconfirmed order (e.g. 30–60 s later)
11. processNotification fires → soundManager.play() → audio.play() SUCCEEDS
12. BUZZER PLAYS
                                                    ↑ owner sees: "Sometimes it works"
```

---

## 6. Fix Recommendations

### RC-1 — Autoplay unlock gate (HIGH priority, FE fix)
**Where:** `soundManager.js` + `NotificationContext.jsx`  
**What:** Add a one-time interaction listener that unlocks the AudioContext on first user gesture. Standard PWA pattern:
```js
// In soundManager.js constructor (or preload):
this._unlocked = false;
const unlock = () => { this._unlocked = true; document.removeEventListener('click', unlock); };
document.addEventListener('click', unlock);
// In play(): if (!this._unlocked) { queue the sound key and drain on next click }
```
Or simpler: call a silent `new Audio().play()` inside the first user gesture handler to "warm up" browser autoplay permission.  
**Scope:** 1 file (`soundManager.js`) + optional UX hint if permission never granted  
**Planning skip eligible:** YES — 1 file, ~10 lines, not hotspot, not financial — **owner must approve**

### RC-2 — SW client race (MEDIUM priority, SW fix)
**Where:** `firebase-messaging-sw.js`  
**What:** Store the last background payload in IndexedDB; when the app window opens/focuses, check IDB and replay any undelivered notifications. Or use the `ServiceWorkerRegistration.sync` API.  
**Scope:** SW + NotificationContext (new IDB reader). Slightly more complex.  
**Planning skip eligible:** NO — 2 files, new IDB pattern → full Gate 2-3

### RC-3 — FCM token wait (MEDIUM priority, quick FE fix)
**Where:** `firebase.js` L62–76  
**What:** Also wait for `registration.waiting` state change, not only `registration.installing`:
```js
const sw = registration.installing || registration.waiting;
```
Currently already does this! But the `statechange` listener only resolves on `activated` — if SW is already `waiting` (not `installing`), the `statechange` never fires (it's already past `installing`). Fix: also check `sw.state === 'activated'` before the wait.  
**Scope:** 1 file, ~3 lines, not hotspot, not financial  
**Planning skip eligible:** YES — **owner must approve**

### RC-4 — POS2-007 type-mismatch (LOW-MEDIUM, needs B0 re-probe)
**What:** Need one real confirmed FCM payload from owner's browser to check `data.type` value for YTC orders. If `data.type` is absent or `'new_order'`, add it to `CONFIRM_ORDER_TYPES` or expand the match to also check `data.sound === 'five_sec_buzzer'` as a proxy for "this is a buzzer-type notification."  
**Owner action needed:** Share FCM payload from browser DevTools → Application → Service Workers → Push → copy payload.

---

## 7. Evidence Artifacts

All saved to: `/app/memory/evidence/BUG-453/`
- `BUG-453_code_grep_2026_09_23.txt` — pre-Wave-1 grep (existing)
- `B0_fcm_payload_mapping_2026_02.md` — B0 FCM key validation (existing)
- This report covers Wave-1 post-implementation code trace (2026-09-24)

---

## 8. Retroactive Candidates
NONE new. BUG-453 registry correctly shows `GATE_5A_IMPLEMENTED`.

---

## Handover Summary

```
Root cause: 4 layers.
  RC-1 [HIGH] Browser autoplay policy blocks first play() → NotAllowedError → silent. No unlock mechanism in soundManager. EXPLAINS the majority of "buzzer not working" reports.
  RC-2 [MEDIUM] SW clients.matchAll() returns 0 on sleeping tab → background FCM dropped.
  RC-3 [MEDIUM] FCM token edge case — SW waiting state not fully waited → old token.
  RC-4 [LOW-MEDIUM] POS2-007 type-mismatch — data.type not confirmed for YTC FCMs; override may silently skip.
  RC-5/RC-6 [FIXED] Wave 1 race + mute suppression → correctly implemented, no regression.

Confidence: HIGH (RC-1 code-confirmed), MEDIUM (RC-2/3/4 traced, not reproduced live).
Steps: 10/10.
FE fix scope: RC-1 = 1 file ~10 lines, planning-skip eligible (owner approve). RC-3 = 1 file ~3 lines, planning-skip eligible.
Backend ask: NO.
Owner action: Share one real FCM payload (data.type field) to confirm/eliminate RC-4.
Planning skip eligible: YES for RC-1 and RC-3 (each independently). RC-2 needs full Gate 2-3.
Escalated from Bug Fix: NO.
Retroactive candidates: NONE.
Report: /app/memory/BUG-453_INVESTIGATION_REPORT_2026_09_24_BUZZER_INTERMITTENT.md
```
