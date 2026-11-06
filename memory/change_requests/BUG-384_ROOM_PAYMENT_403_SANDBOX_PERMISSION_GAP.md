# BUG-384 — POST room-payment Returns 403 — Sandbox-PMS Role Permission Gap

**ID:** BUG-384
**Type:** BUG (BACKEND-BLOCKED)
**Date:** 2026-09-08
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (Investigation session 2026-09-08, OG-PMS-014 fresh probe)
**Sprint:** pos_pms_1
**Related:** CR-364 (Guest Folio Detail — Record Payment action), OG-PMS-014

---

## Summary

`POST /api/v2/vendoremployee/pos/room-payment` returns **HTTP 403 Forbidden** for `owner@thegoankitchen.com` on sandbox-pms (restaurant 69). The endpoint exists and validates input (validation errors visible when wrong fields sent), but the permission check fires first and rejects the request before input is processed. The v1 path for the same endpoint is 404.

This completely blocks the "Record Payment" action on the Guest Folio page (CR-364). Read-only folio display is unaffected.

---

## Evidence

```
POST https://preprod.mygenie.online/api/v2/vendoremployee/pos/room-payment
Authorization: Bearer <owner@thegoankitchen.com token>
Body: {"order_id":1232218,"amount":100,"payment_type":"cash"}

Response: HTTP 403
Body: {"errors":[{"code":"room_order_id",...},{"code":"payment_amount",...},{"code":"payment_mode",...},{"code":"payment_type",...}]}
```

Note: The HTTP 403 is returned WITH validation error details — meaning Laravel runs middleware (403) but still returns validation hints. This suggests the route is registered but the role/permission check for PMS Record Payment fails for the sandbox owner role.

- **First observed:** 2026-09-06 (INV-PMS-CRs-363-364-366)
- **Re-confirmed:** 2026-09-08 (investigation probe 9) — NOT resolved by backend
- **Backend reply (`ques4_reply.md`):** Does NOT address OG-PMS-014 — no fix shipped

---

## Classification

| Field | Value |
|---|---|
| Type | BUG (backend) |
| Area | PMS > Guest Folio > Record Payment |
| Priority | **P1** — Record Payment is a core checkout step; no workaround in the PMS |
| Risk | **HIGH** — financial endpoint (room billing); touches payment data |
| Fast Lane eligible | **NO** — financial + backend fix |
| Backend blocked | **YES** — permission ruling or role fix needed from backend team |
| Sprint | pos_pms_1 |

---

## Frontend code status

The frontend endpoint constant is defined and wired:

```javascript
// src/api/constants.js L102
ROOM_RECORD_PAYMENT: '/api/v2/vendoremployee/pos/room-payment',
```

`RecordPaymentModal.jsx` and `roomService.js` call this endpoint. No FE code change needed — backend must grant the PMS role permission to call this endpoint.

---

## Backend ruling needed

**Question:** Is the 403 a sandbox role gap (sandbox-pms owner lacks billing permission that prod owners have), or is the PMS Record Payment route intentionally gated and not yet activated for PMS context?

- If sandbox role gap → backend grants `pos/room-payment` to sandbox-pms owner, re-test on preprod
- If route not activated → backend creates/activates the PMS billing permission, re-test

Escalation path: `backend_briefs/` — brief not yet written for this item.

---

## Duplicate Check

- Searched: "room-payment", "room_payment", "403", "OG-PMS-014" in BUG_TRACKER + registry
- OG-PMS-014 references this issue in OPEN_GAPS_REGISTER but no BUG was registered
- **Result: DISTINCT** (registering formally from OG-PMS-014)

---

## Blast Radius

- FE files affected: **0** (backend fix only)
- Hotspot files: NO
- Estimated scope: NONE (frontend)

---

*Intake: 2026-09-08 | INTAKE agent | Code reality: FULL (FE code exists, blocked by backend 403) | Risk: HIGH | P1 | Blast radius: NONE (FE) | BACKEND-BLOCKED*
