# BUG-032 QA Report

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Analysis File: /app/memory/bugs/BUG_ANALYSIS_032.md
- Plan File: /app/memory/bugs/BUG_IMPLEMENTATION_PLAN_032.md
- Implementation Summary: /app/memory/bugs/BUG_IMPLEMENTATION_SUMMARY_032.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-032/
- Google Sheet Status Before QA: implementation_done

## QA Status
- **Passed Candidate**

## Original Bug Summary
- The UI was displaying the backend/internal order ID (or hardcoded placeholder `#D-108219`) instead of the restaurant-facing order number in the Collect Payment screen header.

## Expected Behavior
- The Collect Payment screen header shows the actual restaurant order number (`restaurant_order_id` / `orderNumber`). Fresh unplaced orders show an empty fallback. All operational API calls continue to use backend `orderId`.

## Dynamic QA Checklist Used
| Check | Source File | Result | Notes |
| --- | --- | --- | --- |
| Hardcoded `#D-108219` removed from CollectPaymentPanel | BUG_IMPLEMENTATION_SUMMARY_032.md | Passed | Grep for `D-108219` returns 0 results in codebase |
| Dynamic `orderNumber` prop added to CollectPaymentPanel | BUG_IMPLEMENTATION_SUMMARY_032.md | Passed | Line 28: `orderNumber = ''` in props destructuring |
| Header renders `#${orderNumber}` when set, empty when absent | BUG_IMPLEMENTATION_SUMMARY_032.md | Passed | Line 516: `{orderNumber ? \`#${orderNumber}\` : ''}` |
| OrderEntry threads `orderNumber` into CollectPaymentPanel | BUG_IMPLEMENTATION_SUMMARY_032.md | Passed | Line 1081: `orderNumber={orderData?.orderNumber \|\| effectiveTable?.orderNumber \|\| ''}` |
| Backend `orderId` still used in API/print calls | BUG_IMPLEMENTATION_PLAN_032.md | Passed | orderTransform.js and service files unchanged |
| OrderTransform `orderNumber = restaurant_order_id` mapping unchanged | BUG_IMPLEMENTATION_SUMMARY_032.md | Passed | Confirmed at transform line 161 |
| OrderCard/TableCard toast messages still use backend orderId | BUG_IMPLEMENTATION_PLAN_032.md | Passed | Cards not modified; intentional per plan |
| Pre-place (unplaced) order shows empty fallback not stale ID | BUG_IMPLEMENTATION_PLAN_032.md | Passed | `\|\| ''` fallback when neither orderData nor effectiveTable has orderNumber |
| Build compiles without errors | BUG_IMPLEMENTATION_SUMMARY_032.md | Passed | Build clean |

## Implementation Reviewed
- Files modified:
  - `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
  - `/app/frontend/src/components/order-entry/OrderEntry.jsx`
- Summary of implemented change: Added `orderNumber = ''` prop to CollectPaymentPanel; replaced hardcoded `#D-108219` with dynamic rendering. OrderEntry threads `orderData?.orderNumber || effectiveTable?.orderNumber || ''` into CollectPaymentPanel.
- Changed-file claims verified against current codebase: Yes
  - CollectPaymentPanel.jsx line 28: `orderNumber = ''` ✅
  - CollectPaymentPanel.jsx line 516: dynamic render ✅
  - No `D-108219` in codebase ✅
  - OrderEntry.jsx line 1081: threading confirmed ✅

## Build / Run Status
- Dependency install completed: Yes
- Build completed: Yes (no errors)
- App run completed: Yes
- Runtime errors observed: No
- Notes: Prop threading is correct; fallback chain safe for undefined orderNumber

## Validation Steps Performed
1. Grepped for `D-108219` in entire codebase — no results (confirmed removed)
2. Verified `orderNumber = ''` prop addition at line 28 of CollectPaymentPanel.jsx
3. Verified dynamic header render at line 516: `{orderNumber ? \`#${orderNumber}\` : ''}`
4. Verified OrderEntry.jsx line 1081 threads restaurant order number
5. Verified orderTransform.js `orderNumber = restaurant_order_id` mapping unchanged at line 161
6. Verified backend `orderId` still used in API/print calls (service files not modified)
7. Build passes. App runs.

## Actual Result
- Hardcoded `#D-108219` completely removed. Collect Payment header dynamically shows `#<restaurant_order_id>` when available, or empty string for unplaced pre-order flows. All operational IDs unchanged.

## Expected Result
- Same as actual: restaurant-facing order number displayed; pre-place shows empty; backend orderId unchanged for operations.

## Original Bug Fixed?
- **Yes**

## Regression Checks
| Area | Result | Notes |
| --- | --- | --- |
| Collect Payment header display | Passed | Dynamic rendering confirmed |
| Pre-place unplaced order header | Passed | Empty fallback confirmed via `|| ''` chain |
| Backend orderId in API calls | Passed | Service/transform files not modified |
| Print/KOT/settle using backend orderId | Passed | orderService.js not modified |
| OrderCard/TableCard toasts | Passed | Cards not modified per plan |

## API / Socket / Payload Checks
- API checked: Yes (code review) — no API payload change
- Socket checked: Not applicable — no socket change
- Payload checked: Not applicable — display-only fix
- Notes: No live test possible without login, but code change is display-only

## Evidence
- Screenshots/videos/logs created during QA:
  - .screenshots/qa_app_load.jpg
- Existing evidence reviewed:
  - /app/memory/bugs/attachments/BUG-032/ (empty at intake time)

## Issues Found
- None

## QA Decision
- Recommended Sheet Status: **qa_validated**
- Reason: Hardcoded `#D-108219` completely absent from codebase. Dynamic prop threading confirmed. Fallback for unplaced orders confirmed. No regression to API/print paths. Build passes. App runs.

## Manual Approval Required
- **Yes** — user must approve before status becomes qa_passed.

## Next Step
- If qa_validated: user must approve before status becomes qa_passed.
