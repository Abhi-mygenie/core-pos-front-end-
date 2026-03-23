# Backend Clarifications & Open Questions

> Last Updated: 2026-03-23
> Status: Phase 1 Part B — Running orders API analyzed with Palm House restaurant data

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
**Source:** Restaurant profile → `def_ord_status: 1`
**Priority:** P2
What does this field control? Is it the default status assigned to new orders?

### Q6: `f_order_status` values 4, 8, and 9
- **Status 4:** OPEN — User will provide definition later.
- **Status 8:** CORRECTED — NOT "Running/Active" as previously assumed. Per user: **status 8 = Paid through payment gateway**. All 24 takeaway orders in the owner@mygeniedev.com account have this status. Needs further discussion with user on how to display these. Previously mapped as "running" in F_ORDER_STATUS constant — **needs correction**.
- **Status 9:** OPEN — Observed on 2 POS/dine-in orders. Needs team clarification. Currently shows as "unknown" (unmapped fallback). To be discussed with user.
- **`order_type="WalkIn"`:** OPEN — Needs team clarification on whether it's treated differently from "pos". Currently mapped as dineIn.

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

### B15: Waiter info NOT from running orders API
**Observation:** While `waiter_id` and `restaurantTable.waiter` fields exist in the response, user confirmed that waiter name display on table cards will come from a separate source/API in a future phase. Skip waiter display for now.
**Status:** CONFIRMED by user

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

## Next Steps
1. Implement Phase 1B: Build `orderService.js`, `orderTransform.js`, `OrderContext.jsx` for running orders
2. Confirm `f_order_status` values 4 and 8 from user (Q6)
3. Confirm `order_status` field purpose if relevant (Q2)
4. Get correct base URL for restaurant logo images (B5)
5. Audit product `veg` field values for data quality (B7)
6. Test with non-owner role accounts to verify permission gating
7. Formalize `add_ons` transform in Phase 2 to avoid fragile raw passthrough (B8)
8. Provide APIs for Merge Table, Shift Table, and Transfer Food operations (UI already built)
9. Phase 1C: Map `b_order_status` and `k_order_status` station-level statuses
10. Phase 2: Map room orders (`rtype="RM"`) with `associated_order_list` and `room_info`
