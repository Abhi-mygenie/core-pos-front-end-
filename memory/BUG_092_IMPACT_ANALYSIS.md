# BUG-092 — Impact Analysis (Gate 2)

**ID:** BUG-092
**Title:** Phone Format Contract for Room Check-In + CRM Customer Mapping
**Priority:** P2
**Sprint:** POS 5.0
**Date:** 2026-06-15
**Code Reality:** NONE — Room Check-In does NOT call createCustomer/lookupCustomer on submit
**Conflict Pre-Check:** CLEAR — no other open item touches RoomCheckInModal.jsx or roomService.js

---

## 1. Summary

Room Check-In modal uses `react-phone-number-input` (E.164 format: `+919876543210`) but the Order screen uses raw 10-digit. Room Check-In does NOT integrate with CRM on submit — phone is sent directly to backend room API only, with no customer creation/lookup. This means room guests are not tracked in CRM.

## 2. Data Flow Trace

### Current Flow (Room Check-In)
```
User types phone → PhoneInput stores E.164 (+919876543210)
  → CRM search: strips to 10-digit for typeahead (RoomCheckInModal.jsx:373)
  → OR user selects CRM customer: converts to 10-digit (line 434)
  → Submit (line 588-590): sends phone AS-IS to roomService.checkIn()
    → fd.append('phone', phone)  ← may be E.164 or 10-digit depending on path
  → Backend gets inconsistent format
  → NO CRM customer created/linked
```

### Target Flow
```
User types phone → PhoneInput stores E.164
  → On submit:
    1. Normalize phone to 10-digit (strip +91 prefix)
    2. lookupCustomer(normalized) → if found, get customer_id
    3. If NOT found → createCustomer({ name, phone: normalized }) → get customer_id
    4. Send normalized phone + customer_id to roomService.checkIn()
  → Backend gets: consistent 10-digit + CRM customer_id
```

### Reference: Order Screen CRM Pattern (CustomerModal.jsx:307-347)
```js
existing = await lookupCustomer(phone.trim());
if (!existing?.registered) {
  const result = await createCustomer({ name, phone, ... }, restaurantId);
  // get customer_id from result
}
```

## 3. Affected Files

| # | File | Lines | Current State | Change Needed |
|---|------|-------|---------------|---------------|
| 1 | `components/modals/RoomCheckInModal.jsx` | 580-616 (handleSubmit) | Sends raw phone, no CRM calls | Normalize phone to 10-digit. Call lookupCustomer → createCustomer. Pass customer_id. |
| 2 | `api/services/roomService.js` | checkIn() | Accepts phone only | Accept + send `customer_id` in FormData |
| 3 | `api/services/customerService.js` | lookupCustomer, createCustomer | Already implemented | No change — reuse existing functions |

## 4. Downstream Consumers

- **Backend room API** — receives `phone` + (new) `customer_id` in FormData. If backend doesn't accept `customer_id` yet, it will ignore the field (no harm).
- **CRM service** — createCustomer / lookupCustomer already work for order screen. Same contract.
- **Room orders / reports** — will now have CRM customer linked, enabling CRM features for room guests.

## 5. Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| CRM API timeout delays check-in | LOW | Use try/catch — proceed with check-in even if CRM fails (non-blocking) |
| Backend ignores customer_id field | NONE | FE sends it; backend processes when ready (BUG-090 backend work) |
| Phone normalization edge cases (non-Indian numbers) | LOW | `react-phone-number-input` always produces E.164; strip leading `+91` for India, fallback to last 10 digits for others |

## 6. Open Questions

| # | Question | Status |
|---|----------|--------|
| Q-092-1 | Phone format for backend? | **RESOLVED** — normalize to 10-digit |
| Q-092-2 | Does room check-in backend accept `customer_id` field? | **Needs confirmation** — if not, FE sends it anyway, backend ignores until BUG-090 is resolved |

## 7. Scope

- **Estimated:** ~30 lines in RoomCheckInModal.jsx + ~2 lines in roomService.js
- **Hotspot files:** NO
- **Financial logic:** NO
- **Planning skip eligible:** YES (≤35 lines, 2 files, no hotspot, no financial) — owner can approve DIRECT_BUG_FIX
