# BUG-747 — Impact Analysis (Gate 2)

**Document:** impact/BUG-747_IMPACT_ANALYSIS.md
**Stage:** Impact Analysis (Gate 2) — PLANNING role (no code)
**Created:** 2026-11-23
**Type:** BUG · **Sprint:** nov_cr_batch · **Client:** The Goan Kitchen (rid 69) · **Assignee:** Abhishek
**Severity:** P0 (owner-set) · **Risk:** HIGH (notification/audio hotspot — confirmed, not upgraded)
**Scope (owner-confirmed 2026-11-23):** BUG-747 autoplay re-unlock ONLY. The "profile GET returns
the firebase token stored at login (stays GET)" idea is a **separate follow-up → CR-562**, to be looked
at after this reload fix lands. It is NOT part of this analysis.

---

## Header — Code Reality + Conflict Pre-Check

- **Code Reality: NONE.** `grep -rn "BUG-747"` across `src/**` → 0 markers. No partial implementation exists.
- **Conflict Pre-Check: CLEAN (parallel-safe).**
  - `src/utils/soundManager.js` — last modifier **BUG-453 IMPL 2026-09-24** (CLOSED). No OPEN item on this file.
  - `src/contexts/NotificationContext.jsx` — last modifiers **BUG-661 (F5)** + **BUG-453** (both done); **CR-440** CLOSED. No OPEN item.
  - `src/App.js` — heavily shared but additive-only (routes/imports); most recent CR-372-B. A one-time
    gesture-unlock mount would be additive and line-disjoint.
  - registry.json scan: the only non-closed item touching these files is **BUG-747 itself**. No conflict.
  - OPEN_GAPS_REGISTER: no audio/buzzer/autoplay gap open.

---

## 1. Problem (owner-reported, CONFIRMED)

After login, order buzzers ring. After a **browser page reload** (not a relogin) the buzzer **never rings
again until the operator logs in again**, even though the order still arrives and renders on the dashboard.

- Login → order arrives → buzzer rings ✅
- Reload → order arrives, popup/card shows, **no buzzer** ❌
- Relogin → buzzer rings again ✅

Evidence: console screenshot (`/dashboard` after reload) shows the FCM foreground payload received and
`[Notification] Playing sound: forty_five_sec_buzzer` logged, immediately followed by a red
`forty_five_sec_buzzer.wav` error → `audio.play()` was **attempted but rejected**. Delivery is fine; the
ring is suppressed by the browser autoplay policy. (INV-BUZZER-20261123 §0 round 2; evidence/BUG-747/.)

## 2. Root Cause (CONFIRMED — INV-BUZZER-20261123)

Browser autoplay policy only allows `audio.play()` after the document has **sticky user activation** (a user
gesture). Today the activating gesture is the **LOG IN button click** — it activates the SPA document, so for
the lifetime of *that* document every later `audio.play()` is allowed. A **hard reload creates a brand-new
document with no activation**, so FCM messages still arrive and `soundManager.play()` still runs, but
`audio.play()` is rejected → silence. Relogin "fixes" it only because clicking LOG IN is itself the gesture.

**Code confirmation:**
- `soundManager.unlock()` (`utils/soundManager.js:118`) plays a muted `silent.wav` to unlock autoplay, but it
  is wired to **exactly one** caller: the Settings → "Enable Audio" button (`NotificationTester.jsx:83`).
- **Nothing auto-unlocks** on login, app boot, or first interaction after a reload.
- `isUnlocked` (`soundManager.js:28`) is **in-memory** and resets to `false` on every page load.
- `LoginPage.jsx` does **not** call `soundManager.unlock()` — it relies implicitly on the click gesture;
  the SPA does not re-establish the unlock on a fresh (reloaded) document.

Classification: **FE_BUG** (client-side autoplay lifecycle). Not backend, not data, not config.

## 2b. NEW EVIDENCE (owner, 2026-11-23) — a SECOND, independent failure mode

Owner screenshot (`/settings` → Test Notifications, Event Log + DevTools console, device clock ~12:07 AM):

**Event Log (6, newest first):**
- `12:04:59` **unlock** ← owner manually unlocked audio (Settings "Enable Audio").
- `12:03:49` **received** #1579106 · foreground — "Confirm Order — Order has been confirmed."
- `12:03:42` **sound_ok** sound=forty_five_sec_buzzer
- `12:03:41` **banner_shown** #1579106 · foreground
- `12:03:41` **played** #1579106 sound=forty_five_sec_buzzer · foreground
- `12:03:41` **received** #1579106 · foreground — "Please confirm this order — Order ID: 000049 … dinein Table t1"

**Console at `12:06:55`** (AFTER the unlock) — a fresh test order:
`[Socket] Event received: new_order_69 … 1579106 … 'web'` → `[useSocketEvents] update-order 1579106` →
`[SocketHandler] update-order received / Transformed` → `[OrderContext] updateOrder 1579106` →
`[TableContext] updateTableStatus 9244 → occupied` → `setOrderEngaged … released from ENGAGED`.

**What this proves:** the new order at 12:06:55 arrived **only over the Socket.IO channel** — there is
**NO `received` (FCM payload) event** in the Event Log for it (last `received` was 12:03:49), and therefore
**no `played`/`sound_ok`** and **no ring** — even though audio was already unlocked at 12:04:59. The Event Log
legend confirms the semantics: **`received` = FCM payload reached this device**; **`played`/`sound_ok` = ring
fired**. Owner's words: "I have unlocked that … but I took a test order and still did not receive the FCM
payload on console and the ringer did not ring."

**Code-backed root cause of this second mode:** the ring is triggered **exclusively by FCM** —
`NotificationContext.jsx` `onForegroundMessage` (L238) → `processNotification` → `soundManager.play` (L195),
plus SW-forwarded background messages (L248). The **Socket.IO path never calls `soundManager.play`** (verified:
`grep soundManager` across `api/socket/**`, `AppSocketManager`, `hooks/**` → 0 play calls). So when the order
comes in on the socket but **no FCM push is delivered**, the ringer is never even invoked — unlock is irrelevant.

**Therefore there are TWO independent reload failure modes:**

| Mode | Symptom in logs | Trigger | Fix owner |
|------|-----------------|---------|-----------|
| **M1 — autoplay blocked** | `received` present, then RED `*_buzzer.wav` error (`audio.play()` rejected) | FCM arrives but document has no sticky activation after reload | **BUG-747** (this doc) |
| **M2 — FCM not delivered** | order appears via **socket only**; **no `received`**, no `played` | FCM push never reaches the reloaded device (stale/unregistered device token) | **CR-562** (FCM token refresh via profile) — and/or a socket-driven ring fallback |

The 12:06:55 capture is **Mode M2**. The earlier capture in §1/§2 (red wav error after `received`) is **Mode M1**.

**Impact on this bug's fix:** the autoplay re-unlock in BUG-747 is **necessary but NOT sufficient** to end the
owner's "silent after reload" complaint. It fixes M1 only. When M2 occurs (no FCM payload after reload), there
is nothing to unlock-and-play. M2 is **CR-562 territory** (deferred earlier) — this evidence shows the two are
**coupled**, not merely complementary. A complete fix needs BUG-747 **and** a reliable post-reload ring source
(CR-562 FCM-token refresh, **or** wiring a ring onto the already-working socket `new_order`/`update-order`
event as a fallback).

## 3. Data-Flow Trace

```
Hard reload (fresh document, NO user-activation)
  → ProtectedRoute → /loading → LoadingPage boots, navigates to /dashboard
  → NotificationContext mount effect (isAuthenticated) : soundManager.preload()         [NotificationContext.jsx:230-235]
  → FCM foreground payload arrives : onForegroundMessage → processNotification           [NotificationContext.jsx:238-241]
  → processNotification resolves sound key → soundManager.play(resolvedSound)            [NotificationContext.jsx:195]
  → soundManager.play() → audio.play()                                                   [soundManager.js:84]
        .catch("Play blocked: ...")   ← BREAK POINT: no sticky activation on this document [soundManager.js:86-90]
  → _record(sound, false, err) → fcmDiagLog 'sound_blocked'  → RED wav error in console
```

BREAK POINT: `soundManager.js:84` `audio.play()` rejects because the reloaded document was never unlocked.

## 4. Affected Files (landmarks — exact edits are Gate 3, NOT in this doc)

| # | File | Role in fix | Current landmark |
|---|------|-------------|------------------|
| 1 | `src/utils/soundManager.js` | `unlock()` already exists and works; may expose an idempotent guard so repeated calls after `isUnlocked` are no-ops | `unlock()` L118-124; `isUnlocked` L28 |
| 2 | ONE top-level mount point — **either** `src/contexts/NotificationContext.jsx` (new ungated effect, mirrors the BUG-661 SW effect) **or** `src/App.js` (small sibling component next to `AppTitleSync`) | attach a **one-time** document gesture listener (`pointerdown`/`keydown`/`click`, `{ once: true }`) that calls `soundManager.unlock()` then self-removes | NotificationContext ungated effect pattern L266-287; App.js `AppProviders` tree L152-154 |
| 3 | (OPTIONAL, OD-747-01) a persistent "🔇 Sound is off — tap to enable" banner shown when `audio.play()` is blocked | new tiny UI, reads `soundManager.getState().isUnlocked` / last blocked result | — |

**Recommended location (for owner to confirm at Gate 3):** the new one-time listener in
`NotificationContext.jsx` as an **ungated** `useEffect` (runs on every load regardless of auth, exactly like
the BUG-661 SW effect at L266). Reason: audio ownership already lives here (it imports `soundManager`,
preloads, and resets on logout), and an ungated effect also unlocks on the `/` login screen and the
`/loading` screen — so the very first click anywhere (including LOG IN) unlocks, and a reload straight onto
`/dashboard` unlocks on the operator's first tap/keypress. App.js is the alternative if we prefer a
dedicated `AudioUnlockGate` component.

## 5. Downstream Consumers / Interaction Risk

- `soundManager.unlock()` is idempotent-friendly: it plays a **muted** silent clip; calling it once per load
  on first gesture has no audible effect and cannot interrupt a real ring (`play()`/`unlock()` use separate
  `audio` instances; `unlock` pauses its own clip).
- `isUnlocked` is diagnostics-only today (NotificationTester health row) — flipping it true earlier only makes
  the diagnostics panel more accurate.
- **BUG-453 per-order mute** (`mutedOrders`, `clearMutes()` on logout) is orthogonal — unlock does not touch it.
- **CR-440 sound kill-switch** (`setEnabled`) still wins: `play()` early-returns when disabled; unlock does
  not bypass it.
- **BUG-560 unsupported-browser guard**: `unlock()` operates on `Audio`, independent of `firebase/messaging`
  support — safe where messaging is unsupported.
- Risk that a global `pointerdown` listener interferes with other handlers: mitigated by passive, `{ once:true }`,
  no `preventDefault`, self-removal after first fire.

## 6. Regression Scope (for QA at Gate 4+, not executed here)

- Reload `/dashboard` → trigger an order → **first operator tap unlocks → buzzer rings** (primary).
- Fresh login path still rings (no regression to the existing happy path).
- Silent Mode ON (CR-440) → still silent after unlock.
- Per-order snooze/mute (BUG-453) → still mutes that order after unlock.
- Logout → login as different restaurant → no audio leak; unlock re-arms cleanly.
- Browser with notifications unsupported/denied → no crash from the listener.

## 7. Open Questions (owner decisions → Gate 3)

- **OD-747-01:** Auto-unlock silently on first gesture, **or** also show a persistent "🔇 Sound off — tap to
  enable" prompt when a ring is blocked, **or** both? (Recommended: **both** — silent auto-unlock + a prompt as
  a safety net for the window before the first gesture.)
- **OD-747-02:** Should unlock also re-assert on tab-visibility regain (backgrounded PWA returning to
  foreground)? (Recommended: **yes**, cheap — add `visibilitychange` alongside the first-gesture listener.)
- **OD-747-03:** Listener home — `NotificationContext.jsx` ungated effect (recommended) vs a dedicated
  `AudioUnlockGate` component in `App.js`.
- **OD-747-04 (NEW, raised by 2026-11-23 evidence — cross-cuts BUG-747 + CR-562):** Ring-source architecture
  for the **M2** case (order on socket, no FCM). Options: **(A)** keep FCM as the sole ring source and fix
  post-reload delivery via **CR-562** (re-register the device token on reload); **(B)** add a **socket-driven
  ring fallback** — have the existing `new_order`/`update-order` socket handler trigger `soundManager.play`
  (dedup against FCM to avoid double-ring); **(C)** both. Recommended: pull **CR-562 forward** so BUG-747 +
  CR-562 ship together; consider (B) later as resilience. **Owner decision required** — this is scope beyond
  BUG-747 alone.

## 8. Scope Lock

- **Files WILL change (proposed):** `src/utils/soundManager.js` (guard only, if needed) + **one** of
  {`src/contexts/NotificationContext.jsx` | `src/App.js`} for the one-time gesture listener; **optionally** a
  small banner component if OD-747-01 includes the prompt. Plus a new unit test file at Gate 3.
- **Files WILL NOT touch:** any order/billing/tax/settlement/print/payment/auth/permission logic;
  `firebase.js`, `firebase-messaging-sw.js`, any profile/transform/service (that is CR-562, deferred);
  `DashboardPage.jsx`, `ScanOrderPopOut.jsx`, socket handlers.
- **Sufficiency caveat (per §2b evidence):** this scope fixes **Mode M1 only**. If OD-747-04 selects a
  socket-driven ring fallback (option B/C), `api/socket/socketHandlers.js` (or `AppSocketManager`/`useSocketEvents`)
  and a dedup guard WOULD then be in scope — that is a scope expansion requiring owner approval and likely a
  joint BUG-747 + CR-562 plan.

## 9. Related

- INV-BUZZER-20261123 (root-cause investigation; §5 recommendation #1 = this fix)
- **CR-562** — FCM token refresh via profile GET (DEFERRED follow-up per owner 2026-11-23; complementary, does
  NOT fix the reload-silence symptom)
- BUG-676 / BUG-600 / BUG-560 / BUG-453 / CR-440 (buzzer cluster, RELATED/distinct)

---

**Gate 2 stop.** No Implementation Plan written (owner requested Impact Analysis only). No app code changed
(PLANNING role). Risk HIGH → full Gate 3 plan + Gate 4 GO required before any code.
