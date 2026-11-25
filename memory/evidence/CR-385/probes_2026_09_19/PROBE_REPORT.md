# CR-385 · Live preprod probes — 2026-09-19 (owner-authorised, sandbox-pms RID 69)

Account: owner@thegoankitchen.com (token masked). All raw responses in this folder. Disposable booking **id 145 / MG-69-7099E57B…** was created and **cancelled** at the end (status `cancelled`, notify_cm=false).

## A. DEC-8 — Modify Booking behaviour (write probe on booking 145)

| Step | Call | Result | Meaning |
|---|---|---|---|
| P1 | `POST direct-reservation` 2 nights, `order_amount 6000` | 201 · `amount_before_tax 6000.00`, `amount_after_tax 6000.00`, `balance_payment 6000`, `pah true`, `rooms[0].rateplan_code null` | Row carries **`amount_before_tax`** (FE never reads it). GST not applied to a direct booking (before = after). |
| P2 | `PATCH /local-reservations/145 {checkout +2 days, reason}` — **no amount** (exactly what Modify sends today) | 200 · checkout 09→13 Oct (**4 nights**) but `amount_after_tax` **still 6000.00** | **Backend does NOT recompute on a date change.** Live gap G-02b confirmed on both sides → BQ-385-08 rule 1 is a real backend ask. |
| P3 | `GET local-reservations` window read-back | same as P2 | Persisted, not a response artefact. |
| P4 | `PATCH … {amount_after_tax: 0}` (what the dormant Modify rate code would send if wired) | 200 · `amount_before_tax 0.00`, `amount_after_tax 0.00`, **`balance_payment 6000`** | Backend **accepts ₹0 with no validation**, and `balance_payment` is **not derived** from the amount → BQ-385-03 inconsistency confirmed by construction. |
| P5 | `PATCH …?preview=true {amount 6000, rooms:[{id:156, rateplan_code:'executive-s-cp'}]}` | 200 "modified successfully" · `rateplan_code` **still null** | No dry-run/preview support (flag ignored, write happened). `rooms[].rateplan_code` change **ignored**. |
| P7 | `POST mark-no-show {channel:'Direct'}` | 422 "only supports booking.com and gommt" | BQ-385-04 fact re-confirmed; owner decision = Cancel only. |
| P8 | `POST /local-reservations/145/cancel` | 200 · `{status, cancelled_at, cancel_reason, reservation{…}}` — **no refund/penalty fields** | B-2 (Phase 2) confirmed absent. Cleanup done. |

## B. Data-shape facts for the Phase 1 brief

| Fact | Evidence | Impact on brief |
|---|---|---|
| LR row fields: `amount_before_tax`, `amount_after_tax`, `advance_payment`, `balance_payment`, `pah`, `channel`, `rooms[].room_code`, `rooms[].rateplan_code`, `rooms[].table_title`, `rooms[].order_id`, `rooms[].order_payment_status` | `lr.json` (39 rows: 30 departed, 5 in_house, 4 pending; channels WalkIn 27 / Direct 9 / booking.com 3) | `charge{}` can extend the row; `rateplan_code` slot already exists per room line but is null on direct bookings. |
| No per-night rate, no SGST/CGST on the LR row; folio `room_info.gst_tax` is **one merged value** (`50.00`) | `lr.json`, `p9_order_1232408.json` | AC-04 split needs backend (`charge.sgst/cgst`) — BQ-385-08 rule 2 justified. |
| `balance_payment` inconsistent: id 79 → 950 (=1000+50−100) but id 139 → 900 (same 1000 / 100 advance) ; id 30 → 10880 on an 8000 booking | `lr.json`, `p9_order_*.json` | BQ-385-03 confirmed with numbers. |
| `fetch-rates` returns per-date `{roomCode, rate, rateplanCode}` (executive-s-ep 8600, suite-s-ep 36800 for 19 Sep) | `rates.json` | Backend has everything needed to aggregate (DEC-1). FE `fromRates()` drops `rate`. |
| `dashboard-kpis` **requires** `start_date`/`end_date` (422 without); returns `as_of_date`, `today{arrivals_count, departures_count, in_house_count, no_show_count}`, `physical.days[]` | `kpis.json`, `p6_kpis.json` | Server has an `as_of_date` → BQ-385-12 can piggy-back; today's server `departures_count 2` vs list bucket to be compared in Gate 3. |
| Room board: `hk_assignee` present (**all null**), `title` values `ground floor / first  floor (double space) / 2nd floor / 3rd floor / patal lok` | `board.json` | Confirms D42 normalisation need; owner's real section list now known (5 titles). |
| Settings: `printer_agent: "No"`, `pay_tab: "Yes"`, `room_gst_applicable: "Yes"`, `pay_via_room: "Yes"`, no PMS print/auto-print key | `settings.json` | BQ-385-11 key does not exist yet; Credit/TAB is a configured method (DEC-3 feasible). |
| `cancellation-reasons` needs `limit`/`offset` (403 without) | `reasons.json` | FE already passes them (getCancellationReasons). |
| Rooms: 5 rooms, 2 types (suite ×4, executive ×1), all mapped, `aiosell_rateplan_code` null on every mapping | `rooms.json` | RATE_AUTOFILL brief ask #1 still open. |

## C. Not probed (write-risky on in-house orders)
`room-extend-stay`, `order-bill-payment` partial pay, `pms/check-in` upgrade — need a disposable in-house stay; propose at Gate 3 spike.
