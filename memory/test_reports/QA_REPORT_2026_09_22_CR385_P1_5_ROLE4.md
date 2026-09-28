# QA REPORT (Role 4, re-test protocol) — CR-385 Phase 1.5 · BUG-441 + BUG-442 — 2026-09-22

```
Verification complete: CR-385 P1.5 (BUG-441 numeric LR id on legacy Cancel/Modify · BUG-442 cancelled_by = user.fullName) + full Phase 1 re-run
Re-test round 1: 6/7 pass (BUG fixes; P15-04 legacy Reservations cancel unreachable → BUG-444) · Re-test round 2: 7/7 executed pass · main-agent sweep P15-11/12/13 both viewports pass
Phase 1 cases re-run: 33/33 PASS (was 31/33 — REG-LEGACY now PASS, NOTE closed)   ·   P1.5 new cases: 6/7 PASS, 1 BLOCKED (BUG-444, out of P1.5 scope)
Viewports:  1920×800 + 1366×768
Blockers:   none in P1/P1.5 code · new intakes: BUG-443 (MAJOR, legacy Modify payload) · BUG-444 (MINOR, tape chart)
Coverage:   3/3 changed files (ArrivalsPage, ReservationsPage, FrontDeskWorkstationPage) + test file · unit 63/63 (was 58) · yarn build exit 0
Registry:   SYNCED (BUG-441/442 FIXED + QA-VERIFIED · CR-385 GATE_5B_QA_PASSED (P1+P1.5) with BUG-444 caveat · BUG-443/444 INTAKE) — spot-check PASS
Sandbox:    clean — 228…233 (6 Suite bookings, pending only) cancelled with numeric ids (200); settings at defaults (reload-verified); r4 untouched this cycle; no No-Show confirmed; 8524/8526 untouched
Reports:    /app/test_reports/iteration_15.json (rounds 1+2 merged) · evidence/CR-385/phase1_5_qa/
Next:       owner routing BUG-443/444 → Gate 6 combined owner smoke P0+P1+P1.5 (S-1…S-24; S-22 blocked by BUG-444)
```

## 1. P1.5 fix verification
| # | Case | VP | Result | Sev | Evidence |
|---|---|---|---|---|---|
| P15-01 | legacy `/pms/arrivals` ⋮ Cancel 230 → `POST …/local-reservations/230/cancel` (numeric) 200 → toast → card leaves list | 1920 | PASS (BUG-441) | — | it.15 r1 |
| P15-02 | body `{"reason":"guest cancelled","cancelled_by":"Owner","notify_cm":true}` — owner's fullName, not "staff" (6/6 cancels) | — | PASS (BUG-442) | — | it.15 r1+r2 |
| P15-03 | legacy ⋮ Modify 229 → `PATCH …/local-reservations/229` (numeric) 200 | 1920 | PASS (BUG-441) · **finding BUG-443**: body `{"reason":"","checkin","checkout","amount_after_tax":0}` | MAJOR (new intake) | it.15 r1 |
| P15-04/04b | legacy `/pms/reservations` popover Cancel 231 / 233 | 1920 | **BLOCKED** — booking absent from tape chart (twice) → **BUG-444**; code path verified by unit source-guard (`reservationId: res.id`, `cancelledBy` prop) | MINOR (new intake) | it.15 r1+r2 |
| P15-05 | Front Desk Cancel 228 inline, `cancelled_by:"Owner"`, 200 | 1920 | PASS (BUG-442) | — | it.15 r1 |
| P15-07/07b | Front Desk Cancel modified 229 / 232 @1366 (₹74,340, scrollWidth 1366, `cancelled_by:"Owner"`) | 1366 | PASS | — | it.15 r1+r2 |
| P15-14/14b | cleanup 228…233 cancelled, defaults, no No-Show | — | PASS | — | it.15 |

## 2. Phase 1 re-run (all 33 cases of `QA_REPORT_2026_09_22_CR385_P1_ROLE4.md`)
| Group | Cases | Result | Where |
|---|---|---|---|
| M7 (5) | tabs · defaults · radio → dirty · held/early/defaults save cycle with multipart `data` capture · 1366 fit | PASS 5/5 | it.15 r2 P15-08 |
| M2-01 | XOR matrix 10 Late rows + drawer | PASS | it.15 r2 P15-09 |
| M2-02 | Cancel inline + outcome card + reasons + refetch | PASS | it.15 r1 P15-05 / r2 P15-07b |
| M2-03/04/05 | preview debounce 507 ms · exact body · burst → 1 PATCH · reason propagates · **persistence PASS** · confirm body clean · zero-night guard | PASS | it.15 r2 P15-06 |
| M2-06 | 1366 cancel modified | PASS | it.15 r2 P15-07b |
| M2-07 | No-Show inline read-only | PASS | it.15 r2 P15-10 |
| M2-08 | alert "Stay expired" click → Late chip + row Cancel expansion (`fd-row-15-cancel`) | PASS (both VP) | main-agent sweep |
| X-10 | duplicate testids: detail / cancel / noshow / modify / alerts popover / RoomDetail r4 / CM tab / legacy kebab / legacy cancel dialog | PASS — 0 duplicates, both VP | sweep |
| REG-LEGACY | legacy Cancel Confirm | **PASS now** (was FAIL BUG-441) | it.15 r1 |
| REG-P0 (+ deep) | header/business date · tiles · first-non-empty chip + Today pin after ↻ (1 GET) · Departures chips · expand/Esc/↑↓/Enter · In-House rows · Rooms Area group-by + persistence + Room no. · Turns today · RoomDetail r4 · search `/` name + phone suffix · **BUG-434 offline Retry disabled "Retrying…" → online recovers** · legacy pages render · console errors 0 | PASS (both VP) | sweep |
| REG-P0 r4 write | Mark Clean → Request HK | NOT RE-RUN (unchanged since it.7–10; owner smoke S-9) | NOTE |

## 3. Findings
| ID | Sev | Class | Status |
|---|---|---|---|
| BUG-443 (new) | MAJOR | CODE_ERROR CR-362 — legacy `ModifyBookingDialog` sends `amount_after_tax:0` + empty reason | INTAKE — owner routing; **verify money impact on a Suite test booking before P1.5b** |
| BUG-444 (new) | MINOR | CODE_ERROR (suspected) — tape chart drops pending Direct bookings | INTAKE — owner routing; blocks smoke S-22 |
| NOTE | — | `toggle-allow-early-checkin` checkbox is 16×16 px; label click works (tester automation quirk) | log only |
| NOTE | — | legacy `/pms/arrivals` + `/pms/room-status` headers show the browser date (21 Sep) vs business date 22 Sep — pre-existing X-06 gap, retires with FU-385-C | log only |

## 4. Registry spot-check: PASS (BUG-441/442 FIXED + QA-VERIFIED · CR-385 GATE_5B_QA_PASSED (P1+P1.5) · BUG-443/444 INTAKE · sprint_key pos_pms_2)

## 5. QA → Owner
Re-test complete. Phase 1: 33/33 PASS (was 31/33). Phase 1.5: BUG-441 + BUG-442 FIXED + QA-VERIFIED (6 live cancels + 1 legacy modify, numeric ids, `cancelled_by:"Owner"`). 1 P1.5 case BLOCKED by a pre-existing legacy defect (BUG-444). New intakes: BUG-443 (MAJOR), BUG-444 (MINOR). Ready for Gate 6 combined owner smoke S-1…S-24 (S-22 blocked). Report: `memory/test_reports/QA_REPORT_2026_09_22_CR385_P1_5_ROLE4.md`.
