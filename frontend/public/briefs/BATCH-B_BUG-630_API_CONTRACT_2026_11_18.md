# API Contract — BUG-630 Item Sales Ledger — add `net_sales` field — FINAL v1 — 2026-11-18

Backend: Gyan · ID: BB-14 · IA doc: `evidence/BUG-629_630_SETTLEMENT_NETSALES_INVESTIGATION_2026_10_31.md`
**Names LOCKED — renamed or changed fields → backend reply rejected.**

## 1. The problem

Endpoint `POST /api/v1/vendoremployee/top-food%20sales-report` currently returns `total_sales` per row which equals:

```
total_sales = item_price + variation_price + addon_price − discount + gst + vat + service_charge
            = Net Sales (pre-tax) + Tax
            = Total Billed
```

POS displays this as "Net Sales" — resulting in Net Sales being **larger than Gross Revenue**, which is impossible and confusing for restaurant owners.

Probe evidence (live data, Oct 2026):
```
Gross Revenue (item_price + variation_price + addon_price) = ₹13,33,222.00
Discount                                                   =    ₹36,636.29
Expected Net Sales (Gross − Discount)                      = ₹12,96,585.71
total_sales (what backend sends today)                     = ₹13,61,162.42  ← ₹64,576.71 over
Implied tax (gst + vat + sc)                               =    ₹64,576.71  ✅ confirmed
```

Relationship confirmed: `net_sales + (gst + vat + service_charge) = total_sales`

---

## 2. Contract — new field (BB-14)

### Endpoint
- Method: `POST`
- URL: `/api/v1/vendoremployee/top-food%20sales-report`
- Payload unchanged: `{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }`

### New field — per row in `food_sales_report[]`

| Field | Type | Rule | Locked name |
|-------|------|------|-------------|
| `net_sales` | string (numeric, 2dp) | `item_price + variation_price + addon_price − discount` — pre-tax, before GST/VAT/SC | **LOCKED** |

### Existing fields — unchanged

| Field | Current value | FE action after this fix |
|-------|--------------|--------------------------|
| `total_sales` | `net_sales + gst + vat + service_charge` (Total Billed) | Relabelled "Total Sales" in POS KPI strip — value unchanged |
| `gst`, `vat`, `service_charge` | Tax components per row | FE sums them for new "Tax" KPI — no change to fields |
| `item_price`, `variation_price`, `addon_price`, `discount` | Unchanged | Unchanged |

### Validation rule

Backend must satisfy for every row:
```
parseFloat(net_sales) + parseFloat(gst) + parseFloat(vat) + parseFloat(service_charge)
  === parseFloat(total_sales)   // within ±0.01 rounding tolerance
```

### Example response after fix

```json
{
  "food_item": "Build Your Own Bowl",
  "item_price": "46517",
  "variation_price": "0",
  "addon_price": "59430",
  "discount": "0",
  "gst": "5293.5",
  "vat": "0",
  "service_charge": "0",
  "net_sales": "105947.00",
  "total_sales": "111240.50"
}
```

---

## 3. FE plan (no backend dependency except this field)

| KPI card | Field read | Label after fix |
|----------|------------|-----------------|
| Gross Revenue | FE computed: `item_price + variation_price + addon_price` | Gross Revenue |
| Discount | `discount` | Discount |
| **Net Sales** (new) | `r.net_sales` ← **this field** | Net Sales — always ≤ Gross Revenue ✅ |
| Tax (new) | `r.gst + r.vat + r.service_charge` — FE sum of existing fields | Tax |
| **Total Sales** (renamed from "Net Sales") | `r.total_sales` — unchanged | Total Sales |

FE is blocked on BB-14 until `net_sales` is in the response.

---

## 4. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|----|------------------------|-------|------|
| BB-14 | | Add `net_sales` per row = `item_price + variation_price + addon_price − discount`. Confirm validation rule `net_sales + gst + vat + sc = total_sales` holds. | |
