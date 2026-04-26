# Room Check-In → Update-Order Bug — Final Implementation Spec

**Scope:** Single, isolated bug. After a room check-in creates an active order with a synthetic `"Check In"` line item, adding food items to the occupied room triggers `POST /place-order` (which fails with "Table Occupied") instead of `PUT /update-order`.

**Chosen approach (per user):** keep the backend-sent `"Check In"` line item in the cart as a *placed* row, but hide it in the UI and exclude it from all bill-calculation paths. This makes `hasPlacedItems === true` naturally → the Update-Order branch fires; no decision-branch changes needed.

**Input docs consulted:**
- `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md` (cross-checked below)
- `/app/frontend/src/api/transforms/orderTransform.js`
- `/app/frontend/src/components/order-entry/OrderEntry.jsx`
- `/app/frontend/src/components/order-entry/CartPanel.jsx`
- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- `/app/frontend/src/components/order-entry/RePrintButton.jsx`

---

## 1. Root cause (confirmed)

Backend returns an order for the checked-in room whose only `orderDetails` row has `food_details.name = "Check In"`. The cart-side transform (`orderTransform.js:218-220`) strips it, so:

- `cartItems.some(i => i.placed) === false`
- `handlePlaceOrder` (`OrderEntry.jsx:602`) evaluates `if (hasPlaced && placedOrderId)` → **false** → enters the create branch and fires `POST /place-order`
- Either the pre-flight (`OrderEntry.jsx:642-647`) or the backend itself responds with "Table Occupied"

## 2. Fix direction

Stop filtering the `"Check In"` marker out of the cart. Carry it through the transform with a new `isCheckInMarker: true` flag and a forced `price: 0`. Every consumer that currently iterates `cartItems` must skip this row for UI rendering and for subtotal/tax/count math. The Update-Order / Place-Order decision is then correct without touching `handlePlaceOrder`.

The bill-print filter (`orderTransform.js:1008-1010`) stays — printed receipts continue to not list `"Check In"`.

---

## 3. Architecture Decision cross-check (v3/ARCHITECTURE_DECISIONS_FINAL.md)

| AD | Relevance to this fix | Impact | Verdict |
|---|---|---|---|
| **AD-001 / AD-001A** (rounding + discount precision) | Subtotal feeds rounding. If `"Check In"` leaks into `localSubtotal` / `itemTotal` it would skew round-off. | We force `price: 0` **and** filter `isCheckInMarker` out of every subtotal/tax loop. Zero arithmetic drift. | Compatible. |
| **AD-002** (socket remove-vs-update semantics) | We don't touch socket handlers. | — | Compatible. |
| **AD-021** (runtime complimentary print override) | `buildBillPrintPayload()` matches overrides against `rawOrderDetails[].id` / `food_details.id`. Our transform change is in the `items[]` mapper, not `rawOrderDetails`. The bill-print `billFoodList` filter at `orderTransform.js:1010` is kept as-is. | No change to complimentary logic. | Compatible. |
| **AD-101** (service charge on post-discount subtotal) | SC = f(`subtotalAfterDiscount`). Subtotal must exclude Check-In. | Handled via `billableItems` / `activeItems` filter in CollectPaymentPanel. | Compatible. |
| **AD-105** (collect-bill ↔ printed-bill tax consistency) | Same tax base must flow through UI and print. Both use (post-filter) `cartItems` in CollectPaymentPanel and `billFoodList` in bill-print; both exclude Check-In. | Consistent because both sides filter. | Compatible. |
| **AD-202** (order_id response shapes) | Only about place+pay response parsing. | — | Compatible. |
| **AD-206** (legacy `handleUpdateOrder`) | Registry path for `update-order` socket event. | — | Compatible. |
| **AD-302** (bill-print consistency with collect-bill edits) | Bill-print payload uses `rawOrderDetails` + overrides; CheckIn stays filtered at print. | Unchanged. | Compatible. |
| **AD-401 / AD-402** (financial ownership) | Frontend constructs place/update/settlement payloads. Update-Order payload uses `unplaced = cartItems.filter(i => !i.placed && …)`. Check-In is placed → already excluded from update-delta. | Update-Order payload stays identical. | Compatible. |
| **AD-502** (serviceChargeEnabled default true) | SC gate logic unchanged. | — | Compatible. |
| **AD-603** (socket-handler test coverage) | Tests unchanged. | — | Compatible. |

**Conclusion:** no AD is violated; several ADs (AD-001, AD-101, AD-105) **mandate** that `"Check In"` stays out of subtotal/tax math, which is satisfied by the filters in §5.

---

## 4. Files to change (all frontend; no backend)

1. `/app/frontend/src/api/transforms/orderTransform.js`
2. `/app/frontend/src/components/order-entry/OrderEntry.jsx`
3. `/app/frontend/src/components/order-entry/CartPanel.jsx`
4. `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
5. `/app/frontend/src/components/order-entry/RePrintButton.jsx`

No changes to: socket handlers, API services, constants, backend, tests that aren't directly touching the filter.

---

## 5. Exact edits

### 5.1 `api/transforms/orderTransform.js` — stop filtering, tag + neutralize

Current (lines 217-220):
```js
// Items — filter out "Check In" system marker (room check-in representation, not a real product)
items: (api.orderDetails || [])
  .filter(d => (d.food_details?.name || '').toLowerCase() !== 'check in')
  .map(fromAPI.orderItem),
```

Replace with:
```js
// Items — keep backend "Check In" system marker in the cart (required for
// Update-Order vs Place-Order branching on checked-in rooms). Consumers MUST
// filter `!isCheckInMarker` before rendering or running bill math.
items: (api.orderDetails || []).map((d) => {
  const isCheckIn = (d.food_details?.name || '').toLowerCase() === 'check in';
  const mapped = fromAPI.orderItem(d);
  return isCheckIn
    ? { ...mapped, isCheckInMarker: true, price: 0, unitPrice: 0, tax: { percentage: 0, type: 'GST', calculation: 'Exclusive', isInclusive: false } }
    : mapped;
}),
```

Leave `billFoodList` filter at lines 1008-1010 **unchanged** — printed receipts must continue to exclude `"Check In"`.

### 5.2 `components/order-entry/OrderEntry.jsx` — propagate flag + filter out of local math

a) Line 312-327 — propagate `isCheckInMarker` when hydrating cart from order:
```js
const existingItems = orderData.items.map(item => ({
  id: item.id,
  foodId: item.foodId,
  tax: item.tax || { percentage: 0, type: 'GST', calculation: 'Exclusive', isInclusive: false },
  name: item.name,
  qty: item.qty || 1,
  _originalQty: item.qty || 1,
  price: item.unitPrice || item.price || 0,
  status: item.status || 'preparing',
  placed: true,
  addedAt: item.createdAt || new Date().toISOString(),
  variation: item.variation,
  addOns: item.addOns,
  notes: item.notes,
  isCheckInMarker: item.isCheckInMarker === true,   // ← NEW
}));
```

b) Line 356-361 (socket sync from `orderFromContext`) — no change needed; spread `...i` already carries `isCheckInMarker`. Just confirm it's preserved:
```js
const placed = orderFromContext.items.map(i => ({ ...i, placed: true, _originalQty: i.qty || 1 }));
```
(`...i` already propagates the flag — verify only.)

c) Line 408 (quantity map by id):
```js
cartItems.forEach(ci => { if (ci.isCheckInMarker) return; map[ci.id] = (map[ci.id] || 0) + ci.qty; });
```

d) Lines 538-555 — local subtotal / tax / unplaced — prepend `!isCheckInMarker` guard:
```js
const localSubtotal = cartItems
  .filter(i => !i.isCheckInMarker && i.status !== 'cancelled')
  .reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);

const localTax = cartItems
  .filter(i => !i.isCheckInMarker && i.status !== 'cancelled')
  .reduce((sum, item) => { /* unchanged tax math */ }, 0);

const unplacedSubtotal = cartItems
  .filter(i => !i.placed && !i.isCheckInMarker && i.status !== 'cancelled')
  .reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);

const unplacedTax = cartItems
  .filter(i => !i.placed && !i.isCheckInMarker && i.status !== 'cancelled')
  .reduce((sum, item) => { /* unchanged tax math */ }, 0);
```
(Keep the exact tax formula already in place; only the pre-filter changes.)

e) Do **NOT** change `handlePlaceOrder` (line 602 branch stays `if (hasPlaced && placedOrderId)`). With the Check-In marker now present with `placed: true`, `hasPlaced` evaluates `true` whenever the room is actually checked in.

f) Do **NOT** change the `const unplaced = cartItems.filter(i => !i.placed && i.status !== 'cancelled')` on line 575. Check-In is placed → already excluded from the update-delta payload.

### 5.3 `components/order-entry/CartPanel.jsx` — hide the row + fix count/print gates

a) Line 278 — `newItemCount` already filters `!placed`. Check-In is placed → already fine. **No change.**

b) Line 619 — render loop: filter marker before mapping:
```jsx
cartItems.filter(i => !i.isCheckInMarker).map((item, index) => { … })
```
Also update `cartItems.length === 0` check at line 612 to use the filtered length:
```jsx
{cartItems.filter(i => !i.isCheckInMarker).length === 0 ? (
```

c) Line 636 — delta lookup `cartItems.find(d => d._deltaForId === item.id && !d.placed)`: the Check-In row has no `_deltaForId`, so this naturally no-ops. **No change.**

d) Line 664 — `canPrintBill` gate uses `cartItems.some(i => i.placed)`. Must exclude Check-In so the Print Bill button doesn't appear for a freshly-checked-in room with no food yet:
```jsx
{canPrintBill
  && cartItems.some(i => i.placed && !i.isCheckInMarker)
  && !cartItems.some(i => !i.placed) && (
```

e) Line 671 — `cartItems.some(i => !i.placed)` — unaffected by marker. **No change.**

f) Line 788 — Collect Bill disabled condition `cartItems.length === 0`. Must treat a cart containing only the Check-In marker as empty:
```jsx
cartItems.filter(i => !i.isCheckInMarker).length === 0 ||
```

g) Line 769 — button label gate `hasPlacedItems ? "Update" : "Place"`. With the marker present `hasPlacedItems=true` the instant the room is opened, even before any food → label becomes "Update Order" from the start. **This is the desired behavior** (the room already has an order). **No change.**

### 5.4 `components/order-entry/CollectPaymentPanel.jsx` — filter the synthetic row out of every math & render path

a) Lines 66-69 — `activeItems` memo. Add Check-In filter:
```js
const activeItems = useMemo(() =>
  (cartItems || []).filter(item => item.status !== 'cancelled' && !item.isCheckInMarker),
  [cartItems]
);
```

b) Lines 79-82 — `cancelledItems` memo. Add Check-In filter:
```js
const cancelledItems = useMemo(() =>
  (cartItems || []).filter(item => item.status === 'cancelled' && !item.isCheckInMarker),
  [cartItems]
);
```

`billableItems` at line 75 derives from `activeItems`, so it's covered transitively.

c) Line 799 render map — replace `cartItems` with `activeItems.concat(cancelledItems)` OR keep `cartItems` and inline-filter:
```jsx
(cartItems || []).filter(i => !i.isCheckInMarker).map((item, idx) => { … })
```
Same treatment at line 1066.

d) Lines 392 — `runtimeComplimentaryFoodIds` builder `(cartItems || []).filter(...)`: add `&& !i.isCheckInMarker`. The marker cannot be runtime-complimentary, but this keeps the filter predicate pure.

e) Bill-print preview text (lines 1519, 1557, 1595) — all iterate `cartItems`. Update each to `cartItems.filter(i => !i.isCheckInMarker).map(...)`. The Check-In row must never appear in the print preview.

### 5.5 `components/order-entry/RePrintButton.jsx` — skip the marker when re-printing

Line 22:
```js
const placedItems = cartItems.filter(item => item.placed && !item.isCheckInMarker);
```

---

## 6. What is explicitly NOT changed (regression protection)

- `handlePlaceOrder` branch logic — untouched.
- `handlePlaceOrder` pre-flight "Table Occupied" toast — untouched; it will simply never fire for this flow because `hasPlaced=true` now takes the Update branch.
- Update-Order payload builder (`orderToAPI.updateOrder`) — untouched; `unplaced` filter at OrderEntry:575 already excludes the placed Check-In row.
- `orderTransform.js` `billFoodList` filter (line 1010) — untouched; printed bill still has no Check-In line.
- `productTransform.js:48` + `categoryTransform.js:37` — untouched; menu still hides the synthetic product/category.
- `TransferFoodModal.jsx` — takes a single item, never iterates `cartItems`. Untouched.
- `SplitBillModal.jsx` — does not consume `cartItems` directly (verified via grep). Untouched.
- Socket handlers, API services, constants, backend — untouched.
- Tests — untouched; existing test suite treats the transform output, and `items.map` change is additive. If a test snapshots `items` for a Check-In-containing order, update the snapshot to reflect the new `isCheckInMarker: true, price: 0` row.

---

## 7. Risks & edge cases

| # | Scenario | Behavior after fix | Mitigation |
|---|---|---|---|
| 1 | Room just checked-in, no food yet, operator opens cart | Cart renders empty (Check-In hidden). Button says "Update Order" (disabled because `newItemCount=0`). | Desired. |
| 2 | Room checked-in, operator adds 1 food item | Button says "Update Order (1)". Tap → `PUT /update-order` with just that item. | Desired. |
| 3 | Backend sends Check-In with non-zero `unit_price` | Forced `price: 0` in the transform neutralizes it. | In place. |
| 4 | Socket `update-order` event re-syncs `orderFromContext.items` | `...i` spread preserves `isCheckInMarker`. | Verified in §5.2(b). |
| 5 | Collect Bill on a checked-in room with only Check-In marker | `cartItems.filter(!isCheckInMarker).length === 0` disables the button. | Fixed in §5.3(f). |
| 6 | Re-Print button | Filters `placed && !isCheckInMarker`. Marker won't appear on reprint. | Fixed in §5.5. |
| 7 | Cancel Order (`cancelOrder` payload at OrderEntry:824) | Uses `orderId` only, not cartItems content. | Unaffected. |
| 8 | Prepaid flow | Rooms are postpaid today. `isPrepaid` gate at CartPanel:756 keys off `isPrepaid && hasPlacedItems` — with marker, `hasPlacedItems=true`, but `isPrepaid=false` for rooms. No change to Prepaid UX. | Unaffected. |
| 9 | Multi-booking rooms (associated orders) | Associated orders use a separate list; not in `orderDetails`. | Unaffected. |
| 10 | Any consumer we missed | The flag is a tag, not a structural change. Missed consumers would still see a numerically zero-priced, zero-taxed row — visible but financially inert. | Acceptable worst case. |

---

## 8. Verification checklist (manual; no automated tests needed)

1. **Build & lint:** `mcp_lint_javascript` on all 5 touched files — 0 new errors/warnings beyond the pre-existing `LoadingPage.jsx:101`.
2. **No existing unit snapshot breakage:** run the project test suite (`yarn test --watchAll=false`) — expected PASS except for any test that snapshots the raw `items` length on a Check-In order; update that snapshot only.
3. **E2E on preprod** (`owner@18march.com / Qplazm@10`, tenant 478):
   a. Check-in a free room (pick any available; if none, run C/Out on `e3`/`r2` first).
   b. Open the now-occupied room card.
      - Cart is **empty** (Check-In hidden).
      - Button reads **"Update Order"** (disabled, since no new item yet).
      - `cartItems` in React devtools shows length 1 with `{isCheckInMarker:true, price:0, placed:true}`.
   c. Add one menu item.
      - Button label → **"Update Order (1)"**.
      - Click → network shows `PUT /api/v1/…/update-order` (not `/place-order`), payload delta contains only the new item.
      - No "Table Occupied" toast.
   d. Re-open cart, verify the new placed item shows; Check-In row still hidden.
   e. Open Collect Payment panel. Subtotal/tax/grand total reflect only the food item (₹0 contribution from Check-In).
   f. Print Bill preview: Check-In line not shown.
   g. Re-print existing bill (if available): Check-In line not shown.

---

## 9. Rollout

- Single commit covering §5.1–§5.5.
- Manual verification per §8.
- Update `/app/memory/PRD.md` with:
  > *"Room check-in → food add now uses Update-Order. Backend-sent 'Check In' marker retained in cart (`isCheckInMarker: true`, price 0), hidden from UI + excluded from bill math."*

---

*End of spec.*
