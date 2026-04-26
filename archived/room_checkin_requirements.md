# Room Check-In — Requirements (User Input Log)

> This document logs only the requirements/inputs provided by the user. No analysis, no interpretation, no code references, no recommendations.

---

## A. Configuration Types (as stated by user)

The user stated: **"we have 3 types of configuration"**.

Only **2 configurations were described in this session**. The third configuration was **not provided** and is pending from the user.

| # | Configuration | Status |
|---|---------------|--------|
| 1 | Basic Configuration | Described (see §B) |
| 2 | Document Configuration | Described (see §C) |
| 3 | *(name not provided)* | **Pending — user to provide** |

The user also specified: **"keep the current 3-column structure in mind"** when reworking the layout.

---

## B. Configuration 1 — Basic Configuration

### Fields to be shown
- Guest Name
- Phone Number
- Email ID
- Check-in Date
- Check-out Date

### Field rules stated by user
- **Guest Name** — mandatory
- **Phone Number** — mandatory
- **Email ID** — optional
- **Check-in Date** — part of this configuration
- **Check-out Date** — part of this configuration

---

## C. Configuration 2 — Document Configuration

### Additional fields to be captured
- Total number of adults
- Total number of children

### Dynamic behaviour stated by user
- When the user selects a number of adults (example given: **2 adults**), the UI should **dynamically render document-capture fields for each adult**.
- For **each adult**, the system should capture:
  - Name
  - Document Type
  - Document Front
  - Document Back
- This section must be **rendered dynamically based on the number of adults selected**.

### Layout instruction
- The 3-column structure of the current screen must be retained while reworking the fields.

---

## D. Configuration 3 — *(Pending)*

- Name: not provided.
- Fields: not provided.
- Rules: not provided.
- Layout: not provided.

**Awaiting user input.**

---

## E. API Reference Provided by User

Endpoint:
```
POST https://preprod.mygenie.online/api/v1/vendoremployee/pos/user-group-check-in
```

Headers:
- `Authorization: Bearer <token>`
- `X-localization: en`

Request type (from user's cURL): **multipart/form-data**

### Form fields logged from the user's cURL (verbatim)

| Field | Example value in cURL |
|-------|-----------------------|
| `name` | `Parth` |
| `phone` | `9696759718` |
| `email` | `parth.koley@mygenie.online` |
| `advance_payment` | `10000` |
| `balance_payment` | `40000.0` |
| `checkin_date` | `2026-04-23 12:00:00` |
| `checkout_date` | `2026-04-30 12:00:00` |
| `booking_details` | `` (empty) |
| `booking_type` | `WalkIn` |
| `room_price` | `50000` |
| `order_amount` | `50000` |
| `order_note` | `THis is room checkin.` |
| `id_type` | `License` |
| `total_adult` | `1` |
| `total_children` | `0` |
| `name2` | `` (empty) |
| `id_type2` | `` (empty) |
| `name3` | `` (empty) |
| `id_type3` | `` (empty) |
| `name4` | `` (empty) |
| `id_type4` | `` (empty) |
| `children_name` | `` (empty) |
| `gst_tax` | `0.00` |
| `firm_name` | `` (empty) |
| `firm_gst` | `` (empty) |
| `booking_for` | `Individual` |
| `room_id[0]` | `5954` |
| `front_image_file` | file upload (`@/path/to/file`) |
| `back_image_file` | file upload (`@/path/to/file`) |

### Notes on field groupings inferred from field names in user's cURL (user-provided data only)

- **Primary adult fields**: `name`, `id_type`, `front_image_file`, `back_image_file`
- **Additional adult slots (up to 4 total)**: `name2`/`id_type2`, `name3`/`id_type3`, `name4`/`id_type4` *(empty in user's example)*
- **Children field**: `children_name`
- **Stay dates (datetime format)**: `checkin_date`, `checkout_date` — sent as `YYYY-MM-DD HH:mm:ss`
- **Room selection**: `room_id[0]`, `room_id[1]`, … (PHP bracket array)
- **Payment**: `advance_payment`, `balance_payment`, `order_amount`, `room_price`, `gst_tax`
- **Booking**: `booking_type`, `booking_for` (example value: `Individual`), `booking_details`, `order_note`
- **Firm / GST (optional block)**: `firm_name`, `firm_gst`
- **Counts**: `total_adult`, `total_children`

---

## F. Open Items (awaiting user)

1. Name + field list + rules for **Configuration 3**.
2. Confirmation of the **maximum number of adult slots** (cURL shows `name` + `name2` + `name3` + `name4` → up to 4). User has not explicitly confirmed whether the dynamic adult section is capped at 4.
3. Confirmation of whether **children** capture requires individual rows or a single `children_name` field (cURL shows only one `children_name`).
4. Whether **room selection, payment block, GST/firm block, and order note** belong to Configuration 1, Configuration 2, or Configuration 3 — not specified by user.
5. Whether `checkin_date` / `checkout_date` should be **date-only** (as in the current UI) or **date + time** (as in the new cURL: `YYYY-MM-DD HH:mm:ss`).
6. Allowed values for `id_type` (cURL shows `License`; current UI enum is different).
7. Allowed values for `booking_for` (cURL shows `Individual`; current UI enum is different).

---

*Document created strictly from user-provided inputs in the current session. No assumptions added.*
