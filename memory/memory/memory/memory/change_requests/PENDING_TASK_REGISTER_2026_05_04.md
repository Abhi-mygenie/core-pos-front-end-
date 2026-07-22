# Pending Task Register — 2026-05-04 (post Final Acceptance)

> ## ⚠ 2026-05-05 POST-FINAL-ACCEPTANCE UPDATE — CR-013 Phase 1.5
> **CR-013 row below (previously `parked_owner_decision · "Source doc only" · "Not started"`) is superseded.**
>
> - **New status:** `qa_passed_with_known_print_backend_finding`
> - **QA report:** `/app/memory/change_requests/qa_reports/CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md`
> - **Reconciliation summary:** `/app/memory/change_requests/implementation_summaries/CR_013_TRACKER_RECONCILIATION_SUMMARY_2026_05_05.md`
> - **Newly pending Phase 3 backend asks (kept parked):** BE-G9 (`delivery_charge_gst_amount` persistence + socket echo) · BE-G10 (backend `order-temp-store` print template auto-render confirmation) · BE-G11 (per-component template slots) — see `phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md`.
> - **Owner-decision-pending finding (kept open):** Bean Me Up backend print-template double-count of SC GST — Options A/B/C tabled per `implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md`.
> - **Additive (non-blocking):** owner runtime walk-through on Bean Me Up tenant 742 to close the preview-only UI blocker.
> - The §1.1 backend-asks count "9" is unchanged. The "13 parked CR/sub-CR/bucket items" count drops to 12 (CR-013 leaves the parked register).

**Agent:** Pending Task Discovery Agent
**Date:** 2026-05-04
**Branch:** `may4`
**Scope:** Post-sprint pending items, parked items, backend-blocked items, runtime addenda, backlog, documentation cleanup, and owner-decision items.
**Source-of-truth predecessors:**
- `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` (authoritative sprint exit)
- `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `/app/memory/change_requests/qa_reports/QA_REPORT_INDEX.md`
- `/app/memory/change_requests/qa_handover/QA_HANDOVER_INDEX.md`
- `/app/memory/change_requests/SESSION_TRACKER.md`
- Full contents of `impact_analysis/`, `implementation_handover/`, `implementation_summaries/`, `qa_handover/`, `qa_reports/`, and 13 CR source docs (`CR_001..CR_013`) + 2 BE-asks consolidations
- FO-B1-01 closure docs (plan + QA report + implementation summary — confirmed closed 2026-05-04)

This document performs no writes on other trackers, no unparking, no code changes. It is a **read-only discovery deliverable** that enumerates every pending or deferred item and classifies it for the next execution cycle.

---

## 1. Executive summary

Post-sprint (2026-04-29 → 2026-05-04, branch `may4`) the codebase is in a **cleanly-accepted state** with 12 frontend deliveries: `accepted_with_deferred_backend_dependency` (10) + `accepted` (2: A0a + A0b, promoted from `accepted_with_runtime_addendum_pending` on 2026-05-04 Runtime QA Addendum cycle). FO-B1-01 was closed as a resolved follow-up 2026-05-04 and its runtime addendum PASSED on the same cycle (moved to plain `qa_passed`).

### 1.1 Pending-item counts (by category)

| Category | Count | Notes |
|---|---|---|
| Backend contract / backend ask (`BE-*`) | **9** | BE-1, BE-2, BE-T, BE-U, BE-V, BE-W, BE-W2, BE-A, BE-F — none delivered |
| Parked frontend CR / sub-CR / bucket | **13** | A3, A4, B3, B4, B2 Phase 2, CR-008 Sub-CR #3, CR-008 #4 Phase B, CR-002, CR-009, CR-010, CR-011, CR-012, CR-013 |
| Runtime addendum pending (additive only) | **3** | A0a, A0b, FO-B1-01 |
| Backlog follow-up (non-blocking) | **19** | See §4 / §7 Final Acceptance doc (FO-B1-01 moved out of backlog → resolved follow-up) |
| Documentation-only cleanup | **3** | DOC-B2-01, DOC-A0a-01, optional pointer-update work on `SESSION_TRACKER.md` + `QA_HANDOVER_INDEX.md` |
| Owner decision needed | **3** | FE-01, FE-02, FE-03 (optional baseline enrichments — not corrective) |
| Closed / no action | **2** | TD-01..TD-05 tracker drift (resolved this run) + CR-004 historical `qa_failed` (superseded) |
| Already resolved (not pending) | — | FO-B1-01 (resolved follow-up, runtime addendum listed separately) |

### 1.2 Headline verdict

- **No item is on fire.** Zero current `qa_failed`. Sprint exit certified.
- **9 backend asks** are the largest pending block; nothing else can be unparked without them for B2 Phase 2, CR-008 #4 Phase B, B3, CR-009, CR-011.
- **3 runtime addenda** (A0a, A0b, FO-B1-01) are **additive only** — no acceptance gate; fire-and-forget when preprod (`https://preprod.mygenie.online/`) wakes.
- **CR-002, CR-008 Sub-CR #3, CR-009, CR-010, CR-011, CR-012, CR-013** (7 items) are parked pending owner prioritisation / backend roadmap and are **not safe to start** without fresh owner planning.
- **A3, A4, B4** are owner-declined; **B3** is backend-blocked; none unpark without owner action.
- **Safe to start now** (no gate): DOC-B2-01 doc cleanup, DOC-A0a-01 doc cleanup, the 4 A0a cosmetic sibling tickets (CSV-A0a-01, DETAIL-A0a-01, FILTER-A0a-01), TEST-INFRA-001 test-infra wiring, CR-001 exports alignment — all non-blocking backlog.

---

## 2. Files inspected

### 2.1 Sprint-exit source-of-truth docs
- `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` (430 lines) — §1 counts, §3 sprint inventory, §3.3 parked register, §3.4 BE list, §4 accepted list, §5 owner-decision, §6 parked register, §7 backlog register (19 live + FO-B1-01 resolved), §11 optional baseline enrichments, §12 tracker updates performed, §14 go/no-go
- `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` (550 lines) — §4.2 parked register, §4.3 9 BE asks, §6 surface reconciliation, §9 documentation drift list, §11 enrichment proposals
- `/app/memory/change_requests/qa_reports/QA_REPORT_INDEX.md` — 12 QA reports indexed; FO-B1-01 row marked resolved-follow-up 2026-05-04 with implementation-summary pointer; 9 backend-blocked rows; 3 not-testable rows
- `/app/memory/change_requests/qa_handover/QA_HANDOVER_INDEX.md` — original 3-CR bundle + appended pointer to current Final Acceptance
- `/app/memory/change_requests/SESSION_TRACKER.md` — pre-sprint snapshot + appended pointer

### 2.2 Supporting folders (full listings verified)
- `/app/memory/change_requests/impact_analysis/` — 4 files (CR-001, CR-003, CR-004, FO-B1-01)
- `/app/memory/change_requests/implementation_handover/` — 16 files
- `/app/memory/change_requests/implementation_summaries/` — 4 files (CR-001, CR-003, CR-004, FO-B1-01)
- `/app/memory/change_requests/qa_handover/` — 5 files
- `/app/memory/change_requests/qa_reports/` — 14 QA docs + index + next-agent handover

### 2.3 CR source docs and BE consolidations
- `CR_001..CR_013` source docs (13 files)
- `BE_1_BACKEND_ASKS_CONSOLIDATED.md`, `BE_2_LODGING_PAYMENT_BREAKDOWN.md`
- `CR_QA_CONSOLIDATION_AND_CLASH_MATRIX_2026_05_03.md`
- `CR_004_BACKEND_EXT_sub_cr.md`, `CR_004_PHASE2_*.md`, `CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md`, etc.

### 2.4 Root-level handovers
- `BUG_CANCEL_DERIVATION_HANDOVER.md`, `BUG_TEMPLATE.md`
- `UI_COD_MASK_HANDOVER.md`, `ROLE_NAME_WIRE_FIX_HANDOVER.md`
- `SESSION_HANDOVER_2026_05_03.md`
- `DEPLOYMENT_HANDOVER_*.md` (deployment artifacts — out of sprint-acceptance scope)
- `PRD.md` (deployment artifact — out of sprint scope)

---

## 3. Full pending-task table

| ID | Title | Category | Current status | Source doc | Blocker | Backend dep | Runtime dep | Owner decision | Suggested next agent | Priority | Safe to start now? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **BE-1** | P1–P6 + G1 — `waiter_name`, `*_by_id`/`*_by_name`, `cancel_reason`, `cancel_type`, `table_no`, `room_info`, `transferToRoom` settlement signal | Backend contract | `parked_backend_dependency` | Final Accept §3.4 #26; `BE_1_BACKEND_ASKS_CONSOLIDATED.md`; CR-001 source | Backend not delivered | Yes (self) | — | — | Backend Contract Agent | HIGH (gates CR-001 cell-level UX) | ❌ — backend first |
| **BE-2** | Lodging payment breakdown — CR-004 + adjacencies | Backend contract | `parked_backend_dependency` | Final Accept §3.4 #27; `BE_2_LODGING_PAYMENT_BREAKDOWN.md` | Backend not delivered | Yes (self) | — | — | Backend Contract Agent | MEDIUM | ❌ — backend first |
| **BE-T** | CR-004 P2 dependencies (G2/G3/OPT) | Backend contract | `parked_backend_dependency` | Final Accept §3.4 #28; `CR_004_BACKEND_EXT_sub_cr.md` | Backend not delivered | Yes (self) | — | — | Backend Contract Agent | MEDIUM | ❌ — backend first |
| **BE-U** | CR-005 Phase A web-order attribution | Backend contract | `parked_backend_dependency` | Final Accept §3.4 #29; CR-005 source | Backend not delivered | Yes (self) | — | — | Backend Contract Agent | LOW | ❌ — backend first |
| **BE-V** | B3 authoritative item-level `cancel_by_name` | Backend contract | `parked_backend_dependency` | Final Accept §3.4 #30; A0b P8 §11 | Backend not delivered | Yes (self) | — | — | Backend Contract Agent | MEDIUM (gates B3) | ❌ — backend first |
| **BE-W** | Per-item paid-stage fields | Backend contract | `parked_backend_dependency` | Final Accept §3.4 #31 | Backend not delivered | Yes (self) | — | — | Backend Contract Agent | MEDIUM | ❌ — backend first |
| **BE-W2** | `snapshot_razorpay_status` → gates B2 Phase 2 | Backend contract | `parked_backend_dependency` | Final Accept §3.4 #32; CR-005 P4 | Backend not delivered | Yes (self) | — | — | Backend Contract Agent | HIGH (gates B2 Phase 2 auto-reveal) | ❌ — backend first |
| **BE-A** | CR-011 PG scan lifecycle | Backend contract | `parked_backend_dependency` | Final Accept §3.4 #33; CR-011 source | Backend not delivered | Yes (self) | — | — | Backend Contract Agent | LOW | ❌ — backend first |
| **BE-F** | `default_landing_screen` server-side setting → gates CR-008 #4 Phase B | Backend contract | `parked_backend_dependency` | Final Accept §3.4 #34; CR-008 D1 P6 §11 | Backend not delivered | Yes (self) | — | — | Backend Contract Agent | HIGH (gates CR-008 Phase B; P1 + P6 closed, BE-F is sole remaining gate) | ❌ — backend first |
| **A3** | Bucket A3 | Parked FE CR (owner-declined) | `parked_owner_decision` | Final Accept §6.2; `CR_BUCKETS_A3_A4_PARKED_HANDOVER.md` | Owner declined | — | — | Yes — owner re-approval required | New CR Planning Agent (only if owner re-opens) | LOW | ❌ — owner declined |
| **A4** | Bucket A4 | Parked FE CR (owner-declined) | `parked_owner_decision` | Final Accept §6.2; `CR_BUCKETS_A3_A4_PARKED_HANDOVER.md` | Owner declined | — | — | Yes — owner re-approval required | New CR Planning Agent (only if owner re-opens) | LOW | ❌ — owner declined |
| **B3** | Item-level `cancel_by_name` | Parked FE bucket (backend-blocked) | `parked_backend_dependency` | Final Accept §6.2; A0b P8 §11 | BE-V | BE-V | — | — | Small Frontend Implementation Agent (after BE-V) | MEDIUM | ❌ — BE-V first |
| **B4** | Bucket B4 | Parked FE bucket (by-design) | `parked_owner_decision` (by-design) | Final Accept §6.2 | Owner declined | — | — | Yes | New CR Planning Agent (only if owner re-opens) | LOW | ❌ — owner declined |
| **B2 Phase 2** | PG Status auto-reveal | Parked FE sub-bucket (backend-blocked) | `qa_blocked_backend_dependency` | Final Accept §6.2; CR-005 P4 | BE-W2 | BE-W2 | — | — | Small Frontend Implementation Agent (after BE-W2) | HIGH | ❌ — BE-W2 first |
| **CR-008 Sub-CR #3** | Delivery dispatch/assign endpoints | Parked FE sub-CR (backend roadmap) | `parked_backend_dependency` | `CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md` | Backend roadmap item | Yes (unspecified BE) | — | Yes — prioritisation | Backend Contract Agent → then New CR Planning Agent | LOW | ❌ — backend roadmap first |
| **CR-008 #4 Phase B** | Server-side `default_landing_screen` persistence | Parked FE sub-CR phase | `qa_blocked_backend_dependency` | CR-008 D1 P6 §11 | BE-F | BE-F | — | — | Small Frontend Implementation Agent (after BE-F) with dual-read/migration plan | HIGH | ❌ — BE-F first |
| **CR-002** | Unify status and tab logic | Parked CR (not started) | `parked_owner_decision` | `CR_002_unify_status_and_tab_logic.md`; Final Accept §3.3 #20 | Owner prioritisation | Possibly | — | Yes | New CR Planning Agent | MEDIUM | ❌ — needs owner prioritisation |
| **CR-009** | Operations Audit Timeline | Parked CR (not started; backend-heavy) | `parked_backend_dependency` | `CR_009_OPERATIONS_AUDIT_TIMELINE.md`; Final Accept §3.3 #21 | Backend | Yes | — | Yes — prioritisation | Backend Contract Agent → New CR Planning Agent | LOW | ❌ — backend + owner first |
| **CR-010** | Roles & Permissions Consolidation | Parked CR (not started) | `parked_owner_decision` | `CR_010_ROLES_AND_PERMISSIONS_CONSOLIDATION.md`; Final Accept §3.3 #22 | Owner prioritisation; captures Q-RP-03, Q-RP-05, D-A0b-3 | Partially | — | Yes | New CR Planning Agent | MEDIUM | ❌ — needs owner prioritisation |
| **CR-011** | PG scan / Serve / paymentType case mismatch | **Closed 2026-05-12 — superseded by BUG-036 smoke pass** | `closed_resolved` | `CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md`; `bugs/BUG_036_SMOKE_SIGNOFF.md` | — | — | — | — | — | — | ✅ — closed via owner smoke confirmation 2026-05-12 (BUG-036). CR-011 was the tracking CR for the case-mismatch hypothesis behind BUG-036; once BUG-036 smoke passed on preprod, the CR is closed by absorption. BE-A canonicalisation is no longer blocking. |
| **CR-012** | Big Buddha filling MAX label mismatch | Parked CR (not started) | `parked_owner_decision` | `CR_012_BIG_BUDDHA_FILLING_MAX_LABEL_MISMATCH.md` | Owner prioritisation | TBD | — | Yes | New CR Planning Agent | LOW | ❌ — needs owner prioritisation |
| **CR-013** | GST config correction (Phase 1.5 D-GST-3 + D-GST-4 + Fix-1 + Fix-2 + CR-008 Round-3) | **Phase 1.5 SHIPPED 2026-05-05; runtime QA passed with known backend print finding** | `qa_passed_with_known_print_backend_finding` (was `parked_owner_decision` on 2026-05-04 — see top-of-file 2026-05-05 update) | `CR_013_GST_CONFIG_CORRECTION.md`; `requirements/CR_013_FROZEN_BUSINESS_LOGIC.md`; `implementation_plans/CR_013_IMPLEMENTATION_PLAN.md`; `implementation_summaries/CR_013_PHASE_1_5_DGST3_DGST4_SUMMARY.md`; **`qa_reports/CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md`**; `implementation_summaries/CR_013_TRACKER_RECONCILIATION_SUMMARY_2026_05_05.md` | Phase 3 backend asks BE-G9 / BE-G10 / BE-G11 (parked); Bean Me Up backend print-template double-count owner decision (Options A/B/C, pending) | Backend (BE-G9/G10/G11) | — | Yes — owner Options A/B/C on print-template double-count + optional owner walk-through on tenant 742 | Backend Contract Agent (BE-G9/G10/G11) → New CR Planning Agent (post-Phase-3) | LOW | ✅ — FE accepted with known backend finding; Phase 3 backend + owner decision deferred |
| **A0a runtime addendum** | Preprod manual smoke per A0a handover §14 — display short-circuit visual verification | **Runtime addendum PASSED 2026-05-04** (live wire corpus + display-layer static re-verification) | `closed_resolved` | A0a P7 QA report §10; Final Accept §4.2 #1; **`qa_reports/RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md`** | — | — | — | — | — | — | ✅ — closed. 12 of 15 live running-orders on preprod tenant 541 carry `payment_method: "cash_on_delivery"` on the wire; UI mask-to-`—` fix verified at all 5 display points (audit table, CSV export, PDF export, OrderDetailSheet, filter). Interactive audit-table visual walk deferred as additive-only (preview-harness did not auto-route past station loader — see `UX-LOADING-02`). |
| **A0b runtime addendum** | DevTools Network sweep across 6 wire consumers | **Runtime addendum PASSED 2026-05-04** (live backend wire-contract proof — strongest possible evidence) | `closed_resolved` | A0b P8 QA report §12; Final Accept §4.2 #2; **`qa_reports/RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md`** | — | — | — | — | — | — | ✅ — closed. Direct preprod API verification with Palm House owner token: `role_name=Manager` (A0b canonical) → HTTP 200, **15 orders**; `role_name=Owner` (pre-fix display-only value) → HTTP 200, **only 3 orders** (materially incomplete). Fix is load-bearing on live preprod. All 4 role_name variants (Manager, Owner, Waiter, none) tested. |
| **FO-B1-01 runtime addendum** | ~5-minute preprod walk (RB-01..RB-11) for multi-select variant cart-line display | **Runtime addendum PASSED 2026-05-04** (static + API corpus + untouched-surface review) | `closed_resolved` | FO-B1-01 QA report §7; Summary "Runtime addendum — pending"; **`qa_reports/RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md`** | — | — | — | — | — | — | ✅ — closed. Menu corpus confirmed live on preprod tenant 541 (`Big Buddha Burger (V)` with 7-option multi-select variant). Helper contract green (20/20 unit tests); payload shape green (17/17 unit tests, NS-3C-9); untouched-surface review green. Interactive OrderEntry walk (RF-04 / RB-01..RB-11) deferred as additive-only (same preview-harness routing constraint as A0a). |
| **DOC-B2-01** | CR-005 #1 / B2-split handover prose references `snapshot_razorpay_amount`; shipped code reads `payment_amount` | Documentation cleanup | `backlog_follow_up` (doc drift) | Final Accept §7 row 2; Baseline Reconciliation §9.5; CR-005 P4 | — | — | — | — | Documentation Cleanup Agent | LOW | ✅ — safe |
| **DOC-A0a-01** | A0a handover §14 step 6 wording vs pre-existing `PAID_ACTIONS_ALLOWED_METHODS = ['cash','card','upi']` eligibility | Documentation cleanup | `backlog_follow_up` (doc drift) | Final Accept §7 row 3; A0a P7 | — | — | — | — | Documentation Cleanup Agent | LOW | ✅ — safe |
| **CSV-A0a-01** | CSV export at `ExportButtons.jsx:193` still emits raw `cash_on_delivery` (cosmetic asymmetry to audit-table UI mask) | Backlog follow-up (FE cosmetic) | `backlog_follow_up` | Final Accept §7 row 4; A0a P7 §12 bullet 3 | — | — | — | — | Small Frontend Implementation Agent (cosmetic) | LOW | ✅ — safe (explicitly deferred sibling ticket) |
| **DETAIL-A0a-01** | OrderDetailSheet drill-down still maps `cash_on_delivery → 'CASH'` via `formatPaymentMethod` | Backlog follow-up (FE cosmetic) | `backlog_follow_up` | Final Accept §7 row 5; A0a P7 §12 bullet 2 | — | — | — | — | Small Frontend Implementation Agent | LOW | ✅ — safe |
| **FILTER-A0a-01** | `reportTransform.extractPaymentMethods` may still surface `cash_on_delivery` in filter dropdown | Backlog follow-up (FE cosmetic) | `backlog_follow_up` | Final Accept §7 row 6; A0a P7 §12 bullet 1 | — | — | — | — | Small Frontend Implementation Agent | LOW | ✅ — safe |
| **TEST-INFRA-001** | `@testing-library/react` + `jest-dom` not wired on this branch | Backlog (test-infra gap) — **RESOLVED 2026-05-04 via Batch 3C** | `closed_resolved` | Final Accept §7 row 7; A0a P7 + A0b P8; Batch 3C summary | — | — | — | — | — | — | ✅ — closed |
| **CR-010-RP-03** | `OrderContext.refreshOrders(roleName='Manager')` default still uses `'Manager'` literal | Backlog (pre-existing) | `backlog_follow_up` (pre-existing; explicit deferral) | Final Accept §7 row 8; A0b P8; CR-010 §4 Q-RP-03 | — | — | — | Yes (via CR-010 planning) | Future CR-010 implementation | LOW | ❌ — gated on CR-010 owner prioritisation |
| **CR-010-RP-05** | Waiter-role wire test not exercised on preprod | Backlog (coverage gap) | `backlog_follow_up` | Final Accept §7 row 9; A0b P8 | — | — | Preprod | — | Runtime QA Addendum Agent (can piggyback on A0b addendum) | LOW | ⏸ — piggyback with A0b |
| **D-A0b-3** | `stationService.js:185` `formData.append('role_name', stationName)` left untouched per owner decline | Backlog (by-design) | `backlog_follow_up` (by-design deferral) | Final Accept §7 row 10; A0b + CR-010 §7 | Owner declined this specific edit | — | — | Yes (only via future CR-010) | Future CR-010 implementation | LOW | ❌ — owner-declined inside CR-010 |
| **BUG-PREPAID-MERGE-SHIFT** | Merge/Shift hidden on prepaid at OrderCard + OrderEntry layers | Closed — fixed | `closed_fixed` | Final Accept §7 row 11; A2 P5 | — | — | — | — | — | — | ✅ — already closed |
| **TD-01..TD-05** | QA_REPORT_INDEX tracker drift items | Closed — resolved this run | `resolved` | Final Accept §7 rows 12-16; §12 | — | — | — | — | — | — | ✅ — already resolved |
| **CR-001 / Exports** | `ExportButtons.jsx` CSV has 9 columns vs handover's 8; summary row 1 column off | Backlog (pre-existing cosmetic) | `backlog_follow_up` | Final Accept §7 row 17 | — | — | — | — | Small Frontend Implementation Agent | LOW | ✅ — safe |
| **Retained diagnostics** | `[CR-001 DIAG]`, `[CR-001 P2 DIAG]`, `[CR-001 G5 DIAG]`, `[CR-003 DIAGNOSTIC]`, `[CR-004 P2 DIAG]` — console logs | Backlog (intentional retention) | `backlog_follow_up` (intentional) | Final Accept §7 row 18 | Pending BE-1 delivery / permission-matrix confirmation | BE-1 | — | — | Small Frontend Implementation Agent (remove when BE-1 lands) | LOW | ❌ — tied to BE-1 timing |
| **CR-004 / Visual** | Missing-`room_info` shown via `—` placeholders instead of explicit warning badge | Backlog (cosmetic, owner-decision) | `backlog_follow_up` (cosmetic) | Final Accept §7 row 19; P2 report | — | — | — | Yes — cosmetic owner call | Owner → Small Frontend Implementation Agent | LOW | ❌ — needs owner visual call |
| **CR-004 / Scope (orphan-SRM)** | Orphan-SRM fallback grouping in QA handover not literally implemented | Backlog (spec drift) | `backlog_follow_up` | Final Accept §7 row 20; P2 report | — | — | — | Maybe | Small Frontend Implementation Agent (future CR-004 patch) | LOW | ⚠ — low-urgency; orphan SRMs rare |
| **Pre-existing — LoadingPage ESLint** | `LoadingPage.jsx:111 react-hooks/exhaustive-deps` warning | Backlog (pre-existing) | `backlog_follow_up` | Final Accept §7 row 21 | — | — | — | — | Small Frontend Implementation Agent | LOW | ✅ — safe (cosmetic; build not blocked) |
| **Pre-existing — paymentService** | `paymentService.collectPayment()` references missing `API_ENDPOINTS.CLEAR_BILL` | Backlog (pre-existing latent bug) | `backlog_follow_up` | Final Accept §7 row 22 | — | Possibly (API-03 deprecates this path) | — | — | Small Frontend Implementation Agent | LOW | ✅ — safe (dead code path; API-03 supersedes) |
| **Pre-existing — ProtectedRoute** | `ProtectedRoute.test.jsx` test infra gap (tied to TEST-INFRA-001) | Backlog (test-infra) — **RESOLVED 2026-05-04 via Batch 3C** | `closed_resolved` | Final Accept §7 row 23 | TEST-INFRA-001 (closed) | — | — | — | — | — | ✅ — closed (content drift now tracked separately as NS-3C-1) |
| **RAW-FIELD-PROD-FALLBACK-FIX** (NS-3C-4) | Production UI files (`RoomRowCard.jsx` L194/L197/L202 + `RoomOrdersReportPage.jsx` L497) read `._raw.*` fields. Static inspection during the production-fix cycle found these specific accesses were NOT actually dev-gated (`_raw` set UNGATED at `orderTransform.js:268`, `roomListTransform.js:54`, `reportService.js:1177`) — the test rule was enforcing an architectural decoupling, not a runtime gate. **RESOLVED 2026-05-04 via RAW-FIELD-PROD-FALLBACK-FIX cycle** (owner-approved Option a, no transform-contract change). | **`closed_resolved`** — production-fix cycle complete | Final Accept §7 row 27; `implementation_summaries/RAW_FIELD_PROD_FALLBACK_FIX_SUMMARY.md` | — | — | — | — | — | — | ✅ — closed. `rawField.test.js` 3/3 PASS naturally (untouched); full suite 19/19 PASS / 199/199 tests PASS. |
| **FE-01** | Optional: add `mygenie_stay_on_order_after_bill` to `ARCHITECTURE_DECISIONS_FINAL.md` SM-03 illustrative list | Owner decision (baseline enrichment) | `needs_owner_decision` | Final Accept §11 | — | — | — | Yes — owner approval for `/app/memory/final/*` edit | Documentation Cleanup Agent (after owner approves) | LOW | ❌ — needs owner decision |
| **FE-02** | Optional: mark OQ-07 reporting-ownership verification as **closed** | Owner decision (baseline enrichment) | `needs_owner_decision` | Final Accept §11 | — | — | — | Yes | Documentation Cleanup Agent (after owner approves) | LOW | ❌ — needs owner decision |
| **FE-03** | Optional: add CR-008 #4 Phase A example to `MODULE_DECISIONS_FINAL.md` Module 11 change rule | Owner decision (baseline enrichment) | `needs_owner_decision` | Final Accept §11 | — | — | — | Yes | Documentation Cleanup Agent (after owner approves) | LOW | ❌ — needs owner decision |
| **SESSION_TRACKER full rewrite** | Full rewrite to reflect 12-CR sprint (current state: pointer-appended only) | Documentation cleanup (optional) | `needs_owner_decision` | Final Accept §13 | — | — | — | Yes — would erase 2026-04-29 historical context | Documentation Cleanup Agent (after owner approves) | LOW | ❌ — needs owner decision; pointer-append deemed sufficient |
| **QA_HANDOVER_INDEX full rewrite** | Full rewrite to reflect current 12-CR scope (currently pointer-appended only) | Documentation cleanup (optional) | `needs_owner_decision` | Final Accept §13 | — | — | — | Yes | Documentation Cleanup Agent (after owner approves) | LOW | ❌ — needs owner decision; pointer-append deemed sufficient |
| **FO-B1-01** | Multi-select variant cart-line display total after qty +/- | Resolved follow-up (2026-05-04) | **RESOLVED + runtime addendum passed 2026-05-04** — now `qa_passed` (full) | Final Accept §7 row 1; FO-B1-01 QA report + Implementation Summary + `qa_reports/RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md` | — | — | — | — | — | — | ✅ — code fix done; runtime addendum cleared (interactive walk deferred as additive-only) |
| **CR-004 original (2026-04-29)** | Status-filter derivation failure | Historical, superseded | `closed_no_action` (superseded by P0 2026-05-03) | Final Accept §3.1 #3 | — | — | — | — | — | — | ✅ — already closed |

---

## 4. Safe to start now

Items with **zero blocker** that can be picked up by the next agent without backend, runtime, or owner gating. All are **non-blocking** for sprint integrity.

| Priority | ID | Agent type | Est. effort |
|---|---|---|---|
| LOW | **DOC-B2-01** | Documentation Cleanup Agent | 5 min (single-prose edit in CR-005 #1 / B2-split handover) |
| LOW | **DOC-A0a-01** | Documentation Cleanup Agent | 5 min (wording tweak in A0a handover §14) |
| LOW | **CSV-A0a-01** | Small Frontend Implementation Agent | ~30 min (`ExportButtons.jsx:193` mask to `—` for CSV; parity with audit table) |
| LOW | **DETAIL-A0a-01** | Small Frontend Implementation Agent | ~30 min (`formatPaymentMethod` guard to return `—` for `cash_on_delivery`) |
| LOW | **FILTER-A0a-01** | Small Frontend Implementation Agent | ~30 min (`reportTransform.extractPaymentMethods` filter-out of `cash_on_delivery`) |
| MEDIUM | **TEST-INFRA-001** | Test-Infra Agent | ~2–4 hrs (yarn add `@testing-library/react` + `jest-dom`, rebuild, validate `ProtectedRoute.test.jsx` runs) |
| LOW | **CR-001 / Exports** | Small Frontend Implementation Agent | ~20 min (either drop extra `paymentType` CSV column or pad summary row) |
| LOW | **Pre-existing — LoadingPage ESLint** | Small Frontend Implementation Agent | ~5 min (add missing `loadStationData` dep or disable rule inline) |
| LOW | **Pre-existing — paymentService.collectPayment() CLEAR_BILL** | Small Frontend Implementation Agent | ~15 min (remove dead-code reference or align with API-03 `order-temp-store`) |

**Recommendation:** a single ~2-hour Documentation Cleanup + Small Frontend Implementation combined pass can close all 9 items above in one session without QA risk.

---

## 5. Needs backend contract first

These cannot be unparked until the paired backend item lands. **All 9 BE items are currently parked.**

| Frontend item | Blocker BE item | When BE lands → FE work needed |
|---|---|---|
| CR-001 cell-level UX gap (PUNCHED BY, ACTIONED BY, Reason, Cancellation Status, TABLE NO, G1 settlement) | **BE-1** P1–P6 + G1 | FE consumer already ready; removing retained `[CR-001 DIAG]` logs + validating populated cells |
| CR-004 Phase 2 cross-day (G2/G3/OPT) | **BE-T** | `/get-room-list` filter adjustments; `/get-single-order-new` refresh path; inline enrichment optimisation |
| CR-005 Phase A web-order attribution | **BE-U** | Wire attribution fields; potentially new filter/column |
| **B3** item-level `cancel_by_name` | **BE-V** | Replace `Employee #<cancel_by>` fallback at `reportTransform.js:625-626` with authoritative name |
| CR-004 / CR-005 per-item paid-stage enrichments | **BE-W** | Extend report cells; out-of-scope today |
| **B2 Phase 2** (PG Status auto-reveal) | **BE-W2** `snapshot_razorpay_status` | Dormant placeholder already wired — just activate consumer branch |
| **CR-011** PG scan / Serve / paymentType case mismatch | **BE-A** | Canonicalise case handling on affected surfaces |
| **CR-008 #4 Phase B** server-side `default_landing_screen` | **BE-F** | Dual-read/migration from localStorage → server setting per Module 11 rule |
| **CR-009** Operations Audit Timeline | Backend-heavy (implicit BE) | New report surface; CR doc stub only |
| **CR-008 Sub-CR #3** dispatch/assign endpoints | Backend roadmap | New FE action surfaces |
| **Retained diagnostics** (`[CR-001 DIAG]` etc.) | **BE-1** | Remove once BE-1 populates fields |

**Recommendation:** none of these is FE-executable until BE lands. Group them in a single "Backend Contract Agent" intake; prioritise BE-F + BE-W2 + BE-1 (highest FE-dependent surface counts).

---

## 6. Needs runtime addendum only

These are **additive**, not blocking. Acceptance already granted; addenda append to the respective QA reports when preprod wakes.

| ID | Preprod walk required | Addendum target |
|---|---|---|
| **A0a UI-COD-MASK** | Manual smoke per handover §14 (display short-circuit visual verification on every audit tab — Paid / Unpaid / Hold / Running / Cancelled / Credit) | `A0a_UI_COD_MASK_QA_REPORT.md` (append §runtime-addendum) |
| **A0b ROLE-NAME-WIRE-FIX** | DevTools Network sweep across 6 wire consumers (running-orders GET + order-confirm PUT + order-status-update PUT for ready / served / cancel) with Owner vs Waiter accounts | `A0b_ROLE_NAME_WIRE_FIX_QA_REPORT.md` (append §runtime-addendum) + covers **CR-010-RP-05** by piggybacking |
| **FO-B1-01** | ~5-min walk: pick multi-select menu item with ≥1 priced variant; tick 2+ variants; add to cart; qty +/− should preserve correct per-line ₹; DevTools Network confirms `variation_amount` still matches | `FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_QA_REPORT.md` (append §runtime-addendum) |

**Recommendation:** single ~20-minute Runtime QA Addendum Agent session once preprod (`https://preprod.mygenie.online/`) wakes. No FE code impact expected.

---

## 7. Documentation-only cleanup

| ID | File(s) to edit | Nature | Agent |
|---|---|---|---|
| **DOC-B2-01** | `CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md` | Prose edit: `snapshot_razorpay_amount` → `payment_amount` | Documentation Cleanup Agent |
| **DOC-A0a-01** | `CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` §14 step 6 | Wording tweak to align with pre-existing `PAID_ACTIONS_ALLOWED_METHODS` eligibility | Documentation Cleanup Agent |
| **SESSION_TRACKER full rewrite** (optional, owner-gated) | `SESSION_TRACKER.md` | Full rewrite vs pointer-append (FE-01..FE-03 analogue for trackers) | Documentation Cleanup Agent (only if owner approves) |
| **QA_HANDOVER_INDEX full rewrite** (optional, owner-gated) | `QA_HANDOVER_INDEX.md` | Full rewrite vs pointer-append | Documentation Cleanup Agent (only if owner approves) |

**Status:** DOC-B2-01 and DOC-A0a-01 are **safe to start now**; the two "full rewrite" tracker items are owner-gated and currently judged **unnecessary** per Final Accept §13.

---

## 8. Owner-decision list

Items requiring product-owner input before any agent picks them up.

| ID | Decision | Impact if approved | Impact if declined |
|---|---|---|---|
| **FE-01** | Add `mygenie_stay_on_order_after_bill` to SM-03 illustrative list | Informational; rule unchanged | None — SM-04 already covers Phase-1 device-local scope |
| **FE-02** | Mark OQ-07 (reporting-ownership verification) as closed | Closes administrative loop | OD-01 row remains "Closed with future verification note" |
| **FE-03** | Add CR-008 #4 Phase A example to Module 11 change rule | Concretises rule with live example | Existing rule remains correct + complete |
| **CR-004 / Visual (missing-`room_info`)** | Cosmetic: explicit warning badge vs `—` placeholder | New FE badge component (small) | Stays as `—` placeholder |
| **CR-004 / Scope (orphan-SRM)** | Implement orphan-SRM fallback grouping | Spec-compliant grouping for rare case | Stays as current scope (orphan SRMs rare) |
| **A3 / A4 / B4** | Re-open owner-declined buckets | New CR planning cycle | Stay declined |
| **CR-002** | Prioritise "Unify status and tab logic" | New CR execution cycle | Stays parked |
| **CR-008 Sub-CR #3** | Prioritise dispatch/assign endpoints | Backend + FE cycle | Stays on backend roadmap |
| **CR-010** | Prioritise Roles & Permissions consolidation (also unblocks CR-010-RP-03, D-A0b-3) | Major refactor cycle | Stays parked |
| **CR-012** | Prioritise Big Buddha filling MAX label fix | New CR execution cycle | Stays parked |
| **CR-013** | Prioritise GST config correction | New CR execution cycle | Stays parked |
| **D-A0b-3** (inside CR-010) | Reconsider touching `stationService.js:185` | Semantic rename | Stay as by-design |
| **Full rewrite of SESSION_TRACKER / QA_HANDOVER_INDEX** | Rewrite vs pointer-append | Cleaner current-state doc | Pointer-append remains |

---

## 9. Must remain parked

Explicit "DO NOT unpark" list per STRICT RULES + Final Accept §6.3. Reminder: no item below may be treated as accepted baseline behaviour.

- **A3** — owner-declined
- **A4** — owner-declined
- **B4** — owner-declined (by-design)
- **B3** — backend-blocked (BE-V)
- **B2 Phase 2** — backend-blocked (BE-W2)
- **CR-008 Sub-CR #3** — backend roadmap
- **CR-008 #4 Phase B** — backend-blocked (BE-F)
- **CR-002** — owner-prioritisation
- **CR-009** — backend-heavy; not started
- **CR-010** — owner-prioritisation
- **CR-011** — backend-blocked (BE-A)
- **CR-012** — owner-prioritisation
- **CR-013** — owner-prioritisation
- All **9 BE items** (BE-1, BE-2, BE-T, BE-U, BE-V, BE-W, BE-W2, BE-A, BE-F)

---

## 10. Already resolved / no action

| ID | Disposition | Notes |
|---|---|---|
| **FO-B1-01** | Resolved follow-up 2026-05-04 | Runtime addendum separately tracked in §6 |
| **BUG-PREPAID-MERGE-SHIFT** | Closed-fixed | Layer 1 + layer 2 defence verified in CR-007 A2 (P5) |
| **TD-01..TD-05** | Resolved 2026-05-04 | QA_REPORT_INDEX cleaned during Final Acceptance run |
| **CR-004 original (2026-04-29) `qa_failed`** | Closed — superseded | P0 re-validation 2026-05-03 |
| **12 sprint-accepted items** (CR-001, CR-003, CR-004 Phase 1 + 2 A/B/C, CR-005 #1 / B2-split Phase 1, CR-006 A1+B1, CR-007 / A2.1+A2.2+A2.3, CR-008 Sub-CR #1, CR-008 #4 Phase A / D1, A0a, A0b) | `accepted_with_deferred_backend_dependency` (10) + `accepted` (2: A0a, A0b — promoted 2026-05-04) | Zero current `qa_failed` |

---

## 11. Recommended next execution order

Grouped by agent type. Within each group, items are listed in recommended execution sequence. **This is a plan, not an instruction to start work.**

### 11.1 Documentation Cleanup Agent — **safe to start immediately**
1. **DOC-B2-01** — fix `snapshot_razorpay_amount` → `payment_amount` in CR-005 #1 / B2-split handover prose
2. **DOC-A0a-01** — align A0a handover §14 step 6 wording with pre-existing `PAID_ACTIONS_ALLOWED_METHODS` eligibility
3. (Optional, owner-gated) FE-01, FE-02, FE-03 baseline enrichments in `/app/memory/final/*` — require explicit owner approval
4. (Optional, owner-gated) Full rewrites of `SESSION_TRACKER.md` and `QA_HANDOVER_INDEX.md` — require owner approval; pointer-append currently deemed sufficient

### 11.2 Small Frontend Implementation Agent — **safe to start immediately**
1. **CSV-A0a-01** — mask `cash_on_delivery` to `—` in CSV export (`ExportButtons.jsx:193`) for audit-table parity
2. **DETAIL-A0a-01** — guard `formatPaymentMethod` to return `—` for `cash_on_delivery` in OrderDetailSheet drill-down
3. **FILTER-A0a-01** — filter `cash_on_delivery` out of `reportTransform.extractPaymentMethods` filter dropdown
4. **CR-001 / Exports** — CSV column alignment (drop `paymentType` column OR pad summary row)
5. **Pre-existing — LoadingPage ESLint** — add missing `loadStationData` dep or disable rule inline
6. **Pre-existing — paymentService CLEAR_BILL** — remove dead-code reference or align with API-03 `order-temp-store`

### 11.3 Test-Infra Agent — **safe to start immediately** (cross-bucket prerequisite)
1. **TEST-INFRA-001** — `yarn add --dev @testing-library/react @testing-library/jest-dom`, rebuild, validate `ProtectedRoute.test.jsx` runs
2. Pre-existing — `ProtectedRoute.test.jsx` test-infra gap resolves together

### 11.4 Runtime QA Addendum Agent — **when preprod wakes**
1. **A0a runtime addendum** — per handover §14
2. **A0b runtime addendum** + **CR-010-RP-05 piggyback** — DevTools Network sweep
3. **FO-B1-01 runtime addendum** — ~5-min multi-select variant walk (RB-01..RB-11)

### 11.5 Backend Contract Agent — **requires backend team coordination**
Priority order (highest FE-dependent surface area first):
1. **BE-F** — `default_landing_screen` (gates CR-008 #4 Phase B; P1 + P6 closed)
2. **BE-W2** — `snapshot_razorpay_status` (gates B2 Phase 2)
3. **BE-1** — P1–P6 + G1 (gates CR-001 cell-level UX + retained diagnostics removal)
4. **BE-V** — item-level `cancel_by_name` (gates B3)
5. **BE-T** — CR-004 P2 dependencies (G2/G3/OPT)
6. **BE-W** — per-item paid-stage fields
7. **BE-2** — lodging payment breakdown
8. **BE-U** — CR-005 Phase A web-order attribution
9. **BE-A** — CR-011 PG scan lifecycle

**Suggested coordination:** one Backend Contract Agent intake session to define contracts for all 9; schedule delivery sequencing with backend team.

### 11.6 New CR Planning Agent — **requires owner prioritisation call**
Only start after explicit owner prioritisation of the following candidates (all currently parked):
- CR-010 Roles & Permissions Consolidation (also unparks CR-010-RP-03 + D-A0b-3)
- CR-002 Unify status and tab logic
- CR-012 Big Buddha filling MAX label mismatch
- CR-013 GST config correction
- CR-009 Operations Audit Timeline (backend-heavy; pair with Backend Contract Agent)
- CR-008 Sub-CR #3 dispatch/assign endpoints (backend-heavy)
- Re-evaluation of A3 / A4 / B4 (only if owner wishes to re-open)

### 11.7 Suggested first-pass combined session (~2 hours, zero blockers)
Combine §11.1 items 1-2 + §11.2 items 1-6 + §11.3 item 1 in a single agent session. Net outcome: 9 backlog items closed, test infra wired, cosmetic A0a siblings resolved — no backend or owner dependency, no runtime addendum required.

### 11.8 Suggested second-pass (~20 minutes, preprod-gated)
Runtime QA Addendum Agent across A0a + A0b + FO-B1-01 once preprod wakes.

### 11.9 Suggested third-pass (owner-gated)
Owner call on: backend prioritisation (§11.5), CR prioritisation (§11.6), optional baseline enrichments FE-01..FE-03 (§8).

---

## 12. Strict-rules compliance certification

| Rule | Status |
|---|---|
| No code changed | ✅ |
| No source-code edit | ✅ |
| No tracker rewrite | ✅ — only this new pending register created |
| No item unparked | ✅ |
| No item marked resolved without prior doc proof | ✅ — only FO-B1-01, BUG-PREPAID-MERGE-SHIFT, TD-01..TD-05, CR-004 original (all documented) |
| Unclear-status items flagged `needs_owner_decision` | ✅ — FE-01..FE-03, CR-002, CR-010, CR-012, CR-013, A3/A4/B4 re-open, CR-004 visual, full tracker rewrites |
| No QA run | ✅ |
| No tests run | ✅ |
| No branch switched | ✅ |
| No code pulled | ✅ |
| No new CR started | ✅ |

---

## 13. Handover pointers for the next agent

- **Safest first move:** pick the combined cleanup pass described in §11.7 — closes 9 backlog items in one ~2-hour window with zero risk.
- **Highest leverage:** coordinate with backend team on **BE-F** and **BE-W2** first — each unblocks a full FE sub-CR phase already wired to a dormant placeholder.
- **When preprod wakes:** trigger §11.8 immediately; all three runtime addenda are additive and collectively take ~20 minutes.
- **Before starting any CR-002/CR-009/CR-010/CR-011/CR-012/CR-013 work:** must obtain owner prioritisation call first (§11.6).
- **Do NOT** treat any parked item as baseline; do NOT silently edit `/app/memory/final/*`; FE-01..FE-03 are proposals only.

— End of Pending Task Register —
