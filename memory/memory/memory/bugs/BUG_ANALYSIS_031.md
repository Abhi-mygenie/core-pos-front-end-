# BUG-031 Impact Analysis

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-031/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Analysis: intake_created

## User Reported Issue
- An out-of-menu/custom item added during order entry is not getting added into Menu Management.

## Evidence Reviewed
- Intake entry in `/app/memory/BUG_TEMPLATE.md`
- Evidence folder exists at `/app/memory/bugs/attachments/BUG-031/`
- No local attachment files were present in the evidence folder
- Intake notes also say the linked Drive folder was reachable but empty at intake time

## Module Mapping
- Primary Module: Order Entry / Cart / Payment Workflow
- Downstream Impacted Modules: Menu / Category / Product Module; Dashboard / POS Workspace Module
- Module decision reference: `/app/memory/final/MODULE_DECISIONS_FINAL.md`

## Affected Route / Page
- `/dashboard` embedded order-entry flow
- potentially Menu Management panel opened from dashboard

## Affected Screen / Flow
- Dashboard → Order Entry → Add Custom Item modal → add custom item API → order cart
- User expectation extends further into Menu Management panel/catalog visibility

## Affected Code Areas
| File | Reason |
| --- | --- |
| `/app/frontend/src/components/order-entry/AddCustomItemModal.jsx` | UI used to capture a custom/out-of-menu item. |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Calls the add-custom-item API and only adds the returned item into the current cart. |
| `/app/frontend/src/api/transforms/orderTransform.js` | `toAPI.addCustomItem()` builds the payload for custom item creation. |
| `/app/frontend/src/api/constants.js` | Defines `ADD_CUSTOM_ITEM` endpoint. |
| `/app/frontend/src/contexts/MenuContext.jsx` | Relevant if new menu items are expected to appear in shared menu/catalog state after creation. |
| `/app/frontend/src/components/panels/MenuManagementPanel.jsx` | Downstream menu-management UI surface where the item is expected to appear. |

## API Review
- Endpoints:
  - `POST /api/v1/vendoremployee/add-single-product`
- Payload builders:
  - `toAPI.addCustomItem()`
- Response consumers:
  - `OrderEntry.handleAddCustomItem()`
  - `customItemFromAPI()`
- Soft-fail/hard-fail behavior:
  - Success path adds the returned product to the current order cart and shows a toast.
- API contract risk:
  - High for product expectation. The current endpoint name suggests product creation, but the frontend does not refresh/reseed Menu Management after success.

## Socket / Realtime Review
- Socket events: None identified for this flow.
- State sync behavior: No socket-based menu refresh is evident.
- Socket risk: Low.

## State / Data Flow
- Add Custom Item modal submits to `OrderEntry.handleAddCustomItem()`.
- On success, the returned item is transformed to cart-item shape and appended to `cartItems`.
- I did not find reviewed code that updates `MenuContext` products/categories or forces Menu Management to refetch after success.
- This means the item is clearly made available for the current order, but persistence/visibility into menu-management state is not guaranteed by the reviewed frontend path.

## Relevant Final Documentation
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- Final docs do not establish that ad-hoc order items must automatically become menu-management entries.

## Current Code Behavior
- `AddCustomItemModal` is explicitly an "Add Custom Item" order-entry surface.
- `OrderEntry.handleAddCustomItem()` posts to `ADD_CUSTOM_ITEM`, converts the API response into a cart item, and appends it to the order cart.
- The reviewed success path does not update menu-management shared state or trigger a menu refetch.
- So the frontend does support adding a custom item into the current order, but there is no visible code-backed guarantee that Menu Management will refresh to show it immediately.

## Expected Behavior
- Per intake, an out-of-menu item added during ordering should also become visible/available in Menu Management.

## Root Cause Hypothesis
- Hypothesis: likely product/flow gap or missing state-refresh integration.
- The current implementation treats this as an order-entry convenience flow: create item → add to cart.
- It does not visibly implement a follow-through into Menu Management state synchronization.
- This may be either:
  - a frontend state-refresh gap after successful custom-product creation, or
  - a product expectation mismatch if the feature was never intended to auto-surface in Menu Management immediately.

## Regression Risk Areas
- Custom item ordering flow
- Menu/catalog refresh behavior
- Category assignment and product persistence expectations
- Permission differences between order entry and menu management

## Docs / Code Mismatch
- None identified.
- There is a likely expectation gap between intake wording and current code behavior.

## Open Questions / Missing Information
- Is this a regression, or has the system always only added custom items to the current order cart?
- Does backend `add-single-product` persist a normal catalog product that should appear after a menu refetch, or a transient order-only item?
- No evidence was provided showing whether Menu Management was refreshed/reloaded after item creation.

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
