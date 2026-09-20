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
