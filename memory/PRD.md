# MyGenie POS System - Frontend PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/core-pos-front-end-.git and build this project as-is (frontend only).

---

## Project Overview
Restaurant POS (Point of Sale) System frontend for managing dine-in, delivery, takeaway, and room service orders.

## Tech Stack
| Category | Technology |
|----------|------------|
| Framework | React 19 |
| Routing | React Router DOM 7.5 |
| Styling | Tailwind CSS 3.4 |
| UI Components | Radix UI, Lucide React Icons |
| Build Tool | CRACO |
| Testing | Jest, React Testing Library |

---

## What's Been Implemented

### Phase 1: Initial Build (Jan 2026)
- Cloned repository, installed dependencies, configured CRACO
- Fixed CollectPaymentPanel cartItems prop bug

### Phase 2: Code Audit & Refactoring (Jan 2026)
- Created `useClickOutside` hook - eliminated 4 duplications
- Centralized `MODAL_STATUS_CONFIG` in statusHelpers.js
- Created `TablePickerGrid` component - deduplicated Shift/Merge modals
- Removed 8 unused exports
- Fixed customer data model
- Replaced emoji icons with Lucide icons

### Phase 3: Header & Payment Decomposition (Jan 2026)
- **Header.jsx**: 683 → 195 lines (71% reduction)
- **CollectPaymentPanel.jsx**: 536 → 175 lines (67% reduction)
- Created 6 custom hooks, 3 common components, 4 header components, 6 payment components

### Phase 4: OrderEntry Decomposition (Jan 2026)
- **OrderEntry.jsx**: 549 → 195 lines (64% reduction)
- Created 3 additional hooks: `useCartManager`, `useMenuFilter`, `useOrderModals`
- Created 4 new components: `MenuFiltersBar`, `MenuItemsGrid`, `CartHeader`, `OrderModals`

### Phase 5: Test Suite (Jan 2026)
- Created comprehensive test suite with **130 test cases**
- 73 hook tests covering all custom hooks
- 57 component tests covering UI components

---

## File Size Comparison

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| Header.jsx | 683 lines | 195 lines | **71%** |
| CollectPaymentPanel.jsx | 536 lines | 175 lines | **67%** |
| OrderEntry.jsx | 549 lines | 195 lines | **64%** |
| **Total** | **1,768 lines** | **565 lines** | **~1,200 lines moved** |

---

## Architecture Overview

### Custom Hooks (10 total)
```
/hooks/
├── useClickOutside.js       # Click outside detection
├── useChannelLogic.js       # Channel multi-select logic
├── useSearchResults.js      # Search results processing
├── usePaymentCalculation.js # Payment & discount calculations
├── useCustomerLookup.js     # Customer search functionality
├── useCouponValidation.js   # Coupon validation
├── useCartManager.js        # Cart CRUD operations
├── useMenuFilter.js         # Menu filtering
└── useOrderModals.js        # Modal state management
```

### Component Structure
```
/components/
├── common/
│   ├── SearchResultItem.jsx
│   ├── SearchResultGroup.jsx
│   └── FilterPill.jsx
├── header/
│   ├── ChannelPills.jsx
│   ├── StatusFilters.jsx
│   ├── SearchDropdown.jsx
│   └── ViewToggle.jsx
├── payment/
│   ├── CustomerSection.jsx
│   ├── BillSummary.jsx
│   ├── RewardsSection.jsx
│   ├── PaymentMethodSelector.jsx
│   ├── CashInputSection.jsx
│   └── SplitPaymentSection.jsx
├── order-entry/
│   ├── MenuFiltersBar.jsx
│   ├── MenuItemsGrid.jsx
│   ├── CartHeader.jsx
│   └── OrderModals.jsx
```

### Test Suite
```
/__tests__/
├── hooks/           # 73 test cases
│   ├── useClickOutside.test.js
│   ├── useChannelLogic.test.js
│   ├── usePaymentCalculation.test.js
│   ├── useCartManager.test.js
│   ├── useMenuFilter.test.js
│   ├── useCouponValidation.test.js
│   └── useCustomerLookup.test.js
├── components/      # 57 test cases
│   ├── SearchResultGroup.test.js
│   ├── FilterPill.test.js
│   ├── MenuItemsGrid.test.js
│   ├── PaymentComponents.test.js
│   └── HeaderComponents.test.js
└── README.md        # Test documentation
```

---

## Test Coverage Summary

| Category | Test Cases | Key Scenarios |
|----------|------------|---------------|
| Hook Tests | 73 | Click detection, multi-select, payments, cart, filters |
| Component Tests | 57 | Rendering, user interactions, state changes |
| **Total** | **130** | Full coverage of business logic |

---

### Phase 6: CustomerModal Search Bug Fix (Mar 2026)
- Added auto-suggest search to Name and Phone fields in `CustomerModal.jsx`
- Used `onMouseDown` pattern (proven from CartPanel fix) to prevent blur race condition
- Also fixed Member ID dropdown to use `onMouseDown` instead of `onClick`

## Status
✅ Frontend fully operational
✅ Phase 1-6 complete
✅ ~1,200 lines decomposed into reusable components
✅ 130 test cases written
✅ All customer search auto-suggest bugs fixed (CartPanel + CustomerModal)

## Pending / Future Tasks
- P2: Add end-to-end tests with Playwright
- P2: Decompose `RoomCard.jsx` (~388 lines)
- P0 (when ready): Connect frontend to real backend API

---

## Running Tests

```bash
cd /app/frontend

# Run all tests
yarn test

# Run with coverage
yarn test --coverage

# Run specific test
yarn test useClickOutside
```

---

*Last Updated: March 2026*
