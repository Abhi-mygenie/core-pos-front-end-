# CR-385 · Phase 5 §5.4 probe-pack re-run on the release build — 2026-09-24 (business date), ~00:29–00:33 sandbox time

```
Handover:      handover/CR-385_PHASE5_EXECUTION_HANDOVER_2026_09_23.md §5.4
Account:       QA_TGK (read-by-pattern from memory/test_credentials.md via _probe_common.py — never printed; no literal credential in any script)
Host:          REACT_APP_API_BASE_URL from frontend/.env (preprod, RID 69 sandbox-pms)
Rooms used:    r4 (8525) and r5 (8527) only. r1 (8528) = owner stay #256 "coke" (order 1232674) — never touched. r2/r3 never touched.
Stay window:   2026-10-10 → 10-11, extend → 10-12 (same as 09-20 runs; still future vs business_date 2026-09-24)
Runners:       run_gate4.py · run_n7n8.py · run_n11.py · run_d14.py · run_d1516.py (+ _probe_common.py) — copies of the 09-20/09-21 scripts, credentials re-pointed, every request body appended to <run>_requests.jsonl, finally-cleanup in every script
Logs:          log_gate4.txt · log_n7n8.txt · log_n11.txt · log_d14.txt · log_d1516.txt · raw responses <run>_s*.json
Read-backs:    t0e_entry_probepack_readback.json (entry) · t9_exit_probepack_readback.json (exit)
Deviation:     N7 is server-enforced since 09-20 → gate4 sets allow_early_checkin=true before its future-dated check-in (s3_allow_early) and restores false in finally (the 09-20 gate4 copy pre-dated N7)
```

## 0. Entry / exit read-back (sandbox quiet)

| | Entry `t0e` | Exit `t9` |
|---|---|---|
| business_date | 2026-09-24 | 2026-09-24 |
| settings | early=false · calendar · auto_print=false | early=false · calendar · auto_print=false |
| in_house | only #256 r1 "coke" (1232674) | only #256 r1 "coke" (1232674) |
| board | r2/r3/r4/r5 `hk`, r1 `occupied_hk` | identical |
| qa_rows_left | [] | [] |
| counts | in_house 1 · departures_today 1 (= r1) · arrivals_late 10 (owner's pre-existing pending rows) | identical |

Disposable rows created + disposed this run: **275** (BQ-16 omit-rate, cancelled) · **276 / order 1232695** (gate4 lifecycle, TAB → departed) · **277 / 1232696** (N7/N8 calendar, departed) · **278 / 1232697** (N8 held, departed) · **279 / 1232698** (N11 calendar, departed) · **280 / 1232699** (N11 held, departed) · **281 / 1232700** (D14, departed) · **282 / 1232701** (D15/D16, departed) · **283** (BQ-20 split, cancelled) · BQ-20 bad-sum → 422, nothing persisted.

## 1. `run_gate4.py` — matrix 11, 18, 21 (booking / check-in / extend wire + `charge{}` read-back)

| § | Endpoint | HTTP | Key figures | Verdict |
|---|---|---|---|---|
| 0 | `fetch-rates` 10→12 Oct | 200 | executive-s-ep 8,600 (10 Oct) / 7,400 (11–12 Oct); suite-s-ep 36,800 / 31,500 — unchanged since 09-20 | rates present |
| 1 BQ-16 | `direct-reservation` **no `rate_per_night`**, 10→12 Oct | **201** | res 275 priced server-side; cancelled 200 | ✅ |
| 1b BQ-16 | unknown `rateplan_code` | **422** `no rate configured` | nothing persisted | ✅ |
| 2 | `direct-reservation` + `advance 1000 upi` | **201** | res 276 · `charge{8600 ×1, sgst 774, cgst 774, total 10148, advance 1000, balance_due 9148}` | ✅ |
| 3 | `user-group-check-in` r4/8525, `upgrade_type paid 1500` | **200** | order 1232695 · `charge{rate 8600, upgrade 1500, booking_charge 10100, sgst 909, cgst 909, total 11918, advance 1000, balance_due 10918}` · folio `room_price 10100.00 / gst_tax 1818.00 / advance 1000.00` · ledger row 450 advance 1000 upi GATE4ADV · board 8525 `occupied_hk` "P5 QA Gate4 Guest" | ✅ D1/D2/D3/D5/D9/D10 hold (upgrade **added**, slab 18 %) |
| 4 | `room-extend-stay` same room → 12 Oct, `payment 500 cash` | **200** | `charge{rate 8000 avg, nights 2, booking_charge 17500, sgst 1094, cgst 1094, total 19688, advance 1500, balance_due 18188}` · `nights_detail` 10 Oct 8600 held 18 % 1548 · 11 Oct 7400 calendar 5 % 370 · **LR row carries the same `charge` incl. `nights_detail`** | ✅ D12 (same-room 409) gone · D14 fresh · BQ-385-19 now served on LR |
| 5 | `room-extend-stay` `new_restaurant_table_id 8527` | **200** | money unchanged (17500 / 1094 / 1094 / 19688) · LR room → 8527 · board 8525 `hk`, 8527 `occupied` | ✅ D13 gone · D16 holds |
| 6 | `order-bill-payment` TAB 18,188, body **without `order_discount`** | **200** "Room payment received via TAB" | LR `departed`, `balance_due 0`, `advance_payment 19688`; order `paid / TAB / delivered`; ledger rows 1000 upi + 500 cash + **18188 TAB (= amount sent)**; board 8527 → `hk` | ✅ D6 holds · D8 ledger row = amount sent |
| 6 read-back | folio `room_payment_summary` | — | `total_paid_amount 19688` ✓ · `remaining_room_balance 18188` / `room_info.balance_payment 18188` **stay at the pre-TAB value after departure** | ⚪ known residual **OG-PMS-022** (P3 info, backend-acknowledged; FE never reads "owed" from the folio summary — D50) |

## 2. `run_n7n8.py` — matrix 16 (live), 32

| # | Claim | Run | Status |
|---|---|---|---|
| 0 | `settings-list` + `v1/profile` show defaults + `pms.*` aliases | `false / calendar / false` on both, aliases present | ✅ |
| 1 | `extend_rate_mode=bogus` → 422 | **422** | ✅ |
| 1b | raw-JSON `update-settings` ignored | 200, values unchanged (multipart `data=` is the only write path) | ✅ |
| 2 | CM rates 8,600 / 7,400 / 7,400 | same | ✅ |
| 3 | **N7 off** + future check-in → 422, `charge` untouched | **422** `Early check-in is not allowed for this property (stay check-in 2026-10-10 is after business date 2026-09-24).` · LR `charge` identical to booking (atomic) | ✅ |
| 4 | N7 on → 200, `booking_charge 10100`; **N8 calendar** extend → 17,500 | 200 order 1232696 · 8600 + 1500 = 10100 · extend `data.charge{8000 avg, 2 nights, 17500, 1094/1094, 19688, advance 1500, due 18188}` · LR identical (+ `nights_detail`) · TAB 18,188 → `hk` | ✅ |
| 5 | **N8 held** extend → 18,700 | order 1232697 · `18700, 1683/1683, 22066, advance 1500, due 20566` · LR identical · TAB 20,566 → `hk` | ✅ |
| 6 | money under `data.charge`, not top-level | `'charge' in body` = False both extends | ✅ |
| 7 | restore defaults | `false / calendar / false` verified on `settings-list` + `profile` | ✅ |

## 3. `run_n11.py` + `run_d14.py` — matrix 20 (per-night GST slab · collect-now echoed)

| # | Claim | Run | Status |
|---|---|---|---|
| N11-1 | slab **per sold night**; upgrade at slab of max night | calendar extend (order 1232698): `nights_detail` [10 Oct 8600 **held** 18 % 1548 · 11 Oct 7400 **calendar** 5 % 370] · sgst 1094 = cgst 1094 (1548 + 370 + upgrade 270 = 2188) · total 19,688 | ✅ **MATCH** all four backend figures |
| N11-2 | `nights_detail` on calendar extend `data.charge` | present; absent on check-in response; **now also present on the LR list `charge`** (09-20: absent → BQ-385-19 delivered) | ✅ |
| N11-3 | `rate_per_night` = average | 8,000 calendar · 8,600 held | ✅ |
| N11-4 | held control 18,700 · 1683/1683 · no `nights_detail` | order 1232699: identical, `nights_detail: null` | ✅ |
| **D14** | collect-now 500 in the same extend call reflected in `charge` (response **and** LR) | order 1232700: response `charge.advance_payment 1500 / balance_due 18188` · `payment_record_id 466` · LR `1500 / 18188` · folio ledger [1000 upi, 500 cash] · true balance 18,188 → **RESPONSE STALE: False · LR STALE: False** | ✅ D14 stays FIXED |

## 4. `run_d1516.py` (r4 8525 → r5 8527) — matrix 20 (D15 shorten · D16 move · BQ-385-20)

| Claim | Run (order 1232701) | Status |
|---|---|---|
| calendar extend → 17,500 · 1094/1094 · `nights_detail` 2 rows | `s3_extend` exactly that; LR identical | ✅ |
| **D16** move keeps charge + per-night GST | `s4_move`: 17,500 · 1094/1094 · `nights_detail` kept · LR room 8527 · board 8525 `hk` / 8527 `occupied` | ✅ |
| **D15** shorten → sold-night rate | `s5_shorten`: `nights 1 · 8600 · 10100 · 909/909 · 11918` · `nights_detail` 1 row · LR checkout 10-11 | ✅ |
| re-extend → 17,500, no drift | `s6_reextend`: 17,500 · 1094 · 2 rows · LR checkout 10-12 | ✅ |
| **BQ-385-20** split accepted, lump stored, sum validated | `s7_split` 201 `advance_payment 1000`, no "split" echo (res 283 cancelled 200) · `s7b_split_badsum` **422** `advance.split_payments amounts must sum to advance.amount.` | ✅ contract unchanged (FE single-method) |
| settle + restore | TAB 18,688 → `departed`, `balance_due 0`; settings `false / calendar / false`; board r4/r5 `hk` | ✅ |

## 5. `probes_2026_09_21_held_fallback/` — G4-03 (b)

**skipped — no recipe.** Requires the backend to wipe a CM rate (D68 recipe); backend team not available for this run. Verified LIVE on 2026-09-21 (`probes_2026_09_21_held_fallback/PROBE_REPORT.md`, `h1_extend_1116.json`) — no waiver needed then; not re-run now. Same wording as M3-S06.

## 6. D17 — produced in Session A (`d17_reverify.json`, `run_d17_reverify.py`), not re-run.

## 7. Forbidden-key grep over every captured request body

```
$ cat *_requests.jsonl | wc -l            → 64 POST bodies captured (JSON + multipart) across the 5 runs
$ grep -E "rate_per_night|amount_after_tax|new_room_price" *_requests.jsonl | wc -l   → 0
$ grep -v user-group-check-in *_requests.jsonl | grep -cE "rate_per_night|room_price|amount_after_tax|new_room_price"   → 0
$ grep -E "room_price" *_requests.jsonl   → 8 hits, all `/api/v1/vendoremployee/pos/user-group-check-in` multipart with the literal `room_price="0"`
```

- **All JSON bodies** (`direct-reservation`, `room-extend-stay`, `order-bill-payment`, `update-settings`, `cancel`): **empty grep** for all four keys. ✅
- **Multipart `user-group-check-in`** (8 check-ins): the only hit is the frozen literal `room_price="0"` that the release FE itself sends (`frontDeskService.js` L99 `fd.append('room_price','0')`, alongside `order_amount='0'`, `balance_payment='0'`, `gst_tax='0'`) — a constant zero, never a computed figure. Same treatment as Session A's `run_d17_reverify.py` (`FORBIDDEN` = 3 keys for the legacy multipart). Under D50/G-02 the FE **never computes or submits** money: satisfied. ✅
- No `rate_per_night`, `amount_after_tax`, `new_room_price` anywhere. Responses (not requests) legitimately carry `charge.rate_per_night` / `data.room_price` — read-only display, per contract.

## 8. Net

| Matrix row | Evidence | Status |
|---|---|---|
| 11 (booking wire + `charge{}`) | gate4 §1/§2, n7n8 s3, d1516 s1 | ✅ PASS |
| 16 live (N7 server guard) | n7n8 s3 422 / s4 200 | ✅ PASS |
| 18 (check-in wire, upgrade added, slab) | gate4 §3, n7n8/n11/d14/d1516 check-ins | ✅ PASS |
| 20 (extend money: per-night slab, `nights_detail`, D14, D15, D16, BQ-20) | n11, d14, d1516 | ✅ PASS |
| 21 (extend/move wire + LR read-back) | gate4 §4/§5, d1516 s3–s6 | ✅ PASS |
| 32 (N8 `extend_rate_mode` calendar/held) | n7n8 s4/s5, n11 | ✅ PASS |
| G4-03 (b) held_fallback | 09-21 live evidence | ⚪ skipped — no recipe (already verified live) |

**No FAIL. No new defect.** One pre-known residual re-observed (OG-PMS-022, P3 info). One improvement noted vs 09-20 baseline: LR list `charge` now carries `nights_detail` (BQ-385-19 delivered by backend). Sandbox restored: rooms r4/r5 `hk`, settings default, `qa_rows_left=[]`, owner stay r1 #256 untouched.
