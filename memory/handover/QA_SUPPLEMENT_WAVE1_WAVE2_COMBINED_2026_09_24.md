# QA SUPPLEMENT — sep_bug_closure Combined Wave 1 (remaining) + Wave 2 QA Plan

**Date:** 2026-09-24
**Role:** PLANNING (pre-written for the next QA agent)
**Trigger:** Wave 1 QA deferred mid-session (agent died after Round 2). Owner decision: run all outstanding Wave 1 cases + full Wave 2 together in one combined QA run after Wave 2 implementation.

**Commit under test when this runs:** Wave 2 implementation commit (TBD — after BUG-452 Gate 4 GO)
**Predecessor QA results that stand (do not re-run):** `iteration_1.json` PASS · `iteration_2.json` PASS · `iteration_3.json` partial PASS

---

## 1. Wave 1 Outstanding Cases (do NOT re-test already-PASS items)

Already PASS — locked, do not re-run:
VA-1/2/6/7/8 · VB-1/2/3/13 · VC-1/2/3/6/7/8/9 · VB-12 NOTE (pre-existing) · R-3

### 1a. VB-7 Visual Retest (PARTIAL in Round 2)

| # | Test | Steps | Expected |
|---|---|---|---|
| VB-7a | Silent Mode banner visible with dashboard in view | Enable Silent Mode (sidebar toggle) → **close Settings panel** → fire test notification (NotificationTester) → check `[data-testid^=notification-banner-]` in DOM | Banner visible. Audio already confirmed silent (silent_plays=0 from Round 2 — do not re-verify audio) |

Round 2 confirmed audio portion. Banner query returned false only because Settings panel was covering the dashboard. Retest with panel closed.

### 1b. VB-4/5/6/8/9 — Real-Order Mute Flow (NOT COVERED in any round)

Requires a real incoming customer order (ScanOrderPopOut visible on dashboard). Use `run_round3.py` as the base script.

| # | Test | Pre-condition | Steps | Expected |
|---|---|---|---|---|
| VB-4 | Muted order retry: no sound, no banner | Real order X received on dashboard | Press `popout-snooze-btn-{X.id}` (mute) → trigger another notification for same order X (NotificationTester with X's orderId, or real retry) | No sound. No NotificationBanner for X. Console: `[Notification] BUG-453 muted order X — sound + toast suppressed` |
| VB-5 | Other orders still ring | Order X muted (VB-4 done) | Trigger notification for order Y (different orderId) | Y rings. Y's banner appears. X unaffected. |
| VB-6 | Unmute restores ringer | X muted (VB-4) | Press snooze button again for X (toggle off) → trigger notification for X | X rings. X's banner appears. |
| VB-8 | Logout clears mute state | X muted (VB-4 done, VB-6 NOT done) | Logout → login → trigger notification for X | X rings + banner (mute cleared on logout by `soundManager.clearMutes()`) |
| VB-9 | Visual snooze regression | Real order card on dashboard | Press snooze on OrderCard or TableCard → bell icon dims. Press again → undims. | Visual toggle unchanged from pre-Wave-1 behaviour |

**Note for VB-4:** The mute guard in `NotificationContext` runs AFTER the BUG-034 dedup check. It reads `String(data.orderid || data.order_id || data.orderId || '')`. The `NotificationTester` in Settings sends `data.order_id`; real FCM sends `data.orderid`. Both are caught by the fallback chain (B-5 evidence).

### 1c. Automation-Blocked Cases (not a QA failure — testid gap)

| # | Test | Status | Note |
|---|---|---|---|
| VC-5 | Category counts | NOT COVERABLE | Header Add button has no `data-testid` → OrderEntry cannot open. If main agent adds `data-testid="header-add-order"` before this QA run, promote to coverable. |
| R-1 | Walk-in full regression | NOT COVERABLE | Same gap |
| R-2 | Occupied table regression | NOT COVERABLE | `data-testid="order-entry"` missing on OrderEntry root |

Record as NOT COVERABLE (not FAIL) unless testids are added.

### 1d. Owner-Manual (Gate 6 — out of scope for QA agent)

VA-3/4/5 (Chrome install / standalone / push icon) · VB-10/11 (real FCM dedup / POS2-007 tone) · VC-4 (yabyum 561-item restaurant)

---

## 2. Wave 2 QA Cases — BUG-452 (full run)

| # | Test | Steps | Expected | Auto? |
|---|---|---|---|---|
| VD-1 | Type switch mid-build clears cart | Walk-in, add 3 items → switch to TakeAway via header badge | Cart empty, no dialog or toast (silent clear) | Unit + preprod |
| VD-2 | Table switch mid-build clears cart | Table 5 with 2 unplaced items → pick Table 7 from header dropdown | Cart empty on Table 7 | Unit + preprod |
| VD-3 | Old key stays empty | After VD-2, reopen Table 5 | Empty cart (was stale before fix) | Preprod |
| VD-4 | Occupied A → Occupied B: B loads from server | Open occupied Table A → switch to occupied Table B | B shows B's placed items (from `orderData`); A's server order unchanged | Preprod |
| VD-5 | Placed items never affected | After VD-4, verify server order for Table A | Order A on server unchanged (no API call on switch, OD-452-03 by construction) | Curl / preprod |
| VD-6 | No remount when OrderEntry closed | OrderEntry not open → click table from grid | Single mount (nonce not bumped — guard `orderEntryType !== null`) | Unit |
| VD-7 | Prepaid null path | After prepaid settle, `onSelectTable(null)` fires | No nonce bump, OrderEntry closes normally | Unit + preprod |
| VD-8 | Merge/Shift/Payment modal across in-OE table pick | Owner A/B/C decision recorded | Per decision: modal re-opens (A) or bump guarded (B) | Preprod |
| VD-9 | Walk-in full flow R13 | Add → items → place → Collect Bill → close → Add again | Empty cart on second open | Preprod |
| VD-10 | PROD-004 stay-on-order | Toggle ON → place → Collect Bill → nonce bumped by PROD-004 path → fresh walk-in | Fresh empty walk-in, no stale items | Preprod |
| VD-11 | Sidebar Refresh with OE closed | ↻ with OrderEntry not open | `cartsByTable` cleared (L545 path), no mount changes | Preprod |
| VD-12 | BUG-334 bookkeeping in code | `grep -n "BUG-334" src/components/order-entry/OrderEntry.jsx` | Only the reversed comment at L505–508; no logic branch | Grep (auto) |
| VD-13 | Existing OE tests still green | `yarn test src/__tests__/components/order-entry/` | All pass, 0 new failures | Jest (auto) |
| VD-14 | Build | `yarn build` | Exit 0, 0 new warnings | Build (auto) |

**VD-8 note:** Do not execute until VD-8 owner A/B/C decision is confirmed and plan §D updated accordingly.

---

## 3. Regression Tests (Mandatory — R5 × 2 files)

Per AGENT_PROMPT_ALPHA Role 4: both `DashboardPage.jsx` and `OrderEntry.jsx` are R5 hotspots. Wave 1 (BUG-453) and Wave 2 (BUG-452) both touch `DashboardPage.jsx` in the same sprint. Required: handover regressions + 2 cross-flow tests minimum.

| # | Cross-Flow Test | Why Needed | Files Exercised |
|---|---|---|---|
| REG-1 | Walk-in: Add → add 2 items → place → Collect Bill → close → Add again → confirm empty cart | BUG-452 clears on switch; BUG-453 toggleSnooze on same DashboardPage; end-to-end R13 | DashboardPage + OrderEntry |
| REG-2 | Occupied table: open → add unplaced item → place → confirm placed items on server intact | BUG-452 remount must not affect placed-item restoration via `orderData` branch | OrderEntry effect + orderData |
| REG-3 | Mute an order (BUG-453) + switch cart type mid-session (BUG-452) in same login | Both features co-exist on same DashboardPage; `toggleSnooze` import + nonce bumps in same file | DashboardPage.jsx |
| REG-4 | TakeAway order: add items → switch to Delivery mid-build → confirm empty → place new TakeAway → place | Both orderType changes trigger nonce bump; final order placed correctly | DashboardPage + OrderEntry |

---

## 4. Coverage Requirement

| File changed in Wave 2 §D | Coverage check |
|---|---|
| `DashboardPage.jsx` (D-1/D-2 nonce bumps) | VD-1/VD-2 preprod + REG-1 |
| `OrderEntry.jsx` (D-3 comment only) | VD-12 grep + VD-13 existing tests |
| `DashboardPage.bug452.test.jsx` (new) | Itself (VD-1/VD-2/VD-6/VD-7 unit) |

Wave 1 files re-verified this run: `soundManager.js` (VB-3 already PASS; VB-4/5/6 new) · `NotificationContext.jsx` (VB-4/VB-8) · `DashboardPage.jsx toggleSnooze` (VB-9) · `constants.js` + `useRefreshAllData.js` (VC-6 already PASS).

---

## 5. Environment Notes

- **Account:** `FIVESTAR_OWNER` alias (restaurant 739, 433 products) for most cases.
- **Real orders (VB-4/5/6/8/9):** Need a live customer order via public Scan link. Co-ordinate with owner. Alternatively use `yabyum` alias if owner provides credentials — also needed for VC-4.
- **KDS intermittency:** fivestar KDS endpoint is intermittent (≥60 s). Use the boot-with-retry loop from `run_round3.py` (up to 3 retry clicks). This is external/backend — not a Wave finding.
- **Pre-existing failure:** `ScanOrderPopOut.test.jsx` 22/29 red — log as NOTE only. Stash-verified at clean HEAD.
- **CORS errors on `/profile`:** 2 intermittent CORS errors in console are external preprod — not Wave 1 or Wave 2.

---

## 6. QA Report

Write a **single combined report:**
`test_reports/QA_REPORT_SEP_BUG_CLOSURE_WAVE1_WAVE2_COMBINED_<date>.md`

Sections:
1. Wave 1 outstanding cases — PASS / FAIL / NOTE / NOT COVERABLE per row
2. Wave 2 cases — PASS / FAIL / NOTE per row
3. Regression REG-1..4 — PASS / FAIL per row
4. Coverage table (N/N changed files with ≥1 executed test)
5. Registry spot-check: `registry.json` status for BUG-451 / BUG-453 / CR-386 / BUG-452
6. Summary totals + overall verdict
7. Findings with severity (BLOCKER / MAJOR / MINOR / NOTE) per ALPHA v0.7 Role 4

Gate 5B closes **per item** when all that item's cases are PASS or classified OWNER-MANUAL with 0 BLOCKER/MAJOR findings.
