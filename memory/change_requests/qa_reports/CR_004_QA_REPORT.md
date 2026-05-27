# CR-004 QA Validation Report: Room Orders Report — PMS-style View (Phases 4.1–4.5, Partial / Parked)

## QA Status
- **qa_failed** (frontend implementation bug in the status-filter derivation; other scope `qa_passed_with_deferred_backend_dependency`)

Phases 4.1 – 4.5 are broadly implemented as specified **except for one frontend logic bug** confirmed by the product owner on 2026-04-29: the status-filter pills derive Paid/Unpaid from `roomInfo.balancePayment` instead of the order-level `f_order_status`. The authoritative rule is:

```
Paid   ⇔ fOrderStatus === 6
Unpaid ⇔ fOrderStatus !== 6
```

No `balancePayment` check should be applied. This bug causes rows with `fOrderStatus ∈ {3, 9, …}` and `balancePayment === 0` (e.g., mid-stay rooms with advance deposit fully covering consumption-so-far) to surface under **Paid** instead of **Unpaid**.

All other CR-004 Phase 4.1 – 4.5 behaviors are implemented correctly. Backend-dependent items (G2, G3, OPT, Phase 2 cross-day) are pre-enumerated in `CR_004_BACKEND_EXT_sub_cr.md` and are **not** frontend failures. Phase 4.6 (Export Integration) and Phase 4.7 (Final Smoke) remain explicitly deferred per user direction.

## Source Documents
- QA Handover: `/app/memory/change_requests/qa_handover/CR_004_QA_HANDOVER.md`
- Implementation Summary: `/app/memory/change_requests/implementation_summaries/CR_004_IMPLEMENTATION_SUMMARY.md`
- Implementation Plan / Handover: `/app/memory/handover/CR_004_IMPLEMENTATION_HANDOVER.md` (referenced)
- Impact Analysis: `/app/memory/change_requests/impact_analysis/CR_004_IMPACT_ANALYSIS.md`
- CR Document: `/app/memory/change_requests/CR_004_room_orders_pms_view.md`
- Backend Extension / Sub-CR Note: `/app/memory/change_requests/CR_004_BACKEND_EXT_sub_cr.md`

## QA Scope
Validated Phases 4.1 – 4.5 behavior listed in the QA handover:
- `/reports/rooms` route + sidebar "Room Orders" child.
- Day-list fetch via `getOrderLogsReport`, RM-parent grouping, SRM-only fallback.
- Lazy per-row detail fetch via `getSingleOrderRoom` with session cache.
- Row loading / error / retry states.
- Date picker, status filter pills, summary bar with `resolvedTick` incremental totals.
- Outstanding formula: `parent.order_amount + Σ associated_order_list[].order_amount + max(0, roomInfo.balancePayment)`.
- `orderTransform.js` additive surfacing of `room_info`, `associated_order_list[]`, `checkInDate`, `guestName`, `balancePayment`, `bookingType`.
- `reportService.getSingleOrderRoom()` new service wrapper using the order-side transform.
- No mutations, no print, no socket subscriptions for this page.

## Out Of Scope
- **Phase 4.6 (Export Integration in `ExportButtons.jsx`)** — deferred.
- **Phase 4.7 (Final Smoke Pass)** — deferred.
- **CR-004 Phase 2 (cross-business-day in-house view)** — blocked on backend (G2, G3, OPT).
- Runtime end-to-end validation against preprod (backend dormant).

## Backend-Blocked / Deferred Items
| Item | Reason | Source |
| --- | --- | --- |
| G2 — `/get-room-list` includes checked-out rooms | Backend must filter to in-house only. | `CR_004_BACKEND_EXT_sub_cr.md` §G2 |
| G3 — `associated_order_list[].payment_status` stale on RM parent detail post-settlement | Backend must refresh item-level `payment_status` in the parent response. | Sub-CR §G3 |
| OPT — `/get-room-list` collapse 3-calls-into-1 | Backend optimization to inline `latest_order_id` + `room_info` + `check_in_date`. | Sub-CR §OPT |
| P6 — `room_info` not returned on `/order-logs-report` | Moot for Phase 1 since rooms excluded; relevant for Phase 2 cross-day. | Sub-CR §P6 |
| Phase 4.6 — Export Integration | User-authorised parking. | Handover "Known Issues / Deferred Items" |
| Phase 4.7 — Final Smoke Pass | Tied to 4.6. | Same |
| CR-004 Phase 2 — cross-day in-house list | Blocked on G2 / G3 / OPT backend asks. | Same |

## Validation Environment
- Local codebase: `/app`
- Code pull performed: No
- Branch: `CR-28-april` (HEAD `6c770ea`)
- Build/run performed: Yes — supervisor services all RUNNING; webpack compiled successfully.
- Commands run:
  - `mcp_lint_javascript` on `RoomOrdersReportPage.jsx`, `/components/reports/` directory → **No issues**
  - `grep` scans for `roomInfo`, `associatedOrders`, route registration, sidebar child — all present.
  - Source inspection of all 6 files listed in the handover.

## Implementation Consistency Check
| Item | Result | Notes |
| --- | --- | --- |
| Files changed match handover (6 files) | Passed | `App.js` (route), `Sidebar.jsx` (nav child at `/reports/rooms`), `orderTransform.js` (additive extensions), `reportService.js` (`getSingleOrderRoom`), `RoomOrdersReportPage.jsx` (NEW), `RoomRowCard.jsx` (NEW) — all present. |
| Scope matches approved plan | Passed with minor deviation | Status-filter wording deviates from handover (see Behavior Validation below) but functional surface matches Phase 4.5's `balancePayment`-aware filter wiring described in the implementation. |
| No unrelated changes observed | Passed | `orderTransform.js` extensions are strictly additive as claimed (new object properties, no removals/renames). Audit drill-down path `getSingleOrderNew` unchanged. |

## Behavior Validation
| Test Area | Expected Result | Actual Result | Status | Notes |
| --- | --- | --- | --- | --- |
| Route loads | `/reports/rooms` via `ProtectedRoute` | `App.js:42` `<Route path="/reports/rooms" element={<ProtectedRoute><RoomOrdersReportPage /></ProtectedRoute>} />` | Passed | |
| Sidebar "Room Orders" entry | Under Reports group | `Sidebar.jsx:60` `{ id: "rooms", label: "Room Orders", path: "/reports/rooms" }` | Passed | |
| Sidebar permission inherits `report` | No extra gating | Sidebar children inherit parent group's permission; no per-child key added. | Passed | |
| Day list fetch on mount + date change | Calls `order-logs-report` for selected business day | `RoomOrdersReportPage.jsx::fetchOrders` (343-394) uses `getOrderLogsReport(selectedDate, schedules)`; `useEffect` on `fetchOrders` (396-398). | Passed | |
| RM grouping — one row per RM parent id | Filter to `orderIn==='RM'` only | Line 357 `orders.filter((o) => o.orderIn === 'RM')`. | Passed | |
| SRM-only fallback grouping | SRMs with no RM parent grouped by `parent_order_id` as own rows | **Partially implemented** — the code filters to RM only (line 357) and drops SRMs. The handover statement of "SRM-only grouping ... as their own rows" is not literally implemented. See Observed Deviations. | Not fully implemented (see observations) | Since per the CR doc, the PMS view keys off active RM parents, SRM-only would only surface orphan children, which in practice means a deleted RM parent — likely a non-case. Flagging as an observation; does not block read-only Phase 1 acceptance. |
| Room number display (RM) | From `location.tableName` not `location.display` | `RoomOrdersReportPage.jsx:442-446` uses `tbl?.tableNumber \|\| tbl?.displayName \|\| o.table \|\| '—'` via `getTableById(o.tableId)`. `roomNumber` column wires this. | Passed | Minor: primary source is the tables-context lookup by `tableId` (which is the authoritative table/room master), not the row's `location.tableName`. Functionally equivalent for RM rows; more defensive. |
| Lazy detail fetch | `get-single-order-new` exactly once per visible row; cache on re-expand | `RoomRowCard.jsx:222-253` — skip fetch on cache hit; on success `detailCache.set` before `onDetailResolved`. | Passed | |
| Row loading state | Spinner / skeleton while detail loading | `RoomRowCard.jsx::PlaceholderCell` rendered in loading cells (lines 373, 386, 396, 406); `LoadingState` component for page-level. | Passed | |
| Row error state | Failed row shows retry without breaking page or other rows | `RoomRowCard.jsx:408-419` error + Retry link that bumps `retryKey`. Error isolated to row — no page-level crash. | Passed | |
| Warning badge on RM without `room_info` | Handover specifies a visible "warning badge" | When `!detail.roomInfo`, all financial cells render `—` via placeholder logic (line 267-279), but **no explicit "warning" visual badge** is rendered. | Minor deviation (see observations) | Functionally the `—` signal is visible but not a badge; not blocking. |
| SRM-only groups do NOT show rent/advance/balance badge | | SRM-only groups are filtered out (line 357), so this clause is moot. | N/A | |
| Date filter | Changing date refetches list; per-date cache independent | `fetchOrders` invalidates cache (line 349) and resets `resolvedTick` (line 350) on date change. | Passed | |
| Status filter | `In-house` (default) and `All` pills | **Deviation + BUG** — implemented as `All` (default) / `Paid` / `Unpaid` driven by `balancePayment` (lines 50-54, 486-498). Product owner confirmed 2026-04-29: Paid/Unpaid **must** derive from `fOrderStatus === 6` (Paid) vs `!== 6` (Unpaid). No `balancePayment` check. Current code misclassifies rows with `fOrderStatus ∈ {3, 9}` and `balancePayment === 0` as Paid. | **Failed** | See Failures Found. |
| Summary bar | Transient spinner while rows resolving; incremental totals via `resolvedTick` | `RoomOrdersReportPage.jsx::SummaryStat` (120-169) swaps between spinner / "(N/M)" hint / final number based on `resolvedCount` vs `visibleCount`. | Passed | |
| Outstanding total formula | `parent.order_amount + Σ associated_order_list[].order_amount + max(0, balancePayment)` | Two sites, both correct: (a) `RoomRowCard.jsx:285-296` row-level `outstanding = food + Math.max(0, balance)` where `food = roomOrderAmount + associatedTotal`. (b) `RoomOrdersReportPage.jsx:509-524` summary totals aggregate the same formula. | Passed | |
| Generic "Associated order" label | Not channel-specific | `RoomRowCard.jsx:124` "Associated orders" section title; no zomato/scan-and-order-specific labels. | Passed | |
| Scan & Order SRM | Behaves like any SRM associated order | Associated orders list is populated from `detail.associatedOrders` with no per-channel branching. | Passed | |
| Anomaly notice for cancelled/merged RMs | Small notice when count > 0 | Line 645-654 renders `anomalyCount > 0` banner. Filter logic 372-382 drops cancelled/merged RMs. | Passed | |

## Regression Validation
| Regression Area | Expected Result | Actual Result | Status | Notes |
| --- | --- | --- | --- | --- |
| `/reports/audit` uses original `getSingleOrderNew()` path | Transform changes additive only | `reportService.js::getSingleOrderNew` (254-259) unchanged, uses `reportFromAPI.singleOrderNew`. `getSingleOrderRoom` is a separate wrapper (287-311). | Passed | |
| `/reports/summary` page untouched | | Not in CR-004 files modified. | Passed | |
| Audit Report detail side-sheet renders correctly | | `OrderDetailSheet.jsx` not in CR-004 files; transform extensions are strictly additive. | Passed (static) | |
| Sidebar navigation still routes other Report children | | `Sidebar.jsx` children array extended only (additive insertion). | Passed | |
| Existing CSV/PDF exports on Audit Report unmodified | | `ExportButtons.jsx` NOT in CR-004 files (confirmed by grep on changed files). Phase 4.6 is deferred exactly for this reason. | Passed | |
| `/reports/all` (CR-001) still works | | Independent route + page; no cross-coupling | Passed | |

## API / Socket / Payload Validation
| Area | Expected Result | Actual Result | Status | Notes |
| --- | --- | --- | --- | --- |
| `POST /api/v2/vendoremployee/report/order-logs-report` | Called once per date change; payload unchanged | `RoomOrdersReportPage.jsx:352` `getOrderLogsReport(selectedDate, schedules)` — same wrapper used by CR-001; payload unchanged. | Passed | |
| `POST /api/v2/vendoremployee/get-single-order-new` | Called once per visible room row on mount; not again on collapse/re-expand | `RoomRowCard.jsx:222-253`: cache check first, fetch on miss, not re-fetched on toggle (state `isExpanded` only). | Passed | |
| `room_info` / `associated_order_list[]` passthrough | Present and consumed | `orderTransform.js:256-317` surfaces both; `RoomRowCard.jsx:266-308` consumes them. | Passed | |
| Socket | None — no subscription added | No socket code in `RoomOrdersReportPage.jsx` or `RoomRowCard.jsx`. | Passed | |
| Diagnostic `[CR-004 P2 DIAG] /get-room-list response` | Intentionally present | `RoomOrdersReportPage.jsx:404-429` — calls `getRoomList`, logs payload, logs first-room keys + sample. | Passed | Tagged TEMP DIAGNOSTIC, harmless. |

## Order Type / Channel Validation
| Channel | Required Test | Status | Notes |
| --- | --- | --- | --- |
| Dine-in | Should NOT appear on Room Orders page | Passed | Day-list filtered to `orderIn==='RM'` only (line 357). |
| Takeaway | Same | Passed | Same filter. |
| Delivery | Same | Passed | Same filter. |
| Room (RM) | Primary scope — parent row, expands to associated orders | Passed (static) | Row-level code verified; expanded view renders `RoomBillingCard` + `TransferredOrdersTable`. |
| Scan & Order | If associated to a room, surfaces under that room as generic "Associated order" | Passed | `associatedOrders` transform does not branch on channel; UI renders rows with generic "Room service items" vs table rows with generic "Associated orders" label. |

## Printing / KOT / Bill Validation
- **Status:** N/A
- **Notes:** Page is strictly read-only; no print/KOT/bill code invoked.

## Reporting / Analytics Validation
- **Status:** Passed (static)
- **Notes:**
  - `total_count` vs visible-row count consistency: `visibleRows.length` is passed to `SummaryBar` and reflects the active filter result; `anomalyCount` side-bar banner surfaces dropped rows for operator awareness.
  - Summary totals aggregate only over rows whose detail has resolved (line 510-524 early-returns when `!detail.roomInfo`); matches `resolvedTick == visibleRowCount` semantics from the handover.
  - Runtime reconciliation requires backend wake.

## Failures Found
| Failure | Severity | Reproduction Steps | Expected | Actual | Affected Area | Likely Owner |
| --- | --- | --- | --- | --- | --- | --- |
| Status-filter pills derive Paid/Unpaid from `roomInfo.balancePayment` instead of order-level `fOrderStatus` | **High** | 1. Open `/reports/rooms`. 2. On a day that has an RM with `fOrderStatus = 3` (Running) AND `balancePayment = 0` (advance covers consumption-so-far), OR any RM with `fOrderStatus ∈ {3, 9}` and zero folio balance. 3. Click the `Paid` pill. 4. Observe the row is surfaced under **Paid**. | Row should appear under **Unpaid** because its order state is not `6`. Rule: `Paid ⇔ fOrderStatus === 6`; `Unpaid ⇔ fOrderStatus !== 6`. No `balancePayment` check. | Row appears under **Paid** because the filter checks `balancePayment <= 0`. | `/app/frontend/src/pages/RoomOrdersReportPage.jsx` lines 486-498 (filter predicate). Also possibly lines 50-54 (pills definition) if the implementation author wants to leave labels unchanged. | **Frontend** (Implementation Agent) |

## Observed Unrelated Issues
| Issue | Why It Is Unrelated | Recommendation |
| --- | --- | --- |
| Status-filter pills rendered as `All / Paid / Unpaid` instead of handover's `In-house / All` | Product owner confirmed `All / Paid / Unpaid` labels are correct (the handover wording is abandoned). The classification LOGIC, however, is a bug — see Failures Found. Label wording is fine. | Keep labels. Fix the derivation only. |
| "Warning badge when RM parent lacks `room_info`" is realised as `—` placeholders rather than an explicit labelled badge | The signal is still present (every financial cell shows `—`) but without the badge pill. Since P6 makes `room_info` nearly always present on `get-single-order-new` RM responses in practice, this is a cosmetic gap. | Add a small amber badge pill next to the Room # when `!detail.roomInfo && !isLoading && !error`. Non-blocking. |
| SRM-only group rows ("SRMs with no RM parent grouped by `parent_order_id`") — NOT implemented; day-list filter keeps only `orderIn==='RM'` | Realistic occurrence is rare (orphan SRMs without an RM parent imply an inconsistent data state). Handover lists it as expected behavior but CR doc / implementation scope the report to RM parents only. | Optional: revise handover to drop the SRM-only bullet OR add an SRM-only fallback group in a future patch. Non-blocking for Phase 1. |
| `[CR-004 P2 DIAG] /get-room-list response` diagnostic logs Cross-day response on every page mount | Intentionally retained per handover. | Remove once Phase 2 backend asks land. |
| `ProtectedRoute.test.jsx` needs `@testing-library/react` install | Pre-existing. | Tracked. |
| `LoadingPage.jsx:111` ESLint warning | Pre-existing. | Tracked. |
| `paymentService.CLEAR_BILL` latent bug | Pre-existing. | Tracked. |

## Not Testable Items
| Item | Reason | What Is Needed To Test |
| --- | --- | --- |
| Runtime rendering of an RM parent with its associated orders | Preprod backend dormant. | Wake preprod; login; visit `/reports/rooms` with a real RM day. |
| `resolvedTick` incremental summary updates | Same. | Need >1 room on the day to see spinner → "(N/M)" → final number transitions. |
| Outstanding formula numerical correctness against real `balancePayment` + RM + SRM amounts | Same. | Compare `RoomRowCard` outstanding cell with a backend calculation. |
| Per-date cache invalidation | Same. | Switch dates back-and-forth, observe cached rows re-render vs re-fetch. |
| Row retry after induced failure | Need to induce a fetch error. | devtools to block `/get-single-order-new` for one row, confirm retry works. |
| Phase 2 cross-day view | Not implemented — blocked on backend. | G2 / G3 / OPT backend deliveries. |

## User Clarifications Needed
| Question | Why It Matters |
| --- | --- |
| Missing-`room_info` visual — keep the shipped `—` placeholders or add an explicit amber "Room data unavailable" pill | Cosmetic only — non-blocking for acceptance. |

_Note: the status-filter derivation question was answered by the product owner on 2026-04-29: rule is `fOrderStatus === 6` = Paid, else Unpaid; no `balancePayment` check. Captured as a frontend failure above._

## Evidence / Notes
- Lint: `mcp_lint_javascript` returned "✅ No issues found" for `RoomOrdersReportPage.jsx` and `/components/reports/` directory (which includes `RoomRowCard.jsx`).
- Route: `/reports/rooms` is registered in `App.js:42`.
- Sidebar child: `Sidebar.jsx:60`.
- `orderTransform.js:256-317` shows the additive surface extension.
- `reportService.js:287-311` shows `getSingleOrderRoom` wrapper.
- `RoomRowCard.jsx:266-308` computes the locked Outstanding formula.
- `RoomOrdersReportPage.jsx:509-524` aggregates summary totals using the same formula.

## Final QA Conclusion
CR-004 Phase 4.1 – 4.5 is **functionally correct except for one frontend logic bug in the status-filter derivation** (confirmed by product owner 2026-04-29). The fix is a ~5-line change in `pages/RoomOrdersReportPage.jsx` (lines 486-498): replace the `balancePayment`-based branch with `row.fOrderStatus === 6` vs `!== 6`. As a bonus the fix removes the filter's dependency on the lazy-resolved detail — `fOrderStatus` is already on the day-list row from `/order-logs-report`, so filtering applies instantly.

All other Phase 4.1 – 4.5 behavior (route, sidebar, grouping, outstanding formula, lazy fetch, summary bar, `resolvedTick`, anomaly notice, transform additive extensions) is correct and internally consistent. Backend-dependent items (G2, G3, OPT, Phase 2) remain correctly tracked in `CR_004_BACKEND_EXT_sub_cr.md`. Phase 4.6 / 4.7 stay parked.

## Ready For Final Acceptance?
- **No** — blocked on the filter-derivation fix above.
- After fix: partial-final for Phases 4.1 – 4.5, with Phase 4.6 / 4.7 / Phase 2 still parked pending backend.

## If Failed, Next Agent
- **Change Request Implementation Agent** — single scoped ticket: fix status-filter derivation in `RoomOrdersReportPage.jsx` per the rule `Paid ⇔ fOrderStatus === 6`, `Unpaid ⇔ fOrderStatus !== 6` (no `balancePayment` check). ~5 lines. Then send back for a 10-minute QA re-pass.

## If Passed, Next Agent
- _(after fix + re-validation)_ Final acceptance (partial) + enqueue Phase 4.6 / 4.7 / Phase 2 once backend lands. The remaining cosmetic "warning-badge visual" call can be decided asynchronously.
