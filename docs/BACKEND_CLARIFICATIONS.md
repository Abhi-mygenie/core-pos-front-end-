# Backend Clarifications & Open Questions

> Last Updated: 2026-03-23
> Status: Tracking open questions, answered items, and undocumented behaviors

---

## Open Questions (Pending)

### Q1: Order Status Values — `food_status` (1-5)
**Endpoint:** `GET /api/v1/vendoremployee/pos/employee-orders-list`
**Priority:** P1 (Blocks Phase 1 Part B — Dashboard Order Cards)

What do `food_status` values 1 through 5 mean?

| Value | Likely Meaning | Confirmed? |
|---|---|---|
| 1 | Confirmed / New | No |
| 2 | Preparing / Cooking | No |
| 3 | Ready | No |
| 4 | Served | No |
| 5 | Cancelled? / Completed? | No |

**Action needed:** Backend team to confirm mapping.

---

### Q2: Order Status Values — `order_status`
**Endpoint:** `GET /api/v1/vendoremployee/pos/employee-orders-list`
**Priority:** P1

What are the possible values and meanings for `order_status`?

| Value | Likely Meaning | Confirmed? |
|---|---|---|
| ? | Pending | No |
| ? | Confirmed | No |
| ? | Completed | No |
| ? | Cancelled | No |

---

### Q3: Station-specific Order Status — `f_order_status`, `b_order_status`, `k_order_status`
**Endpoint:** `GET /api/v1/vendoremployee/pos/employee-orders-list`
**Priority:** P2

What do these three fields represent?
- `f_order_status` — Food order status?
- `b_order_status` — Bar order status?
- `k_order_status` — Kitchen order status?

What are their possible values and how do they relate to `food_status`?

---

### Q4: "BILL READY" and "PAID" Status Identification
**Priority:** P1

How to determine when an order is in "BILL READY" state vs "PAID" state from the API response?

| Status | Identified by | Confirmed? |
|---|---|---|
| BILL READY | `food_status === ?` and/or `order_status === ?` | No |
| PAID | `order_status === ?` or separate `payment_status` field? | No |

---

### Q5: `def_ord_status` Restaurant Field
**Source:** Restaurant profile → `def_ord_status: 1`
**Priority:** P2

What does this field control? Is it the default status assigned to new orders?

---

## Answered / Resolved

*(None yet — will be populated as answers come in)*

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

---

## API Response Sample Sizes (from test account)

| Endpoint | Sample Count | Notes |
|---|---|---|
| Profile permissions | 50 | Owner has all permissions |
| Categories | 30 | Active categories |
| Products | 144 | All products (limit=500) |
| Tables | Varies | Tables only (rooms filtered out) |
| Cancellation Reasons | 2 | Active reasons |
| Popular Food | Varies | Sorted by order_count |

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
1. Get answers to Q1-Q4 from backend team before starting Phase 1 Part B
2. Get correct base URL for restaurant logo images (B5)
3. Audit product `veg` field values for data quality (B7)
4. Test with non-owner role accounts to verify permission gating
5. Formalize `add_ons` transform in Phase 2 to avoid fragile raw passthrough (B8)
6. Document the Running Orders API response once available
7. Provide APIs for Merge Table, Shift Table, and Transfer Food operations (UI already built)
