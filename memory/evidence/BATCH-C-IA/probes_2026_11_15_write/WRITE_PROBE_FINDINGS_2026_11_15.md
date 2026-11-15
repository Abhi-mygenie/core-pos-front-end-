# BATCH-C IA — Write Probe Findings — 2026-11-15

Owner GO: "please do write probe, u can take orders edit anything". Preprod, CAFE 103 (RID 644), user "Owner" (Manager).
Script: `batch_c_write_probe.py` (token never printed, output masked). Raw JSON in this folder.

## Test orders (all TEST_BATCHC_PROBE, all cancelled at end → f_order_status 3)
| Order | #   | Flow |
|---|---|---|
| 1578757 | 021540 | Unpaid takeaway qty 2 → bill print + confirm → +1 item (edit) → cancel 1 item → 2nd bill print |
| 1578758 | 021541 | Unpaid → collect with payment_mode `paylater` |
| 1578759 | 021542 | Unpaid → collect TAB without credit customer → 403 (expected) |
| 1578760 | 021543 | Placed prepaid `paylater` / `sucess` (Hold) → collected cash |
Cleanup: 1578758 + 1578760 made unpaid then cancelled; 1578757/1578759 cancelled.

## Findings that change IA assumptions

### CR-528
- W-1: After `order-temp-store` (bill) + `update-print-status` {bill_print: Yes} → response `bill_print_count: 1`, but `print_bill_status` stays **'No'** in get-single-order-new AND order-logs-report. No print operation in `operations[]`. → **Bill print is not visible in any report API today. CR-528 is fully BACKEND-BLOCKED** (not partial). Earlier "use print_bill_status='Yes'" assumption is invalid.
- W-2: `operations[]` contains **`item_cancel`** (new type) with created_at, previous/current amount, employee, food_id. Item cancels ARE in the log.
- W-3: `order_edit` op logged previous 420 → current 420 although order went 420 → 630 → amount fields on order_edit unreliable.
- W-4: `collect_bill` null while unpaid — proxy idea also fails for unpaid orders.

### CR-524
- W-5: `insights-cancellations` still has no `created_at` (confirmed on own item cancel, order 021540).
- W-6: Partial item cancel (qty 2 → cancel 1) **splits the line**: new row 3969224 created with `created_at` = cancel moment. Original punch time stays on row 3969222. → Backend must return the ORIGINAL line's punch time, else duration = 0.
- W-7: Timezones: `orders.created_at`, `cancel_time`, `cancel_at`, operations = local IST ("2026-11-15 13:55"); `order_details_table.created_at` = UTC ISO Z ("…08:25:53Z"). Mixed — FE must convert or backend must unify.
- W-8: Item cancels show `cancel_type` "Pre-Cooking" / stage "Before Cooking" (not "Pre-Serve" as FE sent).

### CR-503
- W-9: "Pay Later" in POS = **Hold** (`payment_method: paylater`), NOT TAB/Credit. IA assumed TAB rows on Credit tab — wrong tab.
- W-10: Hold placed as prepaid paylater → `f_order_status 1`, `payment_status 'sucess'`, `payment_for prepaid` → Beta shows it in **Hold** tab. Collecting via `order-bill-payment` (cash, paid) → fos 6, method cash → moves to Settled. Collect flow works from API.
- W-11: Collecting an unpaid order with mode `paylater` → fos 6, payment_status paid, method paylater ("Bill cleared via paylater") — also lands in Hold tab although already "paid". Two different Hold states exist.
- W-12: Rights on this role include `order_unpaid`, `update_payment`, `print_icon`, `printer`, `bill`. No dedicated collect-pay-later / reprint key (matches CR-515 IA).
