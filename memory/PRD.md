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
│   ├── cards/           # DineInCard, DeliveryCard, TableCard, RoomCard
│   ├── common/          # FilterPill, SearchResultGroup, SearchResultItem
│   ├── layout/          # Sidebar, Header
│   ├── order-entry/     # OrderEntry, CartPanel, CartHeader, CategoryPanel,
│   │                    # MenuItemsGrid, MenuFiltersBar, CollectPaymentPanel,
│   │                    # OrderModals, ItemCustomizationModal, AddQuantityModal,
│   │                    # TransferFoodModal, MergeTableModal, ShiftTableModal,
│   │                    # CancelFoodModal, OrderPlacedModal, TablePickerGrid,
│   │                    # OrderNotesModal, ItemNotesModal, CustomerModal, RePrintButton
│   ├── payment/         # BillSummary, PaymentMethodSelector, CashInputSection,
│   │                    # CustomerSection, SplitPaymentSection
│   ├── sections/        # TableSection, RoomSection
│   └── ui/              # Shadcn components (sonner, button, input, etc.)
├── context/             # TableOrderContext.jsx (shared cross-table state)
├── hooks/               # useCartManager, usePaymentCalculation, useMenuFilter,
│                        # useOrderModals, useCustomerLookup, useCouponValidation,
│                        # useChannelLogic, useSearchResults, useClickOutside
├── data/                # mockMenu (31 categories, 200 items), mockTables,
│                        # mockOrderItems, mockCustomers, mockDiscounts,
│                        # mockConstants, notePresets
├── constants/           # colors.js, config.js, headerConfig.js
└── utils/               # statusHelpers.js
```

## Credentials
- Login: Admin/Admin
- Flow: Dashboard -> Dine In -> Click Running Table -> Order Entry

## User Personas
- **Restaurant Staff**: Takes orders, manages tables, processes payments
- **Manager**: Oversees table operations (shift, merge, cancel)

## Core Requirements
1. POS order entry system with menu browsing, cart, and payment
2. Table management (shift, merge, transfer food, cancel items)
3. Multiple order types: Dine-In (Walk-In), Delivery, Take Away
4. Bill calculation with taxes (SGST/CGST), tips, discounts, service charge
