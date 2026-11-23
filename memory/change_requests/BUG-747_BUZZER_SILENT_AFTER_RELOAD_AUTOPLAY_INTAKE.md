# BUG-747 — Buzzer Silent After Page Reload Until Relogin (audio autoplay not re-unlocked)

**Registered:** 2026-11-23
**Type:** BUG
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE
**Client:** The Goan Kitchen (restaurant id 69)
**Assignee:** Abhishek (auto-routed — Area = Aggregator/Sockets, frontend, not backend-blocked)

---

## 1. Description

After the operator logs in, order buzzers ring correctly. But after a **browser page reload**
(not a relogin), the buzzer **never rings again until the operator logs in again** — even though the
order itself still arrives and shows on the dashboard.

**Current behaviour:**
- Login → order arrives → buzzer rings ✅
- Reload page → order arrives, popup/order shows, but **no buzzer** ❌
- Relogin → buzzer rings again ✅

**Expected behaviour:** the buzzer should ring for orders after a reload without requiring a relogin.

---

## 2. Classification

- **Type:** BUG
- **Severity:** P0 — Critical (owner-set 2026-11-23; agent had proposed P1). Rationale (owner): core order
  alerting is broken on every reload and the only workaround is to log in again.
- **Risk:** HIGH — audio/notification hotspot (`soundManager.js`, notification pipeline) + a top-level
  user-gesture listener. Not financial, but realtime alerting.
- **Area:** Aggregator / Sockets (FCM notifications / buzzer)
- **Fast Lane:** NOT eligible (notification/audio pipeline; >1 file; provider/top-level listener)

---

## 3. Duplicate Check

- BUG-676 (scan edit — no ringer/popup): RELATED, different (edit-order detection, not reload).
- BUG-600 (aggregator buzzer tone): RELATED, different (which tone plays).
- BUG-560 (Firebase messaging unsupported guard): RELATED, different.
- BUG-453 (mute does not stop ringer): RELATED, different (mute).
- CR-440 (sound notification toggle): RELATED, different (kill switch).
- **Result: DISTINCT** (RELATED to the buzzer cluster above; investigation INV-BUZZER-20261123).

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-23), two console screenshots provided in chat.
- **Confidence:** CONFIRMED.
- Screenshot 1 (/dashboard after reload): FCM foreground payload received and
  `[Notification] Playing sound: forty_five_sec_buzzer` logged (NotificationContext.jsx:190), followed by a
  red `forty_five_sec_buzzer.wav` error — `audio.play()` attempted but blocked. Proves delivery is fine;
  the ring is suppressed by the browser autoplay policy.
- Full analysis: `/app/memory/investigations/INV-BUZZER-20261123_INVESTIGATION_REPORT.md` (§0 round 2).
- Evidence folder: `/app/memory/evidence/BUG-747/`.

---

## 5. Root Cause (confirmed — INV-BUZZER-20261123)

The buzzer only becomes audible after a **user gesture** grants the document sticky activation. The reliable
gesture is the **LOG IN button click**, which activates the SPA document so later `audio.play()` calls are
allowed for that document's lifetime. A **hard reload creates a fresh document with no activation**, so FCM
messages still arrive and `soundManager.play()` still runs, but `audio.play()` is rejected → silence.
Confirmed in code: `soundManager.unlock()` is wired ONLY to the Settings "Enable Audio" button; nothing
auto-unlocks on login, app boot, or first interaction; `isUnlocked` is in-memory and resets on every load.

---

## 6. Blast Radius

- `src/utils/soundManager.js` — expose/ensure unlock path.
- top-level listener (likely `src/App.js` or a provider) — call `soundManager.unlock()` on first
  `pointerdown`/`click`/`keydown` after any load (one-time).
- (optional) a persistent "🔇 Sound off — tap to enable" prompt when `audio.play()` is blocked.
- grep: `unlock` referenced in 2 files today (soundManager.js + NotificationTester.jsx).
- **Estimated scope:** SMALL–MEDIUM (1–3 files). Hotspots: notification/audio — YES.

---

## 7. Open Questions

- OD-747-01: Auto-unlock silently on first gesture, OR show an explicit "tap to enable sound" prompt, or both?
- OD-747-02: Should unlock also re-assert on tab visibility regain (backgrounded PWA)?

---

## 8. Related

- INV-BUZZER-20261123 (investigation)
- CR-562 (FCM token refresh on reload — complementary)
- BUG-676, BUG-600, BUG-560, BUG-453, CR-440
- `src/utils/soundManager.js`, `src/contexts/NotificationContext.jsx`
