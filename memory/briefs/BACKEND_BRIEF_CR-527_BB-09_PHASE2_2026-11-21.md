# Backend Brief — CR-527 "Diner vs Credit-Holder" (BB-09 Phase 2)

**To:** Backend (Gyan)
**From:** Frontend / POS
**Date:** 2026-11-21
**Env probed:** preprod (`https://preprod.mygenie.online`), restaurant 69
**Related:** `contracts/BATCH-B_CR-527_API_CONTRACT_2026_11_15.md` (BB-09 v1, read-only — LOCKED), `impact/CR-527_IMPACT_ANALYSIS.md`
**Status of BB-09 v1:** `diner_name`/`diner_mobile` keys are live on `tap-customer-record-list` but **return null on 100% of rows** (see §3). This brief covers the **write + propagation** work needed to actually populate and surface them.

> **Field names are LOCKED.** Use exactly `diner_name` and `diner_mobile` (string or null) everywhere. Renamed/changed fields will be rejected on FE integration.

---

## 1. Business requirement
Credit can be given to a person (the **credit holder**) who is **not** the person who ate (the **diner**). Example (OD-527-A): *Abhishek eats, bill is put on Saurav's credit.* The owner must be able to see **who actually ate** on:
1. the **Credit Management** customer detail rows (BB-09 v1 — already has the keys), and
2. the **running order list / POS order cards** (`employee-orders-list`) — **currently has no diner field** (NEW ask, §5).

## 2. Definitions (please keep these two identities separate end-to-end)
| Identity | Meaning | Today's order field |
|---|---|---|
| **Diner** | person who consumed the order | order `cust_name` / `cust_mobile` (the order's own customer) — often null today |
| **Credit holder** | person the credit/receivable is booked against | credit customer (`tap-waiter-list` entry); on the order, `user` / `user_name` |

## 3. Live evidence of the gap (why nothing shows today)
**a) Credit rows — `GET /api/v2/vendoremployee/pos/tap-customer-record-list?customer_id=N`**
- Keys `diner_name`, `diner_mobile` **present but null** on every row.
- cafe103: scanned **0 / 428** rows with a non-null `diner_name` across 12 holders. macha: 0 credit customers.

**b) Cross-reference (cafe103, holder "Mr. Jolly", 5 of his credit orders)** — via `get-single-order-new`:
```
credit row:      diner_name=null  diner_mobile=null
underlying order: cust_name=null  user_name="Mr. Jolly" (= the holder)  cust_mobile=null
```
→ The order's **diner slot (`cust_name`) is itself null**, so even the documented source ("order's customer at credit time") has nothing to copy. Conclusion: the diner is **neither captured on the order nor snapshotted onto the credit row**.

**c) Running order list — `GET /api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager`** (rest 69, 8 orders)
- Customer-related keys on each order row: `user_id`, `user_name`, `user{}`, `cust_name`, `cust_mobile`, `payment_type`, `payment_method`.
- **No `diner_name` / `diner_mobile`.** `cust_name`/`cust_mobile` were null on all sampled rows; only `user_name` was sometimes set (and that is the holder/linked user).

## 4. Required change A — persist diner onto the credit row (write path)
When a credit/TAB order is created or settled to credit, **store the diner on the credit transaction row** so BB-09 v1 can return it.

- **Endpoints involved:** the credit-insert / TAB-settle path (e.g. `tap-waiter-order-insert` and the order→credit settle flow).
- **FE will send** (names LOCKED) on the settle/credit payload:
  | Field | Type | Meaning |
  |---|---|---|
  | `diner_name` | string or null | the person who ate (distinct from holder) |
  | `diner_mobile` | string or null | diner's mobile |
  - (Holder continues to come from the existing credit-customer `name`/`mobile`.)
- **Backend must:** accept these two fields and persist them on the credit transaction row that `tap-customer-record-list` reads back.
- **Fallback (if FE cannot send on a given path):** snapshot `diner_name`/`diner_mobile` from the order's `cust_name`/`cust_mobile` at credit time. (Note: FE will also start populating order `cust_name` with the diner — see FE plan — but please still accept the explicit fields as the source of truth when present.)
- **Historical rows:** may remain null (acceptable — FE renders "—"). No backfill required.

## 5. Required change B — expose diner on the running order list (NEW)
Add `diner_name` and `diner_mobile` to **each order row** returned by:
- `GET /api/v1/vendoremployee/pos/employee-orders-list` (all `role_name` values), and
- for consistency, `POST /api/v2/vendoremployee/get-single-order-new` (`orders[]`).

So the POS order card can show who ate even before payment. Source = the order's diner (`cust_name`/`cust_mobile`) once FE captures it; null when unknown. Keep the existing `user`/`user_name` (holder/linked user) unchanged.

## 6. Open question — `diner_mobile` and CRM (OD-B-BB09, still unresolved)
Owner flagged: if the diner's mobile matches a CRM customer, is the diner "a customer"? **Please confirm** whether writing `diner_mobile`:
- (a) is stored as **plain text only** (no CRM side-effect), or
- (b) **creates/links a CRM customer record**.
FE needs this to decide whether entering a diner silently creates CRM contacts. Record the decision in the contract sign-off.

## 7. Acceptance criteria (how FE will verify on preprod)
1. Create a credit order where diner ≠ holder (send `diner_name`/`diner_mobile` + a different holder). 
2. `tap-customer-record-list?customer_id=<holder>` → the new row returns the **correct non-null `diner_name`/`diner_mobile`**, distinct from the holder.
3. `employee-orders-list?role_name=Manager` and `get-single-order-new` → the order row returns the same `diner_name`/`diner_mobile`.
4. Order where diner == holder (or no diner) → `diner_name` null (FE renders "—").
5. Response field names are exactly `diner_name` / `diner_mobile`; types string-or-null.

## 8. Non-goals
- No historical backfill required.
- No change to loss/amount/tax calculations.
- Credit-holder capture is unchanged (existing credit-customer name/mobile).

## 9. Sign-off
| ID | Scope | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|---|
| BB-09.2a | Persist `diner_name`/`diner_mobile` on credit row (write) | | | |
| BB-09.2b | Fallback: snapshot from order `cust_name` at credit time | | | |
| BB-09.3 | Add `diner_name`/`diner_mobile` to `employee-orders-list` + `get-single-order-new` | | | |
| BB-09 (orig) | `diner_mobile` CRM behaviour: plain text vs customer link | | | |
