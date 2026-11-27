# Investigation Report — CR-527 diner identity in the COLLECT-PAYMENT credit flow (capture side)

**Role:** INVESTIGATION (Role 6) — read-only, NO application code changed
**Date:** 2026-11-21
**Item:** CR-527 (shipped scope = credit **detail sheet** display only). Owner now wants it on the **Collect-Payment credit flow**.
**Confidence:** HIGH (FE code-traced) · backend population UNPROVEN (read-only, could not force a credit write)
**Steps used:** 9/10
**Account:** owner@cafe103.com / Qplazm@10 (preprod)

---

## 1. Summary
- The owner wants the **diner** (person who ate) captured/shown **separately from the credit holder** (person the credit is booked against) inside the **CollectPaymentPanel credit/TAB flow**. Today that flow captures **only one identity**, and the shipped CR-527 never touched this panel.
- **Root cause of "diner never shows" = two compounding gaps:**
  1. **Capture gap (CollectPaymentPanel):** the "Credit Customer Details" section captures a **single** name/phone (`tabName`/`tabPhone`) = the **credit holder**. There is **no diner field**. The diner can only come implicitly from an order-linked `customer`.
  2. **Default-equality gap:** `tabName` is seeded from `customer?.name` (`CollectPaymentPanel.jsx:557`). So when the order has a customer, the holder field is pre-filled with the **diner's own name** → holder == diner by default → the detail-sheet Diner cell deliberately renders `—` (`CreditRow` L140 hides diner when `dinerName === holder.name`). For walk-ins (no order customer) the diner is simply blank.
- Net: unless a cashier manually types a **different** holder than the diner AND the order carried a customer, diner == holder (or null) → nothing ever shows. This is consistent with the live probe (0/428 rows had a non-null diner).

## 2. What the settle payload actually sends (decisive trace)
`orderTransform.collectBillExisting` (TAB settle on a placed order — the path used by the screenshots' running order) already emits **two separate identity blocks**:
| Payload field | Source | Meaning |
|---|---|---|
| `cust_name` / `cust_mobile` (`orderTransform.js:1786-1787`) | `customer` (order-linked) | the **DINER** (order customer) |
| `name` / `mobile` / `crm_customer_id` (`orderTransform.js:1791-1793`) | `tabContact` (from CPP) | the **CREDIT HOLDER** |

So the backend **does receive a diner (`cust_name`) distinct from the holder (`name`)** — *but only when the order has a linked customer*. The prepaid/new-order builder `placeOrderWithPayment` (`orderTransform.js:1412`) instead **conflates** them: `cust_name = customer?.name || tabContact?.name` (falls back to holder when no order customer).

## 3. Why diner_name is null on preprod (hypotheses)
| # | Hypothesis | Status | Note |
|---|---|---|---|
| H1 | Backend BB-09 column not deployed | ELIMINATED | keys present (prior probe) |
| H2 | Backend not snapshotting `diner_name` from order `cust_name` at credit time | **LIKELY** (unproven) | needs a live credit write with a distinct cust_name to confirm |
| H3 | FE never sends a distinct diner (walk-in orders: `customer` empty → `cust_name=''`) | **CONFIRMED (code)** | most credit orders are walk-ins with no linked customer |
| H4 | Diner == holder by default (tabName seeded from customer.name) so sheet hides it | **CONFIRMED (code)** | `CollectPaymentPanel.jsx:557` + `CreditRow` L140 |

## 4. What "implement on the Collect-Payment credit flow" actually requires (scope — for PLANNING, not built here)
1. **Separate the two identities in the CPP credit UI:** keep "Credit Customer" = holder, and add an explicit **Diner (who ate)** field (name + optional phone), defaulting to the order customer but independently editable — so "Abhishek ate → Saurav's credit" (OD-527-A) can be entered.
2. **Stop seeding the holder field from the diner** (or seed the new diner field instead) so holder/diner don't collapse to equal by default.
3. **Thread the diner through the payload** as a dedicated field (e.g. `diner_name`/`diner_mobile`) on BOTH builders (`collectBillExisting` AND `placeOrderWithPayment`), rather than overloading `cust_name`. Requires a backend contract confirmation that the credit-insert/settle accepts & persists `diner_name`/`diner_mobile` (extends BB-09 from read to write).
4. Then the already-shipped detail-sheet Diner column + filter will light up.

## 5. Classification & routing
- **Classification:** FE_CAPTURE_GAP + BACKEND_CONTRACT (write path). NOT covered by shipped CR-527 (display-only).
- **Risk:** HIGH (customer data + credit attribution, financial area). **P0/P-high, Planning-skip NOT eligible.**
- **Next:** PLANNING Gate 2 — define the diner-vs-holder capture UX in CollectPaymentPanel + the `diner_name`/`diner_mobile` write contract (backend brief / BB-09 Phase 2). This is a **scope expansion of CR-527** (or a new CR); owner should confirm whether to widen CR-527 or open CR-527b.

## 6. Verification gap (honesty note)
- FE paths are code-confirmed. Whether the backend **persists** a distinct `diner_name` when `cust_name` ≠ `name` was NOT provable read-only (would require creating a real credit order with a distinct customer). Recommend a live write test before locking the plan.

## 7. Evidence
- Code: `CollectPaymentPanel.jsx:557` (tab seed), `:1295` (tabContact), `:3335-3424` (single Credit Customer Details section); `orderTransform.js:1412-1418` (prepaid conflation), `:1786-1793` (existing-order two-block identities); `CreditCustomerDetailSheet.jsx:140` (diner hidden when == holder).
- Live: `/app/memory/evidence/CR-527/` (0/428 non-null diner_name).
