# Backend Brief — Insights Reconciliation Batch
**From:** POS frontend team · **Date:** 2026-06-11 · **Restaurants referenced:** The Palm House (rid 541), cafe103 (rid 644) · preprod

Owner-approved asks, ordered by priority. Items 1–2 block report reconciliation; 3–6 are contract questions/nice-to-haves; 7 is data hygiene.

---

## 1. Settlement report `total_sale` — formula definition (BLOCKING — CR-033)
`get-settlement-report` day/aggregate `totals.total_sale` exceeds every reconstructable figure.
March 2026, rid 541: settlement total_sale **₹15,03,418** vs Σ all paid orders incl. room food (order-logs) **₹13,46,993** vs room-excluded **₹11,68,821**. ~₹1.4L/month unexplained even after adding cancelled + unpaid.
**Ask:** exact formula (which orders, which statuses, which date basis, pre/post discount, TAB/room/folio treatment). One paragraph suffices; we will reconcile to the rupee.

## 2. Balance-as-of-date for credit (TAB) customers (BLOCKING for one tile — BUG-127/R2)
`tap-waiter-list` returns current balances only. Dashboard needs "credit outstanding as of date D" for historical ranges.
**Ask:** parameter `as_of_date` on tap-waiter-list (or equivalent endpoint) returning Σ balances as of D.

## 3. TAB orders stamped `f_order_status=6` at punch (CONTRACT QUESTION — BUG-129)
All 460 TAB orders (both rids) carry status 6 before any collection, while `daily-sales-revenue-report` itself holds TAB out of paid revenue until tab_* settlement — the stamp and the report engine contradict each other.
**Ask:** confirm intended semantics. NOTE: frontend now gates TAB by payment_method, so do NOT change the stamp unilaterally — any change must be coordinated (it would shift every fs-6 consumer).

## 4. Range version of `daily-sales-revenue-report` (NICE-TO-HAVE — CR-030 perf)
Frontend needs `tab_payment` (Credit Cash/Card/UPI) per day for a date range → currently N calls for N days.
**Ask:** accept `{from, to}` and return per-day array.

## 5. Order-level cancelled amount — coverage + semantics (CONFIRMATION — OPS-CANCEL)
`operations[].operation='order_cancel'` carries `previous_order_amount`. Live findings, May rid 541:
- only 25 of 97 fully-cancelled orders have the op record — why partial coverage?
- value appears tax-inclusive (263 vs items-net 250) — confirm definition
- edge cases inherit pre-cancel edits (order 015756: previous_order_amount 1.00 vs cancelled items 54; 015772: 210 vs 400) — is previous_order_amount captured BEFORE or AFTER item removals?
**Frontend rule (owner-approved):** use the key when present, else item-level consolidation.

## 6. `payment_method='pending'` semantics (INFO)
13 orders (rid 541) carry literal `pending` with fs 2/5. Confirm meaning + whether it can ever reach fs 6 with that literal.

## 7. Data anomalies (HYGIENE)
- Order 012573 (rid 644): item cancel_at 2026-02-25 **earlier than** order created_at 2026-04-02
- 34 cancelled item lines retain non-zero tax while the other 789 are zeroed — inconsistent zeroing
- Fully-cancelled orders' `order_amount` inconsistent: 26/97 zero, others arbitrary (₹1 vs item value ₹54)
- `cancel_state` stray values: 'Merge' (2), 'ready' (3)

---
*Replication scripts + raw evidence: /app/audit_data/ (analyze.py reproduces every number).* Contact: forward replies to the POS frontend thread.

---
## ADDENDUM 2026-06-11 (post live-validation) — asks #1 and #2 updated

**#1 SHARPENED (CR-033):** We derived and live-validated the formula ourselves:
`total_sale = paid_revenue − tab_payment(settled) + TAB punched` (= order collected + room settled + TAB at punch).
March rid 541: 27/31 days reconcile exactly; residue only **₹2,304** on 4 days (Mar 6: 851 · Mar 16: 935 · Mar 17: 150 · Mar 18: 368).
**New ask:** (a) CONFIRM the formula; (b) explain the 4-day residue (suspected TAB cancels/edits same-day).

**#2 PARTIALLY ADDRESSED:** `restaurant-tap-summary` now in `tap-waiter-list` — thank you. However all date parameters are ignored (verified: as_of_date/to_date/from+to, both date formats → identical as-of-now summary). **Ask stands:** honour `as_of_date` so the summary/balances reflect that date. Frontend interim: tile labeled "as of today" (owner-approved R2-AMEND) — no longer blocking, but the historical upgrade waits on this.

---
## ADDENDUM-2 2026-06-11 — NEW anomaly for ask #7 (data hygiene)
`daily-sales-revenue-report` contains "ghost" cash with NO underlying order row:
- 2026-06-07: paid_revenue 2,705 / order_payment Cash 2,441 — order-logs (collect_bill) total only 2,631; **₹74 cash has no order**
- 2026-06-10: paid_revenue 672 vs order rows 544 — **₹128 cash has no order**
Cross-checks: order-logs wide fetch (created_at May 1–Jun 12) shows no partial legs, no NULL-collect_bill fs6 rows; **get-settlement-report agrees with the order log** (total_paid 2,631 / 544), so the daily-sales aggregate is the outlier. Suspected deleted/edited orders persisting in the aggregate table. Ask: confirm source of these residues. (March 2026: zero such cases — 31/31 days reconcile exactly.)
