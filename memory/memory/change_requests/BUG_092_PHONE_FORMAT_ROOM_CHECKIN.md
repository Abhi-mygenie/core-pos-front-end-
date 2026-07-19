# BUG-092 — Phone Format Contract for Room Check-In + CRM Customer Mapping

**ID:** BUG-092
**Type:** Bug
**Status:** OPEN — FE-ACTIONABLE (investigation complete 2026-06-15)
**Priority:** P2
**Area:** Room Check-In / CRM Integration
**Sprint:** POS 5.0
**Created:** 2026-05-18 (POS 3.0)
**Revised:** 2026-06-15 — reclassified from BACKEND-BLOCKED to FE-ACTIONABLE
**Source:** AGENT-DISCOVERED
**Confidence:** CONFIRMED (code-verified)

---

## Symptom

Room Check-In modal uses `react-phone-number-input` (E.164 format: `+919876543210`) while Order screen uses raw 10-digit (`9876543210`). Room Check-In does NOT call CRM to create/lookup customer — phone is sent directly to backend room API only.

## Root Cause

1. **Format inconsistency:** RoomCheckInModal stores phone as E.164 (`+919876543210`) via `PhoneInput` component. When CRM customer is selected from suggestions, it converts to 10-digit. Manual entry stays E.164.
2. **Missing CRM integration:** Room Check-In only calls `searchCustomers()` for suggestions (line 375) but does NOT call `createCustomer()` or `lookupCustomer()` on submit. The order screen's `CustomerModal.jsx` DOES call `createCustomer()` (line 347) — this pattern should be replicated.

## Current Flow (Room Check-In)

```
User types phone → PhoneInput stores E.164 (+919876543210)
  → CRM search: strips to 10-digit for typeahead (line 373)
  → OR user selects CRM customer: converts to 10-digit (line 434)
  → Submit: sends phone AS-IS to roomService.checkIn() → fd.append('phone', phone)
  → Backend gets: "+919876543210" (manual) OR "9876543210" (CRM-selected)
  → NO CRM customer created/linked
```

## Target Flow (What should happen)

```
User types phone → PhoneInput stores E.164
  → CRM search: typeahead (existing)
  → On submit:
    1. Normalize phone to 10-digit (strip +91)
    2. lookupCustomer(normalized) → if found, get customer_id
    3. If NOT found → createCustomer({ name, phone: normalized }) → get customer_id
    4. Send normalized phone + customer_id to roomService.checkIn()
  → Backend gets: consistent 10-digit + CRM customer_id
```

## Scope (FE fix — PLANNING GATE)

| # | File | Change |
|---|------|--------|
| 1 | `RoomCheckInModal.jsx` | Normalize phone to 10-digit before submit. Call `lookupCustomer` → if not found → `createCustomer`. Pass `customer_id` to roomService. |
| 2 | `roomService.js` | Accept + send `customer_id` in FormData (new field). |
| 3 | `customerService.js` | No change — `createCustomer` and `lookupCustomer` already exist. |

**CRM contract (already implemented on order screen):**
- `POST /pos/customers` — creates customer with `{ name, phone, restaurant_id }`. Phone is raw 10-digit.
- `POST /pos/customer-lookup` — looks up by exact phone. Returns `{ registered: true/false, customer_id, ... }`.

**Estimated:** ~30 lines in RoomCheckInModal.jsx + ~2 lines in roomService.js.

## Open Questions

| # | Question | Status |
|---|----------|--------|
| ~~Q-092-1~~ | Phone format for backend? | **RESOLVED** — normalize to 10-digit, matching order screen contract |
| Q-092-2 | Does room check-in backend accept `customer_id` field? | **Needs confirmation** — may be BUG-090 (same ask). If not, FE sends it anyway — backend ignores until ready. |

## Blast Radius

- **Estimated scope:** SMALL (2 files, ~32 lines)
- **Hotspot files touched:** NO
- **Regression risk:** LOW — additive CRM call, existing flow unchanged

## Routing

→ **PLANNING** — needs implementation plan for CRM lookup/create + phone normalization on submit. Owner confirmed direction 2026-06-15.
