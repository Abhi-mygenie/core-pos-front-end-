# Restaurant Profile Probe — Ruby ZAP (RID=672)

## Date: 2026-11-16
## Credentials: owner@ruby.com

### Profile Settings (Socket & Order Confirm related)
| Setting | Value | Meaning |
|---------|-------|---------|
| def_ord_status | 1 | After confirm, order transitions to fOS=1 (Preparing/Cooking) |
| order_confirm_for_web | None (not set) | Web order confirmation — defaults to backend behavior |
| show_scan_popup | 1 | ScanOrderPopOut popup is ENABLED |
| confirm_order_tone | default | Confirm-order notification plays default tone |

### Running Orders (23 total)
All orders: fOS=5 (Served), order_from=pos, table_id=0 (walk-in/takeaway)
No YTC (fOS=7) orders at probe time.

### F_ORDER_STATUS_API Mapping (confirm payload)
```
def_ord_status=1 → F_ORDER_STATUS_API[1] = 'cooking'
→ confirmOrder sends: {order_id, role_name, order_status: 'cooking'}
→ Backend transitions: fOS 7 → 1
```
