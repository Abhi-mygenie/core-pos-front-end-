# BUG-583 — Live API Probe (2026-11-06)

**Endpoint:** GET /api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager
**Auth:** manager@cafe103.com (Bearer token)
**Orders returned:** 3

## Field Presence Confirmation

| Field | Present | Type | Sample Value |
|-------|:---:|------|-------------|
| `bill_print` | ✅ | string | `"No"` |
| `print_bill_status` | ✅ | string | `"No"` |
| `kot_print` | ✅ | string | `"No"` |
| `print_kot` | ✅ | string | `"Yes"` |
| `received_amount` | ✅ | string | `"141054"`, `"1155"`, `"714"` |
| `reconcile_amount` | ✅ | string | `"No"` |

## Transform Mapping Validation

| Plan field | API field | Transform line | Match? |
|-----------|-----------|---------------|:---:|
| `billPrinted` | `api.bill_print === 'Yes'` | L310 | ✅ Field exists, string comparison correct |
| fallback | `api.print_bill_status === 'Yes'` | L310 | ✅ Field exists, string comparison correct |
| `kotPrinted` | `api.print_kot === 'Yes'` | L309 | ✅ Already correct (existing code) |

## Key Finding

- Both `bill_print` and `print_bill_status` are present in the same response
- All 3 orders have `bill_print: "No"` (running, unbilled) — expected
- The plan's `||` fallback (`bill_print || print_bill_status`) is safe
- No "Yes" values in current data — will only trigger after actual bill print
- Socket handler uses same `fromAPI.order()` transform — field will flow correctly

## Orders Detail (all 3)

| Order ID | bill_print | print_bill_status | f_order_status | order_status |
|----------|-----------|------------------|---------------|-------------|
| 1537757 | "No" | "No" | "5" | "queue" |
| 1537753 | "No" | "No" | "1" | "queue" |
| 1537752 | "No" | "No" | "1" | "queue" |

**Conclusion:** Plan E-2 is VALIDATED. Field names match. Types match. Transform logic correct.
