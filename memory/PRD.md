# Restaurant POS Frontend - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/core-pos-front-end-.git and rebuild/run the project as-is. It's a frontend-only project. Do not run test agent.

## Tech Stack
- React.js (Frontend only, no backend)
- Tailwind CSS
- Radix UI (Icons/Dropdowns)
- Custom React Hooks for state management
- Mock data (no real API)

## Architecture
```
/app/frontend/
├── src/
│   ├── components/
│   │   ├── payment/         # BillSummary.jsx, PaymentMethodSelector.jsx
│   │   ├── order-entry/     # CartPanel.jsx, OrderEntry.jsx, ItemCustomizationModal.jsx, 
│   │   │                    # AddQuantityModal.jsx, TransferFoodModal.jsx, MergeTableModal.jsx,
│   │   │                    # TablePickerGrid.jsx, OrderModals.jsx
│   │   └── ...
│   ├── hooks/               # usePaymentCalculation.js, useCartManager.js, useCustomerLookup.js
│   ├── data/                # mockMenu.js, mockDiscounts.js, mockCustomers.js
│   └── constants/           # colors.js
```

## Credentials
- Login: Admin/Admin
- Flow: Dashboard -> Dine In -> Click Running Table -> Order Entry

## Completed Features
- [x] Cloned repo and configured .env for frontend POS
- [x] BillSummary.jsx redesign: Sticky header, discount dropdown (Flat/%), flat Tip, 10% Service Charge, split 2.5% SGST/CGST, compact layout
- [x] PaymentMethodSelector.jsx: Removed Credit, added Wallet, added "Other" dropdown, compact buttons
- [x] Cart Customization Logic: Hide customize for non-customizable items, edit existing customizations, quantity increase prompt for customized items
- [x] TransferFoodModal.jsx UI overhaul: Wider modal (max-w-2xl), rounded-2xl, TablePickerGrid, selection chips, styled footer (2026-03-22)

## Upcoming Tasks (P1)
- [ ] Implement Wallet payment handling flow

## Future/Backlog Tasks (P2)
- [ ] Add Customer Lookup UI for Loyalty/Coupon calculations (deferred by user)
- [ ] Test with alcohol items to verify VAT calculation on frontend cart

## Refactoring Opportunities
- BillSummary.jsx could be broken into DiscountSection, TaxSection sub-components

## Testing
- User explicitly requested: Do NOT use testing agent. Use screenshot tool only.
