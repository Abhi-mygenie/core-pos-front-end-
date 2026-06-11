# Pending Work Bucketing + Next Actions — 2026-05-06

**Type:** Read-only audit + bucketing. NO code, NO QA, NO tracker rewrite, NO unparking, NO `/app/memory/final/` edit, NO CR start.
**Agent:** Master Pending Work Audit + Bucketing Agent
**Date:** 2026-05-06
**Branch:** `6-may` (cloned to `/app` 2026-05-05; FE source-of-truth equivalent to `5may` HEAD `5b85c2c`)
**Predecessors anchored:**
- `PENDING_TASK_REGISTER_2026_05_04.md` (post-final-acceptance, with 2026-05-05 update banner re CR-013)
- `BACKEND_BLOCKER_VERIFICATION_2026_05_05.md` (no-unpark verdict)
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` (CR-009 → `ready_to_plan`; CR-008 Sub-CR #3 schema half → `ready_for_fe_impact_analysis`)
- `CR_013_STATUS_AUDIT_2026_05_05.md` + `qa_reports/CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md` + `implementation_summaries/CR_013_TRACKER_RECONCILIATION_SUMMARY_2026_05_05.md`
- `phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md` + `phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md` + `phase_3/UX_LOADING_02_VISIBLE_STATION_PROGRESS.md`
- `implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` + `BASELINE_RECONCILIATION_REPORT_2026_05_04.md` + `HYGIENE_AND_TEST_CLEANUP_FINAL_CLOSURE_2026_05_04.md` + `SESSION_HANDOVER_2026_05_04_HYGIENE_AND_PHASE3.md`
- `qa_reports/QA_REPORT_INDEX.md`

---

## 1. Executive summary

> **Verdict:** Exactly **one item** can move forward into FE planning today (**CR-009** → `ready_to_plan` per the 2026-05-06 Backend Field Unpark Decision). **One Phase 3 CR** (UX-LOADING-02) is ready to plan but is gated on owner option pick. **One customer-visible burning issue** (Bean Me Up backend print double-count of SC GST) remains open and is owner-decision-pending — it is the single highest-priority parallel track. Everything else is parked on backend confirmation, backend-missing, or owner prioritisation.

### 1.1 One-page count
| Bucket | Count | Notes |
|---|---|---|
| **A — Ready to plan now** | 1 | CR-009 Operations Audit Timeline |
| **B — Owner decision required** | 7 | Bean Me Up Options A/B/C/D · UX-LOADING-02 (A1/A2/A3 + B1/B2/B3) · CR-002 / CR-010 / CR-012 prioritisation · A3/A4/B4 re-open · CR-004 visual badge · FE-01/FE-02/FE-03 baseline enrichments |
| **C — Backend confirmation required** | 8 | CR-013 BE-G7/G8/G10/G11 (print template + Total formulas) · `payload_total_gst_tax_amount` semantics · BE-V/BE-W item-level fields (cohort) · BE-T/BE-U/BE-W/BE-A unknown shipment status · `order_dispatch_status` enum · `station_order_status` enum |
| **D — Backend missing / keep parked** | 5 | BE-G9 `delivery_charge_gst_amount` · BE-W2 `snapshot_razorpay_status` (schema present, all-null) · BE-1 order-level `cancel_by_name` / `merge_by_name` · BE-2 `room_info.discount_amount` / `discount_reason` · BE-V item-level `cancel_by_name` |
| **E — Backend endpoint contract required** | 1 | CR-008 Sub-CR #3 dispatch/assign POST/PATCH endpoints (schema half ready) |
| **F — Safe small FE/doc cleanup** | 2 | DOC-B2-01 prose drift · DOC-A0a-01 wording tweak (4 cosmetic A0a siblings + LoadingPage ESLint + paymentService CLEAR_BILL + CR-001 exports col-count are already listed in PENDING_TASK_REGISTER §11.7 — re-classified here as "still pending and safe") |
| **G — Runtime/additive validation** | 1 | CR-013 Bean Me Up owner visual walk on tenant 742 (additive — not a blocker for the existing `qa_passed_with_known_print_backend_finding` verdict) |
| **H — Do not touch / closed / already resolved** | 12 | A0a / A0b / FO-B1-01 runtime addenda (PASSED 2026-05-04) · TD-01..TD-05 · TEST-INFRA-001 · NS-3C-* · BUG-PREPAID-MERGE-SHIFT · RAW-FIELD-PROD-FALLBACK-FIX · CR-004 original (2026-04-29) · 12 sprint-accepted CRs · CR-013 Phase 1.5 main (FE-side) |

### 1.2 Headline verdict

- **No item is on fire on the FE side.** Zero current `qa_failed`. CR-013 Phase 1.5 carries `qa_passed_with_known_print_backend_finding`.
- **One customer-visible production bug remains open:** Bean Me Up backend print-template asymmetric double-count of SC GST. **Backend + owner-decision pending in parallel** (Options A/B/C/D — `decision_pending_owner`). Symmetric latent exposure on Tip GST + delivery GST (untested).
- **CR-009 `operations[]` block is data-ready** on the wire (13 enums, 50 sub-keys, 9/13 rows non-null on tenant 675). Zero FE references. Safe to plan; do **not** start implementation.
- **CR-008 Sub-CR #3 schema half** is partly observable (`order_dispatch_status` populated; companion fields documented but not in the 13-row sample). **Endpoint contract for dispatch/assign is missing** → keep parked on the action half.
- **B2 Phase 2 / BE-W2** stays parked: schema is present (7 `snapshot_*` keys per row) but `null` on every row in the 2026-05-06 cohort. FE auto-reveal is dormant and will fire automatically the moment any row populates → no FE pre-flight work needed.
- **All 9 original BE-* + 5 CR-013 BE-G* asks** remain parked. Net **14 backend asks open**.

---

## 2. Files inspected

### 2.1 Required-read (per task spec)
- `/app/memory/final/*` — **NOT opened** (strict-rule scope honoured)
- `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` ✅
- `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` ✅ (consulted via PENDING_TASK_REGISTER pointer)
- `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` ✅ (incl. 2026-05-05 banner)
- `/app/memory/change_requests/HYGIENE_AND_TEST_CLEANUP_FINAL_CLOSURE_2026_05_04.md` ✅
- `/app/memory/change_requests/SESSION_HANDOVER_2026_05_04_HYGIENE_AND_PHASE3.md` ✅
- `/app/memory/change_requests/qa_reports/QA_REPORT_INDEX.md` ✅
- `/app/memory/change_requests/CR_013_STATUS_AUDIT_2026_05_05.md` ✅
- `/app/memory/change_requests/qa_reports/CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md` ✅
- `/app/memory/change_requests/implementation_summaries/CR_013_TRACKER_RECONCILIATION_SUMMARY_2026_05_05.md` ✅
- `/app/memory/change_requests/phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md` ✅
- `/app/memory/change_requests/BACKEND_BLOCKER_VERIFICATION_2026_05_05.md` ✅
- `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` ✅

### 2.2 Folder scans
- `impact_analysis/` (7 files) ✅
- `implementation_plans/` (4 files; latest = CR-013) ✅
- `implementation_summaries/` (17 files; latest = CR_013_TRACKER_RECONCILIATION_SUMMARY_2026_05_05) ✅
- `implementation_handover/` (18 files; latest = CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05) ✅
- `qa_handover/` (5 files) ✅
- `qa_reports/` (17 files; latest CR-013 P1.5 runtime QA + 2026-05-04 addenda) ✅
- `phase_3/` (4 files: README, UX-LOADING-02, CR-013 P3 print template, CR-013 print payload truth) ✅
- `requirements/` (2 files: CR-013 frozen logic, owner decision sheet) ✅
- root `change_requests/` (35 files) ✅

### 2.3 Newest documents found this scan
| Date | Doc | Status |
|---|---|---|
| 2026-05-06 | `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | **This is the most recent authoritative classification doc.** This bucketing document defers to it. |
| 2026-05-05 | `BACKEND_BLOCKER_VERIFICATION_2026_05_05.md` | Subordinate to 2026-05-06 doc. |
| 2026-05-05 | `CR_013_STATUS_AUDIT_2026_05_05.md` + `CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md` + `CR_013_TRACKER_RECONCILIATION_SUMMARY_2026_05_05.md` | CR-013 Phase 1.5 closure cycle. |
| 2026-05-05 | `phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md` | Most recent print-truth audit. |
| 2026-05-05 | `implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md` | Owner Options A/B/C/D — `decision_pending_owner`. |
| 2026-05-04 | `phase_3/UX_LOADING_02_VISIBLE_STATION_PROGRESS.md` | Phase 3 CR — `needs_owner_decision` (A1/A2/A3 + B1/B2/B3 picks). |

---

## 3. Complete pending inventory

> Each row carries: ID · title · related CR / bucket · current status · reason pending · source doc · latest evidence · owner decision needed? · backend dependency? · frontend can start? · implementation allowed now? · recommended next agent.

### 3.1 Backend asks (14 total — 9 original BE-* + 5 CR-013 BE-G*)

| ID | Title | Status | Reason pending | Source doc | Latest evidence | Owner decision? | Backend dep? | FE can start? | Impl allowed? | Next agent |
|---|---|---|---|---|---|---|---|---|---|---|
| **BE-1** (P1–P6 + G1) | Order-level `cancel_by_name`, `merge_by_name`, `collect_by_name`, `room_info.discount_amount/reason` (other 7 BE-1 sub-fields confirmed shipping per FE invariant block) | `partial_keep_parked` | Pending half not on wire; FE invariant block (`reportService.js:541-633`) flags `pending_*` keys when null | `BE_1_BACKEND_ASKS_CONSOLIDATED.md`; `BACKEND_BLOCKER_VERIFICATION_2026_05_05.md` §3 | 2026-05-06 cohort: `canceled_by` (ID) populated 4/13; **`cancel_by_name` at order level still missing** | No | Yes (self) | No | No | Backend Contract Agent |
| **BE-2** | Lodging payment breakdown — `room_info.discount_amount` / `discount_reason` | `partial_keep_parked` | Math-derivable subset works; explicit columns missing | `BE_2_LODGING_PAYMENT_BREAKDOWN.md`; `[BE-2 INVARIANT]` block at `reportService.js:600-619` | No room/SRM rows in 2026-05-06 cohort | No | Yes (self) | No | No | Backend Contract Agent |
| **BE-T** | CR-004 P2 dependencies (G2/G3/OPT) | `keep_parked_backend_confirmation_needed` | No on-disk evidence either way | Final Accept §3.4 #28; `CR_004_BACKEND_EXT_sub_cr.md` | None | No | Yes (self) | No | No | Backend Contract Agent |
| **BE-U** | CR-005 Phase A web-order attribution | `keep_parked_backend_confirmation_needed` | Out of `order-logs-report` scope; separate endpoint check needed | CR-005 source | None | No | Yes (self) | No | No | Backend Contract Agent |
| **BE-V** | Item-level authoritative `cancel_by_name` (gates B3) | `keep_parked_backend_confirmation_needed` | Item-level `cancel_by_name` already shipping per 2026-05-01 partial wire; `cancel_reason_text` / `ready_by` / `serve_by` `present_in_schema_not_in_sample` (no cancelled-with-text or paid-with-attribution rows in cohort). FE fallback at `reportTransform.js:625-626` still `Employee #<cancel_by>` for items where `cancel_by_name` null. | A0b P8 §11; `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` §4 | 2026-05-06 cohort confirmed item-level `cancel_by_name` mapped where present; other action attribution unmapped | No | Yes (self) | No | No | Backend Contract Agent (re-run audit on paid-cohort-rich tenant) |
| **BE-W** | Per-item paid-stage fields (`paid_status`, `ready_by`, `serve_by` etc.) | `keep_parked_backend_confirmation_needed` | All `present_in_schema_not_in_sample` in 2026-05-06 cohort | Final Accept §3.4 #31 | None populated in cohort | No | Yes (self) | No | No | Backend Contract Agent |
| **BE-W2** | `snapshot_razorpay_status` + 6 companions (gates B2 Phase 2) | `keep_parked_backend_missing` (functionally) | Schema present (7 keys) but `null` on every row in 2026-05-06 cohort | CR-005 P4; `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` §3.3 | All 13 rows: `snapshot_razorpay_status = null` | No | Yes (self) | No (auto-reveal already wired) | No | Backend Contract Agent + monitoring task |
| **BE-A** | CR-011 PG scan / Serve / paymentType case canonicalisation | `keep_parked_backend_confirmation_needed` | No on-disk evidence | CR-011 source | None | No | Yes (self) | No | No | Backend Contract Agent |
| **BE-F** | Server-side `default_landing_screen` setting (gates CR-008 #4 Phase B) | `keep_parked_backend_missing` | `orderEntryPrefs.js` is localStorage-only; no server setting wired | CR-008 D1 P6 §11 | No setting endpoint exists | No | Yes (self) | No | No | Backend Contract Agent |
| **BE-G7** (CR-013) | Confirm exact backend `payment_amount` printed-Total formula on `BILL_PAYMENT`-paid orders | `keep_parked_backend_confirmation_needed` (5-min triage) | Reverse-engineered formula from one Bean Me Up Order #2 receipt only | `phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md` §3.4; print double-count handover §3.4 | Receipt `Total = 748` matches `subtotal + (gst_tax − service_gst_tax_amount)` | No (BE answer needed first) | Yes | No | No | Backend Contract Agent (triage call) |
| **BE-G8** (CR-013) | Symmetric question for `tip_tax_amount` (Tip GST symmetry) | `keep_parked_backend_confirmation_needed` | No tipped order printed in cited cohort | Same | None | No | Yes | No | No | Backend Contract Agent |
| **BE-G9** (CR-013) | Persist `delivery_charge_gst_amount` column + socket echo | `keep_parked_backend_missing` | Field NOT in schema on 2026-05-06 wire (`delivery_charge_gst` rate ≠ `_amount` ₹) | `phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md`; print double-count handover §1.5 | Owner promise on disk: BE will add. Not yet shipped. | No | Yes | No | No | Backend Contract Agent |
| **BE-G10** (CR-013) | Confirm `order-temp-store` print template auto-render behaviour | `keep_parked_backend_confirmation_needed` (5-min triage) | Receipt CGST/SGST = ₹27.95 each on Bean Me Up Order #2; FE-supplied `cgst_amount` = `sgst_amount` = ₹22.10 — **values do not match** | Same | Strong inference template ignores FE-supplied halves | No (BE answer first) | Yes | No | No | Backend Contract Agent |
| **BE-G11** (CR-013) | Per-component print-template slots (CGST/SGST on SC / Tip / Delivery) | `keep_parked_backend_confirmation_needed` | Template-side concern; not visible from `order-logs-report` curl | Same | No template visibility | No (BE answer first) | Yes | No | No | Backend Contract Agent |

### 3.2 Parked CRs / sub-CRs / buckets (12 total post-CR-013-leaving-the-list)

| ID | Title | Status | Reason | Source doc | Owner decision? | BE dep? | FE start? | Impl allowed? | Next agent |
|---|---|---|---|---|---|---|---|---|---|
| **A3** | Bucket A3 | `parked_owner_decision` (owner-declined) | Owner declined | `CR_BUCKETS_A3_A4_PARKED_HANDOVER.md`; Final Accept §6.2 | Yes (re-open only) | No | No | No | New CR Planning Agent (only if re-opened) |
| **A4** | Bucket A4 | `parked_owner_decision` (owner-declined) | Owner declined | Same | Yes (re-open only) | No | No | No | New CR Planning Agent (only if re-opened) |
| **B3** | Item-level `cancel_by_name` (FE bucket) | `parked_backend_dependency` | Awaiting BE-V item-level | A0b P8 §11 | No | Yes (BE-V) | No | No | Small FE Implementation Agent (after BE-V) |
| **B4** | Bucket B4 | `parked_owner_decision` (by-design) | Owner declined | Final Accept §6.2 | Yes (re-open only) | No | No | No | New CR Planning Agent (only if re-opened) |
| **B2 Phase 2** | PG Status auto-reveal | `qa_blocked_backend_dependency` | Schema present but null-only on wire; auto-reveal dormant | `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` §3.3; `OrderTable.jsx:110` | No | Yes (BE-W2) | No (already wired) | No | Monitoring task; FE auto-activates on first non-null row |
| **CR-008 Sub-CR #3** | Delivery dispatch / assign endpoints | Schema half: `ready_for_fe_impact_analysis` · Endpoint half: `keep_parked_backend_confirmation_needed` · **Combined: `owner_decision_required`** | Schema partly observable; endpoint contract missing | `CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md`; `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` §4 | Yes (prioritisation) | Yes (endpoint half) | Schema half: yes (impact analysis only) | No | Backend Contract Agent → New CR Planning Agent |
| **CR-008 #4 Phase B** | Server-side `default_landing_screen` persistence | `qa_blocked_backend_dependency` | Awaiting BE-F | CR-008 D1 P6 §11 | No | Yes (BE-F) | No | No | Small FE Implementation Agent (after BE-F) |
| **CR-002** | Unify status and tab logic | `parked_owner_decision` | Owner prioritisation needed | `CR_002_unify_status_and_tab_logic.md` | Yes | Possibly | No | No | New CR Planning Agent |
| **CR-009** | Operations Audit Timeline | **`ready_to_plan`** ✅ | `operations[]` block confirmed_present_non_null on 2026-05-06 wire (13 enums, 50 sub-keys, 9/13 rows). FE has zero references. | `CR_009_OPERATIONS_AUDIT_TIMELINE.md`; `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` §3.1 + §4 + §8 | Yes (queue position) | No (data-ready); confirmation on canonical enum list optional | **YES — planning only** | **No (planning before code)** | New CR Planning Agent |
| **CR-010** | Roles & Permissions Consolidation | `parked_owner_decision` | Owner prioritisation; captures Q-RP-03, Q-RP-05, D-A0b-3 | `CR_010_ROLES_AND_PERMISSIONS_CONSOLIDATION.md` | Yes | Partially | No | No | New CR Planning Agent |
| **CR-011** | PG scan / Serve / paymentType case mismatch | `parked_backend_dependency` | Awaiting BE-A | `CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md` | No | Yes (BE-A) | No | No | Backend Contract Agent → Small FE |
| **CR-012** | Big Buddha filling MAX label mismatch | `parked_owner_decision` | Owner prioritisation; FE/BE TBD | `CR_012_BIG_BUDDHA_FILLING_MAX_LABEL_MISMATCH.md` | Yes | TBD | No | No | New CR Planning Agent |

### 3.3 Phase 3 / new-feature pending (1 item)

| ID | Title | Status | Reason | Source doc | Owner decision? | BE dep? | FE start? | Impl allowed? | Next agent |
|---|---|---|---|---|---|---|---|---|---|
| **UX-LOADING-02** | Parallel API loading + visible station-load progress (LoadingPage Phase 1+2) | `needs_owner_decision` (plan ready) | Owner must pick Concern A option (A1/A2/A3) + Concern B option (B1/B2/B3) + ordering (single commit vs split) | `phase_3/UX_LOADING_02_VISIBLE_STATION_PROGRESS.md` | Yes (option pick + go) | No | No (planning is ready; FE impl gated on owner) | No | New CR Planning Agent → Small FE Implementation Agent |

### 3.4 CR-013 owner-decision-pending finding (1 item)

| ID | Title | Status | Reason | Source doc | Owner decision? | BE dep? | FE start? | Impl allowed? | Next agent |
|---|---|---|---|---|---|---|---|---|---|
| **CR-013 Bean Me Up double-count** | Backend print-template double-counts SC GST on display lines while under-counting `payment_amount` Total. Customer-visible bug on every dineIn-with-SC bill on Bean Me Up tenant 742 (and any other tenant with `service_charge_tax > 0` post-Phase-1.5). | `decision_pending_owner` + `keep_parked_backend_missing` | Owner must pick **Option A / B / C / D**. Until owner picks, no FE roll-back; until BE-G7..G11 ship, no BE fix. | `implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md` (Options at L240-291) | **YES (Option pick)** | Yes (BE-G7/G8/G10/G11) | No (Option B = targeted FE rollback when owner picks; Option C = full FE rollback; A = backend-only; D = not recommended) | No | Owner → Small FE Implementation Agent (only after Option pick) |

### 3.5 Runtime / additive validation (1 item)

| ID | Title | Status | Reason | Source doc | Owner decision? | BE dep? | FE start? | Impl allowed? | Next agent |
|---|---|---|---|---|---|---|---|---|---|
| **CR-013 Bean Me Up owner visual walk** | ~10-min owner-anchored interactive walk on tenant 742 — Collect Bill render with discount + round-off + re-print + synthetic mismatch + payload diff in DevTools | Additive runtime addendum (low severity) | Preview was in "Frontend Preview Only" mode during 2026-05-05 QA → headless walk could not auto-route. **Compensated by direct preprod API + line-anchored static guarantees.** Does NOT block the existing `qa_passed_with_known_print_backend_finding` verdict. | QA report §10–§11; tracker reconciliation §8 | No (owner walk-through is optional confirmation) | No | n/a | No | Runtime QA Addendum Agent |

### 3.6 Documentation-only cleanup (2 items still open)

| ID | Title | Status | Reason | Source doc | Owner decision? | BE dep? | FE start? | Impl allowed? | Next agent |
|---|---|---|---|---|---|---|---|---|---|
| **DOC-B2-01** | CR-005 #1 / B2-split handover prose references `snapshot_razorpay_amount`; shipped code reads `payment_amount`. Per Final Accept §7 row 2, this was tagged "Closed — Batch 1 doc cleanup" — but PENDING_TASK_REGISTER §11.1 lists it as still pending. **Status conflict — needs verification.** | `backlog_follow_up` (likely already closed in Batch 1) | Doc drift | Final Accept §7 row 2 (says CLOSED 2026-05-04 via `CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md` §10) vs PENDING_TASK_REGISTER §11.1 (still safe to start) | No | No | **Possibly already closed** | Yes (if open) | Documentation Cleanup Agent (verify first) |
| **DOC-A0a-01** | A0a handover §14 step 6 wording vs pre-existing `PAID_ACTIONS_ALLOWED_METHODS = ['cash','card','upi']` eligibility | `backlog_follow_up` | Wording tweak | Final Accept §7 row 3; PENDING_TASK_REGISTER §11.1 | No | No | Yes | Yes | Documentation Cleanup Agent |

### 3.7 Owner-decision baseline enrichments (3 items)

| ID | Title | Status | Reason | Source doc | Owner decision? | BE dep? | FE start? | Impl allowed? | Next agent |
|---|---|---|---|---|---|---|---|---|---|
| **FE-01** | Add `mygenie_stay_on_order_after_bill` to `ARCHITECTURE_DECISIONS_FINAL.md` SM-03 illustrative list | `needs_owner_decision` | Touches `/app/memory/final/*` → owner approval required | Final Accept §11 | **YES** | No | No | No (touches `final/`) | Documentation Cleanup Agent (owner-gated) |
| **FE-02** | Mark OQ-07 reporting-ownership verification as **closed** | `needs_owner_decision` | Same | Same | YES | No | No | No | Documentation Cleanup Agent (owner-gated) |
| **FE-03** | Add CR-008 #4 Phase A example to `MODULE_DECISIONS_FINAL.md` Module 11 change rule | `needs_owner_decision` | Same | Same | YES | No | No | No | Documentation Cleanup Agent (owner-gated) |

### 3.8 Backlog cosmetic FE items (5 items still open)

| ID | Title | Status | Reason | Source doc | Owner? | BE dep? | FE start? | Impl? | Next agent |
|---|---|---|---|---|---|---|---|---|---|
| **CSV-A0a-01** | CSV export at `ExportButtons.jsx:193` still emits raw `cash_on_delivery` (cosmetic asymmetry) | `backlog_follow_up` | Cosmetic; explicitly deferred sibling | Final Accept §7 row 4 | No | No | Yes | Yes | Small FE Implementation Agent |
| **DETAIL-A0a-01** | OrderDetailSheet maps `cash_on_delivery → 'CASH'` via `formatPaymentMethod` | `backlog_follow_up` | Cosmetic | Final Accept §7 row 5 | No | No | Yes | Yes | Small FE Implementation Agent |
| **FILTER-A0a-01** | `reportTransform.extractPaymentMethods` may surface `cash_on_delivery` in filter dropdown | `backlog_follow_up` | Cosmetic | Final Accept §7 row 6 | No | No | Yes | Yes | Small FE Implementation Agent |
| **CR-001 / Exports** | `ExportButtons.jsx` CSV has 9 columns vs handover's 8; summary row 1 column off | `backlog_follow_up` | Cosmetic | Final Accept §7 row 17 | No | No | Yes | Yes | Small FE Implementation Agent |
| **LoadingPage ESLint** | `LoadingPage.jsx:111 react-hooks/exhaustive-deps` warning | `backlog_follow_up` | Cosmetic; build not blocked | Final Accept §7 row 21 | No | No | Yes | Yes | Small FE Implementation Agent (may be naturally resolved by UX-LOADING-02) |
| **paymentService CLEAR_BILL** | `paymentService.collectPayment()` references missing `API_ENDPOINTS.CLEAR_BILL` | `backlog_follow_up` | Dead-code path; API-03 supersedes | Final Accept §7 row 22 | No | No | Yes | Yes | Small FE Implementation Agent |
| **CR-010-RP-03** | `OrderContext.refreshOrders(roleName='Manager')` default literal | `backlog_follow_up` | Pre-existing; explicit deferral via CR-010 | A0b P8; CR-010 §4 | Yes (via CR-010) | No | No | No | Future CR-010 |
| **CR-010-RP-05** | Waiter-role wire test not exercised on preprod | `backlog_follow_up` | Coverage gap | A0b P8 | No | No | Yes (piggyback A0b runtime) | Yes (piggyback) | Runtime QA Addendum Agent |
| **D-A0b-3** | `stationService.js:185` `formData.append('role_name', stationName)` | `backlog_follow_up` (by-design) | Owner declined edit; only via future CR-010 | A0b + CR-010 §7 | Yes (CR-010 only) | No | No | No | Future CR-010 |
| **Retained `[CR-001 DIAG]` etc. console logs** | Diagnostic retention until BE-1 lands | `backlog_follow_up` (intentional) | Tied to BE-1 | Final Accept §7 row 18 | No | Yes (BE-1) | No | No | Small FE Implementation Agent (remove when BE-1 lands) |
| **CR-004 / Visual missing-`room_info`** | `—` placeholders vs explicit warning badge | `backlog_follow_up` (cosmetic) | Owner cosmetic call | Final Accept §7 row 19 | Yes | No | No | No | Owner → Small FE Implementation Agent |
| **CR-004 / Scope (orphan-SRM)** | Orphan-SRM fallback grouping | `backlog_follow_up` | Spec drift; rare case | Final Accept §7 row 20 | Maybe | No | No | No | Small FE Implementation Agent (future CR-004 patch) |

### 3.9 Tracker rewrite gating (2 items, owner-gated)

| ID | Title | Status | Owner? | Next agent |
|---|---|---|---|---|
| **SESSION_TRACKER full rewrite** | Optional full rewrite vs pointer-append | `needs_owner_decision` | Yes | Documentation Cleanup Agent (owner-gated) |
| **QA_HANDOVER_INDEX full rewrite** | Optional full rewrite vs pointer-append | `needs_owner_decision` | Yes | Documentation Cleanup Agent (owner-gated) |

---

## 4. Bucketed pending work

### BUCKET A — Ready to plan now
> Items with enough backend/data evidence to start **planning** (not implementation).

| ID | Why ready | Next agent | Output file |
|---|---|---|---|
| **CR-009 Operations Audit Timeline** | Per `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` §4: `operations[]` block `confirmed_present_non_null` (13 enums, 50 sub-keys, 9/13 rows non-null). Zero FE references today — entirely unmapped. Planning agent can author transform + UI surface against the live wire; backend confirmation on canonical enum list is desirable but not blocking for v1. | New CR Planning Agent (FE planning) | `implementation_plans/CR_009_OPERATIONS_AUDIT_TIMELINE_PLAN.md` (or impact analysis first) |

> ✅ **One item only.** No other CR/bucket meets the data-ready bar for FE planning today.

---

### BUCKET B — Owner decision required
> Items blocked primarily by owner / product decision.

| ID | Decision needed |
|---|---|
| **CR-013 Bean Me Up double-count** | Pick Option **A** (backend-only) / **B** (targeted FE rollback on `BILL_PAYMENT` only) / **C** (full FE rollback of D-GST-3) / **D** (not recommended). Customer-visible bug. |
| **UX-LOADING-02** | Concern A pick: **A1** (parallel after profile, recommended) / **A2** (tiered) / **A3** (skip). Concern B pick: **B1** (two-stage bar) / **B2** (row-per-station, recommended) / **B3** (spinner). Single-commit vs split-commit ordering. |
| **CR-002** | Prioritise "Unify status and tab logic" |
| **CR-010** | Prioritise Roles & Permissions consolidation (also unblocks CR-010-RP-03 + D-A0b-3) |
| **CR-012** | Prioritise Big Buddha filling MAX label fix |
| **A3 / A4 / B4** | Re-open owner-declined buckets? |
| **CR-004 / Visual** | Cosmetic: explicit warning badge vs `—` placeholder for missing `room_info` |
| **CR-004 / Scope (orphan-SRM)** | Implement orphan-SRM fallback grouping |
| **FE-01 / FE-02 / FE-03** | Optional baseline enrichments inside `/app/memory/final/*` (touches baseline → owner gate) |
| **SESSION_TRACKER / QA_HANDOVER_INDEX full rewrites** | Rewrite vs pointer-append (currently pointer-append deemed sufficient) |

---

### BUCKET C — Backend confirmation required
> Items where backend schema or field exists partially, but contract / semantics are unclear.

| ID | Confirmation needed |
|---|---|
| **CR-013 BE-G7** | Exact backend `payment_amount` Total formula on `BILL_PAYMENT` orders. Is `subtotal + (gst_tax − service_gst_tax_amount)` confirmed? |
| **CR-013 BE-G8** | Symmetric Tip GST exposure — does template subtract `tip_tax_amount` from `gst_tax` and add full `tip_tax_amount` to each CGST/SGST display side? |
| **CR-013 BE-G10** | Does `order-temp-store` template auto-render any payload tax key, or is it hardcoded? |
| **CR-013 BE-G11** | Per-component template slot names (`cgst_on_sc_amount`, `sgst_on_sc_amount`, `cgst_on_tip_amount`, `sgst_on_tip_amount`, `cgst_on_delivery_amount`, `sgst_on_delivery_amount`)? |
| **`payload_total_gst_tax_amount`** | What populates this? Is it the FE-supplied `gst_tax` echo for reconciliation? When does it go non-null? (Strong candidate for BE-G7/G8 reconciliation column.) |
| **BE-V / BE-W item-level fields** | Re-run audit on a paid-cohort-rich tenant where `cancel_reason_text`, `paid_status`, `ready_by`, `serve_by` are populated. Confirm pair-name fields (`ready_by_name`, `serve_by_name`) ship. |
| **BE-T / BE-U / BE-W / BE-A** | Bundled clarification request to backend on shipment status. |
| **`order_dispatch_status` enum** | `"Yes"`/`"No"` only, or richer (`Assigned` / `Picked-up` / `Delivered`)? |
| **`station_order_status` enum** | Confirm numeric values match item-level `food_status` enum (or define). |
| **Bean Me Up double-count** | Has backend patched the asymmetric formula post-2026-05-05? |

---

### BUCKET D — Backend missing / keep parked
> Required field/endpoint is still missing.

| ID | What's missing |
|---|---|
| **CR-013 BE-G9** | `delivery_charge_gst_amount` ₹ column. Not in 2026-05-06 schema. Owner promise on disk; not yet shipped. |
| **B2 Phase 2 / BE-W2** | `snapshot_razorpay_status` non-null. Schema present, all `null` on every cohort row. |
| **BE-1 P2** | Order-level `cancel_by_name`. `canceled_by` ID populated but pair-name missing. Plus order-level `merge_by_name`. |
| **BE-2** | `room_info.discount_amount` / `discount_reason`. |
| **BE-V** | Item-level `cancel_by_name` for items where order-side fallback isn't sufficient (gates B3). |
| **BE-F** | Server-side `default_landing_screen` setting (gates CR-008 #4 Phase B). |

---

### BUCKET E — Backend endpoint contract required
> Fields may exist but action endpoint is missing/unknown.

| ID | What's missing |
|---|---|
| **CR-008 Sub-CR #3 dispatch / assign / picked-up POST or PATCH endpoints** | Schema groundwork on `orders_table` is present (`order_dispatch_status` populated 13/13; `delivery_man_id` / `delivery_man_status` / `picked_up` / `vehicle_id` / `zone_id` documented but `present_in_schema_not_in_sample`). New action endpoints not visible from `order-logs-report` curl. URL contracts, payload, socket-event names — all unknown. |

---

### BUCKET F — Safe small FE / doc cleanup
> Items genuinely still pending and safe to start with no gates.

| ID | Effort |
|---|---|
| **DOC-A0a-01** | ~5 min — wording tweak at A0a handover §14 step 6 |
| **DOC-B2-01** | ~5 min — verify whether actually closed in Batch 1 (per Final Accept §7 row 2) before edit |
| **CSV-A0a-01** | ~30 min — `ExportButtons.jsx:193` mask to `—` |
| **DETAIL-A0a-01** | ~30 min — `formatPaymentMethod` guard for `cash_on_delivery` |
| **FILTER-A0a-01** | ~30 min — `reportTransform.extractPaymentMethods` filter |
| **CR-001 / Exports** | ~20 min — CSV column alignment |
| **LoadingPage ESLint** | ~5 min — add `loadStationData` dep or disable inline (may be auto-resolved by UX-LOADING-02) |
| **paymentService CLEAR_BILL** | ~15 min — remove dead-code reference |

> Do NOT touch retained `[CR-001 DIAG]` etc. logs (tied to BE-1).
> Do NOT remove `[BE-1 INVARIANT]` / `[BE-2 INVARIANT]` blocks (still load-bearing).

---

### BUCKET G — Runtime / additive validation
> Not blockers; need owner / preprod walkthrough.

| ID | Walk |
|---|---|
| **CR-013 Bean Me Up owner visual walk on tenant 742** | ~10-min interactive walk: Collect Bill with items + tip + (optional) discount; capture per-component breakdown screenshot; DevTools `BILL_PAYMENT` payload diff (`service_gst_tax_amount > 0`, `tip_tax_amount > 0`); print POST payload (`cgst_amount + sgst_amount` additive); `[CR-013 PARITY]` console behaviour (should not fire); optionally capture printed receipt for owner Options A/B/C/D record. **Compensates §4.6 design-guaranteed-but-visual-unwitnessed caveat. Additive — does NOT block existing `qa_passed_with_known_print_backend_finding` verdict.** |

> Also bundle (piggyback): **CR-010-RP-05** Waiter-role wire test (covers per A0b runtime addendum opportunity).

---

### BUCKET H — Do NOT touch / closed / already resolved
> Often confused as pending; these are CLOSED.

- **A0a runtime addendum** — PASSED 2026-05-04 (`closed_resolved`)
- **A0b runtime addendum** — PASSED 2026-05-04 (`closed_resolved`)
- **FO-B1-01 runtime addendum** — PASSED 2026-05-04 (`closed_resolved`)
- **TD-01..TD-05** — QA_REPORT_INDEX tracker drift resolved 2026-05-04
- **TEST-INFRA-001** — RESOLVED 2026-05-04 via Batch 3C
- **NS-3C-1..NS-3C-9** — Test-fixture / barrel / raw-field cycle resolved 2026-05-04
- **RAW-FIELD-PROD-FALLBACK-FIX (NS-3C-4)** — Owner-approved Option a; rawField.test.js 3/3 PASS naturally; full suite 19/19 PASS, 199/199 tests PASS
- **BUG-PREPAID-MERGE-SHIFT** — closed-fixed (CR-007 A2 layer 1 + 2)
- **CR-004 original (2026-04-29) `qa_failed`** — superseded by P0 2026-05-03
- **12 sprint-accepted CRs** (CR-001, CR-003, CR-004 P1+P2 A/B/C, CR-005 #1 / B2-split P1, CR-006 A1+B1, CR-007 A2.1+A2.2+A2.3, CR-008 Sub-CR #1 + #4 Phase A, A0a, A0b)
- **CR-013 Phase 1.5 main (FE-side)** — `qa_passed_with_known_print_backend_finding` 2026-05-05 (D-GST-1 + D-GST-2 + G3 + D-GST-3 + D-GST-4 + Fix-1 + Fix-2 + CR-008 Round-3)
- **5 stale 2026-05-04 trackers** — pointer-appended on 2026-05-05 with current CR-013 status

> **Do not restart.** Treat as immutable historical state for this bucketing.

---

## 5. Backend-blocked mapping
> Reconciled against `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` (most recent authoritative classification — does not override that doc).

| Parked FE item / CR | Blocking BE id | BE classification (2026-05-06) | Action when BE lands |
|---|---|---|---|
| **CR-001 cell-level UX (PUNCHED BY / ACTIONED BY / Reason / Cancellation Status / TABLE NO / G1)** | BE-1 P2 (order-level `cancel_by_name` / `merge_by_name` / `collect_by_name` / `room_info.discount_amount`) | `keep_parked_backend_missing` | Remove `[CR-001 DIAG]` logs; populate cells |
| **B3** | BE-V item-level | `keep_parked_backend_confirmation_needed` | Replace `Employee #<cancel_by>` fallback at `reportTransform.js:625-626` |
| **B2 Phase 2** | BE-W2 `snapshot_razorpay_status` non-null | `keep_parked_backend_missing` | FE auto-reveal already wired; activates instantly |
| **CR-008 #4 Phase B** | BE-F server-side `default_landing_screen` | `keep_parked_backend_missing` | Dual-read/migration from localStorage to server |
| **CR-008 Sub-CR #3** | Backend roadmap (dispatch/assign endpoints) | Schema half: `ready_for_fe_impact_analysis` · Endpoint half: `keep_parked_backend_confirmation_needed` | Wire FE action UI after endpoints confirmed |
| **CR-009** | None blocking — `operations[]` data-ready | **Schema delivered** | **Move to BUCKET A — `ready_to_plan`** |
| **CR-011** | BE-A | `keep_parked_backend_confirmation_needed` | Canonicalise case handling |
| **CR-013 Phase 3** | BE-G7 / BE-G8 / BE-G9 / BE-G10 / BE-G11 | G9 `keep_parked_backend_missing` · G7/G8/G10/G11 `keep_parked_backend_confirmation_needed` | After backend ships: remove targeted FE rollback (if Option B was applied), add per-component payload keys, sunset composite halves |
| **Bean Me Up double-count** | BE-G7 / BE-G8 / BE-G10 / BE-G11 + owner Options A/B/C/D | `decision_pending_owner` + `keep_parked_backend_missing` | If Option B → ship targeted FE rollback now; if A → wait on BE; if C → full rollback |
| **CR-004 P2 cross-day (G2/G3/OPT)** | BE-T | `keep_parked_backend_confirmation_needed` | `/get-room-list` filter adjustments + inline enrichment optimisation |
| **CR-005 Phase A web-order attribution** | BE-U | `keep_parked_backend_confirmation_needed` | Wire attribution columns |
| **Per-item paid-stage fields** | BE-W | `keep_parked_backend_confirmation_needed` | Extend report cells |
| **Lodging payment breakdown (CR-004 + adjacencies)** | BE-2 | `keep_parked_backend_missing` | Replace math-derived `room_info.discount_amount` with explicit field |
| **Retained diagnostics (`[CR-001 DIAG]` etc.)** | BE-1 | `keep_parked_backend_missing` | Remove when BE-1 P2 lands |

---

## 6. Owner-decision mapping

| Decision item | Impact if decided | Impact if deferred | Priority |
|---|---|---|---|
| **CR-013 Bean Me Up Option A/B/C/D** | Option B (targeted) closes the customer-visible double-count within minutes; reversible the moment BE-G7/G8/G10/G11 ship | Bug remains visible on every dineIn-with-SC bill on Bean Me Up + any tenant with `service_charge_tax > 0` | **P0 — customer-visible** |
| **UX-LOADING-02 A1/A2/A3 + B1/B2/B3** | Faster login (~60–70% Phase 1 latency reduction with A1) + transparent progress (B2 recommended); ~3–4 hr impl | Login stays slow + "is it frozen?" gap on Phase 2 | P1 — UX/perf |
| **CR-009 queue position** | Unblocks CR Planning Agent to start CR-009 plan | CR-009 stays parked | P1 — only data-ready CR |
| **CR-010 prioritisation** | Major refactor cycle (also unparks CR-010-RP-03 + D-A0b-3) | Stays parked | P2 |
| **CR-002 prioritisation** | New CR cycle | Stays parked | P2 |
| **CR-012 prioritisation** | New CR cycle | Stays parked | P3 |
| **CR-008 Sub-CR #3 prioritisation** | Backend + FE cycle | Stays on backend roadmap | P3 |
| **A3 / A4 / B4 re-open** | New CR cycles | Stay declined | P3 |
| **CR-004 visual badge (cosmetic)** | New small FE patch | Stays as `—` placeholder | P3 |
| **FE-01 / FE-02 / FE-03 baseline enrichments** | Concretises baseline docs | No corrective need | P3 |
| **SESSION_TRACKER / QA_HANDOVER_INDEX full rewrites** | Cleaner current-state | Pointer-append remains | P4 (not needed) |

---

## 7. Ready-to-plan items
> The shortlist for the next FE planning agent.

1. **CR-009 Operations Audit Timeline** — `ready_to_plan` (Bucket A). Author transform + UI surface against `operations[]` block. Use 13 observed enums as v1; new enums = parser additive change. No backend confirmation required to start planning.
2. **CR-008 Sub-CR #3 (schema half)** — `ready_for_fe_impact_analysis` ONLY (not planning, not implementation). Document field map + dispatch enum candidates; defer endpoint contract to backend coordination. Owner prioritisation gate stands.
3. **UX-LOADING-02** — `needs_owner_decision` (Bucket B). Plan ready; gated on owner option pick. Once owner picks (A1+B2 recommended), planning agent produces full impact-analysis + implementation plan.

---

## 8. Already-closed / do-not-restart items

See **Bucket H** above. Reproducing here as a quick-scan list:

- A0a / A0b / FO-B1-01 runtime addenda (PASSED 2026-05-04)
- TD-01..TD-05 tracker drift (resolved 2026-05-04)
- TEST-INFRA-001 (resolved via Batch 3C)
- NS-3C-1..NS-3C-9 test-infra/fixture/barrel/raw-field cycle (resolved)
- RAW-FIELD-PROD-FALLBACK-FIX (closed; tests 19/19 + 199/199 PASS)
- BUG-PREPAID-MERGE-SHIFT (closed-fixed)
- CR-004 original (2026-04-29) `qa_failed` (superseded)
- 12 sprint-accepted CRs
- CR-013 Phase 1.5 main FE-side (`qa_passed_with_known_print_backend_finding`)
- 5 stale 2026-05-04 trackers (pointer-appended 2026-05-05)

---

## 9. Recommended execution order

> Plan only. NO start instruction here.

### 9.1 Recommended next agent invocations

1. **First next action — Bean Me Up burning issue triage (parallel owner + backend track)**
   - **Why next:** Only customer-visible production bug. Independent of CR-009.
   - **Who:** Owner (pick Option A/B/C/D) + Backend Contract Agent (run BE-G7/G8/G10/G11 5-min triage — see `phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md` §6/§7/§8 for the exact question list).
   - **Output:** Owner reply on the handover doc (Options at L240-291) + backend triage answers appended to `phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md`.
   - **Implementation allowed:** **NO** — only when owner picks B or C. If A, wait on backend ship. If D, no FE change.
   - **Approval gate:** Owner reply with explicit Option pick.

2. **Second next action — CR-009 FE planning**
   - **Why:** Only `ready_to_plan` item. Data-ready on the wire.
   - **Who:** New CR Planning Agent (FE planning).
   - **Output:** `implementation_plans/CR_009_OPERATIONS_AUDIT_TIMELINE_PLAN.md` + `impact_analysis/CR_009_IMPACT_ANALYSIS.md`.
   - **Implementation allowed:** **NO — planning only**. Owner approval gate before code edit.
   - **Approval gate:** Owner go/no-go on the produced plan + impact doc.

3. **Parallel owner / backend action — UX-LOADING-02 option pick + Backend Contract Agent intake**
   - **Why parallel:** Independent of #1 and #2.
   - **Who:** Owner (UX-LOADING-02 A1/A2/A3 + B1/B2/B3 picks) + Backend Contract Agent (bundle the remaining BE asks: BE-1 P2, BE-2, BE-T, BE-U, BE-V cohort re-audit, BE-W cohort re-audit, BE-W2 monitoring task, BE-A, BE-F, BE-G9 — see §5 `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` §6 P0/P1/P2 question list).
   - **Output:** Owner option pick on UX-LOADING-02; backend question list raised.
   - **Implementation allowed:** **NO** for UX-LOADING-02 until owner picks; backend asks are not FE-implementable.
   - **Approval gate:** Owner option pick (UX-LOADING-02); backend ship dates (each BE ask).

4. **Items to keep parked (no action this cycle)**
   - All 5 CR-013 BE-G* asks (G7/G8/G9/G10/G11)
   - 9 original BE-* asks (BE-1, BE-2, BE-T, BE-U, BE-V, BE-W, BE-W2, BE-A, BE-F)
   - 12 parked CRs/sub-CRs/buckets (A3, A4, B3, B4, B2 Phase 2, CR-008 Sub-CR #3, CR-008 #4 Phase B, CR-002, CR-010, CR-011, CR-012, CR-009 implementation half — only planning is unparked)
   - CR-001 retained diagnostic logs
   - All cosmetic backlog items NOT in §9.2 (until owner asks for one-shot cleanup pass)

### 9.2 Optional safe-to-start cleanup pass (~2 hours, zero blockers)

Combine the following into a single agent session:
- **Documentation Cleanup Agent:** DOC-A0a-01 (verify DOC-B2-01 isn't already closed first)
- **Small FE Implementation Agent:** CSV-A0a-01, DETAIL-A0a-01, FILTER-A0a-01, CR-001 / Exports, paymentService CLEAR_BILL, LoadingPage ESLint (skip if UX-LOADING-02 starts soon)
- **Runtime QA Addendum Agent:** when preprod wakes — Bean Me Up owner visual walk + CR-010-RP-05 piggyback

> Net outcome: 7–8 backlog items closed; non-blocking; no backend / owner / runtime gates.

### 9.3 Suggested third-pass (after owner + backend gates clear)

- After BE-G7/G8/G10/G11 + Bean Me Up Option pick → CR-013 Phase 3 implementation cycle
- After UX-LOADING-02 owner pick → impact analysis + implementation plan + small FE impl
- After CR-009 plan approval → CR-009 implementation cycle
- After backend ships any of {BE-1 P2, BE-V, BE-W2, BE-F} → respective FE consumer activation cycles

---

## 10. Risks and guardrails

### 10.1 Items that MUST NOT be mixed together
- **CR-013 Phase 3** (per-component print payload + delivery GST persistence) and the **Bean Me Up Option B targeted FE rollback** — Option B is an *interim* mitigation that explicitly resets `service_gst_tax_amount` / `tip_tax_amount` to `0` on the `BILL_PAYMENT` payload (per `CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md` L257-259). Doing Phase 3 implementation while Option B is still in effect creates test-payload ambiguity. Roll back Option B BEFORE Phase 3 ships, OR ship Phase 3 in a single coordinated cycle that includes the Option B reversal. **Document the order in the implementation plan.**
- **CR-009 implementation** and **backend canonical enum confirmation** — do NOT block CR-009 v1 transform on the canonical enum list. New enums encountered after ship = parser-additive change. But DO NOT ship CR-009 production UI labels for unknown enums without backend confirmation (to avoid mis-labelling a real operation type).
- **UX-LOADING-02 parallelisation** and **CR-001 Fix B2 return-to-URL** — `LoadingPage.jsx` L99-104 must not be touched (FA-03 hotspot).
- **Documentation cleanup** and **/app/memory/final/* baseline enrichments** — never combine; baseline edits need owner pre-approval per Final Accept §11.
- **Cosmetic A0a sibling tickets** (CSV/DETAIL/FILTER) and **A0a/A0b runtime addenda** — addenda are CLOSED; do not re-open by accident.

### 10.2 Items that require backend confirmation BEFORE any FE work
- **BE-G9 `delivery_charge_gst_amount` payload key** — do NOT add to FE payloads until backend confirms the column exists (per print double-count handover §7 strict-rail #6).
- **BE-G11 per-component template payload keys** — do NOT add `cgst_on_sc_amount` / `sgst_on_sc_amount` etc. to print payload until backend confirms the template will read them.
- **Removal of `[CR-001 DIAG]` / `[BE-1 INVARIANT]` / `[BE-2 INVARIANT]` console-warn blocks** — only after backend confirms `pending_*` keys ship.
- **CR-008 Sub-CR #3 endpoint half** — do NOT wire dispatch / assign FE action UI without confirmed POST/PATCH URL + payload contract + socket event names.

### 10.3 Items that require owner decision BEFORE implementation
- **CR-013 Bean Me Up Options A/B/C/D** — no FE rollback until pick.
- **UX-LOADING-02 A1/A2/A3 + B1/B2/B3** — no impact analysis or implementation until pick.
- **CR-002 / CR-009 (queue position) / CR-010 / CR-012 / CR-008 Sub-CR #3 / A3 / A4 / B4 / CR-004 visual badge / orphan-SRM** — no planning until prioritisation.
- **FE-01 / FE-02 / FE-03 / SESSION_TRACKER rewrite / QA_HANDOVER_INDEX rewrite** — owner approval needed (touches `final/` or rewrites historical trackers).

### 10.4 Hotspots that affect print / payment / tax / reporting
- **`orderTransform.calcOrderTotals`** (`orderTransform.js:595-639`) — D-GST-3 / D-GST-4 site. Round-off applies only to `orderAmount`. Do NOT round component values.
- **`buildBillPrintPayload`** (`orderTransform.js:1226-1554`) — Bean Me Up double-count exposure surface. Do NOT add new payload keys without backend confirmation.
- **`CollectPaymentPanel.jsx`** Bill Summary breakdown lines 1531-1592 + parity guardrail line 394 + D1-Gate line 917.
- **`profileTransform.js:147`** Fix-1 `?? api.settings?.deliver_charge_gst` — load-bearing on Bean Me Up + 18march. Do NOT change.
- **`reportService.js:541-633`** `[BE-1 INVARIANT]` block. Do NOT remove until BE-1 P2 ships.
- **`reportService.js:600-619`** `[BE-2 INVARIANT]` block. Do NOT remove until BE-2 ships explicit `discount_amount` / `discount_reason`.
- **`OrderTable.jsx:110`** `pgStatus` auto-reveal detector. Do NOT change.
- **`OrderEntry.jsx:1199`** Fix-2 `initialDeliveryCharge` order. Do NOT reverse precedence.
- **`OrderEntry.jsx:683-697`** + **`CartPanel.jsx:863-868`** CR-008 Round-3 fix. Do NOT touch.

### 10.5 Items that should not touch `/app/memory/final/`
- **Everything above** unless explicitly scoped + owner-approved (FE-01 / FE-02 / FE-03 are the only candidates).
- Do NOT pointer-append, rewrite, or otherwise modify any of the 7 baseline docs in `/app/memory/final/`:
  - `ARCHITECTURE_DECISIONS_FINAL.md`
  - `CHANGE_REQUEST_PLAYBOOK.md`
  - `FINAL_DOCS_APPROVAL_STATUS.md`
  - `FINAL_DOCS_SUMMARY.md`
  - `IMPLEMENTATION_AGENT_RULES.md`
  - `MODULE_DECISIONS_FINAL.md`
  - `OPEN_QUESTIONS_FINAL_RESOLUTION.md`

---

## 11. Final recommendation

> **Single concrete unpark today: CR-009 → `ready_to_plan` (already classified by 2026-05-06 Backend Field Unpark Decision; this bucketing document confirms and carries forward).**

**Action plan in priority order:**

1. **P0 — Bean Me Up customer-visible print double-count.** Owner picks Option A/B/C/D **and** Backend Contract Agent runs the BE-G7/G8/G10/G11 5-min triage — both can happen in parallel. This is the only burning issue.
2. **P1 — CR-009 FE planning kicks off** (the one item that's data-ready). Output is a plan + impact analysis only; no implementation gate cleared yet.
3. **P1 parallel — UX-LOADING-02 owner option pick** (A1+B2 recommended; ~3–4 hr impl) + a single Backend Contract Agent intake covering the 9 remaining BE-* asks + 5 CR-013 BE-G* asks.
4. **P3 — Optional safe cleanup pass** of 7–8 backlog items (DOC + cosmetic A0a siblings + paymentService + LoadingPage ESLint + CR-001 exports col-count) when no higher-priority work is in flight.
5. **Park everything else.** Do NOT unpark A3/A4/B3/B4/B2 Phase 2/CR-008 Sub-CR #3 (impl half)/CR-008 #4 Phase B/CR-002/CR-010/CR-011/CR-012 without owner action or backend ship.

**The Bean Me Up double-count remains the only burning issue.** It is independent of CR-009 unpark and should be triaged in parallel. No FE rollback should ship until owner picks an Option. **No CR-013 Phase 3 implementation should ship while Option B (interim rollback) is in effect** — coordinate both in a single cycle to avoid test-payload ambiguity.

---

## 12. Strict-rules compliance certification

| Rule | Status |
|---|---|
| Read-only — no implementation | ✅ |
| No frontend / backend source edited | ✅ |
| No QA / tests run | ✅ |
| No tracker rewrite | ✅ — only this new bucketing document created |
| No item unparked | ✅ — CR-009's `ready_to_plan` classification was already set by 2026-05-06 Backend Field Unpark Decision; this doc confirms only |
| No item marked complete | ✅ |
| No `/app/memory/final/*` touched | ✅ |
| No CR implementation started | ✅ |
| No code pulled / branch switched | ✅ |
| 2026-05-06 Backend Field Unpark Decision treated as authoritative; null-only fields kept parked | ✅ — BE-W2 + `payload_total_gst_tax_amount` + `delivery_charge_gst_amount` all kept parked per that doc |
| Stop after document creation | ✅ |

---

— End of Pending Work Bucketing + Next Actions 2026-05-06 —
