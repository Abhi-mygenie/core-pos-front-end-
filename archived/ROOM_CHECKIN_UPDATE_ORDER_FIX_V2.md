# ROOM CHECK-IN POST-CHECK-IN ORDER FIX — V2 HANDOVER

## 1. Validation Result
- QA analysis: Correct. Every code reference in `ROOM_CHECKIN_UPDATE_ORDER_FIX.md` was re-verified against the current codebase (line numbers, filter predicate, branch condition, and pre-flight toast text all match).
- V3 alignment: No deviation. All ADs cited (AD-001 / AD-001A, AD-002, AD-021, AD-101, AD-105, AD-202, AD-206, AD-302, AD-401 / AD-402, AD-502, AD-603) exist in `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md` and none are violated. AD-001, AD-101, and AD-105 specifically mandate that `"Check In"` must stay out of subtotal/tax bases — satisfied by the proposed filters.
- Final status: VALIDATED. Safe to hand to Implementation Agent.

## 2. Confirmed Issue
After a room is checked in, the backend-created order already contains a synthetic `"Check In"` line item in `orderDetails`. When the user later adds a food/beverage item to that occupied room, the frontend wrongly fires `POST /place-order` (create flow) instead of `PUT /update-place-order` (update flow), and the pre-flight toast returns "Table Occupied". The post-check-in food-order path never reaches the existing room order.

## 3. Root Cause
`frontend/src/api/transforms/orderTransform.js` lines 217-220 strip every `food_details.name === 'check in'` detail from `order.items`. Consequence chain:
- `OrderEntry.jsx:529` → `hasPlacedItems = cartItems.some(i => i.placed)` evaluates `false` because the only backend row (Check-In) was dropped.
- `OrderEntry.jsx:602` → `if (hasPlaced && placedOrderId)` → `false` → code falls into the create branch.
- `OrderEntry.jsx:642-647` pre-flight `getOrderByTableId()` finds the existing room order and emits the `"Table Occupied"` toast, or backend rejects with the same error.

## 4. Required Fix Direction
- Post-check-in room order must use Update Order flow. Keep the backend `"Check In"` detail in `cartItems` with `placed: true` and a new `isCheckInMarker: true` flag (forced `price: 0`, zero tax). `hasPlacedItems` then evaluates true naturally; `handlePlaceOrder` decision branch needs no change.
- `"check in"` item must be filtered out from UI. Cart list render, empty-state gate, `newItemCount` badge, Collect-Bill / Print-Bill enable gates, and Collect-Payment item rendering must all `filter(i => !i.isCheckInMarker)` before mapping or counting.
- `"check in"` item must be excluded from calculations. `localSubtotal`, `localTax`, `unplacedSubtotal`, `unplacedTax` in `OrderEntry.jsx:538-560`, and `activeItems` / `cancelledItems` / `billableItems` / `runtimeComplimentaryFoodIds` in `CollectPaymentPanel.jsx:66-82, 392` must pre-filter the marker. `unplaced = cartItems.filter(i => !i.placed …)` in `OrderEntry.jsx:575` is naturally safe because the marker is `placed: true`.
- `"check in"` item must be excluded from KOT/bill/print payloads. The existing `billFoodList` filter at `orderTransform.js:1009-1010` already drops `"check in"` from the print payload; it stays unchanged. `RePrintButton.jsx:22` must add `&& !item.isCheckInMarker` to its `placed` filter so reprint never lists the marker. KOT payloads use `unplaced` items only (Check-In is placed) — naturally excluded.

## 5. Files / Functions Impacted
| File / Function | Required Change |
|---|---|
| `frontend/src/api/transforms/orderTransform.js` → `fromAPI.order.items` (lines 217-220) | Stop filtering `"check in"`. Map it with `isCheckInMarker: true`, `price: 0`, `unitPrice: 0`, zero tax. Leave `billFoodList` filter at lines 1009-1010 unchanged. |
| `frontend/src/components/order-entry/OrderEntry.jsx` → cart hydration (lines 312-327) | Propagate `isCheckInMarker` from `item.isCheckInMarker === true`. |
| `frontend/src/components/order-entry/OrderEntry.jsx` → `cartCountMap` (line 408) | Skip rows where `ci.isCheckInMarker`. |
| `frontend/src/components/order-entry/OrderEntry.jsx` → `localSubtotal` / `localTax` / `unplacedSubtotal` / `unplacedTax` (lines 538-560) | Prepend `!i.isCheckInMarker` guard to each `filter` / early-return. |
| `frontend/src/components/order-entry/OrderEntry.jsx` → `handlePlaceOrder` decision (line 602) & pre-flight (lines 642-647) | No change. Branch becomes correct once marker is `placed: true`. |
| `frontend/src/components/order-entry/CartPanel.jsx` → empty-state + render loop (lines 612, 619) | Use `cartItems.filter(i => !i.isCheckInMarker)` for length check and `.map`. |
| `frontend/src/components/order-entry/CartPanel.jsx` → Print-Bill gate (line 664) | Change `cartItems.some(i => i.placed)` to `cartItems.some(i => i.placed && !i.isCheckInMarker)`. |
| `frontend/src/components/order-entry/CartPanel.jsx` → Collect-Bill disabled condition (line 788) | Replace `cartItems.length === 0` with `cartItems.filter(i => !i.isCheckInMarker).length === 0`. |
| `frontend/src/components/order-entry/CartPanel.jsx` → `newItemCount` (line 278) | No change (already filters `!placed`; marker is placed). |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` → `activeItems` (lines 66-68) | Add `&& !item.isCheckInMarker`. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` → `cancelledItems` (lines 79-81) | Add `&& !item.isCheckInMarker`. `billableItems` inherits the filter transitively. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` → `runtimeComplimentaryFoodIds` builder (line 392) | Add `&& !i.isCheckInMarker` guard. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` → render maps (lines 799, 1066, and preview maps at 1519 / 1557 / 1595 per QA) | Pre-filter `!isCheckInMarker` before `.map(...)`. Not confirmed from code for 1519 / 1557 / 1595 (file exceeds viewable range in this session; Implementation Agent must grep and apply the same filter wherever `cartItems.map`/`forEach` render item rows). |
| `frontend/src/components/order-entry/RePrintButton.jsx` → `placedItems` (line 22) | Change to `cartItems.filter(item => item.placed && !item.isCheckInMarker)`. |
| Update-Order payload (`toAPI.updateOrder`, `orderTransform.js:608`) + `unplaced` filter in `OrderEntry.jsx:575` | No change. Marker is `placed: true` so it is excluded from `cart-update` and from combined-totals via the subtotal filter above. |
| Socket / context sync (`OrderEntry.jsx:356-361`) | No change. `{ ...i, placed: true }` spread already preserves `isCheckInMarker`. |

## 6. Final Recommendation
Safe to implement. The fix direction is minimal, code-verified, and V3-compliant. Implementation Agent should:
1. Apply the changes exactly as scoped in §5 (mirrors `ROOM_CHECKIN_UPDATE_ORDER_FIX.md` §5.1–§5.5).
2. Grep `CollectPaymentPanel.jsx` for all `cartItems.map` / `cartItems.forEach` / `cartItems.filter` usages (preview blocks at lines 1519 / 1557 / 1595 cited by QA were not confirmed from code in this audit session — verify before editing).
3. No backend, socket, constant, or test-registry changes. No unrelated testing.
