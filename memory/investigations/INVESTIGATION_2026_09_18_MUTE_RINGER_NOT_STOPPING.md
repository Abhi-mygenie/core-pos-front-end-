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
| H1 | `soundManager.stop()` is broken — doesn't pause the Audio object | **ELIMINATED** — `stop()` correctly calls `pause()` + `currentTime = 0` + `null`. Works as intended |
| H2 | Backend retries FCM for unconfirmed orders → `NotificationContext` re-plays sound after `stop()` — no snooze check | **CONFIRMED — PRIMARY ROOT CAUSE** |
| H3 | Mute sets a visual flag only — `snoozedOrders` never reaches `NotificationContext` | **CONFIRMED — MECHANISM** |
| H4 | Multiple Audio instances created simultaneously — stop() kills only one | **ELIMINATED** — `play()` calls `stop()` before creating new instance; only one `currentAudio` at a time |

---

## 3. Full Data Flow Trace

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

## 5. Why `soundManager.stop()` Alone Is Not Enough

```
soundManager.currentAudio = [playing forty_five_sec_buzzer instance]

Mute clicked:
  stop() → currentAudio.pause() → currentAudio = null ✅

(30 seconds pass — backend retries FCM)

NotificationContext.processNotification():
  soundManager.play('forty_five_sec_buzzer')
    → stop()          ← no-op (currentAudio is null)
    → audio = cloneNode()
    → this.currentAudio = audio
    → audio.play()    ← RINGER STARTS AGAIN ❌
```

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
| OD-1 | Override the Jan-2026 anti-rule? Current rule says "NO future-sound suppression." Owner must explicitly approve changing this before any fix is implemented. |
| OD-2 | Which option? A (time-based mute window — e.g., 2 min) · B (per-order mute) · C (global mute toggle) |
| OD-3 | For Option A: how long should the mute window last? (suggested: 2 minutes — matches original snooze duration) |

---

## 9. Duplicate Check

NONE — no prior registration for Mute/ringer issue in BUG_TRACKER.

---

```
Root cause:    FE_BUG — soundManager.stop() correctly stops current audio.
               But backend retries FCM every ~30-60s for unconfirmed YTC orders.
               NotificationContext.processNotification() has no snooze check
               → plays sound again on every retry.
               snoozedOrders Set never reaches NotificationContext.
               Jan-2026 anti-rule "NO future-sound suppression" locks in the gap.
Classification: FE_BUG
Confidence:    HIGH — full chain traced
Planning skip: NO — cross-context wiring (NotificationContext + soundManager)
Owner decisions:
  OD-1: Override the Jan-2026 anti-rule? (REQUIRED before any fix)
  OD-2: Fix approach — A (time window) / B (per-order) / C (global toggle)
  OD-3: Mute duration if Option A (suggested 2 min)
Status:        INVESTIGATION CLOSED → next: Owner OD-1 answer → Gate 2 (PLANNING)
Report:        /app/memory/investigations/INVESTIGATION_2026_09_18_MUTE_RINGER_NOT_STOPPING.md
```
