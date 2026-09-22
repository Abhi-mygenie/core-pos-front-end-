# BACKEND_BRIEF_CR-385 — MASTER (single tracked brief for the Front Desk Workstation)

```
Version:      2.2 · 2026-09-22 (v2.1 2026-09-21) (v1.0 2026-09-19) · **v2.1: BQ-385-23/24 (Phase 1 QA asks, not blocking)** · **v2.0: BQ-385-22 perf/aggregation asks (not blocking)** · **v1.9: N11 FIXED + verified (per-night GST slab, `nights_detail[]`) · new D14 (P2, calendar extend response `charge` stale by the same-call payment) · BQ-385-19 (P2 ask: `nights_detail` on LR list)** · supersedes BACKEND_BRIEF_CR-385_2026-09-17.md, _ADDENDUM_2026-09-18.md, _PHASE1_CONTRACT_2026-09-19.md (kept as history)
From / To:    MyGenie POS frontend team → PMS backend team
Scope:        CR-385 Front Desk Workstation — every backend question, contract change and data issue, one section each
Owner rules:  DESIGN_DECISIONS D44–D46 (money rules · owner answers DEC-1…9) · mockup v2.26 accepted 2026-09-19
Probe acct:   goankitchen_owner_rid69 (RID 69, hotel_code sandbox-pms) · raw responses: evidence/CR-385/probes_2026_09_19/
How to reply: answer INLINE under the BQ's "### Backend answer" heading, flip the Status cell in §1, add a line to §6 Change log. No other file needs updating.
```

## 1. Tracker — one row per question, one row per blocker

| BQ | Blocker | Title | Prio | Phase | Status | Blocks (functionality) | Answered |
|---|---|---|---|---|---|---|---|
| BQ-385-08 | **B-1** | Aggregated `charge{}` on every reservation + server recompute + validation | **P0** | 1 | **DELIVERED · VERIFIED** (probe 2026-09-20 W1a/1b/1c) | Arrivals ₹ · Check-In amount/GST/balance · Modify · Extend · Bill Room block · No-Show/Cancel prepaid (AC-01/03/04) | — |
| BQ-385-09 | B-1 | Room upgrade (complimentary / paid) at check-in inside `charge{}` | P0 | 1 | ✅ **VERIFIED build 3** — `rate 9500 + upgrade 1500 = booking_charge 11000`, GST 18 % held, folio line "Room upgrade: <reason>" ₹1,500 (D1/D9/D10 fixed) | Check-In upgrade toggle (D23) | — |
| BQ-385-10 | **B-5** | Advance at booking + booking by room type + `advance_payment` read-back (B2B dropped — owner N2) | P0 | 1 | ✅ **VERIFIED build 2** — create ✅ · D2 fixed: advance carried to check-in (ledger "booking carry", balance_due = total − advance) |
| BQ-385-16 | **B-1** | **Server pricing on create/plan change when `rate_per_night` is omitted** (omit → ₹0; rate inside `rooms[]` also ignored → ₹0; only top-level `rate_per_night` is honoured) | **P0** | 1 | ✅ **VERIFIED build 2** — omit rate → priced from Aiosell (avg nightly, 8000×2=16000, GST 18 % slab); unknown plan → 422 "no rate configured" | New Booking grid, advance, badge on row (D34–D36, AC-07) | 2026-09-20 |
| BQ-385-06 | B-5 | Room availability by date range | P1 | 1 | **DELIVERED · VERIFIED** (W4) | New Booking room picker — double-booking guard | — |
| BQ-385-12 | **B-6** | Server-authoritative snapshot: `meta.business_date` + `counts{}` with the list (owner DEC-7) | P1 | 1 | **DELIVERED · VERIFIED** (W1a, W3) — board shape changed (N4) | Tab numbers on Arrivals / Departures / In-House / header; "today" on every page (AC-12) | — |
| BQ-385-11 | B-6 | Setting `auto_print_checkin_receipt` (read via `v1/profile`, write via `update-settings`) | P1 | 1 | ✅ **DELIVERED · VERIFIED** — read (W6a) + write (`update-settings {basic:{auto_print_checkin_receipt}}` false→true→false, profile read-back each time; `probes_2026_09_20_gate4/bq11/`) | Check-In auto-print toggle (D32) | 2026-09-20 |
| BQ-385-14 | **B-4** | Extend-stay contract: collect-now payment, discount + reason, room move | P1 | 1 | ✅ **VERIFIED build 3** — same-room extend 200, `booking_charge = rate × nights + upgrade` (20,500), advances accumulate, move 200 → dest occupied / origin hk (D4/D7/D12/D13 fixed) | Extend Stay v2.19 beyond dates + reason (AC-06) | — |
| **BQ-385-17** | **B-4** | **Extension nights priced from the rate table (Aiosell) for the added dates, not the held check-in rate** (owner N8 = b, D52) | **P1** | 1 | ✅ **DELIVERED · VERIFIED 2026-09-20** — setting `extend_rate_mode` = `calendar` (default) \| `held`; calendar: 8,600 + 7,400 + 1,500 = **17,500** (blended `rate_per_night` 8,000); held: **18,700**; `probes_2026_09_20_n7n8/` · deviations: no `extension_nights[]`, CM miss → held fallback (not 422) · **N11 slab-on-blend question open** | Extend Stay pricing (M4) — un-blocked | 2026-09-20 |
| **BQ-385-19** | — | **`nights_detail[]` also on the LR list `charge` for in-house rows** (today: calendar extend response only) so Bill / Departures can show per-night lines after reload; and recompute `charge.advance_payment/balance_due` after the same-call collect-now payment on the calendar path (**D14**) | P2 | 1 | 🟠 OPEN 2026-09-20 — non-blocking (FE refetches LR after extend, X-14) | Extend Stay per-night lines after reload; response-driven row update | — |
| **BQ-385-18** | — | **Early check-in rule** (owner N7 = b) — delivered unasked as setting `allow_early_checkin` (default `false`): check-in refused with 422 when stay `checkin` > business date (IST) | P1 | 1 | ✅ **DELIVERED · VERIFIED 2026-09-20** — off → 422 "Early check-in is not allowed for this property (…after business date 2026-09-20)", `charge` untouched; on → 200 `booking_charge 10100` | Check-In guard (M3-09) — FE mirrors the setting + surfaces the 422 | 2026-09-20 |
| BQ-385-15 | **B-3** | Credit/TAB on room checkout: `payment_mode:'TAB'`, receivable by phone/email | P1 | 1 | ✅ **VERIFIED build 3** — TAB without `order_discount` → 200; ledger row = amount sent (22,690); `charge.balance_due 0`, `payment_status paid`, departed (D6/D8 fixed; folio `remaining_room_balance` residual — ignore) | Credit tile in Bill expansion (AC-08 refined) — un-blocked | 2026-09-20 |
| BQ-385-01 | — | Socket.io events for PMS changes | P1 | 1 | **CLOSED** — no PMS channel in Phase 1; refresh-on-focus accepted | Multi-terminal freshness (refresh-on-focus workaround approved) | — |
| BQ-385-03 | B-1 | `balance_payment` inconsistent (DATA_ISSUE) | P2 | 1 | **RESOLVED by `charge.balance_due`** — legacy field stays pre-GST; FE must not read it | Any screen showing a balance until `charge.balance_due` exists | — |
| BQ-385-02 | — | Aggregation endpoints (snapshot, bulk HK, per-line HK state) | P2 | 2 | PHASE-2 | Performance only | — |
| **BQ-385-22** | — | **`local-reservations` performance & payload** — `operational_status[]` filter (111 → 16 rows, 149 KB → ~20 KB), status-driven Late/Overdue without BD−30, list-view field trim, `Server-Timing` · brief `BACKEND_BRIEF_CR-385_PERF_LR_2026_09_21.md` | P2 | 1→2 | **OPEN 2026-09-21 (not blocking)** | Performance only (0.9 s → 6.9 s variance, one 90 s timeout) | — |
| **BQ-385-23** | — | **Modify `reason` leaks into `special_requests`** — `PATCH local-reservations/{id}` appends `"| MODIFY: <reason>"` to the guest's `special_requests`; FE shows SR ● on every modified row. Ask: store the modify reason in an audit/history field (or `charge`/`meta`), leave `special_requests` guest-owned. Evidence `evidence/CR-385/phase1_qa/m2_lr_reread_after_previews.json` (row 223 after confirm: `special_requests: " | MODIFY: Modified from Front Desk"`). | P2 | 2 | **OPEN 2026-09-21 (not blocking)** | Cosmetic/data hygiene; no FE workaround | — |
| **BQ-385-24** | — | **Non-int `{id}` on cancel/modify → 500 with PHP stack trace** (`Argument #2 ($id) must be of type int, string given`). Ask: 404/422 + clean JSON body. Surfaced by BUG-441 (legacy FE sends `booking_id`). Evidence `evidence/CR-385/phase1_qa/c3_legacy_224.json`. | P3 | 2 | **OPEN 2026-09-21 (not blocking)** | Error UX only | — |
| **BQ-385-25** | — | **`dashboard-kpis` physical occupancy ignores overdue in-house guests and disagrees with `room-status-board` / `local-reservations`** — 2026-09-22 (business date): board = r2 + r3 occupied (2/5 = 40 %), LR `counts.in_house` = 2; `dashboard-kpis?start_date=end_date=2026-09-22` → `today.in_house_count 0`, `physical.totals.occupied 1`, `occupancy_percent 20` (suite occupied 0 although r3/blpi is in-house, overdue). FE shows the KPI figure verbatim (MV-06) → tile reads "2 occupied · 20 % occupancy". Ask: count in-house guests as occupying until actual checkout (not until planned checkout), or expose an `occupancy_percent_current` the FE can use. Evidence `evidence/CR-385/smoke_kpis_2026_09_22.json`, `smoke_board_2026_09_22.json`. | P2 | 2 | **OPEN 2026-09-22 (owner smoke)** | Display only; no FE workaround (FE must not compute occupancy) | — |
| BQ-385-13 | B-2 | Refund / penalty preview for No-Show & Cancel | P2 | 2 | PHASE-2 (owner DEC-2) | Money card on No-Show/Cancel | — |
| BQ-385-07 | — | Room-level discount at checkout | P2 | 2 | PHASE-2 | Discount control on Bill (D1) | — |
| BQ-385-04 | — | Mark No-Show for all channels | — | — | **CLOSED** 2026-09-19 (owner: non-OTA = Cancel only; probe 422 confirms) | — | 2026-09-19 |
| BQ-385-05 | — | Check-in / check-out time settings | P3 | 2 | PARKED | Late-arrival chip (AC-14) | — |

Process blockers tracked here for completeness (no backend action): **B-7** 21 open registry items on the same FE files (see IA §7) · **B-8** CollectPaymentPanel hotspot (D5 spike) · **B-9** Gate 2.6 open (analysis complete, build blocked).

## 2. Delivery order (unblocks the most screens first)
1. **BQ-385-08** (everything else writes into `charge{}`) → 2. **BQ-385-09 + BQ-385-10** together (both mutate `charge`) → 3. **BQ-385-12** (independent; unblocks all tab counts) → 4. **BQ-385-06 + BQ-385-14** → 5. **BQ-385-15** (verification only) → 6. **BQ-385-11** (settings key) → 7. BQ-385-01 answer (no code if events already exist).

## 3. Facts from live probes (2026-09-19) that every section relies on
- `PATCH local-reservations/{id}` with dates only **does not recompute** `amount_after_tax` (2→4 nights kept ₹6,000) → BQ-385-08 rule 1 is required, not optional.
- `PATCH … {amount_after_tax: 0}` is **accepted** (stored 0.00) and `balance_payment` is left untouched (6000) → please add validation (`amount > 0`, or ignore FE amount once `charge` exists) and derive `balance_payment` from `charge`.
- `rooms[].rateplan_code` in PATCH body is ignored; `?preview=true` is ignored (write happens) → Q3 stands.
- LR row already exposes `amount_before_tax`; folio `room_info.gst_tax` is a single merged value → `charge.sgst` / `charge.cgst` needed for the AC-04 split.
- `dashboard-kpis` already returns `as_of_date` → BQ-385-12 can be satisfied by adding `business_date/server_time/timezone` next to it and on the LR response.
- Settings have no PMS print key (`printer_agent: "No"` at property level); `pay_tab: "Yes"` confirms Credit/TAB is a configured method (DEC-3).
- `mark-no-show` Direct → 422 (BQ-385-04 closed, no change). Cancel response has no refund fields (BQ-385-13 Phase 2).

## 4. Questions — one section per BQ (answer inline)

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

### Backend answer
_(pending)_

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

### Backend answer
_(pending)_

## BQ-385-10 — Advance collected at booking time (P0 · FEATURE_ASK + DATA_ISSUE · D34, replaces OD-P2-07)

### Endpoint
`POST aiosell/direct-reservation` (JSON) · `GET aiosell/local-reservations` (read-back).

### Ask
1. Accept on create:
```json
"advance": { "amount": 2000.00, "method": "cash|card|upi|split", "reference": "UTR/Txn no. (required unless cash)", "collected_at": "ISO",
             "split_payments": [ { "method": "card", "amount": 1200.00, "transaction_id": "4321" }, { "method": "upi", "amount": 800.00 } ] }   // when method = split (D47-h), same shape as order-bill-payment
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

### Backend answer
_(pending)_

## BQ-385-06 — Room availability by date range (P1 · FEATURE_ASK · blocker B-5)

### Summary
- Issue: the New Booking form (moving into the Front Desk workstation, CR-385 scope change 2026-09-18) needs to know **which rooms are free for a chosen date range**. Today the FE can only see which rooms are free **right now**.
- Classification: **FEATURE_ASK** (new read endpoint) — P1 for CR-385 Gate 3 (blocks correct future bookings).
- Frontend impact: without it a receptionist booking a room for next week may pick a room already reserved for those nights → **double booking**. FE can only partially guard client-side (see workaround).
- Priority/Risk: **P1 / HIGH** (money + guest experience).
- Account used for probes: alias `goankitchen_owner_rid69` (RID 69, `sandbox-pms`). Token masked `***`.

### How the FE builds the room list today (facts)
`pmsService.getBookableRooms()` = 3 parallel calls → `GET aiosell/rooms` (mappings) + `GET_ROOM_LIST` (occupied table ids, BUG-380) + `GET aiosell/room-status-board` (OOO/HK, BUG-387). Result = rooms minus *currently* occupied minus OOO. **No date parameter anywhere.** `POST aiosell/local-reservations` (create) is then called with `restaurant_table_id`, `checkin`, `checkout` — does the backend reject an overlapping stay? **Unknown → Q2 below.**

### Questions
| # | Question | Why |
|---|---|---|
| **Q1** | Can the backend expose **`GET /api/v2/vendoremployee/aiosell/room-availability?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD`** → `{ rooms: [{ restaurant_table_id, table_no, aiosell_room_code, available: bool, blocked_by: 'reservation'|'in_house'|'ooo'|null, booking_id? }] }` considering pending + in-house local reservations, OTA reservations already synced, and OOO periods? | Correct room picker for any date range |
| **Q2** | Does `POST aiosell/local-reservations` **reject overlapping** `restaurant_table_id` + date range today (409/422)? If not, can it? | Server-side guard regardless of FE |
| **Q3** | Is **rate by room type / date** available (`aiosell/rates` or rate plans from CR-358-P5) so the amount field can be prefilled instead of typed? | Fewer typing errors; optional |
| **Q4** | Does creating a local reservation **push inventory** to OTAs and return `inventory_push_warning` (as room-status PATCH does)? | FE shows the warning in the toast |

### Frontend Workaround (until Q1/Q2 answered)
- Available: **PARTIAL.** The workstation already holds every reservation in a −60/+30-day window (`local-reservations`). FE can mark a room "reserved 20–22 Sep" when a pending/in-house stay overlaps the chosen dates and grey it out. Blind spots: bookings beyond +30 days, OTA bookings not yet synced, OOO periods with end dates. Gate 3 will implement this client-side filter as a stop-gap and switch to Q1 when available.

### Evidence
- `evidence/CR-385/CR-385_local_reservations.json` (rows have `rooms[].restaurant_table_id`, `checkin`, `checkout`, `operational_status`) — enough for the client-side overlap check.
- Related: BQ-385-02 A5 (cancelled rows in window), BQ-385-04 (No-Show for all channels — raised by owner directly).

### Backend answer
_(pending)_

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

### Backend answer
_(pending)_

## BQ-385-11 — Auto-print check-in receipt setting (P1 · FEATURE_ASK · D32)

### Ask
- A business-level boolean setting **`pms.auto_print_checkin_receipt`** (default `false`) readable via the existing settings endpoint the FE already loads at login (same mechanism as printer-agent config, CR-133).
- No new print endpoint needed: FE renders the receipt (guest, room, dates, `charge.*`, advance, balance, firm GST, property GSTIN) and prints through the existing printer-agent path. Manual "Print receipt" button is always available regardless of the setting.

### Question
| # | Question |
|---|---|
| Q1 | Confirm the settings key namespace and whether it is per-restaurant (RID) or per-user. FE assumes per-RID. |

---

### Backend answer
_(pending)_

## BQ-385-14 — Extend-stay contract: collect-now payment, discount + reason, room move (P1 · FEATURE_ASK · blocker B-4)

### Endpoint
`POST /api/v2/vendoremployee/pos/room-extend-stay` — today `{ order_id, new_checkout_date, new_room_price?, reason }`.

### Ask
```json
{
  "order_id": 1232408,
  "new_checkout_date": "2026-09-22",
  "reason": "Guest requested",
  "new_restaurant_table_id": 8525,                       // optional — room move when the current room is booked for the new nights
  "discount": { "type": "flat|percent", "value": 500, "reason": "Loyal guest" },   // optional, reason required when present
  "payment":  { "amount": 3000.00, "method": "cash|card|upi|split", "reference": "UTR…", "split_payments": [] }  // optional collect-now; split_payments when method = split (D47-h)
}
```
Server recomputes `charge{}` (BQ-385-08 rule 1) for the new nights — FE stops sending `new_room_price`. Response returns the recomputed `charge` and the payment record id.

### Rules
- 409 when `new_checkout_date` collides with another reservation on the same room **and** no `new_restaurant_table_id` is given; response lists the conflicting booking so the FE can offer the room move.
- 422 when `payment.amount` > new balance due (AC-06) or discount reason missing.
- Shortening a stay (earlier checkout) follows the same contract; refund side effects are Phase 2 (BQ-385-13).

### Questions
| # | Question |
|---|---|
| Q1 | Does extend-stay already push inventory for the added nights? Return `inventory_push_warning` like room-status PATCH? |
| Q2 | Is the collect-now payment posted as a room payment (visible on the folio, deducted at checkout)? |

### FE workaround
None for money. Extend stays date + reason only (current behaviour) until delivered.

### Backend answer
_(pending)_

## BQ-385-17 — Extension nights priced from the rate table, not the held rate (P1 · FEATURE_ASK · blocker B-4 · owner N8 = b, DESIGN_DECISIONS D52)

### Endpoint
`POST /api/v2/vendoremployee/pos/room-extend-stay` (same call as BQ-385-14 — no new endpoint).

### What we saw (build 3, booking 163 / order 1232593)
Stay 8,600 checked in on the held rate; extend +1 night → `booking_charge 20,500 = 9,500 × 2 + 1,500`: the **added night was billed at the held check-in rate (9,500)** although Aiosell listed **7,400** for that date. The held rate is silently applied to every new night.

### Owner decision (N8 = b)
Extra nights are **priced from the rate table for the actual extended dates**. The original nights keep the rate they were sold at (incl. the paid upgrade); only the nights added by the extension are looked up.

### Ask
1. On `room-extend-stay`, for each night in `[old_checkout, new_checkout)`, look up the Aiosell rate for **that date + the stay's `rateplan_code` + room type (after any move)** — the same lookup BQ-385-16 uses on create.
2. `charge.booking_charge = Σ(original nights at their sold rate) + Σ(new nights at rate-table rate) + upgrade − discount`; GST slab per BQ-385-08 rule 1 on the resulting per-night charge; `charge.sgst/cgst/total_with_gst/balance_due` recomputed as today.
3. Response `charge` additionally returns **`extension_nights[] { date, rate }`** so the FE can show the per-night pricing of the added nights (read-only, D39 standard).
4. Rate missing for any added date → **422 "no rate configured for <date>"** (mirror BQ-16); nothing written.
5. `preview: true` (same as BQ-08) returns the recomputed `charge` + `extension_nights[]` **without saving** — the Extend Stay RIGHT panel uses it to show the figures before Confirm.

### Questions
| # | Question |
|---|---|
| Q1 | When the extension includes a **room move to a different type** (`new_restaurant_table_id`), the added nights are priced for the **new** type — confirm; the original nights keep the old type's sold rate. |
| Q2 | `rate_per_night` on `charge` is a single value today. With mixed rates it becomes an **average** — confirm the FE must stop displaying `rate_per_night` on extended stays and use `extension_nights[]` + the folio lines instead. |
| Q3 | Does shortening a stay (earlier checkout) simply drop the last nights at their sold rate (no re-pricing)? |

### FE behaviour until delivered
~~Extend Stay shows the server `charge` exactly as returned (held rate) with the note "Extra nights priced at the held rate — rate-table pricing pending BQ-385-17".~~ → delivered, see answer.

### Backend answer
**2026-09-20 (`evidence/CR-385/backend_replies/n7_n8_2026_09_20.md`)** — shipped as property setting **`extend_rate_mode`** (`calendar` default | `held`; alias `pms.extend_rate_mode`), written via multipart `data={"basic":{…}}` on `restaurant-settings/update-settings` (raw JSON body is ignored). **calendar:** held rate × old nights + CM rate for each added night → blended into one `rate_per_night`; upgrade additive once; CM miss on an added night → **held fallback** (no ₹0, no 422). **held:** exact D4 lock. Shortening a stay: always held math. Invalid value → 422. Extend money is under **`data.charge`**. Q1 (move to another type) not answered explicitly. Q2 → yes, `rate_per_night` becomes a blend. Q3 → yes, shorten = held.

**FE verification 2026-09-20 (`probes_2026_09_20_n7n8/PROBE_REPORT.md`, bookings 175/176, orders 1232604/1232605):** defaults `false`/`calendar` on `settings-list` + `v1/profile` ✅ · bogus → 422 ✅ · raw-JSON write ignored ✅ · CM 8,600/7,400/7,400 ✅ · **calendar extend 17,500, rate 8,000, GST 1,575 + 1,575, LR `charge` identical** ✅ · **held extend 18,700, rate 8,600** ✅ · `data.charge` ✅ · TAB settle ✅ · defaults restored ✅. **BQ-385-17 CLOSED as VERIFIED.** Deviations accepted by FE: no `extension_nights[]` → FE labels the rate "avg. / night" on extended stays and never multiplies it back; held fallback instead of 422 (owner-visible? no — silent; noted as N11-b).

**N11 (money) — FIXED by backend v2 reply (`n7_n8_v2_2026_09_20.md`) and VERIFIED 2026-09-20 evening (`probes_2026_09_20_n11/PROBE_REPORT.md`, orders 1232608/1232609/1232610):** GST slab is now **per sold night** (8,600 @ 18 % = 1,548 · 7,400 @ 5 % = 370 · upgrade @ slab of max night = 270 → **2,188 = 1,094 + 1,094**, `total_with_gst 19,688`); `rate_per_night` is average/display only; **`nights_detail[] {date, rate, source held|calendar|held_fallback, gst_percent, gst}`** present on calendar extend `data.charge` (absent on held / check-in / LR list). Held control unchanged (18,700 / 1,683 + 1,683). **N11 CLOSED.**

**D14 (new, P2, found during N11 verification):** on the **calendar** path the extend **response** `data.charge.advance_payment` / `balance_due` do not include the collect-now payment posted in the same call (`1000 / 18688` while `payment_record_id` exists and `reservation.advance_payment 1500` in the same body); the LR read-back one second later is correct (`1500 / 18188`) and the folio ledger has the row. Held path response is correct. A TAB sent at the stale figure was clamped by the server to 18,188. Reproduced twice. Ask: recompute `charge` after posting the payment (same as held). FE mitigation: refetch LR after extend (X-14), never drive the row from the extend response.

**BQ-385-19 (P2 ask):** include `nights_detail` on the LR list `charge` for in-house rows (and on the check-in/folio read) so per-night lines survive a reload; today it is response-only.

### Owner rule
No checkout with an outstanding balance. The remainder may be assigned to **Credit** (configured method — `pay_tab: "Yes"` in settings), then checkout completes. Partial cash/card/UPI stays blocked.

### Questions
| # | Question |
|---|---|
| Q1 | Does `POST order/order-bill-payment` accept `payment_mode: credit|tab` for **room** orders exactly as for dine-in, closing the order with the balance recorded as a receivable? |
| Q2 | Where is the receivable owner stored — CRM customer of the guest, or a company (B2B `firm_name/firm_gst_no` from check-in)? Can the FE pass `credit_account_id`? |
| Q3 | Does the credit amount appear in `daily-sales-revenue-report` as "Room TAB" (BUG-408 split) and in Night Audit outstanding (CR-363)? |

### FE plan once confirmed
Split tender (Cash/Card/UPI rows, POS parity) and Credit/TAB are already shown on room checkout (drawer omits `allowedMethods`, D4). Owner D47-c: **Credit = TAB, a plain method — select and checkout; bills the guest's TAB by the name + phone on the booking; no company field, never a Split leg.** Q2 narrows to: is the TAB receivable attached to the CRM customer matched by phone? Q4 withdrawn.

### Backend answer
**2026-09-20 (backend):** use the live FE body as-is (`order_id` **string**, `payment_mode:'TAB'`, `payment_status:'success'` (not `paid`), `paid_room:'yes'` for RM stay close, `transaction_id:''`, `food_detail:[]`, `grant_amount`/`order_amount` = amount, all discount/loyalty/coupon/tip fields zero-filled, `cust_name/cust_mobile/name/mobile`). Missing/wrong required fields → **403 (validation, not RBAC)**. Receivable attaches to the customer by phone/email.

### FE verification (2026-09-20, probes G1–G4 · `evidence/CR-385/probes_2026_09_20/g1_tab_full.json … g4_board.json`)
| Check | Result |
|---|---|
| Q1 `order-bill-payment` TAB with the full FE body on room order 1232582 (`payment_amount 3490` = `charge.balance_due`) | **200** `"Room payment received via TAB"` → order `payment_status paid`, `payment_method TAB`, `order_status delivered`, `f_order_status 6` ✅ |
| Stay close | LR line `line_status checked_out`, `checked_out_at 09:37:14`, reservation `operational_status departed`, `counts.in_house 0` ✅ · board 8525 → `display_status hk`, `is_occupied false`, guest null ✅ |
| Q2 receivable owner | folio `room_info.balance_payment_mode TAB`; `room_payment_summary.payments[]` has `{payment_mode TAB, payment_type checkout, received_by 5117}` — attached to the order's customer (phone 9000000009). CRM-side receivable not visible from these endpoints (Q3 still open). |
| ⚠️ **D8 — ledger amount** | We sent `payment_amount 3490` (GST-incl. balance). Ledger row = **₹3,300** (= pre-GST balance 3,800 − 500); `total_paid_amount 3990` (= 500 + 3300 + GST 190); **`remaining_room_balance 3490` and `charge.balance_due 3490` unchanged after a full settlement**; `charge.advance_payment 500` not updated; order `order_amount 0`, `collect_bill null`. Question: is the TAB receivable ₹3,300 or ₹3,490, and should `balance_due` / `remaining_room_balance` go to 0 once the stay is departed? |

**Verdict:** BQ-385-15 contract **VERIFIED** — D6 CLOSED (FE-side curl fault, backend was right). Credit tile is un-blocked on contract; the **amount** written to the ledger (D8) is a new money question. Q3 (Room TAB in daily-sales + Night Audit outstanding) still to check at Gate 5.

## BQ-385-01 — Do PMS changes reach the frontend via Socket.io? (ANSWER NEEDED)

### Endpoint / channel
- Socket server: `REACT_APP_SOCKET_URL` (presocket). Channels the FE subscribes to today (`src/api/socket/socketEvents.js`): `new_order_<rid>`, `update_table_<rid>`, `aggregator_order_<rid>`, `order-engage_<rid>`, `food_update_<rid>`.
- **No PMS channel exists on the FE.** Owner statement: *"we have a webhook… ideally everything is on webhook/sockets so we don't lose data; if not, highlight."*

### Questions
| # | Question | Why |
|---|---|---|
| Q1 | Does the backend emit **any** socket event when a reservation is created/updated via the **AIOSELL webhook** (new OTA booking, modification, cancellation)? Channel name + payload shape? | New OTA bookings must appear on Arrivals without a manual refresh |
| Q2 | Events on **local-checkin** (`aiosell/local-checkin`), **check-out** (`order-bill-payment` for room orders), **room-status PATCH**, **extend-stay / modify / cancel**? | Two front-desk terminals must stay in sync |
| Q3 | If none exist: can the backend emit a single **`pms_update_<rid>`** channel with `{ type: 'reservation'|'room_status'|'checkin'|'checkout'|'payment', booking_id?, restaurant_table_id?, order_id?, at }`? FE would simply re-fetch the affected slice on receipt (no payload-driven state). | Cheapest contract; FE never trusts payload for money |
| Q4 | Does `update_table_<rid>` already fire for **room** tables on check-in/check-out (rooms are `restaurant_tables` rows)? If yes, FE can piggy-back for room state. | Might be a zero-cost partial answer |

### Frontend Workaround
- Available: **YES (provisional, owner-approved Q10 option a)** — refresh on `visibilitychange`, header Refresh button, refetch after every action. Owner wants this revisited when Q1–Q4 are answered.

---

### Backend answer
_(pending)_

## BQ-385-03 — `balance_payment` on `local-reservations` is inconsistent (DATA_ISSUE)

### Endpoint
- Method: GET
- URL: `/api/v2/vendoremployee/aiosell/local-reservations?start_date=2026-07-19&end_date=2026-10-17`
- Auth/context: Bearer `***` · RID 69

### Reproduction
1. Login as `goankitchen_owner_rid69`.
2. GET the URL above → filter `operational_status = in_house`.
3. For each `rooms[].order_id` call `POST /api/v2/vendoremployee/get-single-order-new {order_id}` and compute `room_price + gst_tax − advance_payment − receive_balance`.

### Payload / Response
- Actual response path: `/app/memory/evidence/CR-385/CR-385_local_reservations.json` (phone/email redacted)
- Comparison: `/app/memory/evidence/CR-385/CR-385_balance_compare.json`

| order_id | LR `amount_after_tax` | LR `advance_payment` | LR `balance_payment` | folio room_price + gst − advance − received | F&B orders posted |
|---|---:|---:|---:|---:|---:|
| 1232408 | 1000 | 100 | **950** | 950 | 3 (not in LR figure) |
| 1232470 | 1000 | 100 | **900** ⚠ | 950 | 1 |
| 1232479 | 1000 | 100 | **950** | 950 | 1 |

- Expected: `balance_payment` = room charge + room GST + posted F&B/room orders − advance − all payments (i.e. the amount the guest owes now), consistent across identical inputs.
- Actual: differs by ₹50 between identical folios; excludes F&B/room orders entirely.

### Frontend Workaround
- Available: YES — FE ignores `balance_payment` and computes from the folio (N calls, BQ-385-02 A2). Ask: make `balance_payment` authoritative (or add `balance_due`) so FE can drop the folio calls.

---

### Backend answer
_(pending)_

## BQ-385-02 — Aggregation endpoints (Phase 2 — after Phase 1 ships)

| # | Where FE calls today | Calls | Ask |
|---|---|---|---|
| A1 | Workstation mount | 4 parallel: `GET aiosell/local-reservations?start_date=T-60&end_date=T+30`, `GET aiosell/dashboard-kpis`, `GET aiosell/room-status-board`, `GET aiosell/status` | `GET aiosell/front-desk-snapshot` returning all four blocks (or keep 4 — low priority, they are parallel) |
| A2 | In-House list + Departures list (true balance) | `POST get-single-order-new` **× N guests** | Authoritative **`balance_due`** per room line on `local-reservations` (see BQ-385-03) — removes N calls on two panels |
| A3 | Mark All Clean | `PATCH aiosell/room-status/{id}` **× N rooms, sequential** | `PATCH aiosell/room-status/bulk` `{ ids:[], status:'available' }` → per-id result + `inventory_push_warning` |
| A4 | HK state of an occupied room on In-House rows | client-side join board ↔ reservations by `table_no` | `room_display_status` + `manual_status` on each `rooms[]` line of `local-reservations` |
| A5 | Cancelled bookings | `GET local-reservations?…status=cancelled` (separate call) | Confirm whether the main window call already returns `operational_status='cancelled'` rows (probe had 0 cancelled in 46 → undetermined) |

### Frontend Workaround
- Available: YES — all Phase 1 panels work with today's endpoints (client-side buckets, parallel folio calls, sequential PATCH). Phase 2 is performance/cleanliness only.

---

### Backend answer
_(pending)_

## 5. Phase 2 / closed / parked (recorded so nothing is re-asked)
- **BQ-385-13 (B-2)** Refund / penalty preview for No-Show & Cancel — `GET local-reservations/{id}/cancellation-preview → {prepaid, penalty, penalty_sgst, penalty_cgst, refund_due}`, cancel/no-show accept `refund_mode`. Owner DEC-2: Phase 1 = OTA refunds by OTA, cancel refunds offline. Probe: cancel response has no refund fields.
- **BQ-385-07** Room-level discount at checkout — `room_discount {type,value,reason}` on bill payment. Deferred (D1 control disabled).
- **BQ-385-02** Aggregation endpoints — see section above; Phase 2 except A2 which is satisfied by `charge.balance_due`.
- **BQ-385-05** Check-in / check-out time settings — parked; late-arrival chip uses check-in date only.
- **BQ-385-04** Mark No-Show for all channels — **CLOSED** (owner: Cancel only; probe `mark-no-show {channel:'Direct'}` → 422).

## 6. Change log
| Date | Change |
|---|---|
| 2026-09-21 | **v2.0** — BQ-385-22 filed (performance/aggregation, owner request after P0.5 QA saw 7 s / 60–90 s `local-reservations` spells): `operational_status[]` filter, status-driven Late/Overdue, list field trim, snapshot endpoint (→ BQ-385-02), `Server-Timing`. Tracked also in checklist section **B**. |
| 2026-09-21 | **v2.1** — BQ-385-23 (modify reason appended to `special_requests`) and BQ-385-24 (500 on non-int id) filed from CR-385 Phase 1 QA. Both non-blocking. |
| 2026-09-22 | **v2.2** — BQ-385-25 (occupancy % vs board/LR mismatch for overdue in-house) filed from the owner smoke. |
| 2026-09-17 | BQ-385-01…04 filed (main brief). |
| 2026-09-18 | BQ-385-06 filed (addendum). |
| 2026-09-19 | Owner decisions DEC-1…9 (D46). BQ-385-08…12 filed (Phase 1 contract). Live probes P1–P9 on booking 145. BQ-385-04 closed. BQ-385-12 rewritten to server-authoritative snapshot (DEC-7). |
| 2026-09-19 | Owner clarified "partial payment" = split tender (D46-j); BQ-385-15 Q4 added (split + credit leg). |
| 2026-09-19 | D47: Credit = TAB plain method (not a split leg) — BQ-385-15 Q4 withdrawn, Q2 narrowed. |
| 2026-09-19 | D47-h: Split tender required at advance points too (Check-In / Booking / Extend / Modify) → BQ-385-10 `advance` and BQ-385-14 `payment` must accept `split_payments[] {method, amount, transaction_id}` like `order-bill-payment`. Status: all BQs still OPEN — waiting for backend. |
| 2026-09-20 | E2E lifecycle after sandbox checkout (owner N5): **7 defects D1–D7** (§8), 5 reproduced independently by testing agent iteration_29; BQ-09/10/14 RE-OPENED; BQ-16 confirmed (rate in rooms[] ignored). |
| 2026-09-20 | Owner answered N1–N5. N1 verified as a real gap → **BQ-385-16 opened (P0)**. N2/N3/N4 closed by owner decision (D48). N5: sandbox fully occupied by overdue stays → reset requested. N6 added (TAB curl incomplete). BQ-14 conflict path verified. |
| 2026-09-20 | Backend reply received (`evidence/CR-385/backend_replies/384plan_2026_09_19.md`, Waves 1–6). Verified live: BQ-08, 10, 06, 12, 11(read) → DELIVERED·VERIFIED; 09, 14, 11(write) DELIVERED·unverified; 15 ANSWERED; 01 CLOSED; 03 RESOLVED via charge.balance_due. New questions N1–N4 (§7). BUG-384 closed by backend (wrong FE body). Report: `evidence/CR-385/probes_2026_09_20/PROBE_REPORT.md`. |
| 2026-09-19 | MASTER v1.0 created; BQ-385-14 (extend-stay, B-4) and BQ-385-15 (Credit verify, B-3) added — previously missing from the briefs. |
| 2026-09-20 | **v1.4** — Backend answered N6 with the full FE TAB body. Verified live on order 1232582 (G1–G4): 200, order paid/TAB, line checked_out, reservation departed, room 8525 → hk. **BQ-385-15 VERIFIED · D6 CLOSED · N6 CLOSED.** New **D8** (ledger 3,300 vs 3,490; `balance_due` not zeroed after departure) + D3+ (folio room_price basis flips between check-in and extend). N4 regression risk **withdrawn** (old shape already `{rooms}`, transform verified on both payloads). Sandbox now empty (in_house 0). Open money defects: D1 D2 D3(+) D4 D8 + BQ-16; D5 P1; D7 P2. |
| 2026-09-20 | **v1.9** — Backend v2 reply `n7_n8_v2_2026_09_20.md`: **N11 fixed** (per-night slab, `nights_detail[]`) and verified (2,188 GST reproduced). New **D14** (P2): calendar extend response `charge` stale by same-call payment (LR correct). **BQ-385-19** (P2) opened: `nights_detail` on LR list. No blocker. |
| 2026-09-20 | **v1.8** — Backend reply `n7_n8_2026_09_20.md`: N7 → setting `allow_early_checkin` (default false, 422 on early check-in) = **BQ-385-18 VERIFIED**; N8 → setting `extend_rate_mode` (`calendar` default) = **BQ-385-17 VERIFIED** (17,500 vs 18,700 reproduced); N9 unchanged. B-4 fully closed. New money question **N11** (GST slab on blended rate). Backend "Ask FE": settings UI for the two keys → owner decision O-8. |
| 2026-09-20 | **v1.7** — Owner decided N7/N8/N9 (D52): N7 block early check-in (FE guard on `meta.business_date`, no backend change) · **N8 = price extension nights from the rate table → BQ-385-17 opened (P1, blocker B-4 re-opened for the pricing rule only)** · N9 allow check-in into HK room with a warning (no backend change). §10 open-questions line updated; N10 (`received_by null`) still a minor backend hygiene item. |

## 7. Follow-up questions after verification (2026-09-20) — answer inline
| # | Observation (probe) | Question | Backend answer |
|---|---|---|---|
| N1 | Direct create used FE-sent `rate_per_night: 3000`; **omitting the field → `charge` all zeros** while fetch-rates has executive-s-ep 7,400 for those dates (probe 2026-09-20 E) | Owner: server must price when the field is missing. **→ BQ-385-16 (P0)**: server prices `charge.rate_per_night` from rates × `rateplan_code` × dates on create and re-prices on plan change; reject/flag when no rate exists instead of storing ₹0. | **OPEN — backend change required** |
| N2 | `firm_name` / `firm_gst_no` on `direct-reservation` → `null` | **Owner decision: B2B is captured at Check-In only.** Drop B2B from the create contract (BQ-385-10 §4). No backend change. | CLOSED (owner) |
| N3 | `pah: true` with ₹2,000 advance | **Owner: `pah` applies to OTA and non-OTA — balance collected at hotel, independent of advances.** FE badge: Prepaid if `prepaid_amount > 0`, else PAY AT HOTEL if `pah`; Advance ₹X chip when `advance_payment > 0`. | CLOSED (owner) |
| N4 | `room-status-board` now returns `{meta, auto_hk_on_rm_checkout, rooms}` | **Owner: yes, final format.** **Re-checked 2026-09-20:** the previous shape was already `{auto_hk_on_rm_checkout, rooms}` (evidence `probes_2026_09_19/board.json`) — the new build only **adds `meta`**. `roomStatusTransform.fromRoomStatusBoard` already reads `data.rooms` and was run against both payloads (5/5 rooms, counts correct) → **no live regression, no hot-fix, no BUG intake**. `meta.business_date` passthrough goes into the CR-385 M4 plan. | CLOSED (owner) · FE regression risk **withdrawn** |
| N5 | BQ-385-09 / 14 / 15 need an in-house stay | Owner: use any checked-in room. **Probe: all 5 sandbox rooms are held by overdue in-house stays (orders 1232408/1232479/1232501/1232549/1232561) → every extend = 409, no room free for a check-in.** Please check out / reset those 5 stays on sandbox-pms. | OPEN — sandbox reset needed |
| N6 | `order-bill-payment` curl in the reply (`order_id`, `payment_mode`, `payment_amount`, `mobile`) → **403** `order_id must be a string · payment_status required` | Real FE contract sends the full bill body (`orderTransform` L1614–1690). Confirm the minimal accepted body for a room TAB settlement, or we verify BQ-385-15 only through the real panel at Gate 5. | **ANSWERED 2026-09-20** — backend supplied the full live FE body (see BQ-385-15 "Backend answer"). Verified live G1: **200**, stay closed, room → hk. **N6 CLOSED · D6 CLOSED.** Follow-up **D8** (ledger amount 3,300 vs 3,490; `balance_due` not zeroed) opened in §8. |

## 8. Defects found in end-to-end verification (2026-09-20 evening) — independently reproduced by testing agent (iteration_29)
Evidence: `evidence/CR-385/probes_2026_09_20/PROBE_REPORT.md` §F–§G · `/app/test_reports/iteration_29.json`. Booking 153 / order 1232582 settled by TAB (G1, 2026-09-20 09:37) — sandbox has no in-house stay left.

| # | Defect | Endpoint | Repro | Expected | Prio |
|---|---|---|---|---|---|
| **D1** | Upgrade impossible — type-parity guard runs before `upgrade_type` is read | `pos/user-group-check-in` | executive booking → `room_id[]=<suite>` + `upgrade_type=paid/complimentary` → 422 "Table maps to suite but reservation line expects executive" | allow higher type when `upgrade_type` present; paid → `charge.upgrade_amount` + folio line; 422 only for lower type | **P0** |
| **D2** | Advance collected at booking is **lost at check-in** | check-in → list read-back | booking `advance 1000` → after check-in `charge.advance_payment 0` (legacy field too); after extend shows only the new 500 | advances accumulate: 1000 + 500 = 1500 | **P0 money** |
| **D3** | Folio `room_info.room_price` stored GST-inclusive (4200) while `gst_tax 200` also present → GST double-counted on folio | `get-single-order-new` | after check-in of a ₹4,000 + 5% booking | `room_price 4000`, `gst_tax 200` (or SGST/CGST split) | **P0 money** (verify vs BUG-423) |
| **D4** | Extend-stay **does not bill the extra night**: old charge − discount ÷ new nights | `pos/room-extend-stay` | 4000×1 → extend to 2 nights, discount 200 → `rate_per_night 1900, booking_charge 3800` | `rate_per_night 4000, booking_charge 7800, total 8190` | **P0 money** |
| **D5** | Check-in response returns `data: {}` — no `charge` (reply promised it) | `pos/user-group-check-in` | 200 with empty data | return recomputed `charge` + `order_id` | P1 |
| **D6** | ~~Partial bill body → 500 with raw SQL leaked~~ **CLOSED 2026-09-20** — backend confirmed the endpoint expects the full live FE body; our 7-field curl was the fault. Verified G1: full body → 200, stay closed. Residual (low, non-blocking): a malformed body should still return 422/403 with field names rather than a 500 that echoes SQL — logged as hygiene, not a CR-385 blocker. | `order/order-bill-payment` | — | — | ~~P1~~ CLOSED |
| **D7** | Room move leaves the destination room in `manual_status hk` with the guest inside (`occupied_hk`) | extend with `new_restaurant_table_id` | 8525 hk + guest | destination → occupied/clean; origin → hk (auto-HK) | P2 |
| **D8** | **TAB settlement amount / balance not reconciled** — FE sent `payment_amount 3490` (= `charge.balance_due`, GST-incl.); ledger `room_payment_summary.payments[]` records **₹3,300** (pre-GST), `total_paid_amount 3990`; after the stay is `departed`, **`charge.balance_due 3490` and `remaining_room_balance 3490` still show as outstanding**, `charge.advance_payment 500` not updated, order `order_amount 0`, `collect_bill null` | `order/order-bill-payment` → `local-reservations` / `get-single-order-new` | G1 → G2/G3 on order 1232582 | receivable row = amount actually assigned to TAB (₹3,490 incl. GST, or 3,300 + explicit GST leg); `balance_due` / `remaining_room_balance` = 0 once settled | **P1 money** (Departures "true balance" and Night Audit outstanding would be wrong) |
| **D3+** | Folio `room_info.room_price` basis is inconsistent: **GST-inclusive after check-in** (4200 + gst 200) but **pre-GST after extend** (3800 + gst 190) | `get-single-order-new` | E5b vs G3 | one basis (pre-GST) everywhere | adds to D3 |
| **BQ-16+** | Direct create: rate only honoured when sent **top-level**; omitted or inside `rooms[]` → ₹0 booking stored silently | `direct-reservation` | see §7 N1 | server prices from rates; 422 when no rate | **P0 money** |

### Backend answer
_(pending)_

## 9. Gate-4 re-verification of build 2 (`reblock_fe.md` plan, 2026-09-20 ~10:30) — answer inline
Evidence: `evidence/CR-385/probes_2026_09_20_gate4/PROBE_REPORT.md` (+ raw `s*.json`, runner `run_gate4.py`). Bookings 156/157 cancelled; 158 / order 1232586 settled by TAB.

| Item | Result | Status |
|---|---|---|
| **BQ-16** omit rate | 201, `charge` priced from Aiosell (8,600 + 7,400 → 8000 × 2 = 16,000; GST 18 %) · unknown plan → 422 "no rate configured" (plan §1b is not runnable: sandbox has rates for every date incl. 2027/2028) | ✅ **FIXED** |
| **D1** upgrade 422 | 200 to a higher type with `upgrade_type=paid` | ✅ fixed — see D9 |
| **D2** advance lost | `charge.advance_payment 1000` after check-in; ledger row "Room check-in advance (booking carry)"; `balance_due 8030 = 9030 − 1000` | ✅ **FIXED** |
| **D3** folio GST | `room_price 8600.00` (pre-GST) + `gst_tax 430.00` | ✅ **FIXED** |
| **D5** empty check-in data | `data.order_id`, `data.orders[]`, `data.charge` returned | ✅ **FIXED** |
| **D6** TAB body | full FE body **without `order_discount`** → 200, stay settled, room → hk | ✅ **FIXED** |
| **D4** extend pricing | not reachable: same-room extend → **409** (D12) | ⏸ blocked |
| **D7** move HK | not reachable: move → **500** (D13) | ⏸ blocked |
| **D8** TAB ledger | sent 8,030 → ledger row **7,600**; `remaining_room_balance 8030`, `charge.balance_due 8030` unchanged after `departed`; `order_amount 1500` | ❌ still open |

### New defects (build 2)
| # | Defect | Repro | Expected | Prio |
|---|---|---|---|---|
| **D9** | Paid upgrade **carved out of the rate**: `rate_per_night 8600 → 7100`, `upgrade_amount 1500`, `booking_charge 8600` unchanged → guest never pays the upgrade | check-in booking 158 → suite 8525, `upgrade_type paid, upgrade_amount 1500` | `rate_per_night 8600`, `upgrade_amount 1500`, `booking_charge 10100`, GST on 10,100 | **P0 money** |
| **D10** | GST slab flips because of D9: booking 18 % (`sgst 774`) → after check-in 5 % (`sgst 215`); same stay 10,148 → 9,030 | same | slab from the real per-night charge (≥ 7,500 → 18 %) throughout | **P0 money** |
| **D11** | Check-in with the plan's own field list → **500 `booking_for cannot be null`** (raw SQL) and **non-atomic**: `charge.upgrade_amount/rate_per_night` written on the still-pending reservation | plan §3 body (no `booking_for`) | 422 naming the field; no charge mutation on failure. Real FE body (`booking_for=Individual`, `booking_details`, `room_price`, `email`, `name2..4`, `firm_*`) works | P1 |
| **D12** | Same-room extend always **409** — own in-house stay blocks the room for the new window (`room-availability` 11→12 Oct: 8525 `blocked_by in_house`, `booking_id` = ours) | `room-extend-stay {order_id, new_checkout_date}` | exclude the order's own line from the conflict check | **P0 functional** — Extend Stay unusable |
| **D13** | Move → **500 `Undefined variable $currentTableId`** `AiosellRoomExtendStayService.php:223`, HTML stack trace | `room-extend-stay {…, new_restaurant_table_id}` | 200 as in build 1 (E7) | **P0 regression** |
| N7 | Check-in accepted on 20 Sep for a stay dated 10 Oct (`arrived_today 2`) | plan §3 dates | should check-in be limited to `business_date` (+ early check-in rule)? | question |

### Backend answer
_(pending)_

## 10. Build 3 re-verification (backend reply `evidence/CR-385/backend_replies/re_fe_2026_09_20.md`; our run 2026-09-20 ~13:50, `probes_2026_09_20_gate4/build3/`)
Independent re-run of the full lifecycle (booking 163 / order 1232593: create+advance → paid-upgrade check-in → same-room extend + collect-now → move → TAB) plus D11 omit-`booking_for` path (booking 164 / order 1232594).

| Item | Result | Status |
|---|---|---|
| BQ-16 · D1 · D2 · D3 · D5 · D6 | still green | ✅ |
| **D9 / D10** | `rate 9500 + upgrade 1500 = booking_charge 11000`; GST 18 % (990 + 990) | ✅ FIXED |
| **D12 / D4** | same-room extend 200; `booking_charge 20500 = 9500 × 2 + 1500`; `advance_payment 1500` (accumulated) | ✅ FIXED |
| **D13 / D7** | move 200; 8527 occupied, 8525 hk | ✅ FIXED |
| **D8** | TAB 22,690 → ledger row 22,690; `charge.balance_due 0`; paid / departed | ✅ FIXED (folio `remaining_room_balance` residual acknowledged by backend — FE ignores it) |
| **D11** | check-in without `booking_for` → 200 (server default) | ✅ FIXED |
| **BQ-385-11 write** | `update-settings` `{basic:{auto_print_checkin_receipt:true}}` → 200, profile shows `true`; reset to `false` → 200 | ✅ VERIFIED |

**Money contract accepted (backend §3):** `charge.*` authoritative; cleared ⇔ `payment_status === 'paid' && charge.balance_due === 0`; never read `balance_payment` / folio `remaining_room_balance`; `charge.advance_payment` = cumulative paid; check-in sends `booking_for=Individual`; TAB `payment_amount = charge.balance_due`, `order_discount` may be omitted.

**Open questions — DECIDED by owner 2026-09-20 (D52) and DELIVERED by backend the same day (v1.8):** N7 → setting `allow_early_checkin` (default false → server 422; FE guard + message) **BQ-385-18 ✅** · N8 → setting `extend_rate_mode` (default `calendar`) **BQ-385-17 ✅** · N9 → unchanged, FE warns · N10 (backend minor) `received_by null` — hygiene · **N11 CLOSED** (per-night slab verified) · **D14 (P2)** calendar extend response `charge` stale by same-call payment · **BQ-385-19 (P2)** `nights_detail` on LR list.

**Backend blockers B-1 / B-3 / B-4 / B-5 / B-6: DELIVERED · VERIFIED.** Remaining: B-7 (open-bug smoke), B-8 (D5 spike), B-9 (owner "close Gate 2.6").


## Addendum 2026-09-21 — items raised after v1.9 (tracked in BACKEND_BRIEF_CR-385_2026-09-20_FINAL_PACK.md)
| Item | Status |
|---|---|
| D14 extend response under-reports same-call payment | FIXED + validated 2026-09-20 |
| D15 shorten re-prices at blended rate | FIXED + validated 2026-09-20 |
| D16 room move flattens GST slab | FIXED + validated 2026-09-20 |
| **D17 check-in advance dropped (`user-group-check-in` keeps method, zeroes amount)** | **OPEN — P0 for M3** |
| BQ-385-19 `nights_detail` on LR list | SHIPPED + validated 2026-09-21 |
| BQ-385-20 `split_payments[]` on advance | CONFIRMED not stored — FE single-method advance (OD-385-18 a) |
| **BQ-385-21 no-CM-rate sandbox date for `held_fallback`** | **OPEN — asked 2026-09-20 23:00 (P3, not money-blocking)** |
| **BQ-385-22 `local-reservations` performance & aggregation (5 asks)** | **OPEN — filed 2026-09-21 15:20 (P2, performance only, nothing blocked)** — full text `backend_briefs/BACKEND_BRIEF_CR-385_PERF_LR_2026_09_21.md`; evidence `evidence/CR-385/perf_2026_09_21/` |
