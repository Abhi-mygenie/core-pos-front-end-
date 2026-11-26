# BUG-454 — Notification sound / buzzer intermittently silent on first FCM after page load (browser autoplay policy + SW client gap) — INTAKE 2026-09-24

**Source:** OWNER-REPORTED (2026-09-24 — "Buzzer is not working, sometimes it works") → investigated same session as INVESTIGATION ROLE → report at `memory/BUG-453_INVESTIGATION_REPORT_2026_09_24_BUZZER_INTERMITTENT.md`
**Sprint:** `sep_bug_closure` · **Gate:** 1 (INTAKE)
**Related:** BUG-453 (mute race + FCM-retry suppression — GATE_5A_IMPLEMENTED; those fixes are correct and unrelated to this bug)

> **⚠ FINAL RCA 2026-09-24 — ROOT CAUSE UPSTREAM (FCM not delivered).** Owner reproduced with fresh Firefox login, token obtained, permission Allowed, Ringer On: socket `scan-new-order` drew the pop-up, **zero FCM reached the browser**, no `play()` attempted. Socket = pop-up, FCM = buzzer, independent by design (F5 "ring from socket" WITHDRAWN — OD-454-03). Owner-confirmed backend model: **one `fcm_token` per employee, most-recent login overwrites** (OD-454-04) → shared-account browsers silently orphaned. Classification BACKEND_BUG (alt ENVIRONMENT pending T1). Registry `INVESTIGATED_ROOT_CAUSE_UPSTREAM`. Backend brief: `backend_briefs/BACKEND_BRIEF_BUG-454_2026_09_24.md` (Q1–Q5). Frontend items F1/F2/F4 below remain valid but **secondary** — none fixes the "never rang" case. See report §1 box, §11, §12.
>
> **⚠ RCA REVISED 2026-09-24 (Investigation revalidation)** — see `memory/BUG-454_INVESTIGATION_REPORT_2026_09_24_REVALIDATION.md`.
> The autoplay-first RCA below is superseded. Two distinct failures: **(A) playback** — per-play origin re-fetch of uncached, mislabelled MP3 "wav" files through Cloudflare (stalls reproduced in real Firefox on UAT) → "rang once, not again"; **(B) delivery** — for the user who *never* heard it, no FCM ever reached the page (console shows no `[Notification]` log and no `play()` attempt); FCM permission/token is only requested in `LoginPage` and never re-checked on a persisted-session boot. Autoplay (RC-1) remains valid for Firefox cold loads but was not user B's failure. Blast radius and owner decisions must be re-derived at Gate 2 from the revalidation report (§7).

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | **P1 — HIGH** (core YTC/Scan & Order alert flow; sound is the primary signal for staff; no reliable workaround except waiting for retry after accidental interaction) |
| Risk | **LOW** — `soundManager.js` (non-hotspot) + `firebase.js` (SW registration only); no financial logic, no order data, no API contract change |
| RCA classification | **FE_BUG** (RC-1: autoplay policy, primary) + **ENVIRONMENT** (RC-2: SW client gap, secondary) + **ENVIRONMENT** (RC-3: FCM token / SW waiting-state, tertiary) |
| Confidence | HIGH (RC-1 code-confirmed) · MEDIUM (RC-2/RC-3 traced, not live-reproduced) |
| Code reality | **NONE** — no autoplay unlock, no AudioContext.resume(), no user-gesture listener, no queued-sound mechanism anywhere in `src/` (grep confirmed 2026-09-24) |
| Fast Lane eligible | **YES for RC-1 individually** (1 file `soundManager.js`, ≤10 lines, non-hotspot, non-financial, no API/state/provider/localStorage change) · **YES for RC-3 individually** (1 file `firebase.js`, ~3 lines) · RC-2 needs Gate 2-3 (2 files, new IDB/storage pattern) |
| Aggregator orders | **OUT OF SCOPE — working as desired.** Aggregator orders (Swiggy/Zomato) arrive via socket events (`socketHandlers.js:handleAggregatorNewOrder`), not YTC FCM. Their notification and sound pipeline is independent and unaffected by this bug. No aggregator code will be touched. |

---

## Symptom

On preprod / production, the YTC (Yet-to-Confirm) / Scan & Order buzzer sound **does not play on the first FCM push notification after the page loads** (or after a long idle period). The pop-up appears correctly but is completely silent. On a subsequent retry FCM (backend sends retries every ~30–60 seconds), the buzzer plays normally — but only if the staff has clicked or tapped something on the page in the meantime.

**Staff experience:** "I see the order pop-up but hear nothing. Then a minute later the buzzer rings on its own."

---

## Root Cause Analysis (from Investigation 2026-09-24, HIGH confidence)

### RC-1 — Browser autoplay policy (PRIMARY, HIGH confidence)

Modern browsers (Chrome, Firefox, Safari) block `HTMLMediaElement.play()` with a `NotAllowedError` unless the page has received at least one user gesture (click, tap, keydown) in the current session.

**Broken chain:**
```
FCM arrives → soundManager.play('five_sec_buzzer')
  → audio.play()
  → NotAllowedError (browser blocks — no prior user gesture)
  → .catch handler fires → console.warn only → currentAudio = null
  → SILENCE — no user-facing indication, no retry
```

**Why "sometimes works":**
- Staff loads POS → immediately an FCM arrives → BLOCKED (no interaction yet) → silent
- Staff clicks an order card / taps anything → browser grants autoplay permission
- Next FCM retry (60 s later) → play() SUCCEEDS → buzzer rings → "sometimes works"

**Code location:** `src/utils/soundManager.js:80–84`
```js
audio.play().catch((err) => {
  console.warn('[SoundManager] Play blocked:', err.message);  // ← only a warn, no recovery
  if (this.currentAudio === audio) this.currentAudio = null;
});
```
**Missing:** A one-time user-gesture listener that "warms up" the audio context so subsequent `play()` calls are not blocked.

### RC-2 — Service Worker `clients.matchAll()` gap on backgrounded/sleeping tab (SECONDARY, MEDIUM)

When the POS tab is backgrounded (mobile tab switch, minimised window, sleeping tab):
```
FCM → SW onBackgroundMessage fires
  → self.clients.matchAll({type:'window'}) → returns [] (window suspended)
  → forEach iterates 0 clients → no postMessage → NO sound in app
  → User re-opens tab → already stale; next retry may arrive and ring
```
**Code location:** `public/firebase-messaging-sw.js:37–44`

### RC-3 — FCM token tied to stale SW on update (TERTIARY, MEDIUM)

`firebase.js:62–76` waits for the SW `installing` state to transition to `activated`. If the SW is already in `waiting` state (pending update), the wait-loop never resolves, `getToken()` proceeds with the old SW registration, and the backend stores a token that may be orphaned after the update triggers.
**Code location:** `src/config/firebase.js:62–76`

---

## Scope Boundary (owner statement 2026-09-24)

> "Ensure it has nothing to do with aggregator orders — they are working as desired."

- **In scope:** YTC / Scan & Order / own-channel FCM push notifications (`onForegroundMessage` + SW background path → `NotificationContext.processNotification` → `soundManager.play`)
- **Out of scope:** Aggregator orders (Swiggy, Zomato, etc.) — arrive via socket `aggregator_order_{rid}` event, handled entirely in `socketHandlers.js:handleAggregatorNewOrder`, independent of FCM and soundManager play path.
- **Not related to BUG-453** — the mute race (Fix A) and FCM-retry suppression (Fix B) are correctly implemented and confirmed working. This bug is about `play()` failing before Mute is ever clicked.

---

## Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED ("Buzzer is not working, sometimes it works") |
| Steps to reproduce | 1. Load POS fresh (no prior interaction) · 2. Have a YTC order arrive (or simulate via DevTools → Application → SW → Push) · 3. Pop-up shows · 4. Sound absent. 5. Click any element. 6. Next FCM retry → sound plays. |
| Screenshot | Not provided |
| Curl | Not applicable (client-side browser policy) |
| Code grep | Confirmed no AudioContext / autoplay unlock code in `src/` (2026-09-24) |
| Investigation report | `/app/memory/BUG-453_INVESTIGATION_REPORT_2026_09_24_BUZZER_INTERMITTENT.md` |
| Confidence | CONFIRMED for RC-1 (code trace); REPORTED/TRACED for RC-2/RC-3 |

---

## Duplicate Check

| ID | Relation | Verdict |
|---|---|---|
| BUG-453 | Mute race + FCM-retry restart — GATE_5A_IMPLEMENTED | **RELATED, NOT DUPLICATE** — BUG-453 fixed why sound doesn't stop. BUG-454 is about why sound doesn't start. |
| BUG-034 | FCM dedup (2-s window) — CLOSED | Unrelated — dedup only suppresses rapid duplicates; does not explain first-play silence |
| BUG-081 / BUG-122-POST | Snooze duration / TableCard snooze gate — CLOSED | Unrelated |

**Verdict: DISTINCT**

---

## Blast Radius

| File | Change | Lines | Hotspot |
|---|---|---|---|
| `src/utils/soundManager.js` | Add autoplay-unlock on first user gesture (RC-1) | ~10 | NO |
| `src/config/firebase.js` | Fix SW `waiting` state not awaited in token registration (RC-3) | ~3–5 | NO |
| `public/firebase-messaging-sw.js` | Store last payload in IDB for app-focus recovery (RC-2) | ~15–20 | NO |
| `src/contexts/NotificationContext.jsx` | Read IDB on mount / focus for RC-2 recovery (if RC-2 in scope) | ~10 | NO |

- Blast radius: **SMALL–MEDIUM** (2 files for RC-1+RC-3; 4 files if RC-2 also in scope)
- Hotspot files: **NONE**
- Financial / order data / provider order / localStorage keys: **NONE**

---

## Owner Decisions Required (Gate 2)

| # | Decision | Options | Recommended |
|---|---|---|---|
| OD-454-01 | RC-2 scope — fix SW sleeping-tab gap? | A = Yes, include IDB recovery. B = No, ship RC-1+RC-3 only (faster; RC-2 is mobile-edge-case only) | **B** — RC-1 solves 90% of reports; RC-2 adds scope and a new IDB dependency |
| OD-454-02 | RC-4 — FCM `data.type` probe: owner to share one real YTC FCM payload from browser DevTools to confirm whether `isConfirmOrderNotification` fires correctly | Action only — no code decision yet | Owner action before Gate 2 |

---

## Next

**GATE 1 CLOSED — 2026-09-24 (owner).**
**INVESTIGATED_ROOT_CAUSE_UPSTREAM — 2026-09-24.** Blocked on backend reply (`backend_replies/BE_REPLY_BUG-454_<DATE>.md`, Q1–Q5) + owner T1/T2.
Decisions: OD-454-03 F5 WITHDRAWN · OD-454-04 backend = one token per employee, last login wins · OD-454-05 multi-device storage PENDING backend Q1.
Frontend Planning Gate 2 (F1/F2/F4 — secondary) on owner GO after the backend reply; Fast Lane eligible for F4 only (owner must approve).
