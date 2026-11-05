# BE reply — CR-358 + CR-362 + CR-365 (standalone)

**To:** MyGenie POS frontend  
**From:** Backend  
**Date:** 2026-09-13  
**Base:** `{HOST}/api/v2/vendoremployee` (check-in uses v1 path below)  
**Auth:** `Authorization: Bearer {TOKEN}`

---

## Future release (no curls)

- **Self check-in** (public GET/POST + token generate / OD-05 / GAP-06) — deferred.
- **Sockets / FCM** (`new_reservation`, `room_status_update` on HK assign / B-10 / B-365-06) — deferred. Poll or manual refresh for now.

---

## CR-358 — shipped

### Local reservations (B-01)

```bash
curl -sS -G "{HOST}/api/v2/vendoremployee/aiosell/local-reservations" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json" \
  --data-urlencode "start_date=2026-09-01" \
  --data-urlencode "end_date=2026-09-30"
```

Optional: `view=all|in_house|arrivals|departures|cancelled`, `status=cancelled`, `booking_id=...`, `checkin_date=YYYY-MM-DD`.

### Online / Direct check-in link (B-02 / OD-02)

Pass `booking_id` + `booking_type` (`Online` or `Direct`) + `room_id[]`. Backend links by `booking_id` (no separate `aiosell_reservation_id` field). After success, room line → `line_status=checked_in`, reservation → `operational_status=in_house`.

```bash
curl -sS -X POST "{HOST}/api/v1/vendoremployee/pos/user-group-check-in" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "phone": "9876543210",
    "name": "Test Guest",
    "booking_id": "BDC8899464",
    "booking_type": "Online",
    "booking_for": "individual",
    "room_id": [8527],
    "checkin_date": "2026-09-08",
    "checkout_date": "2026-09-10",
    "order_amount": 13922,
    "advance_payment": 0,
    "balance_payment": 13922,
    "total_adult": 2,
    "total_children": 0,
    "id_type": "Aadhaar"
  }'
```

### Direct advance booking (B-06)

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/aiosell/direct-reservation" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "guest": { "name": "Future Guest", "phone": "9888888888", "email": "future@example.com" },
    "checkin": "2026-09-07",
    "checkout": "2026-09-09",
    "rooms": [{ "aiosell_room_code": "executive" }],
    "order_amount": 5000,
    "adults": 2,
    "children": 0,
    "notes": "Booked at front desk"
  }'
```

Physical pre-assign: `"rooms": [{ "restaurant_table_id": 8528 }]`. Cancel: `POST .../direct-reservation/cancel` with `{ "booking_id": "MG-69-..." }`.

### Dashboard KPIs (B-08)

```bash
curl -sS -G "{HOST}/api/v2/vendoremployee/aiosell/dashboard-kpis" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json" \
  --data-urlencode "start_date=2026-09-01" \
  --data-urlencode "end_date=2026-09-10" \
  --data-urlencode "as_of_date=2026-09-13"
```

### Checkout inventory (B-07)

No new endpoint. Settle/checkout via existing `order-bill-payment` (auto-HK if enabled does **not** push inventory). Inventory release fires when staff clears HK (`PATCH room-status` → `available`) or equivalent clear path.

### Room board (B-09)

See **Board / stayover HK** below (`occupied_hk` added for stayover).

---

## CR-362 — bookings

**B-362-06:** Direct cancel/modify = local DB + optional inventory (`notify_cm`). No Aiosell booking-cancel API push; OTA booking sync is inbound/webhook.

### List cancelled

```bash
curl -sS -G "{HOST}/api/v2/vendoremployee/aiosell/local-reservations" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json" \
  --data-urlencode "start_date=2026-09-01" \
  --data-urlencode "end_date=2026-09-30" \
  --data-urlencode "status=cancelled"
```

```bash
curl -sS -G "{HOST}/api/v2/vendoremployee/aiosell/local-reservations" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json" \
  --data-urlencode "start_date=2026-09-01" \
  --data-urlencode "end_date=2026-09-30" \
  --data-urlencode "view=cancelled"
```

### Cancel

`POST /aiosell/local-reservations/{id}/cancel` — **409** if any room checked in. `notify_cm` = inventory push only (default true).

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/aiosell/local-reservations/{id}/cancel" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "reason": "Guest cancelled",
    "cancelled_by": "front_desk",
    "notify_cm": true
  }'
```

### Modify (pending only)

`PATCH /aiosell/local-reservations/{id}` — **409** if any room checked in.

```bash
curl -sS -X PATCH "{HOST}/api/v2/vendoremployee/aiosell/local-reservations/{id}" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "checkin": "2026-09-14",
    "checkout": "2026-09-16",
    "amount_after_tax": 5000,
    "reason": "Date change",
    "rooms": [
      {
        "id": 101,
        "room_code": "DLX",
        "restaurant_table_id": 8527,
        "adults": 2,
        "children": 0
      }
    ]
  }'
```

### Extend in-house stay

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/pos/room-extend-stay" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "order_id": 1234567,
    "new_checkout_date": "2026-09-18",
    "new_room_price": 6000,
    "reason": "One more night"
  }'
```

---

## Board / stayover HK

`display_status`: `available` | `occupied` | `occupied_hk` | `booked` | `hk` | `ooo`  
PATCH body only: `hk` | `ooo` | `available` — never send `occupied_hk`.  
Occupied + PATCH `hk` → `display_status=occupied_hk`. Vacant HK → `hk`.  
Server auto-creates an HK task when room → `hk` or `ooo`.

### Board

```bash
curl -sS "{HOST}/api/v2/vendoremployee/aiosell/room-status-board" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json"
```

### Mark HK (stayover OK)

```bash
curl -sS -X PATCH "{HOST}/api/v2/vendoremployee/aiosell/room-status/{restaurantTableId}" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{ "status": "hk" }'
```

### Clear HK

```bash
curl -sS -X PATCH "{HOST}/api/v2/vendoremployee/aiosell/room-status/{restaurantTableId}" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{ "status": "available" }'
```

---

## CR-365 — HK tasks

**B-365-07:** Completing a task (or checklist complete) clears room status server-side — do not PATCH `available` separately.  
**B-365-04:** Assignees from `employee/employees-list` (filter role client-side).

### List

```bash
curl -sS -G "{HOST}/api/v2/vendoremployee/aiosell/hk-tasks" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json" \
  --data-urlencode "date=2026-09-13" \
  --data-urlencode "status=pending" \
  --data-urlencode "assignee_id=12"
```

### Create

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/aiosell/hk-tasks" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "restaurant_table_id": 8527,
    "task_type": "stayover",
    "priority": "high",
    "note": "Towels",
    "checklist": { "towels": false, "bathroom": false }
  }'
```

`task_type`: `checkout_clean` | `stayover` | `deep_clean` | `maintenance`

### Update / complete (clears room atomically)

```bash
curl -sS -X PATCH "{HOST}/api/v2/vendoremployee/aiosell/hk-tasks/{id}" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "assignee_id": 12,
    "status": "completed",
    "note": "Done",
    "checklist": { "towels": true, "bathroom": true }
  }'
```

`status`: `pending` | `assigned` | `in_progress` | `completed` | `cancelled`

### Assign on room

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/aiosell/hk-assign/{restaurantTableId}" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{ "waiter_id": 12 }'
```

---

## Checklist

### Get / put template

```bash
curl -sS "{HOST}/api/v2/vendoremployee/aiosell/hk-checklist/template" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json"
```

```bash
curl -sS -X PUT "{HOST}/api/v2/vendoremployee/aiosell/hk-checklist/template" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "Default HK",
    "is_active": true,
    "lines": [
      { "action": "consume", "inventory_master_id": 501, "default_qty": 1, "unit": "pcs", "label": "Soap", "sort_order": 0 },
      { "action": "verify", "label": "AC remote", "sort_order": 1 },
      { "action": "laundry_issue", "inventory_master_id": 601, "default_qty": 2, "unit": "pcs", "pair_key": "towel", "label": "Issue clean towels", "sort_order": 2 },
      { "action": "laundry_collect", "inventory_master_id": 602, "default_qty": 2, "unit": "pcs", "pair_key": "towel", "label": "Collect dirty towels", "sort_order": 3 }
    ]
  }'
```

`action`: `consume` | `verify` | `laundry_issue` | `laundry_collect`

### Room checklist

```bash
curl -sS "{HOST}/api/v2/vendoremployee/aiosell/hk-checklist/{restaurantTableId}" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json"
```

### Complete (clears room + open task; empty template OK; stock fail → 422)

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/aiosell/hk-checklist/{restaurantTableId}/complete" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "lines": [
      { "action": "consume", "inventory_master_id": 501, "qty": 1, "unit": "pcs", "label": "Soap" },
      { "action": "verify", "label": "AC remote" },
      { "action": "laundry_issue", "inventory_master_id": 601, "qty": 2, "unit": "pcs", "pair_key": "towel" },
      { "action": "laundry_collect", "inventory_master_id": 602, "qty": 2, "unit": "pcs", "pair_key": "towel" }
    ]
  }'
```

Omit `lines` to use template as-is. `{}` / empty lines also clears if no stock lines.

---

## Laundry

### Settings

```bash
curl -sS "{HOST}/api/v2/vendoremployee/aiosell/laundry/settings" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json"
```

```bash
curl -sS -X PUT "{HOST}/api/v2/vendoremployee/aiosell/laundry/settings" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{ "default_assignee_id": 15 }'
```

### Queue / stock

```bash
curl -sS -G "{HOST}/api/v2/vendoremployee/aiosell/laundry/queue" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json" \
  --data-urlencode "status=pending"
```

```bash
curl -sS "{HOST}/api/v2/vendoremployee/aiosell/laundry/stock" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json"
```

### Process dirty → clean

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/aiosell/laundry/process" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "queue_item_ids": [1, 2],
    "assignee_id": 15
  }'
```

Omit `queue_item_ids` to process all pending.

---

## Employees (assignees)

```bash
curl -sS "{HOST}/api/v2/vendoremployee/employee/employees-list" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json"
```

Filter by role client-side.
