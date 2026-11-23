# BUG-748 (proposed) — FCM Messaging-Init Race — Impact Analysis (Gate 2)

**Document:** impact/BUG-748_FCM_RACE_IMPACT_ANALYSIS.md
**Stage:** Impact Analysis (Gate 2) — PLANNING role (no code)
**Created:** 2026-11-23
**Type:** BUG · **Sprint:** nov_cr_batch · **Client:** The Goan Kitchen (rid 69) · **Assignee:** Abhishek
**Severity:** P0 (operator-facing: no buzzer after reload) · **Risk:** HIGH (notification + provider-init hotspot)
**Source investigation:** `investigations/INV-CR562-FCMRACE-20261123.md` + re-investigation 2026-11-23 (code-traced, HIGH confidence)
**Scope:** The Firebase messaging **async-init race** ONLY — i.e. make messaging consumers wait for readiness.
Autoplay re-unlock is a **separate item → BUG-747**. Token-refresh behaviour is **CR-562** (this fix un-blocks it).

---

## Header — Code Reality + Conflict Pre-Check

- **Code Reality: NONE.** `grep -rn "messagingReady\|whenMessagingReady"` → only hit is `config/firebase.js:141`
  `messagingReady: !!messaging` inside `getFCMDiagnostics` — a *diagnostics boolean snapshot*, NOT a readiness
  promise/await. No part of the proposed fix exists. (⚠ naming collision — see OD-748-03.)

- **Conflict Pre-Check: ONE conflict (BUG-747), plus one governance lock (OD-AUDIT-02).**
  - `src/config/firebase.js` — last modifier **BUG-560 IMPL 2026-10-19** (CLOSED via OG-AUDIT-F4). The async
    `isSupported().then()` init this fix must preserve was introduced by BUG-560. **No OPEN item** on this file.
    ⚠ **OD-AUDIT-02 LOCK (OPEN_GAPS L508):** "No edit to `firebase.js` without owner Gate 4 GO." → owner GO is
    a hard precondition for Gate 3→4.
  - `src/contexts/NotificationContext.jsx` — last modifiers BUG-621 (2026-10-26), BUG-661 F5, BUG-453, CR-440
    (all CLOSED/done). **CONFLICT: BUG-747** (OPEN, Gate 2 IA complete) also lists this file as a target.
    → Execution order declared below (§7).
  - `src/pages/LoadingPage.jsx` — last modifier **CR-562 IMPL 2026-11-23** (GATE_5A, not closed). This fix does
    **NOT** touch LoadingPage; it makes CR-562's existing `requestFCMToken()` call (L374) actually resolve a token
    on reload. Parallel-safe (no shared line).
  - registry.json scan: no other non-closed item edits `firebase.js`. Only `NotificationContext.jsx` overlaps
    (BUG-747).
  - OPEN_GAPS_REGISTER: OG-AUDIT-F4 CLOSED (BUG-560). No open FCM/messaging gap other than the OD-AUDIT-02 lock.

---

## 1. Problem (operator-reported, CONFIRMED)

After a **browser reload** (no relogin), an incoming order **does not ring the buzzer**, although the order still
appears on the dashboard. Relogin restores the ring. This is the *primary* driver of the "silent after reload"
complaint; BUG-747 (autoplay) is the *secondary* driver.

## 2. Root Cause (CONFIRMED — code-traced, HIGH confidence)

`config/firebase.js` initializes `messaging` **asynchronously** (BUG-560): `messaging` is a module-level `let`
(L19) assigned only inside `isSupported().then(() => messaging = getMessaging(app))` (L31-43). It is therefore
`null` from module-load until that promise resolves.

On a reload, auth is restored (from storage) **before** that promise resolves, so every messaging consumer that
runs in that window silently no-ops:
- `onForegroundMessage(cb)` (L125-128) → `if (!messaging) return () => {}` → **subscribes to nothing**.
- `requestFCMToken()` (L49-53) → `if (!messaging) { warn; return null }` → **returns null** (CR-562 no-op).

The foreground listener is attached inside a **one-shot** effect, so it never recovers (see §3).
Login works only because the operator's typing delay lets `isSupported()` resolve before the LOGIN click calls
these functions. Classification: **FE_BUG** (client-side async-init lifecycle). Not backend, not permission
(granted in evidence), not data.

## 3. Data Flow Trace (break point)

```
RING PATH (the one that fails):
  FCM push → firebase onMessage handler → NotificationContext cb (L238-240)
           → processNotificationRef.current(payload) → processNotification (L94)
           → soundManager.play(resolvedSound) (L195) → audio.play()  ← the ring

ATTACH PATH (where it breaks on reload):
  reload → AuthContext restores isAuthenticated=true (sync-ish, from storage)
         → NotificationContext effect L230-263 runs:
              if (!isAuthenticated || initializedRef.current) return;   // L231
              initializedRef.current = true;                           // L232  ← locks, one-shot
              foregroundUnsubRef.current = onForegroundMessage(cb);    // L238
         → at this instant messaging === null  → onForegroundMessage returns ()=>{} (no real subscription)
  ...a beat later: isSupported().then resolves → messaging = getMessaging(app)   (firebase.js:35)
         → BUT the effect deps are [isAuthenticated] and initializedRef is already true
         → effect NEVER re-runs → listener NEVER attached
  BREAK POINT: NotificationContext.jsx:238 subscribes before firebase.js:35 assigns `messaging`;
               one-shot guard (L232) prevents recovery.
  RESULT: foreground FCM push has no onMessage handler → processNotification never fires →
          soundManager.play() never called → NO RING. (Order still renders via the independent socket path,
          which — confirmed by grep — never calls processNotification/soundManager.)
```

**Secondary (same cause):** `LoadingPage.jsx:374` (CR-562) calls `requestFCMToken()` within ms of reload →
`messaging===null` → returns null → profile GET sent without `?fcm_token=` → backend keeps stale token.
CR-562 (GATE_5A) is therefore inert on reload until this race is fixed.

## 4. Proposed Fix Direction (for impact sizing only — NOT a plan, NOT code)

Make messaging consumers **await readiness** instead of racing it:
- **firebase.js:** export a `messagingReady` promise that resolves (to `messaging` or `null`) *inside* the existing
  `isSupported().then(...)` / `.catch(...)`, so it always settles and preserves BUG-560 unsupported-browser safety.
  Have `onForegroundMessage` and `requestFCMToken` `await messagingReady` before touching `messaging`.
- **NotificationContext.jsx:** attach the foreground listener **once messaging is ready** (await the readiness
  promise inside the effect, or re-run the effect when a `ready` flag flips), keeping the existing logout reset
  (L291-292) and cleanup (L258-261) semantics intact.

This single fix resolves **both** the missing ring (primary) and CR-562 token refresh (secondary).

## 5. Affected Files, Lines, Risks

| # | File | Change (direction) | Lines (approx) | Risk notes |
|---|------|--------------------|----------------|------------|
| 1 | `src/config/firebase.js` | Add settled `messagingReady` promise in `isSupported().then/.catch`; `onForegroundMessage` + `requestFCMToken` await it | ~15-25 | **HIGH** — provider/init hotspot; **OD-AUDIT-02 lock**; must preserve BUG-560 safety; `onForegroundMessage` becomes async (signature change → §6) |
| 2 | `src/contexts/NotificationContext.jsx` | One-shot effect (L230-263) must handle async subscribe + async-safe cleanup; re-attach when ready | ~10-20 | **HIGH** — notification core; **CONFLICT with BUG-747** (§7); must keep L291-292 logout reset + L258-261 cleanup; guard double-subscribe |

**Scope lock (to be finalized in Gate 3):** WILL change → `config/firebase.js`, `contexts/NotificationContext.jsx`.
WILL NOT touch → `LoadingPage.jsx`, `LoginPage.jsx`, `firebase-messaging-sw.js`, `soundManager.js`, any
socket/order/auth/transform/API file, BUG-747's `App.js`/`soundManager.js` edits.

## 6. Downstream Consumers (signature-impact)

- `requestFCMToken` — callers: `LoadingPage.jsx:374` (already `await`, inside `Promise.race` 3s cap) and
  `LoginPage.jsx:56` (`await requestFCMToken()`). Already async → **awaiting `messagingReady` internally is
  signature-compatible**; the 3s race cap at L374 still protects boot. **No caller edit required.**
- `onForegroundMessage` — single caller: `NotificationContext.jsx:238`. Currently sync (returns unsubscribe fn).
  If it becomes async (returns `Promise<unsubscribe>`), L238 would store a Promise and cleanup L259
  `foregroundUnsubRef.current()` would throw. → **NotificationContext MUST be updated** (hence Edit #2). This is
  the only true breaking consumer.
- `getFCMDiagnostics` (`NotificationTester.jsx:17`) — reads `messagingReady: !!messaging` field; unaffected by the
  logic change but see OD-748-03 (field/promise name collision).

## 7. Conflict with BUG-747 — Execution Order

Both edit `NotificationContext.jsx`. They are **line-disjoint in intent** (BUG-748 = foreground-listener *attach
timing*; BUG-747 = *autoplay re-unlock* via gesture/visibilitychange + possibly an ungated listener home per
OD-747-03). Recommended order: **BUG-748 FIRST** (restore the listener so a push can arrive), **then BUG-747**
(so the arriving push can actually `audio.play()`). If BUG-747's OD-747-03 chooses "ungated effect in
NotificationContext as the listener home," the two edits should be **planned together** to avoid a second rewrite
of the same effect. Flagged for Gate 3.

## 8. Risk Classification

**HIGH.** Triggers: push-notification lifecycle + provider init (`firebase.js`) + a notification hotspot context.
Not financial/tax/settlement → not CRITICAL. Not copy/static → not LOW/MEDIUM. Risk not downgradable without
owner rationale.

## 9. Owner Decisions (Gate 2 → cannot proceed to Gate 3 without these)

- **OD-748-01 (ID/registration):** Register this as a **new BUG-748**, or **re-open CR-562** and fold the race fix
  into it? (Recommend: new BUG-748 — distinct root cause & symptom from CR-562's token refresh; CR-562 stays as
  the token behaviour it unblocks.)
- **OD-748-02 (OD-AUDIT-02 lock):** `firebase.js` is under a standing "no edit without owner Gate 4 GO" lock.
  Confirm GO to allow the Gate 3 plan to target `firebase.js`.
- **OD-748-03 (readiness naming):** `getFCMDiagnostics` already uses a `messagingReady` *field*. Approve a distinct
  name for the promise (e.g. `messagingReadyPromise` / `whenMessagingReady`) to avoid confusion. (Recommend: yes.)
- **OD-748-04 (sequencing with BUG-747):** Plan BUG-748 and BUG-747 **together** (shared `NotificationContext`
  effect) or **sequentially** BUG-748 → BUG-747? (Recommend: together if OD-747-03 = ungated-effect; else BUG-748
  first.)

## 10. Recommendation / Exit

- Root cause: **HIGH confidence, reproduced + traced.** Classification: **FE_FIX**.
- Planning-skip / Fast-Lane eligibility: **NO** — 2 files, `firebase.js` is a provider/init hotspot, >10 lines,
  touches provider init + notification lifecycle. → **Full Gate 3 Implementation Plan required** (no DIRECT_BUG_FIX).
- Backend ask: **NONE** (CR-562 backend contract already confirmed; this is purely client-side timing).
- Next: owner answers OD-748-01..04 → PLANNING (Gate 3) writes Implementation Plan + Verification Matrix →
  Gate 4 GO → IMPLEMENTATION.

## 11. Retroactive Candidates

NONE. (`messagingReady:` at firebase.js:141 is a diagnostics boolean, not an implementation of this fix.)

---

## 12. Owner Decisions — RESOLVED (2026-11-23)

- **OD-748-01 → RE-OPEN CR-562.** The race fix is folded into **CR-562 (re-opened)**, not a standalone BUG-748.
  This IA remains the Gate-2 record; the Gate-3 plan + registry status advance under **CR-562**.
- **OD-748-03 → YES, rename + no-regression constraint.** Use a distinct promise name (e.g. `whenMessagingReady`)
  so it never shadows the `getFCMDiagnostics` field. **Hard acceptance criterion:** must NOT change the existing
  login→ring path (the LOGIN-click gesture + already-resolved messaging case must behave exactly as today).
- **OD-748-04 → PLAN TOGETHER with BUG-747** (shared `NotificationContext.jsx` effect; same reload failure family).
- **OD-747-04 → A (pre-decided, handover 2026-11-23):** FCM remains the sole ring source; no socket-ring fallback;
  no `socketHandlers.js` scope expansion. Consistent with re-opening CR-562.

**Still OPEN before Gate 3 can be written (no guessing — Rule R3 / OD-AUDIT-02):**
- **OD-748-02** — owner GO to edit `firebase.js` (standing OD-AUDIT-02 lock).
- **OD-747-01** — silent auto-unlock vs "tap to enable" prompt vs both (rec: both).
- **OD-747-02** — re-assert unlock on `visibilitychange` (rec: yes).
- **OD-747-03** — listener home: ungated effect in `NotificationContext.jsx` (rec) vs `AudioUnlockGate` in `App.js`.
