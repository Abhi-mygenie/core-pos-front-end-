# Room Module — Requirements V2

> **Status:** Final, implementation-ready.
> **Supersedes:** Earlier internal implementation requirements doc (now stale — do not reference).
> **Authoritative sources used:** PO requirements log (`/app/memory/room_checkin_requirements.md`) + clarified Q&A (`/app/memory/room_module_open_questions_answered.md`) + revised cURL provided by PO + current codebase (observation only).
> **Conflict-resolution rule:** Where any older statement conflicts with the latest clarified Q&A, the **latest Q&A wins** (per PO directive).

---

## Table of Contents
1. [Business Overview](#1-business-overview)
2. [End-to-End User Flow](#2-end-to-end-user-flow)
3. [Configuration-Based Behaviour](#3-configuration-based-behaviour)
4. [Dynamic Guest Handling (Adults / Children)](#4-dynamic-guest-handling-adults--children)
5. [UI Field Matrix](#5-ui-field-matrix)
6. [Document Upload Rules](#6-document-upload-rules)
7. [Payment & Booking Logic](#7-payment--booking-logic)
8. [API Requirements](#8-api-requirements)
9. [Code vs Requirement Gap (Observations)](#9-code-vs-requirement-gap-observations)
10. [Edge Cases](#10-edge-cases)
11. [Risks / Assumptions / Clarifications Required](#11-risks--assumptions--clarifications-required)
12. [Final Implementation Checklist](#12-final-implementation-checklist)

---

## 1. Business Overview

### 1.1 Purpose
The Room Module enables a logged-in vendor employee (POS operator) to perform a **group room check-in** — checking one or more guests into one or more available rooms in a single submit. The module is part of the broader POS system used by hospitality outlets running on the Mygenie platform.

### 1.2 Users
- **POS Operator (vendor employee)** — performs check-ins from the POS dashboard. No special role permission is required (any authenticated POS user can check in).

### 1.3 Outcome
- A successful check-in transitions the selected room(s) on the dashboard from `available` → `occupied`.
- Guest details, document images, booking metadata, and advance/balance payments are recorded against the booking on the backend.
- A successful response is acknowledged by a confirmation toast (no extra IDs returned).

### 1.4 Business Rules (top-level)
- A check-in always covers **one or more rooms in a single submit** ("group check-in").
- The form **adapts** based on two flags from the restaurant Profile (`guest_details`, `booking_details`). Layout is **not** driven by the legacy `restaurants[].configuration` value.
- Pricing is **operator-entered** (no auto-calculation from `room_price × nights`).
- Documents (front/back ID images) are required for the **primary guest** and for **every additional adult** (front mandatory, back optional). Children require name only — no documents.
- GST / Firm block applies only when the restaurant has GST enabled and the booking is **Corporate**.

---

## 2. End-to-End User Flow

```
DashboardPage
   │
   │ Operator clicks an "available" room card
   ▼
RoomCheckInModal (overlay)
   │
   │ 1. Header: room label, back arrow, X-close
   │ 2. Select-Rooms chip strip (allows multi-room selection)
   │ 3. 3-column form (Guest | Verification | Booking & Payment)
   │ 4. Sticky footer: Cancel + Check In (n)
   │
   │ Operator fills fields driven by Profile flags
   │ ── adds extra adult rows dynamically (cap = 4 × rooms_selected)
   │ ── adds child name rows dynamically
   │ ── attaches ID images (compressed in-browser to ≤ 5 MB)
   │ ── enters advance payment, room price, order amount
   │
   │ Operator clicks "Check In (n)"
   ▼
Validation Engine
   │ ── Inline errors block submit on per-field violations
   │ ── Toast error for top-level missing required fields
   ▼
roomService.checkIn  ──► POST {API_BASE}/api/v1/vendoremployee/pos/user-group-check-in
                          (multipart/form-data)
   │
   ├── 2xx Success      → toast "Group check-in completed successfully" + close modal
   │                      (dashboard refresh follows existing behaviour)
   │
   ├── 409 Conflict     → toast "This room was just taken by another operator…"
   │                      + auto-close modal
   │
   └── Other failure    → toast with backend error message; modal stays open;
                          form values preserved

User-attempted dirty-form Cancel/Close   → confirmation prompt
Browser navigation away with dirty form  → confirmation prompt
```

---

## 3. Configuration-Based Behaviour

### 3.1 Source of layout truth
Layout, field visibility, and section visibility are driven **entirely** by **two Profile flags** read from `restaurants[0]`:

| Profile flag | Type | Effect when `"Yes"` |
|--------------|------|---------------------|
| `guest_details` | "Yes" / "No" | Adds: No. of adults, No. of children, dynamic per-adult document capture rows, dynamic child-name rows |
| `booking_details` | "Yes" / "No" | Adds: Booking Type, Booking For (Personal / Corporate), Check-in date, Check-out date, Room Price, Order Amount, Advance Payment, Balance Payment, Payment Mode (V2 phase 2 — see §7.7), Special Request, GST / Firm block (when conditions met) |

**Important — flags that are NOT used for layout in V2:**
- `restaurants[].configuration` — **ignored**. Not in payload, not in layout logic.
- `restaurants[].room_price` — **ignored**. Room Price visibility is gated by `booking_details=Yes` only.
- `restaurants[].room_otp_require` — **ignored** for room check-in. OTP is **out of scope** for the Room Module.

### 3.2 Baseline layout (both flags = "No")
Minimum viable check-in form. Only the following fields are shown:
- Guest Name (required)
- Phone (required, with country-code selector defaulting to India +91)
- Email (optional)
- Select-Rooms chip strip (multi-room selection)
- Cancel + Check-In buttons

### 3.3 Layout when `booking_details = "Yes"`
Adds **Column 3 — Booking & Payment** with:
- Booking Type (Walk-in / Online)
- Booking For (Personal / Corporate)
- Check-in Date (date picker; current time auto-filled in payload, overridable via "Edit time" link)
- Check-out Date (auto-calculated from nights; manually editable)
- Room Price (single combined total for all selected rooms; backend splits per-room)
- Order Amount (operator-entered manually)
- Advance Payment (optional; ≤ Order Amount)
- Balance Payment (auto-computed = Order Amount − Advance Payment; sent in payload as a string)
- Payment Mode (**V2 Phase 2** — see §7.7)
- Special Request (free-text optional, payload key `order_note`)
- GST / Firm block (gated — see §7.6)

### 3.4 Layout when `guest_details = "Yes"`
Adds to **Column 1 — Guest** and **Column 2 — Verification**:
- Total Adults (integer ≥ 1)
- Total Children (integer ≥ 0)
- Primary guest's ID block (in Column 2): ID Type + Front Image (mandatory) + Back Image (optional)
- Dynamic per-adult rows (#2 .. #N): Name + ID Type + Front Image (mandatory) + Back Image (optional)
- Dynamic per-child rows (#1 .. #M): Name (mandatory)

### 3.5 Layout when both flags are "Yes"
All sections from §3.3 + §3.4 are visible. This is the **maximal** layout.

### 3.6 GST / Firm block visibility
GST / Firm block is shown **only when both** of the following are true:
- `restaurants[0].show_user_gst === "Yes"`, AND
- Operator has selected `Booking For = Corporate` (UI value)

When visible, the block contains: Firm Name + Firm GSTIN.
The `gst_tax` payload field is **never sent** by the UI in V2.

---

## 4. Dynamic Guest Handling (Adults / Children)

### 4.1 Adult slots — dynamic add-row
- Visible only when `guest_details === "Yes"`.
- **Cap:** `MAX_ADULTS = 4 × number_of_selected_rooms`.
   - Example: 1 room selected → max 4 adults; 3 rooms selected → max 12 adults.
- The **primary guest** (entered in Column 1 + Column 2) counts as adult #1.
- Operator can **add additional adult rows up to the cap**. Each additional row contains:
  - Name (mandatory)
  - ID Type (dropdown — see §5 for enum)
  - Front Image (mandatory)
  - Back Image (optional)
- The total `total_adult` field auto-syncs with the rendered row count.

### 4.2 Child slots — dynamic add-row
- Visible only when `guest_details === "Yes"`.
- **Cap:** `MAX_CHILDREN = 4 × number_of_selected_rooms` (independent of adult cap).
- Each child row contains:
  - Name (mandatory)
- No DOB, no age, no documents for children.
- The total `total_children` field auto-syncs with the rendered row count.
- **Submit-blocking rule:** if `total_children > 0`, all child name rows must be filled before submit is enabled.

### 4.3 Cap recalculation when room selection changes
- If the operator removes a room such that the new cap is below the current row count, **block the room removal** and show an inline message: *"Reduce adults/children to {new_cap} before removing this room."*
- If the operator adds a room, simply increase the cap; existing rows are preserved.

### 4.4 Field-key naming pattern (locked from cURL)
Indexed-suffix pattern; primary fields are unsuffixed.

| Slot | Name key | ID-type key | Front image key | Back image key |
|------|----------|-------------|-----------------|----------------|
| Primary (#1) | `name` | `id_type` | `front_image_file` | `back_image_file` |
| Adult #2 | `name2` | `id_type2` | `front_image_file2` | `back_image_file2` |
| Adult #3 | `name3` | `id_type3` | `front_image_file3` | `back_image_file3` |
| Adult #4 | `name4` | `id_type4` | `front_image_file4` | `back_image_file4` |

> **Open item:** the cap pattern only confirms slots up to #4. For multi-room cases requiring slots #5+, the backend pattern (`name5`, `id_type5`, `front_image_file5`, `back_image_file5`, …) is the **assumed extension** — confirm with backend before shipping multi-room support beyond a single room. See §11.

### 4.5 Children payload transformation
- UI captures one row per child with a mandatory Name.
- On submit, UI **joins** all child names with commas into a single `children_name` string.
   - Example: rows = ["piyush", "parth"] → payload `children_name = "piyush,parth"`.

---

## 5. UI Field Matrix

Legend:
- **Visibility driver:** the Profile flag and/or condition controlling visibility.
- **Mandatory rule:** when the field is required.
- **Source:** where the value comes from (UI input, derived, Profile API, etc.).
- **Payload key:** the multipart form field name.

### 5.1 Always-visible fields (baseline)

| UI Field | Input | Visibility | Mandatory | Validation | Source | Payload key |
|----------|-------|------------|-----------|------------|--------|-------------|
| Guest Name | text | Always | Required | Non-empty, trimmed | Operator input | `name` |
| Phone | tel + country-code selector | Always | Required | Per selected country (default India +91); use `libphonenumber`-style validation | Operator input | `phone` |
| Email | email | Always | Optional | If non-empty, must be RFC-5322-valid | Operator input | `email` |
| Select Rooms chip | multi-select chips | Always | At least 1 room | Primary room auto-selected; additional only if `status === "available"` | Dashboard context + Profile | `room_id[0]`, `room_id[1]`, … (bracket-array — see §5.6) |

### 5.2 Fields shown when `guest_details = "Yes"`

| UI Field | Input | Mandatory | Validation | Payload key |
|----------|-------|-----------|------------|-------------|
| Total Adults | integer (display only — auto-syncs to row count) | Required ≥ 1 | Min 1; max = `4 × rooms_selected` | `total_adult` |
| Total Children | integer (display only — auto-syncs to row count) | Optional (≥ 0) | Min 0; max = `4 × rooms_selected` | `total_children` |
| Primary ID Type | select | Required | One of enum (§5.7) | `id_type` |
| Primary Front Image | file | Required | See §6 | `front_image_file` |
| Primary Back Image | file | Optional | See §6 | `back_image_file` |
| Adult #N Name | text | Required if row exists | Non-empty | `name{N}` |
| Adult #N ID Type | select | Required if row exists | One of enum (§5.7) | `id_type{N}` |
| Adult #N Front Image | file | Required if row exists | See §6 | `front_image_file{N}` |
| Adult #N Back Image | file | Optional | See §6 | `back_image_file{N}` |
| Child #M Name | text | Required if row exists | Non-empty | (joined → `children_name`) |

### 5.3 Fields shown when `booking_details = "Yes"`

| UI Field | Input | Mandatory | Validation | Payload key |
|----------|-------|-----------|------------|-------------|
| Booking Type | radio (Walk-in / Online) | Required | One of `WalkIn`, `Online` | `booking_type` |
| Booking For | radio (Personal / Corporate) | Required | UI "Personal" → `Individual`; UI "Corporate" → `Corporate` | `booking_for` |
| Check-in Date | date picker (with "Edit time" override link) | Required | Cannot be > 24 hours in the past; default = today | `checkin_date` (`YYYY-MM-DD HH:mm:ss`) |
| Check-out Date | date picker (auto-calc from nights; manually editable) | Required | Must be ≥ check-in date (same-day allowed = 1 night) | `checkout_date` (`YYYY-MM-DD HH:mm:ss`) |
| Number of Nights | integer (helper input that drives check-out date) | Required | Min 1 | (not in payload directly — drives `checkout_date`) |
| Room Price | numeric | Required | ≥ 0; single combined total for all selected rooms | `room_price` |
| Order Amount | numeric | Required | ≥ 0; **operator-entered manually** (no auto-calc) | `order_amount` |
| Advance Payment | numeric | Optional | ≥ 0 AND ≤ Order Amount (else inline error + submit disabled) | `advance_payment` |
| Balance Payment | numeric (read-only auto-calc) | Auto | = `order_amount − advance_payment`; recomputed on every keystroke | `balance_payment` |
| Special Request | text | Optional | Free-text | `order_note` |
| `booking_details` form field | (passthrough empty string) | — | Always sent as empty string `""` until backend confirms purpose at runtime (see §11) | `booking_details` |

### 5.4 GST / Firm block (gated — see §3.6)

| UI Field | Input | Mandatory | Validation | Payload key |
|----------|-------|-----------|------------|-------------|
| Firm Name | text | Required when block visible | Non-empty | `firm_name` |
| Firm GSTIN | text | Required when block visible | Match regex: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` | `firm_gst` |
| `gst_tax` | — | — | **NEVER sent** by UI in V2 (omit entirely from payload) | (omitted) |

### 5.5 Payment Mode (V2 Phase 2 — see §7.7)

| UI Field | Input | Mandatory | Validation | Payload key |
|----------|-------|-----------|------------|-------------|
| Payment Mode | select (Cash / Card / UPI) | Required when Advance > 0 (Phase 2) | Subset of `restaurants[].payment_types[]` filtered to `Cash`, `Card`, `UPI` | `payment_mode` |

### 5.6 `room_id[]` payload format
- When **exactly 1 room** is selected: send a single `room_id[0]` entry.
- When **more than 1 room** is selected: send `room_id[0]`, `room_id[1]`, … one entry per selected room.
- Always use the bracket-indexed PHP-array notation (matches the cURL).

### 5.7 ID Type enum (locked from cURL + Voter ID)

| Backend value | UI label |
|---------------|----------|
| `Aadhar card` | Aadhaar |
| `Passport` | Passport |
| `PAN card` | PAN |
| `License` | Driving License |
| `Voter ID` | Voter ID |

> **Note:** values like `"Aadhar card"` and `"PAN card"` contain spaces — preserve as-is in the payload.

---

## 6. Document Upload Rules

### 6.1 Allowed file types
- MIME types accepted: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `application/pdf`.

### 6.2 Size limits
- **Max stored size: 5 MB per file** (post-compression for images).

### 6.3 Compression
- **Images** (jpeg/jpg/png/webp) are compressed **client-side in the browser** before upload to ensure final size ≤ 5 MB.
- Use a **small JS library** for compression — recommended: `browser-image-compression` (no external API call; runs in a web-worker locally).
- **PDFs** are accepted as-is, up to 5 MB. If a PDF exceeds 5 MB, the UI rejects it with an inline error: *"File too large. Maximum 5 MB allowed."*

### 6.4 Validation behaviour
- File-type rejection → inline error on the file field: *"Only JPG, PNG, WEBP, or PDF files are allowed."*
- Oversize rejection (PDF > 5 MB, or image that fails to compress under 5 MB) → inline error: *"File too large. Maximum 5 MB allowed."*
- Submit is blocked while any file field has a pending error.

### 6.5 Field requirements per slot
| Slot | Front Image | Back Image |
|------|-------------|------------|
| Primary guest | **Mandatory** | Optional |
| Adult #2..#N | **Mandatory** (each row) | Optional (each row) |
| Children | — (not captured) | — |

---

## 7. Payment & Booking Logic

### 7.1 Order amount
- **Operator-entered manually.** No auto-calculation from `room_price × nights`.
- Validation: `order_amount >= 0`. Mandatory when `booking_details = "Yes"`.

### 7.2 Room price
- **Single combined total** for all selected rooms (operator enters one value covering all rooms).
- Backend handles per-room split. Example: 3 rooms for ₹6,000 total → backend records ₹2,000 per room.
- Validation: `room_price >= 0`. Mandatory when `booking_details = "Yes"`.

### 7.3 Balance payment
- **Auto-computed:** `balance_payment = order_amount − advance_payment`.
- Recomputed on every keystroke of either Order Amount or Advance Payment.
- Sent in the payload as a string (mirror cURL format — e.g., `"1500.0"`).

### 7.4 Advance payment validation
- `advance_payment >= 0`.
- `advance_payment ≤ order_amount`. If violated → **inline error** under the field; submit button disabled until corrected.

### 7.5 Numeric format
- The `food_price_with_paisa` Profile flag is **not used** in V2.
- Send numeric strings in the **same format as the reference cURL** (no client-side normalization).
   - Examples observed: `room_price="2000"`, `advance_payment="500"`, `balance_payment="1500.0"`, `order_amount="2000"`.

### 7.6 GST handling
- `gst_tax` field: **never sent** by UI in V2.
- GST / Firm block visibility: only when `show_user_gst === "Yes"` AND `booking_for === "Corporate"`.
- `firm_gst` validation regex: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` (standard 15-char Indian GSTIN).

### 7.7 Payment Mode (V2 — Phase 2)
- **Phase 2 of V2** scope: payment-mode dropdown is added to the Booking & Payment section.
- Source values: dynamically built from `restaurants[0].payment_types[]`, filtered to **only** `Cash`, `Card`, `UPI` (other types like TAB, ROOM, Pay Later are excluded for room check-in).
- Required when `advance_payment > 0`. Optional / can be defaulted otherwise.
- Payload key: `payment_mode`.
- **Phase 2 deliverable** — not part of V2 Phase 1; revised cURL with `payment_mode` field will be shared by backend before Phase 2 implementation.

### 7.8 Booking Type & Booking For
| Field | UI Label | Backend value |
|-------|----------|---------------|
| Booking Type | Walk-in | `WalkIn` |
| Booking Type | Online | `Online` |
| Booking For | Personal | `Individual` |
| Booking For | Corporate | `Corporate` |

### 7.9 Date / time handling
- **Check-in date:** date picker only. Defaults to today. Operator may back-date **up to 24 hours** in the past.
- **Check-in time component (in payload):** auto-fills with the **current time at submission**. Operator may override the time via an "Edit time" link if desired.
- **Number of nights:** operator-entered (≥ 1). Same-day check-in/check-out is allowed (counts as 1 night).
- **Check-out date:** auto-calculated as `checkin_date + nights`. The auto value is shown in the picker but the operator can manually edit the date.
- **Check-out time component (in payload):** **current time at submission** (mirrors check-in handling). Display default in the picker shows 12:00 noon, but the payload value is current time unless the operator manually edits it.
- **Payload format for both dates:** `YYYY-MM-DD HH:mm:ss`.

---

## 8. API Requirements

### 8.1 Endpoint
```
POST {REACT_APP_API_BASE_URL}/api/v1/vendoremployee/pos/user-group-check-in
```
Where `REACT_APP_API_BASE_URL` = `https://preprod.mygenie.online/` (per current env).

### 8.2 Headers
```
Authorization: Bearer <auth_token>
Content-Type: multipart/form-data
```
- **Do NOT send `X-localization`** in V2. (Phase 2 / future iteration may add it when multi-language is enabled.)

### 8.3 Request body
- Always `multipart/form-data` (since image / PDF uploads are part of the payload).
- The legacy "JSON when no images" mode in current code is removed in V2 — every check-in submission is multipart.

### 8.4 Full payload schema (V2 Phase 1)

| Form key | Type | Sent when | Notes |
|----------|------|-----------|-------|
| `name` | string | Always | Primary guest name |
| `phone` | string | Always | E.164 or local format per country selection |
| `email` | string | If non-empty | Always optional |
| `room_id[i]` | integer | Always (≥ 1 entry) | One per selected room (`room_id[0]`, `room_id[1]`, …) |
| `total_adult` | integer-string | When `guest_details=Yes` | Auto-derived from primary + extra adult rows |
| `total_children` | integer-string | When `guest_details=Yes` | Auto-derived from child rows |
| `id_type` | string | When `guest_details=Yes` | Primary guest; enum per §5.7 |
| `front_image_file` | file | When `guest_details=Yes` | Primary guest, mandatory |
| `back_image_file` | file | When `guest_details=Yes` | Primary guest, optional (omit if not provided) |
| `name{N}` | string | Per extra adult row | N = 2..MAX |
| `id_type{N}` | string | Per extra adult row | N = 2..MAX |
| `front_image_file{N}` | file | Per extra adult row | Mandatory |
| `back_image_file{N}` | file | Per extra adult row | Optional (omit if not provided) |
| `children_name` | string | When `guest_details=Yes` AND children rows exist | Comma-joined names |
| `booking_type` | string | When `booking_details=Yes` | `WalkIn` / `Online` |
| `booking_for` | string | When `booking_details=Yes` | `Individual` / `Corporate` |
| `checkin_date` | string | When `booking_details=Yes` | `YYYY-MM-DD HH:mm:ss` |
| `checkout_date` | string | When `booking_details=Yes` | `YYYY-MM-DD HH:mm:ss` |
| `room_price` | numeric-string | When `booking_details=Yes` | Single combined total for all rooms |
| `order_amount` | numeric-string | When `booking_details=Yes` | Operator-entered |
| `advance_payment` | numeric-string | When `booking_details=Yes` | Default `"0"` if blank |
| `balance_payment` | numeric-string | When `booking_details=Yes` | Auto-computed (`order_amount − advance_payment`) |
| `order_note` | string | If non-empty | UI-labelled "Special Request" |
| `booking_details` | string | When `booking_details=Yes` | Sent as empty string `""` (purpose pending — see §11) |
| `firm_name` | string | When GST/Firm block visible | Required when sent |
| `firm_gst` | string | When GST/Firm block visible | GSTIN regex per §7.6 |
| `gst_tax` | — | **NEVER** | Omitted entirely in V2 |
| `payment_mode` | string | **V2 Phase 2 only** | Cash / Card / UPI |

### 8.5 Reference cURL (PO source-of-truth)

```bash
curl --location 'https://preprod.mygenie.online/api/v1/vendoremployee/pos/user-group-check-in' \
--header 'Authorization: Bearer <token>' \
--form 'name="harsh"' \
--form 'phone="9714176033"' \
--form 'email="ab@gmail.com"' \
--form 'advance_payment="500"' \
--form 'balance_payment="1500.0"' \
--form 'checkin_date="2026-04-24 09:32:00"' \
--form 'checkout_date="2026-04-27 09:32:00"' \
--form 'booking_details=""' \
--form 'booking_type="Online"' \
--form 'room_price="2000"' \
--form 'order_amount="2000"' \
--form 'order_note="provide extra bed sheet"' \
--form 'id_type="Aadhar card"' \
--form 'total_adult="4"' \
--form 'total_children="2"' \
--form 'name2="gyan"' \
--form 'id_type2="Passport"' \
--form 'name3="test e"' \
--form 'id_type3="PAN card"' \
--form 'name4="abhi"' \
--form 'id_type4="License"' \
--form 'children_name="piyush,parth"' \
--form 'firm_name="mygenie"' \
--form 'firm_gst="GST123456"' \
--form 'booking_for="Corporate"' \
--form 'room_id[0]="3245"' \
--form 'room_id[1]="3244"' \
--form 'front_image_file=@"/path/img.jpeg"' \
--form 'back_image_file=@"/path/img.jpeg"' \
--form 'front_image_file2=@"/path/img.jpeg"' \
--form 'back_image_file2=@"/path/img.jpeg"' \
--form 'front_image_file3=@"/path/img.jpeg"' \
--form 'back_image_file3=@"/path/img.jpeg"' \
--form 'front_image_file4=@"/path/img.jpeg"' \
--form 'back_image_file4=@"/path/img.jpeg"'
```

> The above cURL still contains `gst_tax="0.00"` — this is **removed for V2** per §7.6.

### 8.6 Success response
```json
{ "message": "Group check-in completed successfully" }
```
- HTTP 2xx → show success toast using the response `message` field (or fallback "Check-in successful" if missing).
- No IDs (`order_id`, `booking_id`, `group_id`) are returned. UI does not need to capture anything beyond the success toast.

### 8.7 Error handling
- **HTTP 409 Conflict** (room taken between modal-open and submit) → toast: *"This room was just taken by another operator. Please pick another room."* + auto-close the modal.
- **Other errors** → toast with the backend error message; modal stays open; form values preserved.
- **Error envelope shape** (i.e., whether the backend returns `{message}`, `{error}`, or `{errors:[{message}]}`) → **observe at runtime** during implementation. Implement extraction in this order: `response.data.errors[0].message` → `response.data.message` → `response.data.error` → fallback string.

### 8.8 Race-condition handling
- **Backend is the authoritative guard** against double-check-in. The frontend does **not** lock or disable room cards on the dashboard during submit.
- The 409 UX above handles the race scenario.

### 8.9 Permission gating
- **No role-based gating** for V2. Any authenticated POS user can perform Room Check-In.

### 8.10 Dashboard refresh after success
- **No change from current behaviour.** The existing dashboard refresh pattern is preserved (whatever the current modal `onSuccess` callback does today).

---

## 9. Code vs Requirement Gap (Observations)

> Observation only — no instructions to refactor in this section. Listed for the Implementation Agent's awareness.

### 9.1 Current code — `/app/frontend/src/components/modals/RoomCheckInModal.jsx`
| Observation | V2 Requirement |
|-------------|----------------|
| Hard-coded `PAYMENT_MODES = ['cash', 'card', 'upi']` (line 7) | Phase 2: derived dynamically from `restaurants[0].payment_types[]` filtered to Cash/Card/UPI. Not in Phase 1. |
| Hard-coded `BOOKING_TYPES = ['WalkIn', 'PreBooked']` (line 8) | Update to `['WalkIn', 'Online']` per §7.8 |
| Hard-coded `BOOKING_FOR = ['personal', 'business']` (line 9) | Replace with UI labels "Personal"/"Corporate" mapping to backend `Individual`/`Corporate` per §7.8 |
| Hard-coded `ID_TYPES = ['Aadhaar', 'Passport', 'DrivingLicense', 'VoterID', 'PAN']` (line 10) | Update to enum in §5.7 (note value-string differences: `Aadhar card`, `PAN card`, `License`, `Voter ID`) |
| `today()` helper returns `YYYY-MM-DD` (line 12) | Payload requires `YYYY-MM-DD HH:mm:ss` per §7.9 |
| Date inputs use `type="date"` (lines 249, 250) | Replace with date picker that supports an "Edit time" override link per §7.9 |
| No country-code phone selector (line 223) | Add country-code selector defaulting to India (+91) per §5.1 |
| `totalAdult` / `totalChildren` are plain count inputs (lines 225, 226); no per-adult or per-child rows rendered | Implement dynamic add-row UI per §4 with cap = 4 × rooms_selected |
| Only primary guest's ID block exists (Column 2) | Implement per-adult ID blocks for adult #2..#N |
| No GST/Firm block exists | Add gated GST/Firm block per §3.6 + §5.4 |
| No Room Price field exists | Add Room Price field per §5.3 |
| `balancePayment` is editable (line 255) | Make read-only auto-computed per §7.3 |
| No `advance ≤ order_amount` validation | Add inline error + disable submit per §7.4 |
| Cancel closes silently (line 270) | Prompt confirmation when form is dirty per §10.3 |
| No browser-navigation prompt on dirty form | Add `beforeunload` / route-leave guard per §10.4 |
| No 409 conflict handling (handleSubmit catch block, line 146-148) | Special-case HTTP 409 with toast + auto-close per §8.7 |
| No file-type validation; accepts `image/*` only (lines 236-237) | Accept `jpg/jpeg/png/webp/pdf`; max 5 MB; client-side compression per §6 |
| No client-side image compression library | Add `browser-image-compression` (or equivalent) per §6.3 |
| No back-dating limit on check-in date | Add 24-hour back-dating guard per §7.9 |
| No nights helper input → check-out date auto-calc | Add nights input + auto-calc per §7.9 |
| `BOOKING_FOR` selector is `select` (dropdown) | V2 prefers radio buttons per §5.3 |

### 9.2 Current code — `/app/frontend/src/api/services/roomService.js`
| Observation | V2 Requirement |
|-------------|----------------|
| Two payload modes: JSON when no images, multipart when images present (lines 32-83) | V2 always uses multipart (always has at least primary front image when `guest_details=Yes`; even baseline can be multipart for consistency) |
| `room_id[]` (no index) used in multipart mode (line 40); `room_id` array used in JSON mode (line 66) | Use `room_id[0]`, `room_id[1]`, … bracket-indexed pattern always per §5.6 |
| Default `booking_for: 'personal'` (lines 42, 68) | Default to `Individual` (UI "Personal") per §7.8 |
| No `room_price`, `firm_name`, `firm_gst`, `booking_details`, additional adult fields, or per-adult file fields appended | Add all per §8.4 |
| No `Authorization` header explicitly set (relies on global `api` interceptor) | Verify and keep — no change |
| Sends `payment_mode` always (line 46) | Phase 1: omit `payment_mode` entirely (Phase 2: include conditionally per §7.7) |
| `X-localization` header is **not** currently sent | Keep as-is — V2 explicitly does not send it |

### 9.3 Profile / config integration
- The current code has **no** Profile-flag wiring. V2 must read `restaurants[0]` from the existing profile context/store and route visibility through `guest_details`, `booking_details` per §3.

### 9.4 No existing Code → V2 alignment
- No existing implementation of: per-adult document rows, per-child name rows, country-code phone selector, GST/Firm block, Room Price, nights-based check-out auto-calc, back-dating guard, browser-navigation guard, dirty-form confirmation, image compression. All are new for V2.

---

## 10. Edge Cases

### 10.1 Same-day check-in/check-out
- Allowed. Counts as **1 night minimum**.

### 10.2 Back-dated check-in
- Allowed up to **24 hours** in the past from the moment of submit.
- UI rejects earlier dates with inline error: *"Check-in date cannot be more than 24 hours in the past."*

### 10.3 Cancel / Close on dirty form
- If the form has any user-entered value (text, file, count, etc.), tapping Cancel or X-close shows a confirmation prompt: *"You have unsaved changes. Discard?"*

### 10.4 Browser navigation on dirty form
- Cover: back button, route change inside SPA, tab close, accidental reload.
- Show a confirmation prompt before allowing navigation. Use `beforeunload` for tab-close/reload and React Router's navigation guard (or equivalent) for in-app routes.

### 10.5 Two operators selecting the same room
- **Backend guards.** No frontend lock. If second submit returns 409 → see §10.6.

### 10.6 409 Conflict on submit
- Toast: *"This room was just taken by another operator. Please pick another room."*
- Auto-close the modal.

### 10.7 Reducing room selection below current adult/child count
- Block room removal; show inline message: *"Reduce adults/children to {new_cap} before removing this room."*

### 10.8 File type rejection
- Show inline error on the file field. Submit blocked until resolved.

### 10.9 PDF over 5 MB
- Reject inline (no client-side compression for PDFs). Show error: *"File too large. Maximum 5 MB allowed."*

### 10.10 Image cannot be compressed under 5 MB
- Rare edge case (very large RAW or HEIC after conversion). Reject inline with same error as above.

### 10.11 Empty available-rooms list
- Hide the "Select Rooms" chip strip. The primary chip (the room the operator clicked on) remains visible and pre-selected.

### 10.12 GST block toggled off after fields are filled
- If operator switches `booking_for` from Corporate → Personal, the GST block hides AND its values are cleared so they are not sent in the payload.

### 10.13 Successful check-in
- Toast with backend `message` field (or fallback). Modal closes. Dashboard refresh follows existing behaviour (no change in V2).

### 10.14 Submit with all blocking validations satisfied but only optional fields blank
- Submit proceeds normally. Optional fields are omitted from the payload (or sent as empty string per the cURL contract — see §11 for `booking_details`).

---

## 11. Risks / Assumptions / Clarifications Required

> All items here are **non-blocking** for the start of implementation but must be resolved during the implementation/testing phase.

| # | Risk / Item | Status / Mitigation |
|---|-------------|---------------------|
| R1 | **Adult slot keys beyond #4** — cURL only confirms `name2..name4`. For multi-room cases requiring 5+ adults, the assumed pattern is `name5`, `id_type5`, `front_image_file5`, `back_image_file5` (continued indexed suffix). Confirm with backend before shipping multi-room support beyond a single room. | Implement with the assumed pattern; flag for backend confirmation in QA. |
| R2 | **`booking_details=""` form field purpose** — the cURL sends this as a form field (empty string), but the backend's intended use is unclear (could be a free-text booking-notes field, or a passthrough of the Profile flag value). | V2 sends `booking_details=""` always when `booking_details` flag is "Yes". Verify at runtime; promote to a UI input if backend confirms it's a notes field. |
| R3 | **Error envelope shape** — multiple shapes possible. | Implement extraction order per §8.7; observe in QA. |
| R4 | **`food_price_with_paisa` numeric format** — flag is unused in V2; payload mirrors cURL formats verbatim. Risk: backend may strictly require a single canonical format (e.g., always 2 decimals). | Mirror the cURL format. If backend rejects mixed formats during QA, normalise to 2-decimal strings. |
| R5 | **Voter ID exact backend string** — Voter ID confirmed in scope, but the exact backend value (e.g., `"Voter ID"` vs `"VoterID"`) is not in the cURL. | Implement as `"Voter ID"` (with space, matching the spacing convention of `"Aadhar card"` / `"PAN card"`). Verify at runtime. |
| R6 | **Multi-room payment** — in multi-room case, operator enters one combined total Room Price. UI does not show per-room breakdown. | Acceptable per PO. Backend handles per-room split. |
| R7 | **Backend acceptance of always-multipart submissions** | Current code splits JSON vs multipart. Switching to always-multipart for V2 — confirm backend tolerance during integration. |
| R8 | **Browser-navigation guard inside SPA** | React Router 7 (per `package.json`) does not expose the legacy Prompt API directly. Use the v7 `useBlocker` hook (or equivalent) for in-app routing; use `beforeunload` for tab-close/reload. |

### Assumptions explicitly adopted
- A1. The Profile API response is already cached / accessible in a context or store from which `restaurants[0]` can be read synchronously.
- A2. A restaurant has access to the Room Module only when `restaurants[0].room === "Yes"`.
- A3. `restaurants[0].show_user_gst` controls GST block availability.
- A4. The existing `availableRooms` prop passed into `RoomCheckInModal` continues to be the source of truth for the chip-strip selector.

---

## 12. Final Implementation Checklist

### Phase 1 — Core V2

#### 12.1 Profile-flag wiring
- [ ] Implement a Profile selector hook that returns `{ guestDetails, bookingDetails, showUserGst, paymentTypes, currency, billDateFormat }` from `restaurants[0]`.
- [ ] Use the hook in `RoomCheckInModal` to drive section visibility per §3.

#### 12.2 Layout — baseline & extensions
- [ ] Render baseline layout (Name, Phone with country-code selector, Email, Select-Rooms chip strip).
- [ ] Add `guest_details=Yes` extensions: Total Adults / Children counts (auto-derived), per-adult and per-child dynamic rows.
- [ ] Add `booking_details=Yes` extensions: Booking Type, Booking For, Check-in date, Nights, Check-out date, Room Price, Order Amount, Advance Payment, Balance Payment (read-only auto), Special Request, GST/Firm block (gated).

#### 12.3 Dynamic rows
- [ ] Implement per-adult add-row UI; cap = `4 × rooms_selected`.
- [ ] Implement per-child add-row UI; cap = `4 × rooms_selected`.
- [ ] Block room removal if it would lower the cap below current row count.
- [ ] Auto-sync `total_adult` / `total_children` counts.

#### 12.4 ID & document upload
- [ ] Replace ID-Type enum with values from §5.7.
- [ ] Validate file MIME types (jpg/jpeg/png/webp/pdf).
- [ ] Integrate `browser-image-compression` (or equivalent) to compress images ≤ 5 MB before upload.
- [ ] Reject PDFs > 5 MB inline.
- [ ] Front image mandatory per slot; back image optional.

#### 12.5 Phone validation
- [ ] Add country-code selector defaulting to India (+91).
- [ ] Validate phone per selected country (libphonenumber-style).

#### 12.6 Date / time
- [ ] Replace `type="date"` inputs with date pickers + "Edit time" override link.
- [ ] Add Number-of-Nights input; auto-compute check-out date.
- [ ] Default check-in date = today; cap back-dating at 24 hours.
- [ ] Send dates as `YYYY-MM-DD HH:mm:ss`; time component = current time at submit (overridable).

#### 12.7 Payment
- [ ] Make Balance Payment read-only; auto-recompute on every keystroke.
- [ ] Validate `advance_payment ≤ order_amount` with inline error + submit disable.
- [ ] **Phase 1: do NOT send `payment_mode`** (deferred to Phase 2 per §7.7).

#### 12.8 GST / Firm block
- [ ] Show only when `show_user_gst=Yes` AND `booking_for=Corporate`.
- [ ] Validate `firm_gst` against the GSTIN regex in §7.6.
- [ ] Clear field values when block is hidden so they are not sent in payload.
- [ ] **NEVER send `gst_tax` field.**

#### 12.9 Payload service (`roomService.checkIn`)
- [ ] Always use `multipart/form-data`.
- [ ] Use bracket-indexed `room_id[i]` keys.
- [ ] Append all fields per §8.4 (omit `payment_mode` in Phase 1).
- [ ] Always send `booking_details=""` when the section is visible (until R2 is resolved).
- [ ] Do NOT send `X-localization`.

#### 12.10 Children payload
- [ ] Join all child names into a single `children_name` string (comma-separated).

#### 12.11 Error handling
- [ ] Implement 409 special-case (toast + auto-close).
- [ ] Implement error-message extraction order per §8.7.
- [ ] Preserve form values on non-409 errors.

#### 12.12 Dirty-form guards
- [ ] Confirm before close on Cancel / X / overlay click when form is dirty.
- [ ] Add browser-navigation guard (`beforeunload` + React Router blocker) when form is dirty.

#### 12.13 Edge-case handling
- [ ] Hide chip strip when no other available rooms.
- [ ] Block room removal that drops cap below row count.
- [ ] Handle empty / missing optional fields per §10.

#### 12.14 Data-testids (required for testing)
- [ ] `room-checkin-overlay`, `checkin-name`, `checkin-phone`, `checkin-email`, `checkin-country-code`
- [ ] `checkin-adults`, `checkin-children`, `checkin-add-adult-btn`, `checkin-add-child-btn`
- [ ] `checkin-adult-{n}-name`, `checkin-adult-{n}-id-type`, `checkin-adult-{n}-front`, `checkin-adult-{n}-back`
- [ ] `checkin-child-{m}-name`
- [ ] `checkin-id-type`, `checkin-front-image`, `checkin-back-image`
- [ ] `checkin-booking-type`, `checkin-booking-for`
- [ ] `checkin-date`, `checkin-edit-time-btn`, `checkin-nights`, `checkout-date`, `checkout-edit-time-btn`
- [ ] `checkin-room-price`, `checkin-amount`, `checkin-advance`, `checkin-balance`
- [ ] `checkin-special-request`
- [ ] `checkin-firm-name`, `checkin-firm-gst`
- [ ] `room-chip-{tableId}`
- [ ] `checkin-cancel-btn`, `checkin-submit-btn`
- [ ] `checkin-dirty-confirm-modal`

### Phase 2 — V2 enhancements (in scope of V2 module, separate sprint)

#### 12.15 Payment Mode integration
- [ ] Once backend ships revised cURL with `payment_mode` field, add UI dropdown (Cash / Card / UPI) per §7.7.
- [ ] Required when `advance_payment > 0`.

#### 12.16 Edit / Reopen Check-In
- [ ] Implement post-submit Edit flow: ability to reopen a submitted check-in and edit fields (e.g., correct phone, add an adult).
- [ ] Define which fields are editable post-submit (PO input required before this sprint).
- [ ] Endpoint and payload for Edit submissions (PO/backend input required).

#### 12.17 Multi-language support — `X-localization` header
- [ ] When multi-language is enabled in the application, send `X-localization: <locale>` header with all Room Check-In requests.
- [ ] Determine locale source (Profile / user preference / browser).

---

## Document History

| Version | Date | Notes |
|---------|------|-------|
| V2 (this) | 2026-04-23 | Initial V2 — consolidated PO inputs + clarified Q&A; replaces legacy implementation requirements doc. |

---

*End of `ROOM_MODULE_REQUIREMENTS_V2.md`. This document is the FINAL source of truth for Room Module V2 implementation.*
