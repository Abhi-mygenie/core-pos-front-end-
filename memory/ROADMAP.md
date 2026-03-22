# Restaurant POS Frontend - ROADMAP

## P1 — Upcoming
- [ ] Implement Wallet payment handling flow
- [ ] Consolidate hardcoded colors (#E5E7EB, #2E7D32, #4CAF50, etc.) to COLORS constants across TableCard, CartPanel, Header, ItemCustomizationModal, RoomCard, DeliveryCard, Sidebar, BillSummary

## P2 — Future
- [ ] Add Customer Lookup UI for Loyalty/Coupon calculations (deferred by user)
- [ ] Test with alcohol items to verify VAT calculation on frontend cart
- [ ] Break down BillSummary.jsx (488 lines) → DiscountSection, TaxBreakdown, TipSection
- [ ] Break down ItemCustomizationModal.jsx (487 lines) → VariantGroupPicker, AddonPicker, SizeSelector
- [ ] Break down CartPanel.jsx (385 lines) → PlacedItemsList, NewItemsList, CartFooter
- [ ] Add data-testid attributes to TablePickerGrid buttons for automated testing
- [ ] Update/remove stale test suite (130 tests in __tests__/ likely outdated)
- [ ] Implement Serve item / Serve All handlers (currently TODO stubs in DineInCard)
- [ ] Implement Delivery card actions (Cancel, Edit, Confirm, Dispatch, Mark Delivered)
- [ ] Implement Room click handler in DashboardPage
- [ ] Implement Sidebar refresh button handler

## Testing Notes
- User explicitly requested: Do NOT use testing agent. Use screenshot tool only.
- Verified via screenshots: Cancel (partial qty), Transfer, Shift, Order placement flow, Table search, + button defaults
