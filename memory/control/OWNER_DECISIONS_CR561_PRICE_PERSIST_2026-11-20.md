# CR-561 — Owner decisions & findings (price-persist) — 2026-11-20

## RESOLVED — backend delivered the endpoint
`PUT /api/v2/vendoremployee/order/update-food-item-price` is live (reprices a placed TBD/₹1 line by `orderDetails[].id`, returns recalculated `data.order_amount`, rejects paid/cancelled, no KOT). The earlier "backend-blocked" finding (no `update-food-price` [404]; `update-place-order` add-only) is RESOLVED. Contract: `contracts/CR-561_UPDATE_FOOD_ITEM_PRICE_API_2026-11-20.md`.

## Decisions (locked 2026-11-20)
- **OD-561-A:** price entry in BOTH places — Accept pop-up AND Order-Entry edit. Now fully buildable (endpoint targets the placed line by id).
- **OD-561-B (pre-bill guard):** **DROPPED.** Backend fully supports repricing; owner chose not to block billing on a still-₹1 item. No CollectPaymentPanel edit.
- **Save timing:** **BATCHED** — prices collected in the UI and submitted in ONE `items[]` call on Accept/Update (not per-keystroke).
- **OD-561-C (backend brief):** CLOSED — endpoint delivered; no brief needed.

## Status
CR-561 plan REVALIDATED & corrected → `plans/CR-561_IMPLEMENTATION_PLAN.md`. Gate 3, build-ready; awaiting Gate-4 GO.
