# Backend Clarifications & Open Questions

> Last Updated: 2026-03-30

> Status: Phase 4A Planning — Order Reports

>
> **Sub-Documents (module-specific):**
> - [ORDER_REPORT_CLARIFICATIONS.md](./ORDER_REPORT_CLARIFICATIONS.md) — Phase 4A: Order Reports API gaps, missing fields, data issues
> - *(Future sub-documents will be added here per module/phase)*

---

## Answered / Resolved

### Q1: `f_order_status` — CONFIRMED by user
**Endpoint:** `GET /api/v1/vendoremployee/pos/employee-orders-list`

| f_order_status | Status Key | Badge Label | Table Card Status |
|---|---|---|---|
| 1 | `preparing` | Preparing | `occupied` |
| 2 | `ready` | Ready | `occupied` (food ready) |
| 3 | `cancelled` | Cancelled | skip / `available` |
| **4** | **TBD** | **TBD** | **User will provide later** |
| 5 | `served` | Served | `billReady` |
| 6 | `paid` | Paid | `paid` |
| 7 | `pending` | Yet to be confirmed | `yetToConfirm` |
| **8** | **TBD** | **TBD** | **User will provide later** |

**`food_status` on items uses the same 1-7 scale with some exceptions (to be documented when edge cases are found).**

### Q3: Station-specific statuses — CONFIRMED, DEFERRED
- `f_order_status` — Overall food order status (used for table card + order badge)
- `b_order_status` — Bar station status → **Deferred to Phase 1C**
- `k_order_status` — Kitchen station status → **Deferred to Phase 1C**

### Q4: "BILL READY" and "PAID" — RESOLVED
| Status | How to Identify |
|---|---|
| BILL READY | `f_order_status === 5` (served) AND `payment_status === "unpaid"` |
| PAID | `f_order_status === 6` OR `payment_status === "paid"` |

---

## Open Questions (Still Pending)

### Q2: `order_status` field purpose — CONFIRMED
**Observation:** `order_status` is a lifecycle indicator separate from `f_order_status`:
- `"queue"` = active/running order → **shows on dashboard**
- `"delivered"` = completed/settled → **should NOT show on dashboard**

**Status:** RESOLVED — The `employee-orders-list` API only returns queue orders by default. No frontend filtering needed.

### Q5: `def_ord_status` Restaurant Field
**Source:** Restaurant profile → `def_ord_status: 2`
**Priority:** P1
**Confirmed meaning:** Default order status for new items. For Mygenie Dev restaurant, value is `2` (Ready).
**Impact on repeat-item behavior:**
- `def_ord_status = 2 (Ready)` → Repeating an item increments qty on same row (simple behavior)
- `def_ord_status = other value` → Repeating an item creates a new separate row (stage-level tracking)
**Status:** CONFIRMED by user

### Q6: `f_order_status` values 4, 8, and 9
- **Status 4:** OPEN — User will provide definition later.
- **Status 8:** CONFIRMED — **Paid through payment gateway**. NOT "Running/Active" as previously assumed. All 24 takeaway orders in owner@mygeniedev.com have this status. Currently mapped as "running" in F_ORDER_STATUS constant — **needs label correction**.
- **Status 9:** OPEN — Observed on 2 POS/dine-in orders. Needs user clarification. Currently shows as "unknown" (unmapped fallback).
- **`order_type="WalkIn"`:** OPEN — Needs team clarification on whether it's treated differently from "pos". Currently mapped as dineIn.

### Q7: `food_status` on items — CONFIRMED
**Observation:** `food_status` on `orderDetails[]` items maps to the same scale as `f_order_status`:
| food_status | Meaning | OrderCard Display | Item Action |
|---|---|---|---|
| 1 | Preparing | 🟠 Orange dot + "Preparing" | **[Ready]** button (dine-in only) |
| 2 | Ready | 🟢 Green dot + "Ready" | **[Serve]** button (dine-in only) |
| 5 | Served | ✅ Green check + "Served" | **[Cancel]** button (collapsed section, dine-in only) |
**Status:** CONFIRMED by user

### Q8: `order_in` / Source Detection
**Observation:** `order_in` field indicates order source:
- `null` / empty → Own order (POS, scan-and-order, own app)
- `"RM"` → Room order (filtered out for POS Phase 1)
- `"swiggy"` → Swiggy aggregator order (to be confirmed when data exists)
- `"zomato"` → Zomato aggregator order (to be confirmed when data exists)
**Status:** PARTIALLY CONFIRMED — Own and RM confirmed. Swiggy/Zomato values need verification with actual aggregator orders.

### Q9: Waiter Display Rules
**Observation:** `vendorEmployee.f_name` provides the staff member who punched/managed the order.
**Confirmed rules:**
- Shows in OrderCard header center zone for **ALL own order types** (dine-in, takeaway, delivery)
- Does NOT show for aggregator orders (Swiggy/Zomato)
- For scan-and-order dine-in, waiter is the staff member who accepted the order
**Status:** CONFIRMED by user

---

## Running Orders API — Confirmed Behaviors

### B10: `role_name` parameter behavior
**Observation:** The `employee-orders-list` API requires a `role_name` parameter and returns different results based on it:
- `role_name=Owner` → Returns 0 orders (Owner sees nothing??)
- `role_name=Manager` → Returns all running orders (33 in Palm House)
- `role_name=Waiter` → Returns orders assigned to that waiter only

**Rule:** Use `role_name=Manager` for all roles EXCEPT when logged-in user's role is "Waiter" — then use `role_name=Waiter`.
**Status:** CONFIRMED by user

### B11: Room orders (`rtype="RM"`) — SKIP for Phase 1B
**Observation:** Orders with `order_in="RM"` or whose `restaurantTable.rtype="RM"` are room/hotel orders. These have:
- Very large item counts (100+ items per order)
- `associated_order_list` (sub-orders within a room tab)
- `room_info` field
**Rule:** Filter OUT any order where `restaurantTable.rtype === "RM"` or `order_in === "RM"`. Room orders will be mapped in a future phase.
**Status:** CONFIRMED by user — Deferred to Phase 2

### B12: Walk-in / Counter orders (`table_id=0`)
**Observation:** Orders with `table_id=0` have no physical table. These are walk-in customers or counter orders.
**Rule:** Treat as dine-in with a dynamic virtual table. Display with customer name (from `user_name`) or "Walk-in" as the table label.
**Status:** CONFIRMED by user

### B13: `order_type` values
**Observation:** API returns `order_type` as:
- `"pos"` — Punched from POS (most common, includes dine-in)
- `"dinein"` — Direct dine-in order
- Delivery/Takeaway values not observed in Palm House data (restaurant doesn't have these enabled)

**Rule:** Check restaurant settings API for which order channels are enabled (`dine_in`, `delivery`, `take_away`). Only show channels that are enabled.
**Status:** CONFIRMED — Palm House only has dine-in

### B14: No auto-refresh polling needed
**Observation:** User confirmed that auto-refresh/polling of running orders is NOT required for Phase 1B.
**Status:** CONFIRMED by user

### B15: Waiter info from running orders API — UPDATED
**Observation:** `vendorEmployee.f_name` in the running orders response provides the waiter/staff name.
**Updated rule:** Waiter name now displays in OrderCard header (center zone) for ALL own order types. Previously deferred — now implemented.
**Status:** IMPLEMENTED

---

## Undocumented Behaviors Found

### B1: `status` field inconsistency
**Observation:** The `status` field means different things across entities:
- **Categories:** `status` = active/inactive (1/0)
- **Products:** `status` = active/inactive (1/0)
- **Tables:** `status` = active/inactive (1/0), `engage` = occupied (Yes/No)
- **Cancellation Reasons:** `status` = active/inactive (1/0)
- **Restaurant:** `restaurant_status` = 1 (active)

**Impact:** Transform layer handles this correctly. Just noting the inconsistency.

### B1b: `is_disable` vs `stock_out` on Products — clarified
**Observation:** These are two different states:
- `is_disable = 1` → Product is **hidden from POS entirely** (not shown to waiter/customer). UI: dashed border + "Hidden from POS" label.
- `stock_out = 1` → Product is **visible but greyed out** with "Out of Stock" badge (cannot be ordered). UI: greyed card + red badge.
- Both can be toggled independently.
**Status:** RESOLVED — confirmed by user

### B2: Yes/No vs 1/0 inconsistency
**Observation:** Boolean fields use mixed representations:
- Some fields: `"Yes"` / `"No"` strings
- Some fields: `1` / `0` numbers
- Some fields: `"Y"` / `"N"` strings
- Some fields: `true` / `false` booleans

**Impact:** Transform layer's `toBoolean()` helper handles all cases. See `YES_NO_MAP` in constants.

### B3: `category_ids` on user object
**Observation:** The user/employee object contains a `category_ids` array (e.g., `[1138, 4439, 454, ...]`).
**Hypothesis:** This controls which categories a waiter/captain can see and take orders from. For "Owner" role, it contains all categories.
**Impact:** May need to filter menu by these IDs for non-owner roles in Phase 2.

### B4: `image` field URL construction
**Observation:** Product images sometimes contain full URLs, sometimes relative paths. Category images use a different base path (`/storage/category/`) than general images (`/storage/`).
**Impact:** Transform layer handles both cases with `getImageUrl()` / `getProductImageUrl()` / `getCategoryImageUrl()` helpers.

### B5: Restaurant logo URL construction
**Observation:** The restaurant logo field returns a relative filename (e.g., `2025-12-01-692d6b75d92cd.png`) but `getImageUrl()` prepends a base storage URL that may not match the actual image server. The logo shows as a broken image in the Settings → Restaurant Info view.
**Tested URL patterns (all return 404):**
- `https://preprod.mygenie.online/storage/{filename}`
- `https://preprod.mygenie.online/storage/restaurant/{filename}`
- `https://preprod.mygenie.online/storage/app/public/{filename}`
- `https://preprod.mygenie.online/storage/app/public/restaurant/{filename}`
- `https://preprod.mygenie.online/storage/app/public/vendor/{filename}`
- `https://preprod.mygenie.online/public/storage/{filename}`
- `https://preprod.mygenie.online/public/storage/restaurant/{filename}`
- `https://preprod.mygenie.online/storage/uploads/restaurant/{filename}`

**Note:** Product images work because the API returns full URLs (e.g., `https://preprod.mygenie.online/public/assets/admin/img/...`), whereas the restaurant logo only returns a bare filename.
**Impact:** Need backend team to confirm the correct base URL for restaurant logo/cover_photo images.
**Status:** OPEN — Awaiting backend team response

### B6: Discount Types & Printers empty for test account
**Observation:** `restaurant_discount_type` and `restaurant_printer_new` arrays are both empty `[]` for the test account (`owner@18march.com` / restaurant: 18march, ID: 478). The Settings UI correctly shows empty states. However, these features ARE expected to have data for other restaurant accounts.
**Impact:** CRUD UI forms are built and ready. Cannot verify rendering with real data using current test account. Need a test account with discount types and printers configured to validate.
**Status:** OPEN — Awaiting test account with configured discounts/printers

### B5: Pagination uses `offset` as page number
**Observation:** The API uses `offset` parameter but it behaves as a page number (1-indexed), not a traditional offset (skip count).
- `offset=1` = page 1
- `offset=2` = page 2
**Impact:** Transform renames it to `page` for clarity.

### B7: Veg/Non-Veg data classification inconsistency
**Observation:** When applying the "Veg" dietary filter in Order Entry, 45 items are returned — some of which have names containing "chicken" or other non-veg keywords. This suggests some products may have incorrect `veg` classification in the backend database.
**Examples:** Items like "Fried CHICKEN" or chicken-related products appearing under the Veg filter.
**Impact:** Frontend filter logic is correct (`product.isVeg === true` → show). This is a **data quality issue** that needs to be reviewed in the backend/admin panel.
**Status:** OPEN — Backend team to audit product `veg` field values

### B8: `add_ons` raw passthrough (fragile coupling)
**Observation:** The `addOns` field on products is NOT transformed by `productTransform.js` — it is passed through raw from the API (`api.add_ons || []`). The raw API structure `{ id, name, price, status, show_type, veg, ... }` happens to match what `ItemCustomizationModal` expects (`{ id, name, price }`), so it works today.
**Risk:** If the backend ever renames these fields (e.g., `price` → `addon_price`), the customization modal will break silently. Consider adding a transform for add-ons in Phase 2.
**Status:** NOTED — Works for now, should formalize transform in Phase 2

### B9: Variation `required` field uses non-standard `"on"` string
**Observation:** The `required` field on variation groups uses the string `"on"` to indicate required, rather than a boolean `true` or `"Yes"`. The transform converts this: `variation.required === 'on'` → `required: true`.
**Impact:** Handled correctly in transform. Just noting the non-standard representation.
**Status:** RESOLVED — Transform handles it

### B16: TakeAway orders have no customer names
**Observation:** All 24 TakeAway orders in the owner@mygeniedev.com account return `user_name=""` and `user.f_name=""`. Only a phone number (`9714176033`) is present. The frontend correctly defaults to "WC" label for these.
**Impact:** This is a backend data limitation for this specific account. Other restaurants may have customer names populated.
**Status:** CONFIRMED — Not a frontend bug

### B17: Dine-in can come from scan-and-order
**Observation:** Dine-in orders are NOT limited to POS-punched. Customers can scan a QR code at the table and place orders directly.
**Impact:** Dine-in orders from scan-and-order need an order-level **[Accept]** action (same as online orders from Swiggy/Zomato). The OrderCard handles this via `isYetToConfirm` check (f_order_status=7).
**Status:** CONFIRMED by user

### B18: Item-level actions are dine-in only
**Observation:** User confirmed:
- **Dine-in:** Item-level status display + actions (Preparing→[Ready], Ready→[Serve], Served→[Cancel] in collapsed section)
- **TakeAway:** Items listed for reference only, NO individual actions
- **Delivery:** Items listed for reference only, NO individual actions
**Status:** CONFIRMED by user

### B19: Order-level Accept action
**Observation:** Accept is an **order-level** action, not item-level. It appears when a new order arrives from any online channel:
- Scan-and-order (dine-in)
- Swiggy/Zomato (takeaway/delivery)
- Own online app orders
Staff clicks Accept to confirm the entire order.
**Status:** CONFIRMED by user

### B20: Delivery card extra features
**Observation:** Delivery orders have 2 additional features depending on source:
| Source | Extra Feature |
|---|---|
| Swiggy/Zomato | **Rider details** — name, phone, status (from aggregator API) |
| Own delivery | **Address details** — shown on click of 📍 icon in header (popup, not inline) |
**Status:** CONFIRMED by user

### B21: `configuration` restaurant field
**Observation:** Restaurant profile has `configuration: "Simple"`. User initially referenced this as controlling repeat-item row behavior but then corrected — `def_ord_status` is the relevant field, not `configuration`.
**Status:** CLARIFIED — `configuration` is a separate restaurant config type, unrelated to item row behavior

---

## API Response Sample Sizes

| Endpoint | Sample Count | Notes |
|---|---|---|
| Profile permissions | 50 | Owner has all permissions |
| Categories | 30 | Active categories (18march) |
| Products | 144 | All products (limit=500, 18march) |
| Tables | Varies | Tables only (rooms filtered out) |
| Cancellation Reasons | 2 | Active reasons |
| Popular Food | Varies | Sorted by order_count |
| **Running Orders** | **30** | **owner@mygeniedev.com: 24 take_away (f_status=8), 5 pos (f_status=5,9), 1 WalkIn (f_status=9)** |

---

## Restaurant Feature Flags (from profile)

| Feature | API Field | Value (test account) | Notes |
|---|---|---|---|
| Dine In | `dine_in` | `"Yes"` | Enabled |
| Delivery | `delivery` | `True` | Enabled (note: boolean, not string) |
| Takeaway | `take_away` | `True` | Enabled |
| Room | `room` | `"Yes"` | Enabled |
| Inventory | `inventory` | `"Yes"` | Enabled |
| Tip | `tip` | `"Yes"` | Enabled |
| Service Charge | `service_charge` | `"Yes"` | Enabled |
| Loyalty | `is_loyality` | `"Yes"` | Note: typo in API field name |
| Coupon | settings → `is_coupon` | `"Yes"` | Nested under settings |

---

## Status Field Clarifications

### Q10: Order Status vs Food Status vs F_Order_Status — NEEDS CLARIFICATION

**Observation:** There are multiple "status" fields causing confusion:

| Field | Level | Description | Values |
|-------|-------|-------------|--------|
| `order_status` | Order | Lifecycle stage of the entire order | `"queue"` (active), `"delivered"` (completed) |
| `f_order_status` | Order | Food preparation status for the order | 1-9 (see Q1 above) |
| `food_status` | Item | Individual item preparation status | 1-7 (same scale as f_order_status) |
| `b_order_status` | Order | Bar station status | Deferred to Phase 1C |
| `k_order_status` | Order | Kitchen station status | Deferred to Phase 1C |

**Key Differences:**
- `order_status` = Is the order active or completed? (queue vs delivered)
- `f_order_status` = What's the overall food status? (preparing, ready, served, paid)
- `food_status` = What's THIS item's status? (each item can be at different stage)

**Open Questions:**
1. When does `order_status` change from `"queue"` to `"delivered"`? After payment? After all items served?
2. Can `f_order_status` and `food_status` values differ? (e.g., order is "Ready" but some items still "Preparing")?
3. How do `b_order_status` and `k_order_status` interact with `f_order_status`?

**Status:** NEEDS CLARIFICATION from backend team

---

### Q11: Default Configuration (`def_ord_status` and `configuration`) — NEEDS CLARIFICATION

**Observation:** Two restaurant fields control order/item behavior:

| Field | Sample Value | Purpose |
|-------|--------------|---------|
| `def_ord_status` | `2` | Default status for new items |
| `configuration` | `"Simple"` | Restaurant configuration type |

**`def_ord_status` Values (Hypothesis):**
| Value | Label | Behavior |
|-------|-------|----------|
| 1 | Preparing | Items start as "Preparing", need manual Ready → Serve flow |
| 2 | Ready | Items start as "Ready", simpler flow (current Mygenie Dev setting) |
| 5 | Served | Items auto-marked served? (needs confirmation) |

**`configuration` Values (Hypothesis):**
| Value | Description |
|-------|-------------|
| `"Simple"` | Basic flow: Order → Ready → Serve → Bill → Pay |
| `"Kitchen"` | Kitchen display integration with station-level tracking |
| `"Full"` | Full workflow with KDS + Bar + Kitchen stations |

**Impact on UI:**
- `def_ord_status = 2 (Ready)` → Repeat item = increment qty on same row
- `def_ord_status = 1 (Preparing)` → Repeat item = new row (for stage tracking)
- `configuration = "Simple"` → Hide KDS/station-level status columns?

**Open Questions:**
1. What are all possible values for `configuration`?
2. How does `configuration` affect the UI workflow?
3. Does `configuration` affect which status fields are used?

**Status:** NEEDS CLARIFICATION from backend team

---

## Parked Changes — Pending Clarification

### P1: CHG-007 — Status 9 Impact on Orders List (PARKED)
**Context:** f_order_status = 9 is a scheduled order. In table view it should show as:
- Dine-in → `reserved` table card (amber border, Seat button)
- TakeAway/Delivery → virtual "Scheduled" card

**Why Parked:**
Adding `9: 'scheduled'` to the shared `F_ORDER_STATUS` constant would also change `order.status` for status 9 orders in the order view (OrderCard). Need to confirm:

1. Does the `employee-orders-list` API return status 9 (scheduled) orders at all? (If `order_status = 'queue'` filter excludes them, there is no clash)
2. If status 9 orders DO appear in the orders list — what should the OrderCard show for them?
3. Safe implementation path confirmed: handle status 9 directly in `mapTableStatus()` only (bypassing shared `F_ORDER_STATUS`) to guarantee zero impact on order view.

**Test Required:** Login with an account that has a scheduled order (f_order_status=9) and verify:
- Does it appear in the running orders list?
- Does it appear as a table card?

**Status:** OPEN — Test with real scheduled order data before implementing

---

## Next Steps

### Phase 1C — Table Operations & Order Management

| # | Feature | API Required | UI Status |
|---|---------|--------------|-----------|
| 1 | Merge Table | `POST /api/v1/vendoremployee/pos/merge-tables` | ✅ Modal built |
| 2 | Shift Table | `POST /api/v1/vendoremployee/pos/shift-table` | ✅ Modal built |
| 3 | Food Transfer | `POST /api/v1/vendoremployee/pos/transfer-item` | ✅ Modal built |
| 4 | Cancel Item | `POST /api/v1/vendoremployee/pos/cancel-item` | ✅ Modal built (with qty selector) |
| 5 | Cancel Order | `POST /api/v1/vendoremployee/pos/cancel-order` | ❌ Modal needed |
| 6 | Add Out of Menu Item | `POST /api/v1/vendoremployee/pos/add-custom-item` | ❌ UI needed |

**Expected API Payloads:**

**Merge Table:**
```json
{
  "primary_table_id": 123,
  "merge_table_ids": [124, 125],
  "order_id": 456
}
```

**Shift Table:**
```json
{
  "from_table_id": 123,
  "to_table_id": 124,
  "order_id": 456
}
```

**Transfer Food:**
```json
{
  "item_id": 789,
  "from_order_id": 456,
  "to_order_id": 457,
  "quantity": 1,
  "switch_notes": true
}
```

**Cancel Item:**
```json
{
  "order_id": 456,
  "item_id": 789,
  "cancel_quantity": 1,
  "reason_id": 1,
  "notes": "Customer request"
}
```

**Cancel Order:**
```json
{
  "order_id": 456,
  "reason_id": 1,
  "notes": "Customer left"
}
```

**Add Out of Menu Item:**
```json
{
  "order_id": 456,
  "item_name": "Special Request Dish",
  "price": 250,
  "quantity": 1,
  "notes": "No onions"
}
```

---

### Other Pending Items
### Other Pending Items
1. ~~Implement Phase 1B: Build orderService.js, orderTransform.js, OrderContext.jsx for running orders~~ DONE
2. Confirm `f_order_status` values 4 and 9 from user (Q6) — **Status 8 confirmed as "paid via gateway"**
3. ~~Confirm order_status field purpose~~ DONE (Q2)
4. Get correct base URL for restaurant logo images (B5)
5. Audit product `veg` field values for data quality (B7)
6. Test with non-owner role accounts to verify permission gating
7. Formalize `add_ons` transform in Phase 2 to avoid fragile raw passthrough (B8)
8. ~~Provide APIs for Merge Table, Shift Table, and Transfer Food operations~~ → **Phase 1C**
9. ~~Phase 1C: Map `b_order_status` and `k_order_status` station-level statuses~~ → **Deferred**
10. Phase 2: Map room orders (`rtype="RM"`) with `associated_order_list` and `room_info`
11. Fix f_order_status=8 label from "running" to correct label (e.g., "Paid Online")
12. Verify Swiggy/Zomato `order_in` values with actual aggregator order data (Q8)
13. Implement POST APIs for item-level actions (Ready, Serve, Cancel) — currently console.log only
14. Implement POST API for order-level Accept/Reject — currently console.log only
15. **Clarify Q10: Order Status vs Food Status vs F_Order_Status differences**
16. **Clarify Q11: `def_ord_status` and `configuration` values and their impact**


---

## B33: 403 refreshOrders Disabled — Phase 3 Sockets Will Handle
**File:** `src/components/order-entry/OrderEntry.jsx` (line ~305)
**Context:** Previously, a 403 error on Place Order triggered `refreshOrders()` to recover from stale state conflicts (e.g., another employee already placed an order on that table).

**Change:** Commented out the `refreshOrders()` call inside the 403 handler. The toast still shows the error message.

**Why:** Phase 3 sockets will provide real-time state sync, making manual context refreshes unnecessary. Currently NO action in the app (place, update, collect) triggers a context refresh on success — only the manual refresh button does.

**⚠️ RISK:** If 403 stale-state conflicts become frequent before sockets are live, re-enable the refresh at the marked comment (`⚠️ DISABLED (Phase 3 — B33)`).

**Status:** DISABLED — re-enable if issues arise before Phase 3 sockets

---

## B25: `isActive` vs `isDisabled` — Product Visibility in POS

**Context:** Two separate boolean fields control product visibility in POS order entry:

| Field | API Field | Value | Meaning | POS Behavior |
|---|---|---|---|---|
| `isActive` | `status` | `1`=active, `0`=inactive | Product lifecycle enabled by admin | Only `status=1` products loaded at all |
| `isDisabled` | `is_disable` | `Y/1`=hidden | Active but hidden from POS (waiter cannot see) | Shown in Menu Mgmt with "Hidden from POS" label, NOT in order screen |

**Combined filter for order screen:** `isActive && !isDisabled`

**Note:** `isDisabled` is different from `stock_out` — stock_out shows item as greyed/unavailable, is_disable hides it entirely.

**Status:** CONFIRMED (see B1b)

---

## B26: `food_for` — POS Menu Type Filter

**Context:** Products have a `food_for` field that indicates which menu they belong to.

| `food_for` | Meaning | Phase 1/2 POS |
|---|---|---|
| `"Normal"` | Regular à la carte menu | ✅ Show |
| `"Buffet"` | Buffet menu items | ❌ Hide |
| `"HappyHour"` | Happy hour menu | ❌ Hide |

**Current Rule:** Only `food_for === "Normal"` products are loaded into `MenuContext.products`.
Applied at `productTransform.fromAPI.productList()` — affects ALL consumers (POS, Menu Management, suggestions).

**Phase 3:** Multiple menu support — users will be able to switch between Normal/Buffet/HappyHour menus. `food_for` filter will become dynamic.

**Add Out of Menu Item Rule:** Cannot add an item with the same name as an existing Normal menu item (same `food_for` = same namespace, no duplicates).

**Status:** IMPLEMENTED — filter added to productTransform


---

## B24: Real-time Socket + get-single-order-new — PARKED

**Context:** Backend has a `POST /api/v2/vendoremployee/get-single-order-new` endpoint that returns fresh data for a single order (same structure as `employee-orders-list`). A socket fires an event with `order_id` whenever an order is updated.

**Planned Flow:**
```
Socket event { order_id } → getSingleOrder(order_id) → updateSingleOrder(fresh) → UI refreshes
```

**What needs to be built:**
1. `orderService.getSingleOrder(orderId)` — calls `get-single-order-new`, reuses `fromAPI.order()` transform
2. `OrderContext.updateSingleOrder(freshOrder)` — replaces specific order in array
3. Socket listener — connects on login, fires `updateSingleOrder` on each event

**Socket technology:** Not yet confirmed — likely Firebase FCM (`firebase_token` + `zone_wise_topic` in auth response) or Pusher/Laravel Echo. Need backend team to share channel name + event name.

**Solves:** B22 (stale data after table ops), real-time item status, real-time table occupancy

**Status:** PARKED — implement after socket technology confirmed


---

## B23: Merge Table — Why We Use OrderContext Instead of `engage` Status

**Context:** For Shift Table, we call `GET /all-table-list` fresh and filter by `engage=No` to show free tables. For Merge Table, we do NOT use `engage` status from the table list API.

**Why NOT `engage` for Merge:**
The Merge Table API (`POST /api/v2/vendoremployee/transfer-order`) requires `target_order_id` — the **order ID** of the destination table. The `all-table-list` API only returns table configuration (`engage=Yes/No`) but **does NOT return order IDs**.

To get `target_order_id`, we must know which order is running on the target table. This data is already loaded in `OrderContext` (`orders` array, each with `tableId` and `orderId`).

**Decision:** For Merge Table modal, show tables that have a matching entry in `OrderContext` (i.e., tables with a running order), excluding the current table. No additional API call needed.

```js
// How target_order_id is resolved
const targetOrder = orders.find(o => o.tableId === selectedTable.tableId);
const target_order_id = targetOrder?.orderId;
```

**Why this is safe:**
- `OrderContext` is loaded fresh at login
- It reflects the actual running orders at that point in time
- In a multi-user scenario, stale data risk exists (see B22) — same refresh strategy applies after merge

**Status:** CONFIRMED — design decision logged


---

## B22: Get Single Order API After Table Activity — NEEDS CLARIFICATION

**Context:** Phase 1C table operations (Shift, Merge, Transfer Food, Cancel Item, Cancel Order) all POST to the backend and return a simple success message. After these operations, the frontend currently has **stale order data** in `OrderContext`.

**Question:**
After performing any table operation (shift, merge, transfer, cancel), should the frontend:

**Option A — Call `GET single order` API**
- Fetch the updated order by `order_id` to refresh only that order in context
- Requires a dedicated endpoint like `GET /api/v1/vendoremployee/pos/order/{order_id}`
- More efficient — only refreshes the affected order

**Option B — Re-fetch all running orders**
- Call `GET /api/v1/vendoremployee/pos/employee-orders-list` again
- Refreshes entire orders list
- Simpler but heavier — refetches all orders

**Option C — No refresh (user manually refreshes)**
- Accept stale data until user navigates away and back
- Simplest but poor UX in multi-user scenario

**Impact:** Affects UX after every Phase 1C operation. In a multi-user POS environment, stale data can cause incorrect table status display.

**Priority:** P0 — must be resolved before Phase 1C operations go live

**Current workaround:** User must re-login to see updated table state after a shift.

**Status:** OPEN — awaiting backend team response on available endpoint and recommended approach

---

## B27: place-order-and-payment — Missing Fields Discovery (Sprint 3)

**Context:** The original `place-order-and-payment` curl example had minimal fields. During testing, the API returned sequential 500 errors revealing 15+ required fields not in the documentation.

**Discovered Fields (ORDER LEVEL — not cart items):**
- `vat_tax`, `gst_tax`, `service_tax`, `service_gst_tax_amount`
- `discount`, `discount_type`, `restaurant_discount_amount`, `order_discount`
- `comunity_discount`, `discount_value` (NOTE: "comunity" typo in DB)
- `tip_amount`, `tip_tax_amount`, `round_up`
- `order_sub_total_amount`, `order_total_tax_amount`

**Critical:** `vat_tax` must be at ORDER level — NOT inside cart items array.

**Status:** RESOLVED — all fields added to `toAPI.collectBill()` transform

---

## B28: order-bill-payment — Missing Discount Fields (Sprint 3)

**Context:** `order-bill-payment` (Clear Bill) original curl did not include discount fields. SQL error revealed they are required (cannot be null).

**Required fields not in original docs:**
- `restaurant_discount_amount` — manual discount ₹ amount (flat result of % or flat discount)
- `order_discount` — discount percentage value (e.g., 5 for 5%)
- `comunity_discount` — community/preset discount ₹ amount
- `discount_value` — total flat discount ₹ amount

**Mapping confirmed:**
- `discount_value` = actual flat rupee amount (user confirmed)
- `order_discount` = percentage value entered (0 if flat mode)
- `restaurant_discount_amount` = calculated ₹ discount
- `comunity_discount` = ₹ from restaurant preset discount types

**Status:** RESOLVED — all fields added to `toAPI.clearBill()` transform

---

## B32: Duplicate Records in `all-table-list` API Response — NEEDS BACKEND FIX

**Endpoint:** `GET /api/v1/vendoremployee/all-table-list`
**Account:** `owner@18march.com` (restaurant 18march, ID: 478)

**Observation:** The API returns **duplicate records** with identical `id`. Confirmed on 2026-03-29:
```
id=4751  table_no=1  rtype=TB  title=in  ← appears TWICE in the response
```

Total records returned: 15, but only 14 are unique (id=4751 is duplicated).

**Impact:**
- React `key` collision causes rendering bugs (ghost elements, UI accumulation on re-renders)
- Frontend now deduplicates by `id` in `tableTransform.js → fromAPI.tableList()` as a defensive measure

**Root cause:** Unknown — likely a database-level duplicate or a JOIN producing extra rows.

**Action needed from backend team:**
1. Investigate why `id=4751` appears twice in the response
2. Fix the query or data to prevent duplicate records
3. Verify other restaurant accounts are not affected

**Status:** OPEN — Frontend workaround applied, awaiting backend fix

---

## B29: Discount UI Modes (Sprint 3)

**Discount UI has 3 modes:**
1. **% (percentage):** user enters %, frontend calculates ₹ amount → `discount_type: "percent"`, `order_discount: %`, `discount_value: ₹ amount`
2. **₹ (flat):** user enters ₹ directly → `discount_type: "flat"`, `order_discount: 0`, `discount_value: ₹ amount`
3. **Community/preset:** fixed % from restaurant discount types backend → `comunity_discount: ₹ amount`

**Status:** CONFIRMED

---

## B30: Payment Mode Mapping — UI vs API (Sprint 3)

| UI Label | API `payment_mode` | Extra fields |
|---|---|---|
| Cash | `cash` | none |
| Card | `card` | `transaction_id` |
| UPI | `upi` | `transaction_id` |
| Credit | `TAB` | `mobile` or `email` |
| Split | `partial` | `partial_payments[]` |

**Status:** CONFIRMED by user

---

## B31: Two Collect Bill Scenarios (Sprint 3)

**Decision logic in `OrderEntry.handlePaymentComplete`:**
- `placedOrderId` exists → Scenario 1 → `POST /order-bill-payment` (collect on existing order)
- `placedOrderId` is null → Scenario 2 → `POST /place-order-and-payment` (create order + pay)

**CollectPaymentPanel bill data:**
- Scenario 1: calculated locally from cart items (existing order's placed items)
- Scenario 2: calculated locally from unplaced cart items
- NOT fetching from `get-single-order-new` (Phase 3 via socket)

**Status:** CONFIRMED — both flows implemented and tested


---

## Phase 4A: Order Reports — Backend Gaps Summary

> Full details: [ORDER_REPORT_CLARIFICATIONS.md](./ORDER_REPORT_CLARIFICATIONS.md)

> **Frontend Status:** COMPLETE — All UI, filtering, export, gap detection implemented.


### P0 — Blocking Report Filters
1. **GAP-001:** Add `channel` field (dinein/takeaway/delivery/room) to `paid-order-list`, `paid-in-tab-order-list`, `paid-paylater-order-list`
2. **GAP-002:** Add `platform` field (pos/web) to same endpoints
3. **ISSUE-001:** `paid-paylater-order-list` returns identical data as `paid-order-list` — endpoint not filtering correctly

### P1 — Data Quality
4. **GAP-003:** Split `order_type` into separate `channel` + `platform` fields (currently mixes both)
5. **INCONSISTENCY-003:** Enrich `paid-in-tab-order-list` with: table_no, employee_id, payment_type, tip_amount

### P2 — Cleanup
6. **ISSUE-003:** Normalize `order_status` typo ("deliverd" → "delivered")
7. Fix API field typos: `order_plateform`, `aggrigator_id`, `aggrator_ref_id`

### Report Endpoints Inventory:
| Endpoint | Tab | Status |
|---|---|---|
| `paid-order-list` | Paid + Room Transfer | Working (missing channel/platform) |
| `cancel-order-list` | Cancelled + Merged | Working (richest) |
| `paid-in-tab-order-list` | Credit | Working (leanest, missing fields) |
| `paid-paylater-order-list` | On Hold | Bug: returns same as Paid |
| `urbanpiper/get-complete-order-list` | Aggregator | Working (different nested structure) |
| `employee-order-details?order_id=X` | Detail drill-down | Working (108+ fields) |
