# CR-385 · Impact Analysis Rev 4 — Gate 2.6 FINAL re-validation (2026-09-20)

```
Role:        PLANNING (ALPHA v0.7) · read-only on src/
Baseline:    design mockup v2.28 (Checkout v2.10 · Check-In v2.17 · Booking v2.28 · Extend v2.20 · Modify v2.21 · No-Show/Cancel v2.22 · Rooms v2.25 · Split/Credit v2.27)
Backend:     build 3, verified end-to-end 2026-09-20 (MASTER v1.6 §10; evidence/CR-385/probes_2026_09_20_gate4/)
Decisions:   DEC-1…9 (D46) · D47 · D48 (N1–N5) · D49 · D50 money contract · **D52 N7/N8/N9 decided · D53 N7/N8 delivered as settings + verified 2026-09-20 (BQ-17/18 ✅)**
Supersedes:  investigations/CR-385_IMPACT_ANALYSIS_2026_09_19.md §1–§21 (kept as history) · impact/CR-385_IMPACT_ANALYSIS_REV3_GATE_2_6.md
Gate status: **2.6 CLOSED by owner 2026-09-20** ("08 a 04 ok 05 yes 06 ok update docs and decision and close gate 2.6 follow agent promot and rules") — this document is the closure evidence (D54). Gate 3 OPEN.
```

## 0. Alignment report — what changed since Rev 3 / IA 2026-09-19
| # | Was | Now | Where recorded |
|---|---|---|---|
| 1 | Backend contract B-1/B-3/B-4/B-5/B-6 OPEN → RE-BLOCKED by D1–D8 | **DELIVERED · VERIFIED build 3** (D1–D13 + BQ-16 fixed; BQ-11 read+write) | MASTER §1/§9/§10 · trackers §B6 |
| 2 | "Partial payment" read as under-payment | = **split tender** (D46-j); under-payment stays blocked; Credit = TAB plain method (D47) — verified live | DESIGN_DECISIONS D46-j/D47/D49 |
| 3 | Booking had B2B toggle | B2B at **Check-In only** (N2/D48-c) → mockup v2.28 | D48-c · QA_TEST_PLAN §2C/§6e · AC-07 |
| 4 | N4 board shape = live regression, hot-fix needed | **Withdrawn** — old payload already `{rooms}`; transform verified on both; only `meta` passthrough (M0) | D48-d corrected · OG withdrawn |
| 5 | `balance_payment` / folio balance used for "owed" | **D50**: `charge.*` only; cleared ⇔ `payment_status paid && charge.balance_due 0`; `advance_payment` = cumulative paid | D50 · AC-22 · OG-PMS-019/022 |
| 6 | Pricing: FE sends `rate_per_night` | **Server prices** when omitted; 422 "no rate configured" (BQ-16) — FE never sends a rate | D48-a · BQ-16 |
| 7 | GST slab computed nowhere / assumed 5 % | Server applies slab (≥ ₹7,500/night → 18 %) on `charge` — FE never computes GST (D10 lesson) | this Rev §2 G-55 |
| 8 | DEC-8 Modify ₹0 = P0 bug | Latent; covered by server recompute + `preview:true` (verified W1b/W1c) | IA-09-19 §14 |
| 9 | Upgrade = charge field only | Upgrade also a **folio line** `Room upgrade: <reason>` (item_type OTHER) → Bill ROOM block lists it | this Rev G-28 |
| 10 | Owner questions N1–N6 | all closed; **N7/N8/N9 DECIDED (D52) and N7/N8 DELIVERED server-side + VERIFIED (D53, same day)**: `allow_early_checkin=false` → 422 · `extend_rate_mode=calendar` → 17,500 vs held 18,700 · N9 allow + warn. **No open backend ask**; N11 slab-on-blend question open (money) | D52/D53 · MASTER v1.8 · `probes_2026_09_20_n7n8/` · OG-PMS-023/024 closed · OG-PMS-025 (N11) |
| 11 | B-7 = "21 open registry items" | Re-counted: **8 need smoke** (402, 410, 411, 421, 425, 426, 428, 429/430), **1 unfixed** (418, fold into M6 — owner decision), **3 closable by decision** (384, 404, 413), CR-368 test baseline | §4 below |
| 12 | Mockup ₹2,677 regression figure | Stale since v2.26; `?bill=103` = ₹6,152 | QA_TEST_PLAN §6e |

## 1. Proof / validation check (re-run)
| Check | Result |
|---|---|
| Mockup v2.28 agent-tested | iteration_30 PASS (Booking B2B removed; regressions clean) |
| Design locks intact | Checkout v2.10 · Check-In v2.17 · Booking v2.28 (subtractive edit under N2) · Extend v2.20 · Modify v2.21 · No-Show/Cancel v2.22 · Rooms v2.25 · Split v2.27 — no other edits since D47 |
| Backend endpoints reachable + contract | 9/9 BQs VERIFIED live (08/09/10/14/15/06/12/11/16); 01/03/04 CLOSED; 02/05/07/13 Phase 2 |
| Money arithmetic (server) | create 9,500×1 + adv 1,000 → 11,210 / due 10,210 · +upgrade 1,500 → 11,000 · GST 18 % 1,980 → 12,980 / due 11,980 · extend ×2 → 20,500 → 24,190 / adv 1,500 / due 22,690 · TAB 22,690 → due 0 |
| src/ untouched | zero CR-385 application code; `roomStatusTransform` unchanged (verified, no hot-fix) |
| Sandbox | clean (no in-house probe stay); 8524 held by another tester |

## 2. Gap register — FINAL status (G-01…G-56)
Legend — **BE**: backend part · **FE**: our build · Module = where it is implemented (M0 shell · M1 New Booking · M2 No-Show/Cancel/Modify · M3 Check-In · M4 Extend · M5 In-House/Departures · M6 Bill/Checkout). Owner = who must act next.

| G | Item | BE | FE status | Module | Owner |
|---|---|---|---|---|---|
| G-01 | Booking charge single source (AC-01) | ✅ `charge{}` on every LR row | TODO: read `charge.*` everywhere; delete client recompute | M0/M1/M3 | FE |
| G-02 | Modify amount | ✅ server recompute + `preview:true`; FE amount ignored | TODO: Modify sends dates/plan only, shows preview | M2 | FE |
| G-03 | Amount base mixing (extend) | ✅ D4 fixed (server) | TODO: Extend shows server `charge`, no local maths | M4 | FE |
| G-04 | Row Balance = grand total (AC-02) | ✅ room part = `charge.balance_due` | Pa: F&B + transferred totals from `pmsService` → **B-7 smoke 421/426/429/430** | M5 | FE + QA |
| G-05 | Prepaid / PAH badge (AC-03) | ✅ `prepaid_amount`, `advance_payment`, `pah` | TODO: rule D48-b; BUG-413 closable | M0 | FE (+owner close 413) |
| G-06 | SGST then CGST, never merged (AC-04) | ✅ `charge.sgst/cgst` | TODO in Bill ROOM block (hotspot); folio `gst_tax` merged → not used | M6 | FE |
| G-07 | Refund arithmetic (AC-05) | Phase 2 (BQ-13, DEC-2) | read-only outcome card with Phase-2 ribbon | M2 | parked |
| G-08 | D15 ROOM ledger order | — | TODO | M6 | FE |
| G-09 | Room discount control | Phase 2 (BQ-07) | disabled stub | M6 | parked |
| G-10 | Extend collect ≤ payable (AC-06) | ✅ `payment{}` accepted | TODO guard + UTR | M4 | FE |
| G-11 | Booking/Modify guards (AC-07) | ✅ 422 on unknown plan | TODO client guards (dates, adults, advance ≤ total) | M1/M2 | FE |
| G-12 | Split tender + Credit, no under-payment (AC-08) | ✅ TAB verified | room mode already shows Split + TAB → **B-8 spike** confirms fit | M6 | FE |
| G-13 | Card/UPI reference (AC-09) | ✅ `advance.reference`, `payment.transaction_id` | TODO on Booking/Check-In/Extend | M1/M3/M4 | FE |
| G-14 | Two-step idempotent checkout (AC-10) | ✅ second TAB on paid order → verify 4xx (checklist P-M6-07) | TODO | M6 | FE |
| G-15 | No default method | present | — | — | — |
| G-16 | No zero-night stay (AC-11) | **verify**: PATCH checkout = checkin → expect 422 (checklist P-X-05) | client guard | M1/M2 | FE + probe |
| G-17 | Leaving-today / counts (AC-12) | ✅ `counts{}` + `meta.business_date` | TODO: display only, delete client date logic | M0 | FE |
| G-18 | Source rule EITHER/OR (AC-13) | ✅ BQ-04 closed | TODO `nsOrCancel()` port | M2 | FE |
| G-19 | Late arrival chip (AC-14) | server charge unchanged | TODO chip from `counts.arrivals_late` / row | M0 | FE |
| G-20 | Per-folio adjustment state (AC-15) | present | — | — | — |
| G-21 | Turns today · Area = `title` (AC-16) | ✅ titles in board | TODO | M0 | FE |
| G-22 | Room Detail grid + HK cell | payload has `hk_assignee`, `guest.phone/email` | TODO: additive `roomStatusTransform` fields — **owner ack (OD-385-12 exception, like Q2(a))** | M0 | FE + owner |
| G-23 | Alert bar | — | TODO (data from LR + board) | M0 | FE |
| G-24 | One workstation, expand-in-place (F1/F13) | — | TODO architecture (Option A side-by-side, DEC-5) | M0 | FE |
| G-25 | Common guest row (F3) | — | TODO | M0 | FE |
| G-26 | Global search (F8) | — | TODO client-side over snapshot | M0 | FE |
| G-27 | Header greeting / sync pill | present | — | — | — |
| G-28 | Check-In v2.17: IDs, upgrade, auto-print, B2B | ✅ upgrade (D9/D10 fixed) · ✅ setting read+write · upgrade = folio line | TODO `inline` CheckInPage + upgrade fields + auto-print toggle | M3 | FE |
| G-29 | Booking v2.28: type × plan grid, advance, no B2B | ✅ BQ-10/06/16 | TODO; FE **omits** `rate_per_night`; `rooms_count 1` | M1 | FE |
| G-30 | Extend v2.20: conflict → move, discount, collect-now | ✅ D12/D13 fixed | TODO `inline` ExtendStayDialog + `new_restaurant_table_id` on 409 — **B-7 smoke 402** | M4 | FE + QA |
| G-31 | Modify v2.21 | ✅ recompute/preview · refund Phase 2 | TODO | M2 | FE |
| G-32 | No-Show/Cancel v2.22 | refund Phase 2 | TODO dialog shell + prepaid from `charge.prepaid_amount` | M2 | FE |
| G-33 | Bill v2.10 Layout B (hotspot) | ✅ | **B-8 spike** → then build; **B-7 smoke 425/428**; **BUG-418 folded in (owner)** | M6 | FE + owner |
| G-34 | Error/Retry states (F14) | — | TODO | M0 | FE |
| G-35 | Sortable sticky headers (F16) | — | TODO | M0 | FE |
| G-36–G-43 | Terminology / dates / money format / plurals | — | TODO sweep (new page only; OD-385-12) | M0 | FE |
| G-44 | a11y (AC-20) | — | TODO | all | FE |
| G-45 | Split tile (v2.27, D47) | ✅ | room mode has Split; spike confirms | M6 | FE |
| **G-46** NEW | `charge.advance_payment` = cumulative paid (D50) | ✅ | chip only pending/in-house; Check-In "already paid" = `advance_payment`; Bill "Paid so far" | M0/M3/M6 | FE |
| **G-47** NEW | Never read folio `remaining_room_balance` / `balance_payment` (OG-PMS-019/022) | residual acknowledged | lint rule + code review item | all | FE |
| **G-48** NEW | Early check-in allowed by backend (N7) | ✅ **server-enforced** (`allow_early_checkin=false` → 422, D53) | FE reads the setting from profile; disables `Check In` when false and `checkin > meta.business_date`; surfaces 422 text verbatim | M3 | FE |
| **G-49** NEW | Extension nights priced at held rate (N8) | ✅ **server-enforced** (`extend_rate_mode=calendar` default, D53; BQ-17 verified 17,500) | FE shows `data.charge` only; label rate "avg. / night" on extended stays; **N11** slab-on-blend question to backend | M4 | FE (+ backend N11) |
| **G-50** NEW | Check-in into HK room allowed (N9) | **DECIDED (D52: allow + warn)** | picker lists HK rooms with HK badge + duration + amber warning; Confirm enabled | M3 | FE |
| **G-51** NEW | LR list window + `view=all` + `meta.business_date` | ✅ | replace ±60-day client window with server snapshot (BQ-12) | M0 | FE |
| **G-52** NEW | Board `meta` passthrough (N4) | ✅ | one additive transform field | M0 | FE |
| **G-53** NEW | BUG-418 GST display gap in checkout drawer | — | fix inside M6 (proposed) — **owner decision** | M6 | owner |
| **G-54** NEW | Check-in body must include `booking_for=Individual` (D11 default exists) | ✅ | keep field (pmsService already sends) | M3 | FE |
| **G-55** NEW | GST slab is server-side (≥ ₹7,500 → 18 %) | ✅ | FE never computes GST; tests assert display = `charge.sgst/cgst` | all | FE |
| **G-56** NEW | Multi-room booking (K1 ON HOLD) | `rooms_count` supported | FE fixes `rooms_count 1`; no multi-room UI | M1 | parked |

## 3. Backend contract gaps (IA §5 B-1…B-10 numbering) — FINAL
| # | Gap | Status |
|---|---|---|
| B-1 booking charge + plan | ✅ BQ-08 (+ BQ-16 pricing) verified |
| B-2 prepaid/advance | ✅ `prepaid_amount`, `advance_payment` (cumulative), `pah` — rule D48-b |
| B-3 No-Show/Cancel outcome | Phase 2 (BQ-13) |
| B-4 partial/Credit on checkout | ✅ split exists; TAB verified; under-payment stays blocked (DEC-3) |
| B-5 Extend contract | ✅ BQ-14 mechanics + BQ-17 pricing (`extend_rate_mode`) verified |
| B-6 Booking by type + advance (+ availability) | ✅ BQ-10/06 verified; B2B dropped |
| B-7 board fields `hk_assignee`, `guest.phone/email` | present — FE transform (G-22, owner ack) |
| B-8 KPI/counts | ✅ BQ-12 verified |
| B-9 room discount | Phase 2 (BQ-07) |
| B-10 sockets | CLOSED (refresh-on-focus, BQ-01) |

## 4. Blockers (tracker numbering B-1…B-9) — FINAL
| Blocker | Status | Next |
|---|---|---|
| B-1 charge{} incl. upgrade | ✅ CLOSED (build 3) | — |
| B-2 refund API | Phase 2 | — |
| B-3 Credit/TAB | ✅ CLOSED | — |
| B-4 extend-stay | ✅ CLOSED (build 3 mechanics + BQ-17 `extend_rate_mode` verified 2026-09-20) | N11 slab question (non-blocking) |
| B-5 type booking + advance + pricing | ✅ CLOSED | — |
| B-6 snapshot + setting | ✅ CLOSED (read + write) | — |
| **B-7** open bugs on shared files | **PROCESS — runs in parallel with Gate 3**; gates M3/M4/M5/M6 only | smoke: 402 · 410 · 411 · 421 · 425 · 426 · 428 · 429/430 (checklist §S) · close by decision: 384 · 404 · 413 · fold 418 into M6 · CR-368 triage before M5/M6 |
| **B-8** CollectPaymentPanel fit | **Gate 3 work** (½-day spike, evidence `evidence/CR-385/spike/`) | first Gate 3 task |
| **B-9** Gate 2.6 close | **owner** | "close Gate 2.6" |

## 5. Risks (R15–R22 + new) — owners
| R | Risk | Mitigation | Owner |
|---|---|---|---|
| R15 | CollectPaymentPanel (3,331 L, CRITICAL file) regression from `inline`/embedding | spike first; zero logic edits; POS regression checklist (AGENT_PROMPT L1496) | FE |
| R16/R17 | closed at Rev 3.1 | — | — |
| R18 | Copy-drift between copied forms and originals (mirror rule R9) | FU-385-C cutover plan; `inline` prop instead of copies where owner allowed (Q2(a)) | FE |
| R19 | Shared-file bugs leak into new page | B-7 smoke before M3–M6 | QA |
| R20 | Business date / timezone | server `meta.business_date` only (G-17/G-51) | FE |
| R21 | Refresh-on-focus staleness | manual refresh + after-action refetch; Phase 2 sockets | FE |
| R22 | Split state height in 560 px row | spike measure (v2.27 352–395 px fits) | FE |
| **R23** NEW | Money shown from two sources (charge vs folio) | D50 + AC-22 + lint/code-review rule (G-47) | FE |
| **R24** NEW | Backend build drift before prod | re-run `run_gate4.py` on each backend build; keep report table | FE |
| **R25** NEW | Shared sandbox (other testers' stays) | probes pick free rooms from `room-availability`; never assume 8524 | FE |
| **R26** NEW | Preprod token single-session | re-login per probe run | FE |

## 6. Acceptance criteria coverage
AC-01…AC-22 all mapped to G-rows above (AC-22 = D50 added 2026-09-20). Tick-box page: `/cr385-acceptance-criteria.html`. Master planning/implementation checklist: **`/cr385-master-checklist.html`** (this Rev's companion).

## 7. Gate 2.6 verdict (agent recommendation — owner decides)
- Backend blockers: **none open** (BQ-385-17/18 delivered as settings and verified, D53). Design: **locked v2.28, owner-accepted**. Money contract: **frozen (D50/AC-22)** + new rule "rate on extended stays is an average". N7/N8/N9 **decided + enforced**. Open: N11 slab-on-blend (backend, money, non-blocking) · owner O-8 settings-UI scope · BUG-418 placement · BUG-384/404/413 closure · G-22 transform ack — **none blocks planning**.
- Remaining blockers B-7 (parallel QA) and B-8 (Gate 3 deliverable) are process items by definition of the gate.
- **Recommendation: Gate 2.6 can be closed.** → **CLOSED by owner 2026-09-20 (D54).** Gate 3 = B-8 spike → `plans/CR-385_IMPLEMENTATION_PLAN.md` (M0–M7 incl. new M7 settings toggles per O-8 (a), verification matrix, registry checklist) → owner "close Gate 3" → Gate 4 GO.
- **Post-closure addendum (2026-09-20 late):** N11 fixed + verified (per-night slab, `nights_detail[]`, D55). New P2 items D14 (calendar extend response `charge` stale by same-call payment → FE refetches LR) and BQ-385-19 (`nights_detail` on LR list). **Gate 4 GO preconditions G4-01…G4-10 (D56)** — full regression re-run on the final build, D14, N11 boundary probes, B-7 smoke, D5 spike, plan, BQ-19, data-contract sheet, section titles, owner quote — are hard and live in `public/cr385-master-checklist.html#g4`.
- **Spike addendum (2026-09-20 night, D57/D58):** R15/R19 retired — `CollectPaymentPanel` fits the 560 px row unmodified (body 353 px, Checkout pinned at 1920×800 + 1366×768); Q6 = (a) host CSS (owner confirmed); Split state N/A in room mode; scroll-on-expand for low rows; sticky-th padding rule. Evidence `evidence/CR-385/spike/MEASUREMENTS.md`. Gate 3 milestone A done; plan (P-04) next.
- **O-8 (a) scope note:** the two toggles (`allow_early_checkin`, `extend_rate_mode`) go on the **existing PMS settings page** — a second OD-385-12 exception (after Q2(a) `inline` prop and O-6 transform fields). Impact: one existing settings component + `update-settings` multipart `data=` write (pattern already used for `auto_print_checkin_receipt`, BQ-11). Small blast radius; sized in the plan as **M7**.
