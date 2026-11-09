# BUG-408 reconciliation — thegoankitchen (RID per token), POST daily-sales-revenue-report, probed 2026-09-24

| Date | Room Cash | Room Card | Room UPI | Cash+Card+UPI | Room Total | Room advance | Room Checkout | adv+chk | checkin_rev Cash/Card/UPI/TAB | checkin_rev sum | op.Room Checkin |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-03 | 0 | 0 | 0 | **0** | **84610.04** | 24488.38 | 37422 | 61910.4 | 28222/0/6000/0 | 34222 | 24488.38 |
| 2026-09-18 | 9925 | 0 | 0 | **9925** | **3000** | 1000 | 1800 | 2800 | 2800/0/0/0 | 2800 | 1000.00 |
| 2026-09-19 | 549 | 0 | 0 | **549** | **8000** | 200 | 900 | 1100 | 900/100/100/0 | 1100 | 200.00 |
| 2026-09-20 | 14048 | 0 | 0 | **14048** | **1021900** | 81700 | 593725 | 675425 | 14592/0/200/579133 | 593925 | 81700.00 |
| 2026-09-21 | 0 | 0 | 0 | **0** | **1393400** | 22000 | 580714 | 602714 | 0/1500/1500/580714 | 583714 | 22000.00 |
| 2026-09-22 | 0 | 0 | 0 | **0** | **297422.28** | 20422.28 | 70840 | 91262.3 | 70840/0/0/0 | 70840 | 20422.28 |
| 2026-09-23 | 436 | 0 | 0 | **436** | **2194592** | 49500 | 1298674.46 | 1.34817e+06 | 330346.45999999996/0/0/968328 | 1.29867e+06 | 49500.00 |
| 2026-09-24 | — | — | — | — | — | — | — | — | HTTP 525 (Cloudflare) | — | — |

## Observations
- `Room Cash+Card+UPI` never equals `Room Total` on any probed day (0 on 4 of 7 days; on 09-18 Cash 9925 > Total 3000).
- `Room advance` == `paid_revenue_method.order_payment['Room Checkin']` on every day (consistent).
- `room_checkin_revenue` sum == `Room Checkout` exactly on 09-22 (70840) and 09-23 (1298674.46); == advance+checkout on 09-18 (2800) and 09-19 (1100); off by 200 / 3000 on 09-20 / 09-21. It is NOT a check-in split.
- palmhouse account (owner@palmhouse.com): all room fields 0 for 09-03, 09-18..24, 09-24 — no room data for that tenant, cannot be used to validate BUG-408.
- 09-22 cross-check vs `aiosell/night-audit?date=2026-09-22`: collected 75165.76 (cash 60510.08 / card 952.38 / upi 1904.76 / ota 11798.54; stage checkout=75165.76, advance_at_checkin=0) vs DSR Room Checkout 70840 / advance 20422.28 / Cash 0. Two backend endpoints disagree for the same business day.

