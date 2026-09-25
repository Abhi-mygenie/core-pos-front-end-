# CR-385 · G4-09 read-only probe — real Rooms › Area titles + snapshot shapes (2026-09-20, server business_date 2026-09-20)

Role: PLANNING · read-only GETs only (no writes, no settings changes). Auth: `memory/test_credentials.md` alias OWNER_TGK (RID 69). Token masked.

| Call | HTTP | Finding |
|---|---|---|
| `GET aiosell/room-status-board` | 200 | `data = {meta{business_date, server_time, timezone}, auto_hk_on_rm_checkout, rooms[]}` — **there is NO `sections[]` array.** Area = per-room `title`. 5 rooms, titles (raw): `"ground floor"`, `"first  floor"` (double space), `"2nd floor"`, `"3rd floor"`, `"patal lok"`. room keys: `aiosell_room_code, display_status, guest{booking_id,email,name,order_id,phone}, hk_assignee, is_occupied, manual_status, reservation, restaurant_table_id, room_operational_status_at, table_no, title`. |
| `GET aiosell/local-reservations?view=all` (no dates) | **422** | dates are mandatory even with `view=all` → FE must always send `start_date`/`end_date`. |
| `GET aiosell/local-reservations?view=all&start_date=2026-09-01&end_date=2026-10-31` | 200 | `data = {meta{business_date,server_time,timezone}, counts{arrivals_today, arrivals_late, arrivals_tomorrow, departures_today, departures_overdue, in_house, leaving_today, arrived_today}, reservations[80]}`. Reservation keys: `advance_payment, amount_after_tax, amount_before_tax, balance_payment (FORBIDDEN, D50), booked_on, booking_id, cancel_reason, cancelled_at, cancelled_by, channel, charge{rate_per_night, nights, rateplan_code, rateplan_name, upgrade_amount, booking_charge, sgst, cgst, total_with_gst, prepaid_amount, advance_payment, balance_due}, checkin, checkout, cm_booking_id, currency, guest, hotel_code, id, operational_status, pah, rooms[], special_requests, status, user_id_document_id`. |
| `GET aiosell/dashboard-kpis?start_date&end_date` | 200 (422 without dates) | `data{as_of_date, channel, physical, range, today}` |
| `GET v1/vendoremployee/profile` | 200 | `restaurants[0].settings.allow_early_checkin=false`, `extend_rate_mode="calendar"`, `auto_print_checkin_receipt=false` — sandbox at defaults. |

Files: `room_status_board.json`, `local_reservations_view_all.json`, `dashboard_kpis.json` (raw, unmodified).

## Additional shape facts (from the same 200 responses)
- `operational_status ∈ {pending, in_house, departed}`; `status` = `confirmed` (cancel/no-show rows carry `cancel_reason/cancelled_at`); `channel ∈ {Direct, WalkIn, booking.com}`.
- **`payment_status` is NOT a top-level reservation field.** It lives per room line: `rooms[].order_payment_status ∈ {unpaid, paid}` (+ `order_f_order_status`, `line_status ∈ {checked_in,…}`, `checked_in_at`, `checked_out_at`, `order_id`, `restaurant_table_id`, `table_no`, `table_title`, `adults`, `children`, `rateplan_code`). → Cleared helper (X-02) = `rooms[0].order_payment_status === 'paid' && charge.balance_due === 0`.
- `guest{first_name,last_name,phone,email,address_*}`; `rooms[].table_title` repeats the board `title` (area) for the booked room.
- In-house sample (id 155): legacy `advance_payment 100 / balance_payment 900` vs `charge.balance_due 950` — confirms D50 (legacy field is pre-GST; never read it).
- `dashboard-kpis` `today{arrivals_count, departures_count, in_house_count, no_show_count, occupancy_percent_physical}`, `physical{total_rooms, by_room_code, days[]}`.
