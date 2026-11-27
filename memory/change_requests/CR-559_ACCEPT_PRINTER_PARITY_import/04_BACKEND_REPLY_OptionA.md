# Evidence — Backend reply to BACKEND_BRIEF_INV-ACCEPT-PRINTER (Option A), 2026-11-19

Source: owner/backend, verbatim.

---
Decision: **Option A, payload parity.** The confirm endpoint now accepts `printer_agent` and forwards it.

Endpoint (unchanged): `PUT /api/v2/vendoremployee/order/waiter-dinein-order-status-update` (CONFIRM_ORDER)

FE change: add `printer_agent` to the accept payload, using the same array shape and selectors as Place Order.

```json
{
  "order_id": "1578953",
  "role_name": "Manager",
  "order_status": "cooking",
  "printer_agent": [
    {
      "station": "KDS",
      "printer_agent_id": "5843",
      "printer_type": "bluetooth",
      "printer_ip": null,
      "printer_paper_roll": "58",
      "vendor_id": "69",
      "product_id": null,
      "wifi_printer_ip": null,
      "printer_name": null
    }
  ]
}
```

How to build `printer_agent`, reusing the Place Order logic in `orderTransform.js:1099-1102`:
- KOT agents: `selectAgentsForKot(printerAgents, cartStationsToSet(<items being confirmed>))`
  - New web order (`order_confirm_for_web`): use **all** order items.
  - Web edit (`edit_order_confirm_web`): use **only** the items that were awaiting confirmation (food_status 7).
- Add `selectAgentsForBill(printerAgents)` after the KOT agents, same as Place Order (CR-130 / OD-3).
- Pass `printerAgents` from `useRestaurant()` into `handleConfirmOrder` → `confirmOrder` → `toAPI.updateOrderStatus`, and add it to the `useCallback` deps.

Do NOT send `print_kot`. The backend ignores it and decides itself:
- Y when the order was Not-Confirm (status 7) or the accept promoted items from status 7.
- N otherwise. In that case nothing prints, even if agents are sent.

Do NOT also call `printOrder` after accept. Option B together with Option A prints the KOT twice. Keep the existing manual KOT button (CR-545/547) as the reprint path.

If `printer_agent` is omitted or empty, accept still succeeds and nothing prints.

Socket: the result is published on `update-order-status` (SOCKET_URL_ORDER_UPDATE) with `print_kot` and `printer_agent`, the same channel and shape as place and update. — only for web order; nothing touches aggregator or any other kind of order.
