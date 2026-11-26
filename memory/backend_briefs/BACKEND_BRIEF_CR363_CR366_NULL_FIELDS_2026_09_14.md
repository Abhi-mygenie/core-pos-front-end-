# BACKEND_BRIEF_CR363_CR366_NULL_FIELDS_2026_09_14

## Summary
- **Issue:** `aiosell/night-audit` and `aiosell/revenue-summary` endpoints are shipped and returning 200, but multiple fields in the response are `null` where the FE design requires populated values. This blocks v1 UI completeness in Sections C (Outstanding), H (Reconciliation), I (Audit Trail), and Revenue Dashboard KPI widgets.
- **Classification:** DATA_ISSUE (endpoint exists, data not populated)
- **Frontend impact:** Outstanding section shows all "—" for guest names, rooms, dates. Reconciliation section H is partially blank. Audit trail detail is missing. Revenue analytics lead-time/LOS widgets cannot display. Channel booking counts look incorrect.
- **Priority/Risk:** P1 (CR-363 Night Audit is P1 HIGH) / P2 (CR-366 Revenue is P2 MEDIUM)
- **Owner decision (2026-09-14):** Ship FE v1 with "—" for nulls and file this brief simultaneously. FE does NOT wait for BE fix.

---

## Endpoint 1 — `GET aiosell/night-audit`

### Issue A — Section C: Outstanding guest rows (BN-1)

**Fields null on ALL rows in probe (2026-09-14):**
```
outstanding.rows[].guest_name     → null
outstanding.rows[].room_code      → null
outstanding.rows[].checkin        → null
outstanding.rows[].checkout       → null
```

**Evidence:** `/app/memory/evidence/CR-363/probe_night_audit_2026_09_14.json` — all rows in `outstanding.rows[]`

**FE workaround:** Render "—" in those cells. Section still shows `room_no`, `order_id`, balance figures (non-null). Usable but incomplete — staff cannot identify guest without name.

**Priority:** HIGH — guest name is the primary identifier staff use for Section C.

**Question B-NF-01:** `outstanding.rows` is populated from `get-single-order-new` or a JOIN in the aggregation service? If the latter, which table is `guest_name` read from — is it `reservations.guest_name` or `users.name`? Is there a case where the booking exists but the guest record is absent?

---

### Issue B — Section H: Reconciliation (BN-2)

**Fields null in probe:**
```
reconciliation.settlement_total_collection  → null
reconciliation.settlement_fnb_share         → null
reconciliation.by_waiter[].name             → null
reconciliation.by_waiter[].today_collection → null
```

**Non-null (working):**
```
reconciliation.settlement_room_share              → populated
reconciliation.night_audit_room_cash_card_upi     → populated
reconciliation.delta                              → populated
reconciliation.by_waiter[].room_share             → populated
```

**Evidence:** Same probe file above, `data.reconciliation`.

**FE workaround:** Section H v1 displays only the 4 non-null fields: settlement room share, night-audit room cash/card/UPI, delta, and per-waiter room share. Other cells show "—".

**Question B-NF-02:** `settlement_total_collection` and `settlement_fnb_share` — are these expected to be populated from `waiter/get-settlement-report` JOIN? Is this a query omission or a data-pipeline gap (F&B orders not yet associated to waiter settlement for the date)?

**Question B-NF-03:** `by_waiter[].name` and `by_waiter[].today_collection` — is `name` from `employees` table and `today_collection` the `Σ(order-bill-payment)` for that waiter on date D? If so, what is the JOIN key — `waiter_id`?

---

### Issue C — Section I: Audit Trail detail (BN-3 / BUG-193 family)

**Fields null for `transfer_to_room` event type:**
```
audit_trail[].detail.previous_table_id  → null
audit_trail[].detail.current_table_id   → null
```

**Evidence:** Same probe file, `data.audit_trail[]` where `type = "transfer_to_room"`.

**FE workaround:** When both `detail` IDs are null, the FE shows only `type + order_id + by + at`. No room/table detail rendered.

**Note:** This is the same symptom family as **BUG-193** (Room Transfer Trail shows table transfers + "From Room = 0"). If the root cause is the same lifecycle-log gap in `order_lifecycle_logs`, fixing it here will also resolve BUG-193.

**Question B-NF-04:** For `transfer_to_room` events, which columns in `order_lifecycle_logs` hold the previous and current room/table? Are they being written at transfer time? Is the null specific to room→room transfers vs table→room transfers?

---

### Issue D — Occupancy > 100% (BN-4)

**Observation:**
```
occupancy.by_room_type[executive].occupancy_percent = 200  (sold: 2 / capacity: 1)
```

**FE workaround:** FE clamps the visual bar at 100%; displays raw percentage text as-is (do not recompute — R6). Occupancy > 100% is not an FE display error; it is a data anomaly.

**Question B-NF-05:** Is `capacity = 1` correct for the Executive room type, or is there a capacity-mapping error in the backend (room type table vs inventory table mismatch)?

---

## Endpoint 2 — `GET aiosell/revenue-summary`

### Issue E — Totals section nulls (BN-5)

**Fields null in probe (2026-09-14):**
```
totals.bookings_count        → null
totals.avg_los_nights        → null
totals.avg_lead_time_days    → null
totals.outstanding_balance   → null
```

**Evidence:** `/app/memory/evidence/CR-366/probe_revenue_summary_day_2026_09_14.json` — `data.totals`.

**FE workaround:** Widgets for "Lead time", "Avg LOS", and "Outstanding balance" show "—" / hidden in v1 until BE populates. The 4 core KPI tiles (Occupancy, ADR, RevPAR, Revenue) are unaffected.

**Question B-NF-06:** These 4 fields — are they planned but not yet implemented in the aggregation service, or are they being computed but the query is returning 0 rows for the tested date range?

---

### Issue F — Channel booking count (BN-5 continued)

**Observation:**
```
by_channel[].bookings = 0   for ALL channels
by_channel[].room_nights > 0  (e.g. Direct = 3, booking.com = 5)
```

Room nights are non-zero, but `bookings` count is always 0.

**FE workaround:** Channel breakdown table hides `bookings` column in v1, shows `room_nights` + `room_revenue_booked` + `share_of_revenue_percent` only.

**Question B-NF-07:** `bookings` — is this a count of `local-reservations` records (booking-level), while `room_nights` is nights-level? If so, is the JOIN to the bookings table missing in the revenue-summary aggregation?

---

### Issue G — `group_by=month` (BN-6)

**Not probed yet.** Backend Q-366-10 documented it as accepted; FE will use it for ranges > 366 days.

**Question B-NF-08 (pre-Gate 3 probe):** Confirm `group_by=month` returns 200 with monthly `series[]` buckets. FE will probe before Gate 3 implementation.

---

## Summary Table

| # | Endpoint | Section | Field(s) | FE workaround | Question |
|---|---|---|---|---|---|
| BN-1 | night-audit | C Outstanding | `guest_name`, `room_code`, `checkin`, `checkout` | Render "—" | B-NF-01 |
| BN-2 | night-audit | H Reconciliation | `settlement_total_collection`, `settlement_fnb_share`, `by_waiter[].name/today_collection` | Show 4 non-null fields only | B-NF-02, B-NF-03 |
| BN-3 | night-audit | I Audit Trail | `detail.previous_table_id`, `detail.current_table_id` | Hide detail row | B-NF-04 (BUG-193) |
| BN-4 | night-audit | A Occupancy | `by_room_type.occupancy_percent > 100` | Clamp bar at 100 % | B-NF-05 |
| BN-5 | revenue-summary | Totals | `bookings_count`, `avg_los_nights`, `avg_lead_time_days`, `outstanding_balance` | Hide those widgets | B-NF-06 |
| BN-6 | revenue-summary | by_channel | `bookings = 0` | Hide bookings column | B-NF-07 |
| BN-7 | revenue-summary | — | `group_by=month` unprobed | FE to probe pre-Gate 3 | B-NF-08 |

**Priority for BE:** BN-1 (guest name) is the most user-visible gap — Section C is the primary reason night staff use the audit report. BN-2 (reconciliation) is second priority as it blocks the cash-tie-out use case.

---

## Frontend Workaround
- Available: YES (all sections functional with "—" placeholders)
- Shipping: YES — FE v1 ships with "—" per owner decision OD-363-08 (2026-09-14)
- Re-enable path: Once BE fields populated, FE requires no code change (transform already null-normalises; populated values will auto-render)

---

*Filed: 2026-09-14 · Planning agent (ALPHA v0.7) · Related: CR-363, CR-366, BUG-193*
