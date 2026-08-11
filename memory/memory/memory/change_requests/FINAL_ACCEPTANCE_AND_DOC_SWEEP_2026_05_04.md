# Final Sprint Acceptance + Documentation Sweep — 2026-05-04

> ## ⚠ 2026-05-05 POST-FINAL-ACCEPTANCE UPDATE — CR-013 Phase 1.5
> **CR-013 references in §1.2 ("13 parked"), §1.4 ("CR-002 / CR-009 / CR-010 / CR-011 / CR-012 / CR-013 — stay parked"), §3.3 row 25 (`parked_owner_decision · Source doc only`), and §6.2 (last row, `parked_owner_decision · Not started`) are superseded.**
>
> - **New CR-013 status:** `qa_passed_with_known_print_backend_finding` (see new QA report).
> - **QA report:** `/app/memory/change_requests/qa_reports/CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md`
> - **Reconciliation summary:** `/app/memory/change_requests/implementation_summaries/CR_013_TRACKER_RECONCILIATION_SUMMARY_2026_05_05.md`
> - **Net deltas to this doc's headline counts:**
>   - §1.2 "13 parked CR/sub-CR/bucket items" → 12 (CR-013 leaves the parked register).
>   - §4.1 accepted-with-deferred-backend list grows by **CR-013 Phase 1.5 D-GST-3 + D-GST-4 + Fix-1 + Fix-2 + CR-008 Round-3** when the next sprint-exit doc is written.
>   - §3.4 backend asks count grows from 9 to **12** with BE-G9 / BE-G10 / BE-G11 added (all parked) — these are NOT closed by Phase 1.5.
> - **Items kept pending (not resolved by this reconciliation):** BE-G9, BE-G10, BE-G11 backend asks · Bean Me Up backend print-template double-count owner decision (Options A/B/C) · additive owner visual walk-through on tenant 742.
> - The original 2026-05-04 sprint-exit certification under §14.5 stands as a snapshot of that date; CR-013's later work is a separate post-sprint addition.

**Agent:** Final Acceptance + Documentation Sweep Agent
**Date:** 2026-05-04
**Workspace:** `/app/memory/` on branch `may4`
**Sprint window:** 2026-04-29 → 2026-05-04 (active QA window: 2026-05-03 → 2026-05-04)
**Mandatory predecessor:** `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` ✅ read; verdict **SAFE to proceed**

---

## 1. Executive summary

### 1.1 Verdict

**✅ GO — sprint is safe for final acceptance.**

12 frontend deliveries are formally `qa_passed_with_deferred_backend_dependency` and ready for acceptance. 14 items remain parked — 9 backend asks (BE-1..BE-W2, BE-A, BE-F) + 5 CRs/buckets (A3, A4, B3, B4, CR-008 #4 Phase B, CR-008 Sub-CR #3, CR-002, CR-009, CR-010, CR-011, CR-012, CR-013) — none unparked by this run. 20 backlog items are catalogued and non-blocking. Baseline docs under `/app/memory/final/` require no corrective updates per the Baseline Reconciliation Report. Documentation drift was confined to the tracker layer and has been resolved or proposed.

### 1.2 Acceptance counts

| Category | Count |
|---|---|
| ✅ `accepted_with_deferred_backend_dependency` | **12** |
| ⏸ `accepted_with_runtime_addendum_pending` | **0** (both runtime addenda — A0a + A0b — PASSED 2026-05-04; see `qa_reports/RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md`; both upgraded to `accepted`) |
| 🔵 `parked_backend_dependency` | **9** BE-* + **3** CR/bucket items dependent on BE-* (B2 Phase 2 / CR-008 #4 Phase B / B3) |
| 🟣 `parked_owner_decision` | **2** (A3, A4) + **1** by-design (B4) |
| 🟡 `backlog_follow_up` | **9** items (CR-010-RP-03, CR-010-RP-05, D-A0b-3, BUG-PREPAID-MERGE-SHIFT (closed-fixed), TD-01..TD-05 (5 tracker drift items, **resolved this run**), retained diagnostics, CR-004 visual badge, orphan-SRM scope drift). **FO-B1-01 resolved follow-up 2026-05-04** (moved out of backlog; see §7 row 1). **DOC-B2-01 + DOC-A0a-01 resolved 2026-05-04 via Batch 1 hygiene doc cleanup** (see §7 rows 2-3). **CSV-A0a-01 + DETAIL-A0a-01 + FILTER-A0a-01 + CR-001 exports alignment resolved 2026-05-04 via Batch 2 display/export/filter hygiene** (see §7 rows 4-6 + 17). **LoadingPage ESLint resolved 2026-05-04 via Batch 3A** (see §7 row 21). **paymentService CLEAR_BILL resolved 2026-05-04 via Batch 3B DELETE** (see §7 row 22). **TEST-INFRA-001 + ProtectedRoute test-infra (rows 7 + 23) resolved 2026-05-04 via Batch 3C** — `@testing-library/react@^14` + `@testing-library/jest-dom@^6` wired; `setupTests.js` created; `yarn test --watchAll=false` runs the full 19-suite/201-test tree for the first time. Tally: **9 suites pass / 10 suites fail; 127 tests pass / 74 tests fail**. The 4 previously-blocked JSX suites now execute; **2 PASS** (`SocketContext.test.jsx`, `ErrorBoundary.test.jsx`), **2 FAIL** (`ProtectedRoute.test.jsx`, `App.routing.test.jsx` — ErrorBoundary fallback rendering due to test-fixture component drift, NOT caused by Batch 3C wiring). The 8 pure-Jest failures are pre-existing test drift (constants/transforms/barrel/raw-field/socket — unrelated to wiring). All 10 newly-surfaced failures classified as **separate backlog rows** per Batch 3C scope rules; not fixed in this batch. See `implementation_summaries/COMBINED_HYGIENE_BATCH_3C_TEST_INFRA_SUMMARY.md`. New Phase 3 CR **UX-LOADING-02** opened — see `/app/memory/change_requests/phase_3/UX_LOADING_02_VISIBLE_STATION_PROGRESS.md`. |
| 🔴 `qa_failed` (current) | **0** |
| ⚫ `qa_failed` (historical, superseded) | **1** (CR-004 original 2026-04-29 → superseded by P0 2026-05-03) |
| ❓ `needs_owner_decision` | **3** optional baseline enrichments (FE-01, FE-02, FE-03) — non-blocking |

### 1.3 Tracker actions taken this run

1. ✅ `QA_REPORT_INDEX.md` cleaned for TD-01..TD-05 drift (duplicate table removed, stale Final Recommendation replaced, stale clarification entry moved to backlog, backlog register expanded, resolved-failure row moved to historical section).
2. ✅ `SESSION_TRACKER.md` — appended sprint-completion pointer to this Final Acceptance doc.
3. ✅ `QA_HANDOVER_INDEX.md` — appended pointer to current sprint's QA scope (P0–P8 + A0a + A0b).
4. ❌ `/app/memory/final/*` — UNTOUCHED per Baseline Reconciliation verdict + STRICT RULES.

### 1.4 What this run did NOT do

- No code changed · no QA run · no tests run · no branch switched · no code pulled · no implementation · no parked item unparked · no runtime-blocked item upgraded to "accepted" · no owner-validated-only item upgraded to `qa_passed` (none qualify) · no backend field/endpoint baselined · no `/app/memory/final/` edit applied (only proposals recorded).

---

## 2. Files discovered and inspected

Per Baseline Reconciliation Report §2 — full discovery already captured there. Key counts:

- **`/app/memory/final/`** — 7 baseline docs (read in full)
- **`/app/memory/change_requests/qa_reports/`** — 14 files (12 active QA reports + 1 historical superseded + 1 index + 1 next-agent handover)
- **`/app/memory/change_requests/qa_handover/`** — 5 files
- **`/app/memory/change_requests/implementation_handover/`** — 16 files (incl. parked A3/A4 handover, CR-008 Sub-CR #1 rollback playbook, D1-Cap round-2 QA note)
- **`/app/memory/change_requests/implementation_summaries/`** — 3 files
- **`/app/memory/change_requests/impact_analysis/`** — 3 files
- **Root `/app/memory/change_requests/`** — 13 CR source docs (CR-001..CR-013) + consolidation + 2 BE-asks consolidations + 2 trackers (`SESSION_TRACKER.md`, `REPORTS_FIELD_MAPPING_TRACKER.md`) + the BASELINE_RECONCILIATION_REPORT_2026_05_04.md
- **Root `/app/memory/`** — 9 sprint/session/source-contract docs + this run's deliverable

Additional files inspected this run:
- `/app/memory/change_requests/SESSION_TRACKER.md` (143 lines — 2026-04-29 session scope; pre-dates current sprint's CR-005/006/007/008/A0a/A0b work)
- `/app/memory/change_requests/qa_handover/QA_HANDOVER_INDEX.md` (70 lines — original CR-001/CR-003/CR-004 bundle; pre-dates current sprint's other CRs/buckets)

Both trackers are pre-sprint and have been pointer-updated (not rewritten) to reflect this Final Acceptance.

---

## 3. Full sprint acceptance inventory

### 3.1 Original 3 CRs (carry-over from 2026-04-29)

| # | CR / Bucket | Title | Source docs | Impl status | QA status | Backend dep | Runtime-blocked | Baseline impact | Recommendation |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **CR-001** | All Orders Report — Status derivation + filter structure (Phases 1+2) | `CR_001_*` source + `CR_001_IMPLEMENTATION_SUMMARY.md` + `CR_001_QA_REPORT.md` + `CR_001_BUCKET_D1_FE3_SRM_BADGE_HANDOVER.md` | Shipped | `qa_passed_with_deferred_backend_dependency` | BE-1 P1–P6+G1 | Partial (deep audit-tab walk gated on BE-1 fields) | None (preserves API-02 + Module 10) | **`accepted_with_deferred_backend_dependency`** |
| 2 | **CR-003** | Paid & Hold Order Actions (Change Method / Mark Unpaid / Collect Bill) | `CR_003_*` source + `CR_003_IMPLEMENTATION_SUMMARY.md` + `CR_003_QA_REPORT.md` | Shipped | `qa_passed_with_deferred_backend_dependency` | Backend socket emission on Mark-Unpaid (cross-terminal re-surface) | Cross-terminal needs 2 sessions + backend socket | None | **`accepted_with_deferred_backend_dependency`** |
| 3 | **CR-004 (original, 2026-04-29)** | Room Orders Report — PMS-style read-only view | `CR_004_QA_REPORT.md` (~~`qa_failed`~~ · superseded 2026-05-03) | Shipped | **Superseded** by P0 below | n/a | n/a | n/a | **`closed_no_action`** (historical) |

### 3.2 Sprint-fresh QA cycle P0–P8 (2026-05-03 → 2026-05-04)

| # | CR / Bucket | Title | Source docs | Impl status | QA status | Backend dep | Runtime-blocked | Baseline impact | Recommendation |
|---|---|---|---|---|---|---|---|---|---|
| 4 | **CR-004 Re-validation (P0)** | Room Orders Report — Phase 1 + filter-derivation fix | `CR_004_REVALIDATION_QA_REPORT.md` + `CR_004_BUCKET_*_HANDOVER.md` × 3 | Shipped | `qa_passed_with_deferred_backend_dependency` | BE-T (G2/G3/OPT) for cross-day Phase 2 | Owner-validated 2026-05-03 | None — preserves Module 5 + MC-06 | **`accepted_with_deferred_backend_dependency`** (Phases 4.1–4.5 partial-final) |
| 5 | **CR-008 Sub-CR #1 (P1)** | D1-Cap delivery-charge capture + D1-Gate override readOnly rule | `CR_BUCKET_D1_CAP_*` + `CR_BUCKET_D1_GATE_*` + `CR_008_SUB_1_QA_REPORT.md` + rollback playbook | Shipped | `qa_passed_with_deferred_backend_dependency` | None for FE; backend already accepts payload | 15 scenario-level checks blocked on Palm House creds | None — preserves API-03 + Module 4 | **`accepted_with_deferred_backend_dependency`** |
| 6 | **CR-004 Phase 2 Buckets A+B+C (P2)** | Cross-day in-house view + pill-flicker fix + post-handover BE-2 §4.1 Paid-formula refinement | `CR_004_PHASE2_*` source + 3 bucket handovers + `CR_004_PHASE2_BUCKETS_A_B_C_QA_REPORT.md` | Shipped | `qa_passed_with_deferred_backend_dependency` | BE-T / BE-2 for richer breakdowns | Owner-validated 2026-05-03 | None | **`accepted_with_deferred_backend_dependency`** |
| 7 | **CR-006 A1+B1 (P3)** | Variation modal — optional variation (A1) + multi-select variation (B1) | `CR_BUCKET_A1_*` + `CR_BUCKET_B1_*` + `CR_006_A1_B1_QA_REPORT.md` | Shipped | `qa_passed_with_deferred_backend_dependency` | None | Owner-validated 2026-05-03 | None — preserves SM-06 + Module 4 + transform contract | **`accepted_with_deferred_backend_dependency`** (FO-B1-01 resolved follow-up 2026-05-04 — see §7 row 1) |
| 8 | **CR-005 #1 / B2-split Phase 1 (P4)** | PG Amount + PG Order Id columns split + horizontal scroll fix | `CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md` + `CR_005_B2_SPLIT_QA_REPORT.md` | Shipped | `qa_passed_with_deferred_backend_dependency` | None for Phase 1; BE-W2 gates Phase 2 | 10 RB items (live PG order) | None — preserves MC-06 | **`accepted_with_deferred_backend_dependency`** |
| 9 | **CR-007 / A2 (P5, re-verified 2026-05-04)** | Order ID chip + Print Bill button + BUG-PREPAID-MERGE-SHIFT fold | `CR_BUCKET_A2_ORDERID_AND_PRINT_BILL_HANDOVER.md` + `CR_007_A2_QA_REPORT.md` | Shipped | `qa_passed_with_deferred_backend_dependency` | None | Owner-validated 2026-05-02 (10 RB owner-anchored + 5 not exercised) | None — Module 4 + Module 14 preserved | **`accepted_with_deferred_backend_dependency`** (CR-007 fully closed) |
| 10 | **CR-008 #4 Phase A / D1 (P6)** | Stay-on-Order-Entry after Collect Bill (Phase 1 device-local stub) | `CR_008_D1_DEFAULT_LANDING_SCREEN_IMPLEMENTATION_SUMMARY.md` + `CR_008_D1_QA_REPORT.md` | Shipped | `qa_passed_with_deferred_backend_dependency` | None for Phase A; BE-F gates Phase B | Owner-validated 2026-05-03 (14 RB) + 4 design-guaranteed | **BD-P1** (new localStorage key — covered by SM-03/SM-04 + Module 11 rules) | **`accepted_with_deferred_backend_dependency`** |
| 11 | **A0a UI-COD-MASK (P7)** | Audit table `cash_on_delivery → '—'` display short-circuit | `CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` + `UI_COD_MASK_HANDOVER.md` (source) + `A0a_UI_COD_MASK_QA_REPORT.md` + **`RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md`** | Shipped | `qa_passed_with_deferred_backend_dependency` | None | ✅ **Runtime addendum PASSED 2026-05-04** (live wire corpus + display-layer static re-verification) | None — pure presentation, preserves API-02 + MC-06 | **`accepted`** (A0a — fully closed 2026-05-04) |
| 12 | **A0b ROLE-NAME-WIRE-FIX (P8)** | Wire `role_name` canonicalised to `permissions[0]` across 4 endpoints + 6 call-sites | `CR_BUCKET_A0b_ROLE_NAME_WIRE_FIX_HANDOVER.md` + `ROLE_NAME_WIRE_FIX_HANDOVER.md` (source) + `A0b_ROLE_NAME_WIRE_FIX_QA_REPORT.md` + new pure-Jest contract test (6/6 PASS) + **`RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md`** | Shipped | `qa_passed_with_deferred_backend_dependency` | None (backend already accepts canonical values) | ✅ **Runtime addendum PASSED 2026-05-04** (live backend wire-contract proof: `role_name=Manager` → 15 orders; pre-fix `role_name=Owner` → only 3 orders on preprod tenant 541) | None — preserves API-02 transform contract + Module 1/2 shells | **`accepted`** (A0b — fully closed 2026-05-04) |

### 3.3 Parked / not-shipped items visible in sprint trackers

| # | Item | Type | Source docs | Status | Reason |
|---|---|---|---|---|---|
| 13 | **A3** | Bucket | `CR_BUCKETS_A3_A4_PARKED_HANDOVER.md` | `parked_owner_decision` | Owner declined |
| 14 | **A4** | Bucket | `CR_BUCKETS_A3_A4_PARKED_HANDOVER.md` | `parked_owner_decision` | Owner declined |
| 15 | **B3** | Bucket — item-level `cancel_by_name` | A0b P8 §11 + consolidation §5 | `parked_backend_dependency` | Awaiting BE-V |
| 16 | **B4** | Bucket | Consolidation §5 | `parked_owner_decision` | Owner declined |
| 17 | **B2 Phase 2** — PG Status auto-reveal | Sub-bucket | P4 report | `qa_blocked_backend_dependency` | Awaiting BE-W2 `snapshot_razorpay_status` |
| 18 | **CR-008 #4 Phase B** — server-side `default_landing_screen` | Sub-CR phase | P6 report §11 | `qa_blocked_backend_dependency` | Awaiting BE-F |
| 19 | **CR-008 Sub-CR #3** — dispatch/assign endpoints | Sub-CR | `CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md` | `parked_backend_dependency` | Backend roadmap item; not started |
| 20 | **CR-002** — unify status and tab logic | CR | `CR_002_unify_status_and_tab_logic.md` | `parked_owner_decision` | Not started in this sprint |
| 21 | **CR-009** — Operations Audit Timeline | CR | `CR_009_OPERATIONS_AUDIT_TIMELINE.md` | `parked_backend_dependency` | Not started; backend-heavy |
| 22 | **CR-010** — Roles & Permissions Consolidation | CR | `CR_010_ROLES_AND_PERMISSIONS_CONSOLIDATION.md` | `parked_owner_decision` | Captures Q-RP-03, Q-RP-05, D-A0b-3; not started |
| 23 | **CR-011** — PG scan / Serve / paymentType case mismatch | CR | `CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md` | `parked_backend_dependency` | Source doc only; awaiting BE-A |
| 24 | **CR-012** — Big Buddha filling MAX label mismatch | CR | `CR_012_BIG_BUDDHA_FILLING_MAX_LABEL_MISMATCH.md` | `parked_owner_decision` | Source doc only |
| 25 | **CR-013** — GST config correction | CR | `CR_013_GST_CONFIG_CORRECTION.md` | `parked_owner_decision` | Source doc only |

### 3.4 Backend asks (BE-*) explicitly excluded from baseline

| # | BE Item | Owner | Gates |
|---|---|---|---|
| 26 | **BE-1** P1–P6 + G1 | Backend | CR-001 cell-level data + transferToRoom RUNNING badge |
| 27 | **BE-2** | Backend | Lodging payment breakdown — CR-004 + adjacencies |
| 28 | **BE-T** | Backend | CR-004 P2 dependencies (G2/G3/OPT) |
| 29 | **BE-U** | Backend | CR-005 Phase A web-order attribution |
| 30 | **BE-V** | Backend | B3 authoritative item-level `cancel_by_name` |
| 31 | **BE-W** | Backend | per-item paid-stage fields |
| 32 | **BE-W2** | Backend | `snapshot_razorpay_status` → gates B2 Phase 2 |
| 33 | **BE-A** | Backend | PG scan lifecycle (CR-011 adjacency) |
| 34 | **BE-F** | Backend | `default_landing_screen` → gates CR-008 #4 Phase B |

All 9 BE items: **`parked_backend_dependency`** — not unparked by this run.

---

## 4. Final accepted items (full list, by category)

### 4.1 `accepted_with_deferred_backend_dependency` — 12 items

| # | CR / Bucket | What's accepted | Net frontend behaviour shipped on `may4` |
|---|---|---|---|
| 1 | **CR-001** | All Orders Report Phases 1+2 + Bucket D1 (FE-3 SRM badge frontend workaround) | Status derivation, filter structure, prefixed `displayOrderId`, Audit Paid tab routing for settled SRMs |
| 2 | **CR-003** | Paid + Hold row actions | Change Method dialog, Mark Unpaid action, Collect Bill drawer |
| 3 | **CR-004 Phase 1 + Phase 2 A+B+C** | Room Orders Report PMS-style + cross-day in-house view | Paid/Unpaid pill derivation from `fOrderStatus===6`, Bucket A (Paid stat + Total relabel), Bucket B (filter-pill data source), Bucket C (Remove-from-Room reuse of Mark-Unpaid), Phase 2 (`/get-room-list` filter-pill driven, pill-flicker eliminated, post-handover BE-2 §4.1 refinement) |
| 4 | **CR-005 #1 / B2-split Phase 1** | PG columns split + scroll fix | PG Amount + PG Order Id as separate sortable columns; horizontal scroll on the audit table fixed; dormant placeholder for B2 Phase 2 wired |
| 5 | **CR-006 A1** | Variation optional | Items with optional variation can now be carted without selecting a variant; payload preserves `selectedVariants:[]` |
| 6 | **CR-006 B1** | Multi-select variation | Multiple variant options per item supported; payload `selectedVariants[]` correctly populated; KOT/bill render correctly (FO-B1-01 cart-line display drift resolved via follow-up fix 2026-05-04 — see §7 row 1) |
| 7 | **CR-007 / A2.1** | Dashboard card row split | Order Id chip in row 1; OrderTimeline in row 2; order note in row 3; amount `ml-2` polish; Merge/Shift hidden on prepaid (BUG-PREPAID-MERGE-SHIFT layer 1) |
| 8 | **CR-007 / A2.2** | OrderEntry middle-panel `#orderId` chip | Chip renders once order placed; resolver `effectiveTable?.orderId \|\| placedOrderId`; restaurant-id only |
| 9 | **CR-007 / A2.3** | OrderEntry right-panel Print Bill button | Reuses `printOrder('bill', ...)`; orange-bordered pill; gated on `hasPlacedItems && orderId`; payment-agnostic by design |
| 10 | **CR-008 Sub-CR #1 (D1-Cap + D1-Gate)** | Delivery-charge capture + override readOnly rule | Delivery-charge state in OrderEntry; payload folding into `order_amount`/`tax`/`round_up`; CollectPaymentPanel readOnly only for prepaid orders |
| 11 | **CR-008 #4 Phase A / D1** | Stay-on-Order-Entry after Collect Bill (browser-local) | New localStorage key `mygenie_stay_on_order_after_bill`; two surgical Pay-success branches in `OrderEntry.jsx` (L1426 Place+Pay, L1546 Collect-Bill-on-existing); `key={orderEntryResetNonce}` remount in `DashboardPage.jsx`; Status Config UI toggle |
| 12 | **A0b ROLE-NAME-WIRE-FIX** | Canonical `role_name` on the wire | `permissions?.[0] \|\| 'Manager'` resolver across 4 endpoints (running-orders GET, order-confirm PUT, order-status-update PUT for ready/served/cancel) at 6 call-sites; `getOrderRoleParam` helper fully removed; pure-Jest contract test 6/6 PASS |

### 4.2 `accepted_with_runtime_addendum_pending` — 0 items (both runtime addenda PASSED 2026-05-04)

> **Update 2026-05-04 — Runtime QA Addendum cycle:** Both A0a and A0b runtime addenda PASSED and have been promoted from `accepted_with_runtime_addendum_pending` to plain `accepted` (see §4.1 rows 11 and 12). FO-B1-01 runtime addendum also PASSED and has moved from `qa_passed_with_runtime_addendum_pending` to plain `qa_passed` (see §7 row 1). Report: `qa_reports/RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md`.

| # | CR / Bucket | (HISTORICAL — runtime-addendum-pending resolved 2026-05-04) |
|---|---|---|
| 1 | ~~**A0a UI-COD-MASK**~~ | Runtime addendum PASSED 2026-05-04 — live preprod tenant 541 confirmed 12 of 15 running-orders carry raw `cash_on_delivery` on the wire; all 5 display-layer mask points (audit table, CSV export, PDF export, OrderDetailSheet, filter dropdown) re-verified on current branch. Upgraded to `accepted`. |
| 2 | ~~**A0b ROLE-NAME-WIRE-FIX**~~ | Runtime addendum PASSED 2026-05-04 via live backend wire-contract verification — direct preprod proof that `role_name=Manager` (A0b canonical) returns 15 running orders while pre-fix `role_name=Owner` returns only 3 (materially incomplete). Fix is load-bearing on live preprod. Upgraded to `accepted`. |

### 4.3 `accepted` (no caveats) — 2 items (2026-05-04 promotion)

| # | Item | Promotion basis |
|---|---|---|
| 1 | **A0a UI-COD-MASK** | Promoted from `accepted_with_runtime_addendum_pending` on 2026-05-04 Runtime QA Addendum cycle. |
| 2 | **A0b ROLE-NAME-WIRE-FIX** | Promoted from `accepted_with_runtime_addendum_pending` on 2026-05-04 Runtime QA Addendum cycle. |

---

## 5. Items not accepted

### 5.1 Items with current `qa_failed` status — 0

### 5.2 Items requiring owner decision — 3 (all non-blocking, optional)

| ID | Decision needed | Why non-blocking |
|---|---|---|
| **FE-01** | Apply optional baseline enrichment: add `mygenie_stay_on_order_after_bill` to `ARCHITECTURE_DECISIONS_FINAL.md` SM-03 illustrative list? | SM-03 list is already illustrative; rule unchanged either way |
| **FE-02** | Apply optional baseline enrichment: mark OQ-07 (reporting-ownership wording verification) as **closed** since CR-001/CR-004/CR-005-B2/A0a all preserved backend-aggregation ownership? | OD-01 in `FINAL_DOCS_APPROVAL_STATUS.md` already records the verification note; closure is administrative |
| **FE-03** | Apply optional baseline enrichment: add CR-008 #4 Phase A example to `MODULE_DECISIONS_FINAL.md` Module 11 change rule? | Existing Module 11 rule already covers the case |

These are **proposals**, not failures. Recorded here for visibility; `/app/memory/final/` remains untouched per STRICT RULES.

---

## 6. Parked / backend-blocked items register

Per Baseline Reconciliation §11 + STRICT RULES, the following items must NOT be baselined or unparked. Each retains its parked status from prior agent runs.

### 6.1 Backend asks (`parked_backend_dependency`)

| BE Item | Gates | Unblock condition |
|---|---|---|
| **BE-1** P1–P6 + G1 | CR-001 field-level cells (waiter_name, *_by_id/*_by_name, cancel_reason, cancel_type, table_no, room_info, settlement signal on transferToRoom) | Backend ships fields |
| **BE-2** | CR-004 lodging payment breakdown | Spec filed; backend implementation |
| **BE-T** (G2/G3/OPT) | CR-004 Phase 2 cross-day dependencies | Backend ships filter + payload changes |
| **BE-U** | CR-005 Phase A web-order attribution | Backend ships attribution fields |
| **BE-V** | B3 authoritative item-level `cancel_by_name` | Backend delivers field; **B3 unblock gate = BE-V delivered AND P8 closed** (P8 closed) |
| **BE-W** | per-item paid-stage fields | Backend ships fields |
| **BE-W2** | `snapshot_razorpay_status` for PG Status auto-reveal | Backend ships field; **B2 Phase 2 unblock gate** |
| **BE-A** | CR-011 PG scan lifecycle | Backend roadmap item |
| **BE-F** | `default_landing_screen` server-side setting | Backend ships setting; **CR-008 #4 Phase B unblock gate = P1 + P6 closed AND BE-F shipped** (P1 + P6 closed; BE-F is single remaining gate) |

### 6.2 CR / sub-CR / bucket parked (`parked_backend_dependency` or `parked_owner_decision`)

| Item | Park reason | Type |
|---|---|---|
| A3 | Owner declined | `parked_owner_decision` |
| A4 | Owner declined | `parked_owner_decision` |
| B3 | Awaiting BE-V | `parked_backend_dependency` |
| B4 | Owner declined | `parked_owner_decision` |
| B2 Phase 2 | Awaiting BE-W2 | `qa_blocked_backend_dependency` |
| CR-008 Sub-CR #3 (dispatch/assign endpoints) | Backend roadmap | `parked_backend_dependency` |
| CR-008 #4 Phase B | Awaiting BE-F | `qa_blocked_backend_dependency` |
| CR-002 unify status and tab logic | Not started | `parked_owner_decision` |
| CR-009 Operations Audit Timeline | Not started; backend-heavy | `parked_backend_dependency` |
| CR-010 Roles & Permissions Consolidation | Not started | `parked_owner_decision` |
| CR-011 PG scan / Serve / paymentType case | Awaiting BE-A | `parked_backend_dependency` |
| CR-012 Big Buddha filling MAX label | Not started | `parked_owner_decision` |
| CR-013 GST config correction | Not started | `parked_owner_decision` |

**Total parked: 13 CR/bucket items + 9 backend asks.**

### 6.3 Explicit non-baseline statement

Per STRICT RULES: **none of the items in §6.1 or §6.2 may be treated as accepted baseline behaviour.** If any future doc treats them as baselined, that is a documentation error to be corrected immediately.

---

## 7. Backlog / follow-up register (consolidated)

Carried forward from Baseline Reconciliation §13. **All non-blocking.** Final Acceptance does not gate on any of these.

| # | ID | Description | Severity | Source | Scope | Why non-blocking | Next owner |
|---|---|---|---|---|---|---|---|
| 1 | **FO-B1-01** | Cart-line display total after qty +/- dropped multi-select variant price; outbound payload + KOT + bill remained correct | Minor (display only) | CR-006 P3 | Variation modal multi-select cart row | **RESOLVED via follow-up fix 2026-05-04** — new `calculateSelectedVariantsPrice` helper at `orderTransform.js:358-388`; broken inline reduce at `OrderEntry.jsx:615-617` replaced by helper call at L619. QA report `FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_QA_REPORT.md`. **Runtime addendum PASSED 2026-05-04** — live preprod menu corpus confirmed (`Big Buddha Burger (V)` with 7-option multi-select variant); helper contract green (20/20 unit tests); payload shape green (17/17 unit tests, NS-3C-9); untouched-surface review green. Status: **`qa_passed`** (full — addendum cleared). Interactive OrderEntry walk (RF-04 / RB-01..RB-11) deferred as additive-only. See `qa_reports/RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md`. Implementation summary: `implementation_summaries/FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_SUMMARY.md`. | Closed — resolved follow-up + addendum cleared |
| 2 | **DOC-B2-01** | Handover prose referenced `snapshot_razorpay_amount`; shipped code reads `payment_amount` | Doc drift | CR-005 #1 P4 | Handover doc edit only | **RESOLVED 2026-05-04** — documentation aligned via `CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md` §1 row B2.B, §5 implementation-note, and new §10 "DOC-B2-01 drift resolution". No code change. B2 Phase 2 / PG Status remains parked on BE-W2. | Closed — Batch 1 doc cleanup |
| 3 | **DOC-A0a-01** | A0a handover §14 step 6 wording vs pre-existing `PAID_ACTIONS_ALLOWED_METHODS` eligibility | Doc drift | A0a P7 | Handover doc edit only | **RESOLVED 2026-05-04** — wording corrected in `CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` §14 step 6; new §16 "DOC-A0a-01 drift resolution" added. No code change. CSV/DETAIL/FILTER siblings remain pending (Batch 2). | Closed — Batch 1 doc cleanup |
| 4 | **CSV-A0a-01** | CSV export at `ExportButtons.jsx:193` still emits raw `cash_on_delivery` | Cosmetic asymmetry | A0a P7 §12 bullet 3 | Export feature | **RESOLVED 2026-05-04** — CSV column format fn + PDF cell guard added in `ExportButtons.jsx:58-61 + 205`; both mask `cash_on_delivery → '—'` matching audit-table A0a display. Raw enum preserved in payload. See `implementation_summaries/COMBINED_HYGIENE_BATCH_2_DISPLAY_EXPORT_SUMMARY.md`. | Closed — Batch 2 hygiene |
| 5 | **DETAIL-A0a-01** | OrderDetailSheet drill-down still maps `cash_on_delivery → 'CASH'` via `formatPaymentMethod` | Cosmetic asymmetry | A0a P7 §12 bullet 2 | Drill-down detail | **RESOLVED 2026-05-04** — `methodMap['cash_on_delivery']` changed from `'CASH'` to `'—'` at `OrderDetailSheet.jsx:89`. See Batch 2 summary. | Closed — Batch 2 hygiene |
| 6 | **FILTER-A0a-01** | `reportTransform.extractPaymentMethods` may still surface `cash_on_delivery` in filter dropdown | Cosmetic asymmetry | A0a P7 §12 bullet 1 | Filter dropdown | **RESOLVED 2026-05-04** — exported helper at `reportTransform.js:708-726` now excludes `cash_on_delivery` from the returned Set (defensive; zero runtime consumers today). See Batch 2 summary. | Closed — Batch 2 hygiene |
| 7 | **TEST-INFRA-001** | `@testing-library/react` + `jest-dom` not wired on this branch | Test-infra gap | A0a P7 + A0b P8 | Cross-bucket | **RESOLVED 2026-05-04 via Batch 3C** — `yarn add --dev @testing-library/react@^14 @testing-library/jest-dom@^6` (resolved to `14.3.1` + `6.9.1`); `/app/frontend/src/setupTests.js` created with `import '@testing-library/jest-dom';`. `yarn test --watchAll=false` now runs the full 19-suite/201-test tree for the first time. **Tally: 9 suites pass / 10 fail; 127 tests pass / 74 fail.** Of the 4 previously-blocked JSX suites: **2 PASS** (`SocketContext.test.jsx`, `ErrorBoundary.test.jsx`); **2 FAIL** with `error-boundary-fallback` rendering due to test-fixture component drift (`ProtectedRoute.test.jsx`, `App.routing.test.jsx`) — NOT caused by Batch 3C wiring. The 8 pure-Jest suite failures (constants, transforms, barrel exports, raw-field, socket update) are pre-existing test drift that wiring merely surfaced. All 10 newly-surfaced failures classified as separate backlog rows; **not fixed in Batch 3C** per scope rules. Webpack/runtime untouched (devDeps only). See `implementation_summaries/COMBINED_HYGIENE_BATCH_3C_TEST_INFRA_SUMMARY.md`. | Closed — Batch 3C hygiene |
| 8 | **CR-010-RP-03** | `OrderContext.refreshOrders(roleName='Manager')` default still uses `'Manager'` literal | Pre-existing; explicit deferral | A0b P8 | Context default | Tracked under CR-010 §4 Q-RP-03 | Future CR-010 implementation |
| 9 | **CR-010-RP-05** | Waiter-role wire test not exercised on preprod | Coverage gap | A0b P8 | Live exercise | Unit test T-02 covers resolver | Future preprod sweep |
| 10 | **D-A0b-3** | `stationService.js:185` `formData.append('role_name', stationName)` left untouched per owner decline | By-design | A0b + CR-010 §7 | Station service | Semantic reuse of `role_name` for station filter (not role tier) | Future CR-010 |
| 11 | **BUG-PREPAID-MERGE-SHIFT** | Merge/Shift hidden on prepaid orders at OrderCard + OrderEntry layers | **CLOSED-FIXED** | A2 P5 | OrderCard + OrderEntry | Defence-in-depth; verified at both layers | Closed |
| 12 | **TD-01** | Duplicate "CR Results" table in `QA_REPORT_INDEX.md` | Tracker drift | Reconciliation §9.1 | QA index | **RESOLVED THIS RUN** (see §9 below) | Done |
| 13 | **TD-02** | Stale "Final Recommendation" in `QA_REPORT_INDEX.md` | Tracker drift | Reconciliation §9.1 | QA index | **RESOLVED THIS RUN** | Done |
| 14 | **TD-03** | Stale CR-004 missing-`room_info` clarification entry | Tracker drift | Reconciliation §9.1 | QA index | **RESOLVED THIS RUN** | Done |
| 15 | **TD-04** | Incomplete backlog register in `QA_REPORT_INDEX.md` | Tracker drift | Reconciliation §9.1 | QA index | **RESOLVED THIS RUN** | Done |
| 16 | **TD-05** | Resolved CR-004 status-filter row still in "Failed Items Requiring Implementation Fix" | Tracker drift | Reconciliation §9.1 | QA index | **RESOLVED THIS RUN** | Done |
| 17 | **CR-001 / Exports** | `ExportButtons.jsx` CSV has 9 columns vs handover's 8; summary row 1 column off | Cosmetic alignment | QA_REPORT_INDEX §Observed Unrelated Issues | Export feature | **RESOLVED 2026-05-04** — summary row now generated dynamically from `columns.length` at `ExportButtons.jsx:92-104`. Correctly aligns on all 3 tab variants: base (9=9), cancelled (11=11), aggregator (11=11). `paymentType` column retained per owner preference. See Batch 2 summary. | Closed — Batch 2 hygiene |
| 18 | **Retained diagnostics** | `[CR-001 DIAG]`, `[CR-001 P2 DIAG]`, `[CR-001 G5 DIAG]`, `[CR-003 DIAGNOSTIC]`, `[CR-004 P2 DIAG]` | Intentional retention | QA_REPORT_INDEX §Observed | Cross-CR | Will be removed when BE-1 lands / permissions matrix confirmed | Future cleanup commit |
| 19 | **CR-004 / Visual** | Missing-`room_info` shown via `—` placeholders instead of an explicit warning badge | Cosmetic | P2 report | Room report visual | Owner cosmetic call | Owner decision |
| 20 | **CR-004 / Scope** | Orphan-SRM fallback grouping in QA handover not literally implemented | Spec drift | P2 report | Room report scope | Orphan SRMs are rare; non-blocking | Future CR-004 patch |
| 21 | **Pre-existing** | `LoadingPage.jsx:111 react-hooks/exhaustive-deps` warning | Pre-existing | Cross-CR | Frontend lint | **RESOLVED 2026-05-04** — single `// eslint-disable-next-line react-hooks/exhaustive-deps` added at `LoadingPage.jsx:112` mirroring existing sibling disable at L68. Zero behaviour change. Webpack now `Compiled successfully` (was `Compiled with 1 warning`). Note: owner-raised UX improvement (visible station-load progress in Phase 2) captured as separate Phase 3 CR `UX-LOADING-02` at `/app/memory/change_requests/phase_3/UX_LOADING_02_VISIBLE_STATION_PROGRESS.md` — NOT part of this row's fix. See `implementation_summaries/COMBINED_HYGIENE_BATCH_3A_LOADINGPAGE_ESLINT_SUMMARY.md`. | Closed — Batch 3A hygiene |
| 22 | **Pre-existing** | `paymentService.collectPayment()` references missing `API_ENDPOINTS.CLEAR_BILL` | Pre-existing latent bug | Cross-CR | Stale service | **RESOLVED 2026-05-04 via DELETE** — dead file `paymentService.js` (zero runtime callers; grep-verified) removed; companion zombie test file `paymentService.test.js` removed; 3-line comment in `paymentMutationService.js:12-17` refreshed to remove stale pointer. Zero Collect Bill disturbance (live path via `BILL_PAYMENT` on `OrderEntry.jsx:1463`, `CollectBillPanelDrawer.jsx:183`, `paymentMutationService.js` wrappers for CR-003 — all untouched). Fulfils API-03 intent + API-05 "deliberately cleaned" rule. Webpack now `Compiled successfully!` with 0 warnings. Batch 3C (TEST-INFRA-001) unblocked. See `implementation_summaries/COMBINED_HYGIENE_BATCH_3B_PAYMENTSERVICE_DELETE_SUMMARY.md`. | Closed — Batch 3B hygiene |
| 23 | **Pre-existing** | `ProtectedRoute.test.jsx` test infra gap | Pre-existing | Cross-CR | Test infra | **RESOLVED 2026-05-04 via Batch 3C** — testing-library wiring landed; `ProtectedRoute.test.jsx` now executes (suite runs all 9 tests). Test-fixture content drift (ErrorBoundary fallback rendered instead of LoginPage on unauthenticated redirect) is a separate newly-surfaced backlog item (NS-3C-1) — not in Batch 3C scope. See Batch 3C summary §4. | Closed — Batch 3C hygiene (test-infra gap); follow-up content drift tracked as NS-3C-1 |
| 24 | **NS-3C-1** | `ProtectedRoute.test.jsx` Groups A/B/C — 9 tests fail; render produces `error-boundary-fallback` instead of expected route content | Newly surfaced (test fixture drift) — **RESOLVED 2026-05-04 via T2** | Batch 3C `yarn test` first-run | JSX integration tests | Component imports likely throw during Jest render (real `ProtectedRoute` and/or its dependencies have drifted from the test's mocked context expectations). Not caused by Batch 3C wiring. Actual on T2 reproduction: 3 tests failed (A1, B2, C1) — `mockRestaurantValue` default `isLoaded: false` triggered CR-001 Fix B2 loading-redirect to a non-defined `/loading` route. Fix: flipped `beforeEach` default to `isLoaded: true`; repurposed B2 to assert the documented CR-001 Fix B2 redirect with explicit `isLoaded: false` override + `/loading` route. Test-only edits; production unchanged. 9/9 PASS. See `implementation_summaries/NS_3C_T2_JSX_FIXTURE_FIXES_SUMMARY.md`. | Closed — T2 hygiene |
| 25 | **NS-3C-2** | `App.routing.test.jsx` Group E — 4 tests fail; same `error-boundary-fallback` rendering | Newly surfaced (test fixture drift) — **RESOLVED 2026-05-04 via T2** | Batch 3C `yarn test` first-run | JSX integration tests | Same root cause as NS-3C-1 (shares `ProtectedRoute` + `ErrorBoundary` imports). Actual on T2 reproduction: only `useAuth` was mocked; `useRestaurant` was unmocked, so `const { isLoaded } = useRestaurant()` destructured `undefined` and threw → outer `<ErrorBoundary>` caught → fallback rendered. Fix: added `useRestaurant` mock identical to ProtectedRoute.test.jsx, defaulted to `{ isLoaded: true }`; reset in `beforeEach`. Test-only edit; production unchanged. 4/4 PASS. See T2 summary. | Closed — T2 hygiene |
| 26 | **NS-3C-3** | `__tests__/api/constants.test.js` T-08 T3 fails — non-`/api/...` URL path detected in `API_ENDPOINTS` | Newly surfaced (pre-existing pure-Jest drift) — **RESOLVED 2026-05-04 via T1** | Batch 3C `yarn test` first-run | API constants assertion | Test rule was too narrow — broadened to accept `/api/` ∪ `/pos/` ∪ `TBD` (CRM customer/address endpoints legitimately use `/pos/...` per `constants.js:34-40` `// CRM:` comments). Test-only edit; production unchanged. 4/4 PASS. See `implementation_summaries/NS_3C_T1_TEST_ONLY_FIXES_SUMMARY.md`. | Closed — T1 hygiene |
| 27 | **NS-3C-4** | `__tests__/api/transforms/rawField.test.js` T-11 T3 fails — `_raw` references found in 2 production files (4 lines total) | Newly surfaced — **RESOLVED 2026-05-04 via RAW-FIELD-PROD-FALLBACK-FIX** (separate production-fix cycle, owner-approved Option a) | Batch 3C `yarn test` first-run + T4 triage + RAW-FIELD-PROD-FALLBACK-FIX cycle | UI rendering pipeline | **Static-inspection correction to T4 §2.1 architectural premise:** the 4 violating accesses (`ao._raw` in `RoomRowCard.jsx` L194/197/202; `seed._raw` in `RoomOrdersReportPage.jsx` L497) read from `_raw` objects set UNGATED at `orderTransform.js:268`, `roomListTransform.js:54`, and `reportService.js:1177` respectively — they were not actually stripped in production builds. The `rawField.test.js` T-11 T3 rule was enforcing an architectural decoupling (UI consumers must read transformed fields, not raw API), not a runtime gate. **Fix landed (owner-approved Option a, no transform-contract change):** (a) `RoomRowCard.jsx` L194 — `oin = ao?._raw?.order_in \|\| 'SRM'` → literal `'SRM'` (API schema for `associated_order_list[]` items lacks `order_in`); (b) L197 redundant middle fallback removed (`ao.orderNumber === item.restaurant_order_id`, already the primary); (c) L202 `created_at` else-branch removed (rare-edge fallback dropped per Option a); (d) `RoomOrdersReportPage.jsx` L497 dead `_raw.table` middle fallback removed (`tbl?.tableNumber \|\| tbl?.displayName` already covers both source paths). **Validation:** `rawField.test.js` 3/3 PASS naturally (test untouched); full suite **19/19 PASS / 199/199 tests PASS**. Production behaviour identical in all observed cases. See `implementation_summaries/RAW_FIELD_PROD_FALLBACK_FIX_SUMMARY.md`. | Closed — RAW-FIELD-PROD-FALLBACK-FIX cycle |
| 28 | **NS-3C-5** | `__tests__/structure/barrelExports.test.js` T-12 / T-14 fail — barrel exports missing `CollectBillPanelDrawer`, `RoomOrdersReportPage`, etc. | Newly surfaced (pre-existing pure-Jest drift) — **RESOLVED 2026-05-04 via T3** | Batch 3C `yarn test` first-run | Barrel structure assertion | Pre-existing — barrel files lag behind directory contents | Owner-approved barrel additions (per T3 Choice 1.A): added 4 missing report exports (`CollectBillPanelDrawer`, `MarkUnpaidConfirmDialog`, `PaymentMethodPicker`, `RoomRowCard`) to `src/components/reports/index.js` and 2 missing page exports (`RoomOrdersReportPage`, `StatusConfigPage`) to `src/pages/index.js`. Barrels are non-runtime scaffolding; live app uses direct named imports throughout. 26/26 PASS. See `implementation_summaries/NS_3C_T3_TEST_FIXTURE_AND_BARREL_FIXES_SUMMARY.md`. | Closed — T3 hygiene |
| 29 | **NS-3C-6** | `__tests__/api/socket/updateOrderStatus.test.js` failures | Newly surfaced (pre-existing pure-Jest drift) — **RESOLVED 2026-05-04 via T3** | Batch 3C `yarn test` first-run | Socket transform assertion | Pre-existing | BUG-107 v2 socket-payload contract (April 2026) replaced the pre-v2 fetch-and-analyse logic. Test file rewritten in place (no deletion) to assert the v2 contract: ~6 tests covering `cancelled`/`paid` → remove; other statuses → update; invalid message / missing payload → early return; transform throw handled gracefully. 11/11 PASS. See T3 summary. | Closed — T3 hygiene |
| 30 | **NS-3C-7** | `__tests__/api/transforms/cancelItemPayload.test.js` failures | Newly surfaced (pre-existing pure-Jest drift) — **RESOLVED 2026-05-04 via T3** | Batch 3C `yarn test` first-run | Transform assertion | Pre-existing | Test rewritten in place (no deletion) to use the unified `toAPI.cancelItem(currentTable, item, reason, cancelQty)` helper that replaced the BUG-106 split (`cancelItemFull`/`cancelItemPartial`). Two assertions reversed per owner approval (T3 Choice 2.A): unified function ALWAYS emits `cancel_qty`. 32/32 PASS. See T3 summary. | Closed — T3 hygiene |
| 31 | **NS-3C-8** | `__tests__/api/transforms/orderTransformFinancials.test.js` failures | Newly surfaced (pre-existing pure-Jest drift) — **RESOLVED 2026-05-04 via T1** | Batch 3C `yarn test` first-run | Transform assertion | Pre-existing | 3 stale-fallback tests updated to match transform-layer "no fallback" contract documented at `orderTransform.js:183`; consumer-layer fallback chain at `orderTransform.js:1360` continues to cover display. Test-only edit; production unchanged. 18/18 PASS. See T1 summary. | Closed — T1 hygiene |
| 32 | **NS-3C-9** | `__tests__/api/transforms/updateOrderPayload.test.js` failures | Newly surfaced (pre-existing pure-Jest drift) — **RESOLVED 2026-05-04 via T3** | Batch 3C `yarn test` first-run | Transform assertion | Pre-existing | Test rewritten in place (no deletion) to assert current `toAPI.updateOrder` contract: string-typed `gst_amount`/`vat_amount` (`'5.00'`); per-item `tax_amount`/`total_price` removed (rolled up to order-level `tax_amount` and `order_amount`); `order_id: String(...)`; `order_type: 'takeaway'` (OLD_POS_NORMALIZE Task 3, Apr-2026); `cust_name` only (mobile/email captured at place-order time). Test 5 + Test 14 repurposed to current shape. 17/17 PASS. See T3 summary. | Closed — T3 hygiene |
| 33 | **NS-3C-10** | `api/transforms/__tests__/orderTransform.roomInfo.test.js` failures | Newly surfaced (pre-existing pure-Jest drift) — **RESOLVED 2026-05-04 via T1** | Batch 3C `yarn test` first-run | Transform assertion | Pre-existing | 2 strict `toEqual` assertions changed to `toMatchObject` to accommodate CR-004 P4.1 + BE-2 §4.1 expanded `roomInfo` schema. Test-only edit; production unchanged. 7/7 PASS. See T1 summary. | Closed — T1 hygiene |

---

## 8. Documentation drift and conflicts

### 8.1 Confined to tracker layer (resolved this run)

| Drift ID | File | Issue | Resolution this run |
|---|---|---|---|
| TD-01 | `QA_REPORT_INDEX.md` L32-42 | Duplicate "CR Results" table | ✅ Removed |
| TD-02 | `QA_REPORT_INDEX.md` L92-101 | Stale Final Recommendation from pre-P0 state | ✅ Replaced |
| TD-03 | `QA_REPORT_INDEX.md` L86-90 | Stale CR-004 missing-`room_info` clarification | ✅ Moved to backlog |
| TD-04 | `QA_REPORT_INDEX.md` L12 | Incomplete "Known non-blocking findings" register | ✅ Pointer to this Final Acceptance §7 added |
| TD-05 | `QA_REPORT_INDEX.md` L62-65 | Resolved CR-004 row still in "Failed Items" | ✅ Moved to "Resolved Failures" historical |

### 8.2 No baseline-doc conflicts found

Per Baseline Reconciliation Report §8: **zero conflicts against `/app/memory/final/`**. Sprint deliveries operate within existing rules.

### 8.3 Cross-tracker consistency

`SESSION_TRACKER.md` and `QA_HANDOVER_INDEX.md` were pre-sprint snapshots (covering 2026-04-29 / original 3-CR bundle only). Both have been pointer-updated this run to reference this Final Acceptance document; full rewrites were intentionally not performed (would constitute over-engineering; pointer suffices).

---

## 9. Baseline reconciliation outcome

### 9.1 Reconciliation verdict (recap)

Per `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` §1.1:

> **Baseline docs under `/app/memory/final/` do NOT require corrective updates to reflect the sprint's shipped work.** They are written at the right abstraction (architecture rules, module boundaries, open-question resolutions) — every P0–P8 sprint item operates within the accepted baseline guardrails, not against them.

### 9.2 Sprint preserved every high-level rule

- ✅ Provider ordering (FA-02)
- ✅ Route map topology (FA-01)
- ✅ Transform-mediated payload contracts (API-02)
- ✅ Socket event contract
- ✅ localStorage governance scope (SM-03/SM-04 — Phase 1 device-local accommodates new key)
- ✅ Payment workflow split (API-03 — `OrderEntry` composition / `CollectPaymentPanel` settlement)
- ✅ CRM/Firebase/Google-Maps external-dependency rules (EP-01..EP-05)
- ✅ Backend aggregation ownership for Reports (MC-06)
- ✅ Hotspot file rule (FA-03 — surgical insertions documented per-bucket)
- ✅ Room billing/print lifecycle (OQ-12 deferred — A2.3 Print Bill reuses existing `printOrder('bill', ...)` entry point)
- ✅ Reporting-ownership wording verification (OQ-07 — every report-related delivery preserved backend ownership)

### 9.3 Surfaces classified

20 surfaces — Baseline Unchanged · 2 surfaces — Phase A / browser-local (covered by existing rules) · 3 surfaces — Parked Backend Dependency · 1 surface — Backlog · 0 corrective baseline conflicts.

---

## 10. Documentation drift and conflicts (formal section)

(Same content as §8; included here as required by task structure.)

- **Baseline-doc conflicts:** 0
- **Tracker-layer drift:** 5 items (TD-01..TD-05) — **resolved this run**
- **Handover-vs-code line-number drift:** documented per-bucket as D-* (non-defect)
- **Handover-vs-code field-name drift:** DOC-B2-01 (backlog)
- **Handover wording vs pre-existing code:** DOC-A0a-01 (backlog, doc edit only)
- **Backend-asks consolidation supersedes older BE-1 references** in pre-2026-05 CR docs — not a conflict, just a convention update; no sprint-time CR doc introduces a contradicting BE-1 claim

---

## 11. Optional `/app/memory/final/` enrichment proposals (owner approval required)

**STATUS:** **NOT applied this run.** Per STRICT RULES + Baseline Reconciliation Report §10.1: no corrective updates required; any application requires separate owner approval.

| ID | File | Section | Proposed change | Approval required? | If applied | If NOT applied |
|---|---|---|---|---|---|---|
| **FE-01** | `ARCHITECTURE_DECISIONS_FINAL.md` | Rule SM-03 (line 185) | Add `mygenie_stay_on_order_after_bill` to the illustrative list of localStorage-backed device-local concerns | Yes | Informational only; rule unchanged | None — SM-04 already covers Phase-1 device-local scope |
| **FE-02** | `OPEN_QUESTIONS_FINAL_RESOLUTION.md` | OQ-07 status block | Mark OQ-07 (reporting-ownership wording verification) as **closed** since 4 sprint deliveries (CR-001 + CR-004 P0/P2 + CR-005 #1 / B2-split + A0a) all preserved backend-aggregation ownership and introduced no frontend-aggregation wording | Yes | OD-01 in `FINAL_DOCS_APPROVAL_STATUS.md` §5 changes from "Closed with future verification note" to "Closed" | Stays as-is |
| **FE-03** | `MODULE_DECISIONS_FINAL.md` | Module 11 → "Future change rules" | Add example: *"Example: `mygenie_stay_on_order_after_bill` (CR-008 #4 Phase A, 2026-05-03) is a Phase-1 stub. Its Phase B (BE-F) must define a dual-read/migration plan before enabling server-side storage."* | Yes | Concretises rule with a live example | Existing rule remains correct + complete |

**Recommendation:** Defer FE-01..FE-03 to a separate owner-review pass. None blocks sprint acceptance.

---

## 12. Tracker / index updates performed (this run)

### 12.1 `/app/memory/change_requests/qa_reports/QA_REPORT_INDEX.md`

✅ **Updated.** Resolution of TD-01..TD-05:
- Removed duplicate "CR Results" table at L32-42
- Replaced "Final Recommendation" section L92-101 with sprint-wide acceptance recommendation pointing to this Final Acceptance document
- Removed stale CR-004 missing-`room_info` clarification row from "User Clarifications Needed" (L86-90)
- Expanded "Known non-blocking findings" line to point to this doc's §7 backlog register
- Moved resolved CR-004 status-filter failure row from "Failed Items Requiring Implementation Fix" to a new "Resolved Failures (Historical)" subsection

### 12.2 `/app/memory/change_requests/SESSION_TRACKER.md`

✅ **Updated** (pointer append only — preserves 2026-04-29 historical record). Added "Sprint 2026-05-03/04 Final Acceptance" header pointing to this doc.

### 12.3 `/app/memory/change_requests/qa_handover/QA_HANDOVER_INDEX.md`

✅ **Updated** (pointer append only — preserves original 3-CR bundle index). Added "Current sprint scope" pointer to this Final Acceptance doc + the P0–P8 + A0a/A0b QA reports.

### 12.4 `/app/memory/final/*` — UNTOUCHED

❌ **No edits applied** — per Baseline Reconciliation verdict + STRICT RULES. Optional enrichments FE-01..FE-03 recorded in §11 only.

### 12.5 Other tracker files inspected and not touched

- `/app/memory/change_requests/REPORTS_FIELD_MAPPING_TRACKER.md` — out of scope; not edited
- `/app/memory/change_requests/qa_reports/QA_NEXT_AGENT_HANDOVER.md` — out of scope; superseded by this Final Acceptance for sprint context
- `/app/memory/PRD.md` — deployment artifact; not sprint-acceptance-related
- `/app/memory/SESSION_HANDOVER_2026_05_03.md` — historical; not edited

---

## 13. Tracker / index updates still requiring owner approval

| Update | File | Why owner approval needed |
|---|---|---|
| FE-01 | `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` | Baseline doc edit |
| FE-02 | `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` + `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` (OD-01 row) | Baseline doc edits |
| FE-03 | `/app/memory/final/MODULE_DECISIONS_FINAL.md` | Baseline doc edit |
| Full rewrite of `SESSION_TRACKER.md` to reflect 2026-05-03/04 sprint (vs current pointer-append) | Substantial edit; would erase 2026-04-29 historical record context | Owner / Doc Maintainer |
| Full rewrite of `QA_HANDOVER_INDEX.md` to reflect current 12-CR scope (vs current pointer-append) | Same | Owner / Doc Maintainer |

**Recommendation:** keep current trackers as historical artifacts + pointer to this Final Acceptance doc. Full rewrites are unnecessary effort; this Final Acceptance doc IS the canonical sprint snapshot.

---

## 14. Final go / no-go recommendation

### 14.1 Decision

> **✅ GO — accept this sprint.**

### 14.2 What's accepted now

- 12 frontend deliveries: `accepted_with_deferred_backend_dependency` (10) + `accepted` (2: A0a + A0b — promoted from `accepted_with_runtime_addendum_pending` on 2026-05-04 Runtime QA Addendum cycle)
- All TD-01..TD-05 tracker drift items: **resolved**
- All 20 backlog items: **catalogued and tracked** (none blocking)
- 1 historical `qa_failed` (CR-004 original 2026-04-29): **closed_no_action — superseded** by P0 2026-05-03

### 14.3 What stays parked

- 9 backend asks (BE-1..BE-W2, BE-A, BE-F): unchanged parked state
- 13 CR/sub-CR/bucket items: unchanged parked state (A3, A4, B3, B4, B2 Phase 2, CR-008 #4 Phase B, CR-008 Sub-CR #3, CR-002, CR-009, CR-010, CR-011, CR-012, CR-013)

### 14.4 Conditions / next steps

1. **A0a + A0b runtime addendum** — append to respective QA reports when preprod (`https://preprod.mygenie.online/`) wakes; no acceptance impact (additive verification only).
2. **Optional baseline enrichments FE-01..FE-03** — recorded; require separate owner approval; non-blocking.
3. **Backend deliveries** — when any of BE-1..BE-W2 / BE-A / BE-F lands, dependent CRs reactivate **individually**, not as a sprint-wide re-run.
4. **Backlog items** — flow into Implementation Agent / Doc Maintainer / Tech-Infra ticket queues per §7 column "Next owner".
5. **CR-002 / CR-009 / CR-010 / CR-011 / CR-012 / CR-013** — stay parked pending owner prioritisation in next sprint planning.

### 14.5 Sprint exit certification

This sprint (2026-04-29 → 2026-05-04, branch `may4`) delivered **12 verifiable frontend behaviours**, preserved every existing baseline rule, parked all unsatisfied backend dependencies cleanly, and catalogued 20 non-blocking backlog items. The QA evidence chain (12 active QA reports + Baseline Reconciliation Report + this Final Acceptance Report) is internally consistent.

**Ready for handover to next sprint planning.**

---

## 15. Strict-rules compliance certification

| Rule | Status |
|---|---|
| No code changed | ✅ |
| No QA run | ✅ |
| No tests run | ✅ |
| No code pulled | ✅ |
| No branch switched | ✅ |
| No new CR started | ✅ |
| No backend-dependent item unparked | ✅ |
| No runtime-blocked item upgraded to fully production-accepted | ✅ — A0a + A0b classified `accepted_with_runtime_addendum_pending` |
| No owner-validated-only item upgraded to QA-passed | ✅ — all 12 accepted items have a current QA report on file |
| No backend field/endpoint baselined | ✅ |
| `/app/memory/final/` not silently overwritten | ✅ — UNTOUCHED |
| Empty folders / missing files declared honestly | ✅ — Baseline Reconciliation §2 + this doc §2 |
| Unclear-status items marked `needs_owner_decision` | ✅ — FE-01..FE-03 |

---

**Report stopping here. No further action. No code touched. No further agent invoked.**

— End of Final Sprint Acceptance + Documentation Sweep —
