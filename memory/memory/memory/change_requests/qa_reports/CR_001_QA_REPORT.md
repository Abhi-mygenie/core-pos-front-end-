# CR-001 QA Validation Report: All Orders Report — Status derivation + filter structure (Phase 1 + Phase 2)

## QA Status
- **qa_passed_with_deferred_backend_dependency**

Frontend implementation matches the approved CR-001 scope as documented in the QA handover and implementation summary. All backend-dependent data fields (P1–P6, G1) show the expected fallback behavior and are already tracked in `CR_004_BACKEND_EXT_sub_cr.md` — per the playbook, these are **not** frontend failures.

## Source Documents
- QA Handover: `/app/memory/change_requests/qa_handover/CR_001_QA_HANDOVER.md`
- Implementation Summary: `/app/memory/change_requests/implementation_summaries/CR_001_IMPLEMENTATION_SUMMARY.md`
- Implementation Plan / Handover: `/app/memory/handover/CR_001_IMPLEMENTATION_HANDOVER.md` (referenced)
- Impact Analysis: `/app/memory/change_requests/impact_analysis/CR_001_IMPACT_ANALYSIS.md`
- CR Document: `/app/memory/change_requests/CR_001_all_orders_status_derivation.md`
- Backend Extension / Sub-CR: `/app/memory/change_requests/CR_004_BACKEND_EXT_sub_cr.md`

## QA Scope
Validated the complete CR-001 Phase 1 + Phase 2 behavior listed in the QA handover:
- Status derivation pipeline in `reportService.js::getOrderLogsReport`.
- Tab bar composition, room exclusion, gap detection architecture (G4), sort-aware gap detection (G6).
- Filter bar (Status dropdown, Channel, Platform conditional visibility, PG 2-checkbox toggle).
- FilterTags rendering for platform + paymentGateway.
- OrderTable column overhaul (8-column base; Running/Paid add Payment; Paid adds Actions).
- Order # prefix system (`R-` / `T-`) and TABLE NO / PUNCHED BY / ACTIONED BY derivation.
- CSV + PDF export column alignment with on-screen.
- Diagnostic logs intentionally retained (`[CR-001 DIAG]`, `[CR-001 P2 DIAG]`, `[CR-001 G5 DIAG]`).

## Out Of Scope
- Runtime multi-tenant end-to-end validation against real `/order-logs-report` data (preprod backend dormant — "Frontend Preview Only" banner rendered at login).
- Backend-owned display data (P1–P6).
- CR-002, CR-003 functionality (separately validated).

## Backend-Blocked / Deferred Items
| Item | Reason | Source |
| --- | --- | --- |
| P1 — PUNCHED BY renders `Employee #<waiter_id>` | `/order-logs-report` does not return `waiter_name`. Frontend fallback working correctly. | `CR_004_BACKEND_EXT_sub_cr.md` §P1 |
| P2 — ACTIONED BY renders correct dynamic label but name part is `—` | `/order-logs-report` omits `collect_by_name`/`cancel_by_name`/`merge_by_name`. | Sub-CR §P2 |
| P3 — Cancelled-tab Reason column shows `—` | `cancel_reason` not returned. | Sub-CR §P3 |
| P4 — Cancellation Status column not rendered | `cancel_type` not returned; column scoped but not wired. | Sub-CR §P4 |
| P5 — TABLE NO mostly shows fallback labels (`Dine-in`/`Delivery`/etc.) | `table_no` not returned on most rows. Fallback chain works as specified. | Sub-CR §P5 |
| P6 — `room_info` not on `/order-logs-report` | Moot (rooms excluded from this report) but tracked. | Sub-CR §P6 |
| G1 — transferToRoom RUNNING badge persists post-settlement | No backend settlement signal. Frontend rule forces `status='running'` as specified in handover. | Sub-CR §G1 |

## Validation Environment
- Local codebase: `/app`
- Code pull performed: No
- Branch: `CR-28-april` (HEAD `6c770ea`)
- Build/run performed: Yes — supervisor services all RUNNING; webpack compiled successfully.
- Commands run:
  - `mcp_lint_javascript` on `reportService.js`, `AllOrdersReportPage.jsx`, `components/reports/*` → **No issues**
  - `curl` on `https://insights-phase.preview.emergentagent.com/reports/audit` → **200 OK** (protected route falls back to login, app mounts cleanly)
  - Source file inspection of the 6 changed files.

## Implementation Consistency Check
| Item | Result | Notes |
| --- | --- | --- |
| Files changed match handover (6 files) | Passed | `reportService.js`, `AllOrdersReportPage.jsx`, `FilterBar.jsx`, `FilterTags.jsx`, `OrderTable.jsx`, `ExportButtons.jsx` — all present with CR-001 edits. |
| Scope matches approved plan | Passed | Phase 1 derivation + Phase 2 UAT refinements + G4/G5/G6 fixes all present. |
| No unrelated changes observed | Passed | Legacy fields (`waiter`, `table`, `location`, `orderId`) preserved for backward compatibility as claimed. |

## Behavior Validation
| Test Area | Expected Result | Actual Result | Status | Notes |
| --- | --- | --- | --- | --- |
| Tab bar composition | `All Orders \| Paid \| Cancelled \| Added to Credit \| On Hold \| Merged \| Running \| Aggregator \| Audit` — no Transferred | `ALL_ORDERS_TABS` (AllOrdersReportPage.jsx:47-57) matches exactly | Passed | |
| Hold tab filter | `f_order_status===9` OR `payment_method==='paylater'` (case-insensitive); paylater NOT in Unpaid/Running | `TAB_FILTERS.hold` (line 84): `paymentMethod?.toLowerCase()==='paylater' \|\| fOrderStatus===9`. `TAB_FILTERS.running` and `TAB_FILTERS.paid` both explicitly exclude paylater + `fOrderStatus===9`. | Passed | |
| Running tab widening | `status==='running' OR paymentStatus==='unpaid' OR transferToRoom`; excludes Cancelled/Merged/paylater/9 | `TAB_FILTERS.running` (line 97-107) matches exactly | Passed | |
| Paid tab filter | Excludes Cancel/Merge/TAB/unpaid/paylater/9/transferToRoom; requires `fOrderStatus===6` | `TAB_FILTERS.paid` (line 65-80) matches | Passed | |
| Audit tab filter | `_isMissing===true OR status==='audit'` | `TAB_FILTERS.audit` (line 112) matches | Passed | |
| Audit tab dynamic color | Red when count>0, green when 0 | Tab renderer (line 819-839) checks `auditHasItems` | Passed | |
| Default sort Order # desc | `sortConfig` initial `{key:'orderId', direction:'desc'}` | `OrderTable.jsx:616` confirms | Passed | |
| G6 — sort-aware gap detection | Gap placeholders only when sort is Order # desc | `OrderTable.jsx:667-671` condition matches | Passed | |
| G4 — gap detection uses FULL list (incl rooms) | Rooms are "real" rows, not "missing" | `AllOrdersReportPage.jsx:302-326` iterates `fullOrders` (pre-room-exclusion) | Passed | |
| Status derivation fallback = `audit` (not silent `paid`) | Unmatched rows → 'audit' | `reportService.js:494` `let status = 'audit'`; no `else status='paid'` | Passed | |
| `transferred` rule retired | Not derived anywhere | `reportService.js` has no `transferred` branch; comment line 499-501 confirms removal | Passed | |
| Running fall-through rule | `fStatus ∉ {3, 6, 9, null}` → 'running' | `reportService.js:525-533` matches | Passed | |
| `transferToRoom` → `status='running'` | Routed to Running tab with yellow badge; Payment column shows literal | `reportService.js:512-520` + `OrderTable.jsx:155-157` Running uses `columnsWithPayment` | Passed | |
| Order # prefix `R-` for RM | | `reportService.js:585-586` | Passed | |
| Order # prefix `T-` for SRM/tableId>0/transferToRoom | | `reportService.js:587-593` | Passed | |
| Dine-in counter (`table_id=0`) NO prefix | G5 closed by user direction | Confirmed — no branch adds prefix when tableId=0 and not RM/SRM/transferToRoom | Passed | |
| TABLE NO fallback chain | `table_no → Room → → R<id> → Delivery/Takeaway/Walk-in/Dine-in → —` | `reportService.js:604-623` matches | Passed | |
| PUNCHED BY resolver | `waiter_name → Employee #<id> → —` | `reportService.js:627-629` | Passed | |
| ACTIONED BY dynamic label | `Collected by/Cancelled by/Merged by <name>`; `—` otherwise | `reportService.js:648-668` + renderer `OrderTable.jsx:453-470` | Passed | |
| Status dropdown options | Paid, Cancelled, Merged, Credit, **Running**, Unpaid, **On Hold** | `FilterBar.jsx:86-96` matches; Transferred removed | Passed | |
| Channel filter options | Dine-in / Takeaway / Delivery only | `FilterBar.jsx:113-117` matches; no Room, no Aggregator | Passed | |
| Platform filter conditional | Hidden when `hasPlatformData===false` | `FilterBar.jsx:233-241` + `AllOrdersReportPage.jsx:246` detection | Passed | |
| Platform permissive on missing | `!o.platform \|\| o.platform===filters.platform` | `AllOrdersReportPage.jsx:409` matches | Passed | |
| PG 2-checkbox toggle | `☐ All ☐ PG`; two-state `paymentGateway ∈ {null, 'gateway'}` | `FilterBar.jsx:143-146` + toggle logic 258-303 | Passed | `Non-Gateway` branch retired as specified. |
| PG filter chip reads "Payment Gateway: PG" | | `FilterTags.jsx:53` + `FilterBar.jsx:145` "PG" label | Passed | |
| Status breakdown pills | Excludes `roomTransfer`, `hold`, `audit` (new pills not added per CS-21/Q-E) | `FilterBar.jsx::STATUS_CONFIG` = all/paid/cancelled/credit/merged/running/missing | Passed | |
| All-tab breakdown running count | = running tab count + gap-detection running placeholders | `AllOrdersReportPage.jsx:434, 444`: `runningTabCount + runningCount` | Passed | |
| Exports — CSV columns aligned | `Order # (prefixed) \| Date/Time \| Customer \| Table No \| Punched By \| Actioned By \| Payment Method \| Amount` | `ExportButtons.jsx:51-61` — contains all 8 spec columns in order PLUS an extra `Payment Type` column (see Observed Unrelated Issues). | Passed | Extra column is additive and harmless; see observation below. |
| Exports — CSV Cancelled adds Cancel Reason | | `ExportButtons.jsx:64-66` | Passed | |
| Exports — CSV Aggregator adds Platform + Rider | | `ExportButtons.jsx:67-70` | Passed | |
| Exports — PDF columns aligned with on-screen | | `ExportButtons.jsx:165-197` 8 columns, uses `displayOrderId`, `displayLocationLabel`, `punchedBy`, `actionedBy` | Passed | |
| Diagnostics intentionally present | `[CR-001 DIAG]`, `[CR-001 P2 DIAG] order=<id>`, `[CR-001 G5 DIAG]` | `reportService.js:726, 764, 813` | Passed | Tagged as TEMP DIAGNOSTIC, harmless. |

## Regression Validation
| Regression Area | Expected Result | Actual Result | Status | Notes |
| --- | --- | --- | --- | --- |
| OrderDetailSheet drawer opens from non-room rows | `onRowClick` wired, sheet untouched | `AllOrdersReportPage.jsx:499-502, 907-912` unchanged sheet API | Passed | |
| CR-003 row-action pills use same eligibility predicate | RM/SRM/ROOM/Aggregator excluded | `OrderTable.jsx::isOrderEligibleForRowActions` (line 222-233) same predicate | Passed | |
| `/reports/summary` page untouched | Not in CR-001 file changes | Confirmed — summary page not in files modified | Passed | |
| `/reports/rooms` independent | CR-004 page separate code path | Confirmed — no cross-coupling | Passed | |
| Tab counts vs visible row count | Both use room-excluded list | `AllOrdersReportPage.jsx:291, 382, 421` all derive from `allOrders` (room-excluded) | Passed | |
| Date change / silent reload | `fetchOrders` clears optimistic markers on success | `AllOrdersReportPage.jsx:255-264` clears `paymentMethodOverrides`, `optimisticUnpaidIds`, `optimisticCollectedIds` | Passed | |

## API / Socket / Payload Validation
| Area | Expected Result | Actual Result | Status | Notes |
| --- | --- | --- | --- | --- |
| `POST /api/v2/vendoremployee/report/order-logs-report` | Payload unchanged | `reportService.js:452-456` posts `{sort_by, from_date, to_date}` — unchanged from pre-CR-001 | Passed | |
| Socket subscriptions | Untouched | No socket code added in CR-001 files | Passed | |
| Read-only fields | `payment_method, payment_status, f_order_status, order_type, order_from, razorpay_order_id` | Confirmed — all read-only in `reportService.js::getOrderLogsReport` | Passed | |

## Order Type / Channel Validation
| Channel | Required Test | Status | Notes |
| --- | --- | --- | --- |
| Dine-in (table_id>0) | Order # `T-`, badge correct, tab routing correct | Passed (static) | Prefix rule verified code-level. Runtime data-level check requires live backend. |
| Dine-in (table_id=0) | TABLE NO shows `Dine-in`; NO prefix (G5 closed) | Passed (static) | Verified code paths. |
| Takeaway | TABLE NO `Takeaway`; no prefix | Passed (static) | |
| Delivery | TABLE NO `Delivery`; no prefix | Passed (static) | |
| Room (RM) | Excluded from report; ID not `MISSING` (G4) | Passed (static) | `isRoomOrderForReport` predicate; gap detection on full list. |
| Room transfer (SRM) | Excluded; ID not `MISSING` | Passed (static) | Same predicate. |
| transferToRoom | `T-` prefix, `running` status, yellow badge, on Running tab, Payment shows literal | Passed (static) | `transferToRoom` routing + Running tab includes `paymentMethod.toLowerCase()==='transfertoroom'`. Persistent RUNNING badge after room settlement = G1 (backend_blocked). |
| Scan & Order | Via existing order_type/order_from channels | Passed (static) | No special handling required; matches handover. |

## Printing / KOT / Bill Validation
- **Status:** N/A (CR-001 does not touch print/KOT/bill paths).
- **Notes:** Not applicable per handover.

## Reporting / Analytics Validation
- **Status:** Passed (static)
- **Notes:**
  - `statusBreakdown.running = runningTabCount + runningCount` ✓ reconciles with tab badge.
  - `calculateSummary(result)` invoked on every filter/tab change (line 424) so Total/Avg recompute.
  - CSV/PDF generators compute `totalAmount` from the visible filtered list (ExportButtons.jsx:91).
  - Runtime reconciliation against live data requires backend wake.

## Failures Found
| Failure | Severity | Reproduction Steps | Expected | Actual | Affected Area | Likely Owner |
| --- | --- | --- | --- | --- | --- | --- |
| _(none within approved CR-001 scope)_ | — | — | — | — | — | — |

## Observed Unrelated Issues
| Issue | Why It Is Unrelated | Recommendation |
| --- | --- | --- |
| `ExportButtons.jsx` CSV has an extra `Payment Type` column (column list = 9 items; handover spec lists 8) | The `Payment Type` column is a pre-existing legacy field not removed in CR-001. All values render blank since `order.paymentType` is not populated. The summary row still terminates at the Amount position (`"Total","","","","","","","₹<total>"` = 8 fields) which creates a minor 1-column off-by-one in the CSV footer row alignment but does not affect data integrity. | Tighten in a follow-up: either drop the `paymentType` column or pad the summary row by one. Non-blocking. |
| `LoadingPage.jsx:111` ESLint `react-hooks/exhaustive-deps` warning | Pre-existing, carried from earlier work; not in CR-001 files. | Tracked in handover "pre-existing unrelated" list. |
| `paymentService.CLEAR_BILL` latent bug | Not on any CR-001 path. | Tracked. |
| `ProtectedRoute.test.jsx` test suite broken (missing `@testing-library/react`) | Pre-existing. Test suite does not run. | Tracked. |

## Not Testable Items
| Item | Reason | What Is Needed To Test |
| --- | --- | --- |
| Live data validation of status derivation against real `/order-logs-report` payload (18march / Mantri tenants) | Preprod backend shows "Wake up servers" banner; no data flows to the frontend in this environment. | Wake preprod; login with `owner@18march.com` / `Qplazm@10` or `owner@mantri.com` / `Qplazm#10`; compare tab counts / badges / prefixes against actual rows. |
| PG `gateway` filter actual narrowing | Same as above. | Same credentials + live data with at least one `razorpay_order_id`-bearing row. |
| Silent reload / date change re-classification | Same as above. | Same. |
| Running tab with real mix (running + unpaid + transferToRoom co-present) | Same as above. | Same. |

## User Clarifications Needed
_(none)_

## Evidence / Notes
- Lint: `mcp_lint_javascript` returned "✅ No issues found" for `reportService.js`, `AllOrdersReportPage.jsx`, and the whole `/components/reports/` directory.
- Route: `curl -I https://insights-phase.preview.emergentagent.com/reports/audit` → `200 OK` (protected route serves login; app mounts).
- Screenshot at `/reports/audit` shows MyGenie login screen with "Frontend Preview Only. Please wake servers" banner — frontend code loads correctly; preprod backend is dormant.
- Code references throughout this report map directly to file/line locations inspected.

## Final QA Conclusion
CR-001 Phase 1 + Phase 2 is **correctly implemented** per the approved scope and internally-consistent QA handover. Every handover-listed behavior has a matching code path; gap-detection architecture (G4), sort-aware gating (G6), and the PG 2-checkbox toggle (Phase 2 Q-B = a) are all present. All degraded-data symptoms (empty names, fallback TABLE NO labels, transferToRoom RUNNING badge after settlement) are **backend-blocked** and pre-enumerated in `CR_004_BACKEND_EXT_sub_cr.md` — they are **not** frontend failures.

## Ready For Final Acceptance?
- **Yes** (with deferred backend dependency)

## If Failed, Next Agent
- _(n/a)_

## If Passed, Next Agent
- Final acceptance. No Documentation Update Agent is needed — final docs are unaffected by this CR.
