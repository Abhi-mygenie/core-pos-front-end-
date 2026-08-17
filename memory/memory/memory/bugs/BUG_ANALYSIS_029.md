# BUG-029 Impact Analysis

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-029/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Analysis: intake_created

## User Reported Issue
- After settling a prepaid order, the POS returns to the previous order edit screen instead of clearing out to a fresh/new order state.

## Evidence Reviewed
- Intake entry in `/app/memory/BUG_TEMPLATE.md`
- Evidence folder exists at `/app/memory/bugs/attachments/BUG-029/`
- No local attachment files were present in the evidence folder
- Intake notes also say the linked Drive folder was reachable but empty at intake time

## Module Mapping
- Primary Module: Dashboard / POS Workspace Module
- Downstream Impacted Modules: Order Entry / Cart / Payment Workflow; Tables & Orders Runtime State Module; Realtime Socket Module
- Module decision reference: `/app/memory/final/MODULE_DECISIONS_FINAL.md`

## Affected Route / Page
- `/dashboard`

## Affected Screen / Flow
- Dashboard card/grid → prepaid order in served state → Settle action on card (`OrderCard` / `TableCard`) → dashboard remains active → stale OrderEntry reopen / previous selection persists

## Affected Code Areas
| File | Reason |
| --- | --- |
| `/app/frontend/src/components/cards/OrderCard.jsx` | Prepaid served orders call `completePrepaidOrder()` from `handleSettlePrepaid` but do not clear dashboard order-entry selection state. |
| `/app/frontend/src/components/cards/TableCard.jsx` | Same prepaid-settle behavior exists in table/grid mode. |
| `/app/frontend/src/pages/DashboardPage.jsx` | Owns `orderEntryTable`, `orderEntryType`, and `initialShowPayment`; stale values here would reopen the previous edit screen. |
| `/app/frontend/src/api/socket/socketHandlers.js` | `update-order-paid` / terminal order removal can remove the order from context, but does not itself clear dashboard page-local selection state. |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Relevant as a contrast: some payment paths explicitly clear local state, but dashboard card settle path bypasses that cleanup. |

## API Review
- Endpoints:
  - `POST /api/v2/vendoremployee/order/paid-prepaid-order`
- Payload builders:
  - `completePrepaidOrder()` in `orderService.js`
- Response consumers:
  - `OrderCard.handleSettlePrepaid`
  - `TableCard.handleSettlePrepaid`
  - socket follow-up via `update-order-paid`
- Soft-fail/hard-fail behavior:
  - HTTP success relies on socket follow-up to remove order from runtime lists.
- API contract risk:
  - Low as a root cause. The issue is more likely page-local UI state cleanup after successful settle.

## Socket / Realtime Review
- Socket events:
  - `update-order-paid`
  - `order-engage`
- State sync behavior:
  - terminal paid orders are removed from OrderContext by socket handlers
  - Dashboard page-local order-entry state is separate from OrderContext
- Socket risk:
  - Medium. Even with correct socket removal, stale selected UI state can keep the previous edit modal/panel relationship alive.

## State / Data Flow
- `DashboardPage` stores current edit selection in:
  - `orderEntryTable`
  - `orderEntryType`
  - `initialShowPayment`
  - `initialTransferItem`
- `OrderEntry` is rendered whenever `orderEntryType` is truthy.
- `handleCloseOrderEntry()` is the main dashboard cleanup function that resets this state.
- Prepaid settle from `OrderCard` / `TableCard` does not call dashboard cleanup directly.

## Relevant Final Documentation
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` → dashboard is the orchestration boundary; realtime may sync via socket instead of HTTP response.
- `/app/memory/final/MODULE_DECISIONS_FINAL.md` → Dashboard / POS Workspace + Order Entry / Cart / Payment Workflow + Realtime Socket modules.

## Current Code Behavior
- In `OrderCard.jsx`, prepaid served orders show a `Settle` button that calls `completePrepaidOrder(orderId, ...)`.
- In `TableCard.jsx`, prepaid served tables also show a `Settle` button with the same pattern.
- Neither card-level settle handler clears `DashboardPage` selection state.
- `DashboardPage` only hides `OrderEntry` when `handleCloseOrderEntry()` runs and resets `orderEntryTable` / `orderEntryType` / `initialShowPayment`.
- Since `OrderEntry` rendering depends on those page-local values, a stale selection can persist independently of the order having been removed from context.

## Expected Behavior
- After prepaid settlement, the current operational screen should clear out of the old order and return to a fresh/new-order/dashboard-ready state rather than reopening the previous order edit view.

## Root Cause Hypothesis
- Hypothesis: frontend orchestration-state bug.
- The prepaid settle action from dashboard cards removes the order through API + socket flow, but does not explicitly clear `DashboardPage`'s page-local selection/open-order state. That makes stale order-entry UI state the most likely reason the app appears to jump back into the previous order edit screen.

## Regression Risk Areas
- Prepaid served-settle flow in both card view and table view
- Dashboard ↔ OrderEntry open/close orchestration
- Socket-driven paid-order removal timing
- Any recent prepaid fixes around BUG-001 / BUG-002 / BUG-274

## Docs / Code Mismatch
- None identified.

## Open Questions / Missing Information
- The intake does not specify whether this happened from `OrderCard` list view, `TableCard` grid view, or inside `OrderEntry` itself.
- No screenshot/video was provided to confirm whether the "previous order" was the just-settled order or another stale selection on the same table.

## User Interaction Required
- Not required.

## Analysis Verdict
- Frontend bug

## Analysis Outcome
- Analysis Complete

## Ready For Next Stage?
- Yes

## Next Step
- If Analysis Outcome is Analysis Complete or Analysis Complete after user clarification:
  Next stage may continue based on status = analysis_done.
