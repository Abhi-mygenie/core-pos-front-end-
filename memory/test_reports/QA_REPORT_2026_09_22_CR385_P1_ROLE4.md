# QA REPORT (Role 4, formal) — CR-385 Phase 1 · M7 Front Desk Rules · M2 Cancel / No-Show / Modify — 2026-09-22

```
Verification complete: CR-385 Phase 1 (M7 + M2) + BUG-440 fix · fresh run, iteration_11/12 NOT reused
Result:     PASS (Phase 1 code) · 1 expected FAIL on legacy pages = BUG-441 (INTAKE, not P1 code)
Tests:      33 total · 31 PASS · 1 expected FAIL (BUG-441) · 1 NOTE (M2-08 popover enumerated, item click not driven)
Viewports:  1920×800 + 1366×768 (iteration_14) · X-10 sweep both viewports (main agent)
Blockers:   none in Phase 1 scope
Coverage:   10/10 changed files
Registry:   SYNCED (spot-check CR-385 / BUG-440 / BUG-441 on pos_pms_2 ✓; BUG-442 added)
Reports:    /app/test_reports/iteration_13.json (aborted — env drift, see §0) · /app/test_reports/iteration_14.json (full run) · evidence/CR-385/phase1_qa_role4/
Next:       Gate 6 — combined Phase 0 + Phase 1 OWNER SMOKE (control/POS_PMS_2_OWNER_SMOKE_BATCH_2026_09_21.md S-1…S-20) → then Phase 1.5 (BUG-441, BUG-442)
```

## 0. Precondition + run notes
- QA handover §4: Registry synced YES · EXIT GATE 5/5 → accepted. Spot-check `python3` on CR-385/BUG-440/BUG-441 → statuses + `sprint_key pos_pms_2` ✓.
- Sandbox business date rolled 21 → **22 Sep** during the session: seeded bookings 225/226/227 (Suite, pending) moved to the **Late** chip. iteration_13 aborted on that + wrong chip ids (`fd-chip-late` vs actual `fd-chip-arrivals-late`); its "radio MAJOR" was **not reproducible** (main agent: `page.click`/`page.check`/keyboard ArrowDown all flip the radio and enable Save) → dismissed. iteration_14 re-ran everything from the Late chip.
- Sandbox end state: 225/226/227 cancelled (200 ×3), settings at defaults (reload-verified), only room write r4 (none needed in it.14 — RoomDetail opened read-only), no No-Show confirmed, 8524/8526 untouched.

## 1. Owner mandates (Phase 1 GO §1.3 + safeguards)
| Mandate | Result | Evidence |
|---|---|---|
| updateFrontDeskRules multipart body | PASS — 3 captured POSTs, single `data` part, exact JSON (`held`, `early true`, defaults) | it.14 R-M7_*; `phase1_qa_role4/` |
| preview body `preview:true` | PASS — body EXACTLY `{checkin, checkout, reason, preview:true}` | it.14 R-M2-03 |
| confirm body no `amount_after_tax` | PASS — `{checkin, checkout, reason}` only, no `preview` | it.14 R-M2-05 |
| nsOrCancel wiring | PASS — 13 Late rows: 11 Direct → Cancel only, 2 booking.com (7/23) → No-Show only; drawer `-exp-` same | it.14 R-M2-01 |
| inline dialogs no `fixed` | PASS — `w-full` inline (cancel + noshow), no backdrop style; legacy overlay still `fixed inset-0` | it.14 R-M2-02/06/07, R-LEGACY |
| legacy ArrivalsPage unchanged | PASS — overlay dialog + `arr-kebab-*` intact (unit snapshot also green) | it.14 R-LEGACY |
| debounce ≥ 500 ms, serialised | PASS — 0 PATCH < 400 ms, 1 PATCH after; burst of 3 → 1 PATCH; reason propagates | it.14 R-M2-03 |
| **preview persistence** | **PASS** — ≥3 previews → reload → 226 still 21→22 Sep, 1 night, ₹37,170 | it.14 R-M2-04 |
| settings end at defaults | PASS (reload) | it.14 R-M7_restore_defaults |
| test bookings Suite only, cancelled | PASS | it.14 R-M2-02/06, R-CLEANUP |

## 2. Cases
| # | Case | VP | Result | Sev |
|---|---|---|---|---|
| M7-01 | 5 tabs, tabs 0–3 render | both | PASS | — |
| M7-02 | defaults, Save disabled | both | PASS | — |
| M7-03a | radio click/check/keyboard → dirty + Save enabled | 1920 | PASS (it.13 MAJOR dismissed) | — |
| M7-03b | held → Save → reload; early ON → Save → reload; defaults → Save → reload | 1920 | PASS | — |
| M7-03c | card fits, no overflow | 1366 | PASS | — |
| M2-01 | row matrix XOR + disabled Check In + drawer ids | both | PASS | — |
| M2-02 | Cancel 225 inline: card ₹37,170/₹0/₹0 + ribbon, reasons, POST 200, row gone, tile −1 | 1920 | PASS | — |
| M2-03 | Modify 226 preview: min, current plan, debounce, exact body, figures from `charge`, burst, reason | 1920 | PASS | — |
| M2-04 | preview persistence | 1920 | PASS | — |
| M2-05 | confirm body clean → row 23 Sep / 2 nights / ₹74,340; zero-night guard | 1920 | PASS | — |
| M2-06 | Cancel modified 226: card ₹74,340, scrollWidth 1366 | 1366 | PASS | — |
| M2-07 | No-Show inline read-only, remark typeable, close | both | PASS | — |
| M2-08 | alert popover lists "Stay expired" items with unique ids | 1920 | PASS/NOTE (click-through not driven) | NOTE |
| X-10 | duplicate testids: detail / cancel / noshow / modify / alerts popover / RoomDetail r4 / CM tab | both | PASS — 0 duplicates (161–168 ids; 108 Rooms; 31 CM) | — |
| REG-LEGACY | `/pms/arrivals` ⋮ → Cancel 227: overlay ✓, reasons ✓ (BUG-440), Confirm → POST `…/MG-69-…/cancel` → **500** | 1920 | **FAIL (expected) → BUG-441** | BLOCKER (legacy only) |
| REG-LEGACY-b | `/pms/reservations` popover Cancel | — | NOTE — block not driven; same code path L375 (`res.bookingId`) → BUG-441 | NOTE |
| REG-P0 | header/business date 22 Sep, tiles vs counts (13→10 late), Departures 2 overdue, In-House 2 rows, Rooms 0 free/40 %, Late pre-selected (BUG-437), tabs render, legacy `/pms/front-desk` + `/pms/room-status` render | both | PASS (it.14 spot + main-agent sweep) | — |
| REG-P0-console | console errors on Front Desk / Channel Manager / legacy pages | both | PASS — 0 (filtered socket/firebase; RatesTab key warning pre-existing) | — |
| REG-P0-deep | BUG-434 offline Retry, BUG-435 focus batch, Rooms Area group-by persistence, r4 Mark Clean/Request HK, search `/` | — | NOT RE-RUN this cycle (unchanged P0 code; verified it.7–10; covered by owner smoke S-7…S-11) | NOTE |

## 3. Findings
| ID | Sev | Class | Status |
|---|---|---|---|
| BUG-441 | BLOCKER (legacy) | CODE_ERROR CR-362 — `reservationId: row.bookingId` on ArrivalsPage L272–273 / ReservationsPage L370/375 | INTAKE (already) — **Phase 1.5** |
| **BUG-442 (new)** | MINOR | CODE_ERROR — `cancelled_by` always `"staff"` (`restaurant.profile.fullName` does not exist; use `AuthContext.user.fullName`) — 3 call sites incl. CR-385 page | INTAKE — **Phase 1.5** (new panel) + legacy routing |
| it.13 "radio MAJOR" | — | NOT REPRODUCIBLE (tester environment) | dismissed |
| NOTE | — | Legacy `/pms/room-status` header shows the browser date (21 Sep) while Front Desk shows business date 22 Sep — pre-existing X-06 gap on the old page; retires with FU-385-C | log only |
| NOTE | — | One Playwright click on `fd-row-15-modify-btn` right after closing a No-Show expansion did not open (scroll timing); reproduced OK with scroll-into-view; not a product defect | log only |

## 4. Coverage — 10/10
ChannelManagerPage (M7-01) · FrontDeskRulesTab (M7-02/03) · restaurantSettingsService (M7-03 capture) · CancelBookingDialog (M2-02/06, REG-LEGACY) · NoShowDialog (M2-07) · frontDeskService (M2-02/03/05) · ModifyBookingForm (M2-03/04/05) · ArrivalsPanel (M2-01/02/07, X-10) · FrontDeskWorkstationPage (refetch after cancel/modify, alerts, X-10) · phase1.cr385.test.jsx (58/58 green at handover).

## 5. QA → Owner
QA complete. 31/33 passed, 1 expected FAIL (BUG-441, legacy pages, INTAKE), 1 NOTE. Coverage: 10/10 files tested. Registry: SYNCED. Phase 1 code has **no open BLOCKER/MAJOR**. Ready for **Gate 6 (combined Phase 0 + Phase 1 owner smoke, S-1…S-20)**. Phase 1.5 candidates: **BUG-441** (legacy id → 500), **BUG-442** (`cancelled_by` "staff"). QA report at `memory/test_reports/QA_REPORT_2026_09_22_CR385_P1_ROLE4.md`.
