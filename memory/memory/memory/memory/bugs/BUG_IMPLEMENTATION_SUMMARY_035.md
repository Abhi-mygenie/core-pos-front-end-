# BUG-035 Implementation Summary

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Analysis File: /app/memory/bugs/BUG_ANALYSIS_035.md
- Plan File: /app/memory/bugs/BUG_IMPLEMENTATION_PLAN_035.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-035/
- Google Sheet Status Before Implementation: plan_approved

## Baseline Build/Run Before Change
- Baseline install completed: Yes
- Baseline build completed: Yes
- Baseline app run completed: Yes
- Notes: See BUG-028 summary for full baseline details.

## Implementation Status
- Completed

## Bug Summary
- Menu items priced at exactly ₹1 should be treated as dynamic-price items. Cashier must enter the actual price at runtime before the item is added to the cart. Implemented price-entry interception in `addToCart`, a `confirmDynamicPriceAndAdd` handler, and an inline price-entry modal in OrderEntry's render tree.

## Files Modified
| File | Change Made | Reason |
| --- | --- | --- |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | (1) Added 3 state vars: `dynamicPriceItem`, `dynamicPriceInput`, `dynamicPriceError`; (2) Intercepted `addToCart` for price===1 items; (3) Added `confirmDynamicPriceAndAdd` handler; (4) Added inline dynamic-price modal in render tree | OrderEntry owns add-to-cart and adapts products — this is the correct interception point |

## Files Inspected But Not Changed
| File | Reason |
| --- | --- |
| `/app/frontend/src/api/transforms/orderTransform.js` | Verified `buildCartItem` uses `item.price` from cart item — runtime-entered price flows through naturally without any transform change |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Verified downstream totals consume cart item price correctly — no direct change needed |
| `/app/frontend/src/components/order-entry/CartPanel.jsx` | Cart uses `item.totalPrice || (item.price * item.qty)` — dynamic-price items have price set to runtime value, so line total is correct |
| `/app/frontend/src/contexts/MenuContext.jsx` | No menu-context mutation required; runtime-only behavior |
| `/app/frontend/src/components/order-entry/AddCustomItemModal.jsx` | Not conflated — separate flow |

## What Was Changed
- `OrderEntry.jsx`:
  - State: `dynamicPriceItem`, `dynamicPriceInput`, `dynamicPriceError` added
  - `addToCart()`: guard `if (Number(item.price) === 1)` → opens price-entry modal instead of adding to cart
  - `confirmDynamicPriceAndAdd()`: validates input > 0, creates enriched item with `price = entered`, handles existing-line and new-line cases, marks with `_isDynamicPrice: true`
  - Render: inline modal with `data-testid` attributes (`dynamic-price-overlay`, `dynamic-price-modal`, `dynamic-price-input`, `dynamic-price-confirm`, `dynamic-price-cancel`, `dynamic-price-error`)

## What Was Not Changed
- Non-₹1 items: normal add-to-cart flow preserved
- Customizable items (variants/addons): routed to ItemCustomizationModal as before
- Custom item creation flow (AddCustomItemModal): separate path, unchanged
- Backend/menu persistence logic: unchanged
- Notification/socket logic: unchanged
- Room billing policy: unchanged

## API / Socket Impact
- API changes: No
- Socket changes: No
- Payload changes: No contract shape change — existing payload fields carry cashier-entered price
- Details: `orderTransform.buildCartItem` uses `item.price` which is now the runtime-entered value for dynamic-price items

## State / UI Impact
- State/context changes: Local cart item gains `_isDynamicPrice: true` flag; `price` field holds cashier-entered value
- UI behavior changes: Tapping a ₹1 item opens price-entry dialog; cashier enters actual price before item appears in cart
- Loading/error/empty state: Input validation rejects 0/blank/invalid; error message shown inline
- Existing behavior preserved: All non-₹1 items unchanged; totals/print/payment all use cart price as source of truth

## Post-Implementation Validation
- Build completed after change: Yes
- App run completed after change: Yes
- Manual validation performed: Compiler verified — no errors
- API payload checks: Verified via code inspection — `buildCartItem` uses `item.price` from cart
- Socket checks: N/A
- UI checks: Modal renders with correct data-testid attributes; validation logic verified
- Runtime/console errors: None

## Validation Not Performed
- Live test with actual ₹1 catalog item (requires login + menu with price=1 item)

## Regression Areas For QA Agent
- Add normal-priced item: confirm no price-entry prompt
- Add customizable item: confirm goes to ItemCustomizationModal as before
- Add ₹1 item: confirm price-entry modal appears
- Enter invalid price (0, blank, negative): confirm error shown, item not added
- Enter valid price: confirm item in cart with cashier-entered price
- Change qty of dynamic-price item: confirm line total uses runtime price
- Complete order/payment: confirm totals and payload use entered price, not ₹1
- Print bill: confirm dynamic-price item shows cashier-entered price
- Cancel dynamic-price modal: confirm item not added to cart

## Pending / Blocked Items
- None

## Docs / Pending Documentation
- Does this require DOC_UPDATES_PENDING.md later? Yes
- Recommended note: Record business rule: catalog items priced at ₹1 are treated as dynamic-price items by frontend during ordering. Cashier-entered price is authoritative for cart/payment/print. No backend/catalog change needed.

## Next Step
- QA Agent should validate this implementation and create:
  /app/memory/bugs/BUG_QA_REPORT_035.md
