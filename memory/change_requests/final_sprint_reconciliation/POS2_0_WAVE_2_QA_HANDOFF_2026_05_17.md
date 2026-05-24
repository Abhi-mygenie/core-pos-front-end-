# POS2.0 Wave 2 — Financial Core — QA Handoff — 2026-05-17

## Bugs Implemented: BUG-051, BUG-054, BUG-055, BUG-075, BUG-083, BUG-052

## Files Changed
1. `frontend/src/api/transforms/orderTransform.js` — 5 bugs
2. `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — 5 bugs
3. `frontend/src/api/transforms/profileTransform.js` — BUG-052
4. `frontend/src/components/order-entry/OrderEntry.jsx` — BUG-052
5. `frontend/src/__tests__/api/transforms/qa_subtotal_delivery_validation.test.js` — BUG-051 re-baseline

## Automated Test Results: ALL PASS
- qa_subtotal_delivery_validation: 19/19 ✅
- orderTransformFinancials: 18/18 ✅
- profileTransform: 32/32 ✅

## QA Manual Test Matrix

| # | Bug | Test | Expected | Priority |
|---|-----|------|----------|----------|
| 1 | BUG-051 | Dine-in ₹105.05 order → Collect Bill | Grand Total = ₹106, round_up = "0.95" | P0 |
| 2 | BUG-051 | Dine-in ₹100.00 order → Collect Bill | Grand Total = ₹100, round_up = "0.00" | P0 |
| 3 | BUG-054 | VAT restaurant + ₹100 discount on ₹1000 item | VAT prorated (lower than without discount) | P0 |
| 4 | BUG-054 | GST restaurant + discount | GST unchanged (already prorated) | P0 |
| 5 | BUG-055 | Prepaid Place+Pay with Percent discount | Network payload has `order_discount_type: 'Percent'` | P1 |
| 6 | BUG-075 | Takeaway order → Collect Payment | Tip input NOT visible | P0 |
| 7 | BUG-075 | Delivery order → Collect Payment | Tip input NOT visible | P0 |
| 8 | BUG-075 | Dine-in order → Collect Payment | Tip input visible (if feature enabled) | P0 |
| 9 | BUG-075 | Walk-in order → Collect Payment | Tip input visible (if feature enabled) | P0 |
| 10 | BUG-083 | Delivery order → network payload | `delivery_charge_gst_amount` key present | P1 |
| 11 | BUG-083 | Dine-in order → network payload | `delivery_charge_gst_amount` key absent | P1 |
| 12 | BUG-052 | Restaurant with total_round="Yes" | Ceiling round-off applied | P1 |
| 13 | BUG-052 | Restaurant with total_round="No" | No rounding (raw total) | P1 |

## Regression Checks
- [ ] Existing dine-in order flow unchanged (place → settle)
- [ ] Delivery order with charge → correct totals
- [ ] Room order → correct SC + Tip behavior
- [ ] Print bill → correct totals
- [ ] Dashboard card amounts correct
- [ ] Cash quick-pills reflect correct total
