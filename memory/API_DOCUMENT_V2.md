# API Document v2 — Place Order Endpoint

**Version:** 2.2
**Last Updated:** Feb 2026
**Endpoint:** `POST /api/v1/vendoremployee/order/place-order`

---

## Overview

This single endpoint handles **3 flows**:

| Flow | Trigger | Key Differentiator |
|------|---------|-------------------|
| **Place New Order** (unpaid) | User clicks "Place Order" on new items | `payment_status: "unpaid"`, `payment_type: "postpaid"` |
| **Place + Pay** (fresh order) | User clicks "Pay" on new items without placing first | `payment_status: "paid"`, `payment_type: "prepaid"`, includes `partial_payments` |
| **Collect Bill** (existing order) | User clicks "Pay" on already-placed order | `payment_status: "paid"`, `payment_type: "postpaid"`, includes `order_id`, includes `cart` + full payload |

### BLOCKED: Collect Bill Flow (BUG-214)

**Status:** BLOCKED — Awaiting backend clarification

The "Collect Bill on existing order" flow (Flow 3) returns:
```
{"error": "Table is already occupied by a running order. Please choose another table or wait until it is free."}
```

**What we've tried:**
1. Sending payload WITHOUT `cart` → `{"error": "Cart is required"}`
2. Sending payload WITH `cart` + WITHOUT `order_id` → Creates a duplicate new order instead of marking existing as paid
3. Sending payload WITH `cart` + WITH `order_id` + `payment_status: "paid"` + `payment_type: "postpaid"` → `"Table is already occupied by a running order"`

**Current payload sent:**
```json
{
  "order_id": "730461",
  "user_id": "",
  "restaurant_id": 475,
  "table_id": "4259",
  "order_type": "pos",
  "cust_name": "",
  "cust_mobile": "",
  "payment_method": "cash",
  "payment_status": "paid",
  "payment_type": "postpaid",
  "order_sub_total_amount": 149,
  "order_sub_total_without_tax": 149,
  "tax_amount": 7.46,
  "gst_tax": 7.46,
  "order_amount": 157,
  "cart": [{"food_id": 116608, "quantity": 1, ...}],
  ...
}
```

**Questions for backend team:**
1. What is the correct payload structure to collect payment on an existing running order?
2. Does the endpoint differentiate between "create new order" and "collect payment on existing" by `order_id` presence, or by another field?
3. Is there a separate endpoint for collecting payment on existing orders?
4. Should `payment_type` be `"prepaid"` instead of `"postpaid"` for collect bill?

**Content-Type:** `multipart/form-data`
**Auth:** `Bearer <token>` in Authorization header

### Form Fields
| Key | Type | Description |
|-----|------|-------------|
| `data` | string (JSON) | Stringified JSON payload (all order data) |
| `audiofile` | file (optional) | Audio file attachment — NOT IMPLEMENTED in frontend, always omitted |

### Code Reference
- **Transform functions:** `/app/frontend/src/api/transforms/orderTransform.js`
  - `toAPI.placeOrder()` — Flow 1: Place New Order
  - `toAPI.placeOrderWithPayment()` — Flow 2: Place + Pay
  - `toAPI.collectBillExisting()` — Flow 3: Collect Bill
- **HTTP call:** `/app/frontend/src/components/order-entry/OrderEntry.jsx`
  - `handlePlaceOrder()` — wraps payload in `FormData`, posts to endpoint
  - `onPaymentComplete()` — wraps payment payload in `FormData`, posts to same endpoint

---

## Request Payload — Order Level Fields

### Customer Fields
| Field | Type | Example | Source in Code | Comments |
|-------|------|---------|---------------|----------|
| `user_id` | string | `""` | `customer?.id \|\| ""` | Customer ID from customer search/selection. Empty for walk-in |
| `cust_name` | string | `""` | `customer?.name \|\| ""` | Customer name. Empty for walk-in |
| `cust_mobile` | string | `""` | `customer?.mobile \|\| ""` | Customer mobile. Empty for walk-in |
| `cust_email` | string | `""` | `customer?.email \|\| ""` | Customer email. Empty for walk-in |
| `cust_dob` | string | `""` | `customer?.dob \|\| ""` | Customer date of birth. Empty if not set |
| `cust_anniversary` | string | `""` | `customer?.anniversary \|\| ""` | Customer anniversary date. Empty if not set |
| `cust_membership_id` | string | `""` | `customer?.membershipId \|\| ""` | Loyalty membership ID. Empty if no membership |

### Order Identity & Type
| Field | Type | Example | Source in Code | Comments |
|-------|------|---------|---------------|----------|
| `restaurant_id` | number | `475` | `restaurant?.id` from context | **REQUIRED.** Restaurant ID from auth/context |
| `table_id` | string | `"4271"` | `String(table.tableId)` | **REQUIRED for dine-in.** Table ID. `"0"` for takeaway/delivery |
| `order_type` | string | `"pos"` | Hardcoded `"pos"` | Always `"pos"` for POS orders. Other values: `"delivery"`, `"takeaway"` |
| `order_id` | string | `"730319"` | `String(placedOrderId)` | **Only for Collect Bill flow (Flow 3).** Existing order ID to attach payment. NOT sent for new orders |
| `order_note` | string | `"Birthday"` | `orderNotes.map(n => n.label).join(', ')` | Order-level notes. Comma-separated string from OrderNotesModal presets/custom notes |

### Payment Fields
| Field | Type | Example (unpaid) | Example (paid) | Source in Code | Comments |
|-------|------|-----------------|----------------|---------------|----------|
| `payment_method` | string | `"pending"` | `"cash"` / `"card"` / `"upi"` / `"partial"` | From paymentData or `"pending"` | `"pending"` = unpaid. For paid: method selected in CollectPaymentPanel. `"partial"` when split payment |
| `payment_status` | string | `"unpaid"` | `"paid"` | `"unpaid"` or `"paid"` | Determines if order is placed without payment or with payment |
| `payment_type` | string | `"postpaid"` | `"prepaid"` | `"postpaid"` (unpaid) or `"prepaid"` (paid) | `postpaid` = pay later, `prepaid` = pay now |
| `transaction_id` | string | `""` | `"TXN123"` | `paymentData.transactionId \|\| ""` | Transaction reference for card/UPI payments. Empty for cash |

### Financial — Order Totals
| Field | Type | Example | Source in Code | Comments |
|-------|------|---------|---------------|----------|
| `order_sub_total_amount` | number | `586` | `calcOrderTotals(cart).order_sub_total_amount` | Sum of all cart items' full prices (base + addons + variations) × quantity. **Includes addons & variations** |
| `order_sub_total_without_tax` | number | `586` | `calcOrderTotals(cart).order_sub_total_without_tax` | Currently same as `order_sub_total_amount`. **BUG-204: Backend returns 0 for this field** |
| `tax_amount` | number | `29.3` | `calcOrderTotals(cart).tax_amount` | Total tax = `gst_tax` + `vat_tax` |
| `gst_tax` | number | `29.3` | `calcOrderTotals(cart).gst_tax` | Sum of all cart items' `gst_amount`. GST items only |
| `vat_tax` | number | `0` | `calcOrderTotals(cart).vat_tax` | Sum of all cart items' `vat_amount`. VAT items only |
| `order_amount` | number | `616` | `calcOrderTotals(cart).order_amount` | Final payable = subtotal + tax + round_up. **This is what customer pays** |
| `round_up` | string | `"0.70"` | `calcOrderTotals(cart).round_up` | Round-off amount. Applied when `ceil(rawTotal) - rawTotal >= 0.10`. String format |

### Financial — Service & Tips
| Field | Type | Example | Source in Code | Comments |
|-------|------|---------|---------------|----------|
| `service_tax` | number | `0` | Hardcoded `0` | Service tax amount. **NOT IMPLEMENTED** in frontend. Working curl shows `8.0` — may need future implementation |
| `service_gst_tax_amount` | number | `0` | Hardcoded `0` | GST on service tax. **NOT IMPLEMENTED**. Working curl shows `0.4` |
| `tip_amount` | number | `0` | `paymentData.tip \|\| 0` | Tip amount from payment panel. `0` for unpaid orders |
| `tip_tax_amount` | number | `0` | Hardcoded `0` | Tax on tip. Always 0 currently |
| `delivery_charge` | number | `0` | `paymentData.deliveryCharge \|\| 0` | Delivery charge. `0` for dine-in POS |

### Financial — Discounts
| Field | Type | Example | Source in Code | Comments |
|-------|------|---------|---------------|----------|
| `discount_type` | string/null | `null` | `discounts.type \|\| null` | Discount type: `"percent"`, `"amount"`, or `null` |
| `self_discount` | number | `0` | `discounts.manual \|\| 0` | Manual discount by staff |
| `coupon_discount` | number | `0` | `discounts.coupon \|\| 0` | Coupon discount amount |
| `coupon_title` | string/null | `null` | `discounts.couponTitle \|\| null` | Coupon code/title |
| `coupon_type` | string/null | `null` | `discounts.couponType \|\| null` | Coupon type |
| `order_discount` | number | `0` | `discounts.orderDiscountPercent \|\| 0` | Order-level discount percentage |

### Financial — Loyalty & Wallet
| Field | Type | Example | Source in Code | Comments |
|-------|------|---------|---------------|----------|
| `used_loyalty_point` | number | `0` | Hardcoded `0` | Loyalty points redeemed. **NOT IMPLEMENTED** in frontend |
| `use_wallet_balance` | number | `0` | Hardcoded `0` | Wallet balance used. **NOT IMPLEMENTED** in frontend |

### Scheduling
| Field | Type | Example | Source in Code | Comments |
|-------|------|---------|---------------|----------|
| `scheduled` | number | `0` | Hardcoded `0` | `0` = immediate, `1` = scheduled order. **NOT IMPLEMENTED** in frontend |
| `schedule_at` | string/null | `null` | Hardcoded `null` | Schedule datetime. `null` for immediate. **MUST be null, not empty string** — MySQL datetime column rejects `""` |

### Printing & Dispatch
| Field | Type | Example | Source in Code | Comments |
|-------|------|---------|---------------|----------|
| `print_kot` | string | `"Yes"` | `printAllKOT ? 'Yes' : 'No'` | Whether to print Kitchen Order Ticket. Toggleable in cart header |
| `auto_dispatch` | string | `"No"` | Hardcoded `"No"` | Auto-dispatch to delivery. Always `"No"` for POS |

### Room & Address
| Field | Type | Example | Source in Code | Comments |
|-------|------|---------|---------------|----------|
| `paid_room` | string/null | `null` | Hardcoded `null` | Paid room reference. Used for room service billing |
| `room_id` | string/null | `null` | Hardcoded `null` | Room ID for room service orders |
| `address_id` | string/null | `null` | Hardcoded `null` | Delivery address ID. `null` for dine-in |

### Membership & Misc
| Field | Type | Example | Source in Code | Comments |
|-------|------|---------|---------------|----------|
| `discount_member_category_id` | number | `0` | Hardcoded `0` | Member category for discount. **NOT IMPLEMENTED** |
| `discount_member_category_name` | string/null | `null` | Hardcoded `null` | Member category name. **NOT IMPLEMENTED** |
| `usage_id` | string/null | `null` | Hardcoded `null` | Usage tracking ID. **NOT IMPLEMENTED** |

---

## Request Payload — Cart Item Fields

**Key name:** `cart` (array of objects) for Place Order / Place+Pay
**Key name:** `cart-update` (array of objects) for Update Order (different endpoint)

Each item in the `cart` array:

| Field | Type | Example | Source in Code | Comments |
|-------|------|---------|---------------|----------|
| `food_id` | number | `86754` | `item.id` | **REQUIRED.** Food/product ID from menu |
| `quantity` | number | `2` | `item.qty \|\| 1` | **REQUIRED.** Number of units |
| `price` | number | `119` | `item.price \|\| 0` | **REQUIRED.** Base unit price (WITHOUT addons/variations). Backend uses this as base |
| `variant` | string | `""` | Hardcoded `""` | Legacy field. Always empty string. Variations are sent in `variations` array instead |
| `add_on_ids` | array | `[10728, 10729]` | `addons.map(a => a.id)` | **Flat array** of selected addon IDs. Empty `[]` if no addons. Previously was `add_ons` (wrong key) |
| `add_on_qtys` | array | `[1, 2]` | `addons.map(a => a.quantity)` | **Flat array** of addon quantities. Must match order/length of `add_on_ids`. Empty `[]` if no addons |
| `variations` | array | `[{"label":"Large","optionPrice":"40"}]` | Built from `item.selectedVariants` | Array of selected variation values. Each object: `{label: string, optionPrice: string}`. **NOT the full group structure** — just the selected value. Empty `[]` if no variations |
| `add_ons` | array | `[]` | Hardcoded `[]` | **Always empty.** Selected addons go in `add_on_ids`/`add_on_qtys` instead. This field exists for backend compatibility |
| `station` | string | `"KDS"` | `item.station \|\| "KDS"` | Kitchen station. Default `"KDS"`. Other possible: `"BAR"` |
| `food_amount` | number | `119` | `item.price * item.qty` | Base food cost = `price × quantity`. Does NOT include addons/variations |
| `variation_amount` | number | `40` | Sum of selected variation `optionPrice` values | Total variation price for the item (not multiplied by quantity) |
| `addon_amount` | number | `35` | Sum of `(addon.price × addon.qty)` for selected addons | Total addon price for the item (not multiplied by quantity) |
| `gst_amount` | string | `"8.95"` | Calculated per-item | GST tax on full unit price `(price + addon + variation) × qty × gst%`. String format with 2 decimals. Only for items with `tax_type: "GST"` |
| `vat_amount` | string | `"0.00"` | Calculated per-item | VAT tax on full unit price. String format. Only for items with `tax_type: "VAT"` |
| `discount_amount` | string | `"0.00"` | Hardcoded `"0.00"` | Per-item discount. **NOT IMPLEMENTED** — always "0.00" |
| `complementary_price` | number | `0` | Hardcoded `0` | Complementary (free) item price. **NOT IMPLEMENTED** |
| `is_complementary` | string | `"No"` | Hardcoded `"No"` | Whether item is complementary. **NOT IMPLEMENTED** |
| `food_level_notes` | string | `"item, No Garlic"` | `Array.isArray(item.itemNotes) ? item.itemNotes.map(n => n.label).join(', ') : (item.notes \|\| '')` | Per-item notes. Comma-separated string from ItemNotesModal presets or customization modal text |

### Variation Object Format
```json
{
  "name": "FANCY ITEM",              // Variant group name (from variantGroup.name)
  "values": {
    "label": ["CHEESE GOTALO", "PANEER"]  // Array of selected option labels
  }
}
```
**Source:** `item.selectedVariants` (object keyed by group ID) → grouped by group name in `buildCartItem()`
**Structure:** Each variation group becomes one object. Multiple selected options within a group become multiple entries in the `label` array.
**Note:** Previous format `{label, optionPrice}` was INCORRECT. Backend expects the group-level structure above.

---

## Request Payload — Partial Payments (Flow 2 & 3 only)

**Key name:** `partial_payments` (array of objects)
**When sent:** Only when `payment_method` is `"partial"` (split payment) or for any paid flow.

| Field | Type | Example | Source in Code | Comments |
|-------|------|---------|---------------|----------|
| `payment_mode` | string | `"cash"` | From CollectPaymentPanel | Payment method: `"cash"`, `"card"`, `"upi"` |
| `payment_amount` | number | `50` | Amount paid via this method | The amount tendered |
| `grant_amount` | number | `50` | Same as payment_amount usually | Amount granted/applied to order |
| `transaction_id` | string | `""` | Transaction ref for card/UPI | Empty for cash |

**Example — Split payment (cash + UPI):**
```json
"partial_payments": [
  {"payment_mode": "cash", "payment_amount": 50, "grant_amount": 50, "transaction_id": ""},
  {"payment_mode": "card", "payment_amount": 0, "grant_amount": 0, "transaction_id": ""},
  {"payment_mode": "upi", "payment_amount": 50, "grant_amount": 50, "transaction_id": ""}
]
```

**Status:** `partial_payments` is **NOT YET IMPLEMENTED** in the frontend transform functions. Currently only single payment method is sent via `payment_method` field.

---

## API Response

### Success Response
```json
{
  "message": "Order placed successfully",
  "order_id": 730319,
  "restaurant_order_id": "003095",
  "payment_status": "unpaid"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Success message |
| `order_id` | number | Backend-generated order ID — used for all subsequent operations (update, cancel, pay) |
| `restaurant_order_id` | string | Human-readable order number (restaurant-specific sequence) |
| `payment_status` | string | Echoes back the payment status |

### Error Responses
| HTTP Code | Error | Cause |
|-----------|-------|-------|
| 403 | `"Invalid cart data"` | Malformed cart or missing required fields |
| 500 | `"Undefined array key \"label\""` | Variations sent in wrong format (e.g., `{name, price}` instead of `{label, optionPrice}`) |
| 500 | `"Incorrect datetime value: ''"` | `schedule_at` sent as `""` instead of `null` — MySQL rejects empty string for datetime |

---

## Socket Event — After Successful Place Order

### Event Name
`new_order_{restaurant_id}` (e.g., `new_order_475`)

### Event Payload
```
['new-order', order_id, restaurant_id, employee_count, orderObject]
```

### Socket Order Object — Top Level
| Field | Type | Example | Mapped to (fromAPI.order) | Comments |
|-------|------|---------|--------------------------|----------|
| `id` | number | `730319` | `orderId` | Order ID |
| `restaurant_id` | number | `475` | `restaurantId` | Restaurant ID |
| `table_id` | number | `4271` | `tableId` | Table ID |
| `order_type` | string | `"pos"` | `orderType` | Order type |
| `order_status` | string | `"queue"` | `status` → mapped to internal status | `"queue"` = new |
| `payment_status` | string | `"unpaid"` | `paymentStatus` | Payment status |
| `payment_type` | string | `"postpaid"` | `paymentType` | Payment type |
| `order_amount` | number | `616` | `amount` | **Final payable amount (with tax + rounding).** Used for Collect Bill total |
| `order_note` | string | `"Birthday"` | `orderNote` | Order-level notes |
| `tip_amount` | string | `"0.00"` | `tip` | Tip amount (string from backend) |
| `tip_tax_amount` | string | `"0.00"` | (not mapped) | Tip tax |
| `print_kot` | string | `"Yes"` | `printKot` | Print KOT flag |
| `order_dispatch_status` | string | `"No"` | `dispatchStatus` | Dispatch status |
| `delivery_man_status` | string | `"No"` | (not mapped) | Delivery person assignment |
| `delivery_address` | null | `null` | (not mapped) | Delivery address |
| `schedule_at` | null | `null` | `scheduleAt` | Schedule time |
| `f_order_status` | number | `1` | `foodStatus` | Food preparation status |
| `k_order_status` | number | `0` | `kitchenStatus` | Kitchen status |
| `b_order_status` | number | `0` | `barStatus` | Bar status |
| `checked` | number | `0` | (not mapped) | Checked flag |
| `audio_file` | null | `null` | (not mapped) | Audio attachment |
| `employee_id` | number | `1448` | `employeeId` | Employee who placed |
| `waiter_id` | number | `1448` | `waiterId` | Assigned waiter |
| `user_id` | null | `null` | `userId` | Customer ID |
| `user_name` | string | `""` | `userName` | Customer name |
| `created_at` | string | `"2026-04-05 19:01:07"` | `createdAt` | Creation timestamp |
| `updated_at` | string | `"2026-04-05 19:01:07"` | `updatedAt` | Last update timestamp |
| `restaurant_order_id` | string | `"016790"` | `restaurantOrderId` | Display order number |
| `orderDetails` | array | `[{...}]` | → `fromAPI.orderItem()` per item | Array of order items |
| `ready_order_details` | array | `[]` | (not mapped) | Ready items |
| `serve_order_details` | array | `[]` | (not mapped) | Served items |
| `restaurantTable` | object | `{id, table_no, ...}` | Used for table status derivation | Table metadata |
| `room_info` | object | `{}` | (not mapped) | Room info |
| `user` | null | `null` | (not mapped) | Full user object |
| `vendorEmployee` | object | `{id, f_name, l_name}` | `employeeName` | Employee details |

### Socket Order Object — `orderDetails[]` (Per-Item)
| Field | Type | Example | Mapped to (fromAPI.orderItem) | Comments |
|-------|------|---------|-------------------------------|----------|
| `id` | number | `1900596` | `detailId` | Order detail row ID |
| `order_id` | number | `730332` | `orderId` | Parent order ID |
| `food_details` | object | `{id, name, price, ...}` | → `id`, `name`, `price` extracted | Full food catalog object (see below) |
| `food_details.id` | number | `86754` | `id` | Food/product ID |
| `food_details.name` | string | `"Pop Corn"` | `name` | Product name |
| `food_details.price` | number | `119` | `price` (if `detail.price` missing) | Base price from catalog |
| `food_details.tax` | number | `5` | `tax.percentage` | Tax percentage |
| `food_details.tax_type` | string | `"GST"` | `tax.type` | Tax type |
| `food_details.tax_calc` | string | `"Exclusive"` | `tax.calculation`, `tax.isInclusive` | Tax calculation method |
| `food_details.variations` | array | `[{name:"Size", values:[...]}]` | (not mapped) | **CATALOG** — all available variations, NOT selected. Do not use for display |
| `food_details.add_ons` | array | `[{id, name, price, ...}]` | (not mapped) | **CATALOG** — all available addons, NOT selected. Do not use for display |
| `variation` | array | `[]` | `variation` | **BUG-208: ALWAYS EMPTY.** Should contain selected variations. Backend doesn't persist |
| `add_ons` | array | `[]` | `addOns` | **BUG-208: ALWAYS EMPTY.** Should contain selected addons. Backend doesn't persist |
| `unit_price` | string | `"119.00"` | `unitPrice`, `price` | **Per-unit base price.** Does NOT include addon/variation costs. String format. **Canonical source for per-unit price** |
| `price` | number | `476` (for qty=4) | (not used directly) | **TOTAL line price** = unit_price × quantity. `fromAPI.orderItem` normalizes `price` to `unit_price` to prevent double-multiplication |
| `quantity` | number | `2` | `qty` | Quantity ordered |
| `food_status` | number | `1` | `foodStatus` → mapped to status string | 1=queue, 2=preparing, 3=ready, 4=served, 5=cancelled |
| `food_level_notes` | string | `"item, No Garlic"` | `notes` | Per-item notes. **Works correctly** |
| `item_type` | string | `"KDS"` | `station` | Kitchen station |
| `station` | string | `"KDS"` | `station` (fallback) | Same as item_type |
| `ready_at` | null | `null` | `readyAt` | Timestamp when marked ready |
| `serve_at` | null | `null` | `serveAt` | Timestamp when served |
| `cancel_at` | null | `null` | `cancelAt` | Timestamp when cancelled |
| `created_at` | string | `"2026-04-05 19:01:07"` | `createdAt` | Creation timestamp |
| `updated_at` | string | `"2026-04-05 19:01:07"` | `updatedAt` | Last update timestamp |

---

## Context Update Chain — After Socket Event

### 1. Socket Handler (`socketHandlers.js` → `handleNewOrder`)
```
Socket event: new_order_{restaurant_id}
  → Extract orderObject from payload
  → Transform: orderFromAPI.order(apiOrder) → transformedOrder
  → OrderContext.addOrder(transformedOrder)
  → TableContext.updateTableStatus(tableId, derivedStatus)
  → TableContext.setTableEngaged(tableId, true)      ← NEW: Engage immediately
  → Background: fetchSingleOrderForSocket(orderId)
    → OrderContext.updateOrder(fullOrder)             ← Enrichment (51 keys)
    → requestAnimationFrame × 2
    → TableContext.setTableEngaged(tableId, false)    ← Release lock after paint
```

### 2. Socket Handler (`socketHandlers.js` → `handleUpdateOrder`)
```
Socket event: update_order_{restaurant_id}
  → fetchSingleOrderForSocket(orderId)
  → OrderContext.updateOrder(fullOrder)
  → TableContext.updateTableStatus(tableId, derivedStatus)
  → requestAnimationFrame × 2
  → TableContext.setTableEngaged(tableId, false)      ← Release lock after paint
```

### 3. OrderContext (`OrderContext.jsx` → `addOrder`)
- Adds transformed order to `orders` state array
- If order already exists (by orderId), replaces it
- Triggers re-render of all consumers

### 4. TableContext (`TableContext.jsx` → `updateTableStatus`)
- Updates table status based on order status
- `order_status: "queue"` → table becomes `"occupied"`
- `payment_status: "paid"` → table becomes `"billReady"`

### 5. OrderEntry Sync (`OrderEntry.jsx` → useEffect)
```
Watches: placedOrderId, orders array
  → Finds order in OrderContext by placedOrderId
  → Replaces ALL cart items with socket data:
      setCartItems(prev => {
        const unplaced = prev.filter(i => !i.placed);
        const placed = orderFromContext.items.map(i => ({ ...i, placed: true }));
        return [...placed, ...unplaced];
      });
  → Updates orderFinancials from socket:
      setOrderFinancials({
        amount: order.amount,              // order_amount (with tax+rounding)
        subtotalAmount: order.subtotalAmount,
        subtotalBeforeTax: order.subtotalBeforeTax,
      });
```

**CRITICAL:** After sync, ALL cart item data comes from socket. No local data is preserved for placed items. This means:
- `item.customizations` → **undefined** (not returned by socket)
- `item.itemNotes` → **undefined** (not returned by socket)
- `item.totalPrice` → **undefined** (not returned by socket)
- `item.selectedAddons` / `item.selectedVariants` → **undefined**
- Only `item.notes` (from `food_level_notes`), `item.price` (base), `item.qty`, `item.addOns` (empty), `item.variation` (empty) survive

---

## Table Engaged Lock Mechanism (Feb 2026)

### Purpose
Prevents users from clicking a table on the Dashboard while its background GET enrichment is still running. Without this, clicking a table before `OrderContext` is fully populated shows stale/incomplete data.

### Architecture
```
TableContext.jsx:
  engagedTables: Set<number>          — React state (triggers re-render)
  engagedTablesRef: Ref<Set<number>>  — Mutable ref (for polling without re-render)

  setTableEngaged(tableId, true/false) — Updates both state + ref
  isTableEngaged(tableId)              — Reads from state (for UI blocking)
  waitForTableEngaged(tableId, ms)     — Polls ref every 50ms until engaged or timeout
```

### Flow: Place New Order
```
OrderEntry.handlePlaceOrder:
  1. setIsPlacingOrder(true)                         ← UI overlay (disabled)
  2. await api.post(PLACE_ORDER, formData)           ← Await HTTP response
  3. await waitForTableEngaged(tableId, 5000)        ← Poll until socket engages
  4. onClose() → redirect to Dashboard               ← Table shows as engaged (locked)

socketHandlers.handleNewOrder:                        (runs in parallel after step 2)
  1. addOrder(transformedOrder)                       ← 35-key socket data
  2. setTableEngaged(tableId, true)                   ← Engage (triggers waitFor resolve)
  3. fetchSingleOrderForSocket(orderId)               ← Background GET (51 keys)
  4. updateOrder(fullOrder)                           ← Enrichment
  5. requestAnimationFrame × 2                        ← Wait for React paint
  6. setTableEngaged(tableId, false)                  ← Release lock
```

### Flow: Update Existing Order
```
OrderEntry.handlePlaceOrder (update path):
  1. setIsPlacingOrder(true)                         ← UI overlay
  2. await api.put(UPDATE_ORDER, payload)            ← Await HTTP response
  3. await waitForTableEngaged(tableId, 5000)        ← Poll until socket engages

socketHandlers.handleUpdateTable:                     (backend sends update-table engage)
  1. setTableEngaged(tableId, true)                   ← Triggers waitFor resolve

OrderEntry:
  4. onClose() → redirect to Dashboard               ← Table shows as engaged

socketHandlers.handleUpdateOrder:                     (runs after update-table)
  1. fetchSingleOrderForSocket(orderId)               ← Full GET
  2. updateOrder(fullOrder)                           ← Context updated
  3. requestAnimationFrame × 2
  4. setTableEngaged(tableId, false)                  ← Release lock
```

### KEY LEARNING: Socket Behavior Difference
| Action | `update-table engage` sent by backend? | Table engage source |
|--------|---------------------------------------|-------------------|
| **Place New Order** | **NO** | Frontend `handleNewOrder` sets engage locally |
| **Update Order** | **YES** (via `update_table_{restaurantId}` channel) | Socket `handleUpdateTable` |

This asymmetry required implementing the engage inside `handleNewOrder` directly, rather than relying on the socket `update-table` channel.

---

## Known Bugs Affecting This Endpoint

### BUG-204 (P1) — `order_sub_total_without_tax` returns 0
- **Status:** OPEN — Backend Team
- **Impact:** Backend always returns `order_sub_total_without_tax: 0` in socket response
- **Workaround:** Frontend uses `order_sub_total_amount` as fallback

### BUG-207 (P0) — FIXED
- **Status:** FIXED
- **Was:** Place Order payload used wrong field names, wrong content-type, missing per-item financial fields
- **Fix:** Rewrote `buildCartItem()` with correct field names (`add_on_ids`, `variations`, `food_amount`, etc.) and `multipart/form-data`

### BUG-208 (P0 CRITICAL) — Socket returns empty `variation` and `add_ons`
- **Status:** OPEN — Backend Team
- **Impact:**
  1. Addon names & quantities lost after placing
  2. Variation names lost after placing
  3. Per-item price shows base only (e.g., ₹119 instead of ₹194)
  4. Collect Bill panel line item breakdown is incorrect
  5. Only order-level `order_amount` is correct (used as workaround for Collect Bill total)
- **Frontend sends correctly:**
  ```json
  {"add_on_ids": [10728], "add_on_qtys": [1], "addon_amount": 20}
  {"variations": [{"label":"Large","optionPrice":"40"}], "variation_amount": 40}
  ```
- **Socket returns:**
  ```json
  {"add_ons": [], "variation": [], "price": 119}
  ```
- **Workaround:** Collect Bill button/panel total uses `orderFinancials.amount` from socket `order_amount`

---

## Not Yet Implemented (Frontend)

| Feature | Curl Field | Status |
|---------|-----------|--------|
| Audio file attachment | `audiofile` form field | Not implemented — field omitted |
| Partial payments (split pay) | `partial_payments` array | Not implemented — only single payment method sent |
| Scheduled orders | `scheduled: 1`, `schedule_at: datetime` | Not implemented — always `0` / `null` |
| Service tax | `service_tax`, `service_gst_tax_amount` | Not implemented — always `0` |
| Loyalty points | `used_loyalty_point` | Not implemented — always `0` |
| Wallet balance | `use_wallet_balance` | Not implemented — always `0` |
| Member discounts | `discount_member_category_id/name` | Not implemented — always `0` / `null` |
| Complementary items | `complementary_price`, `is_complementary` | Not implemented — always `0` / `"No"` |
| Per-item discounts | `discount_amount` | Not implemented — always `"0.00"` |


---

## Cancel Item Endpoint

**Endpoint:** `PUT /api/v1/vendoremployee/order/cancel-food-item`
**Content-Type:** `application/json`
**Auth:** `Bearer <token>`

### Purpose
Cancels a specific quantity of a single item from an existing order. Full item cancel = pass `cancel_qty` equal to item's total quantity.

### Request Payload
```json
{
  "order_id":      730481,
  "order_food_id": 116608,
  "item_id":       1900850,
  "cancel_qty":    2,
  "order_status":  "cancelled",
  "reason_type":   5,
  "reason":        "Customer changed mind",
  "cancel_type":   "Pre-Serve"
}
```

| Field | Type | Description | Source in Code |
|-------|------|-------------|----------------|
| `order_id` | number | Order ID | `effectiveTable.orderId` |
| `order_food_id` | number | Food catalog ID (product ID) | `item.foodId` (from `food_details.id`) |
| `item_id` | number | Order line item ID (order detail ID) | `item.id` (from `orderDetails[].id`) |
| `cancel_qty` | number | Quantity to cancel (full cancel = item.qty) | User input from CancelFoodModal |
| `order_status` | string | Always `"cancelled"` | Hardcoded |
| `reason_type` | number | Cancellation reason ID | `reason.reasonId` from settings |
| `reason` | string | Cancellation reason text | `reason.reasonText` from settings |
| `cancel_type` | string | `"Pre-Serve"` (still cooking) or `"Post-Serve"` (already served) | Derived from `item.status` |

### Transform
- **Function:** `orderToAPI.cancelItem(currentTable, item, reason, cancelQty)`
- **File:** `/app/frontend/src/api/transforms/orderTransform.js`

### Socket Events After Cancel
1. `update-table` — `free` (if full order cancel) or status unchanged (partial)
2. `update-order-status` — status `3` (cancelled)

### Frontend Flow (Socket-first, no optimistic updates)
```
OrderEntry.handleCancelFood:
  1. await api.put(CANCEL_ITEM, payload)
  2. Socket update-order-status arrives
  3. Handler fetches GET single order
  4. If all items cancelled → removeOrder + table available
  5. If partial → updateOrder with fresh data
```

---

## Cancel Full Order Endpoint

**Endpoint:** `PUT /api/v2/vendoremployee/order-status-update`
**Content-Type:** `application/json`
**Auth:** `Bearer <token>`

### Purpose
Cancels an entire order (all items). Table becomes available.

### Request Payload
```json
{
  "order_id":            730481,
  "role_name":           "Manager",
  "order_status":        "cancelled",
  "cancellation_reason": "Customer left",
  "cancellation_note":   "Customer left"
}
```

| Field | Type | Description | Source in Code |
|-------|------|-------------|----------------|
| `order_id` | number | Order ID | `effectiveTable.orderId` or `placedOrderId` |
| `role_name` | string | User's role name | `user.roleName` (e.g., "Manager") |
| `order_status` | string | Always `"cancelled"` | Hardcoded |
| `cancellation_reason` | string | Reason text | `reason.reasonText` from CancelOrderModal |
| `cancellation_note` | string | Additional note | `reason.reasonNote` or falls back to `reasonText` |

### Transform
- **Function:** `orderToAPI.cancelOrder(orderId, roleName, reason)`
- **File:** `/app/frontend/src/api/transforms/orderTransform.js`

### Socket Events After Cancel (in order)
1. `update-table free` (×2 due to StrictMode in dev) — table channel
2. `update-order-status` with `f_order_status: 3` — order channel

### Frontend Flow (Socket-first, no optimistic updates)
```
OrderEntry.handleCancelOrder / DashboardPage.handleCancelOrderConfirm:
  1. setIsPlacingOrder(true)              ← Show loading overlay
  2. await api.put(ORDER_STATUS_UPDATE)   ← Wait for backend
  3. await waitForOrderRemoval(orderId)   ← Poll ordersRef until socket removes order
  4. toast + redirect                     ← Only after socket confirms

socketHandlers.handleUpdateOrderStatus (status=3):
  1. fetchOrderWithRetry(orderId)         ← GET single order
  2. Check: order.status === 'cancelled' OR all items cancelled
  3. syncTableStatus → available
  4. removeOrder(orderId)                 ← Triggers waitForOrderRemoval resolve
```

### KEY LEARNING: Backend GET API returns cancelled order with non-cancelled items
When a full order is cancelled (status=3), the GET single order API still returns the order with individual `item.status` values that may NOT be `'cancelled'`. The order-level `f_order_status` IS `3` (cancelled), which transforms to `order.status === 'cancelled'`. The fix (BUG-215) checks order-level status in addition to item-level statuses.
