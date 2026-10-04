# BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16

## Summary
- **Issue:** CR-364 (PMS Guest Folio Detail Page) needs a hotel-style **Guest Folio** print. The existing bill-print pipeline is used today for room orders and already carries some room-money fields, but it is a restaurant-bill layout and does not render the fields a hotel folio needs (per-night charges, meal plan, channel, booking id, dated payment ledger, etc.).
- **Classification:** CONTRACT_MISMATCH + TEMPLATE_GAP (payload keys missing on `/order-temp-store`; print template branch missing on `rtype='RM'`).
- **Frontend impact:** front-desk cannot print a proper folio; walk-ins/checkouts print a restaurant bill labelled as a room bill. Owner-facing UX gap; no money-integrity issue.
- **Priority/Risk:** P1 · **HIGH** (print semantics change — R6 owner approval required before template goes live).
- **CR reference:** CR-364. Owner decision **OD-364-02 = FE will pass everything backend accepts; whatever is not passed simply won't print.**
- **Related:** CR-358-P2 (`reservation_ops` shape), REQ3 (`associated_orders[]` on bill print), BUG-386 (`room_payment_summary.gst_tax`), BUG-384 (`pos/room-payment` contract).

---

## Endpoint(s) Involved

### 1. `POST /order-temp-store` (bill-print payload sink) — extend
FE builds this payload in `orderTransform.buildBillPrintPayload` and posts it before the backend print template runs. Currently accepts a stable set of keys; **we want to add hotel-context keys** (listed below). Backend template is expected to render only the keys it recognises; unknown keys must be ignored (already the pattern for `rtype`, `custGST`, delivery keys).

### 2. Print template — new branch for `rtype: 'RM'`
The existing template already has an `rtype` field (see PRINT-MINI-CR May-2026). We need a **Guest Folio layout** when `rtype === 'RM'`, otherwise the current restaurant bill layout.

### 3. `GET /aiosell/get-single-order-new?order_id=` — enrich
FE reads `room_info` + `associated_order_list[]` from this endpoint. Two enrichments requested (see §4).

### 4. (Optional) `GET /pos/room-payments?order_id=` (currently 404 → B-364-01) — NEW ENDPOINT
For a dated payment ledger. Deferred per **OD-364-01 = totals only in v1** — do not build for CR-364 v1, but keep the field on the folio template so it can populate later.

---

## Auth / Context
- Auth: existing POS bearer token (same as current bill print).
- Endpoint currently in use: `POST /order-temp-store`.
- `rtype: 'RM'` is already emitted by FE (`buildBillPrintPayload` L2216).

---

## Desired Print Payload (superset — all possible fields)

Legend for **Source**:
- `EXISTS-FE` — FE already extracts, just needs wiring into print payload
- `EXISTS-BE` — backend already has it on `room_info` / `reservation_ops` / `orders` row
- `NEW-BE` — new field the backend needs to expose on `get-single-order-new`
- `TEMPLATE` — print template rendering only, no data change

### Block 1 — Restaurant / Hotel Identity (already passes today)
| Key | Type | Source | Notes |
|---|---|---|---|
| `restaurant_header` (name, address, GSTIN, phone, logo) | existing | EXISTS-BE (profile) | already renders |

### Block 2 — Document Header (NEW — folio-specific)
| Key | Type | Source | Notes |
|---|---|---|---|
| `doc_title` | string | TEMPLATE | Template renders "GUEST FOLIO" when `rtype='RM'`, "TAX INVOICE" otherwise |
| `folio_no` | string | NEW-BE (or reuse `order_id`) | Optional — if backend can mint a folio number distinct from order id, else reuse `restaurant_order_id` |
| `booking_id` | string | EXISTS-BE (`room_info.booking_details.booking_id`) | needed in print payload |
| `order_id` | number | already sent | keep |
| `restaurant_order_id` | string | already sent | keep |
| `channel` | string | EXISTS-BE (`room_info.booking_details.channel` — MMT/Booking.com/Agoda/Direct/Walk-in) | needed in print payload |
| `booking_type` | string | EXISTS-BE (`room_info.booking_details.booking_type` — PAH / Prepaid / Post-Paid) | needed in print payload |
| `channel_booking_id` | string | EXISTS-BE (`room_info.booking_details.cm_booking_id`) | OTA reference id |
| `printed_at` | ISO | already sent (`Date`) | keep |
| `cashier_name` | string | already sent (`waiterName`) | keep |
| `reprint_no` | int | NEW-BE (optional) | Increment on each print of same order_id |
| `is_duplicate_copy` | bool | NEW-BE (optional) | Renders "DUPLICATE" watermark |

### Block 3 — Guest Details
| Key | Type | Source | Notes |
|---|---|---|---|
| `guest_name` | string | EXISTS (`custName`) | already sent |
| `guest_phone` | string | EXISTS (`custPhone`) | already sent |
| `guest_email` | string | EXISTS-BE (`reservation_ops.guest.email`) — join needed on `get-single-order-new` | new payload key |
| `guest_address` | string | EXISTS-BE (guest capture at check-in) | new payload key |
| `guest_gstin` | string | EXISTS (`custGST`) | already sent (B2B) |
| `guest_gst_name` | string | EXISTS (`custGSTName`) | already sent |
| `guest_id_proof_type` | string | EXISTS-BE (`extra_adults[0].id_type`) | new payload key |
| `guest_id_proof_no` | string | EXISTS-BE (masked recommended) | new payload key — see §Security |
| `guest_country` | string | EXISTS-BE (`reservation_ops.guest.country`) | new payload key |
| `guest_company` | string | EXISTS-BE | new payload key (corporate stays) |

### Block 4 — Stay Details
| Key | Type | Source | Notes |
|---|---|---|---|
| `room_no` | string | EXISTS-FE (`roomInfo.roomNo`) → wire into payload | already on `room_info.room_no` |
| `room_type` | string | NEW-BE on `room_info.room_type` (currently only via `rooms.room_code`) | join `rooms` on the order |
| `room_code` | string | EXISTS-BE (`reservation_ops.rooms[0].room_code`) | new payload key |
| `check_in_date` | ISO | EXISTS-FE (`roomInfo.checkInDate`) → wire | already on `room_info.checkin_date` |
| `check_out_date` | ISO | EXISTS-FE (`roomInfo.checkOutDate`) → wire | already on `room_info.checkout_date` |
| `actual_check_in_at` | ISO | NEW-BE — timestamp when guest actually checked in | on `orders.created_at` for the RM order (verify) |
| `actual_check_out_at` | ISO | NEW-BE — timestamp when checkout was completed | verify against `orders.updated_at` when `line_status=checked_out` |
| `nights` | int | EXISTS-BE (`reservation_ops.rooms[0].no_of_days` or derived) | new payload key |
| `pax_adults` | int | EXISTS-BE (`total_adult`) | new payload key |
| `pax_children` | int | EXISTS-BE (`total_children`) | new payload key |
| `children_names` | string[] | EXISTS-BE (`children_name`) | new payload key |
| `extra_adults` | array | EXISTS-BE (`extra_adult_*` capture) — name + id proof type | new payload key |
| `meal_plan_code` | string | EXISTS-BE (`reservation_ops.rooms[0].rateplan_code`) | new payload key |
| `meal_plan_label` | string | EXISTS-FE (`decodeMealPlan()`) — server can send label OR FE derives | template can label CP/MAP/AP/EP |
| `rate_plan` | string | EXISTS-BE (`rateplan_code`) | new payload key |
| `special_requests` | string | EXISTS-BE (`reservation_ops.special_requests`) | new payload key |
| `cancellation_policy` | string | NEW-BE (optional, per rate plan) | new payload key |

### Block 5 — Room Charges (per-night lines)
| Key | Type | Source | Notes |
|---|---|---|---|
| `room_charge_lines[]` | array | **BACKEND EXPANSION REQUESTED** | Today `orderDetails` has one "check in" line = `room_price`. **Ask:** backend expands into per-night entries `[{date, description, qty, unit_rate, amount}]` when the stay spans multiple nights. If backend prefers not to expand, FE will derive from `room_price / nights` in v1 as a fallback. |
| `room_charge_subtotal` | decimal | EXISTS-BE (`room_info.room_price`) | new payload key (currently in `roomRemainingPay/Advance`, not exposed as subtotal) |
| `room_charge_gst_pct` | decimal | NEW-BE (per lodging slab) | new payload key |
| `room_charge_gst_amount` | decimal | EXISTS-BE (BUG-386 `room_payment_summary.gst_tax`) | new payload key |
| `room_discount_amount` | decimal | EXISTS-BE (`room_info.discount_amount`) | new payload key |
| `room_discount_reason` | string | EXISTS-BE (`room_info.discount_reason`) | new payload key |
| `extra_bed_charge` | decimal | NEW-BE (if any) | new payload key |
| `extra_pax_charge` | decimal | NEW-BE (if any) | new payload key |

### Block 6 — F&B / Extras Posted to Room (associated orders)
| Key | Type | Source | Notes |
|---|---|---|---|
| `associated_orders[]` | array | EXISTS partially (id, order_id, order_amount, order_status, created_at) | **Ask:** enrich each item with: `order_type_label` ("Restaurant Dinner" / "Room Service" / "Laundry" / "Bar"), `waiter_name`, `item_count`, and a short description or top-2 item names for the folio line. |
| `associated_orders_subtotal` | decimal | derived | template can sum |
| `associated_orders_gst_amount` | decimal | NEW-BE (sum of F&B GST across associated orders) | new payload key |

### Block 7 — Totals (mostly existing)
| Key | Type | Source | Notes |
|---|---|---|---|
| `order_item_total` | decimal | already sent | keep |
| `order_subtotal` | decimal | already sent | keep |
| `discount_amount` | decimal | already sent | keep |
| `coupon_code`, `coupon_discount`, `loyalty_dicount_amount`, `wallet_used_amount` | mixed | already sent | keep |
| `service_charge_amount` | decimal | already sent (`serviceChargeAmount`) | keep — must be zero for room-charge portion (architectural rule) |
| `cgst_amount`, `sgst_amount`, `igst_amount` | decimal | template branch | render breakup |
| `round_off_amount` | decimal | NEW-BE (if used) | template only if backend supports |
| `payment_amount` | decimal | already sent (food-only Total) | keep |
| **`grant_amount`** | decimal | already sent (Grand Total incl. room + associated) | keep — this is the folio "GRAND TOTAL" |

### Block 8 — Payments (dated ledger)
| Key | Type | Source | Notes |
|---|---|---|---|
| `payments[]` | array | **EXISTS-FE** (`roomInfo.roomPaymentSummary.payments[]`) → wire into payload | Each: `{date, type ("advance"/"interim"/"checkout"/"refund"), mode, ref/note, amount, employee}` |
| `total_advance_paid` | decimal | EXISTS (`roomAdvancePay`) | already sent |
| `total_interim_paid` | decimal | EXISTS-FE (`roomPaymentSummary.ledgerPaidAmount − legacyAdvancePayment`) → wire | derived, new payload key |
| `total_received` | decimal | EXISTS-BE (`room_info.receive_balance`) | new payload key |
| `balance_due` | decimal | EXISTS (`roomRemainingPay`) | already sent |
| `payment_status` | string | EXISTS-BE (`room_info.payment_status`) → wire | new payload key |
| `balance_payment_mode` | string | EXISTS-BE (`room_info.balance_payment_mode`) → wire | new payload key |
| `folio_status` | enum | derived (`PAID` / `UNPAID` / `PARTIAL` / `CHECKED_OUT`) | template renders badge |

### Block 9 — Footer (template-only)
| Key | Type | Source | Notes |
|---|---|---|---|
| `terms_conditions` | string | EXISTS-BE (profile setting) | render |
| `thank_you_note` | string | EXISTS-BE (profile setting) | render |
| `signature_lines` | bool | TEMPLATE | show guest + cashier sign lines |
| `qr_code_upi` | string | NEW-BE (optional) | for balance-due folios, embed UPI QR |
| `barcode` | string | NEW-BE (optional) | folio number barcode for filing |
| `computer_generated_note` | string | TEMPLATE | "This is a computer-generated folio · Reprint No: N" |

---

## Backend Questions

| # | Question |
|---|---|
| **Q-364P-01** | Confirm `/order-temp-store` will accept and pass through any additional keys we send (silently ignoring unknown keys), so FE can start emitting the fields above without a coordinated deploy. |
| **Q-364P-02** | Can backend enrich `get-single-order-new` `room_info` with: `room_type` (label), `room_payment_summary.payments[].date/mode/type` (already partially there — confirm shape and completeness), guest email/address/id-proof (from check-in capture), `booking_details.channel`, `booking_details.booking_type`, `booking_details.cm_booking_id`, `booking_details.meal_plan`, `booking_details.adults`, `booking_details.children`, `booking_details.no_of_days`, `special_requests`? |
| **Q-364P-03** | Will backend expand the room charge into **per-night lines** in `orderDetails[]` (like `[{date, description, qty, unit_rate, amount}]`) or should FE derive on the client side from `room_price / nights` as a fallback? Preference: backend expansion (single source of truth). |
| **Q-364P-04** | Can `associated_orders[]` (in `get-single-order-new` **and** in the print payload we echo back) be enriched with `order_type_label`, `waiter_name`, `item_count`, and a short line description? Today FE only has `id`, `order_id`, `order_amount`, `order_status`, `created_at`, which prints as an opaque row. |
| **Q-364P-05** | Confirm the correct **lodging GST %** and **lodging GST amount** fields on `room_info` (post BUG-386). Should FE pick `room_payment_summary.gst_tax` for print, or a separate `room_info.gst_amount`? |
| **Q-364P-06** | Does backend already compute a **round-off** on room folios? If yes, expose it; if no, template omits. |
| **Q-364P-07** | Please expose (if not already) `orders.checkin_at` (actual, timestamp when the guest was checked in) and `orders.checkout_at` (actual, when checkout was completed) — distinct from the **booked** dates on `room_info.checkin_date/checkout_date`. Front-desk folios often print both. |
| **Q-364P-08** | Can backend mint an incrementing **reprint counter** per `order_id` (returned on each `/order-temp-store` call for the same order) so the folio can say "Reprint No: 2"? Optional. |
| **Q-364P-09** | Should the folio show a **"DUPLICATE COPY"** watermark on all reprints (some regulators require it)? If yes, expose `is_duplicate_copy` on the reprint response. |
| **Q-364P-10** | Please confirm the print-template branch: when `rtype === 'RM'`, render the **Guest Folio layout** (per §Desired Print Payload above). When `rtype === 'TB'` (or anything else), keep the current restaurant bill layout untouched. Requires **owner sign-off** per R6 before going live. |
| **Q-364P-11** | Any **regulatory requirements** for folio format in the target regions we should account for now (GST invoice rules, HSN codes for lodging vs F&B, mandatory HSN 996311 for room accommodation, tax invoice sequential numbering, etc.)? |
| **Q-364P-12** | On departed-guest reprints (OD-364-05 pending), do you need a hard **access window** (e.g., 60 days) enforced backend-side, or is order-id-based access acceptable indefinitely? |
| **Q-364P-13** | For OTA-prepaid stays with zero balance and zero cash movement, should the folio still print, or produce a **"NO CHARGES DUE"** summary variant? |
| **Q-364P-14** | Confirm the **payment_type enum** on `pos/room-payment` (`advance` / `interim` / `checkout` / `refund`) is the exact set the folio ledger will render. Any additional types (e.g., `deposit_release`, `write_off`, `void`) we should account for on the template? |
| **Q-364P-15** | Is there a **UPI QR** or **payment link** the backend can generate per unpaid folio (for guest-side quick pay)? Optional. If yes, expose as `qr_code_upi` string (or URL) on the payload. |

---

## Reproduction / Current State
1. Check in a guest with meal plan, OTA booking, extra adult with ID proof.
2. Post an F&B order to the room (associated order).
3. Record a mid-stay payment via `POST pos/room-payment` (contract confirmed 2026-09-10).
4. Reprint the bill from `PmsCheckoutDrawer` or Dashboard → the printed A4 renders a restaurant-style bill with room advance/balance appended, missing: room#, dates, meal plan, channel, booking id, dated payment ledger, special requests, per-night rate breakdown.

---

## Frontend Workaround
- **Available:** partial — FE already has most of the data (`roomInfo`, `roomPaymentSummary.payments[]`, `reservation_ops`). We can wire them into `buildBillPrintPayload` in a **v1 FE pass** without any backend change, and the template will start rendering whatever it recognises.
- **Constraint:** template-side rendering (Block 2 `doc_title` = "GUEST FOLIO", per-night line layout, folio badges) still needs backend work — cannot ship a proper folio look without it.

---

## Evidence
- FE transform: `orderTransform.js` L391–L437 (`roomInfo` + `roomPaymentSummary.payments[]`) — data already available FE-side
- FE print payload builder: `orderTransform.js` L1797–L2268 (`buildBillPrintPayload`) — where new keys will be added
- FE print endpoint: `orderService.js` L134–L189 (`printOrder`)
- Reservation join source: `aiosellTransform.js` L120–L152 (`fromPendingArrival`) — guest email, meal plan, adults/children, special requests, nights already normalised FE-side
- Intake: `/app/memory/change_requests/CR-364_PMS_GUEST_FOLIO_DETAIL_PAGE_INTAKE.md`
- Related briefs: `BACKEND_BRIEF_BUG-384_2026_09_09.md` (`pos/room-payment` contract), `BACKEND_BRIEF_ROOM_ORDERS_AGGREGATION_2026_08_26.md`

---

## Security / Compliance Notes
- **Guest ID proof number** must be masked on print (last 4 only) unless the tenant explicitly opts into full print for regulatory purposes.
- **Guest phone** — keep as-is on print (staff needs to reach the guest). Not masked in this context.
- **Card last4** on payment ledger — never store or print full PAN. Only `****last4`.
- **UPI reference** — masked format if backend chooses to render.
- No new secret material introduced.

---

## Owner Decisions Already Made
- **OD-364-01:** ship v1 with running totals; no dated ledger endpoint dependency for v1 (but keep the field on the template so it lights up later).
- **OD-364-02:** FE will pass every field backend accepts; whatever is not passed simply won't print. **Backend must gate the layout switch on `rtype='RM'`.**

## Owner Decisions Still Pending
- OD-364-03 (link re-point vs. add), OD-364-04 (F&B inline vs. drill), OD-364-05 (departed access window).
