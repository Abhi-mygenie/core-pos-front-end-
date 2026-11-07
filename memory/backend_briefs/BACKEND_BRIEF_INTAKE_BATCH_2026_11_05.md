# BACKEND_BRIEF_INTAKE_BATCH_2026_11_05
## Received Amount · Edit-lock after bill print · Daily-Report-only permission · Duplicate bill mark · print_bill_status re-validation

**Filed:** 2026-11-05 · **Filed by:** INTAKE agent (ALPHA v0.7) · **Owner-approved scope:** 2026-11-05
**Related items:** CR-483 (CR-484 subsumed) · CR-489 · BUG-583 · CR-490 · CR-488
**FE status:** all items GATE_1_INTAKE_FROZEN. FE work starts after backend confirms each section below.

---

## Summary

| § | Item | Ask | Type |
|---|---|---|---|
| A | BUG-583 / CR-489 | **Re-validate** `print_bill_status` (owner believes it is already shipped) and send sample responses | VERIFY |
| B | CR-483 | New `received_amount` on payment + server-side `reconciliation_amount` + restaurant tolerance % + 2 Order Report columns | NEW FIELDS |
| C | CR-489 | Restaurant setting "lock order after bill print" + new permission key + server-side enforcement | NEW SETTING + PERMISSION |
| D | CR-490 | New permission key `daily_report` (Daily Report only) | NEW PERMISSION |
| E | CR-488 | Duplicate-bill flag on bill reprint (Printer Agent prints "DUPLICATE") | CONFIRM / NEW FLAG |

---

## A. `print_bill_status` — RE-VALIDATE (BUG-583, CR-489)

Owner believes this is already done. Please confirm and send evidence.

FE already reads it: `orderTransform.js:310` → `billPrinted: api.print_bill_status === 'Yes'`.

**Please confirm, with one real sample response (JSON) for each:**
1. `GET /api/v1/vendoremployee/pos/employee-orders-list` (running orders) — every order object has `print_bill_status: "Yes" | "No"`.
2. Socket order payloads (new order / update order / order status events) — same field present.
3. `get-single-order-new` — same field present.
4. The flag becomes `"Yes"` on **both** manual bill print and **auto bill print** (`billing_auto_bill_print = Yes`).
5. A reprint keeps it `"Yes"`. Editing the order after print — does it reset to `"No"`? (Owner expectation: stays `"Yes"`.)
6. **New (needed for CR-489):** please also return `bill_printed_at` (datetime of the **first** bill print) — see §C rule "no retro lock".

---

## B. Received Amount (CR-483; CR-484 merged)

### Owner rules (locked)
- **Billing logic is NOT changed.** `order_amount`, discount, tax, `round_up` stay exactly as today.
- Cashier may enter **Received Amount** = what was actually received (e.g. bill ₹763.77, received ₹763; or card charged ₹780 including bank charge).
- **One** Received Amount per payment (also for split — one total, not per split line).
- If not sent / empty → `received_amount = order_amount`.
- Allowed range: `order_amount × (1 ± tolerance%)`. Tolerance is a **restaurant setting, default 3%**, applies to **all payment methods** (Cash, UPI, Card, Split/partial, Credit, Pay Later, Room).
- No reason and no special permission required.
- **Backend computes** `reconciliation_amount = received_amount − order_amount` (can be negative or positive). Not a discount, not revenue, no GST.

### Requested changes
1. **Accept `received_amount`** (decimal, 2 dp, optional) on every payment-collecting call:
   - `POST /api/v2/vendoremployee/order/order-bill-payment` (collect bill)
   - `POST /api/v2/vendoremployee/order/place-order` when `payment_status=paid` (prepaid)
   - `POST /api/v2/vendoremployee/order/paid-prepaid-order`
   - Credit / room / pay-later settlement calls (`tap-waiter-order-insert`, `pos/room-payment`) — please confirm which apply.
2. **Validate** against tolerance; out of range → `422 { message: "Received amount outside allowed ±X% of bill" }`.
3. **Store** `received_amount` and `reconciliation_amount` on the order.
4. **Return** both fields in: `get-single-order-new`, `employee-orders-list`, socket order payloads.
5. **Order Report** (`POST /api/v2/vendoremployee/report/order-logs-report` + its Excel export): add 2 columns per order — **Received Amount**, **Reconciliation Amount** (+ totals row).
6. **Restaurant setting:** `received_amount_tolerance_percent` (number, default `3`)
   - returned in `GET /api/v1/vendoremployee/profile` (restaurant settings block)
   - editable via the restaurant-settings update API (please name the endpoint/key).

### Questions for backend
- **B-Q1** Should Day Closure / Settlement report cash totals use `received_amount` or `order_amount`? (FE assumption: settlement collections = `received_amount`; sales = `order_amount`.)
- **B-Q2** Field name OK (`received_amount`, `reconciliation_amount`), or do you prefer others? Please send final names.
- **B-Q3** Is there an existing field already used for "amount received" (e.g. `grant_amount` in `partial_payments`)? FE currently sends `grant_amount = payment_amount`. Should `received_amount` replace that, or be separate? (FE prefers separate, top-level.)

---

## C. Lock order editing after bill print (CR-489)

### Owner rules (locked)
- **Restaurant setting** ON/OFF — toggled by anyone with Settings access.
- When **ON** and the order's bill has been printed (manual **or** auto print), an employee **without** the new permission:
  - **Allowed:** Collect Payment (without discount / coupon), **Reprint bill**.
  - **Not allowed:** add / remove / cancel item, qty / price / notes change, discount or coupon (also inside Collect Payment), table shift / merge, food transfer, customer change, **KOT reprint**, **cancel whole order**.
- Employee **with** the permission: everything as today.
- No PIN / override.
- **No retro lock:** orders whose bill was printed **before** the setting was turned ON are not locked.
- Applies only to that order.

### Requested changes
1. **Restaurant setting** `lock_order_after_bill_print` (`Yes`/`No`, default `No`) + `lock_order_after_bill_print_enabled_at` (datetime) — in profile + settings update API.
2. **New permission key** in role master list (`GET /api/v1/vendoremployee/employee/role-master-list`), suggested name `edit_after_bill_print`; returned in the logged-in user's permissions in profile; editable in role add/update.
3. **Server-side enforcement** (FE will hide actions, but the backend must also reject): if setting = Yes AND `print_bill_status = Yes` AND `bill_printed_at ≥ enabled_at` AND employee lacks `edit_after_bill_print` → `403 { message: "Bill printed — you don't have rights to edit this order" }` on update-place-order, item cancel, order cancel, table transfer/merge, food transfer, discount/coupon apply, customer change, KOT reprint. Allow `order-bill-payment` (without discount/coupon) and bill reprint.
4. `bill_printed_at` (see §A-6).

### Questions for backend
- **C-Q1** Final permission key name and setting key name.
- **C-Q2** Which endpoint handles KOT reprint vs bill reprint, so the rule can be applied to one and not the other? (FE uses `POST /api/v1/vendoremployee/order-temp-store` for printing.)

---

## D. Daily-Report-only permission (CR-490)

### Owner rules (locked)
- New permission gives access to the **Daily Report** screen only — all its tabs + Excel/PDF export.
- No other Reports / Insights pages. Day Closure already has its own right (unchanged).
- Today both Reports and Insights are gated by the single `report` permission (FE `Sidebar.jsx` L41-52).

### Requested changes
1. **New permission key** `daily_report` in role master list; returned in profile permissions; editable in role add/update.
2. **Server-side:** Daily Report endpoints must accept `daily_report` **or** `report`; all other report/insights endpoints require `report`. Daily Report endpoints used by FE today:
   - `/api/v2/vendoremployee/daily-sales-revenue-report`
   - `/api/v1/vendoremployee/daily-order-report-details-combined`
   - `/api/v1/vendoremployee/daily-order-report-excel-export-combined`
   - (please add any other endpoint the Daily Report tabs call)

### Questions for backend
- **D-Q1** Final key name.
- **D-Q2** Confirm the endpoint list above is complete for Daily Report.

---

## E. "DUPLICATE" on reprinted bill (CR-488)

- Owner rule: the **second and later** prints of a customer bill (2-inch / 3-inch thermal via Printer Agent) must show **"DUPLICATE"**.
- **E-Q1** Does the bill print payload (`order-temp-store` → Printer Agent) already support a flag such as `is_duplicate` / `print_type: "duplicate"`? If not, please add one, or confirm the backend can set it automatically from print count. (May need the Old POS Printer Agent team.)
- **E-Q2** Return `bill_print_count` on the order, if available.

---

## Please reply with
```
A: confirmed / not shipped — sample JSON for 1-3 · auto-print yes/no · bill_printed_at ETA
B: field names · endpoints accepting received_amount · tolerance setting key + update API · Order Report columns ETA · B-Q1..Q3
C: setting key · permission key · enforcement ETA · C-Q2
D: permission key · endpoint list · ETA
E: duplicate flag available? name · ETA
```
