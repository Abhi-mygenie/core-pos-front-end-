# BACKEND_BRIEF_CR-385_2026-09-20 — final-pack findings (D15, D16, BQ-385-20)

## Summary
- Issue: three findings from the Gate-4 final regression pack on `room-extend-stay` / `direct-reservation` (evidence `evidence/CR-385/probes_2026_09_20_final/`).
- Classification: D15 BACKEND_BUG (money) · D16 BACKEND_BUG (money) · BQ-385-20 CONTRACT_MISMATCH
- Frontend impact: Front Desk shows `charge.*` only (D50), so the FE cannot mask these — Extend Stay figures would be wrong after a shorten or a room move.
- Priority/Risk: D15 P1 CRITICAL · D16 P1 CRITICAL · BQ-20 P2 HIGH
- Auth/context: OWNER_TGK, RID 69, token ***

## D15 — shorten stay re-prices at the blended average
- `POST /api/v2/vendoremployee/pos/room-extend-stay` `{order_id 1232624, new_checkout_date 2026-10-11, reason}` on a 2-night calendar stay (10-10 held 8,600 · 10-11 calendar 7,400 · upgrade 1,500; `rate_per_night 8000` blended).
- Expected: remaining night keeps its sold rate → `booking_charge 10,100` (8,600 + 1,500), GST 18 % → 11,918.
- Actual: `nights 1, rate_per_night 8000, booking_charge 9500, total_with_gst 11,210` (`x3_shorten.json`). Re-extend to 10-12 → `7700 × 2 + 1500 = 16,900` (`x3b_reextend.json`) instead of 17,500. Drift compounds on every cycle.
- Fix ask: price from the per-night ledger (`nights_detail`), never from the blended `rate_per_night`.

## D16 — room move recomputes GST at one slab
- Same endpoint with `new_restaurant_table_id 8528` (same type, same dates) after the calendar extend (GST 1,094 + 1,094 = 2,188 per N11).
- Expected: charge and GST unchanged (nothing sold changed).
- Actual: `sgst 1575, cgst 1575, total_with_gst 20,650` (`s5_move.json`, `s5_lr.json`) — flat 18 % on 17,500; per-night slab lost.
- Fix ask: on move, keep `nights_detail` and its per-night GST.

## BQ-385-20 — `split_payments[]` on advance not echoed/stored
- `POST …/aiosell/direct-reservation` with `advance{amount 1000, method "split", split_payments:[{card 600, transaction_id 4321},{upi 400}]}` → 201, `charge.advance_payment 1000`; response and LR row contain no method / legs / txn id (`x1_split_advance.json`, `x1_lr_row.json`).
- Ask: confirm whether legs are stored (ledger after check-in) and echo them; same for `room-extend-stay.payment` and check-in advance. Until then FE sends single-method advances only (owner D47-h Split-at-advance parked).

## Frontend workaround
- D15/D16: none (display-only contract). D14 is now FIXED (verified) — thank you.

## Reply + FE validation (2026-09-20 ~22:45)
BE reply `evidence/CR-385/backend_replies/d15-16_reply_2026-09-20.md`: D15 FIXED, D16 FIXED (night ledger persisted on `reservation.raw_payload.pms_night_rates`), BQ-385-20 confirmed not stored. **FE live validation** `evidence/CR-385/probes_2026_09_20_d1516/PROBE_REPORT.md`: all claims reproduced (shorten 10,100 / 11,918 with `nights_detail`; move 17,500 / 1,094 unchanged; re-extend no drift; split bad-sum → 422). **D15 CLOSED · D16 CLOSED · BQ-20 = contract note (single-method advance).**

## BQ-385-21 — sandbox help for G4-03 (b) `held_fallback` (asked 2026-09-20 23:00; should have been bundled with the D15/D16 brief — FE omission)
- Need: one date range on `sandbox-pms` (`executive-s-ep`) with **no CM rate** so a calendar-mode extend onto that night returns `nights_detail[].source = "held_fallback"`.
- Ask: either (a) tell us an existing no-rate date window, or (b) remove the rate for e.g. 2026-11-20 → 2026-11-22 for 48 h and confirm the expected `held_fallback` figures (rate = held check-in rate, GST slab per that rate).
- Also confirm: does `held_fallback` ever appear in **held** mode, or only in calendar mode?
- FE side: chip copy "held (no rate for this date)" is planned in M4 (D55); untested until this is answered. Owner may waive (G4-03 b).

## D17 — check-in advance is dropped by `POST /api/v1/vendoremployee/pos/user-group-check-in` (found 2026-09-20 23:30, B-7 smoke S-411)
- Classification: BACKEND_BUG (money) · Priority **P0** for CR-385 M3 (collect-now at check-in) · also the root cause of **BUG-412** (folio Advance Paid wrong).
- Repro (`evidence/CR-385/probes_2026_09_20_b7smoke/c1_direct.json` → `c2_checkin_adv500_card.json` → `c3_folio.json`): Direct booking (no advance), then check-in multipart with `advance_payment=500`, `payment_method=card`, `room_price=0`, `order_amount=0` (FE omits the rate per BQ-16).
- Expected: `orders[0].advance_payment 500`, ledger row `{500, card, advance}`, `charge.advance_payment 500`, `balance_due 5,275`.
- Actual: `orders[0].advance_payment 0`, folio `room_info.advance_payment "0.00"` while `payment_mode "card"` **is** stored, ledger `[]`, LR `charge.advance_payment 0`, `balance_due 5,775`.
- Same result through the UI (QA agent, order 1232629, `folio_1232629.json`). Advances taken at **booking** (`direct-reservation.advance`) are recorded fine (gate4 s2/s3) — only the **check-in** advance is lost.
- Question: is the advance ignored because `room_price=0`? If so, that contradicts BQ-16 (server pricing) and must be fixed server-side; FE will not send a price.

## BQ-385-19 — reply validated (2026-09-21)
`backend_replies/bq385-19_reply_2026-09-21.md` reproduced live (`probes_2026_09_21_bq19/`): P1 ✓ P2 ✓ P3 ✓; money unchanged; ledger persists through shorten and TAB. **CLOSED.** Still open on your side: **D17** (check-in advance dropped, P0) and **BQ-385-21** (no-rate sandbox date for `held_fallback`).

## D17 / BQ-385-21 — reply validated (2026-09-21)
`backend_replies/d17_reply_2026-09-21.md`: **D17 FIXED** — reproduced via API (500 / 1000 / 1500 cases, `probes_2026_09_21_d17/`) and via UI (QA iter4, S-411 PASS ×2). **CLOSED.** BQ-385-21: understood — no empty CM night; no further ask. Nothing open for backend in this pack. Thank you.
