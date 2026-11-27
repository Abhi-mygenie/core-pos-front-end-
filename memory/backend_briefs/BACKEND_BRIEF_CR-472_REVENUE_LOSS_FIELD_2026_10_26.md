# BACKEND_BRIEF_CR-472_REVENUE_LOSS_FIELD_2026_10_26

## Summary
- Issue: `item-consumption-report` API response missing revenue/financial data for cancellations
- Classification: CONTRACT_ENHANCEMENT (additive field request)
- Frontend impact: CR-472 (Item Consumption Report) needs a "Revenue Loss" column per menu item showing ₹ value lost from cancellations
- Priority/Risk: P2 / LOW (additive — no existing fields change)

## Endpoint
- Method: POST
- URL: `{HOST}/api/v2/vendoremployee/report/item-consumption-report`
- Auth: Bearer token

## Current Response (per item)
```json
{
  "food_id": 107649,
  "item_name": "Americano (Long Black)",
  "sold_qty": 16,
  "canceled_qty": 3,
  "returned_qty": 2,
  "wastage_qty": 1,
  "consumed_qty": 13,
  "consumed_ingredients": [...],
  "returned_ingredients": [...],
  "wastage_ingredients": [...]
}
```

## Requested Addition
Add one new field per item:

```json
{
  "food_id": 107649,
  "item_name": "Americano (Long Black)",
  "sold_qty": 16,
  "canceled_qty": 3,
  "returned_qty": 2,
  "wastage_qty": 1,
  "consumed_qty": 13,
  "revenue_loss": 450.00,
  "consumed_ingredients": [...],
  "returned_ingredients": [...],
  "wastage_ingredients": [...]
}
```

| New Field | Type | Meaning |
|---|---|---|
| `revenue_loss` | number (decimal, ₹) | Cumulative revenue lost from cancelled quantities of this menu item in the date range. Sum of cancelled item prices (before tax, or after tax — backend decides, document which). |

## Questions for Backend
- **Q1:** Should `revenue_loss` be pre-tax (subtotal of cancelled items) or post-tax (including GST/VAT)?
- **Q2:** Should it include only item-level cancellations, or also order-level cancellations where this item was part of the cancelled order?
- **Q3:** Is the data source the same as `insights-cancellations` (which already computes per-item `amount`), or a different aggregation?
- **Q4:** Items with `canceled_qty: 0` — should `revenue_loss` be `0` or omitted?

## Frontend Usage
- Displayed as a table column "Revenue Loss" with ₹ formatting
- Summed into a KPI card "Total Revenue Loss" at the top of the report
- Included in Excel/PDF exports

## Impact
- **Additive only** — no existing fields removed or renamed
- Frontend will read `revenue_loss` if present, show "—" if absent (graceful fallback)
- No breaking change for existing consumers of this endpoint
