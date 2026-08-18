# CR-001 QA Handover: Fix Status Derivation + Filter Structure in All Orders Report (Phase 1 + Phase 2)

## QA Handover Status
- ready_for_qa_validation

## User Validation Status
- user_validated (Phase 1 + Phase 2)

## Source Documents
- CR Doc Path: `/app/memory/change_requests/CR_001_all_orders_status_derivation.md`
- Impact Analysis Doc Path: `/app/memory/change_requests/impact_analysis/CR_001_IMPACT_ANALYSIS.md`
- Implementation Plan / Handover Doc Path: `/app/memory/handover/CR_001_IMPLEMENTATION_HANDOVER.md`
- Implementation Summary Doc Path: `/app/memory/change_requests/implementation_summaries/CR_001_IMPLEMENTATION_SUMMARY.md`
- Sub-CR for backend follow-ups: `/app/memory/change_requests/CR_004_BACKEND_EXT_sub_cr.md`

## What Was Implemented
A frontend-only refresh of the Audit Report (`/reports/audit`) consisting of:

1. **Status derivation rewrite** (Phase 1): Hold rule keyed on `f_order_status===9` OR `payment_method==='paylater'` runs before Unpaid; silent `paid` fallback replaced with `audit`; `transferred` rule retired entirely; channel/platform/razorpay fields surfaced.
2. **Filter restructure** (Phase 1): `On Hold` added to Status; Channel canonical list rebuilt to Dine-in/Takeaway/Delivery; Platform conditionally visible based on backend data; PG filter introduced.
3. **Room-order exclusion** (Phase 1, corrected in Phase 2): Operator-facing views exclude RM/SRM/ROOM rows. Gap detection runs on the full list so room IDs are not flagged as missing.
4. **Audit tab now true-positive only** (Phase 1): combines missing-ID placeholders + real `status==='audit'` rows.
5. **Phase 2 follow-ups (this session):** Audit fall-through fix, `Unpaid` tab → `Running` tab rename + widening, transferToRoom routing into Running, Order # prefix system (`R-`/`T-`), column overhaul (TABLE→TABLE NO, PUNCHED BY + ACTIONED BY in place of WAITER), CSV+PDF export alignment, PG control simplified to a 2-checkbox toggle, G4 architectural correction, G6 sort-aware gap-detection trigger.

## Files Changed
| File Path | Purpose |
| --- | --- |
| `/app/frontend/src/api/services/reportService.js` | Phase 1 derivation + Phase 2 derived display fields + watch-list diagnostics |
| `/app/frontend/src/pages/AllOrdersReportPage.jsx` | Tab definitions, room handling, gap detection, PG filter, status breakdown, optimistic states |
| `/app/frontend/src/components/reports/FilterBar.jsx` | Status options, channel/platform options, PG checkbox toggle |
| `/app/frontend/src/components/reports/FilterTags.jsx` | PG and platform tag rendering |
| `/app/frontend/src/components/reports/OrderTable.jsx` | Column config (8-col base), missing placeholder rendering, sort-aware gap detection |
| `/app/frontend/src/components/reports/ExportButtons.jsx` | CSV + PDF column alignment |

## Behavior To Validate In QA
| Area | Expected Behavior |
| --- | --- |
| **Tab bar** | Reads: `All Orders \| Paid \| Cancelled \| Added to Credit \| On Hold \| Merged \| Running \| Aggregator \| Audit`. No `Transferred` tab anywhere. |
| **Hold tab** | Contains rows with `f_order_status===9` OR `payment_method==='paylater'` (case-insensitive). Paylater rows do NOT also leak into Unpaid/Running. |
| **Running tab** | Contains rows with derived `status==='running'` (open / in-progress orders) + rows with `payment_status==='unpaid'` + rows with `payment_method==='transferToRoom'`. Excludes Cancelled/Merged/paylater/`f_order_status===9`. Both yellow `RUNNING` badges and amber `Unpaid` badges co-exist on this tab. Payment column visible. |
| **Audit tab** | Shows missing-ID placeholders + real rows whose `status==='audit'` (true catch-all). Indicator green when count=0, red when count>0. Room order IDs are NOT displayed as missing — gap detection accounts for them via the full order list. |
| **All Orders tab** | All non-room rows + missing placeholders. Default sort = Order # descending. Sorting by other columns suppresses missing placeholders (G6) — reverting to Order # desc restores them. |
| **Order # prefix** | `R-` for `order_in==='RM'`. `T-` for `order_in==='SRM'`, `tableId>0`, OR `payment_method==='transferToRoom'`. No prefix for takeaway / delivery / walk-in / aggregator. |
| **TABLE NO column** | Shows `table_no` if present, else `Room`/`→ R<id>`/`Delivery`/`Takeaway`/`Walk-in`/`Dine-in`/`—` fallback per `order_in` and `order_type`. (Real numbers depend on backend — see deferred P5.) |
| **PUNCHED BY column** | `waiter_name` if returned, else `Employee #<waiter_id>` fallback. (Real names pending backend — see deferred P1.) |
| **ACTIONED BY column** | `Collected by <name>` for paid, `Cancelled by <name>` for cancelled, `Merged by <name>` for merged, `—` otherwise. Names default to `—` until backend exposes them — see deferred P2. |
| **Status filter dropdown** | Options: Paid, Cancelled, Merged, Credit, **Running**, Unpaid, On Hold. |
| **Channel filter** | Dine-in / Takeaway / Delivery only. No Room. No Aggregator. |
| **Platform filter** | Visible only when at least one row carries a non-null `order_from`. Permissive on missing data when a value is selected. |
| **Payment Gateway control** | 2-checkbox toggle: `☐ All  ☐ PG`. Default: All checked. Clicking PG → All un-checks, PG checks, table narrows to rows with `razorpay_order_id`. Clicking All again clears the narrow. Active-filter chip reads `Payment Gateway: PG`. |
| **Status breakdown summary** | Reflects the room-excluded dataset. `running` count includes both real running rows and gap-detection running placeholders. |
| **Exports (CSV + PDF)** | Columns: `Order # (prefixed) \| Date/Time \| Customer \| Table No \| Punched By \| Actioned By \| Payment Method \| Amount`. Cancelled tab adds `Cancel Reason`; Aggregator adds `Platform` + `Rider`. |

## Regression Areas For QA
| Area | Why It Matters |
| --- | --- |
| OrderDetailSheet drawer for non-room rows | Display-field enrichment is additive — sheet should still open and render exactly as before. |
| CR-003 row actions (Mark Unpaid / Change Method on Paid; Collect Bill on Hold) | Same eligibility predicate (`isOrderEligibleForRowActions`) — RM/SRM/ROOM and Aggregator never get pills. Mutation window unchanged. |
| `/reports/summary` page | Untouched but consumes the same `reportService` module. Spot-check that summary numbers still reconcile. |
| `/reports/rooms` page (CR-004) | Independent code path; rooms still appear there. Confirm not regressed. |
| Tab counts vs visible row count per tab | Should match (counts use room-excluded list; visible rows do too). |
| Date change / silent reload | Re-fetch should re-classify cleanly; no stale optimistic markers (`paymentMethodOverrides`, `optimisticUnpaidIds`, `optimisticCollectedIds`). |

## API / Socket / Payload Areas To Check
| Area | Expected Result |
| --- | --- |
| `POST /api/v2/vendoremployee/report/order-logs-report` | Used as-is. No payload contract change. |
| Socket subscriptions | Untouched. |
| `payment_method`, `payment_status`, `f_order_status`, `order_type`, `order_from`, `razorpay_order_id` | Read-only. |

## Order Types / Channels To Test
| Channel | Required Test |
| --- | --- |
| Dine-in (with `table_id > 0`) | Order # prefixed `T-`. Status badge correct. Tab routing correct. |
| Dine-in (with `table_id = 0`) | TABLE NO shows `Dine-in` fallback. **Order # is NOT prefixed** — closed by user direction (G5). |
| Takeaway | TABLE NO shows `Takeaway`. Order # not prefixed. |
| Delivery | TABLE NO shows `Delivery`. Order # not prefixed. |
| Room (RM) | Excluded from this report. Lives on `/reports/rooms`. Order ID does NOT appear as missing. |
| Room transfer (SRM) | Excluded from this report. Order ID does NOT appear as missing. |
| transferToRoom | Order # prefixed `T-`. Status = `running` (yellow badge). Appears in Running tab (NOT Paid). Payment column shows literal `transferToRoom`. **Note:** This is technically a known limitation — even after room checkout the row keeps showing RUNNING because no backend signal flips it. Tracked as **G1** in the sub-CR. Until then, treat "RUNNING badge on transferToRoom" as expected. |
| Scan & Order | Routes via existing `order_type`/`order_from` channels. No special handling. |

## Printing / KOT / Bill Checks
- Not applicable — CR-001 does not change the print/KOT/bill code paths.

## Reporting / Analytics Checks
- Status breakdown summary on All Orders tab — reconcile pill values against tab counts.
- CSV export: open in Excel/Sheets; confirm column order and row count match the visible filtered list.
- PDF export: confirm header row, column widths, and totals row.

## Known Issues / Deferred Items (DO NOT FAIL QA ON THESE)
| ID | Issue | Owner | Reference |
| --- | --- | --- | --- |
| P1 | PUNCHED BY shows `Employee #<id>` (no real name) | Backend | Sub-CR |
| P2 | ACTIONED BY name part is always `—` (label is correct) | Backend | Sub-CR |
| P3 | Cancellation Reason cell on Cancelled tab is `—` | Backend | Sub-CR |
| P4 | Cancellation Status column (Before cooking / serving / After serving) not present | Backend | Sub-CR |
| P5 | TABLE NO column shows fallback labels (`Dine-in` / `Takeaway` / `Delivery` / `Walk-in`) for most rows because `table_no` is not returned by `/order-logs-report` | Backend | Sub-CR |
| P6 | Room amounts via `/order-logs-report` are not reliably populated (`room_info` not confirmed); moot for this CR since rooms are excluded | Backend | Sub-CR |
| G1 | transferToRoom rows show RUNNING even after room checkout — no settled signal from backend | Backend | Sub-CR |
| G5 | Dine-in counter orders (`table_id=0`) lack T- prefix — **closed by user direction** | n/a | Implementation summary |
| Pre-existing | `paymentService.CLEAR_BILL` latent bug | Out-of-scope | n/a |
| Pre-existing | `LoadingPage.jsx` ESLint missing-dependency | Out-of-scope | n/a |
| Pre-existing | `ProtectedRoute.test.jsx` missing `@testing-library/react` | Out-of-scope | n/a |

## QA Instructions
- Validate ONLY the approved CR-001 scope (Phase 1 + Phase 2) listed under **Behavior To Validate In QA**.
- Use the **regression areas** to spot-check that no existing flows broke.
- Do **NOT** treat **known issues / deferred items** above as CR-001 failures — they're tracked in the sub-CR.
- Diagnostic console logs (`[CR-001 P2 DIAG]`, `[CR-001 G5 DIAG]`, `[CR-004 P2 DIAG]`) are intentionally present and harmless. They will be removed after the sub-CR resolves the backend keys.
- If QA fails, produce a QA failure report with exact reproduction steps, the affected file/flow, and a screenshot/console capture if possible.
- If QA passes, mark `ready_for_final_acceptance`.

## Test Credentials
- Owner / 18march: `owner@18march.com` / `Qplazm@10`
- Owner / Mantri: `owner@mantri.com` / `Qplazm#10`

## Next Agent
- Change Request QA Validation Agent
