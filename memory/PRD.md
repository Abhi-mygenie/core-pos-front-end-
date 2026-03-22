# Restaurant POS Frontend - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/core-pos-front-end-.git and rebuild/run the project as-is. It's a frontend-only project. Do not run test agent.

## Tech Stack
- React.js (Frontend only, no backend)
- Tailwind CSS, Radix UI, Lucide React icons
- Custom React Hooks + Context for state management
- Mock data (no real API), Sonner for toast notifications

## Architecture
```
/app/frontend/src/
├── components/
│   ├── payment/         # BillSummary.jsx, PaymentMethodSelector.jsx
│   ├── order-entry/     # CartPanel, OrderEntry, Modals (Transfer, Merge, Shift, Cancel)
│   │                    # TablePickerGrid, AddQuantityModal, ItemCustomizationModal
│   └── layout/, cards/, sections/, ui/ (shadcn)
├── context/             # TableOrderContext.jsx (shared table state)
├── hooks/               # useCartManager, usePaymentCalculation, useMenuFilter, useOrderModals
├── data/                # mockMenu, mockTables, mockOrderItems, mockCustomers, mockDiscounts
└── constants/           # colors.js
```

## Credentials
- Login: Admin/Admin
- Flow: Dashboard → Dine In → Click Running Table → Order Entry

## Completed Features
- [x] Cloned repo and configured .env
- [x] BillSummary redesign: Sticky header, discount dropdown (Flat/%), flat Tip, 10% Service Charge, split 2.5% SGST/CGST, compact layout
- [x] PaymentMethodSelector: Wallet, "Other" dropdown, compact buttons
- [x] Cart Customization Logic: Hide customize for non-customizable, edit mode, quantity increase prompt
- [x] TransferFoodModal UI overhaul: wider modal, TablePickerGrid, selection chips, qty picker
- [x] CancelFoodModal UI overhaul: matching design, qty picker for partial cancel
- [x] ShiftTableModal: only shows available tables
- [x] **TableOrderContext** - Global shared state for cross-table operations (2026-03-22)
- [x] **Cancel Item** - Partial qty cancel, reduces item qty or removes, toast notification (2026-03-22)
- [x] **Transfer Food** - Partial qty transfer, moves items to target table, toast notification (2026-03-22)
- [x] **Shift Table** - Moves all items, updates table statuses (source→available, dest→occupied), closes to dashboard, toast (2026-03-22)
- [x] **Merge Tables** - Combines items from selected tables into primary, source tables become available, toast (2026-03-22)
- [x] Transfer food link styled green for visibility
- [x] Sonner toast notifications for all 4 operations

## Upcoming Tasks (P1)
- [ ] Implement Wallet payment handling flow

## Future/Backlog Tasks (P2)
- [ ] Add Customer Lookup UI for Loyalty/Coupon calculations (deferred by user)
- [ ] Test with alcohol items to verify VAT calculation on frontend cart

## Refactoring Opportunities
- BillSummary.jsx → break into DiscountSection, TaxSection sub-components
- Add data-testid to TablePickerGrid buttons for better automated testing

## Testing
- User explicitly requested: Do NOT use testing agent. Use screenshot tool only.
- Verified: Cancel (partial qty ✅), Transfer (✅), Shift (✅), Merge (code verified, same pattern)
