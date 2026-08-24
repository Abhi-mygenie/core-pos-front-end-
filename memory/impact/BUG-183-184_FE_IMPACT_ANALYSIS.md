# BUG-183 + BUG-184 — Frontend Impact Analysis (Backend Validation Report)

**Date:** 2026-08-19
**Agent Role:** PLANNING (Backend Validation + Gate 2 FE Impact)
**Status:** BUG-183 FE WORK CONFIRMED · BUG-184 STATUS AMBIGUOUS — see below

---

## Backend Validation — Curl Probe Results

**Endpoint:** `POST /api/v2/vendoremployee/report/order-logs-report`
**Account:** owner@18march.com (rid=478)
**Date range:** 01/08/2026 → 19/08/2026
**Evidence file:** `/app/memory/evidence/BUG-183/api_response_new_structure_2026-08-19.json`

### Response Structure Has Changed (MAJOR)

**OLD (flat — what FE currently reads):**
```json
{
  "payment_method": "TAB",
  "user_name": null,
  "cust_mobile": null
}
```

**NEW (nested — what backend now returns):**
```json
{
  "orders_table": {
    "payment_method": "TAB",
    "user_name": "",          ← still empty for TAB orders
    "cust_mobile": null       ← still null
  },
  "user": {
    "f_name": "Gyan",
    "l_name": "",
    "phone": "9795554735"
  },
  "tap_customer": {
    "name": "Gyan",
    "mobile": "9795554735"
  },
  "tab_record": {
    "customer_id": 2770,
    "credit_order_amount": "51.00",
    "payment_status": "sucess"
  }
}
```

### Finding: Backend DID NOT populate flat `user_name`/`cust_mobile` directly

Backend instead added new nested objects (`tap_customer`, `user`) to carry the customer data. The flat `orders_table.user_name` field remains `""` for TAB orders.

**This means:** The existing `orderLogsReportRow` function at `reportTransform.js:841` already destructures `orders_table` as `api`, but reads `api.user_name` (still empty). The fix is to additionally read from `orderWrapper.tap_customer` and `orderWrapper.user`.

---

## BUG-183 — Daily Report: Phone/Name Missing in Credit Tab

### Code Reality

Current transform `orderLogsReportRow` (lines 840-1120):
```js
const api = orderWrapper.orders_table || {};
const customerDetails = orderWrapper.customer_details || {};  // ← this was the old field (not returned)
// ...
customer: api.user_name || 'Guest',               // ← '' || 'Guest' = 'Guest'
customerPhone: api.cust_mobile || api.user_phone || api.phone || '',  // ← null||null||null = ''
customerContact: {
  name: api.user_name || '',
  phone: api.cust_mobile || api.user_phone || api.phone || '',
}
```

**With new API response:**
- `api.user_name = ''` → still shows 'Guest'
- `api.cust_mobile = null` → still shows '—'
- **BUT:** `orderWrapper.tap_customer.name = 'Gyan'` ✅
- **AND:** `orderWrapper.tap_customer.mobile = '9795554735'` ✅
- **AND:** `orderWrapper.user.f_name = 'Gyan'` ✅ (fallback for non-TAB orders)
- **AND:** `orderWrapper.user.phone = '9795554735'` ✅ (fallback)

### Risk Classification
**MEDIUM** — read-only display fix in `reportTransform.js`. No financial logic, no API call change, no state management change.

### Files Affected
| File | Lines | Change |
|---|---|---|
| `src/api/transforms/reportTransform.js` | ~840-845, ~1025-1032 | Add `tap_customer` + `user` reads to `orderLogsReportRow` |

**Files WILL NOT touch:** orderService, reportService, AllOrdersReportPage, OrderTable

### Exact Change

**At line ~841-842 (add tap_customer + user extraction):**

Current:
```js
export const orderLogsReportRow = (orderWrapper, activeSrmIds = null) => {
  const api = orderWrapper.orders_table || {};
  const customerDetails = orderWrapper.customer_details || {};
```

Proposed:
```js
export const orderLogsReportRow = (orderWrapper, activeSrmIds = null) => {
  const api = orderWrapper.orders_table || {};
  const customerDetails = orderWrapper.customer_details || {};
  // BUG-183: backend now returns customer data via tap_customer (TAB/credit orders) + user (all orders)
  const tapCustomer = orderWrapper.tap_customer || {};
  const userDetails = orderWrapper.user || {};
```

**At lines ~1025-1032 (update customer reads):**

Current:
```js
customer: api.user_name || 'Guest',
customerPhone: api.cust_mobile || api.user_phone || api.phone || '',
customerEmail: api.cust_email || api.user_email || '',
customerContact: {
  name: api.user_name || '',
  phone: api.cust_mobile || api.user_phone || api.phone || '',
  email: api.cust_email || api.user_email || '',
},
```

Proposed:
```js
customer: api.user_name || tapCustomer.name || userDetails.f_name || 'Guest',  // BUG-183
customerPhone: api.cust_mobile || tapCustomer.mobile || userDetails.phone || '', // BUG-183
customerEmail: api.cust_email || api.user_email || userDetails.email || '',
customerContact: {
  name: api.user_name || tapCustomer.name || userDetails.f_name || '',  // BUG-183
  phone: api.cust_mobile || tapCustomer.mobile || userDetails.phone || '', // BUG-183
  email: api.cust_email || api.user_email || userDetails.email || '',
},
```

**Total change:** ~6 lines in 1 file.

### Verification Matrix
| # | Test | Expected |
|---|---|---|
| 1 | Credit order in Daily Report (Audit tab) | Customer name "Gyan" shown (not "Guest") |
| 2 | Credit order phone | "9795554735" shown (not "—") |
| 3 | Non-credit (cash) order | Unchanged — cash orders still show correct info |
| 4 | Guest order (no user_id) | Still shows "Guest" (no tap_customer for guest orders) |

### Fast Lane Eligibility
**FAST LANE ELIGIBLE** — 1 file, 6 lines, read-only display, no API/financial/hotspot (reportTransform is not in the hotspot list). Requires owner approval.

---

## BUG-184 — CRE-Credit Payment Type Not Reflected

### Probe Results

**`paid-in-tab-order-list` endpoint** (Credit tab in Daily Report):
```json
{
  "payment_method": "TAB",   ← populated (not null)
  "user_name": "",           ← still empty
  "phone": "9795554735"      ← flat field, available
}
```

**Observation:** `payment_method` IS `"TAB"` (not null/empty) in our probe.

### Assessment

The original bug report stated "null/empty `payment_method` for CRE-Credit settled orders". Our probe shows `payment_method: "TAB"` for the test account's credit order.

**Possible explanations:**
1. **Backend fixed the null case** → now returns `"TAB"` consistently. The existing FE code `paymentMethod: api.payment_method || 'TAB'` already handles `"TAB"` correctly. **FE work may NOT be needed.**
2. **Backend will return a new string like `"CRE-Credit"`** → this is what the original brief expected. In that case, `paymentClassifier.js` would need updating. **But our probe does NOT show this string.**

### Conclusion

**BACKEND VALIDATION STATUS:** `payment_method: "TAB"` is now populated (not null). The existing FE default `|| 'TAB'` handles this case. **No FE code change appears necessary based on current probe data.**

**HOLD CONDITION:** If backend team confirms they will return a NEW string (e.g., `"CRE-Credit"`) rather than `"TAB"`, then:
- Add to `paymentClassifier.js`: `case 'CRE-Credit': return { label: 'Credit', bucket: 'credit' }` (~2 lines)
- Update `reportTransform.js:266`: `paymentMethod: api.payment_method || 'TAB'` (no change needed, already has fallback)

**Action:** Ask backend team: "What string does `payment_method` return for CRE-Credit settled orders on `paid-in-tab-order-list`? Is it `'TAB'` or `'CRE-Credit'` or something else?"

### Risk: LOW — 1 file, 2 lines max, if FE work is needed at all.

---

## Summary

| ID | Backend Shipped? | FE Work Needed? | File | Lines | Gate 3 Ready? |
|---|---|---|---|---|---|
| BUG-183 | YES (data in nested objects) | YES — read from `tap_customer`/`user` | `reportTransform.js` | ~6 | **YES** |
| BUG-184 | PARTIAL (TAB not null, no CRE-Credit string) | MAYBE — depends on final backend string | `paymentClassifier.js` | ~2 | **HOLD** |

---

**Next Steps:**
1. Owner FAST LANE approval → BUG-183 can go directly to implementation (6 lines, 1 file)
2. Confirm with backend team what string BUG-184 will return → then 2-line `paymentClassifier.js` update
