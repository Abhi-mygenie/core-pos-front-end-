# V2 order discount API — frontend integration and QA

Date: 2026-11-20. Environment: preprod. This document records the tested behaviour and two open findings. Full lifecycle production sign-off is pending their resolution.

## Endpoint

`POST /api/v2/vendoremployee/order/order-discount-manage`

Base URL: `https://preprod.mygenie.online`

Use the employee Bearer token for the restaurant owning the order.

Backend files used for this endpoint:

- `app/Http/Controllers/Api/V2/Vendoremployee/OrderController.php`
- `routes/api/v2/api.php`

The files were uploaded and verified on preprod. No database migration is required. Rebuild route cache when deploying routes to a server with route caching enabled.

## Request

Send JSON.

| Key | Type | Required | Behaviour |
| --- | --- | --- | --- |
| order_id | integer | Yes | Order belonging to the employee's restaurant |
| discount_amount | number | Yes | Entered percentage or fixed currency value, at least zero |
| discount_type | string | Yes | Exactly `percent` or `fixed` |
| discount_note | string or null | No | Discount note |

For `percent`, discount_amount must be at most 100. For `fixed`, it must not exceed the eligible active-item subtotal. A zero value removes the order discount.

The endpoint currently accepts active unpaid orders before collection. It rejects orders with status 3 or 6, payment_status `paid`, or a populated collect_bill.

### Percentage example

```json
{
  "order_id": 1579013,
  "discount_amount": 10,
  "discount_type": "percent",
  "discount_note": "Manager approved"
}
```

This means 10%, independent of the currency amount of the resulting discount.

### Fixed example

```json
{
  "order_id": 1579014,
  "discount_amount": 10,
  "discount_type": "fixed",
  "discount_note": "Manager approved"
}
```

This means INR 10.

### Remove example

```json
{
  "order_id": 111111,
  "discount_amount": 0,
  "discount_type": "fixed",
  "discount_note": ""
}
```

Use fresh active order IDs when reproducing the examples. Orders 1579013 and 1579014 are historical QA references and have already been merged.

## Postman cURL

Replace TOKEN and the example order ID.

```bash
curl --location 'https://preprod.mygenie.online/api/v2/vendoremployee/order/order-discount-manage' \
  --header 'Authorization: Bearer TOKEN' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "order_id": 111111,
    "discount_amount": 10,
    "discount_type": "percent",
    "discount_note": "Manager approved"
  }'
```

## Success response

Actual percentage-test response before cancellation:

```json
{
  "success": true,
  "message": "Order discount applied successfully.",
  "order_id": 1579013,
  "order_amount": 217,
  "discount_amount": 22.86,
  "discount_type": "Percent",
  "discount_value": "10.00"
}
```

The response discount_amount is the applied currency discount. The response discount_value is the original entered value. The request uses lowercase percent/fixed; the response uses Percent/Fixed. discount_value may be returned as a decimal string.

Actual fixed-test response:

```json
{
  "success": true,
  "message": "Order discount applied successfully.",
  "order_id": 1579014,
  "order_amount": 230,
  "discount_amount": 10,
  "discount_type": "Fixed",
  "discount_value": "10.00"
}
```

## Saved data and frontend readback

The endpoint updates:

- `order_discounts.discount`, `discount_type`, and `discount_note` for the selection.
- `orders.order_discount_type`, `discount_value`, `order_discount`, and `restaurant_discount_amount`.
- Active item discount allocations and recalculated taxes and bill totals through the existing calculator.

After a successful save, an `update-order` publication is attempted through the existing order socket publisher with KOT flag N. HTTP success confirms the database operation. Socket failure is logged separately.

Use the returned order_amount and the updated order readback for display. The endpoint's response is a summary, rather than a complete order payload.

Read the full order with:

```bash
curl --location 'https://preprod.mygenie.online/api/v2/vendoremployee/get-single-order-new' \
  --header 'Authorization: Bearer TOKEN' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data-raw '{"order_id":"111111"}'
```

The relevant fields are in `orders[]` and `orders[].orderDetails[]`.

Illustrative excerpt from the percentage test:

```json
{
  "orders": [
    {
      "id": 1579013,
      "order_amount": 217,
      "order_discount_type": "Percent",
      "discount_value": "10.00",
      "restaurant_discount_amount": 22.86,
      "orderDetails": [
        {
          "id": 3969879,
          "quantity": 2,
          "discount_on_food": 22.86,
          "gst_tax_amount": "10.29"
        }
      ]
    }
  ]
}
```

The actual response contains additional existing fields.

## Validation responses

Validation returns HTTP 422 with Laravel's message/errors structure. Example:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "discount_amount": [
      "Percent must be at most 100 and fixed discount must not exceed the eligible subtotal."
    ]
  }
}
```

An unknown or inaccessible order returns HTTP 404. Handle 401 authentication failures and other non-success responses through the existing application error flow.

## Verified lifecycle cases

Restaurant 672, fresh unpaid orders 1579013 and 1579014.

| Operation | Percentage test | Fixed test |
| --- | --- | --- |
| Initial application on INR 228.58 items | 10% applied as INR 22.86 | INR 10 applied |
| Cancel one quantity | Active discount reduced to INR 11.43 | Remaining order retained INR 10 |
| Cancelled row | Discount and GST became zero | Discount and GST became zero |
| Add INR 123.81 item to remaining INR 114.29 | Total discount became INR 23.81 | Total discount stayed INR 10; allocation issue below |

Transfer test moved an INR 123.81 item from the fixed-discount order to the percentage-discount order. The destination applied its own 10%, producing INR 36.19 total discount on INR 361.91.

Local regression checks passed: 52 tests, 202 assertions across OrderAmountValidationTest, OrderDiscountMetadataTest, and CollectBillDiscountTotalsTest. These existing tests do not cover every endpoint lifecycle combination.

## Open finding 1 — fixed allocation after adding an item

The fixed order retained INR 10 on the original item and allocated zero to the added item.

```json
{
  "restaurant_discount_amount": 10,
  "order_discount_type": "Fixed",
  "discount_value": "10.00",
  "items": [
    {"price": 114.29, "discount_on_food": 10},
    {"price": 123.81, "discount_on_food": 0}
  ]
}
```

The header discount is correct. The allocation does not redistribute across both active lines, which can affect line-level GST and item-transfer behaviour.

Reproduce with a fresh order:

1. Apply fixed INR 10 through the new endpoint.
2. Add an item through the existing PUT update-place-order request with its complete amount and item fields.
3. Read get-single-order-new and compare item discount_on_food.

## Open finding 2 — mixed-discount merge

When the fixed INR 10 source order was merged into the 10% destination, the destination applied 10% across the combined INR 476.20 subtotal. The saved discount became INR 47.62. The source fixed-discount treatment was not retained separately.

This behaviour is observed; the intended mixed-discount policy remains undecided.

```bash
curl --location 'https://preprod.mygenie.online/api/v2/vendoremployee/order/transfer-order' \
  --header 'Authorization: Bearer TOKEN' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "source_order_id": 111111,
    "target_order_id": 222222,
    "printer_agent": []
  }'
```

Prepare source 111111 with a fixed INR 10 discount and destination 222222 with 10% before running the merge. Read destination 222222 afterward.

## QA status

Percentage application, percentage item addition, partial cancellation, fixed header application, and fixed retention after partial cancellation passed the tested preprod cases. Fixed allocation after addition and mixed-discount merge remain open. This document records the current integration and examples and does not mark the complete lifecycle ready for production.
