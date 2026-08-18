# BUG-035 Impact Analysis

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-035/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Analysis: intake_created

## User Reported Issue
- The old POS had a dynamic price feature for menu items, but that feature is missing in the new POS.

## Evidence Reviewed
- Intake entry in `/app/memory/BUG_TEMPLATE.md`
- Evidence folder exists at `/app/memory/bugs/attachments/BUG-035/`
- No local attachment files were present in the evidence folder
- Intake notes also say the linked Drive folder was reachable but empty at intake time

## Module Mapping
- Primary Module: Menu / Category / Product Module
- Downstream Impacted Modules: Order Entry / Cart / Payment Workflow; Menu Management / configuration surfaces
- Module decision reference: `/app/memory/final/MODULE_DECISIONS_FINAL.md`

## Affected Route / Page
- Likely `/dashboard` embedded order-entry flow and related menu/product management surfaces

## Affected Screen / Flow
- Staff attempts to set or use a dynamic price for a menu item in the new POS, but no such capability is surfaced in current UI

## Affected Code Areas
| File | Reason |
| --- | --- |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Order-entry pricing uses fixed product/base price mapping. |
| `/app/frontend/src/components/order-entry/AddCustomItemModal.jsx` | Only visible open-price-like UI in current code, but this is for custom items rather than dynamic pricing on existing menu items. |
| `/app/frontend/src/contexts/MenuContext.jsx` | Shared menu/product state would need to carry any dynamic-price metadata if the feature existed. |
| `/app/frontend/src/components/panels/MenuManagementPanel.jsx` | Candidate admin/config surface where dynamic pricing might be expected if implemented. |
| `/app/frontend/src/api/transforms/orderTransform.js` | Order payload composition currently assumes stable item pricing captured from cart items. |

## API Review
- Endpoints: no reviewed endpoint explicitly indicates dynamic-price support for existing menu items.
- Payload builders:
  - current cart/order transforms use fixed `price`/`unitPrice` values from product/cart state.
- Response consumers:
  - product adaptation in `OrderEntry.adaptProduct()`
- Soft-fail/hard-fail behavior:
  - This appears to be a missing capability rather than an HTTP failure.
- API contract risk:
  - High, because no visible frontend contract for dynamic pricing was found in reviewed code.

## Socket / Realtime Review
- Socket events: None identified for this capability.
- State sync behavior: Not relevant.
- Socket risk: Low.

## State / Data Flow
- Current product adaptation in `OrderEntry` maps products to fixed `basePrice`-driven order items.
- Existing dynamic-looking price editing is limited to Add Custom Item modal, which creates a custom product/item with a manually entered price.
- I did not find reviewed code indicating a dynamic/open price modifier for normal menu products.

## Relevant Final Documentation
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- No finalized documentation was found that defines a dynamic-price feature in the current baseline.

## Current Code Behavior
- Regular menu items are adapted from `product.basePrice` in `OrderEntry.adaptProduct()`.
- Current ordering flow supports variants, add-ons, and custom items.
- The reviewed code does not expose an obvious "dynamic price" mechanism for existing catalog items.
- Therefore, the intake is consistent with the feature being absent from the current new-POS implementation.

## Expected Behavior
- Per intake, the new POS should support the same dynamic-price capability that existed in the old POS.

## Root Cause Hypothesis
- Hypothesis: parity gap / missing implementation rather than a narrow defect in an existing implemented path.
- Based on current code review, the feature does not appear to be implemented in the new POS baseline for standard menu items.

## Regression Risk Areas
- Pricing and billing math
- Product configuration surfaces
- Cart item pricing and payload builders
- Discount/tax/service-charge calculations if item price becomes operator-editable

## Docs / Code Mismatch
- None identified.
- Final docs do not claim this feature exists in current baseline.

## Open Questions / Missing Information
- The intake does not define what "dynamic price" meant in the old POS:
  - open/manual price per order
  - time-based pricing
  - customer/segment pricing
  - quantity-tier pricing
  - something else
- Because of that ambiguity, this may be a feature gap request rather than a conventional bug.

## User Interaction Required
- Not required.

## Analysis Verdict
- Unclear

## Analysis Outcome
- Analysis Complete

## Ready For Next Stage?
- Yes

## Next Step
- If Analysis Outcome is Analysis Complete or Analysis Complete after user clarification:
  Next stage may continue based on status = analysis_done.
