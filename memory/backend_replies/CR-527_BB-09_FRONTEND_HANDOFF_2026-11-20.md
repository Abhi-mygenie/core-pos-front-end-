# CR-527 — Diner on credit rows — BB-09

Verified on preprod on 2026-11-20. Implements the supplied FINAL v1 contract locked on 2026-11-15, OD-B-BB09. Field names and types match that contract.

## Read endpoint

`GET /api/v2/vendoremployee/pos/tap-customer-record-list?customer_id={credit_holder_id}`

Use the existing employee Bearer token. The existing query parameter `customer_id` identifies the credit-holder.

Read the new fields from each row in `customer-transaction-list`.

| Field | Type | Meaning | Default |
| --- | --- | --- | --- |
| diner_name | string or null | Order diner name captured when the credit entry is created | null |
| diner_mobile | string or null | Order diner mobile captured when the credit entry is created | null |

Keep displaying the credit-holder using the existing holder data. Show these fields on the corresponding credit row as the diner identity. Handle each nullable field independently. Historical rows without a stored snapshot return null.

## Postman cURL

Replace TOKEN and CREDIT_HOLDER_ID before importing or sending.

```bash
curl --location --request GET 'https://preprod.mygenie.online/api/v2/vendoremployee/pos/tap-customer-record-list?customer_id=CREDIT_HOLDER_ID' \
  --header 'Authorization: Bearer TOKEN' \
  --header 'Accept: application/json' \
  --header 'X-localization: en'
```

For production, use the same path on `https://manage.mygenie.online` after deploying the backend changes and database columns.

## Response format

The following is an illustrative excerpt. Existing transaction fields and summary fields continue to be returned.

```json
{
  "customer-transaction-list": [
    {
      "id": 12345,
      "order_id": 1578985,
      "customer_id": 3125,
      "credit_order_amount": "127.00",
      "debit_order_amount": "0.00",
      "payment_status": "paid",
      "restaurant_order_id": "000824",
      "diner_name": "CR527 Postpaid Diner",
      "diner_mobile": "9999900722"
    },
    {
      "id": 12346,
      "order_id": 123456,
      "customer_id": 3125,
      "credit_order_amount": "100.00",
      "debit_order_amount": "0.00",
      "diner_name": null,
      "diner_mobile": null
    }
  ],
  "customer-transaction-list-debit": []
}
```

The sample row IDs are illustrative. Use the live API response for the complete existing response shape.

## Sending diner and credit-holder details

The read API introduces no new frontend input fields.

For the verified V2 postpaid bill-payment flow, send the diner through the existing `cust_name` and `cust_mobile` fields when supplying diner details. Send the credit-holder through the existing `name`, `mobile`, and `email` fields with `payment_mode: "TAB"`. If the existing order already contains the diner, omitting diner fields preserves that identity during TAB payment.

Example identity fields within the existing bill-payment payload:

```json
{
  "order_id": "1578985",
  "payment_mode": "TAB",
  "payment_status": "paid",
  "payment_amount": 127,
  "grant_amount": 127,
  "cust_name": "Abhishek",
  "cust_mobile": "9000000001",
  "name": "Saurav",
  "mobile": "9000000002",
  "email": ""
}
```

This is an identity excerpt. Send the existing complete bill-payment payload with its item and amount fields.

For prepaid placement, the verified flow captures the diner from the order created with `cust_name` and `cust_mobile`. A separate prepaid credit-holder identity was not verified in this test.

## Storage and CRM behaviour

The nullable columns `tapemployeeorderrecords.diner_name` and `tapemployeeorderrecords.diner_mobile` hold the snapshot. New model-created credit entries copy the order's saved `user_name` and the linked user's phone. A later customer edit or credit-row edit does not refresh that snapshot.

Snapshot capture performs database reads and stores plain text. It does not call customer creation, create a CRM link, or trigger CRM sync because the snapshot mobile matches a CRM customer. Existing customer and CRM workflows continue to perform their own processing.

Existing records remain null unless separately corrected using verified historical evidence. Live joins to a customer's current identity are not used to populate historical snapshots.

## Verification

Local test `tests/Unit/TabDinerSnapshotTest.php` passed with 10 assertions. It covers diner snapshots, a separate credit-holder ID, snapshot persistence after customer edits, null defaults, and no additional user creation.

Preprod restaurant 672 returned these values through the locked read endpoint:

| Flow | Order | Bill | diner_name | diner_mobile | Result |
| --- | --- | --- | --- | --- | --- |
| Prepaid TAB | 1578984 | 000823 | CR527 Prepaid Diner | 9999900721 | PASS |
| Postpaid to TAB | 1578985 | 000824 | CR527 Postpaid Diner | 9999900722 | PASS |

The postpaid credit-holder was CR527 Credit Holder, mobile 9999900723. The credit row retained the separate diner identity.

A separate prepaid amount discrepancy was observed. Placement submitted INR 127, the order saved INR 132.71, and its TAB credit matched INR 132.71. Postpaid saved and credited INR 127. This handoff verifies the diner fields. The prepaid amount discrepancy remains open.

## Backend deployment reference

- `app/Models/Tapemployeeorderrecords.php`
- `app/Http/Controllers/Api/V2/Vendoremployee/OrderController.php`
- `database/migrations/2026_11_20_000001_add_diner_snapshot_to_tab_credit_records.php`

The two nullable database columns are required before the model is used. Preprod columns were added using SQL and the affected files were uploaded before verification. Route changes are unnecessary for CR-527.

## Sign-off

| ID | Status | Notes | Date |
| --- | --- | --- | --- |
| BB-09 | Implemented; prepaid and postpaid readback verified on preprod | Locked field names preserved. Diner snapshots are plain text with no additional CRM-linking side effect. Separate prepaid credit-holder scenario remains unverified. | 2026-11-20 |
