# CR-077 Endpoint Validation — 2026-07-19

## Credentials Validated
| Role | Email | Restaurant | ID | Flag | Parent |
|---|---|---|---|---|---|
| Master | owner@palmcentral.com | palm central | 813 | master | — |
| Franchise | owner@palmindia.com | Palm India | 816 | franchise | 813 |

## Endpoint Results

### 1. POST pending-queues ✅ WORKING
- Franchise sees: receive_pending (2 transfers), my_requests (2)
- Master sees: all empty (dispatches already sent)
- Queue categories: approval_pending, lateral_approval_pending, dispatch_pending, receive_pending, dispute_pending, my_requests

### 2. GET details/{id} ✅ WORKING
- Returns: { transfer: {header}, lines: [{line details + meta_json.segments}] }
- Transfer 296: TRF-813-2026-0004, 1 line (Granola 1kg, 1 segment with batch+expiry)
- Header fields: reference_code, status, type, from/to_restaurant_id, dispatched_by/at, resolution_type, shipping_fee, pricing_context
- Line fields: source_stock_title, requested_qty, requested_unit, quantity_display, display_unit, estimated_unit_price, selling_unit_price, status, meta_json.segments[{batch, expiry_date, qty_cal, qty_display}]

### 3. POST receive/{id} ✅ WORKING
- Empty payload = full accept (all lines, full qty)
- Response: { transfer_id, status: "received", lines: [{line_id, stock_title, received_qty, rejected_qty, received_unit}] }
- Transfer 295 received successfully

### 4. POST reject/{id} ✅ VALIDATES
- Returns TRANSFER_NOT_FOUND for invalid ID
- Accepts: { reason: "..." } body

### 5. POST receive-dispute/{id}/resolve ✅ VALIDATES
- Required field: `accept` (boolean — accept the dispute resolution or not)
- Returns VALIDATION_FAILED with { errors: { accept: ["required"] } }

### 6-7. POST return/eligible + return/initiate ⚠️ EMPTY
- Both return empty response — may need eligible transfers (recently received, within return window)
- Transfer 295 was just received — may not be eligible yet or feature may require backend config

### 8. POST dispatch ⚠️ UNKNOWN PAYLOAD
- POST with empty body from master returns empty (no validation error)
- Owner did a dispatch from old POS/admin — we captured the result (TRF-813-2026-0004)
- Payload structure not discoverable from FE alone — need backend doc or owner MD

### 9. Approval endpoints — NOT TESTABLE
- approval_pending + lateral_approval_pending queues always empty
- May require specific transfer type/config to trigger

## OQ Resolution

| OQ | Answer | Source |
|---|---|---|
| OQ-1 | Dispatch payload unknown — POST returns blank, not validation error | Curl probe |
| OQ-2 | Approval triggers unknown — queues always empty | Curl probe |
| OQ-3 | Empty receive body = full accept (atomic, all lines) | Curl: receive/295 → 200 |
| OQ-4 | Dispute resolve needs `accept` field (boolean) | Curl: validation error |
| OQ-5 | Return eligibility returns empty — rules unknown | Curl: empty response |
| OQ-6 | Receive pill hidden for normal restaurants | QA iteration_9 confirmed |
| OQ-7 | Single atomic submit confirmed | Curl: receive/295 |
| OQ-8 | Print receipt — not discoverable from API | Needs owner ruling |
