# CR-385 · Validation of BE reply `backend_replies/d15-16_reply_2026-09-20.md` (D15 · D16 · BQ-385-20) — 2026-09-20 ~22:45 IST
Runner `run_d1516.py 8527 8528` (mirrors the BE curl pack §5, plus LR read-back after every step and a bad-sum split case). Alias OWNER_TGK. Stay: RES 199 · order 1232628 · 8527 → 8528. **Settled by TAB (balance 18,688 → `departed`, `balance_due 0`); reservations 200/201 (split probes) cancelled; settings restored to defaults; rooms 8527/8528 back to `hk`.**

| BE claim | Probe | Verdict |
|---|---|---|
| Calendar extend → 17,500 · 1,094/1,094 · `nights_detail` 8600@18 % + 7400@5 % | `s3_extend.json`: exactly that; LR read-back identical | ✅ |
| **D16** same-window move keeps charge + per-night GST | `s4_move.json`: 17,500 · 1,094/1,094 · `nights_detail` kept; LR identical; board 8527 `hk`, 8528 occupied | ✅ **FIXED** (was 1,575/1,575) |
| **D15** shorten uses the sold night rate | `s5_shorten.json`: `nights 1 · rate 8600 · booking_charge 10,100 · 909/909 · 11,918`; **`nights_detail` now also returned on shorten** (1 row); LR identical, checkout 10-11 | ✅ **FIXED** (was 9,500 / 11,210) |
| Re-extend → back to 17,500 / 1,094, no 7,700 drift | `s6_reextend.json`: 17,500 · 1,094 · `nights_detail` 2 rows; LR identical | ✅ |
| BQ-385-20 split accepted, only lump stored, sum validated | `s7_split.json`: 201, `advance_payment 1000`, no "split" in echo · `s7b_split_badsum.json`: **422 "advance.split_payments amounts must sum to advance.amount."** | ✅ confirmed as stated — FE single-method only |
| D14 (regression check) | extend response `advance_payment 1000 / balance_due 18688` = LR | ✅ still fixed |
| BQ-385-19 | LR list still has no `nights_detail` (only `charge` totals) | ⚪ still open (G4-07 owner fallback) |

Net: **D15 CLOSED · D16 CLOSED · BQ-385-20 CONFIRMED (contract, not a fix).** M4 shorten + move flows unblocked. G4-03 (c)(d) verified on the fixed build; (b) `held_fallback` still needs a no-CM-rate sandbox date.
