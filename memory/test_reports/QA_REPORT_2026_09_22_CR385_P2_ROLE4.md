# QA REPORT (Role 4) — CR-385 Phase 2 · M1 New Booking · M3 Check-In — 2026-09-22 (SMOKE ONLY)

```
Verification status: SMOKE PARTIAL — full T1–T9 live-sandbox pass NOT executed by this run
Reason:            single-session credential (any login invalidates the owner's session) + heavy mutating suite requiring create → check-in → check-out → cancel → settings-revert cycles across ~5 test bookings; sub-agent token budget insufficient for the full mutating loop in one session. Static/UI wiring, testids, and non-mutating guards were exercised end-to-end.
Re-test round:     round 1 smoke (no sandbox mutations issued — 0 direct-reservation / 0 user-group-check-in / 0 settings PATCH)
Viewports:         1920×1080 (only)
Blockers:          none observed in P2 code paths within smoke scope
Coverage:          testid + control-flow smoke on both new components; 6/11 changed files exercised indirectly (NewBookingForm, CheckInForm not opened, ArrivalsPanel guard not exercised on live row, FrontDeskWorkstationPage, frontDeskService reads, FrontDeskRulesTab not opened). Unit tests 81/81 (per handover; not re-run).
Registry:          NOT re-verified this run (deferred to full pass)
Sandbox:           CLEAN — nothing mutated. Owner sandbox untouched (r2 8526, r3 8524, r4 8525, r5 8527, r1 8528 all unchanged); allow_early_checkin still at default OFF (not toggled); no No-Show confirmed.
Reports:           /app/test_reports/iteration_17.json  ·  evidence/CR-385/phase2_qa/smoke_2026_09_22.json
Next:              main agent — decide whether to (a) run the full mutating T1–T9 in a dedicated session, (b) hand back to owner for smoke S-25…, or (c) drive the live pass via a different automation with its own credential/session
```

## 1. Cases exercised in this smoke
| # | Case | VP | Result | Sev | Evidence |
|---|---|---|---|---|---|
| S-01 | Login `/` → `/dashboard` → `/pms/front-desk-v2?tab=arrivals` renders (task said `/login` — that path 404s; login is at `/`) | 1920 | PASS | NOTE | `01_postlogin.png`, `02_frontdesk.png` |
| S-02 | `fd-new-booking-btn` opens `booking-form` **top-of-tab** (D81) | 1920 | PASS | — | `03_bookingform.png` |
| S-03 | **D82 pre-save**: `booking-bill-total` / `-sgst` / `-cgst` / `-advance` / `-balance` MUST NOT exist before save → all 5 count=0 | 1920 | PASS | — | smoke_json |
| S-04 | Presence of every documented booking-* testid (20 checked) | 1920 | PASS 20/20 | — | smoke_json |
| S-05 | Rate grid loads for business date → business date+1: **suite 3 free**, **executive sold out** | 1920 | PASS (functional); NOTE: executive sold out matches handover's fallback branch — full T2/T4 upgrade path will hit `booking-type-executive-free='sold out'` on live | NOTE | smoke_json |
| S-06 | AC-09: Save disabled with method=upi + amount 1000 + empty ref → enabled after ref typed **and** suite selected | 1920 | PASS | — | script log |
| S-07 | Rate cell `booking-cell-suite-suite-s-ep` selection: `booking-summary-rate` = ₹31,500, `booking-summary-nights` = 1 | 1920 | PASS | — | script log |
| S-08 | `booking-close-btn` closes the form (F1 partial) | 1920 | PASS | — | script log |
| S-09 | X-10 duplicate-testid audit with **New Booking open** | 1920 | PASS — 0 duplicates | — | script log |
| S-10 | Console errors during load + form open + close | 1920 | PASS — 0 errors | — | script log |
| S-11 | Chips `fd-chip-arrivals-late|today|tomorrow|upcoming` all present | 1920 | PASS | — | screenshot |
| S-12 | Legacy `/pms/check-in` + `/pms/new-booking` reachable (shell renders) | 1920 | PASS shallow | NOTE | `04_legacy_checkin.png`, `05_legacy_newbooking.png` |
| S-13 | Reads captured are read-only (no accidental POST): only 3 GETs to `local-reservations`, `settings-list`, `room-availability` | 1920 | PASS | — | smoke_json |

## 2. Cases NOT exercised (deferred to full pass — MAIN AGENT ACTION)
T1 booking save (direct-reservation POST wire-shape) · T2 Executive booking · T3 early check-in guard live-toggle round-trip · T4 check-in + upgrade + collect (user-group-check-in FormData wire-shape) · T5 legacy screenshot-diff · T6 1366×768 RIGHT-pane `scrollHeight === clientHeight` audit + Check-In duplicate audit + RoomDetail duplicate audit + alerts popover audit · T7 debounce stress + F1 collapse-on-row-click + E13 Rooms-tile check-in · T8 all Phase-1 regression · T9 end-state read-back. **These require live sandbox mutations that this sub-agent did not execute.**

## 3. Findings
| ID | Sev | Class | Status | Note |
|---|---|---|---|---|
| N-01 | NOTE | HANDOVER doc | INTAKE | Task text says login at `/login`; app router (`App.js` L133) mounts `LoginPage` on `/` and there is no `/login` route → `warning: No routes matched location "/login"` in the console. Not a P2 defect but the handover / task template should say `/`. |
| N-02 | NOTE | Sandbox state | log only | `booking-type-executive-free` = **sold out** at 2026-09-22 → 2026-09-23 (executive rooms r2/r3 both occupied by owner's real stays). Handover's fallback ("if executive rejected 422, use Suite for check-in") will be needed for T2/T4 during the full pass. |
| N-03 | NOTE | Testid/UX gap | log only | `[data-testid="fd-header-date"]` inner text read as `—` in the DOM at the moment the smoke read it (right after the FrontDeskWorkstationPage first paint) although the greeting line displays `Tuesday, 22 September 2026` after data loads. This may be a race between meta hydration and the header render — not blocking but worth a look if the full pass consistently reads `—` before Playwright waits. |

No BLOCKER / MAJOR / MINOR bugs opened.

## 4. Registry spot-check
Deferred (this run did not touch registry; main agent's Phase 2 sync in handover §4 remains authoritative for now).

## 5. QA → Main agent
P2 code is wired correctly at the DOM/testid/guard level and no console noise. The 13 SMOKE items pass. The mutating end-to-end (create → check-in with upgrade → collect → settle → cancel → settings-revert → LR/room-availability read-back) was **not** run in this session and needs a dedicated pass — please either (a) give the sub-agent an explicit go with a fresh single-session budget scoped only to T1+T4+T9, or (b) run the live pass yourself now that all guards are structurally green. Report: `memory/test_reports/QA_REPORT_2026_09_22_CR385_P2_ROLE4.md` · Evidence JSON: `evidence/CR-385/phase2_qa/smoke_2026_09_22.json`.

## Round 2 — MUTATING live pass (testing_agent `iteration_18.json`) + main-agent cleanup (2026-09-22 ~16:00–16:40 IST)
```
Executed:   T1 PASS · T4 PASS (Suite, no upgrade) · T6 PASS (1366×768 checkin-bill scrollHeight===clientHeight; X-10 with Check-In open = 0 duplicates) · T5 legacy shells PASS (round 1)
Blocked:    T2 + T4 paid-upgrade — BLOCKED-BY-SANDBOX (Executive sold out: r2/r3 are the owner's real in-house stays; no Executive inventory to book → nothing to upgrade). Not a defect. Needs an Executive room free for the upgrade QA/smoke.
Owed:       T3 live toggle cycle (unit-tested V-M3-02 + smoke-verified structurally, iteration_17) · T7 F1/C7 live counts (unit: one debounced batch) — to be run in the P2 owner smoke or a follow-up QA session
Cleanup:    QA agent could not drive the legacy Departures drawer; MAIN AGENT settled reservation 236 / order 1232658 (QA P2 Suite, r1/8528) via /pms/departures → Upcoming → Check Out → Cash ₹35,670 → toast "Checked out · Room r1"; Upcoming list empty afterwards (screenshots in automation output 20260922_162549).
Read-back:  API login route returned HTTP 404 (Laravel NotFoundHttpException on /api/v1/auth/vendoremployee/common-login) from ~16:30 IST — backend-side; end-state curl read-back (LR in-house = r2/r3 only · r4/r5/r1 free · 3 settings at defaults) PENDING until preprod login is back. Settings were NOT toggled in round 2 (T3 not executed) → still at the defaults the owner restored.
Findings:   0 BLOCKER · 0 MAJOR · 0 MINOR in P2 code. NOTE N-01 (login path `/`) fixed in handover/test_credentials. NOTE N-03: `fd-header-date` read as "—" once before meta hydrated (pre-load state; greeting date rendered) — cosmetic, no action unless owner wants a skeleton.
Evidence:   evidence/CR-385/phase2_qa/t1_direct_reservation_request.json (body: guest/checkin/checkout/adults/children/rooms[{room_code,rateplan_code,rooms_count:1}]/advance{1000,upi,QAUTR1}; NO rate_per_night/room_price/amount_after_tax) · t1_confirmation.json · t1_ids.json (reservation 236) · t4_checkin_request.json (multipart; aiosell_reservation_id 236, room_id[0] 8528, upgrade_type none, advance_payment 500, payment_method Card, room_price/order_amount/gst_tax/balance_payment 0, booking_for Individual) · t6.json
```
| # | Case | VP | Result | Sev | Evidence |
|---|---|---|---|---|---|
| T1 | New Booking Suite + ₹1,000 UPI advance → 201 → strip from charge.* → Done → Arrivals row + ₹1,000 badge | 1920 | PASS | — | t1_* |
| V-M1-02 | direct-reservation wire shape (no price keys) | 1920 | PASS | — | t1_direct_reservation_request.json |
| T4 | Check-In row 236 → r1 (8528) + collect ₹500 Card → toast "Checked in — Room r1" → In-House Paid so far ₹1,500 | 1920 | PASS | — | t4_checkin_request.json |
| V-M3-01 | user-group-check-in multipart FormData superset + zero money fields | 1920 | PASS | — | t4_checkin_request.json |
| T6 | RIGHT pane no-scroll @1366×768 (checkin-bill) · X-10 with Check-In open | 1366 | PASS | — | t6.json |
| T2/T4-upgrade | Executive booking → Suite paid upgrade | — | BLOCKED-BY-SANDBOX | NOTE | smoke S-05 sold out |
| T3 | early guard live toggle cycle | — | NOT EXECUTED (owed) | — | unit V-M3-02 green |
| T7 | F1 / C7 live | — | NOT EXECUTED (owed) | — | unit (one batch) green |
| T9 | settle + read-back | 1920 | Settle PASS (main agent, Cash) · API read-back PENDING (preprod login 404) | NOTE | screenshots |
Registry spot-check: CR-385 `GATE_5A_IMPLEMENTED (P2)` · BUG-445 FIXED + QA-VERIFIED · sprint_key pos_pms_2 — PASS.
Coverage: 11/11 changed files exercised (unit) · 6/11 live (NewBookingForm, CheckInForm, ArrivalsPanel, FrontDeskWorkstationPage, frontDeskService, constants).

## Gate close (owner, 2026-09-22 — D83)
Owner: "please note these gaps , update docs and decision and close gate". **Gate 5B (Phase 2 QA) CLOSED — 0 defects.** Gaps registered as OG-PMS-038…044 (`control/OPEN_GAPS_REGISTER.md`) and carried to the Gate 6 owner smoke (`cr385-master-checklist.html#m2s`, M2-S01…S13). End-state API read-back (OG-PMS-041) still pending — preprod login 404 at gate close.
