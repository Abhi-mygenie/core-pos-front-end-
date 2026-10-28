# CR-385 · Gate-4 re-verification of backend build 2 (`reblock_fe.md` curl plan) — 2026-09-20 ~10:30 IST · sandbox-pms RID 69

Plan: `evidence/CR-385/backend_replies/reblock_fe_2026_09_20.md` (§0–§6b). Runner: `run_gate4.py` (saves every raw response here). Disposable bookings **156** (§1, cancelled) · **157** (§1b, cancelled) · **158 / order 1232586** (lifecycle, settled by TAB). Sandbox is shared — room 8524 held by another tester's stay ("blpi") throughout.

## A. Step-by-step

| § | Call | Result | Verdict |
|---|---|---|---|
| 0 | `fetch-rates` 10–14 Oct | executive-s-ep 8,600 (10 Oct) / 7,400 (11–14 Oct); suite-s-ep 36,800 / 31,500 | rates present |
| **1** BQ-16 | `direct-reservation` **no `rate_per_night`**, executive-s-ep, 10→12 Oct | **201** · `charge{rate_per_night 8000, nights 2, booking_charge 16000, total_with_gst 18880}` = (8,600 + 7,400) priced from Aiosell, averaged per night; GST 18 % (≥ ₹7,500 slab) | ✅ **BQ-385-16 rule 1 FIXED** |
| **1b** BQ-16 | same, 1→3 Jan 2027 (plan expects 422 "no rate configured") | **201** with `rate_per_night 5000` — the sandbox **has** rates for Jan 2027 (fetch-rates: 5,000; even 2028 returns 100), so this step cannot produce a no-rate case. Variant: unknown `rateplan_code` → **422 `{"status":false,"message":"no rate configured"}`**, nothing persisted | ✅ rule 2 verified by variant (plan step is not runnable on this sandbox) |
| **2** D2 setup | `direct-reservation` executive 10→11 Oct, `advance 1000 upi GATE4ADV` | 201 · `charge{8600 ×1, sgst 774, cgst 774, total 10148, advance 1000, balance_due 9148}` | ✅ |
| **3a** D1/D3/D5 | `user-group-check-in` with the plan's **exact field list** → suite table 8525, `upgrade_type paid 1500` | **500** `SQLSTATE[23000] Column 'booking_for' cannot be null` (raw SQL in body) · **and** the reservation's `charge` was already mutated (`rate_per_night 7100, upgrade_amount 1500`) although check-in failed | ❌ **D11** plan body incomplete (real FE sends `booking_for=Individual`, `booking_details`, `room_price`, `email`, `name2..4`, `firm_*`) · 500 not 422 · **non-atomic write** |
| **3b** D1/D3/D5 | same with the **real FE body** (`pmsService.pmsCheckIn` fields + upgrade fields) | **200** · `data.order_id 1232586` · `data.charge{rate_per_night 7100, nights 1, upgrade_amount 1500, booking_charge 8600, sgst 215, cgst 215, total_with_gst 9030, advance_payment 1000, balance_due 8030}` · folio `room_price 8600.00` + `gst_tax 430.00` · ledger row 261 "Room check-in advance (booking carry)" 1000 upi GATE4ADV · board 8525 occupied "Gate4 Guest" | ✅ **D1 FIXED** (no type 422) · ✅ **D2 FIXED** (advance carried) · ✅ **D3 FIXED** (pre-GST + separate GST) · ✅ **D5 FIXED** (order_id + charge returned) · ❌ **D9 / D10** below |
| **4** D4 | `room-extend-stay` 1232586 → 12 Oct, `payment 500 cash`, same room | **409 "Room conflict for new checkout."** · `room-availability 11→12 Oct`: 8525 `blocked_by in_house, booking_id MG-69-08BAAC39…` = **our own stay** | ❌ **D12** same-room extend self-conflicts → D4 pricing **not re-verifiable** (same as E6 yesterday) |
| **5** D7 | `room-extend-stay` with `new_restaurant_table_id 8527` (and again 8528 + payment) | **500 `Undefined variable $currentTableId`** `AiosellRoomExtendStayService.php:223` — HTML stack trace returned | ❌ **D13 regression** (move worked yesterday, E7) → D7 **not re-verifiable** |
| **6** D6 | `order-bill-payment` TAB, full FE body **without `order_discount`**, `payment_amount 8030` | **200** "Room payment received via TAB" · order `paid / TAB / delivered` · LR line `checked_out 10:37:52`, reservation `departed` · board 8525 → `hk`, unoccupied | ✅ **D6 FIXED** (no SQL, no 500) |
| 6 read-back | folio ledger | payments: 1000 upi advance + **7,600 TAB** (`= 8600 − 1000`, pre-GST); `total_paid_amount 9030`; **`remaining_room_balance 8030`**, **`charge.balance_due 8030`**, `advance_payment 1000` unchanged after departure; order `order_amount 1500` | ❌ **D8 still open** (ledger row ≠ amount sent; balance not zeroed) |

## B. New defects from this run
| # | Defect | Evidence | Expected | Prio |
|---|---|---|---|---|
| **D9** | **Paid upgrade is carved out of the room rate instead of added**: `rate_per_night 8600 → 7100`, `upgrade_amount 1500`, `booking_charge` stays **8600**. The guest is never charged the ₹1,500. | `s3_checkin_upgrade_febody.json`, `s3_lr_febody.json` | `rate_per_night 8600`, `upgrade_amount 1500`, `booking_charge 10100` (+ GST) | **P0 money** |
| **D10** | GST slab flips after check-in because of D9: at booking 18 % (`sgst 774`, rate 8,600 ≥ 7,500) → after check-in 5 % (`sgst 215`, rate 7,100 < 7,500). Same stay: total **10,148 → 9,030**. | `s2_create_advance.json` vs `s3_lr_febody.json` | slab from the real per-night room charge (8,600 + upgrade) → 18 % throughout | **P0 money** |
| **D11** | Check-in with the backend's own probe body → **500 + raw SQL** (`booking_for cannot be null`) and **non-atomic**: `charge.upgrade_amount/rate_per_night` persisted on the still-pending reservation | `s3_checkin_upgrade.json`, `s3_lr.json` | 422 listing the missing field; charge untouched on failure | P1 (hygiene + data integrity) |
| **D12** | Same-room extend always **409** — the guest's own in-house stay blocks the room for the new window (`room-availability` shows `blocked_by in_house` with the same `booking_id`). Extend without a room move is impossible. | `s4_extend.json`, `s4_avail_11_12.json`; also E6 (2026-09-20 evening) | exclude the order's own line from the conflict check | **P0 functional** (blocks Extend Stay entirely) |
| **D13** | Room move (`new_restaurant_table_id`) → **500 `Undefined variable $currentTableId`** (`AiosellRoomExtendStayService.php:223`), HTML trace leaked — **regression vs yesterday's build** | `s5_move.json`, `s5b_move_extend_8528.json` | 200 as in E7 | **P0 regression** |
| D8 | still open (see §A read-back) | `s6_folio.json`, `s6_lr.json` | ledger row = amount assigned to TAB; `balance_due` → 0 | P1 money |
| N7 | Check-in accepted today (20 Sep) for a stay dated 10 Oct; `counts.arrived_today 2`, `in_house 2` while the board shows the room occupied now | `s3_checkin_upgrade_febody.json`, `s3_lr_febody.json` | question: should check-in be limited to `business_date` (± allowed early check-in)? | question |

## C. Status of the original re-block list after build 2
| Item | Build 1 (E2E) | Build 2 (this run) |
|---|---|---|
| BQ-16 omit rate → ₹0 | ❌ | ✅ fixed (priced from Aiosell; 422 when no rate) |
| D1 upgrade 422 | ❌ | ✅ fixed — but **D9/D10** make the upgrade free and lower the GST |
| D2 advance lost | ❌ | ✅ fixed (ledger "booking carry") |
| D3 folio GST double count | ❌ | ✅ fixed (pre-GST + gst_tax) |
| D4 extend under-charges | ❌ | ⏸ not verifiable — **D12** (same-room 409) and **D13** (move 500) |
| D5 empty check-in data | ❌ | ✅ fixed (order_id + charge) |
| D6 TAB partial body 500 | ❌ | ✅ fixed (also without `order_discount`) |
| D7 move leaves HK | ❌ | ⏸ not verifiable — **D13** |
| D8 TAB ledger amount / balance not zeroed | ❌ (found G3) | ❌ still open |

**Money paths remain RE-BLOCKED**: Check-In upgrade (D9/D10), Extend Stay (D12/D13 → D4/D7 unknown), Credit tile amount (D8). **Unblocked by this build**: New Booking pricing (BQ-16), advance-at-booking carry (D2), folio Room block basis (D3), check-in response (D5), Credit tile contract (D6).

## D. Sandbox after the run
- 156, 157 cancelled · 158 departed (order 1232586 paid/TAB) · 8525 → hk · 8524 occupied by another tester ("blpi") · 8526 booked (someone else) · 8527/8528 available.

---
# Build 3 re-verification (backend reply `re_fe_2026_09_20.md`, our run 2026-09-20 ~13:50 IST) — `build3/` (+ `build3/d11/`)

Bookings **161/162** (§1/§1b, cancelled) · **163 / order 1232593** (lifecycle: check-in 8525 → extend → move 8527 → TAB) · **164 / order 1232594** (D11 omit-`booking_for` path, TAB-settled). Oct rates changed on the sandbox meanwhile (executive-s-ep now 9,500 all dates) — numbers differ from the backend's 8,600 run but the arithmetic is identical.

| Item | Result | Verdict |
|---|---|---|
| BQ-16 | omit rate → `rate_per_night 9500`, 2 nights 19,000, GST 18 % → 22,420 · unknown plan → 422 (variant; Jan-2027 has rates → 201, cancelled) | ✅ |
| D2 | advance 1,000 → check-in ledger "booking carry" 1000 upi GATE4ADV; `balance_due 11980 = 12980 − 1000` | ✅ |
| **D9** | check-in paid upgrade: `rate_per_night 9500`, `upgrade_amount 1500`, **`booking_charge 11000`** | ✅ **FIXED** |
| **D10** | GST stays 18 %: `sgst 990 / cgst 990` on 11,000 | ✅ **FIXED** |
| D3 | folio `room_price 11000.00` + `gst_tax 1980.00`; upgrade is a folio line `Room upgrade: Suite upgrade probe` ₹1,500 (`item_type OTHER`) + room line 9,500 | ✅ |
| D5 | `data.order_id 1232593`, `data.orders[]`, `data.charge{}` | ✅ |
| **D12** | same-room extend → **200** `nights 2` | ✅ **FIXED** |
| **D4** | `booking_charge 20500 = 9500 × 2 + 1500`, `sgst/cgst 1845`, `total 24190`; advances accumulate `1500`; `payment_record_id 267` | ✅ **FIXED** |
| **D13** | move → **200**, `new_restaurant_table_id 8527` | ✅ **FIXED** |
| **D7** | board after move: 8527 `occupied` Gate4 Guest · 8525 `hk` | ✅ **FIXED** |
| D6 | TAB full FE body without `order_discount`, `payment_amount 22690` → 200 | ✅ |
| **D8** | ledger checkout row **22690 = amount sent**; LR `charge.balance_due 0`, `charge.advance_payment 24190` (= total paid); `payment_status paid`, `departed`; 8527 → hk | ✅ **FIXED** (residual: folio `remaining_room_balance 22690` still stale — backend: ignore, use `charge.balance_due`) |
| **D11** | booking 164 check-in **without `booking_for`** → 200, `order_id 1232594`, charge correct; settled by TAB (`balance_due 0`) | ✅ **FIXED** |

## Residuals / observations for the owner (not blockers)
| # | Observation | Ask |
|---|---|---|
| R1 | Folio `room_payment_summary.remaining_room_balance` lags after TAB (22,690 shown when `charge.balance_due` = 0); order `order_amount 1500` (= upgrade line) after settlement | FE rule: **"cleared" = `payment_status === 'paid' && charge.balance_due === 0`**; never read `balance_payment` or folio remaining |
| R2 | `charge.advance_payment` is **cumulative paid** (1,000 → 1,500 after extend collect-now → 24,190 after TAB) | D48-b "Advance ₹X" chip only on pending / in-house rows; label = "Paid so far" |
| **N7** | Check-in accepted on 20 Sep for a 10 Oct stay (`arrived_today` increments) — backend: product-open | owner decision: allow early check-in? (Arrivals tab only lists today/late by design) |
| **N8** | Extension night priced at the **held check-in rate** (backend run: 8,600 held while 11 Oct rate table said 7,400) | owner decision: hold the rate or price extra nights from the rate table? |
| N9 | Check-in into a room still in HK (8525 was `hk`) is allowed → board `occupied_hk` | FE: Check-In room picker should flag HK rooms (design already shows HK state) |
| N10 | extend collect-now ledger row `received_by null` (check-in advance has 5117) | backend minor |

**Verdict: every Gate-4 money / extend / move / TAB item is fixed and independently re-verified. Backend side of B-1 / B-3 / B-4 / B-5 is DELIVERED · VERIFIED.** Remaining blockers are ours: B-7 (open-bug smoke), B-8 (D5 spike), B-9 (owner "close Gate 2.6"). Sandbox: 163/164 departed; 8525/8527/8528 hk; 8524 another tester.

## BQ-385-11 write (2026-09-20, `bq11/`)
`POST restaurant-settings/update-settings` multipart `data={"basic":{"auto_print_checkin_receipt":true}}` → 200; `v1/profile` → `true`; set back to `false` → 200; profile → `false`. ✅ Setting write verified; sandbox left at the original value (false).
