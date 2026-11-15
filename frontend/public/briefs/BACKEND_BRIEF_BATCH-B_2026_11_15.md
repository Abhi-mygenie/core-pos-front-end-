# Backend Brief — Batch B (Payments · Credit · GST) — 2026-11-15

To: Gyan (backend) · FE: Abhishek
Client: ALL · Gate 2 closed on this brief.
**SEND STATUS: DRAFT — NOT SENT (2026-11-15).** Owner will decide how backend briefs are sent. Do not treat any BB item as acknowledged.
Sources: `impact/BATCH-B_IMPACT_ANALYSIS_SUMMARY_2026_11_14.md`, `change_requests/BATCH_B_OWNER_DECISIONS_2026_11_14.md`, per-item `impact/<ID>_IMPACT_ANALYSIS.md`, evidence `evidence/BATCH-B-IA/probes_2026_11_14/` (RID 644 cafe103, read + test-order writes) and `evidence/BATCH-B-IA/probes_2026_11_15_r5/` (RID 541 The Palm House, read-only). All payloads masked.
Owner rule: all changes ADDITIVE — existing behaviour must keep working. Field names below are proposals; reply with the final names and FE will use them.

## Priority / blocking view
| Item | FE can ship without backend? | Backend IDs |
|---|---|---|
| BUG-671 | YES | — |
| BUG-672 | YES | BB-01 (soft) |
| CR-526 | PARTIAL (buttons yes; settled-day block no) | BB-02, BB-03 |
| CR-542 | NO | BB-04, BB-05 |
| CR-514 | NO (card 4-digit stays until then) | BB-06, BB-07 |
| CR-522 | NO | BB-08 |
| CR-527 | NO | BB-09 |
| CR-536 | NO | BB-10 |
| BUG-607 | FE: note only; fix is backend | BB-11, BB-12 |
| CR-394 | YES (UI); data fix by backend | BB-13 |

## 1. Credit on prepaid orders (BUG-672)
| ID | Ask | Evidence / detail |
|---|---|---|
| BB-01 | (Soft, defence in depth) Enforce `payment_types` TAB `prepaid` flag: reject TAB/credit on a prepaid order when TAB `prepaid:0` on `order-bill-payment` and `place-order`. | Probe 21_B / 24: prepaid order + `payment_mode:TAB` → 200 "Bill cleared via TAB" though TAB `prepaid:0` (02_profile). FE will hide Credit by the flag. **Owner housekeeping:** enable TAB `prepaid:1` on cafe103 for QA. |

## 2. Make Unpaid / Remove from credit (CR-526, CR-542)
| ID | Ask | Evidence / detail |
|---|---|---|
| BB-02 | Settled-day signal: tell POS whether an order's business day is already settled (waiter settlement done). Proposal: `is_settled` + `settled_at` per waiter/date in `get-settlement-report`, and `day_settled` (bool) on order rows in `daily-order-report-details-combined` / order detail. | R5 probe 34_0..6 (7 days): waiter rows have `today_settlement`, `balance_to_settle`, `pilferage`, no settled flag. OD-526-B. |
| BB-03 | `make-order-unpaid` (and change payment method) must REJECT when the order's day is settled, message "Day already settled". | Probe 22_*: endpoint succeeds with no settlement check. |
| BB-04 | New reason type `item_type = 'Unpaid'` in `GET cancellation-reasons` + backend admin to add/edit them. | Probe 07: only `Order` / `Food` today. OD-542-A. |
| BB-05 | `make-order-unpaid` accepts + stores `reason` (text) and `reason_id` (nullable, null when "Other"); return it in order logs / Order Beta / audit. Same endpoint is used for "Remove from credit" and "Remove from room". | Today body is `{order_id}` only (FE `paymentMutationService.js` L99). |
| Info | Remove from credit = `make-order-unpaid` on the TAB order — already reverses the credit ledger. No new endpoint needed. | Probe 26: credit 420 → 0. |

## 3. Reference box per payment method (CR-514)
| ID | Ask | Evidence / detail |
|---|---|---|
| BB-06 | On each item of profile `payment_types` add: `ref_enabled` (0/1), `ref_required` (0/1), `ref_label` (text, optional, e.g. "UPI Ref"), `ref_max_len` (optional). Editable in backend admin per method. | Owner Q18: config lives on each payment method (same list as `prepaid/postpaid`). Probe 02: no ref flags today. |
| BB-07 | Confirm `transaction_id` is stored per split part (`partial_payments[].transaction_id`) and returned per part in Order Beta / audit. | Probe 21_C / 25: single UPI `transaction_id` stored + returned. Split per-part not verified. |

## 4. Payment tolerance (CR-522)
| ID | Ask | Evidence / detail |
|---|---|---|
| BB-08 | Restaurant setting `reconcile_tolerance_pct` (decimal, nullable) in `restaurant-settings/settings-list` (`basic`, next to `reconcile_amount`) + admin field. Blank/null = tolerance OFF (POS skips the ± check). | Owner Q17. Probe 03/33: only `reconcile_amount: "No"`. FE hardcodes ±3% today. Phase 2 (POS Settings write) later. |

## 5. Diner on credit orders (CR-527)
| ID | Ask | Evidence / detail |
|---|---|---|
| BB-09 | `GET /api/v2/vendoremployee/pos/tap-customer-record-list` credit rows: add the order's customer (diner) name — proposal `diner_name` (+ optional `diner_mobile`) taken from the order at credit time. | R5 probe 31_0..2 (534/238/119 rows): no name field on credit rows. Credit can go to someone other than the diner (OD-527-A). |

## 6. B2B invoice address (CR-536)
| ID | Ask | Evidence / detail |
|---|---|---|
| BB-10b (added 2026-11-15) | Optional: store a billing address on the customer profile next to `gst_number` so POS can pre-fill it (owner OD-536-C: pre-fill, editable). Today only delivery `addresses[]` exist. | Gate 2.5 M7. |
| BB-10 | Accept + store `custGSTAddress` (text) with existing `custGST` / `custGSTName` on `order-bill-payment` and `place-order`; print it on the bill under GST name; return `cust_gst`, `cust_gst_name`, `cust_gst_address` in order report rows / order detail. | OD-536-A. No UPI ID (OD-536-B). |

## 7. GST mode "category" (BUG-607) — Gyan
| ID | Ask | Evidence / detail |
|---|---|---|
| BB-11 | When `restaurant_gst = category`, every server-side tax path (scan / web / aggregator orders, bill print, reports, e-invoice) must use each item's `tax` — never restaurant `gst_tax`. No restaurant fallback (OD-607-A). | Probe 03 (RID 644): `restaurant_gst=category`, `gst_tax=5.00`. R5 probe 32 (RID 541): all 286 products carry item tax (5% GST ×220, 0% GST ×61, 0% VAT ×5), 9/32 categories mixed. POS already bills per item. |
| BB-12 | Share one order id where restaurant-level GST was applied wrongly, for regression. | Needed to close BUG-607 QA. |

## 8. One-time data fix: Inclusive → Exclusive (CR-394) — added 2026-11-15
| ID | Ask | Evidence / detail |
|---|---|---|
| BB-13 | One-time update: every product with `tax_calc = Inclusive` → `Exclusive`, **only for outlets with GST ON** (`gst_status = 1`). GST-off outlets untouched. Share count of products changed per outlet. POS removes the Inclusive choice from all screens. | Owner OD-394-B (Gate 2.5 M8). R5 probe 32 (RID 541): 0 Inclusive products. |

## Gate 2.5 decisions that change backend asks (2026-11-15)
- BB-05: reason also required on "Remove from Room" (same endpoint) — OD-542-B.
- BB-08: tolerance `0` = same as blank = no check — OD-522-B.

## Release impact
- BB-03 changes behaviour (unpaid blocked after settlement) — owner-approved (OD-526-B).
- BB-01 changes behaviour only when admin sets TAB `prepaid:0` — that is the intended rule.
- All other asks are additive fields.

## Reply format
Per ID: DONE / WILL DO (date) / NOT POSSIBLE (reason) + final field names. FE Gate 3 plans wait on BB-02..BB-10 replies for the blocked items.
