# Snooze Sound Stop and 2-Minute Duration — QA Report

> **Type:** Validation only. **No code changes. No commits.**
> **Date:** 2026-01-16 (QA session)
> **CR:** SNOOZE_SOUND_STOP_AND_DURATION
> **Source artefacts validated:**
>  - `/app/memory/change_requests/snooze_popup_sound_investigation/SNOOZE_SOUND_STOP_AND_DURATION_FIX_REPORT.md`
>  - `/app/memory/change_requests/snooze_popup_sound_investigation/SNOOZE_SOUND_STOP_AND_DURATION_IMPLEMENTATION_PLAN.md`
>  - `/app/memory/change_requests/snooze_popup_sound_investigation/SNOOZE_POPUP_SOUND_INVESTIGATION.md`
> **Commit under test:** `cc7b179` (auto-commit, contains the CR diff verified in fix report)

---

## 0. Verdict

**OVERALL: ✅ PASS — all 6 acceptance criteria met. No issues found. No regressions.**

| # | Area | Result |
|---|------|--------|
| 1 | Snooze duration = 2 minutes | ✅ PASS |
| 2 | Sound stop on click (first step, try/catch) | ✅ PASS |
| 3 | No global mute / future-play preserved | ✅ PASS |
| 4 | After-2-min silent re-show, no sound / toast / banner / vibration / order mutation | ✅ PASS |
| 5 | Local-device only (no API / backend / FCM / NotificationContext / socket / cross-tab) | ✅ PASS |
| 6 | Accept / Reject / View / popup-queue / dashboard regression | ✅ PASS |
| — | ESLint | ✅ Clean |
| — | Jest `ScanOrderPopOut.test` | ✅ 29 / 29 passing |

---

## 1. Snooze Duration — ✅ PASS

**Expected:** `POPOUT_SNOOZE_MS = 2 * 60 * 1000`; UI says "Snooze 2m" / "2 minutes" / "2 min auto-clear".

**Evidence (grep on `ScanOrderPopOut.jsx`):**

```
59:  export const POPOUT_SNOOZE_MS = 2 * 60 * 1000;
665: title={isUnderlyingSnoozed ? 'Currently snoozed (2 min auto-clear)' : 'Snooze for 2 minutes'}
668: <span>Snooze 2m</span>
```

All consumers reference the constant by name, so `setTimeout(..., POPOUT_SNOOZE_MS)` and `Date.now() + POPOUT_SNOOZE_MS` inherit the new value automatically. No stale `5 * 60 * 1000` literal remains anywhere in the file (`grep -nE "5\s*\*\s*60\s*\*\s*1000" ScanOrderPopOut.jsx` → 0 hits).

**Test evidence:** Existing test `T-9: a snoozed order re-enters the queue after exactly 2 minutes` exercises the duration end-to-end with Jest fake timers (`POPOUT_SNOOZE_MS − 1000` → still hidden; `+ 1000` → re-shows). Passes.

---

## 2. Sound Stop on Click — ✅ PASS

**Expected:** Clicking Snooze calls `soundManager.stop()` exactly once, before the snooze state update, wrapped in `try / catch`.

**Evidence — `ScanOrderPopOut.jsx` lines 236-257 (handleSnoozeClick prologue):**

```js
const handleSnoozeClick = useCallback(
  (orderId) => {
    const idStr = String(orderId);
    // CR SNOOZE_SOUND_STOP_AND_DURATION (Jan-2026): stop the local
    // in-progress chime BEFORE state changes ...
    try {
      soundManager.stop();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[Snooze] soundManager.stop() failed:', e?.message);
    }
    // Reuse existing dashboard snooze handler (sets dim-card UX).
    if (typeof onToggleSnooze === 'function') {
      onToggleSnooze(idStr);
    }
    // Add to pop-out-local hide-set with 2-min expiry.
    setPopOutSnoozeHideSet((prev) => { ... });
    ...
  },
  [onToggleSnooze]
);
```

- ✅ `soundManager.stop()` is the **first** side-effect (before `onToggleSnooze`, before `setPopOutSnoozeHideSet`, before the `setTimeout` schedule).
- ✅ Wrapped in `try / catch`; the catch logs `console.warn` and continues — the snooze state machine cannot break on a transient media error.
- ✅ Imported once: `import soundManager from '../../utils/soundManager';` (line 50).

**Test evidence:**
- `T-11: clicking Snooze calls soundManager.stop() exactly once` — passes; uses `jest.spyOn(soundManager, 'stop')` and asserts exactly one invocation.
- `A-1b: soundManager.stop() is wired exactly once (handleSnoozeClick only)` — static check passes; counts real call expressions (with string-literal masking), confirms exactly 1.

---

## 3. No Global Mute / Future Play Preserved — ✅ PASS

**Expected:** Snooze does **not** call `soundManager.setEnabled(false)`; future `soundManager.play(...)` still works.

**Evidence — static (`grep -nE "soundManager\.(play|setEnabled)" ScanOrderPopOut.jsx`):**

```
23:  //   - soundManager import is allowed ONLY for `soundManager.stop()` inside
26:  //     `soundManager.play(...)`. NO `soundManager.setEnabled(...)`. NO
```

Both hits are inside the anti-rule comment block. **Zero real call expressions** to `soundManager.play(` or `soundManager.setEnabled(` in the component.

**Test evidence:**
- `T-11` asserts `setEnabledSpy` is **not** called on Snooze click.
- `T-12: Snooze does NOT call soundManager.setEnabled(false) and future play() still works` — passes; after Snooze, calling `soundManager.play('new_order')` is reachable and the spy registers the call with the correct argument.
- `A-1: the component module does not introduce play/setEnabled/NotificationContext audio surfaces` — static check passes (regex confirms no `play(` / `setEnabled(` call sites).

---

## 4. After 2 Minutes — Silent Re-Show — ✅ PASS

**Expected:** If the order is still pending, popup may reappear automatically; expiry path does **not** call `soundManager.play()`; no re-alert, toast, banner, vibration, or order mutation on expiry.

**Evidence — expiry callback body (`ScanOrderPopOut.jsx` lines 268-276):**

```js
const handle = setTimeout(() => {
  setPopOutSnoozeHideSet((prev) => {
    const next = new Map(prev);
    next.delete(idStr);
    return next;
  });
  timerRefs.current.delete(idStr);
}, POPOUT_SNOOZE_MS);
```

The entire expiry callback consists of two operations:
1. State setter `setPopOutSnoozeHideSet` that removes the order from the hide-set Map (triggers a silent React re-render).
2. Local Map cleanup `timerRefs.current.delete(idStr)`.

**Zero** invocations of: `soundManager.*`, `toast(`, `notify(`, `addNotification(`, `navigator.vibrate(`, `addOrder(`, `updateOrder(`, `removeOrder(`, API/fetch/axios, socket, `NotificationContext`. Verified by `grep` (see §5 evidence below).

After the state setter fires, the `queue` memo (deps `[orders, popOutSnoozeHideSet]`) recomputes and the order — if still `orderFrom === 'web' && fOrderStatus === 7` — re-enters the queue. The popup renders silently (no audio path is touched).

**Test evidence:**
- `T-13: snooze expiry re-shows popup silently with zero soundManager.play() calls` — passes. Asserts:
  - (a) backdrop re-renders after `jest.advanceTimersByTime(POPOUT_SNOOZE_MS + 100)`,
  - (b) `playSpy` not called during/after expiry,
  - (c) `stopSpy` not called during/after expiry (cleared before the timer-advance),
  - (d) `setEnabledSpy` not called during/after expiry.

---

## 5. Local-Device Only / No API / No Cross-Tab — ✅ PASS

**Expected:** No API call, no backend change, no FCM payload change, no NotificationContext change, no socket emit, no localStorage / BroadcastChannel cross-tab mute.

**Evidence — forbidden-surface grep on `ScanOrderPopOut.jsx`:**

```
$ grep -nE "fetch\(|axios|orderService|api/axios|NotificationContext|useNotification|socket\.emit|BroadcastChannel|localStorage|sessionStorage|navigator\.vibrate|toast\(|new Audio\(" ScanOrderPopOut.jsx
16:  //     was 5 min). The local hide-set is in-memory only — no localStorage,
28:  //   - NO NotificationContext import. Pop-out remains a silent layer for
32:  //   - NO writes to localStorage / sessionStorage / IndexedDB / backend.
```

All three hits are **comments documenting the anti-rule**, not code. Zero real references.

**Diff scope evidence (`git show --stat cc7b179`):**

```
frontend/src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx | +131 / −10
frontend/src/components/dashboard/ScanOrderPopOut.jsx                | +37  / −12
memory/.../SNOOZE_SOUND_STOP_AND_DURATION_FIX_REPORT.md              | +241 new
```

The CR commit touches **only** the two approved code/test files plus the report. No backend file, no FCM service-worker, no `NotificationContext.jsx`, no `firebase.js`, no `socketHandlers.js`, no `useSocketEvents.js`, no `useOrderPollingReconciliation.js`, no `OrderContext.jsx`, no `DashboardPage.jsx`, no `soundManager.js`, no card components.

**Test evidence:**
- `A-2: the component module does not import orderService / api / socketHandlers` — passes; asserts no API/socket import lines and no `confirmOrder(` / `cancelOrder(` / `socket.emit` call sites.
- `A-3: snooze does not write to localStorage / sessionStorage` — passes; spies on `Storage.prototype.setItem`, asserts zero invocations during the snooze flow including past expiry.
- `A-4: snooze does not mutate order.fOrderStatus / order.status` — passes; deep-equals the order before/after a full snooze + expiry cycle.

**Singleton model note:** `soundManager` is a per-tab JavaScript singleton (`soundManager.js:117` — `const soundManager = new SoundManager();` `export default soundManager;`). No `BroadcastChannel`, no `localStorage` backing. Calling `stop()` affects only the current tab's `currentAudio` element. Other tabs / other devices are unaffected.

---

## 6. Regression — Accept / Reject / View / Popup Queue / Dashboard — ✅ PASS

**Expected:** Accept / Reject / View handlers unchanged; popup queue unchanged except 2-min snooze; order stays on dashboard during snooze.

**Evidence — handler shapes (`ScanOrderPopOut.jsx` lines 281-310):**

```js
const handleAcceptClick = useCallback((order) => {
  if (!order) return;
  const entry = buildTableEntryFromOrder(order);
  if (typeof onAccept === 'function') onAccept(entry || order);
}, [onAccept]);

const handleRejectClick = useCallback((order) => {
  if (!order) return;
  if (typeof onReject === 'function') onReject(order);
}, [onReject]);

const handleViewClick = useCallback((order) => {
  if (!order) return;
  const entry = buildTableEntryFromOrder(order);
  if (typeof onEdit === 'function') onEdit(entry || order);
}, [onEdit]);
```

Bodies are **byte-for-byte identical** to the Phase-4 contract — no CR diff touched these.

**Test evidence:**
- `T-5: clicking Accept invokes onAccept with a tableEntry-shaped object` — passes (`{ orderId: 5001, orderType: 'delivery', id: 'del-5001' }`).
- `T-6: clicking Reject invokes onReject with the raw order object` — passes (`onReject.mock.calls[0][0] === order`).
- `T-7: clicking View invokes onEdit with a tableEntry` — passes (`{ orderId: 7001, orderType: 'takeAway', id: 'ta-7001' }`).
- `T-8: clicking Snooze calls onToggleSnooze with the id string AND removes the order from the pop-out queue immediately` — passes; `onToggleSnooze('8001')` invoked, backdrop disappears.
- `T-10: when an order flips out of YTC, it leaves the queue immediately regardless of snooze state` — passes.
- `T-11 (locked Phase-4): Next/Prev chevrons advance and retreat with no wrap` — passes; navigation unchanged.
- `T-15: pop-out auto-dismisses (renders null) when the queue drains` — passes.
- `T-16: dialog has role="dialog", aria-modal="true", aria-labelledby` — passes.
- `I-1: passes the exact handlers through` — passes; integration sanity confirms wiring untouched.
- `I-2: a status flip on the active queued order via prop update auto-drops it` — passes.

**Dashboard-visibility evidence:** `handleSnoozeClick` does **not** modify the input `orders` prop and does **not** call any `OrderContext` mutator (`addOrder` / `updateOrder` / `removeOrder`). The hide-set is purely a popup-side filter. The order therefore remains in `OrderContext.orders` and continues to render on the dashboard YTC card (with the existing `opacity-60` dim from `snoozedOrders.has(idStr)`).

---

## 7. Lint Result — ✅ CLEAN

```
$ ESLint  frontend/src/components/dashboard/ScanOrderPopOut.jsx
✅ No issues found
```

---

## 8. Jest Targeted Suite — ✅ 29 / 29

```
$ cd /app/frontend && CI=true yarn test --testPathPattern='ScanOrderPopOut.test' --watchAll=false

PASS src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx

POS2-002 Phase 4 | ScanOrderPopOut — unit
  ✓ T-1, T-2, T-3, T-4, T-5, T-6, T-7, T-8, T-9 (2-min), T-10,
    T-11 (nav), T-12 (layout), T-13 (predicate orderFrom),
    T-14 (predicate status), T-15, T-16
POS2-002 Phase 4 | ScanOrderPopOut — integration
  ✓ I-1, I-2
POS2-002 Phase 4 | ScanOrderPopOut — anti-tests
  ✓ A-1 (updated allow-list), A-1b (single-call-site), A-2, A-3, A-4, A-5
POS2-002 Phase 4 | pure helpers
  ✓ isUnconfirmedScanOrder predicate quadrants
  ✓ buildTableEntryFromOrder shapes for each channel
CR SNOOZE_SOUND_STOP_AND_DURATION | ScanOrderPopOut — snooze sound-stop
  ✓ T-11 (sound-stop called exactly once)
  ✓ T-12 (no setEnabled; future play still works)
  ✓ T-13 (silent re-show; zero play() calls on expiry)

Test Suites: 1 passed, 1 total
Tests:       29 passed, 29 total
Time:        ~1.3 s
```

Note: The dedicated CR describe block uses `T-11 / T-12 / T-13` (matching the brief), distinct from the locked Phase-4 unit tests that already used the same numeric IDs for different scenarios. The collision is purely cosmetic — Jest scopes test names per `describe` block, no collision in practice.

---

## 9. Issues Found

**None.**

- No code defects.
- No regressions in locked Phase-4 behaviour (predicate, queue ordering, navigation, accept/reject/view wiring, accessibility, status-flip auto-drop, persistence-anti-tests).
- No scope creep — only the two approved files are modified by the CR commit.
- The owner-noted pre-existing transient-refresh race (sister investigation §7 root-cause #2) is unaffected by this CR and remains silent because the popup itself still never calls `soundManager.play()`. Not a CR defect.

**No issues flagged for owner.**

---

## 10. Doc-Sweep Reminder (informational, not a defect)

Per implementation plan §9.2 and fix report §9, the following doc updates were explicitly **deferred** to a separate doc-sweep CR and are intentionally out of scope here:

- `POS2_002_PHASE_4_WEB_YTC_POPOUT_IMPLEMENTATION_HANDOVER_2026_05_10.md` row C-2 still says `"No sound suppression"` (now superseded).
- `POS2_002_PHASE_4_WEB_YTC_POPOUT_QA_REPORT_2026_05_10.md` does not yet include the new T-11 / T-12 / T-13 sound-stop scenarios.

These deferrals were explicitly approved by the plan and are **not** QA blockers.

---

— End of QA Report —
