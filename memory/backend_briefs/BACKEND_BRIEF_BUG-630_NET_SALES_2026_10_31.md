# BACKEND_BRIEF_BUG-630_2026-10-31

## Summary
- Issue: Item Sales Ledger `total_sales` field includes GST + VAT + Service Charge — "Net Sales" KPI shows higher value than "Gross Revenue"
- Classification: DATA_ISSUE
- Frontend impact: "NET SALES ₹13,61,162" displayed as larger than "GROSS REVENUE ₹13,33,222" — confusing for restaurant owners
- Priority/Risk: P1 / MEDIUM

## Endpoint
- Method: POST
- URL: `/api/v1/vendoremployee/report/top-food-sales`
- Auth: Bearer token (employee login)

## Reproduction
1. Login as any restaurant owner
2. Navigate to Daily Report → Item Sales Ledger
3. Select date range (e.g. Aug 1 – Oct 31 2026)
4. Observe KPI strip: Gross Revenue vs Net Sales
5. Net Sales is HIGHER than Gross Revenue

## Payload / Response

Request:
```json
{ "from_date": "2026-08-01", "to_date": "2026-10-31" }
```

Response per item row:
```json
{
  "food_item": "Build Your Own Bowl",
  "item_price": "46517",        // base price total
  "variation_price": "0",
  "addon_price": "59430",
  "discount": "0",
  "gst": "...",
  "vat": "...",
  "service_charge": "...",
  "total_sales": "420296.85"    // ← THIS IS THE PROBLEM FIELD
}
```

## The Problem

FE computes:
```
Gross Revenue = item_price + variation_price + addon_price = ₹13,33,222
```

Backend sends:
```
total_sales = ₹13,61,162.42  (includes GST + VAT + Service Charge)
```

Math:
```
Gross Revenue:    ₹13,33,222.00
Discount:            ₹36,636.29
Gross - Discount: ₹12,96,585.71
total_sales:      ₹13,61,162.42  (₹64,576.71 MORE — that's GST+VAT+SC)
```

## Expected

`total_sales` should be the **net sales — amount before taxes:**
```
net_sales = item_price + variation_price + addon_price − discount
          = Gross Revenue − Discount
          = Net Sales (before GST, VAT, Service Charge)
```

This must EXCLUDE GST, VAT, and Service Charge. Net Sales must always be ≤ Gross Revenue.

Currently backend sends: `Gross − Discount + GST + VAT + SC` (total billed with tax)
Should send:             `Gross − Discount` (net sales before tax)

## Frontend Workaround
- Available: YES (FE can compute `grossRevenue - discount` locally)
- But: FE currently displays `total_sales` directly as "Net Sales" — changing the label without fixing the number would still be wrong
