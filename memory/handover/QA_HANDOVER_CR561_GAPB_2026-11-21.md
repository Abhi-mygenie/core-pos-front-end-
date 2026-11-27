# QA Handover — CR-561 Gap B (APS ₹1 reprice from OrderEntry Edit)

**Role:** IMPLEMENTATION (Role 3) · **Date:** 2026-11-21 · **Branch:** `20261121-051150`
**Risk:** HIGH (financial — writes order totals) · **Priority:** P0 · **Sprint:** nov_cr_batch
**Owner decisions applied:** OD-561-A = BOTH surfaces (pop-up + OrderEntry); **OD-561-B = NO guard (deferred)** per owner 2026-11-21.

## 1. What was built (Gap B)
The Accept pop-up path (Gap A: `constants.js`, `orderService.updateFoodItemPrice`, `PopoutItemRow`, `ScanOrderPopOut`) was already delivered on this branch. This session adds the **OrderEntry Edit** surface:

- **`components/order-entry/CartPanel.jsx`** — `PlacedItemRow` now detects a placed APS/₹1 line
  (`!cancelled && !weight && !complementary && Number(item.price)===1`) and, when `onEditItemPrice` is
  provided and not edit-locked, replaces the `₹` price display with an inline numeric input + a save (✓) button.
  New prop `onEditItemPrice` threaded through the `CartPanel` component to `PlacedItemRow`.
- **`components/order-entry/OrderEntry.jsx`** — new `handleEditItemPrice(itemId, unitPrice)`:
  calls `updateFoodItemPrice(placedOrderId, [{item_id, unit_price}])` (standalone, per-line, all-or-nothing),
  optimistically updates the local cart line, shows a success toast with `data.order_amount`, and an error toast on failure.
  Passed to `CartPanel` as `onEditItemPrice={isEditLocked ? undefined : handleEditItemPrice}`.

**Design note (PLAN_GAP resolved):** the plan said "batch on Update Order", but `handlePlaceOrder` early-returns
when there are no unplaced items — a pure reprice would never fire. Chosen approach = **inline per-line save**
(commit on ✓ click or Enter). This keeps the financial place/update pipeline untouched and guarantees the save
fires standalone. No `CollectPaymentPanel` / billing-guard change (guard deferred).

## 2. Self-test (implementation)
| Check | Result |
|---|---|
| Webpack compile | ✅ 0 new warnings (1 pre-existing baseline lint warning only) |
| `CartPanelAddonDisplay` + `CR547_SelectiveKOT` + `BUG731` suites | ✅ PASS |
| `ScanOrderPopOut.test.jsx` (23 fail) | ⚠️ PRE-EXISTING on this branch — identical with my changes stashed; NOT caused by Gap B (files untouched) |
| App loads (login renders) | ✅ screenshot captured |
| Live reprice on a real web order | ❌ NOT done — needs preprod login + a web order with an APS ₹1 line (QA) |

## 3. Test cases for QA (money = E2E mandatory)
| # | Test | Steps | Expected |
|---|---|---|---|
| 1 | OE Edit reprice | Open a web order with a placed APS ₹1 line in Order Entry → type a price in the row input → click ✓ (or Enter) | one `PUT update-food-item-price` with that line's `orderDetails[].id`; success toast; line shows new price; order total recalculated from `data.order_amount` |
| 2 | Enter key commits | Same, press Enter instead of ✓ | same as #1 |
| 3 | Invalid price | Enter 0 / blank / negative | save disabled / no API call |
| 4 | Save failure | Force API error | error toast shown; line stays repriceable; nothing silently dropped |
| 5 | Accept pop-up (Gap A retest) | Web order APS ₹1 in Accept pop-up → price → Accept | batched `update-food-item-price` fires (verifies the earlier unverified deps-fix) |
| 6 | Non-APS line | Open order with normal-priced placed lines | NO price input shown; normal `₹` display; unchanged |
| 7 | Edit-locked order | Bill-printed order w/o permission | no price input (input suppressed) |
| 8 | Totals integrity | After reprice, open Collect Bill | total matches `data.order_amount`; non-APS orders unaffected |

## 4. Regression
- Placed-row qty edit, cancel, transfer still work (shared `PlacedItemRow`).
- Weight-item and cancelled rows render unchanged.
- Normal place/update order flow untouched (no change to `handlePlaceOrder`).

## 5. Registry Sync
- `registry.json` CR-561 status → updated to GAP A+B implemented, retest pending, guard deferred.
- EXIT GATE: code markers `// CR-561` present in both files; webpack 0 new warnings.

## 6. Credentials + Environment
- Preview: https://genie-pos-preview-7--14yinelc.preview.emergentagent.com
- API base: `preprod.mygenie.online` · Socket: `presocket.mygenie.online`
- Login/test account: see `/app/memory/control/test_credentials.md` (owner to confirm a restaurant with an APS ₹1 menu item).
