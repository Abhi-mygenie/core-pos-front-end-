# CR-001 Implementation Handover

## Scope
Implementation handover for **CR-001 only**.

CR title:
**Fix Status Derivation + Filter Structure in All Orders Report**

Status:
- CR: approved for planning
- Impact analysis: approved for planning

Mode assumptions for implementation agent:
- Implement only CR-001
- Do not mix in CR-003 or CR-004 changes
- Respect current code as truth if docs and code differ

## Request Summary
CR-001 is a frontend-only Audit Report correction for `/reports/audit`.

It includes:
1. Hold classification fix
2. Audit fallback instead of silent paid fallback
3. Filter bar correction (Status / Channel / Platform)
4. Global room-order exclusion from Audit Report
5. Razorpay payment-gateway tri-state filter
6. Removal of transferred status/tab behavior from this report

## Final Locked Scope
Use the **approved impact analysis** as final authority.

### Included
- In `getOrderLogsReport()`:
  - add `hold` rule when:
    - `f_order_status === 9`, or
    - `payment_method?.toLowerCase() === 'paylater'`
  - this must run before `unpaid`
  - remove silent `paid` fallback
  - fallback becomes `audit`
  - remove transferred derivation rule entirely
  - normalize and expose:
    - `channel` from `order_type`
    - `platform` from `order_from`
    - `razorpayOrderId`
    - `isPaymentGateway`
- Remove room orders globally from Audit Report where:
  - `order_in === 'RM'`
  - `order_in === 'SRM'`
  - `payment_method === 'ROOM'`
- Apply room exclusion before:
  - tab filtering
  - counts
  - summary
  - gap detection
- Remove `Transferred` tab and related logic from Audit Report
- Add `On Hold` to Status dropdown
- Channel dropdown final list must be exactly:
  - Dine-in
  - Takeaway
  - Delivery
- Platform filter:
  - values: POS / Web
  - sourced from `order_from`
  - hide entire filter if backend data is not consistently present
- Add Payment Gateway tri-state filter:
  - All
  - Gateway
  - Non-Gateway
- Audit tab must include:
  - missing placeholders
  - real rows with `status === 'audit'`
- Add `audit` badge support in `OrderTable`

### Explicitly Excluded
- No backend changes
- No CR-002 unification refactor
- No CR-003 actions
- No CR-004 room PMS view
- No aggregator channel/filter expansion beyond existing tab behavior
- No print / socket / localStorage changes

## Affected Module(s)
- Primary: **Reports / Audit / Summary Module**
- No intended ownership change to backend aggregation logic

## Primary Files To Change
1. `/app/frontend/src/api/services/reportService.js`
2. `/app/frontend/src/pages/AllOrdersReportPage.jsx`
3. `/app/frontend/src/components/reports/FilterBar.jsx`
4. `/app/frontend/src/components/reports/OrderTable.jsx`
5. `/app/frontend/src/components/reports/FilterTags.jsx`

## Related APIs
- `POST /api/v2/vendoremployee/report/order-logs-report`

No API contract change.

## State Impact
- Page-local report state only:
  - `allOrders`
  - `filteredOrders`
  - `tabCounts`
  - `summary`
  - `missingCount`
  - `runningCount`
  - filter state
- No context changes required
- No localStorage changes

## UI Impact
- Tabs:
  - remove Transferred
- Filter bar:
  - add Hold
  - fix Channel values
  - enable/hide Platform intelligently
  - add PG tri-state pills
- Order rows:
  - unmatched rows display `Audit` badge
- Audit tab:
  - count/indicator includes missing + unmatched real rows

## Key Code Truths Already Verified
- `reportService.js` currently:
  - defaults to `paid`
  - still derives `transferred`
  - does not normalize `channel/platform/razorpay`
- `AllOrdersReportPage.jsx` currently:
  - still has Transferred tab
  - unpaid filter does not exclude hold robustly
  - audit filter only shows missing placeholders
  - room filtering is not global
  - gap detection still uses full order list
  - platform filter is not applied
- `FilterBar.jsx` currently:
  - missing Hold
  - channel = Dine In / Room
  - platform is disabled
  - status config still contains roomTransfer
- `OrderTable.jsx` currently:
  - `hold` badge exists
  - `audit` badge missing
- `FilterTags.jsx` currently:
  - no labels for platform or PG filter

## File-Level Change Plan

### 1) `/app/frontend/src/api/services/reportService.js`
- Why affected:
  - owns `getOrderLogsReport()` derivation and transformed row shape
- Intended change:
  - add hold derivation
  - remove transferred derivation
  - fallback to audit
  - expose channel/platform/gateway fields
- Risk level:
  - High (hotspot file)
- Keep in mind:
  - Do not refactor unrelated functions
  - Keep changes narrow to `getOrderLogsReport()`

### 2) `/app/frontend/src/pages/AllOrdersReportPage.jsx`
- Why affected:
  - owns tab definitions, tab filters, counts, gap detection input, filter wiring
- Intended change:
  - remove transferred tab/filter
  - introduce global room exclusion pre-filter
  - update audit/hold/unpaid behavior
  - apply platform + PG filters
  - recalculate counts using room-excluded data
- Risk level:
  - High
- Keep in mind:
  - gap detection must operate on post-exclusion list only
  - audit tab must combine missing placeholders + real audit rows

### 3) `/app/frontend/src/components/reports/FilterBar.jsx`
- Why affected:
  - filter options and visible controls live here
- Intended change:
  - add Hold to status options
  - final channel options = Dine-in / Takeaway / Delivery
  - remove transferred references
  - hide Platform filter if data unavailable
  - add PG tri-state inline control
  - remove `roomTransfer` from status pills config
- Risk level:
  - Medium

### 4) `/app/frontend/src/components/reports/OrderTable.jsx`
- Why affected:
  - status badge rendering
- Intended change:
  - add `audit` badge label/style
- Risk level:
  - Low

### 5) `/app/frontend/src/components/reports/FilterTags.jsx`
- Why affected:
  - active-filter badges need new readable labels
- Intended change:
  - support platform tag
  - support payment gateway tag
- Risk level:
  - Low

## Implementation Sequence
1. Fix data derivation in `reportService.js`
2. Add global room exclusion and correct tab logic in `AllOrdersReportPage.jsx`
3. Correct filter bar options and add PG control
4. Add audit badge support
5. Add filter-tag support
6. Verify counts, summary, and export inheritance

## Regression Risks
- `reportService.js` is an architecture hotspot
- Tab counts can drift after room exclusion and audit fallback changes
- Gap detection can remain wrong if done before room exclusion
- Platform filter can misbehave if `order_from` is inconsistently present
- Exports must continue using visible filtered rows

## Things That Must Remain Unchanged
- No backend endpoint changes
- No socket behavior changes
- No CR-003 row actions
- No CR-004 room page work
- No localStorage behavior change
- No aggregator tab rewrite

## Testing Checklist
- Happy path tested:
  - hold rows classified correctly
  - unmatched rows go to audit
  - transferred tab removed
  - room orders absent from all audit tabs
- Error path tested:
  - page still handles report fetch failure cleanly
- Permission-gated path tested:
  - not applicable for CR-001
- Socket/reload/re-entry behavior tested:
  - route reload and date change still work
- Related print/payment/room path tested:
  - room orders removed from audit only; no room workflow mutation
- Regression surfaces checked:
  - `/reports/audit`
  - `/reports/summary`
  - export behavior
  - audit gap detection

## Minimal Validation Cases
1. A paylater row appears only in Hold, never Unpaid
2. An `f_order_status === 9` row appears only in Hold
3. A row matching no rule appears as Audit
4. Audit tab includes:
   - missing placeholders
   - real unmatched rows
5. No RM/SRM/ROOM row appears in any Audit Report tab
6. Gap detection no longer flags room-order IDs as missing
7. Channel filter shows only Dine-in / Takeaway / Delivery
8. Platform filter:
   - works when `order_from` data exists
   - hides when not consistently available
9. PG tri-state narrows rows correctly
10. Export output reflects active visible filtered rows

## Notes For Implementation Agent
- Final authority is the approved impact-analysis clarifications, not the earlier raw CR wording where they differ.
- Keep implementation narrow and do not start CR-003/CR-004 work in the same patch.
