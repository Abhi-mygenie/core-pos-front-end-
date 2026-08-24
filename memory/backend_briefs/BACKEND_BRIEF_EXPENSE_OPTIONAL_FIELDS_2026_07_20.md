# BACKEND_BRIEF_EXPENSE_OPTIONAL_FIELDS_2026_07_20

## Summary
- Issue: FE needs `paid_to` and `payment_reference_id` fields on expense transactions for audit trail and reconciliation
- Classification: CONTRACT_MISMATCH (fields sent but not returned/confirmed stored)
- Frontend impact: Cannot show payee or transaction reference in expense reports
- Priority/Risk: P1 / MEDIUM

## Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/expense/store-expense-details`
- Auth: Bearer token (vendoremployee)
- Also affects: PUT `/api/v2/vendoremployee/expense/edit-expense/{id}` and GET `/api/v2/vendoremployee/expense/expenses-report`

## Reproduction
1. POST store-expense-details with extra fields `paid_to` and `payment_reference_id` in detail lines
2. Response: 200 OK — but these fields are NOT present in the response body
3. GET expenses-report — these fields are NOT returned

## Payload / Response

### Request (sent):
```json
{
  "e_date": "20/07/2026",
  "total_amount": 1,
  "details": [{
    "expense": "APPLE",
    "amount": 1,
    "payment_method": "UPI",
    "quantity": 1,
    "unit": "",
    "physical_quantity": 0,
    "notes": "test probe with extra fields",
    "category_id": null,
    "paid_to": "Test Vendor",
    "payment_reference_id": "REF-001"
  }]
}
```

### Response (received):
```json
{
  "id": 9902,
  "details": [{
    "expense": {"id": 4669, "name": "APPLE"},
    "amount": 1,
    "payment_method": "UPI",
    "notes": "test probe with extra fields"
  }]
}
```
- `paid_to` — NOT in response
- `payment_reference_id` — NOT in response

## What We Need from Backend

### Fields to add (per expense detail line):

| Field | Type | Purpose | Nullable? |
|---|---|---|---|
| `paid_to` | string(255) | Vendor/payee name | YES — optional |
| `payment_reference_id` | string(100) | UPI ref / cheque no / txn ID | YES — optional |

### Endpoints to update:
1. **POST** `/store-expense-details` — accept + store both fields per detail line
2. **PUT** `/edit-expense/{id}` — accept + update both fields
3. **GET** `/expenses-report` — return both fields in each transaction row

### Questions:
- Q1: Are these fields already in the DB but just not returned? Or do columns need to be added?
- Q2: Any max-length constraints on `payment_reference_id`?
- Q3: Should `paid_to` be a free-text field or reference a vendor master table?

## Frontend Workaround
- Available: NO — cannot store or display these fields without backend support
- FE is ready to wire inputs as soon as backend confirms the contract
