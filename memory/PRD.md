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
