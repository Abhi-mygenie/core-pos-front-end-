# FCM Reload-Ring — Phase 3 PACK — Gate-3 Implementation Plan

**Covers (owner-directed scope, 2026-11-24):** BUG-747 (autoplay unlock) + **BUG-751 (YTC popup after reload)** + **BUG-752 (stop long buzzer on popup actions)**.
**Design source (verified):** branch `notification-fix` + handover `SESSION_HANDOVER_2026-11-24_FCM_RELOAD_TWO_FE_FIXES.md`.
**Depends on (IN on main):** CR-562 Phase 1 (listener re-attach), BUG-749 Phase 2 (device-token register).
**Supersedes:** `plans/BUG-747_PHASE3_IMPLEMENTATION_PLAN.md` (BUG-747 section below is the same edits).
**Written:** 2026-11-24 · PLANNING role, no app code changed. **Awaiting Gate-4 GO.**
**NOT in this pack:** `fcmDiagLog` diagnostics; BUG-750 Update-Order stop (Phase 5); CR-552 OrderEntry confirm-after-update (separate). CR-562 attach + BUG-749 register effects + BUG-453 mute gate stay untouched.

---

## A) BUG-747 — Autoplay re-unlock + Sidebar tri-state + banner  (Risk MEDIUM)
Full edits in `plans/BUG-747_PHASE3_IMPLEMENTATION_PLAN.md` §3 (unchanged). Summary:
- `utils/soundManager.js`: add `isUnlocked`, `onBlocked`; set `isUnlocked` on play success + call `onBlocked` on blocked `.catch`; add `unlock()`, **single** `setBlockedHandler()`, `getState()`.
- `contexts/NotificationContext.jsx`: `audioUnlocked`/`audioBlockedAt` state + refs; 3-state play gate (replace L180-184, keep BUG-453 mute L172-178); `unlockAudioNow` + boot/blocked effect; expose in context value; mount `<SoundUnlockBanner/>`.
- NEW `components/notifications/SoundUnlockBanner.jsx`.
- `components/layout/Sidebar.jsx`: tri-state Ringer On / Silent / Tap-to-enable.
- NEW unit `__tests__/utils/soundManager.unlock.test.js`.

---

## B) BUG-751 — YTC popup not opening after reload when FCM/socket arrives  (P1, Risk MEDIUM)

**Problem:** After a reload the confirm/YTC FCM can arrive before (or without) the running-orders refresh landing in OrderContext, so `ScanOrderPopOut` never opens until a full refresh. On main there is no bridge from an inbound FCM to OrderContext during `/loading`.

**Edits (ported from branch; deps already on main):**

### B1 — NEW `frontend/src/utils/ytcFcmPending.js`
Module-level `Set` queue of numeric order IDs that survives `/loading`:
`enqueueYtcFcm(id)` (coerce >0 int, add, return id), `removeYtcFcm(id)`, `peekYtcFcmPending()` (non-destructive snapshot). Verbatim from branch.

### B2 — NEW `frontend/src/components/notifications/YtcFcmHydrator.jsx`
Always-mounted (returns null). On `mygenie:ytc-fcm` event and on mount: for each pending id → `addOrder(buildMinimalYtcOrder(id))` (optimistic fos=7 web order → instant popup) → `await fetchSingleOrderForSocket(id)` → if YTC/web-edit eligible `addOrder(full)` else `updateOrder`; `removeYtcFcm` on success, keep on failure for retry; `inFlightRef` guard. Uses `useOrders()` (`addOrder/updateOrder/getOrderById`) + `isUnconfirmedScanOrder`/`hasUnconfirmedWebEditItems` from `ScanOrderPopOut` + `fetchSingleOrderForSocket`. Verbatim from branch.

### B3 — `frontend/src/contexts/AppProviders.jsx`
Import `YtcFcmHydrator`; render `<YtcFcmHydrator />` as the first child **inside `<OrderProvider>`** (above `<StationProvider>`), so FCM during `/loading` is not lost.

### B4 — `frontend/src/contexts/NotificationContext.jsx` (in `processNotification`, after sound resolve)
Add: compute `looksLikeYtcConfirm = isConfirmOrderNotification(data, resolvedSound) || /confirm/i.test(title) || /confirm/i.test(body)` and, when an order id is present, `enqueueYtcFcm(orderId)` + `window.dispatchEvent(new CustomEvent('mygenie:ytc-fcm', { detail:{ orderId } }))`. Import `enqueueYtcFcm` from `../utils/ytcFcmPending`. (Additive; does not alter the BUG-453 mute gate or the play gate.)

### B5 — `frontend/src/pages/LoadingPage.jsx` (orders dispatch, ~L643)
Also read `orders: contextOrders` from `useOrders()`; when building `combined` before `setOrders`, **preserve** any pending optimistic YTC/web-edit order already added by the hydrator whose id is not in `combined` (filter by `peekYtcFcmPending()` + `isUnconfirmedScanOrder`/`hasUnconfirmedWebEditItems`). Port the branch's merge block. **Do NOT** port the branch's profile `?fcm_token=` drift-diagnostic block (that's CR-562 diag, out of scope — boot register is BUG-749 P2, already in).

**BUG-751 verification:** unit (ytcFcmPending enqueue/peek/remove; hydrator optimistic+enrich with mocked `fetchSingleOrderForSocket`); browser (rid69): reload → inbound confirm FCM → ScanOrderPopOut opens optimistically then fills items.

---

## C) BUG-752 — Long confirm buzzer not stopped by popup actions  (P2, Risk MEDIUM)

**Problem:** `ScanOrderPopOut` Accept/Reject/cancel-item/reject-new do not stop a long confirm buzzer (`forty_five_sec_buzzer`); only Snooze calls `soundManager.stop()`. Buzzer keeps ringing after staff act.

### C1 — `frontend/src/components/dashboard/ScanOrderPopOut.jsx`
- Add `stopBuzzer = useCallback(() => { try { soundManager.stop(); } catch(e){ console.warn(...) } }, [])` (stop-only — honours the file's "no play/setEnabled" import rule).
- Call `stopBuzzer()` at the start of `handleAcceptClick`, `handleRejectClick`, and add `handleCancelItemClick(order,item)` + `handleRejectNewItemsClick(order)` wrappers that `stopBuzzer()` then call `onCancelItem`/`onRejectNewItems`. Refactor `handleSnoozeClick` to reuse `stopBuzzer()`. Wire the item `onCancel` (L587,L670) → `handleCancelItemClick`; reject button edit-mode (L784) → `handleRejectNewItemsClick`. Add `stopBuzzer` to the relevant `useCallback` deps. Port verbatim from branch.

**BUG-752 verification:** browser (rid69): long buzzer ringing → Accept / Reject / cancel item / reject-new each **stops** it immediately; Snooze still stops (no regression).

---

## Files WILL change (pack)
soundManager.js · NotificationContext.jsx · Sidebar.jsx · ScanOrderPopOut.jsx · AppProviders.jsx · LoadingPage.jsx · NEW SoundUnlockBanner.jsx · NEW YtcFcmHydrator.jsx · NEW ytcFcmPending.js · NEW tests.
## Files WILL NOT touch
config/firebase.js · CR-562 attach effect · BUG-749 register effect · BUG-453 mute gate · OrderEntry.jsx (BUG-750/CR-552, separate) · fcmDiagLog (excluded).

## Post-Code Registry Checklist
- [ ] registry.json: BUG-747/751/752 → GATE_5A_IMPLEMENTED, gate 4, nov_cr_batch
- [ ] BUG_TRACKER.md + FILE_OWNERSHIP.md rows
- [ ] `// BUG-747` / `// BUG-751` / `// BUG-752` markers in every touched file

## Risk & approval
MEDIUM overall (playback core + Sidebar + ScanOrderPopOut + provider tree + LoadingPage boot). Mitigations: ports verified-on-branch code; additive; excludes diag/Update-Order/CR-552; shipped CR-562/BUG-749/BUG-453 code untouched. Deviation note: 3 coupled items in one plan/GO (same family, same source) — QA still verifies each concern separately. **Needs Gate-4 GO before coding.**
