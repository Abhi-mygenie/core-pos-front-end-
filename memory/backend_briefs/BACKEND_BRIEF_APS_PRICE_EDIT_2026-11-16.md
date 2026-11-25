# BACKEND_BRIEF_APS_PRICE_EDIT_2026-11-16

## Summary
- Issue: APS (₹1 placeholder price) items ordered via web/QR have no price correction mechanism in POS
- Classification: FEATURE_GAP / CONTRACT_MISMATCH
- Frontend impact: Staff cannot set actual price for APS items — order records ₹1 in settlement
- Priority/Risk: P1 / HIGH (financial accuracy)

---

## Questions for Backend Team (4 items)

### B1 — Can `cancel-food-item` work on YTC (fOS=7) orders?

- **Method:** PUT
- **URL:** `/api/v2/vendoremployee/order/cancel-food-item`
- **Question:** Does this endpoint accept requests where the parent order has `f_order_status = 7`?
- **Context:** POS currently only calls this on confirmed orders (fOS ≥ 1). New feature needs it on unconfirmed web orders.
- **Test needed:** PUT cancel-food-item with order_id of a fOS=7 order
- **If NO:** What error/status code is returned? Can a flag be added to allow it?

### B2 — Can `update-place-order` add items to a YTC (fOS=7) order?

- **Method:** PUT
- **URL:** `/api/v2/vendoremployee/order/update-place-order`
- **Question:** Does this endpoint accept `cart-update` additions when the order is at fOS=7?
- **Context:** Fallback approach — cancel ₹1 item + re-add at correct price on unconfirmed order
- **If NO:** Is there a separate API for modifying unconfirmed orders?

### B3 — New endpoint: Update placed item price

- **Request:** New endpoint to change the unit price of an existing placed order item
- **Use case:** APS items arrive at ₹1 → cashier needs to set actual price (e.g., ₹350 for fish based on weight/size)

**Proposed contract:**
```
PUT /api/v2/vendoremployee/order/update-food-price

{
  "order_id":      <int>,
  "item_id":       <int>,       // order_details[].id
  "order_food_id": <int>,       // food catalog ID  
  "new_price":     <float>,     // new unit price
  "reason":        <string>     // audit trail
}

Expected side effects:
  - Recalculate: subtotal, tax_amount, gst_tax, order_amount
  - Emit: update-order socket with recalculated totals
  - Audit: log old_price → new_price + reason + user_id + timestamp
```

**Questions:**
1. Should this work at any fOrderStatus or only fOS=7?
2. Should it update catalog price or order-level price only? (Recommendation: order-level only)
3. Does `update-order` socket include the recalculated totals automatically?

### B4 — Alternative: Extend confirm endpoint with price overrides

- **Method:** PUT
- **URL:** `/api/v2/vendoremployee/order/waiter-dinein-order-status-update`
- **Request:** Add optional `price_overrides` array to the existing confirm payload

```
{
  "order_id":     "123456",
  "role_name":    "Manager",
  "order_status": "cooking",
  "price_overrides": [
    { "item_id": 789, "new_price": 350.00 },
    { "item_id": 790, "new_price": 500.00 }
  ]
}
```

**Benefit:** Atomic — set prices + confirm in single call. Backward-compatible (empty/absent = no change).
**Recommendation:** Implement B3 (general-purpose) OR B4 (atomic confirm+price). Either unblocks FE.

---

## Reproduction
1. Set up a menu item with price = ₹1 (APS/market-price item) on web ordering
2. Customer orders via QR scan on table
3. POS receives scan-new-order with item at ₹1
4. ScanOrderPopOut shows ₹1 — no way to change price
5. If staff Accepts: order confirmed at ₹1 — settlement records ₹1

## Evidence
- Frontend code trace: `/app/memory/evidence/INV-APS-WEB-ORDER-2026-11-16/code_evidence.md`
- Investigation report: `/app/memory/investigations/INV-APS-PHASE1-PHASE2-2026-11-16.md`
- Screenshots: provided by owner (ScanOrderPopOut + OrderEntry with ₹1 melo fish)

## Frontend Workaround (current)
- Click Edit → Cancel ₹1 item → Re-add from menu (triggers BUG-035 price entry) → Update Order
- 4 extra steps per APS item. Creates unnecessary cancellation record.
