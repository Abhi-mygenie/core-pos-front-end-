> **SUPERSEDED 2026-09-19 — tracked in `BACKEND_BRIEF_CR-385_MASTER.md`. Kept as history; do not update.**

# BACKEND_BRIEF_CR-385 — Phase 1 contract (booking charge aggregation · upgrade · advance at booking · auto-print setting · business date) — 2026-09-19

## Summary
- Source: Impact Analysis `investigations/CR-385_IMPACT_ANALYSIS_2026_09_19.md` §5/§12 + owner decisions D46 (DEC-1 backend aggregates the booking charge; DEC-6 upgrade / auto-print / advance-at-booking are all Phase 1; DEC-3 Credit-only for unpaid balance; DEC-2 refunds offline in Phase 1).
- Classification: **FEATURE_ASK** (5 items) + **DATA_ISSUE** (1 item). Priority **P0 / CRITICAL** — every Phase 1 money screen depends on BQ-385-08. Nothing here is optional for Phase 1.
- Frontend impact: today the booking amount is typed or recomputed in the browser on 4 screens (Check-In editable box, New Booking typed, Modify/Extend recomputed) → "one booking, four amounts". Modify currently PATCHes `amount_after_tax: 0` when rate plans exist (BUG pending intake). With this contract the FE **displays only, never computes**.
- Supersedes nothing; extends `BACKEND_BRIEF_CR-385_2026-09-17.md` (BQ-385-01…04) and the 2026-09-18 addendum (BQ-385-06). BQ-385-04 is **closed** (owner: non-OTA = Cancel only, no backend change). BQ-385-07 (room discount) is **deferred to Phase 2**.
- Account for probes: alias `goankitchen_owner_rid69` (RID 69, `sandbox-pms`). Token masked `***`.

---

## BQ-385-08 — Aggregated booking charge on every reservation (P0 · FEATURE_ASK)

### Endpoints
`GET aiosell/local-reservations` (list rows) · `GET aiosell/local-reservations/{id}` · `PATCH aiosell/local-reservations/{id}` (modify) · `POST extend-stay` · `POST pms/check-in` · `POST aiosell/direct-reservation`.

### Ask
Every reservation row/response carries **one server-computed charge block** the FE shows verbatim on Arrivals, Check-In, Modify, Extend, No-Show, Cancel, Bill and Room Detail:

```json
"charge": {
  "rate_per_night":     3000.00,   // room-type rate + rate-plan supplement, pre-GST
  "nights":             3,
  "rateplan_code":      "EP",
  "rateplan_name":      "Room only",
  "upgrade_amount":     0.00,      // BQ-385-09, pre-GST, 0 when none
  "booking_charge":     9000.00,   // rate_per_night × nights + upgrade_amount, pre-GST
  "sgst":               225.00,
  "cgst":               225.00,
  "total_with_gst":     9450.00,   // == amount_after_tax
  "prepaid_amount":     0.00,      // OTA prepaid, GST-inclusive (D44-g); 0 when pay-at-hotel
  "advance_payment":    2000.00,   // sum of advances collected (booking + check-in), BQ-385-10
  "balance_due":        7450.00    // total_with_gst − prepaid_amount − advance_payment, ≥ 0
}
```

### Rules
1. **Recompute server-side** on modify (dates / type / plan), extend (new checkout), upgrade (paid) — FE sends only the *intent* (`new_checkout`, `room_code`, `rateplan_code`, `upgrade`), never an amount. Drop `new_room_price` and `amount_after_tax` from the FE-writable surface (or ignore them when `charge` exists).
2. `sgst`/`cgst` are always two separate values (AC-04); never a merged `gst`.
3. Money is 2-dp decimals, never strings with `₹`.
4. Existing fields (`amount_after_tax`, `pah`, `advance_payment`, `balance_payment`) may stay for backwards compatibility but `charge.*` is authoritative. Confirm whether `pah` (BUG-413) becomes `charge.prepaid_amount > 0`.

### Questions
| # | Question |
|---|---|
| Q1 | Can `charge` be added to the LR list rows (not only detail) so Arrivals/Departures don't need N detail calls? |
| Q2 | For OTA bookings whose rate comes from the channel, is `rate_per_night` the OTA net rate or the rack rate? FE only needs it consistent with `total_with_gst`. |
| Q3 | On `PATCH` modify with a new `rateplan_code` / `room_code`, does the backend return the recomputed `charge` in the response (so the dialog previews before Save via a dry-run flag `preview=true`)? |

### Frontend workaround (until delivered)
**None acceptable for money.** FE will freeze the amount box read-only showing `amount_after_tax` and disable rate recompute in Modify/Extend (send dates only). Modify ₹0 bug fix is independent (BUG intake).

---

## BQ-385-09 — Room upgrade at Check-In (P0 · FEATURE_ASK · D23)

### Endpoint
`POST pms/check-in` (multipart today).

### Ask
Accept
```
upgrade_type   = none | complimentary | paid
upgrade_amount = 0.00            // required when paid; pre-GST, per stay (not per night)
upgrade_reason = "..."           // required when complimentary or paid
```
- `complimentary`: room of a higher type is assigned, `charge.booking_charge` unchanged, flag stored for reporting.
- `paid`: `charge.upgrade_amount` = value, `booking_charge`/GST/`total_with_gst`/`balance_due` recomputed (BQ-385-08 rule 1), appears as its own line on the folio/bill.
- Reject (422) an upgrade to a **lower** type, and a paid upgrade with amount ≤ 0.

### Questions
| # | Question |
|---|---|
| Q1 | Is a paid upgrade a separate order line (so the Bill "Room" section can show "Upgrade to Suite ₹1,500") or folded into the room price? FE prefers a separate line. |
| Q2 | Does the check-in response return the recomputed `charge` so the balance strip updates without a second GET? |

---

## BQ-385-10 — Advance collected at booking time (P0 · FEATURE_ASK + DATA_ISSUE · D34, replaces OD-P2-07)

### Endpoint
`POST aiosell/direct-reservation` (JSON) · `GET aiosell/local-reservations` (read-back).

### Ask
1. Accept on create:
```json
"advance": { "amount": 2000.00, "method": "cash|card|upi", "reference": "UTR/Txn no. (required unless cash)", "collected_at": "ISO" }
```
   Reject 422 when `amount > charge.total_with_gst` or when `reference` missing for card/upi.
2. **Read-back**: `charge.advance_payment` on the LR row must equal the sum of advances collected (booking + check-in). Today `advance_payment` on LR is not authoritative (Data Inventory; BQ-385-03 `balance_payment` inconsistent). This is the DATA_ISSUE part.
3. Booking by **room type** (not room id): accept `room_code` + `rateplan_code` + `rooms_count` and let the backend allocate/hold inventory; `restaurant_table_id` becomes optional (assigned at check-in). Ties to BQ-385-06 (availability by date range) — still unanswered.
4. Optional B2B on create: `firm_name`, `firm_gst_no` (same fields Check-In already sends).

### Questions
| # | Question |
|---|---|
| Q1 | Does an advance at booking create a payment record visible on the folio/bill (so checkout deducts it automatically), or only a number on the reservation? FE needs it deducted at checkout. |
| Q2 | If `restaurant_table_id` is omitted, does the backend hold type-level inventory and push it to OTAs? |

### Frontend workaround
Booking keeps "no advance" until delivered (current behaviour). Room picker keeps the client-side overlap filter from the 2026-09-18 addendum.

---

## BQ-385-11 — Auto-print check-in receipt setting (P1 · FEATURE_ASK · D32)

### Ask
- A business-level boolean setting **`pms.auto_print_checkin_receipt`** (default `false`) readable via the existing settings endpoint the FE already loads at login (same mechanism as printer-agent config, CR-133).
- No new print endpoint needed: FE renders the receipt (guest, room, dates, `charge.*`, advance, balance, firm GST, property GSTIN) and prints through the existing printer-agent path. Manual "Print receipt" button is always available regardless of the setting.

### Question
| # | Question |
|---|---|
| Q1 | Confirm the settings key namespace and whether it is per-restaurant (RID) or per-user. FE assumes per-RID. |

---

## BQ-385-12 — Server-authoritative Front Desk snapshot: business date + tab counts with the list (P1 · FEATURE_ASK · owner DEC-7, 2026-09-19)

### Owner decision
**Server is the single source of truth for "today" and for every tab number.** FE displays only — no client-side counting, no client-side date logic. Multi-terminal consistency requires every desk to receive one identical, self-consistent snapshot.

### Problem today
- Tab numbers come from `dashboard-kpis` (server date) while the list is bucketed in the browser with the desk PC's date (`localDate()`), and three pages use `toISOString()` (UTC) — after 18:30 IST the browser flips to "tomorrow" while the server (IST) does not. Two clocks → tab ≠ list, and different terminals can disagree.
- `dashboard-kpis` already returns `as_of_date` and `today{arrivals_count, departures_count, in_house_count, no_show_count}` — close, but lacks the late / overdue / leaving-today buckets and is a separate call from the list.

### Ask
Return **list + counts + business date in one response** (preferred: extend `GET aiosell/local-reservations`; alternative: `GET aiosell/front-desk-snapshot` per BQ-385-02 A1):
```json
{
  "meta":   { "business_date": "2026-09-19", "server_time": "2026-09-19T20:05:12+05:30", "timezone": "Asia/Kolkata" },
  "counts": {
    "arrivals_today": 6,        // pending, checkin == business_date
    "arrivals_late": 3,         // pending, checkin <  business_date (not yet no-show/cancelled)
    "arrivals_tomorrow": 2,     // pending, checkin == business_date + 1
    "departures_today": 4,      // in_house, checkout == business_date
    "departures_overdue": 0,    // in_house, checkout <  business_date
    "in_house": 18,             // in_house (all)
    "leaving_today": 4,         // == departures_today (D44-h: excludes overdue)
    "arrived_today": 2          // in_house, checked_in_at on business_date
  },
  "reservations": [ ...rows unchanged... ]
}
```
Rules: counts are computed on the **same rows at the same instant** as the list; `business_date` is the property's operational date (night-audit roll if one exists, else calendar date in property timezone — Q1). Rooms tab (occupancy %, HK, OOO) stays on `room-status-board`, which should also carry `meta.business_date`.

### FE behaviour once delivered
- Tabs show `counts.*` verbatim; lists are the rows as returned. Chips/alerts ("3 late", "0 overdue") read `counts`.
- All `localDate()` / `toISOString()` date logic in PMS pages is removed; `meta.business_date` is the only "today".
- A small warning chip is shown when the device clock differs from `server_time` by > 5 minutes (informational only — nothing is computed from the device clock).

### Questions
| # | Question |
|---|---|
| Q1 | Does the PMS have a night-audit business date that rolls at audit time? If yes return it; if no, calendar date in property timezone. |
| Q2 | Should `counts` live on `local-reservations` (one call) or on `dashboard-kpis` + `meta.business_date` on both (two calls, same server instant not guaranteed)? FE prefers one call. |
| Q3 | Definitions above follow D44-h. Confirm `arrivals_late` excludes rows already `no_show`/`cancelled`, and `departures_today` excludes rows already `departed`. |

### Frontend workaround (until delivered)
FE keeps today's behaviour but replaces the browser date with `dashboard-kpis.as_of_date` where available (one-line change per page) to remove the UTC flip; counts still derived client-side as an interim — flagged in the UI as provisional.

## Phase 2 (recorded, not asked now)
- **BQ-385-13** Refund / penalty preview for No-Show & Cancel (`prepaid`, `penalty`, `penalty_sgst`, `penalty_cgst`, `refund_due`, `refund_mode`) — owner DEC-2: Phase 1 = OTA refunds handled by OTA, cancel refunds offline.
- **BQ-385-07** Room-level discount at checkout — deferred.
- **BQ-385-01** Socket.io push, **BQ-385-02** aggregation endpoints — unchanged (Phase 2).

## Closed
- **BQ-385-04** Non-OTA no-show — owner: Cancel only. No backend change.

## Dependencies / order
BQ-385-08 first (everything else writes into `charge.*`) → 09/10 together (both mutate `charge`) → 12 (snapshot: counts + business date, independent of 08) → 11 (settings only).

## Evidence
- `investigations/CR-385_IMPACT_ANALYSIS_2026_09_19.md` §4.1 G-01…G-08, §5 B-1…B-6, §12.
- Current payloads: `pmsService.js` L196–209 (`createDirectReservation`, no advance), L226–275 (`pmsCheckIn`, FE-computed `balance_payment`), L490–514 (`modifyReservation` client `amountAfterTax`, `extendStay` client `newRoomPrice`).
- `evidence/CR-385/CR-385_local_reservations.json` — current LR row shape (`amount_after_tax`, `pah`, `advance_payment`).

---
## Addendum 2026-09-19 (evening) — facts from live probes (`evidence/CR-385/probes_2026_09_19/`)
- `PATCH local-reservations/{id}` with dates only **does not recompute** `amount_after_tax` (2→4 nights kept ₹6,000) → BQ-385-08 rule 1 is required, not optional.
- `PATCH … {amount_after_tax: 0}` is **accepted** (stored 0.00) and `balance_payment` is left untouched (6000) → please add validation (`amount > 0`, or ignore FE amount once `charge` exists) and derive `balance_payment` from `charge`.
- `rooms[].rateplan_code` in PATCH body is ignored; `?preview=true` is ignored (write happens) → Q3 stands.
- LR row already exposes `amount_before_tax`; folio `room_info.gst_tax` is a single merged value → `charge.sgst` / `charge.cgst` needed for the AC-04 split.
- `dashboard-kpis` already returns `as_of_date` → BQ-385-12 can be satisfied by adding `business_date/server_time/timezone` next to it and on the LR response.
- Settings have no PMS print key (`printer_agent: "No"` at property level); `pay_tab: "Yes"` confirms Credit/TAB is a configured method (DEC-3).
- `mark-no-show` Direct → 422 (BQ-385-04 closed, no change). Cancel response has no refund fields (BQ-385-13 Phase 2).
