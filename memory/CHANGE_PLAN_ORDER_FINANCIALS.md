# Change Plan: New API Financial Fields Mapping

**Date:** 2026-04-03  
**Status:** PLANNING (No code changes yet)  
**Related API:** `get-single-order-new`

---

## Phase Breakdown

### Phase 1: Live Order Flow (Socket/Dashboard/Payment)
- Transform: `orderTransform.js`
- Service: `orderService.js`
- Consumers: Dashboard cards, OrderEntry, CollectPaymentPanel

### Phase 2: Report Summary (DEFERRED)
- Transform: `reportTransform.js`
- Service: `reportService.js`
- Consumer: `OrderDetailSheet.jsx`

---

## PHASE 1: Live Order Flow

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     API: get-single-order-new                           │
│                     (Called by socket handlers)                         │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  orderService.js → fetchSingleOrderForSocket()                          │
│  Calls API, returns raw response                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  orderTransform.js → fromAPI.order()                     ← CHANGE HERE │
│  Maps API fields to frontend schema                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  socketHandlers.js                                                      │
│  Receives transformed order, calls OrderContext methods                 │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  OrderContext                                                           │
│  Stores orders in state, provides to consumers                          │
└─────────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Dashboard       │  │  Order Entry     │  │  Payment Panel   │
│  - TableCard     │  │  - CartPanel     │  │  - CollectPayment│
│  - OrderCard     │  │  - MergeModal    │  │    Panel         │
│  - DineInCard    │  │  - TransferModal │  │                  │
│  - DeliveryCard  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

### Phase 1 Changes

#### 1. Transform: `orderTransform.js`

**File:** `/app/frontend/src/api/transforms/orderTransform.js`  
**Function:** `fromAPI.order()` (lines 108-178)

**Add new field mappings:**

| API Field | Frontend Field | Type |
|-----------|----------------|------|
| `order_sub_total_without_tax` | `subtotalBeforeTax` | number |
| `order_sub_total_amount` | `subtotalAmount` | number |
| `total_service_tax_amount` | `serviceTax` | number |
| `tip_amount` | `tipAmount` | number |
| `tip_tax_amount` | `tipTaxAmount` | number |

**Current code (lines 130-133):**
```javascript
// Financials
amount: parseFloat(api.order_amount) || 0,
paymentStatus: api.payment_status || 'unpaid',
paymentMethod: api.payment_method || '',
```

**Proposed code:**
```javascript
// Financials
amount: parseFloat(api.order_amount) || 0,
subtotalBeforeTax: parseFloat(api.order_sub_total_without_tax) || parseFloat(api.order_amount) || 0,
subtotalAmount: parseFloat(api.order_sub_total_amount) || parseFloat(api.order_amount) || 0,
serviceTax: parseFloat(api.total_service_tax_amount) || 0,
tipAmount: parseFloat(api.tip_amount) || 0,
tipTaxAmount: parseFloat(api.tip_tax_amount) || 0,
paymentStatus: api.payment_status || 'unpaid',
paymentMethod: api.payment_method || '',
```

---

#### 2. Update: `fromAPI.orderItem()` (optional)

**File:** `/app/frontend/src/api/transforms/orderTransform.js`  
**Function:** `fromAPI.orderItem()` (lines 64-90)

**Add item_type mapping:**

| API Field | Frontend Field |
|-----------|----------------|
| `item_type` | `itemType` |

**Add after line 81:**
```javascript
station: detail.station || 'KDS',
itemType: detail.item_type || null,  // NEW: BAR, KDS, etc.
```

---

### Phase 1 UI Consumers (Current Usage)

| Component | File | Uses | Change Needed? |
|-----------|------|------|----------------|
| **TableCard** | `cards/TableCard.jsx` | `table.amount` | ❌ No |
| **OrderCard** | `cards/OrderCard.jsx` | `order.amount` | ❌ No |
| **DineInCard** | `cards/DineInCard.jsx` | `table.amount` | ❌ No |
| **DeliveryCard** | `cards/DeliveryCard.jsx` | `order.amount` | ❌ No |
| **CartPanel** | `order-entry/CartPanel.jsx` | `order.amount` | ❌ No |
| **MergeTableModal** | `order-entry/MergeTableModal.jsx` | `order.amount` | ❌ No |
| **TransferFoodModal** | `order-entry/TransferFoodModal.jsx` | `order.amount` | ❌ No |
| **CollectPaymentPanel** | `order-entry/CollectPaymentPanel.jsx` | `order.amount`, calculates own tax | 🟡 Optional |
| **DashboardPage** | `pages/DashboardPage.jsx` | `order.amount` | ❌ No |

**Summary:** UI components currently only use `amount`. New fields are available for future use but no UI changes required in Phase 1.

---

### Phase 1 Optional Enhancement: CollectPaymentPanel

**File:** `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`

**Current behavior:**
- Calculates `itemTotal` from cart items (client-side)
- Calculates `sgst/cgst` from item-level tax (client-side)
- Shows payment breakdown based on calculations

**Optional enhancement:**
- Could display API-provided totals for verification
- Could show warning if client calculation differs from API

**Decision:** Leave for Phase 2 or as separate enhancement.

---

### Phase 1 Test Cases

#### Transform Tests (`orderTransform.test.js`)

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| 1 | Map subtotalBeforeTax | `order_sub_total_without_tax: 100` | `subtotalBeforeTax: 100` |
| 2 | Map serviceTax | `total_service_tax_amount: "5.00"` | `serviceTax: 5` |
| 3 | Map tipAmount | `tip_amount: "10.00"` | `tipAmount: 10` |
| 4 | Map tipTaxAmount | `tip_tax_amount: "1.00"` | `tipTaxAmount: 1` |
| 5 | Fallback subtotal to amount | `order_sub_total_without_tax: undefined` | `subtotalBeforeTax: order_amount` |
| 6 | Zero tax handling | `total_service_tax_amount: "0.00"` | `serviceTax: 0` |
| 7 | Missing tip | `tip_amount: undefined` | `tipAmount: 0` |
| 8 | Map itemType | `item_type: "BAR"` | `itemType: "BAR"` |

#### Integration Tests

| # | Test Case | Validation |
|---|-----------|------------|
| 1 | Socket update-order event | Order in context has new fields |
| 2 | Dashboard displays order | Amount shows correctly |
| 3 | Table card shows amount | Backward compatible |

---

### Phase 1 Summary

| Item | Details |
|------|---------|
| **Files to change** | 1 (`orderTransform.js`) |
| **Lines to add** | ~6 lines |
| **UI changes** | None (fields available for future) |
| **Risk** | 🟢 LOW (additive only) |
| **Effort** | ~30 minutes |
| **Tests** | 8 unit tests |

---

## PHASE 2: Report Summary (DEFERRED)

### Scope
- `reportTransform.js` → `singleOrderNew()`
- `reportService.js` → `getSingleOrderNew()`
- `OrderDetailSheet.jsx` → Bill summary display

### Current State
- Already calculates subtotal from items
- Shows tax as `amount - subtotal`
- Does NOT show tip

### Future Changes
- Use API-provided `total_service_tax_amount` instead of calculation
- Add tip display if `tip_amount > 0`
- Use `order_sub_total_without_tax` for accuracy

### Deferred Because
- Report summary works currently
- Focus on live order flow first
- Can be done as separate enhancement

---

## Implementation Checklist

### Phase 1
- [ ] Update `orderTransform.js` - add 6 new fields
- [ ] Add test cases for new fields
- [ ] Run existing tests to ensure no regression
- [ ] Manual test: socket order update
- [ ] Manual test: dashboard displays correctly
- [ ] Update BUG_MANAGEMENT.md
- [ ] Update REFACTORING_PLAN.md

### Phase 2 (Later)
- [ ] Update `reportTransform.js`
- [ ] Update `OrderDetailSheet.jsx`
- [ ] Add tests
- [ ] Manual test report view

---

## Approval

| Role | Name | Date | Phase 1 | Phase 2 |
|------|------|------|---------|---------|
| Developer | | | ☐ | ☐ |
| Reviewer | | | ☐ | ☐ |
| Product | | | ☐ | ☐ |
