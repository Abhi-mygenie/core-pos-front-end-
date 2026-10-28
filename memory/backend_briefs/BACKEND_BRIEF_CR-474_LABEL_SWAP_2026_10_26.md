# BACKEND_BRIEF_CR-474_LABEL_SWAP_2026_10_26

## Summary
- Issue: Column labels and data meaning need to change for the Sales Audit report
- Classification: CONTRACT_ENHANCEMENT (label + data swap, same keys)
- Frontend impact: **ZERO frontend changes required** — frontend reads `data.columns[].label` dynamically for all UI elements (KPI cards, chart legends, table headers, CSV/PDF exports)
- Priority/Risk: P1 / LOW (label change only, no key rename, no structural change)

## Endpoint
- Method: POST
- URL: `{HOST}/api/v2/vendoremployee/report/datewise-sales-revenue`
- Auth: Bearer token

## What Needs to Change

### 1. `data.columns[]` — Update labels (keys stay the same)

**Current:**
```json
{
  "columns": [
    {"key": "date", "label": "Date"},
    {"key": "total_sales", "label": "Total Sales"},
    {"key": "total_cancelled", "label": "Total Cancelled"},
    {"key": "total_discount", "label": "Total Discount"},
    {"key": "total_paid_revenue", "label": "Total Paid Revenue"}
  ]
}
```

**New:**
```json
{
  "columns": [
    {"key": "date", "label": "Date"},
    {"key": "total_sales", "label": "Total Paid Revenue"},
    {"key": "total_cancelled", "label": "Total Cancelled"},
    {"key": "total_discount", "label": "Total Discount"},
    {"key": "total_paid_revenue", "label": "Revenue Loss"}
  ]
}
```

| Key (unchanged) | Old label | New label |
|---|---|---|
| `total_sales` | Total Sales | **Total Paid Revenue** |
| `total_cancelled` | Total Cancelled | Total Cancelled (unchanged) |
| `total_discount` | Total Discount | Total Discount (unchanged) |
| `total_paid_revenue` | Total Paid Revenue | **Revenue Loss** |

### 2. `data.daily[]` and `data.summary{}` — Update what data each key carries

| Key (unchanged) | Old data | New data |
|---|---|---|
| `total_sales` | Net payable order amounts (punched) | **Actual paid revenue (collections)** |
| `total_cancelled` | Cancelled monetary value | Cancelled monetary value (unchanged) |
| `total_discount` | All discount types combined | All discount types combined (unchanged) |
| `total_paid_revenue` | Actual paid collections | **Revenue Loss = sum of cancelled + discount** |

**Example — before:**
```json
{
  "date": "2026-10-01",
  "total_sales": 83159,
  "total_cancelled": 1720,
  "total_discount": 4589,
  "total_paid_revenue": 66972
}
```

**Example — after:**
```json
{
  "date": "2026-10-01",
  "total_sales": 66972,
  "total_cancelled": 1720,
  "total_discount": 4589,
  "total_paid_revenue": 6309
}
```
Where `total_paid_revenue` (now "Revenue Loss") = `total_cancelled` (1720) + `total_discount` (4589) = 6309.

### 3. `data.summary{}` — Same swap

```json
{
  "total_sales": <sum of actual paid revenue across all days>,
  "total_cancelled": <unchanged>,
  "total_discount": <unchanged>,
  "total_paid_revenue": <sum of (cancelled + discount) across all days>
}
```

### 4. `data.definitions{}` — Update descriptions

```json
{
  "total_sales": "Actual paid collections by collect_bill, TAB receipts on settlement dates, partial-payment legs. Previously was 'Total Paid Revenue'.",
  "total_cancelled": "<unchanged>",
  "total_discount": "<unchanged>",
  "total_paid_revenue": "Revenue Loss: sum of cancelled monetary value and all discount types for the period. Computed as total_cancelled + total_discount per business day.",
  "reconciliation": "<update to reflect new meaning>"
}
```

## What Must NOT Change

- **API keys** — `total_sales`, `total_cancelled`, `total_discount`, `total_paid_revenue` must remain exactly as-is. Do not rename keys.
- **Response structure** — `data.columns[]`, `data.daily[]`, `data.summary{}`, `data.business_days[]`, `data.header`, `data.generated_at` — all stay in the same shape.
- **Data types** — All amounts remain JSON numbers in rupees (not paise, not strings).
- **Column order in `data.columns[]`** — Keep the same order: date → total_sales → total_cancelled → total_discount → total_paid_revenue.
- **Error responses** — 401, 403, 404 unchanged.

## Why No Frontend Changes Are Needed

The frontend (SalesAuditPage.jsx) reads ALL labels dynamically from `data.columns[].label`:
- **KPI card titles** → from `data.columns[].label`
- **Chart legend names** → from `data.columns[].label`
- **Table column headers** → from `data.columns[].label`
- **CSV export headers** → from `data.columns[].label`
- **PDF export headers** → from `data.columns[].label`
- **Chart tooltip labels** → from `data.columns[].label`

Colors are mapped by **key** (not label), so they will automatically adjust:
- `total_sales` key → blue accent (was "Total Sales", becomes "Total Paid Revenue" — blue is appropriate for the primary number)
- `total_paid_revenue` key → green accent (was "Total Paid Revenue", becomes "Revenue Loss" — may want to discuss if red is more appropriate)

## Open Question for Backend

**Q1:** For the `total_paid_revenue` key (now "Revenue Loss"), should the color hint change? Currently frontend maps it to green (#329937). "Revenue Loss" semantically fits red (#EF4444) better. Two options:
- **(a)** Backend adds an optional `color` field per column in `data.columns[]` — frontend reads it if present
- **(b)** Frontend keeps color-by-key mapping — backend just changes labels and data. Owner accepts green for Revenue Loss or frontend does a one-line color swap later.

**Recommendation:** Option (b) for now — ship the label/data swap first. Color can be adjusted in a 1-line frontend follow-up if needed.

## Verification After Deploy

1. Hit the endpoint → check `data.columns[1].label` = "Total Paid Revenue" (was "Total Sales")
2. Hit the endpoint → check `data.columns[4].label` = "Revenue Loss" (was "Total Paid Revenue")  
3. Check `data.daily[0].total_sales` = actual paid revenue for that day
4. Check `data.daily[0].total_paid_revenue` = cancelled + discount for that day
5. Check `data.summary.total_paid_revenue` = sum of all daily (cancelled + discount)
6. Frontend auto-reflects new labels everywhere — no deploy needed on FE side
