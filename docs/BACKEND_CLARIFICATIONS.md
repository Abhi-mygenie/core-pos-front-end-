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
**Observation:** The restaurant logo field returns a relative filename (e.g., `2025-12-01-692d50d9332d8.png`) but `getImageUrl()` prepends a base storage URL that may not match the actual image server. The logo shows as a broken image in the Settings → Restaurant Info view.
**Impact:** Need to confirm the correct base URL for restaurant logo/cover_photo images from the backend team.
**Status:** OPEN

### B5: Pagination uses `offset` as page number
**Observation:** The API uses `offset` parameter but it behaves as a page number (1-indexed), not a traditional offset (skip count).
- `offset=1` = page 1
- `offset=2` = page 2
**Impact:** Transform renames it to `page` for clarity.

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
2. Test with non-owner role accounts to verify permission gating
3. Document the Running Orders API response once available
