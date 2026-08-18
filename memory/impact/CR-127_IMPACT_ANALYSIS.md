# Impact Analysis — CR-127: Room Check-In `cust_membership_id`

**ID:** CR-127
**Gate:** 2 (Impact Analysis)
**Date:** 2026-08-04
**Code Reality:** NONE — `cust_membership_id` does not exist in `roomService.js`
**Conflict Pre-Check:** NO CONFLICTS — no other open item touches `roomService.js`
**Risk:** LOW (additive field, same value source, no logic change)

---

## 1. Data Flow Trace

```
User fills check-in form
  → RoomCheckInModal.jsx:handleSubmit (L585)
    → CRM lookupCustomer(phone10) → returns { customer_id, id, ... }
    → customerId = existing.customer_id || existing.id   (L598)
    → roomService.checkIn({ ..., customerId })            (L611, L615)
      → roomService.js:checkIn()                          (L43)
        → FormData:
            fd.append('customer_id', String(params.customerId))  ← L59 (EXISTS)
            ❌ fd.append('cust_membership_id', ...)               ← MISSING
        → POST /api/v1/vendoremployee/pos/user-group-check-in   (L121)
          → POS Backend receives payload
            → Backend forwards to CRM order webhook (POST /api/pos/orders)
              → CRM uses cust_membership_id for customer tracking
```

**Gap:** `cust_membership_id` is never appended to the FormData. Backend receives `customer_id` but NOT `cust_membership_id`. Per owner Q1=B, these are different fields.

## 2. Comparison with Order Flow

| Flow | File | Line | Field | Value |
|------|------|------|-------|-------|
| Place Order | `orderTransform.js` | 1005 | `cust_membership_id` | `customer?.id \|\| ''` |
| Update Order | `orderTransform.js` | 1133 | `cust_membership_id` | `customer?.id \|\| ''` (BUG-270) |
| Bill Payment | `orderTransform.js` | 1293 | `cust_membership_id` | `customer?.id \|\| ''` |
| Settle | `orderTransform.js` | 1645 | `cust_membership_id` | `customer?.id \|\| ''` |
| **Room Check-In** | `roomService.js` | 59 | `customer_id` only | `String(params.customerId)` |

All 4 order flows send `cust_membership_id`. Room check-in only sends `customer_id`.

## 3. Curl Validation

### 3a. Room Check-In Endpoint Shape
```
POST /api/v1/vendoremployee/pos/user-group-check-in
Content-Type: multipart/form-data
Auth: Bearer token

Current FormData keys (from roomService.js):
  name, phone, email, customer_id, room_id[N], total_adult, total_children,
  id_type, front_image_file, back_image_file, name2-name5, id_type2-id_type5,
  front_image_file2-5, back_image_file2-5, children_name, checkin_date,
  checkout_date, booking_details, booking_type, booking_for, room_price,
  order_amount, advance_payment, balance_payment, payment_method, order_note,
  gst_tax, firm_name, firm_gst

Missing: cust_membership_id
```

### 3b. CRM Customer ID Source (validated)
```bash
CRM_BASE="https://preprod-crm-deploy.preview.emergentagent.com/api"
POST /pos/customer-lookup {"phone":"9876543210"}
→ Response: { "customer_id": "a38df87d-5b08-4a4b-ac32-2bbcb9d8c6f3" }

This UUID is what params.customerId carries.
Same value used in orderTransform.js as customer?.id for cust_membership_id.
```

## 4. Affected Files

| File | Line | Current | Change |
|------|------|---------|--------|
| `api/services/roomService.js` | After L59 | Only `customer_id` appended | Add `fd.append('cust_membership_id', String(params.customerId))` |

**Files WILL NOT touch:** `orderTransform.js`, `RoomCheckInModal.jsx`, `customerTransform.js`, any CRM endpoint

## 5. Downstream Consumers

- POS Backend: Receives `cust_membership_id` in check-in FormData → forwards to CRM order webhook
- CRM: Uses `cust_membership_id` for customer attribution on room orders
- No FE downstream — field is write-only to backend

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Backend ignores unknown field | LOW | ZERO | Backend already handles `customer_id`; `cust_membership_id` is a known field from order flow |
| Value is null when CRM fails | LOW | LOW | Same behavior as order flow — `customer?.id \|\| ''` sends empty string |
| FormData key name typo | LOW | MEDIUM | Verify against order flow (`cust_membership_id` exact match) |

## 7. Owner Decisions (All Locked)

None remaining. Q1=B, Q2=A, Q3=A, Q9=B — all locked at intake.

---

```
Impact Analysis complete: CR-127
Code Reality: NONE
Conflict: NONE
Risk: LOW (1 additive field)
Files WILL change: roomService.js (1 line)
Files WILL NOT touch: orderTransform.js, RoomCheckInModal.jsx, CRM
Owner decisions: all locked
Next: Gate 3 (Implementation Plan)
```
