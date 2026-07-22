# CR-004 Implementation Handover

## Scope
Implementation handover for **CR-004 only**.

CR title:
**Room Orders Report — PMS-Style View (Phase 1: Read-Only)**

Status:
- CR: approved for planning
- Impact analysis: approved for planning

Mode assumptions for implementation agent:
- Implement only CR-004
- Do not mix in CR-003 mutation work
- Ensure CR-001 sequencing is respected

## Hard Dependency
**CR-001 should merge first or together**.
Reason:
- Audit Report must stop showing room orders to avoid double display with new Room Orders report

## Request Summary
CR-004 adds a new **read-only Room Orders report** under Reports.
It introduces:
- new route `/reports/rooms`
- new sidebar entry `Room Orders`
- room-grouped PMS-like report
- lazy-loaded expandable room detail using existing endpoints only

## Final Locked Scope
### Included
- New route in `App.js`
- New sidebar child in `Sidebar.jsx`
- New page `RoomOrdersReportPage.jsx`
- Day-level list uses `ORDER_LOGS_REPORT`
- Expand detail uses `get-single-order-new`
- One row per room parent
- SRM-only fallback grouping by `parent_order_id`
- Page is read-only in Phase 1
- Date picker + simple status filter (`In-house` / `All`)
- Summary bar
- CSV + PDF export
- Room warning badge when RM parent lacks `room_info`
- Session cache for expanded rows

### Excluded
- No backend changes
- No room payment / folio / checkout actions
- No socket/live updates
- No room billing lifecycle policy changes
- No history/checked-out filter
- No extra channel/platform/payment filters

## Critical Planning Notes From Approved Impact Analysis
### 1) Transform mismatch must be re-verified
The approved impact analysis records a user-approved direction:
- extend `reportFromAPI.singleOrderNew` additively so roomInfo + associatedOrders are passed through

But it also explicitly says:
- **implementation planning agent must re-verify this choice before locking file plan**

Reason:
- current `reportFromAPI.singleOrderNew` does not expose `room_info` / `associated_order_list[]`
- only `orderTransform.fromAPI.order` clearly does

### 2) Lazy-load tension remains real
User wants collapsed rows to show values that partly live only in detail payload:
- room pending amount
- associated-order totals
- room-order total

But CR also says:
- do not prefetch per-room detail on page load

Implementation agent must reconcile one of these paths:
1. eager detail fetch for all rooms on first load
2. placeholders/spinners for detail-derived collapsed values until fetched
3. ask user to relax CS-5 before coding if necessary

Do not ignore this conflict.

## Affected Module(s)
- Primary: **Reports / Audit / Summary Module**
- Secondary (read-only reuse only): **Rooms / Room Check-In Module**

## Related APIs
- `POST /api/v2/vendoremployee/report/order-logs-report`
- `POST /api/v2/vendoremployee/get-single-order-new`

No new endpoint.

## State Impact
- Entirely page-local state:
  - selected date
  - room rows
  - expanded row ids
  - per-room detail cache
  - loading / error / retry state
- No new global context
- No localStorage changes

## UI Impact
- New report route and navigation entry
- New room list / expandable row UI
- New summary bar
- New room warning badge behavior
- New room export behavior

## Key Confirmed Decisions
- One row per RM parent order id
- Same room number with different parent order ids = separate rows
- SRM-only groups are allowed
- SRM-only groups do **not** show rent/advance/balance or billing-not-set-up badge
- Use generic label `Associated order`
- Room number should come from `location.tableName`, not `location.display`
- Sidebar permission is inherited from `report`
- Scan & Order SRM should behave like any other SRM associated order

## Primary Files To Change
1. `/app/frontend/src/App.js`
2. `/app/frontend/src/components/layout/Sidebar.jsx`
3. `/app/frontend/src/pages/RoomOrdersReportPage.jsx` (NEW)
4. `/app/frontend/src/components/reports/RoomRowCard.jsx` (NEW)
5. `/app/frontend/src/components/reports/RoomOrdersTable.jsx` (NEW or reuse strategy)
6. `/app/frontend/src/api/services/reportService.js` or `/app/frontend/src/api/transforms/reportTransform.js` only if required by the row-expand transform decision
7. `/app/frontend/src/components/reports/ExportButtons.jsx` (likely extension)

## File-Level Change Plan

### 1) `/app/frontend/src/App.js`
- Intended change:
  - add `/reports/rooms` route
- Risk:
  - Low

### 2) `/app/frontend/src/components/layout/Sidebar.jsx`
- Intended change:
  - add `Room Orders` child under reports
  - ensure click handler routes properly instead of “coming soon” fallback
- Risk:
  - Medium

### 3) `/app/frontend/src/pages/RoomOrdersReportPage.jsx` (NEW)
- Intended change:
  - own room grouping
  - fetch day-level list
  - manage expand/collapse/detail cache
  - manage summary/filter/export wiring
- Risk:
  - High
- Notes:
  - keep grouping page-local if possible
  - avoid growing hotspot service file without need

### 4) `/app/frontend/src/components/reports/RoomRowCard.jsx` (NEW)
- Intended change:
  - collapsed + expanded row rendering
  - warning badge
  - row-specific loading/error/retry UI
- Risk:
  - Medium

### 5) `/app/frontend/src/components/reports/RoomOrdersTable.jsx` (NEW or reuse)
- Intended change:
  - child order list rendering if needed
- Risk:
  - Low to Medium

### 6) `reportService.js` / `reportTransform.js`
- Intended change:
  - only if transform path decision requires it
- Risk:
  - High because both are hotspots/shared paths
- Notes:
  - keep changes additive and minimal
  - verify no regression to audit-report detail sheet

### 7) `/app/frontend/src/components/reports/ExportButtons.jsx`
- Intended change:
  - support room export shape if current implementation is too audit-specific
- Risk:
  - Low to Medium

## Recommended Implementation Sequence
1. Re-verify transform strategy for room detail path
2. Lock lazy-load vs collapsed-summary behavior
3. Add route + sidebar entry
4. Build page shell and grouping logic
5. Build room row card and row cache behavior
6. Add export support
7. Regression-check audit report and detail sheet

## Grouping Rules To Preserve
- RM rows = canonical room parent rows
- SRM-only rooms = grouped by `parent_order_id`
- one row per room parent key
- same room number can appear multiple times if separate parent order ids exist
- use `location.tableName` for RM room number display

## Risks
- Transform mismatch on row-expand detail
- Expanding hotspot files (`reportService.js`, `reportTransform.js`)
- Lazy-load conflict with requested collapsed totals
- Accidental regression to Audit Report detail sheet
- Double counting if CR-001 is not already merged

## Things That Must Remain Unchanged
- No mutation actions
- No room billing/print workflow changes
- No socket/live updates
- No backend endpoint additions
- No room check-in logic changes
- No CR-003 paid/hold actions

## Testing Checklist
- Happy path tested:
  - route opens
  - rows group correctly
  - expand fetches detail once and caches
  - exports work
- Error path tested:
  - row-level detail failure shows retry without breaking page
- Permission-gated path tested:
  - inherited report access still works
- Socket/reload/re-entry behavior tested:
  - date change refetches
  - collapse/re-expand uses cache
- Related print/payment/room path tested:
  - no room mutation actions present
  - no audit report regression
- Regression surfaces checked:
  - `/reports/audit`
  - `/reports/summary`
  - report detail side sheet
  - sidebar navigation

## Minimal Validation Cases
1. `/reports/rooms` route renders and sidebar highlights correctly
2. Room rows appear from RM parents
3. SRM-only rooms group correctly by `parent_order_id`
4. RM room number uses `tableName`
5. Row expand fetches detail once only
6. Missing `room_info` on RM parent shows warning badge
7. SRM-only group does not show rent/advance/balance badge behavior incorrectly
8. Export output reflects visible room list
9. Audit Report no longer double-shows room orders if CR-001 is merged

## Notes For Implementation Agent
- Re-verify transform path before coding.
- Do not silently assume the current `getSingleOrderNew()` transform already provides roomInfo/associatedOrders.
- If lazy-load conflict cannot be resolved cleanly without violating the frozen CR, stop and ask for clarification before implementation.
