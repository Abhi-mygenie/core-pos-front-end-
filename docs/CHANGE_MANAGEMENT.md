# Change Management Document
# Core POS Frontend — Table View Status Mapping

> This document tracks all planned and completed changes to the table view status mapping logic.
> Every change must be logged here BEFORE implementation begins.

---

## Document Purpose
- **When** was the change made
- **Why** the change was needed (business/product reason)
- **What** behaviour changed (before vs after)
- **Where** in the codebase the change was made (exact file + line)

---

## Template

```
### CHG-XXX | [TYPE] | [Short Title]

**Date:** YYYY-MM-DD
**Author:** [Name/Agent]
**Status:** Proposed / In Progress / Done

**Why (Reason):**
One line explaining the business/product reason.

**What (Scope):**
| Before | After |
|--------|-------|
| Old behaviour | New behaviour |

**Where (Files & Lines):**
| File | Line(s) | What changes |
|------|---------|--------------|
| `/path/to/file.jsx` | Line XX | description of change |

**Risk:** Low / Medium / High
**Tested By:** Screenshot / Testing Agent / Manual
**Rollback:** Revert line X in file Y to previous value
```

---

## Change Types
- **FIX** — Correcting wrong/missing mapping
- **FEATURE** — New behaviour being added
- **REFACTOR** — Code restructure without behaviour change
- **STYLE** — Visual/UI only change
- **CONFIG** — Constants/mapping value change

---

## Changes Log

---

### CHG-006 | CONFIG | Status 6 → Available in Table View

**Date:** 2026-03-26
**Author:** Agent
**Status:** ✅ Done (f_order_status = 6), the table should be freed up and shown as available for new orders. Currently it stays as `paid` state which keeps the table occupied unnecessarily.

**What (Scope):**
| Before | After |
|--------|-------|
| f_order_status = 6 → table status `paid` (table appears occupied with "Clear" button) | f_order_status = 6 → table status `available` (table is free, shows + icon) |

**Where (Files & Lines):**
| File | Line | What changes |
|------|------|--------------|
| `/app/frontend/src/api/constants.js` | Line 96 | `paid: 'paid'` → `paid: null` (null means available/skip) |

**Risk:** Low — isolated to `ORDER_TO_TABLE_STATUS` mapping constant
**Tested By:** Screenshot
**Rollback:** Revert line 96 in `/app/frontend/src/api/constants.js` back to `paid: 'paid'`

---

### CHG-007 | FEATURE | Status 9 → Reserved (Dine-in) / Scheduled Virtual Card (Delivery & TakeAway)

**Date:** 2026-03-26
**Author:** Agent
**Status:** PARKED — Pending impact verification on orders list view

**Why (Reason):**
f_order_status = 9 represents a scheduled/future order. For dine-in it should appear as a reserved table (amber border, Seat button). For delivery and takeaway it should appear as a dynamic virtual card labelled "Scheduled" — similar to how walk-in orders create virtual cards today.

**What (Scope):**
| Before | After |
|--------|-------|
| f_order_status = 9 → unmapped, falls through to `unknown`, table not shown | Dine-in: table shows as `reserved` (amber border, Seat button) |
| | TakeAway/Delivery: virtual card appears with label "Scheduled" |

**Where (Files & Lines):**
| File | Line | What changes |
|------|------|--------------|
| `/app/frontend/src/api/constants.js` | Line 86 (after line 85) | Add `9: 'scheduled'` to `F_ORDER_STATUS` |
| `/app/frontend/src/api/constants.js` | `ORDER_TO_TABLE_STATUS` block | Add `scheduled: 'reserved'` for dine-in path |
| `/app/frontend/src/api/transforms/orderTransform.js` | `mapTableStatus()` | Handle order_type check: dine-in → `reserved`, takeaway/delivery → `scheduled` |
| `/app/frontend/src/pages/DashboardPage.jsx` | Virtual card section (walk-in logic ~line 159) | Add handling for scheduled virtual cards (takeaway/delivery with status 9) |

**Risk:** Medium — touches transform layer and dashboard card generation logic
**Tested By:** Screenshot
**Rollback:** Remove status 9 entries from constants and revert mapTableStatus and DashboardPage changes

---

### CHG-008 | FIX | Button Visibility Rules per f_order_status

**Date:** 2026-03-26
**Author:** Agent
**Status:** ✅ Done

**Why (Reason):**
Each order status has a specific action at table level. Showing both KOT and Bill for all statuses is misleading. KOT is only for preparation; Bill is only after food is served.

**What (Scope):**
| f_order_status | Before | After |
|---|---|---|
| 1 (preparing) | KOT + Bill | KOT only (full width) |
| 2 (ready) | KOT + Bill | Nothing |
| 5 (served) | KOT + Bill | Bill only (full width) |

**Where (Files & Lines):**
| File | What changes |
|------|--------------|
| `/app/frontend/src/components/cards/TableCard.jsx` | `hasOrders` block replaced with conditional rendering per `table.fOrderStatus` |
| `/app/frontend/src/pages/DashboardPage.jsx` | Added `fOrderStatus: order.fOrderStatus` to all 4 table entry objects (adaptTable, walk-in×2, takeaway, delivery) |

**Risk:** Low — visual only, no data or state change
**Tested By:** Screenshot
**Rollback:** Revert `hasOrders` block in `TableCard.jsx` to show both buttons unconditionally

---

### CHG-009 | CONFIG | Sort Priority — activeFirst Toggle Alignment

**Date:** 2026-03-26
**Author:** Agent
**Status:** Proposed

**Why (Reason):**
The `activeFirst` toggle sorts tables by priority. The correct priority order per business rules is: 7 (yetToConfirm) > 2 (ready/occupied) > 5 (served/billReady) > 1 (preparing/occupied). The current `TABLE_STATUS_PRIORITY` map has `paid` at rank 1 and `billReady` at rank 2, which no longer reflects the correct order now that status 6 (paid) frees the table.

**What (Scope):**
| Before | After |
|--------|-------|
| Priority: yetToConfirm(0) > paid(1) > billReady(2) > occupied(3) > reserved(4) > available(5) | Priority: yetToConfirm(0) > billReady(1) > occupied(2) > reserved(3) > available(4) |
| `paid` had its own priority slot | `paid` removed (table is now available when paid) |

**Where (Files & Lines):**
| File | Line | What changes |
|------|------|--------------|
| `/app/frontend/src/utils/statusHelpers.js` | Lines 73–80 | Remove `paid: 1`, shift billReady to 1, occupied to 2, reserved to 3, available to 4 |
| `/app/frontend/src/utils/statusHelpers.js` | Line 83 | Remove `paid` from `TABLE_ACTIVE_STATES` array |

**Risk:** Low — affects sort order only, no visual change
**Tested By:** Screenshot
**Rollback:** Restore original `TABLE_STATUS_PRIORITY` and `TABLE_ACTIVE_STATES` in `statusHelpers.js`

---

## Summary Table

| CHG # | Type | Title | Status | Risk | Files Affected |
|-------|------|--------|--------|------|----------------|
| CHG-006 | CONFIG | Status 6 → Available | ✅ Done | Low | `constants.js` |
| CHG-007 | FEATURE | Status 9 → Reserved/Scheduled | **PARKED** | Medium | `constants.js`, `orderTransform.js`, `DashboardPage.jsx` |
| CHG-008 | FIX | Button Visibility Rules per f_order_status | ✅ Done | Low | `TableCard.jsx`, `DashboardPage.jsx` |
| CHG-009 | CONFIG | Sort Priority Alignment | ✅ Done | Low | `statusHelpers.js` |
| CHG-010 | FIX | Active First Toggle → Flat Grid | ✅ Done | Low | `DashboardPage.jsx` |
| CHG-011 | FIX | Schedule/Confirm — Exclusive Filter | ✅ Done | Low | `Header.jsx`, `DashboardPage.jsx`, `TableSection.jsx` |
| CHG-012 | STYLE | Border Colors — yetToConfirm=Red, occupied=Amber | ✅ Done | Low | `statusHelpers.js` |
| CHG-013 | FEATURE | Available label on empty table cards | ✅ Done | Low | `TableCard.jsx` |
| CHG-014 | FEATURE | Shift Table — API Integration | ✅ Done | Medium | `constants.js`, `tableTransform.js`, `ShiftTableModal.jsx`, `OrderEntry.jsx`, `DashboardPage.jsx` |
| CHG-015 | FEATURE | Merge Table — API Integration | ✅ Done | Medium | `constants.js`, `tableTransform.js`, `MergeTableModal.jsx`, `OrderEntry.jsx` |
| CHG-016 | FEATURE | Transfer Food — API Integration | ✅ Done | Medium | `constants.js`, `tableTransform.js`, `TransferFoodModal.jsx`, `OrderEntry.jsx` |
| CHG-017 | FEATURE | Cancel Item Full + Partial — API Integration | ✅ Done | Low | `constants.js`, `orderTransform.js`, `CancelFoodModal.jsx`, `OrderEntry.jsx`, `DashboardPage.jsx` |
| CHG-018 | FEATURE | Cancel Multi-Qty | ✅ Done | Low | Merged into CHG-017 |
| CHG-019 | FEATURE | Cancel Order — UI + API | ✅ Done | Medium | `constants.js`, `orderTransform.js`, `CancelOrderModal.jsx`, `OrderEntry.jsx` |
| CHG-020 | FEATURE | Add Out of Menu Item | ✅ Done | Medium | `constants.js`, `orderTransform.js`, `AddCustomItemModal.jsx`, `OrderEntry.jsx` |
| CHG-021 | FEATURE | Per-Table Cart (cartsByTable) | ✅ Done | Medium | `DashboardPage.jsx`, `OrderEntry.jsx` |
| CHG-022 | FEATURE | Clear Cart + Delete Unplaced Item | ✅ Done | Low | `CartPanel.jsx`, `OrderEntry.jsx` |
| CHG-023 | FIX | Cancelled Item UI (strikethrough + bill exclusion) | ✅ Done | Low | `CartPanel.jsx`, `OrderEntry.jsx` |
| CHG-024 | FIX | Notes Display in CartPanel | ✅ Done | Low | `CartPanel.jsx` |
| CHG-025 | FIX | Variation/Addon Display Fix | ✅ Done | Low | `CartPanel.jsx`, `ItemCustomizationModal.jsx` |
| CHG-026 | FIX | food_for Normal filter in productTransform | ✅ Done | Low | `productTransform.js` |
| CHG-027 | STYLE | Transfer button — orange pill + ArrowLeftRight icon | ✅ Done | Low | `CartPanel.jsx` |
| CHG-028 | FIX | Remove redundant green dot on customer button | ✅ Done | Low | `OrderEntry.jsx` |
| CHG-029 | FEATURE | Sidebar Profile — firstName (Role) + restaurant ID | ✅ Done | Low | `Sidebar.jsx` |
| CHG-030 | FIX | Refresh Button Style — subtle orange text | ✅ Done | Low | `Sidebar.jsx` |
| CHG-031 | FEATURE | Refresh All Data — Tables + Menu + Orders | ✅ Done | Medium | `useRefreshAllData.js`, `DashboardPage.jsx`, `Sidebar.jsx` |
| CHG-032 | FEATURE | Cancel Order via food-status-update API | ✅ Done | Medium | `constants.js`, `orderTransform.js`, `CancelOrderModal.jsx`, `OrderEntry.jsx` |
| CHG-033 | FIX | Search box collapses on focus out (onBlur) | ✅ Done | Low | `Header.jsx` |
| CHG-034 | FEATURE | Real internet connectivity dot (navigator.onLine) | ✅ Done | Low | `DashboardPage.jsx` |
| CHG-035 | FEATURE | beforeunload warning — prevent accidental reload | ✅ Done | Low | `DashboardPage.jsx` |
| CHG-036 | FEATURE | Customer Lookup API — real search | ✅ Done | Low | `customerTransform.js`, `customerService.js`, `constants.js`, `CartPanel.jsx`, `CustomerModal.jsx` |
| CHG-037 | FEATURE | Place Order API — full integration | ✅ Done | High | `constants.js`, `orderTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx`, `DashboardPage.jsx` |
| CHG-038 | FEATURE | Collect Bill — Scenario 1 (Clear Bill) + Scenario 2 (Place+Pay) | ✅ Done | High | `orderTransform.js`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `constants.js` |
| CHG-039 | FEATURE | Out of Menu → Add to Order | 🔵 Planned | Low | `OrderEntry.jsx` |
| CHG-040 | FEATURE | Update Order (add items to existing order) | ✅ Done | Medium | `orderTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx`, `constants.js` |
| CHG-041 | FEATURE | Update Order (order-level data) | 🔵 Planned | Medium | `OrderEntry.jsx` |
| CHG-042 | FIX | Dedupe API duplicate records (id=4751) | ✅ Done | Low | `tableTransform.js` |

---

---

### CHG-042 | FIX | Dedupe Duplicate Records from all-table-list API

**Date:** 2026-03-29
**Author:** Agent
**Status:** ✅ Done

**Why (Reason):**
`GET /api/v1/vendoremployee/all-table-list` returns duplicate records (confirmed: `id=4751` appears twice for account `owner@18march.com`). This causes React `key` collision → ghost DOM elements, UI accumulation on filter toggles, and console errors ("Encountered two children with the same key").

**Root Cause:** Backend API returns the same record twice (server-side data issue — see BACKEND_CLARIFICATIONS B32).

**What (Scope):**
| Before | After |
|--------|-------|
| `fromAPI.tableList()` maps all records as-is — duplicates pass through | Dedupe by `id` before transform — first occurrence kept, duplicates silently dropped |
| React key collision on duplicate `id` values | Unique `id` values guaranteed in context |

**Where (Files & Lines):**
| File | Line(s) | What changes |
|------|---------|--------------|
| `/app/frontend/src/api/transforms/tableTransform.js` | `fromAPI.tableList()` | Added `Set`-based dedupe filter before `.map(fromAPI.table)` |

**Risk:** Low — defensive filter, no behaviour change for unique records
**Tested By:** API curl confirmed duplicate exists; Webpack compiles
**Rollback:** Remove the `seen`/`unique` filter block in `fromAPI.tableList()`

**Backend Action Required:** See BACKEND_CLARIFICATIONS B32 — investigate and fix duplicate `id=4751` in API response.

---

**Date:** 2026-03-26
**Author:** Agent
**Status:** ✅ Done

**Why (Reason):**
When the `activeFirst` toggle is ON, users expect to see ALL active tables across ALL areas in one unified grid (priority sorted), not area-wise columns. The previous behaviour sorted tables within each area separately, making it hard to see all active tables at a glance.

**What (Scope):**
| Before | After |
|--------|-------|
| Toggle ON → still shows area columns (Default / out / in / Walk-In), active tables sorted within each area | Toggle ON → all areas flattened into one unified grid, sorted by status priority (yetToConfirm → billReady → occupied → available) |
| Toggle OFF → area columns | Toggle OFF → area columns (unchanged) |

**Where (Files & Lines):**
| File | Line | What changes |
|------|------|--------------|
| `/app/frontend/src/pages/DashboardPage.jsx` | Line 502 | `isDineInOnly && hasAreas ?` → `isDineInOnly && hasAreas && !activeFirst ?` |

**Risk:** Low — single condition change, falls through to existing flat grid logic
**Tested By:** Screenshot + User confirmed
**Rollback:** Revert line 502 — remove `&& !activeFirst` from the condition

---

### CHG-011 | FIX | Schedule/Confirm — Exclusive Single-Select Filter

**Date:** 2026-03-26
**Author:** Agent
**Status:** ✅ Done

**Why (Reason):**
Schedule and Confirm are exclusive filters — only one can be active at a time. Clicking one shows ONLY that order type. Previous implementation used multi-select toggle (both ON by default), which hid/showed cards rather than filtering to show only the relevant type.

**What (Scope):**
| Before | After |
|--------|-------|
| Both ON by default, clicking toggles visibility of that type | Neither selected by default (show all) |
| Multi-select — both could be ON simultaneously | Exclusive — only one active at a time |
| Confirm OFF → hides yetToConfirm | Confirm ON → shows ONLY yetToConfirm |
| Schedule OFF → hides scheduled | Schedule ON → shows ONLY scheduled |
| | Click same button again → deselect → show all |

**Where (Files & Lines):**
| File | What changes |
|------|--------------|
| `/app/frontend/src/pages/DashboardPage.jsx` | Added `tableFilter` state (`null \| 'confirm' \| 'schedule'`). Updated `filteredGridItems` to exclusive filter logic. Passed `tableFilter`/`setTableFilter` to Header and TableSection |
| `/app/frontend/src/components/layout/Header.jsx` | Added `tableFilter`/`setTableFilter` props. In table view, button active state = `tableFilter === status.id`. Click handler = exclusive toggle |
| `/app/frontend/src/components/sections/TableSection.jsx` | Replaced `activeStatuses` prop with `tableFilter`. Filter logic: confirm → yetToConfirm only, schedule → scheduled only, null → all |

**Risk:** Low — room view and order/list view filters (activeStatuses) completely untouched
**Tested By:** User confirmed
**Rollback:** Revert tableFilter state and restore original activeStatuses toggle logic

---

### CHG-012 | STYLE | Border Colors — yetToConfirm=Red, occupied=Amber

**Date:** 2026-03-26
**Author:** Agent
**Status:** ✅ Done

**Why (Reason):**
yetToConfirm orders need urgent attention (red = alert). Preparing/ready orders (occupied) are active but not urgent (amber = attention).

**What (Scope):**
| Status | Before | After |
|---|---|---|
| yetToConfirm (7) | Amber border | Red border (`#EF4444`) |
| occupied (1, 2) | Orange border | Amber border (`#F4A11A`) |
| billReady (5) | Green border | Green border (unchanged) |

**Where (Files & Lines):**
| File | What changes |
|------|--------------|
| `/app/frontend/src/utils/statusHelpers.js` | `yetToConfirm.borderColor` → `COLORS.errorText`, `occupied.borderColor` → `COLORS.amber` |

**Risk:** Low — visual only
**Tested By:** User confirmed
**Rollback:** Revert TABLE_STATUS_CONFIG in `statusHelpers.js`

---

### CHG-013 | FEATURE | "Available" Label on Empty Table Cards

**Date:** 2026-03-26
**Author:** Agent
**Status:** ✅ Done

**Why (Reason):**
Empty table cards showed only a + icon with no text label, making it unclear whether the table was available or just loading. Added "Available" text for clarity, matching the style of "Ready" label.

**What (Scope):**
| Before | After |
|--------|-------|
| Empty table: + icon centered, no label | Empty table: + icon centered + "Available" label at bottom |

**Where (Files & Lines):**
| File | What changes |
|------|--------------|
| `/app/frontend/src/components/cards/TableCard.jsx` | Added `Available` label div below + icon for `!isActive` state |

**Risk:** Low — visual only
**Tested By:** User confirmed
**Rollback:** Remove the "Available" label div from `!isActive` block in `TableCard.jsx`

---

## Pending Clarifications

| # | Question | Status |
|---|----------|--------|
| Q1 | What should f_order_status = 4 map to in table view? | OPEN |
| Q2 | What should f_order_status = 8 map to in table view? | OPEN |
| Q3 | For status 9 scheduled virtual cards (takeaway/delivery) — what buttons should appear? | OPEN |

---

## Sprint 2 — Table Operations (Phase 1C)

> Scope: Wire all 6 table/order operations to real APIs.
> These are common to BOTH area-wise table view AND flat grid view —
> operations are triggered from OrderEntry which opens from any table card click.
> 
> Current state of all modals: UI built, submit handlers are empty stubs (console.log / close only).
> All table lists use mock data (`mockTables`).

---

### CHG-014 | FEATURE | Shift Table — API Integration

**Date:** 2026-03-26
**Author:** Agent
**Status:** ✅ Done (with bug fixes)

**Why (Reason):**
Shift Table moves an entire order from one table to another. Modal now fetches real-time free tables from API and submits via correct endpoint through the transform layer.

**What (Scope):**
| Before | After |
|--------|-------|
| Table list from `mockTables` (static) | Fresh API call on modal open — `GET /all-table-list`, filtered by `engage=No` |
| `handleShift` only closed modal (no API) | `handleShift` → `tableToAPI.shiftTable()` → `POST /order-table-room-switch` |
| Modal closed immediately before API resolved | Modal awaits API — shows "Shifting..." during call |
| No feedback on success or failure | Success toast with API message / inline error on failure |
| Walk-in `orderId` missing from table entry | Fixed — `orderId` added to all table entry types |

**Where (Files):**
| File | What changes |
|------|--------------|
| `/app/frontend/src/api/constants.js` | Added `ORDER_TABLE_SWITCH: '/api/v1/vendoremployee/pos/order-table-room-switch'` |
| `/app/frontend/src/api/transforms/tableTransform.js` | Added `toAPI.shiftTable(currentTable, targetTable)` — builds payload with correct field names |
| `/app/frontend/src/components/order-entry/ShiftTableModal.jsx` | Replaced `mockTables` with live `getTables()` call. Filters `engage=No`. Added `submitting` + `submitError` state. Awaits `onShift()` before closing. Shows inline error on failure |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Added `useToast`. `handleShift()` uses transform + correct endpoint. Success toast shows API message. Throws on error so modal can catch and display |
| `/app/frontend/src/pages/DashboardPage.jsx` | Added `orderId` to `adaptTable()` AND both walk-in entry blocks (sectioned + flat) |

**API Endpoint:** `POST /api/v1/vendoremployee/pos/order-table-room-switch`

**Confirmed API Payload (via toAPI.shiftTable):**
```json
{
  "order_id": table.orderId,
  "old_table_id": table.tableId,
  "new_table_id": selectedTable.tableId,
  "order_edit_count": table.amount
}
```

**Field Mapping:**
| Payload Field | Frontend Source | API Source | Note |
|---|---|---|---|
| `order_id` | `table.orderId` | `api.id` | Current order ID |
| `old_table_id` | `table.tableId` | `api.table_id` | Table shifting FROM (0 for walk-in) |
| `new_table_id` | `selectedTable.tableId` | selected from modal | Table shifting TO |
| `order_edit_count` | `table.amount` | `api.order_amount` | Grand total of existing order |

**Bugs Fixed During Implementation:**
1. Walk-in entries had `orderId: undefined` → API rejected with "order_id field required"
2. Modal called `onClose()` synchronously before API resolved → no error feedback
3. No success/failure feedback to user

**Architecture:** Follows `toAPI` transform pattern — UI has zero raw API field names
**Risk:** Medium
**Tested By:** API confirmed working (`{"message": "Table ID updated successfully."}`)

---

### CHG-015 | FEATURE | Merge Table — API Integration

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done (with walk-in fix)

**Why (Reason):**
Merge Table combines the bills of multiple occupied tables into one. Previously `handleMerge` only closed the modal with no API call.

**What (Scope):**
| Before | After |
|--------|-------|
| Table list from `mockTables` (static, no real orders) | Live occupied orders from `OrderContext` — includes dine-in AND walk-in |
| Showed tables by status (occupied/billReady/paid) | Shows ALL orders with active runs except current table |
| Walk-in orders excluded | Walk-in orders included under "Walk-In" section |
| `handleMerge` only closed modal | Sequential API calls (one per selected table) → success toast |
| No error feedback | Inline error + "Merging..." loading state |

**Where (Files):**
| File | What changes |
|------|--------------|
| `/app/frontend/src/api/constants.js` | Added `MERGE_ORDER: '/api/v2/vendoremployee/transfer-order'` |
| `/app/frontend/src/api/transforms/tableTransform.js` | Added `toAPI.mergeTable(currentTable, sourceOrder)` — builds payload |
| `/app/frontend/src/components/order-entry/MergeTableModal.jsx` | Full rewrite — uses `orders` prop from OrderContext. `getOrderLabel()` + `getOrderArea()` helpers handle walk-in display. Multi-select with async submit |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Added `useOrders`, passes `orders` to modal. `handleMerge` loops selected orders → sequential API calls → success toast |

**API Endpoint:** `POST /api/v2/vendoremployee/transfer-order`

**Confirmed API Payload (via toAPI.mergeTable):**
```json
{
  "source_order_id": sourceOrder.orderId,
  "target_order_id": currentTable.orderId,
  "transfer_note": "Yes"
}
```

**Field Mapping:**
| Payload Field | Frontend Source | Note |
|---|---|---|
| `source_order_id` | selected table's `order.orderId` | Order being dissolved/merged away |
| `target_order_id` | `currentTable.orderId` | Current table — survives the merge |
| `transfer_note` | `"Yes"` (fixed) | Always transfers notes |

**Multi-select behavior:** For N selected tables → N sequential API calls, each merging one source into current table.

**Bug Fixed:** Walk-in orders were excluded (`!o.isWalkIn && tableId > 0`). Now all active orders (dine-in + walk-in) are shown except the current table's own order.

**Architecture:** Follows `toAPI` transform pattern — UI has zero raw API field names
**Risk:** Medium
**Tested By:** Code review — pending E2E test with live orders

---

### CHG-016 | FEATURE | Transfer Food — API Integration

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done (syntax bug fixed)

**Why (Reason):**
Transfer Food moves a specific cart item from the current order to another occupied table's order. Previously `handleTransfer` only removed the item from local cart state with no API call.

**What (Scope):**
| Before | After |
|--------|-------|
| Table list from `mockTables` (static) | Live occupied orders from `OrderContext` — dine-in + walk-in |
| `handleTransfer` removed item from local state only | `handleTransfer` → `tableToAPI.transferFood()` → `POST /transfer-food-item` → success toast |
| No error feedback | Inline error + "Transferring..." loading state |
| `switchNotes` checkbox in UI (not wired to API) | Removed — API has no such field |

**Where (Files):**
| File | What changes |
|------|--------------|
| `/app/frontend/src/api/constants.js` | Added `TRANSFER_FOOD: '/api/v2/vendoremployee/transfer-food-item'` |
| `/app/frontend/src/api/transforms/tableTransform.js` | Added `toAPI.transferFood(currentTable, targetOrder, item)`. Fixed JSDoc syntax bug that caused compile error |
| `/app/frontend/src/components/order-entry/TransferFoodModal.jsx` | Full rewrite — uses `orders` prop from OrderContext. Item preview in header. Single-select. Async submit with error handling |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | `handleTransfer` now async → `tableToAPI.transferFood()` → API call → success toast. Passes `orders` to modal |

**API Endpoint:** `POST /api/v2/vendoremployee/transfer-food-item`

**Confirmed API Payload (via toAPI.transferFood):**
```json
{
  "source_order_id": currentTable.orderId,
  "target_order_id": selectedOrder.orderId,
  "food_item_id": item.id
}
```

**Field Mapping:**
| Payload Field | Frontend Source | API Source | Note |
|---|---|---|---|
| `source_order_id` | `currentTable.orderId` | `api.id` (order) | Order item is coming FROM |
| `target_order_id` | `selectedOrder.orderId` (OrderContext lookup) | `api.id` (order) | Order item is going TO |
| `food_item_id` | `item.id` | `orderDetails[].id` | Specific item being transferred |

**Bug Fixed:** Syntax error in `tableTransform.js` — JSDoc `/**` opening tag for `mergeTable` was accidentally removed when `transferFood` was inserted between functions.

**Architecture:** Follows `toAPI` transform pattern — UI has zero raw API field names
**Risk:** Medium
**Tested By:** Syntax verified (`node --check` passed)

---

### CHG-017 | FEATURE | Cancel Item — API Integration

**Date:** TBD
**Author:** TBD
**Status:** 🔵 Planned

**Why (Reason):**
Cancel Item removes a specific item (or partial quantity) from an active order. Currently `handleCancelFood` only removes the item from local cart state — no API call.

**What (Scope):**
| Before | After |
|--------|-------|
| Select reason → item removed from local cart only | Select reason → POST to API → item cancelled on server → order refreshes |

**Where (Files):**
| File | What changes |
|------|--------------|
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | `handleCancelFood()` → call `POST /api/v1/vendoremployee/pos/cancel-item`. On success: refresh order |

**API Payload:**
```json
{ "order_id": 456, "item_id": 789, "cancel_quantity": 1, "reason_id": 1, "notes": "Customer request" }
```

**Dependencies:** Backend API + cancellation reasons API
**Risk:** Low
**Blocked On:** API payload confirmation

---

### CHG-018 | FEATURE | Cancel Multiple Quantity of Same Item

**Date:** TBD
**Author:** TBD
**Status:** 🔵 Planned

**Why (Reason):**
When an item has qty > 1, the user can cancel a partial quantity (e.g. cancel 2 of 5). The qty selector UI already exists in `CancelFoodModal.jsx` but the `cancel_quantity` value is not sent to any API.

**What (Scope):**
| Before | After |
|--------|-------|
| Qty selector UI exists but output ignored | `cancelQuantity` passed in API payload. If partial cancel → item qty reduced. If full cancel → item removed |

**Where (Files):**
| File | What changes |
|------|--------------|
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | `handleCancelFood()` uses `cancelQuantity` from modal output in API payload |
| `/app/frontend/src/components/order-entry/CancelFoodModal.jsx` | Ensure `cancelQuantity` and `remainingQuantity` are passed in `onCancel` callback (already implemented in UI) |

**Dependencies:** CHG-017 must be done first (shares same API endpoint)
**Risk:** Low
**Blocked On:** CHG-017

---

### CHG-019 | FEATURE | Cancel Order — UI + API Integration

**Date:** TBD
**Author:** TBD
**Status:** 🔵 Planned

**Why (Reason):**
Cancel Order cancels the entire active order for a table. No modal exists yet — needs to be built from scratch and wired to API.

**What (Scope):**
| Before | After |
|--------|-------|
| No Cancel Order modal exists | New modal: select reason → POST to API → order cancelled → table freed |

**Where (Files):**
| File | What changes |
|------|--------------|
| `/app/frontend/src/components/order-entry/CancelOrderModal.jsx` | **Create new file** — modal with reason selector + notes (same pattern as CancelFoodModal) |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Add Cancel Order button in cart/header area. Wire to new modal + `POST /api/v1/vendoremployee/pos/cancel-order` |
| `/app/frontend/src/components/order-entry/CategoryPanel.jsx` | Add Cancel Order trigger button if needed |

**API Payload:**
```json
{ "order_id": 456, "reason_id": 1, "notes": "Customer left" }
```

**Dependencies:** Cancellation reasons API (already used by CancelFoodModal)
**Risk:** Medium — new modal needs to be built
**Blocked On:** API payload confirmation

---

### CHG-017/018 | FEATURE | Cancel Item Full + Partial — API Integration

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done

**What:**
- Full cancel: `PUT /api/v2/vendoremployee/cancel-food-item` — cancels all qty of an item
- Partial cancel: `PUT /api/v2/vendoremployee/partial-cancel-food-item` — cancels specific qty
- Decision: `cancelQty >= item.qty` → full, else → partial

**Bugs Fixed:**
1. `order_food_id` and `item_id` were swapped in full cancel payload
2. `reason_type` for full cancel must be integer (reason.reasonId), not string `"customer"`
3. `foodId` (food_details.id) was missing from `orderTransform.fromAPI.orderItem()` and from `cartItems` population in `OrderEntry`
4. `CANCELLATION_TYPES.ITEM` was `'Item'` but API returns `'Food'` → fixed to `'Food'`
5. `CancelFoodModal` was using mock `cancellationReasons` from `../../data` → replaced with live `SettingsContext.getItemCancellationReasons()`

**Files:** `constants.js`, `orderTransform.js`, `CancelFoodModal.jsx`, `OrderEntry.jsx`, `DashboardPage.jsx`

---

### CHG-020 | FEATURE | Add Out of Menu Item

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done

**What:** New `+` button in order screen opens `AddCustomItemModal`. Waiter enters name, category, price, qty, notes. API creates product in catalog, response mapped to cart item and added as unplaced item.

**Features:**
- Name field shows read-only suggestions from MenuContext (existing items in same food_for)
- Exact name match blocks submit (no duplicates in same food_for)
- Category is searchable text input with dropdown (not plain select)
- `food_for: "Normal"` only shown in suggestions (Phase 3 will add multi-menu)

**API:** `POST /api/v1/vendoremployee/add-single-product`
**Transform:** `orderToAPI.addCustomItem()` + `customItemFromAPI()`
**Files:** `constants.js`, `orderTransform.js`, `AddCustomItemModal.jsx`, `OrderEntry.jsx`, `productTransform.js`

---

### CHG-021 | FEATURE | Per-Table Cart (cartsByTable)

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done

**What:** Each table/order now has its own cart. Switching tables saves current cart and restores the new table's cart. Universal key: `table?.id || orderType` covers physical tables, walk-in (`wc-*`), TakeAway (`ta-*`), Delivery (`del-*`), and new orders.

**Priority:** `savedCart` > `orderData` (API) > empty
**Files:** `DashboardPage.jsx`, `OrderEntry.jsx`

---

### CHG-022 | FEATURE | Clear Cart + Delete Unplaced Item

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done

**What:**
- 🗑️ **Trash icon** in RHS header (before KOT toggle) — clears ALL unplaced items. Only visible when unplaced items exist.
- 🗑️ **Trash2 icon** per row in `NewItemRow` — replaces old ❌ XCircle which incorrectly opened `CancelFoodModal` for local-state items. Direct delete from cart, no modal.

**Why separate:** Placed items need cancel API. Unplaced items are local state only — direct delete.
**Files:** `CartPanel.jsx`, `OrderEntry.jsx`

---

### CHG-023 | FIX | Cancelled Item UI

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done

**What:** Items with `status === 'cancelled'` (food_status=3) from API now show:
- 50% opacity, gray text, ~~strikethrough~~ on name and price
- "(Cancelled)" label
- Cancel + Transfer buttons hidden
- Excluded from bill total calculation

**Why:** API returns cancelled items in orderDetails — they were showing normally with full price counted in total.
**Files:** `CartPanel.jsx`, `OrderEntry.jsx`

---

### CHG-024 | FIX | Notes Display in CartPanel

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done

**What:** `item.notes` (from ItemCustomizationModal, AddCustomItemModal, API `food_level_notes`) was never rendered in CartPanel. Added `📝 {item.notes}` display in both `PlacedItemRow` and `NewItemRow`.
**Files:** `CartPanel.jsx`

---

### CHG-025 | FIX | Variation/Addon Display Fix

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done

**What:**
1. `ItemCustomizationModal`: addon lookup used `a.id === addonId` (number vs string mismatch from `Object.entries`) → fixed to `String(a.id) === String(addonId)`
2. `CartPanel PlacedItemRow`: existing API orders don't have `item.customizations` set. Added fallback to display `item.variation` and `item.addOns` directly.
**Files:** `ItemCustomizationModal.jsx`, `CartPanel.jsx`

---

### CHG-026 | FIX | food_for Normal Filter in productTransform

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done

**What:**
- Added `foodFor: api.food_for || 'Normal'` to product transform
- `productList()` now filters to `foodFor === 'Normal'` only — removes Buffet/HappyHour items
- Applies to POS order entry, Menu Management, AddCustomItemModal suggestions
- Phase 3: multiple menu support will make this filter dynamic

**Why:** Same product name existed as 3 separate entries (Normal/Buffet/HappyHour) causing duplicates in suggestions.
**Files:** `productTransform.js`

---

### CHG-027 | STYLE | Transfer Button — Orange Pill with Icon

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done

**What:** "Transfer" link in `PlacedItemRow` was plain gray text — not obviously clickable. Changed to orange pill button with `ArrowLeftRight` icon.
**Files:** `CartPanel.jsx`

---

### CHG-028 | FIX | Remove Redundant Green Dot on Customer Button

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done

**What:** Customer button showed both green icon AND green dot when customer was attached — redundant. Removed the dot badge. Green icon alone communicates customer is set.
**Files:** `OrderEntry.jsx`

---

### CHG-033 | FIX | Search Box Collapses on Focus Out

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done

**Why:** Search box expanded (orange border) when clicked but never collapsed when user clicked away without typing — `onFocus` existed but `onBlur` was missing.

**What:**
| Before | After |
|---|---|
| Click search → focus out → stays expanded with orange border | Click away with empty query → collapses. Click away with typed query → stays expanded (preserves search) |

**Where:** `/app/frontend/src/components/layout/Header.jsx` — Added `onBlur={() => { if (!searchQuery) setIsSearchFocused(false); }}`

---

### CHG-034 | FEATURE | Real Internet Connectivity Dot

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done

**Why:** `isOnline` was hardcoded `useState(true)` — green dot was always green, never reflected real connectivity.

**What:**
| Before | After |
|---|---|
| `const [isOnline] = useState(true)` — static green always | `useState(navigator.onLine)` + `window.addEventListener('online'/'offline')` |
| Dot never goes red | 🟢 Green = connected, 🔴 Red = disconnected (auto-detects) |

**Where:** `/app/frontend/src/pages/DashboardPage.jsx` — Replaced static state with `navigator.onLine` + event listeners with cleanup

**Limitation:** Detects device network connectivity, NOT API server reachability. True API health check would require periodic ping.

---

### CHG-035 | FEATURE | beforeunload Warning — Prevent Accidental Reload

**Date:** 2026-03-27
**Author:** Agent
**Status:** ✅ Done

**Why:** Browser F5/Ctrl+R or closing tab would silently reload the page, logging the waiter out mid-shift and losing all session state.

**What:** Added `beforeunload` event listener on DashboardPage that triggers browser's native "Leave site? Changes may not be saved" dialog. User can Cancel to stay or Leave to reload (then re-login).

**Where:** `/app/frontend/src/pages/DashboardPage.jsx` — `useEffect` with `window.addEventListener('beforeunload', ...)` + cleanup on unmount

---

## Sprint 3 — Order Taking Process

> Scope: Full order lifecycle — Customer lookup → Place Order → Collect Bill + Edit/Update flow
> Current state: ALL 6 operations are stubs (local state / mock data only, no API calls)

---

### Current State (Before Sprint 3)

| Feature | Current Behavior | What's Missing |
|---|---|---|
| Customer Lookup | `searchCustomers()` from `mockCustomers.js` (static mock data) | Real API call by phone/name |
| Place Order | Marks items `placed: true` locally + shows `OrderPlacedModal` | POST to create/update order on server |
| Collect Bill | `CollectPaymentPanel` calculates totals locally, `onPaymentComplete` fires with no API | POST to collect payment |
| Out of Menu Item in Order | Creates product in catalog (`add-single-product`) but never adds to order | API call to add product to current order |
| Edit Order | Not implemented | Endpoint + UI to modify placed items |
| Update Order | Not implemented | Endpoint + UI to update order-level data |

---

### CHG-036 | FEATURE | Customer Lookup API

**Why:** CustomerModal currently uses `searchCustomers` from mock data. Real-time customer search by phone/name needed for loyalty, pre-fill, and member identification.

**What:**
- CustomerModal phone input → type 3+ chars → call customer search API
- CartPanel phone/name inputs → same API for suggestions
- Response: customer name, phone, memberId, birthday, anniversary, loyalty points
- On select → pre-fills all CustomerModal fields

**Where:**
| File | Change |
|---|---|
| `customerService.js` (new) | `searchCustomerByPhone(phone)`, `searchCustomerByName(name)` |
| `CustomerModal.jsx` | Replace `searchCustomers(mock)` with real API. Wire response to form fields |
| `CartPanel.jsx` | Wire customer phone/name suggestion to real API |
| `constants.js` | Add customer search endpoint |

**Dependencies:** Backend to provide endpoint + payload
**Blocked On:** Customer search API endpoint

---

### CHG-037 | FEATURE | Place Order API

**Why:** "Place Order" button currently just marks items as `placed: true` locally. Nothing is sent to the server. Orders placed this way are lost on refresh.

**What:**
- New order (no existing `orderId`): POST create order with all items
- Existing order (has `orderId`): POST add items to existing order
- Cart items include: product IDs, qty, price, variations, addons, notes, customizations
- Customer data (name, phone, memberId) included in payload
- On success: refresh order context, mark items placed, close `OrderPlacedModal`

**Two sub-flows:**
1. **New order (fresh table/walk-in):** Create new order → get back `order_id`
2. **Existing order (add items):** Add new items to existing `order_id`

**Where:**
| File | Change |
|---|---|
| `orderService.js` | Add `placeOrder(payload)`, `addItemsToOrder(orderId, items)` |
| `orderTransform.toAPI` | `placeOrder(table, cartItems, customer, orderType)` |
| `OrderEntry.jsx` | `handlePlaceOrder` → async API call → success toast → refresh |
| `constants.js` | Add place order endpoint |

**Dependencies:** Backend to provide endpoint + payload structure
**Blocked On:** Place order API endpoint

---

### CHG-038 | FEATURE | Collect Bill / Payment API

**Why:** `CollectPaymentPanel.handlePayment()` computes totals locally and fires `onPaymentComplete` with no API call. Payment is never recorded on the server.

**What:**
- `handlePayment` → POST payment to server
- Payload: `order_id`, `payment_method`, `amount`, discount breakdown, split payments if applicable
- On success: mark order as paid → table goes to available → close OrderEntry

**Where:**
| File | Change |
|---|---|
| `paymentService.js` (new) | `collectPayment(payload)` |
| `orderTransform.toAPI` | `collectPayment(order, paymentData)` |
| `CollectPaymentPanel.jsx` | `handlePayment` → async API call → success → `onPaymentComplete` |
| `constants.js` | Add collect payment endpoint |

**Dependencies:** Backend to provide endpoint + payload
**Blocked On:** Collect payment API endpoint

---

### CHG-039 | FEATURE | Out of Menu Item — Add to Order

**Why:** `AddCustomItemModal` calls `add-single-product` (creates in catalog) but never adds the item to the current order. The item appears in the local cart but won't be on the server order.

**What:**
- After `add-single-product` returns `data.id` (new product ID) → immediately call "add to order" API with that product ID
- OR: CHG-037 Place Order handles this naturally if product ID is included in items array
- Clarify with backend which approach is needed

**Where:**
| File | Change |
|---|---|
| `OrderEntry.handleAddCustomItem` | After getting `data.id` → optionally call add-to-order API |
| `constants.js` | Add endpoint if separate from Place Order |

**Dependencies:** Clarify if CHG-037 (Place Order) handles this OR separate endpoint needed
**Blocked On:** Confirmation from backend


### CHG-038 | FEATURE | Collect Bill — Scenario 1 (Clear Bill) + Scenario 2 (Place+Pay)

**Date:** 2026-03-28
**Author:** Agent
**Status:** ✅ Done

**Two Flows:**

**Scenario 2 (Fresh → Pay directly):** `POST /api/v1/vendoremployee/pos/place-order-and-payment` (form-urlencoded)
**Scenario 1 (Existing order → Collect):** `POST /api/v2/vendoremployee/order-bill-payment` (JSON)

**Critical Discoveries:**
- `place-order-and-payment` needs 14+ ORDER-LEVEL fields beyond original curl: `vat_tax`, `gst_tax`, `service_tax`, `service_gst_tax_amount`, `discount`, `discount_type`, `restaurant_discount_amount`, `order_discount`, `comunity_discount`, `discount_value`, `tip_amount`, `tip_tax_amount`, `round_up`, `order_sub_total_amount`, `order_total_tax_amount`
- `order-bill-payment` requires: `restaurant_discount_amount`, `order_discount`, `comunity_discount`, `discount_value` (NOT in original curl example)
- `vat_tax` must be ORDER level — not cart item level for `place-order-and-payment`

**Files:** `orderTransform.js`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `constants.js`

---

### CHG-040 | FEATURE | Update Order (add items to existing order)

**Date:** 2026-03-28
**Author:** Agent
**Status:** ✅ Done

**Endpoint:** `PUT /api/v2/vendoremployee/pos/update-place-order` (JSON)
**Cart key:** `cart-update` (not `cart`)
**Button label:** "Update Order" when `hasPlacedItems`, "Place Order" for fresh orders
**Files:** `orderTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx`, `constants.js`

---


---

### CHG-040 | FEATURE | Edit Order

**Why:** Currently no way to modify a placed item's quantity or customizations once it's sent to kitchen. Waiters need to edit orders (e.g., customer changes mind before cooking).

**What:**
- Edit quantity of a placed but not yet served item
- Edit notes on a placed item
- Separate from Cancel (which uses `food-status-update`)

**Where:**
| File | Change |
|---|---|
| `CartPanel.jsx` | Enable qty edit for placed items in certain statuses (preparing only?) |
| `orderService.js` | `editOrderItem(orderId, itemId, changes)` |
| `constants.js` | Add edit order item endpoint |

**Dependencies:** Backend to confirm which fields can be edited + endpoint
**Blocked On:** Edit order API endpoint + business rules (which statuses allow edit?)

---

### CHG-041 | FEATURE | Update Order

**Why:** Order-level updates: customer name/phone change, order notes change, waiter re-assignment.

**What:**
- Update customer info on an existing order
- Update order notes
- Potentially re-assign waiter

**Where:**
| File | Change |
|---|---|
| `orderService.js` | `updateOrder(orderId, changes)` |
| `OrderEntry.jsx` | Wire customer save + order notes save to API |
| `constants.js` | Add update order endpoint |

**Dependencies:** Backend to provide endpoint + updatable fields
**Blocked On:** Update order API endpoint

---

### CHG-036 | FEATURE | Customer Lookup API

**Date:** 2026-03-28
**Author:** Agent
**Status:** ✅ Done

**What:** Replaced mock customer search with real API. Both CartPanel and CustomerModal now call `POST /api/v2/vendoremployee/restaurant-customer-list` with `{ key: [query] }`.

**Phase 1/2:** Shows name + phone only. Loyalty, wallet, birthday etc. parked for Phase 3.

**Files:** `customerTransform.js` (fixed field mapping: `customer_name` not `f_name`), `customerService.js` (POST with `key` array), `constants.js` (CUSTOMER_SEARCH endpoint), `CartPanel.jsx`, `CustomerModal.jsx`

---

### CHG-037 | FEATURE | Place Order API — Full Integration

**Date:** 2026-03-28
**Author:** Agent
**Status:** ✅ Done (with multiple bug fixes)

**Endpoint:** `POST /api/v2/vendoremployee/pos/place-order` (form-urlencoded, NOT JSON)

**Critical Bug Fixed:** Axios instance had `Content-Type: application/json` as default, overriding URLSearchParams auto-detection → server received wrong content type → "Invalid cart data". Fixed by explicitly passing `Content-Type: application/x-www-form-urlencoded` in request config.

**Other Bugs Fixed During Development:**
1. `orderEntryType` always set to `'walkIn'` for physical tables → fixed `handleTableClick` to set `'dineIn'` for dine-in tables
2. `cust_name: 'Walk-In Customer'` sent for physical tables → fixed to empty string for non-walkIn orders
3. Table label not showing in header after `'dineIn'` fix → fixed dropdown display condition
4. `beforeunload` dialog triggered on 401 redirect → fixed with `sessionStorage` flag in axios interceptor
5. `clearOrders` missing from logout handler → added to prevent mixed session state
6. Emergent badge removed from `index.html`

**UX Changes:**
- `isPlacingOrder` state → button shows `⟳ Placing...` and is disabled during API call
- Cart cleared (`setCartItems([])`) after success instead of showing OrderPlacedModal
- Toast notification on success/failure

**Files:** `constants.js`, `orderTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx`, `DashboardPage.jsx`, `Sidebar.jsx`, `axios.js`, `index.html`

**Payload:** `application/x-www-form-urlencoded` with `data` key containing JSON string:
```json
{
  "restaurant_id": restaurant.id,
  "cust_name": customer?.name || (orderType === 'walkIn' ? 'Walk-In Customer' : ''),
  "order_type": "dinein" | "take_away" | "delivery",
  "order_note": orderNotes.map(n => n.label).join(', '),
  "order_amount": total,
  "payment_method": "cash_on_delivery",
  "table_id": table.tableId || 0,
  "print_kot": "Yes" | "No",
  "cart": [{ food_id, quantity, price, station, add_ons, add_on_qtys, variations, addons_total, variation_total }]
}
```

---

## Sprint 3 Summary Table

| CHG | Feature | Current State | Priority | Blocked On |
|---|---|---|---|---|
| CHG-036 | Customer Lookup API | Mock data | P0 | Endpoint needed |
| CHG-037 | Place Order API | Local state only | P0 | Endpoint needed |
| CHG-038 | Collect Bill / Payment API | No API | P0 | Endpoint needed |
| CHG-039 | Out of Menu → Add to Order | Half done (catalog only) | P1 | Clarification needed |
| CHG-040 | Edit Order | Not implemented | P1 | Endpoint + rules needed |
| CHG-041 | Update Order | Not implemented | P2 | Endpoint needed |

---

## Transform Architecture for Sprint 3

All Sprint 3 operations follow the same `toAPI` transform pattern:

```
OrderEntry / CollectPaymentPanel (UI)
    ↓ calls toAPI.xxx()
orderTransform.toAPI.xxx()       ← maps frontend → API field names
    ↓
api.post/put(API_ENDPOINTS.xxx)
    ↓
External API
```

No raw API field names in UI components.

---

## Sprint 3 Dependency Map

```
CHG-039 (Out of Menu in Order) ← can be solved by CHG-037 (Place Order)
CHG-037 (Place Order)          ← needed before CHG-038 (Collect Bill)
CHG-036 (Customer)             ← independent, can be done first
CHG-040 (Edit Order)           ← independent
CHG-041 (Update Order)         ← partially solved by CHG-037
```

```
CHG-014 (Shift)    ← needs: real tables from context
CHG-015 (Merge)    ← needs: real tables from context
CHG-016 (Transfer) ← needs: real tables from context
CHG-017 (Cancel Item) ← needs: cancel reasons API (already done)
CHG-018 (Cancel Qty)  ← needs: CHG-017 done first
CHG-019 (Cancel Order) ← needs: cancel reasons API + new modal built
```

**Pre-requisite for CHG-014/015/016:** Replace `mockTables` in all 3 modals with real `tables` from `TableContext`. This is one shared task before any of the 3 can be wired to APIs.
