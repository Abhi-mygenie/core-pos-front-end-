# CR-001 Implementation Summary: Fix Status Derivation + Filter Structure in All Orders Report (Phase 1 + Phase 2)

## Status
- implemented_user_validated

## Phase Note
This summary covers the **complete CR-001 lifecycle** — the originally-approved Phase 1 scope (`getOrderLogsReport` derivation, filter restructure, room exclusion, PG plumbing) **plus** an extensive Phase 2 set of UAT-driven follow-up fixes captured in this implementation session. All Phase 2 changes are on `/reports/audit` only and are frontend-only.

## Source Documents
- CR Doc Path: `/app/memory/change_requests/CR_001_all_orders_status_derivation.md`
- Impact Analysis Doc Path: `/app/memory/change_requests/impact_analysis/CR_001_IMPACT_ANALYSIS.md`
- Implementation Plan / Handover Doc Path: `/app/memory/handover/CR_001_IMPLEMENTATION_HANDOVER.md`
- Sequencing Index: `/app/memory/handover/IMPLEMENTATION_SEQUENCE_INDEX.md`
- Backend asks consolidated into: `/app/memory/change_requests/CR_004_BACKEND_EXT_sub_cr.md`

## Implementation Summary
CR-001 corrected the Audit Report's status-derivation pipeline, filter bar, and room-order handling, then was extended in Phase 2 with UAT-driven refinements: a redesigned table column set, an Order # prefix system, a renamed Running tab, transferToRoom routing, a 2-checkbox PG toggle, and architecturally-correct gap-detection that no longer flags room-order IDs as missing.

## Files Modified
| File Path | Change Summary | Reason |
| --- | --- | --- |
| `/app/frontend/src/api/services/reportService.js` | Phase 1: hold rule, audit fallback, `transferred` removal, channel/platform/razorpay plumbing. Phase 2: running fall-through rule, `transferToRoom → 'running'` rule, new derived display fields (`displayOrderId`, `orderIdPrefix`, `tableNo`, `displayLocationLabel`, `punchedBy`, `actionedBy`, `actionedByLabel`), watch-list diagnostics. | Phase 1 status-derivation fix + Phase 2 display layer + diagnostics |
| `/app/frontend/src/pages/AllOrdersReportPage.jsx` | Phase 1: tab definitions, room exclusion, gap detection, PG filter, status breakdown. Phase 2: tab id `unpaid`→`running` rename + widening (status==='running' OR paymentStatus==='unpaid' OR transferToRoom), G4 architectural correction (gap detection on full list, display on non-room list), G6 sort-aware gap rendering trigger, dropped retired `'nonGateway'` PG branch. | Tab semantics + correct architecture |
| `/app/frontend/src/components/reports/FilterBar.jsx` | Phase 1: `On Hold` status option, Channel rebuilt (Dine-in / Takeaway / Delivery), Platform conditional visibility, PG tri-state pill control, `roomTransfer` removed. Phase 2: PG control replaced with 2-checkbox toggle (`All` / `PG`), Non-Gateway dropped, status dropdown gained `Running` option. | Filter UX + PG simplification |
| `/app/frontend/src/components/reports/FilterTags.jsx` | Phase 1: platform + paymentGateway tag rendering. Phase 2: PG label updated to `PG`. | Active-filter chip readability |
| `/app/frontend/src/components/reports/OrderTable.jsx` | Phase 1: `audit` badge style + label. Phase 2: TABLE→TABLE NO header, dropped WAITER, added PUNCHED BY + ACTIONED BY, prefixed Order # rendering (`displayOrderId`), Running tab now uses `columnsWithPayment`, Cancelled/Credit slice indices updated for the 8-column base, sort-aware gap-detection trigger (G6), missing-row placeholder handles new column ids. | Display overhaul + gap-detection correctness |
| `/app/frontend/src/components/reports/ExportButtons.jsx` | Phase 2: CSV + PDF columns aligned with on-screen (`Order #` uses `displayOrderId`, `Table No`, `Punched By`, `Actioned By` combined label+name, `Payment`, `Amount`). | Exports stay consistent with what operators see |

## Scope Implemented
### Phase 1 (originally-approved CR-001)
- Hold derivation rule (`f_order_status === 9` OR `payment_method === 'paylater'`) before Unpaid
- `audit` fallback replaces silent `paid` default
- `transferred` derivation rule fully removed
- Normalized fields surfaced: `channel` (from `order_type`), `platform` (from `order_from`), `razorpayOrderId`, `isPaymentGateway`
- Room-order global exclusion (RM / SRM / payment_method 'ROOM') from tab filtering, tab counts, summary, status breakdown, exports
- `Transferred` tab removed from the bar; `roomTransfer` removed from `STATUS_CONFIG` pills
- Status dropdown gains **On Hold**; Channel canonical list = Dine-in / Takeaway / Delivery; Platform filter conditionally rendered when `order_from` is consistently present
- Tri-state Payment Gateway pill (All / Gateway / Non-Gateway)
- Audit tab includes both missing-ID placeholders AND real `status === 'audit'` rows
- `audit` badge added to `OrderTable`

### Phase 2 (UAT-driven follow-ups in this session)
- **Audit fall-through fix:** added `running` rule for `f_order_status ∈ {0,1,2,4,5,7,8}` so true running orders are no longer routed to Audit.
- **Tab rename:** `unpaid` tab → `running`; widened to include real running rows (`status==='running'`) + unpaid rows (`paymentStatus==='unpaid'`) + transferToRoom rows. Same yellow color preserved.
- **Status dropdown:** added `Running` value so operators can narrow within or across tabs.
- **transferToRoom routing:** rows with `payment_method='transferToRoom'` excluded from Paid tab and routed to Running tab with status='running' for visual consistency with other running rows. Payment column now visible on the Running tab so operators see the literal `transferToRoom` value.
- **Order # prefix system:** `R-` for `order_in='RM'`; `T-` for `order_in='SRM'`, `tableId>0`, OR `payment_method='transferToRoom'`. Computed once in `reportService.js`, exposed as `displayOrderId` and used by both the on-screen table and CSV/PDF exports. Sorting still uses the underlying numeric ID.
- **TABLE column rebuilt:** header `TABLE → TABLE NO`. Source preference: `table_no` → `Room` / `→ R<id>` → `Delivery` / `Takeaway` / `Walk-in` / `Dine-in` → `—`.
- **WAITER column replaced** with two new columns:
  - **PUNCHED BY** — derived from `waiter_name` with fallback to `Employee #<waiter_id>`.
  - **ACTIONED BY** — dynamic per row status: `Collected by <name>` / `Cancelled by <name>` / `Merged by <name>` / `—`.
- **Exports** (CSV + PDF) — column set aligned with on-screen: `Order #` uses prefixed `displayOrderId`, `Table No`, `Punched By`, `Actioned By` (label+name combined).
- **PG control simplification (UAT Q-B):** the 3-pill radio (All / Gateway / Non-Gateway) was replaced with **2 checkboxes (☐ All  ☐ PG)**. Internal state still uses the same `paymentGateway` filter key with two values: `null` (default = no narrowing) and `'gateway'` (narrow to rows carrying `razorpay_order_id`). The retired `'nonGateway'` branch was removed both from FilterBar options and from page-level filter logic.
- **G4 — Room order IDs flagged as MISSING in the Audit tab:** root caused to gap detection running on the room-excluded list. Architectural correction: gap detection now runs on the **full** order list (including rooms) so room IDs are seen as real, NOT as gaps; tab counts / display / exports still use the room-excluded list per CS-16..CS-22.
- **G6 — Sort-by-Status produced phantom MISSING placeholders:** `OrderTable.jsx::insertMissingOrders` is now only invoked when sort is `orderId` ascending/descending == `desc`. For other sort columns (Status / Time / Customer / Punched By / Payment / Amount), gap detection is suppressed because adjacent rows no longer represent the natural numeric sequence.

### Non-functional / process work in this session
- Temporary diagnostics added and intentionally left in place to support backend-keys verification:
  - `[CR-001 DIAG]` — top-level fetch summary (already existed pre-session).
  - `[CR-001 P2 DIAG] order=<id>` — per-watched-order raw + derived field dump.
  - `[CR-001 G5 DIAG]` — auto-snapshot of first 5 unprefixed orders per fetch (helps identify dine-in counter / walkin orders).
  - `[CR-004 P2 DIAG]` — `/get-room-list` response on `/reports/rooms` mount.

## Out Of Scope / Not Touched
- Backend changes (CR-001 has always been frontend-only)
- CR-002 (status derivation + tab logic unification refactor) — explicitly deferred
- CR-003 row actions (Mark Unpaid / Change Method / Collect Bill) — separate CR
- CR-004 Room Orders Report — separate CR
- Reports-summary dashboard, KOT/print, payment, room-billing flows
- `paymentService.CLEAR_BILL` latent bug (out of scope)

## API Changes
- **No new endpoints. No payload contract changes.**
- New consumer of existing `/api/v2/vendoremployee/report/order-logs-report` (added derivation rules + display fields entirely on frontend).

## Socket Changes
- None.

## Payload / Data Changes
- Frontend-only enrichment in `reportService.js::getOrderLogsReport`. Each transformed row now additionally exposes: `displayOrderId`, `orderIdPrefix`, `tableNo`, `displayLocationLabel`, `punchedBy`, `actionedBy`, `actionedByLabel`. Legacy fields `waiter`, `table`, `location` are preserved for backward compatibility with other consumers (OrderDetailSheet, RoomRowCard).

## UI / UX Changes
- New tab structure on `/reports/audit`: `All Orders | Paid | Cancelled | Added to Credit | On Hold | Merged | Running | Aggregator | Audit`.
- New columns: `TABLE NO`, `PUNCHED BY`, `ACTIONED BY`. Order # prefixed (R-/T-).
- New PG checkbox control (☐ All  ☐ PG).
- New `Running` status filter option in the Status dropdown.
- Audit tab no longer pollutes with running orders or with phantom MISSING placeholders for room IDs.

## Backward Compatibility Notes
- All transform additions are additive; no field renames or removals.
- Legacy `waiter`, `table`, `location`, `orderId` fields preserved.
- The `"unpaid"` value of `STATUS_FILTER_OPTIONS` is preserved (used to narrow within the Running tab).
- Exports inherit visible filtered rows; column set widened, no positional contract advertised externally.

## Deviations From Approved Plan
- **Phase 2 was added in-session** as a series of UAT-driven follow-ups; not present in the original CR-001 plan but folded into the same CR per user direction (rather than spawning a separate CR-001-FOLLOWUP).
- The originally-approved CS-16..CS-22 "global room exclusion" was briefly walked back in an attempted G4 fix (room rows shown with R- prefix) but reverted to the spec-correct architecture: rooms remain excluded from operator-facing views; gap detection alone uses the full list to prevent room IDs from being flagged as missing.

## Validation Performed
| Check | Result | Notes |
| --- | --- | --- |
| ESLint on `reportService.js` | Passed | No issues |
| ESLint on `AllOrdersReportPage.jsx` | Passed | No issues |
| ESLint on `FilterBar.jsx` | Passed | No issues |
| ESLint on `FilterTags.jsx` | Passed | No issues |
| ESLint on `OrderTable.jsx` | Passed | No issues |
| ESLint on `ExportButtons.jsx` | Passed | No issues |
| Manual UAT — running rows route to Running tab + retain RUNNING badge | Passed | Verified by user on screenshots |
| Manual UAT — transferToRoom rows excluded from Paid + appear in Running with Payment cell showing the literal `transferToRoom` | Passed | Verified by user |
| Manual UAT — Order # prefix renders correctly (`T-`/`R-`) for tableId>0, RM, SRM, transferToRoom; falls back to no-prefix for takeaway/delivery/walk-in | Passed | Verified by user |
| Manual UAT — TABLE NO column shows `table_no` when present, fallback to `Dine-in`/`Delivery`/`Takeaway`/`Walk-in` | Passed | Verified by user (real `table_no` mostly missing on this endpoint — see deferred P5) |
| Manual UAT — PUNCHED BY column renders `Employee #<waiter_id>` (real names pending backend) | Passed (degraded data) | Verified by user — see deferred P1 |
| Manual UAT — ACTIONED BY column renders correct dynamic label (`Collected by` / `Cancelled by` / `Merged by`) with `—` for the name (pending backend) | Passed (degraded data) | Verified by user — see deferred P2 |
| Manual UAT — PG control: ☐ All / ☐ PG checkboxes; clicking PG narrows to gateway rows; clicking All un-narrows | Passed | Verified by user |
| Manual UAT — Running rename + widening: 4 RUNNING + 1 transferToRoom row visible together | Passed | Verified by user |
| Manual UAT (G4) — Room order IDs no longer appear as MISSING placeholders; rooms themselves not visible in Audit Report | Passed | Verified by user |
| Manual UAT (G6) — Sort by Status / Time / Customer / Punched By / Payment / Amount — no phantom MISSING placeholders | Passed | Verified by user |
| OrderDetailSheet still opens correctly for non-room rows | Passed | No room rows displayed |
| CR-003 row actions (Change Method / Mark Unpaid / Collect Bill) still work and are correctly gated | Passed | No regressions |
| CSV / PDF export — new column headers + prefixed Order # render | Passed (visual) | Visual confirmation |
| Cross-page regression on `/reports/summary` and `/reports/rooms` | Spot-checked | No regression observed |
| Full automated test suite | **Not run** | Pre-existing test-suite breakage (missing `@testing-library/react`); independent of CR-001 |

## User Validation
- Status: Passed
- User confirmation: Multiple back-to-back screenshots and explicit `validated` / `proceed` replies during the UAT cycles for each Phase 2 sub-step.
- Date/session context: 2026-04-29 implementation session (`CR-28-april` branch).

## Known Issues / Deferred Items
All items below are tracked formally in **`/app/memory/change_requests/CR_004_BACKEND_EXT_sub_cr.md`**.

### Deferred to backend (P1–P6)
- **P1** PUNCHED BY shows `Employee #<id>` because `/order-logs-report` does not return `waiter_name`.
- **P2** ACTIONED BY shows the dynamic label but with a `—` value because `/order-logs-report` does not return `cancel_by_name`, `merge_by_name`, `collect_by_name` (or equivalents).
- **P3** Cancellation Reason column on the Cancelled tab shows `—` because `cancel_reason` is not returned by `/order-logs-report`.
- **P4** Cancellation Status column (`Before cooking` / `Before serving` / `After serving`) is not yet rendered because `cancel_type` (or equivalent) is not returned.
- **P5** TABLE NO column rarely shows real table numbers — `table_no` is not returned on `/order-logs-report` for most rows; the fallback (`Dine-in` / `Delivery` / `Takeaway` / `Walk-in`) is used most of the time.
- **P6** Room order amounts on `/order-logs-report` — `room_info` block is not confirmed to be present on this endpoint, so room rows that did appear (briefly during the G4 mis-fix) showed `Amount = ₹0` instead of room-balance numbers. Now moot for this report (rooms not displayed); still relevant for any future cross-report aggregation.

### Closed by user direction
- **G5** Dine-in counter orders (`table_id = 0`, `order_type = 'dinein'`) lack the T- prefix. Investigation confirmed they are NOT walk-in orders. User directed `leave it`; tracked as closed.

### Moved to sub-CR (`CR_004_BACKEND_EXT`)
- **G1** transferToRoom rows show RUNNING in the Audit Report even after the room has been settled — requires a backend-stamped `is_settled` / `room_settled_at` signal that the frontend rule can read.

### Other observed but out-of-scope
- Pre-existing `paymentService.CLEAR_BILL` latent bug — untouched.
- Pre-existing `LoadingPage.jsx` ESLint missing-dependency warning — untouched.
- Pre-existing test-suite breakage (`ProtectedRoute.test.jsx` missing `@testing-library/react` mock) — untouched.

## Diagnostic Code (intentionally left in place)
The following dev-mode diagnostics remain in `reportService.js` and `RoomOrdersReportPage.jsx` to support backend-keys validation as P1–P6 are resolved. Each is a clearly-marked `TEMP DIAGNOSTIC` block, removable in a single small follow-up commit.
- `[CR-001 P2 DIAG] order=<id>` — full raw + derived field dump per watched order id.
- `[CR-001 G5 DIAG] orders without prefix (first 5)` — auto-snapshot of any unprefixed order to help identify dine-in counter rows.
- `[CR-004 P2 DIAG] /get-room-list response` — `/get-room-list` payload sample on Room Orders page mount.

## Ready For QA Handover?
- Yes. See `/app/memory/change_requests/qa_handover/CR_001_QA_HANDOVER.md`.

## Next Agent
- Change Request QA Validation Agent (use the QA handover doc as the source of truth).
