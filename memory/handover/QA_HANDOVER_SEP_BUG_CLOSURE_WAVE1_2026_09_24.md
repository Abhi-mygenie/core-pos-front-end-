# QA HANDOVER — sep_bug_closure Wave 1 (CR-386 · BUG-453 · BUG-451) — 2026-09-24

**From:** IMPLEMENTATION (Gate 5a) · **To:** QA (Gate 5b) · **Commit:** `3783ee8` (base `7aa95c4`)
**Risk:** CR-386 LOW · BUG-453 MEDIUM · BUG-451 HIGH (class) / LOW (edit) · none financial (R6)
**Plan:** `plans/SEP_BUG_CLOSURE_CONSOLIDATED_GATE3_IMPLEMENTATION_PLAN.md` §A3 / §B3 / §C3

## 1. Inherited from Plan (Verification Matrix — self-test results)

| Edit | File | Verification | Self-Test |
|---|---|---|---|
| A-1..A-6 | `public/index.html`, `manifest.json`, 3 PNGs | VA-1 curl manifest 200 JSON · VA-2 PNGs 200 image/png · VA-6 head grep = 3 · VA-7 build exit 0 + assets in `build/` | PASS ✅ |
| B-1..B-4 | `utils/soundManager.js` | VB-1/VB-2 unit `soundManager.bug453.test.js` 4/4 | PASS ✅ |
| B-5, B-6 | `contexts/NotificationContext.jsx` | static: guard after BUG-034 dedup, before play; `data.orderid` first; logout `clearMutes()` | PASS ✅ (static) |
| B-7, B-8 | `pages/DashboardPage.jsx` | static: import + 1 additive line in `toggleSnooze`, no existing line changed | PASS ✅ (static) |
| B-9 | `components/dashboard/ScanOrderPopOut.jsx` | `git diff` comment-only | PASS ✅ |
| C-1..C-6 | `api/constants.js`, `pages/LoadingPage.jsx`, `hooks/useRefreshAllData.js`, `api/services/productService.js` | VC-1 `grep "limit: 500" src/` = 0; `DEFAULT_LIMIT: 2000` = 1 · VC-2 unit `productService.bug451.test.js` 3/3 · VC-9 build exit 0 | PASS ✅ |

testing_agent independent run: `/app/test_reports/iteration_1.json` — PASS, 0 findings.

## 2. Test cases for QA (authenticated preprod — need test account)

| # | Item | Test | Steps | Expected |
|---|---|---|---|---|
| VA-3 | CR-386 | Manifest valid | Chrome DevTools → Application → Manifest | 0 errors, 3 icons, installable |
| VA-4 | CR-386 | Install flow | Address-bar Install → login → dashboard | standalone window, MyGenie icon |
| VA-5 | CR-386 | Push icon | DevTools → SW → Push (or real FCM) | notification shows logo, not bell |
| VA-8 | CR-386 | Regression | login → /loading → /dashboard → OrderEntry open/close | unchanged |
| VB-3 | BUG-453 | Mute stops chime | Settings → Notification Test → fire 2 sounds fast → press Mute on pop-out | sound stops immediately |
| VB-4 | BUG-453 | Retry suppressed | order X muted → fire notification with same order id | no sound, NO banner, console `[Notification] BUG-453 muted order X` |
| VB-5 | BUG-453 | Others unaffected | notification for order Y while X muted | rings + banner |
| VB-6 | BUG-453 | Unmute | press Mute again on X → fire X | rings + banner |
| VB-7 | BUG-453 | Silent Mode wins | Sidebar Silent Mode ON → fire any | no sound; banner still for non-muted |
| VB-8 | BUG-453 | Logout clears | mute X → logout → login → fire X | rings |
| VB-9 | BUG-453 | Visual snooze regression | bell on OrderCard/TableCard dims/undims with same press | unchanged |
| VB-10 | BUG-453 | BUG-034 dedup | duplicate FG+SW delivery | one banner |
| VB-11 | BUG-453 | POS2-007 tone | confirm-order notification, non-muted | override tone applied |
| VC-3 | BUG-451 | Full menu | login as 561-product restaurant → LoadingPage products counter | `561 / 561`; Network `limit=2000` |
| VC-4 | BUG-451 | Item 501+ | OrderEntry search for a product beyond position 500 | found |
| VC-5 | BUG-451 | Category counts | chips vs backend | equal |
| VC-6 | BUG-451 | Sidebar refresh | ↻ | count unchanged, `limit=2000` |
| VC-7 | BUG-451 | Small menu | cafe103-class alias boot | `loaded == total`, no change |
| VC-8 | BUG-451 | LoadingPage sequencing | tier order + per-station retry (CR-038) | unchanged |

Note for VB-3..VB-8: `NotificationTester` (Settings panel → `notification-test`) calls `simulateNotification(payload)` = `processNotification`; its presets carry `data.order_id` (caught by the B-5 fallback chain). Real FCM carries `data.orderid` (B0 evidence) — same code path.

## 3. Regression tests (R5 hotspots: DashboardPage.jsx, LoadingPage.jsx)
| # | What | Why |
|---|---|---|
| R-1 | Walk-in Add → items → place → Collect Bill (R13) | DashboardPage touched |
| R-2 | Occupied table open → edit → place | DashboardPage touched |
| R-3 | Boot tier-2 parallel batch + per-station retry (offline one call) | LoadingPage touched |
| R-4 | Existing `ScanOrderPopOut.test.jsx` | **pre-existing 22/29 red at clean HEAD — NOT a Wave 1 regression** (stash-verified) |

## 4. Registry Sync Confirmation
Registry synced: YES · Items: CR-386, BUG-453, BUG-451 · Sprint: sep_bug_closure
EXIT GATE: **5/5 PASSED** (registry IMPLEMENTED ×3 · BUG_TRACKER/CR_REGISTRY rows · FILE_OWNERSHIP Wave 1 section · code markers in all 9 edited files · webpack compiled, 0 new warnings)

## 5. Credentials + Environment
Preview: `REACT_APP_BACKEND_URL` (frontend/.env) · Backend: preprod.mygenie.online (external)
Account: **NOT AVAILABLE in this checkout** — no `memory/test_credentials.md`; prior handovers mask credentials (R20). Owner must supply a preprod test account (ideally the 561-product restaurant for VC-3) before authenticated QA cases can run.
