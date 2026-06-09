# BUG-032 Implementation Plan

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Analysis File: /app/memory/bugs/BUG_ANALYSIS_032.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-032/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Planning: analysis_done

## Bug Summary
- Staff-facing UI is showing backend/internal order ID or a hardcoded token instead of the restaurant-facing order number.

## Analysis Verdict
- Frontend bug. `orderTransform.fromAPI.order()` already exposes `orderNumber` (`restaurant_order_id`), so the issue is likely one or more UI surfaces using the wrong display field. The strongest confirmed candidate is the hardcoded Collect Payment header.

## Planning Decision
- Plan Status: Ready
- Reason:
  - Current code and analysis identify both the canonical field (`order.orderNumber`) and a concrete incorrect display surface (`CollectPaymentPanel` hardcoded `#D-108219`).
  - Safe plan can focus on replacing staff-facing display tokens with `orderNumber` while preserving backend `orderId` for operational actions.
- Safe To Implement Without Clarification: Yes

## Pre-Change Approval Note
- Request Summary: Show restaurant-facing order ID in staff UI instead of backend/internal ID or hardcoded placeholder.
- Change Type: local UI fix
- Affected Modules: Dashboard / POS Workspace Module
- Downstream Impacted Modules: Order Entry / Cart / Payment Workflow; reporting display conventions
- Files Likely To Change:
  - `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
  - `/app/frontend/src/components/order-entry/OrderEntry.jsx`
  - Possibly `/app/frontend/src/components/cards/OrderCard.jsx`
  - Possibly `/app/frontend/src/components/cards/TableCard.jsx`
  - Possibly `/app/frontend/src/pages/DashboardPage.jsx`
- Related APIs: No API contract change planned.
- Payload Impact: No
- Socket Impact: No
- State Impact: Minimal prop/threading only if CollectPaymentPanel needs orderNumber passed down.
- UI Impact: Staff-visible order ID labels become restaurant order number (`orderNumber`).
- Regression Risks:
  - preserving backend `orderId` for API calls, logs, and print actions
  - not replacing operational IDs inside non-user-facing logic
  - ensuring fallback behavior when `orderNumber` is absent
- Deferred/Open Decision Dependency: None
- Safe To Implement Without Clarification: Yes

## Files To Change
| File | Planned Change | Reason |
| --- | --- | --- |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Replace hardcoded header token with a prop-backed display value derived from restaurant order number. | This is the strongest confirmed incorrect display surface. |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Thread the current order’s `orderNumber` (or safe fallback) into `CollectPaymentPanel`. | CollectPaymentPanel does not currently own canonical order-number data. |
| `/app/frontend/src/components/cards/OrderCard.jsx` | Inspect and update any staff-facing order label text that renders backend ID instead of `orderNumber`, while leaving API action calls on `orderId`. | Cards are candidate display surfaces per analysis. |
| `/app/frontend/src/components/cards/TableCard.jsx` | Inspect and update any staff-facing visible ID text if present; preserve backend `orderId` for actions. | Grid/table mode may expose the same issue on another surface. |

## Files To Inspect But Not Change
| File | Reason |
| --- | --- |
| `/app/frontend/src/api/transforms/orderTransform.js` | Confirm canonical mapping remains `orderId` = backend id, `orderNumber` = restaurant id; no transform change planned. |
| `/app/frontend/src/pages/DashboardPage.jsx` | Verify `orderNumber` is already available in table/order entry objects and can be threaded without changing orchestration behavior. |
| `/app/frontend/src/api/services/orderService.js` | Ensure print/service calls continue to use backend `orderId`; no service-layer display change is planned. |

## Files / Areas Not To Touch
- API endpoint constants
- socket handlers and realtime contract
- print payload IDs (`order_id` must remain backend order id)
- order search/filter logic unless a confirmed visible label issue is found there

## Step-by-Step Implementation Plan

### Step 1
- Change: Audit staff-facing order-ID render points and separate display-only labels from operational IDs.
- Files affected:
  - `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
  - `/app/frontend/src/components/cards/OrderCard.jsx`
  - `/app/frontend/src/components/cards/TableCard.jsx`
  - `/app/frontend/src/pages/DashboardPage.jsx`
- Expected result:
  - Implementation agent has a complete list of visible ID render points using the wrong value.
- Risk:
  - Accidentally changing API/action IDs instead of labels.

### Step 2
- Change: Replace the hardcoded Collect Payment header value with current restaurant order number (or a controlled fallback when unavailable).
- Files affected:
  - `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
  - `/app/frontend/src/components/order-entry/OrderEntry.jsx`
- Expected result:
  - Collect Payment screen shows the actual restaurant-facing order number instead of `#D-108219`.
- Risk:
  - If no order number exists for fresh pre-place flows, UI needs a safe blank/fallback instead of showing backend id.

### Step 3
- Change: For any other confirmed visible card/table labels, switch to `orderNumber` while keeping `orderId` for click handlers, print requests, and toasts that are operationally backend-bound unless product text explicitly requires otherwise.
- Files affected:
  - `/app/frontend/src/components/cards/OrderCard.jsx`
  - `/app/frontend/src/components/cards/TableCard.jsx`
- Expected result:
  - Staff-facing IDs become consistent without breaking operational actions.
- Risk:
  - Toasts/logs may still intentionally use backend order ids; implementation must not change them blindly.

## API / Socket Impact
- API changes: No
- Socket changes: No
- Payload changes: No
- No API/socket contract change is planned. This is a display-field selection fix only.

## State / UI Impact
- State/context changes:
  - Possibly add/order-number prop threading into CollectPaymentPanel.
- UI behavior changes:
  - Visible order identifiers should use restaurant order number.
- Loading/error/empty state impact:
  - None expected.
- Existing behavior to preserve:
  - backend `orderId` continues to drive all API actions, print calls, and socket identity
  - no changes to transformed order data contract

## Regression Risk
- Risk area 1: Collect Payment header display
- Risk area 2: preserving operational `orderId` use in print/bill/service paths
- Risk area 3: fallback handling for screens opened before an orderNumber exists

## Validation Plan For Implementation Agent
- Manual test cases:
  - Open an existing order in Collect Payment and verify the visible ID matches restaurant order number.
  - Review dashboard card/table surfaces for any visible backend-id usage and confirm restaurant order number is shown instead.
- API payload checks:
  - Confirm no API payload now uses `orderNumber` where backend expects `orderId`.
- Socket checks:
  - Confirm no socket identity logic is changed.
- UI checks:
  - Verify no hardcoded order token remains on collect-bill screen.
- Regression checks:
  - Print Bill / KOT / settle actions still target the correct backend order id.

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
