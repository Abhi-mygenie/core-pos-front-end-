# BUG-183 + BUG-184 — Backend Validation Report (2026-08-20)

**Date:** 2026-08-20
**Agent Role:** PLANNING (backend validation via live orders)
**Method:** Created fresh TAB/credit orders on owner@18march.com preprod account, then probed both affected endpoints

---

## Test Orders Created

| Order # | Internal ID | Payment Method | Customer | Created |
|---|---|---|---|---|
| #002468 | 1071463 | TAB | Guest (no customer linked) | 2026-08-20 |
| #002469 | 1071464 | TAB | Guest (no customer linked) | 2026-08-20 |
| #002470 | 1071465 | pending | — | 2026-08-20 (in-progress) |

Orders placed via UI (owner@18march.com / Qplazm@10, Table 5, CHEESY FRIES ₹134) and settled as TAB.

---

## BUG-184 — `payment_method: 'CRE-Credit'` NOT returned

**Endpoint probed:** `GET /api/v2/vendoremployee/paid-in-tab-order-list?from_date=20/08/2026&to_date=20/08/2026`

**Response:**
```json
[
  {
    "restaurant_order_id": "002468",
    "payment_method": "TAB",
    ...
  },
  {
    "restaurant_order_id": "002469",
    "payment_method": "TAB",
    ...
  }
]
```

**Expected:** `payment_method: "CRE-Credit"` (per backend brief)
**Actual:** `payment_method: "TAB"`

**Verdict: BACKEND HAS NOT FIXED BUG-184.** The endpoint still returns `"TAB"`, not `"CRE-Credit"`. No FE change can be made until backend ships a non-`TAB` string.

---

## BUG-183 — `user_name` / `cust_mobile` still empty

**Endpoint probed:** `POST /api/v2/vendoremployee/report/order-logs-report`

**Fresh TAB orders (no customer linked — guest walk-in):**
```json
{
  "orders_table": {
    "payment_method": "TAB",
    "user_name": "",         ← EMPTY (NOT fixed)
    "cust_mobile": null      ← NULL (NOT fixed)
  },
  "tap_customer": null,      ← No customer linked for guest TAB orders
  "user": null               ← No registered user
}
```

**Old TAB order #002289 (WITH customer 'Gyan' linked):**
```json
{
  "orders_table": {
    "user_name": "",          ← STILL EMPTY (flat field not fixed)
  },
  "tap_customer": {
    "name": "Gyan",           ← Available via nested object
    "mobile": "9795554735"    ← Available via nested object
  }
}
```

**Verdict: BACKEND HAS NOT FIXED BUG-183 as specified in the brief.**
- The brief asked: "Populate `user_name` and `cust_mobile` on TAB/credit order rows"
- Actual: `user_name` and `cust_mobile` are still `""` / `null` in `orders_table`
- The `tap_customer` nested object IS present for orders with a linked customer — this is a partial/different backend change, not the flat-field fix requested
- For guest TAB orders (no customer registered), NEITHER the flat fields NOR `tap_customer` are populated

---

## Status Update

| ID | Status Before | Status After | Reason |
|---|---|---|---|
| BUG-183 | GATE_2_COMPLETE | **BACKEND_BLOCKED** | flat user_name/cust_mobile not populated; tap_customer partial only |
| BUG-184 | GATE_2_COMPLETE | **BACKEND_BLOCKED** | payment_method still 'TAB', not 'CRE-Credit' |

---

## What Backend Needs to Do

### BUG-183
Option A (original brief): Populate `orders_table.user_name` and `orders_table.cust_mobile` directly from the customer record linked to the TAB order.
Option B (new pattern they've started): Populate `tap_customer.name` and `tap_customer.mobile` on ALL TAB orders (currently only populated when a customer was pre-selected — missing for guest walk-in TAB orders).

**Recommend asking backend to confirm which approach they'll take** — Option B would be easier for FE to adapt to (already have `tap_customer` reading in the impact analysis).

### BUG-184
Return a non-null, non-`'TAB'` payment method string for CRE-Credit settled orders. Confirm the exact string (e.g., `"CRE-Credit"`, `"Credit"`, `"tab_credit"`) so FE can update `paymentClassifier.js`.

---

## Evidence File
`/app/memory/evidence/BUG-183/api_response_new_structure_2026-08-19.json` — original probe with customer 'Gyan'
Fresh probe results documented inline above (2026-08-20 orders #002468, #002469)
