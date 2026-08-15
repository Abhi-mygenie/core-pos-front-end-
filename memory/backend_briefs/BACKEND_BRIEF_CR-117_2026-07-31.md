# BACKEND_BRIEF_CR-117_2026-07-31

## Summary
- **Issue:** Combined daily order report endpoint (`daily-order-report-details-combined`) is missing critical order status fields that exist in `order-logs-report.orders_table`. Without these fields, the frontend cannot classify orders into tabs (Settled/Cancelled/Credit/Hold/Merged/Running) or apply key filters (Payment Gateway, Channel source).
- **Classification:** CONTRACT_MISMATCH
- **Frontend impact:** CR-117 "Order Report Beta" page blocked — cannot implement tab/filter parity with current Order Report.
- **Priority/Risk:** P1 / MEDIUM

---

## Endpoint

- **Method:** POST
- **URL:** `/api/v1/vendoremployee/daily-order-report-details-combined`
- **Auth:** Bearer token
- **Probed:** 2026-07-31 with owner@18march.com (rid=478) on preprod

---

## Live Evidence — Side-by-Side Comparison

### `order-logs-report` (v2) — orders_table has these status fields ✅

```
f_order_status:  2 (queue), 3 (cancelled), 5 (ready), 6 (paid), 8 (hold), 9 (paylater)
order_status:    'delivered', 'queue', 'cancelled', 'running'
payment_status:  'paid', 'unpaid', 'Merge'
payment_method:  'cash', 'card', 'upi', 'Cancel', 'Merge', 'TAB', 'paylater', 'transferToRoom', 'pending'
order_in:        'DI', 'TA', 'DL', 'RM', 'SRM', null
order_from:      'pos', 'web', null
razorpay_order_id: null or Razorpay ID string
table_id:        0 or table ID
parent_order_id: null or parent order ID
```

### `daily-order-report-details-combined` (v1) — MISSING all of the above ❌

```
f_order_status:    NOT PRESENT
order_status:      NOT PRESENT
payment_status:    NOT PRESENT
payment_method:    NOT PRESENT
order_in:          NOT PRESENT
order_from:        NOT PRESENT
razorpay_order_id: NOT PRESENT
table_id:          NOT PRESENT
parent_order_id:   NOT PRESENT
```

**What the combined endpoint HAS instead (different field names, different semantics):**

```
payment_type:       'Cash', 'Unpaid', 'Cancel', 'Partial'  ← display label, NOT raw status
payment_method_raw: 'cancel', 'payment_gateway', 'aggregator', 'tab', 'partial', 'pending', 'cash', 'cash_on_delivery'
payment_for:        'payment_gateway', 'postpaid', 'prepaid', 'aggregator'
source:             'orders', 'aggregator_orders'
order_plateform:    null (POS) or aggregator name (Swiggy/Zomato)
order_type:         'pos', 'dinein', 'delivery'
```

---

## Missing Fields — What Each Enables

### P0 — Required for Tab Classification (MUST HAVE)

Add these 4 fields to each order row in `daily_reports[].report[]`:

| # | Field | Type | Source | Enables |
|---|-------|------|--------|---------|
| 1 | `f_order_status` | integer | `orders_table.f_order_status` | **Primary tab router.** 6=Settled, 3=Cancelled, 8=Hold, 9=Hold(paylater). Without this, cannot classify orders into tabs. |
| 2 | `order_status` | string | `orders_table.order_status` | **Running tab.** 'queue'/'running' = active orders. 'delivered' = settled. |
| 3 | `payment_status` | string | `orders_table.payment_status` | **Merge detection.** 'Merge' = Merged tab. 'unpaid' = Running tab. 'paid' = Settled tab. |
| 4 | `payment_method` | string | `orders_table.payment_method` | **Tab routing.** 'Cancel'→Cancelled, 'Merge'→Merged, 'TAB'→Credit, 'paylater'→Hold, 'transferToRoom'→Running, 'cash'/'card'/'upi'→Settled. |

### P1 — Required for Filter Parity (SHOULD HAVE)

| # | Field | Type | Source | Enables |
|---|-------|------|--------|---------|
| 5 | `razorpay_order_id` | string/null | `orders_table.razorpay_order_id` | **PG/Non-PG filter.** null=Non-PG, present=PG. Current Order Report has this filter. |
| 6 | `order_in` | string/null | `orders_table.order_in` | **Channel classification.** DI/TA/DL/RM/SRM. Enables Room order identification. |
| 7 | `order_from` | string/null | `orders_table.order_from` | **Platform filter.** 'pos'/'web'. |

### P2 — Nice to Have

| # | Field | Type | Source | Enables |
|---|-------|------|--------|---------|
| 8 | `table_id` | integer | `orders_table.table_id` | Table identification for dine-in |
| 9 | `parent_order_id` | integer/null | `orders_table.parent_order_id` | Merged/room order linking |

---

## Tab Impact Without These Fields

| Tab | Can Implement? | Required Field |
|-----|---------------|----------------|
| All Orders | ✅ YES | No filter needed |
| Settled | ❌ NO | Needs `f_order_status=6` + `payment_method` exclusions |
| Cancelled | ❌ NO | Needs `payment_method='Cancel'` or `f_order_status=3` |
| Credit | ❌ NO | Needs `payment_method='TAB'` |
| Hold | ❌ NO | Needs `payment_method='paylater'` or `f_order_status=8,9` |
| Merged | ❌ NO | Needs `payment_status='Merge'` or `payment_method='Merge'` |
| Running | ❌ NO | Needs `order_status='running'` + `payment_status='unpaid'` |
| Aggregator | ✅ YES | Uses existing `order_plateform` / `source` |

**Result: 2 of 8 tabs work. 6 blocked at backend.**

---

## Filter Impact Without These Fields

| Filter | Can Implement? | Required Field |
|--------|---------------|----------------|
| Date Range | ✅ YES | Already available |
| Pay Type (Prepaid/Postpaid) | ✅ YES | Uses existing `payment_for` |
| Payment Method (Cash/Card/UPI) | ⚠️ PARTIAL | `payment_method_raw` has values but different format than `payment_method` |
| Channel (Dine-in/Takeaway/Delivery) | ✅ YES | Uses existing `order_type` |
| Aggregator Platform | ✅ YES | Uses existing `order_plateform` |
| Punched By | ✅ YES | Uses existing `waiter` |
| Collected By | ✅ YES | Uses existing `collected_by` |
| Payment Gateway (PG/Non-PG) | ❌ NO | Needs `razorpay_order_id` |

**Result: 6 of 8 filters work. 1 partial (payment method format mismatch). 1 blocked (PG filter).**

---

## Also Needed in Excel Export

The same fields should be added to `POST /api/v1/vendoremployee/daily-order-report-excel-export-combined` so exported data matches UI tabs/filters.

---

## Reproduction

```bash
# Login
TOKEN=$(curl -s -X POST "https://preprod.mygenie.online/api/v1/auth/vendoremployee/login" \
  -H "Content-Type: application/json" -H "X-localization: en" \
  -d '{"email":"owner@18march.com","password":"***"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Probe combined endpoint — notice missing status fields
curl -s -X POST "https://preprod.mygenie.online/api/v1/vendoremployee/daily-order-report-details-combined" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "X-localization: en" \
  -d '{"from":"2026-07-20","to":"2026-07-30"}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
row=d['daily_reports'][0]['report'][0]
for f in ['f_order_status','order_status','payment_status','payment_method','razorpay_order_id','order_in','order_from']:
    print(f'{f}: {row.get(f, \"NOT PRESENT\")}')"
```

---

## Evidence
- Combined endpoint full response: `/app/memory/evidence/CR-117/combined_full_response_20260731.json`
- Order-logs-report sample: `/app/memory/evidence/CR-117/order_logs_report_sample_20260731.json`

---

## FE Work After Delivery

**P0 fields (4 status fields):** Zero FE workaround needed. FE will use exact same `TAB_FILTERS` logic from `AllOrdersReportPage.jsx` — the classification code already exists, just needs the raw fields from API. ~0 new lines for tab classification.

**P1 fields (3 filter fields):** Same — FE `FilterBar.jsx` already supports PG/Channel/Platform filters. Just needs the raw data. ~0 new lines for filter logic.

**Estimated FE time after all fields delivered:** The new page (`OrderReportBetaPage.jsx`) can ship with full tab + filter parity. ~500 lines for the page, all using existing patterns.
