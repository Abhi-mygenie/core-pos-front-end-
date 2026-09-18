# BACKEND_BRIEF_BUG-384_2026_09_09
## PMS — POST /pos/room-payment Returns 403 (Sandbox-PMS Permission Gap)

**From:** MyGenie POS frontend team
**To:** Backend / Dev team
**Date:** 2026-09-09
**Bug ID:** BUG-384
**Priority:** P1 · HIGH
**Status:** OPEN — awaiting backend fix
**Related:** CR-364 (Guest Folio Detail — Record Payment action), OG-PMS-014

---

## Summary

- **Issue:** `POST /api/v2/vendoremployee/pos/room-payment` returns **HTTP 403 Forbidden** for the sandbox-pms owner account (owner@thegoankitchen.com, restaurant_id: 69).
- **Classification:** BACKEND_BUG — role permission not granted for PMS billing context
- **Frontend impact:** The "Record Payment" action on the Guest Folio page (CR-364) is completely blocked. Frontend code and endpoint constant are already wired — no FE change needed.
- **First observed:** 2026-09-06 · **Re-confirmed:** 2026-09-08 · **Still open as of:** 2026-09-09

---

## Endpoint

- **Method:** POST
- **URL:** `https://preprod.mygenie.online/api/v2/vendoremployee/pos/room-payment`
- **Auth:** Bearer *** (owner@thegoankitchen.com, restaurant_id: 69, sandbox-pms)

---

## Reproduction

```bash
curl -s -X POST "https://preprod.mygenie.online/api/v2/vendoremployee/pos/room-payment" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"1232244","amount":"1000","payment_mode":"cash","payment_type":"cash"}'

# Response: HTTP 403
# Body: {"errors":[{"code":"room_order_id",...},{"code":"payment_amount",...},{"code":"payment_mode",...},{"code":"payment_type",...}]}
```

**Note:** 403 is returned WITH validation field hints — meaning the route is registered and Laravel processes the request, but a role/permission middleware fires before input is accepted. This is a permission gap, not a missing route.

---

## Evidence

- HTTP 403 confirmed on two independent probe sessions (2026-09-06, 2026-09-08)
- Backend reply `ques4_reply.md` (2026-09-08) did NOT address OG-PMS-014 — no fix shipped
- The v1 path (`/api/v1/vendoremployee/pos/room-payment`) returns **404** — only v2 is registered
- The same account successfully calls `order-bill-payment` (F&B checkout) with 200 → permission issue is specific to `pos/room-payment`

---

## Frontend status

Frontend code is **complete** — zero changes needed on FE side:

```javascript
// src/api/constants.js L102 — already defined
ROOM_RECORD_PAYMENT: '/api/v2/vendoremployee/pos/room-payment',
```

`RecordPaymentModal.jsx` and `roomService.js` call this endpoint. The moment backend fixes the permission, CR-364 Record Payment will work without any FE deploy.

---

## Ask

**One action needed:**

Grant the sandbox-pms owner role (`owner@thegoankitchen.com`, restaurant_id: 69) permission to call `POST /api/v2/vendoremployee/pos/room-payment`.

Two possible causes — please confirm which applies:

| Cause | Fix |
|---|---|
| Sandbox-pms owner lacks billing permission that production owners have | Grant `pos/room-payment` access to sandbox-pms owner role |
| PMS Record Payment route is intentionally gated and not yet activated for PMS context | Create/activate the PMS billing permission for this route |

---

## Frontend Workaround

- **Available:** NO
- The endpoint is the only payment recording path for PMS rooms. No fallback exists until permission is granted.
