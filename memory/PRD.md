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

## 2026-06 — Alert bar "+N more" made actionable (popover)
- The alert bar's "+N more" is now a clickable link (data-testid=alert-more) that opens a popover (data-testid=alert-popover) listing ALL alerts, each row (alert-item-<i>) a working link that navigates + expands the record via go(). Toggle-close, outside-click-close, no duplicate popovers.
- Verified iteration_15 (frontend 100%, no bugs): 6 rows (3 in bar + 3 more), navigation + close all work, zero JS errors.
- Note (pre-existing mock nuance, tester-flagged, optional): the "K. Menon · stay expired" row's demo link lands on a different sample record in the check-in view; this predates the change and is a mock-data alignment nuance, not the popover. Offer to align mock alert IDs↔labels if owner wants.

## 2026-06 — Alert bar tidy + priority + Booking bill advance/GST (verified iteration_16)
- Tidy Alert Demo: alert links now carry precise guest+room (e.g. "Room 101 · A. Sharma · overdue 1 day"); expired-arrival alerts open the Mark No-Show panel for that exact booking (fixes prior K. Menon→wrong-record mock nuance; verified opens "Mark No-Show · K. Menon · BK-3000").
- Alert Priority: alert bar + popover sorted most-urgent-first (overdue check-outs → extended housekeeping → out-of-order → no-show; HK by longest duration). Popover rows show a category tag (Overdue/Housekeeping/Out of order/No-show); overdue+HK rows get a red 'urgent' accent.
- Advance In Bill: New Booking right bill now shows booking-advance-paid ("Advance paid · <method>") when an advance is entered, and booking-bill-gst ("Bill to (GST): <company> · <GSTIN>") when B2B is filled — both before saving. Balance reflects advance.
- Verified iteration_16 (frontend 100%, no bugs): priority order, tags/urgent, link precision, popover toggle/outside-close, advance+GST lines, no-scroll RIGHT held (sh379/ch379, btn727<800), regression ?bill=103 ₹2,677 / ?checkin=a2 / cross-tab toggle intact, zero JS errors. Checkout v2.9 + Check-In v2.16 untouched.

## 2026-06 — New Booking DESIGN CLOSED at v2.18 (owner sign-off)
- Owner: "Booking is fine. We can close the design for the booking." Booking baseline LOCKED at v2.18 (grid, B2B in guest block, advance→check-in, advance-paid + Bill-to(GST) lines). Treated like Checkout v2.9 / Check-In v2.16 — no changes without a new owner request. Recorded in DESIGN_DECISIONS §M D36 (+ D37 alert bar tidy/priority/popover).
- NEXT expandable box to design (recommended): Extend Stay (kind='extend') — currently a bare read-only placeholder, frequent action, reuses date+rate+collect language. Then Modify Booking (kind='modify', shared components), then the Mark No-Show + Cancel Booking confirmation pair. Room-tab tile detail is lower priority.

## 2026-06 — Extend Stay BUILT as v2.19 (verified iteration_17)
- Next expandable box after Booking closed. Replaced the read-only extend placeholder with a two-column expand-in-place form in the locked language. Blueprint: memory/plans/CR-385_EXTEND_STAY_V2_19_BLUEPRINT.md.
- Behaviour: new check-out (min cout+1) → live extra-nights × room-type rate → SGST/CGST separate → extension total → folio-after. Same-room availability check; conflict (mock: even room + newCout>cout+1) shows warning + auto-suggests/pre-selects first free same-type room (★) and REQUIRES the move before Confirm. Optional Discount (percent/amount + reason, gates confirm). Settle = Add to folio (default) or Collect now (Cash/Card/UPI + UTR). Confirm updates checkout, performs room move, toast.
- Verified iteration_17 (frontend 100%, no bugs): entry from In-House + Departures, conflict path, discount reason gating, UPI UTR gating, no-scroll RIGHT worst-case (378/378, btn 770<800), regression booking/checkout/checkin/cross-tab toggle/alert popover all intact, zero JS errors. Fixed minor toast (source room). Closed screens untouched.
- NEXT expandable box: Modify Booking (kind='modify'), then Mark No-Show + Cancel pair, then Room detail.

## 2026-06 — Extend Stay right panel reworked to full-bill (v2.20, verified iterations 18–19)
- Owner: show the whole position, not just the extra nights. RIGHT panel now: Pending balance (folio) + Extension total = Total payable (bold); single optional "Collect now" block (amount + Cash/Card/UPI + UTR) — removed the Add-to-folio/Collect-now toggle; Balance remaining = total payable − collected (bold), rest stays on folio (cue shown in footer readiness + disclaimer). Confirm sets folio to balance remaining.
- Verified iteration_19: no-scroll invariant restored (busiest state 363/363, confirm bottom 703<800), footer balance cue present, method/UTR gating + conflict/discount paths intact, regressions clean, zero JS errors. Extend Stay = v2.20 baseline, awaiting owner review. NEXT box: Modify Booking, then No-Show/Cancel pair.

## 2026-06 — Modify Booking BUILT as v2.21 (verified iteration_20)
- Replaced the read-only Modify placeholder with a two-column form reusing the Booking room×rate-plan grid (nbGrid(d,pick) now parametrised; Booking unaffected). LEFT: Guests, Stay (dates+nights), Room&rate grid + type availability, Discount, required Reason. RIGHT (standard bill): New booking charge/discount/SGST/CGST/New total → Current booking → bold "Change vs current" (+ to collect / − refund-or-credit). Positive change → optional Collect now (Cash/Card/UPI+UTR) → Balance remaining; negative → refund pills (Refund to guest / Folio credit, Phase-2 mock); equal → no-change note. No room-move (bookings are type-only; room assigned at Check-In).
- Current-total now computed on the same rate×nights basis as the new charge (was o.amt per-night), so Change reflects only the actual modification (₹0 when unchanged).
- Verified iteration_20 (frontend 100%, no bugs): entry via Arrivals kebab→Modify, live re-price, positive/negative change paths, reason+UTR gating, Save persistence, no-scroll invariant, regressions (Booking grid still nbPickCell, Checkout/Check-In/Extend/alert/toggle) intact, zero JS errors.
- NEXT expandable box: Mark No-Show + Cancel Booking (confirmation pair), then Room detail. Modify = v2.21 baseline, awaiting owner review.

## 2026-06 — No-Show + Cancel confirmation pair BUILT as v2.22 (blueprint approved; verify iteration_21)
- Owner reviewed blueprint (plans/CR-385_NOSHOW_CANCEL_V2_22_BLUEPRINT.md) and chose a compact **confirmation dialog** (not the tall Extend/Modify two-column form) given the destructive nature. Both expansion(o,'noshow') and expansion(o,'cancel') rebuilt in the .exp/.exh/.exb/.exf shell: 2-col body (inputs left, read-only money outcome right) + footer consequence hint + [Back] + destructive primary.
- No frontend penalty picker — backend owns the real penalty; frontend shows outcome read-only. Money-outcome card: Prepaid/advance → penalty/forfeited (separate SGST + CGST sample 2.5%) → Refund due; refund>0 shows [Refund to guest]/[Folio credit] (Phase-2 mock); prepaid=0 → "Nothing paid — no refund".
- Non-OTA No-Show Confirm stays DISABLED (BQ-385-04) with "Cancel booking instead"; OTA enables it. Cancel keeps config-driven Reason select (CANCEL_REASONS mock: Guest request/No-show/Duplicate/Payment failed/Other) + Notify toggle (source/guest) + audit note; reason required.
- Variant A prepaid seeding (owner-approved): prepaid = amt×nights for prepaid/OTA (pah=false), ₹0 for pay-at-hotel. Sample penalty (MOCKED): retain first night for no-show/most cancel reasons; ₹0 for Duplicate & Payment-failed; capped at prepaid. Added demo expired-OTA-prepaid arrival (ans · F. Almeida · MakeMyTrip · Suite · 14→16 Sep). Added review hook ?open=<id>:noshow|cancel.
- Agent-verified via review-hook screenshots (No-Show F. Almeida: Prepaid ₹9,000 / forfeit ₹4,500 / SGST+CGST ₹112.5 / Refund ₹4,500, enabled; Cancel J. Pereira: Prepaid ₹3,000 / penalty ₹1,000 / SGST+CGST ₹25 / Refund ₹2,000). testing_agent regression (incl. Modify v2.21 arithmetic) = iteration_21. LOCKED screens (Checkout v2.9 / Check-In v2.16 / Booking v2.18) untouched. Mockup = v2.22.
- NEXT (and last) expandable box: Room detail (Rooms-tab tile). Awaiting owner review of v2.22.

## 2026-06 — v2.22 refinements: reveal-scroll + EITHER/OR source rule (verified iteration_22)
- Reveal-scroll: opening Cancel/No-Show from a lower row now auto-scrolls the panel so the full dialog (header + primary button) is visible, like Booking/Check-In/Extend/Modify. Added fitConfirm(el) called from render() for the noshow/cancel dialogs.
- Single-button rule (never both): OTA bookings (booking.com/makemytrip) offer only Mark No-Show; non-OTA (Direct/Walk-in/Goibibo) offer only Cancel. Centralized in nsOrCancel(o) and applied at expired-row buttons, kebab menu, alert-bar links, and global search. Removed the old disabled-No-Show-for-non-OTA button.
- testing_agent iteration_22: 100% (6/6 targeted checks), reveal-scroll numerically verified (scrollTop 0→196, header+confirm on-screen), rule enforced at all entry points, dialogs still compute correctly, zero JS errors. Mockup still v2.22.

## 2026-06 — Room Detail v2.23 (all front-desk ops from Rooms tab) + controls cleanup v2.24 (verified iterations 23–24)
- v2.23: filled the Rooms-tab tile detail for every status (Guest+phone+A/C, Stay night X of Y, Balance, Source, Housekeeping cell w/ set-by+assignee read-only + MOCKED "Manage in Housekeeping →" CR-365 link, Next arrival/turn with "Turn today" chip). Added missing actions so a property manager can do everything from a tile: Extend (occupied), kebab on booked with Modify + Cancel/No-Show (by source), keeping Check In/Bill/Book Room/HK/OOO. Linked each booked room to a distinct arrival so those actions resolve a real booking. Reveal-scroll on tile open. Rate from rate table. iteration_23 = 100% (11 scenarios).
- v2.24: removed Density/Compact (always Comfortable); moved Group-by into one light segmented control on the top row — Room no. / Type / Area. Area = floor derived from room number (1xx/2xx) as a stand-in for the real room title/area field (wire when backend confirms). Fixed guest[0] check-out date. iteration_24 = 100%, zero issues.
- CR-365 (PMS Housekeeping Workflow) is the module that owns HK crew assignment/checklists/timers (backend shipped, FE unbuilt); front desk only changes room status + shows HK state and links out. Room Detail was the LAST expandable box — all front-desk boxes now built. Awaiting owner review of v2.24.

## 2026-06 — Real board shape wired + section (title) grouping + Turns filter, v2.25 (verified iteration_25)
- Backend shared the real room payload; key finding: `title` is a shared SECTION/wing (e.g. "patal lok"), not a floor/name, and there is no floor field. Mock room model now mirrors the real shape (table_no, title, code=aiosell_room_code, display_status/manual_status/is_occupied, hk_assignee, room_operational_status_at). hk_assignee/room_operational_status_* are real fields our HK cell maps to.
- Group by Area now groups by `title` (section). Mock sections Patal Lok/Baga Wing/Anjuna Block/Palm Court (10 each) until the real title list is wired. Section shown in room-detail header.
- New "Turns today" Rooms filter = rooms checking out today with a same-type arrival today (same-day turn needing fast clean). iteration_25 = 100%, zero issues.
- Deferred: Floor KPIs (no real floor dimension). Next: swap mock SECTIONS for real board `title` values.

## 2026-06 — CR-385 FRONT-DESK DESIGN GATE CLOSED at v2.25
- All front-desk panels designed + agent-tested through iteration_25; no expandable panels remain. Gate CLOSED.
- QA deliverables prepared: plans/CR-385_QA_TEST_PLAN.md (version-by-version walkthrough, review hooks, global invariants, mocked/deferred lists, evidence map) and handover/CR-385_SESSION_HANDOVER.md.
- Provenance: agent-tested only — user acceptance pending. Everything mocked (static prototype).
- Next: QA pass → stakeholder acceptance → wire real data (section title list, guest{} payload, hk_assignee) → Section/Floor KPIs, real refund/credit, discount unification. CR-365 Housekeeping Workflow is a separate module.

## 2026-06 — CR-385 QA AUDIT BASELINE (read-only; no source changes) — plans/CR-385_QA_AUDIT_REPORT.md
- Senior UI/UX + functional QA audit of mockup v2.25 across 19 screens/states, 9 workflows, 6 viewports (1920→768), Chromium. Evidence: test_reports/iteration_26.json + viewport sweep. 0 JS errors, no h-overflow, primary buttons always on-screen, reveal-scroll + single-button rule hold everywhere.
- 31 findings: P0 ×2 (QA-001 Bill room block hard-coded → row balance ≠ Grand Total; QA-002 one booking shows 4 different amounts across Arrivals/Check-In/Modify/Cancel), P1 ×7 (rate-table contradiction after room link; over-collect/past-date/blank-adults accepted in Extend/Modify/Booking; same-day cin=cout seed rooms 102–105; no partial-payment state in Bill; No-Show/Cancel tax rows not applied to refund), P2 ×12 (consistency: dismiss labels, footers, toggles, tax order, currency format, terminology, Check-In right-pane scroll @1366), P3 ×10.
- Fix order proposed in §I; P0 fixes require re-opening LOCKED Checkout v2.9 / Check-In v2.16 → owner authorisation needed. Safari/Edge NOT TESTED (Chromium only).
- Status: awaiting owner triage of the registry before any implementation phase.


## 2026-06 — v2.26: QA-audit closure (D44) — verified iteration_27 + self-test
- Owner scope: fix the 19 design items + minimal money/seed sanity in the mockup; validation/data rules → implementation track as acceptance criteria.
- Done: one booking-charge source (row = Check-In = Modify = Cancel), Bill derived from guest record (row Balance = Grand Total), partial payment + Credit + two-step Checkout, refund = prepaid − penalty − GST, unified labels/footers/toggles/money format/plurals/dates, glossary, Room Detail footer, a11y tokens + SVG icons, responsive fixes (Check-In fits 1366×768), guards for over-collect/past date/adults, seed fixes, hooks obey source rule, VERSION v2.26.
- Locks re-closed: Checkout v2.10 · Check-In v2.17 · Booking v2.19. Owner visual acceptance pending; Safari/Edge manual.
- Docs: DESIGN_DECISIONS D44, QA_TEST_PLAN §6, QA_AUDIT_REPORT closure banner, QA_FIX_PLAN executed, handover addendum, /cr385-qa-fix-plan.html status.


## 2026-06 — Hand-off artefacts + Area grouping made data-driven (v2.26)
- Acceptance criteria for the implementation team: plans/CR-385_IMPLEMENTATION_ACCEPTANCE_CRITERIA.md + /cr385-acceptance-criteria.html (21 tick-boxes, AC-01…AC-21).
- Rooms › Area grouping now derives sections from room `title` values (normalised, "No section" bucket); mock SECTIONS array is SEED ONLY. Awaiting the real board title list from the owner (only "patal lok" confirmed).
- Phase 2 backlog (D45): Shift Summary card (check-ins / checkouts / no-shows / collections for handover) — recorded, not built.

## 2026-06 — SESSION CLOSED · next task = IMPACT ANALYSIS (design v2.26 vs existing implementation)
- Handover for the impact-analysis agent: handover/SESSION_HANDOVER_2026_06_CR385_V2_26_TO_IMPACT_ANALYSIS.md — reading order, source-of-truth precedence (D44/D45 > mockup > acceptance criteria > QA plan > older blueprints), implementation map (FrontDeskPage / CheckInPage / PmsCheckoutDrawer / ExtendStay-Modify-NoShow-Cancel dialogs / RoomStatusPage / pmsService), validation-date & proof checks, gap-register template, do-not list.
- Also appended a pointer at the end of handover/CR-385_SESSION_HANDOVER.md. Design status: v2.26 agent-tested, owner visual acceptance pending; real section title list awaited.

## 2026-09-19 — CR-385 IMPACT ANALYSIS written (design v2.26 vs existing React implementation) — PLANNING, read-only
- Deliverable: investigations/CR-385_IMPACT_ANALYSIS_2026_09_19.md — proof check (9 rows, all PASS except missing proof files → restored), design self-consistency (0 design defects), gap register G-01…G-44 (AC-01…AC-20 + F1–F16/D-rules), backend contract gaps B-1…B-10, tabs-vs-pages options A/B/**C (hybrid, recommended)**, blast radius, phases P0 money → P1 validation → P2 shell → P3 consistency, owner questions DEC-1…DEC-9.
- Headline: implementation covers the operations as 9 pages + 5 modals but violates most D44 money rules (booking charge typed/recomputed on 4 screens, Departures "Balance" = booking amount, CGST before SGST / merged Lodging GST, partial payment blocked, no refund maths). **Latent P0 in code:** ModifyBookingDialog.jsx L31–35 sends `amount_after_tax: 0` when rate plans exist (BUG-402 class) — recommend INTAKE as a BUG now (DEC-8).
- Proof files test_reports/iteration_26.json + iteration_27.json were absent from /app; restored from the repo clone. iteration_27's P1 (prepaid ₹9,450) is resolved by D44-g (not a defect).
- No code, mockup, .env or registry gate changes. Registry CR-385 still Gate 2.6 OPEN; owner visual acceptance of v2.26 still pending. Next: owner answers DEC-1…DEC-9 → Gate 3 (spike D5 + plan) or P0 bug intake.

## 2026-09-19 — Owner answers on Impact Analysis (D46) · mockup v2.26 ACCEPTED
- DEC-1 backend aggregates booking charge · DEC-2 OTA no-show refund by OTA, cancel refund offline (refund processing Phase 2) · DEC-3 no checkout with outstanding; Credit method allowed · DEC-4 non-OTA Cancel only · DEC-5 Option A side-by-side, dead code removed later, module-wise planning · DEC-6 upgrade/auto-print/booking-advance all Phase 1 (blockers in IA §12) · DEC-9 v2.26 accepted.
- Pending: DEC-7 (KPI source) and DEC-8 (register Modify ₹0 bug) after walk-through. Gate 2.6 still OPEN (owner has not said "close").
- 2026-09-19 DEC-8 CORRECTED: Modify ₹0 is latent (no caller passes rateplans; amount omitted) — P0 intake withdrawn. Live gap = amount never updated on date change → covered by BQ-385-08 (backend recompute). Backend brief written: backend_briefs/BACKEND_BRIEF_CR-385_PHASE1_CONTRACT_2026-09-19.md (BQ-385-08…12). test_credentials.md is EMPTY — no preprod token for live probes.
- 2026-09-19 (evening) Live preprod probes done with owner creds (evidence/CR-385/probes_2026_09_19/PROBE_REPORT.md): backend does NOT recompute amount on date-only PATCH; accepts amount 0; ignores rateplan_code/preview; folio GST merged; LR has amount_before_tax; board titles captured. Backend briefs HTML (memory/backend_briefs/index.html = public/backend-briefs.html) now lists all 21 briefs incl. CR-385 ×3, CR362/365, CR358-P5 follow-up, CR363/366 nulls, RATE_AUTOFILL, BUG-408/409, CR-375. test_credentials.md populated.
- 2026-09-19 DEC-7 decided (D46-i): server-authoritative snapshot — list + tab counts + business_date in one response (BQ-385-12 rewritten); FE displays only, all client date logic removed. All DEC-1…9 now answered. Gate 2.6 still OPEN pending owner "close".
- 2026-09-19 (night) BACKEND_BRIEF_CR-385_MASTER.md created — single tracked brief (tracker §1, delivery order §2, probe facts §3, BQ-385-01…15 with inline "Backend answer" slots, Phase-2/closed §5, change log §6). Added BQ-385-14 (extend-stay contract, B-4) and BQ-385-15 (Credit verify, B-3) which were missing. Three older CR-385 briefs banner-marked SUPERSEDED. HTML briefs page has a MASTER card.
- 2026-09-19 D46-j: "partial payment" = split tender (must exist on room checkout; already works via drawer). Design gap G-45: mockup Bill lacks Split tile → v2.27. Corrected earlier wrong note ("Credit hidden in room mode"). B-8 re-scoped to physical fit (D5 spike) + POS regression.
- 2026-09-19 D47: owner approved mockup v2.27 scope (Split = POS parity rows; no under-payment; Credit = TAB plain tile; AC-08 rewrite; real Area titles; Phase-2 ribbon on refund card). Gate 2.5 re-entered for v2.27; design_agent to be consulted for the Split/Credit settlement block.
- 2026-09-19 (late) Mockup **v2.27** shipped (D47): Split tile with POS-parity rows, no under-payment, Credit = TAB confirmation line, disabled-state reasons, Phase-2 ribbon on refund arithmetic, real Area titles. Self-verified 12/12 (QA_TEST_PLAN §6b); AC-08 rewritten (MD + HTML). Owner visual acceptance of v2.27 pending. v2.26 backup in evidence/CR-385/.
- 2026-09-19 (EOD) D47-h: Split at all 4 advance points via shared payPills/payMissing (compact 3-col grid; Check-In fits 1366×768). All 5 collection points self-verified, 0 JS errors (QA_TEST_PLAN §6c). **Gate 2.5: v2.27 complete, owner acceptance pending. Gate 2.6: analysis complete — BUILD BLOCKED, waiting for backend replies to BACKEND_BRIEF_CR-385_MASTER.md.** MASTER: BQ-385-10/14 now include split_payments[]. Testing-agent 4-tab QA audit deferred to owner acceptance.
- 2026-09-19 Owner ACCEPTED mockup v2.27; four-tab QA audit (testing agent, iteration_28) started.
- 2026-09-19 iteration_28 (testing agent, 4 tabs, 1920×800 + 1366×768): 29/30 PASS, 0 console errors. Fixed P1 (Check-In Split-state overflow: `.due` class collision + compaction → 332/332) and P3 (Room Detail title casing). **Design Gate 2.5 CLOSED on v2.27.** Status: Gate 2.6 analysis complete — BUILD BLOCKED, waiting for backend replies (BACKEND_BRIEF_CR-385_MASTER.md).
- 2026-09-20 Backend reply (evidence/CR-385/backend_replies/384plan_2026_09_19.md) processed per gate rules: live-verified BQ-385-08/10/06/12/11-read → **B-1, B-5, B-6 UNBLOCKED**; BQ-09/14 delivered-unverified (need disposable in-house stay, N5); BQ-15 answered (TAB); BQ-01 closed; BQ-03 resolved via charge.balance_due; BUG-384 closable (backend: wrong FE body — registry action for owner). New backend questions N1–N5 in MASTER §7. Remaining blockers: B-7 (open bugs smoke), B-8 (D5 spike), B-9 (Gate 2.6 close). Report: evidence/CR-385/probes_2026_09_20/PROBE_REPORT.md.
- 2026-09-20 /cr385-impact-questions.html updated: matrix re-scored after backend delivery (B-1/B-5/B-6 ✓, B-4 ◐, B-3 answered; 7/13 surfaces buildable), new §B2 "Backend questions N1–N5" (plain English, status), new §B3 "Resolved log" (10 closed items incl. BUG-384 closable), blocker cards + gate section refreshed.
- 2026-09-20 Owner answers N1–N5 processed (D48). CONFLICTS: N1 → omit rate = ₹0 stored (rates exist) → **BQ-385-16 (P0) opened**, New Booking pricing re-blocked; N2 → B2B moves to Check-In only → mockup v2.28 (remove toggle at Booking) pending; N4 → board format final → FE roomStatusTransform hot-fix BUG intake needed before backend prod deploy. N3 badge rule set. N5 sandbox blocked by 5 overdue in-house stays → reset requested; BQ-14 409 path verified; N6 TAB curl incomplete. HTML pages updated.
- 2026-09-20 (night) Owner checked out sandbox → full E2E lifecycle run (book → check-in w/ upgrade → extend w/ discount+payment+move → TAB). **7 backend defects D1–D7 + BQ-16 confirmed**, 5 independently reproduced by testing agent (iteration_29): D1 upgrade unreachable, D2 advance lost at check-in, D3 folio GST double count, D4 extend under-charges a night, D5 no charge in check-in response, D6 TAB partial body 500 + SQL leak, D7 room move leaves HK. BQ-09/10/14 RE-OPENED in MASTER (§8); all money surfaces re-blocked; non-money surfaces buildable. HTML §B4 added. Sandbox: booking 153 / order 1232582 in-house on 8525 for owner to settle.
- 2026-09-20 (TAB verification session, D49) Backend answered N6 with the full live FE body for `order-bill-payment`. Owner authorised settling sandbox order 1232582 → **G1 200 "Room payment received via TAB"**; read-backs G2–G4: reservation `departed`, line `checked_out`/`paid`, `counts.in_house 0`, room 8525 → hk. **BQ-385-15 VERIFIED · D6 CLOSED · N6 CLOSED.** New **D8 (P1 money)**: ledger TAB row ₹3,300 vs ₹3,490 sent; `charge.balance_due`/`remaining_room_balance` stay 3,490 after departure. **D3+**: folio `room_price` basis flips between check-in (GST-incl.) and extend (pre-GST). **N4 regression risk WITHDRAWN** — old board shape was already `{auto_hk_on_rm_checkout, rooms}`, new adds only `meta`; `roomStatusTransform` verified on both payloads → no src/ change, no BUG intake. **Mockup v2.28** shipped (D48-c: B2B toggle/GST fields/progress chip/bill line removed from New Booking; Check-In keeps B2B) — testing agent iteration_30 all PASS, 0 JS errors (note: `?bill=103` grand total is ₹6,152 since v2.26 — the ₹2,677 in older notes is stale). Docs synced: MASTER v1.4 (§1, BQ-15 answer+verification, §7 N4/N6, §8 D6 closed/D8/D3+, §6), PROBE_REPORT §G, DESIGN_DECISIONS D48-c status + D48-d correction + D49, QA_TEST_PLAN §2C, AC-07 (MD+HTML), cr385-impact-questions.html (§B2 N4/N5/N6, §B3 +3 rows, §B4 D6/D8/D3+, B-3 card, matrix), backend-briefs.html MASTER card (mirrored to memory/backend_briefs/index.html). Sandbox empty. **Gate 2.6 still OPEN** — money surfaces blocked by D1 D2 D3(+) D4 D8 + BQ-385-16; non-money surfaces buildable; owner must say "close Gate 2.6" before the D5 spike / module plan.
- 2026-09-20 (~10:30) Backend build 2 + curl plan `reblock_fe.md` (saved `evidence/CR-385/backend_replies/reblock_fe_2026_09_20.md`) run end-to-end on sandbox (bookings 156/157 cancelled, 158/order 1232586 settled TAB). Report `evidence/CR-385/probes_2026_09_20_gate4/PROBE_REPORT.md` + runner `run_gate4.py`. **FIXED:** BQ-16 (priced from Aiosell, 422 on unknown plan), D1, D2, D3, D5, D6. **Unverifiable:** D4, D7. **Still open:** D8. **NEW:** D9 paid upgrade carved out of rate (booking_charge unchanged → guest never pays upgrade, P0), D10 GST slab flips 18 %→5 % after check-in (P0), D11 plan body → 500 + non-atomic charge write (P1), D12 same-room extend always 409 self-conflict (P0 — Extend unusable), D13 room move 500 `$currentTableId` regression (P0), N7 future-dated check-in accepted (question). Docs: MASTER v1.5 (§1 rows BQ-09/10/14/16, new §9), cr385-impact-questions.html §B5 + header, backend-briefs.html MASTER card (mirrored). Buildable now: New Booking pricing/advance, folio Room block, check-in balance strip, Credit tile contract. Blocked: Check-In upgrade, Extend Stay, Credit amount / Departures true balance. Gate 2.6 still OPEN. Learning: preprod token is single-session (a new login invalidates the previous token); sandbox is shared (8524 held by another tester); Aiosell returns a rate for every date, so a "no-rate" case needs an unknown rateplan code.
- 2026-09-20 (~13:50) Backend build 3 reply (`evidence/CR-385/backend_replies/re_fe_2026_09_20.md`) independently re-verified: full lifecycle booking 163 / order 1232593 (advance → paid-upgrade check-in → same-room extend + collect-now → move 8527 → TAB) + booking 164 (omit booking_for). **ALL GREEN: BQ-16, D1–D13 fixed** (D9/D10 upgrade added to rate + GST 18 % held; D12/D4 extend 200 and 20,500 = 9,500×2+1,500; D13/D7 move 200 + board correct; D8 ledger = amount sent, `charge.balance_due 0`; D11 server default). Residual: folio `remaining_room_balance` lags (ignore). **Backend blockers B-1/B-3/B-4/B-5/B-6 DELIVERED·VERIFIED**; remaining B-7 (bug smoke), B-8 (D5 spike), B-9 (owner "close Gate 2.6"). D50 money contract frozen (cleared ⇔ paid && balance_due 0; advance_payment = cumulative paid). Owner questions N7 early check-in · N8 held rate on extension · N9 check-in into HK room. Docs: MASTER v1.6 (§1, §10), impact-questions.html §B6 + header, backend-briefs card (badge → Delivered·verified), DESIGN_DECISIONS D50, PROBE_REPORT build-3 section. Sandbox: 163/164 departed; 8525/8527/8528 hk.
- 2026-09-20 (docs sync after build 3) All CR-385 records now consistent with "backend DELIVERED·VERIFIED build 3, Gate 2.6 OPEN pending owner close": registry.json (status, backend_blocked=false, backend_verification, money_contract, status_history; meta last_updated 2026-09-20), CR_REGISTRY.md (header + CR-385 row), CONTROL_DASHBOARD.md header, OPEN_GAPS_REGISTER (OG-PMS-019 resolved; OG-PMS-022 folio remaining_room_balance residual; OG-PMS-023 N7/N9; OG-PMS-024 N8), IA 2026-09-19 §21 final blocker table, ACCEPTANCE_CRITERIA AC-22 money contract (MD + HTML), QA_TEST_PLAN §6e (v2.28 iteration_30), intake footer, DESIGN_DECISIONS D50. HTML trackers: cr385-impact-questions.html gate banner + matrix (all backend columns ✓; only B-7/B-8 ✗ remain) + blocker cards B-1/B-3/B-4/B-5 CLOSED + §B6; backend-briefs.html MASTER card badge "Delivered · verified (build 3)" + tracker rows 09/10/14/15/16 green (mirrored to memory/backend_briefs/index.html). Screenshot-verified both pages render.
- 2026-09-20 (owner review of trackers) Owner spotted red/amber leftovers in `cr385-impact-questions.html`. Triage: genuinely open = B-7 column bugs (BUG-402/404/410/411/413/418/421/425/426/428/429/430, CR-368 — open registry items on shared files, owner/QA smoke) + B-8 spike + N7/N8/N9 owner questions; everything else was history. Actions: **BQ-385-11 write verified live** (`update-settings` false→true→false, profile read-back; `probes_2026_09_20_gate4/bq11/`) → B-6 fully ✓; matrix cells "◐ N1/N2", "◐ write unverified", "◐ N4 shape", No-Show/Cancel "◐" → ✓; N1 status → Closed (BQ-16 fixed); §B4/§B5 marked HISTORY with green banner and every row stamped "FIXED · build 3" (old prio tags struck through, kept as audit trail); §B2 heading "all closed". MASTER BQ-11 row + §10, backend-briefs row 11 updated (mirrored). Remaining red in the matrix = B-7 / B-8 only.
- 2026-09-20 (Gate 2.6 final re-validation) Owner requested full IA re-check + HTML master checklist; explicitly said NOT to close the gate myself. Delivered IA Rev 4 (`impact/CR-385_IMPACT_ANALYSIS_REV4_GATE_2_6_FINAL.md`: alignment report, G-01…G-56 with 12 new gaps, B-1…B-10 + blockers B-1…B-9 final, risks R23–R26, §7 recommendation) and `/cr385-master-checklist.html` (P/X/M0–M6/S/R/O, ~95 items, evidence fields, persisted, export/import) linked from both trackers. DESIGN_DECISIONS D51. Owner decisions pending as plain yes/no: O-1..O-7 (N7, N8, N9, close 384/404/413, BUG-418 in M6, transform ack, "close Gate 2.6"). Gate 2.6 still OPEN.
- 2026-09-20 (owner N7/N8/N9 decided → D52) Owner: **N7 = b** block early check-in (FE guard: `Check In` disabled unless `meta.business_date ≥ check-in`; Modify dates first; no backend change) · **N8 = b** price extension nights from the rate table → **BQ-385-17 (P1) opened in MASTER v1.7** (Aiosell lookup per added date, `extension_nights[]`, 422 no-rate, preview) — **B-4 re-opened for the pricing rule only; M4 Extend Stay pricing backend-blocked**, everything else buildable · **N9 = allow** ("check-in can happen while housekeeping") — picker keeps HK rooms selectable with HK badge + amber warning, no block. Docs synced: DESIGN_DECISIONS D52, MASTER v1.7 (§1 row, BQ-17 section, §6, §10), IA Rev 4 (header, §0 row 10, G-48/49/50, B-4/B-5, §7), OPEN_GAPS (OG-PMS-023 closed, 024 → BQ-17), cr385-impact-questions.html (banner, matrix B-4 col + Extend row ◐, §B6 decisions table, §B5 N7 stamp, B-4 card), cr385-master-checklist.html (M3-02/M3-09/M4-05 rules, O-1..O-3 ticked with evidence; loader now respects HTML default ticks), backend-briefs.html MASTER card (v1.7, BQ-17 row, open badge; mirrored). **Gate 2.6 still OPEN** — owner has not said "close Gate 2.6". Next: owner "close Gate 2.6" → Gate 3 (D5 spike, module plan M0–M6 with M4 pricing gated on BQ-17); B-7 QA smoke in parallel; send MASTER v1.7 to backend for BQ-17.
- 2026-09-20 (evening — backend N7/N8 delivery validated, D53) Backend reply `evidence/CR-385/backend_replies/n7_n8_2026_09_20.md` shipped both owner decisions as property settings: **`allow_early_checkin`** (default false → check-in 422 "Early check-in is not allowed…after business date") and **`extend_rate_mode`** (`calendar` default | `held`; calendar = held rate × old nights + CM rate per added night, blended `rate_per_night`; CM miss → held fallback). N9 unchanged. Independently re-verified with `evidence/CR-385/probes_2026_09_20_n7n8/run_n7n8.py` (bookings 175/176, orders 1232604/1232605): defaults on settings-list + profile, bogus → 422, raw-JSON write ignored (multipart `data=` only), CM 8,600/7,400/7,400, N7 off 422 (charge untouched) / on 200 = 10,100, **calendar extend 17,500 (rate 8,000)**, **held 18,700**, `data.charge` shape, LR charge identical, TAB settle, room → hk, defaults restored. → **BQ-385-17 + new BQ-385-18 DELIVERED·VERIFIED; B-4 closed; no open backend ask.** New money question **N11** (GST slab computed on the blended rate could flip 18 %→5 %, D10 class) → MASTER v1.8 + OG-PMS-025. New owner decision **O-8**: settings UI for the two keys (recommend Phase 1 backend-config only). FE rules: read setting from profile, disable Check In when false & checkin > business_date, surface 422 verbatim; Extend shows `data.charge`, rate labelled "avg. / night". Docs synced: DESIGN_DECISIONS D53, MASTER v1.8 (§1 rows 17/18, BQ-17 answer + verification, §6, §10), IA Rev 4 (§0, G-48/49, B-4/B-5, §7), OPEN_GAPS 023/024 closed + 025, impact-questions.html (banner, matrix, §B6, new §B7, B-4 card), master-checklist.html (M3-09, M4 header, M4-05, O-2 evidence, O-8 row), backend-briefs.html MASTER card v1.8 (mirrored). **Gate 2.6 still OPEN.**
- 2026-09-20 (night) **HARD GATE 2.6 CLOSED by owner → Gate 3 OPEN.** Owner quote: "08 a 04 ok 05 yes 06 ok update docs and decision and close gate 2.6 follow agent promot and rules" → D54: O-8 = (a) `allow_early_checkin`/`extend_rate_mode` toggles on the existing PMS settings page (new module **M7**, OD-385-12 exception) · O-4 BUG-384/404/413 closed by decision · O-5 BUG-418 folded into M6 · O-6 additive roomStatusTransform fields accepted. Synced: registry.json (CR-385 gate 3, status_history, decisions locked; BUG-404/413 CLOSED, BUG-418 FOLDED INTO CR-385 M6; meta), CR_REGISTRY / BUG_TRACKER / CONTROL_DASHBOARD headers + rows, intake footer, IA Rev 4 (closure evidence), DESIGN_DECISIONS D54, checklist (P-01, S-384/404/413, O-1..O-8 ticked; new §M7), impact-questions (banner, B-9 closed, §D history), backend-briefs card (mirrored). Handover: `handover/SESSION_HANDOVER_2026_09_20_CR385_GATE_2_6_CLOSED.md`. **Next (Gate 3, PLANNING, owner go-ahead first):** P-02 D5 spike (throw-away, evidence `evidence/CR-385/spike/`) → P-03 Q6 mechanism → P-04 `plans/CR-385_IMPLEMENTATION_PLAN.md` (M0–M7, verification matrix, registry checklist, scope lock) → owner "close Gate 3" → "Gate 4 GO". No src/ code before that. B-7 smoke parallel; N11 awaiting backend.
- 2026-09-20 (late) Backend v2 reply `n7_n8_v2_2026_09_20.md` → **N11 FIXED + verified** (`evidence/CR-385/probes_2026_09_20_n11/`, bookings 179/180/181): GST slab per sold night (8,600 @ 18 % + 7,400 @ 5 % + upgrade @ 18 % = 2,188; total 19,688), `nights_detail[] {date, rate, source, gst_percent, gst}` on calendar extend response; held control unchanged. New **D14 (P2)**: calendar extend response `charge.advance_payment/balance_due` omit the same-call collect-now (LR correct, ledger correct, TAB clamped server-side) → FE rule refetch LR after extend. New **BQ-385-19 (P2)**: `nights_detail` on LR list. Docs: MASTER v1.9, D55 (Extend Stay per-night line rules; never sum nights_detail), OPEN_GAPS 025 closed / 026 D14 / 027 BQ-19, trackers (§B7 rows, checklist M4-05/M4-06, briefs card). No blocker; Gate 3 open, spike awaiting owner go-ahead.
- 2026-09-20 (final) Owner: "mark them as check list … update all docs and decision and close gate 2.6, and write a handover for planning". Gate 2.6 already CLOSED (D54, not re-flipped). **D56**: residual doubts → hard **Gate 4 GO preconditions G4-01…G4-10** (full regression re-run on final build · D14 fixed/waived · N11 boundary probes · B-7 smoke · D5 spike + Q6 · plan + "close Gate 3" · BQ-19 · data-contract sheet · real section titles · "Gate 4 GO" quote) in `public/cr385-master-checklist.html#g4` + registry `gate_4_preconditions`. **Planning entry point:** `handover/SESSION_HANDOVER_2026_09_20_CR385_PLANNING_GATE_3.md` (boot order with every doc, settled rules, Gate 3 sequence, G4 table, verified data contract, module map M0–M7 incl. M7 in `RestaurantSettingsPage` Step 2 basic tab via `restaurantSettingsService` multipart, parallel tracks, gotchas). CONTROL_DASHBOARD / CR_REGISTRY / IA addendum updated. Next agent: PLANNING role — ask owner "start Gate 3 spike", then D5 spike → Q6 → `plans/CR-385_IMPLEMENTATION_PLAN.md`.
- 2026-09-20 (D5 spike) Owner: "ok go ahead only for d5 spike test, do not edit actual source code or design file". Ran throw-away `/spike-cr385` (2 scratch files + temp route line) with the UNMODIFIED `CollectPaymentPanel` (room mode) in a 560 px expandable row, synthetic heavy bill + live order 1232602, 1920×800 + 1366×768. **Result: fits** — header pinned, scroll body 353 px, Checkout button always visible; Payment Method visible without scroll in default state; Split state N/A (no Split button in room mode); sticky th works (no top padding on scroll container); `scrollIntoView` on expand fixes low-row overflow at 768; **Q6 = host-scoped CSS on the 3 toggle testids works with zero panel edits** (recommend (a), owner to confirm). Evidence `evidence/CR-385/spike/MEASUREMENTS.md` + 10 jpg. Scratch deleted, App.js reverted, `git status` 0 src changes, frontend recompiled clean. D57 recorded; checklist P-02/P-03/G4-05 ticked; registry updated. **Next: P-04 `plans/CR-385_IMPLEMENTATION_PLAN.md`** (owner go-ahead).
- 2026-09-20 Owner confirmed **Q6 = (a)** (no duplicate rows right side; host CSS hides the 3 section toggles). Spike doubts → checklist M6-09…M6-12 + M0-03 sticky rule; D57 updated. Next: P-04 Implementation Plan on owner go.
- 2026-09-20 (night) Owner: "update all docs and decision and handover plan for planning agent, and close the gate follow agent prompt gate and rules". Per AGENT_PROMPT Step 3 Gate 3 = the Implementation Plan → **cannot close without `plans/CR-385_IMPLEMENTATION_PLAN.md`**; recorded **D58**: Gate 3 milestone A (spike) CLOSED, Gate 3 stays OPEN, Q6 = a locked in registry; spike outcomes frozen as plan inputs. Synced registry.json (status, gate_3_milestones, decisions), CONTROL_DASHBOARD, CR_REGISTRY, IA addendum, impact-questions (B-8 card ✓, matrix), planning handover (steps 3.0–3.2 done, START at 3.3; spike outcomes; gotcha on "close the gate"). **Next agent (PLANNING): Step 0/1 → P-04 plan → owner "close Gate 3".**

## 2026-09-20 — CR-385 Gate 3 milestone B: Implementation Plan written (PLANNING role, ALPHA v0.7)
- Wrote `plans/CR-385_IMPLEMENTATION_PLAN.md` — M0 shell → M1 Booking → M2 No-Show/Cancel/Modify → M3 Check-In → M4 Extend → M5 In-House/Departures → M6 Bill/Checkout → M7 Settings; exact edits E1–E10 on existing files (all OD-385-12 exceptions), 26 new files, §3 data-contract sheet, §5 G-01…G-56 + AC-01…AC-22 mapping, §6 verification matrix (34 rows), §7 registry checklist, §8 risks R15–R30, §1 scope lock.
- Step 0 Code Reality NONE (0 `CR-385` / spike hits in `src/`); Step 1 conflict pre-check clean (ordering via B-7 smoke only). Zero `src/` changes.
- Read-only probe `evidence/CR-385/probes_2026_09_20_g4_09/`: board has no `sections[]` (Area = room `title`, 5 real titles); LR `view=all` needs dates; `payment_status` is per room line. → D59, OG-PMS-028/029.
- Checklist ticked: P-04…P-09, G4-08, G4-09. Owner decisions raised: OD-385-16 (Extend/Modify new forms vs legacy inline), OD-385-17 (M7 in Step 8), OD-385-18 (Split at advance payload).
- **Gate 3 remains OPEN** — owner review + "close Gate 3" required (D58); G4-01/02/03/04/06/07/10 still open before "Gate 4 GO".
- **22:00 update:** owner answers OD-385-16 = a, OD-385-17 = Channel Manager 5th tab (plan M7 rewritten; D60). Final regression pack run (`evidence/CR-385/probes_2026_09_20_final/`): all green → G4-01 ✓; D14 fixed → G4-02 ✓; second TAB idempotent (200 already_paid); split advance = lump only (BQ-385-20); NEW backend money defects D15/D16 → brief; D61; OG-PMS-030/031/032; sandbox restored.
- **22:30:** owner confirmed Channel Manager title OK for M7 tab (D62); checklist + mockup (v2.29, comment-only) updated.
- **22:45:** BE reply d15-16 validated live (D15/D16 FIXED, BQ-385-20 confirmed → single-method advance); D63; OG-PMS-030/031 closed; M4 unblocked.
- **23:00:** OD-385-18 = a locked (D64); BQ-385-21 held_fallback sandbox ask written; G4-04 B-7 smoke delegated to QA agent.
- **00:10:** G4-04 B-7 smoke via QA agent: 5 PASS, S-411 FAIL → backend D17 (check-in advance dropped; P0 for M3), S-418 N/A (M6). D65; brief §D17; intake candidates BUG-431/432/433.
- **2026-09-21:** BE reply BQ-385-19 validated live (LR carries nights_detail for calendar stays) → OG-PMS-027 closed, G4-07 ✓, D66. Remaining: D17 (backend), BQ-385-21, owner "close Gate 3".
- **2026-09-21:** BQ-385-21 propagated to checklist/mockup/plan/OG-PMS-033/MASTER addendum (was only in D64 + FINAL_PACK brief).
- **2026-09-21 (later):** D17 validated (API + UI) → S-411 ✓, G4-04 ✓; BQ-385-21 answered (no empty night) → G4-03(b) owner waiver pending; D67. Backend queue for CR-385 empty.
- **2026-09-21 (held_fallback):** owner scenario run — held_fallback observed live, rates restored, G4-03 ✓ no waiver; D68; OG-PMS-033 closed. Only owner gate words remain.

## 2026-09-21 — CR-385 GATE 3 CLOSED (owner) · phased line-by-line execution plan
- Owner: "…we want phased implementation so that smoke test can happen by the owner before moving to the next phase … so yes, go ahead and close gate three" → Gate 3 CLOSED (D69, P-12, G4-06).
- Wrote `plans/CR-385_IMPLEMENTATION_PLAN_PHASED.md`: P0 M0 shell (read-only) → P1 M7 Front Desk Rules tab + M2 cancel/no-show/modify → P2 M1 booking + M3 check-in → P3 M4 extend + M5 balances → P4 M6 bill/checkout → P5 closure. Per phase: exact current→new line edits for every existing file, new-file skeletons, tests, QA-agent brief, owner smoke script, rollback. Next phase only after owner "Phase N smoke OK".
- All G4 evidence rows ticked; backend queue empty; sandbox at defaults. **Waiting for owner "Gate 4 GO". No code in frontend/src/.**
