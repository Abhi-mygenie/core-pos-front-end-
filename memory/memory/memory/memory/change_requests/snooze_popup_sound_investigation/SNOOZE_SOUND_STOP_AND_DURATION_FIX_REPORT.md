# Snooze Sound Stop and Duration — Fix Report

> **Type:** Implementation fix report. **No commits.**
> **Date:** 2026-01-16 (continuation session)
> **CR:** SNOOZE_SOUND_STOP_AND_DURATION
> **Plan source:** `/app/memory/change_requests/snooze_popup_sound_investigation/SNOOZE_SOUND_STOP_AND_DURATION_IMPLEMENTATION_PLAN.md`

---

## 1. Status

**Implementation completed in this session.** The previous session had not started any code work — `git diff` was empty and both target files were in their pre-CR Phase-4 state. All approved changes have now been applied, lint passes, and the targeted Jest suite (`ScanOrderPopOut.test.jsx`) is fully green with **29 / 29 tests passing**.

---

## 2. Files Changed (approved-only, scope verified)

| Path | Change | Diff |
|------|--------|------|
| `/app/frontend/src/components/dashboard/ScanOrderPopOut.jsx` | Edit | +37 / −12 |
| `/app/frontend/src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx` | Edit | +131 / −10 |

`git diff --stat HEAD` confirms only the two approved files in this CR were touched. No backend, no API, no FCM payload, no `NotificationContext`, no `firebase-messaging-sw.js`, no socket handler, no `OrderContext`, no order-polling, no `DashboardPage`, no `soundManager.js`, no other components.

(Note: `frontend/yarn.lock` shows as untracked in `git status` — this is an artifact from the earlier deployment session's `yarn install`, **not** introduced by this CR. No code changes outside the two approved files.)

---

## 3. Snooze Duration Confirmation

`POPOUT_SNOOZE_MS` is now `2 * 60 * 1000` (2 minutes), down from `5 * 60 * 1000` (5 minutes).

- `ScanOrderPopOut.jsx` line ~52: `export const POPOUT_SNOOZE_MS = 2 * 60 * 1000;`
- All button labels, tooltips, and code comments updated from "5 min" / "Snooze 5m" / "5 minutes" to "2 min" / "Snooze 2m" / "2 minutes".
- All Jest test names and comments updated to reference 2-minute timing.
- Test T-9 (`a snoozed order re-enters the queue after exactly 2 minutes`) passes, exercising the new duration end-to-end via `jest.advanceTimersByTime(POPOUT_SNOOZE_MS ± 1000)`.

Because every consumer of the constant references it **by name** (not the literal `5 * 60 * 1000`), the change propagates cleanly with zero risk of stale numeric literals.

---

## 4. Sound-Stop Behavior Confirmation

`handleSnoozeClick` now performs `soundManager.stop()` as its **first** step, before any state mutation:

```js
const handleSnoozeClick = useCallback(
  (orderId) => {
    const idStr = String(orderId);
    try {
      soundManager.stop();
    } catch (e) {
      console.warn('[Snooze] soundManager.stop() failed:', e?.message);
    }
    // ... existing snooze state logic (toggleSnooze, hide-set, setTimeout) ...
  },
  [onToggleSnooze]
);
```

- `soundManager` is imported once at the top of the file (`import soundManager from '../../utils/soundManager';`) with an inline comment explicitly noting the CR-Jan-2026 owner override of the original anti-rule.
- The call is wrapped in `try / catch` so a transient media error (autoplay-blocked, codec mismatch, revoked permission) never breaks the snooze state machine. The catch logs a `console.warn` and continues.
- `useCallback` dep array remains `[onToggleSnooze]` — `soundManager` is a module-level singleton (not a closure value) so it is stable across renders.

T-11 (`clicking Snooze calls soundManager.stop() exactly once`) passes, asserting:
- `stopSpy` called exactly once on Snooze click.
- `setEnabledSpy` **not** called.
- `playSpy` **not** called.

A-1b (file-level static check) passes, confirming `soundManager.stop(` appears exactly **once** as a real call expression in the source file (with string-literal masking applied so the `console.warn` message doesn't inflate the count).

---

## 5. After-2-Min Silent Re-Show Confirmation

The existing `setTimeout` callback inside `handleSnoozeClick` already drives the silent re-show via a React state setter. **Zero new code was added on the expiry path.** Trace:

1. After 2 minutes, the `setTimeout` callback fires.
2. It calls `setPopOutSnoozeHideSet(prev => { const next = new Map(prev); next.delete(idStr); return next; })`.
3. React schedules a re-render.
4. The `queue` memo recomputes; the previously-hidden order is no longer filtered out.
5. The popup renders the order.
6. **No `soundManager.play()`, no `soundManager.stop()`, no FCM event, no `NotificationContext.processNotification` is invoked.**

T-13 (`snooze expiry re-shows popup silently with zero soundManager.play() calls`) passes, asserting all of (a) popup re-renders with the snoozed order, (b) `play` not called during/after expiry, (c) `stop` not called during/after expiry, (d) `setEnabled` not called during/after expiry.

---

## 6. Local-Device-Only Confirmation

- `soundManager` is a per-tab JavaScript singleton instance (default export at `soundManager.js:117-118`). No `BroadcastChannel`, no `localStorage` backing, no service-worker cross-talk for sound state.
- `stop()` only mutates `currentAudio` on the local instance (pause + reset + null). Other tabs / other devices have their own `soundManager` instance with their own `currentAudio` — totally unaffected.
- The pop-out-local hide-set (`popOutSnoozeHideSet`) is also a per-component-instance `Map` with **no persistence**. Reload / route change / new tab clears it.

---

## 7. Confirmation: No API / Backend / Status / Global-Mute / Future-Mute Change

| Surface | Touched? | Evidence |
|---------|----------|----------|
| Backend / FastAPI endpoints | ❌ No | `git diff` shows no backend file changes |
| FCM payload / firebase-messaging service worker | ❌ No | No edits to `firebase.js`, `firebase-messaging-sw.js`, `NotificationContext.jsx` |
| Order status (`fOrderStatus`) | ❌ No | A-4 anti-test passes — order object remains structurally identical pre/post snooze |
| Server acknowledgement | ❌ No | A-2 anti-test passes — no `confirmOrder`, no `cancelOrder`, no `socket.emit` |
| `soundManager.setEnabled(...)` (global mute) | ❌ No | T-11 + T-12 assert `setEnabled` is never called by Snooze |
| `soundManager.play(...)` (future / re-alert sound) | ❌ No | A-1 anti-test asserts no `play` call site exists in the component file |
| Future-sound suppression / per-order mute | ❌ No | T-12 demonstrates that `soundManager.play('new_order')` still works after Snooze |
| `NotificationContext` interaction | ❌ No | A-1 anti-test asserts no `NotificationContext` import / `useNotification()` call |
| Snooze persistence (localStorage / sessionStorage) | ❌ No | A-3 anti-test passes — `Storage.prototype.setItem` not called during snooze flow |
| Order polling / socket handlers | ❌ No | No edits to `socketHandlers.js`, `useSocketEvents.js`, `useOrderPollingReconciliation.js` |
| `OrderContext` / `DashboardPage` / card components | ❌ No | Not in diff |
| `soundManager.js` API surface | ❌ No | File not modified |

---

## 8. Test / Lint Results

### 8.1 Lint
```
ESLint  ScanOrderPopOut.jsx        → ✅ No issues found
ESLint  ScanOrderPopOut.test.jsx   → ✅ No issues found
```

### 8.2 Targeted Jest run
`cd /app/frontend && CI=true yarn test --testPathPattern='ScanOrderPopOut.test' --watchAll=false`

```
PASS src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx

POS2-002 Phase 4 | ScanOrderPopOut — unit
  ✓ T-1 .. T-16 (all)
POS2-002 Phase 4 | ScanOrderPopOut — integration
  ✓ I-1, I-2
POS2-002 Phase 4 | ScanOrderPopOut — anti-tests
  ✓ A-1   (updated: now allows soundManager import + stop() exception;
           still forbids play, setEnabled, NotificationContext)
  ✓ A-1b  (new: soundManager.stop() wired exactly once as a real call)
  ✓ A-2, A-3, A-4, A-5
POS2-002 Phase 4 | pure helpers
  ✓ isUnconfirmedScanOrder predicate quadrants
  ✓ buildTableEntryFromOrder shapes for each channel
CR SNOOZE_SOUND_STOP_AND_DURATION | ScanOrderPopOut — snooze sound-stop
  ✓ T-11: clicking Snooze calls soundManager.stop() exactly once
  ✓ T-12: Snooze does NOT call soundManager.setEnabled(false) and future play() still works
  ✓ T-13: snooze expiry re-shows popup silently with zero soundManager.play() calls

Test Suites: 1 passed, 1 total
Tests:       29 passed, 29 total
Time:        ~2.1 s
```

### 8.3 Notes on naming collision
The existing test file already contained tests labelled `T-11`, `T-12`, `T-13` (Next/Prev navigation, viewport layout, predicate strictness respectively). To avoid renaming those locked Phase-4 tests, the three new sound-related tests were added in a **separate, dedicated `describe` block** titled `CR SNOOZE_SOUND_STOP_AND_DURATION | ScanOrderPopOut — snooze sound-stop`. Within that new describe block they keep the exact T-11 / T-12 / T-13 names the planning doc and task brief specified.

---

## 9. Risks / Open Questions

| # | Item | Severity | Notes |
|---|------|----------|-------|
| R-1 | None blocking. | — | All approved changes applied. Lint + tests fully green. |
| R-2 | Doc-sweep follow-ups deferred per plan §9.2 | 🟢 LOW | `POS2_002_PHASE_4_WEB_YTC_POPOUT_IMPLEMENTATION_HANDOVER_2026_05_10.md` row C-2 (`"No sound suppression"`) and the Phase 4 QA report addendum still describe the **superseded** Phase-4 contract. The implementation-plan doc explicitly flagged that these doc updates ride in a **separate** doc-sweep CR after sign-off. **No action required in this CR.** |
| R-3 | Pre-existing transient-refresh race (sister investigation §7 root cause #2) | 🟡 MEDIUM (out of scope) | Housekeeping `useEffect` can delete the hide-set entry early during a transient orders-list refresh. **Not introduced by this CR.** Will continue to be silent because the popup itself never calls `play()`. Owner already aware (documented in `WEB_ORDER_SNOOZE_INVESTIGATION.md`). |
| R-4 | `frontend/yarn.lock` untracked in `git status` | 🟢 LOW | Artifact of an earlier deployment session. Unrelated to this CR. Recommendation: separately decide whether to commit it under the repo's lockfile policy (`.gitignore` currently does not track `yarn.lock` in this branch). |

**No open questions block sign-off.** The five OQs in the plan (§12) were all answered by the owner brief that gated this implementation session:

| OQ | Resolution |
|----|------------|
| OQ-1 (touch `NotificationContext`?) | **No.** Strict-no-touch list enforced. |
| OQ-2 (add T-11 / T-12?) | **Yes.** Both added + T-13 for silent re-show. |
| OQ-3 (button label "Snooze 5m" → "Snooze 2m"?) | **Yes.** Updated. |
| OQ-4 (tooltip "Snooze for 5 minutes" → "Snooze for 2 minutes"?) | **Yes.** Updated. |
| OQ-5 (inline override of anti-rule comment vs separate amendment CR?) | **Inline.** Anti-rule comment at `ScanOrderPopOut.jsx` updated in the same patch. |

---

## 10. Diff Spot-Check (key locations)

```diff
# /app/frontend/src/components/dashboard/ScanOrderPopOut.jsx

# 1. Anti-rule comment block updated (lines 22-33)
-// Strict anti-rules:
-//   - NO soundManager import. NO NotificationContext import. ...
+// Strict anti-rules:
+//   - soundManager import is allowed ONLY for `soundManager.stop()` inside
+//     handleSnoozeClick (CR SNOOZE_SOUND_STOP_AND_DURATION, Jan-2026 — ...
+//   - NO NotificationContext import. ...

# 2. Import added (after constants import)
+import soundManager from '../../utils/soundManager';

# 3. Duration constant changed
-export const POPOUT_SNOOZE_MS = 5 * 60 * 1000;
+export const POPOUT_SNOOZE_MS = 2 * 60 * 1000;

# 4. handleSnoozeClick — stop() with try/catch as FIRST step
   const handleSnoozeClick = useCallback(
     (orderId) => {
       const idStr = String(orderId);
+      try {
+        soundManager.stop();
+      } catch (e) {
+        console.warn('[Snooze] soundManager.stop() failed:', e?.message);
+      }
       if (typeof onToggleSnooze === 'function') {
         onToggleSnooze(idStr);
       }
       ...
     },
     [onToggleSnooze]
   );

# 5. Button title + label
-  title={isUnderlyingSnoozed ? 'Currently snoozed (5 min auto-clear)' : 'Snooze for 5 minutes'}
+  title={isUnderlyingSnoozed ? 'Currently snoozed (2 min auto-clear)' : 'Snooze for 2 minutes'}
   ...
-  <span>Snooze 5m</span>
+  <span>Snooze 2m</span>
```

```diff
# /app/frontend/src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx

# 1. Header comment updated (5-minute → 2-minute).
# 2. T-9 test name + comments updated (5 min → 2 min).
# 3. T-10 comments updated (5-min window → 2-min window, Advance 5 min → Advance 2 min).
# 4. A-1 anti-test rewritten — now permits `import soundManager` and `.stop()`
#    while still forbidding `.play(`, `.setEnabled(`, NotificationContext.
# 5. A-1b anti-test added — asserts `soundManager.stop(` is a real call
#    expression exactly once (string-literal masking applied).
# 6. New describe block at file end with three new tests:
#       T-11 — Snooze calls soundManager.stop() exactly once
#       T-12 — Snooze does NOT call setEnabled(false); future play() still works
#       T-13 — snooze expiry re-shows popup silently — zero play() calls
```

---

— End of Fix Report —
