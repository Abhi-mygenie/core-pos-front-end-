# Change Plan: New API Financial Fields Mapping

**Date:** 2026-04-03  
**Status:** PLANNING (No code changes yet)  
**Related API:** `get-single-order-new`

---

## Executive Summary

Map 6 new financial fields from API to frontend:
- `order_sub_total_without_tax` → `subtotalBeforeTax`
- `order_sub_total_amount` → `subtotalAmount`
- `total_service_tax_amount` → `serviceTax`
- `tip_amount` → `tipAmount`
- `tip_tax_amount` → `tipTaxAmount`
- `item_type` (orderDetails) → `itemType`

---

## Change Locations

### 1. Transform Layer Changes

#### File: `/app/frontend/src/api/transforms/orderTransform.js`

**Location:** `fromAPI.order()` function (lines 108-178)

**Current:**
```javascript
// Financials
amount: parseFloat(api.order_amount) || 0,
paymentStatus: api.payment_status || 'unpaid',
paymentMethod: api.payment_method || '',
```

**Proposed:**
```javascript
// Financials (enhanced with new API fields)
amount: parseFloat(api.order_amount) || 0,
subtotalBeforeTax: parseFloat(api.order_sub_total_without_tax) || parseFloat(api.order_amount) || 0,
subtotalAmount: parseFloat(api.order_sub_total_amount) || parseFloat(api.order_amount) || 0,
serviceTax: parseFloat(api.total_service_tax_amount) || 0,
tipAmount: parseFloat(api.tip_amount) || 0,
tipTaxAmount: parseFloat(api.tip_tax_amount) || 0,
paymentStatus: api.payment_status || 'unpaid',
paymentMethod: api.payment_method || '',
```

**Also update:** `fromAPI.orderItem()` function (lines 64-90)

**Current:**
```javascript
station: detail.station || 'KDS',
```

**Proposed:**
```javascript
station: detail.station || 'KDS',
itemType: detail.item_type || null,
```

---

#### File: `/app/frontend/src/api/transforms/reportTransform.js`

**Location:** `singleOrderNew()` function (lines 436-615)

**Current (line 449, 501-502):**
```javascript
// Calculate subtotal from items
const subtotal = items.reduce((sum, item) => sum + formatAmount(item.price), 0);

// ... later ...
amount: formatAmount(order.order_amount),
subtotal,
```

**Proposed:**
```javascript
// Use API-provided financial values (more accurate than client-side calculation)
const subtotalBeforeTax = formatAmount(order.order_sub_total_without_tax || order.order_amount);
const serviceTax = formatAmount(order.total_service_tax_amount || 0);
const tipAmount = formatAmount(order.tip_amount || 0);
const tipTaxAmount = formatAmount(order.tip_tax_amount || 0);

// Fallback to item calculation only if API field missing
const calculatedSubtotal = items.reduce((sum, item) => sum + formatAmount(item.price), 0);

// ... later ...
amount: formatAmount(order.order_amount),
subtotal: subtotalBeforeTax || calculatedSubtotal,
subtotalBeforeTax,
subtotalAmount: formatAmount(order.order_sub_total_amount || order.order_amount),
serviceTax,
tipAmount,
tipTaxAmount,
```

---

### 2. UI Component Changes

#### File: `/app/frontend/src/components/reports/OrderDetailSheet.jsx`

**Location:** Footer Bill Summary (lines 718-738)

**Current:**
```jsx
<div className="flex justify-between text-sm">
  <span className="text-zinc-500">Subtotal ({displayData.itemCount || 0} items)</span>
  <span className="font-mono text-zinc-700">{formatCurrency(displayData.subtotal)}</span>
</div>
{displayData.amount !== displayData.subtotal && (
  <div className="flex justify-between text-sm">
    <span className="text-zinc-500">Tax (GST)</span>
    <span className="font-mono text-zinc-700">
      {formatCurrency((displayData.amount || 0) - (displayData.subtotal || 0))}
    </span>
  </div>
)}
```

**Proposed:**
```jsx
<div className="flex justify-between text-sm">
  <span className="text-zinc-500">Subtotal ({displayData.itemCount || 0} items)</span>
  <span className="font-mono text-zinc-700">{formatCurrency(displayData.subtotalBeforeTax || displayData.subtotal)}</span>
</div>
{displayData.serviceTax > 0 && (
  <div className="flex justify-between text-sm">
    <span className="text-zinc-500">Tax (GST)</span>
    <span className="font-mono text-zinc-700">{formatCurrency(displayData.serviceTax)}</span>
  </div>
)}
{displayData.tipAmount > 0 && (
  <div className="flex justify-between text-sm">
    <span className="text-zinc-500">Tip</span>
    <span className="font-mono text-zinc-700">{formatCurrency(displayData.tipAmount)}</span>
  </div>
)}
```

---

#### File: `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`

**Current Behavior:**
- Calculates `itemTotal` from cart items (line 82)
- Calculates `sgst/cgst` from item-level tax (lines 28-47)
- Uses client-side calculation for everything

**Consideration:**
- For NEW orders: Keep using cart-based calculation (cart is source of truth)
- For EXISTING orders (viewing/editing): Could use API values as reference

**Proposed Change (minimal):**
- Add display of API-provided totals for verification
- Keep calculation logic as-is (cart is source of truth for payment)

**OR (if validation needed):**
```jsx
// Add at top of component
const apiFinancials = order ? {
  subtotal: order.subtotalBeforeTax,
  tax: order.serviceTax,
  tip: order.tipAmount,
  total: order.amount,
} : null;

// Add validation warning if mismatch
{apiFinancials && Math.abs(apiFinancials.total - finalTotal) > 1 && (
  <div className="text-amber-600 text-xs">
    Note: Calculated total differs from order total
  </div>
)}
```

---

#### File: `/app/frontend/src/components/cards/TableCard.jsx`

**Current (line 66-67):**
```jsx
) : table.amount ? (
  <span className="text-xs font-semibold">{currencySymbol}{table.amount.toLocaleString()}</span>
```

**No change needed** - `amount` is still the display value.

---

#### File: `/app/frontend/src/components/cards/OrderCard.jsx`

**Current (line 134):**
```jsx
₹{(order.amount || 0).toLocaleString()}
```

**No change needed** - `amount` is still the display value.

---

#### File: `/app/frontend/src/components/reports/OrderTable.jsx`

**Current (line 278):**
```jsx
{formatCurrency(order.amount)}
```

**No change needed** - `amount` is still the display value.

---

### 3. Summary of Changes by File

| File | Change Type | Lines Affected | Risk |
|------|-------------|----------------|------|
| `orderTransform.js` | Add fields | ~10 lines | 🟢 LOW |
| `reportTransform.js` | Add fields + use API values | ~15 lines | 🟡 MEDIUM |
| `OrderDetailSheet.jsx` | Update bill summary | ~20 lines | 🟡 MEDIUM |
| `CollectPaymentPanel.jsx` | Optional validation | ~5 lines | 🟢 LOW |
| `TableCard.jsx` | None | 0 | ✅ N/A |
| `OrderCard.jsx` | None | 0 | ✅ N/A |
| `OrderTable.jsx` | None | 0 | ✅ N/A |
| `ExportButtons.jsx` | None | 0 | ✅ N/A |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        API Response                                      │
│  get-single-order-new                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  order_amount: 15                                                       │
│  order_sub_total_without_tax: 15      ←── NEW                          │
│  order_sub_total_amount: 15           ←── NEW                          │
│  total_service_tax_amount: 0.00       ←── NEW                          │
│  tip_amount: 0.00                     ←── NEW                          │
│  tip_tax_amount: 0.00                 ←── NEW                          │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Transform Layer                                      │
│  orderTransform.js / reportTransform.js                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  amount: 15                           (existing)                        │
│  subtotalBeforeTax: 15                ←── NEW MAPPING                  │
│  subtotalAmount: 15                   ←── NEW MAPPING                  │
│  serviceTax: 0                        ←── NEW MAPPING                  │
│  tipAmount: 0                         ←── NEW MAPPING                  │
│  tipTaxAmount: 0                      ←── NEW MAPPING                  │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ OrderDetailSheet │  │ CollectPayment   │  │ Cards/Tables     │
│                  │  │ Panel            │  │ (unchanged)      │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ Shows:           │  │ Uses:            │  │ Uses:            │
│ - subtotal       │  │ - cart items     │  │ - amount only    │
│ - tax (from API) │  │ - client calc    │  │                  │
│ - tip (NEW)      │  │ - (optional      │  │                  │
│ - total          │  │   validation)    │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Test Cases Required

### Transform Tests

| Test | Input | Expected Output |
|------|-------|-----------------|
| Map subtotalBeforeTax | `order_sub_total_without_tax: 100` | `subtotalBeforeTax: 100` |
| Map serviceTax | `total_service_tax_amount: "5.00"` | `serviceTax: 5` |
| Map tipAmount | `tip_amount: "10.00"` | `tipAmount: 10` |
| Fallback when missing | `order_sub_total_without_tax: undefined` | `subtotalBeforeTax: order_amount` |
| Zero values | `tip_amount: "0.00"` | `tipAmount: 0` |

### UI Tests

| Test | Component | Expected |
|------|-----------|----------|
| Show tax row when serviceTax > 0 | OrderDetailSheet | Tax row visible |
| Hide tax row when serviceTax = 0 | OrderDetailSheet | Tax row hidden |
| Show tip row when tipAmount > 0 | OrderDetailSheet | Tip row visible |
| Hide tip row when tipAmount = 0 | OrderDetailSheet | Tip row hidden |
| Total still correct | OrderDetailSheet | `amount` displayed |

---

## Backward Compatibility

| Field | Old Code Uses | New Code Still Works? |
|-------|---------------|----------------------|
| `order.amount` | ✅ Everywhere | ✅ Yes (unchanged) |
| `order.subtotal` | ✅ OrderDetailSheet | ✅ Yes (fallback) |
| `order.paymentStatus` | ✅ Multiple | ✅ Yes (unchanged) |

**All existing code continues to work.** New fields are additive.

---

## Implementation Order

| Step | Task | Effort |
|------|------|--------|
| 1 | Update `orderTransform.js` - add new fields | 10 min |
| 2 | Update `reportTransform.js` - use API values | 15 min |
| 3 | Update `OrderDetailSheet.jsx` - show tip/tax from API | 15 min |
| 4 | Add test cases | 20 min |
| 5 | Manual testing | 15 min |
| **Total** | | **~1.25 hours** |

---

## Questions Before Implementation

1. **Should tip be shown in OrderDetailSheet?**
   - Currently not displayed anywhere
   - New field `tip_amount` available

2. **Should CollectPaymentPanel validate against API totals?**
   - Currently uses client-side calculation only
   - Could add warning if mismatch

3. **Are there other endpoints returning these fields?**
   - `get-running-orders`?
   - `get-complete-order-list`?

---

## Approval

| Role | Name | Date | Approved |
|------|------|------|----------|
| Developer | | | ☐ |
| Reviewer | | | ☐ |
| Product | | | ☐ |
