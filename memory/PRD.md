# MyGenie Core POS Frontend — Deployment PRD

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 16sep (latest)
- Deployed: 2026-09-15

## Architecture
- React (CRA + craco) frontend only — no local backend or database
- All API calls go to external API: https://preprod.mygenie.online/
- Socket: https://presocket.mygenie.online
- Firebase for auth/messaging
- Hosted at: https://494d04b0-021e-423f-9a56-2f723085dc1f.preview.emergentagent.com

## What Was Done
- 2026-09-14: Cloned branch `PMS13` from repo into `/tmp/pos-repo`
- 2026-09-15: Cloned branch `16sep`, synced remote memory dir to `/app/memory/`
- Replaced `/app/frontend/` contents with repo's `frontend/` directory (branch 16sep)
- Wrote `/app/frontend/.env` with all provided env variables
- Installed deps with `npm install --legacy-peer-deps` (package-lock.json detected)
- Restarted supervisor frontend → compiles with 0 fatal errors, 1 ESLint warning only
- App confirmed live at port 3000, HTTP 200, login page visible

## Env Variables (frontend/.env)
- REACT_APP_BACKEND_URL (platform proxy)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (full Firebase config)
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- REACT_APP_SHOW_AUDIT_TAB=true

## Preserved Platform Files
- /app/.emergent/
- /app/memory/
- /app/backend/
- /etc/supervisor/conf.d/ (unchanged, READONLY)

## Supervisor
- Program: `frontend` → `yarn start` → `craco start` from `/app/frontend`
- Port: 3000 (HOST=0.0.0.0 set by supervisor env)
- Status: RUNNING, compiled successfully

## Previous Branches Deployed
- audit8 (2025-09-08)
- PMS13 (2026-09-14)
- 16sep (2026-09-15)
- PMS17 (2026-09-17) ← current

## 2026-09-15 — CR-366 Planning (backend brief stage)
- Owner froze OD-366-01 (booked + collected revenue, booked primary), OD-366-02 (F&B separate, RevPAR rooms-only, TRevPAR extra), OD-366-03 (no range ceiling → server aggregation; Today/7D/30D pills + From/To).
- Filed `backend_briefs/BACKEND_BRIEF_CR366_REVENUE_AGGREGATION_2026_09_15.md` (GET aiosell/revenue-summary, payment_mode + booking_status enums, definitions §4, Q-366-01..10).
- Card added to `frontend/public/backend-briefs.html` (mirrored to `memory/backend_briefs/index.html`). registry.json / CR_REGISTRY.md / intake doc synced → CR-366 BACKEND-BLOCKED. OD-366-04 (placement) still open.


## 2026-09-16 — CR-363 Planning (conflict pre-check vs CR-366 + backend brief)
- Finding: Day Closure (`get-settlement-report`) DOES include room checkout cash (PmsCheckoutDrawer → `order-bill-payment` with cashier waiter_id), blended with F&B, no split. Night Audit must reconcile to it → backend split required.
- Owner froze OD-363-01..06: business-day per backend Q-366-08; **Both** Sales(booked)+Revenue(collected); F&B separate; read-only v1 (no lock); sidebar under Rooms & Reservations (= OD-366-04); replay unlimited.
- Filed `backend_briefs/BACKEND_BRIEF_CR363_NIGHT_AUDIT_2026_09_16.md` (GET aiosell/night-audit?date=, sections A–I incl. reconciliation, Q-363-01..08). CR-366 brief extended with Q-366-11..13 (tender split, settlement_room_share, same code path) + Sales/Revenue wording.
- Cards on `backend-briefs.html` (mirrored). registry.json / CR_REGISTRY.md / intake synced → CR-363 BACKEND-BLOCKED. Next: joint CR-363/366 Gate 2 after endpoints probe-able (R11).
- Pending: CR-362/BUG-397 Gate 6 owner smoke; CR-364 ODs; CR-357 OD-7.

## 2026-09-16 — Registry drift fix CR-365
- registry.json `backend_blocked` true→false, status_history entry added; CR_REGISTRY.md row rewritten to UNBLOCKED 2026-09-13; intake footer updated. Source of truth: intake L135 + SESSION_HANDOVER_2026_09_13.
- CR-381 `backend_blocked` string→false (text moved to note); full scan: 0 non-boolean flags remain.

## 2026-09-16 — CR-364 Intake continuation (INVESTIGATION + INTAKE)
- **CIB vs CR-364 comparison** (`memory/CR-364_INVESTIGATION_CIB_COMPARISON.md`): CR-131 Customer Intelligence (Beta) is CRM-fed restaurant-wide aggregate; CR-364 is per-stay operational folio (Check Out / Record Payment / Print Folio). DISTINCT — not duplicates.
- **CR-363/366 vs CR-364 gap analysis**: Night Audit and Revenue Dashboard are aggregate reports; cannot substitute per-guest operational surface (real-time balance, walk-ins without CRM profile, action layer, folio print, placeholder-link fix).
- **Print field spec**: swept `buildBillPrintPayload` (`orderTransform.js` L1797–L2268). Today emits `roomAdvancePay/roomRemainingPay/associated_orders[]/rtype='RM'`; missing room#, dates, meal plan, channel, booking id, per-night lines, dated ledger, special requests, pax, ID proof. ~60% of missing fields already in FE transform → wire into payload; ~30% BE-side on `room_info`/`reservation_ops`; ~10% new (per-night expansion, reprint counter, UPI QR, actual timestamps).
- **Backend brief filed**: `memory/backend_briefs/BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md` — 9 blocks / ~60 keys / 15 questions (Q-364P-01..15). Mirrored on `frontend/public/backend-briefs.html` + `memory/backend_briefs/index.html`. Smoke-tested (card expands, layout intact).
- **Owner decisions frozen**: **OD-364-01 = v1 totals only** (dated ledger endpoint B-364-01 optional post-v1); **OD-364-02 = PMS-specific folio via `rtype='RM'` template branch, FE passes every field BE accepts, R6 owner sign-off required before template goes live**.
- registry.json / CR_REGISTRY.md / intake doc synced. CR-364 UNBLOCKED, intake OPEN — Gate 2 gated on OD-03/04/05 answered next session.
- Pending: CR-364 OD-03 (re-point vs add links), OD-04 (F&B inline vs drill), OD-05 (departed access window); CR-362/BUG-397 Gate 6 owner smoke; CR-357 OD-7; walkthrough of remaining unblocked CR/BUG items.


## 2026-09-14 — CR-363 + CR-366 Gate 2 Impact Analysis (PLANNING role)
- R11 curl-probe on preprod PASS: `aiosell/night-audit` 200, `aiosell/revenue-summary` (day/week) 200; 422 on missing params. Evidence `evidence/CR-363/`, `evidence/CR-366/`.
- Joint IA written: `impact/CR-363_CR-366_JOINT_IMPACT_ANALYSIS.md`. OD-366-04 resolved (sidebar under Rooms & Reservations). `aiosellTransform.js` dropped from CR-366 scope; 2nd revenue-summary call dropped from CR-363.
- New owner decisions before Gate 3: OD-363-07/08, OD-366-05..08 + combined Sidebar SC ack. BE notes BN-1..6 (null fields, occupancy >100 %, audit_trail detail null ↔ BUG-193).
- Next: PLANNING Gate 3 (Implementation Plan) for CR-363/366; Gate 2 IA for CR-364 (data path) and CR-357.

---

## Session Update — 2026-09-14 (QA Handover Session)

### What was shipped this session
| Item | Status |
|---|---|
| CR-363 Night Audit | Gate 5a — Implemented. QA pending. |
| CR-366 Revenue Dashboard | Gate 5a — Implemented. QA pending. |
| CR-364 Guest Folio | Gate 5a — Implemented. QA pending. |
| CR-364-PRINT | Registered as sub-CR. Backend-blocked, parked. |
| CR-357 Room Advance | Parked 15 days. Re-evaluate 2026-09-29. |
| BUG-389 Room GST slab | CLOSED — Not a bug. Working as designed. |
| Excel tracker | Generated at /app/frontend/public/mygenie_cr_bug_tracker.xlsx |

### QA Backlog
- 87 items pending QA total (17 current sprint + 70 older backlog)
- Full batch plan in: `/app/memory/handover/SESSION_HANDOVER_2026_09_14_QA_AGENT_BRIEFING.md`
- QA agent to present plan to owner before executing any batch

### Next sprint priorities
1. QA Batch-01: CR-363 + CR-364 + CR-366 (PMS pages, live on preprod)
2. QA Batch-02: BUG-374 (P0) + BUG-369, 372, 394, 368 (P1)
3. CR-365 Housekeeping Gate 2 (after QA batches settled)
4. BUG-193 Room Transfer Trail — Gate 0-1 intake + RCA
5. CR-357 Room Advance — re-enable ~2026-09-29

---

## Session Update — 2026-09-15 (Investigation + Intake close)

### Done this session
| Task | Status |
|---|---|
| T1: 10 QA reports pulled from 15sepqa | ✅ Done |
| T2: 86 registry items → Gate 5b | ✅ Done |
| T3: CR_REGISTRY + BUG_TRACKER updated | ✅ Done |
| BUG-400 registered (P1, MAJOR, Fast Lane eligible) | ✅ Done |
| BUG-401 registered (P0, BLOCKER, CRITICAL R6) | ✅ Done |
| Local Room Types investigated (INV_LOCAL_ROOM_TYPES_2026_09_15.md) | ✅ Done |
| All ODs mapped to intake docs | ✅ Done |
| Full handover written | ✅ Done |

### Open ODs (owner to answer before next session starts work)
OD-401-01..04 · OD-400-01..02 · OD-NEW-01..03

### Next session priorities
1. Present 9 plain-English questions to owner (see handover §4)
2. JOB-1: Fix BUG-401 (BLOCKER) after OD-401-01 approved
3. JOB-2: Register Local Room Types CR after OD-NEW-01 answered
4. JOB-3: Re-run BATCH-10 regression after BUG-400/401 fixed
5. Gate 6 Owner Smoke (after BUG-401 fix landed)

### Handover location
/app/memory/handover/SESSION_HANDOVER_2026_09_15_NEXT_AGENT_FULL_BRIEFING.md

## 2026-09-16 — CR-385 PMS Front Desk Unified Workstation — INTAKE CLOSED (Gate 1 → Gate 2 next)
- Role: INTAKE (ALPHA v0.7). 6 decision rounds; **owner closed Gate 1** ("close intake gate"). Rule stands: every further gate needs explicit owner close.
- Confirmed directions: KPI tiles ARE the tabs (Arrivals default · Departures · In-House · Rooms); no page navigation for daily actions; Arrivals = not-yet-checked-in only; Departures = due-out only (true balance on rows); In-House rows get Request HK + Mark Clean; Rooms panel hybrid density toggle; Channel Sync card → header dot ("Channel Manager" never in UI); Departures widget removed; alert bar wanted; 40-room mockup; Phase 2 = backend aggregation.
- Artifacts: intake doc (rounds 1–5), `impact/CR-385_DATA_INVENTORY.md`, `handover/SESSION_HANDOVER_2026_09_16_CR385_FRONTDESK_INTAKE.md` (§7 = open questions to present ONE AT A TIME with numbered options).
- Backend Qs pending brief: BQ-385-01 (no PMS socket events on FE today), BQ-385-02 (aggregation).
- Process after close: Gate 2 IA → Gate 2.4 UX flow (low-fi) → Gate 2.5 HTML mockup → Gate 3. No `src/` code.
- Owner will NOT decide remaining UX options on paper → all become switchable variants MV-01..MV-09 in the Gate 2.5 mockup (handover §7). Q10 live updates = refresh-on-focus (provisional, revisit after BQ-385-01).
- Next session: PLANNING — re-open handover + intake doc, summarise to owner, ask doubts if any; on owner OK → Gate 2 Impact Analysis + backend brief (BQ-385-01/02). Keep owner questions ≤5, lettered options, no numbered lists (chat tool splits them).


## 2026-09-17 — CR-385 Gate 2 Impact Analysis (PLANNING role, ALPHA v0.7)
- Wrote `impact/CR-385_IMPACT_ANALYSIS.md` (Impact Analysis only — owner instruction). Zero `src/` changes.
- Probed 4 PMS read endpoints (all 200) → `evidence/CR-385/`; found LR `balance_payment` unreliable, `hk_assignee` + `no_show_count` unread.
- FU-385-B verified (Sync exists on OTA config page). Registry/CR_REGISTRY/CONTROL_DASHBOARD/OPEN_GAPS synced.
- **Gate 2 remains OPEN** — owner must explicitly close. Backend brief held until then.
- Next: owner closes Gate 2 → backend brief → Gate 2.4 low-fi UX flow → Gate 2.5 HTML mockup (MV-01..MV-09 switches) → Gate 3.

- 2026-09-17 (later): Owner locked OD-385-12 (new beta page, nothing existing touched), OD-385-15 (folio+checkout single screen), route/sidebar/tab decisions. **Gate 2 CLOSED.** Backend brief written. New HARD GATE 2.6 (IA re-validation after design) before Gate 3. Next: Gate 2.4 UX flow.

- 2026-09-18: Owner merged Gate 2.4 into 2.5 → clickable hi-fi mockup built at `frontend/public/cr385-frontdesk-mockup.html` (no src/ change). Owner to click through, adjust, freeze → DESIGN_DECISIONS → HARD GATE 2.6 → Gate 3.

- 2026-09-18: Mockup v2 live per design gap checklist (expand-in-place, Check Out=Folio, common row, compact tiles, global search, no-show rules). design_agent blueprint saved to /app/design_guidelines.json. Awaiting owner review/freeze → HARD GATE 2.6.

- 2026-09-18 (later): Owner added New Booking to CR-385 scope (intake addendum). Mockup v2.5: in-place New Booking, Tomorrow chip, sort, sticky headers, checkout Undo/Print toast, room picker availability, ID per adult, loading state, keyboard. Backend addendum BQ-385-06 (availability by date range). Next: owner review → freeze → HARD GATE 2.6.

- 2026-09-18: Gate 2.5 CLOSED (DESIGN_DECISIONS.md). Hard Gate 2.6 IA Rev 3 written; questions Q1–Q5 to owner. Next: owner closes 2.6 → Gate 3 plan.

- 2026-09-18 (handover): Owner deferred Q1–Q5 to next session. Handover written: `handover/SESSION_HANDOVER_2026_09_18_CR385_GATE_2_6_IA_REVALIDATION.md` (§3 = the 5 questions with lettered options, §4 = design-amendment procedure, §5 = Gate 3 steps). **Next agent: open with the 5 questions from §3, record answers in IA Rev 3 §7, amend design if needed, then ask owner to close Gate 2.6.**

## 2026-06 (fork) — CR-385 Gate 2.6 owner answers recorded (PLANNING role)
- Owner answered Q1–Q5: Q1(a) row button `Bill`, real `CollectPaymentPanel` right, footer/Undo dropped · Q2(a) `inline` prop on 4 existing dialogs (OD-385-12 exception) · Q3(c) shift-since dropped · Q4(a) trend hint Phase 2 · Q5(a) ½-day spike.
- Owner design feedback applied: no Split Bill (room mode already `onOpenSplitBill={null}`), payment methods shown, item breakup (room orders + transferred orders) on LEFT, only totals incl. GST + payment method + Checkout on RIGHT, no Balance-due card (repetition removed). Panel sections collapsed by default = existing behaviour → 0 panel edits.
- Files: `plans/CR-385_DESIGN_DECISIONS.md` §D D1–D5 (F2/F4/F5/F9/F15 struck) · `frontend/public/cr385-frontdesk-mockup.html` v2.6 · `impact/CR-385_IMPACT_ANALYSIS_REV3_GATE_2_6.md` Rev 3.1 (§7 decisions, §8 changelog: 13 files, ≈3,380 L, 7 copied sources, R16/R17 closed, R22 new).
- Mockup v2.6 verified by testing agent (`test_reports/iteration_1.json`, 33/33 checks). Zero `src/` changes.
- **Gate 2.6 NOT yet closed — owner must say "close Gate 2.6".** Registry / CR_REGISTRY / CONTROL_DASHBOARD untouched until then.
- Next: owner closes 2.6 → Gate 3: spike (evidence `evidence/CR-385/spike/`) → `plans/CR-385_IMPLEMENTATION_PLAN.md` → owner closes Gate 3 → Gate 4 code.

- 2026-06 (session close): Owner iterated the Bill expansion 4 rounds → **Layout B approved**, right = existing `CollectPaymentPanel` structure (Adjustments: Discount None/%/₹/presets · Coupon · Loyalty · Wallet → Bill Summary → pinned Settle + Checkout), left = ROOM (with room-discount control, disabled until **BQ-385-07**) + TRANSFERRED ORDERS. D-1(a) Adjustments gate L1330 accepted as today; D-2 loyalty needs CRM accepted. Q6 mechanism (prop vs CSS) still to pick. **Mockup NOT updated to final D1 (owner: record first, approve next session, then redraw → v2.7).** Docs: DESIGN_DECISIONS §D D1–D8, IA Rev 3.1 + Rev 3.2 notes. Handover: `handover/SESSION_HANDOVER_2026_06_CR385_GATE_2_6_ANSWERS_BILL_DESIGN.md`. Gate 2.6 still OPEN.
- 2026-06 (later, same session): Owner approved → **mockup v2.7 = final D1 (Layout B)** built and verified by testing agent (`test_reports/iteration_4.json`, all pass): left ROOM (disabled room-discount control, BQ-385-07) + TRANSFERRED; right F&B bill with Adjustments (Discount None/%/₹/preset + reason, Coupon, Loyalty, Wallet) → Bill summary → pinned Settle + Checkout. DESIGN_DECISIONS D8 + handover updated. Still pending before "close Gate 2.6": Q6 mechanism (prop vs CSS), BQ-385-07 backend brief addendum, IA header bump to Rev 3.2.
- 2026-06 (close): Handover updated — **next agent opens with an owner design review of mockup v2.7** (click path + 10-point checklist R1–R10 in handover §6 Step 1), amends only after "suggest → approve", then Q6 → BQ-385-07 brief → IA Rev 3.2 → "close Gate 2.6".


## 2026-09-18 — CR-385 v2.8 feedback amendment (PLANNING; environment evidence date)
- Latest task: owner asked to use `control/AGENT_PROMPT_ALPHA.md`, choose PLANNING, continue the recorded design changes and follow gates. Owner approved proposal; clarified settlement order `room transfer room balance grand total`; confirmed twice.
- Current repository context per deployment handoff: frontend branch `pms18sep`; current URL must always come from `frontend/.env` REACT_APP_BACKEND_URL, not historical URLs above. No deployment changes in this continuation.
- **Mockup v2.8 built:** D9 initial right-scroll anchor at Bill Summary (Adjustments remain above/reachable); D10 viewport-visible pinned Checkout with independent column scrolls and width-reflow correction; D11 left ROOM Adjustments then Room Summary, disabled type/value/reason pending BQ-385-07; D12 neutral settlement exact order **Room orders (F&B) → Transferred orders → Room balance → Grand Total**.
- Only executable file changed: `frontend/public/cr385-frontdesk-mockup.html`. Added stable Bill test IDs, viewport containment, scroll/focus/caret retention, local payment selection/ref controls. All transaction/printing/loyalty/coupon behavior remains **MOCKED**. No API integration or financial formula changes.
- **Verification:** iteration5 original amended flows passed except width-switch clipping; iteration6 fixed clipping but exposed numeric-input caret reversal; iteration7 final **7/7 PASS**, no outstanding findings. Real typing10 then loyalty gives Room102 total2236; flat50.5 gives2372; Room103 total2677. Desktop1920x800 with both1440/1024 presets and mobile390x844 Checkout fully visible, overflow[]. Main final browser independently confirmed totals/typing/visibility and captured screenshots in conversation.
- QA report7 screenshot paths generated by testing agent were not available locally; main-browser confirmation replaces those missing artifacts. Report7 addendum corrects its auto-generated formula narrative without altering observed results.
- **Integrity:** SHA256 confirmed `frontend/src/`, backend, `.env`, `memory/final/`, `registry.json` unchanged. Bill arithmetic block identical to baseline commit `a2d866d`. CR-385 application code reality **NONE**, inherited risk **HIGH**, Gate **2.6 OPEN**. No auth credentials created/modified; no source refactoring.
- **Source discrepancy logged OG-PMS-021:** real CollectPaymentPanel has Payment Method inside scroll bodyL1321–3297; only Pay ButtonL3299–3326 is pinned. Prior IA implied both were already pinned. The old ~4-line hidden-section estimate does not cover the full target layout; Q6 and Gate3 spike must account for settlement/scroll/reorder explicitly.
- Documents: DESIGN_DECISIONS D9–D12; IA §7 feedback and source-reality notes (header stays Rev3.1 pending consolidation); OPEN_GAPS OG-PMS-021; FILE_OWNERSHIP mockup-only record; `/app/design_guidelines.json`; `/app/test_result.md`; `/app/test_reports/iteration_5..7.json`.
- **Handover:** `handover/SESSION_HANDOVER_2026_09_18_CR385_V2_8_FEEDBACK.md` is the latest CR-385 continuation. Original June handover is history.

### Next actions / gate order
- P0: Owner visual review of v2.8: `/cr385-frontdesk-mockup.html` → Departures → Bill on P. Nair / Room103. Amend only after suggest→approve if further feedback.
- P1 after visual approval: resolve Q6 mechanism with OG-PMS-021 scope; write BQ-385-07 room-discount brief; consolidate IA Rev3.2; ask explicit `close Gate 2.6` before syncing gate registries.
- P2 after separate Gate3 approval: half-day throw-away spike → evidence → implementation plan/verification matrix → owner closeGate3 → Gate4 GO before application code.
- Parked unchanged: FU-385-A/C/D/E/F/G/H, BQ-385-01..06, CR-364-PRINT, transferred-orders retirement, D-1(b) eligibility change unless owner revisits D6. Room discount stays disabled until BQ-385-07 supported. No new backlog scope approved.


## 2026-09-18 — CR-385 v2.9 checkpoint and v2.10 Check-In layout pass
- Owner explicitly chose to remain in PLANNING/design, not advance to implementation. Checkout v2.9 is settled and excluded from further edits in this pass. Gate 2.6 remains OPEN.
- Reconstructed v2.9 from actual HTML and D13-D15: collapsed Room/F&B/Transferred sections on left; final figures/payment on right; compact room ledger. Historical v2.8 QA reports are absent in this workspace. Current-session read-only browser inspection confirmed Room107 checkout on1920x800/390x844, overflow[]. This is NOT recovered full v2.9 QA.
- Documented eight remaining expansion groups before feedback: Check-In, New Booking, Extend Stay, Modify Booking, Cancel Booking, No-Show, Room Details (six states), Mark All Clean. Walk-in and room-tile actions reuse the same forms. Review sequence in DESIGN_DECISIONS §E.
- User requested a small Check-In layout pass: left guest/contact details, rooms booked and booking information; right document collection and payment at check-in. User confirmed existing advance-payment rules, no new full-bill settlement. D16 records this approved direction; detailed feedback/freeze still pending.
- Mockup v2.10: Check-In-only compact two-column layout. Sample booking/stay/room data on left; per-adult front/back ID capture previews and unchanged ₹500/Cash advance demo on right. Booking fields remain preview values; capture and payments MOCKED. Single-room sample count is derived from demo booking rows, not a new production multi-room contract.
- Scope: HTML Check-In render + scoped CSS + optional `?checkin=a5` review link + documentation only. No src/, API, auth, backend, env, registry gate, checkout or other-form logic changes. No new credentials.
- Verification: PASS — current `/app/test_reports/iteration_1.json` + `iteration_2.json` (v2.10, not missing historical reports with those names). Desktop1920x800/mobile390x844 and1024px content containment; normal/late/CRM and six-adult/long-name cases; doc capture preview/checkbox/Close/Cancel/Esc/confirm; Arrivals, booked-room119 and NewBooking entrypoints passed. Checkout107 zero and103 total2677 regression passed. Main SHA256 checks confirm checkout render/CSS/submission, Check-In submission, src/, backend, env and registry unchanged. No auth credentials or code refactoring. This is mockup QA, not production QA or final owner Check-In design approval.
- Latest handover: `handover/SESSION_HANDOVER_2026_09_18_CR385_V2_10_CHECKIN_LAYOUT.md`.
- Next: owner feedback on Check-In first; then New Booking; Extend/Modify; Cancel/No-Show; Room Details/Mark All Clean. Checkout stays settled. After design review: Q6 production composition scope/OG-PMS-021, BQ-385-07 brief, IA Rev3.2 consolidation, explicit Gate2.6 close, separately approved Gate3 spike/plan, Gate4 GO.
- Parked scope unchanged: FU-385-A/C/D/E/F/G/H, BQ-385-01..06, CR-364-PRINT, transferred-orders retirement and D-1(b) eligibility changes. Existing fallback limitations remain visible, especially future-date availability; no new integration promised.


## 2026-09-18 — CR-385 v2.11 compact Check-In + Phase2 concept
- User corrected v2.10: compact read-only facts, **IDs on LHS**, primary identity known, additional adults need names and own IDs. RHS must contain relevant-room assignment and booking-room bill/collection, supporting many available rooms without a tile wall. User approved option b: corrected single-room mockup plus simple multi-room concept for review only.
- D17-D19 recorded in DESIGN_DECISIONS §G. Current design: stacked booking facts + per-adult editable names/ID-type and simulated capture/preview/removal LEFT; searchable eligible-room chooser + sample booking room charge/GST/already-paid/new collection/remaining-or-credit RIGHT. Readiness and missing-name/front-ID/room/method states; prepaid/zero collection; drafts preserved through switching/close.
- Isolated40-room/30-vacant picker example (non-submittable; no property data mutation). Separate3-room Phase2 concept switcher with per-room drafts/sample bills and a read-only checked-in room. NO combined check-in/payment; not promoted toPhase1.
- Existing RoomCheckInModal and CheckInPage were inspected against owner screenshots. Real source discrepancies (ID required settings, child details, advance limits, single vs multi submission) remain IA decisions, not silently resolved. Sample ID front required/back optional, sample GST5% and room payment allocations are MOCKED, not production policy. No uploads/network integration.
- Mock Check-In confirmation now uses explicitly selected eligible room and current sample ledger/collection rather than old fixed500 deduction. Room-tile Check-In missing a non-expired linked reservation blocks instead of substituting another arrival. No other expansion redesign.
- Checkout, production src/backend/env/registry remain untouched; main SHA256 confirmed checkout render/CSS/submission and other-form/NewBooking blocks identical. Gate2.6 OPEN, owner Check-In review pending. Verification: PASS `/app/test_reports/iteration_3.json` for stateful guest/ID/room/payment mock flows, late/prepaid/zero/credit,40/30 isolation, multi draft/read-only/no-submit,1920x800/390x844/1024-content and checkout103/107 regression. Report prose correction recorded: conceptRoom2 tax165=82.50+82.50, total3465. Linked test script is placeholder only; report documents inline browser testing, not a reusable suite. No production QA implied.
- Latest handover: `handover/SESSION_HANDOVER_2026_09_18_CR385_V2_11_CHECKIN_CONCEPT.md`. Review single via `?checkin=a2`, concept via `?checkin=a2&concept=multi`, prepaidCRM via `?checkin=a5`. No auth credentials created/modified.
- Next: review corrected single-room layout and optional multi-room concept; owner decides whether to continue refinement. Phase2 stays default for multi; Q6/BQ385-07/IARev3.2 and gated spike/implementation remain after design. Other expansion queue and parked items from v2.10 unchanged.


## 2026-09-18 — CR-385 D20 mandatory Check-In feedback/sign-off handover
- Owner explicitly requested updated decisions and a next-agent walkthrough to collect Check-In feedback and obtain explicit closure BEFORE moving to Booking. Owner approved DOCUMENTATION-ONLY work with `yes`; this is NOT final Check-In design approval.
- Status: **Check-In v2.11 review OPEN; Booking design review/edits BLOCKED pending explicit Check-In closure AND owner authorization to proceed.** Checkout v2.9 remains settled/untouched; multi-room remainsPhase2 concept; Hard Gate2.6 staysOPEN independently.
- DESIGN_DECISIONS §H D20 records the required review/approval/sign-off protocol; §E queue updated. Existing current handover `handover/SESSION_HANDOVER_2026_09_18_CR385_V2_11_CHECKIN_CONCEPT.md` expanded with area-by-area walkthrough, representative data/URLs, feedback checkpoints, approval-before-edit loop, verification limits and final explicit close question. IA §11 echoes the hold; no registry gate updates.
- Next agent starts single-room `?checkin=a2`: compact LEFT facts -> per-person IDs/children -> RIGHT room assignment/40-30 chooser -> bill/collection/readiness -> entry/late/prepaid states. Show one area at a time; summarize feedback, propose and get approval before edits. Show revisions after appropriate tests; do not infer visual freeze from QA PASS.
- Multi-room concept shown separately after single-room walkthrough or on owner's request, with Phase2/review-only/non-submittable label. Scope promotion requires a separate explicit decision and feasibility review. Deferral does not prevent single-room Check-In closure.
- Final question: "Do you explicitly close this Check-In design and authorize us to start the Booking design review?" Record unambiguous owner quote/date/version/deferred scope/test reference. If only Check-In closure is granted, request Booking permission separately. No closure/Booking authorization has been received yet.
- Documentation-only: mockup remainsv2.11, no code/assets/env/auth changes, no new application testing claimed. Existing verified report3 remains prior mockup QA, not owner sign-off. Verification PASS: all four records consistently state D20/Check-In OPEN/Booking BLOCKED, handover/report references exist, SHA256 confirms mockup/env/gate registry unchanged. No application retest needed for documentation-only changes.
- After explicit screen sign-off: Booking review next, then remaining expansion queue. Gate2.6/Q6/BQ385-07/IARev3.2/Gate3/Gate4GO and parked backlog remain separate and unchanged.


## 2026-06 — CR-385 v2.13 shipped (D28) + v2.14 layout approved (D29)
- v2.13 (D28, IMPLEMENTED in `frontend/public/cr385-frontdesk-mockup.html`): owner's 3 consistency fixes on Check-In — booking facts to a 2-column grid; payment pills changed from a solid black fill to the frozen-checkout selected style (white bg + dark inset ring + bold, palette has no black block); bounded columns + pinned Confirm reusing the checkout containment idea (`fitCheckin` + reveal-scroll). iteration_5 flagged pinned-Confirm clip at 1920×800 + pill #FAFAFA-on-hover → both fixed in code (viewport-aware fitCheckin + reveal-scroll; `.ci-pill:not(.on):hover`); final re-test folds into v2.14.
- v2.14 (D29, APPROVED — NOT YET BUILT): owner brainstorm accepted Option B — mirror the frozen Checkout split. LEFT (scrolls) = compact 2-col facts + room assignment/upgrade (moved from right) + collapsible per-guest ID cards (user toggle; auto-collapse when complete; incomplete stays open). RIGHT (short, no internal scroll) = room bill + collect + Cash/Card/UPI + Txn/UTR + readiness + Confirm always visible. Room/upgrade on LEFT updates RIGHT figures live. Supersedes the D28 RIGHT-column scroll. All MOCKED; mandatory ID logic still reuses existing code (D22).
- Docs: DESIGN_DECISIONS §I D28–D29. Handover: `handover/SESSION_HANDOVER_2026_06_CR385_V2_13_V2_14_LAYOUT.md` (has the builder notes for v2.14). Gate 2.6 OPEN; D20 explicit Check-In closure + Booking authorization still required — accepting D28/D29 or any QA PASS is NOT closure.
- Next: build v2.14 (D29) in the Check-In section only, verify (1920×800 + 390×844, upgrade→figures live, lightbox, checkout 103/107 regression), then resume the D20 walkthrough toward explicit Check-In closure before Booking. Multi-room stays Phase 2.


## 2026-06 — CR-385 v2.14 BUILT (D29 implemented)
- Implemented the approved Option B (checkout-mirrored) Check-In in `frontend/public/cr385-frontdesk-mockup.html` v2.13 → v2.14: LEFT column = booking facts (2-col) → room assignment/upgrade (moved from right) → collapsible per-guest ID cards (user toggle via `checkin-adult-toggle-N`; auto-collapse when complete, manual-expanded stays open); RIGHT column = short room bill + collection with Confirm always visible, no internal scroll. Room/upgrade choice on LEFT updates RIGHT figures live.
- Verified iteration_6 (all v2.14 flows PASS: structure, live upgrade→total, collapse/auto-collapse, lightbox, white pills, 2-col facts, a5/a1, mobile, checkout 103/107 regression). The one HIGH it flagged (RIGHT scroll / Confirm clipped at 1920×800) was fixed after the report: viewport-aware `fitCheckin()` (reveal to panel top + cap `--ci-height` to panel bottom − layout top − disclaimer) + compacted disclaimer; Confirm now within the 1920×800 viewport, RIGHT scroll-free (browser-verified). A confirmatory re-test of that single fix is advisable next session.
- All MOCKED; checkout v2.9, src/backend/env/registry untouched; Gate 2.6 OPEN. Accepting D29 / any QA PASS is NOT Check-In closure — D20 explicit closure + Booking authorization still required.
- Docs: DESIGN_DECISIONS §I D29 (status IMPLEMENTED + verification); handover `handover/SESSION_HANDOVER_2026_06_CR385_V2_13_V2_14_LAYOUT.md`.
- Next: resume the D20 Check-In walkthrough on v2.14 toward explicit closure before Booking; re-confirm the 1920×800 containment fix; multi-room stays Phase 2.


## 2026-06 — CR-385 v2.14 RIGHT-scroll fixed + Completion Badge (D30)
- RIGHT "Bill & collection" no-scroll bug fully resolved: removed the redundant RIGHT h3 "This room's booking bill" (pane header already labels it) + tightened RIGHT section/footer spacing (on top of the viewport-aware `fitCheckin`). SGST/CGST breakup preserved. Re-verified iteration_7: RIGHT `.ci-pane-body` scrollHeight==clientHeight (392) on a2/a5/a1 and paid-upgrade; Confirm bottom 733.5 < 800; no JS errors.
- Completion Badge (D30): pinned LEFT strip `checkin-progress` — `checkin-progress-ids` (IDs done/total, green when all), `checkin-progress-room` (✓ Room N assigned / • not assigned), `checkin-progress-balance` (Balance ₹N = balance before collection). Live-updates; verified iteration_7 (warn→ok transitions, balance matches checkin-balance-before).
- Docs: DESIGN_DECISIONS §I D29 (verification updated) + D30. Still PLANNING; per D20 not Check-In closure. Next: walkthrough review of v2.14 toward explicit Check-In closure before Booking.


## 2026-06 — CR-385 Check-In design CLOSED (v2.14, D31) + badge "Ready" polish
- Badge polish (D30): green "Ready to check in" pill (`checkin-progress-ready`) appears on the LEFT progress strip once every step is complete (missing.length===0, not blocked); disappears when a requirement is removed; hidden in multi-room/inventory modes. Verified iteration_8 (green rgb(50,153,55), state transitions, blocked-mode hidden). Regression clean.
- **Check-In design CLOSED / LOCKED by owner** at mockup v2.14 (owner: "close the design for check in update docs and decision with all details"). Recorded in DESIGN_DECISIONS §J D31. Treat Check-In like Checkout v2.9 — no edits without a new explicit owner request.
- Booking design = READY next; per D20 §8–9 confirm owner go-ahead before editing the New Booking screen. Screen-level closure only — not Hard Gate 2.6/Gate 3/Gate 4/production.
- Closed design (v2.14) = checkout-mirrored layout + F1–F4/G1–G7 + Completion Badge; verified across iteration_4/6/7/8; checkout 103/107 regression unchanged. Docs: DESIGN_DECISIONS §J D31 + header/§E/§H status updated; handover `handover/SESSION_HANDOVER_2026_06_CR385_CHECKIN_CLOSED.md`.
- Next: ask owner to proceed to New Booking design review; keep Check-In v2.14 + Checkout v2.9 locked.

## 2026-06 — CR-385 Check-In open items reviewed; multi-room ON HOLD
- Owner decision: **multi-room check-in is ON HOLD** ("For now, we will put multi check-in on hold"). It remains Phase 2 concept-only / non-submittable in the mockup; not to be designed until owner resumes. Check-In v2.14 stays CLOSED/LOCKED.
- Open/parked Check-In items recorded in DESIGN_DECISIONS §K: K1 multi-room (ON HOLD), K2 booking-wide payment split (parked, tied to K1), K3 G5 early check-in fee (deferred later CR), K4 G6 welcome slip (CR-364-PRINT), K5 occupancy-change rule (routed to booking review), K6 live-rule reconciliation (implementation).
- Phase-2 decisions to capture if multi-room resumes: IDs per-room vs one lead ID; payment per-room vs combined-then-split; partial check-in of ready rooms; complimentary-upgrade manager auth once per booking vs per room. Plain-English multi-room walkthrough given to owner (room tabs, per-room drafts, booking-level readiness, per-room upgrades, check-in-all or in-waves) — captured in closure handover.
- Active focus unchanged: New Booking design review next (on owner go-ahead); Check-In v2.14 + Checkout v2.9 locked.


## 2026-06 — CR-385 Check-In additions: auto-print receipt (D32) + B2B GST billing (D33)
- D32 (v2.15): "Auto-print check-in receipt" checkbox in the RIGHT footer; default from a property Setting (CI_SETTINGS.autoPrintReceipt, sample On), overridable per check-in; confirm toast reports receipt auto-printed / not. Verified iteration_9.
- D33 (v2.16): "B2B (GST) billing" tick in a LEFT Billing section; when ticked, requires GST customer name + GST customer number (GSTIN); added to readiness so Confirm/ready-pill block until filled; "Bill to" flips to "Company (GST)". B2B flow itself = existing working design; only the two invoice fields captured. Verified iteration_10.
- RIGHT no-scroll invariant maintained: removed footer policy note, relaxed fitCheckin buffer (−14→−8), compacted .ci-money rows. Verified iteration_12 — RIGHT scrollHeight ≤ clientHeight in baseline AND paid-upgrade; Confirm within 1920×800; SGST/CGST separate; checkout ?bill=103 ₹2,677 unchanged; no JS errors.
- Docs: DESIGN_DECISIONS new §L (D32/D33) + header updated. Check-In = v2.16 working baseline (v2.14 closed + these additions). Multi-room still ON HOLD (§K). Next: confirm go-ahead for New Booking design review; Checkout v2.9 locked.



## 2026-06 — CR-385 New Booking design review STARTED + first iteration BUILT (v2.17, D34)
- Owner authorized starting the Booking review and chose written-blueprint-first. Blueprint: `memory/plans/CR-385_BOOKING_V2_17_BLUEPRINT.md`; decision recorded in DESIGN_DECISIONS §M D34.
- Owner clarifications baked in: (1) Booking books a ROOM TYPE only — the specific room number is assigned at Check-In (no room-number picker on Booking); (2) guest documents/IDs are NOT captured at Booking (Check-In only); (3) advance is COLLAPSED by default with a Phase-2 "send payment link" placeholder; (4) BOTH "Save booking" (→ Arrivals) and "Save & Check in now" (→ morphs into Check-In v2.16); (5) optional B2B (GST) capture (name + GSTIN); (6) meal plans + room types are API-driven (mockup renders from a sample config).
- BUILT as mockup v2.17: replaced the old placeholder `nbForm()` with a Check-In-consistent two-column, expand-in-place form. LEFT = Guest → Stay (dates + meal-plan pills) → Room TYPE pills (rate + N free + availability) → Billing (B2B tick). RIGHT (short, no internal scroll) = live bill (SGST+CGST SEPARATE) → collapsed advance (Cash/Card/UPI pills + Txn/UTR + Phase-2 note) → balance → readiness "Ready to book" pill → pinned Cancel / Save booking / Save & Check in now. Reuses .checkin-expansion CSS; new NB_TYPES/NB_PLANS/NB_CRM + nb* helpers; `?booking=1` opens it; CRM autofill on 9811122233.
- Verified iteration_13 (frontend, 100%, no bugs): all flows incl. live figures, readiness gating, CRM lookup, advance expand, B2B gating, both save actions (Save & Check-in morphs to checkin-expansion), room-tile entry ("From room NNN · type"), no-scroll invariant at 1920x800 collapsed (sh=157/ch=157, btn 505) and advance-expanded (sh=359/ch=359, btn 707), 1024 two-column reflow. Regression clean: checkout ?bill=103 ₹2,677 / ?bill=107, check-in ?checkin=a2 all unchanged; zero JS errors. Checkout v2.9 + Check-In v2.16 untouched; multi-room still ON HOLD.
- Status: v2.17 first iteration is BUILT + agent-verified, awaiting OWNER review/feedback (their "second iteration"). Not a closure.


## 2026-06 — CR-385 New Booking v2.18 (room×plan grid, B2B in guest block, advance→check-in) + cross-tab row-toggle
- R1: replaced separate room-type + meal-plan pills with a single Room×Rate-plan GRID (booking-rate-grid; cells booking-cell-<type>-<plan> = all-in price/night). Reads "one type across all plans" per row (owner Option B). RIGHT bill still itemises room vs meal; SGST/CGST separate.
- R2: B2B (GST) tick moved into the Guest block under name/phone; bottom Billing section removed.
- R3: booking advance now carries into Check-In (nbSave a.prepaid; ciContext line.prepaid) — verified ₹1,000 → balance=total−1000. Only Check-In change; v2.16 otherwise locked.
- Cross-tab fix: clicking an already-open Arrivals/Departures/In-House row now COLLAPSES it (Rooms tiles already toggled); different-row switch still one click; action buttons + Esc unaffected.
- Verified iteration_14 (frontend 100%, no bugs): grid prices, cell→bill live, B2B gating/placement, advance pass-through, RIGHT no-scroll (collapsed sh157/ch157 btn505; advance sh340/ch340 btn688), toggle on all 4 tabs, regression ?bill=103 ₹2,677 / ?bill=107 / ?checkin=a2 clean, zero JS errors. Checkout v2.9 untouched.
- Docs: DESIGN_DECISIONS §M D35 + header/blueprint updated. Status: New Booking = v2.18 working baseline (BUILT + agent-verified), awaiting owner review. Minor note: sold-out type greys all its plan cells (correct); revisit messaging at backend wire-up.
