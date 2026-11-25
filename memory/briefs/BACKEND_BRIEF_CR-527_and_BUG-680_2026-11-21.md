# Backend Brief — CR-527 (Diner vs Credit-Holder) + BUG-680 (Order Discount → Dashboard)

**To:** Backend (Gyan)
**From:** Frontend / POS (E1)
**Date:** 2026-11-21
**Env probed:** preprod `https://preprod.mygenie.online`, restaurant 69 (accounts: pms@macha.com, owner@cafe103.com / Qplazm@10)
**Related:** `contracts/BATCH-B_CR-527_API_CONTRACT_2026_11_15.md` (BB-09 v1 — LOCKED), `handover/V2_ORDER_DISCOUNT_FRONTEND_HANDOFF_2026-11-20.md`, `impact/CR-527_IMPACT_ANALYSIS.md`

> **Field names are LOCKED.** Use exactly `diner_name`, `diner_mobile` (string|null). Do not rename existing discount fields (`order_amount`, `restaurant_discount_amount`, `order_discount`, `discount_value`, `order_discount_type`).

This brief has two independent parts. **Part A (CR-527)** needs real backend work. **Part B (BUG-680)** is mostly done on the backend already (verified) — only one bug + two edge cases remain.

---

# PART A — CR-527: persist & expose the DINER (who ate), distinct from the credit HOLDER

## A1. Requirement
Credit may be booked to a **holder** who is not the **diner** (OD-527-A: *Abhishek eats, credited to Saurav*). The owner must see **who actually ate** on (1) credit detail rows, (2) the running order list / POS cards, and (3) single-order reads.

| Identity | Meaning | Order field today |
|---|---|---|
| **Diner** | person who consumed the order | `cust_name` / `cust_mobile` (often null today) |
| **Credit holder** | person the receivable is booked against | credit customer (`tap-waiter-list`); on order = `user` / `user_name` |

## A2. Live evidence of the gap
**(a) Credit rows** — `GET /api/v2/vendoremployee/pos/tap-customer-record-list?customer_id=N`: keys `diner_name`/`diner_mobile` are present **but null on 100% of rows** (cafe103: 0/428 across 12 holders; macha: 0 credit customers).

**(b) Cross-reference** (cafe103, holder "Mr. Jolly", 5 of his credit orders, via `get-single-order-new`):
```
credit row:       diner_name=null  diner_mobile=null
underlying order: cust_name=null   user_name="Mr. Jolly" (=holder)   cust_mobile=null
```
→ the order's own diner slot (`cust_name`) is null, so even the documented source has nothing to copy.

**(c) Running list** — `GET /api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager` (8 orders): customer-ish keys = `user_id, user_name, user{}, cust_name, cust_mobile`. **No `diner_name`/`diner_mobile`.**

## A3. Required backend changes
### BB-09.2a — accept + persist diner on the credit row (write path)
On credit/TAB create & settle (`tap-waiter-order-insert` and the order→credit settle flow), **accept** and **persist** on the credit transaction row:
| Field | Type | Meaning |
|---|---|---|
| `diner_name` | string\|null | the person who ate |
| `diner_mobile` | string\|null | diner's mobile |

Holder continues to come from the existing credit-customer `name`/`mobile`. `tap-customer-record-list` must read these back (keys already exist).

### BB-09.2b — fallback source
If a given path cannot send the fields, snapshot `diner_name`/`diner_mobile` from the order's `cust_name`/`cust_mobile` at credit time. (FE will also start populating order `cust_name` with the diner, but please treat the explicit fields as source of truth when present.)

### BB-09.3 — expose diner on order reads (NEW)
Add `diner_name` + `diner_mobile` to **each order row** of:
- `GET /api/v1/vendoremployee/pos/employee-orders-list` (ALL `role_name` values), and
- `POST /api/v2/vendoremployee/get-single-order-new` (`orders[]`).

Source = order diner (`cust_name`/`cust_mobile`); null when unknown. Leave `user`/`user_name` (holder) unchanged.

### BB-09 (original, still open) — CRM question
Does writing `diner_mobile` (a) store **plain text only**, or (b) **create/link a CRM customer**? Owner flagged (OD-B-BB09). FE needs the answer to know if entering a diner silently creates CRM contacts.

## A4. Acceptance (FE will verify on preprod)
1. Create credit order with diner ≠ holder → `tap-customer-record-list?customer_id=<holder>` row returns non-null `diner_name`/`diner_mobile`, distinct from holder.
2. Same order in `employee-orders-list` (Manager + Owner) and `get-single-order-new` returns the same `diner_name`/`diner_mobile`.
3. diner == holder or no diner → `diner_name` null (FE renders "—").
4. Exact field names `diner_name`/`diner_mobile`, type string|null.

## A5. Non-goals
No historical backfill. No change to amount/tax/loss logic. Holder capture unchanged.

---

# PART B — BUG-680: order discount must reflect on the dashboard / order list

## B1. Status: backend is VERIFIED working for the main flow
Endpoint `POST /api/v2/vendoremployee/order/order-discount-manage` recalculates and **propagates to the running-orders list** the dashboard consumes.

Live proof (rest 69):
- Order #000013: apply 10% → `employee-orders-list?role_name=Owner`: `order_amount` 1717→**1546**, `restaurant_discount_amount`=**171.7**, `discount_value`=10.00.
- Order #000020: apply 15% → `employee-orders-list?role_name=Manager`: `order_amount` 100→**85**, `restaurant_discount_amount`=**15**, `discount_value`=15.00. `get-single-order-new` matched.

→ The remaining dashboard display work is **frontend-only**; no backend change needed for the happy path. The items below are the only backend asks.

## B2. BUG — remove/clear does not recalc when discount_type mismatches (NEEDS FIX)
`order-discount-manage` with `discount_amount: 0` only recalculates `order_amount` and line `discount_on_food` when `discount_type` **matches the currently-applied type**.

Repro (order #000020, verified):
| Step | Request | Result |
|---|---|---|
| apply | `{discount_amount:15, discount_type:"percent"}` | order_amount 100→85, item discount_on_food=15 ✅ |
| remove (mismatch) | `{discount_amount:0, discount_type:"fixed"}` | header cleared (`restaurant_discount_amount=0`, `order_discount_json=null`) **BUT order_amount stayed 85 and item discount_on_food stayed 15** ❌ (stale) |
| remove (match) | `{discount_amount:0, discount_type:"percent"}` | order_amount→100, discount_on_food→0 ✅ |

**Impact:** after a user "removes" a discount with the wrong type, the dashboard/bill keeps showing the discounted (lower) amount — a financial display error.
**Ask:** a zero `discount_amount` of **any** `discount_type` must fully recalculate `order_amount` + line allocations (i.e. fully clear the discount). (FE will also defensively send the currently-applied type when clearing.)

## B3. Pre-existing V2 edge cases (from the V2 handoff — confirm policy)
1. **Fixed allocation after adding an item:** fixed discount stays on the original line and allocates 0 to a newly added item (affects line GST and item-transfer). Header total is correct; line allocation is not redistributed.
2. **Mixed fixed+% on merge/transfer:** merging a fixed-discount order into a %-discount order re-applies % across the combined subtotal; the source fixed treatment is not retained. Intended policy undecided — please confirm.

## B4. Acceptance (FE will verify)
1. Apply percent & fixed → `order_amount`/`restaurant_discount_amount` update in `employee-orders-list` (Owner & Manager) and `get-single-order-new`.
2. Remove with **any** type → order fully reverts (order_amount back to pre-discount, all `discount_on_food`=0, `order_discount_json`=null).
3. Edge cases B3.1/B3.2 behave per confirmed policy.

---

# Combined sign-off
| ID | Part | Scope | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|---|---|
| BB-09.2a | A | Persist `diner_name`/`diner_mobile` on credit row (write) | | | |
| BB-09.2b | A | Fallback snapshot from order `cust_name` at credit time | | | |
| BB-09.3 | A | Add diner fields to `employee-orders-list` + `get-single-order-new` | | | |
| BB-09 orig | A | `diner_mobile`: plain text vs CRM link | | | |
| BUG-680.R | B | Zero discount of any type must fully recalc (remove bug) | | | |
| BUG-680.E1 | B | Fixed-discount reallocation after adding an item | | | |
| BUG-680.E2 | B | Mixed fixed+% merge/transfer policy | | | |

**Notes for backend:** No DB migration reported for the v2 discount endpoint; rebuild route cache if route caching is enabled. All probes above are reproducible on preprod rest 69 with the listed accounts.
