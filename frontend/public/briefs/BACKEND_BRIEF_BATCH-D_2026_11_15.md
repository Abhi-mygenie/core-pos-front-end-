# Backend Brief: Batch D (Order Cards · Customer Link) · 2026-11-15

To: Gyan (backend) · FE: Abhishek · Client: ALL · Gate 2 closed on this brief.
Sources: `impact/BATCH-D_IMPACT_ANALYSIS_SUMMARY_2026_11_15.md`, `impact/CR-525_IMPACT_ANALYSIS.md`, `impact/CR-523_IMPACT_ANALYSIS.md`, `change_requests/BATCH_D_OWNER_DECISIONS_2026_11_14.md`, evidence `evidence/BATCH-D-IA/probes_2026_11_15/`.
Owner rule: changes are ADDITIVE. Existing behaviour must keep working.

## 1. Reset "bill printed" when items are added after print (CR-525 + CR-521). **Release blocker** (OD-525-E: FE waits for this)
| ID | Ask | Evidence / detail |
|---|---|---|
| BD-01 | On `PUT /api/v2/vendoremployee/order/update-place-order` with a **non-empty `cart-update`**, set `bill_print = 'No'` on the order and publish the usual `update-order` socket so every POS refreshes. | Probe P2 (order id 1578761): after `print/update-print-status bill_print=Yes`, adding 1 item returned 200 and `bill_print` **stayed `Yes`** (`P_P2_07_after_edit_readback.json`). |
| BD-02 | **Do NOT reset** on a customer-only update (empty `cart-update`, see §2). | CR-523 uses this call for customer save. |
| BD-03 | Confirm other edit paths that change the bill amount should also reset: item cancel (`cancel-food-item`), quantity change, transfer-food-item, discount apply (`ORDER_DISCOUNT.MANAGE`). Propose a list and the FE will follow it. | Question. |
| BD-04 | Keep `bill_print_count` as is (history). Only the `bill_print` flag resets. | `P2_04_mark_bill_printed.json` returns `bill_print_count`. |

## 2. Customer-only update on a placed order (CR-523)
| ID | Ask | Evidence / detail |
|---|---|---|
| BD-05 | Confirm `update-place-order` with `cart-update: []` + `print_kot:'No'` + `printer_agent: []` is a supported "customer only" call (no KOT, no new lines, totals unchanged). | Probe P3: 200, amount 420 unchanged, lines unchanged, `user_id` linked (51320), change → 51321 (`P3_02`-`P3_06`). |
| BD-06 | **Remove customer** (OD-523-C): today an empty `cust_name` + `cust_mobile` keeps the old customer (`P3_08`: still 51321). Add support for unlinking (e.g. `cust_remove: true`, or treat empty name + mobile as unlink). Propose the field. | Owner chose "Allow remove". |
| BD-07 | `order_edit_count` goes +1 on every customer-only call (`P3_04`: 2, `P3_06`: 3, `P3_08`: 4). Can a customer-only update skip the edit count / edit log so reports don't show fake "edits"? | Question. |
| BD-08 | The response text says "Items added to order successfully!" even when no items were sent. Optional: a clearer message for the customer-only case. | Cosmetic. |

## 3. Test data to clean (owner asked the team)
| ID | Ask |
|---|---|
| BD-09 | Delete the probe customers on CAFE 103 (restaurant 644): user **51320** "TEST_BATCHD_CUST" 9999900001, user **51321** "TEST_BATCHD_CUST2" 9999900002. Test order #021544 (id 1578761) is cancelled. Remove it from reports if needed. |

## Not needed from the backend
- BUG-669: `add-addon` price 0 → 201; `add-food` / `foods/{id}` variation `optionPrice "0"` → 200. FE-only fix (the variation case is still being checked by the owner, and the Aggregator endpoint was not probed).
- BUG-667, BUG-673: FE only.
- CR-525 setting: uses the existing `order_edit_access` (CR-489). No new key.
