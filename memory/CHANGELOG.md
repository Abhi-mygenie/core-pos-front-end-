# Restaurant POS Frontend - CHANGELOG

## 2026-03-22 (Session 3 - Current)

### Features
- **TableOrderContext** — Global shared state for cross-table operations
- **Cancel Item** — Partial qty cancel with +/- stepper, reason dropdown, toast notification
- **Transfer Food** — Partial qty transfer with +/- stepper, moves items to target table via context, toast
- **Shift Table** — Moves all items to available table, updates statuses (source→available, dest→occupied), auto-closes to dashboard, toast
- **Merge Tables** — Multi-select tables, combines items into primary, source tables become available, toast
- **Order Placement Flow** — Place order updates table status to "occupied", shows toast, resets to Walk-In mode with empty cart for next order
- **+ Button Smart Default** — Opens order type based on active dashboard tab (Dine In→Walk-In, Delivery→Delivery, TakeAway→TakeAway)
- **Table Search in Dropdown** — Search bar between Walk-In and Tables section in order type selector
- **Expanded Mock Data** — 31 categories (incl "All"), 200 items (100 customizable), realistic Indian restaurant menu
- **"All" Category** — Shows all 200 items across categories in the menu grid

### UI/UX Improvements
- Transfer food link styled green for visibility
- Cancel modal: qty picker for multi-quantity items
- Transfer modal: qty picker for partial transfers
- Back arrow (`<`) added to left category panel (next to Shift/Merge icons)
- Table selector dropdown z-index fix (no more customer fields bleeding through)
- Shift Table modal only shows available tables
- Transfer Food modal only shows occupied/billReady tables

### Code Cleanup (P0 Refactoring)
- **Removed dead files**: RewardsSection.jsx, ui/toaster.jsx, hooks/use-toast.js
- **Stripped 10 console.log statements** from RoomCard, DineInCard, DeliveryCard, Sidebar, DashboardPage
- **Cleaned barrel exports**: payment/index.js, hooks/index.js
- **Trimmed mockConstants.js**: removed unused `availableTables`, kept `cancellationReasons`

## 2026-03-22 (Session 2)

### Features
- BillSummary redesign: Sticky header, discount dropdown (Flat/%), flat Tip, 10% Service Charge, split 2.5% SGST/CGST, compact layout
- PaymentMethodSelector: Removed Credit, added Wallet, added "Other" dropdown, compact buttons
- Cart Customization Logic: Hide customize for non-customizable items, edit existing customizations, quantity increase prompt for customized items

### UI/UX Improvements
- TransferFoodModal UI overhaul: wider modal (max-w-2xl), rounded-2xl, TablePickerGrid, selection chips, styled footer
- CancelFoodModal UI overhaul: matching modal design, styled header/footer
- MergeTableModal: consistent design with TablePickerGrid

## 2026-03-22 (Session 1)
- Cloned repo and configured .env for frontend POS
- Initial project setup and dependency installation
