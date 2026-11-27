# BUG-703 — Live probe (2026-11-19)

**Account:** owner@thegoankitchen.com (role: Owner, login_type: employee) · token masked/not stored
**Base:** https://preprod.mygenie.online

## Calls
1. `POST /api/v1/auth/vendoremployee/common-login` → HTTP 200, token acquired (role Owner).
2. `GET /api/v1/vendoremployee/urbanpiper/get-order-list` → HTTP 200 (`aggregator_order_list.json`).

## Result — CONFIRMS BUG-703 repro
- Aggregator orders returned: **1**.
- `order_details_order`: `id=72283`, `urban_order_id=2742935`, `order_status="pending"`, **`f_order_status = 1` (ACCEPTED/acknowledged)**, `b_order_status=0`, `k_order_status=0`, `station_order_status={"KDS":0}`, 1 food item.

## Why this proves the bug
`AggregatorOrderPopOut` queue admits only `fOrderStatus === 0 || 7`. This live order is **`f_order_status = 1`** → excluded from the auto-popup queue, and `TableCard.jsx:312` makes the aggregator tile click a no-op → **no path to open/view this accepted order in Table View**. Matches IA Code Reality (code-traced) with live data.

Evidence files: `login_raw.json` (masked), `aggregator_order_list.json`.
