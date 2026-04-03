# API Change Analysis: get-single-order-new

**Date:** 2026-04-03  
**Endpoint:** `/api/v2/vendoremployee/get-single-order-new`  
**Impact:** Order transform and financial calculations  

---

## Current vs New API Response Comparison

### Order Level Fields

| Field | Old Transform Uses | New API Has | Type | Status |
|-------|-------------------|-------------|------|--------|
| `id` | ✅ `orderId` | ✅ | number | ✅ OK |
| `restaurant_order_id` | ✅ `orderNumber` | ✅ | string | ✅ OK |
| `order_type` | ✅ `orderType` | ✅ `dinein` | string | ✅ OK |
| `f_order_status` | ✅ `status`, `fOrderStatus` | ✅ `8` | number | ✅ OK |
| `order_status` | ✅ `lifecycle` | ✅ `queue` | string | ✅ OK |
| `table_id` | ✅ `tableId` | ✅ `0` | number | ✅ OK |
| `user_name` | ✅ `customer` | ✅ `""` | string | ✅ OK |
| `created_at` | ✅ `createdAt`, `time` | ✅ | datetime | ✅ OK |
| `updated_at` | ✅ `updatedAt` | ✅ | datetime | ✅ OK |
| `payment_status` | ✅ `paymentStatus` | ✅ `unpaid` | string | ✅ OK |
| `payment_method` | ✅ `paymentMethod` | ✅ `cash_on_delivery` | string | ✅ OK |
| `order_note` | ✅ `orderNote` | ✅ `""` | string | ✅ OK |
| `print_kot` | ✅ `kotPrinted` | ✅ `Yes` | string | ✅ OK |
| `print_bill_status` | ✅ `billPrinted` | ✅ `No` | string | ✅ OK |
| `delivery_address` | ✅ `deliveryAddress` | ✅ | object | ✅ OK |
| `delivery_charge` | ✅ `deliveryCharge` | ✅ `0` | number | ✅ OK |
| `associated_order_list` | ✅ `associatedOrders` | ✅ `null` | array | ✅ OK |

### Financial Fields - POTENTIAL ISSUES

| Field | Old Transform | New API Value | Currently Used? | Issue? |
|-------|---------------|---------------|-----------------|--------|
| `order_amount` | ✅ → `amount` | `15` | ✅ Yes (displayed everywhere) | ✅ OK |
| `order_sub_total_without_tax` | ❌ NOT MAPPED | `15` | ❌ No | ⚠️ NEW - Could use for subtotal |
| `order_sub_total_amount` | ❌ NOT MAPPED | `15` | ❌ No | ⚠️ NEW - Could use |
| `total_service_tax_amount` | ❌ NOT MAPPED | `0.00` | ❌ No | ⚠️ NEW - Tax total |
| `tip_amount` | ❌ NOT MAPPED | `0.00` | ❌ No | ⚠️ NEW - Tip |
| `tip_tax_amount` | ❌ NOT MAPPED | `0.00` | ❌ No | ⚠️ NEW - Tip tax |

### Order Item (orderDetails) Fields

| Field | Old Transform | New API Value | Status |
|-------|---------------|---------------|--------|
| `id` | ✅ `id` | `1900232` | ✅ OK |
| `food_details` | ✅ Used for name, tax | ✅ Present | ✅ OK |
| `quantity` | ✅ `qty` | `1` | ✅ OK |
| `price` | ✅ `price` | `15` | ✅ OK |
| `unit_price` | ✅ `unitPrice` | `15.00` | ✅ OK |
| `food_status` | ✅ `status` | `1` | ✅ OK |
| `station` | ✅ `station` | `BAR` | ✅ OK |
| `variation` | ✅ `variation` | `[]` | ✅ OK |
| `add_ons` | ✅ `addOns` | `[]` | ✅ OK |
| `food_level_notes` | ✅ `notes` | `""` | ✅ OK |
| `ready_at` | ✅ `readyAt` | `null` | ✅ OK |
| `serve_at` | ✅ `serveAt` | `null` | ✅ OK |
| `cancel_at` | ✅ `cancelAt` | `null` | ✅ OK |
| `created_at` | ✅ `createdAt` | ✅ | ✅ OK |
| `item_type` | ❌ NOT MAPPED | `BAR` | ⚠️ NEW |
| `item_update_count` | ❌ NOT MAPPED | `0` | ⚠️ NEW |

### New Fields in Response (Not Currently Mapped)

| Field | Value | Potential Use |
|-------|-------|---------------|
| `order_sub_total_without_tax` | `15` | Display subtotal before tax |
| `order_sub_total_amount` | `15` | Subtotal (may include/exclude tax based on settings) |
| `total_service_tax_amount` | `0.00` | Display total tax |
| `tip_amount` | `0.00` | Display tip on order |
| `tip_tax_amount` | `0.00` | Tax on tip |
| `b_order_status` | `7` | Backend order status |
| `k_order_status` | `7` | Kitchen order status |
| `serve_order_details` | `[]` | Items that have been served |
| `ready_order_details` | `[]` | Items that are ready |
| `room_info` | `{}` | Room details for room orders |
| `waiter_call` | `null` | Waiter call status |
| `order_edit_count` | `0` | Number of times order was edited |
| `item_type` (in orderDetails) | `BAR` | Item type/station |

---

## Issue Analysis: Total Amount Display

### Current Flow
```
API Response:
  order_amount: 15

Transform (orderTransform.js:131):
  amount: parseFloat(api.order_amount) || 0

UI (CollectPaymentPanel, TableCard, OrderCard, etc.):
  order.amount → displays ₹15
```

### Problem Statement
User mentioned "issues with total amount" - let me identify what could be wrong:

1. **If tax calculation is wrong:**
   - Current: `amount` = `order_amount` (single value)
   - New fields available: `order_sub_total_without_tax`, `total_service_tax_amount`
   - UI might be showing wrong total if tax isn't being calculated correctly

2. **If subtotal vs total is confused:**
   - `order_amount` = final total (15)
   - `order_sub_total_without_tax` = before tax (15)
   - `order_sub_total_amount` = subtotal (15)
   - In this example they're same because tax is Exclusive and item is 15

3. **Tip not being included:**
   - `tip_amount` and `tip_tax_amount` are NOT mapped
   - If order has tip, it won't show

---

## Recommended Changes

### Option A: Minimal Change (Just Fix Amount)
Map additional financial fields without breaking existing:

```javascript
// orderTransform.js - fromAPI.order()
return {
  // ... existing fields ...
  
  // Financials (enhanced)
  amount: parseFloat(api.order_amount) || 0,
  subtotal: parseFloat(api.order_sub_total_without_tax) || parseFloat(api.order_amount) || 0,
  subtotalWithTax: parseFloat(api.order_sub_total_amount) || parseFloat(api.order_amount) || 0,
  taxAmount: parseFloat(api.total_service_tax_amount) || 0,
  tipAmount: parseFloat(api.tip_amount) || 0,
  tipTaxAmount: parseFloat(api.tip_tax_amount) || 0,
  
  // ... rest ...
}
```

### Option B: Full Financial Object
```javascript
// Financials (detailed)
financials: {
  total: parseFloat(api.order_amount) || 0,
  subtotalBeforeTax: parseFloat(api.order_sub_total_without_tax) || 0,
  subtotalWithTax: parseFloat(api.order_sub_total_amount) || 0,
  taxAmount: parseFloat(api.total_service_tax_amount) || 0,
  tip: parseFloat(api.tip_amount) || 0,
  tipTax: parseFloat(api.tip_tax_amount) || 0,
  deliveryCharge: parseFloat(api.delivery_charge) || 0,
},
```

---

## Files That Would Need Updates

### If we add new financial fields:

| File | Component | Uses | Change Needed |
|------|-----------|------|---------------|
| `orderTransform.js` | `fromAPI.order()` | Maps API → frontend | Add new fields |
| `CollectPaymentPanel.jsx` | Payment UI | `order.amount` | Could use `subtotal`, `taxAmount` |
| `OrderDetailSheet.jsx` | Order detail modal | `displayData.subtotal`, `displayData.amount` | Already uses subtotal! |
| `TableCard.jsx` | Table display | `table.amount` | No change needed |
| `OrderCard.jsx` | Order card | `order.amount` | No change needed |
| `OrderTable.jsx` | Report table | `order.amount` | No change needed |

### Test Files to Update:
- `orderTransform.test.js` (if exists)
- Any test mocking order data

---

## Risk Assessment

| Change | Risk | Impact |
|--------|------|--------|
| Add `subtotal` field | 🟢 LOW | Additive, no breaking |
| Add `taxAmount` field | 🟢 LOW | Additive, no breaking |
| Add `tipAmount` field | 🟢 LOW | Additive, no breaking |
| Change `amount` calculation | 🔴 HIGH | Could break all displays |
| Add `financials` object | 🟡 MEDIUM | Need to update all usages |

---

## Questions for User

1. **What specific issue are you seeing with total amount?**
   - Wrong value displayed?
   - Tax not calculated?
   - Tip not showing?

2. **Do you want backward compatibility?**
   - Keep `order.amount` as-is and add new fields?
   - Or restructure completely?

3. **Which fields do you need from the new response?**
   - `order_sub_total_without_tax`?
   - `total_service_tax_amount`?
   - `tip_amount`?
   - All of them?

---

## Next Steps

1. Clarify the exact issue with user
2. Decide on Option A (minimal) or Option B (full)
3. Update `orderTransform.js`
4. Update components that need the new fields
5. Add/update test cases
6. Document in BUG_MANAGEMENT.md
