# CR-385 · FINAL regression pack + extra probes (G4-01 / G4-02 / G4-03 partial / OD-385-18 / X-05 / M6-04) — 2026-09-20 22:00 IST
Owner instruction: "please do all probes which were required". Auth alias OWNER_TGK (RID 69, sandbox-pms). Runners copied unchanged from `probes_2026_09_20_n7n8/`, `probes_2026_09_20_n11/`, `probes_2026_09_20_gate4/build3/` + new `run_extra.py`. Rooms used: 8525 (n7n8/n11), 8527 → 8528 (gate4). **Sandbox restored:** settings `allow_early_checkin=false · extend_rate_mode=calendar · auto_print_checkin_receipt=false` (x9_profile.json); every stay settled by TAB (orders 1232620/21/22/23/24 → rooms back to `hk`); reservations 191/192/193 cancelled.

## A. Regression pack — ALL GREEN (G4-01 ✓)
| Pack | Result | Key figures |
|---|---|---|
| `run_n7n8.py` | ✅ | invalid mode → 422 · raw JSON ignored · early OFF → **422** "Early check-in is not allowed…" · early ON → 200 · calendar extend 17,500 / GST 1,094+1,094 / 19,688 · held 18,700 / 1,683+1,683 / 22,066 · TAB 200 · restore ✓ |
| `run_n11.py` | ✅ | `nights_detail` [10-10 8600 held 18 % 1548 · 10-11 7400 calendar 5 % 370]; sgst=cgst 1,094; upgrade GST in totals not in list; held control no `nights_detail`; LR has no `nights_detail` (BQ-385-19 still open) |
| `run_gate4.py` 1·2·3·4·6 | ✅ | BQ-16 server pricing 201 · booking + adv 1,000 (upi) · check-in paid upgrade 1,500 → 10,100 / 11,918 (`booking_for=Individual`) · extend +1 night, pay 500 cash → 17,500 / 19,688 / adv 1,500 / due 18,188 · move 8527→8528 200 · TAB at `charge.balance_due` → 200, LR `departed`, `order_payment_status paid`, `balance_due 0`, ledger rows 1,000 upi + 500 cash + 17,480 TAB (= amount sent), room → `hk` |
| §1b "no rates → 422" | ⚪ not reachable | 2027-01-01 now has a rate (5,000) → 201. The 422 path is verified in the 2026-09-20 build-3 report; not re-testable today. |

## B. D14 — **FIXED + VERIFIED (G4-02 ✓)**
Calendar extend **response** `data.charge` now = `advance_payment 1500 / balance_due 18188` on the 17,500 sample (n7n8 s4, n11 s1, gate4 s4) — identical to the LR read-back. The FE rule D55 (refetch LR after extend) stays as defence in depth; matrix row #21 keeps it.

## C. Extra probes
| Probe | Result | Consequence |
|---|---|---|
| **OD-385-18 split advance** `direct-reservation` with `advance{method:"split", split_payments:[card 600 #4321, upi 400]}` | 201; `charge.advance_payment 1000`; **response/LR carry no split legs, no method, no txn id** (0 mentions of "split"/"card"/"4321") | Split at advance is **accepted as a lump sum only** — legs not confirmed stored. → **BQ-385-20** backend ask (echo/store `split_payments[]` on advance + extend `payment`). FE default: single-method advance now; Split tile at advance points parked until BQ-20 (plan §9). |
| **X-05 zero-night** `PATCH /{id}` `{checkout=checkin, preview:true}` | **422** "checkout must be after checkin." | client guard mirrors it (AC-11) ✓ |
| `preview:true` persistence | preview +1 night → 200 "Reservation modify preview"; LR checkout unchanged | preview is side-effect free ✓ (M2-04) |
| **G4-03 (d) shorten stay** 2 → 1 night on the calendar stay (8600 held + 7400 calendar, upgrade 1500) | 200 · `nights 1, rate_per_night 8000, booking_charge 9500` | **DEFECT D15 (P1 money):** shorten re-prices the remaining night at the *blended average* (8,000) instead of the held first-night rate (8,600 → expected 10,100). Re-extend then blends again → 7,700 × 2 = 16,900 (expected 17,500). Charges drift on every shorten/extend cycle. |
| **G4-03 (c) room move** (extend with `new_restaurant_table_id` 8528, same type, same dates) | 200 · `sgst 1094 → 1575` (GST 3,150 = flat 18 % on 17,500) | **DEFECT D16 (P1 money):** a room move recomputes GST at a single slab, discarding the per-night slab (night 2 = 7,400 @ 5 %). Total 19,688 → 20,650 with no price change. |
| G4-03 (a) cheap night < 7,500 on an *added* night / (b) `held_fallback` | ⚪ not reachable — CM rate for 2026-10-11 is 7,400 (already covers "cheap night" for the *added* night, 5 % ✓ in n11); `held_fallback` needs a date with no CM rate → backend sandbox help still required | G4-03 stays OPEN for (b) only |
| **M6-04 second TAB** on the paid order (`payment_amount 1`) | **200** `{"success":true,"status":"already_paid","message":"Order already paid"}` — no second ledger row | Idempotent ✓ but **200 not 4xx** → plan matrix #28 / checklist M6-04 wording: FE treats `status:"already_paid"` as success-no-op (toast "Already checked out"), never as an error. |
| Forbidden field check | folio `remaining_room_balance 17480` after TAB while `charge.balance_due 0` | D50 confirmed again — never read folio balance |

Files: `s*.json`, `x*.json`, `log_*.txt`, `ids.json`, runners.
