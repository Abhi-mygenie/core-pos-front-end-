# BUG-035 Implementation Plan

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Analysis File: /app/memory/bugs/BUG_ANALYSIS_035.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-035/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Planning: analysis_done

## Bug Summary
- Items priced at `1` should behave as dynamic-price items during ordering, allowing cashier to change the price at runtime.

## Analysis Verdict
- Frontend bug / missing runtime behavior. User clarified the exact rule: any menu item whose configured price is `1` should be treated as a dynamic-price item in order flow, and cashier should be able to edit the price at runtime.

## Planning Decision
- Plan Status: Ready
- Reason:
  - User clarified the business rule precisely enough to map affected files.
  - This is a frontend runtime-ordering behavior, not the broader undefined “dynamic pricing” feature family from analysis.
- Safe To Implement Without Clarification: Yes

## Pre-Change Approval Note
- Request Summary: If a menu item price is `1`, treat it as a dynamic-price item and let the cashier edit the price at runtime during ordering.
- Change Type: order-entry behavior fix / parity feature
- Affected Modules: Menu / Category / Product Module
- Downstream Impacted Modules: Order Entry / Cart / Payment Workflow
- Files Likely To Change:
  - `/app/frontend/src/components/order-entry/OrderEntry.jsx`
  - `/app/frontend/src/components/order-entry/ItemCustomizationModal.jsx` or another add-to-cart UI if price entry is surfaced there
  - Possibly `/app/frontend/src/components/order-entry/CartPanel.jsx`
  - `/app/frontend/src/api/transforms/orderTransform.js`
- Related APIs:
  - existing place/update/payment order payloads that already consume cart item price/unit price
- Payload Impact: Yes, runtime-edited price must flow through cart item price fields into existing order payload builders.
- Socket Impact: No contract change planned.
- State Impact:
  - cart item price source becomes operator-editable for the special `price === 1` case
- UI Impact:
  - order-entry must surface a runtime price input/edit affordance for those items
- Regression Risks:
  - all billing math derived from `item.price`, `unitPrice`, and `totalPrice`
  - customized items / addons / quantity edits
  - print and payment totals
- Deferred/Open Decision Dependency: None
- Safe To Implement Without Clarification: Yes

## Files To Change
| File | Planned Change | Reason |
| --- | --- | --- |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Detect products/items with base price `1` and route them through a runtime price-entry flow before finalizing cart insertion. | This file adapts products and owns add-to-cart behavior. |
| `/app/frontend/src/components/order-entry/ItemCustomizationModal.jsx` or equivalent price-entry surface | Add or reuse a controlled UI for entering/changing runtime price for `price === 1` items before adding to cart. | Cashier needs an in-flow way to set the actual price. |
| `/app/frontend/src/api/transforms/orderTransform.js` | Verify order payload builders honor the edited cart price/unit price without re-deriving from original catalog price `1`. | Runtime price must persist into order placement/update/payment payloads. |
| `/app/frontend/src/components/order-entry/CartPanel.jsx` | If needed, display/edit the resolved runtime price clearly in cart and qty updates. | Cart UI must reflect authoritative runtime price once entered. |

## Files To Inspect But Not Change
| File | Reason |
| --- | --- |
| `/app/frontend/src/contexts/MenuContext.jsx` | Confirm no menu-context mutation is required; this is a runtime order behavior, not catalog persistence. |
| `/app/frontend/src/components/order-entry/AddCustomItemModal.jsx` | Avoid conflating out-of-menu custom-item pricing with dynamic-price-on-existing-menu-item behavior. |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Verify downstream totals continue consuming cart item price correctly; no direct behavior change planned here unless cart shape requires it. |

## Files / Areas Not To Touch
- backend/menu persistence logic
- notification/socket logic
- room billing policy
- unrelated custom-item creation flow

## Step-by-Step Implementation Plan

### Step 1
- Change: Identify the safest runtime hook in order-entry flow to intercept items whose base/catalog price is exactly `1` before they are added to cart as a fixed-price item.
- Files affected:
  - `/app/frontend/src/components/order-entry/OrderEntry.jsx`
  - inspect current customization/add-to-cart surfaces
- Expected result:
  - Dynamic-price items are distinguished from normal fixed-price items.
- Risk:
  - Treating all ₹1 items as normal items would keep the bug; treating too many items as dynamic could affect legitimate ₹1 catalog items if that rule is business-authoritative.

### Step 2
- Change: Add or reuse a runtime UI prompt/modal/input so cashier can enter the actual price for these items before cart insertion completes.
- Files affected:
  - `/app/frontend/src/components/order-entry/ItemCustomizationModal.jsx` or another order-entry modal/component
  - `/app/frontend/src/components/order-entry/OrderEntry.jsx`
- Expected result:
  - Cashier can set the actual runtime price during ordering.
- Risk:
  - UX confusion if the price-entry step is not clearly separated from regular customization.

### Step 3
- Change: Ensure the resolved runtime price is stored on the cart item as the authoritative unit price and continues through qty edits/customization logic.
- Files affected:
  - `/app/frontend/src/components/order-entry/OrderEntry.jsx`
  - Possibly `/app/frontend/src/components/order-entry/CartPanel.jsx`
- Expected result:
  - Cart, bill, and totals all use the cashier-entered runtime price instead of catalog price `1`.
- Risk:
  - quantity/customization recomputation could accidentally revert to original catalog price.

### Step 4
- Change: Verify all order payload builders use the edited cart price/unit price without any fallback to original menu base price `1`.
- Files affected:
  - `/app/frontend/src/api/transforms/orderTransform.js`
- Expected result:
  - Order placement, updates, payment, and print math receive the correct runtime price.
- Risk:
  - Payload builder fallback logic could silently collapse back to `1`, causing billing/print errors.

## API / Socket Impact
- API changes: No
- Socket changes: No
- Payload changes: No contract shape change planned
- Existing payload structure should remain the same, but values should now carry the cashier-entered runtime price for the special `price === 1` items.

## State / UI Impact
- State/context changes:
  - Local cart item state gains authoritative runtime-edited price handling for the special case.
- UI behavior changes:
  - Dynamic-price items will prompt for/edit runtime price during ordering.
- Loading/error/empty state impact:
  - Need validation to prevent zero/blank/invalid runtime price entry.
- Existing behavior to preserve:
  - non-₹1 items continue normal add-to-cart flow
  - custom item flow remains separate
  - totals, print, and payment continue using cart state as source of truth

## Regression Risk
- Risk area 1: add-to-cart flow for normal vs dynamic-price items
- Risk area 2: qty/customization recomputation using runtime-entered price
- Risk area 3: payment/print/order payload math

## Validation Plan For Implementation Agent
- Manual test cases:
  - Add a normal-priced item and confirm no runtime price prompt appears.
  - Add a ₹1 item and confirm cashier can enter actual runtime price.
  - Change quantity of that item and confirm line total uses runtime-entered unit price.
  - Complete order/payment/print flow and confirm totals reflect edited price.
- API payload checks:
  - Confirm cart/order payload sends edited price, not `1`.
- Socket checks:
  - Confirm re-engaged order still shows resolved price correctly if backend echoes it back.
- UI checks:
  - Cart and bill surfaces display edited runtime price clearly.
- Regression checks:
  - Custom item modal and regular menu item flows remain unchanged.

## Docs / Code Mismatch Or Pending Docs
- Does this plan likely require DOC_UPDATES_PENDING.md entry? Yes
- If yes, describe recommended pending doc update.
  - Record the business rule that catalog items priced at `1` are treated by frontend as runtime dynamic-price items during ordering, with cashier-entered price becoming authoritative for cart/payment/print flows.
- Do not directly update final docs.

## Open Questions
- None.

## Safe To Implement?
- Yes

## Approval Gate
Implementation must NOT start until:
1. User explicitly approves this plan.
2. Google Sheet status becomes plan_approved.
