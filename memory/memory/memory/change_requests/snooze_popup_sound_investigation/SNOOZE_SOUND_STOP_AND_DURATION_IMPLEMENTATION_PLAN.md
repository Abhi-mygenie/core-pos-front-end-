# Snooze Sound Stop and Duration Implementation Plan

> **Type:** Implementation planning only. **No code changes. No commits.** Read-only.
> **Date:** 2026-01-16
> **Supersedes (intent, not yet docs):** Phase 4 locked anti-rule `ScanOrderPopOut.jsx:23` ("NO soundManager import") and handover row C-2 ("No sound suppression") — both will be amended in the implementation CR (not in this plan).

---

## 1. Summary

Two micro-changes, both local to `ScanOrderPopOut.jsx`:

**A. Duration change.** Replace `POPOUT_SNOOZE_MS = 5 * 60 * 1000` with `POPOUT_SNOOZE_MS = 2 * 60 * 1000`. All other snooze mechanics (per-order hide-set, `setTimeout` auto-clear, housekeeping cleanup, `toggleSnooze` reuse) stay identical because they consume the constant by reference.

**B. Sound stop on click.** Add a single `import soundManager from '../../utils/soundManager';` and call `soundManager.stop()` inside `handleSnoozeClick` as the **first** step, before any state setter. This stops the **current device's** in-progress chime exactly once per click; it does **not** mute future chimes, does **not** flip the Silent Mode flag, does **not** call any backend, and does **not** affect other devices/tabs (each has its own `soundManager` singleton instance).

**After-2-minutes behaviour — verified, no code added.** The existing `setTimeout` callback at `ScanOrderPopOut.jsx:243-249` already calls `setPopOutSnoozeHideSet(...)` which schedules a React re-render → `queue` memo recomputes → if the order is still YTC, popup re-shows **silently** (the popup never imports or calls `soundManager.play()`; sound is FCM-driven only). Owner expectation is met by current code — no new timer-triggered code path is added by this CR. See §6.3-§6.5 for the per-question verification matrix and the explicit "MUST NOT" list for the implementation agent.

Net footprint: **1 file**, **~4 line changes** (1 import + 1 `stop()` call + 1 numeric constant + 1 string label / tooltip touch) plus minor cosmetic comment / button-label refresh from "5 min" to "2 min". One QA test mirror (T-11) to be added, plus a new T-13 to lock the silent-re-show behaviour.

---

## 2. Baseline Docs Read

| Doc | Relevance |
|---|---|
| `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` | Frontend architecture baseline. |
| `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` | CR lifecycle gates. |
| `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` / `FINAL_DOCS_SUMMARY.md` | Sprint doc index. |
| `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` | Implementation guardrails. |
| `/app/memory/final/MODULE_DECISIONS_FINAL.md` | Module-level locked decisions. |
| `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` | Resolved open questions. |
| `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` | Sprint reconciliation. |
| `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | CR-008 D1 closure record. |
| `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` | Pending work index. |
| `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` | Next-action buckets. |
| `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | Backend field park status. |
| `/app/memory/change_requests/snooze_popup_sound_investigation/SNOOZE_POPUP_SOUND_INVESTIGATION.md` | **Investigation that produced the owner ask.** §6 documents that Snooze never touches sound today (locked anti-rule). §10 Path B = "stops in-progress chime only" matches the present owner direction. |
| `/app/memory/change_requests/web_order_snooze_investigation/WEB_ORDER_SNOOZE_INVESTIGATION.md` | Exhaustive Snooze flow. §4 (button handler), §6 (actual behaviour), §7 (root causes). |
| `/app/memory/change_requests/implementation_handover/POS2_002_PHASE_4_WEB_YTC_POPOUT_IMPLEMENTATION_HANDOVER_2026_05_10.md` | **Authoritative shipped contract** for Phase 4 Pop-out. Row C-2: "No sound suppression" — to be amended by the present CR. |
| `/app/memory/change_requests/qa_reports/POS2_002_PHASE_4_WEB_YTC_POPOUT_QA_REPORT_2026_05_10.md` + addendum | Phase 4 QA matrix. No sound-stop scenarios; will be extended with T-11. |
| `/app/memory/change_requests/implementation_summaries/POS2_002_PHASE_4_WEB_YTC_POPOUT_IMPLEMENTATION_SUMMARY_2026_05_10.md` | Ships locked Phase 4 contract. |

---

## 3. Owner Decisions Applied

Verbatim from the task brief, locked in this plan:

| # | Decision | Status |
|---|---|---|
| 1 | Clicking Snooze SHOULD stop the in-progress chime. | ✅ Path B from prior investigation §10 |
| 2 | Local-device only. | ✅ `soundManager` is a per-tab singleton; no cross-device API exists |
| 3 | No backend / API call. | ✅ Locked |
| 4 | No order status change. | ✅ Locked |
| 5 | No server-side acknowledgement. | ✅ Locked |
| 6 | No global mute. | ✅ Do not call `setEnabled(false)` |
| 7 | No mute for all future web-order sounds. | ✅ Locked — `stop()` only kills current `currentAudio`; next `play()` works normally |
| 8 | No per-order server mute. | ✅ Locked |
| 9 | Snooze remains popup/order-level local. | ✅ Locked |
| 10 | Snooze duration becomes 2 minutes. | ✅ `POPOUT_SNOOZE_MS = 2 * 60 * 1000` |
| 11 | Snooze still hides only that order's popup entry. | ✅ Existing `popOutSnoozeHideSet.set(idStr, …)` retained |
| 12 | Manual order / dashboard visibility unchanged. | ✅ `OrderContext`, `snoozedOrders`, `toggleSnooze`, card components untouched |

---

## 4. Current Snooze Duration and State

### 4.1 Source-of-truth references for `POPOUT_SNOOZE_MS`

Confirmed via `grep -rn "POPOUT_SNOOZE_MS\|5 \* 60 \* 1000" /app/frontend/src/`:

| File:Line | Use |
|---|---|
| `src/components/dashboard/ScanOrderPopOut.jsx:48` | **Definition** `export const POPOUT_SNOOZE_MS = 5 * 60 * 1000;` |
| `src/components/dashboard/ScanOrderPopOut.jsx:236` | `next.set(idStr, Date.now() + POPOUT_SNOOZE_MS);` |
| `src/components/dashboard/ScanOrderPopOut.jsx:250` | `setTimeout(callback, POPOUT_SNOOZE_MS);` |
| `src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx:26` | `import { POPOUT_SNOOZE_MS } from '...';` |
| `src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx:184, 218, 426, 441` | `jest.advanceTimersByTime(POPOUT_SNOOZE_MS ± 1000);` |

All test consumers reference the **constant by name**, not the literal `5 * 60 * 1000`. Therefore changing the definition to `2 * 60 * 1000` propagates automatically to every test. The only exceptions are **comment / label strings** that hardcode the word "5":

| File:Line | Text to update |
|---|---|
| `ScanOrderPopOut.jsx:14` | `// pop-out-local 5-minute hide-set so the order does not re-pop until` → `2-minute` |
| `ScanOrderPopOut.jsx:46` | `// 5 minutes in ms — locked per R-SNOOZE-9.` → `2 minutes` |
| `ScanOrderPopOut.jsx:233` | `// Add to pop-out-local hide-set with 5-min expiry.` → `2-min` |
| `ScanOrderPopOut.jsx:239` | `// Schedule auto-clear so the order re-enters the queue after 5 min.` → `2 min` |
| `ScanOrderPopOut.jsx:640` | `title={... '(5 min auto-clear)' ... 'Snooze for 5 minutes'}` → `2 min` / `2 minutes` |
| `ScanOrderPopOut.jsx:643` | `<span>Snooze 5m</span>` → `<span>Snooze 2m</span>` |
| `__tests__/.../ScanOrderPopOut.test.jsx:7` | `//   - 5-minute pop-out-local snooze hide-set (R-SNOOZE-9).` → `2-minute` |
| `__tests__/.../ScanOrderPopOut.test.jsx:174` | `// T-9 — 5-min auto-clear` → `2-min` |
| `__tests__/.../ScanOrderPopOut.test.jsx:175` | `test('T-9: a snoozed order re-enters the queue after exactly 5 minutes', ...)` → `2 minutes` |
| `__tests__/.../ScanOrderPopOut.test.jsx:202, 216` | `// Simulate ... in 5-min window` / `// Advance 5 min` → `2 min` |

### 4.2 State surfaces (unchanged by this CR)

| State | Owner | Lifetime | Change in this CR |
|---|---|---|---|
| `popOutSnoozeHideSet: Map<idStr, expiryEpochMs>` | `ScanOrderPopOut` instance | Component lifetime | **None.** Just the expiry value shifts from `+5 min` to `+2 min`. |
| `timerRefs: Map<idStr, timeoutHandle>` | `ScanOrderPopOut` instance | Same | None. |
| `snoozedOrders: Set<idStr>` | `DashboardPage` (L417) | Dashboard lifetime | None. |
| `toggleSnooze` handler | `DashboardPage` (L1172-1182) | Stable | None. |

---

## 5. Current Sound Control Surface

### 5.1 `soundManager` API (`/app/frontend/src/utils/soundManager.js`)

| Method | Lines | Behaviour | Suitability for Snooze-stop |
|---|---|---|---|
| `play(soundKey)` | 45-84 | Stops any in-progress audio via `this.stop()`, then plays the requested key once (no `loop`). | Not needed by Snooze. |
| `stop()` | 89-95 | If `currentAudio` exists: `pause()` + `currentTime = 0` + nulls out `currentAudio`. Safe to call when nothing is playing (early-returns by check). | ✅ **Exact tool for the job.** Idempotent. Affects only the *current* `Audio` element on this tab. Does **not** clear the preload cache. Does **not** touch `isEnabled`. |
| `setEnabled(boolean)` | 101-104 | Flips the global `isEnabled` flag; if false, calls `stop()`. | ❌ **Do not use** — owner decision #6 forbids global mute. |
| `preload()` | 32-39 | Preloads all sound files. | Unrelated. |

### 5.2 Singleton export

`soundManager` is exported as the default export from `utils/soundManager.js` (line 117: `export default soundManager;`). It is a **per-tab JavaScript singleton instance** — it lives entirely in the renderer process's memory. There is **no** cross-tab synchronisation, **no** BroadcastChannel, **no** localStorage backing. Each open browser tab / window has its own instance with its own `currentAudio`. Each device/POS terminal has its own browser, hence its own instance.

Conclusion: calling `soundManager.stop()` from inside Snooze affects **only the chime currently playing in this exact tab on this exact device.** No spill-over to other devices, other tabs, future chimes, the cashier's silent-mode preference, or global state.

### 5.3 Can `ScanOrderPopOut` safely import `soundManager`?

✅ **Yes, with explicit owner override of the anti-rule comment at line 23.**

The locked anti-rule was a **scope marker** for the Phase 4 contract (sound was deferred). It is a comment, not a build/test gate. The owner has now changed the business rule per decision #1.

Importing `soundManager` does not create a cycle:
- `soundManager` has zero React deps.
- `soundManager` has zero context deps.
- `soundManager` is already imported by `NotificationContext.jsx` (production), `NotificationTester.jsx` (dev panel), and existing tests.
- Adding a second consumer (`ScanOrderPopOut.jsx`) is structurally identical to those — no graph change.

### 5.4 What `soundManager.stop()` does **NOT** do

- Does **not** suppress future `play()` calls. The next FCM-triggered `play()` will work normally.
- Does **not** flip `isEnabled`. Silent Mode unchanged.
- Does **not** clear the preload cache.
- Does **not** affect `NotificationContext`'s queue, toast list, or notification log.
- Does **not** touch FCM service worker / service-worker side of the push pipeline.
- Does **not** acknowledge the notification to the server.

---

## 6. Proposed Implementation

### 6.1 Diff shape (no code yet — annotated changes)

All changes inside `/app/frontend/src/components/dashboard/ScanOrderPopOut.jsx`:

```diff
@@ imports @@
 import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
 import { ChevronLeft, ChevronRight, X, Check, Eye, BellOff, Bell } from 'lucide-react';
 import { COLORS } from '../../constants';
+// CR SNOOZE_SOUND_STOP_AND_DURATION (Jan-2026): Snooze now also stops the
+// in-progress local chime. Locked anti-rule at line ~23 is overridden by
+// owner decision 2026-01-16 (see SNOOZE_SOUND_STOP_AND_DURATION_IMPLEMENTATION_PLAN.md).
+// Use ONLY soundManager.stop() — no setEnabled, no global mute, no per-order mute.
+import soundManager from '../../utils/soundManager';

@@ contract comment @@
-//     pop-out-local 5-minute hide-set so the order does not re-pop until
+//     pop-out-local 2-minute hide-set so the order does not re-pop until

@@ POPOUT_SNOOZE_MS constant @@
-// 5 minutes in ms — locked per R-SNOOZE-9. Exported for the test file so the
-// timer constant has a single source of truth.
-export const POPOUT_SNOOZE_MS = 5 * 60 * 1000;
+// 2 minutes in ms — owner decision 2026-01-16 (was 5 min under R-SNOOZE-9
+// of Phase 4 contract; superseded). Exported for the test file so the
+// timer constant has a single source of truth.
+export const POPOUT_SNOOZE_MS = 2 * 60 * 1000;

@@ handleSnoozeClick — L225-254 @@
 const handleSnoozeClick = useCallback(
   (orderId) => {
     const idStr = String(orderId);
+    // CR SNOOZE_SOUND_STOP_AND_DURATION (Jan-2026): stop the local in-progress
+    // chime BEFORE state changes so the operator experiences sound-off
+    // simultaneously with the visual hide. soundManager.stop() is idempotent
+    // and a no-op when nothing is currently playing. It affects ONLY the
+    // current audio element on this tab — not future chimes, not Silent Mode,
+    // not other devices.
+    try {
+      soundManager.stop();
+    } catch (e) {
+      // Defensive: never let a media error break the snooze state machine.
+      // The chime ending naturally on its own is an acceptable fallback.
+      console.warn('[Snooze] soundManager.stop() failed:', e?.message);
+    }
     // Reuse existing dashboard snooze handler (sets dim-card UX).
     if (typeof onToggleSnooze === 'function') {
       onToggleSnooze(idStr);
     }
     // Add to pop-out-local hide-set with 2-min expiry.
     setPopOutSnoozeHideSet((prev) => {
       const next = new Map(prev);
       next.set(idStr, Date.now() + POPOUT_SNOOZE_MS);
       return next;
     });
     // Schedule auto-clear so the order re-enters the queue after 2 min.
     const prevHandle = timerRefs.current.get(idStr);
     if (prevHandle) clearTimeout(prevHandle);
     const handle = setTimeout(() => {
       setPopOutSnoozeHideSet((prev) => {
         const next = new Map(prev);
         next.delete(idStr);
         return next;
       });
       timerRefs.current.delete(idStr);
     }, POPOUT_SNOOZE_MS);
     timerRefs.current.set(idStr, handle);
   },
   [onToggleSnooze]
 );

@@ button row L640-643 @@
-  title={isUnderlyingSnoozed ? 'Currently snoozed (5 min auto-clear)' : 'Snooze for 5 minutes'}
+  title={isUnderlyingSnoozed ? 'Currently snoozed (2 min auto-clear)' : 'Snooze for 2 minutes'}
 ...
-  <span>Snooze 5m</span>
+  <span>Snooze 2m</span>
```

### 6.2 Placement decisions (why these specific choices)

| Question | Decision | Rationale |
|---|---|---|
| Should `ScanOrderPopOut` import `soundManager` directly, or use a thin local helper? | **Direct import.** | Single call site. Helper would add indirection without saving any LoC. `soundManager` is already a stable singleton with no React deps. |
| Should `stop()` happen before or after the existing snooze state changes? | **Before.** | Operator perception: visual hide and audio cut should feel simultaneous. `stop()` is synchronous and instant (`pause()` is sync). React state changes via `setState` are batched — the sound cut happens fractionally before the React re-render. Practically indistinguishable to the operator. |
| Should `stop()` be wrapped in `try/catch`? | **Yes.** | Owner decision #1 says Snooze must stop sound — but Snooze itself (visual hide + 2-min timer) must not break if the audio element is in a transient error state (autoplay-blocked, codec mismatch, user-revoked permission). The catch swallows the error with a `console.warn` and continues the snooze flow. |
| Should `useCallback` deps change? | **No.** | `soundManager` is an imported module-level singleton, not a closure value. It is stable across renders. The existing `[onToggleSnooze]` dep array remains correct. |
| Should the button label change from "Snooze 5m" to "Snooze 2m"? | **Yes.** | Operator UI clarity. The tooltip also changes. |
| Should the `R-SNOOZE-9` reference comment change? | **Update wording**, do not delete the locked-contract reference (history). | Marker becomes "Phase 4 R-SNOOZE-9 superseded 2026-01-16; new duration 2 min". |

### 6.3 After-2-Minutes Behaviour — Verified From Current Code

> **Owner ask:** Snooze should be a temporary local suppression for 2 min. After 2 min, if the order is still pending, the popup may show again. **But sound must not restart just because the 2-minute snooze expired.** No new API, no status change, no global mute.

The current `setTimeout` mechanism in `handleSnoozeClick` (`ScanOrderPopOut.jsx:243-250`) already implements exactly the behaviour owner wants. **No additional code is required.** Trace:

| Step | Code site | What happens at the 2-minute mark |
|---|---|---|
| 1 | `setTimeout(callback, POPOUT_SNOOZE_MS)` (L243-250) | Callback fires (subject to browser tab-throttling; see §10 R-2 / R-3). |
| 2 | Inside callback (L244-249) | `setPopOutSnoozeHideSet(prev => { const next = new Map(prev); next.delete(idStr); return next; })`. **This is a React state setter.** It schedules a re-render of `ScanOrderPopOut`. |
| 3 | Re-render | `queue` memo (L174-184) recomputes with deps `[orders, popOutSnoozeHideSet]`. Because the hide-set just changed, the memo re-runs. |
| 4 | New `queue` filter (L178) | `safeOrders.filter(isUnconfirmedScanOrder).filter(o => !popOutSnoozeHideSet.has(String(o.orderId)))`. If the order is still `orderFrom==='web' && fOrderStatus===7` in `OrderContext.orders`, it re-enters the filtered queue. |
| 5 | Popup render | `if (suppressed) return null; if (queue.length === 0) return null;` (L297-298). With queue non-empty, the popup re-renders with the previously-snoozed order at FIFO position by `createdAt`. |
| 6 | **Sound?** | **No sound.** The popup component still does not call `soundManager.play()` (the proposed CR adds only a `.stop()` call inside `handleSnoozeClick`, never a `.play()`). FCM did not fire (no backend event). `NotificationContext.processNotification()` was not invoked. The only `Audio` element in the system is the one that was `stop()`-ed 2 minutes ago — it does **not** auto-restart. |

### 6.4 Question-By-Question Verification

The 7 verification questions from the additional planning check, answered against the current code (post-CR):

| # | Question | Answer | Evidence |
|---|---|---|---|
| 1 | When the snooze timer expires, does `popOutSnoozeHideSet` removal cause the same order to re-enter the popup queue? | **Yes** — automatic. | `setTimeout` callback at L243-249 calls `setPopOutSnoozeHideSet(...)` which schedules a React re-render → `queue` memo recomputes (deps `[orders, popOutSnoozeHideSet]`) → order is no longer filtered out at L178 → enters queue → popup renders it. |
| 2 | Does the popup queue re-render automatically after expiry, or only after another state/order change? | **Automatic.** No external state/order change is needed. | The `setPopOutSnoozeHideSet` state setter inside the timer callback is itself the trigger. React's scheduler runs the re-render in the next microtask after the callback resolves. |
| 3 | If the order re-enters the popup queue after expiry, does sound play again? | **No.** | (a) `ScanOrderPopOut` never calls `soundManager.play()` — proposed CR adds only `.stop()`. Verified by `grep -n "soundManager.play" src/components/dashboard/ScanOrderPopOut.jsx` → 0 hits (still 0 hits after the proposed diff). (b) The only sound trigger is `NotificationContext.processNotification(data)` (L132-134), which fires solely on incoming FCM messages received in `onMessage` (L160+). No FCM event is generated by a local React state change. (c) The audio element stopped on Snooze click (`stop()` cleared `currentAudio`) does **not** auto-restart — `stop()` performs `pause()` + `currentTime = 0` + `currentAudio = null`. There is no resume path. |
| 4 | Is sound tied to popup render, or only to FCM/NotificationContext? | **Only to FCM/NotificationContext.** | The chime pipeline is `FCM push → firebase-messaging service worker → NotificationContext.processNotification → soundManager.play`. The popup is downstream of the data layer (it reads from `OrderContext.orders`, which is updated by socket `handleScanNewOrder` independently of FCM). Sound and popup are siblings, not parent/child. |
| 5 | Does `soundManager.stop()` on Snooze affect future `soundManager.play()` calls? | **No.** | `stop()` body (`soundManager.js:89-95`) only mutates `currentAudio` (pause + reset + null). It does **not** touch `this.isEnabled`, does **not** clear `this.audioCache`, does **not** flip any global flag. Subsequent `play(key)` calls (L45-84) execute their full path independently. Fixture-verifiable: spy on `play` after `stop` returns → `play` still executes. (Recommended Jest test T-12 in §9.1.) |
| 6 | Should implementation add any timer-triggered state refresh to ensure the popup reappears exactly after 2 minutes, or does existing state update already do that? | **No additional code needed.** | The existing `setTimeout` callback at L243-249 already calls a React state setter, which is the canonical mechanism for triggering a re-render in React. No additional `useEffect`, no `forceUpdate`, no polling required. **Implementation does NOT add any timer-triggered code path.** |
| 7 | If current code does not re-show exactly after timer expiry, should this CR change that behavior or leave it as current behavior? | **Already correct — no change needed.** | The current code re-shows the popup at the expiry of the snooze interval, **silently** (no sound), with the order at its FIFO position by `createdAt`. This matches owner expectation 1:1. **Implementation must not introduce any auto-replay-sound mechanism on expiry.** |

### 6.5 Anti-Rule For Implementation Agent

**The implementation CR MUST NOT:**

- ❌ Add any `soundManager.play(...)` call inside `ScanOrderPopOut` (e.g. to "re-alert" on expiry).
- ❌ Add any `NotificationContext` interaction inside `ScanOrderPopOut`.
- ❌ Add any `useEffect` that calls `soundManager.play` on `queue.length` change, on `popOutSnoozeHideSet` change, or on `currentIndex` change.
- ❌ Add any "remind cashier the snoozed order is back" toast / banner / vibration / animation that is itself a new attention surface beyond the existing popup body.
- ❌ Trigger any `addOrder` / `updateOrder` / `removeOrder` on expiry — the order stays in `OrderContext` throughout; the hide-set is purely a popup-side filter.
- ❌ Call any backend / FCM / socket emit on expiry.
- ❌ Modify the housekeeping `useEffect` at L202-223 (the transient-refresh race documented in `WEB_ORDER_SNOOZE_INVESTIGATION.md` §7 root cause #2 is a separate concern and out of scope).

**The implementation CR MUST:**

- ✅ Preserve the existing `setTimeout`-driven re-show via `setPopOutSnoozeHideSet` state setter — this is exactly the silent re-show owner asked for.
- ✅ Ensure that after Snooze, the only audio side-effect is **a single `soundManager.stop()` on click**. Nothing else. Especially nothing on the timer-callback path.

---

## 7. Files Proposed To Change

| Path | Op | Estimated diff | Surface |
|---|---|---|---|
| `/app/frontend/src/components/dashboard/ScanOrderPopOut.jsx` | **EDIT** | +13 / −7 | 1 import, 1 numeric constant, 1 `stop()` call with try/catch, 4 comment/label string updates |
| `/app/frontend/src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx` | **EDIT** | +20 / −5 | 4 comment/test-name "5 min" → "2 min" updates + 1 new test T-11 for sound-stop assertion (Jest mock of `soundManager.stop`) |

That's it. **Two files. Single CR.**

---

## 8. Files Explicitly NOT To Touch

| File | Why locked out |
|---|---|
| `/app/frontend/src/utils/soundManager.js` | No new API surface needed — `stop()` already does exactly what we want. Owner decisions #6, #7, #8 forbid adding global / per-order mute state. |
| `/app/frontend/src/contexts/NotificationContext.jsx` | Owner decision: Snooze must not gate future plays. The pre-play sound-key resolution chain stays intact. |
| `/app/frontend/src/config/firebase.js` | No FCM payload change. |
| `firebase-messaging-sw.js` (service worker) | No service-worker change. |
| `/app/frontend/src/api/socket/socketHandlers.js` | `handleScanNewOrder` unchanged. |
| `/app/frontend/src/api/socket/useSocketEvents.js` | Unchanged. |
| `/app/frontend/src/hooks/useOrderPollingReconciliation.js` | Unchanged. |
| `/app/frontend/src/contexts/OrderContext.jsx` | Unchanged. |
| `/app/frontend/src/pages/DashboardPage.jsx` | `toggleSnooze`, `snoozedOrders`, `handleCancelOrderFromCard`, `handleConfirmOrder`, `handleTableClick` family — all unchanged. |
| `/app/frontend/src/components/cards/OrderCard.jsx`, `TableCard.jsx`, dashboard channel components | Unchanged. |
| `/app/frontend/src/utils/toneMapper.js` | POS2-006 tone-override path untouched. |
| `/app/frontend/src/components/layout/NotificationTester.jsx` | Dev-only tester unchanged. |
| Any backend file / payload builder / KOT-print / CRM | Out of scope. |
| `/app/frontend/public/sounds/*.wav` | No asset change. |

---

## 9. Test / Doc Updates Needed

### 9.1 Test file updates — `__tests__/components/dashboard/ScanOrderPopOut.test.jsx`

| Update | Reason |
|---|---|
| Header comment L7: "5-minute" → "2-minute" | Cosmetic |
| L174 comment: "5-min auto-clear" → "2-min auto-clear" | Cosmetic |
| L175 test name: "after exactly 5 minutes" → "after exactly 2 minutes" | Cosmetic |
| L202, L216 comments: "5-min window" / "Advance 5 min" → "2-min window" / "Advance 2 min" | Cosmetic |
| **New test T-11 (recommended):** `'T-11: clicking Snooze calls soundManager.stop() exactly once'` | Locks the new behaviour. Spies on `soundManager.stop` via `jest.spyOn(soundManager, 'stop')`. Click the snooze button. Assert `stop` called exactly once. Assert `setEnabled` was **not** called. Assert no NotificationContext or FCM mock was invoked. |
| **New test T-12 (recommended):** `'T-12: clicking Snooze does NOT mute future chimes'` | Spy `soundManager.play` BEFORE the click — `play.mockClear()`. After click, simulate a `processNotification`-like call into `soundManager.play('new_order')`. Assert it executed (the audio element creation happens). Confirms decision #7. |
| **New test T-13 (recommended):** `'T-13: snooze expiry re-shows popup SILENTLY — no soundManager.play invoked'` | Click Snooze; `jest.spyOn(soundManager, 'play')` and `play.mockClear()`; `jest.advanceTimersByTime(POPOUT_SNOOZE_MS + 100)`. Assert: (a) popup re-renders with the snoozed order, (b) `soundManager.play` was not called, (c) `soundManager.stop` was not called during the timer callback (only on the original click). Locks owner's "sound must not restart on expiry" rule. |
| Existing A-3 test (no localStorage) | **Keep.** Still valid. |
| Existing A-4 test (no `fOrderStatus` mutation) | **Keep.** Still valid. |
| Existing T-8 (snooze closes popup) | **Keep.** Still valid. |
| Existing T-9 (re-enters after duration) | **Keep.** Now exercises 2-min via `POPOUT_SNOOZE_MS`. |
| Existing T-10 (status-flip removes) | **Keep.** Still valid. |

### 9.2 Documentation updates (separately from this implementation CR — flagged but not in this plan's scope)

| Doc | Required update | Action |
|---|---|---|
| `POS2_002_PHASE_4_WEB_YTC_POPOUT_IMPLEMENTATION_HANDOVER_2026_05_10.md` row C-2 | "No sound suppression" → "Snooze stops local in-progress chime only (CR SNOOZE_SOUND_STOP_AND_DURATION, Jan-2026)" | To be amended in a doc-sweep CR after sign-off |
| `POS2_002_PHASE_4_WEB_YTC_POPOUT_QA_REPORT_2026_05_10.md` | Add T-11 / T-12 result row | Amended in implementation CR |
| `ScanOrderPopOut.jsx:23` locked anti-rule comment | Change "NO soundManager import" → "soundManager import allowed only for `.stop()` on Snooze (CR Jan-2026); NO `setEnabled`, NO `play`" | Inline source comment, part of the implementation diff |
| `R-SNOOZE-9` requirement marker | Carry note that duration was changed from 5 to 2 min on 2026-01-16 | Inline comment, part of the implementation diff |
| `SNOOZE_POPUP_SOUND_INVESTIGATION.md` | Cross-reference this plan in §10 (Path B chosen) | Optional follow-up |
| `PENDING_TASK_REGISTER_2026_05_04.md` | Add CR row "Snooze sound-stop + duration to 2 min" | Optional follow-up |

The implementation CR itself does **not** rewrite any baseline doc — it only touches code, inline comments, and the test file.

---

## 10. Regression Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R-1 | `soundManager.stop()` throws on a corrupt audio element | 🟢 LOW | `try/catch` + `console.warn`. Snooze state machine continues regardless. |
| R-2 | Stop happens fractionally before the cashier perceives the click → "Did it work?" | 🟢 LOW | Stop is synchronous. The visual queue update on the next React commit follows within ~16 ms — well below human perception threshold. |
| R-3 | Cashiers who relied on the 5-min duration to "ignore for a long break" lose that window | 🟡 MEDIUM | Per-owner decision #10. Release-note line required. Cashiers needing longer suppression should use Sidebar Silent Mode. |
| R-4 | Multiple back-to-back FCM pushes mean Snooze on order #1 doesn't help with order #2's chime | 🟡 MEDIUM (acceptable per owner #7) | By-design: Snooze stops the **current** chime; future chimes for any order play normally. Documented in §5.4. |
| R-5 | Mounted test mocks for `soundManager.stop` leak across tests | 🟢 LOW | Standard `afterEach(() => jest.restoreAllMocks())` covers it. |
| R-6 | Hot-reload / StrictMode double-invocation of `handleSnoozeClick` | 🟢 LOW | `stop()` is idempotent. Double call is a no-op on the second invocation. |
| R-7 | `popOutSnoozeHideSet` housekeeping useEffect (L202-223) clears entry on transient refresh — order re-pops within 2 min and chimes again | 🟡 MEDIUM (pre-existing, not introduced) | Documented in sister investigation §7 root cause #2. Not introduced by this CR. May warrant a separate fix. |
| R-8 | Snooze duration change breaks tests that hard-coded 5 min | 🟢 LOW | grep confirms all tests use `POPOUT_SNOOZE_MS` by name. Only comments / test-names need wording updates. |
| R-9 | Locked anti-rule comment at line 23 still says "NO soundManager import" while the import now exists | 🟢 LOW (cosmetic) | Updated inline as part of the implementation diff. Reviewer should see the intent change in the same patch. |
| R-10 | Owner expects "stop sound" to also acknowledge / mark-as-seen the FCM notification toast in `NotificationContext` | 🟡 MEDIUM | Not in current owner brief. Decision #1-#9 explicitly forbid touching `NotificationContext`. If owner wants this, raise as a separate item (see OQ-1). |

---

## 11. QA Checklist

### 11.A Sound behaviour

| # | Scenario | Expected |
|---|---|---|
| QA-S1 | New web YTC order arrives — FCM fires | Chime plays once for ~1-3 s, popup opens. |
| QA-S2 | Click Snooze while chime is still playing | **Chime stops immediately.** Popup hides. No other side effect. |
| QA-S3 | Click Snooze after chime has ended naturally | No-op on sound (`stop()` early-returns). Popup hides. |
| QA-S4 | After Snooze, a different web YTC order arrives during the 2-min window | **Chime plays normally** for the new order. New popup opens with the new order. |
| QA-S5 | After Snooze, the **same** order's FCM re-fires (e.g. backend retry) within 2-min window | Chime plays again (Snooze does not mute future chimes — owner #7). Popup stays hidden (hide-set still has this orderId). |
| QA-S6 | Sidebar Silent Mode is ON; click Snooze | No sound change (nothing was playing anyway). Snooze still hides popup. |
| QA-S7 | Open POS on Device 1 + Device 2; FCM fires on both; click Snooze on Device 1 | Device 1: chime stops. Device 2: chime plays unaffected. |
| QA-S8 | Click Snooze with no chime in flight | No-op (idempotent `stop`). Popup hides. |
| QA-S9 | `soundManager.setEnabled` should NEVER be called by Snooze | Verified via `jest.spyOn(soundManager, 'setEnabled')` → 0 invocations after click. |

### 11.B Duration behaviour

| # | Scenario | Expected |
|---|---|---|
| QA-D1 | Click Snooze; wait 1 min 50 s; check queue | Order still hidden. |
| QA-D2 | Click Snooze; wait 2 min + 1 s; check queue | Order reappears if still YTC. |
| QA-D3 | Click Snooze; status flips to non-YTC during 2-min window | Order removed from queue regardless. |
| QA-D4 | Click Snooze; navigate away from /dashboard and back within 2 min | Snooze lost (component unmount). Popup re-opens. (Pre-existing behaviour per locked contract; not introduced by this CR.) |

### 11.C After-2-Minutes — silent re-show

| # | Scenario | Expected |
|---|---|---|
| QA-X1 | Click Snooze; in a controlled test environment advance timers by exactly `POPOUT_SNOOZE_MS` (Jest fake timers) | `popOutSnoozeHideSet` no longer contains the `orderId`. `queue` recomputes. Popup re-renders the order. |
| QA-X2 | At the moment the popup re-shows after expiry, was `soundManager.play()` invoked? | **No.** Spy on `soundManager.play` from before the snooze click and after expiry → 0 invocations during the timer callback / re-render cycle. |
| QA-X3 | At the moment the popup re-shows after expiry, was `NotificationContext.processNotification()` invoked? | **No.** No FCM event was generated by the local state change. |
| QA-X4 | At the moment the popup re-shows after expiry, was the previously-stopped `currentAudio` resumed? | **No.** `currentAudio` was nulled by `stop()`. There is no resume path in `soundManager`. |
| QA-X5 | Click Snooze with order #A; before the 2 min expires, a fresh FCM push arrives for order #B | Order #B's chime plays normally. Popup shows order #B (since #A is hidden). At order #A's 2-min expiry, popup queue includes both #A and #B; FIFO ordering by `createdAt` decides which renders first. |
| QA-X6 | Click Snooze with order #A; let 2 min expire; then a new FCM push arrives for order #C | At the expiry tick → popup re-shows #A silently. When #C's FCM arrives → its chime plays normally. |
| QA-X7 | Tab backgrounded during the 2-min window (browser throttling) | Timer fires late (per `setTimeout` throttling). Re-show is delayed, but still silent when it fires. |
| QA-X8 | Status of the snoozed order changes (e.g. cashier accepts on another device) during the 2-min window | Housekeeping useEffect (L202-223) removes the hide entry; order falls out of queue (status no longer 7); popup does NOT re-pop at expiry. No sound. |
| QA-X9 | `OrderContext.orders` momentarily omits the snoozed order during the 2-min window (transient refresh race — sister investigation root cause #2) | Housekeeping useEffect deletes the hide entry early; if the order re-enters `orders` in YTC state before 2 min, popup re-shows immediately. **Pre-existing behaviour, not introduced by this CR.** No sound on the re-show (popup is silent). |
| QA-X10 | After expiry-driven silent re-show, click Snooze again | Same behaviour as the original click — `stop()` (no-op since nothing playing), hide for another 2 min, schedule new timer. |

### 11.D Regression — no out-of-scope change

| # | Scenario | Expected |
|---|---|---|
| QA-R1 | Click Accept | Same behaviour as today (calls `handleConfirmOrder`). |
| QA-R2 | Click Reject | Opens CancelOrderModal — same behaviour as today. |
| QA-R3 | Click View | Opens OrderEntry — same behaviour as today. |
| QA-R4 | Click X (close popup queue) | Same behaviour as today. |
| QA-R5 | Dashboard order/table card visibility | Unchanged — order stays on dashboard even after snooze. |
| QA-R6 | `toggleSnooze` from a card (not popup) | Same behaviour as today — dims card, no audio interaction. |
| QA-R7 | Snooze API call | **No API call made.** Network tab shows no request for the Snooze click. |
| QA-R8 | Snooze server status | Order's `fOrderStatus` remains 7 (YTC) on backend. |
| QA-R9 | Polling reconciliation behaviour | Unaffected. `useOrderPollingReconciliation` snoozed-set is read-only of `OrderContext`. |
| QA-R10 | `NotificationContext` toast list | Unchanged — Snooze does not remove or mark the FCM toast. |
| QA-R11 | Existing T-8 / T-9 / T-10 / A-3 / A-4 Jest tests | Pass with the new 2-min duration. |
| QA-R12 | Browser console | Only the existing snooze logs + (on error path) `[Snooze] soundManager.stop() failed: ...` warning. No new toasts, no new banners. |

---

## 12. Open Questions

True blockers only — answer needed before implementation.

| # | Question | Why it blocks |
|---|---|---|
| **OQ-1** | Should clicking Snooze also clear / mark-as-read the FCM toast in `NotificationContext`'s notification list panel? | Touches `NotificationContext` — currently locked out by owner decisions #3-#8. If "yes" → expands footprint. Default answer: **No, leave untouched.** |
| **OQ-2** | Is the Jest test T-11 (sound-stop assertion) and T-12 (no-mute-future assertion) required for sign-off, or is the deterministic harness sufficient? | Affects implementation effort. Default: **add both tests.** |
| **OQ-3** | Should the button label change from "Snooze 5m" to "Snooze 2m" (operator UI clarity)? | Cosmetic but visible to cashier. Default: **yes.** |
| **OQ-4** | Should the tooltip also change ("Snooze for 5 minutes" → "Snooze for 2 minutes")? | Cosmetic. Default: **yes.** |
| **OQ-5** | Is overriding the locked anti-rule at `ScanOrderPopOut.jsx:23` and handover row C-2 acceptable via inline comment + this plan reference, or does owner require a separate amendment CR to the Phase 4 handover before this CR ships? | Affects sequencing. Default: **inline comment + this plan reference is sufficient**, doc-sweep CR follows. |

---

## 13. Final Implementation Scope

### 13.1 Scope statement

**Two-file CR.** Touches only `ScanOrderPopOut.jsx` and its Jest test. Adds one import, calls one existing API method, changes one numeric constant, and updates four cosmetic strings (comments + button label + tooltip).

### 13.2 Sequence after owner approval

1. Implementation CR opens (separate task — not this plan).
2. Apply diff per §6.1.
3. Update test comments / names per §9.1. Add T-11 + T-12.
4. Run `yarn test src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx` — expect all green.
5. Manual QA per §11.A + §11.B + §11.C.
6. Doc-sweep CR (separate, optional) amends Phase 4 handover row C-2 + Phase 4 QA report addendum.

### 13.3 Strict-scope reaffirmation

- ✅ No backend touch.
- ✅ No FCM / service-worker change.
- ✅ No payload change.
- ✅ No `NotificationContext` change.
- ✅ No socket handler change.
- ✅ No order polling change.
- ✅ No `OrderContext` / `DashboardPage` / card-component change.
- ✅ No new `soundManager` API method.
- ✅ No global Silent Mode change.
- ✅ No order status change.
- ✅ No per-order server mute.
- ✅ No mute-all-future-chimes mechanism.
- ✅ **No new timer-triggered code path on expiry.** Existing `setTimeout` callback already triggers a silent React re-render via `setPopOutSnoozeHideSet`. Owner's "popup may re-show but sound must not restart" requirement is met by current code; this CR adds zero lines to that path. (See §6.3-§6.5.)
- ✅ **No re-alert / re-chime / re-toast on expiry.** Implementation agent must follow the "MUST NOT" list in §6.5.

### 13.4 Owner approval

**Required before implementation CR opens.** Approval should reference this plan path.

— End of Implementation Plan —
