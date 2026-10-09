# BUG-453 — IMPACT ANALYSIS (Gate 2) — Mute does not stop ringer (soundManager race) + per-order mute toggle for FCM retries

**Date:** 2026-09-23 · **Role:** PLANNING (ALPHA v0.7) — Stage: Impact Analysis ONLY · **Sprint:** `sep_bug_closure`
**Code Reality:** NONE — `soundManager.js:76/82` still blind-null; no mute registry; `NotificationContext.jsx:134` plays unconditionally (HEAD `1be4055`, `evidence/BUG-453/BUG-453_code_grep_2026_09_23.txt`)
**Conflict Pre-Check:** `soundManager.js` — no FILE_OWNERSHIP entry since creation; `NotificationContext.jsx` — last POS2-007 (confirm-order tone override, May-2026), BUG-034 (dedup); `ScanOrderPopOut.jsx` — last BUG-122-POST (isWebOrder gate), CR SNOOZE_SOUND_STOP_AND_DURATION (Jan-2026); `DashboardPage.jsx` — last CR-385-era items touch PMS only; BUG-452 (this sprint) touches `DashboardPage.jsx` cart handlers (L1504–1520, L2069–2070) — **different lines from `toggleSnooze` L1280–1290 → parallel-safe**, sequence BUG-453 before/after BUG-452 either way. No open registry item on these files. **No conflict.**
**Risk:** MEDIUM (notification pipeline, component state; not financial; `DashboardPage.jsx` R5 touched for ≤ 3 lines in `toggleSnooze`)
**Intake:** `change_requests/BUG-453_MUTE_DOES_NOT_STOP_RINGER_INTAKE.md` · ODs all LOCKED (Fix A+B one bug · anti-rule override approved · per-order manual mute toggle, no timer · **OD-453-04 (2026-09-24): mute = sound + toast**)
**Gate 2 status:** **CLOSED 2026-09-24 (owner)** — Q1 answered "Sound + toast" → OD-453-04 LOCKED; §2/§3/§4/§6/§7 patched below. Gate 3 NOT started (owner: "do not start gate 3").

---

## 1. Data flow trace

```
SOUND START
  Firebase → FCM (repeated per unconfirmed YTC order)
    Path A foreground:  onForegroundMessage → processNotificationRef (NotificationContext.jsx:172)
    Path B background:  firebase-messaging-sw.js → postMessage BACKGROUND_NOTIFICATION → handleSWMessage (:175–181)
  processNotification(payload)  (:70–158)
    data.order_id ─┐ dedup key (BUG-034, 2 s window)            :86–93
    resolvedSound  │ = data.sound || inferSoundFromContent       :96–97
    POS2-007 tone override (confirm-order only)                  :115–125
    ► soundManager.play(resolvedSound)                            :132–135   ← BREAK POINT B: no per-order mute check
    if 'silent' return                                            :138
    notifications[] += { orderId: data.order_id || data.orderId } :140–152

soundManager.play(key)  (soundManager.js:47–84)
    if !isEnabled return   (Sidebar Silent Mode)                  :48
    this.stop()                                                   :61
    audio = cache.cloneNode()                                     :64–66
    'ended'  → guarded null                                       :68–72
    'error'  → this.currentAudio = null   ← BREAK POINT A1 (unguarded)   :74–77
    this.currentAudio = audio; audio.play().catch(→ null)  ← BREAK POINT A2 (unguarded) :79–83

MUTE
  ScanOrderPopOut Mute button → handleSnoozeClick(orderId)  (ScanOrderPopOut.jsx:191–207)
    soundManager.stop()   (no-op when currentAudio wiped by A1/A2)
    onToggleSnooze(String(orderId)) → DashboardPage.toggleSnooze  (:1280–1290) → snoozedOrders Set add/remove
  snoozedOrders consumers: OrderListSection/OrderCard isSnoozed (:146, :1915), TableCard (:1964), ScanOrderPopOut (:1670, :1807) — VISUAL ONLY
  NotificationContext: never sees snoozedOrders
```

## 2. Design for Fix B — where the mute registry lives (Planning recommendation)

| Option | Where | Wiring | Pros | Cons |
|---|---|---|---|---|
| **B1 (recommended)** | **`soundManager` singleton** gains `mutedOrders = new Set()` + `muteOrder(id)`, `unmuteOrder(id)`, `toggleOrderMute(id)`, `isOrderMuted(id)`, `clearMutes()` | `DashboardPage.toggleSnooze` calls `soundManager.toggleOrderMute(String(orderId))` alongside the Set update (1 line); `NotificationContext.processNotification` checks `soundManager.isOrderMuted(String(data.order_id \|\| data.orderId))` before `play()` (2–3 lines); logout effect (:194–198) also `clearMutes()` (1 line) | No provider change (R7 safe), no new prop drilling, single source of truth for audio, unit-testable in isolation | Slight duplication of "snoozed" state (Set in DashboardPage for visuals + Set in soundManager for audio) — kept in sync by the single `toggleSnooze` call site |
| B2 | Pass `snoozedOrders` into `NotificationContext` via a ref bridge (like `utils/restaurantRef.js`) | New `utils/snoozeRef.js`; DashboardPage effect syncs the Set into the ref; NotificationContext reads it | One state | New bridge file, extra effect in R5 `DashboardPage.jsx`, same pattern POS2-008 plans to delete |
| B3 | Lift `snoozedOrders` into `NotificationContext` state | Move `useState(new Set())` from DashboardPage into the provider; expose `toggleSnooze` from context | Cleanest long-term | Touches every `snoozedOrders` consumer prop (5 sites), R5 + provider API change — over-scope for a bug |

**Recommendation: B1.** Smallest blast radius; the only R5 edit is one added line inside `toggleSnooze`.

**Semantics (OD-453-03, locked):**
- Mute press on order X → `stop()` (Fix A makes it reliable) **and** `muteOrder(X)`.
- Any later FCM whose `data.order_id` (or `orderId`) === X → **`processNotification` returns early right after the mute check: no `play()`, no `notifications[]` entry → no banner/toast** (OD-453-04, owner 2026-09-24 "Sound + toast"). Log line `[Notification] Muted order X — sound + toast suppressed`. **Code fact (verified 2026-09-24):** `notifications[]` has exactly one UI consumer — `components/layout/NotificationBanner.jsx:66` (the top banner/toast). There is no separate bell/notification-list screen, so "suppress toast" = skip the list push; nothing else to filter. Dedup refs (`lastNotifKeyRef/TimeRef`) are still updated before the mute check → BUG-034 unchanged.
- Press again → `unmuteOrder(X)` → next FCM rings. No timer, no auto-clear on confirm (confirmed orders stop being retried; stale Set entries are harmless and cleared on logout).
- Sidebar Silent Mode (`setEnabled(false)`) still wins globally.
- FCM without `order_id` → never muted (unchanged).
- Pop-out's local 2-minute re-pop hide-set (R-SNOOZE-9) is untouched — visual re-pop after 2 min while sound stays muted is **intended** ("mute till pressed again").

## 3. Files affected

| # | File | Change | Est. lines | Hotspot |
|---|---|---|---|---|
| 1 | `src/utils/soundManager.js` | **Fix A:** guard `error` (:76) and `play().catch` (:82) with `if (this.currentAudio === audio)`. **Fix B:** `mutedOrders` Set + 5 small methods; `stop()` unchanged | 2 + ~20 | NO |
| 2 | `src/contexts/NotificationContext.jsx` | Before `soundManager.play(resolvedSound)` (:132–135): derive `notifOrderId = String(data.order_id \|\| data.orderId \|\| '')`; `if (notifOrderId && soundManager.isOrderMuted(notifOrderId)) { console.log(...); return; }` — one early-return covers sound **and** toast (OD-453-04); logout effect `soundManager.clearMutes()` | ~5 | NO |
| 3 | `src/pages/DashboardPage.jsx` | `toggleSnooze` (:1280–1290): `+ soundManager.toggleOrderMute(String(orderId))` and `import soundManager` | 2 | **YES (R5)** — additive, no existing line changed |
| 4 | `src/components/dashboard/ScanOrderPopOut.jsx` | Header anti-rule comment (:22–27, :46–49): record owner override 2026-09-23 (per-order mute via `toggleSnooze`, still no `play()`/`setEnabled()` here). **No logic change** — `handleSnoozeClick` already calls `stop()` + `onToggleSnooze` | comments only | NO |
| 5 | `src/utils/__tests__/soundManager.bug453.test.js` | **NEW** — race test (two `play()` calls, first promise rejects → `currentAudio` still second audio → `stop()` pauses it); mute set toggle; `isOrderMuted` string-vs-number keys | ~60 | — |

**Files NOT touched:** `firebase-messaging-sw.js`, `AppProviders.jsx` (R7), `toneMapper.js`, `OrderCard.jsx`, `TableCard.jsx`, `useSocketEvents.js`, any service/transform.

## 4. Downstream consumers

| Consumer | Impact |
|---|---|
| Sidebar Silent Mode (`setEnabled`) | Unchanged precedence — `play()` early-returns first |
| POS2-007 confirm-order tone override | Runs before the mute check; muted order never reaches `play()` regardless of tone |
| BUG-034 dedup | Independent; mute check placed **after** dedup so muted notifications still update `lastNotifKeyRef` (no behaviour change for dedup) |
| `notifications[]` list / banner toast (`NotificationBanner.jsx`) | **Not populated for muted orders** (OD-453-04, owner 2026-09-24). Non-muted orders unchanged. `NotificationBanner.jsx` itself is NOT edited. |
| OrderCard / TableCard Bell icons (`isSnoozed`) | Same `toggleSnooze` → audio mute toggles together with the dim — consistent |
| Logout | `stop()` already at :196; add `clearMutes()` so next login on same device starts clean |
| Tests | Existing `soundManager` tests? — none found (`__tests__` grep) → new test file only |

## 5. Risks

| Risk | L | Mitigation |
|---|---|---|
| FCM `data.order_id` type/shape ≠ `order.orderId` used by cards (string vs number, or missing on some templates) | **MEDIUM** | **Validation step at Gate 3:** capture one real FCM payload on preprod (console log at :71 prints full payload) and confirm `order_id` equals the YTC card `orderId`; normalise both with `String()` |
| Backend sends a *different* order_id per retry (e.g. message id) | LOW | Same capture confirms; fallback = mute by `orderId` in `notifications[]` mapping |
| Guard in `error` handler hides a genuine playback failure for the *current* audio | LOW | Guard only skips the null when the erroring audio is not current — current-audio errors still null correctly |
| R5 `DashboardPage.jsx` edit | LOW | 1 additive line inside existing function; regression: snooze dim still toggles, walk-in flow untouched (R13) |
| Confidence of root cause = traced, not reproduced in browser | MEDIUM | Unit test reproduces the race deterministically (mock `HTMLMediaElement.play` to return a rejected promise for the first call) |

## 6. Owner decisions
All LOCKED. **OD-453-04 (Gate 2, 2026-09-24): muted order → sound AND toast suppressed** (owner: "Sound + toast"). Rationale walked through: the FCM retry for the same unconfirmed order re-fires every cycle; owner wants the muted order fully quiet until Mute is pressed again or the order is confirmed. Other orders unaffected.

## 7. Verification approach (seeds Gate 3 matrix)
1. Unit: race test → after first `play()` rejects, `stop()` pauses the second audio (Fix A).
2. Unit: `toggleOrderMute('123')` twice → muted → unmuted; `isOrderMuted(123)` (number) → true when muted via string.
3. Browser (preprod, alias `cafe103_no_rooms_postpaid_gst` or yabyum owner alias): trigger two YTC FCMs quickly (or DevTools → dispatch two `processNotification`) → Mute → silence **and no banner**; simulate retry → still silent, no banner; Mute again → rings + banner.
4. Sidebar Silent Mode ON → nothing plays regardless of mute set (banner still shows for non-muted orders — unchanged).
5. Logout → login → mute set empty.
6. Regression: OrderCard bell dim toggles; pop-out re-pops after 2 min (visual) without sound; normal (non-muted) orders still ring + banner; `yarn build` 0 new warnings.

## 8. Scope lock (for Gate 3)
WILL change: `soundManager.js`, `NotificationContext.jsx`, `DashboardPage.jsx` (+2 lines in `toggleSnooze`), `ScanOrderPopOut.jsx` (comments), new test file.
WILL NOT touch: `AppProviders.jsx`, `firebase-messaging-sw.js`, `OrderCard.jsx`, `TableCard.jsx`, socket hooks, services, transforms.

---
```
Impact Analysis complete: BUG-453
Code reality: NONE · Conflict: NONE (BUG-452 same file, different lines — parallel-safe) · Risk: MEDIUM
Files WILL change: utils/soundManager.js, contexts/NotificationContext.jsx, pages/DashboardPage.jsx (+2, R5), components/dashboard/ScanOrderPopOut.jsx (comments), utils/__tests__/soundManager.bug453.test.js (NEW)
Files WILL NOT touch: AppProviders.jsx, firebase-messaging-sw.js, OrderCard.jsx, TableCard.jsx, socket hooks
Owner decisions: ALL LOCKED — OD-453-04 (2026-09-24) mute = sound + toast (no notifications[] entry for muted order)
Validation step required at Gate 3: capture real FCM payload → confirm data.order_id == card orderId
GATE 2: CLOSED 2026-09-24 (owner). Gate 3 NOT started (owner instruction).
Next: Gate 3 Implementation Plan — only on owner "Gate 3 GO"
```
