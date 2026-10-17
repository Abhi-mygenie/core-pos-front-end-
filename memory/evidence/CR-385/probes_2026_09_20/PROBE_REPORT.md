# CR-385 · Backend reply verification probes — 2026-09-20 (owner-authorised, sandbox-pms RID 69)

Source of reply: `backend_replies/384plan_2026_09_19.md` ("CR-385 Phase 1 — curl handoff, Waves 1–6", shipped 2026-09-20). Disposable booking **id 149** created → previewed → modified → plan-changed → cancelled. Raw responses in this folder.

## A. Verified live (DELIVERED)

| Wave / BQ | Probe | Result | Verdict |
|---|---|---|---|
| 1a · **BQ-385-08** | `GET local-reservations?…&view=all` | 55/55 rows carry `charge{rate_per_night, nights, rateplan_code, rateplan_name, upgrade_amount, booking_charge, sgst, cgst, total_with_gst, prepaid_amount, advance_payment, balance_due}`; `meta{business_date 2026-09-20, server_time +05:30, timezone Asia/Kolkata}`; `counts{arrivals_today 0, arrivals_late 10, arrivals_tomorrow 0, departures_today 2, departures_overdue 3, in_house 5, leaving_today 2, arrived_today 0}` | ✅ |
| 1b · BQ-385-08 Q3 | `PATCH …/149 {checkout +1, preview:true}` | 200, `data.preview: true`, recomputed `charge` (3 nights → 9,000 / 9,450), DB unchanged | ✅ |
| 1c · BQ-385-08 rule 1 | `PATCH …/149 {checkout +1, amount_after_tax: 0}` | FE amount **ignored**; `amount_before_tax 9000`, `amount_after_tax 9450`, `charge.total_with_gst 9450` recomputed from rate × nights | ✅ (was the live gap G-02b) |
| 1c-plan | `PATCH …/149 {rooms:[{id, rateplan_code:'executive-s-cp'}]}` | line `rateplan_code` updated, `charge.rateplan_code` follows | ✅ |
| 1 read-back · BQ-385-03 | list window | `charge.balance_due 7450` (GST-incl.) vs legacy `balance_payment 7000` (pre-GST) — legacy field still differs by design | ✅ resolved by `charge.balance_due`; **FE must never read `balance_payment` again** |
| 2b · **BQ-385-10** | `POST direct-reservation {rooms:[{room_code, rateplan_code, rooms_count}], advance{2000, upi, UTR}, firm_name, firm_gst_no}` | 201; type booking accepted (`restaurant_table_id null`), `charge.advance_payment 2000`, `balance_due 4300` | ✅ advance + type booking |
| 3 · **BQ-385-12** | `GET room-status-board` | `data.meta{business_date, server_time, timezone}` present (board now `{meta, auto_hk_on_rm_checkout, rooms}` — **shape change**, FE transform must read `data.rooms`) | ✅ |
| 4 · **BQ-385-06** | `GET room-availability?checkin&checkout` | per room `{restaurant_table_id, table_no, title, aiosell_room_code, available, blocked_by in_house|reservation|ooo|null, booking_id}` | ✅ |
| 6a · **BQ-385-11** | `GET v1/profile` | `restaurants[].settings.auto_print_checkin_receipt: false` present (migration applied on preprod) | ✅ read; write (6b) not probed |
| cleanup | `POST …/149/cancel` | 200 | — |

## B. Answered by backend, NOT yet verified (need a disposable in-house stay → Gate 3 spike / owner smoke)

| BQ | Backend statement | Why not probed |
|---|---|---|
| **BQ-385-09** upgrade | `user-group-check-in` accepts `upgrade_type/amount/reason`; paid → separate "Room upgrade" folio line inside `charge`; 422 rules | creates a real in-house order on sandbox |
| **BQ-385-14** extend-stay | recomputes `charge`; accepts `discount{}`, `payment{}`, `new_restaurant_table_id`; 409 on conflict; returns `payment_record_id`, `inventory_push_warning` | write on live in-house order 1232408 |
| **BQ-385-15** Credit/TAB | `order-bill-payment {payment_mode:'TAB', payment_amount, mobile}`; receivable attaches to booking customer by phone/email | settles a live order |
| BQ-385-11 write | `POST update-settings {basic:{auto_print_checkin_receipt:true}}` | property-level setting toggle; verify at Gate 5 |

## C. Closed by answer (no code needed)
- **BQ-385-01 sockets** — no `pms_update_<rid>` channel in Phase 1; refresh-on-focus accepted. → CLOSED (matches owner-approved workaround).
- **BUG-384 room-payment** — backend: FE body was wrong (`room_order_id`, `payment_amount`, `payment_mode`, `payment_type:'advance'`); 403 was validation, not RBAC. → evidence for INTAKE to close BUG-384 (registry action, owner).

## D. New questions raised by the probes (→ MASTER §4, "Backend answer" pending)
| # | Observation | Question |
|---|---|---|
| N1 | Direct create used the **FE-sent `rate_per_night: 3000`** (fetch-rates shows executive-s-ep ≈ 8,600 for Sep dates); plan change to `executive-s-cp` kept 3,000 | For Direct bookings is `rate_per_night` authoritative from the FE, or does the server price from rates when the field is omitted? DEC-1 wants server pricing — FE will **omit** `rate_per_night`; confirm the server then prices from fetch-rates × plan. |
| N2 | `firm_name` / `firm_gst_no` sent on create → response `firm_name: null` | Are B2B fields persisted on the reservation (BQ-385-10 §4) or only at check-in? |
| N3 | `pah: true` on a booking that has ₹2,000 advance | Confirm `pah` = "pay at hotel (not OTA-prepaid)" regardless of advances; FE badge logic will use `charge.prepaid_amount > 0` for "Prepaid". |
| N4 | Board payload shape changed to `{meta, auto_hk_on_rm_checkout, rooms}` | Confirm final shape; `roomStatusTransform` must be updated (FE task in M4). |

## E. Second pass after owner answers N1–N5 (2026-09-20, later)

| Item | Owner answer | Probe | Result | Verdict |
|---|---|---|---|---|
| **N1** rate source | "Don't trust the browser's rate; price on the server when the field is missing." | `POST direct-reservation` **without** `rate_per_night` (executive · executive-s-ep · 10–12 Nov, type-only) | 201 but `charge.rate_per_night 0 · booking_charge 0 · total_with_gst 0`, `amount_after_tax 0.00` — while `fetch-rates` for those dates = **executive-s-ep 7,400** | ❌ **CONFLICT with DEC-1 — real backend gap.** Server does not price from rates when the FE omits the field (and does not re-price on plan change). → **BQ-385-16** (P0). Until fixed, Direct bookings would be created at ₹0. Booking cancelled. |
| **N2** B2B | "Check-in." | — | Owner decision: B2B (firm name + GST no.) is captured at **Check-In only**. | ⚠️ **Design change**: Booking v2.19 has a "B2B (GST) billing" toggle (D35) → remove at booking in mockup v2.28; AC-07 wording; Check-In keeps it (already exists in real CheckInPage). BQ-385-10 B2B fields → dropped from the create contract. |
| **N3** pah | "pah can be true for OTA and non-OTA." | — | `pah` = balance is collected at the hotel, independent of channel or advances. | ✅ No conflict. Badge rule (D48-b): **Prepaid** when `charge.prepaid_amount > 0`; else **PAY AT HOTEL** when `pah`; **Advance ₹X** chip additionally when `charge.advance_payment > 0`. |
| **N4** board shape | "Yes, that's the new format." | shape `{meta, auto_hk_on_rm_checkout, rooms}` confirmed | ⚠️ **Live regression risk**: current `roomStatusTransform` expects a list → Room Status page shows 0 rooms once this backend build hits production. | → INTAKE as a BUG (owner/INTAKE role): make the transform accept both shapes; ship before backend deploys to prod. |
| **N5** disposable stay | "Use any room which is checked in." | extend 1232479 and 1232408 (+1 night, discount, cash payment) | both **409** "Room conflict for new checkout (booking_id=…)" — every one of the 5 sandbox rooms is held by an **overdue in-house** stay (checkouts 18–20 Sep, still in-house), and `room-availability` for 21→22 Sep shows all 5 `in_house`. | 🟡 BQ-14 **conflict path verified** (409 + booking_id, as specified). Success path (charge recompute, payment_record_id, room move) **cannot** be exercised until the sandbox stays are checked out. |
| BQ-15 TAB | curl from the reply | `POST order-bill-payment {order_id:1232479, payment_mode:'TAB', payment_amount, mobile}` | **403** `{"order_id must be a string", "payment_status field is required"}` | ⚠️ **N6**: the reply's curl is incomplete. Real FE contract (orderTransform L1614–1690): `order_id` as string, `payment_mode:'TAB'`, `payment_status:'success'`, `transaction_id`, plus the full bill body (order_details, gst, grant_amount…). Verify through the real panel at Gate 5, not by curl. |
| BQ-09 upgrade | needs a check-in today | no free room today (all 5 in_house) | not exercised | 🟡 blocked by sandbox state (same as N5). |

**Sandbox ask (N5, refined):** backend/owner to check out (or reset) the 5 overdue in-house stays on sandbox-pms (orders 1232408, 1232479, 1232501, 1232549, 1232561) so BQ-09 / BQ-14 success path / BQ-15 can be verified.

## F. End-to-end lifecycle after owner checked out the sandbox (2026-09-20, evening) — booking 151 (cancelled) · booking 153 / order 1232582 (left in-house on room 8525 for owner to settle)

| Step | Call | Result | Verdict |
|---|---|---|---|
| E1 | `direct-reservation` executive · type-only · `advance 1000 upi` · `rate_per_night 3000` | 201 · `charge{3000×1, sgst 75, cgst 75, total 3150, advance 1000, balance_due 2150}` | ✅ BQ-10 |
| E2 | `user-group-check-in` booking 151 → room **8524 (suite)** with `upgrade_type=paid, upgrade_amount=1500, upgrade_reason` (multipart, exactly the reply's field list) | **422 "Table 8524 maps to suite but reservation line expects executive."** — same with `upgrade_type=complimentary` | ❌ **D1 — BQ-385-09 NOT WORKING**: the type-mismatch guard fires before the upgrade fields are read; a paid/complimentary upgrade to a higher type is impossible. |
| E3 | cancel 151 → `direct-reservation` **suite** on 8524 · `advance 1000` · rate 4000 | 201 · `charge{4000, total 4200, advance 1000, balance_due 3200}` | ✅ |
| E4 | `user-group-check-in` booking 153 → 8524, no upgrade, `advance_payment=1000` | 200 "Group check-in completed" · response `data: {}` — **no `charge` in response** | ⚠️ **D5** reply promised `charge` in the check-in response. |
| E5 | list read-back after check-in | `operational_status in_house` · **`charge.advance_payment 0`, `balance_due 4200`** (was 1000 / 3200 before check-in) · folio `room_info.advance_payment 0.00` | ❌ **D2 — MONEY: the ₹1,000 advance collected at booking is lost at check-in** (not merged / overwritten by the check-in payload). |
| E5b | folio `get-single-order-new` | `room_info.room_price 4200.00` + `gst_tax 200.00` (room_price already GST-inclusive → folio total 4,400 vs charge 4,200) | ❌ **D3 — MONEY: GST double-counted on the folio** (`room_price` stored as total_with_gst). |
| E6 | `room-extend-stay` 1232582 → 22 Sep (same room) | 409 "Room conflict for new checkout." (8524 shown `in_house` by our own stay) | ⚠️ conflict path OK; message lacks `booking_id` when the blocker is the guest's own room |
| E7 | `room-extend-stay` 1232582 → 22 Sep, `new_restaurant_table_id 8525`, `discount flat 200`, `payment 500 cash` | 200 · `payment_record_id 256` · `inventory_push success` · reservation moved to 8525 · **`charge{rate_per_night 1900, nights 2, booking_charge 3800, total 3990, advance_payment 500, balance_due 3490}`** | ✅ mechanics (move, payment record, inventory push) · ❌ **D4 — MONEY: extension night not charged.** Expected 4000 × 2 − 200 = **7,800** pre-GST; got 3,800 (= old 4,000 − 200, then ÷ 2 nights). `advance_payment` also shows only the new 500 (D2). |
| E8 | `order-bill-payment` TAB with a fuller body (`order_id` string, `payment_status success`, `payment_amount`, `grant_amount`, `mobile`) | **500** `SQLSTATE 23000 restaurant_discount_amount cannot be null` | ❌ **D6 — N6 confirmed**: the endpoint needs the full POS bill body; partial body → 500 instead of 422. BQ-385-15 verifiable only through the real panel (Gate 5). |
| E9 | `room-status-board` | 8524 `manual_status hk` (auto-HK after move ✅) · 8525 `manual_status hk` **with guest "E2E Probe Guest" inside** | ⚠️ **D7** room move does not clear HK / set occupied on the destination room. |

### Verdict for the reply's "shipped" claims
| BQ | Status after E2E |
|---|---|
| BQ-385-08 charge{} | ✅ verified (list, preview, recompute on dates, plan change) — **but recompute on extend is wrong (D4)** |
| BQ-385-09 upgrade | ❌ **NOT WORKING** (D1) — re-open |
| BQ-385-10 advance at booking | ✅ create verified — ❌ **advance lost at check-in (D2)** — re-open the read-back part |
| BQ-385-12 snapshot | ✅ |
| BQ-385-06 availability | ✅ (also correctly shows own stay as `in_house`) |
| BQ-385-11 flag | ✅ read |
| BQ-385-14 extend | ✅ endpoint mechanics · ❌ **pricing (D4)** — re-open |
| BQ-385-15 TAB | ⚠️ unverifiable by curl (D6); Gate 5 |
| Folio GST | ❌ **D3** (pre-existing? — check against BUG-423 formula) |

**Defects to send back (all P0 money except D5/D7):** D1 upgrade blocked · D2 advance lost at check-in · D3 folio GST double count · D4 extend under-charges · D5 no charge in check-in response · D6 TAB partial body 500 · D7 room move leaves HK state. Sandbox left: order 1232582 in-house on 8525 (owner to settle via app).

## G. Credit = TAB verification with the backend's full FE body (2026-09-20, ~09:37 IST) — order 1232582 / booking 153 (owner-authorised settlement)

Backend reply to N6: use the live FE body as-is — `order_id` **string**, `payment_mode:'TAB'`, `payment_status:'success'` (not `paid`), `paid_room:'yes'` for RM stay close, `transaction_id:''`, `food_detail:[]`, zero-filled discount/loyalty/coupon/tip fields, `cust_name/cust_mobile/name/mobile`; missing fields → 403 (validation, not RBAC). Sandbox values substituted: RID 69, `waiter_id 5117` (owner), `restaurant_name "The Goan Kitchen"`, guest phone 9000000009, `payment_amount = grant_amount = order_amount = 3490` (= `charge.balance_due` before the call).

| Step | Call | Result | Verdict |
|---|---|---|---|
| G0 | `local-reservations` pre-state | booking 153 `in_house`, `charge.balance_due 3490`, `advance_payment 500`, line `order_payment_status unpaid`, `counts.in_house 1` | baseline |
| **G1** | `POST order/order-bill-payment` (full body, TAB 3490) → `g1_tab_full.json` | **200** `{"message":"Room payment received via TAB"}` | ✅ **D6 CLOSED** — our earlier 7-field curl was the fault |
| G2 | `local-reservations` → `g2_lr.json` | reservation `operational_status departed`; line `line_status checked_out`, `order_payment_status paid`, `order_f_order_status 6`, `checked_out_at 2026-09-20 09:37:14`; `counts.in_house 0` | ✅ stay closed · ⚠️ `charge.balance_due` **still 3490**, `charge.advance_payment` still 500 |
| G3 | `get-single-order-new 1232582` → `g3_folio.json` | order `payment_status paid`, `payment_method TAB`, `order_status delivered`, `f_order_status 6`, `order_amount 0`, `collect_bill null`; `room_info.payment_status paid`, `balance_payment_mode TAB`, `room_price 3800`, `gst_tax 190`; `room_payment_summary{ledger_paid_amount 3800, total_paid_amount 3990, remaining_room_balance 3490, payments:[{256, 500, cash, advance, "extend-stay collect-now"}, {259, **3300**, TAB, checkout, received_by 5117, "Room checkout balance payment"}]}` | ✅ receivable recorded as TAB on the order's customer · ⚠️ **D8**: ledger amount 3,300 ≠ 3,490 sent; `remaining_room_balance 3490` after full settlement |
| G4 | `room-status-board` → `g4_board.json` | 8525 `display_status hk`, `manual_status hk`, `is_occupied false`, `guest null`; 8524 `hk` | ✅ room released, auto-HK |

**Verdict:** BQ-385-15 **VERIFIED** on contract (payment accepted, stay departed, room released, TAB recorded against the guest). **D6 CLOSED, N6 CLOSED.** New **D8 (P1 money)**: the TAB ledger row is the pre-GST balance (3,300 = 3,800 − 500) although the FE sent the GST-inclusive 3,490, and `charge.balance_due` / `remaining_room_balance` are not zeroed after departure. Also **D3+**: folio `room_price` was GST-inclusive after check-in (E5b: 4200 + 200) but pre-GST after extend (G3: 3800 + 190).

**N4 re-check (same session):** `probes_2026_09_19/board.json` shows the *old* shape was already `{auto_hk_on_rm_checkout, rooms}`; the new build only adds `meta`. `roomStatusTransform.fromRoomStatusBoard` executed against both payloads → 5 rooms, counts correct in each. **No live regression; hot-fix withdrawn.**

**Sandbox state after G1:** no in-house stay (in_house 0); rooms 8524/8525 in HK. Open backend defects: D1 · D2 · D3(+) · D4 · D8 · BQ-385-16 (money) · D5 · D7.
