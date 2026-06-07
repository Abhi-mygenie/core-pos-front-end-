# QA Handover Index — Audit Report Improvements Bundle

## Status
- ready_for_qa_validation

## Bundle Scope
This index ties together three CRs that are simultaneously ready for QA validation. They were all touched in the same implementation cycle and share regression surfaces.

| CR | Title | Status | Doc |
| --- | --- | --- | --- |
| **CR-001** | All Orders Report — Status derivation + filter structure (Phase 1 + Phase 2) | ready_for_qa_validation | `/app/memory/change_requests/qa_handover/CR_001_QA_HANDOVER.md` |
| **CR-003** | Paid & Hold Order Actions (Change Method / Mark Unpaid / Collect Bill) | ready_for_qa_validation | `/app/memory/change_requests/qa_handover/CR_003_QA_HANDOVER.md` |
| **CR-004 (Phases 4.1–4.5)** | Room Orders Report — PMS-style read-only view | ready_for_qa_validation (partial) | `/app/memory/change_requests/qa_handover/CR_004_QA_HANDOVER.md` |

## Recommended QA Order
1. **CR-001** first — it's the largest surface and other CRs share its regression surfaces.
2. **CR-003** second — row actions on `/reports/audit` (Paid & Hold tabs).
3. **CR-004 (Phases 4.1–4.5)** last — separate page (`/reports/rooms`) but shares `reportService.js` + `OrderTable.jsx` plumbing.

## Cross-CR Regression Surfaces
Things that should be spot-checked AFTER each CR-specific test list, because they touch shared code:

| Surface | Why it spans CRs |
| --- | --- |
| `reportService.js::getOrderLogsReport` | Used by both Audit Report (CR-001/CR-003) and Room Orders Report (CR-004 day-list fetch). |
| `OrderTable.jsx` column config + missing-row placeholder rendering | Audit Report tabs (CR-001/CR-003); also indirectly affects any consumer that reuses the component. |
| OrderDetailSheet (drawer) | Opens from any Audit Report row; CR-001 Phase 2 added prefixed `displayOrderId` but did not change the sheet's internals. |
| `ExportButtons.jsx` | CSV + PDF exports for Audit Report. |
| `paymentMutationService.js` | CR-003 only. |

## Known Issues / Deferred Items (DO NOT FAIL QA ON THESE)
All three CRs share a single deferred-items registry, captured in the sub-CR:
- **`/app/memory/change_requests/CR_004_BACKEND_EXT_sub_cr.md`**

This document covers:
- **P1–P6** — Display data mappings (waiter_name, cancel_by_*, merge_by_*, collect_by_*, cancel_reason, cancel_type, table_no, room_info on `/order-logs-report`).
- **G1** — transferToRoom RUNNING badge after room settlement.
- **G2** — Checked-out rooms still listed by `/get-room-list`.
- **G3** — `associated_order_list[].payment_status` staleness on RM parent's detail call.
- **OPT** — Optional `/get-room-list` extension to collapse the 3-call frontend pattern.

QA should treat any of these symptoms as **expected with a known deferred root cause**, NOT as a CR failure.

## Pre-existing Out-of-Scope Items
- `paymentService.CLEAR_BILL` latent bug.
- `LoadingPage.jsx` ESLint missing-dependency warning.
- `ProtectedRoute.test.jsx` requires `@testing-library/react` install + restaurant-context mock update. Test suite does not currently run.

## Diagnostic Code (intentionally left in place)
Three dev-mode diagnostics remain active. They are clearly tagged and harmless:
- `[CR-001 DIAG]` — top-level `/order-logs-report` summary (pre-session).
- `[CR-001 P2 DIAG] order=<id>` — per-watched-order raw + derived dump.
- `[CR-001 G5 DIAG]` — auto-snapshot of unprefixed rows.
- `[CR-004 P2 DIAG] /get-room-list response` — `/get-room-list` payload sample on Room Orders mount.

All four are wrapped in clearly-marked TEMP DIAGNOSTIC blocks and will be removed in a follow-up commit once the backend extensions in `CR_004_BACKEND_EXT_sub_cr.md` ship.

## Test Credentials
- Owner / 18march: `owner@18march.com` / `Qplazm@10`
- Owner / Mantri: `owner@mantri.com` / `Qplazm#10`

## QA Output Expected
| Outcome | Action |
| --- | --- |
| **Pass** | Mark each of the 3 CRs as `ready_for_final_acceptance`. Pass back to the implementation agent for sub-CR coordination. |
| **Fail** | Produce a per-CR QA failure report with reproduction steps + screenshot/console capture. The implementation agent will triage; if the failure maps to a deferred item already in `CR_004_BACKEND_EXT_sub_cr.md`, no rework is required. |

## Next Agent
- Change Request QA Validation Agent.

---

## Current Sprint Status (2026-05-04)

The 3-CR bundle above (CR-001 / CR-003 / CR-004 Phases 4.1–4.5) was the original 2026-04-29 scope. The active sprint expanded to 12 deliveries; all are now formally accepted.

**Authoritative sprint outcome:**
> `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`

**Active QA reports under `qa_reports/`:**
- `CR_001_QA_REPORT.md` · `CR_003_QA_REPORT.md` · `CR_004_REVALIDATION_QA_REPORT.md` (P0) · `CR_008_SUB_1_QA_REPORT.md` (P1) · `CR_004_PHASE2_BUCKETS_A_B_C_QA_REPORT.md` (P2) · `CR_006_A1_B1_QA_REPORT.md` (P3) · `CR_005_B2_SPLIT_QA_REPORT.md` (P4) · `CR_007_A2_QA_REPORT.md` (P5) · `CR_008_D1_QA_REPORT.md` (P6) · `A0a_UI_COD_MASK_QA_REPORT.md` (P7) · `A0b_ROLE_NAME_WIRE_FIX_QA_REPORT.md` (P8)
- Historical superseded: `CR_004_QA_REPORT.md` (2026-04-29 `qa_failed`, superseded by P0)

This handover index above is preserved as the original 3-CR bundle context. Use the Final Acceptance document for current sprint-wide handover.

