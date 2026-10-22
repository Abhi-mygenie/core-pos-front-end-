# CR-385 · N11 per-night GST slab + `nights_detail` — independent verification (2026-09-20, evening)

```
Backend reply:  evidence/CR-385/backend_replies/n7_n8_v2_2026_09_20.md (v2 of n7_n8 — adds "N8 GST (calendar)" + §3.1 cross-slab probe)
Runners:        run_n11.py (calendar + held control) · run_d14.py (response-staleness repro) · logs run.log · raw s*_*.json, d14_*.json, folio_*.json
Account:        owner@thegoankitchen.com (RID 69) · room 8525 · plan executive-s-ep · 10→11 Oct, extend → 12 Oct · paid upgrade 1,500 · advance 1,000 UPI · collect-now 500 cash
Sandbox after:  bookings 179 / 180 / 181 departed (TAB at the true balance), room 8525 → hk, settings restored (allow_early_checkin=false, extend_rate_mode=calendar, auto_print=false)
```

## Result table
| # | Backend claim (v2) | Our run | Status |
|---|---|---|---|
| 1 | GST slab decided **per sold night** (< 7,500 → 5 %, else 18 %); upgrade taxed at slab of `max(night rates)` | calendar extend: 10 Oct 8,600 @ 18 % = 1,548 · 11 Oct 7,400 @ 5 % = 370 · upgrade 1,500 @ 18 % = 270 → **GST 2,188 = sgst 1,094 + cgst 1,094**, `total_with_gst 19,688` (this morning's build taxed the blend 8,000 @ 18 % = 3,150) | ✅ **N11 FIXED** |
| 2 | `nights_detail[] {date, rate, source, gst_percent, gst}` on **calendar** extend `data.charge` only | present: `[{10 Oct, 8600, held, 18, 1548}, {11 Oct, 7400, calendar, 5, 370}]`; absent on check-in response, on held extend and on the LR list `charge` | ✅ (as specified) |
| 3 | `rate_per_night` = average, display only | 8,000 on calendar, 8,600 on held | ✅ |
| 4 | Held control: 18,700, 18 % single rate 1,683 + 1,683, no `nights_detail` | identical | ✅ |
| 5 | (not claimed) collect-now payment in the same extend call reflected in `charge` | **calendar path:** extend response `data.charge.advance_payment 1000 / balance_due 18688` although `payment_record_id 305/311` was created and `reservation.advance_payment 1500` in the same body; **LR read-back immediately after = 1,500 / 18,188 (correct)**; folio ledger has the ₹500 row; TAB sent at the stale 18,688 was **clamped by the backend to 18,188** (ledger row 306). **Held path** response correct (1,500 / 20,566). Reproduced twice (orders 1232608, 1232610). | ⚠️ **D14 (P2)** — response-only staleness |

## Findings for the FE contract
- **N11 CLOSED.** Slab is per night; the D10-class risk is gone. `charge.sgst/cgst` remain the totals the FE displays (AC-04); `nights_detail[].gst` covers **room nights only** (1,548 + 370 = 1,918) — the upgrade's 270 is inside `sgst/cgst` but not in `nights_detail`. FE must never sum `nights_detail` to get GST.
- **Extend Stay RIGHT panel (M4):** when `nights_detail` is present, show one line per night (`date · ₹rate · source chip held/calendar/held_fallback · GST %`) above the totals; when absent (held mode) show nights × avg with the "avg. rate / night" label. Totals always from `charge.*`.
- **D14 rule for M4:** after `room-extend-stay` **do not** update the row/strip from `data.charge.advance_payment / balance_due` — refetch the snapshot (LR) as X-14 already requires. `nights_detail` (response-only) is kept from the response for the confirmation toast/bill lines. Backend asked to (a) recompute `charge` after posting the same-call payment on the calendar path, (b) include `nights_detail` on the LR list `charge` for in-house rows so the Bill / Departures views can show per-night lines after a page reload (**P2 ask BQ-385-19**).
- Sandbox nuance: TAB with an over-stated `payment_amount` is silently clamped to the true remaining balance — good safety net, but the FE must still send the correct figure (D50).
