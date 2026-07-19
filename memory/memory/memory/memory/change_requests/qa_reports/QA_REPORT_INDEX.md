# QA Report Index

> ## ⚠ 2026-05-05 POST-FINAL-ACCEPTANCE UPDATE — CR-013 Phase 1.5
> **CR-013 has moved from `parked_owner_decision` (its 2026-05-04 status everywhere in this index) to **`qa_passed_with_known_print_backend_finding`** as of 2026-05-05.**
>
> - **QA report:** `/app/memory/change_requests/qa_reports/CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md`
> - **Reconciliation summary:** `/app/memory/change_requests/implementation_summaries/CR_013_TRACKER_RECONCILIATION_SUMMARY_2026_05_05.md`
> - **What's verified:** D-GST-3 live wire echo on Bean Me Up · D-GST-4 UI test-ID anchors · parity guardrail · print payload `cgst_amount`+`sgst_amount` additive split · CR-008 Round-3 delivery double-count fix · Fix-1 nested-key fallback (load-bearing on BMU+18march) · Fix-2 delivery-charge handoff · D1-Gate / D1-Cap / BUG-009 / BUG-013 / BUG-019 preserved.
> - **Still pending (not resolved by this update):** BE-G9 / BE-G10 / BE-G11 backend asks · Bean Me Up backend print-template double-count owner decision (Options A/B/C) · additive owner visual walk-through on tenant 742.
> - The "13 parked CR/sub-CR/bucket items" count and "CR-013 stays parked" wording elsewhere in this index are superseded by the above.

## Overall QA Summary
- **Total CRs / buckets validated:** 12 (3 original + 9 re-/new)
- **Passed (without caveats):** 0
- **Passed with deferred backend dependency:** 11 (CR-001, CR-003, CR-004 re-validated, CR-008 Sub-CR #1, CR-004 Phase 2 A+B+C, CR-006 A1+B1, CR-005 #1 / B2-split Phase 1, CR-007 / A2, CR-008 #4 / D1, A0a UI-COD-MASK, A0b ROLE-NAME-WIRE-FIX)
- **Failed (current):** 0
- **Failed (historical, superseded):** 1 — CR-004 (original 2026-04-29 `qa_failed` superseded 2026-05-03)
- **Blocked (environment):** 0
- **Blocked (backend dependency):** 2 — (1) CR-005 #1 / B2 **Phase 2** `PG Status` auto-reveal (awaiting BE-W2 `snapshot_razorpay_status`; dormant placeholder wired, no frontend change needed at unblock); (2) **CR-008 #4 Phase B** server-side persistence of `default_landing_screen` (awaiting **BE-F**; Phase A browser-local stub is shipped and verified — no FE change required at unblock beyond dual-read/migration)
- **Backend-blocked / deferred items across CRs:** 11
- **Known non-blocking findings raised during QA:** 19 outstanding items consolidated — see `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` §7 Backlog/follow-up register. **FO-B1-01 RESOLVED 2026-05-04** (multi-select cart-line display fix shipped + QA-passed; see `FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_QA_REPORT.md`). Remaining headlines: DOC-B2-01, DOC-A0a-01 + CSV-A0a-01 + DETAIL-A0a-01 + FILTER-A0a-01 (A0a sibling tickets), TEST-INFRA-001, CR-010-RP-03 / RP-05 / D-A0b-3, plus 5 tracker-drift items TD-01..TD-05 (resolved 2026-05-04).
- **Ready for final acceptance:** CR-001, CR-003, CR-004 Phases 4.1–4.5 (partial-final), CR-008 Sub-CR #1, CR-006 (A1+B1 → fully closed with FO-B1-01 parked), CR-005 #1 Phase 1 (B2-split), **CR-007 / A2 (fully closed)**, **CR-008 #4 Phase A / D1 (fully closed; Phase B parked on BE-F)**, **A0a UI-COD-MASK (fully closed; preprod manual smoke is an additive gate)**, **A0b ROLE-NAME-WIRE-FIX (fully closed; B3 / BE-V remains parked)**.
- **QA order in progress:** P0 ✅ · P1 ✅ · P2 ✅ · P3 ✅ · P4 ✅ · P5 ✅ (re-verified 2026-05-04, verdict unchanged) · P6 ✅ (2026-05-04) · P7 ✅ (2026-05-04) · P8 ✅ (2026-05-04) · **All P-items closed.** P9 (CR-001 + CR-003 final acceptance paperwork) is the next distinct task per consolidation §2 and must be run as a separate step — not started in the P8 run.

## CR Results
| CR | QA Report | QA Status | Final Recommendation |
| --- | --- | --- | --- |
| CR-001 | `/app/memory/change_requests/qa_reports/CR_001_QA_REPORT.md` | qa_passed_with_deferred_backend_dependency | Ready for final acceptance. Backend P1–P6 + G1 tracked in sub-CR. |
| CR-003 | `/app/memory/change_requests/qa_reports/CR_003_QA_REPORT.md` | qa_passed_with_deferred_backend_dependency | Ready for final acceptance. Backend socket emission on Mark-Unpaid tracked in handover. |
| CR-004 (original, 2026-04-29) | `/app/memory/change_requests/qa_reports/CR_004_QA_REPORT.md` | ~~qa_failed~~ · **superseded 2026-05-03** | Historical record. Fix shipped via Bucket B / FE-1. |
| **CR-004 re-validation (P0, 2026-05-03)** | `/app/memory/change_requests/qa_reports/CR_004_REVALIDATION_QA_REPORT.md` | **qa_passed_with_deferred_backend_dependency** | Partial-final acceptance (Phases 4.1–4.5). |
| **CR-004 Phase 2 Buckets A + B + C (P2, 2026-05-03)** | `/app/memory/change_requests/qa_reports/CR_004_PHASE2_BUCKETS_A_B_C_QA_REPORT.md` | **qa_passed_with_deferred_backend_dependency** | 66/66 pass; post-handover BE-2 §4.1 Paid-formula refinement verified; pill-flicker eliminated. Together with P0, sufficient to move CR-004 Phases 4.1–4.5 to partial-final acceptance. |
| **CR-008 Sub-CR #1 (P1, 2026-05-03)** | `/app/memory/change_requests/qa_reports/CR_008_SUB_1_QA_REPORT.md` | **qa_passed_with_deferred_backend_dependency** | Ready for final acceptance. 60/60 executable checks pass; 15 scenario-level runtime checks blocked on Palm House credentials. Backups retained. |
| **CR-006 A1 + B1 (P3, 2026-05-03)** | `/app/memory/change_requests/qa_reports/CR_006_A1_B1_QA_REPORT.md` | **qa_passed_with_deferred_backend_dependency** | 78/78 spec checks pass + 1 minor non-blocking regression finding (FO-B1-01: qty +/- on cart line drops multi-variant price from display; outbound payload + KOT + bill remain correct). CR-006 effectively closed with FO-B1-01 queued for backlog. |
| **CR-005 #1 / B2-split Phase 1 (P4, 2026-05-03)** | `/app/memory/change_requests/qa_reports/CR_005_B2_SPLIT_QA_REPORT.md` | **qa_passed_with_deferred_backend_dependency** | 50/50 executable spec + clash + build checks pass; 1 minor doc drift (DOC-B2-01: handover prose vs code field name); 10 runtime scenarios blocked on live PG order. Ready for acceptance. B2 Phase 2 (`PG Status` auto-reveal) remains `qa_blocked_backend_dependency` pending BE-W2 `snapshot_razorpay_status`. |
| **CR-007 / A2 (P5, 2026-05-03 · re-verified 2026-05-04)** | `/app/memory/change_requests/qa_reports/CR_007_A2_QA_REPORT.md` | **qa_passed_with_deferred_backend_dependency** | 79/94 executable spec + clash + build checks pass (0 fail, 0 new finding); 15 runtime scenarios — 10 owner-validated 2026-05-02 + 5 not exercised in this environment. 2026-05-04 re-verification (fresh QA agent) expanded scrutiny on chip render path (restaurant-vs-backend id), Print Bill payload signature against `orderService.js:120`, and existing-flow regression; verdict unchanged. **CR-007 fully closed.** A2.1 (dashboard card row split) + A2.2 (OrderEntry middle-panel chip) + A2.3 (Print Bill button) + BUG-PREPAID-MERGE-SHIFT all verified in code. Zero backend dependency. Defence-in-depth: Merge/Shift hidden on prepaid at BOTH OrderCard AND OrderEntry layers. |
| **CR-008 #4 Phase A / D1 (P6, 2026-05-04)** | `/app/memory/change_requests/qa_reports/CR_008_D1_QA_REPORT.md` | **qa_passed_with_deferred_backend_dependency** | 75/93 executable spec + clash + build checks pass (0 fail, 0 new finding); 18 runtime scenarios — 14 owner-validated 2026-05-03 + 4 design-guaranteed (no routing change + localStorage semantics), not agent-exercised. **CR-008 #4 Phase A fully closed.** Storage contract (`mygenie_stay_on_order_after_bill` strict `=== 'true'` with try/catch fallbacks), two surgical Pay-success branches in `OrderEntry.jsx` (L1426 Place+Pay, L1546 Collect-Bill-on-existing), `key={orderEntryResetNonce}` remount-driven state reset in `DashboardPage.jsx`, Status Config UI toggle + save + reset all verified. Clashes #5, #6, #7, #8 regression clean; CR-008 Sub-CR #1 delivery-charge + CR-007 A2 Print Bill path unaffected. Zero backend dependency for Phase A. **CR-008 #4 Phase B (server-side persistence) remains `qa_blocked_backend_dependency` pending BE-F** `default_landing_screen` — unblock gate: P1 + P6 closed AND BE-F shipped (first two conditions now satisfied; BE-F is the single remaining gate). |
| **A0a UI-COD-MASK (P7, 2026-05-04)** | `/app/memory/change_requests/qa_reports/A0a_UI_COD_MASK_QA_REPORT.md` + **`/app/memory/change_requests/qa_reports/RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md`** | **runtime_addendum_passed** (2026-05-04 upgrade — was `qa_passed_with_deferred_backend_dependency` → now **`accepted`** per Final Accept §4.3 row 1) | 51/67 executable spec + clash + build checks pass (0 fail, 5 non-defect observations all pre-existing / handover-deferred); 11 runtime scenarios validated 2026-05-04 via live preprod tenant 541 (12 of 15 running-orders carry raw `cash_on_delivery` on wire; all 5 display-layer mask points re-verified — audit table, CSV export, PDF export, OrderDetailSheet, filter dropdown). **Bucket A0a fully closed + runtime addendum cleared.** Single-branch display short-circuit in `OrderTable.jsx:486-510` masks `cash_on_delivery` to `—` on all audit tabs; raw enum preserved everywhere else (eligibility predicate L241-254, transforms, payloads, CSV export, print receipts, OrderDetailSheet mapping). Clashes #6, #8, #12 regression clean. Zero backend dependency. |
| **A0b ROLE-NAME-WIRE-FIX (P8, 2026-05-04)** | `/app/memory/change_requests/qa_reports/A0b_ROLE_NAME_WIRE_FIX_QA_REPORT.md` + **`/app/memory/change_requests/qa_reports/RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md`** | **runtime_addendum_passed** (2026-05-04 upgrade — was `qa_passed_with_deferred_backend_dependency` → now **`accepted`** per Final Accept §4.3 row 2) | 75/90 executable spec + contract-test + clash + build checks pass (0 fail, 3 pre-existing non-defect observations); 12 runtime scenarios validated 2026-05-04 via direct preprod wire-contract proof — `role_name=Manager` (A0b canonical) → HTTP 200, 15 orders; pre-fix `role_name=Owner` → HTTP 200, only 3 orders (materially incomplete). Fix is load-bearing on live preprod. **Bucket A0b fully closed + runtime addendum cleared.** All 15 contract edits (A.1–A.8 verbatim + B.1–B.2 + C.1 + D.1–D.2 + E.1 full helper removal + documented D-A0b-1 dep-correction) verified byte-for-byte; **6/6 unit tests PASS** in 2.1 s (Owner / Waiter / empty / undefined permissions + transform-shape regression lock + `getOrderRoleParam` removal assertion). Wire-field `role_name` now canonicalised to `permissions?.[0] \|\| 'Manager'` across 4 API endpoints (running-orders GET, order-confirm PUT, order-status-update PUT for ready/served/cancel) at 6 call-sites. Display reads of raw `user.roleName` (Sidebar, diagnostics) intentionally preserved per handover §13 bullet 3. Clash #9 (role/name attribution) + Clash #2 + Clash #8 regression clean. Zero backend dependency (backend already accepts canonical values). **B3 / BE-V item-level `cancel_by_name` REMAINS PARKED** — A0b did not touch `cancel_by_name`, did not introduce client-side synthesis, and did not weaken the pre-existing `Employee #<cancel_by>` fallback at `reportTransform.js:625-626`. B3 unblock gate: BE-V delivered AND P8 closed (P8 now closed; **BE-V is the single remaining gate**). `stationService.js:185` explicitly untouched per D-A0b-3 (owner declined; captured in CR-010 §7). |
| **FO-B1-01 — Multi-select cart-line display fix (2026-05-04)** | `/app/memory/change_requests/qa_reports/FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_QA_REPORT.md` + **`/app/memory/change_requests/qa_reports/RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md`** | **runtime_addendum_passed** (2026-05-04 upgrade — was `qa_passed_with_runtime_addendum_pending` → now **`qa_passed`** full) | Backlog item from CR-006 P3 — moved to RESOLVED follow-up. Single-file display fix: new `calculateSelectedVariantsPrice` helper added at `orderTransform.js:358-388` (module-scope, exported, pure); broken inline reduce at `OrderEntry.jsx:615-617` qty +/- recompute branch replaced with helper call at L619. Plan + owner approval in `impact_analysis/FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_PLAN.md`. **Implementation summary:** `/app/memory/change_requests/implementation_summaries/FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_SUMMARY.md`. **20 / 20 helper edge cases PASS** (eval'd against verbatim production source). Lint clean on both touched files; webpack at baseline; preview HTTP 200. `buildCartItem` variation handling at L413-442 byte-identical to pre-fix logic — outbound `variation_amount` payload contract preserved. `ItemCustomizationModal.jsx:100-105` modal preview untouched. Zero backend dependency. Zero regression to CR-006 A1/B1, CR-007 A2, CR-008 Sub-CR #1 / D1, A0a, A0b, B3 / BE-V. **Runtime addendum PASSED 2026-05-04** — live preprod menu corpus confirmed (`Big Buddha Burger (V)` food_id 107738 with 7-option multi-select variant). Helper contract + payload shape green on current branch (20/20 + 17/17 unit tests). Interactive OrderEntry walk deferred as additive-only (preview-harness did not auto-route past station loader — see `UX-LOADING-02`). |

## CR Results (legacy partial — superseded)
| CR | QA Report | QA Status | Final Recommendation |
| --- | --- | --- | --- |
| _(see consolidated table above — duplicate table removed 2026-05-04 per TD-01)_ | — | — | All rows above are authoritative. |

## Backend-Blocked / Deferred Summary
| CR | Item | Reason | Next Owner |
| --- | --- | --- | --- |
| CR-001 | P1 — `waiter_name` missing on `/order-logs-report` | PUNCHED BY shows `Employee #<id>` | Backend |
| CR-001 | P2 — `*_by_name`/`*_by_id` missing on state transitions | ACTIONED BY name part shows `—` | Backend |
| CR-001 | P3 — `cancel_reason` missing | Cancelled-tab Reason cell `—` | Backend |
| CR-001 | P4 — `cancel_type` missing | Cancellation Status column not rendered | Backend |
| CR-001 | P5 — `table_no` missing on most rows | TABLE NO shows fallback labels | Backend |
| CR-001 | P6 — `room_info` missing on `/order-logs-report` | Moot for Audit; relevant for Phase 2 cross-day | Backend |
| CR-001 | G1 — no settlement signal on transferToRoom | RUNNING badge persists post-checkout | Backend |
| CR-003 | Socket emission on `new_order_${restaurantId}` after `make-order-unpaid` | Cross-terminal re-surface relies on dashboard listener; frontend uses explicit refetch as fallback | Backend |
| CR-004 | G2 — `/get-room-list` must filter to in-house rooms only | Checked-out rooms still surface | Backend |
| CR-004 | G3 — `/get-single-order-new(RM_id)` must refresh `associated_order_list[].payment_status` post-settlement | Outstanding stays inflated until reload | Backend |
| CR-004 | OPT — `/get-room-list` should inline `latest_order_id` + `room_info` + `check_in_date` | Collapse 3 API calls into 1 | Backend |
| CR-004 | Phase 4.6 — Export Integration in `ExportButtons.jsx` | User-authorised parking | Implementation Agent (future round) |
| CR-004 | Phase 4.7 — Final cross-page smoke pass | Tied to 4.6 | Implementation Agent (future round) |
| CR-004 | Phase 2 — cross-business-day in-house view | Blocked on G2 / G3 / OPT | Backend + Implementation Agent |

## Failed Items Requiring Implementation Fix
_(no current failures — see "Resolved Failures (Historical)" below)_

## Resolved Failures (Historical)
| CR | Failure | Severity | Resolution |
| --- | --- | --- | --- |
| CR-004 | Status-filter pills derived Paid/Unpaid from `roomInfo.balancePayment` instead of order-level `fOrderStatus`. | High | **RESOLVED 2026-05-03 via P0 re-validation.** Fix shipped: filter predicate now operates directly on day-list row using `fOrderStatus === 6 ⇔ Paid`, `!== 6 ⇔ Unpaid`. See `CR_004_REVALIDATION_QA_REPORT.md`. |

## Observed Unrelated Issues
| CR / Area | Issue | Recommendation |
| --- | --- | --- |
| CR-001 / Exports | `ExportButtons.jsx` CSV has an extra legacy `Payment Type` column (9 items vs handover's 8); CSV summary row is 8 cells (1-column off from header). Data integrity is fine; footer alignment is cosmetic. | Follow-up: either remove the `paymentType` column or extend the summary row by one blank. Non-blocking. |
| CR-001 / Code hygiene | `[CR-001 DIAG]`, `[CR-001 P2 DIAG]`, `[CR-001 G5 DIAG]` diagnostics logged on every `/order-logs-report` fetch | Intentionally retained; remove once backend P1–P6 land. |
| CR-003 / Code hygiene | `[CR-003 DIAGNOSTIC]` permissions log on every mount of `AllOrdersReportPage.jsx` | Retained per user direction. Remove once preprod permission matrix is confirmed. |
| CR-004 / Visual | Missing-`room_info` signal rendered via `—` placeholders instead of an explicit "warning badge" | Cosmetic — product-owner call. Non-blocking. |
| CR-004 / Scope | SRM-only fallback grouping from QA handover not literally implemented (day list filters to RM only) | Orphan SRMs are rare/anomalous. Revise handover or add fallback grouping in a future patch. Non-blocking. |
| CR-004 / Code hygiene | `[CR-004 P2 DIAG] /get-room-list response` diagnostic logs payload on mount | Retained; remove with Phase 2. |
| Pre-existing cross-CR | `LoadingPage.jsx:111` ESLint `react-hooks/exhaustive-deps` warning | Pre-existing. Fix independently. |
| Pre-existing cross-CR | `paymentService.collectPayment()` references missing `API_ENDPOINTS.CLEAR_BILL` | Pre-existing latent bug. Fix independently. |
| Pre-existing cross-CR | `ProtectedRoute.test.jsx` needs `@testing-library/react` install + restaurant-context mock update | Pre-existing. Test suite doesn't currently run. |

## Not Testable Items (environment-constrained; NOT marked pass/fail)
- Deep runtime validation for all three CRs behind the dormant preprod backend (`https://preprod.mygenie.online/`). The frontend preview shows a "Wake up servers" banner at login. Needed: wake preprod + login with `owner@18march.com` / `Qplazm@10` or `owner@mantri.com` / `Qplazm#10`.
- Permission-matrix testing for CR-003 needs a non-Owner credential (not provisioned).
- Cross-terminal Mark-Unpaid re-surface (CR-003) needs two live sessions and backend socket emission (deferred).

## User Clarifications Needed
_(none current — historical CR-004 missing-`room_info` visual cosmetic question moved to backlog register: `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` §7 row 19)_

## Final Recommendation
**Sprint accepted 2026-05-04.** See authoritative sprint outcome at:

> `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`

Headlines:
- 12 frontend deliveries `accepted_with_deferred_backend_dependency` (10) + `accepted` (2: A0a + A0b — promoted 2026-05-04 via Runtime QA Addendum cycle)
- 9 backend asks (BE-1..BE-W2, BE-A, BE-F) remain parked — none unparked
- 13 CR/sub-CR/bucket items remain parked (A3, A4, B3, B4, B2 Phase 2, CR-008 #4 Phase B, CR-008 Sub-CR #3, CR-002, CR-009, CR-010, CR-011, CR-012, CR-013)
- 0 current `qa_failed`; 1 historical superseded (CR-004 original 2026-04-29 → P0 2026-05-03)
- 20 backlog items catalogued, all non-blocking
- Baseline docs `/app/memory/final/*` UNCHANGED (3 optional enrichments FE-01..FE-03 require separate owner approval)

_Note: this `Final Recommendation` block was rewritten 2026-05-04 (TD-02). The earlier "Mixed outcome — send CR-004 back" recommendation reflected pre-P0 state and is superseded by the P0 re-validation pass on 2026-05-03._

