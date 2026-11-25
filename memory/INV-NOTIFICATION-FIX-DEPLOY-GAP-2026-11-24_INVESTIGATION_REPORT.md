# INVESTIGATION — notification-fix pack vs deployed branch (2026-11-24)

**Role:** INVESTIGATION (read-only — no code edited)
**Trigger:** Owner asked to verify the `notification-fix` work (ringer-after-reload, web-edit food_status=7 banner stuck, CR-527 TAB holder→customer, credit diner UX) against the two uploaded handovers and find gaps.
**Scope docs:** `SESSION_HANDOVER_2026-11-24_FCM_RELOAD_TWO_FE_FIXES.md`, `SESSION_HANDOVER_2026-11-24_CREDIT_TAB_CUSTOMER_AND_DINER_UX.md` (both uploaded; also present on branch `notification-fix`).

---

## 1. Summary (root finding)

**The running/deployed branch is `main` (`07b8f43`). Every fix described in both handovers lives on branch `notification-fix` (`8c80bfe`, single commit "Ship FCM reload/ringer fixes, TAB cust_* holder payload, and credit diner UX"), which is NOT merged into `main`.**

Result: on the live app (main) **none** of the four reported items are fixed. The handovers are accurate descriptions of the `notification-fix` branch, not of what is deployed.

Classification: **CONFIG/branch gap (unmerged work)** + one **partial-implementation** nuance on CR-527.
Confidence: **HIGH** (git tree + line-level diff evidence).

`notification-fix` vs `main`: **79 files, +4403 / −298**.

---

## 2. Item-by-item: claimed vs deployed

### A. Ringer does not ring after hard reload (FCM pack)
- **notification-fix:** present. New files `components/notifications/SoundUnlockBanner.jsx`, `components/notifications/YtcFcmHydrator.jsx`, `utils/ytcFcmPending.js`, `utils/fcmDiagLog.js`; `NotificationContext.jsx` +174, `Sidebar.jsx` +30 (adds **"Tap to enable"** 3rd ringer state), `soundManager.js` +64 (`audioUnlocked`/unlock), `config/firebase.js` +37, `LoadingPage.jsx`, `DashboardPage.jsx`. Markers `audioUnlocked`, `setAudioBlockedAt`, `unlockAudioNow`, `Tap to enable`, `SoundUnlockBanner`, `ytcFcmPending` all present.
- **main (deployed):** **absent.** Those 4 files do not exist; markers = 0. `NotificationContext.jsx` still uses the `initializedRef` one-shot gate (lines 214–215, 274–275) — the pre-fix behavior the pack reworks for StrictMode/reload survival. `Sidebar.jsx` has only 2 states (Ringer On / Silent Mode), no "Tap to enable".
- **Gap:** reported symptom ("no ring after reload", no unlock banner, YTC popup not rebuilt after reload) **still live on main**.

### B. Web Edit → Update Order leaves food_status=7, ScanOrderPopOut stays stuck until Accept
- **notification-fix:** fixed in `components/order-entry/OrderEntry.jsx` (+41). After Update-Order socket-engage, if web order still has Not-Confirm (food_status=7) lines it auto-calls `confirmOrder(...)` (+ CR-559 printer-agent selection / `updatePrintStatus` when auto-KOT gated), mirroring `DashboardPage.handleConfirmOrder`. Imports added: `confirmOrder, updatePrintStatus`, `printerAgentSelector`.
- **main (deployed):** `ScanOrderPopOut.jsx` has the CR-552 Mode A/B rendering + `soundManager.stop()`, **but `OrderEntry.jsx` does NOT auto-confirm** — the unstick call is absent. So Edit→Update still leaves fos=7 and the banner sticks until manual Accept — **exactly the reported symptom, still live on main.**

### C. CR-527 — TAB/credit "tab holder becomes the customer" (`cust_*`)
- **main (deployed) — PARTIAL.** `orderTransform.js` already threads the diner into `diner_name`/`diner_mobile` and keeps the holder in the TAB `name`/`mobile` block; `orderTransform.cr527.test.js` (capture phase) asserts this. **BUT** `cust_*` precedence is still **customer-first**:
  - `collectBillExisting` L1415–1421: `cust_name: customer?.name || (isTab ? tabContact?.name : '')` → when an outer diner exists, **diner lands in `cust_*`** (→ `orders.user_name`, Daily Report CUSTOMER, CRM sync show the diner, not the holder). This is the bug the handover targets.
- **notification-fix — FIXED.** Same spots become **holder-first** when `isTab`: `cust_name: isTab ? (tabContact?.name || customer?.name || '') : (customer?.name || '')` (collectBillExisting ~L1415 and placeOrderWithPayment ~L1802); `orderTransform.cr527.test.js` +46 adds assertions that holder is in `cust_*`.
- **Gap:** the "tab holder → CUSTOMER" fix is **only on notification-fix**; live app still books the diner as the customer on TAB/credit.

### D. Credit Management — diner dropdown UX
- **notification-fix:** `components/credit/CreditCustomerDetailSheet.jsx` (+41) — `<Popover modal={false}>` (L669), `onWheel`/`onTouchMove` `stopPropagation` on PopoverContent + CommandList (L687–694) to fix wheel/touch scroll; `dinerMap` keeps mobile and renders two-line "name · mobile" on dropdown/chips/summary (L603–724).
- **main (deployed):** **absent** (file identical to pre-fix). Scroll-trap and same-name-no-mobile problems still live.

---

## 3. Other observations / risks

1. **Handover path prefix mismatch (cosmetic):** both docs reference `pos-react/frontend/...`; this repo is `core-pos-front-end-` served from `/app/frontend`. Files map 1:1 — naming only, not a code gap.
2. **`web-edit-order-confirm` branch is NOT the food_status fix.** It is a large, divergent branch (reports module; +660/−2519) whose tip is just a chore commit. Do not confuse it with item B — the real B fix is on `notification-fix`.
3. **Merge-safety caveat (verify before merging nf→main):** the deploy clone is shallow (`--depth 1`), so there is no shared history / clean merge-base with `nf`. `diff main..nf` shows **298 deletions** as well as additions — some may be `nf` lacking newer `main` commits rather than intentional reworks. A full (unshallow) 3-way compare is required before merging to ensure `notification-fix` is not behind `main` on unrelated files.
4. **Open items the handovers themselves flag (not regressions, carry forward):** FCM type detection relies on a "confirm" title/body heuristic; Mute is device-local (not cross-device); no backend token force-refresh in this pack; backend `OrderController` has no promote-from-`name` (so the holder reaching `orders.user_name` depends on `cust_*` being set — which only `nf` now does).

---

## 4. Evidence
- Remote refs: `git ls-remote --heads origin` → `main=07b8f43`, `notification-fix=8c80bfe`.
- `git diff --stat main nf` (79 files); line greps on `main` (0 markers) vs `nf` (markers present).
- `orderTransform.js` L1415–1421 (main customer-first) vs `nf` holder-first; `OrderEntry.jsx` diff (CR-552 confirm block, nf-only); `CreditCustomerDetailSheet.jsx` nf L669/687–694/603–724.

## 5. Recommendation (owner decision — no code changed)
- To make the four fixes live, **branch `notification-fix` must be merged/deployed to `main`** (after the §3.3 full-history safety compare). No follow-up investigation needed; root cause = unmerged branch.
- If owner wants only a subset live (e.g. C + B first), they can be cherry-picked, but B depends on the CR-559 `printerAgentSelector` import also present on `nf`.
