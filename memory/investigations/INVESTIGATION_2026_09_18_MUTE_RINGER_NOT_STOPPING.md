# INVESTIGATION REPORT — Mute Button Does Not Stop Ringer (ScanOrderPopOut)

**ID:** INV-MUTE-RINGER-001
**Date:** 2026-09-18
**Role:** INVESTIGATION (ALPHA v0.7)
**Status:** CLOSED
**Triggered by:** Owner — "Scan & Order pop-up has a Mute button on the order level. When I click Mute, the ringer is not stopping. Sound is still playing."
**Steps used:** 10 / 10

---

## 1. Summary

| Field | Value |
|---|---|
| Root cause (Primary) | `CODE_ERROR` — `soundManager.js` `play().catch()` and `error` event handler both blindly set `this.currentAudio = null` without checking `if (this.currentAudio === audio)`. When two FCM notifications arrive in rapid succession, the AbortError catch from `audio1` wipes the reference to `audio2` — leaving `audio2` playing but untracked. `soundManager.stop()` then sees `null` and does nothing. Mute is a no-op. |
| Root cause (Secondary) | `FE_BUG` — Even when `stop()` does work, the backend retries FCM for every unconfirmed YTC order. `NotificationContext.processNotification()` calls `soundManager.play()` on every retry with no check against `snoozedOrders`. Sound restarts within seconds. |
| Classification | `CODE_ERROR` (primary) + `FE_BUG` (secondary) |
| Confidence | HIGH — full chain traced end-to-end |
| Risk | MEDIUM — touches `soundManager.js` + `NotificationContext.jsx` |
| Steps used | 10 / 10 |

---

## 2. Hypotheses Tested

| # | Hypothesis | Result |
|---|---|---|
| H1 | `soundManager.stop()` itself is broken — `pause()` doesn't work | ELIMINATED — `stop()` is correct when `this.currentAudio` is not null |
| H2 | `this.currentAudio` is null when Mute is clicked — `stop()` is a no-op | CONFIRMED — PRIMARY ROOT CAUSE — caused by blind null in `catch`/`error` handlers |
| H3 | FCM retries re-trigger `soundManager.play()` after a successful stop | CONFIRMED — SECONDARY ROOT CAUSE |
| H4 | `snoozedOrders` Set is not connected to `NotificationContext` | CONFIRMED — MECHANISM of secondary |
| H5 | Multiple Audio instances playing simultaneously | ELIMINATED — `play()` calls `stop()` before creating new instance |

---

## 3. Primary Root Cause — Race Condition in `soundManager.js`

**File:** `src/utils/soundManager.js`

The `ended` event handler (line 68) correctly checks identity before nullifying:

```javascript
audio.addEventListener('ended', () => {
  if (this.currentAudio === audio) {   // ✅ CORRECT — guards stale reference
    this.currentAudio = null;
  }
});
```

But the `error` event handler (line 74) and `play().catch()` (line 80) do NOT:

```javascript
audio.addEventListener('error', (e) => {
  console.error('[SoundManager] Playback error for', soundKey, e);
  this.currentAudio = null;            // ❌ BROKEN — blindly nullifies
});

this.currentAudio = audio;
audio.play().catch((err) => {
  console.warn('[SoundManager] Play blocked:', err.message);
  this.currentAudio = null;            // ❌ BROKEN — blindly nullifies
});
```

### Exact Race Condition Sequence

```
Step 1: FCM notification 1 arrives
  → NotificationContext.processNotification()
  → soundManager.play('confirm_order')
  → this.stop()           (no-op — nothing playing yet)
  → audio1 = cloneNode()
  → this.currentAudio = audio1
  → audio1.play()         ← async Promise, still PENDING

Step 2: FCM notification 2 arrives within milliseconds
  (backend sends rapid retries for unconfirmed YTC orders)
  → soundManager.play('confirm_order')
  → this.stop()
      → audio1.pause()    ← interrupts the PENDING play() Promise
      → this.currentAudio = null
  → audio2 = cloneNode()
  → this.currentAudio = audio2         ← audio2 now tracked ✅
  → audio2.play()                      ← audio2 starts — RINGER HEARD

Step 3: audio1.play() Promise rejects (AbortError — interrupted by pause in Step 2)
  → catch(err) → this.currentAudio = null  ← WIPES audio2 reference ❌

Step 4: State after Step 3
  → this.currentAudio = null
  → audio2 is still playing (nobody paused it)
  → soundManager has lost track of audio2

Step 5: Cashier clicks Mute
  → handleSnoozeClick → soundManager.stop()
  → if (this.currentAudio) → FALSE  ← null
  → NO-OP
  → audio2 keeps playing
  → RINGER DOES NOT STOP ← BUG VISIBLE HERE
```

### Why This Happens Specifically for YTC / Scan & Order

YTC orders are unconfirmed scan orders. The backend sends repeated FCM push notifications for every order that remains unconfirmed — the retry interval can be seconds. Two notifications arriving within ~100ms of each other is sufficient to trigger this race. This makes the bug specific and reproducible for busy restaurants with multiple incoming web orders.

---

## 4. Secondary Root Cause — FCM Retry Plays Sound After Successful Stop

**File:** `src/contexts/NotificationContext.jsx`

Even when Step 5 above does successfully pause `currentAudio` (e.g., if the race doesn't occur), the sound restarts on the next FCM retry:

```
Mute clicked → soundManager.stop() → audio paused ✅
               onToggleSnooze(orderId) → snoozedOrders.add(orderId) (DashboardPage)

(30-60 seconds later — backend retries FCM for same unconfirmed order)

NotificationContext.processNotification()
  → soundManager.play(resolvedSound)   ← NO check against snoozedOrders
  → RINGER STARTS AGAIN ❌
```

`snoozedOrders` is a `Set` in `DashboardPage.jsx:459`. It is passed to:
- `ScanOrderPopOut` — to show BellOff/Bell icon (visual only)
- `OrderCard` — to dim the card (visual only)
- `NotificationContext` — **NOT PASSED. Never connected.**

`NotificationContext` has no knowledge of which orders are snoozed. Every incoming FCM notification — for any order — plays sound unconditionally.

---

## 5. Anti-Rule That Locked In the Secondary Gap

`ScanOrderPopOut.jsx` lines 23–28 (owner decision, Jan-2026):

```
// Strict anti-rules:
//   NO soundManager.play(). NO soundManager.setEnabled(). NO global mute.
//   NO per-order mute. NO future-sound suppression.
```

This rule was written to prevent the pop-out from controlling sound beyond stopping the current chime. The secondary gap — no FCM-retry suppression after Mute — is a consequence of this rule. The Mute button was designed only to stop the current playing instance, not prevent future FCM-triggered sounds.

---

## 6. Data Flow — Complete Picture

```
SOUND START PATH
  Backend Firebase → FCM push (repeated per unconfirmed YTC order)
    ↓
  Path A (app foreground): onForegroundMessage → processNotification()
  Path B (app background): ServiceWorker → postMessage BACKGROUND_NOTIFICATION
                           → NotificationContext handleSWMessage → processNotification()
    ↓
  processNotification()
    → dedup check (2-second window only — does NOT check snoozedOrders)
    → soundManager.play(resolvedSound)
    → RINGER STARTS

MUTE PATH
  Cashier clicks Mute button (ScanOrderPopOut.jsx:593)
    → handleSnoozeClick(orderId)
    → soundManager.stop()     ← may be NO-OP if currentAudio was nullified (primary bug)
    → onToggleSnooze(orderId) ← visual/card dimming only, not connected to NotificationContext
```

---

## 7. Evidence — Files and Lines

| File | Line(s) | Finding |
|---|---|---|
| `src/utils/soundManager.js` | 68–72 | `ended` handler — CORRECT, has `if (this.currentAudio === audio)` guard |
| `src/utils/soundManager.js` | 74–77 | `error` handler — BROKEN, blindly sets `this.currentAudio = null` |
| `src/utils/soundManager.js` | 79–83 | `play().catch()` — BROKEN, blindly sets `this.currentAudio = null` |
| `src/utils/soundManager.js` | 89–95 | `stop()` — correct; only fails when `currentAudio` is null |
| `src/contexts/NotificationContext.jsx` | 132–135 | `soundManager.play()` called on every FCM — no snooze check |
| `src/contexts/NotificationContext.jsx` | 176–182 | SW forwarded messages also trigger `play()` |
| `src/components/dashboard/ScanOrderPopOut.jsx` | 191–207 | `handleSnoozeClick` — calls `stop()` + `onToggleSnooze` |
| `src/components/dashboard/ScanOrderPopOut.jsx` | 23–28 | Anti-rule: "NO future-sound suppression" (Jan-2026) |
| `src/pages/DashboardPage.jsx` | 459 | `snoozedOrders = useState(new Set())` — never passed to NotificationContext |
| `src/pages/DashboardPage.jsx` | 1280–1290 | `toggleSnooze` — adds/removes from Set, nothing more |
| `public/firebase-messaging-sw.js` | 29–57 | SW shows native notification + forwards to client via postMessage |

---

## 8. Recommendations for Planning

### Fix A — Primary (planning-skip eligible)
**File:** `src/utils/soundManager.js`
**Lines:** 76 and 82
**Change:** Add `if (this.currentAudio === audio)` guard to `error` event handler and `play().catch()` — matching the existing guard on the `ended` handler.
**Risk:** LOW
**R5 hotspot:** NO
**Files:** 1
**Lines changed:** 2
**Planning skip:** YES — requires owner approval

### Fix B — Secondary (full gate cycle)
**Files:** `src/utils/soundManager.js` + `src/contexts/NotificationContext.jsx`
**Change:** Add a mechanism (time-based mute window OR per-order mute set) so that after Mute is clicked, subsequent FCM retries for that order do not trigger `soundManager.play()`.
**Risk:** MEDIUM — touches FCM/notification pipeline
**R5 hotspot:** NO
**Planning skip:** NO — two files, cross-context wiring, requires Jan-2026 anti-rule override

---

## 9. Owner Decisions Needed

| # | Decision |
|---|---|
| OD-1 | Proceed with Fix A only (immediate stop works, restarts on FCM retry)? Or Fix A + Fix B together? |
| OD-2 | Fix B requires overriding the Jan-2026 anti-rule "NO future-sound suppression" in `ScanOrderPopOut.jsx`. Approve override? |
| OD-3 | If Fix B approved — approach: time-based mute window (e.g., 2 min) OR per-order mute set? |

---

## 10. Duplicate Check

NONE — no prior registration in BUG_TRACKER for this symptom.

---

```
ID:             INV-MUTE-RINGER-001
Status:         CLOSED — 2026-09-18
Root cause (primary):
  CODE_ERROR — soundManager.js lines 76 + 82
  play().catch() and error event blindly set this.currentAudio = null
  without checking if (this.currentAudio === audio).
  Rapid FCM retries trigger a race: audio1 AbortError catch wipes audio2
  reference → stop() is a no-op → ringer keeps playing.

Root cause (secondary):
  FE_BUG — NotificationContext.processNotification() calls soundManager.play()
  on every FCM with no snooze check. snoozedOrders Set (DashboardPage) is
  never connected to NotificationContext. Sound restarts on every FCM retry.

Classification:   CODE_ERROR (primary) + FE_BUG (secondary)
Confidence:       HIGH
Fix A (primary):  soundManager.js — 2 lines — planning-skip eligible (owner approval)
Fix B (secondary): soundManager.js + NotificationContext.jsx — full gate cycle
Owner decisions:  OD-1 (scope), OD-2 (anti-rule override), OD-3 (B approach)
Next:             Gate 2 Impact Analysis (PLANNING role) after owner OD answers
Report:           /app/memory/investigations/INVESTIGATION_2026_09_18_MUTE_RINGER_NOT_STOPPING.md
```
