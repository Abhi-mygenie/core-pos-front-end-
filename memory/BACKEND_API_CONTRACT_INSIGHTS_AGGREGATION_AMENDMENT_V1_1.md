# Backend API Contract — Insights Aggregation — AMENDMENT v1.1

**From:** POS Frontend Team
**To:** Backend Team
**Date:** 2026-06-15
**Ref:** Original contract `BACKEND_API_CONTRACT_INSIGHTS_AGGREGATION.md` (v1.0, 2026-06-12)
**Status:** AMENDMENT — 7 gaps found during 2-restaurant validation (cafe103 + Palm House, May 2026)

---

## CONTEXT

Backend delivered all 4 endpoints per v1.0 contract. All schema shapes are correct. All fields are present. This amendment fixes **gaps in the contract itself** — places where v1.0 was ambiguous or incomplete.

**Principle:** FE will NOT do any aggregation, handling, or reconciliation. Every number shown on screen comes directly from the API. If two screens show the same metric, the API must return the same number. If they show different metrics, the field names must be different.

---

## AMENDMENT A-1: TAB Settlement Attribution in Dashboard

### Problem

v1.0 §3.1 says:
- Revenue = `SUM(order_amount) + tab settlements`
- Channel Mix = "Per §2.3" (classifies by `order_in`/`order_type`)
- Hourly = "Hour extracted from `collect_bill` timestamp"

TAB settlements come from `daily-sales-revenue-report`, not from orders. They have no `order_in` (no channel) and no `collect_bill` (no hour). Result:

```
Revenue total:              ₹14,09,418
SUM(channel_mix.revenue):   ₹14,08,998
SUM(by_hour.amount):        ₹14,08,998
Gap:                        ₹420 = exactly the TAB settlement amount
```

FE cannot reconcile this. User sees revenue ₹14,09,418 but channel pie chart adds to ₹14,08,998.

### Contract Change Required

**Option A (recommended): Exclude TAB settlements from revenue total**

```
Revenue.total = SUM(order_amount) for non-TAB fs=6 orders ONLY
               (do NOT add tab settlements)

Tab settlements reported separately:
  Revenue.tab_settlement_total = ₹420  (already present, keep as-is)

This guarantees:
  Revenue.total = SUM(channel_mix.revenue) = SUM(by_hour.amount)  ← always true
  
FE shows: "Revenue ₹14,08,998 + Credit Settled ₹420" as two separate numbers.
```

**Option B (alternative): Add TAB settlement as a channel + hourly bucket**

```
channel_mix gets a new entry:
  { "channel": "Credit Settlement", "orders": 1, "revenue": 420 }

by_hour gets entries attributed to the settlement timestamp (if available)
  OR a single entry at hour=0 if no timestamp exists

This guarantees:
  Revenue.total = SUM(channel_mix.revenue) = SUM(by_hour.amount)  ← always true
```

**FE preference: Option A** — simpler, no fake channel, no fake hour.

---

## AMENDMENT A-2: `order_scope_count` Naming in Dashboard Cancellations

### Problem

v1.0 §3.1 Dashboard cancellations tile has field `order_scope_count`.
v1.0 §3.4 Cancellations endpoint has field `order_scope.order_count`.

Same name pattern, different meaning:
- Dashboard returns **157** = qty of items inside cancelled orders (sum of `quantity` field)
- Cancellations EP returns **72** = distinct cancelled orders

```
Dashboard:      order_scope_count = 157  (qty)
Cancellations:  order_scope.order_count = 72   (distinct orders)
```

FE shows Dashboard tile "157 order cancellations" → user clicks → Cancellations screen says "72 order cancellations". Confusing.

### Contract Change Required

Dashboard §3.1 cancellations tile must return **both** counts with distinct field names:

```json
"cancellations": {
  "order_scope_order_count": 72,     ← NEW: distinct cancelled orders
  "order_scope_qty": 157,            ← RENAMED from order_scope_count
  "order_scope_loss": 25199.00,
  "item_scope_line_count": 83,       ← RENAMED from item_scope_count (for clarity)
  "item_scope_qty": 246,             ← NEW: sum of quantity on item-cancelled lines
  "item_scope_loss": 59092.50,
  "total_qty": 403,
  "total_loss": 84291.50,
  "top_reason": "No reason provided",
  "top_reason_count": 167
}
```

This matches §3.4 Cancellations endpoint structure exactly — no ambiguity.

---

## AMENDMENT A-3: `daily.tax` Scope Must Match `daily.revenue` Scope

### Problem

v1.0 §3.2 says:
- Summary `total_tax`: "for all fs=6 orders **(including TAB — TAB GST stays in tax per H5)**"
- Daily `revenue`: "SUM(order_amount) for **non-TAB** fs=6 orders"
- Daily `tax`: **not defined** — contract never specified TAB inclusion for daily.tax

Backend (reasonably) chose: `daily.tax = non-TAB` (matching `daily.revenue` scope).

Result:
```
SUM(daily.tax):     ₹55,558    (non-TAB)
Summary total_tax:  ₹57,426    (includes TAB per H5)
Gap:                ₹1,868     = tax on TAB orders
```

FE cannot show consistent tax. Daily chart shows one number, summary header shows another.

### Contract Change Required

**Make summary.total_tax match daily scope (non-TAB):**

```
§3.2 Tax rule — REPLACE:
  OLD: "total_gst = SUM(total_gst_tax_amount) for all fs=6 orders 
        (including TAB — TAB GST stays in tax per H5)"
  
  NEW: "total_gst = SUM(total_gst_tax_amount) for non-TAB fs=6 orders
        (matching daily.revenue scope).
        
        tab_tax_total = SUM(total_gst_tax_amount) for TAB fs=6 orders
        (NEW field — reported separately)"
```

**Updated §3.2 summary response:**

```json
"summary": {
  "total_revenue": 1409418.00,
  "total_orders": 1690,
  "total_tax": 55558.38,          ← NOW matches SUM(daily.tax)
  "total_gst": 55558.38,          ← non-TAB only
  "total_vat": 0.00,
  "total_discount": 46591.60,
  "avg_order_value": 833.98,
  "tab_settlement_total": 420.00,
  "tab_tax_total": 1868.00,       ← NEW: TAB tax reported separately
  "best_day": { ... },
  "worst_day": { ... },
  "peak_hour": { ... },
  "active_days": 31
}
```

This guarantees: `SUM(daily.tax) = summary.total_tax` ← always true.

If owner needs "total tax including TAB", FE computes: `total_tax + tab_tax_total`.

---

## AMENDMENT A-4: Discount Scope Alignment Across Endpoints

### Problem

v1.0 has three discount numbers that look similar but measure different things:

| Endpoint | Field | Scope | Source Column | Palm House May |
|----------|-------|-------|---------------|:-----------:|
| Dashboard §3.1 | `discounts.manual_discount` | All fs=6 (includes TAB) | `restaurant_discount_amount` | ₹51,892 |
| Sales §3.2 | `summary.total_discount` | Non-TAB fs=6 | `restaurant_discount_amount + coupon_discount_amount` | ₹46,592 |
| Items §3.3 | `sold.discount` per item | Sold bucket only (fs=6, non-TAB, non-comp) | `discount_on_food` (line-level) | ₹49,852 |

Three different numbers for "discount". User sees ₹51,892 on Dashboard, clicks into Sales, sees ₹46,592. Goes to Items, sums to ₹49,852. None match.

### Contract Change Required

**All endpoints must use the same scope for the same metric name:**

```
RULE: Any field named "discount" or "total_discount" across endpoints 
      must use the SAME filter (non-TAB fs=6) and SAME source column.

Dashboard §3.1 discounts tile — CHANGE:
  manual_discount = SUM(restaurant_discount_amount) for NON-TAB fs=6 orders
  (was: all fs=6 — now matches Sales)

Sales §3.2 — NO CHANGE (already non-TAB)

Items §3.3 — ADD new field:
  Each item.sold gets:
    "discount_order_level": <proportional share of order restaurant_discount_amount>
  This lets FE verify: SUM(items.sold.discount_order_level) ≈ Sales.total_discount
  
  Keep existing "discount" field as discount_on_food (line-level) — rename to:
    "discount_line_level": <discount_on_food value>  (RENAME for clarity)
```

**After amendment:**
```
Dashboard manual_discount = Sales total_discount  ← always true (same scope, same column)
Items discount_line_level = line-level detail      ← different metric, different name
```

---

## AMENDMENT A-5: Cancel Loss Alignment Between Dashboard and Items

### Problem

Dashboard and Items use different formulas for cancellation loss (by contract design):

| Endpoint | Formula | Palm House May |
|----------|---------|:-----------:|
| Dashboard §3.1 / Cancel §3.4 | §2.7 OPS-CANCEL (order-level `previous_order_amount` when available) | ₹84,292 |
| Items §3.3 | §2.6 line-level sum (`item_total - discount + service_charge + tax`) | ₹85,049 |

Δ ₹757 = tax leaked on cancelled lines (backend doesn't zero tax on cancellation — known ESC-3 bug).

If backend fixes ESC-3 (zeroes tax on cancel), the two formulas would converge. But until then, they show different numbers.

### Contract Change Required

**Items endpoint must use the same formula as Dashboard for cancelled bucket:**

```
§3.3 Items — CHANGE cancelled line value formula:
  OLD: "Line value (Cancelled): Per §2.6"
  
  NEW: "Line value (Cancelled): Per §2.6 BUT with tax forced to 0.
        cancelled.tax = 0 always (business rule: cancelled items should not carry tax).
        cancelled.revenue = item_total - discount + service_charge  (no tax term).
        
        If backend has fixed ESC-3 (tax zeroed on cancel), this is a no-op.
        If ESC-3 is not yet fixed, this prevents leaked tax from inflating cancel loss."
```

**After amendment:**
```
Dashboard cancel loss = Items cancel loss  ← always true (both exclude leaked tax)
```

---

## AMENDMENT A-6: `insights-sales` — Add `tab_tax_total` + Align `daily.discount`

### Problem (secondary, discovered during validation)

`daily` array has `tax` and `discount` per day but:
- `daily.discount` scope is not defined (same ambiguity as `daily.tax` in A-3)
- No `tab_tax_total` in response (needed per A-3)

### Contract Change Required

```
§3.2 daily array — each entry:
  {
    "date": "2026-05-01",
    "revenue": 82000.00,        ← non-TAB fs=6 (unchanged)
    "orders": 58,               ← non-TAB fs=6 (unchanged)
    "tax": 6100.00,             ← non-TAB fs=6 (per A-3, now explicit)
    "discount": 2100.00,        ← non-TAB fs=6 (now explicit)
    "tab_settlement": 0.00      ← unchanged
  }

§3.2 summary — add:
  "tab_tax_total": 1868.00      ← NEW per A-3

Guarantees:
  SUM(daily.revenue)  = summary.total_revenue   ← always true
  SUM(daily.orders)   = summary.total_orders    ← always true
  SUM(daily.tax)      = summary.total_tax       ← always true (A-3 fix)
  SUM(daily.discount) = summary.total_discount  ← always true (new)
```

---

## SUMMARY OF ALL AMENDMENTS

| # | Section | What Changes | Backend Effort |
|---|---------|-------------|:--------------:|
| **A-1** | §3.1 Dashboard revenue | Exclude TAB settlement from `revenue.total`. Keep as separate `tab_settlement_total`. | SMALL — remove 1 addition |
| **A-2** | §3.1 Dashboard cancellations | Rename `order_scope_count` → `order_scope_qty`. Add `order_scope_order_count`. Add `item_scope_qty`. | SMALL — 3 field renames/adds |
| **A-3** | §3.2 Sales summary tax | `total_tax` = non-TAB only. Add `tab_tax_total` as new field. | SMALL — split 1 SUM into 2 |
| **A-4** | §3.1 Dashboard discount | `manual_discount` = non-TAB scope. §3.3 Items: rename `discount` → `discount_line_level`, add `discount_order_level`. | MEDIUM — scope change + new field |
| **A-5** | §3.3 Items cancelled tax | Force `cancelled.tax = 0`. | SMALL — 1 override |
| **A-6** | §3.2 Sales daily | Explicit non-TAB scope for `daily.tax` + `daily.discount`. Add `tab_tax_total` to summary. | SMALL — documentation + 1 new field |

**Total backend effort: SMALL-MEDIUM. Mostly field renames, scope clarifications, and 2-3 new fields.**

### The Golden Rule After v1.1

```
SAME metric name across endpoints = SAME number
DIFFERENT metric = DIFFERENT field name

FE does ZERO aggregation. FE does ZERO reconciliation.
What the API sends is what the screen shows.
```

---

## VALIDATION EVIDENCE

| Restaurant | Period | Dashboard Revenue | Sales Revenue | Items Sold Rev | Cancel Loss (D) | Cancel Loss (I) |
|-----------|--------|:-:|:-:|:-:|:-:|:-:|
| cafe103 (rid=644) | May 2026 | ₹23,05,959 | ₹23,05,959 | ₹22,99,681 | ₹34,756 | ₹34,756 |
| Palm House (rid=541) | May 2026 | ₹14,09,418 | ₹14,09,418 | ₹13,92,683 | ₹84,292 | ₹85,049 |

All gaps trace to contract ambiguity, not backend bugs.

---

*Amendment v1.1 — 2026-06-15. "Same name, same number. Different metric, different name."*
