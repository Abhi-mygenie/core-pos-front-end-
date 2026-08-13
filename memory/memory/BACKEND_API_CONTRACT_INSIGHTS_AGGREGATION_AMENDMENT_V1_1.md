# Backend API Contract — Insights Aggregation — AMENDMENT v1.1

**From:** POS Frontend Team
**To:** Backend Team
**Date:** 2026-06-15
**Ref:** Original contract `BACKEND_API_CONTRACT_INSIGHTS_AGGREGATION.md` (v1.0, 2026-06-12)
**Status:** AMENDMENT — validated on 2 restaurants (cafe103 rid=644, Palm House rid=541), May 2026 full month

---

## CONTEXT

Backend delivered all 4 endpoints per v1.0 contract. Schema shapes correct. All fields present. Response sizes excellent (~215 KB vs old ~450 MB).

This amendment addresses:
- **2 backend bugs** found during validation
- **4 contract gaps** where v1.0 was ambiguous or incomplete

**Principle:** FE does ZERO aggregation, ZERO reconciliation. Every number on screen comes directly from the API. Same metric name across endpoints = same number.

---

## BACKEND BUG B-1: Cancel EP `order_scope.order_count` Uses Wrong Date Attribution

### Evidence

Contract §3.4 says: *"Date attribution: cancel_at (the moment the cancellation happened)"*

Cancel EP internal numbers for Palm House May 2026:

| Field | Value | Attribution Used |
|-------|:-----:|:---------------:|
| `summary.order_scope.order_count` | 72 | ❌ `created_at` |
| `summary.order_scope.qty` | 157 | ✅ `cancel_at` |
| `by_day SUM(order_cancel_count)` | 72 | ❌ `created_at` |
| `by_employee SUM(order_cancels)` | 157 | ✅ `cancel_at` |
| Dashboard EP `order_scope_count` | 157 | ✅ `cancel_at` |
| FE old computation (code-verified) | 157 | ✅ `cancel_at` |

Same endpoint returns 72 in `summary + by_day` but 157 in `by_employee` for the same metric. `by_employee` is correct (uses `cancel_at`). `summary + by_day` are wrong (using `created_at`).

### Fix Required

```
Cancel EP (insights-cancellations):
  summary.order_scope.order_count → count distinct orders where ANY cancelled 
    line has cancel_at within the business-day range (with 45-day lookback).
    Currently: 72 (created_at). Should be: 157 (cancel_at).

  by_day[].order_cancel_count → count per business-day derived from cancel_at.
    Currently: SUM = 72. Should: SUM = 157.

  by_employee[].order_cancels → already correct (157). No change.
```

**Verification:** After fix, `summary.order_scope.order_count` = `SUM(by_day.order_cancel_count)` = `SUM(by_employee.order_cancels)` = Dashboard EP `order_scope_count`. All must match.

---

## BACKEND BUG B-2: Tax Not Zeroed on Cancellation (ESC-3)

### Evidence

Palm House May 2026:
- Dashboard + Cancel EP total_loss: ₹84,291.50 (uses §2.7 OPS-CANCEL formula)
- Items EP total_cancelled_revenue: ₹85,048.50 (uses §2.6 line-level sum)
- Δ = ₹757 = tax still present on cancelled item lines

Per business rule (owner-frozen 2026-06-02): *"If order is cancelled, tax, discount, service charge, delivery charge — all must be reverted."*

### Fix Required

Already escalated as **ESC-3** in `CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS_2026_06_02.md`. Backend must zero `gst_tax_amount`, `vat_tax_amount`, `discount_on_food`, `service_charge` on cancelled item lines.

No contract change. Once ESC-3 is fixed, Items EP and Dashboard/Cancel EP cancel loss will converge automatically.

---

## CONTRACT AMENDMENT A-1: TAB Settlement Timestamp for Hourly Attribution

### Problem

v1.0 §3.1 Revenue = `SUM(order_amount) + tab settlements`. But TAB settlements have no timestamp in the current response — so `by_hour` cannot include them. Result:

```
Palm House May:
  revenue.total:          ₹14,09,418
  SUM(by_hour.amount):    ₹14,08,998
  Gap:                    ₹420 = tab_settlement_total
```

Hourly chart doesn't sum to revenue total. TAB settlement is a bulk payment (not order-based) — cannot be attributed to a channel, but CAN be attributed to an hour via settlement timestamp.

### Contract Change

**§3.1 `revenue` object — ADD settlement timestamp data:**

```json
"revenue": {
  "total": 1409418.00,
  "paid_order_count": 1690,
  "avg_order_value": 833.98,
  "tab_settlement_total": 420.00,
  "tab_settlements": [
    { "timestamp": "2026-05-15T14:30:00", "amount": 420.00 }
  ],
  "by_hour": [
    { "hour": 8, "amount": 3163 },
    ...
    { "hour": 14, "amount": 185420 }
  ]
}
```

**Rules:**
- `by_hour` MUST include TAB settlement amounts, attributed to the settlement timestamp's hour.
- `SUM(by_hour.amount)` MUST equal `revenue.total` — always.
- `channel_mix` does NOT include TAB settlements (settlement is not order-based, has no channel). FE will show footnote: *"Revenue includes ₹X credit settled (not attributed to any channel)."*
- `SUM(channel_mix.revenue) + tab_settlement_total = revenue.total` — always.

**Backend effort:** Return `tab_settlements[]` with timestamp from `daily-sales-revenue-report`. Add settlement amounts to the matching `by_hour` bucket.

---

## CONTRACT AMENDMENT A-3: `daily.tax` Scope — Must Match `daily.revenue`

### Problem

v1.0 §3.2:
- Summary `total_tax`: "for all fs=6 orders **(including TAB — TAB GST stays per H5)**"
- Daily `revenue`: "for **non-TAB** fs=6 orders"
- Daily `tax`: **not defined**

Backend chose daily.tax = non-TAB (matching daily.revenue). Reasonable, but:

```
Palm House May:
  SUM(daily.tax):     ₹55,558
  summary.total_tax:  ₹57,426
  Gap:                ₹1,868 = TAB order tax
```

### Contract Change

**§3.2 — REPLACE tax rule:**

```
OLD: "total_gst = SUM(total_gst_tax_amount) for all fs=6 orders 
      (including TAB — TAB GST stays in tax per H5)"

NEW: "total_gst = SUM(total_gst_tax_amount) for non-TAB fs=6 orders.
      total_vat = SUM(total_vat_tax_amount) for non-TAB fs=6 orders.
      total_tax = total_gst + total_vat.
      
      tab_tax_total = SUM(total_gst_tax_amount + total_vat_tax_amount) 
                      for TAB fs=6 orders.  ← NEW FIELD
      
      daily[].tax = non-TAB fs=6 (matching daily.revenue scope)."
```

**Guarantees after fix:**
```
SUM(daily.revenue)  = summary.total_revenue    ← already true
SUM(daily.orders)   = summary.total_orders     ← already true
SUM(daily.tax)      = summary.total_tax        ← NOW true
SUM(daily.discount) = summary.total_discount   ← see A-6
```

If owner needs "total tax including TAB": `total_tax + tab_tax_total`.

**Backend effort:** SMALL — split one SUM into two, add 1 new field.

---

## CONTRACT AMENDMENT A-4: Discount Scope Alignment

### Problem

Three different "discount" numbers across endpoints:

| Endpoint | Field | Scope | Source Column | Palm House May |
|----------|-------|-------|---------------|:-:|
| Dashboard §3.1 | `discounts.manual_discount` | All fs=6 (includes TAB) | `restaurant_discount_amount` | ₹51,892 |
| Sales §3.2 | `summary.total_discount` | Non-TAB fs=6 | `restaurant_discount_amount + coupon_discount_amount` | ₹46,592 |
| Items §3.3 | `SUM(sold.discount)` | Sold bucket (fs=6, non-TAB, non-comp) | `discount_on_food` (line-level) | ₹49,852 |

User sees ₹51,892 on Dashboard → clicks Sales → sees ₹46,592 → goes to Items → sums ₹49,852. None match.

### Contract Change

**§3.1 Dashboard discounts — CHANGE scope to non-TAB:**

```
OLD: "manual_discount = SUM(restaurant_discount_amount). fs=6 orders"
NEW: "manual_discount = SUM(restaurant_discount_amount) for non-TAB fs=6 orders.
      tab_discount_total = SUM(restaurant_discount_amount) for TAB fs=6 orders. ← NEW FIELD"
```

**Updated Dashboard discounts response:**

```json
"discounts": {
  "manual_discount": 46591.60,
  "coupon_discount": 0.00,
  "coupon_order_count": 0,
  "loyalty_discount": 0.00,
  "comp_item_total": 2320.00,
  "comp_item_count": 11,
  "total_leakage": 48911.60,
  "tab_discount_total": 5300.00
}
```

**Guarantees after fix:**
```
Dashboard manual_discount + coupon_discount = Sales total_discount  ← always true (same scope, same source)
```

Items `sold.discount` uses `discount_on_food` (line-level) — this is a different metric (per-item allocated discount vs order-level discount). Different source column = expected to differ. No change needed for Items, but field name stays `discount` (line-level allocation is the correct metric for per-item view).

**Backend effort:** SMALL — add TAB filter to Dashboard discount SUM, add 1 new field.

---

## CONTRACT AMENDMENT A-6: `daily.discount` Scope — Explicit Non-TAB

### Problem

Same pattern as A-3. `daily[].discount` scope is not defined in v1.0. Backend returns non-TAB (matching daily.revenue), but contract doesn't say so.

### Contract Change

**§3.2 daily array — ADD explicit scope for all fields:**

```
§3.2 daily[] — each entry:
  {
    "date": "2026-05-01",
    "revenue":  <non-TAB fs=6 orders — SUM(order_amount)>,
    "orders":   <non-TAB fs=6 orders — COUNT>,
    "tax":      <non-TAB fs=6 orders — SUM(total_gst + total_vat)>,     ← per A-3
    "discount": <non-TAB fs=6 orders — SUM(restaurant_discount_amount 
                                           + coupon_discount_amount)>,   ← NOW EXPLICIT
    "tab_settlement": <from daily-sales-revenue-report>
  }

ALL daily fields use the same scope: non-TAB fs=6 orders.
```

**Guarantee:**
```
SUM(daily.discount) = summary.total_discount  ← always true
```

**Backend effort:** SMALL — documentation + confirm existing behavior is correct.

---

## SUMMARY

### Backend Bugs (2) — Backend Must Fix

| # | Bug | Endpoint | Evidence | Fix |
|---|-----|----------|----------|-----|
| **B-1** | `order_scope.order_count` uses `created_at` not `cancel_at` | `insights-cancellations` | Returns 72 (should be 157). Own `by_employee` correctly returns 157. Internal inconsistency. | Use `cancel_at` attribution per contract §3.4 |
| **B-2** | Tax not zeroed on cancelled lines (ESC-3) | Data layer | ₹757 tax on 403 cancelled items (Palm House May). Violates frozen business rule. | Zero all financial fields on cancellation |

### Contract Amendments (4) — We Must Update Contract

| # | Section | What Changes | Backend Effort |
|---|---------|-------------|:-:|
| **A-1** | §3.1 Revenue | Add `tab_settlements[]` with timestamp. Include in `by_hour`. Channel gets footnote. `SUM(by_hour) = revenue.total` always. | SMALL |
| **A-3** | §3.2 Summary tax | `total_tax` = non-TAB only. Add `tab_tax_total`. `SUM(daily.tax) = total_tax` always. | SMALL |
| **A-4** | §3.1 Dashboard discount | `manual_discount` = non-TAB. Add `tab_discount_total`. `Dashboard discount = Sales discount` always. | SMALL |
| **A-6** | §3.2 Daily discount | Explicit non-TAB scope. `SUM(daily.discount) = total_discount` always. | SMALL |

### Validation Data

| Check | cafe103 | Palm House |
|-------|:-------:|:----------:|
| Revenue: Dashboard = Sales | ✅ ₹23,05,959 | ✅ ₹14,09,418 |
| Orders: Dashboard = Sales | ✅ 2,062 | ✅ 1,690 |
| Payment total = Revenue | ✅ | ✅ |
| Channel total + TAB = Revenue | ✅ Δ=₹2,458 (TAB) | ✅ Δ=₹420 (TAB) |
| Daily SUM = Summary (rev + orders) | ✅ | ✅ |
| Items meta = SUM(items[]) | ✅ all 9 fields | ✅ all 9 fields |
| Cancel: Dashboard = Cancel EP (loss) | ✅ | ✅ |
| Cancel: Dashboard vs Cancel EP (count) | ❌ B-1 bug | ❌ B-1 bug |
| Cancel: Dashboard vs Items (loss) | ✅ | ❌ B-2 Δ₹757 (ESC-3) |

### The Guarantee After v1.1

```
SUM(by_hour.amount)         = revenue.total                    ← A-1 (with TAB settlement hour)
SUM(channel_mix.revenue)    = revenue.total − tab_settlement   ← A-1 (footnote)
SUM(daily.revenue)          = summary.total_revenue            ← already true
SUM(daily.orders)           = summary.total_orders             ← already true
SUM(daily.tax)              = summary.total_tax                ← A-3
SUM(daily.discount)         = summary.total_discount           ← A-6
Dashboard.manual_discount   = Sales.total_discount (non-TAB)   ← A-4
Cancel EP.order_count       = Dashboard.order_scope_count      ← B-1
Items cancel loss           = Dashboard cancel loss            ← B-2 (when ESC-3 ships)

FE does ZERO aggregation. ZERO reconciliation.
What the API sends is what the screen shows.
```

---

*Amendment v1.1 — 2026-06-15. Validated on cafe103 + Palm House, May 2026 full month. 2 backend bugs + 4 contract amendments. "Same name, same number. Different metric, different name."*
