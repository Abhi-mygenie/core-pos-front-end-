# API Contract — CR-527 Diner name on credit rows — FINAL v1 — LOCKED 2026-11-15

Backend: Gyan · IDs: BB-09 · IA doc: `impact/CR-527_IMPACT_ANALYSIS.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. Diner on credit rows (BB-09) — LOCKED OD-B-BB09

Endpoint: `GET /api/v2/vendoremployee/pos/tap-customer-record-list` — credit rows

| Field | Type | Values | Default | Status |
|---|---|---|---|---|
| `diner_name` | string or null | Name of the diner on the order at credit time | `null` | NEW — **LOCKED** |
| `diner_mobile` | string or null | Mobile of the diner on the order at credit time | `null` | NEW — **LOCKED** |

**Source:** taken from the order’s customer at the time of credit. The diner may differ from the credit-holder (OD-527-A — e.g. Abhishek eats, credited to Saurav).

**Backend note (OD-B-BB09):** Owner flagged that if the diner’s mobile number matches a CRM customer record, the diner IS a customer. Backend (Gyan) to confirm whether populating `diner_mobile` has any CRM side-effect or whether it should be stored as plain text only. If it creates a CRM link, confirm behaviour in sign-off.

**Probe result** (R5 probe 31_0..2, top 3 holders, 534/238/119 rows): credit row keys today: `id, order_id, waiter_id, customer_id, credit/debit amount, transaction_id, current_balance, payment_status, comments (null), created/updated_at, restaurant_order_id, order_created_at` — no diner name or mobile field.

## 2. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BB-09 | | Confirm `diner_mobile` CRM behaviour (plain text vs customer link) | |
