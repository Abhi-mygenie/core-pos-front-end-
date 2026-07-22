# Backend Brief — FINAL CONSOLIDATED (Insights Reconciliation Batch)
**From:** POS frontend team · **Compiled:** 2026-06-11 (supersedes BACKEND_BRIEF_2026_06_11.md + 2 addenda)
**Restaurants referenced:** The Palm House (rid 541) · cafe103 (rid 644) · Welcome Resort (rid 474) · preprod
**Replication evidence:** `/app/audit_data/` (palmhouse · cafe103 · welcomeresort) — every number below is reproducible from raw API payloads.

**Context for backend team:** the frontend Insights module was reconciled against your engines across THREE restaurants, Mar–May 2026. Sales identity (`Σ fs6 orders by collect_bill business day + TAB settlements ≡ daily-sales paid_revenue`) holds **92/92 days exact at rid 474**, **90/92 at rid 644** (₹2 total — item 6 below), **31/31 March at rid 541**. The asks below are the only remaining gaps.

---

## 1. Settlement `total_sale` formula — CONFIRM + explain Palm House residue (was BLOCKING, now narrowed)
We derived and validated the formula ourselves:
> **`total_sale = paid_revenue − tab_payment(settled) + TAB punched`** (= order collected + room food settled + TAB at punch)

- **rid 474 (Welcome Resort): 92/92 days EXACT, ₹0 residue** — including a property with real room rent (advance ₹4,76,500 / checkout ₹2,77,255 Mar–May). Proven: `total_sale` contains NO room advance/checkout/checkin amounts (adding them overshoots by exactly those totals).
- **rid 541 (Palm House): 27/31 March days exact**; residue **₹2,304** on 4 days only (Mar 6: 851 · Mar 16: 935 · Mar 17: 150 · Mar 18: 368).

**Ask:** (a) one-line CONFIRM of the formula; (b) explain the 4-day rid-541 residue (suspected same-day TAB cancels/edits).

## 2. Balance-as-of-date for credit (TAB) customers (BUG-127 historical upgrade)
`tap-waiter-list` now returns `restaurant-tap-summary` {total_credit, total_debit, balance} — thank you. However ALL date params (as_of_date / to_date / from+to, both formats) are silently ignored; the summary is always as-of-now.
**Ask:** honour `as_of_date` so the summary reflects that date. FE interim: tile labeled "as of today" (owner-approved) — not blocking, but the historical upgrade waits on this.

## 3. TAB orders stamped `f_order_status=6` at punch (CONTRACT QUESTION)
All 460 TAB orders (rids 541+644) carry status 6 before any collection, while `daily-sales-revenue-report` itself holds TAB out of paid revenue until settlement — stamp and engine contradict each other.
**Ask:** confirm intended semantics. **Do NOT change the stamp unilaterally** — FE now gates TAB by payment_method; any change must be coordinated (it would shift every fs-6 consumer).

## 4. Range version of `daily-sales-revenue-report` (PERF)
FE needs per-day `tab_payment` (Credit Cash/Card/UPI) for a range → currently N calls for N days (92 calls for a quarter).
**Ask:** accept `{from, to}`, return per-day array.

## 5. `operations[].order_cancel` — coverage + semantics (CONFIRMATION + NEW finding)
The op carries `previous_order_amount`, which FE uses (owner-approved) when present, else item-line consolidation.
- Feature first appears **2026-05-18** (rid 541). All earlier cancels lack it — fine, FE fallback covers history.
- rid 541 May: only 25/97 fully-cancelled orders have the op — why partial coverage?
- **NEW: rid 644 emits the op for ZERO cancelled orders, including 13 cancelled May 18–26** (e.g. #011503, #011538–#011541, #012031, #012042, #012072) — same window where rid 541 emits it. Is the feature per-restaurant? Please enable globally.
- Value appears tax-INCLUSIVE (263 vs items-net 250) — confirm definition.
- Edge cases inherit pre-cancel edits (rid 541 #015756: previous_order_amount 1.00 vs cancelled items 54 · #015772: 210 vs 400) — captured BEFORE or AFTER item removals?

## 6. Partial payments — leg amounts not on the order record (NEW)
`payment_method='partial'` orders carry `payment_amount=null` and only `order_amount`; the actual legs exist solely in daily-sales buckets. The legs also round ₹1 above the bill:
- rid 644 **#012271** (May 29): order_amount ₹1,159 → legs Cash ₹460 + UPI ₹700 = **₹1,160**
- rid 644 **#012311** (May 30): order_amount ₹3,600 → legs Cash ₹1,601 + Card ₹2,000 = **₹3,601**

These are the ONLY two non-reconciling days out of 92 at rid 644 (₹1 each). Both orders confirmed paid, not cancelled.
**Ask:** (a) expose the leg split (mode + amount per leg) on the order record; (b) confirm whether leg-sum > order_amount is intended rounding or a booking bug.

## 7. `payment_method='pending'` semantics (INFO)
13 orders (rid 541) carry literal `pending` with fs 2/5. Confirm meaning + whether it can ever reach fs 6 with that literal. FE currently keeps `pending` out of all paid buckets (owner-approved).

## 8. Data anomalies (HYGIENE)
- "Ghost cash" in `daily-sales-revenue-report` with NO underlying order row: 2026-06-07 ₹74 cash · 2026-06-10 ₹128 cash (rid 541). Order-logs wide fetch and get-settlement-report both AGREE with the order log — the daily-sales aggregate is the outlier. Suspected deleted/edited orders persisting in the aggregate. (March: zero such cases.)
- Order 012573 (rid 644): item cancel_at 2026-02-25 **earlier than** order created_at 2026-04-02.
- 34 cancelled item lines retain non-zero tax while the other 789 are zeroed — inconsistent zeroing on cancellation.
- Fully-cancelled orders' `order_amount` unreliable: 26/97 zero, others arbitrary (₹1 vs item value ₹54).
- `cancel_state` stray values: 'Merge' (2), 'ready' (3).
- Backend rejects `sort_by='cancel_at'` on order-logs-report (success=false) — FE works around with a 45-day lookback; a native cancel-date sort would remove that payload overhead.

---
**Priority order:** 1 (confirm only) · 2 · 5 · 6 → then 3 · 4 · 7 · 8.
*Contact: forward replies to the POS frontend thread. Replication scripts reproduce every figure: `/app/audit_data/{analyze.py, cafe103/reconcile_cafe103.py, welcomeresort/reconcile_wr.py}`.*
