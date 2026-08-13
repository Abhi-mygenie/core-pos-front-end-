# CR-127 — Room Check-In: Add `cust_membership_id` to Check-In Payload

**ID:** CR-127
**Type:** CR
**Created:** 2026-08-04
**Severity:** P1 (HIGH)
**Risk:** LOW
**Module:** Room Check-In / roomService.js
**Duplicate Check:** RELATED — BUG-270 (update-place-order missing `cust_membership_id`, FIXED), BUG-065 (Corporate Room Check-in, CLOSED), BUG-092 (`customer_id` on room check-in, IMPLEMENTED). DISTINCT scope.
**Code Reality:** PARTIAL — `customer_id` already sent (roomService.js:64-66), `cust_membership_id` NOT sent.
**Source:** OWNER-REPORTED
**Confidence:** CONFIRMED (code verified + CRM contract validated)
**Blast Radius:** SMALL (~1 file, ~1 line)

---

## Description

Room check-in sends `customer_id` (CRM UUID) to the POS backend but does NOT send `cust_membership_id`. All order flows (place-order, update-place-order, bill-payment, settle) send `cust_membership_id: customer?.id || ''` via `orderTransform.js`. These are **different fields** (owner-confirmed Q1=B), so FE must send both.

POS Backend already forwards room orders to CRM via order webhook and just needs `cust_membership_id` to be present in the check-in payload (owner-confirmed Q3=A).

## Owner Decisions (Locked)

| # | Question | Decision | Date |
|---|----------|----------|------|
| Q1 | `customer_id` vs `cust_membership_id` — same or different? | **B — Different fields, FE must send both** | 2026-08-04 |
| Q2 | Who adds it — FE or Backend? | **A — POS FE adds it** (1-line in `roomService.js`) | 2026-08-04 |
| Q3 | Does backend already forward room orders to CRM? | **A — Yes, just needs `cust_membership_id`** | 2026-08-04 |
| Q9 | Doc update for field mapping? | **B — Not needed** | 2026-08-04 |

## Evidence

- Code: `roomService.js:64-66` — sends `customer_id` only
- Code: `orderTransform.js:1005,1133,1293,1645` — sends `cust_membership_id: customer?.id || ''`
- CRM Contract: v2 FINAL — order webhook accepts customer fields (validated live on preprod-crm-deploy)

## Scope

**Files WILL change:**
- `roomService.js` — add `fd.append('cust_membership_id', params.customerId || '')` after existing `customer_id` append

**Files WILL NOT touch:**
- `orderTransform.js`, `RoomCheckInModal.jsx`, CRM endpoints, any other files

## Fix (Proposed)

In `roomService.js`, after line 66 (`fd.append('customer_id', String(params.customerId))`):
```js
fd.append('cust_membership_id', String(params.customerId));
```

---

```
Intake complete: CR-127
Classification: CR, Severity: P1, Risk: LOW
Duplicate check: RELATED (BUG-270, BUG-065, BUG-092) — DISTINCT scope
Evidence: captured (code verified + CRM contract live-validated)
Blast radius: SMALL (~1 file, ~1 line)
Docs updated: change_requests/CR-127_ROOM_CHECKIN_CUST_MEMBERSHIP_ID_INTAKE.md
Next: Planning Gate 2
```
