# B2 Audit-UI — Live probe notes (2026-11-20)

**Account:** owner@cafe103.com (preprod) · token masked.
**Endpoint:** POST `/api/v2/vendoremployee/report/insights-dashboard`

## Latency (grounds BUG-722)
| Range | HTTP | Time | Note |
|---|---|---|---|
| 30D (2026-10-21 → 11-20) | **000** | **63.7s** | aborted at client — exceeds 60s axios limit → error shield |
| 7D  (2026-11-14 → 11-20) | 200 | **46.7s** | succeeds but slow |

→ Reproduces BUG-722 (30D/LM/FY timeout). Root cause = backend latency (B3 / BACKEND_BRIEF_2026_11_19_INSIGHTS_DASHBOARD_TIMEOUT.md already filed).

## audits payload shape (grounds BUG-730 / BUG-739)
`audits` keys returned:
```
make_unpaid_count, payment_method_change_count,
item_cancel_after_print_count, order_cancel_after_print_count, order_edit_after_print_count,
discount_apply_after_print_count, discount_remove_after_print_count,
total, orders,
late_cancel_count, late_cancel_ok_count, late_cancel_doubt_count,
late_cancel_risk_count, late_cancel_high_risk_count, late_cancel_unknown_count,
cancel_after_unpaid_count
```
7D sample: `total=3`, `orders` length=3, **unique order_id=1** (all 3 events on order #021537).

### Per-event fields (orders[])
make_unpaid event keys: `order_id, type, amount, by, prev_method, curr_method`.
- **events carrying `risk_level`: 0**
- **events carrying `duration_minutes`: 0**

→ Backend provides **tier COUNTS at the summary level** (`late_cancel_*_count`) but **NOT per-event `risk_level`/`duration_minutes`**. This is the crux:
- BUG-730 "true per-row Risk tier + Duration column" is **backend-blocked** (fields absent per event). The export sheet already declares `risk_level`/`duration_minutes` columns → they render **blank**.
- BUG-739 "Total Events = 1 (unique orders) vs 3 (events)" confirmed; backend already exposes `audits.total` (=3) as the true event count.

Raw saved: `insights_audits_7d_cafe103.json` (7D audits object).
