# CR-527 — Credit: diner can differ from credit holder — Impact Analysis (Gate 2) — 2026-11-15

Code Reality: NONE — credit list per customer `{id,name,mobile,balance}` (`creditTransform.js` L77-81); detail rows `{orderId, restaurantOrderId, amount, …}` (L97-106); no diner name anywhere.
Risk: HIGH (customer data display). Backend-blocked: YES (diner name per credit row).
Conflict Pre-Check: `CreditCustomerDetailSheet.jsx` — CR-526 adds Remove action in same row → implement together.

## Owner decisions (locked)
- OD-527-A: credit can be given to someone other than the diner (Abhishek eats → Saurav's credit).
- OD-527-B (Q15, 2026-11-15): show **diner name on each order in the credit holder's detail**. No list grouping by phone. Design at Gate 2.5.

## Probe evidence (R5 2026-11-15, RID 541, read-only)
- 30: 54 credit customers (list has no diner data).
- 31_0..2 (top 3 holders, 534 / 238 / 119 credit rows): row keys = `id, order_id, waiter_id, customer_id, credit_order_amount, debit_order_amount, transaction_id, current_balance, payment_status, comments, created_at, updated_at, restaurant_order_id, order_created_at` → **no diner / order customer name**. `comments` always null in sample.
- FE could fetch each order ("View" → order detail) but that is N calls per sheet (534 rows) → not acceptable; backend must add the field.

## Impact
| File | Change |
|---|---|
| `api/transforms/creditTransform.js` L97-106 | Map `diner_name` (name per backend) → `dinerName` |
| `components/credit/CreditCustomerDetailSheet.jsx` L112-165 (+ own mapper L224) | New "Diner" column; show "—" when empty or same as holder; optional diner filter chip if > 1 distinct diner (Gate 2.5) |
| Credit print / export (if any in sheet) | Add diner column — verify at Gate 3 |

## Backend asks
- BB-09: `tap-customer-record-list` credit rows include the order's customer (diner) name (+ phone optional) — from the order's `cust_name` at time of credit.

## Open
None (design at Gate 2.5 M4).

## Gate 2.5 owner decisions (2026-11-15) — design APPROVED
- M4 + M4b approved.
- OD-527-C (many diners): **2–5 distinct diners → chips** with order count; **6+ → one searchable dropdown** ("Diner: All (N orders · M diners)"), each entry shows order count + open amount, sorted by most orders, "(no name)" bucket last. Selecting filters the table and shows a "<diner>: N orders · ₹X open" line. Diner column one line, long names truncated with full name on hover. 0–1 distinct diners → no filter.

## API Contract — FINAL v1 LOCKED 2026-11-15

`contracts/BATCH-B_CR-527_API_CONTRACT_2026_11_15.md`
