# API Document v2 — POS Frontend API Reference

**Version:** 3.6 (Socket-First Architecture Updates)
**Last Updated:** April 10, 2026

## Endpoint Summary

| # | Action | Endpoint | Method | Content-Type |
|---|--------|----------|--------|-------------|
| 1 | Place New Order | `/api/v2/vendoremployee/order/place-order` | POST | `multipart/form-data` |
| 2 | Place + Pay (prepaid) | `/api/v2/vendoremployee/order/place-order` | POST | `multipart/form-data` |
| 3 | Update Order (add items) | `/api/v2/vendoremployee/order/update-place-order` | PUT | `application/json` |
| 4 | Collect Bill (existing order) | `/api/v2/vendoremployee/order-bill-payment` | POST | `application/json` |
| 5 | Cancel Item (full/partial) | `/api/v1/vendoremployee/order/cancel-food-item` | PUT | `application/json` |
| 6 | Cancel Full Order | `/api/v2/vendoremployee/order-status-update` | PUT | `application/json` |
| 7 | Get Single Order | `/api/v2/vendoremployee/get-single-order-new` | POST | `application/json` |
| 8 | Food Status Update | `/api/v2/vendoremployee/food-status-update` | PUT | `application/json` |
| **9** | **Order Status Update (Ready/Served)** | `/api/v2/vendoremployee/order-status-update` | PUT | `application/json` |
| **10** | **Profile + Permissions + Restaurant Config** | `/api/v2/vendoremployee/vendor-profile/profile` | GET | — |
| **11** | **Split Bill** | `/api/v1/vendoremployee/pos/split-order` | POST | `application/json` |
| **12** | **Payment Methods Mapping** | — | — | See Section 12 |
| **13** | **Print KOT/Bill** | `/api/v1/vendoremployee/order-temp-store` | POST | `application/json` |

---

## April 10, 2026 Updates

### Endpoint Version Changes

| Action | Old (v1) | New (v2) |
|--------|----------|----------|
| Place New Order | `/api/v1/.../place-order` | `/api/v2/.../place-order` |
| Update Order | `/api/v1/.../update-place-order` | `/api/v2/.../update-place-order` |

### Socket Payload Changes

**v2 endpoints now include complete order data in socket events:**

| Event | v1 Behavior | v2 Behavior |
|-------|-------------|-------------|
| `new-order` | Partial data, GET API required | ✅ Complete payload, no GET API |
| `update-order` | No payload, GET API required | ✅ Complete payload, no GET API |

### New Socket Channel: `order-engage_{restaurantId}`

**Purpose:** Order-level locking for update operations

**Message Format:**
```javascript
[orderId, restaurantOrderId, restaurantId, status]
// Example: [730762, '008639', 644, 'engage']
```

| Field | Index | Type | Description |
|-------|-------|------|-------------|
| orderId | 0 | number | Order ID |
| restaurantOrderId | 1 | string | Restaurant's order number |
| restaurantId | 2 | number | Restaurant ID |
| status | 3 | string | `'engage'` or `'free'` |

**Note:** Unlike other channels, `order-engage` does NOT have an event name at index 0.

---

## 13. Print KOT/Bill API (NEW - April 10, 2026)

**Endpoint:** `POST /api/v1/vendoremployee/order-temp-store`

**Purpose:** Send print request (KOT or Bill) to the printer agent via backend socket

**Content-Type:** `application/json`

### Payload

```json
{
  "order_id": 730650,
  "print_type": "kot"
}
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `order_id` | number | Order ID | The order to print |
| `print_type` | string | `"kot"` \| `"bill"` | Type of print job |

### Response

```json
{
  "message": "Print job sent successfully"
}
```

### Frontend Usage

| Location | Button | print_type |
|----------|--------|------------|
| TableCard / OrderCard | 🖨️ Printer icon | `"kot"` |
| TableCard / OrderCard | Bill (green button) | `"bill"` |
| OrderEntry Cart Panel | Re-Print | `"kot"` |

### Notes
- This API sends the print request to backend
- Backend emits socket event to printer agent
- Actual print confirmation is not returned (Phase 2 feature)
- Frontend shows toast: "KOT request sent" / "Bill request sent"

---

## 11. Split Bill API (NEW - April 9, 2026)

**Endpoint:** `POST /api/v1/vendoremployee/pos/split-order`

**Purpose:** Split an order among multiple people (e.g., friends sharing a meal, one person leaving early)

**Content-Type:** `application/json`

### Use Cases
1. **By Person**: Select specific items for each person
2. **Equal Split**: Divide items evenly among N people
3. **Quantity Split**: Split item quantity (e.g., 1 of 3 pizzas to Person A)

### Payload - Move Whole Items

```json
{
  "order_id": 12345,
  "split_count": 2,
  "splits": [
    [469922],
    [469923]
  ]
}
```

### Payload - Split with Quantity

```json
{
  "order_id": 12345,
  "split_count": 2,
  "splits": [
    [{ "id": 469922, "qty": 1 }],
    [{ "id": 469923, "qty": 2 }]
  ]
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order_id` | number | ✅ | Original order ID |
| `split_count` | number | ✅ | Number of splits |
| `splits` | array | ✅ | Array of arrays, each containing items for that split |

### Expected Response
- Creates new order(s) for split portions
- Original order retains unassigned items
- Returns new order IDs for payment collection

### Frontend Implementation
- **Entry Point**: Scissors icon in OrderEntry header
- **Modal**: `SplitBillModal.jsx` with two modes (By Person / Equal Split)
- **Service**: `orderService.splitOrder(orderId, splitCount, splits)`

---

## 9. Order Status Update Endpoint (NEW - April 7, 2026)

**Endpoint:** `PUT /api/v2/vendoremployee/order-status-update`

**Purpose:** Update entire order status (ready/served/cancelled)

**Content-Type:** `application/json`

### Payload for Ready

```json
{
  "order_id": "730522",
  "role_name": "Manager",
  "order_status": "ready"
}
```

### Payload for Served

```json
{
  "order_id": "730522",
  "role_name": "Manager",
  "order_status": "serve"
}
```

### Payload for Cancelled (already documented in #6)

```json
{
  "order_id": "730522",
  "role_name": "Manager",
  "order_status": "cancelled",
  "cancellation_reason": "Customer requested cancellation",
  "cancellation_note": "Customer asked to cancel the whole order"
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order_id` | string | ✅ | Order ID |
| `role_name` | string | ✅ | User's role (e.g., "Manager", "Owner", "Waiter") |
| `order_status` | string | ✅ | New status: `"ready"`, `"serve"`, `"cancelled"` |
| `cancellation_reason` | string | Only for cancelled | Reason for cancellation |
| `cancellation_note` | string | Only for cancelled | Additional notes |

### Status Mapping

| API `order_status` | DB `f_order_status` | UI Display |
|--------------------|---------------------|------------|
| `"ready"` | 2 | Ready |
| `"serve"` | 5 | Served |
| `"cancelled"` | 3 | Cancelled |

### Frontend Implementation

**Files:**
- `orderTransform.js` → `toAPI.updateOrderStatus(orderId, roleName, status)`
- `orderService.js` → `updateOrderStatus(orderId, roleName, status)`
- `DashboardPage.jsx` → `handleMarkReady()`, `handleMarkServed()`
- `TableCard.jsx` → Ready/Serve/Bill buttons

**Button Flow:**
```
Preparing (1)  ──[Ready]──►  Ready (2)  ──[Serve]──►  Served (5)  ──[Bill]──►  Paid (6)
```

---

## 1. Place Order Endpoint

**Endpoint:** `POST /api/v1/vendoremployee/order/place-order`

---

## Overview

This single endpoint handles **2 flows**:

| Flow | Trigger | Key Differentiator |
|------|---------|-------------------|
| **Place New Order** (unpaid) | User clicks "Place Order" on new items | `payment_status: "unpaid"`, `payment_type: "postpaid"` |
| **Place + Pay** (fresh order) | User clicks "Pay" on new items without placing first | `payment_status: "paid"`, `payment_type: "prepaid"`, includes `partial_payments` |

> **Note:** Collect Bill (existing order) now uses a separate dedicated endpoint: `POST /api/v2/vendoremployee/order-bill-payment`. See dedicated section below.

### RESOLVED: Collect Bill Flow (BUG-214)

**Status:** FIXED — Uses dedicated V2 endpoint

The original `POST /api/v1/vendoremployee/order/place-order` could NOT handle postpaid collect bill (returned "Table is already occupied"). The correct endpoint is:

**`POST /api/v2/vendoremployee/order-bill-payment`** (JSON, `application/json`)

See dedicated "Collect Bill V2 Endpoint" section below for full payload documentation.

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
| `variation` | array | `[{name:"Size", values:[{label:"Large", optionPrice:"40"}]}]` | `variation` | Selected variations. Backend now returns correctly (BUG-208 FIXED) |
| `add_ons` | array | `[{id:10730, name:"lemon pepper", price:15, quantity:1}]` | `addOns` | Selected addons. Backend now returns correctly (BUG-208 FIXED) |
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

## Collect Bill V2 Endpoint (Existing Order Payment)

**Endpoint:** `POST /api/v2/vendoremployee/order-bill-payment`
**Content-Type:** `application/json`
**Auth:** `Bearer <token>`

### Purpose
Collects payment on an existing placed order (postpaid → paid). Marks the order as paid, frees the table.

### Request Payload
```json
{
  "order_id": "730522",
  "payment_mode": "cash",
  "payment_amount": 190,
  "payment_status": "paid",
  "transaction_id": "",
  "order_sub_total_amount": 190,
  "order_sub_total_without_tax": 190,
  "total_gst_tax_amount": 0,
  "gst_tax": 0,
  "vat_tax": 0,
  "round_up": 0,
  "service_tax": 0,
  "service_gst_tax_amount": 0,
  "tip_amount": 0,
  "tip_tax_amount": 0,
  "restaurant_discount_amount": 0,
  "order_discount": 0,
  "comunity_discount": 0,
  "discount_value": 0
}
```

### Field Reference
| Field | Type | Description | Source in Code |
|-------|------|-------------|----------------|
| `order_id` | string | Existing order ID | `String(placedOrderId)` |
| `payment_mode` | string | `"cash"`, `"card"`, `"upi"` | From CollectPaymentPanel selection |
| `payment_amount` | number | Total payment amount | `orderFinancials.amount` or computed total |
| `payment_status` | string | Always `"paid"` | Hardcoded |
| `transaction_id` | string | Transaction ref for card/UPI, empty for cash | `paymentData.transactionId \|\| ""` |
| `order_sub_total_amount` | number | Subtotal with tax | From `orderFinancials` or cart computation |
| `order_sub_total_without_tax` | number | Subtotal before tax | From `orderFinancials` or cart computation |
| `total_gst_tax_amount` | number | Total GST | Computed from cart items |
| `gst_tax` | number | GST amount (same as total_gst_tax_amount) | Computed from cart items |
| `vat_tax` | number | VAT amount | Computed from cart items |
| `round_up` | number | Round-off amount | From cart total rounding |
| `service_tax` | number | Service tax | Hardcoded `0` (not implemented) |
| `service_gst_tax_amount` | number | GST on service tax | Hardcoded `0` (not implemented) |
| `tip_amount` | number | Tip | `paymentData.tip \|\| 0` |
| `tip_tax_amount` | number | Tax on tip | Hardcoded `0` |
| `restaurant_discount_amount` | number | Restaurant discount | Hardcoded `0` (not implemented) |
| `order_discount` | number | Order-level discount | Hardcoded `0` (not implemented) |
| `comunity_discount` | number | Community discount (note: typo in API) | Hardcoded `0` |
| `discount_value` | number | Discount value | Hardcoded `0` |

### Success Response
```json
{"message": "Bill cleared via cash"}
```

### Socket Events After Collect Bill (in order)
1. `update-order-status` with `f_order_status: 6` (paid) — on order channel `new_order_{restaurantId}`
2. `update-table free` — on table channel `update_table_{restaurantId}`

### Frontend Flow
```
CollectPaymentPanel → onPaymentComplete(paymentData):
  1. setTableEngaged(tableId, true)              ← Lock table
  2. await api.post(BILL_PAYMENT, payload)       ← JSON, not FormData
  3. toast("Bill cleared via cash")
  4. onClose() → redirect to Dashboard           ← Table shows engaged spinner

socketHandlers.handleUpdateOrderStatus (status=6):
  1. fetchOrderWithRetry(orderId)                ← GET single order
  2. order.status === 'paid'
  3. syncTableStatus(order, updateTableStatus)    → 'available'
  4. removeOrder(orderId)                         ← Order removed from context
  5. requestAnimationFrame × 2
  6. setTableEngaged(tableId, false)              ← Release table
```

### Transform Function
- **`toAPI.collectBillExisting()`** in `orderTransform.js`
- Builds the flat JSON payload (no FormData wrapping needed)
- Called from `OrderEntry.jsx` → `onPaymentComplete` handler

### Key Differences from Place Order Endpoint
| Aspect | Place Order (`/place-order`) | Collect Bill (`/order-bill-payment`) |
|--------|------|------|
| Content-Type | `multipart/form-data` | `application/json` |
| Cart required | Yes (`cart` array) | No (order already placed) |
| Creates new order | Yes | No (updates existing) |
| `order_id` field | Optional (only for collect bill — broken) | Required |
| Payment fields | `payment_method`, `payment_status`, `payment_type` | `payment_mode`, `payment_amount`, `payment_status` |

---

## Update Order Endpoint

**Endpoint:** `PUT /api/v1/vendoremployee/order/update-place-order`
**Content-Type:** `application/json`
**Auth:** `Bearer <token>`

### Purpose
Adds new items to an existing placed order. Only sends NEW (unplaced) items in `cart-update`. Financial totals are recalculated from ALL items (placed + new).

### Request Payload
```json
{
  "order_id": "730498",
  "order_type": "pos",
  "cust_name": "",
  "order_note": "",
  "payment_method": "pending",
  "payment_status": "unpaid",
  "payment_type": "postpaid",
  "print_kot": "Yes",
  "auto_dispatch": "No",
  "order_sub_total_amount": 348,
  "order_sub_total_without_tax": 348,
  "tax_amount": 17.4,
  "gst_tax": 17.4,
  "vat_tax": 0,
  "order_amount": 366,
  "round_up": "0.60",
  "service_tax": 0,
  "service_gst_tax_amount": 0,
  "tip_amount": 0,
  "tip_tax_amount": 0,
  "delivery_charge": 0,
  "discount_type": null,
  "self_discount": 0,
  "coupon_discount": 0,
  "coupon_title": null,
  "coupon_type": null,
  "order_discount": 0,
  "used_loyalty_point": 0,
  "use_wallet_balance": 0,
  "room_id": null,
  "discount_member_category_id": 0,
  "discount_member_category_name": null,
  "usage_id": null,
  "cart-update": [
    {
      "food_id": 116608,
      "quantity": 1,
      "price": 129,
      "variant": "",
      "add_on_ids": [],
      "add_on_qtys": [],
      "variations": [],
      "add_ons": [],
      "station": "KDS",
      "food_amount": 129,
      "variation_amount": 0,
      "addon_amount": 0,
      "gst_amount": "6.45",
      "vat_amount": "0.00",
      "discount_amount": "0.00",
      "complementary_price": 0,
      "is_complementary": "No",
      "food_level_notes": ""
    }
  ]
}
```

### Field Reference
| Field | Type | Description | Source in Code |
|-------|------|-------------|----------------|
| `order_id` | string | Existing order ID | `String(table.orderId)` |
| `order_type` | string | Always `"pos"` | Hardcoded |
| `cust_name` | string | Customer name | `customer?.name \|\| ''` |
| `order_note` | string | Order-level notes | `orderNotes.map(n => n.label).join(', ')` |
| `payment_method` | string | Always `"pending"` for updates | Hardcoded |
| `payment_status` | string | Always `"unpaid"` | Hardcoded |
| `payment_type` | string | Always `"postpaid"` | Hardcoded |
| `print_kot` | string | `"Yes"` or `"No"` | `printAllKOT ? 'Yes' : 'No'` |
| `auto_dispatch` | string | Always `"No"` | Hardcoded |
| `cart-update` | array | **Only NEW (unplaced) items** | `newItems.map(buildCartItem)` |
| *(financial fields)* | | **COMBINED totals from ALL items (placed + new)** | `calcOrderTotals(allActiveItems)` |

### Key Differences from Place Order
| Aspect | Place Order | Update Order |
|--------|------------|--------------|
| Method | `POST` | `PUT` |
| Content-Type | `multipart/form-data` | `application/json` |
| Cart key | `cart` (all items) | `cart-update` (new items only) |
| Financial totals | From new items only | From ALL items (placed + new) |
| `order_id` | Not sent | Required |
| `restaurant_id` / `table_id` | Required | Not sent |

### Success Response
```json
{
  "message": "Items added to order successfully!",
  "order_id": 730498,
  "total_amount": 366
}
```

### Socket Events After Update Order
1. `update-table engage` — on table channel (locks table)
2. `update-order` — on order channel (order data refreshed)

### Frontend Flow
```
OrderEntry.handlePlaceOrder (update path):
  1. setIsPlacingOrder(true)
  2. await api.put(UPDATE_ORDER, payload)
  3. await waitForTableEngaged(tableId, 5000)
  4. onClose() → redirect to Dashboard

socketHandlers.handleUpdateTable:
  1. setTableEngaged(tableId, true)       ← Triggers waitFor resolve

socketHandlers.handleUpdateOrder:
  1. fetchSingleOrderForSocket(orderId)   ← GET full order
  2. updateOrder(fullOrder)
  3. requestAnimationFrame × 2
  4. setTableEngaged(tableId, false)       ← Release lock
```

### Transform Function
- **`toAPI.updateOrder()`** in `orderTransform.js`
- Called from `OrderEntry.jsx` → `handlePlaceOrder()` (update branch, when `placedOrderId` exists)

---

## Cancel Item Endpoint

**Endpoint:** `PUT /api/v1/vendoremployee/order/cancel-food-item`
**Content-Type:** `application/json`
**Auth:** `Bearer <token>`

### Purpose
Cancels a specific quantity of a single item in an order. Supports both full cancel (all qty) and partial cancel (some qty).

### Request Payload
```json
{
  "order_id": 730498,
  "order_food_id": 86754,
  "item_id": 1900596,
  "cancel_qty": 2,
  "order_status": "cancelled",
  "reason_type": 5,
  "reason": "Customer changed mind",
  "cancel_type": "Pre-Serve"
}
```

### Field Reference
| Field | Type | Description | Source in Code |
|-------|------|-------------|----------------|
| `order_id` | number | Parent order ID | `currentTable.orderId` |
| `order_food_id` | number | Food catalog ID (`food_details.id`) | `item.foodId` |
| `item_id` | number | Order line item ID (`orderDetails[].id`) | `item.id` |
| `cancel_qty` | number | Qty to cancel (full = `item.qty`) | `cancelQuantity` from CancelFoodModal |
| `order_status` | string | Always `"cancelled"` | Hardcoded |
| `reason_type` | number | Cancellation reason ID | `reason.reasonId` from cancellation reasons API |
| `reason` | string | Reason text | `reason.reasonText` |
| `cancel_type` | string | `"Pre-Serve"` or `"Post-Serve"` | Based on `item.status === 'preparing'` |

### Cancel Type Logic
| Item Status | cancel_type | Meaning |
|-------------|------------|---------|
| `preparing` | `"Pre-Serve"` | Item still being cooked |
| `ready`, `served`, other | `"Post-Serve"` | Item already cooked/served |

### Endpoint History (BUG-206)
| Endpoint | cancel_qty respected? | Status |
|----------|----------------------|--------|
| `v2 /partial-cancel-food-item` | NO — "Order item not found" error | Rejected |
| `v2 /cancel-food-item` | NO — ignores cancel_qty, cancels all | Rejected |
| **`v1 /order/cancel-food-item`** | **YES — works correctly** | **In use** |

### Socket Events After Cancel Item
1. `update-table free` — on table channel (BUG-216: should be `engage`, see BUGS.md)
2. `update-order-status` with `f_order_status: 3` — on order channel

### Frontend Flow
```
OrderEntry.handleCancelFood:
  1. setIsPlacingOrder(true)
  2. await api.put(CANCEL_ITEM, payload)
  3. await waitForTableEngaged(tableId, 5000)
  4. onClose() → redirect to Dashboard

socketHandlers.handleUpdateOrderStatus (status=3):
  1. fetchOrderWithRetry(orderId)
  2. If all items cancelled → removeOrder + table available
  3. If partial → updateOrder + table stays occupied
  4. requestAnimationFrame × 2
  5. setTableEngaged(tableId, false)
```

### Transform Function
- **`toAPI.cancelItem()`** in `orderTransform.js`
- Called from `OrderEntry.jsx` → `handleCancelFood()`

### Known Issue
BUG-216: Backend sends `update-table free` (not `engage`) after cancel item. Current workaround treats all `free` as `engage` in `handleUpdateTable`, but this breaks Shift Table flow. Parked as P1.

---

## Get Single Order Endpoint

**Endpoint:** `POST /api/v2/vendoremployee/get-single-order-new`
**Content-Type:** `application/json`
**Auth:** `Bearer <token>`

### Purpose
Fetches the complete order with all 51 fields. Used for background enrichment after socket events (which only carry 35 keys). This is the canonical source of truth for order data.

### Request Payload
```json
{
  "order_id": 730522
}
```

### Field Reference
| Field | Type | Description |
|-------|------|-------------|
| `order_id` | number | Order ID to fetch |

### Success Response
```json
{
  "orders": [
    {
      "id": 730522,
      "restaurant_id": 475,
      "table_id": 6244,
      "order_type": "pos",
      "order_status": "queue",
      "payment_status": "unpaid",
      "payment_type": "postpaid",
      "order_amount": 190,
      "order_sub_total_amount": 190,
      "order_sub_total_without_tax": 190,
      "total_service_tax_amount": 0,
      "f_order_status": 1,
      "orderDetails": [ ... ],
      "restaurantTable": { "id": 6244, "table_no": "5" },
      "vendorEmployee": { "id": 1448, "f_name": "John" },
      ...
    }
  ]
}
```

### Response: 51 keys vs Socket's 35 keys
The GET response includes 16 additional fields not present in socket events (BUG-204):
- `order_sub_total_amount`, `order_sub_total_without_tax`, `total_service_tax_amount`
- `payment_method`, `delivery_charge`, `order_edit_count`, `print_bill_status`
- `payment_id`, `parent_order_id`, `canceled_by`, `cancel_at`
- `send_payment_link`, `tablepart`, `associated_order_list`
- `delivery_man`, `delivery_man_id`

### Frontend Usage
- **Service function:** `fetchSingleOrderForSocket(orderId)` in `api/services/orderService.js`
- Applies `fromAPI.order()` transform → returns canonical order shape
- Called from `socketHandlers.js` after every socket event (new-order, update-order, update-order-status)

### When It's Called
| Socket Event | When GET is called |
|-------------|-------------------|
| `new-order` | Immediately after `addOrder` (background enrichment) |
| `update-order` | As the primary data source (socket has no payload) |
| `update-order-status` | To check full cancel vs partial cancel |

---

## Food Status Update Endpoint

**Endpoint:** `PUT /api/v2/vendoremployee/food-status-update`
**Content-Type:** `application/json`
**Auth:** `Bearer <token>`

### Purpose
Updates the preparation status of a single order item (e.g., queue → preparing, preparing → ready, ready → served). Used by the "Confirm Order" (green tick) action on Dashboard.

### Request Payload
```json
{
  "order_id": 730498,
  "order_food_id": 86754,
  "item_id": 1900596,
  "order_status": "preparing",
  "cancel_type": null
}
```

### Field Reference
| Field | Type | Description | Source in Code |
|-------|------|-------------|----------------|
| `order_id` | number | Parent order ID | `order.orderId` |
| `order_food_id` | number | Food catalog ID (`food_details.id`) | `item.foodId` |
| `item_id` | number | Order line item ID (`orderDetails[].id`) | `item.id` |
| `order_status` | string | New status: `"preparing"`, `"ready"`, `"served"` | From action context |
| `cancel_type` | null | Always `null` (not a cancellation) | Hardcoded |

### Status Transitions
| From | To | Action |
|------|----|--------|
| `queue` (1) | `preparing` (1) | Confirm order (green tick on Dashboard) |
| `preparing` (1) | `ready` (2) | Mark item ready (KDS) |
| `ready` (2) | `served` (5) | Mark item served |

### Frontend Usage
- Called from `DashboardPage.jsx` → `handleConfirmOrder()`
- Iterates over all non-cancelled items in the order and sets each to `"preparing"`
- No transform function — payload built inline

### Socket Events After Status Update
- `update-order-status` with updated `f_order_status` — on order channel
- Socket handler fetches the order via GET single order and updates context

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

### BUG-208 (P0 CRITICAL) — Socket `variation` and `add_ons` — FIXED
- **Status:** FIXED (backend now returns both fields)
- **Resolution:** Backend now returns both `variation` and `add_ons` correctly in socket payload and GET API
- **Frontend:** `fromAPI.orderItem` normalizes `price` to `unit_price`, PlacedItemRow + CollectPaymentPanel parse nested `variation[].values[].optionPrice`

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



---

## 10. Profile API — Permissions & Cancellation Settings (NEW — April 7, 2026)

**Endpoint:** `GET /api/v2/vendoremployee/vendor-profile/profile`
**Auth:** `Bearer <token>`

### Purpose
Returns logged-in employee's identity, role permissions, and full restaurant configuration.

### Response Shape (Key Fields)
```json
{
  "emp_id": 3592,
  "role_name": "Owner",
  "role": ["Manager", "food", "pos", "order", "bill", "order_cancel", "serve", ...],
  "restaurants": [{
    "cancel_order_time": 5,
    "cancel_food_timings": 5,
    "cancle_post_serve": "Yes",
    "allow_cancel_post_server": "Yes",
    ...
  }]
}
```

### Permission Strings (Verified from actual API — April 7, 2026)

| Permission | UI Action | Gated In |
|-----------|-----------|----------|
| `order_cancel` | Cancel entire order | OrderCard, OrderEntry |
| `food` | Cancel individual item | CartPanel → PlacedItemRow |
| `transfer_table` | Shift order to another table | OrderCard, CategoryPanel |
| `merge_table` | Merge two table orders | OrderCard, CategoryPanel |
| `food_transfer` | Transfer item between tables | OrderCard, CartPanel → PlacedItemRow |
| `bill` | Collect payment / settle bill | CartPanel (Collect Bill button) |
| `customer_management` | Customer search/add | OrderEntry (UserPlus button) |
| `discount` | Apply discounts | OrderEntry (computed, not yet gated in UI) |
| `order_edit` | Edit/update existing order | Not yet gated |
| `Ready` (capital R) | Mark items/order ready | Not yet gated |
| `serve` | Mark items/order served | Not yet gated |
| `print_icon` | Print KOT/Bill | Phase 2 |

### Cancellation Settings (Restaurant-Level)

| API Field | Type | Example | Transform Key | Description |
|-----------|------|---------|---------------|-------------|
| `cancel_order_time` | number | `5` | `cancellation.orderCancelWindowMinutes` | Minutes after order creation to allow full cancel (0=unlimited). **Pre-ready only.** |
| `cancel_food_timings` | number | `5` | `cancellation.itemCancelWindowMinutes` | Minutes after item added to allow item cancel (0=unlimited). **Pre-ready only.** |
| `cancle_post_serve` | string | `"Yes"` | `cancellation.allowPostServeCancel` | Allow cancel after food is ready/served. No time check. |
| `allow_cancel_post_server` | string | `"Yes"` | `cancellation.allowPostServeCancel2` | Redundant gate (both must be "Yes"). |

### Cancellation Decision Logic
```
Pre-Ready (item not ready/served):
  Permission check + time window (cancel_order_time / cancel_food_timings)

Post-Ready (item ready or served):
  Permission check + cancle_post_serve flag (no time window)
```

### Transform & Context
- **Transform:** `profileTransform.js` → `fromAPI.restaurant()` → `cancellation` object
- **Context:** `RestaurantContext` → `cancellation` (via `useRestaurant()`)
- **Auth:** `AuthContext` → `permissions` array → `hasPermission(string)` check

### Auto Print Settings (Added April 9, 2026)
Profile API provides auto-print settings, now mapped in `profileTransform.js`:

| API Field | Frontend Field | Description |
|-----------|----------------|-------------|
| `aggregator_auto_kot` | `settings.autoKot` | Auto-print KOT for orders |
| `billing_auto_bill_print` | `settings.autoBill` | Auto-print Bill for orders |

**Usage:** 
- Exposed via `RestaurantContext` → `settings`
- Used in `RePrintButton.jsx` to default checkbox states
- Actual print binding to be implemented later

### Full Field Audit
See `/app/memory/PROFILE_API_FIELD_AUDIT.md` for complete 240-field mapping with MAPPED/MISSING status.

---

## 12. Payment Methods - API Mapping (Added April 9, 2026)

### Overview

This section describes how the frontend maps API payment types to UI elements.

---

### API Data Structure

#### Source: `useRestaurant().paymentTypes`

```javascript
// API Response: restaurantPaymentTypes
[
  { id: 1, name: 'cash', displayName: 'Cash' },
  { id: 3, name: 'upi', displayName: 'UPI' },
  { id: 6, name: 'dineout', displayName: 'Dineout' },
  { id: 7, name: 'zomato_gold', displayName: 'Zomato Gold' },
  { id: 8, name: 'easy_dinner', displayName: 'Easy Dinner' },
  { id: 9, name: 'partial', displayName: 'Partial Payment' },
  { id: 11, name: 'OTHER', displayName: 'OTHERS' }
]
```

---

### API Name → UI Mapping

#### Primary Methods (Row 1 Buttons)

| API `name` | UI Method ID | UI Label | Button |
|------------|--------------|----------|--------|
| `cash` | `cash` | Cash | Row 1, Slot 1 |
| `upi` | `upi` | UPI | Row 1, Slot 2 |
| `card` | `card` | Card | Row 1, Slot 3 (if exists) |

#### Action Methods (Row 2)

| API `name` | UI Method ID | UI Label | Position |
|------------|--------------|----------|----------|
| `partial` | `split` | Split | Row 2, Slot 1 |
| *(first dynamic)* | *(from API)* | *(from displayName)* | Row 2, Slot 2 |
| *(remaining)* | - | - | Dropdown |

#### Dynamic Types (From API, not hardcoded)

| API `name` | Where Shown |
|------------|-------------|
| `dineout` | Row 2, Slot 2 (first dynamic) |
| `zomato_gold` | Dropdown |
| `easy_dinner` | Dropdown |
| `OTHER` | Dropdown |

---

### Payment API Values (Sent to Backend)

When completing payment, the `payment_method` sent to API:

| UI Selection | API `payment_method` Value |
|--------------|---------------------------|
| Cash | `cash` |
| UPI | `upi` |
| Card | `card` |
| Credit/Tab | `TAB` |
| Split | `partial` |
| To Room | `ROOM` |
| Dineout | `dineout` |
| Zomato Gold | `zomato_gold` |
| Easy Dinner | `easy_dinner` |
| OTHERS | `OTHER` |

---

### Filter Logic

#### `getDynamicPaymentTypes(apiPaymentTypes)`

**Purpose:** Extract dynamic payment types that go in Row 2 button + dropdown

**Filters OUT:**
- `cash` (shown in Row 1)
- `upi` (shown in Row 1)
- `card` (shown in Row 1)
- `partial` (mapped to Split button)

**Includes:**
- `dineout`
- `zomato_gold`
- `easy_dinner`
- `OTHER`
- Any other custom types from API

#### `filterLayoutByApiTypes(layoutConfig, apiPaymentTypes, hasRooms)`

**Purpose:** Filter configured layout by what's actually available in API

**Logic:**
1. Row 1 methods: Only show if exists in API paymentTypes
2. Split: Only show if `partial` exists in API
3. To Room: Only show if restaurant has rooms
4. Credit: Only show if `tab` or `credit` exists in API

---

### UI Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  💳 PAYMENT METHOD                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ROW 1: [ Cash ]  [ UPI ]  [ Card* ]                       │
│         └── From API: cash, upi, card ──┘                  │
│                                                             │
│  ROW 2: [ Split ]  [ Dineout ]  [ More ▼ ]                 │
│         └── partial ─┘ └─ 1st dynamic ─┘ └─ rest ─┘        │
│                                           ├─ Zomato Gold    │
│                                           ├─ Easy Dinner    │
│                                           └─ OTHERS         │
│                                                             │
│         [ To Room** ]                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

* Card shown only if in API paymentTypes
** To Room shown only if restaurant has rooms
```

---

### Payment Methods Code References

#### Registry File
`/app/frontend/src/config/paymentMethods.js`

#### Key Functions
- `PAYMENT_METHODS` - Registry of known payment methods
- `getDynamicPaymentTypes()` - Extract dynamic types from API
- `filterLayoutByApiTypes()` - Filter layout by API availability
- `isMethodInApiTypes()` - Check if method exists in API

#### Component
`/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`

#### Context
`/app/frontend/src/contexts/SettingsContext.jsx` - Stores `paymentLayoutConfig`

---

### Payment Debug Logging

Console log in CollectPaymentPanel shows:
```javascript
console.log('[CollectPaymentPanel] Payment Debug:', {
  restaurantPaymentMethods,   // undefined (not used)
  restaurantPaymentTypes,     // Array from API
  paymentLayoutConfig,        // {row1, row2, dropdown}
  hasRooms,                   // boolean
  enabledLayout,              // Filtered layout
  dynamicPaymentTypes,        // Dynamic types array
});
```

---

### Payment Known Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Method not showing | Not in API paymentTypes | Add to API or use dynamic types |
| Wrong API value sent | Mapping mismatch | Check `apiValue` in PAYMENT_METHODS |
| OTHERS was missing | Filtered as "known" | Fixed: Only filter primary methods |
