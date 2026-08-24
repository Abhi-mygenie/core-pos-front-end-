# Backend Gaps Report — `/order-logs-report` API
**Date:** 2026-05-28
**API:** `POST /api/v2/vendoremployee/report/order-logs-report`
**Environment:** preprod.mygenie.online
**Reported by:** POS Frontend Team

---

## GAP 1: `operations[]` missing on PREPAID orders

**Priority:** P0 — Blocks lifecycle audit trail for all prepaid restaurants
**Status:** Backend team informed, will add. Same structure as postpaid block.

| Restaurant | restaurant_id | Date | Total Orders | Missing operations[] | Reason |
|---|---|---|---|---|---|
| vishal@pav.com | 383 | 2026-05-11 | 141 | **141 (100%)** | ALL orders are `payment_type=prepaid` |
| owner@palmhouse.com | 541 | 2026-05-12 | 42 | 5 | Only the prepaid orders |

**Sample order IDs (vishal@pav.com, rid=383, 2026-05-11):**
```
restaurant_order_id=063155 | db_id=861286 | payment_method=upi   | payment_type=prepaid | operations=[]
restaurant_order_id=063154 | db_id=861267 | payment_method=cash  | payment_type=prepaid | operations=[]
restaurant_order_id=063153 | db_id=861198 | payment_method=upi   | payment_type=prepaid | operations=[]
restaurant_order_id=063152 | db_id=861169 | payment_method=upi   | payment_type=prepaid | operations=[]
restaurant_order_id=063151 | db_id=861163 | payment_method=upi   | payment_type=prepaid | operations=[]
```

**Sample order IDs (owner@palmhouse.com, rid=541, 2026-05-12):**
```
restaurant_order_id=014687 | db_id=864187 | payment_method=upi  | payment_type=prepaid | operations=[]
restaurant_order_id=014686 | db_id=864126 | payment_method=upi  | payment_type=prepaid | operations=[]
restaurant_order_id=014674 | db_id=862596 | payment_method=card | payment_type=prepaid | operations=[]
restaurant_order_id=014666 | db_id=862488 | payment_method=card | payment_type=prepaid | operations=[]
restaurant_order_id=014659 | db_id=862281 | payment_method=card | payment_type=prepaid | operations=[]
```

---

## GAP 2: `operations[]` missing on MERGED orders

**Priority:** P1
**Affected:** ALL merged orders across ALL restaurants have zero operations

| Restaurant | restaurant_id | Date | Merged Orders | Missing operations[] |
|---|---|---|---|---|
| owner@palmhouse.com | 541 | 2026-05-12 | 3 | **3 (100%)** |
| owner@cafe103.com | 644 | 2026-05-10 | 3 | **3 (100%)** |

**Sample order IDs (owner@palmhouse.com, rid=541, 2026-05-12):**
```
restaurant_order_id=014684 | db_id=863427 | payment_method=Merge | f_order_status=3 | operations=[]
restaurant_order_id=014683 | db_id=863256 | payment_method=Merge | f_order_status=3 | operations=[]
restaurant_order_id=014658 | db_id=862245 | payment_method=Merge | f_order_status=3 | operations=[]
```

**Sample order IDs (owner@cafe103.com, rid=644, 2026-05-10):**
```
restaurant_order_id=010979 | db_id=857497 | payment_method=Merge | f_order_status=3 | operations=[]
restaurant_order_id=010954 | db_id=856839 | payment_method=Merge | f_order_status=3 | operations=[]
restaurant_order_id=010927 | db_id=856162 | payment_method=Merge | f_order_status=3 | operations=[]
```

**Ask:** Log `order_merged` operation with vendor_employee_name, target/parent order ID, timestamp.

---

## GAP 3: `operations[]` missing on CANCELLED orders

**Priority:** P1
**Affected:** ALL cancelled orders across ALL restaurants have zero operations

| Restaurant | restaurant_id | Date | Cancelled Orders | Missing operations[] |
|---|---|---|---|---|
| owner@palmhouse.com | 541 | 2026-05-12 | 2 | **2 (100%)** |
| vishal@pav.com | 383 | 2026-05-11 | 5 | **5 (100%)** |

**Sample order IDs (owner@palmhouse.com, rid=541, 2026-05-12):**
```
restaurant_order_id=014679 | db_id=862763 | payment_method=cash_on_delivery | f_order_status=3 | operations=[]
restaurant_order_id=014652 | db_id=862095 | payment_method=cash_on_delivery | f_order_status=3 | operations=[]
```

**Sample order IDs (vishal@pav.com, rid=383, 2026-05-11):**
```
restaurant_order_id=063044 | db_id=859638 | payment_method=Cancel  | f_order_status=3 | operations=[]
restaurant_order_id=063118 | db_id=860646 | payment_method=cash_on_delivery | f_order_status=3 | operations=[]
restaurant_order_id=063099 | db_id=860391 | payment_method=cash_on_delivery | f_order_status=3 | operations=[]
restaurant_order_id=063090 | db_id=860249 | payment_method=cash_on_delivery | f_order_status=3 | operations=[]
restaurant_order_id=063063 | db_id=859848 | payment_method=cash_on_delivery | f_order_status=3 | operations=[]
```

**Ask:** Log `order_cancelled` operation with vendor_employee_name, cancellation_reason, cancel_type.

---

## GAP 4: `payment_status` is NULL on EVERY order across ALL restaurants

**Priority:** P1
**Affected:** 100% of orders, ALL restaurants, ALL dates

| Restaurant | restaurant_id | Date | Orders | payment_status=None |
|---|---|---|---|---|
| owner@cafe103.com | 644 | 2026-05-13 | 41 | **41 (100%)** |
| owner@palmhouse.com | 541 | 2026-05-12 | 42 | **42 (100%)** |
| vishal@pav.com | 383 | 2026-05-11 | 141 | **141 (100%)** |

**Sample order IDs (any restaurant — all are NULL):**
```
cafe103:   011133 (db_id=867138), 011132 (db_id=867044), 011131 (db_id=867001)
palmhouse: 014688 (db_id=864235), 014687 (db_id=864187), 014686 (db_id=864126)
pav.com:   063155 (db_id=861286), 063154 (db_id=861267), 063153 (db_id=861198)
```

**Impact:** Frontend has to derive paid/unpaid status from `f_order_status` and `payment_method` heuristics instead of reading the field directly.

**Ask:** Populate `orders_table.payment_status` with `'paid'` / `'unpaid'` on every order.

---

## GAP 5: Order-level cancel fields ALL NULL — even on cancelled orders

**Priority:** P1
**Fields affected:** `cancel_at`, `canceled`, `canceled_by`, `cancellation_reason`, `cancellation_note`
**Affected:** ALL cancelled orders — these 5 fields are NEVER populated at order level

**Evidence — item-level HAS data but order-level does NOT:**

```
vishal@pav.com (rid=383) | order 063044 (db_id=859638) | 2026-05-11
  order-level: cancel_at=None | canceled_by=None | cancellation_reason=None
  item-level:  cancel_at=2026-05-11 13:07:05 | cancel_by_name=Sunita | cancel_type=Pre-Serve | reason=Change Requested by Customer
```

**Evidence — BOTH order-level and item-level NULL (no cancel info at any level):**

```
vishal@pav.com (rid=383):
  063118 (db_id=860646) — order: ALL NULL, item: ALL NULL
  063099 (db_id=860391) — order: ALL NULL, item: ALL NULL
  063090 (db_id=860249) — order: ALL NULL, item: ALL NULL
  063063 (db_id=859848) — order: ALL NULL, item: ALL NULL

owner@palmhouse.com (rid=541):
  014679 (db_id=862763) — order: ALL NULL, item: ALL NULL
  014652 (db_id=862095) — order: ALL NULL, item: ALL NULL
```

**Ask:** When all items are cancelled (full order cancel), populate order-level: `cancel_at`, `canceled_by` (name, not just ID), `cancellation_reason`.

---

## GAP 6: Order-level `serve_at` inconsistently populated

**Priority:** P2
**Note:** Item-level `serve_at` works as fallback, but order-level is unreliable

| Restaurant | restaurant_id | Date | Paid Orders | order-level `serve_at` populated | order-level `ready_at` populated |
|---|---|---|---|---|---|
| owner@cafe103.com | 644 | 2026-05-13 | 41 | **1/41 (2%)** | 0/41 (0%) |
| owner@palmhouse.com | 541 | 2026-05-12 | 37 | **25/37 (68%)** | 0/37 (0%) |
| vishal@pav.com | 383 | 2026-05-11 | 135 | **0/135 (0%)** | 73/135 (54%) |

**Pattern:** `ready_at` populated only on restaurants using the Ready button (pav.com). `serve_at` populated inconsistently — most restaurants have 0%.

**Ask:** Populate `orders_table.serve_at` when last item is served. Populate `orders_table.ready_at` when first/last item is ready.

---

## Summary Table

| # | Gap | Priority | Scope | Sample IDs |
|---|---|---|---|---|
| 1 | `operations[]` on prepaid | P0 | pav(383): ALL 141 orders; palm(541): 5 orders | 063155,063154,063153 / 014687,014686,014674 |
| 2 | `operations[]` on merged | P1 | palm(541): 014684,014683,014658; cafe(644): 010979,010954,010927 | 6 orders total |
| 3 | `operations[]` on cancelled | P1 | palm(541): 014679,014652; pav(383): 063044,063118,063099,063090,063063 | 7 orders total |
| 4 | `payment_status` always NULL | P1 | ALL orders ALL restaurants | cafe:011133; palm:014688; pav:063155 |
| 5 | Order-level cancel fields NULL | P1 | ALL cancelled orders | pav:063044(has item data); pav:063118,palm:014679(no data at any level) |
| 6 | Order-level `serve_at` inconsistent | P2 | cafe:1/41; palm:25/37; pav:0/135 | — |

---

*End of Backend Gaps Report*
