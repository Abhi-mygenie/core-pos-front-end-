# BUG-168 Tax Investigation — What FE SENDS vs What Backend RETURNS

**Date:** 2026-07-08
**Agent role:** INVESTIGATION (Alpha v0.7 Role 6)

---

## What FE SENDS to Backend (with tax)

### 1. Place Order → `POST /place-order` (calcOrderTotals)
```
gst_tax:                  ₹ amount
vat_tax:                  ₹ amount
tax_amount:               total tax ₹
service_gst_tax_amount:   ₹ amount
tip_tax_amount:           ₹ amount
delivery_charge_gst_amount: ₹ amount (conditional)
```

### 2. Collect Bill → `POST /order-bill-payment`
```
gst_tax:                  ₹ amount
vat_tax:                  ₹ amount
total_gst_tax_amount:     ₹ amount
service_gst_tax_amount:   ₹ amount
tip_tax_amount:           ₹ amount
```

### 3. Place + Pay → `POST /place-order` (with payment)
```
gst_tax:                  ₹ amount
vat_tax:                  ₹ amount
service_gst_tax_amount:   ₹ amount
tip_tax_amount:           ₹ amount
```

### 4. Print Bill → `POST /order-temp-store`
```
gst_tax:                  ₹ amount
vat_tax:                  ₹ amount
cgst_amount:              gst_tax / 2
sgst_amount:              gst_tax / 2
serviceChargeAmount:      ₹ amount
```

---

## What Backend RETURNS (NO tax)

### Socket `new-order` / `update-order`:
```
order_amount:                ✅ (total with tax)
order_sub_total_amount:      ✅ (item total)
order_sub_total_without_tax: ✅ (subtotal before tax)
total_service_tax_amount:    ✅ (SC amount)
tip_tax_amount:              ✅ (tip tax)
gst_tax:                     ❌ MISSING
vat_tax:                     ❌ MISSING
cgst_amount:                 ❌ MISSING
sgst_amount:                 ❌ MISSING
```

### `employee-orders-list` API:
```
Same as socket — gst_tax, vat_tax, cgst, sgst ALL MISSING
```

### `get-single-order-new` API:
```
Same — gst_tax, vat_tax, cgst, sgst ALL MISSING
```

---

## The Gap

| Field | FE → Backend (SEND) | Backend → FE (RETURN) |
|-------|:-------------------:|:---------------------:|
| `order_sub_total_amount` | ✅ | ✅ (recently added) |
| `order_sub_total_without_tax` | ✅ | ✅ (recently added) |
| `total_service_tax_amount` | ✅ | ✅ |
| `order_amount` | ✅ | ✅ |
| **`gst_tax`** | **✅ SENT** | **❌ NOT RETURNED** |
| **`vat_tax`** | **✅ SENT** | **❌ NOT RETURNED** |
| **`cgst_amount`** | ✅ (print only) | ❌ NOT RETURNED |
| **`sgst_amount`** | ✅ (print only) | ❌ NOT RETURNED |

---

## Conclusion

The backend **receives and stores** `gst_tax` and `vat_tax` on every place-order and collect-bill call. But it does NOT return these fields on any of the 3 read endpoints (socket, list API, single-order API).

**Backend ask:** Add `gst_tax` and `vat_tax` to the order response on:
1. `employee-orders-list` 
2. `get-single-order-new`
3. Socket `new-order` / `update-order` events

Once added, the FE print payload can pass them through directly — same as we now do for `order_sub_total_amount` and `order_sub_total_without_tax`.
