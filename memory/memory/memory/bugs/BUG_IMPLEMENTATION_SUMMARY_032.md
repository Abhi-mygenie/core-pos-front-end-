# BUG-032 Implementation Summary

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Analysis File: /app/memory/bugs/BUG_ANALYSIS_032.md
- Plan File: /app/memory/bugs/BUG_IMPLEMENTATION_PLAN_032.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-032/
- Google Sheet Status Before Implementation: plan_approved

## Baseline Build/Run Before Change
- Baseline install completed: Yes
- Baseline build completed: Yes
- Baseline app run completed: Yes
- Notes: See BUG-028 summary for full baseline details.

## Implementation Status
- Completed

## Bug Summary
- Collect Payment header showed hardcoded backend placeholder `#D-108219` instead of the restaurant-facing order number. Fixed by adding `orderNumber` prop to `CollectPaymentPanel` and threading it from `OrderEntry` using `orderData?.orderNumber || effectiveTable?.orderNumber`.

## Files Modified
| File | Change Made | Reason |
| --- | --- | --- |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Added `orderNumber = ''` prop; replaced hardcoded `#D-108219` with dynamic `{orderNumber ? \`#${orderNumber}\` : ''}` | This is the confirmed incorrect display surface |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Added `orderNumber={orderData?.orderNumber || effectiveTable?.orderNumber || ''}` prop to `CollectPaymentPanel` render | OrderEntry must thread restaurant order number from order data or table entry |

## Files Inspected But Not Changed
| File | Reason |
| --- | --- |
| `/app/frontend/src/api/transforms/orderTransform.js` | Confirmed `orderNumber` = `restaurant_order_id` mapping already correct at line 161 |
| `/app/frontend/src/pages/DashboardPage.jsx` | Confirmed `orderNumber` already propagated into table entries at lines 520, 558, etc. |
| `/app/frontend/src/api/services/orderService.js` | Confirmed print/service calls continue to use backend `orderId` — no change needed |
| `/app/frontend/src/components/cards/OrderCard.jsx` | No explicit staff-facing orderId text label found in JSX body — toast messages intentionally use backend orderId per plan |
| `/app/frontend/src/components/cards/TableCard.jsx` | Same — toast messages intentionally use backend orderId |

## What Was Changed
- `CollectPaymentPanel.jsx`: Added `orderNumber = ''` to props; header `#D-108219` → dynamic `{orderNumber ? \`#${orderNumber}\` : ''}`
- `OrderEntry.jsx`: `orderNumber={orderData?.orderNumber || effectiveTable?.orderNumber || ''}` added to CollectPaymentPanel render

## What Was Not Changed
- Backend `orderId` usage in API calls, print requests, socket identity — all unchanged
- Toast messages in OrderCard/TableCard — intentionally retained as backend-id references per plan
- Order transform mapping — no contract change

## API / Socket Impact
- API changes: No
- Socket changes: No
- Payload changes: No
- Details: Display-field selection fix only — backend orderId continues to drive all operational actions

## State / UI Impact
- State/context changes: Minor prop threading only
- UI behavior changes: Collect Payment header now shows actual restaurant order number (e.g. `#12345`) instead of hardcoded placeholder
- Existing behavior preserved: Pre-place screens show empty fallback (no stale ID); all API/print actions unaffected

## Post-Implementation Validation
- Build completed after change: Yes
- App run completed after change: Yes
- Manual validation performed: Compiler verified — no errors
- API payload checks: N/A (no payload change)
- Socket checks: N/A
- UI checks: Code verified — dynamic rendering with safe fallback
- Runtime/console errors: None

## Validation Not Performed
- Live browser test against actual order (requires login)

## Regression Areas For QA Agent
- Open existing placed order in Collect Payment: confirm header shows `#<restaurant_order_id>` not `#D-108219`
- Open fresh unplaced order: confirm header shows empty (no stale backend id)
- Print Bill / KOT / settle actions: confirm backend orderId still used in all API calls

## Pending / Blocked Items
- None

## Docs / Pending Documentation
- Does this require DOC_UPDATES_PENDING.md later? No

## Next Step
- QA Agent should validate this implementation and create:
  /app/memory/bugs/BUG_QA_REPORT_032.md
