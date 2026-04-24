# ROOM CHECK-IN → POST-CHECK-IN ORDER FIX — IMPLEMENTATION NOTE

**Status:** ✅ COMPLETE (3 steps, all passed by testing agent)
**Date:** Jan 2026
**Plan:** `/app/memory/ROOM_CHECKIN_UPDATE_ORDER_FIX_V2.md`
**V3 compliance:** `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md` — no deviations.

---

## Files changed

| File | Edits | Purpose |
|---|---|---|
| `frontend/src/api/transforms/orderTransform.js` | 3 edits | Keep `"Check In"` marker in cartItems with a new `isCheckInMarker: true` flag (price 0, tax 0); filter it out of `updateOrder` combined totals and `collectBillExisting.food_detail` payloads. Existing `billFoodList` print filter unchanged. |
| `frontend/src/components/order-entry/OrderEntry.jsx` | 3 edits | Propagate `isCheckInMarker` on cart hydration; exclude marker from `cartCountMap` and from `localSubtotal` / `localTax` / `unplacedSubtotal` / `unplacedTax` math. `handlePlaceOrder` branch untouched — it now correctly takes the Update path because `hasPlacedItems` evaluates `true` on checked-in rooms. |
| `frontend/src/components/order-entry/CartPanel.jsx` | 4 edits | `visibleCartItems` filter excludes marker; empty-state length check, render map, Re-Print footer gate, and Collect Bill disable gate all use the filtered view. `newItemCount` also excludes marker. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | 6 edits | `activeItems`, `cancelledItems`, `runtimeComplimentaryFoodIds` builder all skip marker; both item-render maps (Room-Service branch at L802 + default bill branch at L1069) pre-filter marker; Pay button disable gate uses filtered length. |
| `frontend/src/components/order-entry/RePrintButton.jsx` | 1 edit | `placedItems` filter excludes marker, preventing a phantom KOT reprint entry. |

**Total: 17 surgical edits across 5 files.** No file was rewritten; all changes are `search_replace` patches with surrounding context preserved.

---

## Logic changed

### Before the fix
- `orderTransform.js:217-220` filtered out every `food_details.name === 'check in'` row from `order.items[]`.
- On a newly checked-in room, `cartItems` arrived empty → `hasPlacedItems=false` → `handlePlaceOrder` took the **create** branch → fired `POST /place-order` → backend rejected with *"Table Occupied"* (or the frontend pre-flight toast fired first).

### After the fix
- Marker is retained in `cartItems` with `isCheckInMarker: true, placed: true, price: 0, tax: {percentage: 0, ...}`.
- `hasPlacedItems = cartItems.some(i => i.placed)` now evaluates `true` on any checked-in room → `handlePlaceOrder` takes the **Update** branch → fires `PUT /update-place-order` with a clean `cart-update` delta.
- Marker is invisible on every screen (cart, Collect Payment, Print Bill, Re-Print) and excluded from every subtotal/tax/discount/SC calculation and every outgoing payload (Update-Order combined totals, `order-bill-payment.food_detail`, `runtimeComplimentaryFoodIds`).
- Existing `billFoodList` print filter (`orderTransform.js:1010`) continues to drop the marker by name — print receipts unchanged.

---

## Safeguards added

1. **Defense-in-depth:** Marker carries `price: 0, unitPrice: 0, tax: {percentage: 0}`. Even if a future consumer forgets to check `isCheckInMarker`, the arithmetic contribution is zero. Only visible-row display would regress, which is caught at code-review time.
2. **Non-room flows untouched:** Fresh Place-Order path (`OrderEntry.jsx:650-699`) and the pre-flight "Table Occupied" toast are not modified. Dine-in / takeaway / delivery / walk-in work unchanged.
3. **Normal fresh room flow preserved:** If no Check-In row exists in `orderDetails`, `cartItems` never contains a marker → Place-Order path fires as before.
4. **Cancel Order flow:** `orderToAPI.cancelOrder` uses only `orderId + role + reason`. No dependency on `cartItems`. Fully unchanged.
5. **Backend data never mutated:** `rawOrderDetails` is preserved for print payloads; only UI cart transform and its consumers filter the marker.
6. **No API contract changes:** All payload shapes are identical or strictly cleaner (marker removed from aggregations).
7. **Ship-coherence per step:** Steps 1 → 2 → 3 each validated independently by the testing agent before moving on. Intermediate states are marker-inert on math, so any interim checkpoint is non-harmful.

---

## V3 AD compliance

| AD | Relevance | Result |
|---|---|---|
| AD-001 / AD-001A | Rounding + discount precision | ✅ Marker price 0, no drift in subtotal / discount / round-off |
| AD-002 | Socket remove-vs-update semantics | ✅ No socket handler touched |
| AD-021 | Runtime complimentary print override | ✅ `runtimeComplimentaryFoodIds` builder filters marker |
| AD-101 | SC on post-discount subtotal | ✅ `subtotalAfterDiscount` base canonically excludes marker |
| AD-105 | Tax consistency UI ↔ print | ✅ Same tax base in `activeItems` and `billFoodList` |
| AD-202, AD-206 | Response shape / legacy handlers | ✅ Not touched |
| AD-302 | Bill-print consistency | ✅ Unchanged — existing filter preserved |
| AD-401 / AD-402 | Frontend payload ownership | ✅ Payloads cleaner; same shape |
| AD-502 | SC default ON | ✅ Unchanged |
| AD-603 | Socket-handler test coverage | ✅ Not touched |

No V3 decision violated.

---

## Risks

- **Low.** The marker is price 0 / tax 0 / `placed: true`. Any consumer that slips past the filter renders a zero-priced row at worst — not a financial risk. All known consumers are patched.
- **Snapshot tests** that snapshot `order.items` length on a Check-In-containing order would need a refresh (out of scope — flagged for test owner).
- **Pre-existing UX gate observed during testing:** `collect-bill-btn` on OrderEntry is disabled when a room has placed items but no unplaced deltas (`hasPlacedItems && !isServed` gate). This pre-existed the fix and is out of scope, but noted for product team if they want to enable marker-only ₹0 checkout via this button in future.

---

## Manual QA checklist (for production smoke test)

1. **Primary** — Open a checked-in room → add 1 food item → click "Update Order" → Network shows **`PUT /update-place-order`** (not POST). No "Table Occupied" toast. ✅
2. **Cart UI** — On a checked-in room, cart area shows "No items in order" empty-state. No "Check In" row. Button reads "Update Order" (disabled). ✅
3. **Checkout UI** — Open Collect Bill / Checkout. Items list shows only real food items. No "check in x1 ₹0" row (user's original screenshot bug). ✅
4. **Math** — Item Total / Discount / SC / GST all computed on real items only. Totals match formula exactly. ✅
5. **Payloads** — `PUT /update-place-order` `cart-update[]` and combined totals clean; `POST /order-bill-payment` `food_detail[]` contains only real food rows. ✅
6. **Prints** — Bill print and Re-Print outputs omit the Check-In row. ✅
7. **Regression: fresh dine-in** — Place Order on an available table → `POST /place-order` fires, success. ✅
8. **Regression: Cancel Order** — PUT `/order-status-update` fires normally, payload unchanged. ✅
9. **Regression: dine-in Collect Bill** — `food_detail[]` has all items, no marker leakage (dine-in never had marker anyway). ✅

---

## Test-agent iteration reports

- `/app/test_reports/iteration_1.json` — Step 1 code review (100% pass, runtime timed out on splash).
- `/app/test_reports/iteration_2.json` — Step 1 runtime pass (S1-T2, S1-T4 primary, S1-T7).
- `/app/test_reports/iteration_3.json` — Step 2 code audit (6/6) + DOM scan (zero `/check\s*in/i` matches anywhere).
- `/app/test_reports/iteration_4.json` — Step 3 code audit + live `PUT /update-place-order` payload capture with marker-free confirmation.

---

## Rollout

- Single coherent change across 17 edits in 5 files. No package.json, supervisor, or .env change.
- Safe to merge and ship.
