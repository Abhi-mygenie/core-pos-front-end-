# CR-385 · Validation of BE reply `backend_replies/bq385-19_reply_2026-09-21.md` (BQ-385-19 / G4-07) — 2026-09-21
Runner inline (`log_bq19.txt`, `s*.json`). Alias OWNER_TGK. Fresh calendar stay: RES 207 · order 1232635 · room 8525 (upgrade 1,500, advance 1,000 upi). **Settled by TAB (10,918 → `departed`, `balance_due 0`); settings restored to defaults; room back to `hk`.**

| BE probe-expect | Live result | Verdict |
|---|---|---|
| P1 calendar extend → LR same booking: money equals extend, `nights_detail` present, rates match | extend resp = LR: 17,500 · 1,094/1,094 · 19,688 · adv 1,000 · due 18,688; `nights_detail` identical on both (`8600 held 18 %`, `7400 calendar 5 %`); `sum(rates)+upgrade = 17,500 = booking_charge` (gate rule holds) | ✅ |
| P2 held extend → LR: no `nights_detail` | BE accept row rid 206 read live: 18,700 · 1,683 · `nights_detail` absent (held mode not re-run by FE — BE's own live row inspected) | ✅ (read-only) |
| P3 Direct never extended → no `nights_detail` | 5 pending rows in window, 0 carry `nights_detail`; RES 207 before check-in and after check-in: absent | ✅ |
| Money unchanged by list read | LR `charge.*` equal to extend response on every read (before/after shorten, after TAB) | ✅ |
| Extra: shorten → LR | `nights 1 · 8600 · 10,100 · 909/909`, `nights_detail` 1 row (`8600 held`) — D15 still fixed; ledger persists | ✅ |
| Extra: after TAB | `departed`, `nights_detail` kept on the departed row (Bill after checkout can still show lines) | ✅ |
| BE accept rid 205 | 17,500 / 1,094 / 19,688 with both `nights_detail` rows, as stated | ✅ |

Net: **BQ-385-19 CLOSED (OG-PMS-027).** `charge.nights_detail` is now on the LR list whenever a calendar ledger exists and reconciles; absent otherwise (held / never extended). FE rule for M4/M6/M5: **if `charge.nights_detail` present → per-night lines; else "N nights · avg. rate / night"**; totals always from `charge.*`, never from summing `nights_detail[].gst`. **G4-07 no longer needs an owner decision** — the "avg" path remains only as the documented fallback for held-mode stays.
