# Room Module — Implementation Requirements Document

> Prepared for the Implementation Agent.
> Inputs used: (a) user-provided requirement log in `/app/memory/room_checkin_requirements.md`, (b) user-provided cURL, (c) Profile API response for vendor employee id=1478 / restaurant id=478.
> Scope: documentation only — no code changes, no testing, no deployment.

---

## 1. Requirement Understanding

The Room Module lets a logged-in vendor employee (POS operator) check a guest group into one or more **available** rooms. The module must:

1. Render a check-in form that adapts to three different **configuration types**. Only two of the three were described by the user:
   - **Basic** — minimal guest + stay fields.
   - **Document** — Basic + adult/children counts + dynamic per-adult identity capture.
   - **Third configuration — name and fields PENDING from user** (likely `configuration` field value from Profile API — see §7 and §8).

2. Drive field visibility, mandatory/optional state, section visibility (`guest_details`, `booking_details`, `room_price`, GST block, firm block), and payment options **entirely from the Profile API response**, not from hard-coded enums in the frontend.

3. Submit the completed form as a single POST (`multipart/form-data` when any ID image is attached, else JSON) to:
   `POST /api/v1/vendoremployee/pos/user-group-check-in`.

4. Preserve the existing 3-column layout (Guest | Verification | Booking & Payment) when reworking fields.

## 2. Scope

### In scope
- Rework of the Room Check-In form (`RoomCheckInModal`) to be configuration-driven.
- Binding all field visibility and validation to Profile API flags.
- Supporting dynamic per-adult document capture based on `total_adult`.
- Supporting datetime values for `checkin_date` / `checkout_date` (format `YYYY-MM-DD HH:mm:ss`) as seen in the new cURL.
- Supporting GST/firm fields (`firm_name`, `firm_gst`, `gst_tax`) controlled by Profile flags.
- Supporting `room_price` as a first-class payload field.
- Post-check-in: dashboard refresh (currently missing — flagged as gap; see §8).

### Out of scope (this requirement)
- Room availability calendar.
- Check-out / folio / settlement flows.
- Room rate card CRUD.
- Payment gateway / EDC integration on the check-in screen.
- Any change to the dashboard entry trigger (clicking an `available` room will still open the modal).

## 3. Assumptions

A1. The "3 types of configuration" stated by the user correspond to the values of the Profile API field `restaurants[].configuration`. The sample response shows `"configuration": "Simple"`. The remaining two values have not been confirmed by the user — see §8, Open Q1.
A2. A restaurant has access to the Room Module only when `restaurants[].room === "Yes"`. The sample response satisfies this.
A3. The value `booking_details === "Yes"` in Profile means the **Booking & Payment** section (and related fields like `booking_details`, `booking_type`, `booking_for`, `order_note`, `room_price`, `order_amount`, `advance_payment`, `balance_payment`) must be shown.
A4. The value `guest_details === "No"` in Profile means **additional guest identity capture beyond the primary guest (name#2..#4, `children_name`) must be hidden**. When `Yes`, those dynamic fields become visible/editable.
A5. The value `room_price === "Yes"` in Profile means the **Room Price** field must be shown and sent in the payload as `room_price`.
A6. `room_gst_applicable`, `room_billing_included`, `show_user_gst`, and `restaurant.gst_tax` govern GST/firm visibility and math. See §6 and §7.
A7. `room_otp_require === "No"` in sample — OTP step on room check-in is NOT required for this profile. The flow must honour this (skip OTP entry UI).
A8. Payment Mode dropdown options must come from `restaurants[].payment_types[]`, not the hard-coded `['cash','card','upi']` list used today. `prepaid=1`/`postpaid=1` flags to be respected (for check-in → prepaid=1).
A9. Currency and numeric formatting must follow `restaurants[].currency` (`"INR"` in sample) and `food_price_with_paisa` (`"No"` = integer display).
A10. Date/time formatting on display must follow `restaurants[].bill_date_format` (`"dd/MMM/yyyy hh:mm a"`). Payload remains `YYYY-MM-DD HH:mm:ss` as per the new cURL.

## 4. UI Requirements

Keep the 3-column grid: **Column 1 — Guest**, **Column 2 — Verification**, **Column 3 — Booking & Payment**. Above the grid: **Select Rooms** chip strip. Below the grid: sticky footer with Cancel + Check-In.

### 4.1 Header
- Back arrow + `X` close.
- Title: `Room Check-In`.
- Subtitle: `Room {room.label}` + ` + N more` when more rooms selected.

### 4.2 Select Rooms (chip strip)
- Primary room chip is fixed (clicked room).
- Additional chips shown only for rooms with `status === 'available'`.
- Submit label updates to `Check In (n)` when n > 1.
- Must also support backend payload: `room_id[0]`, `room_id[1]`, … (PHP bracket-array form) per new cURL.

### 4.3 Column 1 — Guest
Always visible in all three configurations:
| Field | Input | Basic | Document | Config-3 (pending) |
|-------|-------|-------|----------|---------------------|
| Guest Name | text | ✅ required | ✅ required | per user input |
| Phone | tel | ✅ required | ✅ required | per user input |

Visible only when `guest_details === "Yes"` (Document & higher configs):
| Field | Input | Basic | Document |
|-------|-------|-------|----------|
| Adults (`total_adult`) | integer ≥ 1 | — | ✅ required when visible |
| Children (`total_children`) | integer ≥ 0 | — | optional |

**Dynamic per-adult block** (only when `total_adult > 1` and `guest_details === "Yes"`):
- For adults #2 .. #`total_adult` (max slot count = see §8 Open Q2), render one row each with:
  - Name (`name2`, `name3`, `name4`)
  - Document Type (`id_type2`, `id_type3`, `id_type4`)
  - Document Front (file upload — field key: **pending from user**, see §8 Open Q3)
  - Document Back (file upload — field key: **pending from user**, see §8 Open Q3)
- Adult #1 is the primary guest and uses `name`, `id_type`, `front_image_file`, `back_image_file`.

**Children block** (only when `total_children > 0` and `guest_details === "Yes"`):
- Single `children_name` field in current cURL. If per-child rows are needed, see §8 Open Q4.

### 4.4 Column 2 — Verification (Primary Guest Documents)
| Field | Input | Basic | Document |
|-------|-------|-------|----------|
| Email (`email`) | email | optional | optional |
| ID Type (`id_type`) | select | — | ✅ when Document config; options per §7.4 |
| ID Front (`front_image_file`) | file (image) | — | ✅ optional file |
| ID Back (`back_image_file`) | file (image) | — | ✅ optional file |

### 4.5 Column 3 — Booking & Payment
Visible only when `booking_details === "Yes"`:
| Field | Input | Visibility driver | Mandatory rule |
|-------|-------|-------------------|----------------|
| Booking Type (`booking_type`) | select: `WalkIn`, `PreBooked` | `booking_details=Yes` | required when section visible |
| Booking For (`booking_for`) | select: `Individual`, *(Business — see Open Q5)* | `booking_details=Yes` | required when section visible |
| Check-in Date (`checkin_date`) | datetime (YYYY-MM-DD HH:mm:ss) | `booking_details=Yes` | required; default = now |
| Check-out Date (`checkout_date`) | datetime (YYYY-MM-DD HH:mm:ss) | `booking_details=Yes` | required; must be > check-in |
| Room Price (`room_price`) | numeric ≥ 0 | `room_price=Yes` | required when visible |
| Amount (`order_amount`) | numeric ≥ 0 | `booking_details=Yes` | required when visible; calc see §6.1 |
| Advance (`advance_payment`) | numeric ≥ 0 | `booking_details=Yes` | optional; ≤ Amount |
| Balance (`balance_payment`) | numeric ≥ 0 | `booking_details=Yes` | auto-computed Amount − Advance |
| Payment Mode (`payment_mode`) | select from `payment_types[]` where `prepaid=1` | `booking_details=Yes` | required when Advance > 0 |
| Order Note (`order_note`) | text | `booking_details=Yes` | optional |
| Booking Details (`booking_details`) (free text) | textarea | `booking_details=Yes` | optional |

**GST / Firm block** (only when `show_user_gst === "Yes"` AND `booking_for === "Business"`):
| Field | Input | Mandatory |
|-------|-------|-----------|
| Firm Name (`firm_name`) | text | required when block visible |
| Firm GST (`firm_gst`) | text (GSTIN) | required; validate format (see §5) |
| GST Tax (`gst_tax`) | numeric (percent, read-only) | derived from `restaurants[].gst_tax` when `room_gst_applicable=Yes`, else `0.00` |

### 4.6 Footer
- Cancel button → closes modal with confirm only if form is dirty (current behaviour closes without confirm; see §8 Open Q6).
- Check-In primary button:
  - Disabled when mandatory rules not satisfied or `isSubmitting` true.
  - Shows spinner while API is in-flight.
  - Label updates with selected room count.

### 4.7 UI states
- **Loading / submitting**: Check-In button disabled + spinner.
- **Validation error**: inline error below each failing field AND toast for top-level blockers (missing required).
- **API success**: toast "Check-In Successful" + close modal + refresh room grid (see §5 and §8 Open Q7).
- **API failure**: toast with server message; modal stays open and preserves entered values.
- **Empty available rooms**: hide the "Select Rooms" strip; primary chip still shown.
- **OTP block**: hide unless `room_otp_require === "Yes"` (not in scope of fields yet — see §8 Open Q8).

## 5. Backend Requirements

### 5.1 Endpoint
```
POST {REACT_APP_API_BASE_URL}/api/v1/vendoremployee/pos/user-group-check-in
Authorization: Bearer <auth_token>
X-localization: en
Content-Type: multipart/form-data   (if any file present)
Content-Type: application/json       (otherwise)
```

### 5.2 Payload fields (aligned to the latest user cURL)

| Form field | Type | Source | Visible when | Sent when |
|------------|------|--------|--------------|-----------|
| `name` | string | Guest Name | always | always |
| `phone` | string | Phone | always | always |
| `email` | string | Email | always | if non-empty |
| `advance_payment` | numeric string | Advance | `booking_details=Yes` | always (default `0`) |
| `balance_payment` | numeric string | Balance | `booking_details=Yes` | always (default `0`) |
| `checkin_date` | `YYYY-MM-DD HH:mm:ss` | Check-in Date | `booking_details=Yes` | always |
| `checkout_date` | `YYYY-MM-DD HH:mm:ss` | Check-out Date | `booking_details=Yes` | always |
| `booking_details` | string | Booking Details textarea | `booking_details=Yes` | if non-empty |
| `booking_type` | string (`WalkIn`/`PreBooked`) | Booking Type | `booking_details=Yes` | always |
| `booking_for` | string (`Individual`/`Business`) | Booking For | `booking_details=Yes` | always |
| `room_price` | numeric string | Room Price | `room_price=Yes` | always when visible |
| `order_amount` | numeric string | Amount (calc §6.1) | `booking_details=Yes` | always |
| `order_note` | string | Order Note | `booking_details=Yes` | if non-empty |
| `id_type` | string | Primary ID Type | `guest_details=Yes` | if non-empty |
| `total_adult` | integer string | Adults | `guest_details=Yes` | always |
| `total_children` | integer string | Children | `guest_details=Yes` | always |
| `name2`,`name3`,`name4` | string | additional adult names | `guest_details=Yes` AND `total_adult ≥ 2/3/4` | always (empty string if slot unused, per cURL) |
| `id_type2`,`id_type3`,`id_type4` | string | additional adult ID types | same as above | same |
| `children_name` | string | children name(s) | `guest_details=Yes` AND `total_children > 0` | if non-empty |
| `gst_tax` | numeric string (percent) | computed §6.3 | `show_user_gst=Yes` AND `booking_for=Business` | always `0.00` otherwise |
| `firm_name` | string | Firm Name | same as gst block | if non-empty |
| `firm_gst` | string (GSTIN) | Firm GST | same as gst block | if non-empty |
| `payment_mode` | string | Payment Mode (from `payment_types`) | `booking_details=Yes` | always when advance>0 |
| `room_id[i]` | integer | Selected rooms | always | 1 entry per room, indices `[0..n-1]` |
| `front_image_file` | file (image) | Primary ID Front | `guest_details=Yes` | if chosen |
| `back_image_file` | file (image) | Primary ID Back | `guest_details=Yes` | if chosen |
| *Additional adult file fields* | file | per-adult docs | `guest_details=Yes` | **field keys pending — Open Q3** |

> Note: current cURL sends `name2..name4`, `id_type2..id_type4`, `children_name` as empty strings even when unused. Frontend must preserve this behaviour unless backend confirms they can be omitted.

### 5.3 Response handling
- Treat HTTP 2xx as success. The existing code does not read any response body — recommended (subject to backend confirmation in §8 Open Q9) to read `order_id`/`group_id` from response to enable immediate UI refresh.
- On 401 → existing interceptor already clears token and redirects to `/`.
- Error message precedence: `response.data.errors[0].message` → `response.data.message` → `response.data.error` → `err.readableMessage`.

### 5.4 Post-submit dashboard refresh
- On success, must refresh `apiTables` (TABLES endpoint) and `runningOrders` (RUNNING_ORDERS endpoint) so that the checked-in room transitions from `available` → `occupied` without waiting for polling.
- Implementation hook: parent `DashboardPage.onSuccess` must call `refreshAllData(user.roleName)` instead of only `setCheckInRoom(null)`.

## 6. Validation Rules

All rules below are triggered on Submit and (where it improves UX) on blur.

### 6.1 Amount math
- `order_amount = room_price × number_of_nights` where nights = date-diff(`checkout_date`, `checkin_date`) in calendar days (minimum 1).
  - Configurable override: operator may edit `order_amount` if a business-level flag allows (see §8 Open Q10).
- `balance_payment = order_amount − advance_payment` (recomputed on every keystroke of either side).
- Amount fields non-negative; decimals allowed (`food_price_with_paisa === "No"` → display as integer; payload still a string with 2 decimals).

### 6.2 Date rules
- `checkin_date` cannot be in the past beyond today 00:00 (grace for same-day back-dated entries — see §8 Open Q11).
- `checkout_date` must be strictly greater than `checkin_date`.
- Both must be non-null when `booking_details=Yes`.
- Payload format: `YYYY-MM-DD HH:mm:ss`.

### 6.3 GST rules (driven by Profile)
- If `room_gst_applicable === "Yes"` → `gst_tax` = `restaurants[].gst_tax` (e.g., `"5.00"`).
- Else → `gst_tax = "0.00"`.
- If `show_user_gst === "Yes"` AND `booking_for === "Business"` → Firm Name + Firm GST block visible and required.
- `firm_gst` must match the Indian GSTIN regex (see §8 Open Q12 to confirm pattern).

### 6.4 Guest identity rules
- Primary: `name` non-empty, `phone` non-empty.
- `phone`: digits only; length-range from `restaurants[].phone` pattern — no rule specified by user (see §8 Open Q13).
- `email`: optional; when provided, must be RFC-5322-valid.
- `total_adult` integer ≥ 1 when `guest_details=Yes` (default 1).
- `total_children` integer ≥ 0 when `guest_details=Yes` (default 0).
- Dynamic slots rendered count = `total_adult − 1`, capped at max slots (§8 Open Q2).
- For each dynamic adult slot rendered: Name required, Document Type required, Doc Front/Back optional (confirm Open Q14).
- `children_name` required when `total_children > 0` (Open Q4).

### 6.5 Room rules
- `room_id[]` must contain at least 1 entry (guaranteed by auto-seeding primary room).
- Additional rooms selectable only if their `status === "available"`.

### 6.6 Payment rules
- `payment_mode` must be one of `payment_types[].name` where `prepaid === 1`.
- Required only when `advance_payment > 0`; when advance is 0, payment mode may be blank or defaulted.
- `advance_payment ≤ order_amount`.

### 6.7 File rules
- Accept `image/*` only. (Server-side limits to be confirmed — §8 Open Q15.)
- Each file max size / dimensions — pending.

### 6.8 OTP rule
- If `room_otp_require === "Yes"` → show OTP step before final submit (flow not scoped here — §8 Open Q8).
- `"No"` (sample) → skip OTP entirely.

## 7. Configuration Mapping (Profile API → Module)

### 7.1 Module availability
| Profile field | Value | Effect |
|---------------|-------|--------|
| `restaurants[].room` | `"Yes"` | Room Module available (room click → this modal) |
| `restaurants[].room` | `"No"` | Do not route available-room clicks to check-in |

### 7.2 Configuration type
| Profile field | Value | Effect (assumed — confirm in §8 Open Q1) |
|---------------|-------|-------------------------------------------|
| `restaurants[].configuration` | `"Simple"` | Basic configuration (Guest + Stay only) |
| `restaurants[].configuration` | *(2nd value — pending)* | Document configuration (adds adult/children + dynamic docs) |
| `restaurants[].configuration` | *(3rd value — pending)* | Third configuration (fields pending) |

### 7.3 Section visibility
| Profile field | Controls |
|---------------|----------|
| `guest_details` | Column 1 extended fields (Adults/Children + dynamic rows) + Column 2 Document fields |
| `booking_details` | Column 3 entire Booking & Payment section |
| `room_price` | Room Price field + inclusion in payload |
| `show_user_gst` + `booking_for=Business` | GST / Firm block |
| `room_gst_applicable` | Whether `gst_tax` picks up `restaurants[].gst_tax` or stays `0.00` |
| `room_billing_included` | Whether room charges roll into the master bill (informational for display) |
| `room_otp_require` | OTP step before submit |

### 7.4 Enum sources (replace hard-coded values)
| UI dropdown | Replace hard-coded with |
|-------------|--------------------------|
| Payment Mode | `restaurants[].payment_types[]` filtered by `prepaid === 1` — sample: Cash, Card, UPI, TAB, ROOM, Pay Later |
| Booking Type | Backend-confirmed enum — cURL shows `WalkIn`; Profile has no explicit enum. Current UI additionally supports `PreBooked`. **Confirm in §8 Open Q5.** |
| Booking For | cURL shows `Individual`; prior UI used `personal`/`business`. **Confirm mapping in §8 Open Q5.** |
| ID Type | cURL shows `License`; prior UI used `Aadhaar`/`Passport`/`DrivingLicense`/`VoterID`/`PAN`. **Confirm final enum in §8 Open Q16.** |

### 7.5 Formatting / locale
| Profile field | Effect |
|---------------|--------|
| `restaurants[].currency` | Currency symbol on Amount/Advance/Balance/Room Price (`"INR"` → ₹) |
| `restaurants[].bill_date_format` | Display-only date format (`dd/MMM/yyyy hh:mm a`) |
| `restaurants[].food_price_with_paisa` | `"No"` → hide decimals in display; payload unchanged |
| `restaurants[].total_round` | `"Yes"` → round display totals |

### 7.6 Role gating
- Existing Profile `role[]` must include something that permits room operations. Sample role array includes `room_report` but no explicit `room_checkin` permission. **Confirm in §8 Open Q17** whether a specific role token is required to see/submit the modal.

## 8. Gaps / Open Questions

**Q1 — Values of `configuration` field.** Sample shows `"Simple"`. The other two values and their exact field mappings are required.
**Q2 — Max adult slots.** cURL supports `name2/3/4`, i.e. 4 total. Confirm hard cap or whether slots grow unbounded with `total_adult`.
**Q3 — Field keys for additional-adult document images.** cURL only shows `front_image_file`/`back_image_file` for primary guest. Keys for 2nd/3rd/4th adult file uploads are not in the cURL.
**Q4 — Children capture.** Single `children_name` vs one row per child (name + DOB + ID?).
**Q5 — `booking_type` and `booking_for` canonical enum.** cURL shows `WalkIn`/`Individual`. Confirm full list and whether `personal`/`business` (old UI) are deprecated.
**Q6 — Dirty-form confirmation.** Should Cancel/Close prompt if form has user input?
**Q7 — Post-check-in refresh.** Confirm the dashboard must re-fetch TABLES + RUNNING_ORDERS on success (current code does not).
**Q8 — OTP flow.** When `room_otp_require=Yes`, what's the OTP endpoint, channel (SMS/email), and screen placement?
**Q9 — Success response schema.** Backend fields returned on success (e.g., `order_id`, `booking_id`) — needed for printing KOT/bill or opening the room detail.
**Q10 — `order_amount` editability.** When `room_price × nights` is auto-calculated, can the operator override?
**Q11 — Back-dated check-in.** Is same-day past time permitted? Past-dated check-in for walk-ins?
**Q12 — GSTIN regex.** Confirm exact validation pattern to use.
**Q13 — Phone validation.** India-only (10 digits) vs international? Confirm rule.
**Q14 — Adult #2/3/4 documents required?** Are ID images mandatory for non-primary adults when `guest_details=Yes`?
**Q15 — File limits.** Max MB/file, allowed MIME (jpg/png only?), server-side compression?
**Q16 — ID Type final enum.** Confirm authoritative list (and whether `License` replaces `DrivingLicense`).
**Q17 — Role permission.** Which role token in `role[]` gates access to the Room Check-In action?
**Q18 — Multi-room pricing.** If 2 rooms are selected, is `room_price` per-room or total? Does `order_amount = Σ(room_price) × nights` or something else?
**Q19 — Nights rounding.** Night count on same-day check-in/check-out (minimum 1)?
**Q20 — Payment currency.** Should `advance_payment`/`order_amount` respect `food_price_with_paisa=No` on both display and payload?

## 9. Implementation Notes for Agent

### 9.1 Profile flag lookup utility (strict)
- Introduce a `useRestaurantConfig()` hook / selector that reads `restaurants[0]` from the already-cached profile (existing `ProfileContext`/store) and returns a typed object:
  ```
  { room, guestDetails, bookingDetails, roomPrice, roomGstApplicable,
    showUserGst, configuration, roomOtpRequire, paymentTypes,
    currency, gstTax, billDateFormat }
  ```
- All booleans should come from `YES_NO_MAP` already present in `/app/frontend/src/api/constants.js`.

### 9.2 Config-type resolver
- Add a mapping constant (owned by frontend until backend ships an enum):
  ```
  CONFIG_TYPES = { SIMPLE: 'Simple', /* TBD_2: 'xxx', TBD_3: 'xxx' */ }
  ```
- Drive section visibility from the resolved config-type + the five boolean Profile flags (§7.3), NOT from `configuration` alone, because the flags may be toggled independently of `configuration`.

### 9.3 Payment Mode dropdown
- Replace hard-coded `PAYMENT_MODES` (`RoomCheckInModal.jsx:7`) with:
  ```
  paymentTypes.filter(p => p.prepaid === 1).map(p => ({ value: p.name, label: p.display_name }))
  ```

### 9.4 Date handling
- Use datetime-local inputs (or a lightweight picker already in the repo) to produce `YYYY-MM-DD HH:mm:ss` on submit.
- Default `checkin_date` to current local time rounded down to the nearest minute; default `checkout_date` to `checkin_date + 24h`.

### 9.5 Dynamic adult rows
- Render `Array.from({length: max(total_adult - 1, 0)}).map(i => <AdultDocRow index={i+2} />)`.
- Cap at `MAX_ADULT_SLOTS` (default 4 until Open Q2 is answered).
- Each row manages its own state and contributes fields `name{idx}`, `id_type{idx}`, and file keys (Open Q3).

### 9.6 Validation engine
- Use existing `zod` + `react-hook-form` (already in `package.json`) to express the rules in §6 as a single schema that branches on the Profile booleans.
- Show first error inline; show a single toast for "required fields missing" when form is submitted invalid.

### 9.7 Submit service
- Extend `roomService.checkIn` to accept every field from §5.2, including per-adult arrays and firm block.
- Preserve the JSON-vs-multipart switching logic (multipart iff any file present).
- Always send the empty slots (`name2=""`, `id_type2=""`, `children_name=""`, `firm_name=""`, `firm_gst=""`) to match the observed backend contract until Open Q is resolved.
- Add `X-localization: en` header (current client does not send it).

### 9.8 Post-success refresh
- In `DashboardPage.jsx:1408`, replace `onSuccess={() => setCheckInRoom(null)}` with a handler that triggers `refreshAllData(user.roleName || 'Owner')` and then clears `checkInRoom`.

### 9.9 Error UX
- Keep inline errors per field; top-level error only for server failures.
- Do not clear the form on server error — preserve user input.

### 9.10 Data-testids
- Extend existing pattern (`checkin-*`) for every new field:
  - `checkin-adult{n}-name`, `checkin-adult{n}-id-type`, `checkin-adult{n}-front`, `checkin-adult{n}-back`
  - `checkin-children-name`
  - `checkin-room-price`, `checkin-gst-tax`, `checkin-firm-name`, `checkin-firm-gst`
  - `checkin-booking-details`

### 9.11 Accessibility
- Every dynamic field must have a unique `id` and a linked `<label>`.
- File fields must expose the chosen file name to screen readers.

### 9.12 Sequencing (suggested order of work, non-binding)
1. Profile-driven config hook + config-type resolver.
2. Column 3 (Booking & Payment) rework — `room_price`, date-time pickers, payment_types binding, GST block.
3. Column 1 (Guest) — totals + dynamic adult rows + children.
4. Column 2 — file keys for additional adults (blocked on Open Q3).
5. Validation schema + inline errors.
6. `roomService.checkIn` payload extensions + `X-localization` header.
7. Dashboard `onSuccess` refresh wire-up.
8. Cleanup old hard-coded enums.

---

*End of document. All items in §8 must be resolved by the Product Owner before the Implementation Agent starts §9.2 onwards.*
