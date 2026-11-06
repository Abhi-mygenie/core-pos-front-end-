# BACKEND_BRIEF_BUG-583_BILL_PRINT_NOT_SET_2026_11_06

## ⚠ CORRECTION (2026-11-06, post-handover review)

**This was initially filed as a backend gap. After reading the full `frontend-handover-printing.md`, it is a FRONTEND gap.**

The backend **correctly** does not set `bill_print` on the `order-temp-store` call. That endpoint is the printer queue only. The frontend must call `POST /api/v2/vendoremployee/print/update-print-status` with `bill_print: "Yes"` after a successful print — this is the trigger that sets the field and emits the socket.

**Registered as CR-512** — Print Confirmation Flow. This brief is kept for audit trail only.

## Endpoint
- Print: POST `https://preprod.mygenie.online/api/v1/vendoremployee/pos/order-temp-store`
- Orders list: GET `https://preprod.mygenie.online/api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager`
- Auth: Bearer token (manager@cafe103.com)

## Reproduction
1. Login as manager@cafe103.com on preprod
2. Open order #021104 (id 1537757)
3. Click Print → Bill
4. Response: `{ status: true, message: "Order stored in temp table" }`
5. Re-fetch employee-orders-list
6. Order 1537757 still has `bill_print: "No"` and `print_bill_status: "No"`

## Evidence
- Print payload: `{ order_id: 1537757, restaurant_order_id: "021104", print_type: "bill", ... }`
- Print response: `{ status: true, message: "Order stored in temp table" }`
- Orders list after print: `bill_print: "No"`, `print_bill_status: "No"`
- Probe timestamp: 2026-11-06 10:30 UTC

## Expected Behavior
After a bill is printed (print_type: "bill"):
- `bill_print` should be set to `"Yes"` on the order
- OR a socket event should push `bill_print: "Yes"` to connected clients

## Frontend Status
- FE code is implemented and verified (BUG-583 GATE_5A)
- Transform: `billPrinted: api.bill_print === 'Yes' || api.print_bill_status === 'Yes'`
- OrderCard + TableCard: conditional green bg `#E8F5E9` + green border `#329937`
- Feature works when field is `"Yes"` (verified by unit test)

## Frontend Workaround
- Available: NO
- The FE cannot know if a bill was printed unless the backend signals it
