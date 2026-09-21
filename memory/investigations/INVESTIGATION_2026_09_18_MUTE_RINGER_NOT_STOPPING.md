# INVESTIGATION REPORT — Mute Button Does Not Stop Ringer (ScanOrderPopOut)

**ID:** INV-MUTE-RINGER-001  
**Date:** 2026-09-18  
**Role:** INVESTIGATION (ALPHA v0.7)  
**Triggered by:** Owner — "Scan & Order pop-up has a Mute button on the order. When I click Mute, the ringer is not stopping."  
**Steps used:** 8 / 10  

---

## 1. Summary

| Field | Value |
|---|---|
| Root cause | `soundManager.stop()` correctly stops the CURRENT audio instance. But the backend sends **repeated FCM push notifications** for every unconfirmed YTC order. Each new FCM fires `NotificationContext.processNotification()` → `soundManager.play()` — with **no check against `snoozedOrders`**. Mute stops the sound for this instant; the ringer restarts on the next FCM push, seconds later. |
| Classification | **FE_BUG** (gap in cross-context wiring) + design anti-rule conflict |
| Confidence | **HIGH** — full chain traced |
| Risk | **MEDIUM** — touches NotificationContext (sound/FCM pipeline) |
| Planning skip eligible | **NO** — touches NotificationContext + DashboardPage, cross-context wiring |
| Steps used | 8 / 10 |

---

## 2. Hypotheses Tested

| # | Hypothesis | Result |
|---|---|---|
| H1 | `soundManager.stop()` is completely broken | **ELIMINATED** — `stop()` logic is correct when `currentAudio` is set |
| H2 | Backend retries FCM → NotificationContext re-plays sound with no snooze check | **CONFIRMED — SECONDARY (why it repeats after each stop)** |
| H3 | Mute sets visual flag only — `snoozedOrders` never reaches NotificationContext | **CONFIRMED — MECHANISM** |
| H4 | `play().catch()` and `error` handlers blindly null `currentAudio` without guard — orphans a playing audio, making `stop()` a no-op | **CONFIRMED — PRIMARY ROOT CAUSE (why Mute does not stop the current sound)** |

---

## 3. Primary Root Cause — soundManager.js Race Condition

```javascript
// LINE 68-72: ended event — CORRECT (has guard)
audio.addEventListener('ended', () => {
  if (this.currentAudio === audio) {    // ← guards against stale reference
    this.currentAudio = null;
  }
});

// LINE 74-77: error event — BROKEN (no guard)
audio.addEventListener('error', (e) => {
  this.currentAudio = null;             // ← blindly nullifies any currentAudio
});

// LINE 80-83: play().catch — BROKEN (no guard)
audio.play().catch((err) => {
  this.currentAudio = null;             // ← blindly nullifies any currentAudio
});
```

**Race condition when two FCM notifications arrive in rapid succession:**

```
1. FCM-1 → play() → audio1 = cloneNode() → this.currentAudio = audio1
           → audio1.play() [async, promise PENDING]

2. FCM-2 arrives immediately
   → play() → this.stop() → audio1.pause() [interrupts pending play promise]
   → this.currentAudio = null → audio2 = cloneNode()
   → this.currentAudio = audio2          ← audio2 now tracked
   → audio2.play() [starts — RINGER HEARD]

3. audio1.play() promise rejects (AbortError — was interrupted by pause)
   → catch(err) → this.currentAudio = null  ← WIPES audio2 reference!

4. this.currentAudio = null
   audio2 is still playing — orphaned, untracked

5. Cashier clicks Mute
   → soundManager.stop()
   → if (this.currentAudio) → FALSE  ← null
   → NO-OP — audio2 keeps playing ← BUG
```

**Fix (1 file, 2 lines):** Add the same guard as the `ended` handler:
```javascript
// error handler — add guard
if (this.currentAudio === audio) this.currentAudio = null;

// play().catch — add guard
if (this.currentAudio === audio) this.currentAudio = null;
```

---

## 4. Full Data Flow Trace

### Sound start path (FCM arrives)
```
Backend Firebase server
  → FCM push notification (repeated every ~30-60s for unconfirmed YTC orders)
  
Path A: App in foreground
  → onForegroundMessage (firebase.js)
  → NotificationContext.processNotification()
  → isConfirmOrderNotification() → TRUE
  → soundManager.play('confirm_order' | 'five_sec_buzzer' | 'forty_five_sec_buzzer')
  → this.stop() → this.currentAudio = cloneNode() → audio.play()
  → RINGER STARTS

Path B: App in background / tab not focused
  → Firebase Service Worker (firebase-messaging-sw.js:29)
  → onBackgroundMessage → client.postMessage({ type: 'BACKGROUND_NOTIFICATION' })
  → NotificationContext handleSWMessage
  → processNotification() → soundManager.play()
  → RINGER STARTS
```

### Mute click path
```
Cashier clicks Mute button (ScanOrderPopOut.jsx:593)
  → handleSnoozeClick(orderId)
      → soundManager.stop()             ← pauses currentAudio + sets to null ✅
      → onToggleSnooze(String(orderId)) ← adds orderId to snoozedOrders Set

toggleSnooze in DashboardPage (line 1280):
  → setSnoozedOrders(Set.add(orderId))  ← visual snooze state ONLY
  → snoozedOrders used by:
      (a) ScanOrderPopOut — show BellOff icon ✅
      (b) OrderCard — dim the card ✅
      (c) NotificationContext — NOT CONNECTED ❌
```

### Why ringer restarts (30-60 seconds later)
```
Backend retries FCM push for the same unconfirmed order
  → processNotification() fires
  → soundManager.play(resolvedSound)
                         ↑
         NO check against snoozedOrders here
         NotificationContext has no knowledge of mute state
  → RINGER STARTS AGAIN ❌
```

---

## 4. The Explicit Anti-Rule That Locked In This Gap

`ScanOrderPopOut.jsx` lines 23–28 contain an owner-locked anti-rule from Jan-2026:

```
// Strict anti-rules:
//   - soundManager import is allowed ONLY for soundManager.stop() inside
//     handleSnoozeClick. NO soundManager.setEnabled(). NO global mute.
//     NO per-order mute. NO future-sound suppression.
```

**Translation:** At the time this was written, the design intentionally did NOT suppress future sounds after Mute. The Mute was designed only to stop the current playing chime — not to silence future FCM pushes for that order.

**This anti-rule is now the root of the bug** — the expected UX (Mute = silence this order's ringer going forward) does not match the implementation (Mute = stop this one playing instance only).

---

## 5. Why `soundManager.stop()` Alone Is Not Enough — Two Scenarios

### Scenario A — Sound still playing when Mute is clicked
```
soundManager.stop() called
  → this.currentAudio is not null → pause() fires → SOUND STOPS ✅

(30 seconds later — backend retries FCM)
  → processNotification() → soundManager.play() → SOUND STARTS AGAIN ❌
```

### Scenario B — Sound has already ended before Mute is clicked
```
confirm_order.wav (short clip ~2-3s) plays and ends naturally
  → ended event fires → this.currentAudio = null

Cashier clicks Mute (sound already finished)
  → soundManager.stop()
  → if (this.currentAudio) → FALSE ← null reference
  → NO-OP: nothing paused, nothing stopped

(FCM retry arrives shortly after)
  → processNotification() → soundManager.play() → SOUND STARTS AGAIN ❌
Cashier perception: "I muted it, it didn't stop" — but sound was already done
```

**Scenario B is the more dangerous case.** Mute is a complete no-op. The cashier believes they muted the ringer, but the click did nothing because the short clip had already finished. The next FCM fires and the sound restarts — reinforcing the perception that Mute is broken.

**Root gap is identical in both scenarios:** `onToggleSnooze` puts the orderId in a Set that `NotificationContext` never reads. The next FCM push plays sound regardless of mute state.

---

## 6. Evidence References

```
ScanOrderPopOut.jsx:191-207   handleSnoozeClick — stop() + onToggleSnooze()
ScanOrderPopOut.jsx:23-28     Anti-rule: "NO future-sound suppression"
DashboardPage.jsx:1280-1290   toggleSnooze — only adds to snoozedOrders Set
DashboardPage.jsx:459          snoozedOrders = useState(new Set()) — no FCM link
NotificationContext.jsx:132-135 soundManager.play() — no snooze check
NotificationContext.jsx:176-182 SW forwarded messages also trigger play()
firebase-messaging-sw.js:29-57  Service Worker sends BACKGROUND_NOTIFICATION
soundManager.js:89-95          stop() — correct implementation
soundManager.js:45-84          play() — no per-order suppression gate
```

---

## 7. What Needs to Change (Recommendation — for Planning)

The fix needs to bridge the gap between the `snoozedOrders` Set (DashboardPage) and `NotificationContext`'s `processNotification()`. Options:

**Option A — Temporary mute window in soundManager (simplest)**
Add a `muteUntil` timestamp to `soundManager`. When Mute is clicked, set `soundManager.muteUntil = Date.now() + N_minutes`. In `play()`, check `Date.now() < this.muteUntil → return`. No cross-context wiring needed. Reverts automatically after N minutes.

**Option B — Per-order mute set in soundManager**
Add a `mutedOrderIds = new Set()` to `soundManager`. When Mute is clicked, `soundManager.muteOrder(orderId)`. In `NotificationContext.processNotification()`, extract `orderId` from FCM data and check against set before calling `play()`. Clears when order leaves YTC queue.

**Option C — Expose `setSoundEnabled` gate through snooze callback**
When Mute is clicked, temporarily set `soundEnabled = false` in `NotificationContext` (via a callback). Auto-restore after 2 minutes. Global mute — all sounds stopped, not just this order.

| Option | Surgical? | Anti-rule conflict | Files | R5? |
|---|---|---|---|---|
| A | YES — time-based, no order tracking | Minimal — soundManager only | `soundManager.js`, `ScanOrderPopOut.jsx` | NO |
| B | YES — per-order | Updates anti-rule (owner must approve) | `soundManager.js`, `NotificationContext.jsx`, `ScanOrderPopOut.jsx` | NO |
| C | NO — mutes all sounds | Updates anti-rule (owner must approve) | `NotificationContext.jsx`, `DashboardPage.jsx` | NO |

**Note:** Any fix requires the owner to explicitly override the Jan-2026 anti-rule "NO future-sound suppression" in `ScanOrderPopOut.jsx`. The anti-rule must be updated before implementation.

---

## 8. Owner Decisions Needed

| # | Decision |
|---|---|
| OD-1 | Fix only the immediate stop bug (soundManager.js — 2 lines, planning-skip eligible)? OR also fix the FCM retry path (NotificationContext — separate gate)? |
| OD-2 | Override the Jan-2026 anti-rule "NO future-sound suppression" to allow future FCM sound suppression per snoozed order? |

---

## 9. Duplicate Check

NONE — no prior registration for Mute/ringer issue in BUG_TRACKER.

---

```
Root cause (PRIMARY):  CODE_ERROR — soundManager.js lines 76 + 82
  play().catch() and error event handler blindly set this.currentAudio = null
  without checking if (this.currentAudio === audio).
  When two FCM pushes arrive rapidly, audio1's AbortError catch wipes the
  audio2 reference → soundManager.stop() becomes a no-op → Mute does nothing.
  Fix: add same guard as ended handler (1 file, 2 lines).

Root cause (SECONDARY): FE_BUG — NotificationContext has no snooze check.
  FCM retries fire play() again after Mute. snoozedOrders never reaches
  NotificationContext. Mute stops current sound but next FCM restarts it.

Classification: CODE_ERROR (primary) + FE_BUG (secondary)
Confidence:    HIGH
Planning skip: YES for primary fix (soundManager.js only, 2 lines, not R5)
               Owner approval required
Owner decisions:
  OD-1: Fix primary only OR primary + secondary?
  OD-2: Override Jan-2026 anti-rule for secondary fix?
Status:        INVESTIGATION CLOSED → Gate 2 (PLANNING)
Report:        /app/memory/investigations/INVESTIGATION_2026_09_18_MUTE_RINGER_NOT_STOPPING.md
```
