# Backend Handover: CR-527 (Diner vs Credit-Holder) + BUG-680 (Order Discount)

**To:** Frontend / POS (E1)
**From:** Backend (Gyan)
**Date:** 2026-11-21
**Re:** Backend Brief — CR-527 + BUG-680 (2026-11-21)
**Env:** preprod, restaurant 69

Field names are exactly as locked: `diner_name`, `diner_mobile` (string|null). No existing discount fields were renamed.

> Archived into memory on 2026-11-21 from owner-uploaded artifact `CR-527_BUG-680_BACKEND_HANDOVER.md`. Verified live by `investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md`.

---

## Sign-off

| ID | Part | Scope | Status | Notes |
|---|---|---|---|---|
| BB-09.2a | A | Persist `diner_name` / `diner_mobile` on the credit row | **OK — done** | Accepted on every credit write request (see A2) |
| BB-09.2b | A | Fallback snapshot at credit time | **OK — done** | Falls back to the diner saved on the **order**, not `cust_name` (see A1) |
| BB-09.3 | A | Diner fields on order reads | **OK — done** | `employee-orders-list` (v1 + v2, all roles) and `get-single-order-new` |
| BB-09 orig | A | `diner_mobile`: plain text vs CRM link | **(a) plain text** | Sending a diner never creates or links a CRM customer |
| BUG-680.R | B | Zero discount of any type fully clears | **Fixed** | |
| BUG-680.E1 | B | Fixed discount reallocation after adding an item | **Changed** | Fixed is now re-spread pro-rata like percent |
| BUG-680.E2 | B | Mixed fixed + % on merge/transfer | **Unchanged (by decision)** | The target order's discount wins |

---

# PART A — CR-527

## A1. Important: send the diner in `diner_name` / `diner_mobile`, not in `cust_name`
The brief proposed putting the diner in the order's `cust_name` / `cust_mobile`. **Please don't.** On the order, those fields are the **customer / credit holder**:
- `cust_name` becomes the order's `user_name`, which is the holder you already show.
- `cust_mobile` **creates or links a CRM customer**. On TAB orders it is also used to identify the credit holder.

Putting the diner there would make the diner the holder and create a CRM contact. Instead, send the new fields alongside the existing ones:

| Field | Meaning |
|---|---|
| `cust_name` / `cust_mobile` | Holder / customer (unchanged behaviour) |
| `diner_name` / `diner_mobile` | Person who actually ate (plain text) |

## A2. Write: where to send the diner
**Saved on the order** (shown on running orders right away):

| Endpoint | Where in the payload | Behaviour |
|---|---|---|
| `POST /api/v2/vendoremployee/order/place-order` | inside the `data` JSON | Saved if present |
| `PUT /api/v2/vendoremployee/order/update-place-order` | top level, next to `order_id` | **Only changed when the key is sent.** If omitted, stored diner is kept. Send `""` or `null` to clear. |
| `POST /api/v2/vendoremployee/order/order-bill-payment` | top level | Saved if present |

**Saved on the credit row:** any request that creates a credit/TAB row also accepts `diner_name` / `diner_mobile` (e.g. `pos/tap-waiter-order-insert`, bill payment with TAB). The credit row's diner is decided in this order:
1. `diner_name` / `diner_mobile` sent in that request.
2. Otherwise, the diner saved on the order (from place-order / update-place-order).
3. Otherwise, `null`.

**Diner = holder → `null`.** If the diner's mobile equals the holder's mobile (or, with no diner mobile, the names match ignoring case), both fields are stored as `null`, and the FE shows "—". Values are trimmed; empty string is stored as `null`.

```json
// place-order (data JSON, excerpt)
{ "order_type": "dinein", "cust_name": "Saurav", "cust_mobile": "9800000001",
  "diner_name": "Abhishek", "diner_mobile": "9800000002", "payment_method": "pending", "cart": [ ] }
```
```json
// update-place-order (excerpt)
{ "order_id": "1579048", "diner_name": "Abhishek", "diner_mobile": "9800000002", "cart-update": [ ] }
```

## A3. Read: where the diner comes back
`diner_name` and `diner_mobile` (string|null) are added to **each order row** of:
- `GET /api/v1/vendoremployee/pos/employee-orders-list` (all `role_name` values)
- `GET /api/v2/vendoremployee/pos/employee-orders-list`
- `POST /api/v2/vendoremployee/get-single-order-new` (each item in `orders[]`)

`user`, `user_id`, `user_name` are **unchanged** (still the holder/customer).
```json
{ "id": 1579050, "restaurant_order_id": "000020", "user_id": 812, "user_name": "Saurav",
  "diner_name": "Abhishek", "diner_mobile": "9800000002", "order_amount": 100 }
```
Credit rows: `GET /api/v2/vendoremployee/pos/tap-customer-record-list?customer_id=N` returns `diner_name` / `diner_mobile` for new credit rows, per A2.

## A4. Notes
- **No backfill:** orders/credit rows created before this release return `null`.
- **CRM:** `diner_mobile` is stored as plain text only; never creates/links a CRM customer.

---

# PART B — BUG-680

## B1. BUG-680.R — removing a discount (fixed)
`POST /api/v2/vendoremployee/order/order-discount-manage` with `discount_amount: 0` now **fully clears** the discount, **whatever `discount_type` is sent**:
- `order_amount` goes back to the pre-discount total.
- Every item's `discount_on_food` becomes `0`.
- `restaurant_discount_amount` / `order_discount` become `0`, `discount_value` becomes `0`, `order_discount_type` becomes `null`.

Also fixes removing an applied **fixed** discount (previously failed like the type mismatch). Sending the currently applied type is still fine but no longer required.
```json
{ "order_id": 1579050, "discount_amount": 0, "discount_type": "fixed" }
```

## B2. BUG-680.E1 — fixed discount after adding an item (behaviour changed)
A **fixed** order discount is now re-spread **pro-rata across all active items on every recalculation**, the same as percent (incl. items added after the discount). Example: Item A ₹100, fixed ₹20 → A = 20. Add Item B ₹100 → **A = 10, B = 10**, `order_amount` = 180, line GST on 90 / 90. Item-level `discount_on_food` sent by FE for a fixed header discount is re-spread on the next recalculation; the header total is always kept exact.

## B3. BUG-680.E2 — mixed fixed + % on merge/transfer (unchanged, by decision)
On merging orders, **the target order's discount applies to the combined order**; the source order's own discount is not kept:
- Target % + source fixed → % applied over combined subtotal.
- Target fixed + source % → target's fixed spread over all items.
- Target no discount + discounted source → moved items keep their discount amounts.

---

# FE verification checklist
**Part A**
1. Place dine-in order with `cust_*` = holder, `diner_*` = different person. `employee-orders-list` (Manager + Owner) and `get-single-order-new` return the same `diner_name`/`diner_mobile`; `user_name` is the holder.
2. Settle to credit for the holder. `tap-customer-record-list?customer_id=` shows diner fields on that row.
3. Diner = holder (same mobile) or no diner sent → `diner_name` is `null`.
4. update-place-order without `diner_*` keys → diner unchanged. With `""` → diner cleared.

**Part B**
1. Apply 15% then fixed → `order_amount` / `restaurant_discount_amount` update in `employee-orders-list` and `get-single-order-new`.
2. Remove with `{discount_amount:0, discount_type:"fixed"}` and again with `"percent"` → order fully reverts in both cases.
3. Apply fixed ₹20 to a ₹100 item, then add another ₹100 item → shares 10 / 10, total 180.
