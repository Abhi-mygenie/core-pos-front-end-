# Evidence — Live probe (post-fix), 2026-11-19

Environment: preprod (`REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`)
Login (alias): poki@macha.com · Restaurant with printer agent id 5843 (bluetooth, 58mm).
Method: Playwright network interception on the live preview; clicked **Accept** on the t2
"New Web Order — Awaiting Confirmation" pop-up (a WEB-EDIT order: 1 new item "moo duudh"
awaiting confirmation + 17 previously ordered items).

## Captured request (verbatim)
```
PUT https://preprod.mygenie.online/api/v2/vendoremployee/order/waiter-dinein-order-status-update
```
```json
{
  "order_id": "1578881",
  "role_name": "Manager",
  "order_status": "cooking",
  "printer_agent": [
    { "station": "KDS",  "printer_agent_id": "5843", "printer_type": "bluetooth", "printer_ip": null, "printer_paper_roll": "58", "vendor_id": "69", "product_id": null, "wifi_printer_ip": null, "printer_name": null },
    { "station": "BILL", "printer_agent_id": "5843", "printer_type": "bluetooth", "printer_ip": null, "printer_paper_roll": "58", "vendor_id": "69", "product_id": null, "wifi_printer_ip": null, "printer_name": null }
  ]
}
```

## Result — PASS
- `printer_agent` IS sent (was absent before the fix).
- KOT agent for the confirmed item's station (KDS) + BILL agent appended (CR-130/OD-3 parity). Matches backend's expected shape.
- `order_status` = `cooking` (profile default), NOT `paid`.
- `print_kot` NOT sent (backend decides). No second `printOrder` call observed → no double KOT.
- Web-edit path correctly derived stations from the awaiting-confirmation item only.

## Note
This confirmed a real order (`1578881`) on preprod — owner authorised the live probe on a table order.
Aggregator / room pop-up untouched.
