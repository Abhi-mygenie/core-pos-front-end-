# CR-169 — Check-In WhatsApp Confirmation via Template (Phase 2)

**ID:** CR-169
**Type:** CR (New Feature — Phase 2)
**Priority:** P2
**Risk:** LOW (1 FE file, backend does the work)
**Area:** Room Module → Self Check-In → WhatsApp Post-Approval
**Sprint:** POS 5.x
**Created:** 2026-08-18
**Source:** OWNER-REQUEST + INVESTIGATION (INV-SELF-CHECKIN-2026-08-18)
**Duplicate check:** DISTINCT
**Related:** CR-168 (Phase 1 — must complete first), CR-017 (WhatsApp payment link — same pattern)
**Code reality:** NONE

---

## Description

After staff approves a self check-in (CR-168), send the guest a WhatsApp confirmation message using a pre-registered template.

**Trigger:** Staff approves check-in in `PendingCheckInDrawer`
**Action:** POST to backend → backend sends WhatsApp to guest phone
**Template (suggested):**
> "Welcome [Name]! Your check-in at [Hotel] is confirmed. Room: [101] | Check-in: [Aug 18] | Check-out: [Aug 20]. Enjoy your stay!"

---

## Investigation Reference
Full architecture: `/app/memory/INV-SELF-CHECKIN-2026-08-18_INVESTIGATION_REPORT.md` §5

---

## Why Backend (not CRM)

- CRM WhatsApp template endpoint: ALL 404 probed (not implemented)
- CRM `/pos/send` returns 405 → path exists but no POST handler yet
- Backend ALREADY sends WhatsApp via `razoar_payment_with_url` template (CR-017 proven)
- **Recommended: new backend endpoint** using existing WA infrastructure

---

## Backend Endpoint Needed

```
POST /api/v1/vendoremployee/room/send-checkin-confirmation
Auth: Bearer token
Body: { order_id, phone, guest_name, room_no, checkin_date, checkout_date }
Response: { status: "sent" | "queued" | "failed" }
Pattern: identical to /api/v1/razor-pay/payment-link
```

---

## Frontend Change (minimal)

- 1 function added to `selfCheckInService.js` (from CR-168)
- 1 endpoint constant in `constants.js`
- Called after `approveRequest()` succeeds

---

## Owner Decisions — DEFERRED TO GATE 2

| # | Question |
|---|---|
| OQ-5 | WhatsApp fires automatically on approval or staff clicks "Send" button? |
| OQ-6 | Template name/content — confirm or provide to backend team |

---

## Dependency

**BLOCKED on CR-168** (Phase 1 must be implemented first — `selfCheckInService.js` is the host file)
**BLOCKED on backend** — template endpoint not yet implemented

**Next:** Gate 2 (answer OQ-5/OQ-6, confirm backend template name)
