# BUG-092 — Implementation Plan (Gate 3)

**ID:** BUG-092
**Title:** Phone Format Contract for Room Check-In + CRM Customer Mapping
**Priority:** P2
**Sprint:** POS 5.0
**Date:** 2026-06-15
**Impact Analysis:** `/app/memory/BUG_092_IMPACT_ANALYSIS.md`

---

## Scope Lock

**Files WILL change:**
1. `components/modals/RoomCheckInModal.jsx` — handleSubmit (normalize phone + CRM lookup/create)
2. `api/services/roomService.js` — checkIn() (accept + send `customer_id`)

**Files will NOT touch:**
- `api/services/customerService.js` (reuse existing lookupCustomer + createCustomer)
- `api/transforms/customerTransform.js` (no change)
- `OrderEntry.jsx`, `CartPanel.jsx`, `CustomerModal.jsx` (reference only)

---

## Edits

### Edit 1: RoomCheckInModal.jsx — Import lookupCustomer + createCustomer

**File:** `src/components/modals/RoomCheckInModal.jsx`
**Line:** 18 (current import)
**Current:**
```js
import { searchCustomers } from '../../api/services/customerService';
```
**New:**
```js
import { searchCustomers, lookupCustomer, createCustomer } from '../../api/services/customerService';
```

### Edit 2: RoomCheckInModal.jsx — Normalize phone + CRM lookup/create in handleSubmit

**File:** `src/components/modals/RoomCheckInModal.jsx`
**Lines:** 586-617 (handleSubmit body, after validation, before roomService.checkIn call)
**Current:**
```js
setIsSubmitting(true);
try {
  await roomService.checkIn({
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    ...
  });
```
**New:**
```js
setIsSubmitting(true);
try {
  // BUG-092: Normalize phone to 10-digit (strip E.164 +91 prefix)
  const rawDigits = (phone || '').replace(/\D/g, '');
  const phone10 = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;

  // BUG-092: CRM customer lookup/create (non-blocking — proceed even if CRM fails)
  let customerId = null;
  if (phone10.length === 10) {
    try {
      const existing = await lookupCustomer(phone10);
      if (existing?.registered) {
        customerId = existing.customer_id || existing.id;
      } else {
        const created = await createCustomer(
          { name: name.trim(), phone: phone10 },
          restaurant?.id
        );
        customerId = created?.customer_id || created?.id || null;
      }
    } catch (crmErr) {
      console.warn('[RoomCheckIn] CRM lookup/create failed, proceeding without customer_id:', crmErr);
    }
  }

  await roomService.checkIn({
    name: name.trim(),
    phone: phone10,  // BUG-092: normalized 10-digit
    email: email.trim(),
    customerId,       // BUG-092: CRM customer_id (null if CRM failed)
    ...
  });
```

### Edit 3: roomService.js — Accept + send customer_id

**File:** `src/api/services/roomService.js`
**Line:** 56 (after phone append)
**Current:**
```js
fd.append('phone', params.phone || '');
fd.append('email', params.email || '');
```
**New:**
```js
fd.append('phone', params.phone || '');
fd.append('email', params.email || '');
// BUG-092: Send CRM customer_id if available (backend ignores until ready)
if (params.customerId) {
  fd.append('customer_id', String(params.customerId));
}
```

---

## Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | RoomCheckInModal.jsx:18 | Import lookupCustomer + createCustomer | Webpack compiles | YES |
| 2 | RoomCheckInModal.jsx:586+ | Phone normalization + CRM call | Browser: check-in with E.164 phone, verify 10-digit in Network tab payload | NO |
| 3 | roomService.js:56 | customer_id in FormData | Browser: Network tab shows customer_id field in check-in request | NO |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-092 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add RoomCheckInModal.jsx, roomService.js
- [ ] Code markers: `// BUG-092` in every modified file

---

## Risk Register

| Risk | Level | Mitigation |
|------|-------|------------|
| CRM timeout delays check-in | LOW | try/catch — CRM failure doesn't block check-in |
| Backend ignores customer_id | NONE | FE sends it, backend processes when BUG-090 is resolved |
| Phone normalization strips non-Indian numbers | LOW | Last-10-digits approach works for all formats |

---

## Execution Sequence

1. Edit 1 (import) → Edit 2 (handleSubmit) → Edit 3 (roomService) → Compile check → Self-test
