# Test Suite Documentation

## MyGenie POS System - Test Cases

This document provides an overview of all test cases for the POS system.

---

## Directory Structure

```
/app/frontend/src/__tests__/
├── hooks/
│   ├── useClickOutside.test.js      (5 test cases)
│   ├── useChannelLogic.test.js      (10 test cases)
│   ├── usePaymentCalculation.test.js (14 test cases)
│   ├── useCartManager.test.js       (13 test cases)
│   ├── useMenuFilter.test.js        (11 test cases)
│   ├── useCouponValidation.test.js  (10 test cases)
│   └── useCustomerLookup.test.js    (10 test cases)
├── components/
│   ├── SearchResultGroup.test.js    (8 test cases)
│   ├── FilterPill.test.js           (7 test cases)
│   ├── MenuItemsGrid.test.js        (12 test cases)
│   ├── PaymentComponents.test.js    (18 test cases)
│   └── HeaderComponents.test.js     (12 test cases)
└── README.md
```

---

## Test Summary by Category

### Custom Hooks Tests (73 test cases)

| Hook | File | Test Cases | Coverage |
|------|------|------------|----------|
| useClickOutside | useClickOutside.test.js | 5 | Click detection, cleanup, disabled state |
| useChannelLogic | useChannelLogic.test.js | 10 | Multi-select, exclusive room, search placeholder |
| usePaymentCalculation | usePaymentCalculation.test.js | 14 | Tax, discounts, totals, change calculation |
| useCartManager | useCartManager.test.js | 13 | Add, update, remove, place order, flash |
| useMenuFilter | useMenuFilter.test.js | 11 | Search, primary/secondary filters, clear |
| useCouponValidation | useCouponValidation.test.js | 10 | Apply, validate, min order, case insensitive |
| useCustomerLookup | useCustomerLookup.test.js | 10 | Phone lookup, found/new status, reset |

### Component Tests (57 test cases)

| Component | File | Test Cases | Coverage |
|-----------|------|------------|----------|
| SearchResultGroup | SearchResultGroup.test.js | 8 | Empty state, rendering, selection |
| FilterPill | FilterPill.test.js | 7 | Label, click, active state, icon |
| MenuItemsGrid | MenuItemsGrid.test.js | 12 | Render items, cart count, flash, customize |
| PaymentComponents | PaymentComponents.test.js | 18 | Customer, bill, payment methods, cash input |
| HeaderComponents | HeaderComponents.test.js | 12 | Channel pills, view toggle |

---

## Running Tests

```bash
# Run all tests
cd /app/frontend && yarn test

# Run specific test file
yarn test useClickOutside

# Run with coverage
yarn test --coverage

# Run in watch mode
yarn test --watch
```

---

## Test Case Naming Convention

Format: `TC-XXX: description`

- TC-001 to TC-099: Hook tests
- TC-100+: Component tests

---

## Key Test Scenarios

### Payment Flow
1. Customer lookup by phone
2. Apply loyalty points
3. Apply wallet balance
4. Apply coupon codes
5. Calculate discounts
6. Calculate final total
7. Process cash payment with change

### Cart Management
1. Add item to cart
2. Increment existing item quantity
3. Add customized item as new entry
4. Update quantity
5. Remove item
6. Place order (mark items as placed)
7. Flash animation on add

### Menu Filtering
1. Filter by category
2. Search by name
3. Filter by primary dietary (veg/nonveg/egg)
4. Filter by secondary (glutenFree/jain/vegan)
5. Combine multiple filters
6. Clear all filters

### Channel Selection
1. Select "All" channels
2. Toggle individual channel
3. Exclusive room selection
4. Multi-select behavior
5. Dynamic search placeholder

---

## Total Test Cases: 130

| Category | Count |
|----------|-------|
| Hook Tests | 73 |
| Component Tests | 57 |
| **Total** | **130** |

---

*Generated: January 2026*
