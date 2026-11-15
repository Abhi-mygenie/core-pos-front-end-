# API Contract — CR-523 Customer-only order update — FINAL v1 — LOCKED 2026-11-15

Backend: Gyan · IDs: BD-05, BD-06, BD-07 · IA doc: `impact/CR-523_IMPACT_ANALYSIS.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**
Note: BD-08 (response message) DROPPED by owner — message stays as-is.

## 1. Customer-only update — confirm supported (BD-05)

Endpoint: `PUT /api/v2/vendoremployee/order/update-place-order`

| Field | Value | Status |
|---|---|---|
| `cart-update` | `[]` (empty array) | EXISTING — confirm: empty = no KOT, no new items, totals unchanged |
| `print_kot` | `'No'` | EXISTING — confirm unchanged |
| `printer_agent` | `[]` | EXISTING — confirm unchanged |

**Probe result (P3):** customer-only call with empty `cart-update` → 200, amount 420 unchanged, lines unchanged, `user_id` linked. Supported today.

## 2. Remove customer from order (BD-06) — LOCKED OD-D-BD06

Endpoint: `PUT /api/v2/vendoremployee/order/update-place-order`

**Signal: empty `cust_name` (empty string `""`) + empty `cust_mobile` (empty string `""`) = unlink the customer from the order. No new field.**

| Field | Current behaviour | New behaviour | Status |
|---|---|---|---|
| `cust_name` = `""` + `cust_mobile` = `""` | Keeps old customer (probe P3_08: customer 51321 stayed) | Unlinks customer — **LOCKED OD-D-BD06** | BEHAVIOUR change |

**When this is used:** cashier linked the wrong customer to an order and wants to remove the link without replacing it with another customer. POS sends empty name + mobile. Backend unlinks the customer from the order.

## 3. Edit count on customer-only update (BD-07) — LOCKED OD-D-BD07

| Where | Field | Rule | Status |
|---|---|---|---|
| `order_edit_count` | integer | Customer-only call: **keep incrementing** (no change to current behaviour) | EXISTING — **LOCKED OD-D-BD07** |

## 4. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BD-05 | | Confirm empty cart-update customer-only call is fully supported | |
| BD-06 | | Confirm empty name + empty mobile = unlink; confirm unlinking behaviour (order field cleared) | |
| BD-07 | | Confirm edit count increments on customer-only call (no change needed) | |
