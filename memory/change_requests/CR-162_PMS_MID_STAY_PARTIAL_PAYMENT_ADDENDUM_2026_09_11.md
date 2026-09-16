# CR-162 — Intake Addendum
## PMS — Mid-Stay Partial Payment (Record Payment)

**ID:** CR-162
**Original registration:** pre-2026-09 (pre-dates current memory sync)
**Addendum date:** 2026-09-11
**Updated by:** INTAKE agent (ALPHA v0.7)
**Sprint:** pos_pms_1

---

## Status at Addendum

| Field | Value |
|---|---|
| **Registry claim (stale)** | GATE 2 CLOSED — Awaiting Gate 4 GO → Gate 3 |
| **Actual status** | **Gate 5a — FE FULLY IMPLEMENTED** (registry drift — corrected 2026-09-11) |
| **Backend blocker** | **NONE** — BUG-384 CLOSED 2026-09-11 (was FE contract error, not permission gap) |
| **FE files** | `components/modals/RecordPaymentModal.jsx`, `api/services/roomService.js:167` (`recordPartialPayment()`), `api/constants.js:102` (`ROOM_RECORD_PAYMENT`) |
| **Risk** | LOW for the fix — 1 file, ~5 lines, no financial logic change |
| **Fast Lane eligible** | **YES** — 1 file, ≤5 lines, not hotspot, not financial calculation |

---

## What Happened

The FE agent implemented `RecordPaymentModal.jsx` + `roomService.js:recordPartialPayment()` fully. The item was believed to be at Gate 2 in the registry but code reality was Gate 5a.

The probe that returned HTTP 403 was caused by the FE sending the **wrong field names** in the request body:

| FE was sending | Correct field |
|---|---|
| `order_id` | `room_order_id` |
| `amount` | `payment_amount` |
| — | `payment_mode` (required) |
| — | `payment_type: "interim"` (for mid-stay) |

Backend reply (2026-09-10): validation now returns 422 for wrong fields. Route is live, permission is fine for sandbox-pms owner.

---

## FE Fix Required (Fast Lane)

**File:** `src/api/services/roomService.js` — the `recordPartialPayment()` call
**Change:** Rename 3 fields in the request body:
```js
// CURRENT (wrong)
{ order_id: orderId, amount: amount, payment_type: paymentType }

// CORRECT
{ room_order_id: orderId, payment_amount: amount, payment_mode: paymentMode, payment_type: paymentType || 'interim' }
```
**Estimated lines:** ~5 (1 object literal)
**Fast Lane approval needed from owner before coding.**

---

## Gate Status

- [x] Gate 0/1 — Intake (original + this addendum)
- [x] Gate 2 — Impact Analysis (done in earlier session)
- [x] Gate 5a — FE Implementation EXISTS (registry drift corrected)
- [ ] **Fast Lane Fix** — `roomService.js` body fields (~5 lines) — **awaiting owner Fast Lane GO**
- [ ] Gate 5b — QA (after fix)
- [ ] Gate 6 — Owner Smoke

---

*Addendum: 2026-09-11 | INTAKE agent | Backend blocker CLOSED | Fast Lane eligible | Awaiting owner GO*
