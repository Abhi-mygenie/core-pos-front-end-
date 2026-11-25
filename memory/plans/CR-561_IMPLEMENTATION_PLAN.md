# CR-561 — Gate 3 Implementation Plan (REVALIDATED 2026-11-20) — APS ₹1 price entry (POS-1)

> ✅ **UNBLOCKED 2026-11-20.** Backend delivered `PUT /api/v2/vendoremployee/order/update-food-item-price`. Full FE build. Priority **P0**, risk **HIGH** (financial).
> **Decisions (locked this session):** OD-561-A = price entry in BOTH the Accept pop-up and the OE edit path; **pre-bill guard DROPPED** (no CollectPaymentPanel edit); **prices saved BATCHED on Accept/Update** (one `items[]` call, not per-keystroke).
> Supersedes the prior "backend-blocked / include-in-accept-payload" plan. Contract: `contracts/CR-561_UPDATE_FOOD_ITEM_PRICE_API_2026-11-20.md`. Evidence: `evidence/CR-561/APS_PRICE_PERSIST_PROBE_2026-11-20.md`.

## Mechanism (delivered API — NOT the accept/place payload)
`PUT /api/v2/vendoremployee/order/update-food-item-price`
Body: `{ order_id, items: [{ item_id: <orderDetails[].id>, unit_price: <number>0> }] }`
Response: `data.order_amount` = new bill total; `data.items[]` = per-line final prices. All-or-nothing; rejects non-TBD (menu price≠1), paid, cancelled, cancelled-line. No KOT. POS/KDS refresh via socket `update-order-status`.

## Confirmed code anchors (verified @ fa5b2ffa)
- Per-line id (= API `item_id`): `orderFromAPI` → `id: detail.id` (`orderTransform.js:115`). Available as `it.id` (ScanOrderPopOut rows) and `item.id` (OrderEntry loaded items, `OrderEntry.jsx:519`).
- Fresh ₹1 tap (ADD path, already works, UNCHANGED): `OrderEntry.jsx:850` → `setDynamicPriceItem`; `confirmDynamicPriceAndAdd:880-928`; modal `:3038-3101`. (This adds an UNPLACED priced line — it does NOT reprice a placed line, so it is not reused for Gap B.)
- Gap A (Accept pop-up, read-only today): `PopoutItemRow.jsx:73 isAps`, `:116-118` "Price TBD" badge. Pop-out renders new (fOS=7) rows at `ScanOrderPopOut.jsx:559-573`.
- Gap B (web order in Edit): loaded APS line arrives `placed:true` (`OrderEntry.jsx:527`) → needs a reprice affordance + API call (not the add flow).

## Planned edits
**1. `api/constants.js` + `api/services/orderService.js` (NEW)** — add `UPDATE_FOOD_ITEM_PRICE = '/api/v2/vendoremployee/order/update-food-item-price'` and `updateFoodItemPrice(orderId, items)` (PUT, Bearer auth). Map `data.order_amount` → new bill total; expose `data.items` for row refresh.

**2. `components/dashboard/PopoutItemRow.jsx` (:116-118)** — for `isAps` rows (pre-bill, not cancelled), replace the read-only "Price TBD" badge with a price input bound via a new `onPriceChange(it.id, value)` prop (lifts entered price to the parent; **no network call here**). Preserve all testids; add `popout-item-price-input-<id>`.

**3. `components/dashboard/ScanOrderPopOut.jsx`** — hold a `pendingPrices` map (keyed by `it.id`) fed by `onPriceChange`. On **Accept/Update**: if `pendingPrices` non-empty, first `await updateFoodItemPrice(orderId, items[])`; on success map `data.order_amount` into the bill/total and let socket `update-order-status` refresh; on error (all-or-nothing) surface message and do NOT proceed. Accept's existing status-flip (`handleConfirmOrder`) is unchanged and runs after the price call. Do not touch reject/cancel.

**4. `components/order-entry/OrderEntry.jsx` (Edit path, Gap B)** — surface a reprice affordance on a `placed:true` APS/₹1 line (unit===1, not cancelled). Collect entered prices into a `pendingItemPrices` map keyed by `item.id`. On the existing **Update/Place** action, if the map is non-empty, `await updateFoodItemPrice(orderId, items[])` first, then continue; refresh totals from `data.order_amount` / socket. Fresh-tap add path (`:850/:880-928`) stays as-is.

**NO CollectPaymentPanel edit** — pre-bill guard dropped per owner (Q1, 2026-11-20).

## Verification matrix
| Case | Expected |
|---|---|
| Accept pop-up: APS ₹1 row, type price, Accept | one `update-food-item-price` call with that line's `orderDetails[].id`; bill total = `data.order_amount`; order accepted; no KOT |
| Accept pop-up: multiple APS rows priced, Accept | single call with all rows in `items[]` |
| Accept pop-up: APS row left at ₹1, Accept | allowed (placeholder); no price call for that row |
| OE Edit: web order APS ₹1 line, set price, Update | price persists via API; total recalculated |
| Re-enter a price on same line | overwrites (API supports re-call) |
| Try to price a paid / cancelled order or non-TBD item | API rejects all-or-nothing; UI shows the contract error, nothing changes |
| Normal (non-APS) order Accept/Update/bill | unchanged, no price call, not blocked |
| Non-APS legit ₹1 item (menu price≠1) | `isAps` must not false-trigger; if sent, API rejects "only TBD" |

## Risk / regression (HIGH — financial)
New write to order financials. Mandatory E2E money test: priced totals match `data.order_amount`; normal orders' subtotal/tax/total unaffected. Shared files `PopoutItemRow`/`ScanOrderPopOut` (CR-545/557 region) and `OrderEntry` — additive only; rebase-aware. Rollback = revert the 4 edits (service/constant additive). QA via testing_agent + owner smoke.

## Resolved
- Open probe DONE — `isAps`/`unit===1` confirmed on live orders (evidence saved). Both owner questions answered 2026-11-20 (guard dropped; batch-on-accept). Sequencing note retired (CR-547/552/557/558 settled, BUG-741 shipped).

## Next
Gate-4 GO → implement (IMPLEMENTATION role).
