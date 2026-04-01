# Change Log

> All notable changes to the Core POS Frontend are documented here.
> Format: [Date] [Change ID] [Type] - [Summary]

---

## Change Types
- **FEATURE** - New functionality
- **FIX** - Bug fix
- **REFACTOR** - Code restructure without behavior change
- **STYLE** - UI/UX changes
- **DOCS** - Documentation only
- **CONFIG** - Configuration/environment changes

---

## [2026-03-31] — Phase 5A.1-5A.3: Business Day Logic + Running Orders Enrichment

### CHG-074 | FEATURE | Business Day Utility
**Summary:** Created `utils/businessDay.js` with `getBusinessDayRange()` and `isWithinBusinessDay()` functions. A "business day" is defined by the restaurant's schedule (e.g., open 06:00, close 03:00 next day). The utility calculates the correct time range and returns which calendar dates to fetch from APIs.
**Files Created:** `utils/businessDay.js`

### CHG-075 | FEATURE | Created_at Filtering with Business Day Logic
**Summary:** Backend APIs filter orders by settlement date (`collect_bill`), not creation date (`created_at`). Updated all fetch functions in `reportService.js` to: (1) Fetch data for both calendar dates if business day crosses midnight, (2) Merge and deduplicate results, (3) Filter by `created_at` within business day range. This ensures orders are attributed to the day they were created, not when they were paid.
**Files Changed:** `reportService.js`
**Breaking Change:** All report service functions now accept optional `schedules` parameter.

### CHG-076 | FEATURE | Running Orders Enrichment in Gap Detection
**Summary:** Enhanced the "missing orders" gap detection in Audit Report. Now fetches running orders alongside report data and cross-references gap IDs. Orders found in running orders show as yellow "RUNNING" rows with actual data (customer, time, amount). Orders not found remain red "MISSING". Status breakdown now shows separate "Run" and "Miss" counts.
**Files Changed:** `reportService.js`, `OrderTable.jsx`, `AuditReportPage.jsx`, `FilterBar.jsx`

### CHG-077 | FIX | Pass Schedules to Report Pages
**Summary:** Updated `AuditReportPage.jsx` and `OrderSummaryPage.jsx` to get `schedules` from `RestaurantContext` and pass to all report service calls. Used `useMemo` to prevent unnecessary re-renders from schedule reference changes.
**Files Changed:** `AuditReportPage.jsx`, `OrderSummaryPage.jsx`

---

## [2026-03-31] — Phase 5A: Order Summary Report

### CHG-068 | FEATURE | Reports Routing Restructure
**Summary:** Refactored reports routing to support multiple report types. `/reports` now redirects to `/reports/audit`. Added expandable sidebar submenu under "Order Reports" with links to Audit Report, Order Summary, and placeholder entries for X, Y, Z reports.
**Files Changed:** `App.js`, `Sidebar.jsx`, `pages/index.js`

### CHG-069 | REFACTOR | Rename ReportsPage to AuditReportPage
**Summary:** Renamed `ReportsPage.jsx` to `AuditReportPage.jsx` to clarify it's specifically the "Audit Report (Day Wise)" view. Updated all imports and exports accordingly.
**Files Changed:** `ReportsPage.jsx` → `AuditReportPage.jsx`, `pages/index.js`, `App.js`

### CHG-070 | FEATURE | Order Summary Page — Simple View
**Summary:** Implemented Order Summary page (`/reports/summary`) with 6 top summary cards (Sales, Paid Revenue, Running Orders, On Hold, Pending, Cancelled), 3 middle boxes (Payment Breakdown with progress bars, By Channel, By Platform), and 2 bottom boxes (Aggregators, Deductions). Data computed from existing Audit Report APIs. Running Orders filtered by `createdAt` to match selected date. Running Orders card is clickable and navigates to Dashboard.
**Files Created:** `OrderSummaryPage.jsx`
**Files Changed:** `App.js`, `Sidebar.jsx`, `pages/index.js`

### CHG-071 | FIX | DatePicker Props in OrderSummaryPage
**Summary:** Fixed crash when selecting dates in Order Summary. DatePicker expects `value` and `onChange` props, not `selectedDate` and `onDateChange`.
**Files Changed:** `OrderSummaryPage.jsx`

---

## [2026-03-30] — Phase 4A: Order Reports + UI Cleanup

### CHG-062 | FEATURE | Order Reports Module — Full Implementation
**Summary:** Built complete Order Reports module from scratch. 8 tabs (All Orders, Paid, Cancelled, Credit, On Hold, Merged, Room Transfer, Aggregator) with `reportService.js` (7 API fetchers) and `reportTransform.js` (normalizers per tab). Includes date filtering, payment type filtering, CSV/PDF export, order detail drill-down side sheet.
**Files Created:** `reportService.js`, `reportTransform.js`, `ReportTabs.jsx`, `DatePicker.jsx`, `OrderTable.jsx`, `FilterBar.jsx`, `FilterTags.jsx`, `OrderDetailSheet.jsx`, `ExportButtons.jsx`, `ReportsPage.jsx`

### CHG-063 | FEATURE | All Orders Tab — Gap Detection
**Summary:** "All Orders" tab merges Paid + Cancelled + Credit data, sorts by order ID, and detects sequential gaps. Missing orders are highlighted with red rows showing the missing ID range. Missing count shown in red badge.
**Files Changed:** `OrderTable.jsx`, `ReportsPage.jsx`

### CHG-064 | STYLE | Sidebar — Restrict to 3 Items
**Summary:** Added `VISIBLE_SECTIONS` whitelist (`dashboard`, `reports`, `menu-management`) to Sidebar. Orders, Employees, Expenses, Inventory, Settings are now hidden regardless of permissions.
**Files Changed:** `Sidebar.jsx`

### CHG-065 | STYLE | FilterBar — Compact 2-Row Layout
**Summary:** Redesigned FilterBar from a multi-row layout with wasted space to a 2-row compact toolbar. Row 1: pill-style filter dropdowns (left) + summary stats (right). Row 2: status breakdown pills spread full-width with `flex-1`. Removed dropdown labels (placeholder text is self-explanatory).
**Files Changed:** `FilterBar.jsx`

### CHG-066 | FEATURE | DatePicker — Prev/Next Day Arrows
**Summary:** Added `<` prev and `>` next arrow buttons flanking the date display. Next button disabled when selected date is today (can't go to future). Enables quick day-by-day navigation without opening the calendar.
**Files Changed:** `DatePicker.jsx`

### CHG-067 | STYLE | OrderTable — Compact Loading Indicator
**Summary:** Replaced the 5-row skeleton loader with a small centered spinner + "Loading orders..." text. Much less visual noise during data fetches.
**Files Changed:** `OrderTable.jsx`

---

## [2026-03-30] — Phase 2B: Transfer to Room + Associated Orders

### CHG-054 | FEATURE | Transfer to Room — API Layer
**Summary:** Added `ORDER_SHIFTED_ROOM` endpoint constant and `orderToAPI.transferToRoom()` transform. Produces payload matching `POST /api/v1/vendoremployee/order-shifted-room` spec (order_id, payment_mode, payment_amount, room_id, discounts, taxes).
**Files Changed:** `constants.js`, `orderTransform.js`

### CHG-055 | FEATURE | Capture Associated Orders in Order Transform
**Summary:** `orderTransform.fromAPI.order()` now captures `associated_order_list` from running orders API as `associatedOrders` array. Deduplicates by ID. Each entry mapped to `{ orderId, orderNumber, amount, transferredAt }`. Also added to `orderItemsByTableId` map in `OrderContext`.
**Files Changed:** `orderTransform.js`, `OrderContext.jsx`

### CHG-056 | FEATURE | "Transfer to Room" Payment Method
**Summary:** Added "To Room" button in CollectPaymentPanel payment methods row (orange accent, `ArrowRightLeft` icon). Only visible for tables (`!isRoom`). Inline room picker (2-col grid of occupied rooms) appears when selected. Checkout button shows "Transfer ₹X to RoomName" when a room is chosen.
**Files Changed:** `CollectPaymentPanel.jsx`

### CHG-057 | FEATURE | Transfer to Room — API Wiring
**Summary:** Wired `POST /order-shifted-room` call in OrderEntry's `onPaymentComplete`. Third payment branch: when `isTransferToRoom && roomId`, calls the new endpoint via `orderToAPI.transferToRoom()`. Toast on success/error, closes OrderEntry, frees table.
**Files Changed:** `OrderEntry.jsx`

### CHG-058 | FEATURE | Associated Orders Display in CartPanel
**Summary:** Room CartPanel shows a collapsible "Transferred Orders (N)" section below cart items with order count and total. Each entry shows order #, date, and amount. Read-only. Uses `ArrowLeftRight` icon with orange accent.
**Files Changed:** `CartPanel.jsx`

### CHG-059 | FEATURE | Room Checkout — Expandable Bill Summary
**Summary:** For rooms with associated orders, the CollectPaymentPanel bill summary replaces the standard items list with two expandable/collapsible sections: (1) Transferred Orders — order list with total, (2) Room Service — expandable to show all items, item total, discount/coupon/loyalty/wallet controls, subtotal, taxes, and Room Service Grand Total. Discount/coupon controls moved inside Room Service expand for rooms.
**Files Changed:** `CollectPaymentPanel.jsx`

### CHG-060 | FIX | Room Checkout — Combined Total
**Summary:** BILL SUMMARY header, Checkout button, and `handlePayment` payment amount now show `finalTotal + associatedTotal` (combined room service + transfers) for rooms with associated orders. Tables unchanged.
**Files Changed:** `CollectPaymentPanel.jsx`

### CHG-061 | FEATURE | Bill/C-Out Card Buttons → Payment Screen Shortcut
**Summary:** "Bill" (tables) and "C/Out" (rooms) buttons on TableCard now navigate directly to Collect Payment / Checkout screen respectively. Previously they called `onUpdateStatus("paid")` which did nothing visible. New `onBillClick` callback opens OrderEntry with `initialShowPayment=true`, skipping the cart view.
**Files Changed:** `TableCard.jsx`, `TableSection.jsx`, `DashboardPage.jsx`, `OrderEntry.jsx`

---


## [2026-03-29] — Phase 2A: Room Integration

### CHG-043 | FEATURE | Rooms in Dashboard Grid
**Summary:** Tables and Rooms now share the same Context arrays and `TableCard` component. Rooms (`rtype === "RM"`) display on the dashboard grid with `isRoom` flag driving conditional behavior.
**Files Changed:** `DashboardPage.jsx`, `tableTransform.js`, `orderTransform.js`, `TableContext.jsx`, `OrderContext.jsx`, `Header.jsx`

### CHG-044 | FEATURE | Room Card Labels + Checkout Button
**Summary:** Room cards show "C/Out" button instead of "Bill". Real customer names displayed on room cards (from order data), waiter names on table cards.
**Files Changed:** `TableCard.jsx`, `DashboardPage.jsx`

### CHG-045 | FIX | Filter "Check In" System Item
**Summary:** Filtered out the system-generated "Check In" item from all order UIs (cart, bill, item lists) to prevent confusion.
**Files Changed:** `orderTransform.js`

### CHG-046 | FEATURE | Real Waiter/Customer Names on Cards
**Summary:** Room cards show customer name from order; table cards show assigned waiter name. Replaced static labels with live data from order context.
**Files Changed:** `DashboardPage.jsx`, `TableCard.jsx`

### CHG-047 | FIX | Card Label Truncation
**Summary:** Long table/room labels now truncate with ellipsis on a single row instead of wrapping and breaking card layout.
**Files Changed:** `TableCard.jsx`

### CHG-048 | FIX | Table Selector Dropdown Truncation
**Summary:** Long table names in the OrderEntry dropdown selector now truncate properly.
**Files Changed:** `OrderEntry.jsx`

### CHG-049 | FEATURE | Room Check-In Modal
**Summary:** Created full-width 3-column overlay for room check-in. Collects guest name, phone (mandatory), email, ID verification, booking details, and payment info. Supports multi-room selection. Calls `POST /api/v1/vendoremployee/pos/user-group-check-in`.
**Files Changed:** `RoomCheckInModal.jsx` (new), `roomService.js` (new), `DashboardPage.jsx`, `constants.js`

### CHG-050 | FEATURE | Loading Page Optimization
**Summary:** Increased Axios timeout to 60s. Added per-API elapsed time display with live ticking. Implemented smart retry that only re-fetches failed APIs instead of restarting everything.
**Files Changed:** `LoadingPage.jsx`, `axios.js`

### CHG-051 | FEATURE | Hide Credit Payment for Rooms
**Summary:** "Credit" payment option hidden when `isRoom=true` in CollectPaymentPanel. Grid layout adjusts accordingly.
**Files Changed:** `CollectPaymentPanel.jsx`

### CHG-052 | FEATURE | Checkout Label for Rooms
**Summary:** Room orders show "Checkout" instead of "Collect Bill" (CartPanel), "Collect Payment" (header), and "Pay" (submit button) in CollectPaymentPanel.
**Files Changed:** `CartPanel.jsx`, `CollectPaymentPanel.jsx`

### CHG-053 | CONFIG | Comment Out 403 Auto-Refresh
**Summary:** Disabled 403 error auto-refresh logic in OrderEntry as prep for Phase 3 WebSocket integration.
**Files Changed:** `OrderEntry.jsx`

---

## [2026-03-24]

### CHG-001 | CONFIG | Initial Setup
**Summary:** Cloned Core POS Frontend from GitHub and configured API endpoint

**Files Changed:**
| File | Action | Description |
|------|--------|-------------|
| `/app/frontend/.env` | Modified | Added `REACT_APP_API_BASE_URL=https://preprod.mygenie.online` |
| `/app/frontend/package.json` | Replaced | Copied from cloned repo |
| `/app/frontend/src/*` | Replaced | Copied entire src from cloned repo |

**Before:** Default Emergent template
**After:** Core POS Frontend running with preprod API

---

### CHG-002 | STYLE | Transfer Food Modal Redesign
**Summary:** Updated Transfer Food Modal to match Shift/Merge Table modal design

**Files Changed:**
| File | Action | Description |
|------|--------|-------------|
| `/app/frontend/src/components/order-entry/TransferFoodModal.jsx` | Modified | Complete rewrite - wider modal, filters, area sections |

**Key Changes:**
- Changed data source from `availableTables` (flat list) to `mockTables` (with areas)
- Added status filter (Occupied, Bill Ready only)
- Added area filter dropdown
- Added grid/list view toggle
- Added collapsible area sections
- Table cards now show: ID, capacity, status dot, order amount
- Kept "Switch Notes" checkbox (unique to food transfer)
- Updated header to "Transfer {item.name} → Select Table"

**Before:** Simple 3x3 grid modal with basic table names
**After:** Unified design matching Shift/Merge modals with filters and area sections

**Related:** Matches `ShiftTableModal.jsx` and `MergeTableModal.jsx` design pattern

---

### CHG-003 | FEATURE | Cancel Food Modal - Quantity Selector
**Summary:** Redesigned Cancel Food Modal with quantity selector for partial cancellation

**Files Changed:**
| File | Action | Description |
|------|--------|-------------|
| `/app/frontend/src/components/order-entry/CancelFoodModal.jsx` | Modified | Added qty selector, wider modal, preview text |

**Code Changes:**
```diff
+ const [cancelQty, setCancelQty] = useState(1);
+ const itemQty = item?.qty || 1;
+ const showQtySelector = itemQty > 1;
```

**Key Changes:**
- Wider modal (`max-w-2xl`) matching other modals
- Quantity selector with +/- buttons when `item.qty > 1`
- Footer preview: "Cancelling: X of Y {item.name}"
- Shows remaining quantity if partial cancel
- Red cancel button (more appropriate for destructive action)
- Button disabled until reason selected

**Output Payload Updated:**
```js
{
  item,
  reason,
  notes,
  cancelQuantity: number,    // NEW
  remainingQuantity: number  // NEW
}
```

**Before:** Cancels entire item, no quantity selection
**After:** User can select how many to cancel when qty > 1

---

### CHG-004 | FIX | Customize Link in Cart Panel
**Summary:** Wired up non-functional Customize button in cart panel

**Files Changed:**
| File | Action | Description |
|------|--------|-------------|
| `/app/frontend/src/components/order-entry/CartPanel.jsx` | Modified | Added `onCustomize` prop, wired onClick handler |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Modified | Pass `onCustomize` callback to CartPanel |

**Code Changes:**
```diff
// CartPanel.jsx - NewItemRow component props
- const NewItemRow = ({ item, cartIndex, setCancelItem, updateQuantity, onAddNote }) => (
+ const NewItemRow = ({ item, cartIndex, setCancelItem, updateQuantity, onAddNote, onCustomize }) => (

// CartPanel.jsx - Customize button (Line ~99)
- <button className="px-2 py-1.5 text-xs hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap" style={{ color: COLORS.primaryGreen }}>Customize</button>
+ <button 
+   onClick={() => onCustomize && onCustomize(item)}
+   className="px-2 py-1.5 text-xs hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap" 
+   style={{ color: COLORS.primaryGreen }}
+   data-testid={`customize-btn-${item.id}`}
+ >
+   Customize
+ </button>

// CartPanel.jsx - Component props
+ onCustomize,

// CartPanel.jsx - NewItemRow usage
+ onCustomize={onCustomize}

// OrderEntry.jsx - CartPanel props (Line ~537)
+ onCustomize={(item) => setCustomizationItem(item)}
```

**Before:** "Customize" link in cart panel was non-functional (no onClick)
**After:** Clicking "Customize" opens ItemCustomizationModal for that item

**Behavior Note:** Currently adds new customized item to cart (Option A). Full edit support (Option B - update existing item) deferred to backlog.

---

### CHG-005 | FIX | Browser Back Button - Loading Loop
**Summary:** Fixed issue where browser back button triggered loading screen again

**Files Changed:**
| File | Action | Description |
|------|--------|-------------|
| `/app/frontend/src/pages/LoginPage.jsx` | Modified | Redirect authenticated users to `/dashboard` instead of `/loading` |
| `/app/frontend/src/pages/LoadingPage.jsx` | Modified | Use `replace: true` in navigation to dashboard |

**Code Changes:**
```diff
// LoginPage.jsx - Line 28-30 (auth check redirect)
- // If already authenticated, redirect to loading
- if (authService.isAuthenticated()) {
-   navigate("/loading");
- }
+ // If already authenticated, redirect to dashboard directly
+ if (authService.isAuthenticated()) {
+   navigate("/dashboard", { replace: true });
+ }

// LoginPage.jsx - Line 52 (after successful login)
- navigate("/loading");
+ navigate("/loading", { replace: true });

// LoadingPage.jsx - Line 78 (after loading complete)
- navigate("/dashboard");
+ navigate("/dashboard", { replace: true });
```

**Before:** 
- Back from Dashboard → Loading page → Full data reload
- Poor UX, unnecessary API calls

**After:**
- Back button effectively disabled (no history entries to go back to)
- Loading page is transient, not in browser history
- Already authenticated users go directly to Dashboard

**Navigation Flow:**
```
Fresh Login:    Login → Loading → Dashboard (Loading replaced)
Back Button:    Dashboard → (nothing, history empty)
Auth Check:     Login → Dashboard (if already logged in)
```

---

## Template for New Entry

```markdown
### CHG-XXX | TYPE | Short Title
**Summary:** One-line description

**Files Changed:**
| File | Action | Description |
|------|--------|-------------|
| `/path/to/file` | Created/Modified/Deleted | What changed |

**Code Changes:** (if applicable)
\`\`\`diff
- old code
+ new code
\`\`\`

**Before:** Previous behavior
**After:** New behavior

**Related Issues:** (if any)
**Testing:** How to verify the change
```
