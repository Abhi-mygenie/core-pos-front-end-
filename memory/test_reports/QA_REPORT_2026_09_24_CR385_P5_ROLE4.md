# CR-385 Phase 5 (Closure regression) — Role 4 QA Report (2026-09-24)

```
Item:            CR-385 · PMS Front Desk Unified Tabbed Workstation ("Front Desk (Beta)", /pms/front-desk-v2)
Phase:           5 — closure regression on the release build (plan note plans/CR-385_P5_PLAN_NOTE_2026_09_23.md · handover/CR-385_PHASE5_EXECUTION_HANDOVER_2026_09_23.md §5.1–§5.5)
Role:            AGENT_PROMPT_ALPHA v0.7 Role 4 QA (independent voice) — written by the §5.6 closure agent from the evidence listed per row; nothing below is inferred from intent
Account:         QA_TGK (preprod RID 69 sandbox-pms; values only in memory/test_credentials.md — never printed; OWNER_TGK never used)
Business dates:  2026-09-23 (Sessions A′/B/C entry) → 2026-09-24 (rolled mid-Session C; probe pack + guards on 09-24). All date logic read from API meta.business_date, never the PC clock.
Build:           origin 21implement HEAD b2db5a0 (fresh --filter=blob:none clone 2026-09-24, deleted after check) == /app/frontend/src (diff -rq → 0)
Hotspots:        byte-identical by sha256 (origin == workspace == Session 0 record): CollectPaymentPanel.jsx b8c1e91f7a17e5cc… · orderTransform.js 065710fa63134dca… · pmsService.js b5f139c7361b0d3b… · PmsCheckoutDrawer.jsx 14a7e12e5a3163dd…
                 ⚠ commit 642ccb8 no longer exists on origin (history re-imported 2026-09-23: af312cc → 24ae8f6 → … → b2db5a0); the blob hashes above are the reference, not the commit id.
Code changes:    ZERO in frontend/src during Phase 5 (git status --short frontend/src → 0 at every session close and at report time)
Gate words:      "Phase 5 GO" received 2026-09-23 (plan note §10b). "Phase 5.5 GO" never needed (no FAIL). Sign-off word: NOT YET GIVEN — this report does not close CR-385.
Sessions:        A′ it.30/31/32 (2026-09-23) · B it.33 (2026-09-23) · C it.34 (2026-09-23→24) · §5.4 probe pack (2026-09-24) · §5.5 guards (2026-09-24)
Sandbox:         r1 (8528) = owner live stay #256 "coke" / order 1232674 — never touched · r2 (8526) / r3 (8524) owner rooms by rule — never touched · QA rooms r4 (8525) / r5 (8527) only · No-Show never confirmed
```

---

## 1. Entry vs exit read-back (sandbox restored)

| | Entry `t0_entry_readback.json` (2026-09-23 11:45Z, Session 0/A entry) | Exit `t9_exit_probepack_readback.json` (2026-09-24, after §5.4) | Verdict |
|---|---|---|---|
| `meta.business_date` | 2026-09-23 | 2026-09-24 (normal rollover) | — |
| settings `allow_early_checkin` / `extend_rate_mode` / `auto_print_checkin_receipt` | false / calendar / false | false / calendar / false | ✅ defaults restored |
| in_house | only #256 r1 "coke" (order 1232674, 09-23→09-24) | only #256 r1 "coke" (order 1232674) | ✅ owner stay untouched throughout |
| r1 | `occupied_hk` (owner) | `occupied_hk` (owner) | ✅ |
| r2 / r3 | `hk` / `hk` (owner rooms; stays 174/155 were checked out by the owner himself before Session A′) | `hk` / `hk` | ✅ never touched |
| r4 / r5 | `hk` / `available` | `hk` / `hk` | ✅ every QA stay settled; rooms left in HK (N9 allowed) |
| `qa_rows_left` | [] | [] | ✅ no QA booking left (rows 259–261, 264–283 created and disposed across A′/B/C/probe pack) |
| `counts.in_house` | 1 | 1 | ✅ |
| `counts.departures_today` | 0 | 1 (= owner's r1 stay, checkout 09-24) | ✅ expected, not QA |
| `counts.arrivals_late` | 10 (owner's pre-existing pending rows 15…235) | 10 | ✅ untouched |

Intermediate read-backs (all in `evidence/CR-385/probes_2026_09_23_release/`): `t0b_after_it28_readback.json`, `t0c_entry_p5cont_readback.json`, `t0d_entry_sessc_readback.json`, `t9_readback.json`, `t9_final_sessc_readback.json`, `t0e_entry_probepack_readback.json` — every one shows `qa_rows_left: []` and r1 #256 untouched.

---

## 2. 34-row verification matrix (`plans/CR-385_IMPLEMENTATION_PLAN.md` §6) — Phase 5 verdicts

Evidence key: **it.N** = testing_agent iteration N · **SESSA/SESSB/SESSC** = `handover/SESSION_HANDOVER_2026_09_23_CR385_P5_SESS{A,B,C}_CLOSED.md` · **reg #55/#56/#C** = `control/registry.json` CR-385 `status_history` entries "Session A′ CLOSED" / "Session B CLOSED" / "Session C CLOSED" · **PROBE** = `evidence/CR-385/probes_2026_09_23_release/PROBE_REPORT.md` · **jest** = `final_guard5_jest.log` (16 suites / 128 passed) · **G1…G6** = `FINAL_GUARDS.md`.
⚠ Evidence-location note (F13): `iteration_31/32/33/34.json`, `session_a_*.json`, `a5_focused_raw.json`, `sessb_cleanup_result.json` are **not present in this workspace** (memory re-sync dropped them); only `memory/test_reports/iteration_30_CR385_P5_sessionA_rerun_2026_09_23.json` survived. Those iterations are cited through the session handovers + registry entries + plan note §10d, which record the row-level results.

| # | Module | Assertion | Verdict | Evidence | Note |
|---|---|---|---|---|---|
| 1 | M0 | Route `/pms/front-desk-v2` renders; sidebar "Front Desk (Beta)" item; legacy `/pms/front-desk` unchanged | **PASS** | it.31/33/34 login `/` → `/loading` → `/pms/front-desk-v2` (SESSA §2, SESSB §1 S0, SESSC §1 C0); legacy `/pms/front-desk` loads (SESSC C4) | — |
| 2 | M0 | `roomStatusTransform` additive fields (old + new payload) | **PASS** | jest 128/128 (G5) | — |
| 3 | M0 | `frontDeskTransform` row model / buckets / `normaliseTitle` / `nsOrCancel` / `isTurn` | **PASS** | jest (G5) | — |
| 4 | M0 | `money.js` `isCleared` / `badgeFor` / `fmtINR` / `fmtDate` / `plural` | **PASS** | jest (G5) | — |
| 5 | M0 | `frontDeskService.getSnapshot` allSettled; LR window always sent | **PASS** | jest (G5) | — |
| 6 | M0 | GuestTable sticky `<th>`, sort, keyboard ↑↓ Enter Esc, one expansion open | **PASS** | P0/P1 Role 4 reports (`QA_REPORT_2026_09_21_CR385_P0.md` rows 16/17, `QA_REPORT_2026_09_22_CR385_P1_ROLE4.md`); P5 rows drive the same table through expansions in it.31/33 (check-in, extend, bill open/close, Esc closes extend — SESSB S6) | no P5 regression observed |
| 7 | M0 | LR 500 → page error + Retry; board 500 → Rooms degrade | **PASS** | jest (G5) | — |
| 8 | M0 | Money/date grep guard in `components/pms/frontdesk` + `frontDeskService.js` + `frontDeskTransform.js` | **PASS** | G1 = exactly the 2 allowed lines (`frontDeskService.js:70` comment, `:101` `fd.append('balance_payment','0')`) | — |
| 9 | M1 | New Booking payload: no `rate_per_night`, `rooms_count 1`, advance only when > 0 | **PASS** | jest (G5); it.31 + it.33 `direct-reservation` bodies captured — all four forbidden keys absent (SESSA §2 row 11, SESSB S1) | — |
| 10 | M1 | Booking guards + 422 friendly error + B2B note | **PASS** | jest (G5); live 422 "no rate configured" on unknown plan — PROBE §1 1b (gate4 s1b) | paid-upgrade leg N/A — OG-PMS-038 CLOSED by Gate 6 smoke M2-S08 ("1 pass as sign off this was checked in smoke") |
| 11 | M1 | preprod: create → LR `balance_due = total − advance` → cancel/settle | **PASS** | it.31 (SESSA row 11), it.33 S1 (SESSB), PROBE §1 2 (res 276: 10,148 − 1,000 = 9,148), d1516 s1, D17 legs A/B/C (§4 below) | — |
| 12 | M2 | Cancel/No-Show `inline` wrapper in row; legacy ArrivalsPage overlay unchanged | **PASS** | it.31 confirmation SGST/CGST/advance (SESSA row 12); inline dialogs verified P2 Role 4 + Gate 6 smoke M2 rows (`QA_REPORT_2026_09_22_CR385_P2_ROLE4.md`, `control/POS_PMS_2_OWNER_SMOKE_BATCH_2026_09_21.md` Result block); P5 cancels ran via `fd-row-<id>-cancel-btn` in cleanup (it.31/33) and via API (it.34 res 274, HTTP 200) | — |
| 13 | M2 | Modify: `preview:true`; final PATCH without `amount_after_tax`; verb PATCH | **PASS** | jest (G5); P2 Role 4 it.14–16 + Gate 6 smoke M2 rows (carried) | not re-driven in P5 browser sessions; unit + smoke evidence stands |
| 14 | M2 | X-05 zero-night → 422 | **PASS (carried)** | `evidence/CR-385/probes_2026_09_20_final/PROBE_REPORT.md` L19: `PATCH /{id} {checkout=checkin, preview:true}` → **422** "checkout must be after checkin." | not re-run in P5 (owner call 2a) |
| 15 | M3 | Check-In FormData superset of `pmsCheckIn`; body clean | **PASS** | jest (G5); it.31 `user-group-check-in` body clean (SESSA row 15); 8 probe check-ins (PROBE §7: only frozen literal `room_price="0"`) | — |
| 16 | M3 | Early check-in guard from profile setting; HK badge/warning | **PASS** | it.31 DISABLED gate verified when `allow_early_checkin=false` (SESSA row 16); live server 422 verbatim — PROBE §2 s3: "Early check-in is not allowed for this property (stay check-in 2026-10-10 is after business date 2026-09-24)." with `charge` untouched; HK badge on r1/r4 selectable (it.32 "HOUSEKEEPING") | F2: tooltip not hoverable headless (MINOR) |
| 17 | M3 | Check-In RIGHT pane no inner scroll at 1366×768 | **PASS** | it.31 `checkin-bill` scrollHeight = clientHeight = 408 @1366×768 (SESSA row 17) | — |
| 18 | M3 | preprod: booking + advance → check-in + paid upgrade → `charge` & folio line; 422 verbatim when early off | **PASS** | PROBE §1 3 (upgrade added 8,600 + 1,500 = 10,100 · 909/909 · 11,918 · folio `room_price 10100 / gst_tax 1818 / advance 1000`); n7n8 s3 422 / s4 200; n11, d14, d1516 check-ins; it.31/32 bill-payment bodies clean | — |
| 19 | M4 | Extend payload: no `new_room_price`; POST | **PASS** | jest (G5); it.33 S3 body `new_room_price` absent (SESSB) ; PROBE §7 grep 0 | — |
| 20 | M4/M6 | `nights_detail` renderer (never sums gst) from response and from LR row; avg label; 409 move flow | **PASS** | PROBE §3 N11 slab MATCH (8,600 held 18 % 1,548 + 7,400 calendar 5 % 370 + upgrade 270 = 2,188 → sgst = cgst 1,094); N11-2 `nights_detail` on response **and LR list**; held control no `nights_detail`; D14 response == LR (1,500 / 18,188); PROBE §4 D15 shorten 10,100 / 909 / 11,918, D16 move keeps 17,500; BQ-385-20 split 201 + bad-sum 422; it.33 S3 renderer two SGST/CGST lines | — |
| 21 | M4 | D14 mitigation: row from LR refetch, not response | **PASS** | it.33 S3 extend +1 balance ₹74,340 · S4 collect-now ₹500 · S5 shorten "Shorten to 25 Sep (−1 night)" balance ₹73,840 = 74,340 − 500 (SESSB); PROBE §1 4/5 extend + move with LR read-back identical; d14 RESPONSE STALE False / LR STALE False | F4: S4 test assertion wrong, payment proven applied |
| 22 | M5 | `getRowBalance` = charge + F&B + transferred | **PASS** | jest (G5); it.33 S9 balance equality stack = LEFT = row = ₹73,840 (SESSB); it.32 (d) ₹36,170 equality (SESSA/plan note §10d) | — |
| 23 | M5 | Leaving-today / overdue / cleared chips; HK actions | **PASS** | it.32 collapsed row "PAID SO FAR ₹1,000" (SESSA row 23); it.33 S6 room-tile Extend jump + Esc closes, S8 departures chips today = 0 / overdue = 0 (SESSB) | — |
| 24 | M6 | Bill box 440×560, body 353, Checkout visible both viewports; HK request / clean cycle | **PASS (with note)** | it.32 HK badge "HOUSEKEEPING" after checkout (SESSA row 25/24); it.33 S7 Request HK fired from In-House row (SESSB); 440×560 geometry frozen by spike D57 + P4 Role 4 (`QA_REPORT_2026_09_22_CR385_P4_ROLE4.md`), all bill contents rendered inside `bill-right` (it.32) | F1 selector geometry (MINOR, not a bug) · F5 HK-clean tile refresh timing (MINOR) — owner call 1a |
| 25 | M6 | 3 toggles hidden inside `.frontdesk-bill`; testids still in panel source; restaurant drawer shows them | **PASS** | it.32 (c) four D88 testids absent/hidden in Bill (SESSA row 27); `hideSectionRows.cr385.test.js` in jest (G5); POS side: SESSC C2 panel NOT inside `.frontdesk-bill` | F7: `payment-split-btn` not rendered on POS for TGK (no `partial` payment type configured) — scope verified, not visibility |
| 26 | M6 | `roomInfo` from `charge` (no BUG-425 override); panel balance === row balance | **PASS** | jest (G5); it.33 S9 `bill-stack-room-balance` = `bill-room-balance` = `fd-row-<id>-balance` = ₹73,840; it.32 (d) ₹36,170 | — |
| 27 | M6 | LEFT SGST + CGST two lines (BUG-418) | **PASS** | it.32 (b) SGST ₹2,835 + CGST ₹2,835 (SESSA); it.33 S9 SGST/CGST present, `bill-room-toggle` open/close, D88 all absent/hidden (SESSB); BUG-448 prefill class not captured in it.33 / C0b not reached in it.34 — F6, non-blocking (FIXED + QA-VERIFIED P4.5 it.25/26) | — |
| 28 | M6 | TAB E2E; second submit → 200 `already_paid`, no second ledger row; shapes (i)(ii)(iii) | **PASS** | it.33 S9 `payment-TAB-btn` → toast "Checked out · Room r4", row gone, bill-payment body clean (SESSB); PROBE §1 6 TAB 18,188 → `departed`, `balance_due 0`, ledger row = amount sent; n7n8/n11/d14/d1516 TAB settles; `already_paid` idempotency verified live 2026-09-20 (`probes_2026_09_20/` G1–G4) + panel `isProcessingPayment` jest | P5 double-charge re-submit **SKIP** — "not reproducible — stay departed" (handover §5.2 accepted); bare-room shape (i) it.32, room + extend shapes it.33 |
| 29 | M6 | POS F&B checkout regression (dine-in, split, TAB, coupon) — panel shared | **PASS** | it.34 C1–C3: table 1 order #000136 ₹209 · `collect-payment-panel` visible · `bill-grand-total` > 0 · panel NOT inside `.frontdesk-bill` (D88 scope) · Cash full settle · `order-bill-payment` body clean (SESSC §1, `session_c_pos_regression.json`) | F7 Split tile not rendered for TGK (config); 3 room toggles not rendered on dine-in (`isRoom=false`, expected) |
| 30 | M7 | Settings mapping both ways (+ alias) | **PASS** | jest (G5) (`updateFrontDeskRules` multipart with exactly two keys); PROBE §2 s0 aliases `pms.*` present on `settings-list` + `profile` | — |
| 31 | M7 | Front Desk Rules controls render; Save multipart `data=`; other tabs unaffected | **PASS** | it.31 toggle cycle ON→save→OFF→save→reload OFF (BQ-385-30 read-back), Rate-table radio unchanged (SESSA rows 24/31); PROBE §2 1b raw-JSON write ignored, multipart is the only write path; s1 bogus mode 422 | — |
| 32 | M7 | preprod: profile flips on save; restore `allow_early_checkin=false`, `extend_rate_mode=calendar` | **PASS** | PROBE §2 s4 (N7 on → 200, N8 calendar 17,500) / s5 (held 18,700) / s6 restore verified on `settings-list` + `profile`; n11 s3 restore; exit read-back §1 defaults | — |
| 33 | all | Zero console errors at 1920×800 + 1366×768; unique `data-testid`s | **PASS** | it.34 C5: 0 errors at 1920×800 and 1366×768 on `/pms/front-desk-v2` (all 4 tabs) + `/dashboard` (SESSC); X-10 unique testids it.31/33/34 (no duplicate reported) | known-ignore list §8 applied |
| 34 | all | Registry Step 5 checklist executed | **PENDING** | closes in §5.7 (registry closure tick list) — will be flipped to PASS with the R18 marker count once §5.7 is done | not yet run at the time of this report |

**Tally: 33 PASS (incl. 1 PASS-carried, 1 PASS-with-note) · 0 FAIL · 1 PENDING (row 34, §5.7).**

---

## 3. Session results

### 3.1 Session A′ — it.30 / it.31 / it.32 (2026-09-23) — `SESSION_HANDOVER_2026_09_23_CR385_P5_SESSA_CLOSED.md` · reg #55 · plan note §10d
| Run | Result |
|---|---|
| it.30 (`memory/test_reports/iteration_30_CR385_P5_sessionA_rerun_2026_09_23.json`) | CORS block on `/aiosell/room-availability` from staging origin (environment) — A2/A3/A5 NOT-RUN, A4 partial, cleanup clean → resolved, re-run |
| it.31 | A0–A4 PASS; A5 partial (POST body keys PASS for `direct-reservation`, `user-group-check-in`, `bill-payment` — all four forbidden keys absent); cleanup clean (order 1232681 settled) |
| it.32 (focused A5) | 5/6 PASS: (b) SGST ₹2,835 + CGST ₹2,835 · (c) D88 four testids absent/hidden · (d) balance equality ₹36,170 stack = left = row 266 · (e) ROOM ORDERS + TRANSFERRED sections rendered · settle → toast "Checked out · Room r4" + HK badge; (a) geometry selector null → F1 MINOR, `retest_needed:false` |
| Rows | 11, 12, 15, 16, 17, 18, 23, 24, 25, 27, 31, 32 PASS · 10 N/A (OG-PMS-038 closed by smoke) |
| Findings | F1 `.frontdesk-bill` not DOM-child of `bill-right` (selector) · F2 `checkin-early-tooltip` not hoverable headless · F3 `fd-row-<id>-paid` briefly empty after check-in (timing) — all MINOR |

### 3.2 Session B — it.33 (2026-09-23) — `SESSION_HANDOVER_2026_09_23_CR385_P5_SESSB_CLOSED.md` · reg #56
| Step | Result |
|---|---|
| S0 login → `/pms/front-desk-v2`, business_date 2026-09-23 | PASS |
| S1 booking body clean (matrix 11/12) | PASS |
| S2 check-in r4 / 8525 (native `<select>`), toast "Checked in" | PASS |
| S3 extend +1: SGST + CGST two lines, `new_room_price` absent, balance ₹74,340 | PASS |
| S4 extend +1 with collect-now ₹500 cash | FUNCTIONAL PASS — proven by S5 ₹73,840 = ₹74,340 − ₹500 (test assertion itself wrong → F4) |
| S5 shorten −1: `extend-delta` "Shorten to 25 Sep (−1 night)", balance ₹73,840 | PASS |
| S6 room tile → `fd-room-detail-8525` → Extend opens; Esc closes | PASS |
| S7 Request HK from In-House row | fired; tile did not refresh to `hk` before detail opened → F5 MINOR (row 24 PARTIAL in SESSB, recorded here as PASS-with-note) |
| S8 Departures look: today = 0, overdue = 0 | PASS |
| S9 Bill: SGST/CGST, `bill-room-toggle`, balance stack = left = row = ₹73,840, D88 absent/hidden; `payment-TAB-btn` → toast "Checked out · Room r4", row gone, body clean | PASS · BUG-448 `fd-bill-tab-prefilled` class not captured (payment fired before assertion) → F6 · double-charge SKIP "not reproducible — stay departed" |
| Cleanup (`sessb_cleanup_result.json`, cited via SESSB §3) | inhouse_p5 = 0 · arrivals_p5 = 0 (row 269 cancelled) · toggle = false · cal_radio = true |
| M3-S06 held rate | SKIP — no recipe (owner's optional row) |

### 3.3 Session C — it.34 (2026-09-23 → 24) — `SESSION_HANDOVER_2026_09_23_CR385_P5_SESSC_CLOSED.md` · reg "Session C CLOSED" · `session_c_pos_regression.json`
| Step | Result |
|---|---|
| C0 login → `/loading` → `/dashboard` | PASS |
| C1 POS dine-in table 1, order #000136 ₹209, `collect-payment-panel` visible | PASS |
| C2 D88 scope: panel NOT inside `.frontdesk-bill`; `bill-grand-total` ₹209 > 0 | PASS |
| C3 Cash full settle; `order-bill-payment` body clean | PASS |
| C4 legacy `/pms/new-booking`, `/pms/check-in`, `/pms/departures` (no rows → drawer not exercised, acceptable), `/pms/front-desk` load | PASS |
| C5 console sweep 1920×800 and 1366×768 — `/pms/front-desk-v2` all 4 tabs + `/dashboard` | PASS 0 / 0 / 0 / 0 errors |
| C6 cleanup: order settled; booking 274 cancelled via API HTTP 200; rules default | PASS |
| C0b BUG-448 leg | UNCONFIRMED — booking 274 created, check-in not reached (test hard-coded 2026-09-23 while `business_date` rolled to 09-24 → row under `arrivals_late`). Non-blocking per execution handover; BUG-448 stays FIXED + QA-VERIFIED (P4.5 it.25/26) with "P5 re-check partial" |
| NOTES | `payment-split-btn` NOT_RENDERED (TGK has no `partial` payment type — F7) · 3 room toggles NOT_RENDERED on dine-in (`isRoom=false`, expected) |

---

## 4. D17 / BUG-412 re-verify — `d17_reverify.json` (2026-09-23 11:57Z, runner `run_d17_reverify.py`, credentials read-by-pattern) — **ALL_PASS: true**

| Leg | Room | Booking advance | Check-in collect | `charge.advance_payment` after check-in (response == LR) | `balance_due` | Order | Cleanup |
|---|---|---|---|---|---|---|---|
| A | r4 8525 | none (res 259, 201) | ₹500 Card | **500** | 37,170 − 500 = 36,670 | 1232677 | TAB 200 → `departed`, `balance_due 0` |
| B | r5 8527 | ₹1,000 UPI (res 260) | ₹0 | **1,000** | 36,170 | 1232678 | TAB 200 → `departed`, 0 |
| C | r4 8525 | ₹1,000 UPI (res 261) | ₹500 UPI | **1,500** (cumulative, not 2,000) | 35,670 | 1232679 | TAB 200 → `departed`, 0 |

All three: suite-s-ep 31,500 · SGST 2,835 · CGST 2,835 · total 37,170; `balance_due = total_with_gst − advance_payment`; folio advance/mode match; `forbidden_key_hits: []`; settings before == after (false / calendar / false); board after r2/r3/r4/r5 `hk`, r1 `occupied_hk` (owner).

---

## 5. §5.4 probe pack re-run (2026-09-24, business_date 2026-09-24) — `PROBE_REPORT.md`

| Script | Matrix rows | Key figures | Verdict |
|---|---|---|---|
| `run_gate4.py` | 11, 18, 21 | BQ-16 omit-rate **201** (res 275, cancelled) · unknown plan **422** "no rate configured" · booking + advance `charge{8600 · 774/774 · 10148 · adv 1000 · due 9148}` · check-in paid upgrade **added** 8600 + 1500 = 10100 · 909/909 · 11918 · same-room extend **200** 17500 · 1094/1094 · 19688 · adv 1500 · due 18188 with `nights_detail` on response **and LR row** · move r4→r5 **200**, money unchanged · TAB 18,188 → `departed`, `balance_due 0`, ledger row = amount sent | ✅ PASS · residual OG-PMS-022 (folio `remaining_room_balance` stays 18,188 after departure — known P3 info, F8) |
| `run_n7n8.py` | 16 live, 32 | bogus `extend_rate_mode` **422** · raw-JSON write ignored (multipart only) · N7 off → **422** "Early check-in is not allowed for this property (stay check-in 2026-10-10 is after business date 2026-09-24)." `charge` untouched · N7 on → 200 · calendar extend 17,500 · held extend 18,700 / 1,683 · money under `data.charge` · defaults restored on `settings-list` + `profile` | ✅ PASS |
| `run_n11.py` + `run_d14.py` | 20 | per-night slab [10 Oct 8600 held 18 % 1548 · 11 Oct 7400 calendar 5 % 370] + upgrade 270 = 2,188 → sgst = cgst 1,094 **MATCH** · held control 18,700 / no `nights_detail` · D14 response `advance 1500 / due 18188` == LR == true balance (RESPONSE STALE False · LR STALE False) | ✅ PASS |
| `run_d1516.py` | 20 | D16 move keeps 17,500 + `nights_detail` · D15 shorten → 10,100 / 909 / 11,918 (1 row) · re-extend 17,500 no drift · BQ-385-20 split **201** (lump 1,000) + bad-sum **422** | ✅ PASS |
| `probes_2026_09_21_held_fallback/` | 20 (G4-03 b) | **skipped — no recipe** (needs backend rate wipe, D68); verified LIVE 2026-09-21 | ⚪ skipped |
| D17 | BUG-412 | produced in Session A (§4), not re-run | ✅ |

Disposable rows 275–283 created and disposed; entry `t0e` == exit `t9` read-back.

### Forbidden-key grep over every captured request body (PROBE_REPORT.md §7, verbatim)
```
$ cat *_requests.jsonl | wc -l            → 64 POST bodies captured (JSON + multipart) across the 5 runs
$ grep -E "rate_per_night|amount_after_tax|new_room_price" *_requests.jsonl | wc -l   → 0
$ grep -v user-group-check-in *_requests.jsonl | grep -cE "rate_per_night|room_price|amount_after_tax|new_room_price"   → 0
$ grep -E "room_price" *_requests.jsonl   → 8 hits, all `/api/v1/vendoremployee/pos/user-group-check-in` multipart with the literal `room_price="0"`
```
All JSON bodies (`direct-reservation`, `room-extend-stay`, `order-bill-payment`, `update-settings`, `cancel`): empty grep for all four keys. The 8 multipart `user-group-check-in` hits are the frozen literal `room_price="0"` that the release FE itself sends (`frontDeskService.js` L99, alongside `order_amount='0'`, `balance_payment='0'`, `gst_tax='0'`) — a constant zero, never a computed figure; same treatment as `run_d17_reverify.py`. D50 / G-02 satisfied.

---

## 6. §5.5 Final guards on the release build (2026-09-24) — `FINAL_GUARDS.md` — **6 / 6 PASS**

| Guard | Expected | Actual | Verdict |
|---|---|---|---|
| 1 Money grep (D50 / G-02) | exactly 2 lines | **2 lines**: `frontDeskService.js:70` (comment) · `:101` `fd.append('balance_payment', '0');` | PASS |
| 2 BUG-450 hardcoded room type grep | 0 lines | **0 lines** | PASS |
| 3 Hotspot byte-identity | 4 blobs == Session 0; `diff -rq` 0 | fresh `--filter=blob:none` clone, origin HEAD **`b2db5a0`**; sha256 identical origin == workspace == Session 0: CollectPaymentPanel `b8c1e91f7a17e5cc…` · orderTransform `065710fa63134dca…` · pmsService `b5f139c7361b0d3b…` · PmsCheckoutDrawer `14a7e12e5a3163dd…`; `diff -rq origin/frontend/src /app/frontend/src` → **0**; clone deleted | PASS (by content) |
| 4 Mockup sha lock | starts `12fd0f4a343fc89d` | `12fd0f4a343fc89d506478db999092d7ca564545b5cb2fc82118ca14c1168b86` | PASS |
| 5 cr385 + bug450 jest | 128 passed | Test Suites **16/16** · Tests **128/128** · Snapshots 2/2 · 12.1 s · exit 0 (`final_guard5_jest.log`) | PASS |
| 6 Production build | exit 0 | plain `yarn build` → **exit 0**, 63.33 s, main 1.32 MB gzip; 24 pre-existing `react-hooks/exhaustive-deps` warnings in 12 non-CR-385 files, **0 in CR-385 / front-desk / hotspot files** (`final_guard6_build.log`) | PASS |

**Note on Guard 3 (F10):** origin `21implement` history was re-imported on 2026-09-23 (8 commits: `af312cc` "Initial commit" → `24ae8f6` platform import → … → `b2db5a0`). Commit **`642ccb8` no longer exists on origin**; `git log -1` on the hotspots now returns `24ae8f6`. Byte-identity — the guard's intent — is proven by the four sha256 hashes. This report, the registry and D90 cite the blob hashes, not `642ccb8`. This is a fact about the repository, not a defect.

---

## 7. Console sweep (it.34, Session C)

| Viewport | Pages | `console.error` count |
|---|---|---|
| 1920×800 | `/pms/front-desk-v2` Arrivals · Departures · In-House · Rooms + `/dashboard` | **0** |
| 1366×768 | same | **0** |

Ignore list applied (socket / firebase-messaging / OrderPolling lines). Earlier sessions (it.31/33) reported no page-side errors on the flows driven.

---

## 8. Known-ignore list applied (2026-09-22 handover §7) — **none re-filed as findings**

OG-PMS-043 `fd-header-date` "—" before hydrate · BQ-385-23 "SR ●" on every modified row · BQ-385-25 occupancy % excludes overdue · BQ-385-26 empty booking → red error from a 200 "skipped" · ₹0 rate cards for unpriced type/plan · Rates & Restrictions labels show room **code** until Room Mapping tab opened · balance cell "…" for a few seconds after check-in / Bill open (OG-PMS-047, D85) · POS Split tile absent on a ₹0 order (it.26 F-6) · console lines from socket / firebase messaging · hard reload of a deep link passes through `/loading` · OG-PMS-046 new Today booking visible only after clicking the Today chip (D70) · legacy Departures TAB disabled until name+phone typed (BUG-449 → Cash) · room discount greyed "needs BQ-385-07" · React key warnings in legacy pages outside CR-385. Optional smoke rows M2-S11 / M3-S06 are the owner's rows ("skip will check later") — not P5 gaps.

---

## 9. Findings ledger — Phase 5 (Role 4 severity per AGENT_PROMPT_ALPHA Role 4)

| # | Finding | Class | Disposition |
|---|---|---|---|
| F1 | A5(a) `.frontdesk-bill` not a DOM child of `[data-testid='bill-right']` (it.32) | MINOR (test selector) | note only; all bill contents verified inside `bill-right`; `retest_needed:false` |
| F2 | `checkin-early-tooltip` not renderable on headless hover (it.31) | MINOR (UI-only) | note; DISABLED gate is functional |
| F3 | `fd-row-<id>-paid` briefly empty right after check-in (it.31) | MINOR (timing) | note; OG-PMS-047 family (D85 latency) |
| F4 | S4 collect-now assertion compared 3-night vs 2-night balance (it.33) | MINOR (test) | note; payment proven applied (₹73,840 = ₹74,340 − ₹500) |
| F5 | S7 HK "Clean" button not visible before Rooms tile refreshed (it.33) | MINOR (timing) | note; row 24 recorded PASS-with-note (owner 1a) |
| F6 | BUG-448 `fd-bill-tab-prefilled` class not captured (it.33) / C0b leg not reached (it.34) | NOTE | BUG-448 stays FIXED + QA-VERIFIED (P4.5 it.25/26); record "P5 re-check partial (it.33 checkout OK, class not captured; it.34 booking created, check-in not reached)" |
| F7 | `payment-split-btn` absent on POS for TGK RID 69 (no `partial` payment type configured) | NOTE (config) | D88 scope verified (panel not inside `.frontdesk-bill`); not a regression |
| F8 | OG-PMS-022 folio `remaining_room_balance` / `balance_payment` stay at pre-TAB value after departure | known residual P3 | already registered; re-observed in probe pack 2026-09-24, unchanged |
| F9 | LR list `charge` now carries `nights_detail` on calendar stays | improvement | BQ-385-19 delivered by backend (OG-PMS-027 already CLOSED 2026-09-21) — confirmed again by gate4 §4 / n11 N11-2 |
| F10 | origin `21implement` history re-imported 2026-09-23; commit `642ccb8` gone | process | cite the four blob sha256 everywhere (this report, registry, D90) |
| F11 | 24 pre-existing `react-hooks/exhaustive-deps` warnings in 12 non-CR-385 files | NOTE | outside CR-385 scope; optional "info" line in OPEN_GAPS in §5.7, not a P5 gap |
| F12 | `memory/test_credentials.md` wiped on each memory re-sync (3× in P5; absent again at §5.6 time) | process | pitfall already recorded; no read-back needed for §5.6–§5.8 |
| F13 | `iteration_31/32/33/34.json`, `session_a_*.json`, `a5_focused_raw.json`, `sessb_cleanup_result.json` not in this workspace | evidence-location | cited via SESSA/SESSB/SESSC handovers + registry entries #55/#56/"Session C CLOSED" + plan note §10d; only `iteration_30_CR385_P5_sessionA_rerun_2026_09_23.json` and `session_c_pos_regression.json` are present |

**No BLOCKER. No MAJOR. No FAIL on any functional assertion. Phase 5.5 not triggered.**

Registry spot-check at report time: `control/registry.json` CR-385 `status_history` carries Session A′ (#55), Session B (#56), Session C CLOSED, §5.4 probe pack DONE, §5.5 FINAL GUARDS 6/6 PASS, §5.6 ENTRY handover — JSON valid. CR-385 `status` still `GATE_5B_QA_PASSED (P4 + P4.5) …` — not CLOSED (correct: only the owner's word closes it, §5.8).

---

## Result

**Phase 5 regression PASSED 2026-09-24** — 34-row matrix: **33 PASS · 0 FAIL · 1 PENDING** (row 34 = registry Step 5 checklist, closes in §5.7); Sessions A′/B/C PASS (it.30–34); D17 / BUG-412 legs A/B/C ALL_PASS; probe pack 5/5 PASS + held_fallback skipped-no-recipe; guards 6/6 PASS on origin HEAD `b2db5a0`; zero code changes in `frontend/src`; hotspots byte-identical by sha256; sandbox restored (r4/r5 `hk`, settings default, `qa_rows_left: []`, owner stay r1 #256 untouched throughout).

**Ready for owner sign-off (§5.8)** after §5.7 registry closure. This report does not close CR-385 — only the owner's own close word, quoted verbatim, does.

Next steps: §5.7 registry closure tick list (FILE_OWNERSHIP owed block · `registry.json` files[] + BUG statuses · BUG_TRACKER · CR_REGISTRY + FU-385-C/D rows · OPEN_GAPS_REGISTER · CONTROL_DASHBOARD · PRD · SPRINT_STATUS placeholder · master-checklist ticks · R18 marker count → row 34 PASS) → §5.8 one sign-off message to the owner.
