# BUG-029 Implementation Plan

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Analysis File: /app/memory/bugs/BUG_ANALYSIS_029.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-029/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Planning: analysis_done

## Bug Summary
- After settling a prepaid served order from the dashboard, the POS re-enters a stale previous order edit state instead of returning to a fresh dashboard/new-order state.

## Analysis Verdict
- Frontend bug. The prepaid settle path on dashboard cards likely removes the order via API + socket but does not clear `DashboardPage` page-local order-entry selection state.

## Planning Decision
- Plan Status: Ready
- Reason:
  - Analysis identified a concrete orchestration boundary (`DashboardPage`) and specific prepaid settle entry points (`OrderCard`, `TableCard`).
  - The likely fix is page-local cleanup rather than API/contract change.
- Safe To Implement Without Clarification: Yes

## Pre-Change Approval Note
- Request Summary: After prepaid settle, clear stale dashboard order-entry selection so the UI does not reopen the old order edit screen.
- Change Type: state-flow fix
- Affected Modules: Dashboard / POS Workspace Module
- Downstream Impacted Modules: Order Entry / Cart / Payment Workflow; Tables & Orders Runtime State Module; Realtime Socket Module
- Files Likely To Change:
  - `/app/frontend/src/pages/DashboardPage.jsx`
  - `/app/frontend/src/components/cards/OrderCard.jsx`
  - `/app/frontend/src/components/cards/TableCard.jsx`
- Related APIs:
  - `POST /api/v2/vendoremployee/order/paid-prepaid-order`
- Payload Impact: No planned payload contract change.
- Socket Impact: No socket contract change; existing `update-order-paid` removal flow should remain intact.
- State Impact:
  - `orderEntryTable`
  - `orderEntryType`
  - `initialShowPayment`
  - `initialTransferItem`
- UI Impact: successful prepaid settle should leave dashboard in a clean non-edit state.
- Regression Risks:
  - dashboard card settle flow in both order and table/grid views
  - legitimate order-entry open state for unrelated orders
  - timing between successful settle click and socket-driven removal
- Deferred/Open Decision Dependency: None
- Safe To Implement Without Clarification: Yes

## Files To Change
| File | Planned Change | Reason |
| --- | --- | --- |
| `/app/frontend/src/pages/DashboardPage.jsx` | Add a dashboard-owned success cleanup path for prepaid settle that reuses the same state reset semantics as `handleCloseOrderEntry()` without closing unrelated overlays incorrectly. | Dashboard owns `orderEntryTable`, `orderEntryType`, and payment-entry state; this is the root orchestration boundary. |
| `/app/frontend/src/components/cards/OrderCard.jsx` | Accept and call a parent-provided post-settle success callback after `completePrepaidOrder()` resolves successfully. | Card settle path currently handles API + toast only; parent cleanup must be triggered from success path. |
| `/app/frontend/src/components/cards/TableCard.jsx` | Accept and call the same parent post-settle success callback after successful prepaid settle in grid/table mode. | BUG reproduces in both card/list and table/grid entry points. |

## Files To Inspect But Not Change
| File | Reason |
| --- | --- |
| `/app/frontend/src/api/services/orderService.js` | Verify `completePrepaidOrder()` contract stays unchanged; no service-layer change is planned. |
| `/app/frontend/src/api/socket/socketHandlers.js` | Verify `update-order-paid` / terminal removal timing so cleanup does not fight socket-driven state removal. |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Use existing post-payment cleanup behavior as a reference for what a “fresh state” reset should preserve/reset. |

## Files / Areas Not To Touch
- `/app/frontend/src/api/transforms/orderTransform.js`
- payment payload builders
- print flows / auto-bill behavior
- socket event names or channel subscriptions
- localStorage config/view-mode logic unrelated to order-entry selection cleanup

## Step-by-Step Implementation Plan

### Step 1
- Change: Add a dashboard-level callback dedicated to “prepaid settle success” that clears the currently selected order-entry state when the settled order matches the active selection.
- Files affected:
  - `/app/frontend/src/pages/DashboardPage.jsx`
- Expected result:
  - The dashboard can explicitly reset stale local order-entry state after settle success.
- Risk:
  - Over-clearing the state for unrelated active selections if matching logic is too broad.

### Step 2
- Change: Thread the new callback into `OrderCard` instances rendered from dashboard list/channel/status views and invoke it only after `completePrepaidOrder()` resolves successfully.
- Files affected:
  - `/app/frontend/src/pages/DashboardPage.jsx`
  - `/app/frontend/src/components/cards/OrderCard.jsx`
- Expected result:
  - Prepaid settle from order-card view clears stale edit state instead of leaving the old order selected.
- Risk:
  - Callback firing on failed settle or before API success would produce false UI resets.

### Step 3
- Change: Thread the same callback into `TableCard` and invoke it after successful prepaid settle in table/grid mode.
- Files affected:
  - `/app/frontend/src/pages/DashboardPage.jsx`
  - `/app/frontend/src/components/cards/TableCard.jsx`
- Expected result:
  - Both grid/table and list/card prepaid settle flows behave consistently.
- Risk:
  - Divergence between order-card and table-card implementations if one path is updated but the other is not.

### Step 4
- Change: Constrain cleanup logic so it resets only dashboard local selection/open state, while leaving socket/order-context removal to existing realtime flow.
- Files affected:
  - `/app/frontend/src/pages/DashboardPage.jsx`
- Expected result:
  - No change to backend contract or realtime removal semantics.
- Risk:
  - If implementation also mutates order/table context here, duplicate removal or race conditions could be introduced.

## API / Socket Impact
- API changes: No
- Socket changes: No
- Payload changes: No
- No API/socket contract change is planned. Existing `paid-prepaid-order` request and `update-order-paid` follow-up should remain unchanged.

## State / UI Impact
- State/context changes:
  - Dashboard page-local order-entry selection state only.
- UI behavior changes:
  - After prepaid settle, the old order edit screen should not remain/reopen.
- Loading/error/empty state impact:
  - Existing loading toast/spinner behavior in cards should remain unchanged.
- Existing behavior to preserve:
  - successful prepaid settle still depends on existing API + socket flow
  - only the stale order-entry selection cleanup changes
  - other card action buttons and non-prepaid billing flows remain unchanged

## Regression Risk
- Risk area 1: dashboard order-entry open/close orchestration
- Risk area 2: prepaid settle behavior in both list/card and grid/table surfaces
- Risk area 3: timing between card success callback and socket-driven order removal

## Validation Plan For Implementation Agent
- Manual test cases:
  - Settle a prepaid served order from `OrderCard` list/channel view and confirm dashboard does not reopen old order edit UI.
  - Settle a prepaid served order from `TableCard` grid view and confirm same result.
  - Keep another unrelated order open and confirm only matching settled selection is cleared.
- API payload checks:
  - Confirm `paid-prepaid-order` request shape is unchanged.
- Socket checks:
  - Confirm `update-order-paid` still removes the order through existing context/socket path.
- UI checks:
  - Confirm no stale `Collect Payment` panel or edit panel remains after settle.
- Regression checks:
  - Non-prepaid bill/print flows still work.
  - Opening/editing another order still works after a prepaid settle.

## Docs / Code Mismatch Or Pending Docs
- Does this plan likely require DOC_UPDATES_PENDING.md entry? No
- Do not directly update final docs.

## Open Questions
- None.

## Safe To Implement?
- Yes

## Approval Gate
Implementation must NOT start until:
1. User explicitly approves this plan.
2. Google Sheet status becomes plan_approved.
