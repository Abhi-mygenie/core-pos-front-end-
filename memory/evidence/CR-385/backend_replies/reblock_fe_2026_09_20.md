# re_block Gate-4 — curl probe

Companion to [`re_block.md`](re_block.md) §B4 (D1–D7 + BQ-16).  
`{HOST}` · `{TOKEN}` · capture `{RESERVATION_ID}` `{BOOKING_ID}` `{ORDER_ID}` `{TABLE_*}` as you go. Rates must be pushed for the stay window (except §1b).

---

## 0 — fetch-rates

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/aiosell/fetch-rates" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "start_date": "2026-10-10",
    "end_date": "2026-10-14"
  }'
```

**Pass:** `updates[].rates[]` has `roomCode` + `rateplanCode` + `rate` > 0 for the type/plan you will book.

---

## 1 — BQ-16 omit rate → filled charge

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/aiosell/direct-reservation" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "guest": { "name": "BQ16 Guest", "phone": "9876500100" },
    "checkin": "2026-10-10",
    "checkout": "2026-10-12",
    "adults": 2,
    "children": 0,
    "rooms": [
      {
        "room_code": "executive",
        "rateplan_code": "executive-s-ep",
        "rooms_count": 1
      }
    ]
  }'
```

**Pass:** HTTP 200; `data.reservation.charge.rate_per_night` > 0; `total_with_gst` > 0. Cancel/skip this booking if unused.

---

## 1b — BQ-16 no rates → 422

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/aiosell/direct-reservation" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "guest": { "name": "No Rate Guest", "phone": "9876500999" },
    "checkin": "2027-01-01",
    "checkout": "2027-01-03",
    "rooms": [
      {
        "room_code": "executive",
        "rateplan_code": "executive-s-ep",
        "rooms_count": 1
      }
    ]
  }'
```

**Pass:** HTTP 422; `message` = `no rate configured`; no ₹0 reservation persisted.

---

## 2 — D2 setup: Direct + advance (lifecycle booking)

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/aiosell/direct-reservation" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "guest": { "name": "Gate4 Guest", "phone": "9876500200" },
    "checkin": "2026-10-10",
    "checkout": "2026-10-11",
    "adults": 2,
    "children": 0,
    "rooms": [
      {
        "room_code": "executive",
        "rateplan_code": "executive-s-ep",
        "rooms_count": 1
      }
    ],
    "advance": {
      "amount": 1000,
      "method": "upi",
      "reference": "GATE4ADV"
    }
  }'
```

**Pass:** save `data.reservation.id` → `{RESERVATION_ID}`, `booking_id` → `{BOOKING_ID}`; `charge.advance_payment` ≈ 1000; `charge.rate_per_night` > 0.

---

## 3 — D1 / D3 / D5 check-in paid upgrade (higher type)

Use a **suite** physical table while booking is **executive**. Set `{TABLE_SUITE}`.

```bash
curl -sS -X POST "{HOST}/api/v1/vendoremployee/pos/user-group-check-in" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json" \
  -F "phone=9876500200" \
  -F "name=Gate4 Guest" \
  -F "booking_type=Direct" \
  -F "booking_id={BOOKING_ID}" \
  -F "aiosell_reservation_id={RESERVATION_ID}" \
  -F "id_type=Aadhaar" \
  -F "room_id[]={TABLE_SUITE}" \
  -F "checkin_date=2026-10-10" \
  -F "checkout_date=2026-10-11" \
  -F "order_amount=0" \
  -F "advance_payment=0" \
  -F "balance_payment=0" \
  -F "gst_tax=0" \
  -F "total_adult=2" \
  -F "total_children=0" \
  -F "payment_method=Cash" \
  -F "upgrade_type=paid" \
  -F "upgrade_amount=1500" \
  -F "upgrade_reason=Suite upgrade probe"
```

**Pass:** HTTP 200 (not type-mismatch 422); `data.order_id` set → `{ORDER_ID}`; `data.charge` present; `data.charge.advance_payment` ≈ 1000; `data.charge.upgrade_amount` ≈ 1500; stay/folio `room_price` is pre-GST (not inclusive + `gst_tax` again).

---

## 4 — D4 extend +1 night (no room discount)

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/pos/room-extend-stay" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "order_id": {ORDER_ID},
    "new_checkout_date": "2026-10-12",
    "reason": "Gate4 extra night",
    "payment": {
      "amount": 500,
      "method": "cash"
    }
  }'
```

**Pass:** `charge.nights` = 2; `booking_charge ≈ rate_per_night × 2` (+ upgrade if still in charge); `advance_payment` ≈ 1000 + 500; no `discount` in body.

---

## 5 — D7 room move + board

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/pos/room-extend-stay" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "order_id": {ORDER_ID},
    "new_checkout_date": "2026-10-12",
    "new_restaurant_table_id": {TABLE_DEST},
    "reason": "Gate4 move"
  }'
```

```bash
curl -sS "{HOST}/api/v2/vendoremployee/aiosell/room-status-board" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json"
```

**Pass:** `{TABLE_DEST}` display `occupied` (not `occupied_hk`); origin `{TABLE_SUITE}` is `hk`.

---

## 6 — D6 TAB without `order_discount` key

Swap `{ORDER_ID}` / amounts / guest / `waiter_id` for the live stay. **Do not** send `order_discount`.

```bash
curl -sS -X POST "{HOST}/api/v2/vendoremployee/order/order-bill-payment" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "order_id": "{ORDER_ID}",
    "payment_mode": "TAB",
    "payment_amount": {BALANCE_DUE},
    "payment_status": "success",
    "transaction_id": "",
    "billing_auto_bill_print": "No",
    "food_detail": [],
    "waiter_id": 5146,
    "restaurant_name": "Yab Yum",
    "email": "",
    "order_sub_total_amount": 0,
    "order_sub_total_without_tax": 0,
    "total_gst_tax_amount": 0,
    "gst_tax": 0,
    "vat_tax": 0,
    "grant_amount": {BALANCE_DUE},
    "order_amount": {BALANCE_DUE},
    "round_up": 0,
    "service_tax": 0,
    "service_gst_tax_amount": 0,
    "tip_amount": 0,
    "tip_tax_amount": 0,
    "delivery_charge": 0,
    "self_discount": 0,
    "discount_for": null,
    "coupon_code": "",
    "coupon_discount": 0,
    "coupon_title": "",
    "coupon_type": "",
    "comm_discount": 0,
    "discount_type": "",
    "order_discount_type": "Percent",
    "discount_value": 0,
    "discount_member_category_id": 0,
    "discount_member_category_name": "",
    "used_loyalty_point": 0,
    "loyalty_points_used": 0,
    "loyalty_discount": 0,
    "loyalty_redemption_id": null,
    "use_wallet_balance": 0,
    "paid_room": "yes",
    "usage_id": "",
    "cust_name": "Gate4 Guest",
    "cust_mobile": "9876500200",
    "cust_membership_id": "",
    "name": "Gate4 Guest",
    "mobile": "9876500200",
    "crm_customer_id": "",
    "custGST": "",
    "custGSTName": ""
  }'
```

**Pass:** HTTP 200; body has no SQL / `restaurant_discount_amount`; stay settled.

---

## 6b — TAB settle with `order_discount: 0` (control)

Same body as §6 with `"order_discount": 0` added (if §6 already settled, skip).

**Pass:** HTTP 200; board shows dest free / not in-house for that order.
