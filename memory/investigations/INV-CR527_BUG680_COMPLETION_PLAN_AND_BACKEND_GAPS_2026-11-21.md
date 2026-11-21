# Completion Plan + Backend Gaps — CR-527 (diner on credit) & BUG-680 (discount→dashboard)

**Role:** INVESTIGATION (Role 6) — read-only + live probes (one reversible write, cleaned up). NO application code changed.
**Date:** 2026-11-21 · **Confidence:** HIGH (both now live-verified on preprod)
**Accounts:** pms@macha.com (rest 69), owner@cafe103.com (rest 69 credit data) / Qplazm@10
**Evidence:** `/app/memory/evidence/BUG-680/`, `/app/memory/evidence/CR-527/`

---

# BUG-680 — Apply discount must sync to Dashboard / Order Entry / Cart

## Live proof (decisive)
Applied 10% to live order `1579043` via **`POST /api/v2/vendoremployee/order/order-discount-manage`**, then re-read the **running-orders list** (the dashboard's own source) and `get-single-order-new`, then removed it (cleanup OK):

| Field (running-orders list) | Before | After 10% |
|---|---|---|
| `order_amount` | 1717 | **1546** |
| `restaurant_discount_amount` | 0 | **171.7** |
| `order_discount` | 0.00 | **171.70** |
| `discount_value` / `order_discount_type` | — | **10.00 / Percent** |

`get-single-order-new` matched (order_amount 1546, per-item `discount_on_food` allocated).

## Verdict: **BACKEND IS READY. 100% frontend work. No backend gap for the dashboard.**
The v2 endpoint recalculates `order_amount` + `restaurant_discount_amount` and it **propagates to the running-orders list** that `OrderCard` consumes. The only reason the dashboard shows pre-discount today is the FE.

## FE work to complete (Option B, OD-680-01 LOCKED)
1. **Switch apply call v1→v2.** `api/constants.js:259` `MANAGE` points at `/api/v1/...order-discount-manage` (no recalc). Repoint `applyOrderDiscount` (`orderService.js:228`) to `POST /api/v2/vendoremployee/order/order-discount-manage` with body `{order_id:int, discount_amount:number, discount_type:"percent"|"fixed", discount_note?}`. Handle 422/404/401.
2. **Display post-discount on the tile.** `OrderCard.jsx:~526` already renders `order.amount` = `parseFloat(api.order_amount)` (`orderTransform.js:225`) — once v2 is used this auto-shows the discounted number. Add a discount line/badge using already-parsed `order.discount` (`restaurant_discount_amount`, `orderTransform.js:236`), `order.discountValue`, `order.discountType`.
3. **Parity (same pre-discount bug):** `OrderEntry.jsx:~1223` (Collect-Bill button) and `CartPanel.jsx:~512` read the same `order_amount` → will correct once the list returns recalculated amount; verify both show discounted total.
4. No new field needed — all required data already parsed onto the `order` object.

## Backend notes (do NOT block dashboard; flag for sign-off)
- Open finding 1 (per V2 handoff): **fixed** discount not re-allocated across lines after adding an item (affects line GST / transfer). 
- Open finding 2: mixed fixed+% merge policy undecided.
- Both are pre-existing V2 edge cases, independent of the dashboard display.

**Risk:** HIGH (financial display), P0 → Planning-skip NOT eligible → PLANNING Gate 2.

---

# CR-527 — Diner (who ate) vs credit holder, in the Collect-Payment credit flow

## Live proof (decisive)
- `tap-customer-record-list` returns `diner_name`/`diner_mobile` (BB-09 keys deployed) but **null on 100% of rows** (cafe103: 0/428; macha: 0 credit customers).
- **Cross-reference** (cafe103, holder "Mr. Jolly", 5 of his credit orders): underlying order has **`cust_name = null`**, `user_name = "Mr. Jolly"` (= the holder), and the credit row `diner_name = null`.

## Root cause (two layers — both must be fixed to complete the feature)
1. **FE capture gap (CollectPaymentPanel):** the credit flow captures ONE identity (`tabName`/`tabPhone` = holder) and seeds it from the order customer (`CollectPaymentPanel.jsx:557`). There is **no diner field**. The settle payload (`orderTransform.collectBillExisting:1786-1793`) sends `cust_name` = order `customer` (the diner slot) and `name`/`mobile` = `tabContact` (holder) — but the diner slot is **empty** because walk-in credit orders have no linked order customer. (`placeOrderWithPayment:1412` is even worse — it collapses `cust_name = customer?.name || tabContact?.name`.)
2. **Backend population gap (BB-09 read-only so far):** the contract says `diner_name` is "taken from the order's customer at the time of credit," but the credit-insert/settle path does **not** persist a distinct diner onto the credit row. Even if `cust_name` were sent, there is no evidence the credit row snapshots it into `diner_name`.

## FE work to complete
1. **CollectPaymentPanel credit section (`:3335-3424`):** add an explicit **Diner (who ate)** input (name + optional phone), default = order customer, independently editable. Keep "Credit Customer" = holder. Stop seeding the holder field from the diner (seed the new diner field instead) so they don't collapse to equal.
2. **Payload:** thread a dedicated `diner_name`/`diner_mobile` on BOTH builders (`collectBillExisting` AND `placeOrderWithPayment`) instead of overloading `cust_name`. Keep holder in `name`/`mobile`.
3. Detail-sheet display (already shipped) will then light up (`CreditRow` shows diner only when it differs from holder — `:140`).

## Backend asks (NEW — BB-09 Phase 2, write path) — REQUIRED, feature cannot complete without these
| ID | Ask | Why |
|---|---|---|
| **BB-09.2a** | Credit-insert/settle (`tap-waiter-order-insert` and the TAB settle path) must **accept** `diner_name`/`diner_mobile` and **persist** them onto the credit transaction row. | FE has no way to record diner today; backend currently derives only one customer. |
| **BB-09.2b** | If FE cannot send them, backend must snapshot `diner_name` from the order's `cust_name` at credit time — but then FE must first populate order `cust_name` with the diner (see FE #2). | Contract's stated source (`cust_name`) is null in practice. |
| **BB-09 (orig, still open)** | Confirm `diner_mobile` CRM behaviour: plain-text snapshot vs CRM customer link (OD-B-BB09). | Owner flagged; unresolved in contract sign-off table. |

**Risk:** HIGH (customer data + credit attribution). This is a **scope expansion of CR-527** (shipped = detail-sheet display only) → recommend widen CR-527 or open CR-527b → PLANNING Gate 2 + backend brief to Gyan.

---

## Bottom line for the owner
- **BUG-680:** fully understood, backend proven ready → **FE-only** (1 endpoint switch + OrderCard discount display + 2 parity spots). No backend gap.
- **CR-527 (CPP credit flow):** fully understood → needs **BOTH** an FE diner-capture field + a backend write contract (BB-09 Phase 2). Backend gap is real and specified above.
