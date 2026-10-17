# CR-385 Phase 5 — Session 0 (guards only) — 2026-09-23

Authorised by owner 2026-09-23: "Session 0 = read-only guards only (greps, 128 tests, plain `yarn build`, hotspot `git log -1` = 642ccb8, mockup sha, entry read-back). You may run Session 0 now."
Zero API calls, zero browser sessions, zero code changes. Sandbox untouched.

| Guard | Command (plan note §7) | Expected | Actual | Verdict |
|---|---|---|---|---|
| 1 Money (D50 / G-02) | `grep -rn "balance_payment\|remaining_room_balance\|\* 0.05\|\* 0.18\|toISOString" frontend/src/components/pms/frontdesk frontend/src/api/services/frontDeskService.js frontend/src/api/transforms/frontDeskTransform.js \| grep -v __tests__` | exactly 2 lines in `frontDeskService.js` | 2 lines: `frontDeskService.js:70` (comment), `frontDeskService.js:101` `fd.append('balance_payment', '0');` | **PASS** |
| 2 BUG-450 hardcoded room type | `grep -rnE "'executive'\|\"executive\"\|'suite'\|\"suite\"\|Executive Room" frontend/src --include=*.js --include=*.jsx \| grep -v "__tests__\|/tests/\|__fixtures__\|\.test\."` | 0 lines | 0 lines | **PASS** |
| 3 Hotspot byte-identity | `git log -1 --format=%h -- CollectPaymentPanel.jsx orderTransform.js pmsService.js PmsCheckoutDrawer.jsx` on origin `21implement` (`72037e7`) | `642ccb8` | `642ccb8` for all 4 files. Workspace copies sha256 == `642ccb8` blobs: CollectPaymentPanel `b8c1e91f7a17e5cc…`, orderTransform `065710fa63134dca…`, pmsService `b5f139c7361b0d3b…`, PmsCheckoutDrawer `14a7e12e5a3163dd…`. `diff -rq origin/frontend/src /app/frontend/src` → no differences. | **PASS** |
| 4 Mockup sha lock | `sha256sum frontend/public/cr385-frontdesk-mockup.html` | starts `12fd0f4a343fc89d` | `12fd0f4a343fc89d506478db999092d7ca564545b5cb2fc82118ca14c1168b86` | **PASS** |
| 5 cr385 + bug450 jest | `CI=true yarn test --watchAll=false --testPathPattern "cr385\|bug450"` | 128 passed, 0 failed | Test Suites 16/16 passed · Tests 128/128 passed · Snapshots 2/2 · 9.5 s (`s0_guard5_jest.log`) | **PASS** |
| 6 Production build | `yarn build` (plain, no `CI=true`) | exit 0 | `Done in 64.38s.` EXIT=0 (`s0_guard6_build.log`) | **PASS** |
| Entry read-back | `t0_entry_readback.json` (GET settings-list · LR meta · room-status-board) | business_date, r2/r3 owner stays, r4/r5/r1 free/HK, 3 settings default | **NOT RUN** — `memory/test_credentials.md` in this workspace contains no `## QA_TGK` section (3-line header only). Runs first thing after owner writes "QA_TGK rotated" and updates the file. | **BLOCKED (credentials)** |

Note on Guard 3: the `/app` workspace git is the platform repo (7 commits, hotspot files untouched since import `78f4197`); `642ccb8` exists only in origin `Abhi-mygenie/core-pos-front-end-` `21implement`, so the guard was executed against a fresh `--filter=blob:none` clone of origin and cross-checked by blob sha256 against the workspace files.

D17 / BUG-412 re-verify deliberately **not** run here — its pack (`probes_2026_09_21_d17/*_direct.json`, `*_checkin.json`) creates bookings and checks in with advances → mutating → Session A after "Phase 5 GO".
